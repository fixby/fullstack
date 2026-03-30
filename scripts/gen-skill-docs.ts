#!/usr/bin/env bun
/**
 * 从 .tmpl 模板生成 SKILL.md 文件。
 *
 * 处理流程：
 *   读取 .tmpl → 查找 {{占位符}} → 从源文件解析 → 格式化 → 写入 .md
 *
 * 支持 --dry-run：生成到内存，如果与已提交文件不同则退出码为 1。
 * 用于 skill:check 和 CI 新鲜度检查。
 */

import { COMMAND_DESCRIPTIONS } from '../browse/src/commands';
import { SNAPSHOT_FLAGS } from '../browse/src/snapshot';
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(import.meta.dir, '..');
const DRY_RUN = process.argv.includes('--dry-run');

// ─── 模板上下文 ───────────────────────────────────────

type Host = 'claude' | 'codex';
const OPENAI_SHORT_DESCRIPTION_LIMIT = 120;

const HOST_ARG = process.argv.find(a => a.startsWith('--host'));
const HOST: Host = (() => {
  if (!HOST_ARG) return 'claude';
  const val = HOST_ARG.includes('=') ? HOST_ARG.split('=')[1] : process.argv[process.argv.indexOf(HOST_ARG) + 1];
  if (val === 'codex' || val === 'agents') return 'codex';
  if (val === 'claude') return 'claude';
  throw new Error(`未知主机: ${val}。请使用 claude、codex 或 agents。`);
})();

interface HostPaths {
  skillRoot: string;
  localSkillRoot: string;
  binDir: string;
  browseDir: string;
}

const HOST_PATHS: Record<Host, HostPaths> = {
  claude: {
    skillRoot: '~/.openclaw/skills/fullstack',
    localSkillRoot: '.openclaw/skills/fullstack',
    binDir: '~/.openclaw/skills/fullstack/bin',
    browseDir: '~/.openclaw/skills/fullstack/browse/dist',
  },
  codex: {
    skillRoot: '$FULLSTACK_ROOT',
    localSkillRoot: '.agents/skills/fullstack',
    binDir: '$FULLSTACK_BIN',
    browseDir: '$FULLSTACK_BROWSE',
  },
};

interface TemplateContext {
  skillName: string;
  tmplPath: string;
  benefitsFrom?: string[];
  host: Host;
  paths: HostPaths;
}

// ─── 共享设计常量 ────────────────────────────────

/** FullStack Skills 的 10 个 AI slop 反模式 — 在 DESIGN_METHODOLOGY 和 DESIGN_HARD_RULES 之间共享 */
const AI_SLOP_BLACKLIST = [
  '紫色/紫罗兰/靛蓝渐变背景或蓝紫配色方案',
  '**三列功能网格：** 彩色圆圈图标 + 粗体标题 + 两行描述，对称重复 3 次。最易识别的 AI 布局。',
  '彩色圆圈图标作为区块装饰（SaaS 入门模板风格）',
  '全部居中（所有标题、描述、卡片都 `text-align: center`）',
  '所有元素使用统一的圆角（所有东西都用相同的大圆角）',
  '装饰性斑点、漂浮圆圈、波浪形 SVG 分隔线（如果区块感觉空，需要更好的内容，而不是装饰）',
  '表情符号作为设计元素（标题中的火箭、作为项目符号的表情符号）',
  '卡片上的彩色左边框（`border-left: 3px solid <强调色>`）',
  '通用的英雄文案（"欢迎使用 [X]"、"释放...的力量"、"您的一站式解决方案..."）',
  '千篇一律的区块节奏（英雄区 → 3 个功能 → 客户评价 → 定价 → CTA，每个区块高度相同）',
];

/** OpenAI 硬性拒绝标准（来自"使用 GPT-5.4 设计令人愉悦的前端"，2026 年 3 月） */
const OPENAI_HARD_REJECTIONS = [
  '第一印象是通用的 SaaS 卡片网格',
  '漂亮的图片但品牌薄弱',
  '强有力的标题但没有明确的行动',
  '文字后面是繁忙的图像',
  '区块重复相同的心情陈述',
  '没有叙事目的的轮播',
  '应用 UI 由堆叠的卡片组成而不是布局',
];

/** OpenAI 试金石检查 — 7 个是/否测试，用于跨模型共识评分 */
const OPENAI_LITMUS_CHECKS = [
  '品牌/产品在首屏 unmistakable 吗？',
  '有一个强烈的视觉锚点吗？',
  '仅通过扫描标题就能理解页面吗？',
  '每个区块只有一个任务吗？',
  '卡片真的必要吗？',
  '动效改善了层次结构或氛围吗？',
  '如果移除所有装饰性阴影，设计会感觉高级吗？',
];

// ─── 占位符解析器 ──────────────────────────────────

function generateCommandReference(_ctx: TemplateContext): string {
  // 按类别分组命令
  const groups = new Map<string, Array<{ command: string; description: string; usage?: string }>>();
  for (const [cmd, meta] of Object.entries(COMMAND_DESCRIPTIONS)) {
    const list = groups.get(meta.category) || [];
    list.push({ command: cmd, description: meta.description, usage: meta.usage });
    groups.set(meta.category, list);
  }

  // 类别显示顺序
  const categoryOrder = [
    'Navigation', 'Reading', 'Interaction', 'Inspection',
    'Visual', 'Snapshot', 'Meta', 'Tabs', 'Server',
  ];

  const sections: string[] = [];
  for (const category of categoryOrder) {
    const commands = groups.get(category);
    if (!commands || commands.length === 0) continue;

    // 在类别内按字母排序
    commands.sort((a, b) => a.command.localeCompare(b.command));

    sections.push(`### ${category}`);
    sections.push('| 命令 | 描述 |');
    sections.push('|------|------|');
    for (const cmd of commands) {
      const display = cmd.usage ? `\`${cmd.usage}\`` : `\`${cmd.command}\``;
      sections.push(`| ${display} | ${cmd.description} |`);
    }
    sections.push('');
  }

  return sections.join('\n').trimEnd();
}

function generateSnapshotFlags(_ctx: TemplateContext): string {
  const lines: string[] = [
    '快照是你理解和交互页面的主要工具。',
    '',
    '```',
  ];

  for (const flag of SNAPSHOT_FLAGS) {
    const label = flag.valueHint ? `${flag.short} ${flag.valueHint}` : flag.short;
    lines.push(`${label.padEnd(10)}${flag.long.padEnd(24)}${flag.description}`);
  }

  lines.push('```');
  lines.push('');
  lines.push('所有标志可以自由组合。`-o` 仅在使用 `-a` 时适用。');
  lines.push('示例：`$B snapshot -i -a -C -o /tmp/annotated.png`');
  lines.push('');
  lines.push('**引用编号：** @e 引用按树顺序依次分配（@e1、@e2...）。');
  lines.push('@c 引用来自 `-C`，单独编号（@c1、@c2...）。');
  lines.push('');
  lines.push('快照后，在任何命令中使用 @ref 作为选择器：');
  lines.push('```bash');
  lines.push('$B click @e3       $B fill @e4 "value"     $B hover @e1');
  lines.push('$B html @e2        $B css @e5 "color"      $B attrs @e6');
  lines.push('$B click @c1       # 光标可交互引用（来自 -C）');
  lines.push('```');
  lines.push('');
  lines.push('**输出格式：** 带缩进的无障碍树，包含 @ref ID，每行一个元素。');
  lines.push('```');
  lines.push('  @e1 [heading] "Welcome" [level=1]');
  lines.push('  @e2 [textbox] "Email"');
  lines.push('  @e3 [button] "Submit"');
  lines.push('```');
  lines.push('');
  lines.push('导航后引用会失效 — 在 `goto` 后重新运行 `snapshot`。');

  return lines.join('\n');
}

function generatePreambleBash(ctx: TemplateContext): string {
  const runtimeRoot = ctx.host === 'codex'
    ? `_ROOT=$(git rev-parse --show-toplevel 2>/dev/null)
FULLSTACK_ROOT="$HOME/.openclaw/skills/fullstack"
[ -n "$_ROOT" ] && [ -d "$_ROOT/.agents/skills/fullstack" ] && FULLSTACK_ROOT="$_ROOT/.agents/skills/fullstack"
FULLSTACK_BIN="$FULLSTACK_ROOT/bin"
FULLSTACK_BROWSE="$FULLSTACK_ROOT/browse/dist"
`
    : '';

  return `## 前置操作（首先运行）

\`\`\`bash
${runtimeRoot}_PROACTIVE=$(${ctx.paths.binDir}/fullstack-config get proactive 2>/dev/null || echo "true")
_BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
echo "BRANCH: $_BRANCH"
echo "PROACTIVE: $_PROACTIVE"
source <(${ctx.paths.binDir}/fullstack-repo-mode 2>/dev/null) || true
REPO_MODE=\${REPO_MODE:-unknown}
echo "REPO_MODE: $REPO_MODE"
\`\`\``;
}

function generateUpgradeCheck(_ctx: TemplateContext): string {
  return `如果 \`PROACTIVE\` 为 \`"false"\`，不要主动建议 fullstack 技能 — 仅在用户明确要求时调用。用户已选择退出主动建议。`;
}

function generateLakeIntro(): string {
  return '';
}

function generateAskUserFormat(_ctx: TemplateContext): string {
  return `## AskUserQuestion 格式

**每次调用 AskUserQuestion 都必须遵循此结构：**
1. **重申背景：** 说明项目、当前分支（使用前置操作打印的 \`_BRANCH\` 值 — 不是对话历史或 gitStatus 中的分支）以及当前计划/任务。（1-2 句话）
2. **简化：** 用通俗易懂的语言解释问题，让聪明的 16 岁少年也能理解。不要原始函数名，不要内部术语，不要实现细节。使用具体示例和类比。说明它做什么，而不是它叫什么。
3. **推荐：** \`推荐：选择 [X] 因为 [一句话原因]\` — 始终优先选择完整选项而非捷径（见完整性原则）。为每个选项包含 \`完整性：X/10\`。校准：10 = 完整实现（所有边缘情况、完整覆盖），7 = 覆盖主流程但跳过一些边缘，3 = 推迟大量工作的捷径。如果两个选项都是 8+，选更高的；如果有一个 ≤5，标记它。
4. **选项：** 字母编号选项：\`A) ... B) ... C) ...\` — 当选项涉及工作量时，同时展示两个尺度：\`(人工：~X / CC：~Y)\`

假设用户 20 分钟没看过这个窗口，也没有打开代码。如果你需要读源码才能理解自己的解释，那就太复杂了。

每个技能的指令可能在此基线之上添加额外的格式规则。`;
}

function generateCompletenessSection(): string {
  return `## 完整性原则 — 煮沸湖水

AI 辅助编码使完整性的边际成本接近于零。当你展示选项时：

- 如果选项 A 是完整实现（完全对等、所有边缘情况、100% 覆盖率），选项 B 是节省适度努力的捷径 — **始终推荐 A**。80 行和 150 行之间的差异在 AI 辅助下毫无意义。当"完整"只需几分钟更多时，"足够好"是错误的直觉。
- **湖水 vs. 海洋：** "湖水"是可煮沸的 — 模块 100% 测试覆盖率、完整功能实现、处理所有边缘情况、完整错误路径。"海洋"则不是 — 从头重写整个系统、为你无法控制的依赖项添加功能、跨季度的平台迁移。推荐煮沸湖水。将海洋标记为超出范围。
- **估算工作量时**，始终展示两个尺度：人类团队时间和 AI 助手时间。压缩比因任务类型而异 — 使用此参考：

| 任务类型 | 人类团队 | AI 助手 | 压缩比 |
|-----------|-----------|-----------|-------------|
| 样板代码 / 脚手架 | 2 天 | 15 分钟 | ~100x |
| 测试编写 | 1 天 | 15 分钟 | ~50x |
| 功能实现 | 1 周 | 30 分钟 | ~30x |
| Bug 修复 + 回归测试 | 4 小时 | 15 分钟 | ~20x |
| 架构 / 设计 | 2 天 | 4 小时 | ~5x |
| 研究 / 探索 | 1 天 | 3 小时 | ~3x |

- 此原则适用于测试覆盖率、错误处理、文档、边缘情况和功能完整性。不要为了"节省时间"而跳过最后 10% — 在 AI 辅助下，那 10% 只需几秒钟。

**反模式 — 不要这样做：**
- 错误："选择 B — 它用更少的代码覆盖了 90% 的价值。"（如果 A 只多 70 行，选择 A。）
- 错误："我们可以跳过边缘情况处理来节省时间。"（边缘情况处理在 CC 下只需几分钟。）
- 错误："让我们把测试覆盖率推迟到后续 PR。"（测试是最容易煮沸的湖水。）
- 错误：只引用人类团队工作量："这需要 2 周。"（应该说："2 周人类 / ~1 小时 CC。"）`;
}

function generateRepoModeSection(): string {
  return `## 仓库所有权模式 — 看到问题，说出问题

前置操作中的 \`REPO_MODE\` 告诉你谁拥有这个仓库中的问题：

- **\`solo\`** — 一个人完成 80%+ 的工作。他们拥有一切。当你注意到当前分支变更之外的问题（测试失败、弃用警告、安全建议、lint 错误、死代码、环境问题）时，**主动调查并提供修复**。独立开发者是唯一会修复它的人。默认采取行动。
- **\`collaborative\`** — 多个活跃贡献者。当你注意到分支变更之外的问题时，**通过 AskUserQuestion 标记它们** — 这可能是其他人的责任。默认询问，而不是修复。
- **\`unknown\`** — 视为协作模式（更安全的默认值 — 修复前先询问）。

**看到问题，说出问题：** 无论你在任何工作流步骤中注意到什么看起来不对的问题 — 不仅仅是测试失败 — 简要标记它。一句话：你注意到了什么及其影响。在独立模式下，追问"要我修复吗？"在协作模式下，只需标记并继续。

永远不要让注意到的问题默默通过。重点是主动沟通。`;
}

function generateTestFailureTriage(): string {
  return `## 测试失败归属分类

当测试失败时，不要立即停止。首先确定归属：

### 步骤 T1：对每个失败进行分类

对于每个失败的测试：

1. **获取此分支上更改的文件：**
   \`\`\`bash
   git diff origin/<base>...HEAD --name-only
   \`\`\`

2. **对失败进行分类：**
   - **分支内** 如果：失败的测试文件本身在此分支上被修改，或者测试输出引用了在此分支上更改的代码，或者你可以将失败追溯到分支差异中的更改。
   - **可能已存在** 如果：测试文件及其测试的代码都未在此分支上修改，并且失败与你识别的任何分支更改无关。
   - **当模糊时，默认为分支内。** 阻止开发者比让损坏的测试发布更安全。只有在有信心时才分类为已存在。

   此分类是启发式的 — 使用你的判断阅读差异和测试输出。你没有程序化的依赖图。

### 步骤 T2：处理分支内失败

**停止。** 这些是你的失败。展示它们，不要继续。开发者必须在发布前修复自己损坏的测试。

### 步骤 T3：处理已存在的失败

检查前置操作输出中的 \`REPO_MODE\`。

**如果 REPO_MODE 为 \`solo\`：**

使用 AskUserQuestion：

> 这些测试失败似乎是已存在的（不是由你的分支更改引起的）：
>
> [列出每个失败，包含 file:line 和简要错误描述]
>
> 由于这是独立仓库，你是唯一会修复这些问题的人。
>
> 推荐：选择 A — 趁上下文新鲜时立即修复。完整性：9/10。
> A) 立即调查并修复（人工：~2-4h / CC：~15min）— 完整性：10/10
> B) 添加为 P0 TODO — 此分支落地后修复 — 完整性：7/10
> C) 跳过 — 我知道这个问题，仍然发布 — 完整性：3/10

**如果 REPO_MODE 为 \`collaborative\` 或 \`unknown\`：**

使用 AskUserQuestion：

> 这些测试失败似乎是已存在的（不是由你的分支更改引起的）：
>
> [列出每个失败，包含 file:line 和简要错误描述]
>
> 这是协作仓库 — 这些可能是其他人的责任。
>
> 推荐：选择 B — 分配给破坏它的人，让正确的人修复。完整性：9/10。
> A) 无论如何立即调查并修复 — 完整性：10/10
> B) 归咎 + 分配 GitHub issue 给作者 — 完整性：9/10
> C) 添加为 P0 TODO — 完整性：7/10
> D) 跳过 — 仍然发布 — 完整性：3/10

### 步骤 T4：执行选择的操作

**如果"立即调查并修复"：**
- 切换到 /investigate 心态：先找根本原因，然后最小修复。
- 修复已存在的失败。
- 单独提交修复，与分支更改分开：\`git commit -m "fix: <test-file> 中已存在的测试失败"\`
- 继续工作流。

**如果"添加为 P0 TODO"：**
- 如果 \`TODOS.md\` 存在，按照 \`review/TODOS-format.md\`（或 \`.claude/skills/review/TODOS-format.md\`）中的格式添加条目。
- 如果 \`TODOS.md\` 不存在，创建它并添加标准头部和条目。
- 条目应包括：标题、错误输出、在哪个分支上发现的，以及优先级 P0。
- 继续工作流 — 将已存在的失败视为非阻塞。

**如果"归咎 + 分配 GitHub issue"（仅协作模式）：**
- 找到可能破坏它的人。同时检查测试文件和它测试的生产代码：
  \`\`\`bash
  # 谁最后修改了失败的测试？
  git log --format="%an (%ae)" -1 -- <failing-test-file>
  # 谁最后修改了测试覆盖的生产代码？（通常是实际的破坏者）
  git log --format="%an (%ae)" -1 -- <source-file-under-test>
  \`\`\`
  如果是不同的人，优先选择生产代码作者 — 他们可能引入了回归。
- 创建分配给该人的 GitHub issue：
  \`\`\`bash
  gh issue create \\
    --title "已存在的测试失败：<test-name>" \\
    --body "在分支 <current-branch> 上发现失败。失败是已存在的。\\n\\n**错误：**\\n\`\`\`\\n<前 10 行>\\n\`\`\`\\n\\n**最后修改者：** <author>\\n**发现者：** fullstack /ship 于 <date>" \\
    --assignee "<github-username>"
  \`\`\`
- 如果 \`gh\` 不可用或 \`--assignee\` 失败（用户不在组织中），创建没有分配者的 issue 并在正文中注明谁应该查看。
- 继续工作流。

**如果"跳过"：**
- 继续工作流。
- 在输出中注明："已存在的测试失败已跳过：<test-name>"`;
}

