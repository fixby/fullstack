/**
 * 浏览器生命周期管理器
 *
 * Chromium 崩溃处理：
 *   browser.on('disconnected') → 记录错误 → process.exit(1)
 *   CLI 检测到死亡的服务器 → 下次命令时自动重启
 *   我们不尝试自我修复 — 不要隐藏失败。
 *
 * 对话框处理：
 *   page.on('dialog') → 默认自动接受 → 存储到对话框缓冲区
 *   防止 alert/confirm/prompt 导致浏览器锁定
 *
 * 上下文重建：
 *   recreateContext() 保存 cookies/storage/URLs，创建新上下文，
 *   恢复状态。任何失败时回退到干净状态。
 */

import { chromium, type Browser, type BrowserContext, type BrowserContextOptions, type Page, type Locator, type Cookie } from 'playwright';
import { addConsoleEntry, addNetworkEntry, addDialogEntry, networkBuffer, type DialogEntry } from './buffers';
import { validateNavigationUrl } from './url-validation';

export interface RefEntry {
  locator: Locator;
  role: string;
  name: string;
}

export interface BrowserState {
  cookies: Cookie[];
  pages: Array<{
    url: string;
    isActive: boolean;
    storage: { localStorage: Record<string, string>; sessionStorage: Record<string, string> } | null;
  }>;
}

export class BrowserManager {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private pages: Map<number, Page> = new Map();
  private activeTabId: number = 0;
  private nextTabId: number = 1;
  private extraHeaders: Record<string, string> = {};
  private customUserAgent: string | null = null;

  /** 服务器端口 — 服务器启动后设置， cookie-import-browser 命令使用 */
  public serverPort: number = 0;

  // ─── 引用映射（snapshot → @e1, @e2, @c1, @c2, ...） ────────
  private refMap: Map<string, RefEntry> = new Map();

  // ─── 快照差异对比 ─────────────────────────────────────
  // 导航时不不清除 — 这是用于差异对比的文本基线
  private lastSnapshot: string | null = null;

  // ─── 对话框处理 ──────────────────────────────────────
  private dialogAutoAccept: boolean = true;
  private dialogPromptText: string | null = null;

  // ─── 交接状态 ─────────────────────────────────────────
  private isHeaded: boolean = false;
  private consecutiveFailures: number = 0;

  async launch() {
    this.browser = await chromium.launch({ headless: true });

    // Chromium 崩溃 → 吺清晰消息退出
    this.browser.on('disconnected', () => {
      console.error('[browse] 致命错误: Chromium 进程崩溃或被终止。服务器正在退出。');
      console.error('[browse] 控制台/网络日志已刷新到 .openclaw/browse-*.log');
      process.exit(1);
    });

    const contextOptions: BrowserContextOptions = {
      viewport: { width: 1280, height: 720 },
    };
    if (this.customUserAgent) {
      contextOptions.userAgent = this.customUserAgent;
    }
    this.context = await this.browser.newContext(contextOptions);

    if (Object.keys(this.extraHeaders).length > 0) {
      await this.context.setExtraHTTPHeaders(this.extraHeaders);
    }

    // 创建第一个标签页
    await this.newTab();
  }

  async close() {
    if (this.browser) {
      // 移除断开连接处理程序以避免在有意关闭时退出
      this.browser.removeAllListeners('disconnected');
      // 超时： 有界面浏览器 close() 在 macOS 上可能挂起
      await Promise.race([
        this.browser.close(),
        new Promise(resolve => setTimeout(resolve, 5000)),
      ]).catch(() => {});
      this.browser = null;
    }
  }

  /** 健康检查 — 验证 Chromium 已连接且响应正常 */
  async isHealthy(): Promise<boolean> {
    if (!this.browser || !this.browser.isConnected()) return false;
    try {
      const page = this.pages.get(this.activeTabId);
      if (!page) return true; // 已连接但没有页面 — 仍然健康
      await Promise.race([
        page.evaluate('1'),
        new Promise((_, reject) => setTimeout(() => reject(new Error('超时')), 2000)),
      ]);
      return true;
    } catch {
      return false;
    }
  }

