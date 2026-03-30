---
name: ship
version: 1.0.0
description: |
  发布工作流：检测并合并基础分支，运行测试，审查差异，更新版本号，更新变更日志，提交，推送，创建 PR。当被要求"发布"、"部署"、"推送到主分支"、"创建 PR"或"合并并推送"时使用。
  当用户说代码已准备好或询问部署时主动建议。
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
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

# 发布：全自动化发布工作流

你正在运行 `/ship` 工作流。这是一个**非交互式、全自动化**的工作流。不要在任何步骤请求确认。用户说 `/ship` 意味着执行它。直接运行到最后输出 PR URL。

**仅在以下情况停止：**
- 在基础分支上（中止）
- 无法自动解决的合并冲突（停止，显示冲突）
- 分支内测试失败（预先存在的失败会被分类处理，不会自动阻塞）
- 预发布审查发现需要用户判断的询问项
- 需要 MINOR 或 MAJOR 版本升级（询问 — 见步骤 4）
- 需要用户决策的 Greptile 审查评论（复杂修复、误报）
- TODOS.md 缺失且用户想创建一个（询问 — 见步骤 5.5）
- TODOS.md 混乱且用户想重新整理（询问 — 见步骤 5.5）

**永不停止：**
- 未提交的更改（始终包含它们）
- 版本升级选择（自动选择 MICRO 或 PATCH — 见步骤 4）
- 变更日志内容（从差异自动生成）
- 提交消息审批（自动提交）
- 多文件变更集（自动拆分为可二分查找的提交）
- TODOS.md 已完成项检测（自动标记）
- 可自动修复的审查发现（死代码、N+1、过时注释 — 自动修复）
- 测试覆盖缺口（自动生成并提交，或在 PR 正文中标记）

---

## 步骤 1：预检

1. 检查当前分支。如果在基础分支或仓库的默认分支上，**中止**："你在基础分支上。请从功能分支发布。"

2. 运行 `git status`（永不使用 `-uall`）。未提交的更改始终包含 — 无需询问。

3. 运行 `git diff <base>...HEAD --stat` 和 `git log <base>..HEAD --oneline` 以了解要发布的内容。

4. 检查审查准备状态：

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

如果工程审查不是 "CLEAR"：

1. **检查此分支上是否存在先前的覆盖：**
   ```bash
   eval "$(~/.openclaw/skills/fullstack/bin/fullstack-slug 2>/dev/null)"
   grep '"skill":"ship-review-override"' ~/.openclaw/projects/$SLUG/$BRANCH-reviews.jsonl 2>/dev/null || echo "NO_OVERRIDE"
   ```
   如果存在覆盖，显示仪表板并注明"审查关卡先前已接受 — 继续。"不要再次询问。

2. **如果不存在覆盖，** 使用 AskUserQuestion：
   - 显示工程审查缺失或有未解决的问题
   - 建议：如果更改明显微不足道（< 20 行、错别字修复、仅配置），选择 C；对于较大更改选择 B
   - 选项：A) 仍然发布  B) 中止 — 先运行 /review 或 /plan-eng-review  C) 更改太小不需要工程审查
   - 如果 CEO 审查缺失，作为信息提及（"CEO 审查未运行 — 产品更改建议运行"）但不阻塞
   - 对于设计审查：运行 `source <(~/.openclaw/skills/fullstack/bin/fullstack-diff-scope <base> 2>/dev/null)`。如果 `SCOPE_FRONTEND=true` 且仪表板中不存在设计审查（plan-design-review 或 design-review-lite），提及："设计审查未运行 — 此 PR 更改了前端代码。轻量级设计检查将在步骤 3.5 中自动运行，但考虑在实现后运行 /design-review 进行完整的视觉审计。"仍然永不阻塞。

3. **如果用户选择 A 或 C，** 持久化决策以便此分支上未来的 `/ship` 运行跳过关卡：
   ```bash
   eval "$(~/.openclaw/skills/fullstack/bin/fullstack-slug 2>/dev/null)"
   echo '{"skill":"ship-review-override","timestamp":"'"$(date -u +%Y-%m-%dT%H:%M:%SZ)"'","decision":"USER_CHOICE"}' >> ~/.openclaw/projects/$SLUG/$BRANCH-reviews.jsonl
   ```
   将 USER_CHOICE 替换为 "ship_anyway" 或 "not_relevant"。

