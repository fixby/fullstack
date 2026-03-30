# 架构

本文档解释 openclaw-skills **为什么**这样构建。有关设置和命令，请参阅 CLAUDE.md。
有关贡献，请参阅 CONTRIBUTING.md。

## 核心思想

openclaw-skills 为 Claude Code 提供持久浏览器和一组有主见的工作流技能。
浏览器是困难的部分 —— 其他一切都是 Markdown。

关键洞察：与浏览器交互的 AI 代理需要**亚秒级延迟**和**持久状态**。
如果每个命令都冷启动浏览器，每次工具调用要等 3-5 秒。如果浏览器在命令之间死亡，
你会丢失 cookies、标签页和登录会话。所以 openclaw-skills 运行一个长期存活的
Chromium 守护进程，CLI 通过 localhost HTTP 与之通信。

```
Claude Code                     fullstack
─────────                      ──────
                               ┌──────────────────────┐
  工具调用: $B snapshot -i      │  CLI（编译后的二进制） │
  ─────────────────────────→   │  • 读取状态文件       │
                               │  • POST /command     │
                               │    到 localhost:PORT │
                               └──────────┬───────────┘
                                          │ HTTP
                               ┌──────────▼───────────┐
                               │  服务器（Bun.serve）  │
                               │  • 分发命令           │
                               │  • 与 Chromium 通信   │
                               │  • 返回纯文本         │
                               └──────────┬───────────┘
                                          │ CDP
                               ┌──────────▼───────────┐
                               │  Chromium（无头）     │
                               │  • 持久标签页         │
                               │  • cookies 保留       │
                               │  • 30分钟空闲超时     │
                               └───────────────────────┘
```

第一次调用启动所有内容（~3秒）。之后的每次调用：~100-200ms。

## 为什么选择 Bun

Node.js 可以工作。Bun 在这里更好，原因有三：

1. **编译后的二进制文件。** `bun build --compile` 产生单个 ~58MB 可执行文件。
   运行时没有 `node_modules`，没有 `npx`，没有 PATH 配置。二进制文件直接运行。
   这很重要，因为 openclaw-skills 安装到 `~/.claude/skills/`，用户不期望在那里管理 Node.js 项目。

2. **原生 SQLite。** Cookie 解密直接读取 Chromium 的 SQLite cookie 数据库。
   Bun 内置 `new Database()` —— 没有 `better-sqlite3`，没有原生插件编译，没有 gyp。
   少一件在不同机器上可能出问题的事。

3. **原生 TypeScript。** 服务器在开发期间作为 `bun run server.ts` 运行。
   没有编译步骤，没有 `ts-node`，没有要调试的 source maps。编译后的二进制用于部署；
   源文件用于开发。

4. **内置 HTTP 服务器。** `Bun.serve()` 快速、简单，不需要 Express 或 Fastify。
   服务器总共处理约 10 个路由。框架会是开销。

瓶颈总是 Chromium，不是 CLI 或服务器。Bun 的启动速度（编译后的二进制 ~1ms
vs Node ~100ms）很好，但不是我们选择它的原因。编译后的二进制和原生 SQLite 才是。

## 守护进程模型

### 为什么不每个命令启动一个浏览器？

Playwright 可以在 ~2-3 秒内启动 Chromium。对于单次截图，这没问题。
对于有 20+ 命令的 QA 会话，这是 40+ 秒的浏览器启动开销。更糟的是：
你在命令之间丢失所有状态。Cookies、localStorage、登录会话、打开的标签页 —— 全没了。

守护进程模型意味着：

- **持久状态。** 登录一次，保持登录。打开标签页，它保持打开。localStorage 在命令间持久化。
- **亚秒级命令。** 第一次调用后，每个命令只是一个 HTTP POST。~100-200ms 往返包括 Chromium 的工作。
- **自动生命周期。** 服务器首次使用时自动启动，空闲 30 分钟后自动关闭。无需进程管理。

### 状态文件

服务器写入 `.openclaw/browse.json`（通过 tmp + rename 原子写入，模式 0o600）：

```json
{ "pid": 12345, "port": 34567, "token": "uuid-v4", "startedAt": "...", "binaryVersion": "abc123" }
```

CLI 读取此文件以找到服务器。如果文件缺失、过时或 PID 已死，CLI 生成新服务器。

### 端口选择

