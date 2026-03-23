# 贡献指南

感谢你对 gstack-openclaw 的兴趣！🙏

## 如何贡献

### 1. 报告 Bug

如果你发现了 bug，请提交 Issue：

```markdown
**描述**：简短的 bug 描述

**复现步骤**：
1. 运行 `/office-hours`
2. 输入 "我想做一个 AI 应用"
3. 看到 [错误信息]

**预期行为**：应该 [期望的行为]

**实际行为**：[实际发生的事]

**环境**：
- OpenClaw 版本：
- 操作系统：
- Python 版本：
```

### 2. 建议新功能

如果你有想法，请提交 Issue：

```markdown
**功能描述**：你想要什么功能？

**使用场景**：什么时候会用到？

**可能的实现**：你有什么想法吗？
```

### 3. 提交代码

#### 第一步：Fork 项目

```bash
git clone https://github.com/yourusername/gstack-openclaw.git
cd gstack-openclaw
```

#### 第二步：创建分支

```bash
git checkout -b feature/your-feature-name
```

#### 第三步：做出改动

遵循以下规则：

1. **Skill 结构**：
   ```
   skills/your-skill/
   ├── SKILL.md          # 必需：skill 定义和文档
   ├── scripts/          # 可选：辅助脚本
   └── README.md         # 可选：详细说明
   ```

2. **SKILL.md 格式**：
   ```yaml
   ---
   name: your-skill
   version: 1.0.0
   description: |
     简短描述
     
     详细描述
   allowed-tools:
     - Bash
     - Read
     - AskUserQuestion
   ---
   
   # 你的 Skill 文档
   ```

3. **代码风格**：
   - 使用清晰的变量名
   - 添加注释解释复杂逻辑
   - 遵循 gstack 的核心理念

#### 第四步：测试

```bash
# 安装你的 skill
openclaw skills install ./skills/your-skill

# 测试它
/your-skill

# 验证输出
```

#### 第五步：提交 PR

```bash
git add .
git commit -m "feat: add your-skill"
git push origin feature/your-feature-name
```

然后在 GitHub 上提交 Pull Request。

## PR 检查清单

提交 PR 前，请确保：

- [ ] 代码遵循项目风格
- [ ] 添加了必要的文档
- [ ] 测试了 skill 的功能
- [ ] 没有破坏现有功能
- [ ] 提交信息清晰明了

## 提交信息规范

使用以下格式：

```
<type>: <subject>

<body>

<footer>
```

### Type

- `feat`: 新功能
- `fix`: Bug 修复
- `docs`: 文档更新
- `style`: 代码风格（不改变功能）
- `refactor`: 代码重构
- `test`: 添加测试
- `chore`: 构建、依赖等

### Subject

- 使用祈使句（"add" 而不是 "added"）
- 不要大写首字母
- 不要在末尾加句号
- 限制在 50 个字符以内

### Body

- 解释**是什么**和**为什么**，不是**怎样**
- 每行 72 个字符
- 分离主题和正文用空行

### Footer

- 引用相关 Issue：`Closes #123`
- 破坏性变更：`BREAKING CHANGE: description`

### 例子

```
feat: add plan-ceo-review skill

Add a new skill that provides CEO-level product review.
This skill asks 6 soul-searching questions and provides
3 implementation options with effort/value estimates.

Closes #42
```

## 开发工作流程

### 本地开发

```bash
# 克隆项目
git clone https://github.com/yourusername/gstack-openclaw.git
cd gstack-openclaw

# 创建虚拟环境（如果需要）
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 安装依赖
pip install -r requirements.txt

# 安装所有 skills
openclaw skills install ./skills/*
```

### 测试 Skill

```bash
# 测试单个 skill
/your-skill

# 查看日志
tail -f ~/.openclaw/logs/skill.log

# 调试
/your-skill --debug
```

### 提交前检查

```bash
# 检查代码风格
pylint skills/*/scripts/*.py

# 运行测试
pytest tests/

# 检查文档
markdownlint *.md skills/*/SKILL.md
```

## 项目结构

```
gstack-openclaw/
├── skills/                    # 所有 skills
│   ├── office-hours/         # YC 办公时间
│   ├── ceo-thinking/         # CEO 思维框架
│   ├── plan-ceo-review/      # CEO 产品审查
│   ├── plan-eng-review/      # 工程师架构审查
│   ├── plan-design-review/   # 设计师 UI/UX 审查
│   ├── review/               # 代码审查
│   ├── qa/                   # QA 测试
│   └── ...
├── docs/                      # 文档
├── tests/                     # 测试
├── README.md                  # 项目说明
├── PHILOSOPHY.md              # 核心理念
├── CONTRIBUTING.md            # 本文件
└── LICENSE                    # MIT 许可证
```

## 核心理念

在贡献前，请阅读 [PHILOSOPHY.md](./PHILOSOPHY.md)，了解 gstack-openclaw 的核心理念：

1. **完整性原则**（Boil the Lake）—— 总是推荐完整实现
2. **问题重新定义** —— CEO 的工作是重新定义问题
3. **流程驱动** —— 遵循完整的软件工程流程
4. **搜索优先** —— 构建前先搜索

## 获得帮助

- 📖 查看 [README.md](./README.md)
- 💬 在 Issue 中提问
- 🐛 报告 Bug
- 💡 建议功能

## 行为准则

我们致力于提供一个热情、包容的环境。

- 尊重所有贡献者
- 接受建设性批评
- 专注于对项目最有利的事
- 对其他社区成员表示同情

## 许可证

通过贡献，你同意你的贡献将在 MIT 许可证下发布。

---

**感谢你的贡献！** 🎉
