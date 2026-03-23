# gstack-openclaw

> 将 Y Combinator 总裁 Garry Tan 的 **gstack** 项目改写为 OpenClaw 的 skill 集合。

gstack 是一套完整的 AI 驱动的软件工程工具集，包含 CEO 思维、工程审查、QA 测试、代码审查等 28 个 skill。

这个项目将 gstack 的核心理念移植到 OpenClaw，让所有 OpenClaw 用户都能使用这套强大的工具。

## 📦 包含的 Skills

### 第一阶段（已完成）
- ✅ `office-hours` - YC 办公时间，6 个灵魂拷问
- ✅ `ceo-thinking` - CEO 思维框架分析

### 第二阶段（进行中）
- 🔄 `plan-ceo-review` - CEO 视角的产品审查
- 🔄 `plan-eng-review` - 工程师视角的架构审查
- 🔄 `plan-design-review` - 设计师视角的 UI/UX 审查
- 🔄 `review` - 代码审查（找 CI 测不出来的 bug）
- 🔄 `qa` - QA 测试（打开真实浏览器测试）

### 第三阶段（计划中）
- ⏳ `ship` - 发布工程师（一键开 PR）
- ⏳ `investigate` - 调试器（系统化的根因分析）
- ⏳ `retro` - 团队回顾（每周代码产出统计）
- ⏳ 其他 20+ skills...

## 🚀 快速开始

### 安装

```bash
# 克隆项目
git clone https://github.com/yourusername/gstack-openclaw.git
cd gstack-openclaw

# 安装所有 skills
openclaw skills install ./skills/*

# 或者单独安装
openclaw skills install ./skills/office-hours
openclaw skills install ./skills/ceo-thinking
```

### 使用

```bash
# 用 YC 办公时间分析你的想法
/office-hours

# 用 CEO 思维框架分析产品方向
/ceo-review "我想做一个 AI 日程管理应用"

# 用 CEO 视角审查产品计划
/plan-ceo-review

# 用工程师视角审查架构
/plan-eng-review

# 用设计师视角审查 UI/UX
/plan-design-review

# 代码审查
/review

# QA 测试
/qa https://staging.myapp.com
```

## 📚 核心理念

### 1. 完整性原则（Boil the Lake）

AI 让边际成本接近零。当你呈现选项时：
- 如果选项 A 是完整实现，选项 B 是快捷方案，**总是推荐 A**
- 完整实现只需多花几分钟，但价值大得多

### 2. 问题重新定义

CEO 的工作不是执行，而是**问题重新定义**：
- 听你的痛点，不是你的解决方案
- 挑战你的假设
- 找到隐藏的机会
- 权衡取舍

### 3. 流程驱动

gstack 遵循完整的软件工程流程：

```
思考 → 规划 → 构建 → 审查 → 测试 → 发布 → 反思
Think → Plan → Build → Review → Test → Ship → Reflect
```

每个 skill 都是这个流程中的一个环节。

## 🏗️ 项目结构

```
gstack-openclaw/
├── skills/
│   ├── office-hours/
│   │   ├── SKILL.md
│   │   └── scripts/
│   ├── ceo-thinking/
│   │   ├── SKILL.md
│   │   └── scripts/
│   ├── plan-ceo-review/
│   ├── plan-eng-review/
│   ├── plan-design-review/
│   ├── review/
│   ├── qa/
│   └── ... (更多 skills)
├── README.md
├── PHILOSOPHY.md
├── CONTRIBUTING.md
└── LICENSE (MIT)
```

## 🎯 目标

1. **让 OpenClaw 用户能使用 gstack 的完整工具集**
2. **保持 gstack 的核心理念和工作流程**
3. **适配 OpenClaw 的 skill 标准**
4. **建立一个开源的、社区驱动的项目**

## 📖 文档

- [PHILOSOPHY.md](./PHILOSOPHY.md) - gstack 的核心理念
- [CONTRIBUTING.md](./CONTRIBUTING.md) - 如何贡献
- [SKILLS.md](./SKILLS.md) - 所有 skills 的详细文档

## 🤝 贡献

欢迎贡献！请查看 [CONTRIBUTING.md](./CONTRIBUTING.md) 了解如何参与。

## 📄 许可证

MIT License - 与原 gstack 项目保持一致

## 🙏 致谢

- 感谢 Garry Tan 和 Y Combinator 创建了 gstack
- 感谢 OpenClaw 社区的支持

---

**Made with ❤️ for OpenClaw users**
