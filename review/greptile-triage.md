# Greptile 评论分类

用于获取、过滤和分类 GitHub PR 上 Greptile 审查评论的共享参考。`/review` (步骤 2.5)和 `/ship` (步骤 3.75)都引用此文档。

---

## 获取

运行这些命令以检测 PR 并获取评论。两个 API 调用并行运行。

```bash
REPO=$(gh repo view --json nameWithOwner --jq '.nameWithOwner' 2>/dev/null)
PR_NUMBER=$(gh pr view --json number --jq '.number' 2>/dev/null)
```

**如果任一失败或为空:** 静默跳过 Greptile 分类。此集成是附加的 — 工作流在没有它的情况下也能工作。

```bash
# 并行获取行级审查评论和顶级 PR 评论
gh api repos/$REPO/pulls/$PR_NUMBER/comments \
  --jq '.[] | select(.user.login == "greptile-apps[bot]") | select(.position != null) | {id: .id, path: .path, line: .line, body: .body, html_url: .html_url, source: "line-level"}' > /tmp/greptile_line.json &
gh api repos/$REPO/issues/$PR_NUMBER/comments \
  --jq '.[] | select(.user.login == "greptile-apps[bot]") | {id: .id, body: .body, html_url: .html_url, source: "top-level"}' > /tmp/greptile_top.json &
wait
```

**如果 API 错误或两个端点都没有 Greptile 评论:** 静默跳过。

行级评论上的 `position != null` 过滤器自动跳过来自强制推送代码的过时评论。

---

## 抑制检查

派生项目特定的历史路径:
```bash
REMOTE_SLUG=$(browse/bin/remote-slug 2>/dev/null || ~/.openclaw/skills/fullstack/browse/bin/remote-slug 2>/dev/null || basename "$(git rev-parse --show-toplevel 2>/dev/null || pwd)")
PROJECT_HISTORY="$HOME/.openclaw/projects/$REMOTE_SLUG/greptile-history.md"
```

如果存在 `$PROJECT_HISTORY`,请阅读它(每个项目的抑制)。每行记录以前的分类结果:

```
<date> | <repo> | <type:fp|fix|already-fixed> | <file-pattern> | <category>
```

**类别** (固定集合): `race-condition`、`null-check`、`error-handling`、`style`、`type-safety`、`security`、`performance`、`correctness`、`other`

将每个获取的评论与以下条目匹配:
- `type == fp` (仅抑制已知的误报,而不是以前修复的真实问题)
- `repo` 匹配当前仓库
- `file-pattern` 匹配评论的文件路径
- `category` 匹配评论中的问题类型

跳过匹配的评论作为**已抑制**。

如果历史文件不存在或具有不可解析的行,跳过这些行并继续 — 永远不要因格式错误的历史文件而失败。

---

## 分类

对于每个未抑制的评论:

1. **行级评论:** 阅读指示的 `path:line` 处的文件及周围上下文(±10 行)
2. **顶级评论:** 阅读完整的评论正文
3. 将评论与完整差异(`git diff origin/main`)和审查清单进行交叉引用
4. 分类:
   - **有效且可操作** — 当前代码中存在的真实错误、竞态条件、安全问题或正确性问题
   - **有效但已修复** — 在分支上的后续提交中已解决的真实问题。识别修复提交 SHA。
   - **误报** — 评论误解了代码、标记了其他地方处理的内容,或者是风格噪音
   - **已抑制** — 已在上面的抑制检查中过滤

---

## 回复 API

回复 Greptile 评论时,根据评论来源使用正确的端点:

**行级评论** (来自 `pulls/$PR/comments`):
```bash
gh api repos/$REPO/pulls/$PR_NUMBER/comments/$COMMENT_ID/replies \
  -f body="<reply text>"
```

**顶级评论** (来自 `issues/$PR/comments`):
```bash
gh api repos/$REPO/issues/$PR_NUMBER/comments \
  -f body="<reply text>"
```

**如果回复 POST 失败**(例如,PR 已关闭,无写入权限): 警告并继续。不要因回复失败而停止工作流。

---

## 回复模板

对每个 Greptile 回复使用这些模板。始终包含具体证据 — 永远不要发布模糊的回复。

### 第1层 (首次响应) — 友好,包含证据

**对于修复 (用户选择修复问题):**

```
**Fixed** in `<commit-sha>`.

\`\`\`diff
- <old problematic line(s)>
+ <new fixed line(s)>
\`\`\`

**Why:** <1-sentence explanation of what was wrong and how the fix addresses it>
```

