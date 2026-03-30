---
name: autoplan
version: 1.0.0
description: |
  自动审查流水线 — 从磁盘读取完整的CEO、设计和工程审查技能，
  并使用6个决策原则自动决策，按顺序运行它们。在最终审批关口
  展示品味决策（接近的方法、边界范围、codex分歧）。一条命令，
  输出完全审查的计划。
  当被要求"自动审查"、"autoplan"、"运行所有审查"、"自动审查此计划"
  或"帮我做决策"时使用。
  当用户有计划文件并希望运行完整审查流程而不回答15-30个中间问题时，
  主动建议使用。
benefits-from: [office-hours]
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - WebSearch
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

## Prerequisite Skill Offer

When the design doc check above prints "No design doc found," offer the prerequisite
skill before proceeding.

Say to the user via AskUserQuestion:

> "No design doc found for this branch. `/office-hours` produces a structured problem
> statement, premise challenge, and explored alternatives — it gives this review much
> sharper input to work with. Takes about 10 minutes. The design doc is per-feature,
> not per-product — it captures the thinking behind this specific change."

Options:
- A) Run /office-hours now (we'll pick up the review right after)
- B) Skip — proceed with standard review

If they skip: "No worries — standard review. If you ever want sharper input, try
/office-hours first next time." Then proceed normally. Do not re-offer later in the session.

If they choose A:

Say: "Running /office-hours inline. Once the design doc is ready, I'll pick up
the review right where we left off."

Read the office-hours skill file from disk using the Read tool:
`~/.openclaw/skills/fullstack/office-hours/SKILL.md`

Follow it inline, **skipping these sections** (already handled by the parent skill):
- Preamble (run first)
- AskUserQuestion Format
- Completeness Principle — Boil the Lake
- Search Before Building
- Contributor Mode
- Completion Status Protocol

If the Read fails (file not found), say:
"Could not load /office-hours — proceeding with standard review."

After /office-hours completes, re-run the design doc check:
```bash
SLUG=$(~/.openclaw/skills/fullstack/bin/fullstack-slug 2>/dev/null || basename "$(git rev-parse --show-toplevel 2>/dev/null || pwd)")
BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null | tr '/' '-' || echo 'no-branch')
DESIGN=$(ls -t ~/.fullstack/projects/$SLUG/*-$BRANCH-design-*.md 2>/dev/null | head -1)
[ -z "$DESIGN" ] && DESIGN=$(ls -t ~/.fullstack/projects/$SLUG/*-design-*.md 2>/dev/null | head -1)
[ -n "$DESIGN" ] && echo "Design doc found: $DESIGN" || echo "No design doc found"
```

If a design doc is now found, read it and continue the review.
If none was produced (user may have cancelled), proceed with standard review.

# /autoplan — 自动审查流水线

一条命令。粗略计划输入，完全审查的计划输出。

/autoplan 从磁盘读取完整的CEO、设计和工程审查技能文件，并以
完全深度遵循它们 — 与手动运行每个技能相同的严谨性、相同的章节、
相同的方法论。唯一的区别：中间的 AskUserQuestion 调用使用下面的
6个原则自动决策。品味决策（理性人可能持不同意见的情况）在最终
审批关口展示。

---

## 6个决策原则

这些规则自动回答每个中间问题：

1. **选择完整性** — 发布完整的东西。选择覆盖更多边缘情况的方法。
2. **煮沸湖泊** — 修复爆炸半径内的所有内容（此计划修改的文件 + 直接导入者）。自动批准在爆炸半径内且 < 1天CC工作量（< 5个文件，无新基础设施）的扩展。
3. **务实** — 如果两个选项修复同一件事，选择更简洁的那个。5秒选择，而不是5分钟。
4. **DRY（不要重复自己）** — 重复现有功能？拒绝。重用已存在的。
5. **显式优于巧妙** — 10行明显的修复 > 200行的抽象。选择新贡献者能在30秒内读懂的内容。
6. **偏向行动** — 合并 > 审查循环 > 陈旧的讨论。标记关注点但不阻塞。