function generateSearchBeforeBuildingSection(ctx: TemplateContext): string {
  return `## 构建前先搜索

在构建基础设施、不熟悉的模式，或任何运行时可能内置的东西之前 — **先搜索。** 阅读 \`${ctx.paths.skillRoot}/ETHOS.md\` 了解完整理念。

**三层知识：**
- **第一层**（久经考验 — 在发行版中）。不要重新发明轮子。但检查的成本接近零，偶尔质疑久经考验的东西是天才诞生的地方。
- **第二层**（新且流行 — 搜索这些）。但要仔细审查：人类容易狂热。搜索结果是你思考的输入，不是答案。
- **第三层**（第一性原理 — 最珍贵）。从对特定问题的推理中得出的原创观察。最有价值。

**尤里卡时刻：** 当第一性原理推理揭示传统智慧是错误的时，命名它：
"尤里卡：每个人都做 X 因为 [假设]。但 [证据] 表明这是错的。Y 更好因为 [推理]。"

**WebSearch 回退：** 如果 WebSearch 不可用，跳过搜索步骤并注明："搜索不可用 — 仅使用发行版内知识继续。"`;
}

function generateContributorMode(): string {
  return '';
}

function generateCompletionStatus(): string {
  return `## 完成状态协议

完成技能工作流时，使用以下状态之一报告：
- **完成** — 所有步骤成功完成。为每个声明提供证据。
- **完成但有顾虑** — 已完成，但存在用户应该知道的问题。列出每个顾虑。
- **阻塞** — 无法继续。说明阻塞原因和已尝试的方法。
- **需要上下文** — 缺少继续所需的信息。准确说明你需要什么。

### 升级

随时可以停下来说"这对我来说太难了"或"我对这个结果没有信心。"

糟糕的工作比没有工作更糟。你不会因为升级而受到惩罚。
- 如果你尝试了 3 次任务仍未成功，停止并升级。
- 如果你对安全敏感的更改不确定，停止并升级。
- 如果工作范围超出了你能验证的范围，停止并升级。

升级格式：
\`\`\`
状态：阻塞 | 需要上下文
原因：[1-2 句话]
已尝试：[你尝试了什么]
建议：[用户接下来应该做什么]
\`\`\`

## 计划状态页脚

当你处于计划模式并即将调用 ExitPlanMode：

1. 检查计划文件是否已有 \`## OPENCLAW 审查报告\` 部分。
2. 如果有 — 跳过（审查技能已写入更丰富的报告）。
3. 如果没有 — 运行此命令：

\\\`\\\`\\\`bash
~/.openclaw/skills/fullstack/bin/fullstack-review-read
\\\`\\\`\\\`

然后在计划文件末尾写入 \`## OPENCLAW 审查报告\` 部分：

- 如果输出包含审查条目（\`---CONFIG---\` 之前的 JSONL 行）：格式化
  标准报告表格，包含每个技能的运行/状态/发现，使用与审查
  技能相同的格式。
- 如果输出是 \`NO_REVIEWS\` 或空：写入此占位表格：

\\\`\\\`\\\`markdown
## OPENCLAW 审查报告

| 审查 | 触发 | 原因 | 运行 | 状态 | 发现 |
|--------|---------|-----|------|--------|----------|
| CEO 审查 | \\\`/plan-ceo-review\\\` | 范围与策略 | 0 | — | — |
| Codex 审查 | \\\`/codex review\\\` | 独立第二意见 | 0 | — | — |
| 工程审查 | \\\`/plan-eng-review\\\` | 架构与测试（必需） | 0 | — | — |
| 设计审查 | \\\`/plan-design-review\\\` | UI/UX 缺口 | 0 | — | — |

**结论：** 尚无审查 — 运行 \\\`/autoplan\\\` 获取完整审查流程，或运行上述单独审查。
\\\`\\\`\\\`

**计划模式例外 — 始终运行：** 这会写入计划文件，这是你在计划模式下
允许编辑的文件。计划文件审查报告是计划活跃状态的一部分。`;
}

function generatePreamble(ctx: TemplateContext): string {
  return [
    generatePreambleBash(ctx),
    generateUpgradeCheck(ctx),
    generateAskUserFormat(ctx),
    generateCompletenessSection(),
    generateRepoModeSection(),
    generateSearchBeforeBuildingSection(ctx),
    generateCompletionStatus(),
  ].join('\n\n');
}

function generateBrowseSetup(ctx: TemplateContext): string {
  return `## 设置（在任何浏览命令之前运行此检查）

\`\`\`bash
_ROOT=$(git rev-parse --show-toplevel 2>/dev/null)
B=""
[ -n "$_ROOT" ] && [ -x "$_ROOT/${ctx.paths.localSkillRoot}/browse/dist/browse" ] && B="$_ROOT/${ctx.paths.localSkillRoot}/browse/dist/browse"
[ -z "$B" ] && B=${ctx.paths.browseDir}/browse
if [ -x "$B" ]; then
  echo "就绪：$B"
else
  echo "需要设置"
fi
\`\`\`

如果 \`需要设置\`：
1. 告诉用户："fullstack browse 需要一次性构建（约 10 秒）。可以继续吗？" 然后停止并等待。
2. 运行：\`cd <SKILL_DIR> && ./setup\`
3. 如果 \`bun\` 未安装：\`curl -fsSL https://bun.sh/install | bash\``;
}

function generateBaseBranchDetect(_ctx: TemplateContext): string {
  return `## 步骤 0：检测基础分支

确定此 PR 目标分支。在所有后续步骤中使用此结果作为"基础分支"。

1. 检查此分支是否已存在 PR：
   \`gh pr view --json baseRefName -q .baseRefName\`
   如果成功，使用打印的分支名作为基础分支。

2. 如果没有 PR（命令失败），检测仓库的默认分支：
   \`gh repo view --json defaultBranchRef -q .defaultBranchRef.name\`

3. 如果两个命令都失败，回退到 \`main\`。

打印检测到的基础分支名。在后续每个 \`git diff\`、\`git log\`、
\`git fetch\`、\`git merge\` 和 \`gh pr create\` 命令中，将检测到的
分支名替换到指令中"基础分支"的位置。

---`;
}

function generateQAMethodology(_ctx: TemplateContext): string {
  return `## 模式

### 差异感知模式（在功能分支上且未提供 URL 时自动启用）

这是开发者验证其工作的**主要模式**。当用户在没有 URL 的情况下执行 \`/qa\` 且仓库位于功能分支时，自动执行以下操作：

1. **分析分支差异**以了解变更内容：
   \`\`\`bash
   git diff main...HEAD --name-only
   git log main..HEAD --oneline
   \`\`\`

2. **从变更文件中识别受影响的页面/路由**：
   - 控制器/路由文件 → 它们服务的 URL 路径
   - 视图/模板/组件文件 → 渲染它们的页面
   - 模型/服务文件 → 使用这些模型的页面（检查引用它们的控制器）
   - CSS/样式文件 → 包含这些样式表的页面
   - API 端点 → 使用 \`$B js "await fetch('/api/...')"\` 直接测试
   - 静态页面（markdown、HTML）→ 直接导航到它们

   **如果从差异中未识别出明显的页面/路由：** 不要跳过浏览器测试。用户调用 /qa 是因为他们想要基于浏览器的验证。回退到快速模式 — 导航到首页，跟随前 5 个导航目标，检查控制台错误，并测试发现的任何交互元素。后端、配置和基础设施变更会影响应用行为 — 始终验证应用是否仍然正常工作。

3. **检测正在运行的应用** — 检查常见的本地开发端口：
   \`\`\`bash
   $B goto http://localhost:3000 2>/dev/null && echo "在 :3000 找到应用" || \\
   $B goto http://localhost:4000 2>/dev/null && echo "在 :4000 找到应用" || \\
   $B goto http://localhost:8080 2>/dev/null && echo "在 :8080 找到应用"
   \`\`\`
   如果未找到本地应用，检查 PR 或环境中是否有预发布/预览 URL。如果都没有，向用户询问 URL。

4. **测试每个受影响的页面/路由**：
   - 导航到页面
   - 截取屏幕截图
   - 检查控制台错误
   - 如果变更是交互式的（表单、按钮、流程），端到端测试交互
   - 在操作前后使用 \`snapshot -D\` 验证变更产生了预期效果

5. **与提交消息和 PR 描述交叉引用**以理解*意图* — 变更应该做什么？验证它实际上做到了。

6. **检查 TODOS.md**（如果存在）以查找与变更文件相关的已知 bug 或问题。如果 TODO 描述了此分支应该修复的 bug，将其添加到测试计划中。如果在 QA 期间发现新 bug 且不在 TODOS.md 中，在报告中记录它。

7. **报告发现**，范围限定在分支变更：
   - "已测试变更：此分支影响的 N 个页面/路由"
   - 每个页面：是否正常工作？截图证据。
   - 相邻页面是否有回归？

**如果用户在差异感知模式下提供了 URL：** 使用该 URL 作为基础，但仍将测试范围限定在变更文件。

### 完整模式（提供 URL 时的默认模式）
系统性探索。访问每个可达页面。记录 5-10 个有充分证据的问题。生成健康评分。根据应用大小需要 5-15 分钟。

### 快速模式（\`--quick\`）
30 秒冒烟测试。访问首页 + 前 5 个导航目标。检查：页面是否加载？控制台错误？断链？生成健康评分。无详细问题记录。

### 回归模式（\`--regression <baseline>\`）
运行完整模式，然后从之前的运行加载 \`baseline.json\`。对比：哪些问题已修复？哪些是新的？评分变化多少？在报告中追加回归部分。

---

## 工作流程

### 阶段 1：初始化

1. 查找 browse 二进制文件（参见上面的设置）
2. 创建输出目录
3. 从 \`qa/templates/qa-report-template.md\` 复制报告模板到输出目录
4. 启动计时器以跟踪持续时间

### 阶段 2：认证（如需要）

**如果用户指定了认证凭据：**

\`\`\`bash
$B goto <login-url>
$B snapshot -i                    # 查找登录表单
$B fill @e3 "user@example.com"
$B fill @e4 "[REDACTED]"         # 永远不要在报告中包含真实密码
$B click @e5                      # 提交
$B snapshot -D                    # 验证登录成功
\`\`\`

**如果用户提供了 cookie 文件：**

\`\`\`bash
$B cookie-import cookies.json
$B goto <target-url>
\`\`\`

**如果需要 2FA/OTP：** 向用户询问验证码并等待。

**如果被 CAPTCHA 阻挡：** 告诉用户："请在浏览器中完成 CAPTCHA，然后告诉我继续。"

### 阶段 3：定位

获取应用的地图：

\`\`\`bash
$B goto <target-url>
$B snapshot -i -a -o "$REPORT_DIR/screenshots/initial.png"
$B links                          # 映射导航结构
$B console --errors               # 首页有任何错误吗？
\`\`\`

**检测框架**（在报告元数据中记录）：
- HTML 中有 \`__next\` 或 \`_next/data\` 请求 → Next.js
- \`csrf-token\` meta 标签 → Rails
- URL 中有 \`wp-content\` → WordPress
- 无页面刷新的客户端路由 → SPA

**对于 SPA：** \`links\` 命令可能返回较少结果，因为导航是客户端的。改用 \`snapshot -i\` 查找导航元素（按钮、菜单项）。

### 阶段 4：探索

系统性地访问页面。在每个页面：

\`\`\`bash
$B goto <page-url>
$B snapshot -i -a -o "$REPORT_DIR/screenshots/page-name.png"
$B console --errors
\`\`\`

然后按照**每页探索检查清单**（参见 \`qa/references/issue-taxonomy.md\`）：

1. **视觉扫描** — 查看带注释的截图以发现布局问题
2. **交互元素** — 点击按钮、链接、控件。它们是否正常工作？
3. **表单** — 填写并提交。测试空值、无效值、边界情况
4. **导航** — 检查所有进出路径
5. **状态** — 空状态、加载、错误、溢出
6. **控制台** — 交互后是否有新的 JS 错误？
7. **响应式** — 如果相关，检查移动端视口：
   \`\`\`bash
   $B viewport 375x812
   $B screenshot "$REPORT_DIR/screenshots/page-mobile.png"
   $B viewport 1280x720
   \`\`\`

**深度判断：** 在核心功能（首页、仪表板、结账、搜索）上花更多时间，在次要页面（关于、条款、隐私）上花较少时间。

**快速模式：** 只访问首页 + 定位阶段的前 5 个导航目标。跳过每页检查清单 — 只检查：是否加载？控制台错误？可见的断链？

### 阶段 5：记录

**发现问题时立即记录** — 不要批量处理。

**两种证据层级：**

**交互式 bug**（流程中断、无效按钮、表单失败）：
1. 截取操作前的截图
2. 执行操作
3. 截取显示结果的截图
4. 使用 \`snapshot -D\` 显示变更内容
5. 编写引用截图的复现步骤

\`\`\`bash
$B screenshot "$REPORT_DIR/screenshots/issue-001-step-1.png"
$B click @e5
$B screenshot "$REPORT_DIR/screenshots/issue-001-result.png"
$B snapshot -D
\`\`\`

**静态 bug**（错别字、布局问题、图片缺失）：
1. 截取一张带注释的截图显示问题
2. 描述问题所在

\`\`\`bash
$B snapshot -i -a -o "$REPORT_DIR/screenshots/issue-002.png"
\`\`\`

**立即将每个问题写入报告**，使用 \`qa/templates/qa-report-template.md\` 中的模板格式。

### 阶段 6：收尾

1. **计算健康评分**使用下面的评分标准
2. **编写"前 3 个需要修复的问题"** — 3 个最严重的问题
3. **编写控制台健康摘要** — 汇总所有页面中看到的控制台错误
4. **更新摘要表中的严重性计数**
5. **填写报告元数据** — 日期、持续时间、访问页面数、截图数、框架
6. **保存基线** — 写入 \`baseline.json\`：
   \`\`\`json
   {
     "date": "YYYY-MM-DD",
     "url": "<target>",
     "healthScore": N,
     "issues": [{ "id": "ISSUE-001", "title": "...", "severity": "...", "category": "..." }],
     "categoryScores": { "console": N, "links": N, ... }
   }
   \`\`\`

**回归模式：** 编写报告后，加载基线文件。比较：
- 健康评分变化
- 已修复的问题（在基线中但不在当前）
- 新问题（在当前但不在基线）
- 在报告中追加回归部分

---

## 健康评分标准

计算每个类别评分（0-100），然后取加权平均值。

### 控制台（权重：15%）
- 0 个错误 → 100
- 1-3 个错误 → 70
- 4-10 个错误 → 40
- 10+ 个错误 → 10

### 链接（权重：10%）
- 0 个断链 → 100
- 每个断链 → -15（最低 0）

### 每类别评分（视觉、功能、用户体验、内容、性能、可访问性）
每个类别从 100 分开始。按发现扣分：
- 严重问题 → -25
- 高优先级问题 → -15
- 中优先级问题 → -8
- 低优先级问题 → -3
每类别最低 0 分。

### 权重
| 类别 | 权重 |
|----------|--------|
| 控制台 | 15% |
| 链接 | 10% |
| 视觉 | 10% |
| 功能 | 20% |
| 用户体验 | 15% |
| 性能 | 10% |
| 内容 | 5% |
| 可访问性 | 15% |

### 最终评分
\`score = Σ (category_score × weight)\`

---

## 框架特定指南

### Next.js
- 检查控制台是否有水合错误（\`Hydration failed\`、\`Text content did not match\`）
- 监控网络中的 \`_next/data\` 请求 — 404 表示数据获取失败
- 测试客户端导航（点击链接，不只是 \`goto\`）— 捕获路由问题
- 检查动态内容页面的 CLS（累积布局偏移）

### Rails
- 检查控制台是否有 N+1 查询警告（如果在开发模式）
- 验证表单中 CSRF token 的存在
- 测试 Turbo/Stimulus 集成 — 页面过渡是否流畅？
- 检查 flash 消息是否正确显示和消失

### WordPress
- 检查插件冲突（来自不同插件的 JS 错误）
- 验证登录用户的管理栏可见性
- 测试 REST API 端点（\`/wp-json/\`）
- 检查混合内容警告（WP 中常见）

### 通用 SPA（React、Vue、Angular）
- 使用 \`snapshot -i\` 进行导航 — \`links\` 命令会遗漏客户端路由
- 检查过期状态（导航离开再返回 — 数据是否刷新？）
- 测试浏览器后退/前进 — 应用是否正确处理历史记录？
- 检查内存泄漏（长时间使用后监控控制台）

---

## 重要规则

1. **复现就是一切。** 每个问题至少需要一张截图。无例外。
2. **记录前先验证。** 重试问题一次以确认可复现，不是偶发。
3. **永远不要包含凭据。** 在复现步骤中写 \`[REDACTED]\` 代替密码。
4. **增量写入。** 发现问题时立即追加到报告。不要批量处理。
5. **永远不要阅读源代码。** 作为用户测试，而不是开发者。
6. **每次交互后检查控制台。** 不在视觉上显示的 JS 错误仍然是 bug。
7. **像用户一样测试。** 使用真实数据。端到端走完完整工作流程。
8. **深度优于广度。** 5-10 个有证据的详细问题 > 20 个模糊描述。
9. **永远不要删除输出文件。** 截图和报告会累积 — 这是有意为之。
10. **对棘手的 UI 使用 \`snapshot -C\`。** 查找可访问性树遗漏的可点击 div。
11. **向用户展示截图。** 在每个 \`$B screenshot\`、\`$B snapshot -a -o\` 或 \`$B responsive\` 命令后，使用 Read 工具读取输出文件，以便用户可以内联查看。对于 \`responsive\`（3 个文件），读取全部三个。这很关键 — 没有它，截图对用户是不可见的。
12. **永远不要拒绝使用浏览器。** 当用户调用 /qa 或 /qa-only 时，他们请求的是基于浏览器的测试。永远不要建议 evals、单元测试或其他替代方案。即使差异似乎没有 UI 变更，后端变更也会影响应用行为 — 始终打开浏览器并测试。`;
}