  // ─── 标签页管理 ────────────────────────────────────────
  async newTab(url?: string): Promise<number> {
    if (!this.context) throw new Error('浏览器未启动');

    // 在分配页面前验证 URL 以避免拒绝时产生僵尸标签页
    if (url) {
      await validateNavigationUrl(url);
    }

    const page = await this.context.newPage();
    const id = this.nextTabId++;
    this.pages.set(id, page);
    this.activeTabId = id;

    // 连接控制台/网络/对话框捕获
    this.wirePageEvents(page);

    if (url) {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
    }

    return id;
  }

  async closeTab(id?: number): Promise<void> {
    const tabId = id ?? this.activeTabId;
    const page = this.pages.get(tabId);
    if (!page) throw new Error(`标签页 ${tabId} 未找到`);

    await page.close();
    this.pages.delete(tabId);

    // 如果关闭的是活动标签页，则切换到另一个
    if (tabId === this.activeTabId) {
      const remaining = [...this.pages.keys()];
      if (remaining.length > 0) {
        this.activeTabId = remaining[remaining.length - 1];
      } else {
        // 没有剩余标签页 — 创建一个新的空白标签页
        await this.newTab();
      }
    }
  }

  switchTab(id: number): void {
    if (!this.pages.has(id)) throw new Error(`标签页 ${id} 未找到`);
    this.activeTabId = id;
  }

  getTabCount(): number {
    return this.pages.size;
  }

  async getTabListWithTitles(): Promise<Array<{ id: number; url: string; title: string; active: boolean }>> {
    const tabs: Array<{ id: number; url: string; title: string; active: boolean }> = [];
    for (const [id, page] of this.pages) {
      tabs.push({
        id,
        url: page.url(),
        title: await page.title().catch(() => ''),
        active: id === this.activeTabId,
      });
    }
    return tabs;
  }

  // ─── 页面访问 ───────────────────────────────────────────
  getPage(): Page {
    const page = this.pages.get(this.activeTabId);
    if (!page) throw new Error('没有活动页面。请先使用 "browse goto <url>"。');
    return page;
  }

  getCurrentUrl(): string {
    try {
      return this.getPage().url();
    } catch {
      return 'about:blank';
    }
  }

  // ─── 引用映射 ──────────────────────────────────────────────
  setRefMap(refs: Map<string, RefEntry>) {
    this.refMap = refs;
  }

  clearRefs() {
    this.refMap.clear();
  }

  /**
   * 解析可能是 @ref（例如 "@e3"、"@c1"）或 CSS 选择器的选择器。
   * 对于引用返回 { locator }，对于 CSS 选择器返回 { selector }。
   */
  async resolveRef(selector: string): Promise<{ locator: Locator } | { selector: string }> {
    if (selector.startsWith('@e') || selector.startsWith('@c')) {
      const ref = selector.slice(1); // "e3" 或 "c1"
      const entry = this.refMap.get(ref);
      if (!entry) {
        throw new Error(
          `引用 ${selector} 未找到。请运行 'snapshot' 获取新的引用。`
        );
      }
      const count = await entry.locator.count();
      if (count === 0) {
        throw new Error(
          `引用 ${selector} (${entry.role} "${entry.name}") 已过期 — 元素不再存在。 ` +
          `请运行 'snapshot' 获取新的引用。`
        );
      }
      return { locator: entry.locator };
    }
    return { selector };
  }

  /** 获取引用选择器的 ARIA 角色，对于 CSS 选择器或未知引用返回 null。 */
  getRefRole(selector: string): string | null {
    if (selector.startsWith('@e') || selector.startsWith('@c')) {
      const entry = this.refMap.get(selector.slice(1));
      return entry?.role ?? null;
    }
    return null;
  }

  getRefCount(): number {
    return this.refMap.size;
  }

  // ─── Snapshot Diffing ─────────────────────────────────────
  setLastSnapshot(text: string | null) {
    this.lastSnapshot = text;
  }