---

## 步骤 2：合并基础分支（测试前）

获取并将基础分支合并到功能分支，以便测试针对合并后的状态运行：

```bash
git fetch origin <base> && git merge origin/<base> --no-edit
```

**如果存在合并冲突：** 如果冲突简单（VERSION、schema.rb、CHANGELOG 排序），尝试自动解决。如果冲突复杂或模糊，**停止**并显示它们。

**如果已经是最新的：** 静默继续。

---

## 步骤 2.5：测试框架引导

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

---

## 步骤 3：运行测试（在合并后的代码上）

**不要运行 `RAILS_ENV=test bin/rails db:migrate`** — `bin/test-lane` 已经在内部调用
`db:test:prepare`，它将模式加载到正确的测试通道数据库。
在没有 INSTANCE 的情况下运行裸测试迁移会遇到孤儿数据库并损坏 structure.sql。

并行运行两个测试套件：

```bash
bin/test-lane 2>&1 | tee /tmp/ship_tests.txt &
npm run test 2>&1 | tee /tmp/ship_vitest.txt &
wait
```

两者完成后，读取输出文件并检查通过/失败。

**如果任何测试失败：** 不要立即停止。应用测试失败所有权分类：

## 测试失败归属分类

当测试失败时，不要立即停止。首先确定归属：

### 步骤 T1：对每个失败进行分类

对于每个失败的测试：

1. **获取此分支上更改的文件：**
   ```bash
   git diff origin/<base>...HEAD --name-only
   ```

2. **对失败进行分类：**
   - **分支内** 如果：失败的测试文件本身在此分支上被修改，或者测试输出引用了在此分支上更改的代码，或者你可以将失败追溯到分支差异中的更改。
   - **可能已存在** 如果：测试文件及其测试的代码都未在此分支上修改，并且失败与你识别的任何分支更改无关。
   - **当模糊时，默认为分支内。** 阻止开发者比让损坏的测试发布更安全。只有在有信心时才分类为已存在。

   此分类是启发式的 — 使用你的判断阅读差异和测试输出。你没有程序化的依赖图。

### 步骤 T2：处理分支内失败

**停止。** 这些是你的失败。展示它们，不要继续。开发者必须在发布前修复自己损坏的测试。

### 步骤 T3：处理已存在的失败

检查前置操作输出中的 `REPO_MODE`。

**如果 REPO_MODE 为 `solo`：**

使用 AskUserQuestion：

> 这些测试失败似乎是已存在的（不是由你的分支更改引起的）：
>
> [列出每个失败，包含 file:line 和简要错误描述]
>
> 由于这是独立仓库，你是唯一会修复这些问题的人。
>
> 推荐：选择 A — 趁上下文新鲜时立即修复。完整性：9/10。
> A) 立即调查并修复（人工：~2-4h / CC：~15min）— 完整性：10/10
> B) 添加为 P0 TODO — 此分支落地后修复 — 完整性：7/10
> C) 跳过 — 我知道这个问题，仍然发布 — 完整性：3/10

**如果 REPO_MODE 为 `collaborative` 或 `unknown`：**

使用 AskUserQuestion：

> 这些测试失败似乎是已存在的（不是由你的分支更改引起的）：
>
> [列出每个失败，包含 file:line 和简要错误描述]
>
> 这是协作仓库 — 这些可能是其他人的责任。
>
> 推荐：选择 B — 分配给破坏它的人，让正确的人修复。完整性：9/10。
> A) 无论如何立即调查并修复 — 完整性：10/10
> B) 归咎 + 分配 GitHub issue 给作者 — 完整性：9/10
> C) 添加为 P0 TODO — 完整性：7/10
> D) 跳过 — 仍然发布 — 完整性：3/10

### 步骤 T4：执行选择的操作

**如果"立即调查并修复"：**
- 切换到 /investigate 心态：先找根本原因，然后最小修复。
- 修复已存在的失败。
- 单独提交修复，与分支更改分开：`git commit -m "fix: <test-file> 中已存在的测试失败"`
- 继续工作流。