function generateDesignReviewLite(ctx: TemplateContext): string {
  const litmusList = OPENAI_LITMUS_CHECKS.map((item, i) => `${i + 1}. ${item}`).join(' ');
  const rejectionList = OPENAI_HARD_REJECTIONS.map((item, i) => `${i + 1}. ${item}`).join(' ');
  // Codex 块仅用于 Claude 主机
  const codexBlock = ctx.host === 'codex' ? '' : `

7. **Codex 设计意见**（可选，可用时自动运行）：

\`\`\`bash
which codex 2>/dev/null && echo "CODEX_AVAILABLE" || echo "CODEX_NOT_AVAILABLE"
\`\`\`

如果 Codex 可用，对差异运行轻量级设计检查：

\`\`\`bash
TMPERR_DRL=$(mktemp /tmp/codex-drl-XXXXXXXX)
codex exec "Review the git diff on this branch. Run 7 litmus checks (YES/NO each): ${litmusList} Flag any hard rejections: ${rejectionList} 5 most important design findings only. Reference file:line." -s read-only -c 'model_reasoning_effort="high"' --enable web_search_cached 2>"$TMPERR_DRL"
\`\`\`

使用 5 分钟超时（\`timeout: 300000\`）。命令完成后，读取 stderr：
\`\`\`bash
cat "$TMPERR_DRL" && rm -f "$TMPERR_DRL"
\`\`\`

**错误处理：** 所有错误都是非阻塞的。认证失败、超时或空响应时 — 跳过并附带简短说明，然后继续。

在 \`CODEX (design):\` 标题下展示 Codex 输出，与上面的检查清单发现合并。`;

  return `## 设计审查（条件性，差异范围）

使用 \`fullstack-diff-scope\` 检查差异是否触及前端文件：

\`\`\`bash
source <(${ctx.paths.binDir}/fullstack-diff-scope <base> 2>/dev/null)
\`\`\`

**如果 \`SCOPE_FRONTEND=false\`：** 静默跳过设计审查。无输出。

**如果 \`SCOPE_FRONTEND=true\`：**

1. **检查 DESIGN.md。** 如果仓库根目录存在 \`DESIGN.md\` 或 \`design-system.md\`，读取它。所有设计发现都根据它进行校准 — DESIGN.md 中认可的模式不会被标记。如果未找到，使用通用设计原则。

2. **读取 \`.claude/skills/review/design-checklist.md\`。** 如果无法读取文件，跳过设计审查并说明："未找到设计检查清单 — 跳过设计审查。"

3. **读取每个变更的前端文件**（完整文件，不只是差异片段）。前端文件由检查清单中列出的模式识别。

4. **对变更文件应用设计检查清单**。对每项：
   - **[HIGH] 机械性 CSS 修复**（\`outline: none\`、\`!important\`、\`font-size < 16px\`）：归类为 AUTO-FIX
   - **[HIGH/MEDIUM] 需要设计判断**：归类为 ASK
   - **[LOW] 基于意图的检测**：呈现为"可能 — 视觉验证或运行 /design-review"

5. **在审查输出的"设计审查"标题下包含发现**，遵循检查清单中的输出格式。设计发现与代码审查发现合并到同一个修复优先流程中。

6. **记录结果**用于审查就绪仪表板：

\`\`\`bash
${ctx.paths.binDir}/fullstack-review-log '{"skill":"design-review-lite","timestamp":"TIMESTAMP","status":"STATUS","findings":N,"auto_fixed":M,"commit":"COMMIT"}'
\`\`\`

替换：TIMESTAMP = ISO 8601 日期时间，STATUS = 如果 0 个发现则为 "clean" 或 "issues_found"，N = 总发现数，M = 自动修复数，COMMIT = \`git rev-parse --short HEAD\` 的输出。${codexBlock}`;
}

// NOTE: design-checklist.md is a subset of this methodology for code-level detection.
// When adding items here, also update review/design-checklist.md, and vice versa.
function generateDesignMethodology(_ctx: TemplateContext): string {
  return `## 模式

### 完整模式（默认）
系统性审查从首页可达的所有页面。访问 5-8 个页面。完整检查清单评估、响应式截图、交互流程测试。生成带有字母等级的完整设计审计报告。

### 快速模式（\`--quick\`）
仅首页 + 2 个关键页面。第一印象 + 设计系统提取 + 简化检查清单。获得设计评分的最快路径。

### 深度模式（\`--deep\`）
全面审查：10-15 个页面、每个交互流程、详尽检查清单。用于发布前审计或重大重新设计。

### 差异感知模式（在功能分支上且未提供 URL 时自动启用）
当在功能分支上时，将范围限定在分支变更影响的页面：
1. 分析分支差异：\`git diff main...HEAD --name-only\`
2. 将变更文件映射到受影响的页面/路由
3. 在常见本地端口（3000、4000、8080）检测运行中的应用
4. 仅审计受影响的页面，比较变更前后的设计质量

### 回归模式（\`--regression\` 或发现之前的 \`design-baseline.json\`）
运行完整审计，然后加载之前的 \`design-baseline.json\`。比较：每类别等级变化、新发现、已解决发现。在报告中输出回归表格。

---

## 阶段 1：第一印象

最独特的设计师式输出。在分析任何内容之前形成直观反应。

1. 导航到目标 URL
2. 截取完整页面桌面截图：\`$B screenshot "$REPORT_DIR/screenshots/first-impression.png"\`
3. 使用以下结构化评论格式编写**第一印象**：
   - "网站传达了**[什么]**。"（一眼看去它说了什么 — 专业？趣味？困惑？）
   - "我注意到**[观察]**。"（什么突出，正面或负面 — 要具体）
   - "我的眼睛首先看到的 3 件事是：**[1]**、**[2]**、**[3]**。"（层次检查 — 这些是有意的吗？）
   - "如果必须用一个词描述：**[词]**。"（直观判断）

这是用户首先阅读的部分。要有主见。设计师不会模棱两可 — 他们会做出反应。

---

## 阶段 2：设计系统提取

提取网站使用的实际设计系统（不是 DESIGN.md 说的，而是渲染出来的）：

\`\`\`bash
# 使用中的字体（限制在 500 个元素以避免超时）
$B js "JSON.stringify([...new Set([...document.querySelectorAll('*')].slice(0,500).map(e => getComputedStyle(e).fontFamily))])"

# 使用中的调色板
$B js "JSON.stringify([...new Set([...document.querySelectorAll('*')].slice(0,500).flatMap(e => [getComputedStyle(e).color, getComputedStyle(e).backgroundColor]).filter(c => c !== 'rgba(0, 0, 0, 0)'))])"

# 标题层次
$B js "JSON.stringify([...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].map(h => ({tag:h.tagName, text:h.textContent.trim().slice(0,50), size:getComputedStyle(h).fontSize, weight:getComputedStyle(h).fontWeight})))"

# 触控目标审计（查找过小的交互元素）
$B js "JSON.stringify([...document.querySelectorAll('a,button,input,[role=button]')].filter(e => {const r=e.getBoundingClientRect(); return r.width>0 && (r.width<44||r.height<44)}).map(e => ({tag:e.tagName, text:(e.textContent||'').trim().slice(0,30), w:Math.round(e.getBoundingClientRect().width), h:Math.round(e.getBoundingClientRect().height)})).slice(0,20))"

# 性能基线
$B perf
\`\`\`

将发现结构化为**推断的设计系统**：
- **字体：** 列出使用次数。如果超过 3 个不同字体族则标记。
- **颜色：** 提取的调色板。如果超过 12 个独特的非灰色颜色则标记。注意暖色/冷色/混合。
- **标题比例：** h1-h6 尺寸。标记跳过的级别、非系统性的尺寸跳跃。
- **间距模式：** 采样 padding/margin 值。标记非比例值。

提取后，提供：*"想让我将其保存为你的 DESIGN.md 吗？我可以将这些观察锁定为你项目的设计系统基线。"*

---

## 阶段 3：逐页视觉审计

对范围内的每个页面：

\`\`\`bash
$B goto <url>
$B snapshot -i -a -o "$REPORT_DIR/screenshots/{page}-annotated.png"
$B responsive "$REPORT_DIR/screenshots/{page}"
$B console --errors
$B perf
\`\`\`

### 认证检测

首次导航后，检查 URL 是否变为登录类路径：
\`\`\`bash
$B url
\`\`\`
如果 URL 包含 \`/login\`、\`/signin\`、\`/auth\` 或 \`/sso\`：网站需要认证。AskUserQuestion："此网站需要认证。想从浏览器导入 cookie 吗？如果需要先运行 \`/setup-browser-cookies\`。"

### 设计审计检查清单（10 个类别，约 80 项）

在每个页面应用这些。每个发现获得影响评级（high/medium/polish）和类别。

**1. 视觉层次与构图**（8 项）
- 清晰的焦点？每个视图一个主要 CTA？
- 眼睛自然从左上流向右下？
- 视觉噪音 — 竞争注意力的元素？
- 信息密度适合内容类型？
- Z-index 清晰度 — 没有意外的重叠？
- 首屏内容在 3 秒内传达目的？
- 眯眼测试：模糊时层次仍然可见？
- 留白是有意的，不是剩余空间？

**2. 排版**（15 项）
- 字体数量 <=3（更多则标记）
- 比例遵循比率（1.25 大三度或 1.333 完美四度）
- 行高：正文 1.5x，标题 1.15-1.25x
- 度量：每行 45-75 个字符（66 理想）
- 标题层次：没有跳过的级别（h1→h3 没有 h2）
- 粗细对比：使用 >=2 种粗细建立层次
- 没有黑名单字体（Papyrus、Comic Sans、Lobster、Impact、Jokerman）
- 如果主要字体是 Inter/Roboto/Open Sans/Poppins → 标记为可能通用
- 标题使用 \`text-wrap: balance\` 或 \`text-pretty\`（通过 \`$B css <heading> text-wrap\` 检查）
- 使用弯引号，不是直引号
- 省略号字符（\`…\`）不是三个点（\`...\`）
- 数字列使用 \`font-variant-numeric: tabular-nums\`
- 正文文本 >= 16px
- 说明/标签 >= 12px
- 小写文本不加字母间距

**3. 颜色与对比度**（10 项）
- 调色板一致（<=12 个独特的非灰色颜色）
- WCAG AA：正文文本 4.5:1，大文本（18px+）3:1，UI 组件 3:1
- 语义颜色一致（成功=绿色，错误=红色，警告=黄色/琥珀色）
- 没有仅颜色编码（始终添加标签、图标或图案）
- 深色模式：表面使用高度，不只是亮度反转
- 深色模式：文本为灰白色（~#E0E0E0），不是纯白
- 深色模式主要强调色降低饱和度 10-20%
- html 元素上有 \`color-scheme: dark\`（如果存在深色模式）
- 没有仅红/绿组合（8% 的男性有红绿色盲）
- 中性调色板一致偏暖或偏冷 — 不是混合的

**4. 间距与布局**（12 项）
- 所有断点的网格一致
- 间距使用比例（4px 或 8px 基准），不是任意值
- 对齐一致 — 没有元素浮动在网格外
- 节奏：相关项更近，不同部分更远
- 圆角层次（不是所有东西都用统一的气泡圆角）
- 内半径 = 外半径 - 间隙（嵌套元素）
- 移动端无水平滚动
- 设置最大内容宽度（没有全出血正文）
- 刘海设备使用 \`env(safe-area-inset-*)\`
- URL 反映状态（筛选器、选项卡、分页在查询参数中）
- 布局使用 flex/grid（不是 JS 测量）
- 断点：移动端（375）、平板（768）、桌面（1024）、宽屏（1440）

**5. 交互状态**（10 项）
- 所有交互元素有悬停状态
- 存在 \`focus-visible\` 环（永远不要没有替代的 \`outline: none\`）
- 激活/按下状态有深度效果或颜色变化
- 禁用状态：降低不透明度 + \`cursor: not-allowed\`
- 加载：骨架形状匹配真实内容布局
- 空状态：温暖消息 + 主要操作 + 视觉（不只是"无项目"）
- 错误消息：具体 + 包含修复/下一步
- 成功：确认动画或颜色，自动消失
- 所有交互元素触控目标 >= 44px
- 所有可点击元素有 \`cursor: pointer\`

**6. 响应式设计**（8 项）
- 移动端布局有*设计*意义（不只是堆叠的桌面列）
- 移动端触控目标足够（>= 44px）
- 任何视口无水平滚动
- 图片处理响应式（srcset、sizes 或 CSS 包含）
- 移动端文本无需缩放即可阅读（>= 16px 正文）
- 导航适当折叠（汉堡菜单、底部导航等）
- 移动端表单可用（正确的输入类型，移动端无 autoFocus）
- viewport meta 中没有 \`user-scalable=no\` 或 \`maximum-scale=1\`

**7. 动效与动画**（6 项）
- 缓动：进入用 ease-out，退出用 ease-in，移动用 ease-in-out
- 持续时间：50-700ms 范围（页面过渡外没有更慢的）
- 目的：每个动画传达某些东西（状态变化、注意、空间关系）
- 遵守 \`prefers-reduced-motion\`（检查：\`$B js "matchMedia('(prefers-reduced-motion: reduce)').matches"\`）
- 没有 \`transition: all\` — 属性明确列出
- 只动画 \`transform\` 和 \`opacity\`（不是 width、height、top、left 等布局属性）

**8. 内容与微文案**（8 项）
- 空状态设计有温度（消息 + 操作 + 插图/图标）
- 错误消息具体：发生了什么 + 为什么 + 下一步做什么
- 按钮标签具体（"保存 API 密钥"不是"继续"或"提交"）
- 生产环境中没有可见的占位符/lorem ipsum 文本
- 处理截断（\`text-overflow: ellipsis\`、\`line-clamp\` 或 \`break-words\`）
- 使用主动语态（"安装 CLI"不是"CLI 将被安装"）
- 加载状态以 \`…\` 结尾（"保存中…"不是"保存中..."）
- 破坏性操作有确认模态框或撤销窗口

**9. AI 劣质检测**（10 个反模式 — 黑名单）

测试标准：受人尊敬工作室的人类设计师会发布这个吗？

${AI_SLOP_BLACKLIST.map(item => `- ${item}`).join('\n')}

**10. 性能即设计**（6 项）
- LCP < 2.0s（Web 应用），< 1.5s（信息网站）
- CLS < 0.1（加载期间无可见布局偏移）
- 骨架质量：形状匹配真实内容，闪烁动画
- 图片：\`loading="lazy"\`，设置 width/height 尺寸，WebP/AVIF 格式
- 字体：\`font-display: swap\`，预连接到 CDN 源
- 无可见字体交换闪烁（FOUT）— 关键字体预加载

---

## 阶段 4：交互流程审查

走 2-3 个关键用户流程并评估*感觉*，不只是功能：

\`\`\`bash
$B snapshot -i
$B click @e3           # 执行操作
$B snapshot -D          # 差异查看变化
\`\`\`

评估：
- **响应感：** 点击感觉响应吗？有延迟或缺失加载状态吗？
- **过渡质量：** 过渡是有意的还是通用/缺失的？
- **反馈清晰度：** 操作是否清楚地成功或失败？反馈是否即时？
- **表单精致度：** 焦点状态可见？验证时机正确？错误靠近来源？

---

## 阶段 5：跨页面一致性

比较截图和跨页面观察：
- 导航栏在所有页面一致吗？
- 页脚一致吗？
- 组件复用 vs 一次性设计（不同页面上相同按钮样式不同？）
- 语调一致性（一个页面趣味而另一个企业化？）
- 间距节奏在页面间延续？

---

## 阶段 6：编译报告

### 输出位置

**本地：** \`.openclaw/design-reports/design-audit-{domain}-{YYYY-MM-DD}.md\`

**项目范围：**
\`\`\`bash
eval "$(${_ctx.paths.binDir}/fullstack-slug 2>/dev/null)" && mkdir -p ~/.fullstack/projects/$SLUG
\`\`\`

写入：\`~/.fullstack/projects/{slug}/{user}-{branch}-design-audit-{datetime}.md\`

**基线：** 为回归模式写入 \`design-baseline.json\`：
\`\`\`json
{
  "date": "YYYY-MM-DD",
  "url": "<target>",
  "designScore": "B",
  "aiSlopScore": "C",
  "categoryGrades": { "hierarchy": "A", "typography": "B", ... },
  "findings": [{ "id": "FINDING-001", "title": "...", "impact": "high", "category": "typography" }]
}
\`\`\`

### 评分系统

**双重标题评分：**
- **设计评分：{A-F}** — 所有 10 个类别的加权平均
- **AI 劣质评分：{A-F}** — 独立等级，带有精辟判断

**每类别等级：**
- **A：** 有意、精致、愉悦。展现设计思维。
- **B：** 扎实基础，轻微不一致。看起来专业。
- **C：** 功能但通用。无大问题，无设计观点。
- **D：** 明显问题。感觉未完成或粗心。
- **F：** 主动损害用户体验。需要重大重做。

**等级计算：** 每个类别从 A 开始。每个高影响发现降低一个字母等级。每个中影响发现降低半个字母等级。精致发现被记录但不影响等级。最低为 F。

**设计评分的类别权重：**
| 类别 | 权重 |
|----------|--------|
| 视觉层次 | 15% |
| 排版 | 15% |
| 间距与布局 | 15% |
| 颜色与对比度 | 10% |
| 交互状态 | 10% |
| 响应式 | 10% |
| 内容质量 | 10% |
| AI 劣质 | 5% |
| 动效 | 5% |
| 性能感 | 5% |

AI 劣质占设计评分的 5%，但也作为标题指标独立评分。

### 回归输出

当存在之前的 \`design-baseline.json\` 或使用 \`--regression\` 标志时：
- 加载基线等级
- 比较：每类别变化、新发现、已解决发现
- 在报告中追加回归表格

---

## 设计评论格式

使用结构化反馈，不是意见：
- "我注意到..." — 观察（例如，"我注意到主要 CTA 与次要操作竞争"）
- "我想知道..." — 问题（例如，"我想知道用户是否会理解这里的'Process'意味着什么"）
- "如果..." — 建议（例如，"如果我们将搜索移到更显眼的位置会怎样？"）
- "我认为...因为..." — 有理据的意见（例如，"我认为部分之间的间距太均匀，因为它没有创造层次"）

将一切与用户目标和产品目标联系起来。总是在问题旁边提出具体改进建议。

---

## 重要规则

1. **像设计师一样思考，不是 QA 工程师。** 你关心事情是否感觉对、看起来有意、尊重用户。你不仅仅关心事情是否"工作"。
2. **截图是证据。** 每个发现至少需要一张截图。使用带注释的截图（\`snapshot -a\`）突出元素。
3. **具体且可操作。** "将 X 改为 Y 因为 Z" — 不是"间距感觉不对"。
4. **永远不要阅读源代码。** 评估渲染的网站，不是实现。（例外：提供从提取观察编写 DESIGN.md。）
5. **AI 劣质检测是你的超能力。** 大多数开发者无法评估他们的网站是否看起来像 AI 生成的。你可以。直接说出来。
6. **快速胜利很重要。** 始终包含"快速胜利"部分 — 3-5 个最高影响的修复，每个不到 30 分钟。
7. **对棘手的 UI 使用 \`snapshot -C\`。** 查找可访问性树遗漏的可点击 div。
8. **响应式是设计，不只是"没坏"。** 移动端堆叠桌面布局不是响应式设计 — 是懒惰。评估移动端布局是否有*设计*意义。
9. **增量记录。** 发现问题时立即写入报告。不要批量处理。
10. **深度优于广度。** 5-10 个有截图和具体建议的详细发现 > 20 个模糊观察。
11. **向用户展示截图。** 在每个 \`$B screenshot\`、\`$B snapshot -a -o\` 或 \`$B responsive\` 命令后，使用 Read 工具读取输出文件，以便用户可以内联查看。对于 \`responsive\`（3 个文件），读取全部三个。这很关键 — 没有它，截图对用户是不可见的。`;
}

