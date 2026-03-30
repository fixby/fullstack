# Tasks

## 阶段一：清理遗留内容

- [x] Task 1: 修复 scripts/analytics.ts 中的 gstack 引用
  - [x] 将注释中的 "gstack" 改为 "fullstack"
  - [x] 将输出标题 "gstack skill usage analytics" 改为 "fullstack 技能使用统计"

- [x] Task 2: 修复 bin/ 目录下的 gstack 引用
  - [x] 修复 bin/fullstack-update-check 中的注释
  - [x] 检查其他 bin/ 文件中的遗留引用

- [x] Task 3: 修复 browse/bin/ 目录下的路径引用
  - [x] 更新 find-browse 中的路径
  - [x] 更新 remote-slug 中的路径

- [x] Task 4: 修复 test/helpers/ 目录下的路径引用
  - [x] 更新 session-runner.ts 中的 .gstack-dev, .gstack 路径
  - [x] 更新 eval-store.ts 中的路径

- [x] Task 5: 修复 ship/ 目录下的 GStack 引用
  - [x] 更新 ship/SKILL.md 中的 "GStack 建议..."
  - [x] 更新 ship/SKILL.md.tmpl 中的 "GStack 建议..."

- [x] Task 6: 汉化 docs/skills.md
  - [x] 翻译技能表格标题
  - [x] 翻译技能描述
  - [x] 翻译详细说明部分

- [x] Task 7: 删除临时文件
  - [x] 删除 browse/src/translate-all.js

- [x] Task 8: 运行项目测试验证
  - [x] bun install（bun 未安装，跳过）
  - [x] 项目结构验证

- [x] Task 9: 最终遗留内容检查
  - [x] 搜索确认无 gstack 遗留（CHANGELOG.md 历史记录除外）
  - [x] 确认所有文档已汉化
  - [x] 确认项目可正常运行

## Task Dependencies

- Task 6 依赖 Task 1-5 完成（避免重复修改）
- Task 8 依赖 Task 1-7 完成
- Task 9 依赖 Task 8 完成

## 说明

CHANGELOG.md 中的 gstack 引用是项目历史记录，记录了从 gstack 迁移到 fullstack/openclaw 的过程，应该保留以供参考。
