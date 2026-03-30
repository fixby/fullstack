# 设计审查清单 (精简版)

> **DESIGN_METHODOLOGY 的子集** — 在此处添加项目时,也要更新 `scripts/gen-skill-docs.ts` 中的 `generateDesignMethodology()`,反之亦然。

## 说明

此清单适用于**差异中的源代码** — 而非渲染输出。阅读每个更改的前端文件(完整文件,不仅仅是差异块)并标记反模式。

**触发器:** 仅当差异触及前端文件时运行此清单。使用 `fullstack-diff-scope` 检测:

```bash
source <(~/.openclaw/skills/fullstack/bin/fullstack-diff-scope <base> 2>/dev/null)
```

如果 `SCOPE_FRONTEND=false`,静默跳过整个设计审查。

**DESIGN.md 校准:** 如果仓库根目录中存在 `DESIGN.md` 或 `design-system.md`,请先阅读它。所有发现都根据项目声明的设计系统进行校准。在 DESIGN.md 中明确认可的模式不会被标记。如果不存在 DESIGN.md,使用通用设计原则。

---

## 置信度层级

每个项目都标记有检测置信度级别:

- **[高]** — 可通过 grep/模式匹配可靠检测。确定性发现。
- **[中]** — 可通过模式聚合或启发式检测。标记为发现但预期有一些噪音。
- **[低]** — 需要理解视觉意图。呈现为:"可能的问题 — 视觉验证或运行 /design-review。"

---

## 分类

**自动修复** (仅机械性 CSS 修复 — 高置信度,无需设计判断):
- `outline: none` 无替换 → 添加 `outline: revert` 或 `&:focus-visible { outline: 2px solid currentColor; }`
- 新 CSS 中的 `!important` → 删除并修复特异性
- 正文文本上的 `font-size` < 16px → 提升到 16px

**询问** (其他所有内容 — 需要设计判断):
- 所有 AI 模板发现、排版结构、间距选择、交互状态缺口、DESIGN.md 违规

**低置信度项目** → 呈现为"可能: [描述]。视觉验证或运行 /design-review。"从不自动修复。

---

## 输出格式

```
Design Review: N issues (X auto-fixable, Y need input, Z possible)

**AUTO-FIXED:**
- [file:line] Problem → fix applied

**NEEDS INPUT:**
- [file:line] Problem description
  Recommended fix: suggested fix

**POSSIBLE (verify visually):**
- [file:line] Possible issue — verify with /design-review
```

如果未发现问题: `Design Review: No issues found.`

如果未更改前端文件: 静默跳过,无输出。

---

## 类别

### 1. AI 模板检测 (6 项) — 最高优先级

这些是 AI 生成的 UI 的明显迹象,知名工作室的设计师不会发布这些内容。

- **[中]** 紫色/紫罗兰/靛蓝渐变背景或蓝到紫配色方案。查找 `#6366f1`–`#8b5cf6` 范围内的 `linear-gradient` 值,或解析为紫色/紫罗兰色的 CSS 自定义属性。

- **[低]** 3 列特性网格:彩色圆圈中的图标 + 粗体标题 + 2 行描述,对称重复 3 次。查找恰好包含 3 个子元素的网格/flex 容器,每个子元素都包含圆形元素 + 标题 + 段落。

- **[低]** 作为章节装饰的彩色圆圈中的图标。查找具有 `border-radius: 50%` + 背景颜色的元素,用作图标的装饰容器。

- **[高]** 居中对齐所有内容:所有标题、描述和卡片上的 `text-align: center`。Grep `text-align: center` 密度 — 如果 >60% 的文本容器使用居中对齐,标记它。

- **[中]** 每个元素上统一的气泡状 border-radius:相同的较大半径(16px+)统一应用于卡片、按钮、输入、容器。聚合 `border-radius` 值 — 如果 >80% 使用相同的值 ≥16px,标记它。

- **[中]** 通用英雄文案:"Welcome to [X]"、"Unlock the power of..."、"Your all-in-one solution for..."、"Revolutionize your..."、"Streamline your workflow"。Grep HTML/JSX 内容查找这些模式。

### 2. 排版 (4 项)

- **[高]** 正文文本 `font-size` < 16px。Grep `body`、`p`、`.text` 或基础样式上的 `font-size` 声明。低于 16px 的值(或基础为 16px 时的 1rem)会被标记。

- **[高]** 差异中引入超过 3 个字体系列。计算不同的 `font-family` 声明。如果更改文件中出现 >3 个唯一系列,标记。

- **[高]** 标题层级跳级:同一文件/组件中 `h1` 后跟 `h3` 而没有 `h2`。检查 HTML/JSX 中的标题标签。

- **[高]** 黑名单字体:Papyrus、Comic Sans、Lobster、Impact、Jokerman。Grep `font-family` 查找这些名称。

### 3. 间距与布局 (4 项)

- **[中]** 当 DESIGN.md 指定间距比例时,不在 4px 或 8px 比例上的任意间距值。根据声明的比例检查 `margin`、`padding`、`gap` 值。仅在 DESIGN.md 定义比例时标记。

- **[中]** 没有响应式处理的固定宽度:容器上的 `width: NNNpx` 没有 `max-width` 或 `@media` 断点。移动设备上水平滚动的风险。

- **[中]** 文本容器上缺少 `max-width`:没有设置 `max-width` 的正文文本或段落容器,允许行 >75 个字符。检查文本包装器上的 `max-width`。

- **[高]** 新 CSS 规则中的 `!important`。Grep 添加行中的 `!important`。几乎总是应该正确修复的特异性逃生舱口。

### 4. 交互状态 (3 项)

- **[中]** 交互元素(按钮、链接、输入)缺少悬停/焦点状态。检查新的交互元素样式是否存在 `:hover` 和 `:focus` 或 `:focus-visible` 伪类。

- **[高]** `outline: none` 或 `outline: 0` 没有替换焦点指示器。Grep `outline:\s*none` 或 `outline:\s*0`。这会移除键盘可访问性。

- **[低]** 交互元素上的触摸目标 < 44px。检查按钮和链接上的 `min-height`/`min-width`/`padding`。需要从多个属性计算有效大小 — 仅从代码看置信度低。

### 5. DESIGN.md 违规 (3 项,有条件)

仅在存在 `DESIGN.md` 或 `design-system.md` 时应用:

- **[中]** 不在声明的调色板中的颜色。将更改的 CSS 中的颜色值与 DESIGN.md 中定义的调色板进行比较。

- **[中]** 不在声明的排版部分中的字体。将 `font-family` 值与 DESIGN.md 的字体列表进行比较。

- **[中]** 不在声明的比例之外的间距值。将 `margin`/`padding`/`gap` 值与 DESIGN.md 的间距比例进行比较。

---

## 抑制

不要标记:
- DESIGN.md 中明确记录为有意选择的模式
- 第三方/供应商 CSS 文件(node_modules、vendor 目录)
- CSS 重置或规范化样式表
- 测试固件文件
- 生成/压缩的 CSS