10000-60000 之间的随机端口（冲突时最多重试 5 次）。这意味着 10 个 Conductor 工作区
可以各自运行自己的 browse 守护进程，零配置和零端口冲突。旧方法（扫描 9400-9409）
在多工作区设置中经常出问题。

### 版本自动重启

构建将 `git rev-parse HEAD` 写入 `browse/dist/.version`。在每次 CLI 调用时，
如果二进制的版本与运行服务器的 `binaryVersion` 不匹配，CLI 会杀死旧服务器并启动新的。
这完全防止了"过时二进制"类的 bug —— 重新构建二进制，下一个命令自动获取它。

## 安全模型

### 仅限本地

HTTP 服务器绑定到 `localhost`，不是 `0.0.0.0`。无法从网络访问。

### Bearer 令牌认证

每个服务器会话生成随机 UUID 令牌，以模式 0o600（仅所有者可读）写入状态文件。
每个 HTTP 请求必须包含 `Authorization: Bearer <token>`。如果令牌不匹配，服务器返回 401。

这防止同一机器上的其他进程与你的 browse 服务器通信。Cookie 选择器 UI（`/cookie-picker`）
和健康检查（`/health`）豁免 —— 它们仅限本地且不执行命令。

### Cookie 安全

Cookies 是 openclaw-skills 处理的最敏感数据。设计：

1. **钥匙串访问需要用户批准。** 每个浏览器的首次 cookie 导入触发 macOS 钥匙串对话框。
   用户必须点击"允许"或"始终允许"。openclaw-skills 从不静默访问凭据。

2. **解密在进程内发生。** Cookie 值在内存中解密（PBKDF2 + AES-128-CBC），
   加载到 Playwright 上下文，从不以明文写入磁盘。Cookie 选择器 UI 从不显示 cookie 值
   —— 只有域名和计数。

3. **数据库是只读的。** openclaw-skills 将 Chromium cookie DB 复制到临时文件
   （避免与运行中浏览器的 SQLite 锁冲突）并以只读方式打开。它从不修改你真实浏览器的 cookie 数据库。

4. **密钥缓存是每次会话的。** 钥匙串密码 + 派生的 AES 密钥在服务器生命周期内缓存在内存中。
   当服务器关闭（空闲超时或显式停止）时，缓存消失。

5. **日志中没有 cookie 值。** 控制台、网络和对话框日志从不包含 cookie 值。
   `cookies` 命令输出 cookie 元数据（域名、名称、过期时间）但值被截断。

### Shell 注入防护

浏览器注册表（Comet、Chrome、Arc、Brave、Edge）是硬编码的。数据库路径从已知常量构造，
从不从用户输入构造。钥匙串访问使用带有显式参数数组的 `Bun.spawn()`，不是 shell 字符串插值。

## 引用系统

引用（`@e1`、`@e2`、`@c1`）是代理寻址页面元素的方式，无需编写 CSS 选择器或 XPath。

### 工作原理

```
1. 代理运行: $B snapshot -i
2. 服务器调用 Playwright 的 page.accessibility.snapshot()
3. 解析器遍历 ARIA 树，分配顺序引用: @e1, @e2, @e3...
4. 对于每个引用，构建 Playwright Locator: getByRole(role, { name }).nth(index)
5. 在 BrowserManager 实例上存储 Map<string, RefEntry>（role + name + Locator）
6. 将带注释的树作为纯文本返回

稍后:
7. 代理运行: $B click @e3
8. 服务器解析 @e3 → Locator → locator.click()
```

### 为什么用 Locators，不是 DOM 变异

显而易见的方法是将 `data-ref="@e1"` 属性注入 DOM。这在以下情况下会失败：

- **CSP（内容安全策略）。** 许多生产站点阻止来自脚本的 DOM 修改。
- **React/Vue/Svelte 水合。** 框架协调可能剥离注入的属性。
- **Shadow DOM。** 无法从外部进入 shadow roots。

Playwright Locators 在 DOM 外部。它们使用可访问性树（Chromium 内部维护）
和 `getByRole()` 查询。没有 DOM 变异，没有 CSP 问题，没有框架冲突。

### 引用生命周期

引用在导航时清除（主框架上的 `framenavigated` 事件）。这是正确的 —— 导航后，
所有定位器都过时了。代理必须再次运行 `snapshot` 以获取新鲜引用。这是设计使然：
过时的引用应该大声失败，而不是点击错误的元素。

