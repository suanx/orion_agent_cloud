import { Hono } from "hono";
import type { Env } from "../env";
import { errors } from "../utils/errors";
import { requireAuth } from "../middleware/auth";
import { consumeQuota } from "../services/quota";
import { parseLimitsOverride } from "../plans";
import { formatResults, pickBackend } from "../services/search";
import { fetchPage } from "../services/fetcher";

export const relayRoutes = new Hono<Env>();

// ---- GET /relay/search?q=&max= ----
relayRoutes.get("/search", requireAuth, async (c) => {
  const user = c.get("user");
  const query = c.req.query("q")?.trim();
  if (!query) throw errors.badRequest("缺少 q 参数");
  const max = Math.min(Math.max(Number(c.req.query("max") ?? 8), 1), 20);

  const override = parseLimitsOverride(c.env.PLAN_LIMITS_OVERRIDE);
  const { used, limit } = await consumeQuota(
    c.get("db"),
    user.userId,
    user.plan,
    "relay_search",
    override
  );

  try {
    const backend = pickBackend(c.env);
    const results = await backend.search(query, max);
    return c.json({ provider: backend.name, results, formatted: formatResults(results), usage: { used, limit } });
  } catch (e) {
    throw errors.internal(`搜索失败: ${e instanceof Error ? e.message : String(e)}`);
  }
});

// ---- GET /relay/fetch?url= ----
relayRoutes.get("/fetch", requireAuth, async (c) => {
  const user = c.get("user");
  const url = c.req.query("url")?.trim();
  if (!url) throw errors.badRequest("缺少 url 参数");

  const override = parseLimitsOverride(c.env.PLAN_LIMITS_OVERRIDE);
  const { used, limit } = await consumeQuota(
    c.get("db"),
    user.userId,
    user.plan,
    "relay_fetch",
    override
  );

  try {
    const page = await fetchPage(url);
    return c.json({ ...page, usage: { used, limit } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("不允许") || msg.includes("仅支持") || msg.includes("格式")) {
      throw errors.badRequest(msg);
    }
    throw errors.internal(`抓取失败: ${msg}`);
  }
});