**如果"添加为 P0 TODO"：**
- 如果 `TODOS.md` 存在，按照 `review/TODOS-format.md`（或 `.openclaw/skills/fullstack/review/TODOS-format.md`）中的格式添加条目。
- 如果 `TODOS.md` 不存在，创建它并添加标准头部和条目。
- 条目应包括：标题、错误输出、在哪个分支上发现的，以及优先级 P0。
- 继续工作流 — 将已存在的失败视为非阻塞。

**如果"归咎 + 分配 GitHub issue"（仅协作模式）：**
- 找到可能破坏它的人。同时检查测试文件和它测试的生产代码：
  ```bash
  # 谁最后修改了失败的测试？
  git log --format="%an (%ae)" -1 -- <failing-test-file>
  # 谁最后修改了测试覆盖的生产代码？（通常是实际的破坏者）
  git log --format="%an (%ae)" -1 -- <source-file-under-test>
  ```
  如果是不同的人，优先选择生产代码作者 — 他们可能引入了回归。
- 创建分配给该人的 GitHub issue：
  ```bash
  gh issue create \
    --title "已存在的测试失败：<test-name>" \
    --body "在分支 <current-branch> 上发现失败。失败是已存在的。\n\n**错误：**\n```\n<前 10 行>\n```\n\n**最后修改者：** <author>\n**发现者：** fullstack /ship 于 <date>" \
    --assignee "<github-username>"
  ```
- 如果 `gh` 不可用或 `--assignee` 失败（用户不在组织中），创建没有分配者的 issue 并在正文中注明谁应该查看。
- 继续工作流。

**如果"跳过"：**
- 继续工作流。
- 在输出中注明："已存在的测试失败已跳过：<test-name>"

**分类后：** 如果任何分支内失败仍未修复，**停止**。不要继续。如果所有失败都是预先存在的并已处理（修复、添加 TODO、分配或跳过），继续到步骤 3.25。

**如果全部通过：** 静默继续 — 只需简要记录计数。

---

## 步骤 3.25：评估套件（条件性）

当提示词相关文件更改时，评估是强制性的。如果差异中没有提示词文件，完全跳过此步骤。

**1. 检查差异是否触及提示词相关文件：**

```bash
git diff origin/<base> --name-only
```

匹配这些模式（来自 CLAUDE.md）：
- `app/services/*_prompt_builder.rb`
- `app/services/*_generation_service.rb`、`*_writer_service.rb`、`*_designer_service.rb`
- `app/services/*_evaluator.rb`、`*_scorer.rb`、`*_classifier_service.rb`、`*_analyzer.rb`
- `app/services/concerns/*voice*.rb`、`*writing*.rb`、`*prompt*.rb`、`*token*.rb`
- `app/services/chat_tools/*.rb`、`app/services/x_thread_tools/*.rb`
- `config/system_prompts/*.txt`
- `test/evals/**/*`（评估基础设施更改影响所有套件）

**如果没有匹配：** 打印"没有提示词相关文件更改 — 跳过评估。"并继续到步骤 3.5。

**2. 识别受影响的评估套件：**

每个评估运行器（`test/evals/*_eval_runner.rb`）声明 `PROMPT_SOURCE_FILES` 列出哪些源文件影响它。使用 grep 查找哪些套件匹配更改的文件：

```bash
grep -l "changed_file_basename" test/evals/*_eval_runner.rb
```

映射运行器 → 测试文件：`post_generation_eval_runner.rb` → `post_generation_eval_test.rb`。

**特殊情况：**
- 对 `test/evals/judges/*.rb`、`test/evals/support/*.rb` 或 `test/evals/fixtures/` 的更改影响所有使用这些评判器/支持文件的套件。检查评估测试文件中的导入以确定哪些。
- 对 `config/system_prompts/*.txt` 的更改 — 在评估运行器中 grep 提示词文件名以查找受影响的套件。
- 如果不确定哪些套件受影响，运行所有可能受影响的套件。过度测试比错过回归更好。

**3. 在 `EVAL_JUDGE_TIER=full` 下运行受影响的套件：**

