#!/usr/bin/env bun
/**
 * openclaw-global-discover — 跨 Claude Code, Codex CLI, 和 Gemini CLI 发现 AI 编码会话。
 * 将每个会话的工作目录解析为 git 仓库，按规范化的远程 URL 去重，
 * 并输出结构化 JSON 到 stdout。
 *
 * 用法:
 *   openclaw-global-discover --since 7d [--format json|summary]
 *   openclaw-global-discover --help
 */

import { existsSync, readdirSync, statSync, readFileSync, openSync, readSync, closeSync } from "fs";
import { join, basename } from "path";
import { execSync } from "child_process";
import { homedir } from "os";

// ── 类型定义 ──────────────────────────────────────────────────────────────────

interface Session {
  tool: "claude_code" | "codex" | "gemini";
  cwd: string;
}

interface Repo {
  name: string;
  remote: string;
  paths: string[];
  sessions: { claude_code: number; codex: number; gemini: number };
}

interface DiscoveryResult {
  window: string;
  start_date: string;
  repos: Repo[];
  tools: {
    claude_code: { total_sessions: number; repos: number };
    codex: { total_sessions: number; repos: number };
    gemini: { total_sessions: number; repos: number };
  };
  total_sessions: number;
  total_repos: number;
}

// ── CLI 参数解析 ────────────────────────────────────────────────────────────

function printUsage(): void {
  console.error(`用法: openclaw-global-discover --since <window> [--format json|summary]

  --since <window>   时间窗口: 例如 7d, 14d, 30d, 24h
  --format <fmt>     输出格式: json (默认) 或 summary
  --help             显示帮助

示例:
  openclaw-global-discover --since 7d
  openclaw-global-discover --since 14d --format summary`);
}

function parseArgs(): { since: string; format: "json" | "summary" } {
  const args = process.argv.slice(2);
  let since = "";
  let format: "json" | "summary" = "json";

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--help" || args[i] === "-h") {
      printUsage();
      process.exit(0);
    } else if (args[i] === "--since" && args[i + 1]) {
      since = args[++i];
    } else if (args[i] === "--format" && args[i + 1]) {
      const f = args[++i];
      if (f !== "json" && f !== "summary") {
        console.error(`无效格式: ${f}。请使用 'json' 或 'summary'。`);
        printUsage();
        process.exit(1);
      }
      format = f;
    } else {
      console.error(`未知参数: ${args[i]}`);
      printUsage();
      process.exit(1);
    }
  }

  if (!since) {
    console.error("错误: --since 是必需的。");
    printUsage();
    process.exit(1);
  }

  if (!/^\d+(d|h|w)$/.test(since)) {
    console.error(`无效窗口格式: ${since}。请使用例如 7d, 24h, 2w。`);
    process.exit(1);
  }

  return { since, format };
}

function windowToDate(window: string): Date {
  const match = window.match(/^(\d+)(d|h|w)$/);
  if (!match) throw new Error(`无效窗口: ${window}`);
  const [, numStr, unit] = match;
  const num = parseInt(numStr, 10);
  const now = new Date();

  if (unit === "h") {
    return new Date(now.getTime() - num * 60 * 60 * 1000);
  } else if (unit === "w") {
    // 周 — 与天一样对齐到午夜
    const d = new Date(now);
    d.setDate(d.getDate() - num * 7);
    d.setHours(0, 0, 0, 0);
    return d;
  } else {
    // 天 — 对齐到午夜
    const d = new Date(now);
    d.setDate(d.getDate() - num);
    d.setHours(0, 0, 0, 0);
    return d;
  }
}

// ── URL 规范化 ──────────────────────────────────────────────────────────────

export function normalizeRemoteUrl(url: string): string {
  let normalized = url.trim();

  // SSH → HTTPS: git@github.com:user/repo → https://github.com/user/repo
  const sshMatch = normalized.match(/^(?:ssh:\/\/)?git@([^:]+):(.+)$/);
  if (sshMatch) {
    normalized = `https://${sshMatch[1]}/${sshMatch[2]}`;
  }

  // 去除 .git 后缀
  if (normalized.endsWith(".git")) {
    normalized = normalized.slice(0, -4);
  }

  // 主机名小写
  try {
    const parsed = new URL(normalized);
    parsed.hostname = parsed.hostname.toLowerCase();
    normalized = parsed.toString();
    // 去除尾部斜杠
    if (normalized.endsWith("/")) {
      normalized = normalized.slice(0, -1);
    }
  } catch {
    // 不是有效的 URL (例如 local:<path>)，原样返回
  }

  return normalized;
}

// ── Git 辅助函数 ────────────────────────────────────────────────────────────

