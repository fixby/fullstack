/**
 * fullstack CLI — 与持久服务器通信的轻量包装器
 *
 * 流程：
 *   1. 读取 .openclaw/browse.json 获取端口和令牌
 *   2. 如果缺失或 PID 过期 → 在后台启动服务器
 *   3. 健康检查 + 版本不匹配检测
 *   4. 通过 HTTP POST 发送命令
 *   5. 将响应打印到 stdout（或 stderr 用于错误）
 */

import * as fs from 'fs';
import * as path from 'path';
import { resolveConfig, ensureStateDir, readVersionHash } from './config';

const config = resolveConfig();
const IS_WINDOWS = process.platform === 'win32';
const MAX_START_WAIT = IS_WINDOWS ? 15000 : 8000; // Node+Chromium 在 Windows 上需要更长时间

export function resolveServerScript(
  env: Record<string, string | undefined> = process.env,
  metaDir: string = import.meta.dir,
  execPath: string = process.execPath
): string {
  if (env.BROWSE_SERVER_SCRIPT) {
    return env.BROWSE_SERVER_SCRIPT;
  }

  // 开发模式：cli.ts 直接从 browse/src 运行
  // 在 macOS/Linux 上，import.meta.dir 以 / 开头
  // 在 Windows 上，它以驱动器字母开头（例如 C:\...）
  if (!metaDir.includes('$bunfs')) {
    const direct = path.resolve(metaDir, 'server.ts');
    if (fs.existsSync(direct)) {
      return direct;
    }
  }

  // 编译后的二进制文件：从 browse/dist/browse 推导源码树
  if (execPath) {
    const adjacent = path.resolve(path.dirname(execPath), '..', 'src', 'server.ts');
    if (fs.existsSync(adjacent)) {
      return adjacent;
    }
  }

  throw new Error(
    '无法找到 server.ts。请设置 BROWSE_SERVER_SCRIPT 环境变量或从 browse 源码树运行。'
  );
}

const SERVER_SCRIPT = resolveServerScript();

/**
 * 在 Windows 上，解析 Node.js 兼容的服务器包。
 * 如果未找到则回退到 null（服务器将使用 Bun 代替）。
 */
export function resolveNodeServerScript(
  metaDir: string = import.meta.dir,
  execPath: string = process.execPath
): string | null {
  // 开发模式
  if (!metaDir.includes('$bunfs')) {
    const distScript = path.resolve(metaDir, '..', 'dist', 'server-node.mjs');
    if (fs.existsSync(distScript)) return distScript;
  }

  // 编译后的二进制文件：browse/dist/browse → browse/dist/server-node.mjs
  if (execPath) {
    const adjacent = path.resolve(path.dirname(execPath), 'server-node.mjs');
    if (fs.existsSync(adjacent)) return adjacent;
  }

  return null;
}

const NODE_SERVER_SCRIPT = IS_WINDOWS ? resolveNodeServerScript() : null;

interface ServerState {
  pid: number;
  port: number;
  token: string;
  startedAt: string;
  serverPath: string;
  binaryVersion?: string;
}

// ─── 状态文件 ────────────────────────────────────────────────
function readState(): ServerState | null {
  try {
    const data = fs.readFileSync(config.stateFile, 'utf-8');
    return JSON.parse(data);
  } catch {
    return null;
  }
}

function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

// ─── 进程管理 ─────────────────────────────────────────
async function killServer(pid: number): Promise<void> {
  if (!isProcessAlive(pid)) return;

  try { process.kill(pid, 'SIGTERM'); } catch { return; }

  // 等待最多 2 秒进行优雅关闭
  const deadline = Date.now() + 2000;
  while (Date.now() < deadline && isProcessAlive(pid)) {
    await Bun.sleep(100);
  }

  // 如果仍然存活则强制终止
  if (isProcessAlive(pid)) {
    try { process.kill(pid, 'SIGKILL'); } catch {}
  }
}

/**
 * 清理项目本地状态之前的遗留 /tmp/browse-server*.json 文件。
 * 在发送信号前验证 PID 所有权。
 */
function cleanupLegacyState(): void {
  try {
    const files = fs.readdirSync('/tmp').filter(f => f.startsWith('browse-server') && f.endsWith('.json'));
    for (const file of files) {
      const fullPath = `/tmp/${file}`;
      try {
        const data = JSON.parse(fs.readFileSync(fullPath, 'utf-8'));
        if (data.pid && isProcessAlive(data.pid)) {
          // 在终止前验证这确实是一个 browse 服务器
          const check = Bun.spawnSync(['ps', '-p', String(data.pid), '-o', 'command='], {
            stdout: 'pipe', stderr: 'pipe', timeout: 2000,
          });
          const cmd = check.stdout.toString().trim();
          if (cmd.includes('bun') || cmd.includes('server.ts')) {
            try { process.kill(data.pid, 'SIGTERM'); } catch {}
          }
        }
        fs.unlinkSync(fullPath);
      } catch {
        // 尽力而为 — 跳过无法解析或清理的文件
      }
    }
    // 同时清理遗留的日志文件
    const logFiles = fs.readdirSync('/tmp').filter(f =>
      f.startsWith('browse-console') || f.startsWith('browse-network') || f.startsWith('browse-dialog')
    );
    for (const file of logFiles) {
      try { fs.unlinkSync(`/tmp/${file}`); } catch {}
    }
  } catch {
    // /tmp 读取失败 — 跳过遗留清理
  }
}

