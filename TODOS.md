# 待办事项

## 构建者理念

### 首次构建前搜索介绍

**内容：** 添加一个 `generateSearchIntro()` 函数（类似 `generateLakeIntro()`），在首次使用时介绍构建前搜索原则，并链接到博客文章。

**原因：** 煮沸湖泊有一个介绍流程，链接到文章并标记 `.completeness-intro-seen`。构建前搜索应该有相同的模式以提高可发现性。

**上下文：** 阻塞于需要链接的博客文章。当文章存在时，添加带有 `.search-intro-seen` 标记文件的介绍流程。模式参考：gen-skill-docs.ts:176 的 `generateLakeIntro()`。

**工作量：** S
**优先级：** P2
**依赖：** 关于构建前搜索的博客文章

## 浏览器

### 将 server.ts 打包到编译二进制文件中

**内容：** 完全消除 `resolveServerScript()` 回退链 — 将 server.ts 打包到编译后的 browse 二进制文件中。

**原因：** 当前的回退链（检查 cli.ts 相邻位置、检查全局安装）很脆弱，在 v0.3.2 中导致了 bug。单个编译二进制文件更简单、更可靠。

**上下文：** Bun 的 `--compile` 标志可以打包多个入口点。服务器目前通过文件路径查找在运行时解析。打包它完全消除了解析步骤。

**工作量：** M
**优先级：** P2
**依赖：** 无

### 会话（隔离的浏览器实例）

**内容：** 隔离的浏览器实例，具有独立的 cookie/存储/历史记录，可通过名称寻址。

**原因：** 支持不同用户角色的并行测试、A/B 测试验证和干净的认证状态管理。

**上下文：** 需要 Playwright 浏览器上下文隔离。每个会话获得自己的上下文，具有独立的 cookie/localStorage。是视频录制（干净的上下文生命周期）和认证保险库的先决条件。

**工作量：** L
**优先级：** P3

### 视频录制

**内容：** 将浏览器交互录制为视频（开始/停止控制）。

**原因：** QA 报告和 PR 正文中的视频证据。目前推迟是因为 `recreateContext()` 会破坏页面状态。

**上下文：** 需要会话来实现干净的上下文生命周期。Playwright 支持每个上下文的视频录制。还需要 WebM → GIF 转换以便嵌入 PR。

**工作量：** M
**优先级：** P3
**依赖：** 会话

### v20 加密格式支持

**内容：** AES-256-GCM 支持，用于未来的 Chromium cookie DB 版本（当前为 v10）。

**原因：** 未来的 Chromium 版本可能会更改加密格式。主动支持可防止损坏。

**工作量：** S
**优先级：** P3

### 状态持久化

**内容：** 将 cookie + localStorage 保存/加载到 JSON 文件，用于可重现的测试会话。

**原因：** 支持 QA 会话的"从我离开的地方继续"和可重复的认证状态。

**上下文：** handoff 功能中的 `saveState()`/`restoreState()` 辅助函数（browser-manager.ts）已经捕获 cookie + localStorage + sessionStorage + URL。在此基础上添加文件 I/O 大约 20 行。

**工作量：** S
**优先级：** P3
**依赖：** 会话

### 认证保险库

**内容：** 加密的凭证存储，通过名称引用。LLM 永远看不到密码。

**原因：** 安全性 — 目前认证凭证会流经 LLM 上下文。保险库将秘密保持在 AI 视野之外。

**工作量：** L
**优先级：** P3
**依赖：** 会话、状态持久化

### Iframe 支持

**内容：** `frame <sel>` 和 `frame main` 命令，用于跨框架交互。

**原因：** 许多 Web 应用使用 iframe（嵌入、支付表单、广告）。目前对 browse 不可见。

**工作量：** M
**优先级：** P4

### 语义定位器

**内容：** `find role/label/text/placeholder/testid` 带有附加操作。

**原因：** 比 CSS 选择器或引用编号更具弹性的元素选择。

**工作量：** M
**优先级：** P4

### 设备模拟预设

**内容：** `set device "iPhone 16 Pro"` 用于移动/平板测试。

**原因：** 响应式布局测试，无需手动调整视口大小。

**工作量：** S
**优先级：** P4

### 网络模拟/路由

**内容：** 拦截、阻止和模拟网络请求。

**原因：** 测试错误状态、加载状态和离线行为。

