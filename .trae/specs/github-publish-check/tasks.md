# Tasks

## 阶段一：代码完整性检查

- [ ] Task 1: 确认所有技能目录都有 SKILL.md 文件
  - [ ] 检查 25 个技能目录是否有 SKILL.md
  - [ ] 验证 gen-skill-docs 能正常生成

- [ ] Task 2: 确认二进制文件构建成功
  - [ ] 检查 browse/dist/ 目录下的 .exe 文件
  - [ ] 检查 bin/ 目录下的脚本文件

## 阶段二：文档完整性检查

- [ ] Task 3: 验证 README.md 完整性
  - [ ] 确认安装说明准确
  - [ ] 确认技能列表完整

- [ ] Task 4: 验证其他文档
  - [ ] CONTRIBUTING.md - 贡献指南
  - [ ] CHANGELOG.md - 变更日志
  - [ ] LICENSE - MIT 许可证

## 阶段三：Git 配置检查

- [ ] Task 5: 验证 .gitignore 配置
  - [ ] 确认不追踪敏感文件
  - [ ] 确认不追踪构建产物

- [ ] Task 6: 清理不必要的文件
  - [ ] 检查是否有遗留的 gstack 文件
  - [ ] 删除 .trae/specs 目录（开发规范）

## 阶段四：Git 提交

- [ ] Task 7: 提交所有更改
  - [ ] git add 所有文件
  - [ ] 编写提交信息
  - [ ] 推送到 GitHub

## 阶段五：GitHub Release

- [ ] Task 8: 创建 GitHub Release
  - [ ] 创建 tag v1.0.0
  - [ ] 编写发布说明
  - [ ] 验证安装命令

# Task Dependencies
- Task 7 依赖 Task 1-6 完成
- Task 8 依赖 Task 7 完成
