---
name: review
version: 1.0.0
description: |
  合并前 PR 审查。分析当前分支与基础分支的差异，检查 SQL 安全性、LLM 信任边界违规、
  条件副作用和其他结构性问题。当被要求"审查此 PR"、"代码审查"、"合并前审查"或
  "检查我的差异"时使用。在用户即将合并或提交代码更改时主动建议使用。
allowed-tools:
  - Bash
  - Read
  - Edit
  - Write
  - Grep
  - Glob
  - Agent
  - AskUserQuestion
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

## 步骤 0：检测基础分支

确定此 PR 目标分支。在所有后续步骤中使用此结果作为"基础分支"。

1. 检查此分支是否已存在 PR：
   `gh pr view --json baseRefName -q .baseRefName`
   如果成功，使用打印的分支名作为基础分支。

2. 如果没有 PR（命令失败），检测仓库的默认分支：
   `gh repo view --json defaultBranchRef -q .defaultBranchRef.name`

3. 如果两个命令都失败，回退到 `main`。

打印检测到的基础分支名。在后续每个 `git diff`、`git log`、
`git fetch`、`git merge` 和 `gh pr create` 命令中，将检测到的
分支名替换到指令中"基础分支"的位置。

---

# 合并前 PR 审查

你正在运行 `/review` 工作流。分析当前分支与基础分支的差异，查找测试无法捕获的结构性问题。

---

## 步骤 1：检查分支

1. 运行 `git branch --show-current` 获取当前分支。
2. 如果在基础分支上，输出：**"无需审查 — 你在基础分支上或相对于它没有更改。"** 并停止。
3. 运行 `git fetch origin <base> --quiet && git diff origin/<base> --stat` 检查是否有差异。如果没有差异，输出相同消息并停止。

---

## 步骤 1.5：范围漂移检测

在审查代码质量之前，检查：**他们是否构建了所要求的内容 — 不多也不少？**

1. 读取 `TODOS.md`（如果存在）。读取 PR 描述（`gh pr view --json body --jq .body 2>/dev/null || true`）。
   读取提交信息（`git log origin/<base>..HEAD --oneline`）。
   **如果不存在 PR：** 依赖提交信息和 TODOS.md 了解声明意图 — 这是常见情况，因为 /review 在 /ship 创建 PR 之前运行。
2. 识别**声明意图** — 这个分支应该完成什么？
3. 运行 `git diff origin/<base> --stat` 并将更改的文件与声明意图进行比较。
4. 以怀疑态度评估：

   **范围蔓延检测：**
   - 与声明意图无关的文件更改
   - 计划中未提及的新功能或重构
   - "既然我在这里……"的更改，扩大了影响范围

   **需求遗漏检测：**
   - TODOS.md/PR 描述中的需求在差异中未解决
   - 声明需求的测试覆盖缺口
   - 部分实现（已开始但未完成）

5. 输出（在主要审查开始之前）：
   ```
   范围检查：[清洁 / 检测到漂移 / 需求遗漏]
   意图：<所请求内容的单行摘要>
   交付：<差异实际内容的单行摘要>
   [如果漂移：列出每个超出范围的更改]
   [如果遗漏：列出每个未解决的需求]
   ```

6. 这是**信息性的** — 不阻止审查。继续步骤 2。

---

## 步骤 2：读取检查清单

读取 `.openclaw/skills/fullstack/review/checklist.md`。

**如果无法读取文件，停止并报告错误。** 没有检查清单不要继续。

---

## 步骤 2.5：检查 Greptile 审查评论

读取 `.openclaw/skills/fullstack/review/greptile-triage.md` 并遵循获取、过滤、分类和**升级检测**步骤。

**如果不存在 PR、`gh` 失败、API 返回错误或没有 Greptile 评论：** 静默跳过此步骤。Greptile 集成是附加的 — 没有它审查也能工作。

**如果找到 Greptile 评论：** 存储分类（有效且可操作、有效但已修复、误报、已抑制）— 你将在步骤 5 中需要它们。

---

## 步骤 3：获取差异

获取最新的基础分支以避免因本地状态过时而产生误报：

```bash
git fetch origin <base> --quiet
```

运行 `git diff origin/<base>` 获取完整差异。这包括相对于最新基础分支的已提交和未提交更改。

---

## 步骤 4：两轮审查

