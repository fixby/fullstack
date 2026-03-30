# 为 fullstack 做贡献

感谢你想让 fullstack 变得更好。无论你是修复技能提示中的错别字
还是构建全新的工作流，本指南都能让你快速上手。

## 快速开始

fullstack 技能是从 `skills/` 目录发现的 Markdown 文件。
通常它们位于 `~/.openclaw/skills/fullstack/`（你的全局安装）。
但当你开发 fullstack 本身时，你希望 OpenClaw 使用工作树中的技能
—— 这样编辑立即生效，无需复制或部署任何东西。

这就是开发模式的作用。它将你的仓库符号链接到本地 `.openclaw/skills/` 目录，
这样 OpenClaw 直接从你的检出中读取技能。

```bash
git clone <repo> && cd fullstack
bun install                    # 安装依赖
bin/dev-setup                  # 激活开发模式
```

现在编辑任何 `SKILL.md`，在 OpenClaw 中调用它（例如 `/review`），
并实时查看更改。完成开发后：

```bash
bin/dev-teardown               # 停用 —— 恢复到你的全局安装
```

## 贡献者模式

贡献者模式将 fullstack 变成自我改进的工具。启用它，OpenClaw
会定期反思其 fullstack 体验 —— 在每个主要工作流步骤结束时评分 0-10。
当某事不是 10 时，它会思考原因并向 `~/.openclaw/contributor-logs/`
提交报告，包含发生了什么、重现步骤和什么会让它更好。

```bash
~/.openclaw/skills/fullstack/bin/fullstack-config set fullstack_contributor true
```

日志是给**你**的。当某事让你烦恼到想修复时，报告已经写好了。
Fork fullstack，将你的 fork 符号链接到遇到问题的项目，
修复它，然后打开 PR。

### 贡献者工作流

1. **正常使用 fullstack** —— 贡献者模式自动反思并记录问题
2. **检查你的日志：** `ls ~/.openclaw/contributor-logs/`
3. **Fork 并克隆 fullstack**（如果还没有）
4. **将你的 fork 符号链接到遇到 bug 的项目：**
   ```bash
   # 在你的核心项目中（fullstack 让你烦恼的那个）
   ln -sfn /path/to/your/fullstack-fork .openclaw/skills/fullstack
   cd .openclaw/skills/fullstack && bun install && bun run build
   ```
5. **修复问题** —— 你的更改在此项目中立即生效
6. **通过实际使用 fullstack 测试** —— 做让你烦恼的事，验证已修复
7. **从你的 fork 打开 PR**

这是贡献的最佳方式：在做真正工作的同时修复 fullstack，
在实际感受到痛苦的项目中。

### 会话感知

当你同时打开 3+ 个 fullstack 会话时，每个问题都会告诉你哪个项目、
哪个分支以及正在发生什么。不再盯着问题想"等等，这是哪个窗口？"
格式在所有技能中保持一致。

## 在 fullstack 仓库内工作

当你编辑 fullstack 技能并希望通过在同一仓库中实际使用 fullstack
来测试它们时，`bin/dev-setup` 会设置好。它创建指向工作树的
`.openclaw/skills/` 符号链接（gitignored），这样 OpenClaw 使用你的本地编辑
而不是全局安装。

```
fullstack/                              <- 你的工作树
├── .openclaw/skills/           <- 由 dev-setup 创建（gitignored）
│   ├── fullstack -> ../../              <- 指向仓库根目录的符号链接
│   ├── review -> fullstack/review
│   ├── ship -> fullstack/ship
│   └── ...                      <- 每个技能一个符号链接
├── review/
│   └── SKILL.md                 <- 编辑这个，用 /review 测试
├── ship/
│   └── SKILL.md
├── browse/
│   ├── src/                     <- TypeScript 源代码
│   └── dist/                    <- 编译后的二进制文件（gitignored）
└── ...
```

## 日常工作流

```bash
# 1. 进入开发模式
bin/dev-setup

# 2. 编辑技能
vim review/SKILL.md

# 3. 测试（在同一仓库中运行 /review）

# 4. 重新生成 SKILL.md 文件（如果编辑了 .tmpl）
bun run gen:skill-docs

# 5. 完成后退出开发模式
bin/dev-teardown
```