**冲突解决（上下文相关的决胜规则）：**
- **CEO阶段：** P1（完整性）+ P2（煮沸湖泊）占主导。
- **工程阶段：** P5（显式）+ P3（务实）占主导。
- **设计阶段：** P5（显式）+ P1（完整性）占主导。

---

## 决策分类

每个自动决策都被分类：

**机械性** — 一个明显正确的答案。静默自动决策。
示例：运行codex（总是是）、运行评估（总是是）、减少完整计划的范围（总是否）。

**品味性** — 理性人可能持不同意见。自动决策并给出建议，但在最终关口展示。三个自然来源：
1. **接近的方法** — 前两种方法都可行，但有不同的权衡。
2. **边界范围** — 在爆炸半径内但3-5个文件，或半径模糊。
3. **Codex分歧** — codex建议不同且有合理观点。

---

## "自动决策"的含义

自动决策用6个原则替代用户的判断。它不替代分析。
加载的技能文件中的每个章节仍必须以与交互版本相同的深度执行。
唯一改变的是谁回答 AskUserQuestion：你，使用6个原则，而不是用户。

**你必须：**
- 阅读每个章节引用的实际代码、差异和文件
- 生成章节要求的每个输出（图表、表格、注册表、工件）
- 识别章节设计用于捕获的每个问题
- 使用6个原则决策每个问题（而不是询问用户）
- 在审计跟踪中记录每个决策
- 将所有必需的工件写入磁盘

**你不得：**
- 将审查章节压缩为单行表格行
- 在不展示你检查了什么的情况下写"未发现问题"
- 因为"不适用"而跳过章节，而不说明检查了什么以及原因
- 生成摘要而不是必需的输出（例如，"架构看起来不错"
  而不是章节要求的ASCII依赖图）

"未发现问题"是章节的有效输出 — 但只有在进行分析之后。
说明你检查了什么以及为什么没有标记任何内容（最少1-2句话）。
对于非跳过列表中的章节，"跳过"永远无效。

---

## 阶段0：接收 + 恢复点

### 步骤1：捕获恢复点

在做任何事情之前，将计划文件的当前状态保存到外部文件：

```bash
eval "$(~/.openclaw/skills/fullstack/bin/fullstack-slug 2>/dev/null)" && mkdir -p ~/.fullstack/projects/$SLUG
BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null | tr '/' '-')
DATETIME=$(date +%Y%m%d-%H%M%S)
echo "RESTORE_PATH=$HOME/.openclaw/projects/$SLUG/${BRANCH}-autoplan-restore-${DATETIME}.md"
```

将计划文件的完整内容写入恢复路径，带有此头部：
```
# /autoplan 恢复点
捕获时间: [时间戳] | 分支: [分支] | 提交: [短哈希]

## 重新运行说明
1. 将下面的"原始计划状态"复制回你的计划文件
2. 调用 /autoplan

## 原始计划状态
[逐字计划文件内容]
```

然后在计划文件开头添加一行HTML注释：
`<!-- /autoplan restore point: [RESTORE_PATH] -->`

### 步骤2：读取上下文

- 读取 CLAUDE.md、TODOS.md、git log -30、git diff 对比基础分支 --stat
- 发现设计文档：`ls -t ~/.openclaw/projects/$SLUG/*-design-*.md 2>/dev/null | head -1`
- 检测UI范围：grep计划中的视图/渲染术语（component、screen、form、
  button、modal、layout、dashboard、sidebar、nav、dialog）。需要2+匹配。排除
  误报（单独的"page"、缩写中的"UI"）。

### 步骤3：从磁盘加载技能文件

使用Read工具读取每个文件：
- `~/.openclaw/skills/fullstack/plan-ceo-review/SKILL.md`
- `~/.openclaw/skills/fullstack/plan-design-review/SKILL.md`（仅当检测到UI范围时）
- `~/.openclaw/skills/fullstack/plan-eng-review/SKILL.md`