**工作量：** M
**优先级：** P4

### 下载处理

**内容：** 点击下载并控制路径。

**原因：** 端到端测试文件下载流程。

**工作量：** S
**优先级：** P4

### 内容安全

**内容：** `--max-output` 截断，`--allowed-domains` 过滤。

**原因：** 防止上下文窗口溢出并限制导航到安全域。

**工作量：** S
**优先级：** P4

### 流式传输（WebSocket 实时预览）

**内容：** 基于 WebSocket 的实时预览，用于配对浏览会话。

**原因：** 支持实时协作 — 人类观看 AI 浏览。

**工作量：** L
**优先级：** P4

### CDP 模式

**内容：** 通过 Chrome DevTools Protocol 连接到已运行的 Chrome/Electron 应用。

**原因：** 测试生产应用、Electron 应用和现有浏览器会话，无需启动新实例。

**工作量：** M
**优先级：** P4

### Linux/Windows cookie 解密

**内容：** GNOME Keyring / kwallet / DPAPI 支持，用于非 macOS cookie 导入。

**原因：** 跨平台 cookie 导入。目前仅支持 macOS（Keychain）。

**工作量：** L
**优先级：** P4

## 发布

### 发布日志 — /ship 运行的持久记录

**内容：** 在每次 /ship 运行结束时将结构化 JSON 条目追加到 `.openclaw/ship-log.json`（版本、日期、分支、PR URL、审查发现、Greptile 统计、完成的待办事项、测试结果）。

**原因：** /retro 没有关于发布速度的结构化数据。发布日志支持：每周 PR 趋势、审查发现率、Greptile 信号随时间变化、测试套件增长。

**上下文：** /retro 已经读取 greptile-history.md — 相同模式。Eval 持久化（eval-store.ts）显示代码库中存在 JSON 追加模式。ship 模板中约 15 行。

**工作量：** S
**优先级：** P2
**依赖：** 无


### PR 正文中的可视化验证截图

**内容：** /ship 步骤 7.5：推送后截取关键页面截图，嵌入 PR 正文。

**原因：** PR 中的可视化证据。审查者无需本地部署即可看到更改内容。

**上下文：** 阶段 3.6 的一部分。需要 S3 上传用于图片托管。

**工作量：** M
**优先级：** P2
**依赖：** /setup-fullstack-upload

## 审查

### 内联 PR 注释

**内容：** /ship 和 /review 使用 `gh api` 在特定 file:line 位置发布内联审查评论，创建拉取请求审查评论。

**原因：** 行级注释比顶级注释更具可操作性。PR 线程成为 Greptile、Claude 和人类审查者之间的逐行对话。

**上下文：** GitHub 通过 `gh api repos/$REPO/pulls/$PR/reviews` 支持内联审查评论。与阶段 3.6 可视化注释自然配对。

**工作量：** S
**优先级：** P2
**依赖：** 无

### Greptile 训练反馈导出

**内容：** 将 greptile-history.md 聚合为机器可读的 JSON 摘要，包含误报模式，可导出给 Greptile 团队用于模型改进。

**原因：** 闭合反馈循环 — Greptile 可以使用误报数据停止在你的代码库上犯同样的错误。

**上下文：** 曾是 P3 未来想法。现在 greptile-history.md 数据基础设施存在，升级为 P2。信号数据已在收集；这只是使其可导出。约 40 行。

**工作量：** S
**优先级：** P2
**依赖：** 积累足够的误报数据（10+ 条目）

### 带注释截图的可视化审查

**内容：** /review 步骤 4.5：浏览 PR 的预览部署，截取已更改页面的带注释截图，与生产环境比较，检查响应式布局，验证可访问性树。

**原因：** 可视化差异可以捕捉代码审查遗漏的布局回归。

**上下文：** 阶段 3.6 的一部分。需要 S3 上传用于图片托管。

**工作量：** M
**优先级：** P2
**依赖：** /setup-fullstack-upload

## QA

### QA 趋势跟踪

**内容：** 随时间比较 baseline.json，检测跨 QA 运行的回归。

**原因：** 发现质量趋势 — 应用是在变好还是变坏？

**上下文：** QA 已经写入结构化报告。这添加跨运行比较。

**工作量：** S
**优先级：** P2

### CI/CD QA 集成

