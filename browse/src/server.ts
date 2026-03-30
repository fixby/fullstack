/**
 * fullstack browse 服务器 — 持久化 Chromium 守护进程
 *
 * 架构:
 *   Bun.serve HTTP 在 localhost 上 → 将命令路由到 Playwright
 *   控制台/网络/对话框缓冲区: CircularBuffer 内存 + 异步磁盘刷新
 *   Chromium 崩溃 → 服务器以清晰错误退出（CLI 自动重启）
 *   BROWSE_IDLE_TIMEOUT 后自动关闭（默认 30 分钟）
 *
 * 状态:
 * 状态文件: <project-root>/.openclaw/browse.json（通过 BROWSE_STATE_FILE 环境变量设置）
 * 日志文件:  <project-root>/.openclaw/browse-{console,network,dialog}.log
 *   端口:       随机 10000-60000（或 BROWSE_PORT 环境变量用于调试覆盖）
 */

import { BrowserManager } from './browser-manager';
import { handleReadCommand } from './read-commands';
import { handleWriteCommand } from './write-commands';
import { handleMetaCommand } from './meta-commands';
import { handleCookiePickerRoute } from './cookie-picker-routes';
import { COMMAND_DESCRIPTIONS } from './commands';
import { SNAPSHOT_FLAGS } from './snapshot';
import { resolveConfig, ensureStateDir, readVersionHash } from './config';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

// ─── 配置 ─────────────────────────────────────────────────────
const config = resolveConfig();
ensureStateDir(config);

// ─── 认证 ───────────────────────────────────────────────────────
const AUTH_TOKEN = crypto.randomUUID();
const BROWSE_PORT = parseInt(process.env.BROWSE_PORT || '0', 10);
const IDLE_TIMEOUT_MS = parseInt(process.env.BROWSE_IDLE_TIMEOUT || '1800000', 10); // 30 分钟

function validateAuth(req: Request): boolean {
  const header = req.headers.get('authorization');
  return header === `Bearer ${AUTH_TOKEN}`;
}

// ─── 帮助文本（从 COMMAND_DESCRIPTIONS 自动生成） ────────
function generateHelpText(): string {
  // 按类别分组命令
  const groups = new Map<string, string[]>();
  for (const [cmd, meta] of Object.entries(COMMAND_DESCRIPTIONS)) {
    const display = meta.usage || cmd;
    const list = groups.get(meta.category) || [];
    list.push(display);
    groups.set(meta.category, list);
  }

  const categoryOrder = [
    'Navigation', 'Reading', 'Interaction', 'Inspection',
    'Visual', 'Snapshot', 'Meta', 'Tabs', 'Server',
  ];

  const lines = ['openclaw browse — AI 代理的无头浏览器', '', '命令:'];
  for (const cat of categoryOrder) {
    const cmds = groups.get(cat);
    if (!cmds) continue;
    lines.push(`  ${(cat + ':').padEnd(15)}${cmds.join(', ')}`);
  }

  // 从源代码获取快照标志
  lines.push('');
  lines.push('快照标志:');
  const flagPairs: string[] = [];
  for (const flag of SNAPSHOT_FLAGS) {
    const label = flag.valueHint ? `${flag.short} ${flag.valueHint}` : flag.short;
    flagPairs.push(`${label}  ${flag.long}`);
  }
  // 每行打印两个标志以紧凑显示
  for (let i = 0; i < flagPairs.length; i += 2) {
    const left = flagPairs[i].padEnd(28);
    const right = flagPairs[i + 1] || '';
    lines.push(`  ${left}${right}`);
  }

  return lines.join('\n');
}

// ─── Buffer (from buffers.ts) ────────────────────────────────────
import { consoleBuffer, networkBuffer, dialogBuffer, addConsoleEntry, addNetworkEntry, addDialogEntry, type LogEntry, type NetworkEntry, type DialogEntry } from './buffers';
export { consoleBuffer, networkBuffer, dialogBuffer, addConsoleEntry, addNetworkEntry, addDialogEntry, type LogEntry, type NetworkEntry, type DialogEntry };

const CONSOLE_LOG_PATH = config.consoleLog;
const NETWORK_LOG_PATH = config.networkLog;
const DIALOG_LOG_PATH = config.dialogLog;
let lastConsoleFlushed = 0;
let lastNetworkFlushed = 0;
let lastDialogFlushed = 0;
let flushInProgress = false;

