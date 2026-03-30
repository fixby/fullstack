# FullStack Skills

> "我觉得从去年12月以来我可能就没写过一行代码，这是一个极其巨大的变化。" — [Andrej Karpathy](https://fortune.com/2026/03/21/andrej-karpathy-openai-cofounder-ai-agents-coding-state-of-psychosis-openclaw/)，No Priors 播客，2026年3月

当我听到 Karpathy 说这话时，我在想：他是怎么做到的？一个人怎么可能像二十人的团队一样交付？Peter Steinberger 用 AI 代理基本上独自构建了 [OpenClaw](https://github.com/openclaw/openclaw) — 24.7万 GitHub 星标。革命已经到来。拥有正确工具的建设者，可以比传统团队移动得更快。

**FullStack Skills 就是答案。** 这是一套 AI 代理技能集合，把你的 AI 助手变成一个虚拟工程团队 — 有重新思考产品的 CEO，有锁定架构的工程经理，有发现 AI 废话的设计师，有发现生产环境 bug 的审查者，有打开真实浏览器的 QA 负责人，有发布 PR 的发布工程师。二十多个专家加八个强力工具，全是斜杠命令，全是 Markdown 文件，MIT 许可证，完全免费。

这是一个开源软件工厂。每天用它，Fork 它，改进它，让它成为你的。

**适合人群：**
- **创始人和 CEO** — 特别是那些还想要亲自交付的技术型创始人
- **首次使用 AI 代理的用户** — 结构化的角色而不是面对空白提示
- **技术负责人和资深工程师** — 每个 PR 都有严格的审查、QA 和发布自动化

## 快速开始

1. 安装 FullStack Skills（30秒 — 见下文）
2. 运行 `/office-hours` — 描述你在构建什么
3. 对任何功能想法运行 `/plan-ceo-review`
4. 对任何有变更的分支运行 `/review`
5. 在你的预发布 URL 上运行 `/qa`
6. 到这里停下来。你会知道这适不适合你。

## 安装 — 30秒

**要求：** [OpenClaw](https://github.com/openclaw/openclaw)、[Git](https://git-scm.com/)、[Bun](https://bun.sh/) v1.0+、[Node.js](https://nodejs.org/)（仅 Windows）

### 步骤 1：安装到你的机器

打开 OpenClaw 并粘贴下面这条命令，OpenClaw 会完成剩下的工作。

**Linux/Mac/Git Bash：**
```bash
git clone https://github.com/fixby/fullstsck.git ~/.openclaw/skills/fullstack && cd ~/.openclaw/skills/fullstack && ./setup
```

**Windows PowerShell：**
```powershell
git clone https://github.com/fixby/fullstsck.git $HOME/.openclaw/skills/fullstack; cd $HOME/.openclaw/skills/fullstack; .\setup.ps1
```

> 安装 FullStack Skills 完成后，接着在 CLAUDE.md 中添加一个 "fullstack" 部分，说明使用 fullstack 的 /browse 技能进行所有网页浏览，永远不要使用 mcp__claude-in-chrome__* 工具，并列出可用技能：/office-hours, /plan-ceo-review, /plan-eng-review, /plan-design-review, /design-consultation, /review, /ship, /land-and-deploy, /canary, /benchmark, /browse, /qa, /qa-only, /design-review, /setup-browser-cookies, /setup-deploy, /retro, /investigate, /document-release, /autoplan, /careful, /freeze, /guard, /unfreeze。然后询问用户是否也想将 fullstack 添加到当前项目，以便队友也能使用。

### 步骤 2：添加到你的仓库以便队友使用（可选）

**Linux/Mac/Git Bash：**
```bash
cp -Rf ~/.openclaw/skills/fullstack .openclaw/skills/fullstack && rm -rf .openclaw/skills/fullstack/.git && cd .openclaw/skills/fullstack && ./setup
```

**Windows PowerShell：**
```powershell
Copy-Item -Recurse -Force "$HOME/.openclaw/skills/fullstack" ".openclaw/skills/fullstack"; Remove-Item -Recurse -Force ".openclaw/skills/fullstack/.git"; cd ".openclaw/skills/fullstack"; .\setup.ps1
```

> 然后在此项目的 CLAUDE.md 中添加一个 "fullstack" 部分，说明使用 fullstack 的 /browse 技能进行所有网页浏览，永远不要使用 mcp__claude-in-chrome__* 工具，列出可用技能：/office-hours, /plan-ceo-review, /plan-eng-review, /plan-design-review, /design-consultation, /review, /ship, /land-and-deploy, /canary, /benchmark, /browse, /qa, /qa-only, /design-review, /setup-browser-cookies, /setup-deploy, /retro, /investigate, /document-release, /careful, /freeze, /guard, /unfreeze。

真实文件会被提交到你的仓库（不是子模块），所以 `git clone` 就能工作。所有东西都放在 `.openclaw/` 里面。不会碰你的 PATH 或在后台运行任何东西。

## 看看它的效果

```
你：    我想为我的日历构建一个每日简报应用。
你：    /office-hours
OpenClaw：[询问痛点 — 要具体例子，不要假设]

你：    多个 Google 日历，有过时信息的事件，错误的地点。
        准备工作需要很长时间，结果还是不够好...

OpenClaw：我要质疑你的框架。你说"每日简报应用"。
        但你实际描述的是一个私人参谋长 AI。
        [提取出 5 个你没意识到的能力]
        [挑战 4 个前提 — 你可以同意、不同意或调整]
        [生成 3 个实现方案及工作量估算]
        推荐：明天发布最窄的切入点，从真实使用中学习。
        完整愿景需要 3 个月 — 先从真正能用的每日简报开始。
        [编写设计文档 → 自动输入到下游技能]

你：    /plan-ceo-review
        [阅读设计文档，质疑范围，运行 10 部分审查]

你：    /plan-eng-review
        [数据流、状态机、错误路径的 ASCII 图表]
        [测试矩阵、失败模式、安全问题]

你：    批准计划。退出计划模式。
        [跨 11 个文件写入 2,400 行代码。约 8 分钟。]

你：    /review
        [自动修复] 2 个问题。[询问] 竞态条件 → 你批准修复。

你：    /qa https://staging.myapp.com
        [打开真实浏览器，点击流程，发现并修复一个 bug]

你：    /ship
        测试：42 → 51（+9 个新增）。PR：github.com/you/app/pull/42
```

你说"每日简报应用"。代理说"你在构建一个参谋长 AI" — 因为它倾听你的痛点，而不是你的功能描述。八个命令，端到端。这不是副驾驶，这是一个团队。

## 冲刺流程

FullStack Skills 是一个流程，而不是工具的集合。技能按照冲刺的顺序运行：

**思考 → 规划 → 构建 → 审查 → 测试 → 发布 → 反思**

每个技能衔接到下一个。`/office-hours` 编写设计文档，`/plan-ceo-review` 读取它。`/plan-eng-review` 编写测试计划，`/qa` 接收它。`/review` 捕获 bug，`/ship` 验证它们已修复。没有东西会漏掉，因为每一步都知道之前发生了什么。

| 技能 | 你的专家 | 他们做什么 |
|------|----------|-----------|
| `/office-hours` | **办公时间** | 从这里开始。六个引导性问题，在你写代码之前重新框架你的产品。质疑你的框架，挑战前提，生成实现替代方案。设计文档输入到每个下游技能。 |
| `/plan-ceo-review` | **CEO / 创始人** | 重新思考问题。找到隐藏在请求中的 10 星产品。四种模式：扩展、选择性扩展、保持范围、缩减。 |
| `/plan-eng-review` | **工程经理** | 锁定架构、数据流、图表、边缘情况和测试。将隐藏的假设暴露出来。 |
| `/plan-design-review` | **高级设计师** | 对每个设计维度评分 0-10，解释 10 分是什么样子，然后编辑计划以达到目标。AI 废话检测。交互式 — 每个设计选择使用 AskUserQuestion。 |
| `/design-consultation` | **设计合伙人** | 从头构建完整的设计系统。研究领域现状，提出创意风险，生成真实的产品模型。 |
| `/review` | **资深工程师** | 找到通过 CI 但在生产环境中爆炸的 bug。自动修复明显的问题。标记完整性缺口。 |
| `/investigate` | **调试器** | 系统性的根本原因调试。铁律：没有调查就没有修复。追踪数据流，测试假设，三次修复失败后停止。 |
| `/design-review` | **会写代码的设计师** | 与 /plan-design-review 相同的审计，然后修复发现的问题。原子提交，前后截图。 |
| `/qa` | **QA 负责人** | 测试你的应用，发现 bug，用原子提交修复它们，重新验证。为每个修复自动生成回归测试。 |
| `/qa-only` | **QA 报告员** | 与 /qa 相同的方法论，但只报告。纯 bug 报告，不修改代码。 |
| `/ship` | **发布工程师** | 同步 main，运行测试，审计覆盖率，推送，打开 PR。如果你没有测试框架，会自动引导搭建。 |
| `/land-and-deploy` | **发布工程师** | 合并 PR，等待 CI 和部署，验证生产健康。一个命令从"已批准"到"已在生产环境验证"。 |
| `/canary` | **SRE** | 部署后监控循环。监控控制台错误、性能退化和页面失败。 |
| `/benchmark` | **性能工程师** | 基准页面加载时间、Core Web Vitals 和资源大小。在每个 PR 上比较前后。 |
| `/document-release` | **技术文档工程师** | 更新所有项目文档以匹配你刚发布的内容。自动捕获过时的 README。 |
| `/retro` | **工程经理** | 团队感知的周回顾。每人分解、发布连续性、测试健康趋势、成长机会。`/retro global` 跨所有项目和 AI 工具运行（OpenClaw、Codex、Gemini）。 |
| `/browse` | **QA 工程师** | 真实 Chromium 浏览器，真实点击，真实截图。每条命令约 100ms。 |
| `/setup-browser-cookies` | **会话管理器** | 从你的真实浏览器（Chrome、Arc、Brave、Edge）导入 cookies 到无头会话。测试需要认证的页面。 |
| `/autoplan` | **审查流水线** | 一个命令，完全审查的计划。自动运行 CEO → 设计 → 工程审查，编码决策原则。只让你批准品味决策。 |

### 强力工具

| 技能 | 它做什么 |
|------|----------|
| `/careful` | **安全护栏** — 在破坏性命令之前警告（rm -rf、DROP TABLE、force-push）。说"小心"来激活。可以覆盖任何警告。 |
| `/freeze` | **编辑锁定** — 将文件编辑限制在一个目录。防止调试时意外更改范围外的内容。 |
| `/guard` | **完整安全** — `/careful` + `/freeze` 合并为一个命令。生产工作的最大安全性。 |
| `/unfreeze` | **解锁** — 移除 `/freeze` 边界。 |
| `/setup-deploy` | **部署配置器** — `/land-and-deploy` 的一次性设置。检测你的平台、生产 URL 和部署命令。 |

**[每个技能的深入解析和示例 →](docs/skills.md)**

## 文档

| 文档 | 涵盖内容 |
|------|----------|
| [技能深入解析](docs/skills.md) | 每个技能的理念、示例和工作流程 |
| [建设者理念](ETHOS.md) | 建设者哲学：煮沸湖水、构建之前先搜索、三层知识 |
| [架构](ARCHITECTURE.md) | 设计决策和系统内部结构 |
| [浏览器参考](BROWSER.md) | `/browse` 的完整命令参考 |
| [贡献指南](CONTRIBUTING.md) | 开发设置、测试、贡献者模式和开发模式 |
| [更新日志](CHANGELOG.md) | 每个版本的新内容 |

## 故障排除

**技能没有出现？**
- **Linux/Mac:** `cd ~/.openclaw/skills/fullstack && ./setup`
- **Windows:** `cd ~/.openclaw/skills/fullstack; .\setup.ps1`

**`/browse` 失败？**
- **Linux/Mac:** `cd ~/.openclaw/skills/fullstack && bun install && bun run build`
- **Windows:** `cd ~/.openclaw/skills/fullstack; bun install; bun run build`

**Windows 用户：** FullStack Skills 在 Windows 11 上通过 Git Bash 或 WSL 工作。除了 Bun 之外还需要 Node.js — Bun 在 Windows 上有 Playwright 管道传输的已知 bug（[bun#4253](https://github.com/oven-sh/bun/issues/4253)）。浏览服务器自动回退到 Node.js。确保 `bun` 和 `node` 都在你的 PATH 上。

**OpenClaw 说它看不到技能？** 确保你项目的 `CLAUDE.md` 有一个 fullstack 部分。添加这个：

```
## fullstack
使用 fullstack 的 /browse 进行所有网页浏览。永远不要使用 mcp__claude-in-chrome__* 工具。
可用技能：/office-hours, /plan-ceo-review, /plan-eng-review, /plan-design-review,
/design-consultation, /review, /ship, /land-and-deploy, /canary, /benchmark, /browse,
/qa, /qa-only, /design-review, /setup-browser-cookies, /setup-deploy, /retro,
/investigate, /document-release, /autoplan, /careful, /freeze, /guard, /unfreeze。
```

## 许可证

MIT。永远免费。去构建点什么吧。