function isGitRepo(dir: string): boolean {
  return existsSync(join(dir, ".git"));
}

function getGitRemote(cwd: string): string | null {
  if (!existsSync(cwd) || !isGitRepo(cwd)) return null;
  try {
    const remote = execSync("git remote get-url origin", {
      cwd,
      encoding: "utf-8",
      timeout: 5000,
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
    return remote || null;
  } catch {
    return null;
  }
}

// ── 扫描器 ───────────────────────────────────────────────────────

function scanClaudeCode(since: Date): Session[] {
  const projectsDir = join(homedir(), ".claude", "projects");
  if (!existsSync(projectsDir)) return [];

  const sessions: Session[] = [];

  let dirs: string[];
  try {
    dirs = readdirSync(projectsDir);
  } catch {
    return [];
  }

  for (const dirName of dirs) {
    const dirPath = join(projectsDir, dirName);
    try {
      const stat = statSync(dirPath);
      if (!stat.isDirectory()) continue;
    } catch {
      continue;
    }

    // 查找 JSONL 文件
    let jsonlFiles: string[];
    try {
      jsonlFiles = readdirSync(dirPath).filter((f) => f.endsWith(".jsonl"));
    } catch {
      continue;
    }
    if (jsonlFiles.length === 0) continue;

    // 粗略 mtime 预过滤: 检查是否有最近的 JSONL 文件
    const hasRecentFile = jsonlFiles.some((f) => {
      try {
        return statSync(join(dirPath, f)).mtime >= since;
      } catch {
        return false;
      }
    });
    if (!hasRecentFile) continue;

    // 解析 cwd
    let cwd = resolveClaudeCodeCwd(dirPath, dirName, jsonlFiles);
    if (!cwd) continue;

    // 只计算窗口内修改的 JSONL 文件作为会话
    const recentFiles = jsonlFiles.filter((f) => {
      try {
        return statSync(join(dirPath, f)).mtime >= since;
      } catch {
        return false;
      }
    });
    for (let i = 0; i < recentFiles.length; i++) {
      sessions.push({ tool: "claude_code", cwd });
    }
  }

  return sessions;
}

function resolveClaudeCodeCwd(
  dirPath: string,
  dirName: string,
  jsonlFiles: string[]
): string | null {
  // 快速路径: 解码目录名
  // 例如 -Users-fixby-git-repo → /Users/fixby/git/repo
  const decoded = dirName.replace(/^-/, "/").replace(/-/g, "/");
  if (existsSync(decoded)) return decoded;

  // 回退: 从第一个 JSONL 文件读取 cwd
  // 按 mtime 降序排序，选择最近的
  const sorted = jsonlFiles
    .map((f) => {
      try {
        return { name: f, mtime: statSync(join(dirPath, f)).mtime.getTime() };
      } catch {
        return null;
      }
    })
    .filter(Boolean)
    .sort((a, b) => b!.mtime - a!.mtime) as { name: string; mtime: number }[];

  for (const file of sorted.slice(0, 3)) {
    const cwd = extractCwdFromJsonl(join(dirPath, file.name));
    if (cwd && existsSync(cwd)) return cwd;
  }

  return null;
}

function extractCwdFromJsonl(filePath: string): string | null {
  try {
    // 只读取前 8KB 以避免加载巨大的 JSONL 文件到内存
    const fd = openSync(filePath, "r");
    const buf = Buffer.alloc(8192);
    const bytesRead = readSync(fd, buf, 0, 8192, 0);
    closeSync(fd);
    const text = buf.toString("utf-8", 0, bytesRead);
    const lines = text.split("\n").slice(0, 15);
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const obj = JSON.parse(line);
        if (obj.cwd) return obj.cwd;
      } catch {
        continue; 
      }
    }
  } catch {
    // 文件读取错误
  }
  return null;
}

