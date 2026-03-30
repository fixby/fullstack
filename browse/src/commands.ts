/**
 * 命令注册表 — 所有 browse 命令的唯一真实来源。
 *
 * 依赖关系图：
 *   commands.ts ──▶ server.ts (运行时分发)
 *                ──▶ gen-skill-docs.ts (文档生成)
 *                ──▶ skill-parser.ts (验证)
 *                ──▶ skill-check.ts (健康报告)
 *
 * 零副作用。可安全地从构建脚本和测试中导入。
 */

export const READ_COMMANDS = new Set([
  'text', 'html', 'links', 'forms', 'accessibility',
  'js', 'eval', 'css', 'attrs',
  'console', 'network', 'cookies', 'storage', 'perf',
  'dialog', 'is',
]);

export const WRITE_COMMANDS = new Set([
  'goto', 'back', 'forward', 'reload',
  'click', 'fill', 'select', 'hover', 'type', 'press', 'scroll', 'wait',
  'viewport', 'cookie', 'cookie-import', 'cookie-import-browser', 'header', 'useragent',
  'upload', 'dialog-accept', 'dialog-dismiss',
]);

export const META_COMMANDS = new Set([
  'tabs', 'tab', 'newtab', 'closetab',
  'status', 'stop', 'restart',
  'screenshot', 'pdf', 'responsive',
  'chain', 'diff',
  'url', 'snapshot',
  'handoff', 'resume',
]);

export const ALL_COMMANDS = new Set([...READ_COMMANDS, ...WRITE_COMMANDS, ...META_COMMANDS]);

