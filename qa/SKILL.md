---
name: qa
version: 2.0.0
description: |
  系统性地对 Web 应用进行 QA 测试并修复发现的 Bug。运行 QA 测试，
  然后迭代修复源代码中的 Bug，每次修复单独提交并重新验证。
  当被要求 "qa"、"QA"、"test this site"、"find bugs"、"test and fix"
  或 "fix what's broken" 时使用。当用户说某个功能准备好测试或问
  "does this work?" 时主动建议使用。三个级别：Quick（仅关键/高优先级）、
  Standard（+ 中等）、Exhaustive（+ 外观问题）。生成前后健康评分、
  修复证据和发布就绪摘要。如需仅报告模式，请使用 /qa-only。
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
  - Glob
  - Grep
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

# /qa: 测试 → 修复 → 验证

你是一名 QA 工程师兼 Bug 修复工程师。像真实用户一样测试 Web 应用——点击所有内容，填写所有表单，检查所有状态。当你发现 Bug 时，在源代码中修复它们，使用原子提交，然后重新验证。生成包含前后证据的结构化报告。

## 设置

**解析用户请求中的以下参数：**

| 参数 | 默认值 | 覆盖示例 |
|-----------|---------|-----------------:|
| 目标 URL | (自动检测或必填) | `https://myapp.com`, `http://localhost:3000` |
| 级别 | Standard | `--quick`, `--exhaustive` |
| 模式 | full | `--regression .openclaw/qa-reports/baseline.json` |
| 输出目录 | `.openclaw/qa-reports/` | `Output to /tmp/qa` |
| 范围 | 全应用（或差异范围） | `Focus on the billing page` |
| 认证 | 无 | `Sign in to user@example.com`, `Import cookies from cookies.json` |

**级别决定修复哪些问题：**
- **Quick：** 仅修复关键 + 高严重级别
- **Standard：** + 中等严重级别（默认）
- **Exhaustive：** + 低/外观严重级别

**如果未提供 URL 且你在功能分支上：** 自动进入 **差异感知模式**（见下方模式说明）。这是最常见的情况——用户刚在分支上发布了代码，想要验证它是否正常工作。

**检查工作区是否干净：**

```bash
git status --porcelain
```

如果输出非空（工作区有未提交的更改），**停止**并使用 AskUserQuestion：

"你的工作区有未提交的更改。/qa 需要干净的工作区，以便每个 Bug 修复都有自己独立的原子提交。"

- A) 提交我的更改 — 用描述性消息提交所有当前更改，然后开始 QA
- B) 暂存我的更改 — 暂存，运行 QA，之后恢复暂存
- C) 中止 — 我会手动清理

建议：选择 A，因为在 QA 添加自己的修复提交之前，未提交的工作应该作为提交保留。

用户选择后，执行他们的选择（提交或暂存），然后继续设置。

**查找 browse 二进制文件：**

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

**检查测试框架（如需要则引导）：**

## Test Framework Bootstrap

**Detect existing test framework and project runtime:**

```bash
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
```

**If test framework detected** (config files or test directories found):
Print "Test framework detected: {name} ({N} existing tests). Skipping bootstrap."
Read 2-3 existing test files to learn conventions (naming, imports, assertion style, setup patterns).
Store conventions as prose context for use in Phase 8e.5 or Step 3.4. **Skip the rest of bootstrap.**

**If BOOTSTRAP_DECLINED** appears: Print "Test bootstrap previously declined — skipping." **Skip the rest of bootstrap.**

**If NO runtime detected** (no config files found): Use AskUserQuestion:
"I couldn't detect your project's language. What runtime are you using?"
Options: A) Node.js/TypeScript B) Ruby/Rails C) Python D) Go E) Rust F) PHP G) Elixir H) This project doesn't need tests.
If user picks H → write `.fullstack/no-test-bootstrap` and continue without tests.

**If runtime detected but no test framework — bootstrap:**

### B2. Research best practices

Use WebSearch to find current best practices for the detected runtime:
- `"[runtime] best test framework 2025 2026"`
- `"[framework A] vs [framework B] comparison"`

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

If user picks C → write `.fullstack/no-test-bootstrap`. Tell user: "If you change your mind later, delete `.fullstack/no-test-bootstrap` and re-run." Continue without tests.

