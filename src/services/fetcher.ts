/**
 * 网页抓取代理 + SSRF 防护(响应体 2MB 上限, 拦内网/环回地址)。
 * 注意: 边缘函数无法真实解析 DNS, 这里按主机名模式拦截 + 依赖边缘出口在公网的特性。
 */

const MAX_BODY_BYTES = 2 * 1024 * 1024;
const MAX_TEXT_CHARS = 8000;
const MAX_REDIRECTS = 3;

// 2026-10-11 修复（P1 SSRF）：黑名单补齐 0.0.0.0/8、链路本地 100.64/10、
// IPv4-mapped IPv6（::ffff:127.0.0.1 等）、全零/全段缩写、十进制/十六进制
// 整数 IP（http://2130706433/ → 127.0.0.1）。注：DNS rebinding 仍依赖
// 「边缘出口在公网」这一特性兜底（无法在边缘做真实 DNS 解析）。
const BLOCKED_HOSTNAME_RE =
  /^(localhost|.*\.local|.*\.internal|metadata\.google\.internal|169\.254\..*|127\.\d+\.\d+\.\d+|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+|0\.0\.0\.0|100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.\d+\.\d+|\[?::1\]?|\[?::\]?|::ffff:127\.\d+\.\d+\.\d+|::ffff:10\.\d+\.\d+\.\d+|::ffff:192\.168\.\d+\.\d+|::ffff:172\.(1[6-9]|2\d|3[01])\.\d+\.\d+|::ffff:169\.254\.\d+\.\d+|0x[0-9a-f]+|\d{8,})$/i;

export function isBlockedHost(hostname: string): boolean {
  return BLOCKED_HOSTNAME_RE.test(hostname);
}

export function validateTargetUrl(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("URL 格式不正确");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("仅支持 http/https");
  }
  if (isBlockedHost(url.hostname)) {
    throw new Error("不允许访问内网/环回地址");
  }
  return url;
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<\/(p|div|li|h[1-6]|tr|br)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n\s*\n+/g, "\n\n")
    .trim();
}

export interface FetchPageResult {
  url: string;
  title: string;
  content: string;
  truncated: boolean;
}

/** 流式读取响应体，超过 [maxBytes] 立即中止并抛错（防内存 DoS）。 */
async function readWithLimit(resp: Response, maxBytes: number): Promise<ArrayBuffer> {
  const lenHeader = Number(resp.headers.get("content-length") ?? 0);
  if (lenHeader > maxBytes) throw new Error("响应体超过 2MB 上限");
  if (!resp.body) return new ArrayBuffer(0);
  const reader = resp.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      try { await reader.cancel(); } catch { /* 忽略 */ }
      throw new Error("响应体超过 2MB 上限");
    }
    chunks.push(value);
  }
  const out = new Uint8Array(total);
  let off = 0;
  for (const c of chunks) {
    out.set(c, off);
    off += c.byteLength;
  }
  return out.buffer;
}

export async function fetchPage(rawUrl: string): Promise<FetchPageResult> {
  // 逐跳手动跟随重定向（2026-10-11 修复 P1 SSRF）：redirect:"follow" 时
  // 公网站点 302 → http://127.0.0.1 即可穿透内网拦截（follow 过程不复验）。
  // 改为 redirect:"manual"，每一跳都重新过 validateTargetUrl。
  let url = validateTargetUrl(rawUrl);
  let resp: Response;
  for (let hop = 0; ; hop++) {
    if (hop > MAX_REDIRECTS) throw new Error("重定向次数超过上限");
    resp = await fetch(url, {
      headers: {
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        accept: "text/html,application/xhtml+xml,text/plain,application/json;q=0.9,*/*;q=0.5",
      },
      redirect: "manual",
      signal: AbortSignal.timeout(30_000),
    });
    if (resp.status >= 300 && resp.status < 400) {
      const loc = resp.headers.get("location");
      if (!loc) break; // 无 Location 的 3xx 按终态处理
      url = validateTargetUrl(new URL(loc, url).toString());
      continue;
    }
    break;
  }
  if (!resp.ok) throw new Error(`目标站点返回 HTTP ${resp.status}`);

  const contentType = resp.headers.get("content-type") ?? "";
  // 流式限长读取（2026-10-11 修复 P1）：旧实现 arrayBuffer() 全量缓冲后
  // 才查大小——恶意不限长响应可撑爆边缘函数内存。现在逐块读到 2MB 即止。
  let buf: ArrayBuffer;
  try {
    buf = await readWithLimit(resp, MAX_BODY_BYTES);
  } finally {
    // 尽早释放连接：超限中断后剩余体不再读。
    try { resp.body?.cancel(); } catch { /* 已结束则忽略 */ }
  }
  const text = new TextDecoder().decode(buf);

  if (contentType.includes("application/json")) {
    const body = text.length > MAX_TEXT_CHARS ? text.slice(0, MAX_TEXT_CHARS) : text;
    return { url: resp.url || url.toString(), title: url.hostname, content: body, truncated: text.length > MAX_TEXT_CHARS };
  }
  if (contentType.includes("text/plain")) {
    const body = text.length > MAX_TEXT_CHARS ? text.slice(0, MAX_TEXT_CHARS) : text;
    return { url: resp.url || url.toString(), title: url.hostname, content: body, truncated: text.length > MAX_TEXT_CHARS };
  }

  const titleMatch = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(text);
  const content = stripHtml(text);
  const body = content.length > MAX_TEXT_CHARS ? content.slice(0, MAX_TEXT_CHARS) : content;
  return {
    url: resp.url || url.toString(),
    title: titleMatch ? titleMatch[1].trim() : url.hostname,
    content: body,
    truncated: content.length > MAX_TEXT_CHARS,
  };
}