export const COMMAND_DESCRIPTIONS: Record<string, { category: string; description: string; usage?: string }> = {
  // 导航
  'goto':    { category: 'Navigation', description: '导航到 URL', usage: 'goto <url>' },
  'back':    { category: 'Navigation', description: '历史记录后退' },
  'forward': { category: 'Navigation', description: '历史记录前进' },
  'reload':  { category: 'Navigation', description: '重新加载页面' },
  'url':     { category: 'Navigation', description: '打印当前 URL' },
  // 读取
  'text':    { category: 'Reading', description: '清理后的页面文本' },
  'html':    { category: 'Reading', description: '选择器的 innerHTML（未找到则抛出异常），无选择器时返回完整页面 HTML', usage: 'html [selector]' },
  'links':   { category: 'Reading', description: '所有链接，格式为 "文本 → href"' },
  'forms':   { category: 'Reading', description: '表单字段，JSON 格式' },
  'accessibility': { category: 'Reading', description: '完整 ARIA 树' },
  // 检查
  'js':      { category: 'Inspection', description: '执行 JavaScript 表达式并以字符串形式返回结果', usage: 'js <expr>' },
  'eval':    { category: 'Inspection', description: '从文件执行 JavaScript 并以字符串形式返回结果（路径必须在 /tmp 或 cwd 下）', usage: 'eval <file>' },
  'css':     { category: 'Inspection', description: '计算后的 CSS 值', usage: 'css <sel> <prop>' },
  'attrs':   { category: 'Inspection', description: '元素属性，JSON 格式', usage: 'attrs <sel|@ref>' },
  'is':      { category: 'Inspection', description: '状态检查 (visible/hidden/enabled/disabled/checked/editable/focused)', usage: 'is <prop> <sel>' },
  'console': { category: 'Inspection', description: '控制台消息（--errors 过滤错误/警告）', usage: 'console [--clear|--errors]' },
  'network': { category: 'Inspection', description: '网络请求', usage: 'network [--clear]' },
  'dialog':  { category: 'Inspection', description: '对话框消息', usage: 'dialog [--clear]' },
  'cookies': { category: 'Inspection', description: '所有 Cookie，JSON 格式' },
  'storage': { category: 'Inspection', description: '读取所有 localStorage + sessionStorage（JSON 格式），或使用 set <key> <value> 写入 localStorage', usage: 'storage [set k v]' },
  'perf':    { category: 'Inspection', description: '页面加载时间' },
  // 交互
  'click':   { category: 'Interaction', description: '点击元素', usage: 'click <sel>' },
  'fill':    { category: 'Interaction', description: '填充输入框', usage: 'fill <sel> <val>' },
  'select':  { category: 'Interaction', description: '通过值、标签或可见文本选择下拉选项', usage: 'select <sel> <val>' },
  'hover':   { category: 'Interaction', description: '悬停元素', usage: 'hover <sel>' },
  'type':    { category: 'Interaction', description: '在聚焦元素中输入文本', usage: 'type <text>' },
  'press':   { category: 'Interaction', description: '按键 — Enter, Tab, Escape, ArrowUp/Down/Left/Right, Backspace, Delete, Home, End, PageUp, PageDown，或修饰键如 Shift+Enter', usage: 'press <key>' },
  'scroll':  { category: 'Interaction', description: '滚动元素到可见区域，无选择器时滚动到页面底部', usage: 'scroll [sel]' },
  'wait':    { category: 'Interaction', description: '等待元素、网络空闲或页面加载（超时：15秒）', usage: 'wait <sel|--networkidle|--load>' },
  'upload':  { category: 'Interaction', description: '上传文件', usage: 'upload <sel> <file> [file2...]' },
  'viewport':{ category: 'Interaction', description: '设置视口大小', usage: 'viewport <WxH>' },
  'cookie':  { category: 'Interaction', description: '在当前页面域名上设置 Cookie', usage: 'cookie <name>=<value>' },
  'cookie-import': { category: 'Interaction', description: '从 JSON 文件导入 Cookie', usage: 'cookie-import <json>' },
  'cookie-import-browser': { category: 'Interaction', description: '从 Comet、Chrome、Arc、Brave 或 Edge 导入 Cookie（打开选择器，或使用 --domain 直接导入）', usage: 'cookie-import-browser [browser] [--domain d]' },
  'header':  { category: 'Interaction', description: '设置自定义请求头（冒号分隔，敏感值自动脱敏）', usage: 'header <name>:<value>' },
  'useragent': { category: 'Interaction', description: '设置用户代理', usage: 'useragent <string>' },
  'dialog-accept': { category: 'Interaction', description: '自动接受下一个 alert/confirm/prompt。可选文本作为 prompt 响应发送', usage: 'dialog-accept [text]' },
  'dialog-dismiss': { category: 'Interaction', description: '自动关闭下一个对话框' },
  // 可视化
  'screenshot': { category: 'Visual', description: '保存截图（支持通过 CSS/@ref 裁剪元素，--clip 区域，--viewport）', usage: 'screenshot [--viewport] [--clip x,y,w,h] [selector|@ref] [path]' },
  'pdf':     { category: 'Visual', description: '保存为 PDF', usage: 'pdf [path]' },
  'responsive': { category: 'Visual', description: '移动端 (375x812)、平板 (768x1024)、桌面端 (1280x720) 截图。保存为 {prefix}-mobile.png 等', usage: 'responsive [prefix]' },
  'diff':    { category: 'Visual', description: '页面间文本差异', usage: 'diff <url1> <url2>' },
  // 标签页
  'tabs':    { category: 'Tabs', description: '列出打开的标签页' },
  'tab':     { category: 'Tabs', description: '切换到标签页', usage: 'tab <id>' },
  'newtab':  { category: 'Tabs', description: '打开新标签页', usage: 'newtab [url]' },
  'closetab':{ category: 'Tabs', description: '关闭标签页', usage: 'closetab [id]' },
  // 服务器
  'status':  { category: 'Server', description: '健康检查' },
  'stop':    { category: 'Server', description: '关闭服务器' },
  'restart': { category: 'Server', description: '重启服务器' },
  // 元命令
  'snapshot':{ category: 'Snapshot', description: '带 @e 引用的无障碍树，用于元素选择。标志：-i 仅交互元素，-c 紧凑模式，-d N 深度限制，-s sel 范围，-D 与上次对比，-a 带标注截图，-o path 输出路径，-C cursor-interactive @c 引用', usage: 'snapshot [flags]' },
  'chain':   { category: 'Meta', description: '从 JSON stdin 运行命令。格式：[["cmd","arg1",...],...]' },
  // 交接
  'handoff': { category: 'Server', description: '在当前页面打开可见的 Chrome 供用户接管', usage: 'handoff [message]' },
  'resume':  { category: 'Server', description: '用户接管后重新快照，将控制权交还给 AI', usage: 'resume' },
};

// 加载时验证：描述必须完全覆盖命令集合
const allCmds = new Set([...READ_COMMANDS, ...WRITE_COMMANDS, ...META_COMMANDS]);
const descKeys = new Set(Object.keys(COMMAND_DESCRIPTIONS));
for (const cmd of allCmds) {
  if (!descKeys.has(cmd)) throw new Error(`COMMAND_DESCRIPTIONS 缺少条目: ${cmd}`);
}
for (const key of descKeys) {
  if (!allCmds.has(key)) throw new Error(`COMMAND_DESCRIPTIONS 包含未知命令: ${key}`);
}
