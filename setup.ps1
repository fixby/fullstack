# FullStack Skills Windows 安装脚本
# 使用方式: .\setup.ps1

$ErrorActionPreference = "Stop"

$SourceDir = $PSScriptRoot
if (-not $SourceDir) {
    $SourceDir = Get-Location
}

Write-Host "FullStack Skills 安装脚本 (Windows)" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# 检查 bun
Write-Host "检查 bun..." -ForegroundColor Yellow
$bunVersion = bun --version 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "错误: 需要安装 bun" -ForegroundColor Red
    Write-Host "安装命令: powershell -c ""irm bun.sh/install.ps1 | iex""" -ForegroundColor Yellow
    exit 1
}
Write-Host "bun 已安装: $bunVersion" -ForegroundColor Green

# 检查 Node.js (Windows 上必须)
Write-Host "检查 Node.js..." -ForegroundColor Yellow
$nodeVersion = node --version 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "错误: Windows 上需要安装 Node.js (Bun 有 Playwright 管道 bug)" -ForegroundColor Red
    Write-Host "安装地址: https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}
Write-Host "Node.js 已安装: $nodeVersion" -ForegroundColor Green

# 安装依赖
Write-Host ""
Write-Host "安装依赖..." -ForegroundColor Yellow
bun install
if ($LASTEXITCODE -ne 0) {
    Write-Host "依赖安装失败" -ForegroundColor Red
    exit 1
}

# 构建 browse 二进制文件
Write-Host ""
Write-Host "构建 browse 二进制文件..." -ForegroundColor Yellow
bun run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "构建失败" -ForegroundColor Red
    exit 1
}

# 检查 browse 二进制文件
$browseBin = Join-Path $SourceDir "browse\dist\browse.exe"
if (-not (Test-Path $browseBin)) {
    Write-Host "错误: browse 二进制文件未生成" -ForegroundColor Red
    exit 1
}
Write-Host "browse 二进制文件已构建: $browseBin" -ForegroundColor Green

# 创建符号链接到 ~/.openclaw/skills/fullstack
$homeDir = $env:USERPROFILE
$openClawSkills = Join-Path $homeDir ".openclaw\skills"
$fullstackLink = Join-Path $openClawSkills "fullstack"

Write-Host ""
Write-Host "创建技能符号链接..." -ForegroundColor Yellow

# 创建 ~/.openclaw/skills 目录
if (-not (Test-Path $openClawSkills)) {
    New-Item -ItemType Directory -Path $openClawSkills -Force | Out-Null
}

# 移除已存在的目标（如果是符号链接或目录）
if (Test-Path $fullstackLink) {
    $item = Get-Item $fullstackLink
    if ($item.LinkType -eq "SymbolicLink") {
        Remove-Item $fullstackLink -Force
    } else {
        Write-Host "警告: $fullstackLink 已存在且不是符号链接，跳过" -ForegroundColor Yellow
    }
}

# 创建符号链接
New-Item -ItemType SymbolicLink -Path $fullstackLink -Target $SourceDir -Force | Out-Null
Write-Host "已创建符号链接: $fullstackLink -> $SourceDir" -ForegroundColor Green

# 验证 Playwright Chromium
Write-Host ""
Write-Host "验证 Playwright Chromium..." -ForegroundColor Yellow
try {
    node -e "const { chromium } = require('playwright'); (async () => { await chromium.launch(); process.exit(0); })()" 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Playwright Chromium 就绪" -ForegroundColor Green
    } else {
        Write-Host "安装 Playwright Chromium..." -ForegroundColor Yellow
        bunx playwright install chromium
    }
} catch {
    Write-Host "安装 Playwright Chromium..." -ForegroundColor Yellow
    bunx playwright install chromium
}

Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "FullStack Skills 安装完成!" -ForegroundColor Green
Write-Host ""
Write-Host "下一步:" -ForegroundColor Yellow
Write-Host "1. 在你的项目中创建 .openclaw/skills/fullstack 符号链接:"
Write-Host "   New-Item -ItemType SymbolicLink -Path ""你的项目\.openclaw\skills\fullstack"" -Target ""$homeDir\.openclaw\skills\fullstack"""
Write-Host ""
Write-Host "2. 在项目的 CLAUDE.md 中添加 fullstack 部分"
Write-Host ""
Write-Host "3. 运行 '/office-hours' 开始使用" -ForegroundColor Cyan