`/ship` 是预合并关卡，所以始终使用完整层级（Sonnet 结构 + Opus 人设评判器）。

```bash
EVAL_JUDGE_TIER=full EVAL_VERBOSE=1 bin/test-lane --eval test/evals/<suite>_eval_test.rb 2>&1 | tee /tmp/ship_evals.txt
```

如果需要运行多个套件，按顺序运行（每个需要一个测试通道）。如果第一个套件失败，立即停止 — 不要在剩余套件上浪费 API 成本。

**4. 检查结果：**

- **如果任何评估失败：** 显示失败、成本仪表板，并**停止**。不要继续。
- **如果全部通过：** 记录通过计数和成本。继续到步骤 3.5。

**5. 保存评估输出** — 在 PR 正文中包含评估结果和成本仪表板（步骤 8）。

**层级参考（供参考 — /ship 始终使用 `full`）：**
| 层级 | 何时使用 | 速度（缓存） | 成本 |
|------|----------|--------------|------|
| `fast` (Haiku) | 开发迭代、冒烟测试 | ~5秒（快14倍） | ~$0.07/运行 |
| `standard` (Sonnet) | 默认开发、`bin/test-lane --eval` | ~17秒（快4倍） | ~$0.37/运行 |
| `full` (Opus 人设) | **`/ship` 和预合并** | ~72秒（基准） | ~$1.27/运行 |

---

## 步骤 3.4：测试覆盖审计

100% coverage is the goal — every untested path is a path where bugs hide and vibe coding becomes yolo coding. Evaluate what was ACTUALLY coded (from the diff), not what was planned.

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

3. **If no framework detected:** falls through to the Test Framework Bootstrap step (Step 2.5) which handles full setup.

**0. Before/after test count:**

```bash
# Count test files before any generation
find . -name '*.test.*' -o -name '*.spec.*' -o -name '*_test.*' -o -name '*_spec.*' | grep -v node_modules | wc -l
```

Store this number for the PR body.

**1. Trace every codepath changed** using `git diff origin/<base>...HEAD`:

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

**2. Map user flows, interactions, and error states:**

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

**3. Check each branch against existing tests:**

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

**4. Output ASCII coverage diagram:**

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

**Fast path:** All paths covered → "Step 3.4: All new code paths have test coverage ✓" Continue.

**5. Generate tests for uncovered paths:**

If test framework detected (or bootstrapped in Step 2.5):
- Prioritize error handlers and edge cases first (happy paths are more likely already tested)
- Read 2-3 existing test files to match conventions exactly
- Generate unit tests. Mock all external dependencies (DB, API, Redis).
- For paths marked [→E2E]: generate integration/E2E tests using the project's E2E framework (Playwright, Cypress, Capybara, etc.)
- For paths marked [→EVAL]: generate eval tests using the project's eval framework, or flag for manual eval if none exists
- Write tests that exercise the specific uncovered path with real assertions
- Run each test. Passes → commit as `test: coverage for {feature}`
- Fails → fix once. Still fails → revert, note gap in diagram.

Caps: 30 code paths max, 20 tests generated max (code + user flow combined), 2-min per-test exploration cap.

If no test framework AND user declined bootstrap → diagram only, no generation. Note: "Test generation skipped — no test framework configured."

**Diff is test-only changes:** Skip Step 3.4 entirely: "No new application code paths to audit."

**6. After-count and coverage summary:**

```bash
# Count test files after generation
find . -name '*.test.*' -o -name '*.spec.*' -o -name '*_test.*' -o -name '*_spec.*' | grep -v node_modules | wc -l
```

For PR body: `Tests: {before} → {after} (+{delta} new)`
Coverage line: `Test Coverage Audit: N new code paths. M covered (X%). K tests generated, J committed.`

### Test Plan Artifact

After producing the coverage diagram, write a test plan artifact so `/qa` and `/qa-only` can consume it:

```bash
eval "$(~/.openclaw/skills/fullstack/bin/fullstack-slug 2>/dev/null)" && mkdir -p ~/.fullstack/projects/$SLUG
USER=$(whoami)
DATETIME=$(date +%Y%m%d-%H%M%S)
```

