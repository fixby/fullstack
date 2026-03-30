---
name: browse
version: 1.1.0
description: |
  用于 QA 测试和网站内部测试的快速无头浏览器。导航任何 URL、与元素交互、
  验证页面状态、对比操作前后的差异、拍摄带注释的截图、检查响应式布局、
  测试表单和上传、处理对话框、断言元素状态。
  每条命令约 100ms。当需要测试功能、验证部署、内部测试用户流程或
  提交带证据的 bug 时使用。当被要求"在浏览器中打开"、"测试网站"、
  "截图"或"内部测试此功能"时使用。
allowed-tools:
  - Bash
  - Read
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

# browse: QA 测试与内部测试

持久化无头 Chromium。首次调用自动启动（约3秒），之后每条命令约100ms。
状态在调用之间持久化（cookies、标签页、登录会话）。

## 设置（在任何浏览命令之前运行此检查）

```bash
_ROOT=$(git rev-parse --show-toplevel 2>/dev/null)
B=""
[ -n "$_ROOT" ] && [ -x "$_ROOT/.openclaw/skills/fullstack/browse/dist/browse" ] && B="$_ROOT/.openclaw/skills/fullstack/browse/dist/browse"
[ -z "$B" ] && B=~/.openclaw/skills/fullstack/browse/dist/browse
if [ -x "$B" ]; then
  echo "就绪：$B"
else
  echo "需要设置"
fi
```

如果 `需要设置`：
1. 告诉用户："fullstack browse 需要一次性构建（约 10 秒）。可以继续吗？" 然后停止并等待。
2. 运行：`cd <SKILL_DIR> && ./setup`
3. 如果 `bun` 未安装：`curl -fsSL https://bun.sh/install | bash`

## 核心 QA 模式

### 1. 验证页面是否正确加载
```bash
$B goto https://yourapp.com
$B text                          # 内容是否加载？
$B console                       # JS 错误？
$B network                       # 失败的请求？
$B is visible ".main-content"    # 关键元素是否存在？
```

### 2. 测试用户流程
```bash
$B goto https://app.com/login
$B snapshot -i                   # 查看所有交互元素
$B fill @e3 "user@test.com"
$B fill @e4 "password"
$B click @e5                     # 提交
$B snapshot -D                   # 差异：提交后发生了什么变化？
$B is visible ".dashboard"       # 成功状态是否存在？
```

### 3. 验证操作是否成功
```bash
$B snapshot                      # 基线
$B click @e3                     # 执行操作
$B snapshot -D                   # 统一差异显示确切的变化
```

### 4. 为 bug 报告提供视觉证据
```bash
$B snapshot -i -a -o /tmp/annotated.png   # 带标签的截图
$B screenshot /tmp/bug.png                # 普通截图
$B console                                # 错误日志
```

### 5. 查找所有可点击元素（包括非 ARIA）
```bash
$B snapshot -C                   # 查找带 cursor:pointer、onclick、tabindex 的 div
$B click @c1                     # 与它们交互
```

### 6. 断言元素状态
```bash
$B is visible ".modal"
$B is enabled "#submit-btn"
$B is disabled "#submit-btn"
$B is checked "#agree-checkbox"
$B is editable "#name-field"
$B is focused "#search-input"
$B js "document.body.textContent.includes('Success')"
```

### 7. 测试响应式布局
```bash
$B responsive /tmp/layout        # 移动端 + 平板 + 桌面截图
$B viewport 375x812              # 或设置特定视口
$B screenshot /tmp/mobile.png
```

### 8. 测试文件上传
```bash
$B upload "#file-input" /path/to/file.pdf
$B is visible ".upload-success"
```

### 9. 测试对话框
```bash
$B dialog-accept "yes"           # 设置处理器
$B click "#delete-button"        # 触发对话框
$B dialog                        # 查看出现了什么
$B snapshot -D                   # 验证删除是否发生
```