If multiple runtimes detected (monorepo) → ask which runtime to set up first, with option to do both sequentially.

### B4. Install and configure

1. Install the chosen packages (npm/bun/gem/pip/etc.)
2. Create minimal config file
3. Create directory structure (test/, spec/, etc.)
4. Create one example test matching the project's code to verify setup works

If package installation fails → debug once. If still failing → revert with `git checkout -- package.json package-lock.json` (or equivalent for the runtime). Warn user and continue without tests.

### B4.5. First real tests

Generate 3-5 real tests for existing code:

1. **Find recently changed files:** `git log --since=30.days --name-only --format="" | sort | uniq -c | sort -rn | head -10`
2. **Prioritize by risk:** Error handlers > business logic with conditionals > API endpoints > pure functions
3. **For each file:** Write one test that tests real behavior with meaningful assertions. Never `expect(x).toBeDefined()` — test what the code DOES.
4. Run each test. Passes → keep. Fails → fix once. Still fails → delete silently.
5. Generate at least 1 test, cap at 5.

Never import secrets, API keys, or credentials in test files. Use environment variables or test fixtures.

### B5. Verify

```bash
# Run the full test suite to confirm everything works
{detected test command}
```

If tests fail → debug once. If still failing → revert all bootstrap changes and warn user.

### B5.5. CI/CD pipeline

```bash
# Check CI provider
ls -d .github/ 2>/dev/null && echo "CI:github"
ls .gitlab-ci.yml .circleci/ bitrise.yml 2>/dev/null
```

If `.github/` exists (or no CI detected — default to GitHub Actions):
Create `.github/workflows/test.yml` with:
- `runs-on: ubuntu-latest`
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

First check: If CLAUDE.md already has a `## Testing` section → skip. Don't duplicate.

Append a `## Testing` section:
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

```bash
git status --porcelain
```

Only commit if there are changes. Stage all bootstrap files (config, test directory, TESTING.md, CLAUDE.md, .github/workflows/test.yml if created):
`git commit -m "chore: bootstrap test framework ({framework name})"`

---

**创建输出目录：**

```bash
mkdir -p .openclaw/qa-reports/screenshots
```

---

## 测试计划上下文

在回退到 git diff 启发式方法之前，检查是否有更丰富的测试计划来源：

1. **项目范围的测试计划：** 检查 `~/.openclaw/projects/` 中此仓库最近的 `*-test-plan-*.md` 文件
   ```bash
   eval "$(~/.openclaw/skills/fullstack/bin/fullstack-slug 2>/dev/null)"
   ls -t ~/.openclaw/projects/$SLUG/*-test-plan-*.md 2>/dev/null | head -1
   ```
2. **对话上下文：** 检查本次对话中之前的 `/plan-eng-review` 或 `/plan-ceo-review` 是否产生了测试计划输出
3. **使用更丰富的来源。** 只有在两者都不可用时才回退到 git diff 分析。

---

## 阶段 1-6：QA 基线

## 模式

### 差异感知模式（在功能分支上且未提供 URL 时自动启用）

这是开发者验证其工作的**主要模式**。当用户在没有 URL 的情况下执行 `/qa` 且仓库位于功能分支时，自动执行以下操作：

1. **分析分支差异**以了解变更内容：
   ```bash
   git diff main...HEAD --name-only
   git log main..HEAD --oneline
   ```

2. **从变更文件中识别受影响的页面/路由**：
   - 控制器/路由文件 → 它们服务的 URL 路径
   - 视图/模板/组件文件 → 渲染它们的页面
   - 模型/服务文件 → 使用这些模型的页面（检查引用它们的控制器）
   - CSS/样式文件 → 包含这些样式表的页面
   - API 端点 → 使用 `$B js "await fetch('/api/...')"` 直接测试
   - 静态页面（markdown、HTML）→ 直接导航到它们

   **如果从差异中未识别出明显的页面/路由：** 不要跳过浏览器测试。用户调用 /qa 是因为他们想要基于浏览器的验证。回退到快速模式 — 导航到首页，跟随前 5 个导航目标，检查控制台错误，并测试发现的任何交互元素。后端、配置和基础设施变更会影响应用行为 — 始终验证应用是否仍然正常工作。

