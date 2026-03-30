/**
 * 快照命令 — 带引用元素选择的无障碍树
 *
 * 架构（定位器映射 — 无 DOM 变更）：
 *   1. page.locator(scope).ariaSnapshot() → YAML 格式的无障碍树
 *   2. 解析树，分配引用 @e1, @e2, ...
 *   3. 为每个引用构建 Playwright Locator（getByRole + nth）
 *   4. 在 BrowserManager 上存储 Map<string, Locator>
 *   5. 返回紧凑的文本输出，引用前置
 *
 * 扩展功能：
 *   --diff / -D:       与上次快照对比，返回统一差异
 *   --annotate / -a:   带覆盖框的截图，显示每个 @ref
 *   --output / -o:     带标注截图的输出路径
 *   -C / --cursor-interactive: 扫描 cursor:pointer/onclick/tabindex 元素
 *
 * 后续："click @e3" → 查找 Locator → locator.click()
 */

import type { Page, Locator } from 'playwright';
import type { BrowserManager, RefEntry } from './browser-manager';
import * as Diff from 'diff';
import { TEMP_DIR, isPathWithin } from './platform';

// -i 标志认为"可交互"的角色
const INTERACTIVE_ROLES = new Set([
  'button', 'link', 'textbox', 'checkbox', 'radio', 'combobox',
  'listbox', 'menuitem', 'menuitemcheckbox', 'menuitemradio',
  'option', 'searchbox', 'slider', 'spinbutton', 'switch', 'tab',
  'treeitem',
]);

interface SnapshotOptions {
  interactive?: boolean;       // -i: 仅可交互元素
  compact?: boolean;           // -c: 移除空的结构元素
  depth?: number;              // -d N: 限制树深度
  selector?: string;           // -s SEL: 范围限定到 CSS 选择器
  diff?: boolean;              // -D / --diff: 与上次快照对比
  annotate?: boolean;          // -a / --annotate: 带标注的截图
  outputPath?: string;         // -o / --output: 带标注截图的输出路径
  cursorInteractive?: boolean; // -C / --cursor-interactive: 扫描 cursor:pointer 等
}

/**
 * 快照标志元数据 — CLI 解析和文档生成的唯一真实来源。
 *
 * 被以下模块导入：
 *   - gen-skill-docs.ts（生成 {{SNAPSHOT_FLAGS}} 表格）
 *   - skill-parser.ts（验证 SKILL.md 示例中的标志）
 */
export const SNAPSHOT_FLAGS: Array<{
  short: string;
  long: string;
  description: string;
  takesValue?: boolean;
  valueHint?: string;
  optionKey: keyof SnapshotOptions;
}> = [
  { short: '-i', long: '--interactive', description: '仅可交互元素（按钮、链接、输入框）带 @e 引用', optionKey: 'interactive' },
  { short: '-c', long: '--compact', description: '紧凑模式（无空的结构节点）', optionKey: 'compact' },
  { short: '-d', long: '--depth', description: '限制树深度（0 = 仅根节点，默认：无限制）', takesValue: true, valueHint: '<N>', optionKey: 'depth' },
  { short: '-s', long: '--selector', description: '范围限定到 CSS 选择器', takesValue: true, valueHint: '<sel>', optionKey: 'selector' },
  { short: '-D', long: '--diff', description: '与上次快照的统一差异（首次调用存储基线）', optionKey: 'diff' },
  { short: '-a', long: '--annotate', description: '带红色覆盖框和引用标签的标注截图', optionKey: 'annotate' },
  { short: '-o', long: '--output', description: '带标注截图的输出路径（默认：<temp>/browse-annotated.png）', takesValue: true, valueHint: '<path>', optionKey: 'outputPath' },
  { short: '-C', long: '--cursor-interactive', description: '光标可交互元素（@c 引用 — 带 pointer、onclick 的 div）', optionKey: 'cursorInteractive' },
];

