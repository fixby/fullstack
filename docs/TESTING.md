# FullStack Skills 测试流程文档

本文档定义了 FullStack Skills 项目的完整测试流程，包含四个测试层级，确保代码质量和功能正确性。

## 目录

- [测试层级概览](#测试层级概览)
- [L1：静态检查](#l1静态检查)
- [L2：单元测试](#l2单元测试)
- [L3：集成测试](#l3集成测试)
- [L4：E2E 测试](#l4e2e-测试)
- [测试通过标准](#测试通过标准)
- [测试环境要求](#测试环境要求)
- [常见问题处理](#常见问题处理)

---

## 测试层级概览

| 层级 | 名称 | 执行时间 | 主要目的 | 阻塞性 |
|------|------|----------|----------|--------|
| L1 | 静态检查 | < 5秒 | 代码风格、语法验证 | 是 |
| L2 | 单元测试 | < 30秒 | 核心功能测试 | 是 |
| L3 | 集成测试 | 1-5分钟 | 技能生成测试 | 是 |
| L4 | E2E 测试 | 5-30分钟 | 端到端测试 | 否（可选） |

**执行顺序**：L1 → L2 → L3 → L4（必须按顺序执行，前一层级通过后才能执行下一层级）

---

## L1：静态检查

### 测试目标

验证代码风格、语法正确性和文档生成状态。

### 执行命令

```bash
# 完整的静态检查
bun run skill:check

# 仅检查文档新鲜度（不生成）
bun run gen:skill-docs --dry-run
bun run gen:skill-docs --host codex --dry-run
```

### 预期结果

```
Skills:
  ✅ SKILL.md                      — X commands, all valid
  ✅ browse/SKILL.md               — X commands, all valid
  ✅ qa/SKILL.md                   — X commands, all valid
  ...

Templates:
  ✅ SKILL.md.tmpl                 → SKILL.md
  ✅ browse/SKILL.md.tmpl          → browse/SKILL.md

Codex Skills (.agents/skills/):
  ✅ office-hours                  — OK
  ✅ plan-ceo-review               — OK
  ...

Freshness (Claude):
  ✅ All Claude generated files are fresh

Freshness (Codex):
  ✅ All Codex generated files are fresh
```

### 失败处理

| 错误类型 | 原因 | 解决方法 |
|----------|------|----------|
| `unknown command 'xxx'` | SKILL.md 中使用了无效的 browse 命令 | 检查命令拼写，参考 [browse/src/commands.ts](../browse/src/commands.ts) |
| `snapshot errors` | 快照标志使用错误 | 检查 `$B snapshot` 命令的标志参数 |
| `generated file missing` | SKILL.md 文件未生成 | 运行 `bun run gen:skill-docs` |
| `STALE: xxx` | 生成的文件已过期 | 运行 `bun run gen:skill-docs` 和 `bun run gen:skill-docs --host codex` |
| `contains .claude/skills reference` | Codex 技能包含错误的路径引用 | 修改模板，移除 `.claude/skills` 引用 |

### 通过标准

- 所有 SKILL.md 文件命令验证通过
- 所有模板文件存在且已生成
- 所有生成的文件都是新鲜的（与模板同步）
- 退出码为 0

---

## L2：单元测试

### 测试目标

验证核心功能的正确性，包括浏览器命令、配置解析、工具函数等。

### 执行命令

```bash
# 运行所有单元测试（排除 E2E 和 LLM eval）
bun test

# 或者使用 npm script
bun run test
```

### 测试覆盖范围

单元测试覆盖以下模块：

#### browse/test/ 目录

| 测试文件 | 测试内容 |
|----------|----------|
| `commands.test.ts` | 浏览器命令集成测试（导航、交互、快照等） |
| `config.test.ts` | 配置解析和验证 |
| `snapshot.test.ts` | 快照功能测试 |
| `url-validation.test.ts` | URL 验证逻辑 |
| `path-validation.test.ts` | 路径验证逻辑 |
| `platform.test.ts` | 平台兼容性测试 |
| `cookie-*.test.ts` | Cookie 导入和处理 |
| `find-browse.test.ts` | browse 二进制查找逻辑 |
| `handoff.test.ts` | 进程交接逻辑 |
| `bun-polyfill.test.ts` | Bun polyfill 测试 |

#### test/ 目录

| 测试文件 | 测试内容 |
|----------|----------|
| `skill-validation.test.ts` | SKILL.md 命令验证 |
| `skill-parser.test.ts` | 技能解析器测试 |
| `gen-skill-docs.test.ts` | 文档生成测试 |
| `global-discover.test.ts` | 全局发现功能测试 |
| `touchfiles.test.ts` | 触摸文件逻辑测试 |
| `hook-scripts.test.ts` | 钩子脚本测试 |
| `analytics.test.ts` | 分析功能测试 |
| `helpers/*.test.ts` | 辅助函数测试 |

### 预期结果

```
✓ browse/test/commands.test.ts
  ✓ Navigation
    ✓ goto navigates to URL
    ✓ url returns current URL
    ...
  ✓ Interaction
    ✓ click clicks element
    ✓ type types text
    ...

✓ test/skill-validation.test.ts
  ✓ SKILL.md command validation
    ✓ all $B commands in SKILL.md are valid browse commands
    ...

# 测试摘要
Tests:     X passed, Y failed
Duration:  Z ms
```

### 失败处理

| 错误类型 | 原因 | 解决方法 |
|----------|------|----------|
| 浏览器启动失败 | Playwright 浏览器未安装 | 运行 `bunx playwright install chromium` |
| 端口占用 | 测试服务器端口被占用 | 关闭占用端口的进程，或等待自动释放 |
| 超时错误 | 测试执行时间过长 | 检查是否有死循环或网络问题 |
| 断言失败 | 功能实现与预期不符 | 检查测试用例和实现代码 |

### 通过标准

- 所有测试用例通过
- 无运行时错误
- 退出码为 0
- 测试覆盖率建议 > 70%（非强制）

---

## L3：集成测试

### 测试目标

验证技能生成流程的正确性，包括 SKILL.md 文档生成、模板渲染、命令验证等。

### 执行命令

```bash
# 运行集成测试（需要 EVALS=1）
EVALS=1 bun test test/skill-llm-eval.test.ts

# 运行 E2E 快速测试（仅运行变更相关的测试）
bun run test:e2e:fast

# 运行所有 E2E 测试（排除 LLM eval）
bun run test:e2e
```

### 测试覆盖范围

| 测试文件 | 测试内容 | 执行条件 |
|----------|----------|----------|
| `skill-llm-eval.test.ts` | LLM 评估生成的 SKILL.md 质量 | 需要 `ANTHROPIC_API_KEY` |
| `skill-e2e.test.ts` | 技能端到端测试 | 需要 `EVALS=1` |
| `skill-e2e-*.test.ts` | 各技能专项测试 | 需要 `EVALS=1` |
| `skill-routing-e2e.test.ts` | 技能路由测试 | 需要 `EVALS=1` |

### 预期结果

```
✓ test/skill-llm-eval.test.ts
  ✓ SKILL.md quality evaluation
    ✓ generated docs are clear and actionable
    ✓ command descriptions are complete
    ...

✓ test/skill-e2e.test.ts
  ✓ skill execution
    ✓ skill runs without errors
    ✓ produces expected output
    ...

Tests:     X passed, Y failed
Duration:  Z s
```

### 失败处理

| 错误类型 | 原因 | 解决方法 |
|----------|------|----------|
| `ANTHROPIC_API_KEY not set` | 缺少 API 密钥 | 在 `.env` 文件中设置 `ANTHROPIC_API_KEY` |
| LLM 评估失败 | 生成的文档质量不达标 | 改进 SKILL.md 模板内容 |
| 技能执行超时 | AI 代理响应慢或卡住 | 检查网络连接，增加超时时间 |
| 会话冲突 | 嵌套会话问题 | 确保测试运行器正确清理环境变量 |

### 通过标准

- 所有集成测试通过
- LLM 评估分数 >= 7/10（建议 >= 8/10）
- 无阻塞性错误
- 退出码为 0

---

## L4：E2E 测试

### 测试目标

验证完整的端到端工作流，包括 AI 代理执行、浏览器自动化、技能调用等。

### 执行命令

```bash
# 运行所有 E2E 测试（需要 API 密钥）
bun run test:e2e:all

# 运行 Codex E2E 测试
bun run test:codex:all

# 运行 Gemini E2E 测试
bun run test:gemini:all

# 运行完整评估套件（包括 LLM eval）
bun run test:evals:all
```

### 测试覆盖范围

| 测试文件 | 测试内容 | 超时时间 |
|----------|----------|----------|
| `skill-e2e-browse.test.ts` | 浏览器自动化技能测试 | 120s |
| `skill-e2e-cso.test.ts` | CSO 技能测试 | 120s |
| `skill-e2e-deploy.test.ts` | 部署技能测试 | 120s |
| `skill-e2e-design.test.ts` | 设计技能测试 | 120s |
| `skill-e2e-plan.test.ts` | 规划技能测试 | 120s |
| `skill-e2e-qa-*.test.ts` | QA 技能测试 | 120s |
| `skill-e2e-review.test.ts` | 审查技能测试 | 120s |
| `skill-e2e-workflow.test.ts` | 工作流技能测试 | 120s |
| `codex-e2e.test.ts` | Codex 代理测试 | 180s |
| `gemini-e2e.test.ts` | Gemini 代理测试 | 180s |

### 预期结果

```
✓ test/skill-e2e-browse.test.ts
  ✓ browse skill execution
    ✓ navigates to page and extracts content
    ✓ handles interactive elements
    ...

✓ test/codex-e2e.test.ts
  ✓ Codex agent workflow
    ✓ executes skill correctly
    ✓ produces expected artifacts
    ...

Tests:     X passed, Y failed
Duration:  Z s
```

### 失败处理

| 错误类型 | 原因 | 解决方法 |
|----------|------|----------|
| API 限流 | LLM API 请求频率过高 | 降低并发数：`EVALS_CONCURRENCY=5 bun run test:e2e` |
| 网络超时 | 网络不稳定 | 重试测试，检查网络连接 |
| 浏览器崩溃 | 内存不足或浏览器 bug | 关闭其他应用，更新 Playwright |
| 代理行为异常 | AI 代理输出不符合预期 | 检查 SKILL.md 指令，优化提示词 |
| 测试数据过期 | Ground truth 文件需要更新 | 更新 `test/fixtures/*-ground-truth.json` |

### 通过标准

- 核心技能测试通过率 >= 90%
- 无阻塞性错误（如浏览器崩溃、API 密钥无效）
- 可接受的失败：非核心功能、已知问题
- 退出码为 0（允许部分失败时可为 1）

---

## 测试通过标准

### 总体标准

| 层级 | 最低通过率 | 阻塞性 | 说明 |
|------|-----------|--------|------|
| L1 | 100% | 是 | 必须全部通过才能继续 |
| L2 | 100% | 是 | 必须全部通过才能继续 |
| L3 | 95% | 是 | 允许少量非关键失败 |
| L4 | 90% | 否 | 可选测试，允许部分失败 |

### 阻塞性问题定义

以下问题必须修复后才能继续：

1. **L1 阻塞问题**
   - SKILL.md 命令验证失败
   - 生成的文档过期或缺失
   - 模板文件缺失

2. **L2 阻塞问题**
   - 核心功能测试失败
   - 浏览器命令无法执行
   - 配置解析错误

3. **L3 阻塞问题**
   - 技能生成流程失败
   - LLM 评估分数 < 5/10
   - 关键技能无法执行

4. **L4 非阻塞问题**
   - 特定环境下的失败
   - 已知的边缘情况
   - 第三方服务问题

### 可接受的失败数量

| 层级 | 最大失败数 | 失败类型限制 |
|------|-----------|-------------|
| L1 | 0 | 无 |
| L2 | 0 | 无 |
| L3 | 2 | 非核心功能 |
| L4 | 10% | 非核心技能 |

---

## 测试环境要求

### 必需依赖

| 依赖 | 版本要求 | 安装命令 |
|------|---------|---------|
| Bun | >= 1.0.0 | `curl -fsSL https://bun.sh/install | bash` |
| Node.js | >= 18.0.0（可选） | `nvm install 18` |
| Playwright | 自动安装 | `bun install` 后自动安装 |

### 环境变量配置

创建 `.env` 文件（参考 `.env.example`）：

```bash
# LLM API 密钥（L3/L4 测试必需）
ANTHROPIC_API_KEY=sk-ant-your-key-here

# 可选：其他 LLM 提供商
OPENAI_API_KEY=sk-your-key-here
GOOGLE_API_KEY=your-key-here

# 测试配置
EVALS=1                    # 启用评估测试
EVALS_ALL=1               # 运行所有测试（不进行 diff 选择）
EVALS_CONCURRENCY=15      # 并发数（默认 15）
EVALS_BASE=main           # 基准分支（默认 main）
```

### 可选依赖

| 依赖 | 用途 | 安装命令 |
|------|------|---------|
| Git | Diff 测试选择 | 通常已安装 |
| Chromium | 浏览器测试 | `bunx playwright install chromium` |

### 环境检查清单

运行测试前，请确认：

- [ ] Bun 已安装且版本 >= 1.0.0
- [ ] 项目依赖已安装（`bun install`）
- [ ] Playwright 浏览器已安装（`bunx playwright install`）
- [ ] `.env` 文件已配置（L3/L4 测试需要）
- [ ] 网络连接正常（L3/L4 测试需要）
- [ ] 足够的磁盘空间（至少 1GB）

---

## 常见问题处理

### 问题 1：浏览器启动失败

**症状**：
```
Error: Executable doesn't exist at ~/.cache/ms-playwright/chromium-*/chrome
```

**解决方法**：
```bash
# 安装 Playwright 浏览器
bunx playwright install chromium

# 或安装所有浏览器
bunx playwright install
```

### 问题 2：测试超时

**症状**：
```
Test timed out after 30000ms
```

**解决方法**：
```bash
# 增加超时时间（在测试文件中）
test('my test', async () => {
  // ...
}, { timeout: 60000 }); // 60 秒

# 或降低并发数
EVALS_CONCURRENCY=5 bun run test:e2e
```

### 问题 3：API 限流

**症状**：
```
Error: Rate limit exceeded
```

**解决方法**：
```bash
# 降低并发数
EVALS_CONCURRENCY=3 bun run test:e2e

# 分批运行测试
bun run test:codex
bun run test:gemini
```

### 问题 4：端口占用

**症状**：
```
Error: Port 3000 is already in use
```

**解决方法**：
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# 或等待测试自动选择其他端口
```

### 问题 5：文档生成失败

**症状**：
```
STALE: SKILL.md
```

**解决方法**：
```bash
# 重新生成文档
bun run gen:skill-docs
bun run gen:skill-docs --host codex

# 检查模板文件是否存在
ls */SKILL.md.tmpl
```

### 问题 6：测试数据过期

**症状**：
```
Expected: "new output"
Received: "old output"
```

**解决方法**：
```bash
# 更新 ground truth 文件
# 1. 手动运行技能，获取新输出
# 2. 更新 test/fixtures/*-ground-truth.json
# 3. 重新运行测试
```

---

## 快速参考

### 完整测试流程

```bash
# 1. 安装依赖
bun install
bunx playwright install chromium

# 2. 配置环境变量
cp .env.example .env
# 编辑 .env 文件，填入 API 密钥

# 3. L1 静态检查
bun run skill:check

# 4. L2 单元测试
bun test

# 5. L3 集成测试
bun run test:e2e:fast

# 6. L4 E2E 测试（可选）
bun run test:e2e:all
```

### 快速命令

```bash
# 快速检查（L1 + L2）
bun run skill:check && bun test

# 完整检查（L1 + L2 + L3）
bun run skill:check && bun test && bun run test:e2e:fast

# CI/CD 流水线
bun install && bunx playwright install chromium && bun run skill:check && bun test
```

---

## 附录

### 测试文件组织结构

```
project/
├── browse/test/           # 浏览器相关单元测试
│   ├── commands.test.ts   # 命令集成测试
│   ├── config.test.ts     # 配置测试
│   └── ...
├── test/                  # 项目级测试
│   ├── skill-*.test.ts    # 技能测试
│   ├── *-e2e.test.ts      # E2E 测试
│   ├── helpers/           # 测试辅助函数
│   └── fixtures/          # 测试数据
└── docs/
    └── TESTING.md         # 本文档
```

### 相关文档

- [项目架构](../ARCHITECTURE.md)
- [贡献指南](../CONTRIBUTING.md)
- [浏览器使用](../BROWSER.md)
- [技能列表](./skills.md)

---

**文档版本**：1.0.0
**最后更新**：2026-03-25
**维护者**：FullStack Skills Team