### 引用过时检测

SPA 可以在不触发 `framenavigated` 的情况下改变 DOM（例如 React router 过渡、
标签切换、模态框打开）。这使引用过时，即使页面 URL 没有改变。为了捕获这个，
`resolveRef()` 在使用任何引用之前执行异步 `count()` 检查：

```
resolveRef(@e3) → entry = refMap.get("e3")
                → count = await entry.locator.count()
                → if count === 0: throw "引用 @e3 已过时 —— 元素不再存在。运行 'snapshot' 获取新鲜引用。"
                → if count > 0: return { locator }
```

这快速失败（~5ms 开销），而不是让 Playwright 的 30 秒操作超时在缺失元素上过期。
`RefEntry` 在 Locator 旁边存储 `role` 和 `name` 元数据，以便错误消息可以告诉代理元素是什么。

### 光标交互引用（@c）

`-C` 标志找到可点击但不在 ARIA 树中的元素 —— 用 `cursor: pointer` 样式的东西、
有 `onclick` 属性的元素或自定义 `tabindex`。这些在单独的命名空间中获得 `@c1`、`@c2` 引用。
这捕获框架呈现为 `<div>` 但实际上是按钮的自定义组件。

## 日志架构

三个环形缓冲区（每个 50,000 条目，O(1) 推入）：

```
浏览器事件 → CircularBuffer（内存中） → 异步刷新到 .openclaw/*.log
```

控制台消息、网络请求和对话框事件各有自己的缓冲区。刷新每 1 秒发生一次
—— 服务器仅追加自上次刷新以来的新条目。这意味着：

- HTTP 请求处理从不被磁盘 I/O 阻塞
- 日志在服务器崩溃后存活（最多 1 秒数据丢失）
- 内存有界（50K 条目 × 3 个缓冲区）
- 磁盘文件仅追加，可被外部工具读取

`console`、`network` 和 `dialog` 命令从内存缓冲区读取，不是磁盘。
磁盘文件用于事后调试。

## SKILL.md 模板系统

### 问题

SKILL.md 文件告诉 Claude 如何使用 browse 命令。如果文档列出不存在的标志，
或遗漏已添加的命令，代理会遇到错误。手工维护的文档总是与代码偏离。

### 解决方案

```
SKILL.md.tmpl          （人工编写的散文 + 占位符）
       ↓
gen-skill-docs.ts      （读取源代码元数据）
       ↓
SKILL.md               （已提交，自动生成的部分）
```

模板包含需要人工判断的工作流、提示和示例。占位符在构建时从源代码填充：

| 占位符 | 来源 | 生成内容 |
|--------|------|----------|
| `{{COMMAND_REFERENCE}}` | `commands.ts` | 分类命令表 |
| `{{SNAPSHOT_FLAGS}}` | `snapshot.ts` | 带示例的标志参考 |
| `{{PREAMBLE}}` | `gen-skill-docs.ts` | 启动块：更新检查、会话跟踪、贡献者模式、AskUserQuestion 格式 |
| `{{BROWSE_SETUP}}` | `gen-skill-docs.ts` | 二进制发现 + 设置说明 |
| `{{BASE_BRANCH_DETECT}}` | `gen-skill-docs.ts` | 针对 PR 的技能的动态基础分支检测（ship、review、qa、plan-ceo-review） |
| `{{QA_METHODOLOGY}}` | `gen-skill-docs.ts` | /qa 和 /qa-only 的共享 QA 方法块 |
| `{{DESIGN_METHODOLOGY}}` | `gen-skill-docs.ts` | /plan-design-review 和 /design-review 的共享设计审计方法 |
| `{{REVIEW_DASHBOARD}}` | `gen-skill-docs.ts` | /ship 预飞行的审查就绪仪表板 |
| `{{TEST_BOOTSTRAP}}` | `gen-skill-docs.ts` | /qa、/ship、/design-review 的测试框架检测、引导、CI/CD 设置 |
| `{{CODEX_PLAN_REVIEW}}` | `gen-skill-docs.ts` | /plan-ceo-review 和 /plan-eng-review 的可选跨模型计划审查（Codex 或 Claude 子代理回退） |

这在结构上是健全的 —— 如果命令存在于代码中，它会出现在文档中。如果不存在，它就不能出现。

### 前导