3. **检测正在运行的应用** — 检查常见的本地开发端口：
   ```bash
   $B goto http://localhost:3000 2>/dev/null && echo "在 :3000 找到应用" || \
   $B goto http://localhost:4000 2>/dev/null && echo "在 :4000 找到应用" || \
   $B goto http://localhost:8080 2>/dev/null && echo "在 :8080 找到应用"
   ```
   如果未找到本地应用，检查 PR 或环境中是否有预发布/预览 URL。如果都没有，向用户询问 URL。

4. **测试每个受影响的页面/路由**：
   - 导航到页面
   - 截取屏幕截图
   - 检查控制台错误
   - 如果变更是交互式的（表单、按钮、流程），端到端测试交互
   - 在操作前后使用 `snapshot -D` 验证变更产生了预期效果

5. **与提交消息和 PR 描述交叉引用**以理解*意图* — 变更应该做什么？验证它实际上做到了。

6. **检查 TODOS.md**（如果存在）以查找与变更文件相关的已知 bug 或问题。如果 TODO 描述了此分支应该修复的 bug，将其添加到测试计划中。如果在 QA 期间发现新 bug 且不在 TODOS.md 中，在报告中记录它。

7. **报告发现**，范围限定在分支变更：
   - "已测试变更：此分支影响的 N 个页面/路由"
   - 每个页面：是否正常工作？截图证据。
   - 相邻页面是否有回归？

**如果用户在差异感知模式下提供了 URL：** 使用该 URL 作为基础，但仍将测试范围限定在变更文件。

### 完整模式（提供 URL 时的默认模式）
系统性探索。访问每个可达页面。记录 5-10 个有充分证据的问题。生成健康评分。根据应用大小需要 5-15 分钟。

### 快速模式（`--quick`）
30 秒冒烟测试。访问首页 + 前 5 个导航目标。检查：页面是否加载？控制台错误？断链？生成健康评分。无详细问题记录。

### 回归模式（`--regression <baseline>`）
运行完整模式，然后从之前的运行加载 `baseline.json`。对比：哪些问题已修复？哪些是新的？评分变化多少？在报告中追加回归部分。

---

## 工作流程

### 阶段 1：初始化

1. 查找 browse 二进制文件（参见上面的设置）
2. 创建输出目录
3. 从 `qa/templates/qa-report-template.md` 复制报告模板到输出目录
4. 启动计时器以跟踪持续时间

### 阶段 2：认证（如需要）

**如果用户指定了认证凭据：**

```bash
$B goto <login-url>
$B snapshot -i                    # 查找登录表单
$B fill @e3 "user@example.com"
$B fill @e4 "[REDACTED]"         # 永远不要在报告中包含真实密码
$B click @e5                      # 提交
$B snapshot -D                    # 验证登录成功
```

**如果用户提供了 cookie 文件：**

```bash
$B cookie-import cookies.json
$B goto <target-url>
```

**如果需要 2FA/OTP：** 向用户询问验证码并等待。

**如果被 CAPTCHA 阻挡：** 告诉用户："请在浏览器中完成 CAPTCHA，然后告诉我继续。"

### 阶段 3：定位

获取应用的地图：

```bash
$B goto <target-url>
$B snapshot -i -a -o "$REPORT_DIR/screenshots/initial.png"
$B links                          # 映射导航结构
$B console --errors               # 首页有任何错误吗？
```

**检测框架**（在报告元数据中记录）：
- HTML 中有 `__next` 或 `_next/data` 请求 → Next.js
- `csrf-token` meta 标签 → Rails
- URL 中有 `wp-content` → WordPress
- 无页面刷新的客户端路由 → SPA

**对于 SPA：** `links` 命令可能返回较少结果，因为导航是客户端的。改用 `snapshot -i` 查找导航元素（按钮、菜单项）。

### 阶段 4：探索

系统性地访问页面。在每个页面：

```bash
$B goto <page-url>
$B snapshot -i -a -o "$REPORT_DIR/screenshots/page-name.png"
$B console --errors
```

然后按照**每页探索检查清单**（参见 `qa/references/issue-taxonomy.md`）：

1. **视觉扫描** — 查看带注释的截图以发现布局问题
2. **交互元素** — 点击按钮、链接、控件。它们是否正常工作？
3. **表单** — 填写并提交。测试空值、无效值、边界情况
4. **导航** — 检查所有进出路径
5. **状态** — 空状态、加载、错误、溢出
6. **控制台** — 交互后是否有新的 JS 错误？
7. **响应式** — 如果相关，检查移动端视口：
   ```bash
   $B viewport 375x812
   $B screenshot "$REPORT_DIR/screenshots/page-mobile.png"
   $B viewport 1280x720
   ```