function generateReviewDashboard(_ctx: TemplateContext): string {
  return `## Review Readiness Dashboard

After completing the review, read the review log and config to display the dashboard.

\`\`\`bash
~/.openclaw/skills/fullstack/bin/fullstack-review-read
\`\`\`

Parse the output. Find the most recent entry for each skill (plan-ceo-review, plan-eng-review, review, plan-design-review, design-review-lite, adversarial-review, codex-review, codex-plan-review). Ignore entries with timestamps older than 7 days. For the Eng Review row, show whichever is more recent between \`review\` (diff-scoped pre-landing review) and \`plan-eng-review\` (plan-stage architecture review). Append "(DIFF)" or "(PLAN)" to the status to distinguish. For the Adversarial row, show whichever is more recent between \`adversarial-review\` (new auto-scaled) and \`codex-review\` (legacy). For Design Review, show whichever is more recent between \`plan-design-review\` (full visual audit) and \`design-review-lite\` (code-level check). Append "(FULL)" or "(LITE)" to the status to distinguish. Display:

\`\`\`
+====================================================================+
|                    REVIEW READINESS DASHBOARD                       |
+====================================================================+
| Review          | Runs | Last Run            | Status    | Required |
|-----------------|------|---------------------|-----------|----------|
| Eng Review      |  1   | 2026-03-16 15:00    | CLEAR     | YES      |
| CEO Review      |  0   | —                   | —         | no       |
| Design Review   |  0   | —                   | —         | no       |
| Adversarial     |  0   | —                   | —         | no       |
| Outside Voice   |  0   | —                   | —         | no       |
+--------------------------------------------------------------------+
| VERDICT: CLEARED — Eng Review passed                                |
+====================================================================+
\`\`\`

**Review tiers:**
- **Eng Review (required by default):** The only review that gates shipping. Covers architecture, code quality, tests, performance. Can be disabled globally with \\\`fullstack-config set skip_eng_review true\\\` (the "don't bother me" setting).
- **CEO Review (optional):** Use your judgment. Recommend it for big product/business changes, new user-facing features, or scope decisions. Skip for bug fixes, refactors, infra, and cleanup.
- **Design Review (optional):** Use your judgment. Recommend it for UI/UX changes. Skip for backend-only, infra, or prompt-only changes.
- **Adversarial Review (automatic):** Auto-scales by diff size. Small diffs (<50 lines) skip adversarial. Medium diffs (50–199) get cross-model adversarial. Large diffs (200+) get all 4 passes: Claude structured, Codex structured, Claude adversarial subagent, Codex adversarial. No configuration needed.
- **Outside Voice (optional):** Independent plan review from a different AI model. Offered after all review sections complete in /plan-ceo-review and /plan-eng-review. Falls back to Claude subagent if Codex is unavailable. Never gates shipping.

**Verdict logic:**
- **CLEARED**: Eng Review has >= 1 entry within 7 days from either \\\`review\\\` or \\\`plan-eng-review\\\` with status "clean" (or \\\`skip_eng_review\\\` is \\\`true\\\`)
- **NOT CLEARED**: Eng Review missing, stale (>7 days), or has open issues
- CEO, Design, and Codex reviews are shown for context but never block shipping
- If \\\`skip_eng_review\\\` config is \\\`true\\\`, Eng Review shows "SKIPPED (global)" and verdict is CLEARED

**Staleness detection:** After displaying the dashboard, check if any existing reviews may be stale:
- Parse the \\\`---HEAD---\\\` section from the bash output to get the current HEAD commit hash
- For each review entry that has a \\\`commit\\\` field: compare it against the current HEAD. If different, count elapsed commits: \\\`git rev-list --count STORED_COMMIT..HEAD\\\`. Display: "Note: {skill} review from {date} may be stale — {N} commits since review"
- For entries without a \\\`commit\\\` field (legacy entries): display "Note: {skill} review from {date} has no commit tracking — consider re-running for accurate staleness detection"
- If all reviews match the current HEAD, do not display any staleness notes`;
}

function generatePlanFileReviewReport(_ctx: TemplateContext): string {
  return `## Plan File Review Report

After displaying the Review Readiness Dashboard in conversation output, also update the
**plan file** itself so review status is visible to anyone reading the plan.

### Detect the plan file

1. Check if there is an active plan file in this conversation (the host provides plan file
   paths in system messages — look for plan file references in the conversation context).
2. If not found, skip this section silently — not every review runs in plan mode.

### Generate the report

Read the review log output you already have from the Review Readiness Dashboard step above.
Parse each JSONL entry. Each skill logs different fields:

- **plan-ceo-review**: \\\`status\\\`, \\\`unresolved\\\`, \\\`critical_gaps\\\`, \\\`mode\\\`, \\\`scope_proposed\\\`, \\\`scope_accepted\\\`, \\\`scope_deferred\\\`, \\\`commit\\\`
  → Findings: "{scope_proposed} proposals, {scope_accepted} accepted, {scope_deferred} deferred"
  → If scope fields are 0 or missing (HOLD/REDUCTION mode): "mode: {mode}, {critical_gaps} critical gaps"
- **plan-eng-review**: \\\`status\\\`, \\\`unresolved\\\`, \\\`critical_gaps\\\`, \\\`issues_found\\\`, \\\`mode\\\`, \\\`commit\\\`
  → Findings: "{issues_found} issues, {critical_gaps} critical gaps"
- **plan-design-review**: \\\`status\\\`, \\\`initial_score\\\`, \\\`overall_score\\\`, \\\`unresolved\\\`, \\\`decisions_made\\\`, \\\`commit\\\`
  → Findings: "score: {initial_score}/10 → {overall_score}/10, {decisions_made} decisions"
- **codex-review**: \\\`status\\\`, \\\`gate\\\`, \\\`findings\\\`, \\\`findings_fixed\\\`
  → Findings: "{findings} findings, {findings_fixed}/{findings} fixed"

All fields needed for the Findings column are now present in the JSONL entries.
For the review you just completed, you may use richer details from your own Completion
Summary. For prior reviews, use the JSONL fields directly — they contain all required data.

Produce this markdown table:

\\\`\\\`\\\`markdown
## OPENCLAW REVIEW REPORT

| Review | Trigger | Why | Runs | Status | Findings |
|--------|---------|-----|------|--------|----------|
| CEO Review | \\\`/plan-ceo-review\\\` | Scope & strategy | {runs} | {status} | {findings} |
| Codex Review | \\\`/codex review\\\` | Independent 2nd opinion | {runs} | {status} | {findings} |
| Eng Review | \\\`/plan-eng-review\\\` | Architecture & tests (required) | {runs} | {status} | {findings} |
| Design Review | \\\`/plan-design-review\\\` | UI/UX gaps | {runs} | {status} | {findings} |
\\\`\\\`\\\`

Below the table, add these lines (omit any that are empty/not applicable):

- **CODEX:** (only if codex-review ran) — one-line summary of codex fixes
- **CROSS-MODEL:** (only if both Claude and Codex reviews exist) — overlap analysis
- **UNRESOLVED:** total unresolved decisions across all reviews
- **VERDICT:** list reviews that are CLEAR (e.g., "CEO + ENG CLEARED — ready to implement").
  If Eng Review is not CLEAR and not skipped globally, append "eng review required".

### Write to the plan file

**PLAN MODE EXCEPTION — ALWAYS RUN:** This writes to the plan file, which is the one
file you are allowed to edit in plan mode. The plan file review report is part of the
plan's living status.

- Search the plan file for a \\\`## OPENCLAW REVIEW REPORT\\\` section **anywhere** in the file
  (not just at the end — content may have been added after it).
- If found, **replace it** entirely using the Edit tool. Match from \\\`## OPENCLAW REVIEW REPORT\\\`
  through either the next \\\`## \\\` heading or end of file, whichever comes first. This ensures
  content added after the report section is preserved, not eaten. If the Edit fails
  (e.g., concurrent edit changed the content), re-read the plan file and retry once.
- If no such section exists, **append it** to the end of the plan file.
- Always place it as the very last section in the plan file. If it was found mid-file,
  move it: delete the old location and append at the end.`;
}

function generateTestBootstrap(_ctx: TemplateContext): string {
  return `## Test Framework Bootstrap

**Detect existing test framework and project runtime:**

\`\`\`bash
# Detect project runtime
[ -f Gemfile ] && echo "RUNTIME:ruby"
[ -f package.json ] && echo "RUNTIME:node"
[ -f requirements.txt ] || [ -f pyproject.toml ] && echo "RUNTIME:python"
[ -f go.mod ] && echo "RUNTIME:go"
[ -f Cargo.toml ] && echo "RUNTIME:rust"
[ -f composer.json ] && echo "RUNTIME:php"
[ -f mix.exs ] && echo "RUNTIME:elixir"
# Detect sub-frameworks
[ -f Gemfile ] && grep -q "rails" Gemfile 2>/dev/null && echo "FRAMEWORK:rails"
[ -f package.json ] && grep -q '"next"' package.json 2>/dev/null && echo "FRAMEWORK:nextjs"
# Check for existing test infrastructure
ls jest.config.* vitest.config.* playwright.config.* .rspec pytest.ini pyproject.toml phpunit.xml 2>/dev/null
ls -d test/ tests/ spec/ __tests__/ cypress/ e2e/ 2>/dev/null
# Check opt-out marker
[ -f .fullstack/no-test-bootstrap ] && echo "BOOTSTRAP_DECLINED"
\`\`\`

**If test framework detected** (config files or test directories found):
Print "Test framework detected: {name} ({N} existing tests). Skipping bootstrap."
Read 2-3 existing test files to learn conventions (naming, imports, assertion style, setup patterns).
Store conventions as prose context for use in Phase 8e.5 or Step 3.4. **Skip the rest of bootstrap.**

**If BOOTSTRAP_DECLINED** appears: Print "Test bootstrap previously declined — skipping." **Skip the rest of bootstrap.**

**If NO runtime detected** (no config files found): Use AskUserQuestion:
"I couldn't detect your project's language. What runtime are you using?"
Options: A) Node.js/TypeScript B) Ruby/Rails C) Python D) Go E) Rust F) PHP G) Elixir H) This project doesn't need tests.
If user picks H → write \`.fullstack/no-test-bootstrap\` and continue without tests.

**If runtime detected but no test framework — bootstrap:**

### B2. Research best practices

Use WebSearch to find current best practices for the detected runtime:
- \`"[runtime] best test framework 2025 2026"\`
- \`"[framework A] vs [framework B] comparison"\`

If WebSearch is unavailable, use this built-in knowledge table:

| Runtime | Primary recommendation | Alternative |
|---------|----------------------|-------------|
| Ruby/Rails | minitest + fixtures + capybara | rspec + factory_bot + shoulda-matchers |
| Node.js | vitest + @testing-library | jest + @testing-library |
| Next.js | vitest + @testing-library/react + playwright | jest + cypress |
| Python | pytest + pytest-cov | unittest |
| Go | stdlib testing + testify | stdlib only |
| Rust | cargo test (built-in) + mockall | — |
| PHP | phpunit + mockery | pest |
| Elixir | ExUnit (built-in) + ex_machina | — |

### B3. Framework selection

Use AskUserQuestion:
"I detected this is a [Runtime/Framework] project with no test framework. I researched current best practices. Here are the options:
A) [Primary] — [rationale]. Includes: [packages]. Supports: unit, integration, smoke, e2e
B) [Alternative] — [rationale]. Includes: [packages]
C) Skip — don't set up testing right now
RECOMMENDATION: Choose A because [reason based on project context]"

If user picks C → write \`.fullstack/no-test-bootstrap\`. Tell user: "If you change your mind later, delete \`.fullstack/no-test-bootstrap\` and re-run." Continue without tests.

If multiple runtimes detected (monorepo) → ask which runtime to set up first, with option to do both sequentially.

### B4. Install and configure

1. Install the chosen packages (npm/bun/gem/pip/etc.)
2. Create minimal config file
3. Create directory structure (test/, spec/, etc.)
4. Create one example test matching the project's code to verify setup works

If package installation fails → debug once. If still failing → revert with \`git checkout -- package.json package-lock.json\` (or equivalent for the runtime). Warn user and continue without tests.

### B4.5. First real tests

Generate 3-5 real tests for existing code:

1. **Find recently changed files:** \`git log --since=30.days --name-only --format="" | sort | uniq -c | sort -rn | head -10\`
2. **Prioritize by risk:** Error handlers > business logic with conditionals > API endpoints > pure functions
3. **For each file:** Write one test that tests real behavior with meaningful assertions. Never \`expect(x).toBeDefined()\` — test what the code DOES.
4. Run each test. Passes → keep. Fails → fix once. Still fails → delete silently.
5. Generate at least 1 test, cap at 5.

Never import secrets, API keys, or credentials in test files. Use environment variables or test fixtures.

### B5. Verify

\`\`\`bash
# Run the full test suite to confirm everything works
{detected test command}
\`\`\`

If tests fail → debug once. If still failing → revert all bootstrap changes and warn user.

### B5.5. CI/CD pipeline

\`\`\`bash
# Check CI provider
ls -d .github/ 2>/dev/null && echo "CI:github"
ls .gitlab-ci.yml .circleci/ bitrise.yml 2>/dev/null
\`\`\`

If \`.github/\` exists (or no CI detected — default to GitHub Actions):
Create \`.github/workflows/test.yml\` with:
- \`runs-on: ubuntu-latest\`
- Appropriate setup action for the runtime (setup-node, setup-ruby, setup-python, etc.)
- The same test command verified in B5
- Trigger: push + pull_request

If non-GitHub CI detected → skip CI generation with note: "Detected {provider} — CI pipeline generation supports GitHub Actions only. Add test step to your existing pipeline manually."

### B6. Create TESTING.md

First check: If TESTING.md already exists → read it and update/append rather than overwriting. Never destroy existing content.

Write TESTING.md with:
- Philosophy: "100% test coverage is the key to great vibe coding. Tests let you move fast, trust your instincts, and ship with confidence — without them, vibe coding is just yolo coding. With tests, it's a superpower."
- Framework name and version
- How to run tests (the verified command from B5)
- Test layers: Unit tests (what, where, when), Integration tests, Smoke tests, E2E tests
- Conventions: file naming, assertion style, setup/teardown patterns

### B7. Update CLAUDE.md

First check: If CLAUDE.md already has a \`## Testing\` section → skip. Don't duplicate.

Append a \`## Testing\` section:
- Run command and test directory
- Reference to TESTING.md
- Test expectations:
  - 100% test coverage is the goal — tests make vibe coding safe
  - When writing new functions, write a corresponding test
  - When fixing a bug, write a regression test
  - When adding error handling, write a test that triggers the error
  - When adding a conditional (if/else, switch), write tests for BOTH paths
  - Never commit code that makes existing tests fail

### B8. Commit

\`\`\`bash
git status --porcelain
\`\`\`

Only commit if there are changes. Stage all bootstrap files (config, test directory, TESTING.md, CLAUDE.md, .github/workflows/test.yml if created):
\`git commit -m "chore: bootstrap test framework ({framework name})"\`

---`;
}