async function flushBuffers() {
  if (flushInProgress) return; // 防止并发刷新
  flushInProgress = true;

  try {
    // 控制台缓冲区
    const newConsoleCount = consoleBuffer.totalAdded - lastConsoleFlushed;
    if (newConsoleCount > 0) {
      const entries = consoleBuffer.last(Math.min(newConsoleCount, consoleBuffer.length));
      const lines = entries.map(e =>
        `[${new Date(e.timestamp).toISOString()}] [${e.level}] ${e.text}`
      ).join('\n') + '\n';
      fs.appendFileSync(CONSOLE_LOG_PATH, lines);
      lastConsoleFlushed = consoleBuffer.totalAdded;
    }

    // 网络缓冲区
    const newNetworkCount = networkBuffer.totalAdded - lastNetworkFlushed;
    if (newNetworkCount > 0) {
      const entries = networkBuffer.last(Math.min(newNetworkCount, networkBuffer.length));
      const lines = entries.map(e =>
        `[${new Date(e.timestamp).toISOString()}] ${e.method} ${e.url} → ${e.status || 'pending'} (${e.duration || '?'}ms, ${e.size || '?'}B)`
      ).join('\n') + '\n';
      fs.appendFileSync(NETWORK_LOG_PATH, lines);
      lastNetworkFlushed = networkBuffer.totalAdded;
    }

    // 对话框缓冲区
    const newDialogCount = dialogBuffer.totalAdded - lastDialogFlushed;
    if (newDialogCount > 0) {
      const entries = dialogBuffer.last(Math.min(newDialogCount, dialogBuffer.length));
      const lines = entries.map(e =>
        `[${new Date(e.timestamp).toISOString()}] [${e.type}] "${e.message}" → ${e.action}${e.response ? ` "${e.response}"` : ''}`
      ).join('\n') + '\n';
      fs.appendFileSync(DIALOG_LOG_PATH, lines);
      lastDialogFlushed = dialogBuffer.totalAdded;
    }
  } catch {
    // 刷新失败是非致命的 — 缓冲区在内存中
  } finally {
    flushInProgress = false;
  }
}

// 每 1 秒刷新一次
const flushInterval = setInterval(flushBuffers, 1000);

// ─── 空闲计时器 ────────────────────────────────────────────────
let lastActivity = Date.now();

function resetIdleTimer() {
  lastActivity = Date.now();
}

const idleCheckInterval = setInterval(() => {
  if (Date.now() - lastActivity > IDLE_TIMEOUT_MS) {
    console.log(`[browse] 空闲 ${IDLE_TIMEOUT_MS / 1000}s，正在关闭`);
    shutdown();
  }
}, 60_000);

// ─── 命令集（来自 commands.ts — 单一事实来源） ───
import { READ_COMMANDS, WRITE_COMMANDS, META_COMMANDS } from './commands';
export { READ_COMMANDS, WRITE_COMMANDS, META_COMMANDS };

// ─── 服务器 ────────────────────────────────────────────────────
const browserManager = new BrowserManager();
let isShuttingDown = false;

// 查找端口：显式 BROWSE_PORT，或在 10000-60000 中随机
async function findPort(): Promise<number> {
  // 显式端口覆盖（用于调试）
  if (BROWSE_PORT) {
    try {
      const testServer = Bun.serve({ port: BROWSE_PORT, fetch: () => new Response('ok') });
      testServer.stop();
      return BROWSE_PORT;
    } catch {
      throw new Error(`[browse] 端口 ${BROWSE_PORT}（来自 BROWSE_PORT 环境变量）已被占用`);
    }
  }

  // 随机端口并重试
  const MIN_PORT = 10000;
  const MAX_PORT = 60000;
  const MAX_RETRIES = 5;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const port = MIN_PORT + Math.floor(Math.random() * (MAX_PORT - MIN_PORT));
    try {
      const testServer = Bun.serve({ port, fetch: () => new Response('ok') });
      testServer.stop();
      return port;
    } catch {
      continue;
    }
  }
  throw new Error(`[browse] 在范围 ${MIN_PORT}-${MAX_PORT} 中尝试 ${MAX_RETRIES} 次后仍无可用端口`);
}

/**
 * 将 Playwright 错误转换为 AI 代理可操作的消息。
 */
function wrapError(err: any): string {
  const msg = err.message || String(err);
  // 超时错误
  if (err.name === 'TimeoutError' || msg.includes('Timeout') || msg.includes('timeout')) {
    if (msg.includes('locator.click') || msg.includes('locator.fill') || msg.includes('locator.hover')) {
      return `在超时时间内未找到元素或元素不可交互。请检查选择器或运行 'snapshot' 获取新引用。`;
    }
    if (msg.includes('page.goto') || msg.includes('Navigation')) {
      return `页面导航超时。URL 可能无法访问或页面加载缓慢。`;
    }
    return `操作超时: ${msg.split('\n')[0]}`;
  }
  // 匹配多个元素
  if (msg.includes('resolved to') && msg.includes('elements')) {
    return `选择器匹配了多个元素。请更具体或使用 'snapshot' 中的 @refs。`;
  }
  // 传递其他错误
  return msg;
}