**对于已修复 (问题在分支上的先前提交中已解决):**

```
**Already fixed** in `<commit-sha>`.

**What was done:** <1-2 sentences describing how the existing commit addresses this issue>
```

**对于误报 (评论不正确):**

```
**Not a bug.** <1 sentence directly stating why this is incorrect>

**Evidence:**
- <specific code reference showing the pattern is safe/correct>
- <e.g., "The nil check is handled by `ActiveRecord::FinderMethods#find` which raises RecordNotFound, not nil">

**Suggested re-rank:** This appears to be a `<style|noise|misread>` issue, not a `<what Greptile called it>`. Consider lowering severity.
```

### 第2层 (Greptile 在先前回复后重新标记) — 坚定,压倒性证据

当升级检测(见下文)识别出同一线程上的先前 GStack 回复时使用第2层。包含最大证据以结束讨论。

```
**This has been reviewed and confirmed as [intentional/already-fixed/not-a-bug].**

\`\`\`diff
<full relevant diff showing the change or safe pattern>
\`\`\`

**Evidence chain:**
1. <file:line permalink showing the safe pattern or fix>
2. <commit SHA where it was addressed, if applicable>
3. <architecture rationale or design decision, if applicable>

**Suggested re-rank:** Please recalibrate — this is a `<actual category>` issue, not `<claimed category>`. [Link to specific file change permalink if helpful]
```

---

## 升级检测

在撰写回复之前,检查此评论线程上是否已存在先前的 GStack 回复:

1. **对于行级评论:** 通过 `gh api repos/$REPO/pulls/$PR_NUMBER/comments/$COMMENT_ID/replies` 获取回复。检查是否有任何回复正文包含 GStack 标记: `**Fixed**`、`**Not a bug.**`、`**Already fixed**`。

2. **对于顶级评论:** 扫描获取的问题评论,查找在 Greptile 评论之后发布的包含 GStack 标记的回复。

3. **如果存在先前的 GStack 回复且 Greptile 在同一文件+类别上再次发布:** 使用第2层(坚定)模板。

4. **如果不存在先前的 GStack 回复:** 使用第1层(友好)模板。

如果升级检测失败(API 错误、线程不明确): 默认为第1层。永远不要在模糊情况下升级。

---

## 严重性评估与重新排名

分类评论时,还要评估 Greptile 的隐含严重性是否与现实匹配:

- 如果 Greptile 将某事标记为**安全/正确性/竞态条件**问题,但实际上是**风格/性能**细节: 在回复中包含 `**Suggested re-rank:**` 请求更正类别。
- 如果 Greptile 将低严重性风格问题标记为关键问题: 在回复中反驳。
- 始终具体说明为什么重新排名是合理的 — 引用代码和行号,而不是意见。

---

## 历史文件写入

写入之前,确保两个目录都存在:
```bash
REMOTE_SLUG=$(browse/bin/remote-slug 2>/dev/null || ~/.openclaw/skills/fullstack/browse/bin/remote-slug 2>/dev/null || basename "$(git rev-parse --show-toplevel 2>/dev/null || pwd)")
mkdir -p "$HOME/.openclaw/projects/$REMOTE_SLUG"
mkdir -p ~/.openclaw
```

将每个分类结果的一行附加到**两个**文件(每个项目用于抑制,全局用于回顾):
- `~/.openclaw/projects/$REMOTE_SLUG/greptile-history.md` (每个项目)
- `~/.openclaw/greptile-history.md` (全局汇总)

格式:
```
<YYYY-MM-DD> | <owner/repo> | <type> | <file-pattern> | <category>
```

示例条目:
```
2026-03-13 | garrytan/myapp | fp | app/services/auth_service.rb | race-condition
2026-03-13 | garrytan/myapp | fix | app/models/user.rb | null-check
2026-03-13 | garrytan/myapp | already-fixed | lib/payments.rb | error-handling
```

---

## 输出格式

在输出标题中包含 Greptile 摘要:
```
+ N Greptile comments (X valid, Y fixed, Z FP)
```

对于每个分类的评论,显示:
- 分类标签: `[VALID]`、`[FIXED]`、`[FALSE POSITIVE]`、`[SUPPRESSED]`
- 文件:行引用(对于行级)或 `[top-level]` (对于顶级)
- 一行正文摘要
- 永久链接 URL (`html_url` 字段)