每个技能以 `{{PREAMBLE}}` 块开始，在技能自己的逻辑之前运行。
它在单个 bash 命令中处理四件事：

1. **更新检查** —— 调用 `openclaw-update-check`，报告是否有升级可用。
2. **会话跟踪** —— 触摸 `~/.openclaw/sessions/$PPID` 并计算活动会话（最近 2 小时内修改的文件）。
   当 3+ 个会话运行时，所有技能进入"ELI16 模式" —— 每个问题重新建立用户上下文，因为他们正在处理多个窗口。
3. **AskUserQuestion 格式** —— 通用格式：上下文、问题、`RECOMMENDATION: Choose X because ___`、字母选项。所有技能保持一致。
4. **构建前先搜索** —— 在构建基础设施或不熟悉的模式之前，先搜索。三层知识：久经考验（第1层）、新兴流行（第2层）、第一性原理（第3层）。
   当第一性原理推理揭示传统智慧是错误的时，代理命名"尤里卡时刻"并记录它。有关完整的构建者哲学，请参阅 `ETHOS.md`。

### 为什么提交，而不是运行时生成？

三个原因：

1. **Claude 在技能加载时读取 SKILL.md。** 用户调用 `/browse` 时没有构建步骤。文件必须已存在且正确。
2. **CI 可以验证新鲜度。** `gen:skill-docs --dry-run` + `git diff --exit-code` 在合并前捕获过时文档。
3. **Git blame 有效。** 你可以看到命令何时添加以及在哪个提交中。

### 模板测试层级

| 层级 | 内容 | 成本 | 速度 |
|------|------|------|------|
| 1 — 静态验证 | 解析 SKILL.md 中的每个 `$B` 命令，根据注册表验证 | 免费 | <2秒 |
| 2 — 通过 `claude -p` 进行 E2E | 生成真实 Claude 会话，运行每个技能，检查错误 | ~$3.85 | ~20分钟 |
| 3 — LLM 作为评判者 | Sonnet 在清晰度/完整性/可操作性上对文档评分 | ~$0.15 | ~30秒 |

第1层在每次 `bun test` 时运行。第2层+第3层由 `EVALS=1` 控制。想法是：
免费捕获 95% 的问题，仅在判断时使用 LLM。

## 命令分发

命令按副作用分类：

- **READ**（text、html、links、console、cookies、...）：无变更。安全重试。返回页面状态。
- **WRITE**（goto、click、fill、press、...）：改变页面状态。非幂等。
- **META**（snapshot、screenshot、tabs、chain、...）：不适合读/写的服务器级操作。

这不仅是组织性的。服务器用它进行分发：

```typescript
if (READ_COMMANDS.has(cmd))  → handleReadCommand(cmd, args, bm)
if (WRITE_COMMANDS.has(cmd)) → handleWriteCommand(cmd, args, bm)
if (META_COMMANDS.has(cmd))  → handleMetaCommand(cmd, args, bm, shutdown)
```

`help` 命令返回所有三个集合，以便代理可以自发现可用命令。

## 错误哲学

错误是给 AI 代理的，不是给人类的。每个错误消息必须可操作：

- "Element not found" → "元素未找到或不可交互。运行 `snapshot -i` 查看可用元素。"
- "Selector matched multiple elements" → "选择器匹配多个元素。改用 `snapshot` 中的 @refs。"
- Timeout → "30秒后导航超时。页面可能很慢或 URL 可能错误。"

Playwright 的原生错误通过 `wrapError()` 重写，以剥离内部堆栈跟踪并添加指导。
代理应该能够读取错误并知道下一步做什么，无需人工干预。

### 崩溃恢复

服务器不尝试自我修复。如果 Chromium 崩溃（`browser.on('disconnected')`），
服务器立即退出。CLI 在下一个命令时检测到死服务器并自动重启。
这比尝试重新连接到半死的浏览器进程更简单可靠。

## E2E 测试基础设施

### 会话运行器（`test/helpers/session-runner.ts`）

E2E 测试将 `claude -p` 作为完全独立的子进程生成 —— 不是通过 Agent SDK，
它无法在 Claude Code 会话内嵌套。运行器：

1. 将提示写入临时文件（避免 shell 转义问题）
2. 生成 `sh -c 'cat prompt | claude -p --output-format stream-json --verbose'`
3. 从 stdout 流式传输 NDJSON 以获取实时进度
4. 与可配置超时竞争
5. 将完整 NDJSON 转录解析为结构化结果