// ─── 服务器生命周期 ──────────────────────────────────────────
async function startServer(): Promise<ServerState> {
  ensureStateDir(config);

  // 清理过期的状态文件
  try { fs.unlinkSync(config.stateFile); } catch {}

  // 作为分离的后台进程启动服务器。
  // 在 Windows 上，Bun 无法启动/连接 Playwright 的 Chromium (oven-sh/bun#4253, #9911)。
  // 回退到在 Node.js 下运行服务器，使用 Bun API polyfill。
  const useNode = IS_WINDOWS && NODE_SERVER_SCRIPT;
  const serverCmd = useNode
    ? ['node', NODE_SERVER_SCRIPT]
    : ['bun', 'run', SERVER_SCRIPT];
  const proc = Bun.spawn(serverCmd, {
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, BROWSE_STATE_FILE: config.stateFile },
  });

  // 不阻止 CLI 退出
  proc.unref();

  // 等待状态文件出现
  const start = Date.now();
  while (Date.now() - start < MAX_START_WAIT) {
    const state = readState();
    if (state && isProcessAlive(state.pid)) {
      return state;
    }
    await Bun.sleep(100);
  }

  // 如果到达这里，说明服务器没有及时启动
  // 尝试读取 stderr 获取错误消息
  const stderr = proc.stderr;
  if (stderr) {
    const reader = stderr.getReader();
    const { value } = await reader.read();
    if (value) {
      const errText = new TextDecoder().decode(value);
      throw new Error(`服务器启动失败:\n${errText}`);
    }
  }
  throw new Error(`服务器在 ${MAX_START_WAIT / 1000} 秒内未能启动`);
}

/**
 * 获取独占锁文件以防止并发 ensureServer() 竞争条件 (TOCTOU)。
 * 返回一个释放锁的清理函数。
 */
function acquireServerLock(): (() => void) | null {
  const lockPath = `${config.stateFile}.lock`;
  try {
    // O_CREAT | O_EXCL — 如果文件已存在则失败（原子检查并创建）
    const fd = fs.openSync(lockPath, fs.constants.O_CREAT | fs.constants.O_EXCL | fs.constants.O_WRONLY);
    fs.writeSync(fd, `${process.pid}\n`);
    fs.closeSync(fd);
    return () => { try { fs.unlinkSync(lockPath); } catch {} };
  } catch {
    // 锁已被占用 — 检查持有者是否仍然存活
    try {
      const holderPid = parseInt(fs.readFileSync(lockPath, 'utf8').trim(), 10);
      if (holderPid && isProcessAlive(holderPid)) {
        return null; // 另一个活跃进程持有锁
      }
      // 过期的锁 — 移除并重试
      fs.unlinkSync(lockPath);
      return acquireServerLock();
    } catch {
      return null;
    }
  }
}

async function ensureServer(): Promise<ServerState> {
  const state = readState();

  if (state && isProcessAlive(state.pid)) {
    // 检查二进制版本不匹配（更新时自动重启）
    const currentVersion = readVersionHash();
    if (currentVersion && state.binaryVersion && currentVersion !== state.binaryVersion) {
      console.error('[browse] 二进制文件已更新，正在重启服务器...');
      await killServer(state.pid);
      return startServer();
    }

    // 服务器似乎存活 — 进行健康检查
    try {
      const resp = await fetch(`http://127.0.0.1:${state.port}/health`, {
        signal: AbortSignal.timeout(2000),
      });
      if (resp.ok) {
        const health = await resp.json() as any;
        if (health.status === 'healthy') {
          return state;
        }
      }
    } catch {
      // 健康检查失败 — 服务器已死亡或不健康
    }
  }

  // 获取锁以防止并发重启竞争条件 (TOCTOU)
  const releaseLock = acquireServerLock();
  if (!releaseLock) {
    // 另一个进程正在启动服务器 — 等待它
    console.error('[browse] 另一个实例正在启动服务器，等待中...');
    const start = Date.now();
    while (Date.now() - start < MAX_START_WAIT) {
      const freshState = readState();
      if (freshState && isProcessAlive(freshState.pid)) return freshState;
      await Bun.sleep(200);
    }
    throw new Error('等待另一个实例启动服务器超时');
  }

  try {
    // 在锁内重新读取状态，以防另一个进程刚刚启动了服务器
    const freshState = readState();
    if (freshState && isProcessAlive(freshState.pid)) {
      return freshState;
    }

    // 终止旧服务器以避免孤立的 chromium 进程
    if (state && state.pid) {
      await killServer(state.pid);
    }
    console.error('[browse] 正在启动服务器...');
    return await startServer();
  } finally {
    releaseLock();
  }
}