### 10. 比较环境
```bash
$B diff https://staging.app.com https://prod.app.com
```

### 11. 向用户展示截图
在 `$B screenshot`、`$B snapshot -a -o` 或 `$B responsive` 之后，始终使用 Read 工具读取输出的 PNG 文件，以便用户可以看到它们。没有这一步，截图是不可见的。

## 用户交接

当遇到无头模式无法处理的情况（CAPTCHA、复杂认证、多因素登录）时，交接给用户：

```bash
# 1. 在当前页面打开可见的 Chrome
$B handoff "卡在登录页面的 CAPTCHA"

# 2. 告诉用户发生了什么（通过 AskUserQuestion）
#    "我已经在登录页面打开了 Chrome。请解决 CAPTCHA
#     并在完成后告诉我。"

# 3. 当用户说"完成"时，重新快照并继续
$B resume
```

**何时使用交接：**
- CAPTCHA 或机器人检测
- 多因素认证（短信、认证器应用）
- 需要用户交互的 OAuth 流程
- AI 在3次尝试后仍无法处理的复杂交互

浏览器在交接过程中保留所有状态（cookies、localStorage、标签页）。
在 `resume` 之后，你会获得用户离开位置的全新快照。

## 快照标志

快照是你理解和交互页面的主要工具。

```
-i        --interactive           仅可交互元素（按钮、链接、输入框）带 @e 引用
-c        --compact               紧凑模式（无空的结构节点）
-d <N>    --depth                 限制树深度（0 = 仅根节点，默认：无限制）
-s <sel>  --selector              范围限定到 CSS 选择器
-D        --diff                  与上次快照的统一差异（首次调用存储基线）
-a        --annotate              带红色覆盖框和引用标签的标注截图
-o <path> --output                带标注截图的输出路径（默认：<temp>/browse-annotated.png）
-C        --cursor-interactive    光标可交互元素（@c 引用 — 带 pointer、onclick 的 div）
```

所有标志可以自由组合。`-o` 仅在使用 `-a` 时适用。
示例：`$B snapshot -i -a -C -o /tmp/annotated.png`

**引用编号：** @e 引用按树顺序依次分配（@e1、@e2...）。
@c 引用来自 `-C`，单独编号（@c1、@c2...）。

快照后，在任何命令中使用 @ref 作为选择器：
```bash
$B click @e3       $B fill @e4 "value"     $B hover @e1
$B html @e2        $B css @e5 "color"      $B attrs @e6
$B click @c1       # 光标可交互引用（来自 -C）
```

**输出格式：** 带缩进的无障碍树，包含 @ref ID，每行一个元素。
```
  @e1 [heading] "Welcome" [level=1]
  @e2 [textbox] "Email"
  @e3 [button] "Submit"
```

导航后引用会失效 — 在 `goto` 后重新运行 `snapshot`。

## 完整命令列表

### Navigation
| 命令 | 描述 |
|------|------|
| `back` | 历史记录后退 |
| `forward` | 历史记录前进 |
| `goto <url>` | 导航到 URL |
| `reload` | 重新加载页面 |
| `url` | 打印当前 URL |

### Reading
| 命令 | 描述 |
|------|------|
| `accessibility` | 完整 ARIA 树 |
| `forms` | 表单字段，JSON 格式 |
| `html [selector]` | 选择器的 innerHTML（未找到则抛出异常），无选择器时返回完整页面 HTML |
| `links` | 所有链接，格式为 "文本 → href" |
| `text` | 清理后的页面文本 |