**章节跳过列表 — 遵循加载的技能文件时，跳过这些章节
（它们已由 /autoplan 处理）：**
- Preamble（前言，首先运行）
- AskUserQuestion Format（提问格式）
- Completeness Principle — Boil the Lake（完整性原则 — 煮沸湖泊）
- Search Before Building（构建前搜索）
- Contributor Mode（贡献者模式）
- Completion Status Protocol（完成状态协议）
- Telemetry（遥测，最后运行）
- Step 0: Detect base branch（步骤0：检测基础分支）
- Review Readiness Dashboard（审查准备仪表板）
- Plan File Review Report（计划文件审查报告）
- Prerequisite Skill Offer (BENEFITS_FROM)（前置技能提议）

仅遵循审查特定的方法论、章节和必需输出。

输出："我正在处理：[计划摘要]。UI范围：[是/否]。
已从磁盘加载审查技能。开始带自动决策的完整审查流水线。"

---

## 阶段1：CEO审查（战略与范围）

遵循 plan-ceo-review/SKILL.md — 所有章节，完全深度。
覆盖：每个 AskUserQuestion → 使用6个原则自动决策。

**覆盖规则：**
- 模式选择：SELECTIVE EXPANSION（选择性扩展）
- 前提：接受合理的（P6），仅质疑明显错误的
- **关口：向用户展示前提以确认** — 这是唯一一个不自动决策的 AskUserQuestion。
  前提需要人类判断。
- 替代方案：选择最高完整性（P1）。如果平局，选择最简单的（P5）。
  如果前2名接近 → 标记为品味决策。
- 范围扩展：在爆炸半径内 + <1d CC → 批准（P2）。在外部 → 推迟到 TODOS.md（P3）。
  重复 → 拒绝（P4）。边界（3-5个文件）→ 标记为品味决策。
- 所有10个审查章节：完全运行，自动决策每个问题，记录每个决策。

**必需执行清单（CEO）：**

步骤0（0A-0F）— 运行每个子步骤并生成：
- 0A：前提质疑，具体命名和评估前提
- 0B：现有代码利用图（子问题 → 现有代码）
- 0C：理想状态图（当前 → 此计划 → 12个月理想）
- 0C-bis：实施替代方案表（2-3种方法，包含工作量/风险/优缺点）
- 0D：模式特定分析，记录范围决策
- 0E：时间审问（第1小时 → 第6小时+）
- 0F：模式选择确认

章节1-10 — 对于每个章节，运行加载的技能文件中的评估标准：
- 有发现的章节：完整分析，自动决策每个问题，记录到审计跟踪
- 无发现的章节：1-2句话说明检查了什么以及为什么没有标记任何内容。
  永远不要将章节压缩为表格行中的名称。
- 章节11（设计）：仅当阶段0中检测到UI范围时运行

**阶段1的必需输出：**
- "不在范围内"章节，包含推迟的项目和理由
- "已存在什么"章节，映射子问题到现有代码
- 错误与救援注册表（来自章节2）
- 失败模式注册表（来自审查章节）
- 理想状态差距（此计划让我们处于的位置 vs 12个月理想）
- 完成摘要（CEO技能的完整摘要表）

---

## 阶段2：设计审查（条件性 — 无UI范围则跳过）

遵循 plan-design-review/SKILL.md — 所有7个维度，完全深度。
覆盖：每个 AskUserQuestion → 使用6个原则自动决策。

**覆盖规则：**
- 关注领域：所有相关维度（P1）
- 结构问题（缺失状态、层次结构损坏）：自动修复（P5）
- 审美/品味问题：标记为品味决策
- 设计系统对齐：如果存在DESIGN.md且修复明显，则自动修复

---

## 阶段3：工程审查 + Codex

遵循 plan-eng-review/SKILL.md — 所有章节，完全深度。
覆盖：每个 AskUserQuestion → 使用6个原则自动决策。

**覆盖规则：**
- 范围质疑：从不减少（P2）
- Codex审查：如果可用则总是运行（P6）
  命令：`codex exec "Review this plan for architectural issues, missing edge cases, and hidden complexity. Be adversarial. File: <plan_path>" -s read-only --enable web_search_cached`
  超时：10分钟，然后以"Codex超时 — 单审查者模式"继续