**内容：** 将 `/qa` 作为 GitHub Action 步骤，如果健康分数下降则使 PR 失败。

**原因：** CI 中的自动化质量门。在合并前捕获回归。

**工作量：** M
**优先级：** P2

### 智能默认 QA 层级

**内容：** 几次运行后，检查 index.md 获取用户通常选择的层级，跳过 AskUserQuestion。

**原因：** 减少重复用户的摩擦。

**工作量：** S
**优先级：** P2

### 可访问性审计模式

**内容：** `--a11y` 标志用于专注的可访问性测试。

**原因：** 超越一般 QA 检查清单的专门可访问性测试。

**工作量：** S
**优先级：** P3

### 非 GitHub 提供商的 CI/CD 生成

**内容：** 扩展 CI/CD 引导以生成 GitLab CI（`.gitlab-ci.yml`）、CircleCI（`.circleci/config.yml`）和 Bitrise 流水线。

**原因：** 并非所有项目都使用 GitHub Actions。通用 CI/CD 引导将使测试引导适用于所有人。

**上下文：** v1 仅发布 GitHub Actions。检测逻辑已经检查 `.gitlab-ci.yml`、`.circleci/`、`bitrise.yml` 并跳过并附带信息说明。每个提供商在 `generateTestBootstrap()` 中需要约 20 行模板文本。

**工作量：** M
**优先级：** P3
**依赖：** 测试引导（已发布）

### 自动升级弱测试（★）为强测试（★★★）

**内容：** 当步骤 3.4 覆盖审计识别出现有的 ★ 级测试（冒烟/简单断言）时，生成测试边缘情况和错误路径的改进版本。

**原因：** 许多代码库有技术上存在但不捕获真正 bug 的测试 — `expect(component).toBeDefined()` 不是在测试行为。升级这些可以弥合"有测试"和"有好测试"之间的差距。

**上下文：** 需要测试覆盖审计的质量评分标准。修改现有测试文件比创建新文件风险更大 — 需要仔细比较以确保升级后的测试仍然通过。考虑创建伴随测试文件而不是修改原始文件。

**工作量：** M
**优先级：** P3
**依赖：** 测试质量评分（已发布）

## 回顾

### 部署健康跟踪（retro + browse）

**内容：** 截取生产状态截图，检查性能指标（页面加载时间），统计关键页面的控制台错误，跟踪回顾窗口内的趋势。

**原因：** 回顾应该包括代码指标之外的生产健康状态。

**上下文：** 需要 browse 集成。截图 + 指标输入到回顾输出。

**工作量：** L
**优先级：** P3
**依赖：** Browse 会话

## 基础设施

### /setup-fullstack-upload 技能（S3 存储桶）

**内容：** 配置 S3 存储桶用于图片托管。可视化 PR 注释的一次性设置。

**原因：** /ship 和 /review 中可视化 PR 注释的先决条件。

**工作量：** M
**优先级：** P2

### fullstack-upload 辅助工具

**内容：** `browse/bin/fullstack-upload` — 上传文件到 S3，返回公开 URL。

**原因：** 所有需要在 PR 中嵌入图片的技能的共享工具。

**工作量：** S
**优先级：** P2
**依赖：** /setup-fullstack-upload

### WebM 转 GIF 转换

**内容：** 基于 ffmpeg 的 WebM → GIF 转换，用于 PR 中的视频证据。

**原因：** GitHub PR 正文渲染 GIF 但不渲染 WebM。视频录制证据需要。

**工作量：** S
**优先级：** P3
**依赖：** 视频录制


### GitHub Actions eval 上传

**内容：** 在 CI 中运行 eval 套件，上传结果 JSON 作为工件，在 PR 上发布摘要评论。

**原因：** CI 集成在合并前捕获质量回归，并提供每个 PR 的持久 eval 记录。

**上下文：** 需要 CI secrets 中的 `ANTHROPIC_API_KEY`。成本约 $4/次运行。Eval 持久化系统（v0.3.6）将 JSON 写入 `~/.openclaw-dev/evals/` — CI 将作为 GitHub Actions 工件上传并使用 `eval:compare` 发布增量评论。

**工作量：** M
**优先级：** P2
**依赖：** Eval 持久化（已在 v0.3.6 发布）

### E2E 模型固定 — 已发布

