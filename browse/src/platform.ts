/**
 * fullstack browse 的跨平台常量。
 *
 * 在 macOS/Linux 上: TEMP_DIR = '/tmp', path.sep = '/'  — 与硬编码值相同。
 * 在 Windows 上: TEMP_DIR = os.tmpdir(), path.sep = '\\' — 正确的 Windows 行为。
 */

import * as os from 'os';
import * as path from 'path';

export const IS_WINDOWS = process.platform === 'win32';
export const TEMP_DIR = IS_WINDOWS ? os.tmpdir() : '/tmp';

/** 使用平台感知的分隔符检查 resolvedPath 是否在 dir 内。 */
export function isPathWithin(resolvedPath: string, dir: string): boolean {
  return resolvedPath === dir || resolvedPath.startsWith(dir + path.sep);
}
