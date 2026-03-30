# FullStack Skills 上线规划文档

本文档定义了 FullStack Skills 项目的完整上线流程、检查清单和回滚计划。

---

## 目录

1. [上线前检查清单](#1-上线前检查清单)
2. [发布流程](#2-发布流程)
3. [安装验证](#3-安装验证)
4. [回滚计划](#4-回滚计划)

---

## 1. 上线前检查清单

### 1.1 代码质量检查

| 检查项 | 命令 | 预期结果 | 负责人 |
|--------|------|----------|--------|
| 静态测试通过 | `bun test` | 所有测试通过，无错误 | 开发者 |
| 技能文档生成 | `bun run gen:skill-docs` | 无错误，生成成功 | 开发者 |
| 技能文档生成（Codex） | `bun run gen:skill-docs --host codex` | 无错误，生成成功 | 开发者 |
| 技能健康检查 | `bun run skill:check` | 所有技能状态正常 | 开发者 |
| 二进制构建 | `bun run build` | browse 二进制生成成功 | 开发者 |
| TypeScript 类型检查 | `bunx tsc --noEmit` | 无类型错误 | 开发者 |
| 代码风格检查 | `bunx eslint browse/src/` | 无 lint 错误 | 开发者 |

#### 详细检查步骤

```bash
# 步骤 1: 安装依赖
bun install

# 步骤 2: 运行静态测试（免费，<5秒）
bun test

# 步骤 3: 生成技能文档
bun run gen:skill-docs
bun run gen:skill-docs --host codex

# 步骤 4: 检查技能健康状态
bun run skill:check

# 步骤 5: 构建二进制文件
bun run build

# 步骤 6: 验证构建产物
ls -la browse/dist/browse
ls -la browse/dist/find-browse
ls -la browse/dist/.version
```

### 1.2 功能完整性检查

| 检查项 | 验证方法 | 预期结果 |
|--------|----------|----------|
| Browse 命令可用 | `./browse/dist/browse help` | 显示命令列表 |
| 快照功能正常 | `./browse/dist/browse snapshot --help` | 显示帮助信息 |
| 技能文件完整 | 检查所有 `*/SKILL.md` 文件存在 | 所有技能目录都有 SKILL.md |
| 模板文件同步 | 对比 `.tmpl` 和 `.md` 文件 | 内容一致 |
| 安装脚本可执行 | `./setup --help` 或检查权限 | 脚本可执行 |

#### 技能完整性验证

```bash
# 验证所有技能目录都有 SKILL.md 文件
for dir in */; do
  if [ -f "$dir/SKILL.md.tmpl" ] && [ ! -f "$dir/SKILL.md" ]; then
    echo "缺失: $dir/SKILL.md"
  fi
done

# 验证核心技能存在
CORE_SKILLS=("office-hours" "plan-ceo-review" "plan-eng-review" "review" "ship" "qa" "browse" "retro")
for skill in "${CORE_SKILLS[@]}"; do
  if [ ! -f "$skill/SKILL.md" ]; then
    echo "错误: 核心技能 $skill 缺失"
    exit 1
  fi
done
echo "所有核心技能验证通过"
```

### 1.3 文档完整性检查

| 文档 | 检查内容 | 状态 |
|------|----------|------|
| README.md | 安装说明、快速开始、技能列表 | [ ] |
| CHANGELOG.md | 本次版本变更记录 | [ ] |
| VERSION | 版本号已更新 | [ ] |
| ARCHITECTURE.md | 架构说明与代码一致 | [ ] |
| CONTRIBUTING.md | 贡献指南更新 | [ ] |
| BROWSER.md | 浏览器命令文档完整 | [ ] |
| ETHOS.md | 构建者理念文档 | [ ] |
| docs/skills.md | 技能深入解析文档 | [ ] |

#### 文档一致性检查

```bash
# 检查 VERSION 文件格式
VERSION=$(cat VERSION)
if [[ ! $VERSION =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "错误: VERSION 格式不正确: $VERSION"
  echo "期望格式: X.Y.Z.W (如 1.0.0.0)"
  exit 1
fi
echo "VERSION 格式正确: $VERSION"

# 检查 CHANGELOG.md 包含当前版本
if ! grep -q "## \[$VERSION\]" CHANGELOG.md && ! grep -q "## $VERSION" CHANGELOG.md; then
  echo "警告: CHANGELOG.md 未找到版本 $VERSION 的记录"
fi

# 检查 package.json 版本与 VERSION 文件一致
PACKAGE_VERSION=$(grep '"version"' package.json | head -1 | sed 's/.*: *"\([^"]*\)".*/\1/')
if [ "$VERSION" != "$PACKAGE_VERSION" ]; then
  echo "警告: VERSION ($VERSION) 与 package.json ($PACKAGE_VERSION) 不一致"
fi
```

### 1.4 安全检查

| 检查项 | 验证方法 | 预期结果 |
|--------|----------|----------|
| 无敏感信息泄露 | `grep -r "api_key\|password\|secret" --include="*.ts" --include="*.js"` | 无硬编码敏感信息 |
| .env.example 完整 | 检查 `.env.example` 文件 | 包含必要的环境变量说明 |
| .gitignore 完整 | 检查 `.gitignore` 文件 | 忽略敏感文件和构建产物 |
| 依赖安全审计 | `bun audit` | 无已知漏洞 |
| 文件权限正确 | `ls -la setup browse/dist/*` | 可执行文件有执行权限 |

#### 安全检查脚本

```bash
# 检查是否有敏感信息泄露
echo "检查敏感信息..."
grep -rn "sk-ant-\|sk-\|api_key\s*=\s*['\"]" --include="*.ts" --include="*.js" --include="*.md" . 2>/dev/null | grep -v ".env.example" | grep -v "node_modules" || echo "未发现硬编码的敏感信息"

# 检查 .gitignore
echo "检查 .gitignore..."
REQUIRED_IGNORES=(".env" "node_modules" "browse/dist" "*.log" ".DS_Store")
for ignore in "${REQUIRED_IGNORES[@]}"; do
  if ! grep -q "$ignore" .gitignore; then
    echo "警告: .gitignore 缺少: $ignore"
  fi
done

# 依赖安全审计
echo "运行依赖安全审计..."
bun audit || echo "注意: 请检查审计结果"
```

### 1.5 CI/CD 检查

| 检查项 | 验证方法 | 预期结果 |
|--------|----------|----------|
| GitHub Actions 配置正确 | 检查 `.github/workflows/skill-docs.yml` | 配置语法正确 |
| CI 能正常运行 | 推送到测试分支触发 CI | CI 通过 |

---

## 2. 发布流程

### 2.1 版本号管理

FullStack Skills 使用四段式版本号：`MAJOR.MINOR.PATCH.MICRO`

```
MAJOR  - 不兼容的 API 变更
MINOR  - 向后兼容的功能新增
PATCH  - 向后兼容的问题修复
MICRO  - 内部改进、文档更新、小优化
```

#### 版本升级规则

| 变更类型 | 版本升级 | 示例 |
|----------|----------|------|
| 破坏性变更 | MAJOR | 1.0.0.0 → 2.0.0.0 |
| 新增技能或重大功能 | MINOR | 1.0.0.0 → 1.1.0.0 |
| Bug 修复 | PATCH | 1.0.0.0 → 1.0.1.0 |
| 文档更新、小优化 | MICRO | 1.0.0.0 → 1.0.0.1 |

#### 版本更新命令

```bash
# 读取当前版本
CURRENT_VERSION=$(cat VERSION)
echo "当前版本: $CURRENT_VERSION"

# 更新版本（示例：PATCH 升级）
NEW_VERSION="1.0.1.0"
echo "$NEW_VERSION" > VERSION

# 同步更新 package.json
# 手动编辑或使用命令：
# sed -i "s/\"version\": \".*\"/\"version\": \"$NEW_VERSION\"/" package.json
```

### 2.2 CHANGELOG 更新

每次发布必须更新 `CHANGELOG.md`，遵循以下格式：

```markdown
## [版本号] - YYYY-MM-DD — 发布标题

### Added（新增）
- 新功能描述

### Changed（变更）
- 变更描述

### Fixed（修复）
- 修复描述

### Removed（移除）
- 移除描述

### For contributors（贡献者相关）
- 开发者相关变更
```

#### CHANGELOG 更新示例

```markdown
## [1.1.0.0] - 2026-03-25 — 新增技能支持

### Added
- 新增 `/autoplan` 技能，支持自动审查流水线
- 新增 Windows 11 完整支持

### Changed
- 优化 browse 二进制启动速度
- 更新文档以反映新的技能列表

### Fixed
- 修复 zsh 兼容性问题
- 修复 cookie 导入在特定场景下的失败

### For contributors
- 更新测试框架配置
- 新增 E2E 测试用例
```

### 2.3 Git 提交规范

#### 提交消息格式

```
<type>(<scope>): <subject>

<body>

<footer>
```

#### 提交类型

| 类型 | 说明 | 示例 |
|------|------|------|
| `feat` | 新功能 | `feat(browse): 新增截图裁剪功能` |
| `fix` | Bug 修复 | `fix(snapshot): 修复引用过时检测` |
| `docs` | 文档更新 | `docs(readme): 更新安装说明` |
| `style` | 代码格式 | `style(commands): 格式化代码` |
| `refactor` | 重构 | `refactor(server): 重构命令分发逻辑` |
| `test` | 测试 | `test(browse): 新增 cookie 导入测试` |
| `chore` | 构建/工具 | `chore(ci): 更新 GitHub Actions 配置` |
| `perf` | 性能优化 | `perf(snapshot): 优化快照生成速度` |

#### 提交示例

```bash
# 功能新增
git commit -m "feat(browse): 新增截图裁剪功能

- 支持 CSS 选择器裁剪
- 支持 @ref 引用裁剪
- 支持区域坐标裁剪

Closes #123"

# Bug 修复
git commit -m "fix(snapshot): 修复引用过时检测

SPA 导航后引用未正确清除，导致点击错误元素。
现在在 resolveRef 前检查元素数量。

Fixes #456"

# 版本发布
git commit -m "release: v1.1.0.0

- 新增 /autoplan 技能
- 修复 zsh 兼容性问题
- 更新文档"
```

### 2.4 发布标签创建

#### 发布流程

```bash
# 步骤 1: 确保在 main 分支
git checkout main
git pull origin main

# 步骤 2: 运行完整测试
bun test
bun run build

# 步骤 3: 更新版本号
echo "1.1.0.0" > VERSION
# 同时更新 package.json 中的 version

# 步骤 4: 更新 CHANGELOG.md
# 添加新版本的变更记录

# 步骤 5: 提交版本更新
git add VERSION package.json CHANGELOG.md
git commit -m "release: v1.1.0.0"

# 步骤 6: 创建标签
git tag -a v1.1.0.0 -m "Release v1.1.0.0

主要变更:
- 新增 /autoplan 技能
- 修复 zsh 兼容性问题
- Windows 11 完整支持"

# 步骤 7: 推送提交和标签
git push origin main
git push origin v1.1.0.0

# 步骤 8: 在 GitHub 创建 Release
gh release create v1.1.0.0 \
  --title "v1.1.0.0" \
  --notes "## 主要变更

### 新增
- 新增 /autoplan 技能，支持自动审查流水线
- 新增 Windows 11 完整支持

### 修复
- 修复 zsh 兼容性问题
- 修复 cookie 导入在特定场景下的失败

### 安装
\`\`\`bash
git clone https://github.com/fixby/fullstsck.git ~/.openclaw/skills/fullstack
cd ~/.openclaw/skills/fullstack
./setup
\`\`\`
"
```

### 2.5 发布检查清单

发布前必须确认以下所有项目：

- [ ] 所有测试通过（`bun test`）
- [ ] 构建成功（`bun run build`）
- [ ] VERSION 文件已更新
- [ ] package.json 版本已更新
- [ ] CHANGELOG.md 已更新
- [ ] 文档已同步更新
- [ ] Git 标签已创建
- [ ] GitHub Release 已创建
- [ ] 安装脚本测试通过

---

## 3. 安装验证

### 3.1 安装脚本测试

#### 测试环境

| 环境 | 操作系统 | 运行时 | 测试状态 |
|------|----------|--------|----------|
| macOS | macOS 14+ | Bun 1.0+ | [ ] |
| Linux | Ubuntu 22.04+ | Bun 1.0+ | [ ] |
| Windows | Windows 11 | Bun 1.0+ + Node.js | [ ] |

#### 全新安装测试

```bash
# 测试 1: 全新安装
rm -rf ~/.openclaw/skills/fullstack
git clone https://github.com/fixby/fullstsck.git ~/.openclaw/skills/fullstack
cd ~/.openclaw/skills/fullstack
./setup

# 验证安装
echo "验证安装结果..."
[ -x "browse/dist/browse" ] && echo "✓ browse 二进制存在且可执行"
[ -d ".agents/skills" ] && echo "✓ Codex 技能目录已生成"
[ -L "$HOME/.openclaw/skills/ship" ] && echo "✓ 技能符号链接已创建"
```

#### 升级安装测试

```bash
# 测试 2: 从旧版本升级
cd ~/.openclaw/skills/fullstack
OLD_VERSION=$(cat VERSION)
git fetch origin
git checkout main
git pull origin main
./setup
NEW_VERSION=$(cat VERSION)

echo "升级: $OLD_VERSION → $NEW_VERSION"
[ "$OLD_VERSION" != "$NEW_VERSION" ] && echo "✓ 版本已更新"
```

#### 项目本地安装测试

```bash
# 测试 3: 项目本地安装
mkdir -p /tmp/test-project/.openclaw/skills
cp -R ~/.openclaw/skills/fullstack /tmp/test-project/.openclaw/skills/
cd /tmp/test-project/.openclaw/skills/fullstack
./setup

# 验证
[ -L ".openclaw/skills/ship" ] && echo "✓ 项目本地技能链接成功"
```

### 3.2 路径配置验证

#### 验证脚本

```bash
#!/bin/bash
# 验证路径配置

echo "=== 路径配置验证 ==="

# 检查全局安装路径
GLOBAL_PATH="$HOME/.openclaw/skills/fullstack"
if [ -d "$GLOBAL_PATH" ]; then
  echo "✓ 全局安装路径存在: $GLOBAL_PATH"
else
  echo "✗ 全局安装路径不存在"
fi

# 检查技能符号链接
SKILLS_DIR="$HOME/.openclaw/skills"
EXPECTED_SKILLS=("ship" "review" "qa" "browse" "retro" "office-hours")
for skill in "${EXPECTED_SKILLS[@]}"; do
  if [ -L "$SKILLS_DIR/$skill" ]; then
    echo "✓ 技能链接存在: $skill"
  else
    echo "✗ 技能链接缺失: $skill"
  fi
done

# 检查 browse 二进制
BROWSE_BIN="$GLOBAL_PATH/browse/dist/browse"
if [ -x "$BROWSE_BIN" ]; then
  echo "✓ browse 二进制可执行"
  $BROWSE_BIN help | head -5
else
  echo "✗ browse 二进制不可执行"
fi

# 检查状态目录
STATE_DIR="$HOME/.fullstack"
if [ -d "$STATE_DIR" ]; then
  echo "✓ 状态目录存在: $STATE_DIR"
else
  echo "✗ 状态目录不存在"
fi

# 检查 .agents 目录（Codex 支持）
AGENTS_DIR="$GLOBAL_PATH/.agents/skills"
if [ -d "$AGENTS_DIR" ]; then
  echo "✓ Codex 技能目录存在"
  ls "$AGENTS_DIR" | head -5
else
  echo "✗ Codex 技能目录不存在"
fi
```

### 3.3 依赖安装验证

#### 依赖检查

```bash
#!/bin/bash
# 依赖安装验证

echo "=== 依赖安装验证 ==="

# 检查 Bun
if command -v bun &> /dev/null; then
  BUN_VERSION=$(bun --version)
  echo "✓ Bun 已安装: $BUN_VERSION"
else
  echo "✗ Bun 未安装"
  exit 1
fi

# 检查 Node.js（Windows 必需）
if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
  if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo "✓ Node.js 已安装: $NODE_VERSION"
  else
    echo "✗ Node.js 未安装（Windows 必需）"
    exit 1
  fi
fi

# 检查 Git
if command -v git &> /dev/null; then
  GIT_VERSION=$(git --version)
  echo "✓ Git 已安装: $GIT_VERSION"
else
  echo "✗ Git 未安装"
  exit 1
fi

# 检查 Playwright Chromium
echo "检查 Playwright Chromium..."
cd ~/.openclaw/skills/fullstack
if bun --eval 'import { chromium } from "playwright"; const browser = await chromium.launch(); await browser.close();' 2>/dev/null; then
  echo "✓ Playwright Chromium 可用"
else
  echo "✗ Playwright Chromium 不可用"
  echo "运行以下命令安装: bunx playwright install chromium"
fi

# 检查项目依赖
echo "检查项目依赖..."
cd ~/.openclaw/skills/fullstack
if [ -d "node_modules" ]; then
  echo "✓ node_modules 存在"
  # 检查关键依赖
  [ -d "node_modules/playwright" ] && echo "  ✓ playwright 已安装"
  [ -d "node_modules/diff" ] && echo "  ✓ diff 已安装"
else
  echo "✗ node_modules 不存在，运行: bun install"
fi
```

### 3.4 功能验证测试

#### 核心功能测试

```bash
#!/bin/bash
# 核心功能验证测试

echo "=== 核心功能验证 ==="

cd ~/.openclaw/skills/fullstack

# 测试 1: browse 命令
echo "测试 browse 命令..."
./browse/dist/browse help > /dev/null && echo "✓ browse help 命令正常"

# 测试 2: 技能文件
echo "测试技能文件..."
for skill in ship review qa browse; do
  if [ -f "$skill/SKILL.md" ]; then
    echo "✓ $skill/SKILL.md 存在"
  else
    echo "✗ $skill/SKILL.md 缺失"
  fi
done

# 测试 3: 配置命令
echo "测试配置命令..."
./bin/fullstack-config list > /dev/null 2>&1 && echo "✓ fullstack-config 命令正常"

# 测试 4: 版本检查
echo "测试版本检查..."
./bin/fullstack-update-check > /dev/null 2>&1 && echo "✓ fullstack-update-check 命令正常"

echo "=== 功能验证完成 ==="
```

---

## 4. 回滚计划

### 4.1 问题检测方法

#### 自动检测

| 检测项 | 检测方法 | 阈值 | 触发动作 |
|--------|----------|------|----------|
| 安装失败率 | 监控 GitHub Issues | > 5% 报告 | 自动告警 |
| CI 失败 | GitHub Actions 状态 | 失败 | 阻止发布 |
| 关键 Bug | Issue 标签 `critical` | 任何报告 | 紧急修复 |
| 安全漏洞 | `bun audit` | 高危漏洞 | 立即修复 |

#### 手动检测清单

- [ ] 用户报告安装失败
- [ ] 用户报告功能异常
- [ ] CI 持续失败
- [ ] 安全漏洞披露
- [ ] 性能严重退化

#### 问题检测脚本

```bash
#!/bin/bash
# 问题检测脚本

echo "=== 问题检测 ==="

# 检查 GitHub Issues
echo "检查最近的 Issues..."
gh issue list --limit 10 --state open

# 检查是否有 critical 标签
CRITICAL_COUNT=$(gh issue list --label critical --state open | wc -l)
if [ "$CRITICAL_COUNT" -gt 0 ]; then
  echo "⚠ 发现 $CRITICAL_COUNT 个严重问题！"
  gh issue list --label critical --state open
fi

# 检查 CI 状态
echo "检查 CI 状态..."
gh run list --limit 5

# 检查安全漏洞
echo "检查安全漏洞..."
bun audit 2>&1 | grep -E "high|critical" || echo "无高危漏洞"

echo "=== 检测完成 ==="
```

### 4.2 回滚步骤

#### 场景 1: 发布后发现问题（未合并到 main）

```bash
# 步骤 1: 删除远程标签
git push origin --delete v1.1.0.0

# 步骤 2: 删除本地标签
git tag -d v1.1.0.0

# 步骤 3: 删除 GitHub Release
gh release delete v1.1.0.0 --yes

# 步骤 4: 回退提交
git reset --hard HEAD~1
git push origin main --force

# 步骤 5: 重新发布修复版本
# 修复问题后重新执行发布流程
```

#### 场景 2: 已合并到 main 但用户未更新

```bash
# 步骤 1: 创建回滚提交
git revert HEAD

# 步骤 2: 更新版本号
echo "1.0.1.1" > VERSION  # 回滚版本

# 步骤 3: 更新 CHANGELOG
# 添加回滚说明

# 步骤 4: 提交并推送
git add VERSION CHANGELOG.md
git commit -m "revert: 回滚 v1.1.0.0

原因: [问题描述]

回滚内容:
- [列出回滚的更改]
"
git push origin main

# 步骤 5: 创建回滚标签
git tag -a v1.0.1.1 -m "Rollback from v1.1.0.0"
git push origin v1.0.1.1

# 步骤 6: 发布回滚公告
gh release create v1.0.1.1 \
  --title "v1.0.1.1 (回滚版本)" \
  --notes "## 回滚说明

此版本回滚了 v1.1.0.0 的更改。

### 回滚原因
[详细说明问题]

### 受影响用户
[说明哪些用户会受影响]

### 下一步
我们正在修复问题，预计在 v1.1.0.1 中解决。
"
```

#### 场景 3: 用户已更新且出现问题

```bash
# 步骤 1: 立即发布修复版本或回滚版本
# 参考场景 2 的步骤

# 步骤 2: 提供降级指南
cat << 'EOF'
## 降级指南

如果您在 v1.1.0.0 遇到问题，可以降级到 v1.0.1.0：

```bash
cd ~/.openclaw/skills/fullstack
git fetch origin
git checkout v1.0.1.0
./setup
```

或重新安装稳定版本：

```bash
rm -rf ~/.openclaw/skills/fullstack
git clone --branch v1.0.1.0 https://github.com/fixby/fullstsck.git ~/.openclaw/skills/fullstack
cd ~/.openclaw/skills/fullstack
./setup
```
EOF

# 步骤 3: 通知所有已知受影响用户
# 通过 GitHub Discussions、Issues 等渠道
```

### 4.3 用户通知方案

#### 通知渠道

| 渠道 | 用途 | 响应时间 |
|------|------|----------|
| GitHub Release | 版本发布公告 | 立即 |
| GitHub Issues | 问题追踪和更新 | 1 小时内 |
| GitHub Discussions | 用户讨论和公告 | 2 小时内 |
| README.md | 状态横幅 | 立即 |

#### 通知模板

**严重问题通知模板：**

```markdown
# ⚠️ 重要通知：v1.1.0.0 已撤回

## 问题描述
在 v1.1.0.0 中发现了 [具体问题描述]。

## 影响范围
- [列出受影响的功能或用户]

## 当前状态
- [ ] 问题已确认
- [ ] 正在调查
- [ ] 修复进行中
- [ ] 修复已发布

## 临时解决方案
[提供临时解决方案或降级指南]

## 时间线
- YYYY-MM-DD HH:MM - 问题首次报告
- YYYY-MM-DD HH:MM - 问题确认
- YYYY-MM-DD HH:MM - 开始调查
- YYYY-MM-DD HH:MM - 发布此通知

## 下一步
我们正在积极修复此问题。请关注此 Issue 获取最新更新。

如果您遇到此问题，请在下方评论或创建新 Issue。
```

**修复完成通知模板：**

```markdown
# ✅ v1.1.0.1 已发布 - 问题已修复

## 修复内容
v1.1.0.0 中的 [问题描述] 已在 v1.1.0.1 中修复。

## 更新方法
```bash
cd ~/.openclaw/skills/fullstack
git fetch origin
git checkout main
git pull origin main
./setup
```

## 验证修复
运行以下命令验证：
```bash
./browse/dist/browse --version
# 应显示: 1.1.0.1
```

## 感谢
感谢所有报告此问题的用户！
```

### 4.4 回滚后验证

```bash
#!/bin/bash
# 回滚后验证脚本

echo "=== 回滚后验证 ==="

# 验证当前版本
CURRENT_VERSION=$(cat VERSION)
echo "当前版本: $CURRENT_VERSION"

# 验证安装
./setup || { echo "✗ 安装失败"; exit 1; }
echo "✓ 安装成功"

# 运行测试
bun test || { echo "✗ 测试失败"; exit 1; }
echo "✓ 测试通过"

# 验证核心功能
./browse/dist/browse help > /dev/null || { echo "✗ browse 命令失败"; exit 1; }
echo "✓ browse 命令正常"

# 检查用户报告的问题是否解决
echo "请手动验证以下问题已解决："
echo "- [ ] 问题 1: [描述]"
echo "- [ ] 问题 2: [描述]"

echo "=== 验证完成 ==="
```

---

## 附录

### A. 快速参考命令

```bash
# 完整发布流程
bun test && bun run build && bun run skill:check

# 更新版本
echo "1.1.0.0" > VERSION

# 创建标签
git tag -a v1.1.0.0 -m "Release v1.1.0.0"

# 推送
git push origin main --tags

# 创建 GitHub Release
gh release create v1.1.0.0 --title "v1.1.0.0" --notes-file release-notes.md

# 回滚
git push origin --delete v1.1.0.0
git tag -d v1.1.0.0
gh release delete v1.1.0.0 --yes
```

### B. 联系方式

| 角色 | 联系方式 |
|------|----------|
| 项目维护者 | GitHub Issues |
| 安全问题 | 私信或加密邮件 |

### C. 相关文档

- [CONTRIBUTING.md](CONTRIBUTING.md) - 贡献指南
- [ARCHITECTURE.md](ARCHITECTURE.md) - 架构说明
- [README.md](README.md) - 项目说明
- [CHANGELOG.md](CHANGELOG.md) - 变更日志

---

*最后更新: 2026-03-25*