~~**内容：** 将 E2E 测试固定到 claude-sonnet-4-6 以提高成本效率，为不稳定的 LLM 响应添加 retry:2。~~

已发布：默认模型更改为 Sonnet 用于结构测试（约 30 个），Opus 保留用于质量测试（约 10 个）。添加了 `--retry 2`。`EVALS_MODEL` 环境变量用于覆盖。添加了 `test:e2e:fast` 层级。添加了速率限制遥测（first_response_ms、max_inter_turn_ms）和 wall_clock_ms 跟踪到 eval-store。

### Eval Web 仪表板

**内容：** `bun run eval:dashboard` 提供本地 HTML 图表：成本趋势、检测率、通过/失败历史。

**原因：** 可视化图表比 CLI 工具更适合发现趋势。

**上下文：** 读取 `~/.openclaw-dev/evals/*.json`。约 200 行 HTML + 通过 Bun HTTP 服务器的 chart.js。

**工作量：** M
**优先级：** P3
**依赖：** Eval 持久化（已在 v0.3.6 发布）

### CI/CD QA 质量门

**内容：** 将 `/qa` 作为 GitHub Action 步骤运行，如果健康分数低于阈值则使 PR 失败。

**原因：** 自动化质量门在合并前捕获回归。目前 QA 是手动的 — CI 集成使其成为标准工作流的一部分。

**上下文：** 需要 CI 中可用的无头 browse 二进制文件。`/qa` 技能已经生成带有健康分数的 `baseline.json` — CI 步骤将与主分支基线比较并在分数下降时失败。由于 `/qa` 使用 Claude，需要在 CI secrets 中添加 `ANTHROPIC_API_KEY`。

**工作量：** M
**优先级：** P2
**依赖：** 无

### 跨平台 URL 打开辅助工具

**内容：** `fullstack-open-url` 辅助脚本 — 检测平台，使用 `open`（macOS）或 `xdg-open`（Linux）。

**原因：** 首次完整性原则介绍使用 macOS `open` 启动文章。如果 fullstack 支持 Linux，这会静默失败。

**工作量：** S（人工：约 30 分钟 / CC：约 2 分钟）
**优先级：** P4
**依赖：** 无

### 基于 CDP 的 DOM 变异检测用于引用过期

**内容：** 使用 Chrome DevTools Protocol `DOM.documentUpdated` / MutationObserver 事件，在 DOM 更改时主动使过期引用失效，无需显式调用 `snapshot`。

**原因：** 当前的引用过期检测（异步 count() 检查）仅在操作时捕获过期引用。CDP 变异检测会在引用过期时主动警告，完全防止 SPA 重新渲染的 5 秒超时。

**上下文：** 引用过期修复的第 1+2 部分（RefEntry 元数据 + 通过 count() 的急切验证）已发布。这是第 3 部分 — 最有雄心的部分。需要与 Playwright 并行的 CDP 会话、MutationObserver 桥接，以及仔细的性能调优以避免每次 DOM 更改的开销。

**工作量：** L
**优先级：** P3
**依赖：** 引用过期第 1+2 部分（已发布）

## 办公时间 / 设计

### 设计文档 → Supabase 团队存储同步

**内容：** 将设计文档（`*-design-*.md`）添加到 Supabase 同步流水线，与测试计划、回顾快照和 QA 报告一起。

**原因：** 大规模跨团队设计发现。本地 `~/.openclaw/projects/$SLUG/` 关键词 grep 发现现在适用于同机器用户，但 Supabase 同步使其适用于整个团队。重复的想法会浮现，每个人都能看到已探索的内容。

**上下文：** /office-hours 将设计文档写入 `~/.openclaw/projects/$SLUG/`。团队存储已经同步测试计划、回顾快照、QA 报告。设计文档遵循相同模式 — 只需添加同步适配器。

**工作量：** S
**优先级：** P2
**依赖：** `garrytan/team-supabase-store` 分支合并到主分支

### /yc-prep 技能

**内容：** 在 /office-hours 识别强信号后帮助创始人准备 YC 申请的技能。从设计文档中提取，构建 YC 申请问题的答案，进行模拟面试。

**原因：** 闭环。/office-hours 识别创始人，/yc-prep 帮助他们好好申请。设计文档已经包含 YC 申请的大部分原始材料。