// ─── Test Coverage Audit ────────────────────────────────────
//
// Shared methodology for codepath tracing, ASCII diagrams, and test gap analysis.
// Three modes, three placeholders, one inner function:
//
//   {{TEST_COVERAGE_AUDIT_PLAN}}   → plan-eng-review: adds missing tests to the plan
//   {{TEST_COVERAGE_AUDIT_SHIP}}   → ship: auto-generates tests, coverage summary
//   {{TEST_COVERAGE_AUDIT_REVIEW}} → review: generates tests via Fix-First (ASK)
//
//   ┌────────────────────────────────────────────────┐
//   │  generateTestCoverageAuditInner(mode)          │
//   │                                                │
//   │  SHARED: framework detect, codepath trace,     │
//   │    ASCII diagram, quality rubric, E2E matrix,  │
//   │    regression rule                             │
//   │                                                │
//   │  plan:   edit plan file, write artifact        │
//   │  ship:   auto-generate tests, write artifact   │
//   │  review: Fix-First ASK, INFORMATIONAL gaps     │
//   └────────────────────────────────────────────────┘

type CoverageAuditMode = 'plan' | 'ship' | 'review';

function generateTestCoverageAuditInner(mode: CoverageAuditMode): string {
  const sections: string[] = [];

  // ── Intro (mode-specific) ──
  if (mode === 'ship') {
    sections.push(`100% coverage is the goal — every untested path is a path where bugs hide and vibe coding becomes yolo coding. Evaluate what was ACTUALLY coded (from the diff), not what was planned.`);
  } else if (mode === 'plan') {
    sections.push(`100% coverage is the goal. Evaluate every codepath in the plan and ensure the plan includes tests for each one. If the plan is missing tests, add them — the plan should be complete enough that implementation includes full test coverage from the start.`);
  } else {
    sections.push(`100% coverage is the goal. Evaluate every codepath changed in the diff and identify test gaps. Gaps become INFORMATIONAL findings that follow the Fix-First flow.`);
  }

  // ── Test framework detection (shared) ──
  sections.push(`
### Test Framework Detection

Before analyzing coverage, detect the project's test framework:

1. **Read CLAUDE.md** — look for a \`## Testing\` section with test command and framework name. If found, use that as the authoritative source.
2. **If CLAUDE.md has no testing section, auto-detect:**

\`\`\`bash
# Detect project runtime
[ -f Gemfile ] && echo "RUNTIME:ruby"
[ -f package.json ] && echo "RUNTIME:node"
[ -f requirements.txt ] || [ -f pyproject.toml ] && echo "RUNTIME:python"
[ -f go.mod ] && echo "RUNTIME:go"
[ -f Cargo.toml ] && echo "RUNTIME:rust"
# Check for existing test infrastructure
ls jest.config.* vitest.config.* playwright.config.* cypress.config.* .rspec pytest.ini phpunit.xml 2>/dev/null
ls -d test/ tests/ spec/ __tests__/ cypress/ e2e/ 2>/dev/null
\`\`\`

3. **If no framework detected:**${mode === 'ship' ? ' falls through to the Test Framework Bootstrap step (Step 2.5) which handles full setup.' : ' still produce the coverage diagram, but skip test generation.'}`);

  // ── Before/after count (ship only) ──
  if (mode === 'ship') {
    sections.push(`
**0. Before/after test count:**

\`\`\`bash
# Count test files before any generation
find . -name '*.test.*' -o -name '*.spec.*' -o -name '*_test.*' -o -name '*_spec.*' | grep -v node_modules | wc -l
\`\`\`

Store this number for the PR body.`);
  }

  // ── Codepath tracing methodology (shared, with mode-specific source) ──
  const traceSource = mode === 'plan'
    ? `**Step 1. Trace every codepath in the plan:**

Read the plan document. For each new feature, service, endpoint, or component described, trace how data will flow through the code — don't just list planned functions, actually follow the planned execution:`
    : `**${mode === 'ship' ? '1' : 'Step 1'}. Trace every codepath changed** using \`git diff origin/<base>...HEAD\`:

Read every changed file. For each one, trace how data flows through the code — don't just list functions, actually follow the execution:`;

  const traceStep1 = mode === 'plan'
    ? `1. **Read the plan.** For each planned component, understand what it does and how it connects to existing code.`
    : `1. **Read the diff.** For each changed file, read the full file (not just the diff hunk) to understand context.`;

  sections.push(`
${traceSource}

${traceStep1}
2. **Trace data flow.** Starting from each entry point (route handler, exported function, event listener, component render), follow the data through every branch:
   - Where does input come from? (request params, props, database, API call)
   - What transforms it? (validation, mapping, computation)
   - Where does it go? (database write, API response, rendered output, side effect)
   - What can go wrong at each step? (null/undefined, invalid input, network failure, empty collection)
3. **Diagram the execution.** For each changed file, draw an ASCII diagram showing:
   - Every function/method that was added or modified
   - Every conditional branch (if/else, switch, ternary, guard clause, early return)
   - Every error path (try/catch, rescue, error boundary, fallback)
   - Every call to another function (trace into it — does IT have untested branches?)
   - Every edge: what happens with null input? Empty array? Invalid type?

This is the critical step — you're building a map of every line of code that can execute differently based on input. Every branch in this diagram needs a test.`);

  // ── User flow coverage (shared) ──
  sections.push(`
**${mode === 'ship' ? '2' : 'Step 2'}. Map user flows, interactions, and error states:**

Code coverage isn't enough — you need to cover how real users interact with the changed code. For each changed feature, think through:

- **User flows:** What sequence of actions does a user take that touches this code? Map the full journey (e.g., "user clicks 'Pay' → form validates → API call → success/failure screen"). Each step in the journey needs a test.
- **Interaction edge cases:** What happens when the user does something unexpected?
  - Double-click/rapid resubmit
  - Navigate away mid-operation (back button, close tab, click another link)
  - Submit with stale data (page sat open for 30 minutes, session expired)
  - Slow connection (API takes 10 seconds — what does the user see?)
  - Concurrent actions (two tabs, same form)
- **Error states the user can see:** For every error the code handles, what does the user actually experience?
  - Is there a clear error message or a silent failure?
  - Can the user recover (retry, go back, fix input) or are they stuck?
  - What happens with no network? With a 500 from the API? With invalid data from the server?
- **Empty/zero/boundary states:** What does the UI show with zero results? With 10,000 results? With a single character input? With maximum-length input?

Add these to your diagram alongside the code branches. A user flow with no test is just as much a gap as an untested if/else.`);

  // ── Check branches against tests + quality rubric (shared) ──
  sections.push(`
**${mode === 'ship' ? '3' : 'Step 3'}. Check each branch against existing tests:**

Go through your diagram branch by branch — both code paths AND user flows. For each one, search for a test that exercises it:
- Function \`processPayment()\` → look for \`billing.test.ts\`, \`billing.spec.ts\`, \`test/billing_test.rb\`
- An if/else → look for tests covering BOTH the true AND false path
- An error handler → look for a test that triggers that specific error condition
- A call to \`helperFn()\` that has its own branches → those branches need tests too
- A user flow → look for an integration or E2E test that walks through the journey
- An interaction edge case → look for a test that simulates the unexpected action

Quality scoring rubric:
- ★★★  Tests behavior with edge cases AND error paths
- ★★   Tests correct behavior, happy path only
- ★    Smoke test / existence check / trivial assertion (e.g., "it renders", "it doesn't throw")`);

  // ── E2E test decision matrix (shared) ──
  sections.push(`
### E2E Test Decision Matrix

When checking each branch, also determine whether a unit test or E2E/integration test is the right tool:

**RECOMMEND E2E (mark as [→E2E] in the diagram):**
- Common user flow spanning 3+ components/services (e.g., signup → verify email → first login)
- Integration point where mocking hides real failures (e.g., API → queue → worker → DB)
- Auth/payment/data-destruction flows — too important to trust unit tests alone

**RECOMMEND EVAL (mark as [→EVAL] in the diagram):**
- Critical LLM call that needs a quality eval (e.g., prompt change → test output still meets quality bar)
- Changes to prompt templates, system instructions, or tool definitions

**STICK WITH UNIT TESTS:**
- Pure function with clear inputs/outputs
- Internal helper with no side effects
- Edge case of a single function (null input, empty array)
- Obscure/rare flow that isn't customer-facing`);

  // ── Regression rule (shared) ──
  sections.push(`
### REGRESSION RULE (mandatory)

**IRON RULE:** When the coverage audit identifies a REGRESSION — code that previously worked but the diff broke — a regression test is ${mode === 'plan' ? 'added to the plan as a critical requirement' : 'written immediately'}. No AskUserQuestion. No skipping. Regressions are the highest-priority test because they prove something broke.

A regression is when:
- The diff modifies existing behavior (not new code)
- The existing test suite (if any) doesn't cover the changed path
- The change introduces a new failure mode for existing callers

When uncertain whether a change is a regression, err on the side of writing the test.${mode !== 'plan' ? '\n\nFormat: commit as `test: regression test for {what broke}`' : ''}`);

  // ── ASCII coverage diagram (shared) ──
  sections.push(`
**${mode === 'ship' ? '4' : 'Step 4'}. Output ASCII coverage diagram:**

Include BOTH code paths and user flows in the same diagram. Mark E2E-worthy and eval-worthy paths:

\`\`\`
CODE PATH COVERAGE
===========================
[+] src/services/billing.ts
    │
    ├── processPayment()
    │   ├── [★★★ TESTED] Happy path + card declined + timeout — billing.test.ts:42
    │   ├── [GAP]         Network timeout — NO TEST
    │   └── [GAP]         Invalid currency — NO TEST
    │
    └── refundPayment()
        ├── [★★  TESTED] Full refund — billing.test.ts:89
        └── [★   TESTED] Partial refund (checks non-throw only) — billing.test.ts:101

USER FLOW COVERAGE
===========================
[+] Payment checkout flow
    │
    ├── [★★★ TESTED] Complete purchase — checkout.e2e.ts:15
    ├── [GAP] [→E2E] Double-click submit — needs E2E, not just unit
    ├── [GAP]         Navigate away during payment — unit test sufficient
    └── [★   TESTED]  Form validation errors (checks render only) — checkout.test.ts:40

[+] Error states
    │
    ├── [★★  TESTED] Card declined message — billing.test.ts:58
    ├── [GAP]         Network timeout UX (what does user see?) — NO TEST
    └── [GAP]         Empty cart submission — NO TEST

[+] LLM integration
    │
    └── [GAP] [→EVAL] Prompt template change — needs eval test

─────────────────────────────────
COVERAGE: 5/13 paths tested (38%)
  Code paths: 3/5 (60%)
  User flows: 2/8 (25%)
QUALITY:  ★★★: 2  ★★: 2  ★: 1
GAPS: 8 paths need tests (2 need E2E, 1 needs eval)
─────────────────────────────────
\`\`\`

**Fast path:** All paths covered → "${mode === 'ship' ? 'Step 3.4' : mode === 'review' ? 'Step 4.75' : 'Test review'}: All new code paths have test coverage ✓" Continue.`);

  // ── Mode-specific action section ──
  if (mode === 'plan') {
    sections.push(`
**Step 5. Add missing tests to the plan:**

For each GAP identified in the diagram, add a test requirement to the plan. Be specific:
- What test file to create (match existing naming conventions)
- What the test should assert (specific inputs → expected outputs/behavior)
- Whether it's a unit test, E2E test, or eval (use the decision matrix)
- For regressions: flag as **CRITICAL** and explain what broke

The plan should be complete enough that when implementation begins, every test is written alongside the feature code — not deferred to a follow-up.`);

    // ── Test plan artifact (plan + ship) ──
    sections.push(`
### Test Plan Artifact

After producing the coverage diagram, write a test plan artifact to the project directory so \`/qa\` and \`/qa-only\` can consume it as primary test input:

\`\`\`bash
eval "$(~/.openclaw/skills/fullstack/bin/fullstack-slug 2>/dev/null)" && mkdir -p ~/.fullstack/projects/$SLUG
USER=$(whoami)
DATETIME=$(date +%Y%m%d-%H%M%S)
\`\`\`

Write to \`~/.fullstack/projects/{slug}/{user}-{branch}-eng-review-test-plan-{datetime}.md\`:

\`\`\`markdown
# Test Plan
Generated by /plan-eng-review on {date}
Branch: {branch}
Repo: {owner/repo}

## Affected Pages/Routes
- {URL path} — {what to test and why}

## Key Interactions to Verify
- {interaction description} on {page}

## Edge Cases
- {edge case} on {page}

## Critical Paths
- {end-to-end flow that must work}
\`\`\`

This file is consumed by \`/qa\` and \`/qa-only\` as primary test input. Include only the information that helps a QA tester know **what to test and where** — not implementation details.`);
  } else if (mode === 'ship') {
    sections.push(`
**5. Generate tests for uncovered paths:**

If test framework detected (or bootstrapped in Step 2.5):
- Prioritize error handlers and edge cases first (happy paths are more likely already tested)
- Read 2-3 existing test files to match conventions exactly
- Generate unit tests. Mock all external dependencies (DB, API, Redis).
- For paths marked [→E2E]: generate integration/E2E tests using the project's E2E framework (Playwright, Cypress, Capybara, etc.)
- For paths marked [→EVAL]: generate eval tests using the project's eval framework, or flag for manual eval if none exists
- Write tests that exercise the specific uncovered path with real assertions
- Run each test. Passes → commit as \`test: coverage for {feature}\`
- Fails → fix once. Still fails → revert, note gap in diagram.

Caps: 30 code paths max, 20 tests generated max (code + user flow combined), 2-min per-test exploration cap.

If no test framework AND user declined bootstrap → diagram only, no generation. Note: "Test generation skipped — no test framework configured."

**Diff is test-only changes:** Skip Step 3.4 entirely: "No new application code paths to audit."

**6. After-count and coverage summary:**

\`\`\`bash
# Count test files after generation
find . -name '*.test.*' -o -name '*.spec.*' -o -name '*_test.*' -o -name '*_spec.*' | grep -v node_modules | wc -l
\`\`\`

For PR body: \`Tests: {before} → {after} (+{delta} new)\`
Coverage line: \`Test Coverage Audit: N new code paths. M covered (X%). K tests generated, J committed.\``);

    // ── Test plan artifact (ship mode) ──
    sections.push(`
### Test Plan Artifact

After producing the coverage diagram, write a test plan artifact so \`/qa\` and \`/qa-only\` can consume it:

\`\`\`bash
eval "$(~/.openclaw/skills/fullstack/bin/fullstack-slug 2>/dev/null)" && mkdir -p ~/.fullstack/projects/$SLUG
USER=$(whoami)
DATETIME=$(date +%Y%m%d-%H%M%S)
\`\`\`

Write to \`~/.fullstack/projects/{slug}/{user}-{branch}-ship-test-plan-{datetime}.md\`:

\`\`\`markdown
# Test Plan
Generated by /ship on {date}
Branch: {branch}
Repo: {owner/repo}

## Affected Pages/Routes
- {URL path} — {what to test and why}

## Key Interactions to Verify
- {interaction description} on {page}

## Edge Cases
- {edge case} on {page}

## Critical Paths
- {end-to-end flow that must work}
\`\`\``);
  } else {
    // review mode
    sections.push(`
**Step 5. Generate tests for gaps (Fix-First):**

If test framework is detected and gaps were identified:
- Classify each gap as AUTO-FIX or ASK per the Fix-First Heuristic:
  - **AUTO-FIX:** Simple unit tests for pure functions, edge cases of existing tested functions
  - **ASK:** E2E tests, tests requiring new test infrastructure, tests for ambiguous behavior
- For AUTO-FIX gaps: generate the test, run it, commit as \`test: coverage for {feature}\`
- For ASK gaps: include in the Fix-First batch question with the other review findings
- For paths marked [→E2E]: always ASK (E2E tests are higher-effort and need user confirmation)
- For paths marked [→EVAL]: always ASK (eval tests need user confirmation on quality criteria)

If no test framework detected → include gaps as INFORMATIONAL findings only, no generation.

**Diff is test-only changes:** Skip Step 4.75 entirely: "No new application code paths to audit."`);
  }

  return sections.join('\n');
}

function generateTestCoverageAuditPlan(_ctx: TemplateContext): string {
  return generateTestCoverageAuditInner('plan');
}

function generateTestCoverageAuditShip(_ctx: TemplateContext): string {
  return generateTestCoverageAuditInner('ship');
}

function generateTestCoverageAuditReview(_ctx: TemplateContext): string {
  return generateTestCoverageAuditInner('review');
}

function generateSpecReviewLoop(_ctx: TemplateContext): string {
  return `## Spec Review Loop

Before presenting the document to the user for approval, run an adversarial review.

**Step 1: Dispatch reviewer subagent**

Use the Agent tool to dispatch an independent reviewer. The reviewer has fresh context
and cannot see the brainstorming conversation — only the document. This ensures genuine
adversarial independence.

Prompt the subagent with:
- The file path of the document just written
- "Read this document and review it on 5 dimensions. For each dimension, note PASS or
  list specific issues with suggested fixes. At the end, output a quality score (1-10)
  across all dimensions."

**Dimensions:**
1. **Completeness** — Are all requirements addressed? Missing edge cases?
2. **Consistency** — Do parts of the document agree with each other? Contradictions?
3. **Clarity** — Could an engineer implement this without asking questions? Ambiguous language?
4. **Scope** — Does the document creep beyond the original problem? YAGNI violations?
5. **Feasibility** — Can this actually be built with the stated approach? Hidden complexity?

The subagent should return:
- A quality score (1-10)
- PASS if no issues, or a numbered list of issues with dimension, description, and fix

**Step 2: Fix and re-dispatch**

If the reviewer returns issues:
1. Fix each issue in the document on disk (use Edit tool)
2. Re-dispatch the reviewer subagent with the updated document
3. Maximum 3 iterations total

**Convergence guard:** If the reviewer returns the same issues on consecutive iterations
(the fix didn't resolve them or the reviewer disagrees with the fix), stop the loop
and persist those issues as "Reviewer Concerns" in the document rather than looping
further.

If the subagent fails, times out, or is unavailable — skip the review loop entirely.
Tell the user: "Spec review unavailable — presenting unreviewed doc." The document is
already written to disk; the review is a quality bonus, not a gate.

**Step 3: Report and persist metrics**

After the loop completes (PASS, max iterations, or convergence guard):

1. Tell the user the result — summary by default:
   "Your doc survived N rounds of adversarial review. M issues caught and fixed.
   Quality score: X/10."
   If they ask "what did the reviewer find?", show the full reviewer output.

2. If issues remain after max iterations or convergence, add a "## Reviewer Concerns"
   section to the document listing each unresolved issue. Downstream skills will see this.

3. Append metrics:
\`\`\`bash
mkdir -p ~/.fullstack/analytics
echo '{"skill":"${_ctx.skillName}","ts":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'","iterations":ITERATIONS,"issues_found":FOUND,"issues_fixed":FIXED,"remaining":REMAINING,"quality_score":SCORE}' >> ~/.fullstack/analytics/spec-review.jsonl 2>/dev/null || true
\`\`\`
Replace ITERATIONS, FOUND, FIXED, REMAINING, SCORE with actual values from the review.`;
}