  getLastSnapshot(): string | null {
    return this.lastSnapshot;
  }

  // ─── Dialog Control ───────────────────────────────────────
  setDialogAutoAccept(accept: boolean) {
    this.dialogAutoAccept = accept;
  }

  getDialogAutoAccept(): boolean {
    return this.dialogAutoAccept;
  }

  setDialogPromptText(text: string | null) {
    this.dialogPromptText = text;
  }

  getDialogPromptText(): string | null {
    return this.dialogPromptText;
  }

  // ─── Viewport ──────────────────────────────────────────────
  async setViewport(width: number, height: number) {
    await this.getPage().setViewportSize({ width, height });
  }

  // ─── Extra Headers ─────────────────────────────────────────
  async setExtraHeader(name: string, value: string) {
    this.extraHeaders[name] = value;
    if (this.context) {
      await this.context.setExtraHTTPHeaders(this.extraHeaders);
    }
  }

  // ─── User Agent ────────────────────────────────────────────
  setUserAgent(ua: string) {
    this.customUserAgent = ua;
  }

  getUserAgent(): string | null {
    return this.customUserAgent;
  }

  // ─── 状态保存/恢复（由 recreateContext + handoff 共享） ─
  /**
   * 捕获浏览器状态：cookies、localStorage、sessionStorage、URLs、活动标签页。
   * 跳过存储读取失败的页面（例如，已关闭的页面）。
   */
  async saveState(): Promise<BrowserState> {
    if (!this.context) throw new Error('浏览器未启动');

    const cookies = await this.context.cookies();
    const pages: BrowserState['pages'] = [];

    for (const [id, page] of this.pages) {
      const url = page.url();
      let storage = null;
      try {
        storage = await page.evaluate(() => ({
          localStorage: { ...localStorage },
          sessionStorage: { ...sessionStorage },
        }));
      } catch {}
      pages.push({
        url: url === 'about:blank' ? '' : url,
        isActive: id === this.activeTabId,
        storage,
      });
    }

    return { cookies, pages };
  }