**工作量：** M（人工：约 2 周 / CC：约 2 小时）
**优先级：** P2
**依赖：** office-hours 创始人发现引擎先发布

## 设计审查

### /plan-design-review + /qa-design-review + /design-consultation — 已发布

作为 v0.5.0 在主分支发布。包括 `/plan-design-review`（仅报告的设计审计）、`/qa-design-review`（审计 + 修复循环）和 `/design-consultation`（交互式 DESIGN.md 创建）。`{{DESIGN_METHODOLOGY}}` 解析器提供共享的 80 项设计审计检查清单。

### /plan-eng-review 中的设计外部意见

**内容：** 将并行的双声音模式（Codex + Claude 子代理）扩展到 /plan-eng-review 的架构审查部分。

**原因：** 设计滩头阵地（v0.11.3.0）证明跨模型共识适用于主观审查。架构审查在权衡决策中有类似的主观性。

**上下文：** 依赖于设计滩头阵地的经验教训。如果石蕊试纸评分格式证明有用，将其适配到架构维度（耦合、扩展、可逆性）。

**工作量：** S
**优先级：** P3
**依赖：** 设计外部意见已发布（v0.11.3.0）

### /qa 可视化回归检测中的外部意见

**内容：** 在 /qa 中添加 Codex 设计声音，用于在 bug 修复验证期间检测可视化回归。

**原因：** 修复 bug 时，修复可能会引入代码级检查遗漏的可视化回归。Codex 可以在重新测试时标记"修复破坏了响应式布局"。

**上下文：** 依赖于 /qa 具有设计意识。目前 /qa 专注于功能测试。

**工作量：** M
**优先级：** P3
**依赖：** 设计外部意见已发布（v0.11.3.0）

## 文档发布

### 从 /ship 自动调用 /document-release — 已发布

已在 v0.8.3 发布。向 `/ship` 添加了步骤 8.5 — 创建 PR 后，`/ship` 自动读取 `document-release/SKILL.md` 并执行文档更新工作流。零摩擦文档更新。

### `{{DOC_VOICE}}` 共享解析器

**内容：** 在 gen-skill-docs.ts 中创建占位符解析器，编码 fullstack 语音指南（友好、用户导向、以利益为先）。注入到 /ship 步骤 5、/document-release 步骤 5，并从 CLAUDE.md 引用。

**原因：** DRY — 语音规则目前内联存在于 3 个地方（CLAUDE.md CHANGELOG 风格部分、/ship 步骤 5、/document-release 步骤 5）。当语音演变时，三者都会漂移。

**上下文：** 与 `{{QA_METHODOLOGY}}` 相同模式 — 共享块注入到多个模板以防止漂移。gen-skill-docs.ts 中约 20 行。

**工作量：** S
**优先级：** P2
**依赖：** 无

## 发布信心仪表板

### 智能审查相关性检测 — 部分发布

~~**内容：** 基于分支更改自动检测 4 个审查中哪些相关（如果没有 CSS/视图更改则跳过设计审查，如果仅计划则跳过代码审查）。~~

`bin/fullstack-diff-scope` 已发布 — 将差异分类为 SCOPE_FRONTEND、SCOPE_BACKEND、SCOPE_PROMPTS、SCOPE_TESTS、SCOPE_DOCS、SCOPE_CONFIG。被 design-review-lite 用于在没有前端文件更改时跳过。仪表板集成用于条件行显示是后续工作。

**剩余：** 仪表板条件行显示（当 SCOPE_FRONTEND=false 时隐藏"设计审查：尚未运行"）。扩展到工程审查（仅文档时跳过）和 CEO 审查（仅配置时跳过）。

**工作量：** S
**优先级：** P3
**依赖：** fullstack-diff-scope（已发布）


## 完整性

### 完整性指标仪表板

**内容：** 跟踪 Claude 在 fullstack 会话中选择完整选项还是捷径的频率。聚合到仪表板显示随时间变化的完整性趋势。

**原因：** 没有测量，我们无法知道完整性原则是否有效。可以发现模式（例如，某些技能仍然偏向捷径）。

**上下文：** 需要记录选择（例如，AskUserQuestion 解析时追加到 JSONL 文件）、解析并显示趋势。类似于 eval 持久化模式。

**工作量：** M（人工）/ S（CC）
**优先级：** P3
**依赖：** 煮沸湖泊已发布（v0.6.1）

