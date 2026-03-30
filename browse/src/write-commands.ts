/**
 * 写入命令 — 导航和与页面交互（有副作用）
 *
 * goto, back, forward, reload, click, fill, select, hover, type,
 * press, scroll, wait, viewport, cookie, header, useragent
 */

import type { BrowserManager } from './browser-manager';
import { findInstalledBrowsers, importCookies } from './cookie-import-browser';
import { validateNavigationUrl } from './url-validation';
import * as fs from 'fs';
import * as path from 'path';
import { TEMP_DIR, isPathWithin } from './platform';

export async function handleWriteCommand(
  command: string,
  args: string[],
  bm: BrowserManager
): Promise<string> {
  const page = bm.getPage();

  switch (command) {
    case 'goto': {
      const url = args[0];
      if (!url) throw new Error('用法: browse goto <url>');
      await validateNavigationUrl(url);
      const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
      const status = response?.status() || 'unknown';
      return `已导航到 ${url} (${status})`;
    }

    case 'back': {
      await page.goBack({ waitUntil: 'domcontentloaded', timeout: 15000 });
      return `后退 → ${page.url()}`;
    }

    case 'forward': {
      await page.goForward({ waitUntil: 'domcontentloaded', timeout: 15000 });
      return `前进 → ${page.url()}`;
    }

    case 'reload': {
      await page.reload({ waitUntil: 'domcontentloaded', timeout: 15000 });
      return `已重新加载 ${page.url()}`;
    }

    case 'click': {
      const selector = args[0];
      if (!selector) throw new Error('用法: browse click <选择器>');

      // 自动路由：如果引用指向 <select> 内的真实 <option>，使用 selectOption
      const role = bm.getRefRole(selector);
      if (role === 'option') {
        const resolved = await bm.resolveRef(selector);
        if ('locator' in resolved) {
          const optionInfo = await resolved.locator.evaluate(el => {
            if (el.tagName !== 'OPTION') return null; // 自定义 [role=option]，不是真实 <option>
            const option = el as HTMLOptionElement;
            const select = option.closest('select');
            if (!select) return null;
            return { value: option.value, text: option.text };
          });
          if (optionInfo) {
            await resolved.locator.locator('xpath=ancestor::select').selectOption(optionInfo.value, { timeout: 5000 });
            return `已选择 "${optionInfo.text}"（从点击 <option> 自动路由） → 现在位于 ${page.url()}`;
          }
          // 没有父 <select> 的真实 <option> 或自定义 [role=option] — 继续正常点击
        }
      }

      const resolved = await bm.resolveRef(selector);
      try {
        if ('locator' in resolved) {
          await resolved.locator.click({ timeout: 5000 });
        } else {
          await page.click(resolved.selector, { timeout: 5000 });
        }
      } catch (err: any) {
        // 增强的错误指导：点击 <option> 元素总是失败（不可见 / 超时）
        const isOption = 'locator' in resolved
          ? await resolved.locator.evaluate(el => el.tagName === 'OPTION').catch(() => false)
          : await page.evaluate(
              (sel: string) => document.querySelector(sel)?.tagName === 'OPTION',
              (resolved as { selector: string }).selector
            ).catch(() => false);
        if (isOption) {
          throw new Error(
            `无法点击 <option> 元素。对于下拉选项，请使用 'browse select <父级-select> <值>' 而不是 'click'。`
          );
        }
        throw err;
      }
      // 简短等待任何导航/DOM 更新
      await page.waitForLoadState('domcontentloaded').catch(() => {});
      return `已点击 ${selector} → 现在位于 ${page.url()}`;
    }

    case 'fill': {
      const [selector, ...valueParts] = args;
      const value = valueParts.join(' ');
      if (!selector || !value) throw new Error('用法: browse fill <选择器> <值>');
      const resolved = await bm.resolveRef(selector);
      if ('locator' in resolved) {
        await resolved.locator.fill(value, { timeout: 5000 });
      } else {
        await page.fill(resolved.selector, value, { timeout: 5000 });
      }
      return `已填充 ${selector}`;
    }

    case 'select': {
      const [selector, ...valueParts] = args;
      const value = valueParts.join(' ');
      if (!selector || !value) throw new Error('用法: browse select <选择器> <值>');
      const resolved = await bm.resolveRef(selector);
      if ('locator' in resolved) {
        await resolved.locator.selectOption(value, { timeout: 5000 });
      } else {
        await page.selectOption(resolved.selector, value, { timeout: 5000 });
      }
      return `已在 ${selector} 中选择 "${value}"`;
    }

    case 'hover': {
      const selector = args[0];
      if (!selector) throw new Error('用法: browse hover <选择器>');
      const resolved = await bm.resolveRef(selector);
      if ('locator' in resolved) {
        await resolved.locator.hover({ timeout: 5000 });
      } else {
        await page.hover(resolved.selector, { timeout: 5000 });
      }
      return `已悬停 ${selector}`;
    }

    case 'type': {
      const text = args.join(' ');
      if (!text) throw new Error('用法: browse type <文本>');
      await page.keyboard.type(text);
      return `已输入 ${text.length} 个字符`;
    }

    case 'press': {
      const key = args[0];
      if (!key) throw new Error('用法: browse press <键> (例如, Enter, Tab, Escape)');
      await page.keyboard.press(key);
      return `已按下 ${key}`;
    }

    case 'scroll': {
      const selector = args[0];
      if (selector) {
        const resolved = await bm.resolveRef(selector);
        if ('locator' in resolved) {
          await resolved.locator.scrollIntoViewIfNeeded({ timeout: 5000 });
        } else {
          await page.locator(resolved.selector).scrollIntoViewIfNeeded({ timeout: 5000 });
        }
        return `已将 ${selector} 滚动到视图`;
      }
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      return '已滚动到底部';
    }

    case 'wait': {
      const selector = args[0];
      if (!selector) throw new Error('用法: browse wait <选择器|--networkidle|--load|--domcontentloaded>');
      if (selector === '--networkidle') {
        const timeout = args[1] ? parseInt(args[1], 10) : 15000;
        await page.waitForLoadState('networkidle', { timeout });
        return '网络空闲';
      }
      if (selector === '--load') {
        await page.waitForLoadState('load');
        return '页面已加载';
      }
      if (selector === '--domcontentloaded') {
        await page.waitForLoadState('domcontentloaded');
        return 'DOM 内容已加载';
      }
      const timeout = args[1] ? parseInt(args[1], 10) : 15000;
      const resolved = await bm.resolveRef(selector);
      if ('locator' in resolved) {
        await resolved.locator.waitFor({ state: 'visible', timeout });
      } else {
        await page.waitForSelector(resolved.selector, { timeout });
      }
      return `元素 ${selector} 已出现`;
    }

    case 'viewport': {
      const size = args[0];
      if (!size || !size.includes('x')) throw new Error('用法: browse viewport <宽x高> (例如, 375x812)');
      const [w, h] = size.split('x').map(Number);
      await bm.setViewport(w, h);
      return `视口已设置为 ${w}x${h}`;
    }

    case 'cookie': {
      const cookieStr = args[0];
      if (!cookieStr || !cookieStr.includes('=')) throw new Error('用法: browse cookie <名称>=<值>');
      const eq = cookieStr.indexOf('=');
      const name = cookieStr.slice(0, eq);
      const value = cookieStr.slice(eq + 1);
      const url = new URL(page.url());
      await page.context().addCookies([{
        name,
        value,
        domain: url.hostname,
        path: '/',
      }]);
      return `Cookie 已设置: ${name}=****`;
    }

    case 'header': {
      const headerStr = args[0];
      if (!headerStr || !headerStr.includes(':')) throw new Error('用法: browse header <名称>:<值>');
      const sep = headerStr.indexOf(':');
      const name = headerStr.slice(0, sep).trim();
      const value = headerStr.slice(sep + 1).trim();
      await bm.setExtraHeader(name, value);
      const sensitiveHeaders = ['authorization', 'cookie', 'set-cookie', 'x-api-key', 'x-auth-token'];
      const redactedValue = sensitiveHeaders.includes(name.toLowerCase()) ? '****' : value;
      return `Header 已设置: ${name}: ${redactedValue}`;
    }

    case 'useragent': {
      const ua = args.join(' ');
      if (!ua) throw new Error('用法: browse useragent <字符串>');
      bm.setUserAgent(ua);
      const error = await bm.recreateContext();
      if (error) {
        return `用户代理已设置为 "${ua}" 但: ${error}`;
      }
      return `用户代理已设置: ${ua}`;
    }

    case 'upload': {
      const [selector, ...filePaths] = args;
      if (!selector || filePaths.length === 0) throw new Error('用法: browse upload <选择器> <文件1> [文件2...]');

      // 上传前验证所有文件是否存在
      for (const fp of filePaths) {
        if (!fs.existsSync(fp)) throw new Error(`文件未找到: ${fp}`);
      }

      const resolved = await bm.resolveRef(selector);
      if ('locator' in resolved) {
        await resolved.locator.setInputFiles(filePaths);
      } else {
        await page.locator(resolved.selector).setInputFiles(filePaths);
      }

      const fileInfo = filePaths.map(fp => {
        const stat = fs.statSync(fp);
        return `${path.basename(fp)} (${stat.size}B)`;
      }).join(', ');
      return `已上传: ${fileInfo}`;
    }

    case 'dialog-accept': {
      const text = args.length > 0 ? args.join(' ') : null;
      bm.setDialogAutoAccept(true);
      bm.setDialogPromptText(text);
      return text
        ? `对话框将被接受并输入文本: "${text}"`
        : '对话框将被接受';
    }

    case 'dialog-dismiss': {
      bm.setDialogAutoAccept(false);
      bm.setDialogPromptText(null);
      return '对话框将被关闭';
    }

    case 'cookie-import': {
      const filePath = args[0];
      if (!filePath) throw new Error('用法: browse cookie-import <json文件>');
      // 路径验证 — 防止读取任意文件
      if (path.isAbsolute(filePath)) {
        const safeDirs = [TEMP_DIR, process.cwd()];
        const resolved = path.resolve(filePath);
        if (!safeDirs.some(dir => isPathWithin(resolved, dir))) {
          throw new Error(`路径必须在以下目录内: ${safeDirs.join(', ')}`);
        }
      }
      if (path.normalize(filePath).includes('..')) {
        throw new Error('不允许使用路径遍历序列 (..)');
      }
      if (!fs.existsSync(filePath)) throw new Error(`文件未找到: ${filePath}`);
      const raw = fs.readFileSync(filePath, 'utf-8');
      let cookies: any[];
      try { cookies = JSON.parse(raw); } catch { throw new Error(`${filePath} 中的 JSON 无效`); }
      if (!Array.isArray(cookies)) throw new Error('Cookie 文件必须包含 JSON 数组');

      // 当缺失时从当前页面 URL 自动填充域（与 cookie 命令一致）
      const pageUrl = new URL(page.url());
      const defaultDomain = pageUrl.hostname;

      for (const c of cookies) {
        if (!c.name || c.value === undefined) throw new Error('每个 cookie 必须有 "name" 和 "value" 字段');
        if (!c.domain) c.domain = defaultDomain;
        if (!c.path) c.path = '/';
      }

      await page.context().addCookies(cookies);
      return `已从 ${filePath} 加载 ${cookies.length} 个 cookies`;
    }

    case 'cookie-import-browser': {
      // 两种模式：
      // 1. 直接 CLI 导入: cookie-import-browser <浏览器> --domain <域>
      // 2. 打开选择器 UI: cookie-import-browser [浏览器]
      const browserArg = args[0];
      const domainIdx = args.indexOf('--domain');

      if (domainIdx !== -1 && domainIdx + 1 < args.length) {
        // 直接导入模式 — 无 UI
        const domain = args[domainIdx + 1];
        const browser = browserArg || 'comet';
        const result = await importCookies(browser, [domain]);
        if (result.cookies.length > 0) {
          await page.context().addCookies(result.cookies);
        }
        const msg = [`已从 ${browser} 为 ${domain} 导入 ${result.count} 个 cookies`];
        if (result.failed > 0) msg.push(`(${result.failed} 个解密失败)`);
        return msg.join(' ');
      }

      // 选择器 UI 模式 — 在用户浏览器中打开
      const port = bm.serverPort;
      if (!port) throw new Error('服务器端口不可用');

      const browsers = findInstalledBrowsers();
      if (browsers.length === 0) {
        throw new Error('未找到 Chromium 浏览器。支持: Comet, Chrome, Arc, Brave, Edge');
      }

      const pickerUrl = `http://127.0.0.1:${port}/cookie-picker`;
      try {
        Bun.spawn(['open', pickerUrl], { stdout: 'ignore', stderr: 'ignore' });
      } catch {
        // open 可能会静默失败 — URL 在下面的消息中
      }

      return `Cookie 选择器已在 ${pickerUrl} 打开\n检测到的浏览器: ${browsers.map(b => b.name).join(', ')}\n选择要导入的域，完成后关闭选择器。`;
    }

    default:
      throw new Error(`未知写入命令: ${command}`);
  }
}