### Interaction
| 命令 | 描述 |
|------|------|
| `click <sel>` | 点击元素 |
| `cookie <name>=<value>` | 在当前页面域名上设置 Cookie |
| `cookie-import <json>` | 从 JSON 文件导入 Cookie |
| `cookie-import-browser [browser] [--domain d]` | 从 Comet、Chrome、Arc、Brave 或 Edge 导入 Cookie（打开选择器，或使用 --domain 直接导入） |
| `dialog-accept [text]` | 自动接受下一个 alert/confirm/prompt。可选文本作为 prompt 响应发送 |
| `dialog-dismiss` | 自动关闭下一个对话框 |
| `fill <sel> <val>` | 填充输入框 |
| `header <name>:<value>` | 设置自定义请求头（冒号分隔，敏感值自动脱敏） |
| `hover <sel>` | 悬停元素 |
| `press <key>` | 按键 — Enter, Tab, Escape, ArrowUp/Down/Left/Right, Backspace, Delete, Home, End, PageUp, PageDown，或修饰键如 Shift+Enter |
| `scroll [sel]` | 滚动元素到可见区域，无选择器时滚动到页面底部 |
| `select <sel> <val>` | 通过值、标签或可见文本选择下拉选项 |
| `type <text>` | 在聚焦元素中输入文本 |
| `upload <sel> <file> [file2...]` | 上传文件 |
| `useragent <string>` | 设置用户代理 |
| `viewport <WxH>` | 设置视口大小 |
| `wait <sel|--networkidle|--load>` | 等待元素、网络空闲或页面加载（超时：15秒） |

### Inspection
| 命令 | 描述 |
|------|------|
| `attrs <sel|@ref>` | 元素属性，JSON 格式 |
| `console [--clear|--errors]` | 控制台消息（--errors 过滤错误/警告） |
| `cookies` | 所有 Cookie，JSON 格式 |
| `css <sel> <prop>` | 计算后的 CSS 值 |
| `dialog [--clear]` | 对话框消息 |
| `eval <file>` | 从文件执行 JavaScript 并以字符串形式返回结果（路径必须在 /tmp 或 cwd 下） |
| `is <prop> <sel>` | 状态检查 (visible/hidden/enabled/disabled/checked/editable/focused) |
| `js <expr>` | 执行 JavaScript 表达式并以字符串形式返回结果 |
| `network [--clear]` | 网络请求 |
| `perf` | 页面加载时间 |
| `storage [set k v]` | 读取所有 localStorage + sessionStorage（JSON 格式），或使用 set <key> <value> 写入 localStorage |

### Visual
| 命令 | 描述 |
|------|------|
| `diff <url1> <url2>` | 页面间文本差异 |
| `pdf [path]` | 保存为 PDF |
| `responsive [prefix]` | 移动端 (375x812)、平板 (768x1024)、桌面端 (1280x720) 截图。保存为 {prefix}-mobile.png 等 |
| `screenshot [--viewport] [--clip x,y,w,h] [selector|@ref] [path]` | 保存截图（支持通过 CSS/@ref 裁剪元素，--clip 区域，--viewport） |

### Snapshot
| 命令 | 描述 |
|------|------|
| `snapshot [flags]` | 带 @e 引用的无障碍树，用于元素选择。标志：-i 仅交互元素，-c 紧凑模式，-d N 深度限制，-s sel 范围，-D 与上次对比，-a 带标注截图，-o path 输出路径，-C cursor-interactive @c 引用 |

### Meta
| 命令 | 描述 |
|------|------|
| `chain` | 从 JSON stdin 运行命令。格式：[["cmd","arg1",...],...] |

### Tabs
| 命令 | 描述 |
|------|------|
| `closetab [id]` | 关闭标签页 |
| `newtab [url]` | 打开新标签页 |
| `tab <id>` | 切换到标签页 |
| `tabs` | 列出打开的标签页 |

### Server
| 命令 | 描述 |
|------|------|
| `handoff [message]` | 在当前页面打开可见的 Chrome 供用户接管 |
| `restart` | 重启服务器 |
| `resume` | 用户接管后重新快照，将控制权交还给 AI |
| `status` | 健康检查 |
| `stop` | 关闭服务器 |
