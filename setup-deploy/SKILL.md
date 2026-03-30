---
name: setup-deploy
version: 1.0.0
description: |
  为 /land-and-deploy 配置部署设置。检测你的部署平台（Fly.io、Render、
  Vercel、Netlify、Heroku、GitHub Actions、自定义）、生产 URL、健康检查端点
  和部署状态命令。将配置写入 CLAUDE.md，以便所有未来的部署都是自动的。
  当被要求"设置部署"、"配置部署"、"设置 land-and-deploy"、"如何使用
  openclaw-skills 部署"、"添加部署配置"时使用。
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - AskUserQuestion
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

# /setup-deploy — 为 OpenClaw Skills 配置部署

你正在帮助用户配置他们的部署，以便 `/land-and-deploy` 自动工作。你的工作是检测部署平台、生产 URL、健康检查和部署状态命令 — 然后将所有内容持久化到 CLAUDE.md。

运行一次后，`/land-and-deploy` 会读取 CLAUDE.md 并完全跳过检测。

## 用户可调用
当用户输入 `/setup-deploy` 时，运行此技能。

## 指令

### 步骤 1：检查现有配置

```bash
grep -A 20 "## Deploy Configuration" CLAUDE.md 2>/dev/null || echo "NO_CONFIG"
```

如果配置已存在，显示并询问：

- **上下文：** CLAUDE.md 中已存在部署配置。
- **建议：** 如果你的设置已更改，选择 A 进行更新。
- A) 从头重新配置（覆盖现有）
- B) 编辑特定字段（显示当前配置，让我更改一项）
- C) 完成 — 配置看起来正确

如果用户选择 C，停止。

### 步骤 2：检测平台

从部署引导程序运行平台检测：

```bash
# 平台配置文件
[ -f fly.toml ] && echo "PLATFORM:fly" && cat fly.toml
[ -f render.yaml ] && echo "PLATFORM:render" && cat render.yaml
[ -f vercel.json ] || [ -d .vercel ] && echo "PLATFORM:vercel"
[ -f netlify.toml ] && echo "PLATFORM:netlify" && cat netlify.toml
[ -f Procfile ] && echo "PLATFORM:heroku"
[ -f railway.json ] || [ -f railway.toml ] && echo "PLATFORM:railway"

# GitHub Actions 部署工作流
for f in .github/workflows/*.yml .github/workflows/*.yaml; do
  [ -f "$f" ] && grep -qiE "deploy|release|production|staging|cd" "$f" 2>/dev/null && echo "DEPLOY_WORKFLOW:$f"
done

# 项目类型
[ -f package.json ] && grep -q '"bin"' package.json 2>/dev/null && echo "PROJECT_TYPE:cli"
ls *.gemspec 2>/dev/null && echo "PROJECT_TYPE:library"
```

### 步骤 3：平台特定设置

根据检测到的内容，引导用户完成平台特定的配置。

#### Fly.io

如果检测到 `fly.toml`：

1. 提取应用名称：`grep -m1 "^app" fly.toml | sed 's/app = "\(.*\)"/\1/'`
2. 检查 `fly` CLI 是否已安装：`which fly 2>/dev/null`
3. 如果已安装，验证：`fly status --app {app} 2>/dev/null`
4. 推断 URL：`https://{app}.fly.dev`
5. 设置部署状态命令：`fly status --app {app}`
6. 设置健康检查：`https://{app}.fly.dev`（或 `/health` 如果应用有）

询问用户确认生产 URL。某些 Fly 应用使用自定义域名。

#### Render

如果检测到 `render.yaml`：

1. 从 render.yaml 提取服务名称和类型
2. 检查 Render API 密钥：`echo $RENDER_API_KEY | head -c 4`（不要暴露完整密钥）
3. 推断 URL：`https://{service-name}.onrender.com`
4. Render 在推送到连接的分支时自动部署 — 无需部署工作流
5. 设置健康检查：推断的 URL

询问用户确认。Render 使用从连接的 git 分支自动部署 — 合并到 main 后，Render 会自动获取。`/land-and-deploy` 中的"部署等待"应该轮询 Render URL 直到它以新版本响应。

#### Vercel

