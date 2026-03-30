/**
 * browse CLI + 服务器的共享配置。
 *
 * 解析顺序：
 *   1. BROWSE_STATE_FILE 环境变量 → 从父目录派生 stateDir
 *   2. git rev-parse --show-toplevel → projectDir/.openclaw/
 *   3. process.cwd() 回退（非 git 环境）
 *
 * CLI 计算配置并通过 BROWSE_STATE_FILE 环境变量传递给
 * 生成的服务器。服务器从该环境变量派生所有路径。
 */

import * as fs from 'fs';
import * as path from 'path';

export interface BrowseConfig {
  projectDir: string;
  stateDir: string;
  stateFile: string;
  consoleLog: string;
  networkLog: string;
  dialogLog: string;
}

/**
 * 检测 git 仓库根目录，如果不在仓库中或 git 不可用则返回 null。
 */
export function getGitRoot(): string | null {
  try {
    const proc = Bun.spawnSync(['git', 'rev-parse', '--show-toplevel'], {
      stdout: 'pipe',
      stderr: 'pipe',
      timeout: 2_000, // 如果 .git 损坏则不挂起
    });
    if (proc.exitCode !== 0) return null;
    return proc.stdout.toString().trim() || null;
  } catch {
    return null;
  }
}

/**
 * 解析所有 browse 配置路径。
 *
 * 如果设置了 BROWSE_STATE_FILE（例如，CLI 在生成服务器时设置，或
 * 测试用于隔离），所有路径都从它派生。否则，
 * 通过 git 或 cwd 检测项目根目录。
 */
export function resolveConfig(
  env: Record<string, string | undefined> = process.env,
): BrowseConfig {
  let stateFile: string;
  let stateDir: string;
  let projectDir: string;

  if (env.BROWSE_STATE_FILE) {
    stateFile = env.BROWSE_STATE_FILE;
    stateDir = path.dirname(stateFile);
    projectDir = path.dirname(stateDir); // .openclaw/ 的父目录
  } else {
    projectDir = getGitRoot() || process.cwd();
    stateDir = path.join(projectDir, '.openclaw');
    stateFile = path.join(stateDir, 'browse.json');
  }

  return {
    projectDir,
    stateDir,
    stateFile,
    consoleLog: path.join(stateDir, 'browse-console.log'),
    networkLog: path.join(stateDir, 'browse-network.log'),
    dialogLog: path.join(stateDir, 'browse-dialog.log'),
  };
}

/**
 * 如果 .openclaw/ 状态目录不存在则创建它。
 * 权限错误时抛出清晰的消息。
 */
export function ensureStateDir(config: BrowseConfig): void {
  try {
    fs.mkdirSync(config.stateDir, { recursive: true });
  } catch (err: any) {
    if (err.code === 'EACCES') {
      throw new Error(`无法创建状态目录 ${config.stateDir}: 权限被拒绝`);
    }
    if (err.code === 'ENOTDIR') {
      throw new Error(`无法创建状态目录 ${config.stateDir}: 该路径存在文件`);
    }
    throw err;
  }

  // 确保 .openclaw/ 在项目的 .gitignore 中
  const gitignorePath = path.join(config.projectDir, '.gitignore');
  try {
    const content = fs.readFileSync(gitignorePath, 'utf-8');
    if (!content.match(/^\.openclaw\/?$/m)) {
      const separator = content.endsWith('\n') ? '' : '\n';
      fs.appendFileSync(gitignorePath, `${separator}.openclaw/\n`);
    }
  } catch (err: any) {
    if (err.code !== 'ENOENT') {
      // 将警告写入服务器日志（即使在守护进程模式下也可见）
      const logPath = path.join(config.stateDir, 'browse-server.log');
      try {
        fs.appendFileSync(logPath, `[${new Date().toISOString()}] 警告: 无法更新 ${gitignorePath} 处的 .gitignore: ${err.message}\n`);
      } catch {
        // stateDir 写入也失败了 — 我们无能为力
      }
    }
    // ENOENT（没有 .gitignore）— 静默跳过
  }
}

/**
 * 从 git remote origin URL 派生 slug（owner-repo 格式）。
 * 如果没有配置 remote 则回退到目录基本名称。
 */
export function getRemoteSlug(): string {
  try {
    const proc = Bun.spawnSync(['git', 'remote', 'get-url', 'origin'], {
      stdout: 'pipe',
      stderr: 'pipe',
      timeout: 2_000,
    });
    if (proc.exitCode !== 0) throw new Error('无 remote');
    const url = proc.stdout.toString().trim();
    // SSH:   git@github.com:owner/repo.git → owner-repo
    // HTTPS: https://github.com/owner/repo.git → owner-repo
    const match = url.match(/[:/]([^/]+)\/([^/]+?)(?:\.git)?$/);
    if (match) return `${match[1]}-${match[2]}`;
    throw new Error('无法解析');
  } catch {
    const root = getGitRoot();
    return path.basename(root || process.cwd());
  }
}

/**
 * 从 browse/dist/.version 读取二进制版本（git SHA）。
 * 如果文件不存在或无法读取则返回 null。
 */
export function readVersionHash(execPath: string = process.execPath): string | null {
  try {
    const versionFile = path.resolve(path.dirname(execPath), '.version');
    return fs.readFileSync(versionFile, 'utf-8').trim() || null;
  } catch {
    return null;
  }
}
