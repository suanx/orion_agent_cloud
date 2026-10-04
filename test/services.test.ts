import { describe, it, expect } from "vitest";
import { parseDuckDuckGoHtml, formatResults } from "../src/services/search";
import { isBlockedHost, validateTargetUrl } from "../src/services/fetcher";
import { quotaDate, nextDailyRun, limitFor } from "../src/plans";
import { isNewer } from "../src/routes/update";

// 基于真实 DuckDuckGo html 端点结构的最小样本:
// 注意第 2 条结果【没有摘要】, 验证「按位置配对、不向后贪心」
const DDG_HTML = `
<div class="result">
  <a class="result__a" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fexample.com%2F1&amp;rut=abc">第一 <b>条</b>标题</a>
  <a class="result__snippet" href="#">第一条摘要内容</a>
</div>
<div class="result">
  <a class="result__a" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fexample.com%2F2&amp;rut=def">第二条标题</a>
</div>
<div class="result">
  <a class="result__a" href="https://direct.example.com/3">第三条标题</a>
  <a class="result__snippet" href="#">第三条摘要</a>
</div>
`;

describe("DuckDuckGo HTML 解析", () => {
  it("解析出全部结果并按位置配对摘要", () => {
    const results = parseDuckDuckGoHtml(DDG_HTML);
    expect(results).toHaveLength(3);
    expect(results[0].title).toBe("第一 条标题");
    expect(results[0].url).toBe("https://example.com/1");
    expect(results[0].snippet).toBe("第一条摘要内容");
    // 第二条无摘要: 必须为空串, 不能贪心吃到第三条的摘要
    expect(results[1].snippet).toBe("");
    expect(results[2].snippet).toBe("第三条摘要");
  });

  it("uddg 重定向参数解出真实 URL", () => {
    const results = parseDuckDuckGoHtml(DDG_HTML);
    expect(results[1].url).toBe("https://example.com/2");
  });

  it("无结果返回空数组", () => {
    expect(parseDuckDuckGoHtml("<html></html>")).toEqual([]);
  });

  it("formatResults 空结果提示", () => {
    expect(formatResults([])).toContain("未找到");
    expect(formatResults([{ title: "t", url: "u", snippet: "s" }])).toContain("1. t");
  });
});

describe("SSRF 防护", () => {
  it("内网/环回/元数据地址全部拦截", () => {
    for (const host of [
      "localhost",
      "127.0.0.1",
      "10.0.0.5",
      "192.168.1.1",
      "172.16.0.1",
      "172.31.255.1",
      "169.254.169.254",
      "metadata.google.internal",
      "my-service.internal",
      "::1",
    ]) {
      expect(isBlockedHost(host), `${host} 应被拦截`).toBe(true);
    }
    expect(isBlockedHost("example.com")).toBe(false);
    expect(isBlockedHost("172.32.0.1")).toBe(false); // 不在 172.16-31 段
  });

  it("非 http/https 拒绝", () => {
    expect(() => validateTargetUrl("file:///etc/passwd")).toThrow();
    expect(() => validateTargetUrl("ftp://example.com")).toThrow();
    expect(() => validateTargetUrl("not a url")).toThrow();
  });

  it("合法公网 URL 通过并保留路径", () => {
    const u = validateTargetUrl("https://example.com/a/b?q=1");
    expect(u.hostname).toBe("example.com");
    expect(u.pathname).toBe("/a/b");
  });
});

describe("配额日期与调度", () => {
  it("quotaDate 按 UTC+8 归日", () => {
    // 2026-10-04 16:00 UTC = UTC+8 10-05 00:00
    const r = quotaDate(new Date("2026-10-04T16:00:00Z"));
    expect(r).toBe("2026-10-05");
    expect(quotaDate(new Date("2026-10-04T15:59:00Z"))).toBe("2026-10-04");
  });

  it("nextDailyRun: 未到点返回今天, 已过返回明天", () => {
    const at7 = new Date("2026-10-04T23:00:00Z"); // UTC+8 10-05 07:00
    expect(nextDailyRun(8, 0, at7)).toBe(new Date("2026-10-04T24:00:00Z").getTime());
    const at9 = new Date("2026-10-05T01:00:00Z"); // UTC+8 09:00, 已过 08:00
    const next = nextDailyRun(8, 0, at9)!;
    expect(next).toBeGreaterThan(at9.getTime());
    expect(next - at9.getTime()).toBeLessThanOrEqual(24 * 3600 * 1000);
  });

  it("limitFor: 计划内功能取值, 计划外为 0", () => {
    expect(limitFor("free", "relay_search", null)).toBe(20);
    expect(limitFor("pro", "max_tasks", null)).toBe(20);
    expect(limitFor("free", "nonexistent", null)).toBe(0);
  });
});

describe("版本比较", () => {
  it("逐段比较", () => {
    expect(isNewer("0.1.10", "0.1.9")).toBe(true);
    expect(isNewer("0.2.0", "0.1.9")).toBe(true);
    expect(isNewer("0.1.9", "0.1.9")).toBe(false);
    expect(isNewer("0.1.8", "0.1.9")).toBe(false);
    expect(isNewer("1.0", "0.9.9")).toBe(true);
  });
});