**深度判断：** 在核心功能（首页、仪表板、结账、搜索）上花更多时间，在次要页面（关于、条款、隐私）上花较少时间。

**快速模式：** 只访问首页 + 定位阶段的前 5 个导航目标。跳过每页检查清单 — 只检查：是否加载？控制台错误？可见的断链？

### 阶段 5：记录

**发现问题时立即记录** — 不要批量处理。

**两种证据层级：**

**交互式 bug**（流程中断、无效按钮、表单失败）：
1. 截取操作前的截图
2. 执行操作
3. 截取显示结果的截图
4. 使用 `snapshot -D` 显示变更内容
5. 编写引用截图的复现步骤

```bash
$B screenshot "$REPORT_DIR/screenshots/issue-001-step-1.png"
$B click @e5
$B screenshot "$REPORT_DIR/screenshots/issue-001-result.png"
$B snapshot -D
```

**静态 bug**（错别字、布局问题、图片缺失）：
1. 截取一张带注释的截图显示问题
2. 描述问题所在

```bash
$B snapshot -i -a -o "$REPORT_DIR/screenshots/issue-002.png"
```

**立即将每个问题写入报告**，使用 `qa/templates/qa-report-template.md` 中的模板格式。

### 阶段 6：收尾

1. **计算健康评分**使用下面的评分标准
2. **编写"前 3 个需要修复的问题"** — 3 个最严重的问题
3. **编写控制台健康摘要** — 汇总所有页面中看到的控制台错误
4. **更新摘要表中的严重性计数**
5. **填写报告元数据** — 日期、持续时间、访问页面数、截图数、框架
6. **保存基线** — 写入 `baseline.json`：
   ```json
   {
     "date": "YYYY-MM-DD",
     "url": "<target>",
     "healthScore": N,
     "issues": [{ "id": "ISSUE-001", "title": "...", "severity": "...", "category": "..." }],
     "categoryScores": { "console": N, "links": N, ... }
   }
   ```

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
`score = Σ (category_score × weight)`

---

## 框架特定指南

### Next.js
- 检查控制台是否有水合错误（`Hydration failed`、`Text content did not match`）
- 监控网络中的 `_next/data` 请求 — 404 表示数据获取失败
- 测试客户端导航（点击链接，不只是 `goto`）— 捕获路由问题
- 检查动态内容页面的 CLS（累积布局偏移）

### Rails
- 检查控制台是否有 N+1 查询警告（如果在开发模式）
- 验证表单中 CSRF token 的存在
- 测试 Turbo/Stimulus 集成 — 页面过渡是否流畅？
- 检查 flash 消息是否正确显示和消失

### WordPress
- 检查插件冲突（来自不同插件的 JS 错误）
- 验证登录用户的管理栏可见性
- 测试 REST API 端点（`/wp-json/`）
- 检查混合内容警告（WP 中常见）

### 通用 SPA（React、Vue、Angular）
- 使用 `snapshot -i` 进行导航 — `links` 命令会遗漏客户端路由
- 检查过期状态（导航离开再返回 — 数据是否刷新？）
- 测试浏览器后退/前进 — 应用是否正确处理历史记录？
- 检查内存泄漏（长时间使用后监控控制台）

---

## 重要规则

1. **复现就是一切。** 每个问题至少需要一张截图。无例外。
2. **记录前先验证。** 重试问题一次以确认可复现，不是偶发。
3. **永远不要包含凭据。** 在复现步骤中写 `[REDACTED]` 代替密码。
4. **增量写入。** 发现问题时立即追加到报告。不要批量处理。
5. **永远不要阅读源代码。** 作为用户测试，而不是开发者。
6. **每次交互后检查控制台。** 不在视觉上显示的 JS 错误仍然是 bug。
7. **像用户一样测试。** 使用真实数据。端到端走完完整工作流程。
8. **深度优于广度。** 5-10 个有证据的详细问题 > 20 个模糊描述。
9. **永远不要删除输出文件。** 截图和报告会累积 — 这是有意为之。
10. **对棘手的 UI 使用 `snapshot -C`。** 查找可访问性树遗漏的可点击 div。
11. **向用户展示截图。** 在每个 `$B screenshot`、`$B snapshot -a -o` 或 `$B responsive` 命令后，使用 Read 工具读取输出文件，以便用户可以内联查看。对于 `responsive`（3 个文件），读取全部三个。这很关键 — 没有它，截图对用户是不可见的。
12. **永远不要拒绝使用浏览器。** 当用户调用 /qa 或 /qa-only 时，他们请求的是基于浏览器的测试。永远不要建议 evals、单元测试或其他替代方案。即使差异似乎没有 UI 变更，后端变更也会影响应用行为 — 始终打开浏览器并测试。