分两轮将检查清单应用于差异：

1. **第 1 轮（关键）：** SQL 与数据安全、竞态条件与并发、LLM 输出信任边界、枚举与值完整性
2. **第 2 轮（信息性）：** 条件副作用、魔法数字与字符串耦合、死代码与一致性、LLM 提示问题、测试缺口、视图/前端、性能与包体积影响

**枚举与值完整性需要读取差异之外的代码。** 当差异引入新的枚举值、状态、层级或类型常量时，使用 Grep 查找引用同级值的所有文件，然后读取这些文件以检查是否处理了新值。这是差异内审查不足的唯一类别。

**推荐前先搜索：** 当推荐修复模式时（特别是并发、缓存、认证或框架特定行为）：
- 验证该模式是所用框架版本的当前最佳实践
- 在推荐变通方案之前，检查新版本中是否存在内置解决方案
- 根据当前文档验证 API 签名（API 在版本间会变化）

只需几秒钟，就能避免推荐过时的模式。如果 WebSearch 不可用，注明并使用内置知识继续。

遵循检查清单中指定的输出格式。尊重抑制项 — 不要标记"不要标记"部分中列出的项目。

---

## 步骤 4.5：设计审查（条件性）

## 设计审查（条件性，差异范围）

使用 `fullstack-diff-scope` 检查差异是否触及前端文件：

```bash
source <(~/.openclaw/skills/fullstack/bin/fullstack-diff-scope <base> 2>/dev/null)
```

**如果 `SCOPE_FRONTEND=false`：** 静默跳过设计审查。无输出。

**如果 `SCOPE_FRONTEND=true`：**

1. **检查 DESIGN.md。** 如果仓库根目录存在 `DESIGN.md` 或 `design-system.md`，读取它。所有设计发现都根据它进行校准 — DESIGN.md 中认可的模式不会被标记。如果未找到，使用通用设计原则。

2. **读取 `.openclaw/skills/fullstack/review/design-checklist.md`。** 如果无法读取文件，跳过设计审查并说明："未找到设计检查清单 — 跳过设计审查。"

3. **读取每个变更的前端文件**（完整文件，不只是差异片段）。前端文件由检查清单中列出的模式识别。

4. **对变更文件应用设计检查清单**。对每项：
   - **[HIGH] 机械性 CSS 修复**（`outline: none`、`!important`、`font-size < 16px`）：归类为 AUTO-FIX
   - **[HIGH/MEDIUM] 需要设计判断**：归类为 ASK
   - **[LOW] 基于意图的检测**：呈现为"可能 — 视觉验证或运行 /design-review"

5. **在审查输出的"设计审查"标题下包含发现**，遵循检查清单中的输出格式。设计发现与代码审查发现合并到同一个修复优先流程中。

6. **记录结果**用于审查就绪仪表板：

```bash
~/.openclaw/skills/fullstack/bin/fullstack-review-log '{"skill":"design-review-lite","timestamp":"TIMESTAMP","status":"STATUS","findings":N,"auto_fixed":M,"commit":"COMMIT"}'
```

替换：TIMESTAMP = ISO 8601 日期时间，STATUS = 如果 0 个发现则为 "clean" 或 "issues_found"，N = 总发现数，M = 自动修复数，COMMIT = `git rev-parse --short HEAD` 的输出。

7. **Codex 设计意见**（可选，可用时自动运行）：

```bash
which codex 2>/dev/null && echo "CODEX_AVAILABLE" || echo "CODEX_NOT_AVAILABLE"
```

如果 Codex 可用，对差异运行轻量级设计检查：

```bash
TMPERR_DRL=$(mktemp /tmp/codex-drl-XXXXXXXX)
codex exec "Review the git diff on this branch. Run 7 litmus checks (YES/NO each): 1. 品牌/产品在首屏 unmistakable 吗？ 2. 有一个强烈的视觉锚点吗？ 3. 仅通过扫描标题就能理解页面吗？ 4. 每个区块只有一个任务吗？ 5. 卡片真的必要吗？ 6. 动效改善了层次结构或氛围吗？ 7. 如果移除所有装饰性阴影，设计会感觉高级吗？ Flag any hard rejections: 1. 第一印象是通用的 SaaS 卡片网格 2. 漂亮的图片但品牌薄弱 3. 强有力的标题但没有明确的行动 4. 文字后面是繁忙的图像 5. 区块重复相同的心情陈述 6. 没有叙事目的的轮播 7. 应用 UI 由堆叠的卡片组成而不是布局 5 most important design findings only. Reference file:line." -s read-only -c 'model_reasoning_effort="high"' --enable web_search_cached 2>"$TMPERR_DRL"
```

