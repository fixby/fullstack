# FullStack Skills 项目发布 GitHub 规范

## 为什么需要这个任务

用户希望将 FullStack Skills 项目发布到 GitHub，供其他用户安装使用。需要检查项目是否完整，并制定发布流程。

## 当前项目状态

### Git 状态
- **分支**：main
- **远程仓库**：`https://github.com/fixby/fullstsck.git`
- **状态**：有未提交的更改和未追踪的文件

### 文件状态
**已修改（待提交）：**
- .gitignore
- CONTRIBUTING.md
- LICENSE
- README.md

**已删除：**
- PHILOSOPHY.md
- PROJECT_STATUS.md

**未追踪（新文件）：**
- 技能目录：autoplan/, benchmark/, browse/, careful/, design-consultation/, design-review/, document-release/, freeze/, guard/, investigate/, land-and-deploy/, office-hours/, plan-ceo-review/, plan-design-review/, plan-eng-review/, qa/, qa-only/, retro/, review/, setup-browser-cookies/, setup-deploy/, ship/, unfreeze/
- 文档：AGENTS.md, ARCHITECTURE.md, BROWSER.md, CHANGELOG.md, CLAUDE.md, ETHOS.md, SKILL.md, TODOS.md, docs/
- 脚本：bin/, scripts/, test/
- 配置：.env.example, .github/, agents/, package.json, VERSION

## 需要完成的工作

### 1. 代码完整性检查
- [ ] 确认所有技能目录都有 SKILL.md 文件
- [ ] 确认 gen-skill-docs 生成正常
- [ ] 确认二进制文件构建成功

### 2. 文档完整性检查
- [ ] README.md 完整且准确
- [ ] CONTRIBUTING.md 包含贡献指南
- [ ] CHANGELOG.md 记录变更
- [ ] LICENSE 是 MIT 许可证

### 3. Git 配置检查
- [ ] .gitignore 配置正确
- [ ] 没有敏感文件被追踪
- [ ] 分支命名规范

### 4. 发布前检查清单
- [ ] 版本号已更新
- [ ] 所有更改已提交
- [ ] 本地测试通过

### 5. GitHub 发布流程
- [ ] 创建 GitHub Release
- [ ] 编写发布说明
- [ ] 验证安装命令

## 技能列表（25个）

| 技能 | 说明 |
|------|------|
| /office-hours | YC 办公时间 - 产品重新框架 |
| /plan-ceo-review | CEO 级别审查 - 10星产品 |
| /plan-eng-review | 工程经理审查 - 架构和数据流 |
| /plan-design-review | 设计审查 - UI/UX 评分 |
| /design-consultation | 设计合伙人 - 从零构建设计系统 |
| /review | 资深工程师 - PR 审查 |
| /investigate | 调试器 - 根本原因分析 |
| /design-review | 设计师 - 线上站点视觉审计 |
| /qa | QA 负责人 - 自动化测试 |
| /qa-only | QA 报告员 - 只读测试 |
| /ship | 发布工程师 - 自动发布 |
| /document-release | 文档工程师 - 文档更新 |
| /retro | 团队回顾 - 周回顾 |
| /browse | QA 工程师 - 无头浏览器 |
| /setup-browser-cookies | 会话管理 - Cookie 导入 |
| /careful | 安全护栏 - 破坏性命令警告 |
| /freeze | 编辑锁定 - 目录保护 |
| /guard | 全面安全 - careful + freeze |
| /unfreeze | 解锁 - 移除编辑限制 |
| /canary | 金丝雀发布 - 增量验证 |
| /benchmark | 性能基准 - 速度测试 |
| /autoplan | 自动规划 - 智能任务分解 |
| /land-and-deploy | 部署技能 - 一键部署 |
| /setup-deploy | 部署配置 - 环境设置 |