interface ParsedNode {
  indent: number;
  role: string;
  name: string | null;
  props: string;      // e.g., "[level=1]"
  children: string;   // inline text content after ":"
  rawLine: string;
}

/**
 * 将 CLI 参数解析为 SnapshotOptions — 由 SNAPSHOT_FLAGS 元数据驱动。
 */
export function parseSnapshotArgs(args: string[]): SnapshotOptions {
  const opts: SnapshotOptions = {};
  for (let i = 0; i < args.length; i++) {
    const flag = SNAPSHOT_FLAGS.find(f => f.short === args[i] || f.long === args[i]);
    if (!flag) throw new Error(`未知的快照标志: ${args[i]}`);
    if (flag.takesValue) {
      const value = args[++i];
      if (!value) throw new Error(`用法: snapshot ${flag.short} <值>`);
      if (flag.optionKey === 'depth') {
        (opts as any)[flag.optionKey] = parseInt(value, 10);
        if (isNaN(opts.depth!)) throw new Error('用法: snapshot -d <数字>');
      } else {
        (opts as any)[flag.optionKey] = value;
      }
    } else {
      (opts as any)[flag.optionKey] = true;
    }
  }
  return opts;
}

/**
 * 解析 ariaSnapshot 输出的一行。
 *
 * 格式示例：
 *   - heading "Test" [level=1]
 *   - link "Link A":
 *     - /url: /a
 *   - textbox "Name"
 *   - paragraph: Some text
 *   - combobox "Role":
 */
function parseLine(line: string): ParsedNode | null {
  // 匹配：(缩进)(- )(角色)( "名称")?( [属性])?(: 内联内容)?
  const match = line.match(/^(\s*)-\s+(\w+)(?:\s+"([^"]*)")?(?:\s+(\[.*?\]))?\s*(?::\s*(.*))?$/);
  if (!match) {
    // 跳过元数据行，如 "- /url: /a"
    return null;
  }
  return {
    indent: match[1].length,
    role: match[2],
    name: match[3] ?? null,
    props: match[4] || '',
    children: match[5]?.trim() || '',
    rawLine: line,
  };
}

/**
 * 获取无障碍快照并构建引用映射。
 */