`parseNDJSON()` 函数是纯的 —— 无 I/O，无副作用 —— 使其可独立测试。

### 可观察性数据流

```
  skill-e2e-*.test.ts
        │
        │ 生成 runId，传递 testName + runId 给每次调用
        │
  ┌─────┼──────────────────────────────┐
  │     │                              │
  │  runSkillTest()              evalCollector
  │  (session-runner.ts)         (eval-store.ts)
  │     │                              │
  │  每次工具调用:               每次 addTest():
  │  ┌──┼──────────┐              savePartial()
  │  │  │          │                   │
  │  ▼  ▼          ▼                   ▼
  │ [HB] [PL]    [NJ]          _partial-e2e.json
  │  │    │        │             （原子覆盖）
  │  │    │        │
  │  ▼    ▼        ▼
  │ e2e-  prog-  {name}
  │ live  ress   .ndjson
  │ .json .log
  │
  │  失败时:
  │  {name}-failure.json
  │
  │  所有文件在 ~/.openclaw-dev/
  运行目录: e2e-runs/{runId}/
  │
  │         eval-watch.ts
  │              │
  │        ┌─────┴─────┐
  │     读取 HB     读取 partial
  │        └─────┬─────┘
  │              ▼
  │        渲染仪表板
  │        （过时 >10分钟? 警告）
```

**分离所有权：** session-runner 拥有心跳（当前测试状态），eval-store 拥有部分结果
（已完成测试状态）。观察者读取两者。两个组件都不知道对方 —— 它们仅通过文件系统共享数据。

**一切非致命：** 所有可观察性 I/O 包装在 try/catch 中。写入失败从不导致测试失败。
测试本身是真实来源；可观察性是尽力而为。

**机器可读诊断：** 每个测试结果包括 `exit_reason`（success、timeout、error_max_turns、
error_api、exit_code_N）、`timeout_at_turn` 和 `last_tool_call`。这启用 `jq` 查询如：
```bash
jq '.tests[] | select(.exit_reason == "timeout") | .last_tool_call' ~/.openclaw-dev/evals/_partial-e2e.json
```

### 评估持久化（`test/helpers/eval-store.ts`）

`EvalCollector` 累积测试结果并以两种方式写入：

1. **增量：** `savePartial()` 在每个测试后写入 `_partial-e2e.json`（原子：写入 `.tmp`，`fs.renameSync`）。在终止后存活。
2. **最终：** `finalize()` 写入带时间戳的评估文件（例如 `e2e-20260314-143022.json`）。部分文件从不清理 —— 它与最终文件一起持久化以供可观察。

`eval:compare` 比较两次评估运行。`eval:summary` 汇总 `~/.openclaw-dev/evals/` 中所有运行的统计数据。

### 测试层级

| 层级 | 内容 | 成本 | 速度 |
|------|------|------|------|
| 1 — 静态验证 | 解析 `$B` 命令，根据注册表验证，可观察性单元测试 | 免费 | <5秒 |
| 2 — 通过 `claude -p` 进行 E2E | 生成真实 Claude 会话，运行每个技能，扫描错误 | ~$3.85 | ~20分钟 |
| 3 — LLM 作为评判者 | Sonnet 在清晰度/完整性/可操作性上对文档评分 | ~$0.15 | ~30秒 |

第1层在每次 `bun test` 时运行。第2层+第3层由 `EVALS=1` 控制。想法：
免费捕获 95% 的问题，仅在判断和集成测试时使用 LLM。

## 故意没有的东西

- **没有 WebSocket 流。** HTTP 请求/响应更简单，可用 curl 调试，足够快。流式传输会增加复杂性，收益有限。
- **没有 MCP 协议。** MCP 每个请求添加 JSON 模式开销，需要持久连接。纯 HTTP + 纯文本输出在令牌上更轻，更容易调试。
- **没有多用户支持。** 每个工作区一个服务器，一个用户。令牌认证是纵深防御，不是多租户。
- **没有 Windows/Linux cookie 解密。** macOS 钥匙串是唯一支持的凭据存储。Linux（GNOME Keyring/kwallet）和 Windows（DPAPI）架构上可行但未实现。
- **没有 iframe 支持。** Playwright 可以处理 iframe，但引用系统尚未跨越帧边界。这是最常请求的缺失功能。