function scanCodex(since: Date): Session[] {
  const sessionsDir = join(homedir(), ".codex", "sessions");
  if (!existsSync(sessionsDir)) return [];

  const sessions: Session[] = [];

  // 遍历 YYYY/MM/DD 目录结构
  try {
    const years = readdirSync(sessionsDir);
    for (const year of years) {
      const yearPath = join(sessionsDir, year);
      if (!statSync(yearPath).isDirectory()) continue;

      const months = readdirSync(yearPath);
      for (const month of months) {
        const monthPath = join(yearPath, month);
        if (!statSync(monthPath).isDirectory()) continue;

        const days = readdirSync(monthPath);
        for (const day of days) {
          const dayPath = join(monthPath, day);
          if (!statSync(dayPath).isDirectory()) continue;

          const files = readdirSync(dayPath).filter((f) =>
            f.startsWith("rollout-") && f.endsWith(".jsonl")
          );

          for (const file of files) {
            const filePath = join(dayPath, file);
            try {
              const stat = statSync(filePath);
              if (stat.mtime < since) continue;
            } catch {
              continue;
            }

            // 读取第一行获取 session_meta (只读前 4KB)
            try {
              const fd = openSync(filePath, "r");
              const buf = Buffer.alloc(4096);
              const bytesRead = readSync(fd, buf, 0, 4096, 0);
              closeSync(fd);
              const firstLine = buf.toString("utf-8", 0, bytesRead).split("\n")[0];
              if (!firstLine) continue;
              const meta = JSON.parse(firstLine);
              if (meta.type === "session_meta" && meta.payload?.cwd) {
                sessions.push({ tool: "codex", cwd: meta.payload.cwd });
              }
            } catch {
              console.error(`警告: 无法解析 Codex 会话 ${filePath}`);
            }
          }
        }
      }
    }
  } catch {
    // 目录读取错误
  }

  return sessions;
}

function scanGemini(since: Date): Session[] {
  const tmpDir = join(homedir(), ".gemini", "tmp");
  if (!existsSync(tmpDir)) return [];

  // 加载 projects.json 用于路径映射
  const projectsPath = join(homedir(), ".gemini", "projects.json");
  let projectsMap: Record<string, string> = {}; // name → path
  if (existsSync(projectsPath)) {
    try {
      const data = JSON.parse(readFileSync(projectsPath, { encoding: "utf-8" }));
      // 格式: { projects: { "/path": "name" } } — 我们需要 name → path
      const projects = data.projects || {};
      for (const [path, name] of Object.entries(projects)) {
        projectsMap[name as string] = path;
      }
    } catch {
      console.error("警告: 无法解析 ~/.gemini/projects.json");
    }
  }

  const sessions: Session[] = [];
  const seenTimestamps = new Map<string, Set<string>>(); // projectName → Set<startTime>

  let projectDirs: string[];
  try {
    projectDirs = readdirSync(tmpDir);
  } catch {
    return [];
  }

  for (const projectName of projectDirs) {
    const chatsDir = join(tmpDir, projectName, "chats");
    if (!existsSync(chatsDir)) continue;

    // 从 projects.json 解析 cwd
    let cwd = projectsMap[projectName] || null;

    // 回退: 检查 .project_root
    if (!cwd) {
      const projectRootFile = join(tmpDir, projectName, ".project_root");
      if (existsSync(projectRootFile)) {
        try {
          cwd = readFileSync(projectRootFile, { encoding: "utf-8" }).trim();
        } catch {}
      }
    }

    if (!cwd || !existsSync(cwd)) continue;

    const seen = seenTimestamps.get(projectName) || new Set<string>();
    seenTimestamps.set(projectName, seen);

    let files: string[];
    try {
      files = readdirSync(chatsDir).filter((f) =>
        f.startsWith("session-") && f.endsWith(".json")
      );
    } catch {
      continue;
    }

    for (const file of files) {
      const filePath = join(chatsDir, file);
      try {
        const stat = statSync(filePath);
        if (stat.mtime < since) continue;
      } catch {
        continue;
      }

      try {
        const data = JSON.parse(readFileSync(filePath, { encoding: "utf-8" }));
        const startTime = data.startTime || "";

        // 按 startTime 在项目内去重
        if (startTime && seen.has(startTime)) continue;
        if (startTime) seen.add(startTime);

        sessions.push({ tool: "gemini", cwd });
      } catch {
        console.error(`警告: 无法解析 Gemini 会话 ${filePath}`);
      }
    }
  }

  return sessions;
}

// ── 去重 ──────────────────────────────────────────────────────────