使用 5 分钟超时（`timeout: 300000`）。命令完成后，读取 stderr：
```bash
cat "$TMPERR_DRL" && rm -f "$TMPERR_DRL"
```

**错误处理：** 所有错误都是非阻塞的。认证失败、超时或空响应时 — 跳过并附带简短说明，然后继续。

在 `CODEX (design):` 标题下展示 Codex 输出，与上面的检查清单发现合并。

将任何设计发现与步骤 4 的发现一起包含。它们在步骤 5 中遵循相同的修复优先流程 — 机械性 CSS 修复为自动修复，其他为询问。

---

## 步骤 4.75：测试覆盖图

100% coverage is the goal. Evaluate every codepath changed in the diff and identify test gaps. Gaps become INFORMATIONAL findings that follow the Fix-First flow.

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

**Step 1. Trace every codepath changed** using `git diff origin/<base>...HEAD`:

Read every changed file. For each one, trace how data flows through the code — don't just list functions, actually follow the execution:

1. **Read the diff.** For each changed file, read the full file (not just the diff hunk) to understand context.
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

**IRON RULE:** When the coverage audit identifies a REGRESSION — code that previously worked but the diff broke — a regression test is written immediately. No AskUserQuestion. No skipping. Regressions are the highest-priority test because they prove something broke.

A regression is when:
- The diff modifies existing behavior (not new code)
- The existing test suite (if any) doesn't cover the changed path
- The change introduces a new failure mode for existing callers

When uncertain whether a change is a regression, err on the side of writing the test.

Format: commit as `test: regression test for {what broke}`

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

**Fast path:** All paths covered → "Step 4.75: All new code paths have test coverage ✓" Continue.

**Step 5. Generate tests for gaps (Fix-First):**

If test framework is detected and gaps were identified:
- Classify each gap as AUTO-FIX or ASK per the Fix-First Heuristic:
  - **AUTO-FIX:** Simple unit tests for pure functions, edge cases of existing tested functions
  - **ASK:** E2E tests, tests requiring new test infrastructure, tests for ambiguous behavior
- For AUTO-FIX gaps: generate the test, run it, commit as `test: coverage for {feature}`
- For ASK gaps: include in the Fix-First batch question with the other review findings
- For paths marked [→E2E]: always ASK (E2E tests are higher-effort and need user confirmation)
- For paths marked [→EVAL]: always ASK (eval tests need user confirmation on quality criteria)

If no test framework detected → include gaps as INFORMATIONAL findings only, no generation.

**Diff is test-only changes:** Skip Step 4.75 entirely: "No new application code paths to audit."

此步骤取代第 2 轮中的"测试缺口"类别 — 不要在检查清单的测试缺口项目和此覆盖图之间重复发现。将任何覆盖缺口与步骤 4 和步骤 4.5 的发现一起包含。它们遵循相同的修复优先流程 — 缺口是信息性发现。

---

## 步骤 5：修复优先审查

**每个发现都需要采取行动 — 不仅仅是关键发现。**

输出摘要标题：`合并前审查：N 个问题（X 个关键，Y 个信息性）`

### 步骤 5a：分类每个发现

对于每个发现，根据 checklist.md 中的修复优先启发式规则分类为自动修复或询问。关键发现倾向于询问；信息性发现倾向于自动修复。

### 步骤 5b：自动修复所有自动修复项

直接应用每个修复。对于每个修复，输出一行摘要：
`[已自动修复] [文件:行号] 问题 → 你做了什么`

### 步骤 5c：批量询问询问项

如果还有询问项，在一个 AskUserQuestion 中呈现：

- 列出每个项目及其编号、严重性标签、问题和推荐修复
- 对于每个项目，提供选项：A) 按推荐修复，B) 跳过
- 包含整体建议

