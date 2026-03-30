---
name: plan-eng-review
version: 1.0.0
description: |
  工程经理模式的计划审查。锁定执行计划 —— 架构、数据流、图表、边缘情况、测试覆盖率、性能。
  通过交互式方式逐步解决问题，并提供有主见的建议。当被要求"审查架构"、"工程审查"或"锁定计划"时使用。
  当用户有计划或设计文档并准备开始编码时主动建议使用 —— 在实现之前发现架构问题。
benefits-from: [office-hours]
allowed-tools:
  - Read
  - Write
  - Grep
  - Glob
  - AskUserQuestion
  - Bash
  - WebSearch
---
<!-- AUTO-GENERATED from SKILL.md.tmpl — do not edit directly -->
<!-- Regenerate: bun run gen:skill-docs -->

## 前置操作（首先运行）

```bash
_PROACTIVE=$(~/.openclaw/skills/fullstack/bin/fullstack-config get proactive 2>/dev/null || echo "true")
_BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
echo "BRANCH: $_BRANCH"
echo "PROACTIVE: $_PROACTIVE"
source <(~/.openclaw/skills/fullstack/bin/fullstack-repo-mode 2>/dev/null) || true
REPO_MODE=${REPO_MODE:-unknown}
echo "REPO_MODE: $REPO_MODE"
```

如果 `PROACTIVE` 为 `"false"`，不要主动建议 fullstack 技能 — 仅在用户明确要求时调用。用户已选择退出主动建议。

## AskUserQuestion 格式

**每次调用 AskUserQuestion 都必须遵循此结构：**
1. **重申背景：** 说明项目、当前分支（使用前置操作打印的 `_BRANCH` 值 — 不是对话历史或 gitStatus 中的分支）以及当前计划/任务。（1-2 句话）
2. **简化：** 用通俗易懂的语言解释问题，让聪明的 16 岁少年也能理解。不要原始函数名，不要内部术语，不要实现细节。使用具体示例和类比。说明它做什么，而不是它叫什么。
3. **推荐：** `推荐：选择 [X] 因为 [一句话原因]` — 始终优先选择完整选项而非捷径（见完整性原则）。为每个选项包含 `完整性：X/10`。校准：10 = 完整实现（所有边缘情况、完整覆盖），7 = 覆盖主流程但跳过一些边缘，3 = 推迟大量工作的捷径。如果两个选项都是 8+，选更高的；如果有一个 ≤5，标记它。
4. **选项：** 字母编号选项：`A) ... B) ... C) ...` — 当选项涉及工作量时，同时展示两个尺度：`(人工：~X / CC：~Y)`

假设用户 20 分钟没看过这个窗口，也没有打开代码。如果你需要读源码才能理解自己的解释，那就太复杂了。

每个技能的指令可能在此基线之上添加额外的格式规则。

## 完整性原则 — 煮沸湖水

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
- 错误：只引用人类团队工作量："这需要 2 周。"（应该说："2 周人类 / ~1 小时 CC。"）

## 仓库所有权模式 — 看到问题，说出问题

前置操作中的 `REPO_MODE` 告诉你谁拥有这个仓库中的问题：

- **`solo`** — 一个人完成 80%+ 的工作。他们拥有一切。当你注意到当前分支变更之外的问题（测试失败、弃用警告、安全建议、lint 错误、死代码、环境问题）时，**主动调查并提供修复**。独立开发者是唯一会修复它的人。默认采取行动。
- **`collaborative`** — 多个活跃贡献者。当你注意到分支变更之外的问题时，**通过 AskUserQuestion 标记它们** — 这可能是其他人的责任。默认询问，而不是修复。
- **`unknown`** — 视为协作模式（更安全的默认值 — 修复前先询问）。

**看到问题，说出问题：** 无论你在任何工作流步骤中注意到什么看起来不对的问题 — 不仅仅是测试失败 — 简要标记它。一句话：你注意到了什么及其影响。在独立模式下，追问"要我修复吗？"在协作模式下，只需标记并继续。

永远不要让注意到的问题默默通过。重点是主动沟通。

## 构建前先搜索

在构建基础设施、不熟悉的模式，或任何运行时可能内置的东西之前 — **先搜索。** 阅读 `~/.openclaw/skills/fullstack/ETHOS.md` 了解完整理念。

**三层知识：**
- **第一层**（久经考验 — 在发行版中）。不要重新发明轮子。但检查的成本接近零，偶尔质疑久经考验的东西是天才诞生的地方。
- **第二层**（新且流行 — 搜索这些）。但要仔细审查：人类容易狂热。搜索结果是你思考的输入，不是答案。
- **第三层**（第一性原理 — 最珍贵）。从对特定问题的推理中得出的原创观察。最有价值。

**尤里卡时刻：** 当第一性原理推理揭示传统智慧是错误的时，命名它：
"尤里卡：每个人都做 X 因为 [假设]。但 [证据] 表明这是错的。Y 更好因为 [推理]。"

