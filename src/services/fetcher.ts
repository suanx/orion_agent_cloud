/**
 * 网页抓取代理 + SSRF 防护(响应体 2MB 上限, 拦内网/环回地址)。
 * 注意: 边缘函数无法真实解析 DNS, 这里按主机名模式拦截 + 依赖边缘出口在公网的特性。
 */

const MAX_BODY_BYTES = 2 * 1024 * 1024;
const MAX_TEXT_CHARS = 8000;

const BLOCKED_HOSTNAME_RE =
  /^(localhost|.*\.local|.*\.internal|metadata\.google\.internal|169\.254\..*|127\.\d+\.\d+\.\d+|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+|\[?::1\]?)$/i;

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

export async function fetchPage(rawUrl: string): Promise<FetchPageResult> {
  const url = validateTargetUrl(rawUrl);
  const resp = await fetch(url, {
    headers: {
      "user-agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      accept: "text/html,application/xhtml+xml,text/plain,application/json;q=0.9,*/*;q=0.5",
    },
    redirect: "follow",
  });
  if (!resp.ok) throw new Error(`目标站点返回 HTTP ${resp.status}`);

  const contentType = resp.headers.get("content-type") ?? "";
  const buf = await resp.arrayBuffer();
  if (buf.byteLength > MAX_BODY_BYTES) throw new Error("响应体超过 2MB 上限");
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
