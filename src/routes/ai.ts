/**
 * AI 模型中继。
 *
 * App 端不持有任何上游 Key: 它把对话请求打到这里的 /api/ai/chat,
 * 由后端解密供应商 Key 后转发到上游, 并把 SSE 流原样透传回 App。
 * 这样做的好处:
 *   - 用户换设备不用重配模型, 也不需要在 App 里填第三方 Key;
 *   - 上游 Key 泄露面收敛在后端;
 *   - 能按周配额精确计量(消耗点 = 一次 /ai/ai/chat 请求)。
 *
 * 为什么 quota 在转发「之前」扣: 流式响应一旦开始就无法安全地判定失败,
 * 先扣再转的策略是「宁可少收一次也不能超发」——token 成本是真实的。
 */

import { Hono } from "hono";
import type { Context } from "hono";
import type { Env } from "../env";
import { ApiError, errors } from "../utils/errors";
import { requireAuth } from "../middleware/auth";
import { consumeWeeklyQuota, weeklyQuotaState } from "../services/quota";
import { PLAN_LABELS } from "../plans";
import {
  listEnabledProviders,
  resolveProviderForChat,
  toPublicProvider,
} from "../services/ai_providers";

export const aiRoutes = new Hono<Env>();

/**
 * 站点自身地址: 优先用请求头(Origin/Referer), 回落到 PUBLIC_BASE_URL。
 * App 端拿这个拼云端模型的 chatUrl, 拿不到就说明环境变量没配。
 */
function apiBase(c: Context<Env>): string {
  const origin = c.req.header("origin") ?? c.req.header("referer");
  if (origin) {
    try {
      return new URL(origin).origin;
    } catch {
      // 非法 Origin 头, 继续回落到环境变量
    }
  }
  return c.env.PUBLIC_BASE_URL || "";
}

// ---- GET /ai/providers ----
// App 登录后拉取「云端可用模型」, 用于在模型选择器里展示云端档位。
aiRoutes.get("/providers", requireAuth, async (c) => {
  const rows = await listEnabledProviders(c.get("db"));
  const base = apiBase(c);
  return c.json({
    providers: rows.map((r) => toPublicProvider(r, base)),
    // 没有配置供应商时也要能正常返回, App 端据此隐藏「云端模型」分组
    available: rows.length > 0,
  });
});

// ---- GET /ai/usage ----
// 周额度查询(不消耗)。App 端额度卡片与「x 轮后用完」提示都读这个。
aiRoutes.get("/usage", requireAuth, async (c) => {
  const user = c.get("user");
  const state = await weeklyQuotaState(c.get("db"), user.userId, user.plan, "ai_chat");
  return c.json({
    tier: state.tier,
    tierLabel: PLAN_LABELS[state.tier],
    used: state.used,
    limit: state.limit,
    remaining: state.remaining,
    weekStart: state.weekStart,
    resetInMs: state.resetInMs,
  });
});

// ---- POST /ai/chat ----
// OpenAI 兼容的 /chat/completions。请求体原样透传(除 model 归属),
// 因此 App 端现有的工具调用 / 多 Key / 温度等逻辑全部可以复用。
aiRoutes.post("/chat", requireAuth, async (c) => {
  const user = c.get("user");
  const db = c.get("db");

  let body: Record<string, unknown>;
  try {
    body = (await c.req.json()) as Record<string, unknown>;
  } catch {
    throw errors.badRequest("请求体不是合法 JSON");
  }
  const messages = body.messages;
  if (!Array.isArray(messages) || messages.length === 0) {
    throw errors.badRequest("messages 不能为空");
  }

  // 先扣周配额(超限直接 429, App 端能明确提示「本周额度用尽」)
  const quota = await consumeWeeklyQuota(db, user.userId, user.plan, "ai_chat");

  const providerId = typeof body.providerId === "string" ? body.providerId : undefined;
  const requestedModel = typeof body.model === "string" ? body.model : "";
  const resolved = await resolveProviderForChat(
    db,
    c.env.JWT_SECRET,
    providerId,
    requestedModel
  );

  // 透传上游字段, 但 model 由后端裁决(防止 App 传任意模型名打穿配置)
  const upstream: Record<string, unknown> = { ...body, model: resolved.model };
  delete upstream.providerId;
  // 用量透传给 App: 让「云端模型」也能计入 token 统计
  upstream.stream = body.stream === true;
  if (upstream.stream === false) delete upstream.stream_options;

  let resp: Response;
  try {
    resp = await fetch(`${resolved.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${resolved.apiKey}`,
        "content-type": "application/json",
        accept: upstream.stream ? "text/event-stream" : "application/json",
      },
      body: JSON.stringify(upstream),
    });
  } catch (e) {
    // 网络层失败(DNS/连接超时/上游宕机)一律 502 而非 500——
    // 500 会被 App 当成"后端挂了", 502 才能正确表达"上游不可用"。
    throw new ApiError(
      502,
      "upstream_unreachable",
      `上游模型不可达: ${e instanceof Error ? e.message : String(e)}`
    );
  }

  if (!resp.ok) {
    const detail = await resp.text().catch(() => "");
    // 上游错误不直接把 Key 相关内容带出去, 但状态码与正文对用户排查有用
    throw new ApiError(
      resp.status === 429 ? 429 : 502,
      "upstream_error",
      `上游模型返回 ${resp.status}: ${detail.slice(0, 300)}`
    );
  }

  const headers: Record<string, string> = {
    "content-type": resp.headers.get("content-type") ?? "application/json",
    "cache-control": "no-cache",
    // App 端靠这个头把本次消耗同步进额度展示
    "x-orion-quota-used": String(quota.used),
    "x-orion-quota-limit": String(quota.limit),
    "x-orion-model": resolved.model,
    "x-orion-provider": resolved.row.name,
  };

  // SSE: 用 stream 直接透传, 不做缓冲(缓冲会毁掉流式体验)
  if (upstream.stream === true) {
    return new Response(resp.body, { status: 200, headers });
  }
  const json = await resp.json().catch(() => ({}) as unknown);
  return new Response(JSON.stringify(json), { status: 200, headers });
});
