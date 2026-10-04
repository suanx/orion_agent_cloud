/**
 * 搜索中继: DuckDuckGo HTML (免 Key) / Serper / 博查。
 * DDG 解析采用「按出现位置配对」——标题与摘要按下标或贪心配对都会错位
 * (orion_agent tools.dart 的同款教训), 截到下一条标题为止。
 */

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function stripTags(s: string): string {
  return decodeEntities(s.replace(/<[^>]*>/g, "")).replace(/\s+/g, " ").trim();
}

/** 提取 DDG 重定向链接里的真实 URL (//duckduckgo.com/l/?uddg=<encoded>&...) */
function extractDdgUrl(href: string): string {
  const m = /[?&]uddg=([^&]+)/.exec(href);
  if (m) {
    try {
      return decodeURIComponent(m[1]);
    } catch {
      return href;
    }
  }
  if (href.startsWith("//")) return `https:${href}`;
  return href;
}

export function parseDuckDuckGoHtml(html: string, maxResults = 8): SearchResult[] {
  const titleRe = /<a[^>]+class="[^"]*result__a[^"]*"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g;
  const snippetRe = /<a[^>]+class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/a>/g;

  // 记录每个标题/摘要在原文中的出现位置, 摘要只归属「位于本标题与下一条标题之间」的
  // ——按下标配对会在某条缺摘要时整体错位(orion_agent tools.dart 同款教训)
  const titles: { pos: number; url: string; title: string }[] = [];
  let m: RegExpExecArray | null;
  while ((m = titleRe.exec(html)) !== null) {
    titles.push({ pos: m.index, url: extractDdgUrl(m[1]), title: stripTags(m[2]) });
  }

  const snippets: { pos: number; text: string }[] = [];
  while ((m = snippetRe.exec(html)) !== null) {
    snippets.push({ pos: m.index, text: stripTags(m[1]) });
  }

  const results: SearchResult[] = [];
  for (let i = 0; i < titles.length && results.length < maxResults; i++) {
    if (!titles[i].title) continue;
    const upper = i + 1 < titles.length ? titles[i + 1].pos : Infinity;
    const own = snippets.find((s) => s.pos > titles[i].pos && s.pos < upper);
    results.push({ title: titles[i].title, url: titles[i].url, snippet: own ? own.text : "" });
  }
  return results;
}

export interface SearchBackend {
  name: string;
  search(query: string, maxResults: number): Promise<SearchResult[]>;
}

export const duckDuckGoBackend: SearchBackend = {
  name: "duckduckgo",
  async search(query, maxResults) {
    const resp = await fetch("https://html.duckduckgo.com/html/", {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      },
      body: new URLSearchParams({ q: query }).toString(),
    });
    if (!resp.ok) throw new Error(`DuckDuckGo HTTP ${resp.status}`);
    return parseDuckDuckGoHtml(await resp.text(), maxResults);
  },
};

export function serperBackend(apiKey: string): SearchBackend {
  return {
    name: "serper",
    async search(query, maxResults) {
      const resp = await fetch("https://google.serper.dev/search", {
        method: "POST",
        headers: { "X-API-KEY": apiKey, "content-type": "application/json" },
        body: JSON.stringify({ q: query, num: maxResults }),
      });
      if (!resp.ok) throw new Error(`Serper HTTP ${resp.status}`);
      const data = (await resp.json()) as { organic?: { title: string; link: string; snippet?: string }[] };
      return (data.organic ?? []).slice(0, maxResults).map((o) => ({
        title: o.title,
        url: o.link,
        snippet: o.snippet ?? "",
      }));
    },
  };
}

export function bochaBackend(apiKey: string): SearchBackend {
  return {
    name: "bocha",
    async search(query, maxResults) {
      const resp = await fetch("https://api.bochaai.com/v1/web-search", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
        body: JSON.stringify({ query, count: maxResults, summary: true }),
      });
      if (!resp.ok) throw new Error(`博查 HTTP ${resp.status}`);
      const data = (await resp.json()) as {
        data?: { webPages?: { value?: { name: string; url: string; summary?: string; snippet?: string }[] } };
      };
      return (data.data?.webPages?.value ?? []).slice(0, maxResults).map((o) => ({
        title: o.name,
        url: o.url,
        snippet: o.summary ?? o.snippet ?? "",
      }));
    },
  };
}

export function pickBackend(env: { SEARCH_PROVIDER?: string; SERPER_API_KEY?: string; BOCHA_API_KEY?: string }): SearchBackend {
  switch (env.SEARCH_PROVIDER) {
    case "serper":
      if (!env.SERPER_API_KEY) throw new Error("SERPER_API_KEY 未配置");
      return serperBackend(env.SERPER_API_KEY);
    case "bocha":
      if (!env.BOCHA_API_KEY) throw new Error("BOCHA_API_KEY 未配置");
      return bochaBackend(env.BOCHA_API_KEY);
    default:
      return duckDuckGoBackend;
  }
}

export function formatResults(results: SearchResult[]): string {
  if (results.length === 0) return "未找到相关结果。";
  return results
    .map((r, i) => `${i + 1}. ${r.title}\n   ${r.url}${r.snippet ? `\n   ${r.snippet}` : ""}`)
    .join("\n\n");
}