  /**
   * 将浏览器状态恢复到当前上下文：cookies、页面、存储。
   * 导航到保存的 URL，恢复存储，连接页面事件。
   * 单个页面的失败会被忽略 — 部分恢复比完全不恢复要好。
   */
  async restoreState(state: BrowserState): Promise<void> {
    if (!this.context) throw new Error('浏览器未启动');

    // 恢复 cookies
    if (state.cookies.length > 0) {
      await this.context.addCookies(state.cookies);
    }

    // 重新创建页面
    let activeId: number | null = null;
    for (const saved of state.pages) {
      const page = await this.context.newPage();
      const id = this.nextTabId++;
      this.pages.set(id, page);
      this.wirePageEvents(page);

      if (saved.url) {
        await page.goto(saved.url, { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {});
      }

      if (saved.storage) {
        try {
          await page.evaluate((s: { localStorage: Record<string, string>; sessionStorage: Record<string, string> }) => {
            if (s.localStorage) {
              for (const [k, v] of Object.entries(s.localStorage)) {
                localStorage.setItem(k, v);
              }
            }
            if (s.sessionStorage) {
              for (const [k, v] of Object.entries(s.sessionStorage)) {
                sessionStorage.setItem(k, v);
              }
            }
          }, saved.storage);
        } catch {}
      }

      if (saved.isActive) activeId = id;
    }

    // 如果没有保存的页面，创建一个空白页面
    if (this.pages.size === 0) {
      await this.newTab();
    } else {
      this.activeTabId = activeId ?? [...this.pages.keys()][0];
    }

    // 清除引用 — 页面是新的，定位器已过期
    this.clearRefs();
  }

  /**
   * 重建浏览器上下文以应用用户代理更改。
   * 保存并恢复 cookies、localStorage、sessionStorage 和打开的页面。
   * 任何失败时回退到干净状态。
   */
  async recreateContext(): Promise<string | null> {
    if (!this.browser || !this.context) {
      throw new Error('浏览器未启动');
    }

    try {
      // 1. 保存状态
      const state = await this.saveState();

      // 2. 关闭旧页面和上下文
      for (const page of this.pages.values()) {
        await page.close().catch(() => {});
      }
      this.pages.clear();
      await this.context.close().catch(() => {});

      // 3. 使用更新的设置创建新上下文
      const contextOptions: BrowserContextOptions = {
        viewport: { width: 1280, height: 720 },
      };
      if (this.customUserAgent) {
        contextOptions.userAgent = this.customUserAgent;
      }
      this.context = await this.browser.newContext(contextOptions);

      if (Object.keys(this.extraHeaders).length > 0) {
        await this.context.setExtraHTTPHeaders(this.extraHeaders);
      }

      // 4. 恢复状态
      await this.restoreState(state);

      return null; // 成功
    } catch (err: unknown) {
      // 回退：创建干净的上下文 + 空白标签页
      try {
        this.pages.clear();
        if (this.context) await this.context.close().catch(() => {});

        const contextOptions: BrowserContextOptions = {
          viewport: { width: 1280, height: 720 },
        };
        if (this.customUserAgent) {
          contextOptions.userAgent = this.customUserAgent;
        }
        this.context = await this.browser!.newContext(contextOptions);
        await this.newTab();
        this.clearRefs();
      } catch {
        // 如果连回退都失败了，我们就麻烦了 — 但浏览器仍然活着
      }
      return `上下文重建失败: ${err instanceof Error ? err.message : String(err)}。浏览器已重置为空白标签页。`;
    }
  }

  // ─── 交接：无头 → 有头 ─────────────────────────────
  /**
   * 通过以有头模式重新启动将浏览器控制权移交给用户。
   *
   * 流程（先启动后关闭，以便安全回滚）：
   *   1. 从当前无头浏览器保存状态
   *   2. 启动新的有头浏览器
   *   3. 将状态恢复到新浏览器
   *   4. 关闭旧的无头浏览器
   *   如果步骤 2 失败 → 返回错误，无头浏览器未受影响
   */
  async handoff(message: string): Promise<string> {
    if (this.isHeaded) {
      return `HANDOFF: 已处于有头模式，位于 ${this.getCurrentUrl()}`;
    }
    if (!this.browser || !this.context) {
      throw new Error('浏览器未启动');
    }

    // 1. 从当前浏览器保存状态
    const state = await this.saveState();
    const currentUrl = this.getCurrentUrl();

    // 2. 启动新的有头浏览器（try-catch — 如果失败，无头浏览器继续运行）
    let newBrowser: Browser;
    try {
      newBrowser = await chromium.launch({ headless: false, timeout: 15000 });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return `错误: 无法打开有头浏览器 — ${msg}。无头浏览器仍在运行。`;
    }

    // 3. 创建上下文并将状态恢复到新的有头浏览器
    try {
      const contextOptions: BrowserContextOptions = {
        viewport: { width: 1280, height: 720 },
      };
      if (this.customUserAgent) {
        contextOptions.userAgent = this.customUserAgent;
      }
      const newContext = await newBrowser.newContext(contextOptions);

      if (Object.keys(this.extraHeaders).length > 0) {
        await newContext.setExtraHTTPHeaders(this.extraHeaders);
      }

      // 在 restoreState 之前切换到新浏览器/上下文（它使用 this.context）
      const oldBrowser = this.browser;
      const oldContext = this.context;

      this.browser = newBrowser;
      this.context = newContext;
      this.pages.clear();

      // 在新浏览器上注册崩溃处理程序
      this.browser.on('disconnected', () => {
        console.error('[browse] 致命错误: Chromium 进程崩溃或被终止。服务器正在退出。');
        console.error('[browse] 控制台/网络日志已刷新到 .openclaw/browse-*.log');
        process.exit(1);
      });

      await this.restoreState(state);
      this.isHeaded = true;

      // 4. 关闭旧的无头浏览器（即发即忘 — 当另一个 Playwright 实例处于活动状态时，close() 可能会挂起，所以不等待）
      oldBrowser.removeAllListeners('disconnected');
      oldBrowser.close().catch(() => {});

      return [
        `HANDOFF: 浏览器已打开，位于 ${currentUrl}`,
        `消息: ${message}`,
        `状态: 等待用户。完成后运行 'resume'。`,
      ].join('\n');
    } catch (err: unknown) {
      // 恢复失败 — 关闭新浏览器，保留旧的
      await newBrowser.close().catch(() => {});
      const msg = err instanceof Error ? err.message : String(err);
      return `错误: 交接期间状态恢复失败 — ${msg}。无头浏览器仍在运行。`;
    }
  }

  /**
   * 用户交接后恢复 AI 控制。
   * 清除过期的引用并重置失败计数器。
   * 元命令处理程序在此之后调用 handleSnapshot()。
   */
  resume(): void {
    this.clearRefs();
    this.resetFailures();
  }

  getIsHeaded(): boolean {
    return this.isHeaded;
  }

  // ─── 自动交接提示（连续失败跟踪） ───────
  incrementFailures(): void {
    this.consecutiveFailures++;
  }

  resetFailures(): void {
    this.consecutiveFailures = 0;
  }

  getFailureHint(): string | null {
    if (this.consecutiveFailures >= 3 && !this.isHeaded) {
      return `提示: 已连续失败 ${this.consecutiveFailures} 次。考虑使用 'handoff' 让用户协助。`;
    }
    return null;
  }

  // ─── 控制台/网络/对话框/引用连接 ────────────────────
  private wirePageEvents(page: Page) {
    // 导航时清除引用映射 — 页面更改后引用指向过期的元素
    // （lastSnapshot 不会被清除 — 它是用于差异对比的文本基线）
    page.on('framenavigated', (frame) => {
      if (frame === page.mainFrame()) {
        this.clearRefs();
      }
    });

    // ─── 对话框自动处理（防止浏览器锁定） ─────
    page.on('dialog', async (dialog) => {
      const entry: DialogEntry = {
        timestamp: Date.now(),
        type: dialog.type(),
        message: dialog.message(),
        defaultValue: dialog.defaultValue() || undefined,
        action: this.dialogAutoAccept ? 'accepted' : 'dismissed',
        response: this.dialogAutoAccept ? (this.dialogPromptText ?? undefined) : undefined,
      };
      addDialogEntry(entry);

      try {
        if (this.dialogAutoAccept) {
          await dialog.accept(this.dialogPromptText ?? undefined);
        } else {
          await dialog.dismiss();
        }
      } catch {
        // 对话框可能已被导航关闭 — 忽略
      }
    });

    page.on('console', (msg) => {
      addConsoleEntry({
        timestamp: Date.now(),
        level: msg.type(),
        text: msg.text(),
      });
    });

    page.on('request', (req) => {
      addNetworkEntry({
        timestamp: Date.now(),
        method: req.method(),
        url: req.url(),
      });
    });

    page.on('response', (res) => {
      // 查找匹配的请求条目并更新它（向后扫描）
      const url = res.url();
      const status = res.status();
      for (let i = networkBuffer.length - 1; i >= 0; i--) {
        const entry = networkBuffer.get(i);
        if (entry && entry.url === url && !entry.status) {
          networkBuffer.set(i, { ...entry, status, duration: Date.now() - entry.timestamp });
          break;
        }
      }
    });

    // 通过响应完成捕获响应大小
    page.on('requestfinished', async (req) => {
      try {
        const res = await req.response();
        if (res) {
          const url = req.url();
          const body = await res.body().catch(() => null);
          const size = body ? body.length : 0;
          for (let i = networkBuffer.length - 1; i >= 0; i--) {
            const entry = networkBuffer.get(i);
            if (entry && entry.url === url && !entry.size) {
              networkBuffer.set(i, { ...entry, size });
              break;
            }
          }
        }
      } catch {}
    });
  }
}