- 架构选择：显式优于巧妙（P5）。如果codex有合理理由不同意 → 品味决策。
- 评估：总是包含所有相关套件（P1）
- 测试计划：在 `~/.openclaw/projects/$SLUG/{user}-{branch}-test-plan-{datetime}.md` 生成工件
- TODOS.md：收集阶段1的所有推迟范围扩展，自动写入

**必需执行清单（工程）：**

1. 步骤0（范围质疑）：阅读计划引用的实际代码。映射每个
   子问题到现有代码。运行复杂性检查。生成具体发现。

2. 步骤0.5（Codex）：如果可用则运行。在CODEX SAYS标题下展示完整输出。

3. 章节1（架构）：生成ASCII依赖图，显示新组件
   及其与现有组件的关系。评估耦合、扩展性、安全性。

4. 章节2（代码质量）：识别DRY违规、命名问题、复杂性。
   引用具体文件和模式。自动决策每个发现。

5. **章节3（测试审查）— 永远不要跳过或压缩。**
   此章节需要阅读实际代码，而不是从记忆中总结。
   - 阅读差异或计划的影响文件
   - 构建测试图：列出每个新的UX流程、数据流、代码路径和分支
   - 对于图中的每个项目：什么类型的测试覆盖它？存在吗？差距？
   - 对于LLM/提示更改：必须运行哪些评估套件？
   - 自动决策测试差距意味着：识别差距 → 决定是否添加测试
     或推迟（带理由和原则）→ 记录决策。这不意味着
     跳过分析。
   - 将测试计划工件写入磁盘

6. 章节4（性能）：评估N+1查询、内存、缓存、慢路径。

**阶段3的必需输出：**
- "不在范围内"章节
- "已存在什么"章节
- 架构ASCII图（章节1）
- 测试图映射代码路径到覆盖（章节3）
- 测试计划工件写入磁盘（章节3）
- 失败模式注册表，带关键差距标记
- 完成摘要（工程技能的完整摘要）
- TODOS.md更新（从所有阶段收集）

---

## 决策审计跟踪

每次自动决策后，使用Edit向计划文件追加一行：

```markdown
<!-- 自主决策日志 -->
## 决策审计跟踪

| # | 阶段 | 决策 | 原则 | 理由 | 拒绝项 |
|---|------|------|------|------|--------|
```

通过Edit逐个写入决策行。这将审计保持在磁盘上，
而不是累积在对话上下文中。

---

## 关口前验证

在展示最终审批关口之前，验证必需的输出是否实际生成。
检查计划文件和对话中的每个项目。

**阶段1（CEO）输出：**
- [ ] 前提质疑，具体命名前提（不只是"前提已接受"）
- [ ] 所有适用的审查章节有发现或明确的"检查了X，未标记任何内容"
- [ ] 错误与救援注册表已生成（或注明N/A及原因）
- [ ] 失败模式注册表已生成（或注明N/A及原因）
- [ ] "不在范围内"章节已写入
- [ ] "已存在什么"章节已写入
- [ ] 理想状态差距已写入
- [ ] 完成摘要已生成

**阶段2（设计）输出 — 仅当检测到UI范围时：**
- [ ] 所有7个维度已评估并评分
- [ ] 问题已识别并自动决策

**阶段3（工程）输出：**
- [ ] 范围质疑带实际代码分析（不只是"范围没问题"）
- [ ] 架构ASCII图已生成
- [ ] 测试图映射代码路径到测试覆盖
- [ ] 测试计划工件已写入磁盘，位于 ~/.openclaw/projects/$SLUG/
- [ ] "不在范围内"章节已写入
- [ ] "已存在什么"章节已写入
- [ ] 失败模式注册表，带关键差距评估
- [ ] 完成摘要已生成

**审计跟踪：**
- [ ] 决策审计跟踪每个自动决策至少有一行（非空）

如果上述任何复选框缺失，返回并生成缺失的输出。最多2次
尝试 — 如果重试两次后仍缺失，继续到关口并带警告
注明哪些项目不完整。不要无限循环。

---

## 阶段4：最终审批关口

**在此停止并向用户展示最终状态。**