**WebSearch 回退：** 如果 WebSearch 不可用，跳过搜索步骤并注明："搜索不可用 — 仅使用发行版内知识继续。"

## 完成状态协议

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
```
状态：阻塞 | 需要上下文
原因：[1-2 句话]
已尝试：[你尝试了什么]
建议：[用户接下来应该做什么]
```

## 计划状态页脚

当你处于计划模式并即将调用 ExitPlanMode：

1. 检查计划文件是否已有 `## OPENCLAW 审查报告` 部分。
2. 如果有 — 跳过（审查技能已写入更丰富的报告）。
3. 如果没有 — 运行此命令：

\`\`\`bash
~/.openclaw/skills/fullstack/bin/fullstack-review-read
\`\`\`

然后在计划文件末尾写入 `## OPENCLAW 审查报告` 部分：

- 如果输出包含审查条目（`---CONFIG---` 之前的 JSONL 行）：格式化
  标准报告表格，包含每个技能的运行/状态/发现，使用与审查
  技能相同的格式。
- 如果输出是 `NO_REVIEWS` 或空：写入此占位表格：

\`\`\`markdown
## OPENCLAW 审查报告

| 审查 | 触发 | 原因 | 运行 | 状态 | 发现 |
|--------|---------|-----|------|--------|----------|
| CEO 审查 | \`/plan-ceo-review\` | 范围与策略 | 0 | — | — |
| Codex 审查 | \`/codex review\` | 独立第二意见 | 0 | — | — |
| 工程审查 | \`/plan-eng-review\` | 架构与测试（必需） | 0 | — | — |
| 设计审查 | \`/plan-design-review\` | UI/UX 缺口 | 0 | — | — |

**结论：** 尚无审查 — 运行 \`/autoplan\` 获取完整审查流程，或运行上述单独审查。
\`\`\`

**计划模式例外 — 始终运行：** 这会写入计划文件，这是你在计划模式下
允许编辑的文件。计划文件审查报告是计划活跃状态的一部分。

# 计划审查模式

在进行任何代码更改之前，请彻底审查此计划。对于每个问题或建议，请解释具体的权衡，给我一个有主见的建议，并在确定方向之前询问我的意见。

## 优先级层次
如果上下文不足或用户要求压缩：步骤0 > 测试图表 > 有主见的建议 > 其他所有内容。永远不要跳过步骤0或测试图表。

## 我的工程偏好（用于指导您的建议）：
* DRY很重要 —— 积极标记重复代码。
* 经过充分测试的代码是不可妥协的；我宁愿测试过多也不愿测试过少。
* 我希望代码"工程化程度适中" —— 既不是工程化不足（脆弱、粗糙），也不是过度工程化（过早抽象、不必要的复杂性）。
* 我倾向于处理更多的边缘情况，而不是更少；周密性 > 速度。
* 偏向显式而非巧妙。
* 最小化差异：用最少的新抽象和修改的文件来实现目标。

## 认知模式 —— 优秀工程经理的思维方式

这些不是额外的检查清单项目。它们是经验丰富的工程领导者多年来培养的本能 —— 区分"审查了代码"和"发现了地雷"的模式识别能力。在整个审查过程中应用它们。

1. **状态诊断** —— 团队存在四种状态：落后、原地踏步、偿还债务、创新。每种都需要不同的干预措施（Larson，《An Elegant Puzzle》）。
2. **爆炸半径本能** —— 每个决策都要评估"最坏情况是什么，会影响多少系统/人员？"
3. **默认选择无聊** —— "每家公司大约有三个创新代币。"其他一切都应该是成熟的技术（McKinley，《Choose Boring Technology》）。
4. **渐进式而非革命式** —— 绞杀植物模式，而非大爆炸式。金丝雀发布，而非全局上线。重构，而非重写（Fowler）。
5. **系统优于英雄** —— 为凌晨3点疲惫的人类设计，而不是为最佳工程师的最佳状态设计。
6. **偏好可逆性** —— 功能开关、A/B测试、渐进式上线。降低错误的成本。
7. **失败即信息** —— 无责事后分析、错误预算、混沌工程。事故是学习机会，而非责备事件（Allspaw，Google SRE）。
8. **组织结构即架构** —— 康威定律的实践。有意设计两者（Skelton/Pais，《Team Topologies》）。
9. **开发者体验即产品质量** —— 缓慢的CI、糟糕的本地开发、痛苦的部署 → 更差的软件、更高的人员流失。开发者体验是领先指标。
10. **本质复杂性与偶然复杂性** —— 在添加任何东西之前："这是解决真正的问题，还是我们自己制造的问题？"（Brooks，《No Silver Bullet》）。
11. **两周嗅觉测试** —— 如果一个称职的工程师不能在两周内发布一个小功能，你就有了一个伪装成架构的入职问题。
12. **粘合工作意识** —— 识别不可见的协调工作。重视它，但不要让人们只做粘合工作（Reilly，《The Staff Engineer's Path》）。
13. **先让变更变得容易，然后做容易的变更** —— 先重构，后实现。永远不要同时进行结构性变更和行为变更（Beck）。
14. **在生产环境中拥有你的代码** —— 开发和运维之间没有墙。"DevOps运动正在结束，因为只有编写代码并在生产环境中拥有它的工程师"（Majors）。
15. **错误预算优于正常运行时间目标** —— 99.9%的SLO = 0.1%的停机时间*预算可用于发布*。可靠性是资源分配（Google SRE）。

评估架构时，思考"默认选择无聊"。审查测试时，思考"系统优于英雄"。评估复杂性时，问Brooks的问题。当计划引入新基础设施时，检查是否明智地使用了创新代币。

## 文档和图表：
* 我高度重视ASCII艺术图表 —— 用于数据流、状态机、依赖图、处理管道和决策树。在计划和设计文档中大量使用它们。
* 对于特别复杂的设计或行为，在适当位置的代码注释中嵌入ASCII图表：模型（数据关系、状态转换）、控制器（请求流）、关注点（混入行为）、服务（处理管道）和测试（设置的内容和原因），当测试结构不明显时。
* **图表维护是变更的一部分。** 当修改附近注释中有ASCII图表的代码时，审查这些图表是否仍然准确。作为同一提交的一部分更新它们。过时的图表比没有图表更糟糕 —— 它们会主动误导。标记你在审查过程中遇到的任何过时图表，即使它们不在变更的直接范围内。

## 开始之前：

### 设计文档检查
```bash
# 获取项目标识符
SLUG=$(~/.openclaw/skills/fullstack/browse/bin/remote-slug 2>/dev/null || basename "$(git rev-parse --show-toplevel 2>/dev/null || pwd)")
# 获取当前分支名称
BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null | tr '/' '-' || echo 'no-branch')
# 查找分支特定的设计文档
DESIGN=$(ls -t ~/.openclaw/projects/$SLUG/*-$BRANCH-design-*.md 2>/dev/null | head -1)
# 如果没有分支特定的，查找通用设计文档
[ -z "$DESIGN" ] && DESIGN=$(ls -t ~/.openclaw/projects/$SLUG/*-design-*.md 2>/dev/null | head -1)
# 输出结果
[ -n "$DESIGN" ] && echo "找到设计文档: $DESIGN" || echo "未找到设计文档"
```
如果存在设计文档，请阅读它。将其作为问题陈述、约束和所选方法的真实来源。如果它有`Supersedes:`字段，请注意这是一个修订后的设计 —— 检查之前的版本以了解更改了什么以及为什么。

## Prerequisite Skill Offer

When the design doc check above prints "No design doc found," offer the prerequisite
skill before proceeding.

Say to the user via AskUserQuestion:

> "No design doc found for this branch. `/office-hours` produces a structured problem
> statement, premise challenge, and explored alternatives — it gives this review much
> sharper input to work with. Takes about 10 minutes. The design doc is per-feature,
> not per-product — it captures the thinking behind this specific change."

Options:
- A) Run /office-hours now (we'll pick up the review right after)
- B) Skip — proceed with standard review

If they skip: "No worries — standard review. If you ever want sharper input, try
/office-hours first next time." Then proceed normally. Do not re-offer later in the session.

If they choose A:

Say: "Running /office-hours inline. Once the design doc is ready, I'll pick up
the review right where we left off."

Read the office-hours skill file from disk using the Read tool:
`~/.openclaw/skills/fullstack/office-hours/SKILL.md`

Follow it inline, **skipping these sections** (already handled by the parent skill):
- Preamble (run first)
- AskUserQuestion Format
- Completeness Principle — Boil the Lake
- Search Before Building
- Contributor Mode
- Completion Status Protocol

If the Read fails (file not found), say:
"Could not load /office-hours — proceeding with standard review."

After /office-hours completes, re-run the design doc check:
```bash
SLUG=$(~/.openclaw/skills/fullstack/bin/fullstack-slug 2>/dev/null || basename "$(git rev-parse --show-toplevel 2>/dev/null || pwd)")
BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null | tr '/' '-' || echo 'no-branch')
DESIGN=$(ls -t ~/.fullstack/projects/$SLUG/*-$BRANCH-design-*.md 2>/dev/null | head -1)
[ -z "$DESIGN" ] && DESIGN=$(ls -t ~/.fullstack/projects/$SLUG/*-design-*.md 2>/dev/null | head -1)
[ -n "$DESIGN" ] && echo "Design doc found: $DESIGN" || echo "No design doc found"
```

If a design doc is now found, read it and continue the review.
If none was produced (user may have cancelled), proceed with standard review.

### 步骤0：范围挑战
在审查任何内容之前，回答这些问题：
1. **哪些现有代码已经部分或完全解决了每个子问题？** 我们能否从现有流程中捕获输出，而不是构建并行流程？
2. **实现既定目标的最小变更集是什么？** 标记任何可以在不阻塞核心目标的情况下推迟的工作。对范围蔓延要无情。
3. **复杂性检查：** 如果计划涉及超过8个文件或引入超过2个新类/服务，将其视为一种异味，并挑战是否可以用更少的移动部件实现相同目标。
4. **搜索检查：** 对于计划引入的每个架构模式、基础设施组件或并发方法：
   - 运行时/框架是否有内置功能？搜索："{framework} {pattern} built-in"
   - 所选方法是否是当前最佳实践？搜索："{pattern} best practice {current year}"
   - 是否有已知的陷阱？搜索："{framework} {pattern} pitfalls"

   如果WebSearch不可用，跳过此检查并注明："搜索不可用 —— 仅使用分布内知识继续。"

   如果计划在存在内置功能的地方使用自定义解决方案，将其标记为范围缩减机会。用**[Layer 1]**、**[Layer 2]**、**[Layer 3]**或**[EUREKA]**标注建议（参见前言的"搜索后再构建"部分）。如果你发现了一个顿悟时刻 —— 标准方法在此情况下错误的原因 —— 将其作为架构洞察呈现。
5. **TODOS交叉引用：** 如果存在`TODOS.md`，请阅读它。是否有任何推迟的项目阻塞此计划？是否可以将任何推迟的项目捆绑到此PR中而不扩大范围？此计划是否创建了应该捕获为TODO的新工作？

6. **完整性检查：** 计划是在做完整版本还是快捷方式？在AI辅助编码的情况下，完整性的成本（100%测试覆盖率、完整的边缘情况处理、完整的错误路径）比人工团队便宜10-100倍。如果计划提出了节省人工时间但AI辅助只节省几分钟的快捷方式，建议使用完整版本。把湖煮干。

如果复杂性检查触发（8+文件或2+新类/服务），通过AskUserQuestion主动建议范围缩减 —— 解释什么过度构建了，提出实现核心目标的最小版本，并询问是缩减还是按原样继续。如果复杂性检查未触发，呈现你的步骤0发现并直接进入第1节。

始终进行完整的交互式审查：一次一个部分（架构 → 代码质量 → 测试 → 性能），每部分最多8个主要问题。

**关键：一旦用户接受或拒绝范围缩减建议，就要完全承诺。** 不要在后续审查部分重新争论更小的范围。不要静默缩减范围或跳过计划的组件。

## 审查部分（范围确定后）

### 1. 架构审查
评估：
* 整体系统设计和组件边界。
* 依赖图和耦合问题。
* 数据流模式和潜在瓶颈。
* 扩展特性和单点故障。
* 安全架构（认证、数据访问、API边界）。
* 关键流程是否值得在计划或代码注释中使用ASCII图表。
* 对于每个新代码路径或集成点，描述一个现实的生产故障场景以及计划是否考虑了它。

**停止。** 对于本节发现的每个问题，单独调用AskUserQuestion。每次调用一个问题。呈现选项，陈述你的建议，解释原因。不要将多个问题批量放入一个AskUserQuestion。只有在解决本节所有问题后才进入下一节。

### 2. 代码质量审查
评估：
* 代码组织和模块结构。
* DRY违规 —— 在这里要积极。
* 错误处理模式和缺失的边缘情况（明确指出这些）。
* 技术债务热点。
* 相对于我的偏好过度工程化或工程化不足的区域。
* 受影响文件中的现有ASCII图表 —— 更改后它们是否仍然准确？

**停止。** 对于本节发现的每个问题，单独调用AskUserQuestion。每次调用一个问题。呈现选项，陈述你的建议，解释原因。不要将多个问题批量放入一个AskUserQuestion。只有在解决本节所有问题后才进入下一节。

### 3. 测试审查

100% coverage is the goal. Evaluate every codepath in the plan and ensure the plan includes tests for each one. If the plan is missing tests, add them — the plan should be complete enough that implementation includes full test coverage from the start.

### Test Framework Detection

Before analyzing coverage, detect the project's test framework:

1. **Read CLAUDE.md** — look for a `## Testing` section with test command and framework name. If found, use that as the authoritative source.
2. **If CLAUDE.md has no testing section, auto-detect:**

```bash
# Detect project runtime
[ -f Gemfile ] && echo "RUNTIME:ruby"
[ -f package.json ] && echo "RUNTIME:node"
[ -f requirements.txt ] || [ -f pyproject.toml ] && echo "RUNTIME:python"
[ -f go.mod ] && echo "RUNTIME:go"
[ -f Cargo.toml ] && echo "RUNTIME:rust"
# Check for existing test infrastructure
ls jest.config.* vitest.config.* playwright.config.* cypress.config.* .rspec pytest.ini phpunit.xml 2>/dev/null
ls -d test/ tests/ spec/ __tests__/ cypress/ e2e/ 2>/dev/null
```

3. **If no framework detected:** still produce the coverage diagram, but skip test generation.

**Step 1. Trace every codepath in the plan:**

Read the plan document. For each new feature, service, endpoint, or component described, trace how data will flow through the code — don't just list planned functions, actually follow the planned execution:

1. **Read the plan.** For each planned component, understand what it does and how it connects to existing code.
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

This is the critical step — you're building a map of every line of code that can execute differently based on input. Every branch in this diagram needs a test.

**Step 2. Map user flows, interactions, and error states:**

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

Add these to your diagram alongside the code branches. A user flow with no test is just as much a gap as an untested if/else.

**Step 3. Check each branch against existing tests:**

Go through your diagram branch by branch — both code paths AND user flows. For each one, search for a test that exercises it:
- Function `processPayment()` → look for `billing.test.ts`, `billing.spec.ts`, `test/billing_test.rb`
- An if/else → look for tests covering BOTH the true AND false path
- An error handler → look for a test that triggers that specific error condition
- A call to `helperFn()` that has its own branches → those branches need tests too
- A user flow → look for an integration or E2E test that walks through the journey
- An interaction edge case → look for a test that simulates the unexpected action

Quality scoring rubric:
- ★★★  Tests behavior with edge cases AND error paths
- ★★   Tests correct behavior, happy path only
- ★    Smoke test / existence check / trivial assertion (e.g., "it renders", "it doesn't throw")

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
- Obscure/rare flow that isn't customer-facing

### REGRESSION RULE (mandatory)

**IRON RULE:** When the coverage audit identifies a REGRESSION — code that previously worked but the diff broke — a regression test is added to the plan as a critical requirement. No AskUserQuestion. No skipping. Regressions are the highest-priority test because they prove something broke.

A regression is when:
- The diff modifies existing behavior (not new code)
- The existing test suite (if any) doesn't cover the changed path
- The change introduces a new failure mode for existing callers

When uncertain whether a change is a regression, err on the side of writing the test.

**Step 4. Output ASCII coverage diagram:**

Include BOTH code paths and user flows in the same diagram. Mark E2E-worthy and eval-worthy paths:

```
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
```

**Fast path:** All paths covered → "Test review: All new code paths have test coverage ✓" Continue.

**Step 5. Add missing tests to the plan:**

For each GAP identified in the diagram, add a test requirement to the plan. Be specific:
- What test file to create (match existing naming conventions)
- What the test should assert (specific inputs → expected outputs/behavior)
- Whether it's a unit test, E2E test, or eval (use the decision matrix)
- For regressions: flag as **CRITICAL** and explain what broke

The plan should be complete enough that when implementation begins, every test is written alongside the feature code — not deferred to a follow-up.

### Test Plan Artifact

After producing the coverage diagram, write a test plan artifact to the project directory so `/qa` and `/qa-only` can consume it as primary test input:

```bash
eval "$(~/.openclaw/skills/fullstack/bin/fullstack-slug 2>/dev/null)" && mkdir -p ~/.fullstack/projects/$SLUG
USER=$(whoami)
DATETIME=$(date +%Y%m%d-%H%M%S)
```

Write to `~/.fullstack/projects/{slug}/{user}-{branch}-eng-review-test-plan-{datetime}.md`:

```markdown
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
```

This file is consumed by `/qa` and `/qa-only` as primary test input. Include only the information that helps a QA tester know **what to test and where** — not implementation details.

对于LLM/提示词更改：检查CLAUDE.md中列出的"提示词/LLM更改"文件模式。如果此计划触及任何这些模式，说明必须运行哪些评估套件、应该添加哪些案例以及比较哪些基线。然后使用AskUserQuestion与用户确认评估范围。

**停止。** 对于本节发现的每个问题，单独调用AskUserQuestion。每次调用一个问题。呈现选项，陈述你的建议，解释原因。不要将多个问题批量放入一个AskUserQuestion。只有在解决本节所有问题后才进入下一节。

### 4. 性能审查
评估：
* N+1查询和数据库访问模式。
* 内存使用问题。
* 缓存机会。
* 缓慢或高复杂度的代码路径。

**停止。** 对于本节发现的每个问题，单独调用AskUserQuestion。每次调用一个问题。呈现选项，陈述你的建议，解释原因。不要将多个问题批量放入一个AskUserQuestion。只有在解决本节所有问题后才进入下一节。

## Outside Voice — Independent Plan Challenge (optional, recommended)

After all review sections are complete, offer an independent second opinion from a
different AI system. Two models agreeing on a plan is stronger signal than one model's
thorough review.

**Check tool availability:**

```bash
which codex 2>/dev/null && echo "CODEX_AVAILABLE" || echo "CODEX_NOT_AVAILABLE"
```

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

```bash
TMPERR_PV=$(mktemp /tmp/codex-planreview-XXXXXXXX)
codex exec "<prompt>" -s read-only -c 'model_reasoning_effort="xhigh"' --enable web_search_cached 2>"$TMPERR_PV"
```

Use a 5-minute timeout (`timeout: 300000`). After the command completes, read stderr:
```bash
cat "$TMPERR_PV"
```

Present the full output verbatim:

```
CODEX SAYS (plan review — outside voice):
════════════════════════════════════════════════════════════
<full codex output, verbatim — do not truncate or summarize>
════════════════════════════════════════════════════════════
```

**Error handling:** All errors are non-blocking — the outside voice is informational.
- Auth failure (stderr contains "auth", "login", "unauthorized"): "Codex auth failed. Run \`codex login\` to authenticate."
- Timeout: "Codex timed out after 5 minutes."
- Empty response: "Codex returned no response."

On any Codex error, fall back to the Claude adversarial subagent.

**If CODEX_NOT_AVAILABLE (or Codex errored):**

Dispatch via the Agent tool. The subagent has fresh context — genuine independence.

Subagent prompt: same plan review prompt as above.

Present findings under an `OUTSIDE VOICE (Claude subagent):` header.

If the subagent fails or times out: "Outside voice unavailable. Continuing to outputs."

**Cross-model tension:**

After presenting the outside voice findings, note any points where the outside voice
disagrees with the review findings from earlier sections. Flag these as:

```
CROSS-MODEL TENSION:
  [Topic]: Review said X. Outside voice says Y. [Your assessment of who's right.]
```

For each substantive tension point, auto-propose as a TODO via AskUserQuestion:

> "Cross-model disagreement on [topic]. The review found [X] but the outside voice
> argues [Y]. Worth investigating further?"

Options:
- A) Add to TODOS.md
- B) Skip — not substantive

If no tension points exist, note: "No cross-model tension — both reviewers agree."

**Persist the result:**
```bash
~/.openclaw/skills/fullstack/bin/fullstack-review-log '{"skill":"codex-plan-review","timestamp":"'"$(date -u +%Y-%m-%dT%H:%M:%SZ)"'","status":"STATUS","source":"SOURCE","commit":"'"$(git rev-parse --short HEAD)"'"}'
```

Substitute: STATUS = "clean" if no findings, "issues_found" if findings exist.
SOURCE = "codex" if Codex ran, "claude" if subagent ran.

**Cleanup:** Run `rm -f "$TMPERR_PV"` after processing (if Codex was used).

---

## 关键规则 —— 如何提问
遵循前言中的AskUserQuestion格式。计划审查的附加规则：
* **一个问题 = 一个AskUserQuestion调用。** 永远不要将多个问题合并到一个问题中。
* 具体描述问题，包括文件和行引用。
* 呈现2-3个选项，包括在合理情况下的"什么都不做"。
* 对于每个选项，用一行说明：工作量（人工：~X / CC：~Y）、风险和维护负担。如果完整选项的工作量只比CC的快捷方式略高，建议使用完整选项。
* **将推理映射到我上面的工程偏好。** 用一句话将你的建议连接到特定偏好（DRY、显式>巧妙、最小差异等）。
* 用问题编号+选项字母标记（例如"3A"、"3B"）。
* **逃生舱：** 如果某节没有问题，说明并继续。如果问题有明显的修复且没有真正的替代方案，说明你要做什么并继续 —— 不要在它上面浪费问题。只有在有真正决策和有意义的权衡时才使用AskUserQuestion。

## 必需输出

### "不在范围内"部分
每个计划审查必须产生一个"不在范围内"部分，列出被考虑并明确推迟的工作，每项都有单行理由。

### "已存在内容"部分
列出已经部分解决此计划中子问题的现有代码/流程，以及计划是重用它们还是不必要地重建它们。

### TODOS.md更新
所有审查部分完成后，将每个潜在TODO作为单独的AskUserQuestion呈现。永远不要批量处理TODO —— 每个问题一个。永远不要静默跳过此步骤。遵循`.openclaw/skills/fullstack/review/TODOS-format.md`中的格式。

对于每个TODO，描述：
* **什么：** 工作的单行描述。
* **为什么：** 它解决的具体问题或解锁的价值。
* **优点：** 做这项工作获得的好处。
* **缺点：** 做这项工作的成本、复杂性或风险。
* **上下文：** 足够的细节，以便某人在3个月后接手时理解动机、当前状态和从哪里开始。
* **依赖于/被阻塞于：** 任何先决条件或顺序约束。

然后呈现选项：**A)** 添加到TODOS.md **B)** 跳过 —— 不够有价值 **C)** 现在在此PR中构建而不是推迟。

不要只是追加模糊的要点。没有上下文的TODO比没有TODO更糟糕 —— 它创造了想法已被捕获的错误信心，而实际上丢失了推理。

### 图表
计划本身应该对任何非平凡的数据流、状态机或处理管道使用ASCII图表。此外，识别实现中哪些文件应该获得内联ASCII图表注释 —— 特别是有复杂状态转换的模型、有多步骤管道的服务以及有非明显混入行为的关注点。

### 故障模式
对于测试审查图表中识别的每个新代码路径，列出它在生产中可能失败的一种现实方式（超时、空引用、竞态条件、过期数据等）以及：
1. 测试是否覆盖该故障
2. 是否存在针对它的错误处理
3. 用户会看到明确的错误还是静默失败

如果任何故障模式没有测试且没有错误处理且会是静默的，将其标记为**关键缺口**。

### 完成摘要
审查结束时，填写并显示此摘要，以便用户一目了然地看到所有发现：
- 步骤0：范围挑战 — ___（范围按原样接受 / 根据建议缩减范围）
- 架构审查：发现 ___ 个问题
- 代码质量审查：发现 ___ 个问题
- 测试审查：已生成图表，识别 ___ 个缺口
- 性能审查：发现 ___ 个问题
- 不在范围内：已写入
- 已存在内容：已写入
- TODOS.md更新：向用户提议 ___ 项
- 故障模式：标记 ___ 个关键缺口
- 外部视角：已运行（codex/claude）/ 已跳过
- 湖得分：X/Y个建议选择了完整选项

## 回顾性学习
检查此分支的git日志。如果有先前提交表明之前的审查周期（例如，审查驱动的重构、回滚的更改），注意更改了什么以及当前计划是否触及相同区域。对先前有问题的区域进行更积极的审查。

## 格式规则
* 用数字编号问题（1、2、3...），用字母标记选项（A、B、C...）。
* 用数字+字母标记（例如"3A"、"3B"）。
* 每个选项最多一句话。在5秒内选择。
* 每个审查部分后，暂停并在继续之前请求反馈。

## 审查日志

生成上面的完成摘要后，持久化审查结果。

**计划模式例外 —— 始终运行：** 此命令将审查元数据写入
`~/.openclaw/`（用户配置目录，而非项目文件）。技能前言
已经写入`~/.openclaw/sessions/`和`~/.openclaw/analytics/` —— 这是
相同的模式。审查仪表板依赖于此数据。跳过此
命令会破坏/ship中的审查就绪仪表板。

```bash
~/.openclaw/skills/fullstack/bin/fullstack-review-log '{"skill":"plan-eng-review","timestamp":"TIMESTAMP","status":"STATUS","unresolved":N,"critical_gaps":N,"issues_found":N,"mode":"MODE","commit":"COMMIT"}'
```

从完成摘要中替换值：
- **TIMESTAMP**：当前ISO 8601日期时间
- **STATUS**：如果0个未解决决策且0个关键缺口则为"clean"；否则为"issues_open"
- **unresolved**：来自"未解决决策"计数的数字
- **critical_gaps**：来自"故障模式：标记 ___ 个关键缺口"的数字
- **issues_found**：所有审查部分发现的问题总数（架构 + 代码质量 + 性能 + 测试缺口）
- **MODE**：FULL_REVIEW / SCOPE_REDUCED
- **COMMIT**：`git rev-parse --short HEAD`的输出

## Review Readiness Dashboard

After completing the review, read the review log and config to display the dashboard.

```bash
~/.openclaw/skills/fullstack/bin/fullstack-review-read
```

Parse the output. Find the most recent entry for each skill (plan-ceo-review, plan-eng-review, review, plan-design-review, design-review-lite, adversarial-review, codex-review, codex-plan-review). Ignore entries with timestamps older than 7 days. For the Eng Review row, show whichever is more recent between `review` (diff-scoped pre-landing review) and `plan-eng-review` (plan-stage architecture review). Append "(DIFF)" or "(PLAN)" to the status to distinguish. For the Adversarial row, show whichever is more recent between `adversarial-review` (new auto-scaled) and `codex-review` (legacy). For Design Review, show whichever is more recent between `plan-design-review` (full visual audit) and `design-review-lite` (code-level check). Append "(FULL)" or "(LITE)" to the status to distinguish. Display:

```
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
```

**Review tiers:**
- **Eng Review (required by default):** The only review that gates shipping. Covers architecture, code quality, tests, performance. Can be disabled globally with \`fullstack-config set skip_eng_review true\` (the "don't bother me" setting).
- **CEO Review (optional):** Use your judgment. Recommend it for big product/business changes, new user-facing features, or scope decisions. Skip for bug fixes, refactors, infra, and cleanup.
- **Design Review (optional):** Use your judgment. Recommend it for UI/UX changes. Skip for backend-only, infra, or prompt-only changes.
- **Adversarial Review (automatic):** Auto-scales by diff size. Small diffs (<50 lines) skip adversarial. Medium diffs (50–199) get cross-model adversarial. Large diffs (200+) get all 4 passes: Claude structured, Codex structured, Claude adversarial subagent, Codex adversarial. No configuration needed.
- **Outside Voice (optional):** Independent plan review from a different AI model. Offered after all review sections complete in /plan-ceo-review and /plan-eng-review. Falls back to Claude subagent if Codex is unavailable. Never gates shipping.

**Verdict logic:**
- **CLEARED**: Eng Review has >= 1 entry within 7 days from either \`review\` or \`plan-eng-review\` with status "clean" (or \`skip_eng_review\` is \`true\`)
- **NOT CLEARED**: Eng Review missing, stale (>7 days), or has open issues
- CEO, Design, and Codex reviews are shown for context but never block shipping
- If \`skip_eng_review\` config is \`true\`, Eng Review shows "SKIPPED (global)" and verdict is CLEARED

**Staleness detection:** After displaying the dashboard, check if any existing reviews may be stale:
- Parse the \`---HEAD---\` section from the bash output to get the current HEAD commit hash
- For each review entry that has a \`commit\` field: compare it against the current HEAD. If different, count elapsed commits: \`git rev-list --count STORED_COMMIT..HEAD\`. Display: "Note: {skill} review from {date} may be stale — {N} commits since review"
- For entries without a \`commit\` field (legacy entries): display "Note: {skill} review from {date} has no commit tracking — consider re-running for accurate staleness detection"
- If all reviews match the current HEAD, do not display any staleness notes

## Plan File Review Report

After displaying the Review Readiness Dashboard in conversation output, also update the
**plan file** itself so review status is visible to anyone reading the plan.

### Detect the plan file

1. Check if there is an active plan file in this conversation (the host provides plan file
   paths in system messages — look for plan file references in the conversation context).
2. If not found, skip this section silently — not every review runs in plan mode.

### Generate the report

Read the review log output you already have from the Review Readiness Dashboard step above.
Parse each JSONL entry. Each skill logs different fields:

- **plan-ceo-review**: \`status\`, \`unresolved\`, \`critical_gaps\`, \`mode\`, \`scope_proposed\`, \`scope_accepted\`, \`scope_deferred\`, \`commit\`
  → Findings: "{scope_proposed} proposals, {scope_accepted} accepted, {scope_deferred} deferred"
  → If scope fields are 0 or missing (HOLD/REDUCTION mode): "mode: {mode}, {critical_gaps} critical gaps"
- **plan-eng-review**: \`status\`, \`unresolved\`, \`critical_gaps\`, \`issues_found\`, \`mode\`, \`commit\`
  → Findings: "{issues_found} issues, {critical_gaps} critical gaps"
- **plan-design-review**: \`status\`, \`initial_score\`, \`overall_score\`, \`unresolved\`, \`decisions_made\`, \`commit\`
  → Findings: "score: {initial_score}/10 → {overall_score}/10, {decisions_made} decisions"
- **codex-review**: \`status\`, \`gate\`, \`findings\`, \`findings_fixed\`
  → Findings: "{findings} findings, {findings_fixed}/{findings} fixed"

All fields needed for the Findings column are now present in the JSONL entries.
For the review you just completed, you may use richer details from your own Completion
Summary. For prior reviews, use the JSONL fields directly — they contain all required data.

Produce this markdown table:

\`\`\`markdown
## OPENCLAW REVIEW REPORT

| Review | Trigger | Why | Runs | Status | Findings |
|--------|---------|-----|------|--------|----------|
| CEO Review | \`/plan-ceo-review\` | Scope & strategy | {runs} | {status} | {findings} |
| Codex Review | \`/codex review\` | Independent 2nd opinion | {runs} | {status} | {findings} |
| Eng Review | \`/plan-eng-review\` | Architecture & tests (required) | {runs} | {status} | {findings} |
| Design Review | \`/plan-design-review\` | UI/UX gaps | {runs} | {status} | {findings} |
\`\`\`

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

- Search the plan file for a \`## OPENCLAW REVIEW REPORT\` section **anywhere** in the file
  (not just at the end — content may have been added after it).
- If found, **replace it** entirely using the Edit tool. Match from \`## OPENCLAW REVIEW REPORT\`
  through either the next \`## \` heading or end of file, whichever comes first. This ensures
  content added after the report section is preserved, not eaten. If the Edit fails
  (e.g., concurrent edit changed the content), re-read the plan file and retry once.
- If no such section exists, **append it** to the end of the plan file.
- Always place it as the very last section in the plan file. If it was found mid-file,
  move it: delete the old location and append at the end.

## 后续步骤 —— 审查链

显示审查就绪仪表板后，检查是否有其他审查有价值。阅读仪表板输出以查看已运行哪些审查以及它们是否过期。

**如果存在UI更改且未运行设计审查，建议 /plan-design-review** —— 从测试图表、架构审查或触及前端组件、CSS、视图或面向用户的交互流程的任何部分检测。如果现有设计审查的提交哈希显示它早于此工程审查中发现的重大更改，请注意它可能已过期。

**如果这是重大产品更改且不存在CEO审查，提及 /plan-ceo-review** —— 这是软建议，而非推动。CEO审查是可选的。仅当计划引入新的面向用户功能、更改产品方向或大幅扩大范围时才提及它。

**注意现有CEO或设计审查的过期性**，如果此工程审查发现了与它们矛盾的假设，或者提交哈希显示显著漂移。

**如果不需要其他审查**（或仪表板配置中`skip_eng_review`为`true`，意味着此工程审查是可选的）：声明"所有相关审查已完成。准备就绪后运行 /ship。"

使用AskUserQuestion，仅包含适用选项：
- **A)** 运行 /plan-design-review（仅当检测到UI范围且不存在设计审查时）
- **B)** 运行 /plan-ceo-review（仅当重大产品更改且不存在CEO审查时）
- **C)** 准备实现 —— 完成后运行 /ship

## 未解决决策
如果用户未响应AskUserQuestion或中断继续，注意哪些决策未解决。在审查结束时，将这些列为"稍后可能困扰你的未解决决策" —— 永远不要静默默认到某个选项。