export async function handleSnapshot(
  args: string[],
  bm: BrowserManager
): Promise<string> {
  const opts = parseSnapshotArgs(args);
  const page = bm.getPage();

  // 通过 ariaSnapshot 获取无障碍树
  let rootLocator: Locator;
  if (opts.selector) {
    rootLocator = page.locator(opts.selector);
    const count = await rootLocator.count();
    if (count === 0) throw new Error(`未找到选择器: ${opts.selector}`);
  } else {
    rootLocator = page.locator('body');
  }

  const ariaText = await rootLocator.ariaSnapshot();
  if (!ariaText || ariaText.trim().length === 0) {
    bm.setRefMap(new Map());
    return '(未找到可访问元素)';
  }

  // 解析 ariaSnapshot 输出
  const lines = ariaText.split('\n');
  const refMap = new Map<string, RefEntry>();
  const output: string[] = [];
  let refCounter = 1;

  // 跟踪角色+名称出现次数，用于 nth() 消歧
  const roleNameCounts = new Map<string, number>();
  const roleNameSeen = new Map<string, number>();

  // 第一遍：统计角色+名称对，用于消歧
  for (const line of lines) {
    const node = parseLine(line);
    if (!node) continue;
    const key = `${node.role}:${node.name || ''}`;
    roleNameCounts.set(key, (roleNameCounts.get(key) || 0) + 1);
  }

  // 第二遍：分配引用并构建定位器
  for (const line of lines) {
    const node = parseLine(line);
    if (!node) continue;

    const depth = Math.floor(node.indent / 2);
    const isInteractive = INTERACTIVE_ROLES.has(node.role);

    // 深度过滤
    if (opts.depth !== undefined && depth > opts.depth) continue;

    // 交互过滤：跳过非交互元素但仍计入定位器索引
    if (opts.interactive && !isInteractive) {
      // 仍跟踪用于 nth() 计数
      const key = `${node.role}:${node.name || ''}`;
      roleNameSeen.set(key, (roleNameSeen.get(key) || 0) + 1);
      continue;
    }

    // 紧凑过滤：跳过无名称且无内联内容的非交互元素
    if (opts.compact && !isInteractive && !node.name && !node.children) continue;

    // 分配引用
    const ref = `e${refCounter++}`;
    const indent = '  '.repeat(depth);

    // 构建 Playwright 定位器
    const key = `${node.role}:${node.name || ''}`;
    const seenIndex = roleNameSeen.get(key) || 0;
    roleNameSeen.set(key, seenIndex + 1);
    const totalCount = roleNameCounts.get(key) || 1;

    let locator: Locator;
    if (opts.selector) {
      locator = page.locator(opts.selector).getByRole(node.role as any, {
        name: node.name || undefined,
      });
    } else {
      locator = page.getByRole(node.role as any, {
        name: node.name || undefined,
      });
    }

    // 如果多个元素共享角色+名称，使用 nth() 消歧
    if (totalCount > 1) {
      locator = locator.nth(seenIndex);
    }

    refMap.set(ref, { locator, role: node.role, name: node.name || '' });

    // 格式化输出行
    let outputLine = `${indent}@${ref} [${node.role}]`;
    if (node.name) outputLine += ` "${node.name}"`;
    if (node.props) outputLine += ` ${node.props}`;
    if (node.children) outputLine += `: ${node.children}`;

    output.push(outputLine);
  }

  // ─── 光标可交互扫描 (-C) ─────────────────────────
  if (opts.cursorInteractive) {
    try {
      const cursorElements = await page.evaluate(() => {
        const STANDARD_INTERACTIVE = new Set([
          'A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA', 'SUMMARY', 'DETAILS',
        ]);

        const results: Array<{ selector: string; text: string; reason: string }> = [];
        const allElements = document.querySelectorAll('*');

        for (const el of allElements) {
          // 跳过标准交互元素（已在 ARIA 树中）
          if (STANDARD_INTERACTIVE.has(el.tagName)) continue;
          // 跳过隐藏元素
          if (!(el as HTMLElement).offsetParent && el.tagName !== 'BODY') continue;

          const style = getComputedStyle(el);
          const hasCursorPointer = style.cursor === 'pointer';
          const hasOnclick = el.hasAttribute('onclick');
          const hasTabindex = el.hasAttribute('tabindex') && parseInt(el.getAttribute('tabindex')!, 10) >= 0;
          const hasRole = el.hasAttribute('role');

          if (!hasCursorPointer && !hasOnclick && !hasTabindex) continue;
          // 跳过有 ARIA 角色的元素（可能已被捕获）
          if (hasRole) continue;

          // 构建确定性的 nth-child CSS 路径
          const parts: string[] = [];
          let current: Element | null = el;
          while (current && current !== document.documentElement) {
            const parent = current.parentElement;
            if (!parent) break;
            const siblings = [...parent.children];
            const index = siblings.indexOf(current) + 1;
            parts.unshift(`${current.tagName.toLowerCase()}:nth-child(${index})`);
            current = parent;
          }
          const selector = parts.join(' > ');

          const text = (el as HTMLElement).innerText?.trim().slice(0, 80) || el.tagName.toLowerCase();
          const reasons: string[] = [];
          if (hasCursorPointer) reasons.push('cursor:pointer');
          if (hasOnclick) reasons.push('onclick');
          if (hasTabindex) reasons.push(`tabindex=${el.getAttribute('tabindex')}`);

          results.push({ selector, text, reason: reasons.join(', ') });
        }
        return results;
      });

      if (cursorElements.length > 0) {
        output.push('');
        output.push('── 光标可交互（不在 ARIA 树中） ──');
        let cRefCounter = 1;
        for (const elem of cursorElements) {
          const ref = `c${cRefCounter++}`;
          const locator = page.locator(elem.selector);
          refMap.set(ref, { locator, role: 'cursor-interactive', name: elem.text });
          output.push(`@${ref} [${elem.reason}] "${elem.text}"`);
        }
      }
    } catch {
      output.push('');
      output.push('(光标扫描失败 — CSP 限制)');
    }
  }

  // 在 BrowserManager 上存储引用映射
  bm.setRefMap(refMap);

  if (output.length === 0) {
    return '(未找到可交互元素)';
  }

  const snapshotText = output.join('\n');

  // ─── 带标注截图 (-a) ────────────────────────────
  if (opts.annotate) {
    const screenshotPath = opts.outputPath || `${TEMP_DIR}/browse-annotated.png`;
    // 验证输出路径（与 screenshot/pdf/responsive 一致）
    const resolvedPath = require('path').resolve(screenshotPath);
    const safeDirs = [TEMP_DIR, process.cwd()];
    if (!safeDirs.some((dir: string) => isPathWithin(resolvedPath, dir))) {
      throw new Error(`路径必须在以下目录内: ${safeDirs.join(', ')}`);
    }
    try {
      // 在每个引用的边界框处注入覆盖 div
      const boxes: Array<{ ref: string; box: { x: number; y: number; width: number; height: number } }> = [];
      for (const [ref, entry] of refMap) {
        try {
          const box = await entry.locator.boundingBox({ timeout: 1000 });
          if (box) {
            boxes.push({ ref: `@${ref}`, box });
          }
        } catch {
          // 元素可能在屏幕外或隐藏 — 跳过
        }
      }

      await page.evaluate((boxes) => {
        for (const { ref, box } of boxes) {
          const overlay = document.createElement('div');
          overlay.className = '__browse_annotation__';
          overlay.style.cssText = `
            position: absolute; top: ${box.y}px; left: ${box.x}px;
            width: ${box.width}px; height: ${box.height}px;
            border: 2px solid red; background: rgba(255,0,0,0.1);
            pointer-events: none; z-index: 99999;
            font-size: 10px; color: red; font-weight: bold;
          `;
          const label = document.createElement('span');
          label.textContent = ref;
          label.style.cssText = 'position: absolute; top: -14px; left: 0; background: red; color: white; padding: 0 3px; font-size: 10px;';
          overlay.appendChild(label);
          document.body.appendChild(overlay);
        }
      }, boxes);

      await page.screenshot({ path: screenshotPath, fullPage: true });

      // 始终移除覆盖层
      await page.evaluate(() => {
        document.querySelectorAll('.__browse_annotation__').forEach(el => el.remove());
      });

      output.push('');
      output.push(`[带标注截图: ${screenshotPath}]`);
    } catch {
      // 即使截图失败也移除覆盖层
      try {
        await page.evaluate(() => {
          document.querySelectorAll('.__browse_annotation__').forEach(el => el.remove());
        });
      } catch {}
    }
  }

  // ─── 差异模式 (-D) ───────────────────────────────────────
  if (opts.diff) {
    const lastSnapshot = bm.getLastSnapshot();
    if (!lastSnapshot) {
      bm.setLastSnapshot(snapshotText);
      return snapshotText + '\n\n(没有上次快照可对比 — 此快照已存储为基线)';
    }

    const changes = Diff.diffLines(lastSnapshot, snapshotText);
    const diffOutput: string[] = ['--- 上次快照', '+++ 当前快照', ''];

    for (const part of changes) {
      const prefix = part.added ? '+' : part.removed ? '-' : ' ';
      const diffLines = part.value.split('\n').filter(l => l.length > 0);
      for (const line of diffLines) {
        diffOutput.push(`${prefix} ${line}`);
      }
    }

    bm.setLastSnapshot(snapshotText);
    return diffOutput.join('\n');
  }

  // 存储以供将来对比
  bm.setLastSnapshot(snapshotText);

  return output.join('\n');
}