示例格式：
```
我自动修复了 5 个问题。2 个需要你的输入：

1. [关键] app/models/post.rb:42 — 状态转换中的竞态条件
   修复：在 UPDATE 中添加 `WHERE status = 'draft'`
   → A) 修复  B) 跳过

2. [信息性] app/services/generator.rb:88 — LLM 输出在写入数据库前未进行类型检查
   修复：添加 JSON schema 验证
   → A) 修复  B) 跳过

建议：修复两者 — #1 是真正的竞态条件，#2 防止静默数据损坏。
```

如果询问项少于等于 3 个，可以使用单独的 AskUserQuestion 调用而不是批量处理。

### 步骤 5d：应用用户批准的修复

应用用户选择"修复"的项目修复。输出已修复的内容。

如果不存在询问项（所有内容都已自动修复），完全跳过问题。

### 声明验证

在生成最终审查输出之前：
- 如果你声称"此模式是安全的" → 引用证明安全性的具体行
- 如果你声称"这已在其他地方处理" → 读取并引用处理代码
- 如果你声称"测试覆盖了这一点" → 指出测试文件和方法
- 永远不要说"可能已处理"或"可能已测试" — 验证或标记为未知

**防止合理化：** "这看起来没问题"不是发现。要么引用证据证明它确实没问题，要么标记为未验证。

### Greptile 评论解决

输出你自己的发现后，如果在步骤 2.5 中分类了 Greptile 评论：

**在输出标题中包含 Greptile 摘要：** `+ N 条 Greptile 评论（X 条有效，Y 条已修复，Z 条误报）`

在回复任何评论之前，运行 greptile-triage.md 中的**升级检测**算法，确定是使用第 1 层（友好）还是第 2 层（坚定）回复模板。

1. **有效且可操作的评论：** 这些包含在你的发现中 — 它们遵循修复优先流程（如果是机械性的则自动修复，否则批量到询问中）（A: 立即修复，B: 确认，C: 误报）。如果用户选择 A（修复），使用 greptile-triage.md 中的**修复回复模板**回复（包含内联差异 + 解释）。如果用户选择 C（误报），使用**误报回复模板**回复（包含证据 + 建议重新排名），保存到项目级和全局 greptile-history。

2. **误报评论：** 通过 AskUserQuestion 呈现每个误报：
   - 显示 Greptile 评论：文件:行号（或 [顶级]）+ 正文摘要 + 永久链接 URL
   - 简明解释为什么它是误报
   - 选项：
     - A) 回复 Greptile 解释为什么这是不正确的（如果明显错误则推荐）
     - B) 仍然修复（如果工作量小且无害）
     - C) 忽略 — 不回复，不修复

   如果用户选择 A，使用 greptile-triage.md 中的**误报回复模板**回复（包含证据 + 建议重新排名），保存到项目级和全局 greptile-history。

3. **有效但已修复的评论：** 使用 greptile-triage.md 中的**已修复回复模板**回复 — 无需 AskUserQuestion：
   - 包含所做内容和修复提交 SHA
   - 保存到项目级和全局 greptile-history

4. **已抑制的评论：** 静默跳过 — 这些是之前分类中已知的误报。

---

## 步骤 5.5：TODOS 交叉引用

读取仓库根目录中的 `TODOS.md`（如果存在）。将 PR 与开放的 TODO 交叉引用：

- **此 PR 是否关闭了任何开放的 TODO？** 如果是，在输出中注明哪些项目："此 PR 解决了 TODO：<标题>"
- **此 PR 是否创建了应该成为 TODO 的工作？** 如果是，将其标记为信息性发现。
- **是否有相关的 TODO 为此审查提供上下文？** 如果是，在讨论相关发现时引用它们。

如果 TODOS.md 不存在，静默跳过此步骤。

---

## 步骤 5.6：文档过时检查

将差异与文档文件交叉引用。对于仓库根目录中的每个 `.md` 文件（README.md、ARCHITECTURE.md、CONTRIBUTING.md、CLAUDE.md 等）：

1. 检查差异中的代码更改是否影响该文档文件中描述的功能、组件或工作流。
2. 如果文档文件在此分支中未更新，但其描述的代码已更改，将其标记为信息性发现：
   "文档可能已过时：[文件] 描述了 [功能/组件]，但代码在此分支中已更改。考虑运行 `/document-release`。"

这仅是信息性的 — 永远不是关键的。修复操作是 `/document-release`。