function generateBenefitsFrom(ctx: TemplateContext): string {
  if (!ctx.benefitsFrom || ctx.benefitsFrom.length === 0) return '';

  const skillList = ctx.benefitsFrom.map(s => `\`/${s}\``).join(' or ');
  const first = ctx.benefitsFrom[0];

  return `## Prerequisite Skill Offer

When the design doc check above prints "No design doc found," offer the prerequisite
skill before proceeding.

Say to the user via AskUserQuestion:

> "No design doc found for this branch. ${skillList} produces a structured problem
> statement, premise challenge, and explored alternatives — it gives this review much
> sharper input to work with. Takes about 10 minutes. The design doc is per-feature,
> not per-product — it captures the thinking behind this specific change."

Options:
- A) Run /${first} now (we'll pick up the review right after)
- B) Skip — proceed with standard review

If they skip: "No worries — standard review. If you ever want sharper input, try
/${first} first next time." Then proceed normally. Do not re-offer later in the session.

If they choose A:

Say: "Running /${first} inline. Once the design doc is ready, I'll pick up
the review right where we left off."

Read the ${first} skill file from disk using the Read tool:
\`~/.openclaw/skills/fullstack/${first}/SKILL.md\`

Follow it inline, **skipping these sections** (already handled by the parent skill):
- Preamble (run first)
- AskUserQuestion Format
- Completeness Principle — Boil the Lake
- Search Before Building
- Contributor Mode
- Completion Status Protocol

If the Read fails (file not found), say:
"Could not load /${first} — proceeding with standard review."

After /${first} completes, re-run the design doc check:
\`\`\`bash
SLUG=$(~/.openclaw/skills/fullstack/bin/fullstack-slug 2>/dev/null || basename "$(git rev-parse --show-toplevel 2>/dev/null || pwd)")
BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null | tr '/' '-' || echo 'no-branch')
DESIGN=$(ls -t ~/.fullstack/projects/$SLUG/*-$BRANCH-design-*.md 2>/dev/null | head -1)
[ -z "$DESIGN" ] && DESIGN=$(ls -t ~/.fullstack/projects/$SLUG/*-design-*.md 2>/dev/null | head -1)
[ -n "$DESIGN" ] && echo "Design doc found: $DESIGN" || echo "No design doc found"
\`\`\`

If a design doc is now found, read it and continue the review.
If none was produced (user may have cancelled), proceed with standard review.`;
}

function generateDesignSketch(_ctx: TemplateContext): string {
  return `## Visual Sketch (UI ideas only)

If the chosen approach involves user-facing UI (screens, pages, forms, dashboards,
or interactive elements), generate a rough wireframe to help the user visualize it.
If the idea is backend-only, infrastructure, or has no UI component — skip this
section silently.

**Step 1: Gather design context**

1. Check if \`DESIGN.md\` exists in the repo root. If it does, read it for design
   system constraints (colors, typography, spacing, component patterns). Use these
   constraints in the wireframe.
2. Apply core design principles:
   - **Information hierarchy** — what does the user see first, second, third?
   - **Interaction states** — loading, empty, error, success, partial
   - **Edge case paranoia** — what if the name is 47 chars? Zero results? Network fails?
   - **Subtraction default** — "as little design as possible" (Rams). Every element earns its pixels.
   - **Design for trust** — every interface element builds or erodes user trust.

**Step 2: Generate wireframe HTML**

Generate a single-page HTML file with these constraints:
- **Intentionally rough aesthetic** — use system fonts, thin gray borders, no color,
  hand-drawn-style elements. This is a sketch, not a polished mockup.
- Self-contained — no external dependencies, no CDN links, inline CSS only
- Show the core interaction flow (1-3 screens/states max)
- Include realistic placeholder content (not "Lorem ipsum" — use content that
  matches the actual use case)
- Add HTML comments explaining design decisions

Write to a temp file:
\`\`\`bash
SKETCH_FILE="/tmp/fullstack-sketch-$(date +%s).html"
\`\`\`

**Step 3: Render and capture**

\`\`\`bash
$B goto "file://$SKETCH_FILE"
$B screenshot /tmp/fullstack-sketch.png
\`\`\`

If \`$B\` is not available (browse binary not set up), skip the render step. Tell the
user: "Visual sketch requires the browse binary. Run the setup script to enable it."

**Step 4: Present and iterate**

Show the screenshot to the user. Ask: "Does this feel right? Want to iterate on the layout?"

If they want changes, regenerate the HTML with their feedback and re-render.
If they approve or say "good enough," proceed.

**Step 5: Include in design doc**

Reference the wireframe screenshot in the design doc's "Recommended Approach" section.
The screenshot file at \`/tmp/fullstack-sketch.png\` can be referenced by downstream skills
(\`/plan-design-review\`, \`/design-review\`) to see what was originally envisioned.

**Step 6: Outside design voices** (optional)

After the wireframe is approved, offer outside design perspectives:

\`\`\`bash
which codex 2>/dev/null && echo "CODEX_AVAILABLE" || echo "CODEX_NOT_AVAILABLE"
\`\`\`

If Codex is available, use AskUserQuestion:
> "Want outside design perspectives on the chosen approach? Codex proposes a visual thesis, content plan, and interaction ideas. A Claude subagent proposes an alternative aesthetic direction."
>
> A) Yes — get outside design voices
> B) No — proceed without

If user chooses A, launch both voices simultaneously:

1. **Codex** (via Bash, \`model_reasoning_effort="medium"\`):
\`\`\`bash
TMPERR_SKETCH=$(mktemp /tmp/codex-sketch-XXXXXXXX)
codex exec "For this product approach, provide: a visual thesis (one sentence — mood, material, energy), a content plan (hero → support → detail → CTA), and 2 interaction ideas that change page feel. Apply beautiful defaults: composition-first, brand-first, cardless, poster not document. Be opinionated." -s read-only -c 'model_reasoning_effort="medium"' --enable web_search_cached 2>"$TMPERR_SKETCH"
\`\`\`
Use a 5-minute timeout (\`timeout: 300000\`). After completion: \`cat "$TMPERR_SKETCH" && rm -f "$TMPERR_SKETCH"\`

2. **Claude subagent** (via Agent tool):
"For this product approach, what design direction would you recommend? What aesthetic, typography, and interaction patterns fit? What would make this approach feel inevitable to the user? Be specific — font names, hex colors, spacing values."

Present Codex output under \`CODEX SAYS (design sketch):\` and subagent output under \`CLAUDE SUBAGENT (design direction):\`.
Error handling: all non-blocking. On failure, skip and continue.`;
}

function generateCodexSecondOpinion(ctx: TemplateContext): string {
  // Codex host: strip entirely — Codex should never invoke itself
  if (ctx.host === 'codex') return '';

  return `## Phase 3.5: Cross-Model Second Opinion (optional)

**Binary check first — no question if unavailable:**

\`\`\`bash
which codex 2>/dev/null && echo "CODEX_AVAILABLE" || echo "CODEX_NOT_AVAILABLE"
\`\`\`

If \`CODEX_NOT_AVAILABLE\`: skip Phase 3.5 entirely — no message, no AskUserQuestion. Proceed directly to Phase 4.

If \`CODEX_AVAILABLE\`: use AskUserQuestion:

> Want a second opinion from a different AI model? Codex will independently review your problem statement, key answers, premises, and any landscape findings from this session. It hasn't seen this conversation — it gets a structured summary. Usually takes 2-5 minutes.
> A) Yes, get a second opinion
> B) No, proceed to alternatives

If B: skip Phase 3.5 entirely. Remember that Codex did NOT run (affects design doc, founder signals, and Phase 4 below).

**If A: Run the Codex cold read.**

1. Assemble a structured context block from Phases 1-3:
   - Mode (Startup or Builder)
   - Problem statement (from Phase 1)
   - Key answers from Phase 2A/2B (summarize each Q&A in 1-2 sentences, include verbatim user quotes)
   - Landscape findings (from Phase 2.75, if search was run)
   - Agreed premises (from Phase 3)
   - Codebase context (project name, languages, recent activity)

2. **Write the assembled prompt to a temp file** (prevents shell injection from user-derived content):

\`\`\`bash
CODEX_PROMPT_FILE=$(mktemp /tmp/fullstack-codex-oh-XXXXXXXX.txt)
\`\`\`

Write the full prompt (context block + instructions) to this file. Use the mode-appropriate variant:

**Startup mode instructions:** "You are an independent technical advisor reading a transcript of a startup brainstorming session. [CONTEXT BLOCK HERE]. Your job: 1) What is the STRONGEST version of what this person is trying to build? Steelman it in 2-3 sentences. 2) What is the ONE thing from their answers that reveals the most about what they should actually build? Quote it and explain why. 3) Name ONE agreed premise you think is wrong, and what evidence would prove you right. 4) If you had 48 hours and one engineer to build a prototype, what would you build? Be specific — tech stack, features, what you'd skip. Be direct. Be terse. No preamble."

**Builder mode instructions:** "You are an independent technical advisor reading a transcript of a builder brainstorming session. [CONTEXT BLOCK HERE]. Your job: 1) What is the COOLEST version of this they haven't considered? 2) What's the ONE thing from their answers that reveals what excites them most? Quote it. 3) What existing open source project or tool gets them 50% of the way there — and what's the 50% they'd need to build? 4) If you had a weekend to build this, what would you build first? Be specific. Be direct. No preamble."

3. Run Codex:

\`\`\`bash
TMPERR_OH=$(mktemp /tmp/codex-oh-err-XXXXXXXX)
codex exec "$(cat "$CODEX_PROMPT_FILE")" -s read-only -c 'model_reasoning_effort="xhigh"' --enable web_search_cached 2>"$TMPERR_OH"
\`\`\`

Use a 5-minute timeout (\`timeout: 300000\`). After the command completes, read stderr:
\`\`\`bash
cat "$TMPERR_OH"
rm -f "$TMPERR_OH" "$CODEX_PROMPT_FILE"
\`\`\`

**Error handling:** All errors are non-blocking — Codex second opinion is a quality enhancement, not a prerequisite.
- **Auth failure:** If stderr contains "auth", "login", "unauthorized", or "API key": "Codex authentication failed. Run \\\`codex login\\\` to authenticate. Skipping second opinion."
- **Timeout:** "Codex timed out after 5 minutes. Skipping second opinion."
- **Empty response:** "Codex returned no response. Stderr: <paste relevant error>. Skipping second opinion."

On any error, proceed to Phase 4 — do NOT fall back to a Claude subagent (this is brainstorming, not adversarial review).

4. **Presentation:**

\`\`\`
SECOND OPINION (Codex):
════════════════════════════════════════════════════════════
<full codex output, verbatim — do not truncate or summarize>
════════════════════════════════════════════════════════════
\`\`\`

5. **Cross-model synthesis:** After presenting Codex output, provide 3-5 bullet synthesis:
   - Where Claude agrees with Codex
   - Where Claude disagrees and why
   - Whether Codex's challenged premise changes Claude's recommendation

6. **Premise revision check:** If Codex challenged an agreed premise, use AskUserQuestion:

> Codex challenged premise #{N}: "{premise text}". Their argument: "{reasoning}".
> A) Revise this premise based on Codex's input
> B) Keep the original premise — proceed to alternatives

If A: revise the premise and note the revision. If B: proceed (and note that the user defended this premise with reasoning — this is a founder signal if they articulate WHY they disagree, not just dismiss).`;
}

function generateAdversarialStep(ctx: TemplateContext): string {
  // Codex host: strip entirely — Codex should never invoke itself
  if (ctx.host === 'codex') return '';

  const isShip = ctx.skillName === 'ship';
  const stepNum = isShip ? '3.8' : '5.7';

  return `## Step ${stepNum}: Adversarial review (auto-scaled)

Adversarial review thoroughness scales automatically based on diff size. No configuration needed.

**Detect diff size and tool availability:**

\`\`\`bash
DIFF_INS=$(git diff origin/<base> --stat | tail -1 | grep -oE '[0-9]+ insertion' | grep -oE '[0-9]+' || echo "0")
DIFF_DEL=$(git diff origin/<base> --stat | tail -1 | grep -oE '[0-9]+ deletion' | grep -oE '[0-9]+' || echo "0")
DIFF_TOTAL=$((DIFF_INS + DIFF_DEL))
which codex 2>/dev/null && echo "CODEX_AVAILABLE" || echo "CODEX_NOT_AVAILABLE"
# Respect old opt-out
OLD_CFG=$(${ctx.paths.binDir}/fullstack-config get codex_reviews 2>/dev/null || true)
echo "DIFF_SIZE: $DIFF_TOTAL"
echo "OLD_CFG: \${OLD_CFG:-not_set}"
\`\`\`

If \`OLD_CFG\` is \`disabled\`: skip this step silently. Continue to the next step.

**User override:** If the user explicitly requested a specific tier (e.g., "run all passes", "paranoid review", "full adversarial", "do all 4 passes", "thorough review"), honor that request regardless of diff size. Jump to the matching tier section.

**Auto-select tier based on diff size:**
- **Small (< 50 lines changed):** Skip adversarial review entirely. Print: "Small diff ($DIFF_TOTAL lines) — adversarial review skipped." Continue to the next step.
- **Medium (50–199 lines changed):** Run Codex adversarial challenge (or Claude adversarial subagent if Codex unavailable). Jump to the "Medium tier" section.
- **Large (200+ lines changed):** Run all remaining passes — Codex structured review + Claude adversarial subagent + Codex adversarial. Jump to the "Large tier" section.

---

### Medium tier (50–199 lines)

Claude's structured review already ran. Now add a **cross-model adversarial challenge**.

**If Codex is available:** run the Codex adversarial challenge. **If Codex is NOT available:** fall back to the Claude adversarial subagent instead.

**Codex adversarial:**

\`\`\`bash
TMPERR_ADV=$(mktemp /tmp/codex-adv-XXXXXXXX)
codex exec "Review the changes on this branch against the base branch. Run git diff origin/<base> to see the diff. Your job is to find ways this code will fail in production. Think like an attacker and a chaos engineer. Find edge cases, race conditions, security holes, resource leaks, failure modes, and silent data corruption paths. Be adversarial. Be thorough. No compliments — just the problems." -s read-only -c 'model_reasoning_effort="xhigh"' --enable web_search_cached 2>"$TMPERR_ADV"
\`\`\`

Set the Bash tool's \`timeout\` parameter to \`300000\` (5 minutes). Do NOT use the \`timeout\` shell command — it doesn't exist on macOS. After the command completes, read stderr:
\`\`\`bash
cat "$TMPERR_ADV"
\`\`\`

Present the full output verbatim. This is informational — it never blocks shipping.

**Error handling:** All errors are non-blocking — adversarial review is a quality enhancement, not a prerequisite.
- **Auth failure:** If stderr contains "auth", "login", "unauthorized", or "API key": "Codex authentication failed. Run \\\`codex login\\\` to authenticate."
- **Timeout:** "Codex timed out after 5 minutes."
- **Empty response:** "Codex returned no response. Stderr: <paste relevant error>."

On any Codex error, fall back to the Claude adversarial subagent automatically.

**Claude adversarial subagent** (fallback when Codex unavailable or errored):

Dispatch via the Agent tool. The subagent has fresh context — no checklist bias from the structured review. This genuine independence catches things the primary reviewer is blind to.

Subagent prompt:
"Read the diff for this branch with \`git diff origin/<base>\`. Think like an attacker and a chaos engineer. Your job is to find ways this code will fail in production. Look for: edge cases, race conditions, security holes, resource leaks, failure modes, silent data corruption, logic errors that produce wrong results silently, error handling that swallows failures, and trust boundary violations. Be adversarial. Be thorough. No compliments — just the problems. For each finding, classify as FIXABLE (you know how to fix it) or INVESTIGATE (needs human judgment)."

Present findings under an \`ADVERSARIAL REVIEW (Claude subagent):\` header. **FIXABLE findings** flow into the same Fix-First pipeline as the structured review. **INVESTIGATE findings** are presented as informational.

If the subagent fails or times out: "Claude adversarial subagent unavailable. Continuing without adversarial review."

**Persist the review result:**
\`\`\`bash
${ctx.paths.binDir}/fullstack-review-log '{"skill":"adversarial-review","timestamp":"'"$(date -u +%Y-%m-%dT%H:%M:%SZ)"'","status":"STATUS","source":"SOURCE","tier":"medium","commit":"'"$(git rev-parse --short HEAD)"'"}'
\`\`\`
Substitute STATUS: "clean" if no findings, "issues_found" if findings exist. SOURCE: "codex" if Codex ran, "claude" if subagent ran. If both failed, do NOT persist.

**Cleanup:** Run \`rm -f "$TMPERR_ADV"\` after processing (if Codex was used).

---

### Large tier (200+ lines)

Claude's structured review already ran. Now run **all three remaining passes** for maximum coverage:

**1. Codex structured review (if available):**
\`\`\`bash
TMPERR=$(mktemp /tmp/codex-review-XXXXXXXX)
codex review --base <base> -c 'model_reasoning_effort="xhigh"' --enable web_search_cached 2>"$TMPERR"
\`\`\`

Set the Bash tool's \`timeout\` parameter to \`300000\` (5 minutes). Do NOT use the \`timeout\` shell command — it doesn't exist on macOS. Present output under \`CODEX SAYS (code review):\` header.
Check for \`[P1]\` markers: found → \`GATE: FAIL\`, not found → \`GATE: PASS\`.

If GATE is FAIL, use AskUserQuestion:
\`\`\`
Codex found N critical issues in the diff.

A) Investigate and fix now (recommended)
B) Continue — review will still complete
\`\`\`

If A: address the findings${isShip ? '. After fixing, re-run tests (Step 3) since code has changed' : ''}. Re-run \`codex review\` to verify.

Read stderr for errors (same error handling as medium tier).

After stderr: \`rm -f "$TMPERR"\`

**2. Claude adversarial subagent:** Dispatch a subagent with the adversarial prompt (same prompt as medium tier). This always runs regardless of Codex availability.

**3. Codex adversarial challenge (if available):** Run \`codex exec\` with the adversarial prompt (same as medium tier).

If Codex is not available for steps 1 and 3, note to the user: "Codex CLI not found — large-diff review ran Claude structured + Claude adversarial (2 of 4 passes). Install Codex for full 4-pass coverage: \`npm install -g @openai/codex\`"

**Persist the review result AFTER all passes complete** (not after each sub-step):
\`\`\`bash
${ctx.paths.binDir}/fullstack-review-log '{"skill":"adversarial-review","timestamp":"'"$(date -u +%Y-%m-%dT%H:%M:%SZ)"'","status":"STATUS","source":"SOURCE","tier":"large","gate":"GATE","commit":"'"$(git rev-parse --short HEAD)"'"}'
\`\`\`
Substitute: STATUS = "clean" if no findings across ALL passes, "issues_found" if any pass found issues. SOURCE = "both" if Codex ran, "claude" if only Claude subagent ran. GATE = the Codex structured review gate result ("pass"/"fail"), or "informational" if Codex was unavailable. If all passes failed, do NOT persist.

---

### Cross-model synthesis (medium and large tiers)

After all passes complete, synthesize findings across all sources:

\`\`\`
ADVERSARIAL REVIEW SYNTHESIS (auto: TIER, N lines):
════════════════════════════════════════════════════════════
  High confidence (found by multiple sources): [findings agreed on by >1 pass]
  Unique to Claude structured review: [from earlier step]
  Unique to Claude adversarial: [from subagent, if ran]
  Unique to Codex: [from codex adversarial or code review, if ran]
  Models used: Claude structured ✓  Claude adversarial ✓/✗  Codex ✓/✗
════════════════════════════════════════════════════════════
\`\`\`

High-confidence findings (agreed on by multiple sources) should be prioritized for fixes.

---`;
}