async function resolveAndDeduplicate(sessions: Session[]): Promise<Repo[]> {
  // 按 cwd 分组会话
  const byCwd = new Map<string, Session[]>();
  for (const s of sessions) {
    const existing = byCwd.get(s.cwd) || [];
    existing.push(s);
    byCwd.set(s.cwd, existing);
  }

  // 为每个 cwd 解析 git 远程
  const cwds = Array.from(byCwd.keys());
  const remoteMap = new Map<string, string>(); // cwd → 规范化的远程

  for (const cwd of cwds) {
    const raw = getGitRemote(cwd);
    if (raw) {
      remoteMap.set(cwd, normalizeRemoteUrl(raw));
    } else if (existsSync(cwd) && isGitRepo(cwd)) {
      remoteMap.set(cwd, `local:${cwd}`);
    }
  }

  // 按规范化远程分组
  const byRemote = new Map<string, { paths: string[]; sessions: Session[] }>();
  for (const [cwd, cwdSessions] of byCwd) {
    const remote = remoteMap.get(cwd);
    if (!remote) continue;

    const existing = byRemote.get(remote) || { paths: [], sessions: [] };
    if (!existing.paths.includes(cwd)) existing.paths.push(cwd);
    existing.sessions.push(...cwdSessions);
    byRemote.set(remote, existing);
  }

  // 构建 Repo 对象
  const repos: Repo[] = [];
  for (const [remote, data] of byRemote) {
    // 找到第一个有效路径
    const validPath = data.paths.find((p) => existsSync(p) && isGitRepo(p));
    if (!validPath) continue;

    // 从远程 URL 派生名称
    let name: string;
    if (remote.startsWith("local:")) {
      name = basename(remote.replace("local:", ""));
    } else {
      try {
        const url = new URL(remote);
        name = basename(url.pathname);
      } catch {
        name = basename(remote);
      }
    }

    const sessionCounts = { claude_code: 0, codex: 0, gemini: 0 };
    for (const s of data.sessions) {
      sessionCounts[s.tool]++;
    }

    repos.push({
      name,
      remote,
      paths: data.paths,
      sessions: sessionCounts,
    });
  }

  // 按总会话数降序排序
  repos.sort(
    (a, b) =>
      b.sessions.claude_code + b.sessions.codex + b.sessions.gemini -
      (a.sessions.claude_code + a.sessions.codex + a.sessions.gemini)
  );

  return repos;
}

// ── 主函数 ───────────────────────────────────────────────────────────────────

async function main() {
  const { since, format } = parseArgs();
  const sinceDate = windowToDate(since);
  const startDate = sinceDate.toISOString().split("T")[0];

  // 运行所有扫描器
  const ccSessions = scanClaudeCode(sinceDate);
  const codexSessions = scanCodex(sinceDate);
  const geminiSessions = scanGemini(sinceDate);

  const allSessions = [...ccSessions, ...codexSessions, ...geminiSessions];

  // 摘要到 stderr
  console.error(
    `发现: ${ccSessions.length} 个 CC 会话, ${codexSessions.length} 个 Codex 会话, ${geminiSessions.length} 个 Gemini 会话`
  );

  // 去重
  const repos = await resolveAndDeduplicate(allSessions);

  console.error(`→ ${repos.length} 个唯一仓库`);

  // 计算每工具的仓库数
  const ccRepos = new Set(repos.filter((r) => r.sessions.claude_code > 0).map((r) => r.remote)).size;
  const codexRepos = new Set(repos.filter((r) => r.sessions.codex > 0).map((r) => r.remote)).size;
  const geminiRepos = new Set(repos.filter((r) => r.sessions.gemini > 0).map((r) => r.remote)).size;

  const result: DiscoveryResult = {
    window: since,
    start_date: startDate,
    repos,
    tools: {
      claude_code: { total_sessions: ccSessions.length, repos: ccRepos },
      codex: { total_sessions: codexSessions.length, repos: codexRepos },
      gemini: { total_sessions: geminiSessions.length, repos: geminiRepos },
    },
    total_sessions: allSessions.length,
    total_repos: repos.length,
  };

  if (format === "json") {
    console.log(JSON.stringify(result, null, 2));
  } else {
    // 摘要格式
    console.log(`窗口: ${since} (自 ${startDate})`);
    console.log(`会话: ${allSessions.length} 总计 (CC: ${ccSessions.length}, Codex: ${codexSessions.length}, Gemini: ${geminiSessions.length})`);
    console.log(`仓库: ${repos.length} 个唯一`);
    console.log("");
    for (const repo of repos) {
      const total = repo.sessions.claude_code + repo.sessions.codex + repo.sessions.gemini;
      const tools = [];
      if (repo.sessions.claude_code > 0) tools.push(`CC:${repo.sessions.claude_code}`);
      if (repo.sessions.codex > 0) tools.push(`Codex:${repo.sessions.codex}`);
      if (repo.sessions.gemini > 0) tools.push(`Gemini:${repo.sessions.gemini}`);
      console.log(`  ${repo.name} (${total} 个会话) — ${tools.join(", ")}`);
      console.log(`    远程: ${repo.remote}`);
      console.log(`    路径: ${repo.paths.join(", ")}`);
    }
  }
}

// 仅在直接执行时运行 main (不是被导入测试时)
if (import.meta.main) {
  main().catch((err) => {
    console.error(`致命错误: ${err.message}`);
    process.exit(1);
  });
}