// ─── 命令分发 ──────────────────────────────────────────
async function sendCommand(state: ServerState, command: string, args: string[], retries = 0): Promise<void> {
  const body = JSON.stringify({ command, args });

  try {
    const resp = await fetch(`http://127.0.0.1:${state.port}/command`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${state.token}`,
      },
      body,
      signal: AbortSignal.timeout(30000),
    });

    if (resp.status === 401) {
      // 令牌不匹配 — 服务器可能已重启
      console.error('[browse] 认证失败 — 服务器可能已重启。重试中...');
      const newState = readState();
      if (newState && newState.token !== state.token) {
        return sendCommand(newState, command, args);
      }
      throw new Error('认证失败');
    }

    const text = await resp.text();

    if (resp.ok) {
      process.stdout.write(text);
      if (!text.endsWith('\n')) process.stdout.write('\n');
    } else {
      // 尝试解析为 JSON 错误
      try {
        const err = JSON.parse(text);
        console.error(err.error || text);
        if (err.hint) console.error(err.hint);
      } catch {
        console.error(text);
      }
      process.exit(1);
    }
  } catch (err: any) {
    if (err.name === 'AbortError') {
      console.error('[browse] 命令在 30 秒后超时');
      process.exit(1);
    }
    // 连接错误 — 服务器可能已崩溃
    if (err.code === 'ECONNREFUSED' || err.code === 'ECONNRESET' || err.message?.includes('fetch failed')) {
      if (retries >= 1) throw new Error('[browse] 服务器连续崩溃两次 — 终止');
      console.error('[browse] 服务器连接丢失。正在重启...');
      // 终止旧服务器以避免孤立的 chromium 进程
      const oldState = readState();
      if (oldState && oldState.pid) {
        await killServer(oldState.pid);
      }
      const newState = await startServer();
      return sendCommand(newState, command, args, retries + 1);
    }
    throw err;
  }
}

// ─── 主函数 ──────────────────────────────────────────────
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    console.log(`openclaw browse — AI 编码代理的快速无头浏览器

用法: browse <command> [args...]

导航:     goto <url> | back | forward | reload | url
内容:        text | html [sel] | links | forms | accessibility
交互:    click <sel> | fill <sel> <val> | select <sel> <val>
                hover <sel> | type <text> | press <key>
                scroll [sel] | wait <sel|--networkidle|--load> | viewport <WxH>
                upload <sel> <file1> [file2...]
                cookie-import <json-file>
                cookie-import-browser [browser] [--domain <d>]
检查:     js <expr> | eval <file> | css <sel> <prop> | attrs <sel>
                console [--clear|--errors] | network [--clear] | dialog [--clear]
                cookies | storage [set <k> <v>] | perf
                is <prop> <sel> (visible|hidden|enabled|disabled|checked|editable|focused)
可视化:         screenshot [--viewport] [--clip x,y,w,h] [@ref|sel] [path]
                pdf [path] | responsive [prefix]
快照:       snapshot [-i] [-c] [-d N] [-s sel] [-D] [-a] [-o path] [-C]
                -D/--diff: 与上次快照对比
                -a/--annotate: 带标注的截图，显示引用标签
                -C/--cursor-interactive: 查找非 ARIA 可点击元素
比较:        diff <url1> <url2>
多步骤:     chain (从 stdin 读取 JSON)
标签页:           tabs | tab <id> | newtab [url] | closetab [id]
服务器:         status | cookie <n>=<v> | header <n>:<v>
                useragent <str> | stop | restart
对话框:        dialog-accept [text] | dialog-dismiss

引用:           在 'snapshot' 之后，使用 @e1, @e2... 作为选择器:
                click @e3 | fill @e4 "value" | hover @e1
                来自 -C 的 @c 引用: click @c1`);
    process.exit(0);
  }

  // 一次性清理遗留的 /tmp 状态文件
  cleanupLegacyState();

  const command = args[0];
  const commandArgs = args.slice(1);

  // 特殊情况：chain 从 stdin 读取
  if (command === 'chain' && commandArgs.length === 0) {
    const stdin = await Bun.stdin.text();
    commandArgs.push(stdin.trim());
  }

  const state = await ensureServer();
  await sendCommand(state, command, commandArgs);
}

if (import.meta.main) {
  main().catch((err) => {
    console.error(`[browse] ${err.message}`);
    process.exit(1);
  });
}
