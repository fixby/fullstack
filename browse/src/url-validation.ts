/**
 * 导航命令的 URL 验证 — 阻止危险协议和云元数据端点。
 * 允许 localhost 和私有 IP（主要用例：QA 测试本地开发服务器）。
 */

const BLOCKED_METADATA_HOSTS = new Set([
  '169.254.169.254',  // AWS/GCP/Azure 实例元数据
  'fd00::',           // IPv6 唯一本地地址（某些云设置中的元数据）
  'metadata.google.internal', // GCP 元数据
  'metadata.azure.internal',  // Azure IMDS
]);

/**
 * 规范化主机名以进行阻止列表比较：
 * - 去除尾部点（DNS 完全限定表示法）
 * - 去除 IPv6 括号（URL.hostname 对 IPv6 包含 []）
 * - 解析十六进制 (0xA9FEA9FE) 和十进制 (2852039166) IP 表示
 */
function normalizeHostname(hostname: string): string {
  // 去除 IPv6 括号
  let h = hostname.startsWith('[') && hostname.endsWith(']')
    ? hostname.slice(1, -1)
    : hostname;
  // 去除尾部点
  if (h.endsWith('.')) h = h.slice(0, -1);
  return h;
}

/**
 * 检查主机名是否解析为链路本地元数据 IP 169.254.169.254。
 * 捕获十六进制 (0xA9FEA9FE)、十进制 (2852039166) 和八进制 (0251.0376.0251.0376) 形式。
 */
function isMetadataIp(hostname: string): boolean {
  // 尝试通过 URL 构造函数解析为数字 IP — 它会规范化所有形式
  try {
    const probe = new URL(`http://${hostname}`);
    const normalized = probe.hostname;
    if (BLOCKED_METADATA_HOSTS.has(normalized)) return true;
    // 也检查去除尾部点后
    if (normalized.endsWith('.') && BLOCKED_METADATA_HOSTS.has(normalized.slice(0, -1))) return true;
  } catch {
    // 不是有效的主机名 — 不可能是元数据 IP
  }
  return false;
}

/**
 * 将主机名解析为其 IP 地址，并检查是否有任何解析为被阻止的元数据 IP。
 * 缓解 DNS 重绑定：即使主机名看起来安全，解析的 IP 可能不安全。
 */
async function resolvesToBlockedIp(hostname: string): Promise<boolean> {
  try {
    const dns = await import('node:dns');
    const { resolve4 } = dns.promises;
    const addresses = await resolve4(hostname);
    return addresses.some(addr => BLOCKED_METADATA_HOSTS.has(addr));
  } catch {
    // DNS 解析失败 — 不是重绑定风险
    return false;
  }
}

export async function validateNavigationUrl(url: string): Promise<void> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`无效的 URL: ${url}`);
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(
      `已阻止: 协议 "${parsed.protocol}" 不被允许。只允许 http: 和 https: URL。`
    );
  }

  const hostname = normalizeHostname(parsed.hostname.toLowerCase());

  if (BLOCKED_METADATA_HOSTS.has(hostname) || isMetadataIp(hostname)) {
    throw new Error(
      `已阻止: ${parsed.hostname} 是云元数据端点。出于安全原因拒绝访问。`
    );
  }

  // DNS 重绑定保护：解析主机名并检查它是否指向元数据 IP
  if (await resolvesToBlockedIp(hostname)) {
    throw new Error(
      `已阻止: ${parsed.hostname} 解析为云元数据 IP。可能是 DNS 重绑定攻击。`
    );
  }
}
