# fullstack 开发指南

## 命令

```bash
bun install          # 安装依赖
bun test             # 运行免费测试（browse + 快照 + 技能验证）
bun run test:evals   # 运行付费评估：LLM 评判 + E2E（基于差异，最高约 $4/次）
bun run test:evals:all  # 运行所有付费评估，无论是否有差异
bun run test:e2e     # 仅运行 E2E 测试（基于差异，最高约 $3.85/次）
bun run test:e2e:all # 运行所有 E2E 测试，无论是否有差异
bun run eval:select  # 显示基于当前差异会运行哪些测试
bun run dev <cmd>    # 以开发模式运行 CLI，例如 bun run dev goto https://example.com
bun run build        # 生成文档 + 编译二进制文件
bun run gen:skill-docs  # 从模板重新生成 SKILL.md 文件
bun run skill:check  # 所有技能的健康仪表板
bun run dev:skill    # 监视模式：更改时自动重新生成 + 验证
bun run eval:list    # 列出 ~/.openclaw-dev/evals/ 中的所有评估运行
bun run eval:compare # 比较两次评估运行（自动选择最近的）
bun run eval:summary # 汇总所有评估运行的统计数据
```

`test:evals` 需要 `ANTHROPIC_API_KEY`。Codex E2E 测试（`test/codex-e2e.test.ts`）
使用 Codex 自己的 `~/.codex/` 配置中的认证 —— 不需要 `OPENAI_API_KEY` 环境变量。
E2E 测试实时流式传输进度（通过 `--output-format stream-json --verbose` 逐工具传输）。
结果持久化到 `~/.openclaw-dev/evals/`，并与上一次运行自动比较。

**基于差异的测试选择：** `test:evals` 和 `test:e2e` 根据与基础分支的 `git diff`
自动选择测试。每个测试在 `test/helpers/touchfiles.ts` 中声明其文件依赖关系。
全局 touchfiles（session-runner、eval-store、llm-judge、gen-skill-docs）的更改
会触发所有测试。使用 `EVALS_ALL=1` 或 `:all` 脚本变体强制运行所有测试。
运行 `eval:select` 预览会运行哪些测试。

## 测试

```bash
bun test             # 每次提交前运行 —— 免费，<2秒
bun run test:evals   # 发布前运行 —— 付费，基于差异（最高约 $4/次）
```

`bun test` 运行技能验证、gen-skill-docs 质量检查和 browse 集成测试。
`bun run test:evals` 通过 `claude -p` 运行 LLM 评判质量评估和 E2E 测试。
创建 PR 前两者都必须通过。

## 项目结构

