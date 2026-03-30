# FullStack Skills Windows Installation Script
# Usage: .\setup.ps1

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$ErrorActionPreference = "Stop"

$SourceDir = $PSScriptRoot
if ([string]::IsNullOrEmpty($SourceDir)) {
    $SourceDir = $PWD.Path
}

Write-Host "FullStack Skills Installation Script (Windows)" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check bun
Write-Host "Checking bun..." -ForegroundColor Yellow
$bunVersion = bun --version 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: bun is required" -ForegroundColor Red
    exit 1
}
Write-Host "bun installed: $bunVersion" -ForegroundColor Green

# Check Node.js
Write-Host "Checking Node.js..." -ForegroundColor Yellow
$nodeVersion = node --version 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: Node.js is required on Windows" -ForegroundColor Red
    exit 1
}
Write-Host "Node.js installed: $nodeVersion" -ForegroundColor Green

# Install dependencies
Write-Host ""
Write-Host "Installing dependencies..." -ForegroundColor Yellow
bun install
if ($LASTEXITCODE -ne 0) {
    Write-Host "bun install failed" -ForegroundColor Red
    exit 1
}

# Build browse binary
Write-Host ""
Write-Host "Building browse binary..." -ForegroundColor Yellow
bun run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "build failed" -ForegroundColor Red
    exit 1
}

# Check browse binary
$browseBin = Join-Path $SourceDir "browse\dist\browse.exe"
if ([string]::IsNullOrEmpty($browseBin) -or -not (Test-Path $browseBin)) {
    Write-Host "Error: browse binary not generated" -ForegroundColor Red
    exit 1
}
Write-Host "browse binary built successfully" -ForegroundColor Green

# Create symlink (requires admin rights on Windows)
$homeDir = $env:USERPROFILE
$openClawSkills = Join-Path $homeDir ".openclaw\skills"
$fullstackLink = Join-Path $openClawSkills "fullstack"

Write-Host ""
Write-Host "Creating skill symlink..." -ForegroundColor Yellow

if (-not (Test-Path $openClawSkills)) {
    New-Item -ItemType Directory -Path $openClawSkills -Force | Out-Null
}

$symlinkCreated = $false
if (Test-Path $fullstackLink) {
    $item = Get-Item $fullstackLink -ErrorAction SilentlyContinue
    if ($null -ne $item -and $item.LinkType -eq "SymbolicLink") {
        Write-Host "Symlink already exists: $fullstackLink" -ForegroundColor Green
        $symlinkCreated = $true
    } else {
        Write-Host "Warning: $fullstackLink exists and is not a symlink" -ForegroundColor Yellow
    }
} else {
    try {
        New-Item -ItemType SymbolicLink -Path $fullstackLink -Target $SourceDir -Force -ErrorAction Stop | Out-Null
        Write-Host "Symlink created: $fullstackLink" -ForegroundColor Green
        $symlinkCreated = $true
    } catch {
        Write-Host "Note: Symlink requires admin rights on Windows" -ForegroundColor Yellow
        Write-Host "To create symlink manually, run PowerShell as Administrator:" -ForegroundColor Yellow
        Write-Host "  New-Item -ItemType SymbolicLink -Path '$fullstackLink' -Target '$SourceDir'" -ForegroundColor Gray
    }
}

# Install Playwright Chromium
Write-Host ""
Write-Host "Installing Playwright Chromium..." -ForegroundColor Yellow
bunx playwright install chromium 2>$null
Write-Host "Playwright Chromium installed" -ForegroundColor Green

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "FullStack Skills Installation Complete!" -ForegroundColor Green
Write-Host ""

if (-not $symlinkCreated) {
    Write-Host "IMPORTANT: Run as Administrator to create symlink:" -ForegroundColor Yellow
    Write-Host "  New-Item -ItemType SymbolicLink -Path '$fullstackLink' -Target '$SourceDir'" -ForegroundColor Gray
    Write-Host ""
}

Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. Create symlink in your project (optional)" -ForegroundColor White
Write-Host "2. Add fullstack section to CLAUDE.md" -ForegroundColor White
Write-Host "3. Run '/office-hours' to start" -ForegroundColor Cyan
