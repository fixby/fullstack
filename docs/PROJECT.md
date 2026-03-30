# FullStack Skills 项目说明文档

## 项目简介

**FullStack Skills** 是一个专为 OpenClaw 设计的 AI 代理技能集合，提供完整的 AI 工程工作流。它包含 25 个专业技能，覆盖从产品构思、代码审查、QA 测试到部署发布的全流程。

### 核心特性

- **🤖 25 个专业技能**：覆盖软件开发生命周期的各个阶段
- **🌐 无头浏览器测试**：基于 Playwright 的快速浏览器自动化
- **🔄 完整工作流**：从 `/office-hours` 产品构思到 `/ship` 发布的一站式流程
- **🛡️ 安全护栏**：破坏性命令警告、目录冻结等安全机制
- **🇨🇳 完全汉化**：所有文档和注释均为中文

---

## 目录结构

```
fullstack/
├── bin/                      # 命令行工具
│   ├── dev-setup             # 开发环境设置
│   ├── dev-teardown          # 开发环境清理
│   ├── fullstack-analytics   # 使用统计
│   ├── fullstack-config      # 配置管理
│   ├── fullstack-diff-scope  # 差异范围检测
│   ├── fullstack-slug        # 仓库标识获取
│   └── ...
├── browse/                   # 无头浏览器模块
│   ├── src/                  # 源代码
│   │   ├── cli.ts           # 命令行入口
│   │   ├── server.ts        # HTTP 服务器
│   │   ├── browser-manager.ts # 浏览器管理
│   │   └── ...
│   ├── bin/                  # 浏览器工具
│   └── test/                 # 测试文件
├── scripts/                  # 构建脚本
│   └── gen-skill-docs.ts    # 技能文档生成器
├── test/                     # E2E 测试
├── docs/                     # 文档
│
├── office-hours/            # 产品构思技能
├── plan-ceo-review/         # CEO 级别计划审查
├── plan-eng-review/         # 工程经理计划审查
├── plan-design-review/      # 设计师计划审查
├── design-consultation/     # 设计系统创建
├── design-review/           # 视觉 QA 审计
├── review/                  # 合并前 PR 审查
├── qa/                      # QA 测试与修复
├── qa-only/                 # 仅报告的 QA 测试
├── ship/                    # 发布工作流
├── document-release/        # 发布后文档更新
├── retro/                   # 周回顾
├── investigate/             # 系统性调试
├── setup-deploy/            # 部署配置
├── land-and-deploy/         # 合并和部署
├── canary/                  # 金丝雀监控
├── benchmark/               # 性能回归检测
├── autoplan/                # 自动审查流水线
├── browse/                  # 无头浏览器技能
├── setup-browser-cookies/   # 浏览器 Cookie 导入
├── careful/                 # 破坏性命令警告
├── freeze/                  # 目录编辑限制
├── guard/                   # 完整安全模式
├── unfreeze/               # 解除冻结
│
├── SKILL.md.tmpl            # 主技能模板
├── setup                    # 安装脚本
├── package.json             # 项目配置
└── VERSION                  # 版本文件
```

---

## 安装指南

### 前置要求

- **Bun** >= 1.0.0（JavaScript 运行时）
- **Git**（版本控制）
- **OpenClaw**（AI 编程助手）

### 快速安装

```bash
# 克隆仓库
git clone https://github.com/fixby/fullstack.git ~/.openclaw/skills/fullstack

# 进入目录
cd ~/.openclaw/skills/fullstack

# 运行安装脚本
./setup
```

### 添加到项目（可选）

如果想让团队成员也能使用，可以将技能添加到项目中：

```bash
# 复制到项目目录
cp -Rf ~/.openclaw/skills/fullstack .openclaw/skills/fullstack

# 移除 .git 目录
rm -rf .openclaw/skills/fullstack/.git

# 进入目录并设置
cd .openclaw/skills/fullstack && ./setup
```

---

## 技能列表

### 🎯 产品与规划

| 技能 | 命令 | 功能描述 |
|------|------|----------|
| **办公时间** | `/office-hours` | 产品构思、头脑风暴、设计思维 |
| **CEO 审查** | `/plan-ceo-review` | CEO 级别计划审查，挑战范围和前提 |
| **工程审查** | `/plan-eng-review` | 工程经理视角的架构和测试审查 |
| **设计审查** | `/plan-design-review` | 设计师视角的 UI/UX 审查 |
| **自动计划** | `/autoplan` | 自动运行完整审查流水线 |

### 🎨 设计

| 技能 | 命令 | 功能描述 |
|------|------|----------|
| **设计咨询** | `/design-consultation` | 交互式创建设计系统和 DESIGN.md |
| **设计审计** | `/design-review` | 视觉 QA 审计，发现并修复设计问题 |

### 🔍 审查与测试

| 技能 | 命令 | 功能描述 |
|------|------|----------|
| **代码审查** | `/review` | 合并前 PR 审查，自动修复问题 |
| **QA 测试** | `/qa` | 打开真实浏览器测试，发现并修复 bug |
| **仅报告 QA** | `/qa-only` | 仅报告问题，不修改代码 |