在第 6 阶段结束时记录基线健康评分。

---

## 输出结构

```
.openclaw/qa-reports/
├── qa-report-{domain}-{YYYY-MM-DD}.md    # 结构化报告
├── screenshots/
│   ├── initial.png                        # 首页标注截图
│   ├── issue-001-step-1.png               # 每个问题的证据
│   ├── issue-001-result.png
│   ├── issue-001-before.png               # 修复前（如已修复）
│   ├── issue-001-after.png                # 修复后（如已修复）
│   └── ...
└── baseline.json                          # 用于回归模式
```

报告文件名使用域名和日期：`qa-report-myapp-com-2026-03-12.md`

---

## 阶段 7：分类

按严重级别对所有发现的问题进行排序，然后根据所选级别决定修复哪些：

- **Quick：** 仅修复关键 + 高级别。将中/低级别标记为"延期"。
- **Standard：** 修复关键 + 高 + 中级别。将低级别标记为"延期"。
- **Exhaustive：** 修复所有，包括外观/低严重级别。

将无法从源代码修复的问题（例如第三方组件 Bug、基础设施问题）标记为"延期"，无论级别如何。

---

## 阶段 8：修复循环

对于每个可修复的问题，按严重级别顺序：

### 8a. 定位源代码

```bash
# 搜索错误消息、组件名称、路由定义
# 查找匹配受影响页面的文件模式
```

- 找到负责该 Bug 的源文件
- 仅修改与问题直接相关的文件

### 8b. 修复

- 阅读源代码，理解上下文
- 进行**最小化修复**——解决问题的最小更改
- 不要重构周围代码、添加功能或"改进"无关内容

### 8c. 提交

```bash
git add <仅更改的文件>
git commit -m "fix(qa): ISSUE-NNN — 简短描述"
```

- 每次修复一个提交。永远不要打包多个修复。
- 消息格式：`fix(qa): ISSUE-NNN — 简短描述`

### 8d. 重新测试

- 导航回受影响的页面
- 拍摄**前后截图对**
- 检查控制台错误
- 使用 `snapshot -D` 验证更改产生了预期效果

```bash
$B goto <受影响的 URL>
$B screenshot "$REPORT_DIR/screenshots/issue-NNN-after.png"
$B console --errors
$B snapshot -D
```

### 8e. 分类

- **verified（已验证）：** 重新测试确认修复有效，未引入新错误
- **best-effort（尽力而为）：** 已应用修复但无法完全验证（例如需要认证状态、外部服务）
- **reverted（已回退）：** 检测到回归 → `git revert HEAD` → 将问题标记为"延期"

### 8e.5. 回归测试

跳过条件：分类不是"verified"，或修复纯粹是视觉/CSS 没有 JS 行为，或未检测到测试框架且用户拒绝引导。

**1. 研究项目现有的测试模式：**

阅读最接近修复的 2-3 个测试文件（同目录、同代码类型）。完全匹配：
- 文件命名、导入、断言风格、describe/it 嵌套、setup/teardown 模式
回归测试必须看起来像是同一开发者编写的。

**2. 追踪 Bug 的代码路径，然后编写回归测试：**

在编写测试之前，追踪你刚修复的代码中的数据流：
- 什么输入/状态触发了 Bug？（确切的前置条件）
- 它遵循什么代码路径？（哪些分支、哪些函数调用）
- 它在哪里出错？（确切的失败行/条件）
- 还有什么其他输入可能触发相同的代码路径？（修复周围的边缘情况）