```
fullstack/
├── browse/          # 无头浏览器 CLI（Playwright）
│   ├── src/         # CLI + 服务器 + 命令
│   │   ├── commands.ts  # 命令注册表（唯一真实来源）
│   │   └── snapshot.ts  # SNAPSHOT_FLAGS 元数据数组
│   ├── test/        # 集成测试 + 测试固件
│   └── dist/        # 编译后的二进制文件
├── scripts/         # 构建 + 开发工具
│   ├── gen-skill-docs.ts  # 模板 → SKILL.md 生成器
│   ├── skill-check.ts     # 健康仪表板
│   └── dev-skill.ts       # 监视模式
├── test/            # 技能验证 + 评估测试
│   ├── helpers/     # skill-parser.ts, session-runner.ts, llm-judge.ts, eval-store.ts
│   ├── fixtures/    # 基准真值 JSON、植入错误固件、评估基线
│   ├── skill-validation.test.ts  # 第1层：静态验证（免费，<1秒）
│   ├── gen-skill-docs.test.ts    # 第1层：生成器质量（免费，<1秒）
│   ├── skill-llm-eval.test.ts   # 第3层：LLM 作为评判者（约 $0.15/次）
│   └── skill-e2e-*.test.ts       # 第2层：通过 claude -p 进行 E2E（约 $3.85/次，按类别拆分）
├── qa-only/         # /qa-only 技能（仅报告的 QA，无修复）
├── plan-design-review/  # /plan-design-review 技能（仅报告的设计审计）
├── design-review/    # /design-review 技能（设计审计 + 修复循环）
├── ship/            # 发布工作流技能
├── review/          # PR 审查技能
├── plan-ceo-review/ # /plan-ceo-review 技能
├── plan-eng-review/ # /plan-eng-review 技能
├── autoplan/        # /autoplan 技能（自动审查流水线：CEO → 设计 → 工程）
├── benchmark/       # /benchmark 技能（性能回归检测）
├── canary/          # /canary 技能（部署后监控循环）
├── codex/           # /codex 技能（通过 OpenAI Codex CLI 进行多 AI 第二意见）
├── land-and-deploy/ # /land-and-deploy 技能（合并 → 部署 → 金丝雀验证）
├── office-hours/    # /office-hours 技能（创业诊断 + 构建者头脑风暴）
├── investigate/     # /investigate 技能（系统性根本原因调试）
├── retro/           # 回顾技能（包括 /retro 全局跨项目模式）
├── bin/             # 独立脚本（openclaw-global-discover 用于跨工具会话发现）
├── document-release/ # /document-release 技能（发布后文档更新）
├── cso/             # /cso 技能（OWASP Top 10 + STRIDE 安全审计）
├── design-consultation/ # /design-consultation 技能（从头构建设计系统）
├── setup-deploy/    # /setup-deploy 技能（一次性部署配置）
├── bin/             # CLI 工具（openclaw-repo-mode, openclaw-slug, openclaw-config 等）
├── setup            # 一次性设置：构建二进制 + 符号链接技能
├── SKILL.md         # 从 SKILL.md.tmpl 生成（不要直接编辑）
├── SKILL.md.tmpl    # 模板：编辑此文件，运行 gen:skill-docs
├── ETHOS.md         # 构建者哲学（煮沸湖泊，构建前先搜索）
└── package.json     # browse 的构建脚本
```

## SKILL.md 工作流

SKILL.md 文件是从 `.tmpl` 模板**生成**的。要更新文档：

1. 编辑 `.tmpl` 文件（例如 `SKILL.md.tmpl` 或 `browse/SKILL.md.tmpl`）
2. 运行 `bun run gen:skill-docs`（或 `bun run build`，它会自动执行）
3. 提交 `.tmpl` 和生成的 `.md` 文件

要添加新的 browse 命令：将其添加到 `browse/src/commands.ts` 并重新构建。
要添加快照标志：将其添加到 `browse/src/snapshot.ts` 中的 `SNAPSHOT_FLAGS` 并重新构建。

**SKILL.md 文件的合并冲突：** 永远不要通过接受任一侧来解决生成的 SKILL.md
文件上的冲突。应该：(1) 解决 `.tmpl` 模板和 `scripts/gen-skill-docs.ts`
（真实来源）上的冲突，(2) 运行 `bun run gen:skill-docs` 重新生成所有 SKILL.md 文件，
(3) 暂存重新生成的文件。接受一侧的生成输出会静默丢弃另一侧的模板更改。

## 平台无关设计

技能绝不能硬编码特定框架的命令、文件模式或目录结构。应该：

1. **读取 CLAUDE.md** 获取项目特定配置（测试命令、评估命令等）
2. **如果缺失，使用 AskUserQuestion** —— 让用户告知或让 fullstack 搜索仓库
3. **将答案持久化到 CLAUDE.md**，这样就不必再次询问

这适用于测试命令、评估命令、部署命令和任何其他项目特定行为。
项目拥有其配置；fullstack 读取它。

## 编写 SKILL 模板

SKILL.md.tmpl 文件是 **Claude 读取的提示模板**，不是 bash 脚本。
每个 bash 代码块在单独的 shell 中运行 —— 变量不会在块之间持久化。

规则：
- **使用自然语言表达逻辑和状态。** 不要使用 shell 变量在代码块之间传递状态。
  相反，告诉 Claude 要记住什么，并在散文中引用它（例如，"在步骤 0 中检测到的基础分支"）。
