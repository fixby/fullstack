/**
 * find-browse — 定位 openclaw browse 二进制文件。
 *
 * 编译为 browse/dist/find-browse（独立二进制文件，无需 bun 运行时）。
 * 在标准输出上输出 browse 二进制文件的绝对路径，如果未找到则退出码为 1。
 */

import { existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

// ─── 二进制发现 ───────────────────────────────────────────

function getGitRoot(): string | null {
  try {
    const proc = Bun.spawnSync(['git', 'rev-parse', '--show-toplevel'], {
      stdout: 'pipe',
      stderr: 'pipe',
    });
    if (proc.exitCode !== 0) return null;
    return proc.stdout.toString().trim();
  } catch {
    return null;
  }
}

export function locateBinary(): string | null {
  const root = getGitRoot();
  const home = homedir();
  const markers = ['.codex', '.agents', '.claude'];

  // 工作区本地优先（用于开发）
  if (root) {
    for (const m of markers) {
      const local = join(root, m, 'skills', 'fullstack', 'browse', 'dist', 'browse');
      if (existsSync(local)) return local;
    }
  }

  // 全局回退
  for (const m of markers) {
    const global = join(home, m, 'skills', 'fullstack', 'browse', 'dist', 'browse');
    if (existsSync(global)) return global;
  }

  return null;
}

// ─── 主函数 ───────────────────────────────────────────────────────

function main() {
  const bin = locateBinary();
  if (!bin) {
    process.stderr.write('错误: 未找到 browse 二进制文件。运行: cd <skill-dir> && ./setup\n');
    process.exit(1);
  }

  console.log(bin);
}

main();
