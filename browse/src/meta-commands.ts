/**
 * 元命令 — 标签页、服务器控制、截图、链式、差异、快照
 */

import type { BrowserManager } from './browser-manager';
import { handleSnapshot } from './snapshot';
import { getCleanText } from './read-commands';
import { READ_COMMANDS, WRITE_COMMANDS, META_COMMANDS } from './commands';
import { validateNavigationUrl } from './url-validation';
import * as Diff from 'diff';
import * as fs from 'fs';
import * as path from 'path';
import { TEMP_DIR, isPathWithin } from './platform';

// 安全性：路径验证以防止路径遍历攻击
const SAFE_DIRECTORIES = [TEMP_DIR, process.cwd()];

export function validateOutputPath(filePath: string): void {
  const resolved = path.resolve(filePath);
  const isSafe = SAFE_DIRECTORIES.some(dir => isPathWithin(resolved, dir));
  if (!isSafe) {
    throw new Error(`路径必须在以下目录内: ${SAFE_DIRECTORIES.join(', ')}`);
  }
}

export async function handleMetaCommand(
  command: string,
  args: string[],
  bm: BrowserManager,
  shutdown: () => Promise<void> | void
): Promise<string> {
  switch (command) {
    // ─── 标签页 ──────────────────────────────────────────
    case 'tabs': {
      const tabs = await bm.getTabListWithTitles();
      return tabs.map(t =>
        `${t.active ? '→ ' : '  '}[${t.id}] ${t.title || '(无标题)'} — ${t.url}`
      ).join('\n');
    }

    case 'tab': {
      const id = parseInt(args[0], 10);
      if (isNaN(id)) throw new Error('用法: browse tab <id>');
      bm.switchTab(id);
      return `已切换到标签页 ${id}`;
    }

    case 'newtab': {
      const url = args[0];
      const id = await bm.newTab(url);
      return `已打开标签页 ${id}${url ? ` → ${url}` : ''}`;
    }

    case 'closetab': {
      const id = args[0] ? parseInt(args[0], 10) : undefined;
      await bm.closeTab(id);
      return `已关闭标签页${id ? ` ${id}` : ''}`;
    }

    // ─── 服务器控制 ────────────────────────────────
    case 'status': {
      const page = bm.getPage();
      const tabs = bm.getTabCount();
      return [
        `状态: 健康`,
        `URL: ${page.url()}`,
        `标签页: ${tabs}`,
        `PID: ${process.pid}`,
      ].join('\n');
    }

    case 'url': {
      return bm.getCurrentUrl();
    }

    case 'stop': {
      await shutdown();
      return '服务器已停止';
    }

    case 'restart': {
      // 发出我们想要重启的信号 — CLI 会检测退出并重启
      console.log('[browse] 已请求重启。正在退出以便 CLI 重启。');
      await shutdown();
      return '正在重启...';
    }

    // ─── 视觉 ────────────────────────────────────────
    case 'screenshot': {
      // 解析优先级：标志 (--viewport, --clip) → 选择器 (@ref, CSS) → 输出路径
      const page = bm.getPage();
      let outputPath = `${TEMP_DIR}/browse-screenshot.png`;
      let clipRect: { x: number; y: number; width: number; height: number } | undefined;
      let targetSelector: string | undefined;
      let viewportOnly = false;

      const remaining: string[] = [];
      for (let i = 0; i < args.length; i++) {
        if (args[i] === '--viewport') {
          viewportOnly = true;
        } else if (args[i] === '--clip') {
          const coords = args[++i];
          if (!coords) throw new Error('用法: screenshot --clip x,y,w,h [路径]');
          const parts = coords.split(',').map(Number);
          if (parts.length !== 4 || parts.some(isNaN))
            throw new Error('用法: screenshot --clip x,y,width,height — 所有值必须是数字');
          clipRect = { x: parts[0], y: parts[1], width: parts[2], height: parts[3] };
        } else if (args[i].startsWith('--')) {
          throw new Error(`未知的截图标志: ${args[i]}`);
        } else {
          remaining.push(args[i]);
        }
      }

      // 分离目标（选择器/@ref）和输出路径
      for (const arg of remaining) {
        if (arg.startsWith('@e') || arg.startsWith('@c') || arg.startsWith('.') || arg.startsWith('#') || arg.includes('[')) {
          targetSelector = arg;
        } else {
          outputPath = arg;
        }
      }

      validateOutputPath(outputPath);

      if (clipRect && targetSelector) {
        throw new Error('不能同时使用 --clip 和选择器/引用 — 请选择其一');
      }
      if (viewportOnly && clipRect) {
        throw new Error('不能同时使用 --viewport 和 --clip — 请选择其一');
      }

      if (targetSelector) {
        const resolved = await bm.resolveRef(targetSelector);
        const locator = 'locator' in resolved ? resolved.locator : page.locator(resolved.selector);
        await locator.screenshot({ path: outputPath, timeout: 5000 });
        return `截图已保存 (元素): ${outputPath}`;
      }

      if (clipRect) {
        await page.screenshot({ path: outputPath, clip: clipRect });
        return `截图已保存 (裁剪 ${clipRect.x},${clipRect.y},${clipRect.width},${clipRect.height}): ${outputPath}`;
      }

      await page.screenshot({ path: outputPath, fullPage: !viewportOnly });
      return `截图已保存${viewportOnly ? ' (视口)' : ''}: ${outputPath}`;
    }

    case 'pdf': {
      const page = bm.getPage();
      const pdfPath = args[0] || `${TEMP_DIR}/browse-page.pdf`;
      validateOutputPath(pdfPath);
      await page.pdf({ path: pdfPath, format: 'A4' });
      return `PDF 已保存: ${pdfPath}`;
    }

    case 'responsive': {
      const page = bm.getPage();
      const prefix = args[0] || `${TEMP_DIR}/browse-responsive`;
      validateOutputPath(prefix);
      const viewports = [
        { name: 'mobile', width: 375, height: 812 },
        { name: 'tablet', width: 768, height: 1024 },
        { name: 'desktop', width: 1280, height: 720 },
      ];
      const originalViewport = page.viewportSize();
      const results: string[] = [];

      for (const vp of viewports) {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        const path = `${prefix}-${vp.name}.png`;
        await page.screenshot({ path, fullPage: true });
        results.push(`${vp.name} (${vp.width}x${vp.height}): ${path}`);
      }

      // 恢复原始视口
      if (originalViewport) {
        await page.setViewportSize(originalViewport);
      }

      return results.join('\n');
    }

    // ─── 链式 ─────────────────────────────────────────
    case 'chain': {
      // 从 args[0] 读取 JSON 数组（如果提供）或期望它作为 body 传递
      const jsonStr = args[0];
      if (!jsonStr) throw new Error('用法: echo \'[["goto","url"],["text"]]\' | browse chain');

      let commands: string[][];
      try {
        commands = JSON.parse(jsonStr);
      } catch {
        throw new Error('无效的 JSON。期望: [["command", "arg1", "arg2"], ...]');
      }

      if (!Array.isArray(commands)) throw new Error('期望 JSON 命令数组');

      const results: string[] = [];
      const { handleReadCommand } = await import('./read-commands');
      const { handleWriteCommand } = await import('./write-commands');

      for (const cmd of commands) {
        const [name, ...cmdArgs] = cmd;
        try {
          let result: string;
          if (WRITE_COMMANDS.has(name))    result = await handleWriteCommand(name, cmdArgs, bm);
          else if (READ_COMMANDS.has(name))  result = await handleReadCommand(name, cmdArgs, bm);
          else if (META_COMMANDS.has(name))  result = await handleMetaCommand(name, cmdArgs, bm, shutdown);
          else throw new Error(`未知命令: ${name}`);
          results.push(`[${name}] ${result}`);
        } catch (err: any) {
          results.push(`[${name}] 错误: ${err.message}`);
        }
      }

      return results.join('\n\n');
    }

    // ─── 差异 ──────────────────────────────────────────
    case 'diff': {
      const [url1, url2] = args;
      if (!url1 || !url2) throw new Error('用法: browse diff <url1> <url2>');

      const page = bm.getPage();
      await validateNavigationUrl(url1);
      await page.goto(url1, { waitUntil: 'domcontentloaded', timeout: 15000 });
      const text1 = await getCleanText(page);

      await validateNavigationUrl(url2);
      await page.goto(url2, { waitUntil: 'domcontentloaded', timeout: 15000 });
      const text2 = await getCleanText(page);

      const changes = Diff.diffLines(text1, text2);
      const output: string[] = [`--- ${url1}`, `+++ ${url2}`, ''];

      for (const part of changes) {
        const prefix = part.added ? '+' : part.removed ? '-' : ' ';
        const lines = part.value.split('\n').filter(l => l.length > 0);
        for (const line of lines) {
          output.push(`${prefix} ${line}`);
        }
      }

      return output.join('\n');
    }

    // ─── 快照 ─────────────────────────────────────
    case 'snapshot': {
      return await handleSnapshot(args, bm);
    }

    // ─── 交接 ────────────────────────────────────
    case 'handoff': {
      const message = args.join(' ') || '用户接管请求';
      return await bm.handoff(message);
    }

    case 'resume': {
      bm.resume();
      // 重新快照以捕获人工交互后的当前页面状态
      const snapshot = await handleSnapshot(['-i'], bm);
      return `已恢复\n${snapshot}`;
    }

    default:
      throw new Error(`未知元命令: ${command}`);
  }
}