如果不存在文档文件，静默跳过此步骤。

---

## Step 5.7: Adversarial review (auto-scaled)

Adversarial review thoroughness scales automatically based on diff size. No configuration needed.

**Detect diff size and tool availability:**

```bash
DIFF_INS=$(git diff origin/<base> --stat | tail -1 | grep -oE '[0-9]+ insertion' | grep -oE '[0-9]+' || echo "0")
DIFF_DEL=$(git diff origin/<base> --stat | tail -1 | grep -oE '[0-9]+ deletion' | grep -oE '[0-9]+' || echo "0")
DIFF_TOTAL=$((DIFF_INS + DIFF_DEL))
which codex 2>/dev/null && echo "CODEX_AVAILABLE" || echo "CODEX_NOT_AVAILABLE"
# Respect old opt-out
OLD_CFG=$(~/.openclaw/skills/fullstack/bin/fullstack-config get codex_reviews 2>/dev/null || true)
echo "DIFF_SIZE: $DIFF_TOTAL"
echo "OLD_CFG: ${OLD_CFG:-not_set}"
```

If `OLD_CFG` is `disabled`: skip this step silently. Continue to the next step.

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

```bash
TMPERR_ADV=$(mktemp /tmp/codex-adv-XXXXXXXX)
codex exec "Review the changes on this branch against the base branch. Run git diff origin/<base> to see the diff. Your job is to find ways this code will fail in production. Think like an attacker and a chaos engineer. Find edge cases, race conditions, security holes, resource leaks, failure modes, and silent data corruption paths. Be adversarial. Be thorough. No compliments — just the problems." -s read-only -c 'model_reasoning_effort="xhigh"' --enable web_search_cached 2>"$TMPERR_ADV"
```

Set the Bash tool's `timeout` parameter to `300000` (5 minutes). Do NOT use the `timeout` shell command — it doesn't exist on macOS. After the command completes, read stderr:
```bash
cat "$TMPERR_ADV"
```

Present the full output verbatim. This is informational — it never blocks shipping.

**Error handling:** All errors are non-blocking — adversarial review is a quality enhancement, not a prerequisite.
- **Auth failure:** If stderr contains "auth", "login", "unauthorized", or "API key": "Codex authentication failed. Run \`codex login\` to authenticate."
- **Timeout:** "Codex timed out after 5 minutes."
- **Empty response:** "Codex returned no response. Stderr: <paste relevant error>."

On any Codex error, fall back to the Claude adversarial subagent automatically.

**Claude adversarial subagent** (fallback when Codex unavailable or errored):

Dispatch via the Agent tool. The subagent has fresh context — no checklist bias from the structured review. This genuine independence catches things the primary reviewer is blind to.

Subagent prompt:
"Read the diff for this branch with `git diff origin/<base>`. Think like an attacker and a chaos engineer. Your job is to find ways this code will fail in production. Look for: edge cases, race conditions, security holes, resource leaks, failure modes, silent data corruption, logic errors that produce wrong results silently, error handling that swallows failures, and trust boundary violations. Be adversarial. Be thorough. No compliments — just the problems. For each finding, classify as FIXABLE (you know how to fix it) or INVESTIGATE (needs human judgment)."

Present findings under an `ADVERSARIAL REVIEW (Claude subagent):` header. **FIXABLE findings** flow into the same Fix-First pipeline as the structured review. **INVESTIGATE findings** are presented as informational.

If the subagent fails or times out: "Claude adversarial subagent unavailable. Continuing without adversarial review."

**Persist the review result:**
```bash
~/.openclaw/skills/fullstack/bin/fullstack-review-log '{"skill":"adversarial-review","timestamp":"'"$(date -u +%Y-%m-%dT%H:%M:%SZ)"'","status":"STATUS","source":"SOURCE","tier":"medium","commit":"'"$(git rev-parse --short HEAD)"'"}'
```
Substitute STATUS: "clean" if no findings, "issues_found" if findings exist. SOURCE: "codex" if Codex ran, "claude" if subagent ran. If both failed, do NOT persist.

**Cleanup:** Run `rm -f "$TMPERR_ADV"` after processing (if Codex was used).

---

### Large tier (200+ lines)

Claude's structured review already ran. Now run **all three remaining passes** for maximum coverage:

**1. Codex structured review (if available):**
```bash
TMPERR=$(mktemp /tmp/codex-review-XXXXXXXX)
codex review --base <base> -c 'model_reasoning_effort="xhigh"' --enable web_search_cached 2>"$TMPERR"
```

Set the Bash tool's `timeout` parameter to `300000` (5 minutes). Do NOT use the `timeout` shell command — it doesn't exist on macOS. Present output under `CODEX SAYS (code review):` header.
Check for `[P1]` markers: found → `GATE: FAIL`, not found → `GATE: PASS`.

If GATE is FAIL, use AskUserQuestion:
```
Codex found N critical issues in the diff.

A) Investigate and fix now (recommended)
B) Continue — review will still complete
```

If A: address the findings. Re-run `codex review` to verify.

Read stderr for errors (same error handling as medium tier).

After stderr: `rm -f "$TMPERR"`

**2. Claude adversarial subagent:** Dispatch a subagent with the adversarial prompt (same prompt as medium tier). This always runs regardless of Codex availability.

**3. Codex adversarial challenge (if available):** Run `codex exec` with the adversarial prompt (same as medium tier).

If Codex is not available for steps 1 and 3, note to the user: "Codex CLI not found — large-diff review ran Claude structured + Claude adversarial (2 of 4 passes). Install Codex for full 4-pass coverage: `npm install -g @openai/codex`"

**Persist the review result AFTER all passes complete** (not after each sub-step):
```bash
~/.openclaw/skills/fullstack/bin/fullstack-review-log '{"skill":"adversarial-review","timestamp":"'"$(date -u +%Y-%m-%dT%H:%M:%SZ)"'","status":"STATUS","source":"SOURCE","tier":"large","gate":"GATE","commit":"'"$(git rev-parse --short HEAD)"'"}'
```
Substitute: STATUS = "clean" if no findings across ALL passes, "issues_found" if any pass found issues. SOURCE = "both" if Codex ran, "claude" if only Claude subagent ran. GATE = the Codex structured review gate result ("pass"/"fail"), or "informational" if Codex was unavailable. If all passes failed, do NOT persist.

---

### Cross-model synthesis (medium and large tiers)

After all passes complete, synthesize findings across all sources:

```
ADVERSARIAL REVIEW SYNTHESIS (auto: TIER, N lines):
════════════════════════════════════════════════════════════
  High confidence (found by multiple sources): [findings agreed on by >1 pass]
  Unique to Claude structured review: [from earlier step]
  Unique to Claude adversarial: [from subagent, if ran]
  Unique to Codex: [from codex adversarial or code review, if ran]
  Models used: Claude structured ✓  Claude adversarial ✓/✗  Codex ✓/✗
════════════════════════════════════════════════════════════
```

High-confidence findings (agreed on by multiple sources) should be prioritized for fixes.

---

## 步骤 5.8：持久化工程审查结果

所有审查轮次完成后，持久化最终的 `/review` 结果，以便 `/ship` 能够
识别此分支上已运行工程审查。

运行：

```bash
~/.openclaw/skills/fullstack/bin/fullstack-review-log '{"skill":"review","timestamp":"TIMESTAMP","status":"STATUS","issues_found":N,"critical":N,"informational":N,"commit":"COMMIT"}'
```

替换：
- `TIMESTAMP` = ISO 8601 日期时间
- `STATUS` = 如果在修复优先处理和对抗性审查后没有剩余未解决的发现，则为 `"clean"`，否则为 `"issues_found"`
- `issues_found` = 剩余未解决发现的总数
- `critical` = 剩余未解决的关键发现数
- `informational` = 剩余未解决的信息性发现数
- `COMMIT` = `git rev-parse --short HEAD` 的输出

如果审查在实际审查完成之前提前退出（例如，相对于基础分支没有差异），**不要**写入此条目。

## 重要规则

- **在评论前读取完整差异。** 不要标记差异中已解决的问题。
- **修复优先，而非只读。** 自动修复项直接应用。询问项仅在用户批准后应用。永远不要提交、推送或创建 PR — 那是 /ship 的工作。
- **简洁。** 一行问题，一行修复。无前言。
- **只标记真正的问题。** 跳过任何正常的内容。
- **使用 greptile-triage.md 中的 Greptile 回复模板。** 每个回复都包含证据。永远不要发布模糊的回复。