Write to `~/.fullstack/projects/{slug}/{user}-{branch}-ship-test-plan-{datetime}.md`:

```markdown
# Test Plan
Generated by /ship on {date}
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

---

## 步骤 3.5：预发布审查

审查差异中的测试无法捕获的结构性问题。

1. 读取 `.openclaw/skills/fullstack/review/checklist.md`。如果文件无法读取，**停止**并报告错误。

2. 运行 `git diff origin/<base>` 获取完整差异（针对新获取的基础分支的功能更改范围）。

3. 分两轮应用审查清单：
   - **第一轮（关键）：** SQL 与数据安全、LLM 输出信任边界
   - **第二轮（信息性）：** 所有剩余类别

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

   将任何设计发现与代码审查发现一起包含。它们遵循下面的修复优先流程。

4. **根据 checklist.md 中的修复优先启发式将每个发现分类为自动修复或询问。** 关键发现倾向于询问；信息性倾向于自动修复。

5. **自动修复所有自动修复项。** 应用每个修复。每个修复输出一行：
   `[自动修复] [文件:行] 问题 → 你做了什么`

6. **如果询问项仍然存在，** 在一个 AskUserQuestion 中呈现它们：
   - 列出每个项的编号、严重性、问题、建议修复
   - 每项选项：A) 修复  B) 跳过
   - 总体建议
   - 如果询问项 ≤ 3 个，可以改用单独的 AskUserQuestion 调用

7. **所有修复完成后（自动 + 用户批准）：**
   - 如果应用了任何修复：按名称提交修复的文件（`git add <fixed-files> && git commit -m "fix: 预发布审查修复"`），然后**停止**并告诉用户再次运行 `/ship` 以重新测试。
   - 如果没有应用修复（所有询问项都跳过，或未发现问题）：继续到步骤 4。

8. 输出摘要：`预发布审查：N 个问题 — M 个自动修复，K 个询问（J 个修复，L 个跳过）`

   如果未发现问题：`预发布审查：未发现问题。`

保存审查输出 — 它将进入步骤 8 的 PR 正文。

---

## 步骤 3.75：处理 Greptile 审查评论（如果 PR 存在）

读取 `.openclaw/skills/fullstack/review/greptile-triage.md` 并遵循获取、过滤、分类和**升级检测**步骤。

**如果 PR 不存在、`gh` 失败、API 返回错误或没有 Greptile 评论：** 静默跳过此步骤。继续到步骤 4。

**如果找到 Greptile 评论：**

在输出中包含 Greptile 摘要：`+ N 条 Greptile 评论（X 有效，Y 已修复，Z 误报）`

在回复任何评论之前，运行 greptile-triage.md 中的**升级检测**算法以确定使用第一层级（友好）还是第二层级（坚定）回复模板。

对于每个分类的评论：

**有效且可操作：** 使用 AskUserQuestion：
- 评论（文件:行 或 [顶层] + 正文摘要 + 永久链接 URL）
- `建议：选择 A 因为 [一行原因]`
- 选项：A) 现在修复，B) 确认并仍然发布，C) 这是误报
- 如果用户选择 A：应用修复，提交修复的文件（`git add <fixed-files> && git commit -m "fix: 处理 Greptile 审查 — <简要描述>"`），使用 greptile-triage.md 中的**修复回复模板**回复（包含内联差异 + 解释），并保存到项目级和全局 greptile-history（类型：fix）。
- 如果用户选择 C：使用 greptile-triage.md 中的**误报回复模板**回复（包含证据 + 建议重新排名），保存到项目级和全局 greptile-history（类型：fp）。

**有效但已修复：** 使用 greptile-triage.md 中的**已修复回复模板**回复 — 无需 AskUserQuestion：
- 包含做了什么和修复提交 SHA
- 保存到项目级和全局 greptile-history（类型：already-fixed）

**误报：** 使用 AskUserQuestion：
- 显示评论和你认为它错误的原因（文件:行 或 [顶层] + 正文摘要 + 永久链接 URL）
- 选项：
  - A) 向 Greptile 解释误报（如果明显错误则推荐）
  - B) 仍然修复（如果微不足道）
  - C) 静默忽略
- 如果用户选择 A：使用 greptile-triage.md 中的**误报回复模板**回复（包含证据 + 建议重新排名），保存到项目级和全局 greptile-history（类型：fp）

**已抑制：** 静默跳过 — 这些是先前分类中已知的误报。

**所有评论解决后：** 如果应用了任何修复，步骤 3 的测试现在已过时。**重新运行测试**（步骤 3）后再继续到步骤 4。如果未应用修复，继续到步骤 4。

---

## Step 3.8: Adversarial review (auto-scaled)

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

If A: address the findings. After fixing, re-run tests (Step 3) since code has changed. Re-run `codex review` to verify.

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

## 步骤 4：版本升级（自动决策）

1. 读取当前 `VERSION` 文件（4 位格式：`MAJOR.MINOR.PATCH.MICRO`）

2. **根据差异自动决定升级级别：**
   - 统计更改行数（`git diff origin/<base>...HEAD --stat | tail -1`）
   - **MICRO**（第 4 位）：< 50 行更改、微不足道的调整、错别字、配置
   - **PATCH**（第 3 位）：50+ 行更改、错误修复、中小型功能
   - **MINOR**（第 2 位）：**询问用户** — 仅用于主要功能或重大架构更改
   - **MAJOR**（第 1 位）：**询问用户** — 仅用于里程碑或破坏性更改

3. 计算新版本：
   - 升级某位数字会将其右侧所有数字重置为 0
   - 示例：`0.19.1.0` + PATCH → `0.19.2.0`

4. 将新版本写入 `VERSION` 文件。

---

## 步骤 5：变更日志（自动生成）

1. 读取 `CHANGELOG.md` 标题以了解格式。

2. 从分支上的**所有提交**自动生成条目（不只是最近的）：
   - 使用 `git log <base>..HEAD --oneline` 查看要发布的每个提交
   - 使用 `git diff <base>...HEAD` 查看针对基础分支的完整差异
   - 变更日志条目必须全面覆盖进入 PR 的所有更改
   - 如果分支上现有的变更日志条目已覆盖某些提交，用新版本的一个统一条目替换它们
   - 将更改分类到适用的部分：
     - `### 新增` — 新功能
     - `### 变更` — 现有功能的更改
     - `### 修复` — 错误修复
     - `### 移除` — 移除的功能
   - 编写简洁、描述性的要点
   - 在文件标题后插入（第 5 行），日期为今天
   - 格式：`## [X.Y.Z.W] - YYYY-MM-DD`