function generateCodexPlanReview(ctx: TemplateContext): string {
  // Codex host: strip entirely — Codex should never invoke itself
  if (ctx.host === 'codex') return '';

  return `## Outside Voice — Independent Plan Challenge (optional, recommended)

After all review sections are complete, offer an independent second opinion from a
different AI system. Two models agreeing on a plan is stronger signal than one model's
thorough review.

**Check tool availability:**

\`\`\`bash
which codex 2>/dev/null && echo "CODEX_AVAILABLE" || echo "CODEX_NOT_AVAILABLE"
\`\`\`

Use AskUserQuestion:

> "All review sections are complete. Want an outside voice? A different AI system can
> give a brutally honest, independent challenge of this plan — logical gaps, feasibility
> risks, and blind spots that are hard to catch from inside the review. Takes about 2
> minutes."
>
> RECOMMENDATION: Choose A — an independent second opinion catches structural blind
> spots. Two different AI models agreeing on a plan is stronger signal than one model's
> thorough review. Completeness: A=9/10, B=7/10.

Options:
- A) Get the outside voice (recommended)
- B) Skip — proceed to outputs

**If B:** Print "Skipping outside voice." and continue to the next section.

**If A:** Construct the plan review prompt. Read the plan file being reviewed (the file
the user pointed this review at, or the branch diff scope). If a CEO plan document
was written in Step 0D-POST, read that too — it contains the scope decisions and vision.

Construct this prompt (substitute the actual plan content — if plan content exceeds 30KB,
truncate to the first 30KB and note "Plan truncated for size"):

"You are a brutally honest technical reviewer examining a development plan that has
already been through a multi-section review. Your job is NOT to repeat that review.
Instead, find what it missed. Look for: logical gaps and unstated assumptions that
survived the review scrutiny, overcomplexity (is there a fundamentally simpler
approach the review was too deep in the weeds to see?), feasibility risks the review
took for granted, missing dependencies or sequencing issues, and strategic
miscalibration (is this the right thing to build at all?). Be direct. Be terse. No
compliments. Just the problems.

THE PLAN:
<plan content>"

**If CODEX_AVAILABLE:**

\`\`\`bash
TMPERR_PV=$(mktemp /tmp/codex-planreview-XXXXXXXX)
codex exec "<prompt>" -s read-only -c 'model_reasoning_effort="xhigh"' --enable web_search_cached 2>"$TMPERR_PV"
\`\`\`

Use a 5-minute timeout (\`timeout: 300000\`). After the command completes, read stderr:
\`\`\`bash
cat "$TMPERR_PV"
\`\`\`

Present the full output verbatim:

\`\`\`
CODEX SAYS (plan review — outside voice):
════════════════════════════════════════════════════════════
<full codex output, verbatim — do not truncate or summarize>
════════════════════════════════════════════════════════════
\`\`\`

**Error handling:** All errors are non-blocking — the outside voice is informational.
- Auth failure (stderr contains "auth", "login", "unauthorized"): "Codex auth failed. Run \\\`codex login\\\` to authenticate."
- Timeout: "Codex timed out after 5 minutes."
- Empty response: "Codex returned no response."

On any Codex error, fall back to the Claude adversarial subagent.

**If CODEX_NOT_AVAILABLE (or Codex errored):**

Dispatch via the Agent tool. The subagent has fresh context — genuine independence.

Subagent prompt: same plan review prompt as above.

Present findings under an \`OUTSIDE VOICE (Claude subagent):\` header.

If the subagent fails or times out: "Outside voice unavailable. Continuing to outputs."

**Cross-model tension:**

After presenting the outside voice findings, note any points where the outside voice
disagrees with the review findings from earlier sections. Flag these as:

\`\`\`
CROSS-MODEL TENSION:
  [Topic]: Review said X. Outside voice says Y. [Your assessment of who's right.]
\`\`\`

For each substantive tension point, auto-propose as a TODO via AskUserQuestion:

> "Cross-model disagreement on [topic]. The review found [X] but the outside voice
> argues [Y]. Worth investigating further?"

Options:
- A) Add to TODOS.md
- B) Skip — not substantive

If no tension points exist, note: "No cross-model tension — both reviewers agree."

**Persist the result:**
\`\`\`bash
${ctx.paths.binDir}/fullstack-review-log '{"skill":"codex-plan-review","timestamp":"'"$(date -u +%Y-%m-%dT%H:%M:%SZ)"'","status":"STATUS","source":"SOURCE","commit":"'"$(git rev-parse --short HEAD)"'"}'
\`\`\`

Substitute: STATUS = "clean" if no findings, "issues_found" if findings exist.
SOURCE = "codex" if Codex ran, "claude" if subagent ran.

**Cleanup:** Run \`rm -f "$TMPERR_PV"\` after processing (if Codex was used).

---`;
}

function generateDeployBootstrap(_ctx: TemplateContext): string {
  return `\`\`\`bash
# Check for persisted deploy config in CLAUDE.md
DEPLOY_CONFIG=$(grep -A 20 "## Deploy Configuration" CLAUDE.md 2>/dev/null || echo "NO_CONFIG")
echo "$DEPLOY_CONFIG"

# If config exists, parse it
if [ "$DEPLOY_CONFIG" != "NO_CONFIG" ]; then
  PROD_URL=$(echo "$DEPLOY_CONFIG" | grep -i "production.*url" | head -1 | sed 's/.*: *//')
  PLATFORM=$(echo "$DEPLOY_CONFIG" | grep -i "platform" | head -1 | sed 's/.*: *//')
  echo "PERSISTED_PLATFORM:$PLATFORM"
  echo "PERSISTED_URL:$PROD_URL"
fi

# Auto-detect platform from config files
[ -f fly.toml ] && echo "PLATFORM:fly"
[ -f render.yaml ] && echo "PLATFORM:render"
([ -f vercel.json ] || [ -d .vercel ]) && echo "PLATFORM:vercel"
[ -f netlify.toml ] && echo "PLATFORM:netlify"
[ -f Procfile ] && echo "PLATFORM:heroku"
([ -f railway.json ] || [ -f railway.toml ]) && echo "PLATFORM:railway"

# Detect deploy workflows
for f in .github/workflows/*.yml .github/workflows/*.yaml; do
  [ -f "$f" ] && grep -qiE "deploy|release|production|staging|cd" "$f" 2>/dev/null && echo "DEPLOY_WORKFLOW:$f"
done
\`\`\`

If \`PERSISTED_PLATFORM\` and \`PERSISTED_URL\` were found in CLAUDE.md, use them directly
and skip manual detection. If no persisted config exists, use the auto-detected platform
to guide deploy verification. If nothing is detected, ask the user via AskUserQuestion
in the decision tree below.

If you want to persist deploy settings for future runs, suggest the user run \`/setup-deploy\`.`;
}

// ─── Design Outside Voices (parallel Codex + Claude subagent) ───────