### 🚀 发布与部署

| 技能 | 命令 | 功能描述 |
|------|------|----------|
| **发布** | `/ship` | 全自动化发布工作流，创建 PR |
| **文档更新** | `/document-release` | 发布后自动更新文档 |
| **部署配置** | `/setup-deploy` | 一次性部署平台配置 |
| **合并部署** | `/land-and-deploy` | 合并 PR 并监控部署 |
| **金丝雀** | `/canary` | 部署后监控和异常检测 |
| **性能基准** | `/benchmark` | 性能回归检测 |

### 🛠️ 工具

| 技能 | 命令 | 功能描述 |
|------|------|----------|
| **浏览器** | `/browse` | 无头浏览器自动化 |
| **Cookie 导入** | `/setup-browser-cookies` | 从浏览器导入 Cookie 用于认证测试 |
| **调试** | `/investigate` | 系统性根本原因调试 |
| **回顾** | `/retro` | 周回顾，团队改进 |

### 🛡️ 安全

| 技能 | 命令 | 功能描述 |
|------|------|----------|
| **谨慎模式** | `/careful` | 破坏性命令前警告 |
| **冻结** | `/freeze` | 限制编辑到特定目录 |
| **防护** | `/guard` | 完整安全模式（谨慎 + 冻结） |
| **解冻** | `/unfreeze` | 解除目录冻结 |

---

## 典型工作流

### 新功能开发流程

```
1. /office-hours     → 产品构思，明确需求
2. /plan-ceo-review  → CEO 审查，挑战范围
3. /plan-eng-review  → 工程审查，确认架构
4. [编写代码]
5. /review           → 代码审查，自动修复
6. /qa               → 浏览器测试
7. /ship             → 发布 PR
8. /land-and-deploy  → 合并部署
9. /canary           → 监控验证
```

### Bug 修复流程

```
1. /investigate      → 系统性调试，定位根因
2. [修复代码]
3. /review           → 代码审查
4. /qa               → 验证修复
5. /ship             → 发布
```

---

## 配置说明

### 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `OPENCLAW_STATE_DIR` | 状态文件目录 | `~/.openclaw` |
| `OPENCLAW_REMOTE_URL` | 远程版本检查 URL | GitHub VERSION 文件 |

### 配置文件

配置文件位于 `~/.openclaw/config.yaml`：

```yaml
# 更新检查设置
update_check: true    # 是否检查更新

# 上次检查时间
last_check: "2024-01-01T00:00:00Z"
```

### 状态目录

```
~/.openclaw/
├── config.yaml           # 配置文件
├── last-update-check     # 更新检查缓存
├── projects/             # 项目数据
│   └── owner-repo/
│       ├── design-*.md   # 设计文档
│       ├── qa-reports/   # QA 报告
│       └── greptile-history.md
└── browse.json           # 浏览器状态
```

---

## 开发指南

### 构建项目

```bash
# 安装依赖
bun install

# 生成技能文档
bun run gen:skill-docs

# 完整构建
bun run build

# 运行测试
bun test
```

### 开发模式

```bash
# 设置开发环境
bin/dev-setup

# 清理开发环境
bin/dev-teardown
```

### 添加新技能

1. 创建技能目录：`mkdir my-skill`
2. 创建模板文件：`my-skill/SKILL.md.tmpl`
3. 运行生成器：`bun run gen:skill-docs`
4. 生成的 `SKILL.md` 会被 OpenClaw 自动识别

### 技能模板格式

```markdown
---
name: my-skill
version: 1.0.0
description: 技能描述
allowed-tools:
  - Read
  - Write
  - Bash
---

{{PREAMBLE}}

# 技能内容

...
```

---

## 常见问题

### Q: 技能不工作怎么办？

A: 尝试重新运行安装脚本：
```bash
cd ~/.openclaw/skills/fullstack && ./setup
```

### Q: 如何禁用更新检查？

A: 运行配置命令：
```bash
~/.openclaw/skills/fullstack/bin/fullstack-config set update_check false
```

### Q: 浏览器测试失败？

A: 确保安装了 Playwright 浏览器：
```bash
npx playwright install
```

---

## 技术架构

### 核心组件

- **技能系统**：基于 YAML frontmatter 的技能定义
- **模板引擎**：`gen-skill-docs.ts` 从 `.tmpl` 生成 `SKILL.md`
- **浏览器自动化**：Playwright + 自定义 CLI
- **状态管理**：JSON 文件存储在 `~/.openclaw/`

### 依赖关系

```
FullStack Skills
├── Bun (运行时)
├── Playwright (浏览器自动化)
├── TypeScript (源码语言)
└── diff (差异比较)
```

---

## 许可证

MIT License

---

## 贡献指南

欢迎贡献代码和反馈！请查看 [CONTRIBUTING.md](CONTRIBUTING.md) 了解详情。

---

## 更新日志

查看 [CHANGELOG.md](CHANGELOG.md) 了解版本历史和更新内容。
