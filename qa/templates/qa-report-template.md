# QA 报告: {APP_NAME}

| 字段 | 值 |
|------|-----|
| **日期** | {DATE} |
| **URL** | {URL} |
| **分支** | {BRANCH} |
| **提交** | {COMMIT_SHA} ({COMMIT_DATE}) |
| **PR** | {PR_NUMBER} ({PR_URL}) 或 "—" |
| **层级** | Quick / Standard / Exhaustive |
| **范围** | {SCOPE 或 "Full app"} |
| **持续时间** | {DURATION} |
| **访问页面数** | {COUNT} |
| **截图数** | {COUNT} |
| **框架** | {DETECTED 或 "Unknown"} |
| **索引** | [所有 QA 运行](./index.md) |

## 健康分数: {SCORE}/100

| 类别 | 分数 |
|------|------|
| Console | {0-100} |
| Links | {0-100} |
| Visual | {0-100} |
| Functional | {0-100} |
| UX | {0-100} |
| Performance | {0-100} |
| Accessibility | {0-100} |

## 需要修复的前 3 件事

1. **{ISSUE-NNN}: {title}** — {一行描述}
2. **{ISSUE-NNN}: {title}** — {一行描述}
3. **{ISSUE-NNN}: {title}** — {一行描述}

## 控制台健康

| 错误 | 计数 | 首次发现 |
|------|------|----------|
| {error message} | {N} | {URL} |

## 摘要

| 严重性 | 计数 |
|--------|------|
| Critical | 0 |
| High | 0 |
| Medium | 0 |
| Low | 0 |
| **总计** | **0** |

## 问题

### ISSUE-001: {简短标题}

| 字段 | 值 |
|------|-----|
| **严重性** | critical / high / medium / low |
| **类别** | visual / functional / ux / content / performance / console / accessibility |
| **URL** | {页面 URL} |

**描述:** {错误内容,预期 vs 实际。}

**重现步骤:**

1. 导航到 {URL}
   ![步骤 1](screenshots/issue-001-step-1.png)
2. {操作}
   ![步骤 2](screenshots/issue-001-step-2.png)
3. **观察:** {出错内容}
   ![结果](screenshots/issue-001-result.png)

---

## 已应用的修复 (如适用)

| 问题 | 修复状态 | 提交 | 更改的文件 |
|------|----------|------|------------|
| ISSUE-NNN | verified / best-effort / reverted / deferred | {SHA} | {files} |

### 修复前/后证据

#### ISSUE-NNN: {title}
**修复前:** ![修复前](screenshots/issue-NNN-before.png)
**修复后:** ![修复后](screenshots/issue-NNN-after.png)

---

## 回归测试

| 问题 | 测试文件 | 状态 | 描述 |
|------|----------|------|------|
| ISSUE-NNN | path/to/test | committed / deferred / skipped | 描述 |

### 延迟测试

#### ISSUE-NNN: {title}
**前置条件:** {触发错误的设置状态}
**操作:** {用户执行的操作}
**预期:** {正确行为}
**延迟原因:** {原因}

---

## 发布就绪性

| 指标 | 值 |
|------|-----|
| 健康分数 | {before} → {after} ({delta}) |
| 发现的问题 | N |
| 应用的修复 | N (verified: X, best-effort: Y, reverted: Z) |
| 延迟 | N |

**PR 摘要:** "QA 发现 N 个问题,修复了 M 个,健康分数 X → Y。"

---

## 回归 (如适用)

| 指标 | 基线 | 当前 | 差异 |
|------|------|------|------|
| 健康分数 | {N} | {N} | {+/-N} |
| 问题 | {N} | {N} | {+/-N} |

**自基线以来已修复:** {列表}
**自基线以来新增:** {列表}
