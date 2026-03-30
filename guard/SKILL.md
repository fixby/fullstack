---
name: guard
version: 0.1.0
description: |
  完整安全模式：破坏性命令警告 + 目录范围编辑限制。结合 /careful（在 rm -rf、DROP TABLE、
  force-push 等操作前发出警告）与 /freeze（阻止在指定目录外编辑）。适用于操作生产环境或
  调试线上系统时获得最大安全保障。当被要求"保护模式"、"完整安全"、"锁定"或
  "最大安全"时使用。
allowed-tools:
  - Bash
  - Read
  - AskUserQuestion
hooks:
  PreToolUse:
    - matcher: "Bash"
      hooks:
        - type: command
          command: "bash ${CLAUDE_SKILL_DIR}/../careful/bin/check-careful.sh"
          statusMessage: "正在检查破坏性命令..."
    - matcher: "Edit"
      hooks:
        - type: command
          command: "bash ${CLAUDE_SKILL_DIR}/../freeze/bin/check-freeze.sh"
          statusMessage: "正在检查冻结边界..."
    - matcher: "Write"
      hooks:
        - type: command
          command: "bash ${CLAUDE_SKILL_DIR}/../freeze/bin/check-freeze.sh"
          statusMessage: "正在检查冻结边界..."
---
<!-- AUTO-GENERATED from SKILL.md.tmpl — do not edit directly -->
<!-- Regenerate: bun run gen:skill-docs -->

# /guard — 完整安全模式

同时激活破坏性命令警告和目录范围编辑限制。这是 `/careful` + `/freeze` 的组合命令。

**依赖说明：** 此技能引用同级 `/careful` 和 `/freeze` 技能目录中的钩子脚本。
两者必须都已安装（它们由 openclaw-skills 安装脚本一起安装）。

```bash
mkdir -p ~/.openclaw/analytics
echo '{"skill":"guard","ts":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'","repo":"'$(basename "$(git rev-parse --show-toplevel 2>/dev/null)" 2>/dev/null || echo "unknown")'"}'  >> ~/.openclaw/analytics/skill-usage.jsonl 2>/dev/null || true
```

## 设置

询问用户要将编辑限制在哪个目录。使用 AskUserQuestion：

- 问题："保护模式：应该将编辑限制在哪个目录？破坏性命令警告始终开启。所选路径之外的文件将被阻止编辑。"
- 文本输入（非多选）— 用户输入路径。

用户提供目录路径后：

1. 将其解析为绝对路径：
```bash
FREEZE_DIR=$(cd "<user-provided-path>" 2>/dev/null && pwd)
echo "$FREEZE_DIR"
```

2. 确保末尾有斜杠并保存到冻结状态文件：
```bash
FREEZE_DIR="${FREEZE_DIR%/}/"
STATE_DIR="${CLAUDE_PLUGIN_DATA:-$HOME/.openclaw}"
mkdir -p "$STATE_DIR"
echo "$FREEZE_DIR" > "$STATE_DIR/freeze-dir.txt"
echo "冻结边界已设置: $FREEZE_DIR"
```

告诉用户：
- "**保护模式已激活。** 现在运行两项保护："
- "1. **破坏性命令警告** — rm -rf、DROP TABLE、force-push 等操作在执行前会发出警告（你可以覆盖）"
- "2. **编辑边界** — 文件编辑限制在 `<path>/`。此目录外的编辑将被阻止。"
- "要移除编辑边界，请运行 `/unfreeze`。要停用所有保护，请结束会话。"

## 受保护的内容

查看 `/careful` 了解破坏性命令模式的完整列表和安全例外。
查看 `/freeze` 了解编辑边界强制执行的工作原理。
