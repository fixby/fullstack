# Browser — 技术细节

本文档介绍 openclaw-skills 无头浏览器的命令参考和内部原理。

## 命令参考

| 分类 | 命令 | 用途 |
|------|------|------|
| 导航 | `goto`, `back`, `forward`, `reload`, `url` | 跳转到页面 |
| 读取 | `text`, `html`, `links`, `forms`, `accessibility` | 提取内容 |
| 快照 | `snapshot [-i] [-c] [-d N] [-s sel] [-D] [-a] [-o] [-C]` | 获取引用、差异、注释 |
| 交互 | `click`, `fill`, `select`, `hover`, `type`, `press`, `scroll`, `wait`, `viewport`, `upload` | 使用页面 |
| 检查 | `js`, `eval`, `css`, `attrs`, `is`, `console`, `network`, `dialog`, `cookies`, `storage`, `perf` | 调试和验证 |
| 可视化 | `screenshot [--viewport] [--clip x,y,w,h] [sel\|@ref] [path]`, `pdf`, `responsive` | 查看 Claude 看到的内容 |
| 比较 | `diff <url1> <url2>` | 发现环境之间的差异 |
| 对话框 | `dialog-accept [text]`, `dialog-dismiss` | 控制 alert/confirm/prompt 处理 |
| 标签页 | `tabs`, `tab`, `newtab`, `closetab` | 多页面工作流 |
| Cookies | `cookie-import`, `cookie-import-browser` | 从文件或真实浏览器导入 cookies |
| 多步骤 | `chain`（从 stdin 读取 JSON） | 一次调用执行批量命令 |
| 交接 | `handoff [reason]`, `resume` | 切换到可见 Chrome 供用户接管 |

所有选择器参数接受 CSS 选择器、`snapshot` 后的 `@e` 引用或 `snapshot -C` 后的 `@c` 引用。总共 50+ 命令加上 cookie 导入。

## 工作原理