async function handleCommand(body: any): Promise<Response> {
  const { command, args = [] } = body;

  if (!command) {
    return new Response(JSON.stringify({ error: '缺少 "command" 字段' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    let result: string;

    if (READ_COMMANDS.has(command)) {
      result = await handleReadCommand(command, args, browserManager);
    } else if (WRITE_COMMANDS.has(command)) {
      result = await handleWriteCommand(command, args, browserManager);
    } else if (META_COMMANDS.has(command)) {
      result = await handleMetaCommand(command, args, browserManager, shutdown);
    } else if (command === 'help') {
      const helpText = generateHelpText();
      return new Response(helpText, {
        status: 200,
        headers: { 'Content-Type': 'text/plain' },
      });
    } else {
      return new Response(JSON.stringify({
        error: `未知命令: ${command}`,
        hint: `可用命令: ${[...READ_COMMANDS, ...WRITE_COMMANDS, ...META_COMMANDS].sort().join(', ')}`,
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    browserManager.resetFailures();
    return new Response(result, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });
  } catch (err: any) {
    browserManager.incrementFailures();
    let errorMsg = wrapError(err);
    const hint = browserManager.getFailureHint();
    if (hint) errorMsg += '\n' + hint;
    return new Response(JSON.stringify({ error: errorMsg }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

async function shutdown() {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log('[browse] 正在关闭...');
  clearInterval(flushInterval);
  clearInterval(idleCheckInterval);
  await flushBuffers(); // 最终刷新（现在是异步）

  await browserManager.close();

  // 清理状态文件
  try { fs.unlinkSync(config.stateFile); } catch {}

  process.exit(0);
}

// 处理信号
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// ─── 启动 ─────────────────────────────────────────────────────
async function start() {
  // 清除旧日志文件
  try { fs.unlinkSync(CONSOLE_LOG_PATH); } catch {}
  try { fs.unlinkSync(NETWORK_LOG_PATH); } catch {}
  try { fs.unlinkSync(DIALOG_LOG_PATH); } catch {}

  const port = await findPort();

  // 启动浏览器
  await browserManager.launch();

  const startTime = Date.now();
  const server = Bun.serve({
    port,
    hostname: '127.0.0.1',
    fetch: async (req) => {
      resetIdleTimer();

      const url = new URL(req.url);

      // Cookie 选择器路由 — 无需认证（仅 localhost）
      if (url.pathname.startsWith('/cookie-picker')) {
        return handleCookiePickerRoute(url, req, browserManager);
      }

      // 健康检查 — 无需认证（现在是异步）
      if (url.pathname === '/health') {
        const healthy = await browserManager.isHealthy();
        return new Response(JSON.stringify({
          status: healthy ? 'healthy' : 'unhealthy',
          uptime: Math.floor((Date.now() - startTime) / 1000),
          tabs: browserManager.getTabCount(),
          currentUrl: browserManager.getCurrentUrl(),
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // 所有其他端点需要认证
      if (!validateAuth(req)) {
        return new Response(JSON.stringify({ error: '未授权' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      if (url.pathname === '/command' && req.method === 'POST') {
        const body = await req.json();
        return handleCommand(body);
      }

      return new Response('未找到', { status: 404 });
    },
  });

  // 写入状态文件（原子操作：写入 .tmp 然后重命名）
  const state = {
    pid: process.pid,
    port,
    token: AUTH_TOKEN,
    startedAt: new Date().toISOString(),
    serverPath: path.resolve(import.meta.dir, 'server.ts'),
    binaryVersion: readVersionHash() || undefined,
  };
  const tmpFile = config.stateFile + '.tmp';
  fs.writeFileSync(tmpFile, JSON.stringify(state, null, 2), { mode: 0o600 });
  fs.renameSync(tmpFile, config.stateFile);

  browserManager.serverPort = port;
  console.log(`[browse] 服务器运行在 http://127.0.0.1:${port} (PID: ${process.pid})`);
  console.log(`[browse] 状态文件: ${config.stateFile}`);
  console.log(`[browse] 空闲超时: ${IDLE_TIMEOUT_MS / 1000}s`);
}

start().catch((err) => {
  console.error(`[browse] 启动失败: ${err.message}`);
  process.exit(1);
});
