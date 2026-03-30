# TODOS.md 格式参考

规范 TODOS.md 格式的共享参考。由 `/ship` (步骤 5.5)和 `/plan-ceo-review` (TODOS.md 更新部分)引用,以确保一致的 TODO 项目结构。

---

## 文件结构

```markdown
# TODOS

## <技能/组件>     ← 例如,## Browse、## Ship、## Review、## Infrastructure
<项目按 P0 优先排序,然后是 P1、P2、P3、P4>

## Completed
<已完成项目及完成注释>
```

**章节:** 按技能或组件组织(`## Browse`、`## Ship`、`## Review`、`## QA`、`## Retro`、`## Infrastructure`)。在每个章节内,按优先级排序项目(P0 在顶部)。

---

## TODO 项目格式

每个项目是其章节下的 H3:

```markdown
### <标题>

**What:** 工作的单行描述。

**Why:** 它解决的具体问题或解锁的价值。

**Context:** 足够的细节,以便某人在 3 个月后接手时理解动机、当前状态和从哪里开始。

**Effort:** S / M / L / XL
**Priority:** P0 / P1 / P2 / P3 / P4
**Depends on:** <前置条件,或"None">
```

**必填字段:** What、Why、Context、Effort、Priority
**可选字段:** Depends on、Blocked by

---

## 优先级定义

- **P0** — 阻塞性:必须在下次发布之前完成
- **P1** — 关键:应该在本周期完成
- **P2** — 重要:当 P0/P1 清除时执行
- **P3** — 锦上添花:在采用/使用数据后重新审视
- **P4** — 将来某天:好主意,无紧迫性

---

## 已完成项目格式

当项目完成时,将其移动到 `## Completed` 章节,保留其原始内容并附加:

```markdown
**Completed:** vX.Y.Z (YYYY-MM-DD)
```
