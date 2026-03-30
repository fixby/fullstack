# FullStack Skills — AI 工程工作流

FullStack Skills 是一个 SKILL.md 文件集合，为 AI 代理提供结构化的软件开发角色。每个技能都是一个专家：CEO 审查者、工程经理、设计师、QA 负责人、发布工程师、调试器等。

## 可用技能

技能存放在 `.agents/skills/` 中。通过名称调用（例如 `/office-hours`）。

| 技能                       | 功能                                        |
| ------------------------ | ----------------------------------------- |
| `/office-hours`          | 从这里开始。在你写代码之前重新框架你的产品想法。                  |
| `/plan-ceo-review`       | CEO 级别审查：找到请求中的 10 星产品。                   |
| `/plan-eng-review`       | 锁定架构、数据流、边缘情况和测试。                         |
| `/plan-design-review`    | 对每个设计维度评分 0-10，解释 10 分是什么样子。              |
| `/design-consultation`   | 从头构建完整的设计系统。                              |
| `/review`                | 合并前 PR 审查。找到通过 CI 但在生产环境中爆炸的 bug。         |
| `/debug`                 | 系统性的根本原因调试。没有调查就没有修复。                     |
| `/design-review`         | 设计审计 + 修复循环，原子提交。                         |
| `/qa`                    | 打开真实浏览器，发现 bug，修复它们，重新验证。                 |
| `/qa-only`               | 与 /qa 相同但只报告 — 不修改代码。                     |
| `/ship`                  | 运行测试、审查、推送、打开 PR。一个命令。                    |
| `/document-release`      | 更新所有文档以匹配你刚发布的内容。                         |
| `/retro`                 | 周回顾，每人分解和发布连续性。                           |
| `/browse`                | 无头浏览器 — 真实 Chromium，真实点击，约 100ms/命令。      |
| `/setup-browser-cookies` | 从你的真实浏览器导入 cookies 用于认证测试。                |
| `/careful`               | 在破坏性命令之前警告（rm -rf、DROP TABLE、force-push）。 |
| `/freeze`                | 将编辑锁定到一个目录。硬性阻止，不只是警告。                    |
| `/guard`                 | 同时激活 careful + freeze。                    |
| `/unfreeze`              | 移除目录编辑限制。                                 |

## 构建命令

```bash
bun install              # 安装依赖
bun test                 # 运行测试（免费，<5秒）
bun run build            # 生成文档 + 编译二进制文件
bun run gen:skill-docs   # 从模板重新生成 SKILL.md 文件
bun run skill:check      # 所有技能的健康仪表板
```

## 关键约定

- SKILL.md 文件是从 `.tmpl` 模板**生成**的。编辑模板，而不是输出。
- 运行 `bun run gen:skill-docs --host codex` 重新生成 Codex 特定的输出。
- browse 二进制文件提供无头浏览器访问。在技能中使用 `$B <命令>`。
- 安全技能（careful、freeze、guard）使用内联建议文本 — 在破坏性操作前总是确认。