openclaw-skills 的浏览器是一个编译后的 CLI 二进制文件，通过 HTTP 与持久的本地 Chromium 守护进程通信。CLI 是一个瘦客户端 —— 它读取状态文件，发送命令，并将响应打印到 stdout。服务器通过 [Playwright](https://playwright.dev/) 完成真正的工作。

```
┌─────────────────────────────────────────────────────────────────┐
│  Claude Code                                                    │
│                                                                 │
│  "browse goto https://staging.myapp.com"                        │
│       │                                                         │
│       ▼                                                         │
│  ┌──────────┐    HTTP POST     ┌──────────────┐                 │
│  │ browse   │ ──────────────── │ Bun HTTP     │                 │
│  │ CLI      │  localhost:rand  │ server       │                 │
│  │          │  Bearer token    │              │                 │
│  │ compiled │ ◄──────────────  │  Playwright  │──── Chromium    │
│  │ binary   │  plain text      │  API calls   │    (headless)   │
│  └──────────┘                  └──────────────┘                 │
│   ~1ms startup                  persistent daemon               │
│                                 auto-starts on first call       │
│                                 auto-stops after 30 min idle    │
└─────────────────────────────────────────────────────────────────┘
```

### 生命周期

1. **首次调用**：CLI 检查 `.openclaw/browse.json`（在项目根目录）寻找运行中的服务器。未找到 —— 它在后台生成 `bun run browse/src/server.ts`。服务器通过 Playwright 启动无头 Chromium，选择随机端口（10000-60000），生成 bearer 令牌，写入状态文件，并开始接受 HTTP 请求。这需要约 3 秒。

2. **后续调用**：CLI 读取状态文件，发送带有 bearer 令牌的 HTTP POST，打印响应。约 100-200ms 往返。

3. **空闲关闭**：30 分钟无命令后，服务器关闭并清理状态文件。下次调用自动重启它。

4. **崩溃恢复**：如果 Chromium 崩溃，服务器立即退出（不自我修复 —— 不要隐藏失败）。CLI 在下次调用时检测到死服务器并启动新的。

### 关键组件

```
browse/
├── src/
│   ├── cli.ts              # 轻量客户端 — 读取状态文件，发送 HTTP，打印响应
│   ├── server.ts           # Bun.serve HTTP 服务器 — 将命令路由到 Playwright
│   ├── browser-manager.ts  # Chromium 生命周期 — 启动、标签页、引用映射、崩溃处理
│   ├── snapshot.ts         # 无障碍树 → @ref 分配 → Locator 映射 + 差异对比/标注/-C
│   ├── read-commands.ts    # 非变更命令（text, html, links, js, css, is, dialog 等）
│   ├── write-commands.ts   # 变更命令（click, fill, select, upload, dialog-accept 等）
│   ├── meta-commands.ts    # 服务器管理、chain、diff、snapshot 路由
│   ├── cookie-import-browser.ts  # 解密 + 从真实 Chromium 浏览器导入 cookies
│   ├── cookie-picker-routes.ts   # 交互式 cookie 选择器 UI 的 HTTP 路由
│   ├── cookie-picker-ui.ts       # cookie 选择器的自包含 HTML/CSS/JS
│   └── buffers.ts          # CircularBuffer<T> + console/network/dialog 捕获
├── test/                   # 集成测试 + HTML fixtures
└── dist/
    └── browse              # 编译后的二进制文件（~58MB，Bun --compile）
```

### 快照系统

浏览器的核心创新是基于引用的元素选择，构建在 Playwright 的无障碍树 API 之上：

1. `page.locator(scope).ariaSnapshot()` 返回类似 YAML 的无障碍树
2. 快照解析器为每个元素分配引用（`@e1`、`@e2`、...）
3. 对于每个引用，它构建一个 Playwright `Locator`（使用 `getByRole` + nth-child）
4. 引用到 Locator 的映射存储在 `BrowserManager` 上
5. 后续命令如 `click @e3` 查找 Locator 并调用 `locator.click()`

无 DOM 变更。无注入脚本。仅使用 Playwright 的原生无障碍 API。

**引用过期检测：** SPA 可以在不导航的情况下变更 DOM（React router、标签切换、模态框）。当这种情况发生时，从之前 `snapshot` 收集的引用可能指向不再存在的元素。为处理这种情况，`resolveRef()` 在使用任何引用之前运行异步 `count()` 检查 —— 如果元素计数为 0，它会立即抛出异常，告诉代理重新运行 `snapshot`。这会快速失败（~5ms），而不是等待 Playwright 的 30 秒操作超时。

**扩展快照功能：**
- `--diff` (`-D`)：将每个快照存储为基线。下次调用 `-D` 时，返回统一差异对比，显示变更内容。用于验证操作（click、fill 等）是否真正生效。
- `--annotate` (`-a`)：在每个引用的边界框处注入临时覆盖 div，拍摄带有可见引用标签的截图，然后移除覆盖层。使用 `-o <path>` 控制输出路径。
- `--cursor-interactive` (`-C`)：使用 `page.evaluate` 扫描非 ARIA 交互元素（带有 `cursor:pointer`、`onclick`、`tabindex>=0` 的 div）。分配 `@c1`、`@c2`... 引用，使用确定性的 `nth-child` CSS 选择器。这些是 ARIA 树遗漏但用户仍可点击的元素。

### 截图模式

`screenshot` 命令支持四种模式：

| 模式 | 语法 | Playwright API |
|------|--------|----------------|
| 整页（默认） | `screenshot [path]` | `page.screenshot({ fullPage: true })` |
| 仅视口 | `screenshot --viewport [path]` | `page.screenshot({ fullPage: false })` |
| 元素裁剪 | `screenshot "#sel" [path]` 或 `screenshot @e3 [path]` | `locator.screenshot()` |
| 区域裁剪 | `screenshot --clip x,y,w,h [path]` | `page.screenshot({ clip })` |

元素裁剪接受 CSS 选择器（`.class`、`#id`、`[attr]`）或来自 `snapshot` 的 `@e`/`@c` 引用。自动检测：`@e`/`@c` 前缀 = 引用，`.`/`#`/`[` 前缀 = CSS 选择器，`--` 前缀 = 标志，其他 = 输出路径。

互斥关系：`--clip` + 选择器 和 `--viewport` + `--clip` 都会抛出错误。未知标志（如 `--bogus`）也会抛出错误。

### 认证

每个服务器会话生成一个随机 UUID 作为 bearer token。该 token 以 chmod 600 权限写入状态文件（`.openclaw/browse.json`）。每个 HTTP 请求必须包含 `Authorization: Bearer <token>`。这可以防止机器上的其他进程控制浏览器。

### 控制台、网络和对话框捕获

服务器挂钩到 Playwright 的 `page.on('console')`、`page.on('response')` 和 `page.on('dialog')` 事件。所有条目保存在 O(1) 循环缓冲区中（每个容量 50,000），并通过 `Bun.write()` 异步刷新到磁盘：

- 控制台：`.openclaw/browse-console.log`
- 网络：`.openclaw/browse-network.log`
- 对话框：`.openclaw/browse-dialog.log`

`console`、`network` 和 `dialog` 命令从内存缓冲区读取，而非磁盘。

### 用户交接

当无头浏览器无法继续时（CAPTCHA、MFA、复杂认证），`handoff` 会在完全相同的页面打开一个可见的 Chrome 窗口，保留所有 cookies、localStorage 和标签页。用户手动解决问题后，`resume` 将控制权返回给代理，并获取新的快照。

```bash
$B handoff "Stuck on CAPTCHA at login page"   # 打开可见 Chrome
# 用户解决 CAPTCHA...
$B resume                                       # 返回无头模式并获取新快照
```

浏览器在连续 3 次失败后会自动建议 `handoff`。状态在切换过程中完全保留 —— 无需重新登录。

### 对话框处理

对话框（alert、confirm、prompt）默认自动接受，以防止浏览器锁定。`dialog-accept` 和 `dialog-dismiss` 命令控制此行为。对于 prompt，`dialog-accept <text>` 提供响应文本。所有对话框都记录到对话框缓冲区，包含类型、消息和采取的操作。

### JavaScript 执行（`js` 和 `eval`）

`js` 运行单个表达式，`eval` 运行 JS 文件。两者都支持 `await` —— 包含 `await` 的表达式会自动包装在异步上下文中：

```bash
$B js "await fetch('/api/data').then(r => r.json())"  # 可行
$B js "document.title"                                  # 也可行（无需包装）
$B eval my-script.js                                    # 带 await 的文件也可行
```

对于 `eval` 文件，单行文件直接返回表达式值。多行文件在使用 `await` 时需要显式 `return`。包含 "await" 的注释不会触发包装。

### 多工作区支持

每个工作区都有独立的浏览器实例，拥有自己的 Chromium 进程、标签页、cookies 和日志。状态存储在项目根目录的 `.openclaw/` 中（通过 `git rev-parse --show-toplevel` 检测）。

| 工作区 | 状态文件 | 端口 |
|-----------|------------|------|
| `/code/project-a` | `/code/project-a/.openclaw/browse.json` | 随机（10000-60000） |
| `/code/project-b` | `/code/project-b/.openclaw/browse.json` | 随机（10000-60000） |

无端口冲突。无共享状态。每个项目完全隔离。

### 环境变量

| 变量 | 默认值 | 描述 |
|----------|---------|-------------|
| `BROWSE_PORT` | 0（随机 10000-60000） | HTTP 服务器的固定端口（调试覆盖） |
| `BROWSE_IDLE_TIMEOUT` | 1800000（30 分钟） | 空闲关闭超时（毫秒） |
| `BROWSE_STATE_FILE` | `.openclaw/browse.json` | 状态文件路径（CLI 传递给服务器） |
| `BROWSE_SERVER_SCRIPT` | 自动检测 | server.ts 的路径 |

### 性能

| 工具 | 首次调用 | 后续调用 | 每次调用的上下文开销 |
|------|-----------|-----------------|--------------------------|
| Chrome MCP | ~5s | ~2-5s | ~2000 tokens（schema + 协议） |
| Playwright MCP | ~3s | ~1-3s | ~1500 tokens（schema + 协议） |
| **openclaw-skills browse** | **~3s** | **~100-200ms** | **0 tokens**（纯文本 stdout） |

上下文开销的差异会快速累积。在 20 个命令的浏览器会话中，MCP 工具仅协议框架就消耗 30,000-40,000 tokens。openclaw-skills 消耗零。

### 为什么选择 CLI 而不是 MCP？

MCP（模型上下文协议）适用于远程服务，但对于本地浏览器自动化，它增加了纯粹的开销：

- **上下文膨胀**：每次 MCP 调用都包含完整的 JSON schema 和协议框架。一个简单的"获取页面文本"消耗的上下文 tokens 比应有的多 10 倍。
- **连接脆弱性**：持久的 WebSocket/stdio 连接会断开且无法重新连接。
- **不必要的抽象**：Claude Code 已经有 Bash 工具。一个打印到 stdout 的 CLI 是最简单的接口。

openclaw-skills 跳过了所有这些。编译后的二进制文件。纯文本输入，纯文本输出。无协议。无 schema。无连接管理。

## 致谢

浏览器自动化层构建于 Microsoft 的 [Playwright](https://playwright.dev/) 之上。Playwright 的无障碍树 API、定位器系统和无头 Chromium 管理是实现基于引用交互的基础。快照系统 —— 将 `@ref` 标签分配给无障碍树节点并将其映射回 Playwright Locators —— 完全构建在 Playwright 的原语之上。感谢 Playwright 团队构建了如此坚实的基础。

## 开发

### 前置条件

- [Bun](https://bun.sh/) v1.0+
- Playwright 的 Chromium（由 `bun install` 自动安装）

### 快速开始

```bash
bun install              # 安装依赖 + Playwright Chromium
bun test                 # 运行集成测试（~3s）
bun run dev <cmd>        # 从源码运行 CLI（无需编译）
bun run build            # 编译到 browse/dist/browse
```

### 开发模式 vs 编译二进制

开发期间，使用 `bun run dev` 而不是编译后的二进制。它直接用 Bun 运行 `browse/src/cli.ts`，无需编译步骤即可获得即时反馈：

```bash
bun run dev goto https://example.com
bun run dev text
bun run dev snapshot -i
bun run dev click @e3
```

编译后的二进制文件（`bun run build`）仅用于分发。它使用 Bun 的 `--compile` 标志在 `browse/dist/browse` 生成一个约 58MB 的可执行文件。

### 运行测试

```bash
bun test                         # 运行所有测试
bun test browse/test/commands              # 仅运行命令集成测试
bun test browse/test/snapshot              # 仅运行快照测试
bun test browse/test/cookie-import-browser # 仅运行 cookie 导入单元测试
```

测试会启动一个本地 HTTP 服务器（`browse/test/test-server.ts`），从 `browse/test/fixtures/` 提供 HTML fixtures，然后对这些页面执行 CLI 命令。共 203 个测试，分布在 3 个文件中，总耗时约 15 秒。

### 源码映射

| 文件 | 角色 |
|------|------|
| `browse/src/cli.ts` | 入口点。读取 `.openclaw/browse.json`，发送 HTTP 到服务器，打印响应。 |
| `browse/src/server.ts` | Bun HTTP 服务器。将命令路由到正确的处理器。管理空闲超时。 |
| `browse/src/browser-manager.ts` | Chromium 生命周期 —— 启动、标签页管理、引用映射、崩溃检测。 |
| `browse/src/snapshot.ts` | 解析无障碍树，分配 `@e`/`@c` 引用，构建 Locator 映射。处理 `--diff`、`--annotate`、`-C`。 |
| `browse/src/read-commands.ts` | 非变更命令：`text`、`html`、`links`、`js`、`css`、`is`、`dialog`、`forms` 等。导出 `getCleanText()`。 |
| `browse/src/write-commands.ts` | 变更命令：`goto`、`click`、`fill`、`upload`、`dialog-accept`、`useragent`（带上下文重建）等。 |
| `browse/src/meta-commands.ts` | 服务器管理、chain 路由、diff（通过 `getCleanText` 实现 DRY）、snapshot 委托。 |
| `browse/src/cookie-import-browser.ts` | 通过 macOS Keychain + PBKDF2/AES-128-CBC 解密 Chromium cookies。自动检测已安装的浏览器。 |
| `browse/src/cookie-picker-routes.ts` | `/cookie-picker/*` 的 HTTP 路由 —— 浏览器列表、域名搜索、导入、删除。 |
| `browse/src/cookie-picker-ui.ts` | 交互式 cookie 选择器的自包含 HTML 生成器（深色主题，无框架）。 |
| `browse/src/buffers.ts` | `CircularBuffer<T>`（O(1) 环形缓冲区）+ console/network/dialog 捕获，带异步磁盘刷新。 |

### 部署到活动技能

活动技能位于 `~/.openclaw/skills/fullstack/`。修改后：

1. 推送你的分支
2. 在技能目录中拉取：`cd ~/.openclaw/skills/fullstack && git pull`
3. 重新构建：`cd ~/.openclaw/skills/fullstack && bun run build`

或直接复制二进制文件：`cp browse/dist/browse ~/.openclaw/skills/fullstack/browse/dist/browse`

### 添加新命令

1. 在 `read-commands.ts`（非变更）或 `write-commands.ts`（变更）中添加处理器
2. 在 `server.ts` 中注册路由
3. 在 `browse/test/commands.test.ts` 中添加测试用例，如需要则添加 HTML fixture
4. 运行 `bun test` 验证
5. 运行 `bun run build` 编译