## 开发脚本

| 脚本 | 用途 |
|------|------|
| `bin/dev-setup` | 创建 `.openclaw/skills/` 符号链接，激活开发模式 |
| `bin/dev-teardown` | 删除技能符号链接，清理 `.openclaw/` 目录 |
| `bun run gen:skill-docs` | 从 `.tmpl` 模板重新生成所有 SKILL.md 文件 |
| `bun run skill:check` | 所有技能的健康仪表板 |
| `bun run dev:skill` | 监视模式：更改时自动重新生成 + 验证 |

### 开发模式注意事项

- **开发模式覆盖你的全局安装。** 项目本地技能优先于 `~/.openclaw/skills/fullstack`。`bin/dev-teardown` 恢复全局的。
- **`.openclaw/skills/` 是 gitignored。** 符号链接从不提交。
- **要测试全局安装：** 运行 `bin/dev-teardown` 然后正常使用 fullstack。

## 手动开发模式

如果 `bin/dev-setup` 不适合你，手动设置：

```bash
ln -sfn /path/to/your/fullstack-checkout .openclaw/skills/fullstack
cd .openclaw/skills/fullstack && bun install && bun run build
```

要退出：

```bash
rm .openclaw/skills/fullstack
```

OpenClaw 自动回退到 `~/.openclaw/skills/fullstack/`。

## 更新全局安装

```bash
cd ~/.openclaw/skills/fullstack
git pull
bun install
bun run build
```

## 双主机生成（Claude + Codex）

fullstack 为两个主机生成 SKILL.md 文件：**OpenClaw**（`.openclaw/skills/`）
和 **Codex**（`.agents/skills/`）。每个主机获得针对其平台优化的 SKILL.md 文件。

### 主机差异

| 特性 | OpenClaw | Codex |
|------|----------|-------|
| 前导格式 | Bash 前导块 | 无前导（Codex 不支持） |
| 输出目录 | `{skill}/SKILL.md` | `.agents/skills/fullstack-{skill}/SKILL.md`（设置时生成，gitignored） |
| 路径 | `~/.openclaw/skills/fullstack` | `$FULLSTACK_ROOT`（仓库中的 `.agents/skills/fullstack`，否则 `~/.codex/skills/fullstack`） |
| 工具 | 允许工具白名单 | 无工具限制（Codex 不支持） |
| 钩子 | 安全钩子 | 无钩子（Codex 不支持） |

### 生成命令

```bash
# 为 OpenClaw 生成（默认）
bun run gen:skill-docs

# 为 Codex 生成
bun run gen:skill-docs --host codex

# 两者都生成（build 脚本会执行此操作）
bun run build
```

当你运行 `bin/dev-setup` 时，它会在 `.openclaw/skills/` 和 `.agents/skills/`
中都创建符号链接，这样你可以在同一仓库中测试两个主机。

## 开发脚本参考

| 脚本 | 用途 |
|------|------|
| `bin/dev-setup` | 创建 `.openclaw/skills/` 符号链接，激活开发模式 |
| `bin/dev-teardown` | 删除技能符号链接，清理 `.openclaw/` 目录 |
| `archive` | `bin/dev-teardown` 的别名 |

### 开发模式注意事项

- **开发模式覆盖你的全局安装。** 项目本地技能优先于 `~/.openclaw/skills/fullstack`。`bin/dev-teardown` 恢复全局的。
- **`.openclaw/skills/` 是 gitignored。** 符号链接从不提交。
- **要测试全局安装：** 运行 `bin/dev-teardown` 然后正常使用 fullstack。

## 手动开发模式

如果 `bin/dev-setup` 不适合你，手动设置：

```bash
ln -sfn /path/to/your/fullstack-checkout .openclaw/skills/fullstack
cd .openclaw/skills/fullstack && bun install && bun run build
```

要退出：

```bash
rm .openclaw/skills/fullstack
```

OpenClaw 自动回退到 `~/.openclaw/skills/fullstack/`。

## 更新全局安装

```bash
cd ~/.openclaw/skills/fullstack
git pull
bun install
bun run build
```