如果检测到 vercel.json 或 .vercel：

1. 检查 `vercel` CLI：`which vercel 2>/dev/null`
2. 如果已安装：`vercel ls --prod 2>/dev/null | head -3`
3. Vercel 在推送时自动部署 — PR 上预览，合并到 main 时生产
4. 设置健康检查：从 vercel 项目设置中的生产 URL

#### Netlify

如果检测到 netlify.toml：

1. 从 netlify.toml 提取站点信息
2. Netlify 在推送时自动部署
3. 设置健康检查：生产 URL

#### 仅 GitHub Actions

如果检测到部署工作流但没有平台配置：

1. 读取工作流文件以了解它的作用
2. 提取部署目标（如果提到）
3. 询问用户生产 URL

#### 自定义 / 手动

如果未检测到任何内容：

使用 AskUserQuestion 收集信息：

1. **部署是如何触发的？**
   - A) 推送到 main 时自动（Fly、Render、Vercel、Netlify 等）
   - B) 通过 GitHub Actions 工作流
   - C) 通过部署脚本或 CLI 命令（描述它）
   - D) 手动（SSH、仪表板等）
   - E) 此项目不部署（库、CLI、工具）

2. **生产 URL 是什么？**（自由文本 — 应用运行的 URL）

3. **openclaw-skills 如何检查部署是否成功？**
   - A) 特定 URL 的 HTTP 健康检查（例如 /health、/api/status）
   - B) CLI 命令（例如 `fly status`、`kubectl rollout status`）
   - C) 检查 GitHub Actions 工作流状态
   - D) 没有自动化方式 — 只是检查 URL 是否加载

4. **有任何合并前或合并后钩子吗？**
   - 合并前运行的命令（例如 `bun run build`）
   - 合并后但在部署验证前运行的命令

### 步骤 4：写入配置

读取 CLAUDE.md（或创建它）。如果存在 `## Deploy Configuration` 部分，查找并替换，或在末尾追加。

```markdown
## 部署配置（由 /setup-deploy 配置）
- 平台：{platform}
- 生产 URL：{url}
- 部署工作流：{workflow 文件或"推送时自动部署"}
- 部署状态命令：{command 或"HTTP 健康检查"}
- 合并方法：{squash/merge/rebase}
- 项目类型：{web app / API / CLI / library}
- 部署后健康检查：{健康检查 URL 或命令}

### 自定义部署钩子
- 合并前：{command 或"无"}
- 部署触发：{command 或"推送到 main 时自动"}
- 部署状态：{command 或"轮询生产 URL"}
- 健康检查：{URL 或命令}
```

### 步骤 5：验证

写入后，验证配置是否工作：

1. 如果配置了健康检查 URL，尝试它：
```bash
curl -sf "{health-check-url}" -o /dev/null -w "%{http_code}" 2>/dev/null || echo "UNREACHABLE"
```

2. 如果配置了部署状态命令，尝试它：
```bash
{deploy-status-command} 2>/dev/null | head -5 || echo "COMMAND_FAILED"
```

报告结果。如果任何失败，记录但不要阻塞 — 即使健康检查暂时无法访问，配置仍然有用。

### 步骤 6：摘要

```
部署配置 — 完成
════════════════════════════════
平台：      {platform}
URL：       {url}
健康检查：  {health check}
状态命令：  {status command}
合并方法：  {merge method}

已保存到 CLAUDE.md。/land-and-deploy 将自动使用这些设置。

后续步骤：
- 运行 /land-and-deploy 合并并部署你当前的 PR
- 编辑 CLAUDE.md 中的"## 部署配置"部分以更改设置
- 再次运行 /setup-deploy 重新配置
```

## 重要规则

- **永远不要暴露密钥。** 不要打印完整的 API 密钥、令牌或密码。
- **与用户确认。** 在写入之前始终显示检测到的配置并请求确认。
- **CLAUDE.md 是真实来源。** 所有配置都在那里 — 不在单独的配置文件中。
- **幂等。** 多次运行 /setup-deploy 会干净地覆盖之前的配置。
- **平台 CLI 是可选的。** 如果 `fly` 或 `vercel` CLI 未安装，回退到基于 URL 的健康检查。