**不要要求用户描述更改。** 从差异和提交历史推断。

---

## 步骤 5.5：TODOS.md（自动更新）

将项目的 TODOS.md 与要发布的更改交叉引用。自动标记已完成项；仅在文件缺失或混乱时提示。

读取 `.openclaw/skills/fullstack/review/TODOS-format.md` 获取规范格式参考。

**1. 检查 TODOS.md 是否存在**于仓库根目录。

**如果 TODOS.md 不存在：** 使用 AskUserQuestion：
- 消息："FullStack 建议维护一个按技能/组件组织的 TODOS.md，然后按优先级（顶部 P0 到 P4，底部已完成）。有关完整格式，请参阅 TODOS-format.md。你想创建一个吗？"
- 选项：A) 现在创建，B) 暂时跳过
- 如果 A：创建包含骨架的 `TODOS.md`（# TODOS 标题 + ## 已完成 部分）。继续到步骤 3。
- 如果 B：跳过步骤 5.5 的其余部分。继续到步骤 6。

**2. 检查结构和组织：**

读取 TODOS.md 并验证它遵循推荐的结构：
- 项目分组在 `## <技能/组件>` 标题下
- 每个项目有 `**优先级：**` 字段，值为 P0-P4
- 底部有 `## 已完成` 部分

**如果混乱**（缺少优先级字段、没有组件分组、没有已完成部分）：使用 AskUserQuestion：
- 消息："TODOS.md 不遵循推荐的结构（技能/组件分组、P0-P4 优先级、已完成部分）。你想重新整理吗？"
- 选项：A) 现在重新整理（推荐），B) 保持原样
- 如果 A：按照 TODOS-format.md 原地重新整理。保留所有内容 — 仅重构，永不删除项目。
- 如果 B：不重构继续到步骤 3。