- **不要硬编码分支名称。** 通过 `gh pr view` 或 `gh repo view` 动态检测 `main`/`master`/等。
  对于针对 PR 的技能使用 `{{BASE_BRANCH_DETECT}}`。在散文中使用"基础分支"，
  在代码块占位符中使用 `<base>`。
- **保持 bash 块自包含。** 每个代码块应该独立工作。
  如果块需要前一步骤的上下文，在上面的散文中重述它。
- **将条件表达为英语。** 不要在 bash 中使用嵌套的 `if/elif/else`，
  而是编写编号的决策步骤："1. 如果 X，做 Y。2. 否则，做 Z。"

## 浏览器交互

当需要与浏览器交互（QA、内部测试、cookie 设置）时，使用 `/browse` 技能
或通过 `$B <command>` 直接运行 browse 二进制文件。永远不要使用
`mcp__claude-in-chrome__*` 工具 —— 它们缓慢、不可靠，而且不是本项目使用的工具。

## 供应商符号链接感知

开发 fullstack 时，`.openclaw/skills/fullstack` 可能是指向此工作目录
的符号链接（gitignored）。这意味着技能更改**立即生效** —— 非常适合快速迭代，
但在大型重构期间有风险，因为半成品的技能可能会破坏同时使用 openclaw-skills 的其他 Claude Code 会话。

**每个会话检查一次：** 运行 `ls -la .openclaw/skills/fullstack` 查看它是
符号链接还是真实副本。如果它是指向工作目录的符号链接，请注意：
- 模板更改 + `bun run gen:skill-docs` 立即影响所有 fullstack 调用
- 对 SKILL.md.tmpl 文件的破坏性更改可能会破坏并发的 fullstack 会话
- 在大型重构期间，删除符号链接（`rm .openclaw/skills/fullstack`），
  这样就会使用 `~/.openclaw/skills/fullstack/` 的全局安装

**对于计划审查：** 当审查修改技能模板或 gen-skill-docs 流水线的计划时，
考虑更改是否应该在上线前单独测试（特别是如果用户在其他窗口中积极使用 fullstack）。

## 提交风格

**始终拆分提交。** 每个提交应该是单个逻辑更改。当进行了多个更改
（例如，重命名 + 重写 + 新测试）时，在推送前将它们拆分为单独的提交。
每个提交应该独立可理解和可回滚。

良好拆分的示例：
- 重命名/移动与行为更改分开
- 测试基础设施（touchfiles、helpers）与测试实现分开
- 模板更改与生成文件重新生成分开
- 机械重构与新功能分开

当用户说"拆分提交"或"拆分并推送"时，将暂存/未暂存的更改拆分为逻辑提交并推送。

## CHANGELOG + VERSION 风格

**VERSION 和 CHANGELOG 是分支范围的。** 每个发布的功能分支都有自己的版本
升级和 CHANGELOG 条目。条目描述**此分支**添加的内容 —— 而不是 main 上已有的内容。

**何时编写 CHANGELOG 条目：**
- 在 `/ship` 时（步骤 5），而不是在开发期间或分支中期。
- 条目涵盖此分支与基础分支之间的所有提交。
- 永远不要将新工作合并到已合并到 main 的先前版本的现有 CHANGELOG 条目中。
  如果 main 有 v0.10.0.0 而你的分支添加了功能，升级到 v0.10.1.0 并创建新条目
  —— 不要编辑 v0.10.0.0 条目。

**编写前的关键问题：**
1. 我在哪个分支？此分支更改了什么？
2. 基础分支版本是否已发布？（如果是，升级并创建新条目。）
3. 此分支上是否已有条目涵盖早期工作？（如果是，用最终版本的统一条目替换它。）

CHANGELOG.md 是**给用户看的**，不是给贡献者的。像产品发布说明一样编写：

- 首先说明用户现在可以**做**什么以前不能做的事。推销功能。
- 使用通俗语言，不要用实现细节。"你现在可以..."而不是"重构了..."
- **永远不要提及 TODOS.md、内部跟踪、评估基础设施或面向贡献者的细节。**
  这些对用户是不可见的，对他们毫无意义。
