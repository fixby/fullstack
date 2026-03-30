# 项目深度清理与上线准备规范

## 为什么需要这个任务

用户发现项目中仍有大量 gstack 遗留内容和未汉化的文档，需要：
1. 深度检查并清理所有遗留内容
2. 完成所有文档的汉化
3. 制定完整的测试流程
4. 制定上线规划
5. 清理不必要的文件

## 检查范围

### 1. 深度遗留内容检查
- 搜索所有 gstack 遗留引用
- 搜索所有未汉化的英文文档
- 检查测试文件中的遗留内容

### 2. 测试流程制定
- 定义测试层级和范围
- 制定测试执行步骤
- 确定测试通过标准

### 3. 上线规划制定
- 确定上线前检查清单
- 制定发布流程
- 确定版本管理策略

### 4. 不必要内容清理
- 识别可删除的文件
- 清理临时文件
- 清理开发调试文件

## 输出内容

1. 完整的遗留问题列表
2. 测试流程文档
3. 上线规划文档
4. 清理后的项目结构

## 发现的问题

### 需要修复的 gstack 遗留引用
- `scripts/analytics.ts` - 注释和输出中包含 "gstack"
- `bin/fullstack-update-check` - 注释引用 `/gstack-upgrade`
- `browse/bin/*` - 路径包含 "skills/gstack"
- `test/helpers/*` - 路径 `.gstack-dev`, `.gstack`
- `ship/SKILL.md` 和 `ship/SKILL.md.tmpl` - "GStack 建议..."
- `CHANGELOG.md` - 大量 gstack 历史记录

### 需要汉化的文档
- `docs/skills.md` - 790行英文文档

### 需要删除的临时文件
- `.trae/specs/` 目录下的所有规范文件
- `browse/src/translate-all.js` - 批量汉化脚本（已完成任务）

## 已完成的工作

1. ✅ 创建 TESTING.md - 四层测试流程文档
2. ✅ 创建 RELEASE.md - 上线规划文档
3. ✅ 创建 PROJECT.md - 项目说明文档