## 安全与可观察性

### 按需钩子技能（/careful、/freeze、/guard）— 已发布

~~**内容：** 三个新技能，使用 Claude Code 的会话范围 PreToolUse 钩子按需添加安全护栏。~~

已在 v0.6.5 发布为 `/careful`、`/freeze`、`/guard` 和 `/unfreeze`。包括钩子触发率遥测（仅模式名称，无命令内容）和内联技能激活遥测。

### 技能使用遥测 — 已发布

~~**内容：** 跟踪哪些技能被调用、频率、来自哪个仓库。~~

已在 v0.6.5 发布。gen-skill-docs.ts 中的 TemplateContext 将技能名称烘焙到前言遥测行中。分析 CLI（`bun run analytics`）用于查询。/retro 集成显示本周使用的技能。

### /investigate 范围调试增强（以遥测为条件）

**内容：** 对 /investigate 自动冻结的六项增强，以遥测显示冻结钩子在实际调试会话中确实触发为条件。

**原因：** /investigate v0.7.1 自动冻结对正在调试模块的编辑。如果遥测显示钩子经常触发，这些增强使体验更智能。如果从未触发，问题就不是真实的，这些不值得构建。

**上下文：** 所有项目都是 `investigate/SKILL.md.tmpl` 的文本添加。无新脚本。

**项目：**
1. 堆栈跟踪自动检测冻结目录（解析最深的应用帧）
2. 冻结边界扩展（遇到边界时询问是否扩展而不是硬阻止）
3. 修复后自动解冻 + 完整测试套件运行
4. 调试工具清理（用 DEBUG-TEMP 标记，提交前移除）
5. 调试会话持久化（~/.openclaw/investigate-sessions/ — 保存调查以便重用）
6. 调试报告中的调查时间线（带时间戳的假设日志）

**工作量：** M（全部 6 项合计）
**优先级：** P3
**依赖：** 显示冻结钩子在实际 /investigate 会话中触发的遥测数据

## 已完成

### 部署流水线（v0.9.8.0）
- /land-and-deploy — 合并 PR，等待 CI/部署，金丝雀验证
- /canary — 部署后监控循环，带异常检测
- /benchmark — 性能回归检测，带 Core Web Vitals
- /setup-deploy — 一次性部署平台配置
- /review 性能与包影响检查
- E2E 模型固定（Sonnet 默认，Opus 用于质量测试）
- E2E 时间遥测（first_response_ms、max_inter_turn_ms、wall_clock_ms）
- test:e2e:fast 层级，所有 E2E 脚本 --retry 2
**完成时间：** v0.9.8.0

### 阶段 1：基础（v0.2.0）
- 重命名为 fullstack
- 重构为 monorepo 布局
- 技能符号链接设置脚本
- 带基于引用的元素选择的快照命令
- 快照测试
**完成时间：** v0.2.0

### 阶段 2：增强浏览器（v0.2.0）
- 带注释截图、快照差异、对话框处理、文件上传
- 光标交互元素、元素状态检查
- CircularBuffer、异步缓冲区刷新、健康检查
- Playwright 错误包装、useragent 修复
- 148 个集成测试
**完成时间：** v0.2.0

### 阶段 3：QA 测试代理（v0.3.0）
- /qa SKILL.md 带 6 阶段工作流、3 种模式（完整/快速/回归）
- 问题分类、严重性分类、探索检查清单
- 报告模板、健康评分标准、框架检测
- wait/console/cookie-import 命令、find-browse 二进制
**完成时间：** v0.3.0

### 阶段 3.5：浏览器 Cookie 导入（v0.3.x）
- cookie-import-browser 命令（Chromium cookie DB 解密）
- Cookie 选择器 Web UI、/setup-browser-cookies 技能
- 18 个单元测试、浏览器注册表（Comet、Chrome、Arc、Brave、Edge）
**完成时间：** v0.3.1

### E2E 测试成本跟踪
- 跟踪累计 API 支出，超过阈值时警告
**完成时间：** v0.3.6

### 自动升级模式 + 智能更新检查
- 配置 CLI（`bin/fullstack-config`）、通过 `~/.openclaw/config.yaml` 自动升级、12 小时缓存 TTL、指数退避贪睡（24h→48h→1周）、"不再询问"选项、升级时同步供应商副本
**完成时间：** v0.3.8