作为消息展示，然后使用 AskUserQuestion：

```
## /autoplan 审查完成

### 计划摘要
[1-3句话摘要]

### 已做决策：[N]个总计（[M]个自动决策，[K]个供你选择）

### 你的选择（品味决策）
[对于每个品味决策：]
**选择 [N]：[标题]**（来自 [阶段]）
我推荐 [X] — [原则]。但 [Y] 也可行：
  [如果你选择Y的1句话下游影响]

### 自动决策：[M]个决策 [见计划文件中的决策审计跟踪]

### 审查分数
- CEO：[摘要]
- 设计：[摘要或"已跳过，无UI范围"]
- 工程：[摘要]
- Codex：[摘要或"不可用"]

### 推迟到 TODOS.md
[自动推迟的项目及原因]
```

**认知负荷管理：**
- 0个品味决策：跳过"你的选择"章节
- 1-7个品味决策：扁平列表
- 8+个：按阶段分组。添加警告："此计划有异常高的歧义性（[N]个品味决策）。请仔细审查。"

AskUserQuestion选项：
- A) 按原样批准（接受所有建议）
- B) 带覆盖批准（指定要更改哪些品味决策）
- C) 审问（询问任何具体决策）
- D) 修订（计划本身需要更改）
- E) 拒绝（重新开始）

**选项处理：**
- A：标记为已批准，写入审查日志，建议 /ship
- B：询问哪些覆盖，应用，重新展示关口
- C：自由回答，重新展示关口
- D：进行更改，重新运行受影响的阶段（范围→1B、设计→2、测试计划→3、架构→3）。最多3个循环。
- E：重新开始

---

## 完成：写入审查日志

批准后，写入3个单独的审查日志条目，以便 /ship 的仪表板识别它们：

```bash
COMMIT=$(git rev-parse --short HEAD 2>/dev/null)
TIMESTAMP=$(date -u +%Y-%m-%dT%H:%M:%SZ)

~/.openclaw/skills/fullstack/bin/fullstack-review-log '{"skill":"plan-ceo-review","timestamp":"'"$TIMESTAMP"'","status":"clean","unresolved":0,"critical_gaps":0,"mode":"SELECTIVE_EXPANSION","via":"autoplan","commit":"'"$COMMIT"'"}'

~/.openclaw/skills/fullstack/bin/fullstack-review-log '{"skill":"plan-eng-review","timestamp":"'"$TIMESTAMP"'","status":"clean","unresolved":0,"critical_gaps":0,"issues_found":0,"mode":"FULL_REVIEW","via":"autoplan","commit":"'"$COMMIT"'"}'
```

如果阶段2运行（UI范围）：
```bash
~/.openclaw/skills/fullstack/bin/fullstack-review-log '{"skill":"plan-design-review","timestamp":"'"$TIMESTAMP"'","status":"clean","unresolved":0,"via":"autoplan","commit":"'"$COMMIT"'"}'
```

用审查中的实际计数替换字段值。

建议下一步：准备就绪时使用 `/ship` 创建PR。

---

## 重要规则

- **永不中止。** 用户选择了 /autoplan。尊重该选择。展示所有品味决策，永不重定向到交互式审查。
- **前提是唯一的关口。** 唯一非自动决策的 AskUserQuestion 是阶段1中的前提确认。
- **记录每个决策。** 没有静默的自动决策。每个选择在审计跟踪中都有一行。
- **完全深度意味着完全深度。** 不要压缩或跳过加载的技能文件中的章节（阶段0中的跳过列表除外）。"完全深度"意味着：阅读章节要求你阅读的代码，生成章节要求的输出，识别每个问题，并决策每个问题。章节的一句话摘要不是"完全深度" — 它是跳过。如果你发现自己在任何审查章节写了少于3句话，你可能正在压缩。
- **工件是可交付成果。** 测试计划工件、失败模式注册表、错误/救援表、ASCII图 — 这些必须在审查完成时存在于磁盘或计划文件中。如果它们不存在，审查不完整。
- **顺序顺序。** CEO → 设计 → 工程。每个阶段建立在前一个阶段之上。