- 将贡献者/内部更改放在底部的单独"面向贡献者"部分。
- 每个条目应该让人想到"哦，不错，我想试试那个。"
- 不要用行话：说"每个问题现在告诉你你在哪个项目和分支"
  而不是"通过前导解析器在技能模板中标准化 AskUserQuestion 格式。"

## AI 效率压缩

当估算或讨论工作量时，始终显示人工团队和 CC+fullstack 时间：

| 任务类型 | 人工团队 | CC+fullstack | 压缩比 |
|----------|----------|-----------|--------|
| 样板代码 / 脚手架 | 2 天 | 15 分钟 | ~100x |
| 测试编写 | 1 天 | 15 分钟 | ~50x |
| 功能实现 | 1 周 | 30 分钟 | ~30x |
| Bug 修复 + 回归测试 | 4 小时 | 15 分钟 | ~20x |
| 架构 / 设计 | 2 天 | 4 小时 | ~5x |
| 研究 / 探索 | 1 天 | 3 小时 | ~3x |

完整性是廉价的。当完整实现是"湖泊"（可实现）而不是"海洋"（多季度迁移）时，
不要推荐捷径。有关完整哲学，请参阅技能前导中的完整性原则。

## 构建前先搜索

在设计任何涉及并发、不熟悉的模式、基础设施或运行时可能有内置功能的任何解决方案之前：

1. 搜索"{runtime} {thing} built-in"
2. 搜索"{thing} best practice {current year}"
3. 查阅官方运行时/框架文档

三层知识：久经考验（第1层）、新兴流行（第2层）、第一性原理（第3层）。
最看重第3层。有关完整的构建者哲学，请参阅 ETHOS.md。

## 本地计划

贡献者可以在 `~/.openclaw-dev/plans/` 中存储长期愿景文档和设计文档。
这些仅本地存储（不检入）。审查 TODOS.md 时，检查 `plans/` 中是否有
准备好提升到 TODO 或实现的候选者。

## E2E 评估失败归责协议

当 E2E 评估在 `/ship` 或任何其他工作流期间失败时，**永远不要在没有证明的情况下
声称"与我们的更改无关"。** 这些系统有不可见的耦合 —— 前导文本更改影响代理行为，
新 helper 更改时序，重新生成的 SKILL.md 改变提示上下文。

**在将失败归因于"预先存在"之前必须：**
1. 在 main（或基础分支）上运行相同的评估，并显示它在那里也失败
2. 如果它在 main 上通过但在分支上失败 —— 这就是你的更改。追踪责任。
3. 如果无法在 main 上运行，说"未验证 —— 可能相关也可能不相关"
   并在 PR 正文中将其标记为风险

没有凭据的"预先存在"是懒惰的说法。证明它或不要说它。

## 长时间运行的任务：不要放弃

当运行评估、E2E 测试或任何长时间运行的后台任务时，**轮询直到完成**。
使用 `sleep 180 && echo "ready"` + `TaskOutput` 每 3 分钟循环一次。
永远不要切换到阻塞模式并在轮询超时时放弃。永远不要说"完成时我会收到通知"
然后停止检查 —— 保持循环直到任务完成或用户告诉你停止。

完整的 E2E 套件可能需要 30-45 分钟。那是 10-15 个轮询周期。全部执行。
在每次检查时报告进度（哪些测试通过，哪些正在运行，目前有哪些失败）。
用户希望看到运行完成，而不是以后会检查的承诺。

## 部署到活动技能

活动技能位于 `~/.openclaw/skills/fullstack/`。进行更改后：

1. 推送你的分支
2. 在技能目录中获取并重置：`cd ~/.openclaw/skills/fullstack && git fetch origin && git reset --hard origin/main`
3. 重新构建：`cd ~/.openclaw/skills/fullstack && bun run build`

或直接复制二进制文件：`cp browse/dist/browse ~/.openclaw/skills/fullstack/browse/dist/browse`