**3. 检测已完成的 TODO：**

此步骤完全自动 — 无用户交互。

使用早期步骤中已收集的差异和提交历史：
- `git diff <base>...HEAD`（针对基础分支的完整差异）
- `git log <base>..HEAD --oneline`（要发布的所有提交）

对于每个 TODO 项目，检查此 PR 中的更改是否完成它：
- 将提交消息与 TODO 标题和描述匹配
- 检查 TODO 中引用的文件是否出现在差异中
- 检查 TODO 描述的工作是否与功能更改匹配

**要保守：** 只有在差异中有明确证据时才将 TODO 标记为已完成。如果不确定，保持原样。

**4. 移动已完成项目**到底部的 `## 已完成` 部分。追加：`**完成于：** vX.Y.Z (YYYY-MM-DD)`

**5. 输出摘要：**
- `TODOS.md：N 个项目标记为已完成（项目1、项目2、...）。M 个项目剩余。`
- 或：`TODOS.md：未检测到已完成项目。M 个项目剩余。`
- 或：`TODOS.md：已创建。` / `TODOS.md：已重新整理。`

**6. 防御性：** 如果无法写入 TODOS.md（权限错误、磁盘已满），警告用户并继续。永不因 TODOS 失败停止发布工作流。

保存此摘要 — 它将进入步骤 8 的 PR 正文。

---

## 步骤 6：提交（可二分查找的块）

**目标：** 创建适合 `git bisect` 并帮助 LLM 理解更改内容的小型、逻辑提交。

1. 分析差异并将更改分组为逻辑提交。每个提交应代表**一个连贯的更改** — 不是单个文件，而是一个逻辑单元。

2. **提交顺序**（较早的提交在前）：
   - **基础设施：** 迁移、配置更改、路由添加
   - **模型和服务：** 新模型、服务、concerns（及其测试）
   - **控制器和视图：** 控制器、视图、JS/React 组件（及其测试）
   - **VERSION + CHANGELOG + TODOS.md：** 始终在最终提交中

3. **拆分规则：**
   - 模型及其测试文件放在同一提交中
   - 服务及其测试文件放在同一提交中
   - 控制器、其视图和测试放在同一提交中
   - 迁移是自己的提交（或与它们支持的模型分组）
   - 配置/路由更改可以与它们启用的功能分组
   - 如果总差异很小（< 50 行跨 < 4 个文件），单个提交即可

4. **每个提交必须独立有效** — 没有损坏的导入，没有对尚不存在代码的引用。按依赖关系优先排序提交。

5. 编写每个提交消息：
   - 第一行：`<类型>: <摘要>`（类型 = feat/fix/chore/refactor/docs）
   - 正文：简要描述此提交包含的内容
   - 只有**最终提交**（VERSION + CHANGELOG）获得版本标签和共同作者尾注：

```bash
git commit -m "$(cat <<'EOF'
chore: 更新版本号和变更日志 (vX.Y.Z.W)

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## 步骤 6.5：验证关卡

**铁律：没有新鲜验证证据不得声称完成。**

推送前，如果步骤 4-6 期间代码更改，重新验证：

1. **测试验证：** 如果步骤 3 测试运行后有任何代码更改（审查发现的修复、CHANGELOG 编辑不算），重新运行测试套件。粘贴新鲜输出。步骤 3 的过时输出不可接受。

2. **构建验证：** 如果项目有构建步骤，运行它。粘贴输出。

3. **防止合理化：**
   - "应该可以了" → 运行它。
   - "我有信心" → 信心不是证据。
   - "我之前测试过了" → 那时代码已更改。再次测试。
   - "这是个微不足道的更改" → 微不足道的更改会破坏生产环境。

**如果测试在此失败：** 停止。不要推送。修复问题并返回步骤 3。

在没有验证的情况下声称工作完成是不诚实，不是效率。

---

## 步骤 7：推送

推送到远程并设置上游跟踪：

```bash
git push -u origin <branch-name>
```

---

## 步骤 8：创建 PR

使用 `gh` 创建拉取请求：

```bash
gh pr create --base <base> --title "<类型>: <摘要>" --body "$(cat <<'EOF'
## 概要
<来自 CHANGELOG 的要点>