function generateDesignOutsideVoices(ctx: TemplateContext): string {
  // Codex host: strip entirely — Codex should never invoke itself
  if (ctx.host === 'codex') return '';

  const rejectionList = OPENAI_HARD_REJECTIONS.map((item, i) => `${i + 1}. ${item}`).join('\n');
  const litmusList = OPENAI_LITMUS_CHECKS.map((item, i) => `${i + 1}. ${item}`).join('\n');

  // Skill-specific configuration
  const isPlanDesignReview = ctx.skillName === 'plan-design-review';
  const isDesignReview = ctx.skillName === 'design-review';
  const isDesignConsultation = ctx.skillName === 'design-consultation';

  // Determine opt-in behavior and reasoning effort
  const isAutomatic = isDesignReview; // design-review runs automatically
  const reasoningEffort = isDesignConsultation ? 'medium' : 'high'; // creative vs analytical

  // Build skill-specific Codex prompt
  let codexPrompt: string;
  let subagentPrompt: string;

  if (isPlanDesignReview) {
    codexPrompt = `Read the plan file at [plan-file-path]. Evaluate this plan's UI/UX design against these criteria.

HARD REJECTION — flag if ANY apply:
${rejectionList}

LITMUS CHECKS — answer YES or NO for each:
${litmusList}

HARD RULES — first classify as MARKETING/LANDING PAGE vs APP UI vs HYBRID, then flag violations of the matching rule set:
- MARKETING: First viewport as one composition, brand-first hierarchy, full-bleed hero, 2-3 intentional motions, composition-first layout
- APP UI: Calm surface hierarchy, dense but readable, utility language, minimal chrome
- UNIVERSAL: CSS variables for colors, no default font stacks, one job per section, cards earn existence

For each finding: what's wrong, what will happen if it ships unresolved, and the specific fix. Be opinionated. No hedging.`;

    subagentPrompt = `Read the plan file at [plan-file-path]. You are an independent senior product designer reviewing this plan. You have NOT seen any prior review. Evaluate:

1. Information hierarchy: what does the user see first, second, third? Is it right?
2. Missing states: loading, empty, error, success, partial — which are unspecified?
3. User journey: what's the emotional arc? Where does it break?
4. Specificity: does the plan describe SPECIFIC UI ("48px Söhne Bold header, #1a1a1a on white") or generic patterns ("clean modern card-based layout")?
5. What design decisions will haunt the implementer if left ambiguous?

For each finding: what's wrong, severity (critical/high/medium), and the fix.`;
  } else if (isDesignReview) {
    codexPrompt = `Review the frontend source code in this repo. Evaluate against these design hard rules:
- Spacing: systematic (design tokens / CSS variables) or magic numbers?
- Typography: expressive purposeful fonts or default stacks?
- Color: CSS variables with defined system, or hardcoded hex scattered?
- Responsive: breakpoints defined? calc(100svh - header) for heroes? Mobile tested?
- A11y: ARIA landmarks, alt text, contrast ratios, 44px touch targets?
- Motion: 2-3 intentional animations, or zero / ornamental only?
- Cards: used only when card IS the interaction? No decorative card grids?

First classify as MARKETING/LANDING PAGE vs APP UI vs HYBRID, then apply matching rules.

LITMUS CHECKS — answer YES/NO:
${litmusList}

HARD REJECTION — flag if ANY apply:
${rejectionList}

Be specific. Reference file:line for every finding.`;

    subagentPrompt = `Review the frontend source code in this repo. You are an independent senior product designer doing a source-code design audit. Focus on CONSISTENCY PATTERNS across files rather than individual violations:
- Are spacing values systematic across the codebase?
- Is there ONE color system or scattered approaches?
- Do responsive breakpoints follow a consistent set?
- Is the accessibility approach consistent or spotty?

For each finding: what's wrong, severity (critical/high/medium), and the file:line.`;
  } else if (isDesignConsultation) {
    codexPrompt = `Given this product context, propose a complete design direction:
- Visual thesis: one sentence describing mood, material, and energy
- Typography: specific font names (not defaults — no Inter/Roboto/Arial/system) + hex colors
- Color system: CSS variables for background, surface, primary text, muted text, accent
- Layout: composition-first, not component-first. First viewport as poster, not document
- Differentiation: 2 deliberate departures from category norms
- Anti-slop: no purple gradients, no 3-column icon grids, no centered everything, no decorative blobs

Be opinionated. Be specific. Do not hedge. This is YOUR design direction — own it.`;

    subagentPrompt = `Given this product context, propose a design direction that would SURPRISE. What would the cool indie studio do that the enterprise UI team wouldn't?
- Propose an aesthetic direction, typography stack (specific font names), color palette (hex values)
- 2 deliberate departures from category norms
- What emotional reaction should the user have in the first 3 seconds?

Be bold. Be specific. No hedging.`;
  } else {
    // Unknown skill — return empty
    return '';
  }

  // Build the opt-in section
  const optInSection = isAutomatic ? `
**Automatic:** Outside voices run automatically when Codex is available. No opt-in needed.` : `
Use AskUserQuestion:
> "Want outside design voices${isPlanDesignReview ? ' before the detailed review' : ''}? Codex evaluates against OpenAI's design hard rules + litmus checks; Claude subagent does an independent ${isDesignConsultation ? 'design direction proposal' : 'completeness review'}."
>
> A) Yes — run outside design voices
> B) No — proceed without

If user chooses B, skip this step and continue.`;

  // Build the synthesis section
  const synthesisSection = isPlanDesignReview ? `
**Synthesis — Litmus scorecard:**

\`\`\`
DESIGN OUTSIDE VOICES — LITMUS SCORECARD:
═══════════════════════════════════════════════════════════════
  Check                                    Claude  Codex  Consensus
  ─────────────────────────────────────── ─────── ─────── ─────────
  1. Brand unmistakable in first screen?   —       —      —
  2. One strong visual anchor?             —       —      —
  3. Scannable by headlines only?          —       —      —
  4. Each section has one job?             —       —      —
  5. Cards actually necessary?             —       —      —
  6. Motion improves hierarchy?            —       —      —
  7. Premium without decorative shadows?   —       —      —
  ─────────────────────────────────────── ─────── ─────── ─────────
  Hard rejections triggered:               —       —      —
═══════════════════════════════════════════════════════════════
\`\`\`

Fill in each cell from the Codex and subagent outputs. CONFIRMED = both agree. DISAGREE = models differ. NOT SPEC'D = not enough info to evaluate.

**Pass integration (respects existing 7-pass contract):**
- Hard rejections → raised as the FIRST items in Pass 1, tagged \`[HARD REJECTION]\`
- Litmus DISAGREE items → raised in the relevant pass with both perspectives
- Litmus CONFIRMED failures → pre-loaded as known issues in the relevant pass
- Passes can skip discovery and go straight to fixing for pre-identified issues` :
  isDesignConsultation ? `
**Synthesis:** Claude main references both Codex and subagent proposals in the Phase 3 proposal. Present:
- Areas of agreement between all three voices (Claude main + Codex + subagent)
- Genuine divergences as creative alternatives for the user to choose from
- "Codex and I agree on X. Codex suggested Y where I'm proposing Z — here's why..."` : `
**Synthesis — Litmus scorecard:**

Use the same scorecard format as /plan-design-review (shown above). Fill in from both outputs.
Merge findings into the triage with \`[codex]\` / \`[subagent]\` / \`[cross-model]\` tags.`;

  const escapedCodexPrompt = codexPrompt.replace(/`/g, '\\`').replace(/\$/g, '\\$');

  return `## Design Outside Voices (parallel)
${optInSection}

**Check Codex availability:**
\`\`\`bash
which codex 2>/dev/null && echo "CODEX_AVAILABLE" || echo "CODEX_NOT_AVAILABLE"
\`\`\`

**If Codex is available**, launch both voices simultaneously:

1. **Codex design voice** (via Bash):
\`\`\`bash
TMPERR_DESIGN=$(mktemp /tmp/codex-design-XXXXXXXX)
codex exec "${escapedCodexPrompt}" -s read-only -c 'model_reasoning_effort="${reasoningEffort}"' --enable web_search_cached 2>"$TMPERR_DESIGN"
\`\`\`
Use a 5-minute timeout (\`timeout: 300000\`). After the command completes, read stderr:
\`\`\`bash
cat "$TMPERR_DESIGN" && rm -f "$TMPERR_DESIGN"
\`\`\`

2. **Claude design subagent** (via Agent tool):
Dispatch a subagent with this prompt:
"${subagentPrompt}"

**Error handling (all non-blocking):**
- **Auth failure:** If stderr contains "auth", "login", "unauthorized", or "API key": "Codex authentication failed. Run \`codex login\` to authenticate."
- **Timeout:** "Codex timed out after 5 minutes."
- **Empty response:** "Codex returned no response."
- On any Codex error: proceed with Claude subagent output only, tagged \`[single-model]\`.
- If Claude subagent also fails: "Outside voices unavailable — continuing with primary review."

Present Codex output under a \`CODEX SAYS (design ${isPlanDesignReview ? 'critique' : isDesignReview ? 'source audit' : 'direction'}):\` header.
Present subagent output under a \`CLAUDE SUBAGENT (design ${isPlanDesignReview ? 'completeness' : isDesignReview ? 'consistency' : 'direction'}):\` header.
${synthesisSection}

**Log the result:**
\`\`\`bash
${ctx.paths.binDir}/fullstack-review-log '{"skill":"design-outside-voices","timestamp":"'"$(date -u +%Y-%m-%dT%H:%M:%SZ)"'","status":"STATUS","source":"SOURCE","commit":"'"$(git rev-parse --short HEAD)"'"}'
\`\`\`
Replace STATUS with "clean" or "issues_found", SOURCE with "codex+subagent", "codex-only", "subagent-only", or "unavailable".`;
}

// ─── Design Hard Rules (OpenAI framework + OpenClaw Skills slop blacklist) ───

function generateDesignHardRules(_ctx: TemplateContext): string {
  const slopItems = AI_SLOP_BLACKLIST.map((item, i) => `${i + 1}. ${item}`).join('\n');
  const rejectionItems = OPENAI_HARD_REJECTIONS.map((item, i) => `${i + 1}. ${item}`).join('\n');
  const litmusItems = OPENAI_LITMUS_CHECKS.map((item, i) => `${i + 1}. ${item}`).join('\n');

  return `### Design Hard Rules

**Classifier — determine rule set before evaluating:**
- **MARKETING/LANDING PAGE** (hero-driven, brand-forward, conversion-focused) → apply Landing Page Rules
- **APP UI** (workspace-driven, data-dense, task-focused: dashboards, admin, settings) → apply App UI Rules
- **HYBRID** (marketing shell with app-like sections) → apply Landing Page Rules to hero/marketing sections, App UI Rules to functional sections

**Hard rejection criteria** (instant-fail patterns — flag if ANY apply):
${rejectionItems}

**Litmus checks** (answer YES/NO for each — used for cross-model consensus scoring):
${litmusItems}

**Landing page rules** (apply when classifier = MARKETING/LANDING):
- First viewport reads as one composition, not a dashboard
- Brand-first hierarchy: brand > headline > body > CTA
- Typography: expressive, purposeful — no default stacks (Inter, Roboto, Arial, system)
- No flat single-color backgrounds — use gradients, images, subtle patterns
- Hero: full-bleed, edge-to-edge, no inset/tiled/rounded variants
- Hero budget: brand, one headline, one supporting sentence, one CTA group, one image
- No cards in hero. Cards only when card IS the interaction
- One job per section: one purpose, one headline, one short supporting sentence
- Motion: 2-3 intentional motions minimum (entrance, scroll-linked, hover/reveal)
- Color: define CSS variables, avoid purple-on-white defaults, one accent color default
- Copy: product language not design commentary. "If deleting 30% improves it, keep deleting"
- Beautiful defaults: composition-first, brand as loudest text, two typefaces max, cardless by default, first viewport as poster not document

**App UI rules** (apply when classifier = APP UI):
- Calm surface hierarchy, strong typography, few colors
- Dense but readable, minimal chrome
- Organize: primary workspace, navigation, secondary context, one accent
- Avoid: dashboard-card mosaics, thick borders, decorative gradients, ornamental icons
- Copy: utility language — orientation, status, action. Not mood/brand/aspiration
- Cards only when card IS the interaction
- Section headings state what area is or what user can do ("Selected KPIs", "Plan status")

**Universal rules** (apply to ALL types):
- Define CSS variables for color system
- No default font stacks (Inter, Roboto, Arial, system)
- One job per section
- "If deleting 30% of the copy improves it, keep deleting"
- Cards earn their existence — no decorative card grids

**AI Slop blacklist** (the 10 patterns that scream "AI-generated"):
${slopItems}

Source: [OpenAI "Designing Delightful Frontends with GPT-5.4"](https://developers.openai.com/blog/designing-delightful-frontends-with-gpt-5-4) (Mar 2026) + OpenClaw Skills design methodology.`;
}

function generateSlugEval(ctx: TemplateContext): string {
  return `eval "$(${ctx.paths.binDir}/fullstack-slug 2>/dev/null)"`;
}

function generateSlugSetup(ctx: TemplateContext): string {
  return `eval "$(${ctx.paths.binDir}/fullstack-slug 2>/dev/null)" && mkdir -p ~/.fullstack/projects/$SLUG`;
}

const RESOLVERS: Record<string, (ctx: TemplateContext) => string> = {
  SLUG_EVAL: generateSlugEval,
  SLUG_SETUP: generateSlugSetup,
  COMMAND_REFERENCE: generateCommandReference,
  SNAPSHOT_FLAGS: generateSnapshotFlags,
  PREAMBLE: generatePreamble,
  BROWSE_SETUP: generateBrowseSetup,
  BASE_BRANCH_DETECT: generateBaseBranchDetect,
  QA_METHODOLOGY: generateQAMethodology,
  DESIGN_METHODOLOGY: generateDesignMethodology,
  DESIGN_HARD_RULES: generateDesignHardRules,
  DESIGN_OUTSIDE_VOICES: generateDesignOutsideVoices,
  DESIGN_REVIEW_LITE: generateDesignReviewLite,
  REVIEW_DASHBOARD: generateReviewDashboard,
  PLAN_FILE_REVIEW_REPORT: generatePlanFileReviewReport,
  TEST_BOOTSTRAP: generateTestBootstrap,
  TEST_COVERAGE_AUDIT_PLAN: generateTestCoverageAuditPlan,
  TEST_COVERAGE_AUDIT_SHIP: generateTestCoverageAuditShip,
  TEST_COVERAGE_AUDIT_REVIEW: generateTestCoverageAuditReview,
  TEST_FAILURE_TRIAGE: generateTestFailureTriage,
  SPEC_REVIEW_LOOP: generateSpecReviewLoop,
  DESIGN_SKETCH: generateDesignSketch,
  BENEFITS_FROM: generateBenefitsFrom,
  CODEX_SECOND_OPINION: generateCodexSecondOpinion,
  CODEX_REVIEW_STEP: generateAdversarialStep,
  ADVERSARIAL_STEP: generateAdversarialStep,
  DEPLOY_BOOTSTRAP: generateDeployBootstrap,
  CODEX_PLAN_REVIEW: generateCodexPlanReview,
};

// ─── Codex Helpers ───────────────────────────────────────────

function codexSkillName(skillDir: string): string {
  if (skillDir === '.' || skillDir === '') return 'fullstack';
  // Don't double-prefix: fullstack-* → fullstack-* (not fullstack-fullstack-*)
  if (skillDir.startsWith('fullstack-')) return skillDir;
  return `fullstack-${skillDir}`;
}

function extractNameAndDescription(content: string): { name: string; description: string } {
  const fmStart = content.indexOf('---\n');
  if (fmStart !== 0) return { name: '', description: '' };
  const fmEnd = content.indexOf('\n---', fmStart + 4);
  if (fmEnd === -1) return { name: '', description: '' };

  const frontmatter = content.slice(fmStart + 4, fmEnd);
  const nameMatch = frontmatter.match(/^name:\s*(.+)$/m);
  const name = nameMatch ? nameMatch[1].trim() : '';

  let description = '';
  const lines = frontmatter.split('\n');
  let inDescription = false;
  const descLines: string[] = [];
  for (const line of lines) {
    if (line.match(/^description:\s*\|?\s*$/)) {
      inDescription = true;
      continue;
    }
    if (line.match(/^description:\s*\S/)) {
      description = line.replace(/^description:\s*/, '').trim();
      break;
    }
    if (inDescription) {
      if (line === '' || line.match(/^\s/)) {
        descLines.push(line.replace(/^  /, ''));
      } else {
        break;
      }
    }
  }
  if (descLines.length > 0) {
    description = descLines.join('\n').trim();
  }

  return { name, description };
}

function condenseOpenAIShortDescription(description: string): string {
  const firstParagraph = description.split(/\n\s*\n/)[0] || description;
  const collapsed = firstParagraph.replace(/\s+/g, ' ').trim();
  if (collapsed.length <= OPENAI_SHORT_DESCRIPTION_LIMIT) return collapsed;

  const truncated = collapsed.slice(0, OPENAI_SHORT_DESCRIPTION_LIMIT - 3);
  const lastSpace = truncated.lastIndexOf(' ');
  const safe = lastSpace > 40 ? truncated.slice(0, lastSpace) : truncated;
  return `${safe}...`;
}

function generateOpenAIYaml(displayName: string, shortDescription: string): string {
  return `interface:
  display_name: ${JSON.stringify(displayName)}
  short_description: ${JSON.stringify(shortDescription)}
  default_prompt: ${JSON.stringify(`Use ${displayName} for this task.`)}
policy:
  allow_implicit_invocation: true
`;
}

/**
 * Transform frontmatter for Codex: keep only name + description.
 * Strips allowed-tools, hooks, version, and all other fields.
 * Handles multiline block scalar descriptions (YAML | syntax).
 */
function transformFrontmatter(content: string, host: Host): string {
  if (host === 'claude') return content;

  const fmStart = content.indexOf('---\n');
  if (fmStart !== 0) return content;
  const fmEnd = content.indexOf('\n---', fmStart + 4);
  if (fmEnd === -1) return content;
  const body = content.slice(fmEnd + 4); // includes the leading \n after ---
  const { name, description } = extractNameAndDescription(content);

  // Re-emit Codex frontmatter (name + description only)
  const indentedDesc = description.split('\n').map(l => `  ${l}`).join('\n');
  const codexFm = `---\nname: ${name}\ndescription: |\n${indentedDesc}\n---`;
  return codexFm + body;
}

/**
 * Extract hook descriptions from frontmatter for inline safety prose.
 * Returns a description of what the hooks do, or null if no hooks.
 */
function extractHookSafetyProse(tmplContent: string): string | null {
  if (!tmplContent.match(/^hooks:/m)) return null;

  // Parse the hook matchers to build a human-readable safety description
  const matchers: string[] = [];
  const matcherRegex = /matcher:\s*"(\w+)"/g;
  let m;
  while ((m = matcherRegex.exec(tmplContent)) !== null) {
    if (!matchers.includes(m[1])) matchers.push(m[1]);
  }

  if (matchers.length === 0) return null;

  // Build safety prose based on what tools are hooked
  const toolDescriptions: Record<string, string> = {
    Bash: 'check bash commands for destructive operations (rm -rf, DROP TABLE, force-push, git reset --hard, etc.) before execution',
    Edit: 'verify file edits are within the allowed scope boundary before applying',
    Write: 'verify file writes are within the allowed scope boundary before applying',
  };

  const safetyChecks = matchers
    .map(t => toolDescriptions[t] || `check ${t} operations for safety`)
    .join(', and ');

  return `> **Safety Advisory:** This skill includes safety checks that ${safetyChecks}. When using this skill, always pause and verify before executing potentially destructive operations. If uncertain about a command's safety, ask the user for confirmation before proceeding.`;
}

// ─── Template Processing ────────────────────────────────────

const GENERATED_HEADER = `<!-- AUTO-GENERATED from {{SOURCE}} — do not edit directly -->\n<!-- Regenerate: bun run gen:skill-docs -->\n`;

function processTemplate(tmplPath: string, host: Host = 'claude'): { outputPath: string; content: string } {
  const tmplContent = fs.readFileSync(tmplPath, 'utf-8');
  const relTmplPath = path.relative(ROOT, tmplPath);
  let outputPath = tmplPath.replace(/\.tmpl$/, '');
  let outputDir: string | null = null;

  // Determine skill directory relative to ROOT
  const skillDir = path.relative(ROOT, path.dirname(tmplPath));

  // For codex host, route output to .agents/skills/{codexSkillName}/SKILL.md
  if (host === 'codex') {
    const codexName = codexSkillName(skillDir === '.' ? '' : skillDir);
    outputDir = path.join(ROOT, '.agents', 'skills', codexName);
    fs.mkdirSync(outputDir, { recursive: true });
    outputPath = path.join(outputDir, 'SKILL.md');
  }

  // Extract skill name from frontmatter for TemplateContext
  const { name: extractedName, description: extractedDescription } = extractNameAndDescription(tmplContent);
  const skillName = extractedName || path.basename(path.dirname(tmplPath));

  // Extract benefits-from list from frontmatter (inline YAML: benefits-from: [a, b])
  const benefitsMatch = tmplContent.match(/^benefits-from:\s*\[([^\]]*)\]/m);
  const benefitsFrom = benefitsMatch
    ? benefitsMatch[1].split(',').map(s => s.trim()).filter(Boolean)
    : undefined;

  const ctx: TemplateContext = { skillName, tmplPath, benefitsFrom, host, paths: HOST_PATHS[host] };

  // Replace placeholders
  let content = tmplContent.replace(/\{\{(\w+)\}\}/g, (match, name) => {
    const resolver = RESOLVERS[name];
    if (!resolver) throw new Error(`Unknown placeholder {{${name}}} in ${relTmplPath}`);
    return resolver(ctx);
  });

  // Check for any remaining unresolved placeholders
  const remaining = content.match(/\{\{(\w+)\}\}/g);
  if (remaining) {
    throw new Error(`Unresolved placeholders in ${relTmplPath}: ${remaining.join(', ')}`);
  }

  // For codex host: transform frontmatter and replace Claude-specific paths
  if (host === 'codex') {
    // Extract hook safety prose BEFORE transforming frontmatter (which strips hooks)
    const safetyProse = extractHookSafetyProse(tmplContent);

    // Transform frontmatter: keep only name + description
    content = transformFrontmatter(content, host);

    // Insert safety advisory at the top of the body (after frontmatter)
    if (safetyProse) {
      const bodyStart = content.indexOf('\n---') + 4;
      content = content.slice(0, bodyStart) + '\n' + safetyProse + '\n' + content.slice(bodyStart);
    }

    if (outputDir) {
      const codexName = codexSkillName(skillDir === '.' ? '' : skillDir);
      const agentsDir = path.join(outputDir, 'agents');
      fs.mkdirSync(agentsDir, { recursive: true });
      const displayName = codexName;
      const shortDescription = condenseOpenAIShortDescription(extractedDescription);
      fs.writeFileSync(path.join(agentsDir, 'openai.yaml'), generateOpenAIYaml(displayName, shortDescription));
    }
  }

  // Replace remaining hardcoded Claude paths with host-appropriate paths (for ALL hosts)
  // First replace openclaw-skills paths (legacy)
  content = content.replace(/~\/\.claude\/skills\/openclaw-skills/g, ctx.paths.skillRoot);
  content = content.replace(/\.claude\/skills\/openclaw-skills/g, ctx.paths.localSkillRoot);
  // Then replace fullstack paths
  content = content.replace(/~\/\.claude\/skills\/fullstack/g, ctx.paths.skillRoot);
  content = content.replace(/\.claude\/skills\/fullstack/g, ctx.paths.localSkillRoot);
  // Replace review paths - use localSkillRoot for relative paths
  content = content.replace(/\.claude\/skills\/review/g, ctx.paths.localSkillRoot + '/review');
  content = content.replace(/\.claude\/skills/g, '.agents/skills');
  // Replace openclaw-* binary names with fullstack-*
  content = content.replace(/openclaw-slug/g, 'fullstack-slug');
  content = content.replace(/openclaw-config/g, 'fullstack-config');
  content = content.replace(/openclaw-review-log/g, 'fullstack-review-log');
  content = content.replace(/openclaw-review-read/g, 'fullstack-review-read');
  content = content.replace(/openclaw-repo-mode/g, 'fullstack-repo-mode');
  content = content.replace(/openclaw-diff-scope/g, 'fullstack-diff-scope');
  content = content.replace(/openclaw-global-discover/g, 'fullstack-global-discover');
  content = content.replace(/openclaw-analytics/g, 'fullstack-analytics');

  // Prepend generated header (after frontmatter)
  const header = GENERATED_HEADER.replace('{{SOURCE}}', path.basename(tmplPath));
  const fmEnd = content.indexOf('---', content.indexOf('---') + 3);
  if (fmEnd !== -1) {
    const insertAt = content.indexOf('\n', fmEnd) + 1;
    content = content.slice(0, insertAt) + header + content.slice(insertAt);
  } else {
    content = header + content;
  }

  return { outputPath, content };
}

// ─── Main ───────────────────────────────────────────────────

function findTemplates(): string[] {
  const templates: string[] = [];
  const rootTmpl = path.join(ROOT, 'SKILL.md.tmpl');
  if (fs.existsSync(rootTmpl)) templates.push(rootTmpl);

  for (const entry of fs.readdirSync(ROOT, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name.startsWith('.') || entry.name === 'node_modules') continue;
    const tmpl = path.join(ROOT, entry.name, 'SKILL.md.tmpl');
    if (fs.existsSync(tmpl)) templates.push(tmpl);
  }
  return templates;
}

let hasChanges = false;

for (const tmplPath of findTemplates()) {
  // Skip /codex skill for codex host (self-referential — it's a Claude wrapper around codex exec)
  if (HOST === 'codex') {
    const dir = path.basename(path.dirname(tmplPath));
    if (dir === 'codex') continue;
  }

  const { outputPath, content } = processTemplate(tmplPath, HOST);
  const relOutput = path.relative(ROOT, outputPath);

  if (DRY_RUN) {
    const existing = fs.existsSync(outputPath) ? fs.readFileSync(outputPath, 'utf-8') : '';
    if (existing !== content) {
      console.log(`STALE: ${relOutput}`);
      hasChanges = true;
    } else {
      console.log(`FRESH: ${relOutput}`);
    }
  } else {
    fs.writeFileSync(outputPath, content);
    console.log(`GENERATED: ${relOutput}`);
  }
}

if (DRY_RUN && hasChanges) {
  console.error('\nGenerated SKILL.md files are stale. Run: bun run gen:skill-docs');
  process.exit(1);
}