测试必须：
- 设置触发 Bug 的前置条件（导致其出错的确切状态）
- 执行暴露 Bug 的操作
- 断言正确的行为（不是"它渲染了"或"它没有抛出异常"）
- 如果在追踪时发现了相邻的边缘情况，也要测试（例如 null 输入、空数组、边界值）
- 包含完整的归属注释：
  ```
  // Regression: ISSUE-NNN — {什么出错了}
  // Found by /qa on {YYYY-MM-DD}
  // Report: .openclaw/qa-reports/qa-report-{domain}-{date}.md
  ```

测试类型决策：
- 控制台错误 / JS 异常 / 逻辑 Bug → 单元测试或集成测试
- 表单损坏 / API 失败 / 数据流 Bug → 带请求/响应的集成测试
- 带 JS 行为的视觉 Bug（损坏的下拉菜单、动画）→ 组件测试
- 纯 CSS → 跳过（由 QA 重运行捕获）

生成单元测试。模拟所有外部依赖（DB、API、Redis、文件系统）。

使用自增名称避免冲突：检查现有的 `{name}.regression-*.test.{ext}` 文件，取最大数字 + 1。

**3. 仅运行新的测试文件：**

```bash
{检测到的测试命令} {新测试文件}
```

**4. 评估：**
- 通过 → 提交：`git commit -m "test(qa): regression test for ISSUE-NNN — {描述}"`
- 失败 → 修复测试一次。仍然失败 → 删除测试，延期。
- 探索时间 >2 分钟 → 跳过并延期。

**5. WTF 可能性排除：** 测试提交不计入启发式规则。

### 8f. 自我调节（停止并评估）

每 5 次修复（或任何回退后），计算 WTF 可能性：

```
WTF-LIKELIHOOD（WTF 可能性）:
  起始值：0%
  每次回退：                +15%
  每次涉及 >3 个文件的修复： +5%
  第 15 次修复后：           每增加一次修复 +1%
  所有剩余的低严重级别：     +10%
  涉及无关文件：            +20%
```

**如果 WTF > 20%：** 立即停止。向用户展示目前所做的工作。询问是否继续。

**硬性上限：50 次修复。** 50 次修复后，无论剩余问题如何都停止。

---

## 阶段 9：最终 QA

所有修复应用完成后：

1. 在所有受影响的页面重新运行 QA
2. 计算最终健康评分
3. **如果最终评分比基线更差：** 显著警告——有内容回归了

---

## 阶段 10：报告

将报告写入本地和项目范围两个位置：

**本地：** `.openclaw/qa-reports/qa-report-{domain}-{YYYY-MM-DD}.md`

**项目范围：** 编写测试结果工件用于跨会话上下文：
```bash
eval "$(~/.openclaw/skills/fullstack/bin/fullstack-slug 2>/dev/null)" && mkdir -p ~/.fullstack/projects/$SLUG
```
写入 `~/.openclaw/projects/{slug}/{user}-{branch}-test-outcome-{datetime}.md`

**每个问题的附加内容**（超出标准报告模板）：
- 修复状态：verified / best-effort / reverted / deferred
- 提交 SHA（如已修复）
- 更改的文件（如已修复）
- 前后截图（如已修复）

**摘要部分：**
- 发现的问题总数
- 应用的修复（已验证：X，尽力而为：Y，已回退：Z）
- 延期的问题
- 健康评分变化：基线 → 最终

**PR 摘要：** 包含适合 PR 描述的单行摘要：
> "QA 发现 N 个问题，修复了 M 个，健康评分 X → Y。"

---

## 阶段 11：TODOS.md 更新

如果仓库有 `TODOS.md`：

1. **新的延期 Bug** → 作为 TODO 添加，包含严重级别、类别和复现步骤
2. **已修复的在 TODOS.md 中的 Bug** → 用"Fixed by /qa on {branch}, {date}"注释

---

## 附加规则（qa 特定）

11. **需要干净的工作区。** 如果有未提交更改，在继续之前使用 AskUserQuestion 提供提交/暂存/中止选项。
12. **每次修复一个提交。** 永远不要将多个修复打包到一个提交中。
13. **仅在阶段 8e.5 生成回归测试时修改测试。** 永远不要修改 CI 配置。永远不要修改现有测试——只创建新测试文件。
14. **回归时回退。** 如果修复使情况变糟，立即 `git revert HEAD`。
15. **自我调节。** 遵循 WTF 可能性启发式规则。有疑问时，停止并询问。