## 测试覆盖
<步骤 3.4 的覆盖图，或"所有新代码路径都有测试覆盖。">
<如果步骤 3.4 运行："测试：{之前} → {之后}（+{增量} 新增）">

## 预发布审查
<步骤 3.5 代码审查的发现，或"未发现问题。">

## 设计审查
<如果设计审查运行："设计审查（轻量）：N 个发现 — M 个自动修复，K 个跳过。AI 废话：干净/N 个问题。">
<如果没有前端文件更改："未更改前端文件 — 跳过设计审查。">

## 评估结果
<如果评估运行：套件名称、通过/失败计数、成本仪表板摘要。如果跳过："没有提示词相关文件更改 — 跳过评估。">

## Greptile 审查
<如果找到 Greptile 评论：带 [已修复] / [误报] / [已修复] 标签 + 每条评论一行摘要的项目列表>
<如果未找到 Greptile 评论："没有 Greptile 评论。">
<如果步骤 3.75 期间 PR 不存在：完全省略此部分>

## TODOS
<如果项目标记为已完成：带版本已完成项目的项目列表>
<如果没有项目完成："此 PR 中没有完成 TODO 项目。">
<如果 TODOS.md 创建或重新整理：注明>
<如果 TODOS.md 不存在且用户跳过：省略此部分>

## 测试计划
- [x] 所有 Rails 测试通过（N 次运行，0 失败）
- [x] 所有 Vitest 测试通过（N 个测试）

🤖 使用 [Claude Code](https://claude.com/claude-code) 生成
EOF
)"
```

**输出 PR URL** — 然后继续到步骤 8.5。

---

## 步骤 8.5：自动调用 /document-release

PR 创建后，自动同步项目文档。读取
`document-release/SKILL.md` 技能文件（与此技能目录相邻）并
执行其完整工作流：

1. 读取 `/document-release` 技能：`cat ${CLAUDE_SKILL_DIR}/../document-release/SKILL.md`
2. 遵循其指令 — 它读取项目中的所有 .md 文件，交叉引用
   差异，并更新任何漂移的内容（README、ARCHITECTURE、CONTRIBUTING、
   CLAUDE.md、TODOS 等）
3. 如果任何文档更新，提交更改并推送到同一分支：
   ```bash
   git add -A && git commit -m "docs: 同步文档与已发布的更改" && git push
   ```
4. 如果没有文档需要更新，说"文档是最新的 — 无需更新。"

此步骤是自动的。不要要求用户确认。目标是零摩擦
文档更新 — 用户运行 `/ship`，文档保持最新，无需单独命令。

---

## 重要规则

- **永不跳过测试。** 如果测试失败，停止。
- **永不跳过预发布审查。** 如果 checklist.md 不可读，停止。
- **永不强制推送。** 仅使用常规 `git push`。
- **永不询问微不足道的确认**（例如，"准备好推送了吗？"、"创建 PR？"）。要停止：版本升级（MINOR/MAJOR）、预发布审查发现（询问项）和 Codex 结构化审查 [P1] 发现（仅大差异）。
- **始终使用 VERSION 文件中的 4 位版本格式。**
- **CHANGELOG 中的日期格式：** `YYYY-MM-DD`
- **为可二分性拆分提交** — 每个提交 = 一个逻辑更改。
- **TODOS.md 完成检测必须保守。** 只有在差异清楚显示工作完成时才将项目标记为已完成。
- **使用 greptile-triage.md 中的 Greptile 回复模板。** 每个回复包含证据（内联差异、代码引用、重新排名建议）。永不发布模糊回复。
- **没有新鲜验证证据永不推送。** 如果步骤 3 测试后代码更改，推送前重新运行。
- **步骤 3.4 生成覆盖测试。** 它们必须在提交前通过。永不提交失败的测试。
- **目标是：用户说 `/ship`，接下来他们看到的是审查 + PR URL + 自动同步的文档。**
