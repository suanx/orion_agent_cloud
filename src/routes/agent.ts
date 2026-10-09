import { Hono } from "hono";
import type { Client } from "@libsql/client";
import type { Context } from "hono";
import type { Env } from "../env";
import { ApiError, errors } from "../utils/errors";
import { requireAuth } from "../middleware/auth";
import {
  clearAgentSession,
  decryptSecret,
  getAgentSession,
  requireInstance,
  saveAgentSession,
  toPublicAgentInfo,
  getInstance,
} from "../services/agent_instances";
import { convertStream } from "../services/agent_stream";
import { consumeWeeklyQuota } from "../services/quota";

export const agentRoutes = new Hono<Env>();

function apiBase(c: Context<Env>): string {
  const origin = c.req.header("origin") ?? c.req.header("referer");
  if (origin) {
    try {
      return new URL(origin).origin;
    } catch {
      // 非法 Origin，回落到下一级
    }
  }
  // 请求自身的 origin：App 的请求本来就打到本服务（如
  // https://orion.suen.us.ci/api/agent/info），c.req.url 一定带完整地址。
  // 这一级必须放在 PUBLIC_BASE_URL 之前——原生 HTTP 客户端（Flutter/Dio）
  // 不发 Origin/Referer 头，环境变量一旦漏配，这里曾回落成 ""，
  // chatUrl 变成相对路径 "/api/agent/chat"，App 端 Dio 对相对 URL 直接抛
  // 无状态码异常，表现为「请求失败（HTTP null）」（2026-10-10 实测）。
  try {
    return new URL(c.req.url).origin;
  } catch {
    // c.req.url 异常（极端适配器场景），继续回落
  }
  return c.env.PUBLIC_BASE_URL || "";
}

// ---- GET /agent/info ----
// App 登录后调用。**未开通时返回 enabled:false，不报错、不提示**——
// App 据此隐藏「云端 Agent」入口，用户不会看到任何配置引导。
agentRoutes.get("/info", requireAuth, async (c) => {
  const user = c.get("user");
  // 未开通/已停用都不是错误，走 getInstance 后判空即可。
  const instance = await getInstance(c.get("db"), user.userId);
  return c.json(toPublicAgentInfo(instance && instance.enabled === 1 ? instance : null, apiBase(c)));
});

// ---- POST /agent/chat ----
// 中继 App 的对话请求到用户自部署的 orion-forge 实例，并把 AI SDK 事件流
// 转成 OpenAI 兼容 SSE。请求体与 /ai/chat 保持一致，App 侧可复用同一条链路。
agentRoutes.post("/chat", requireAuth, async (c) => {
  const user = c.get("user");
  const db = c.get("db");
  const instance = await requireInstance(db, user.userId);

  let body: {
    model?: string;
    /** Agent 实例侧的模型 id（用户自部署实例可选的模型列表）。 */
    modelId?: string;
    messages?: { role?: string; content?: string }[];
    appSessionId?: string;
  };
  try {
    body = await c.req.json();
  } catch {
    throw errors.badRequest("请求体不是合法 JSON");
  }
  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    throw errors.badRequest("messages 不能为空");
  }

  // App 会话 id：用于记住远端 session/chat，续上下文时复用。
  // 缺失时退化为"每次都是新会话"（App 侧应始终带上）。
  const appSessionId = String(body.appSessionId ?? "").trim();
  const mapped = appSessionId ? await getAgentSession(db, user.userId, appSessionId) : null;

  // 先扣周配额（超限直接 429，App 能明确提示「本周额度已用尽」）。
  // Agent 单次消耗的算力远高于普通对话，故用独立的 agent_run 计数，
  // 不与 ai_chat 混算——否则一次 Agent 任务会吃掉几十轮对话的额度。
  const quota = await consumeWeeklyQuota(db, user.userId, user.plan, "agent_run");

  const apiKey = await decryptSecret(c.env.JWT_SECRET, instance.api_key_enc);
  const remoteBase = instance.base_url.replace(/\/+$/, "");

  const payload: Record<string, unknown> = {
    messages: body.messages,
  };
  if (mapped) {
    payload.sessionId = mapped.remote_session;
    payload.chatId = mapped.remote_chat;
  }
  // 模型由 App 侧选择（用户在模型选择器里挑）。留空时 Agent 用自己的
  // 默认模型，故不做白名单校验——实例是用户自己的，可选模型本就该由
  // 该实例的部署方决定，后端无权替他收紧。
  const requestedModel = typeof body.modelId === "string" ? body.modelId.trim() : "";
  if (requestedModel) payload.modelId = requestedModel;

  let resp: Response;
  try {
    resp = await fetch(`${remoteBase}/api/agent/chat`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
        accept: "text/event-stream",
      },
      body: JSON.stringify(payload),
    });
  } catch (e) {
    throw new ApiError(
      502,
      "agent_unreachable",
      `无法连接 Agent 实例：${e instanceof Error ? e.message : String(e)}`,
    );
  }

  if (!resp.ok) {
    const detail = await resp.text().catch(() => "");
    // 401/403 说明我们存的 key 不对（用户改了 AGENT_API_KEY 或重建了实例），
    // 对 App 侧报 502 + 明确原因，避免它以为是自己的问题。
    throw new ApiError(
      resp.status === 401 || resp.status === 403
        ? 502
        : resp.status === 429
          ? 429
          : 502,
      "agent_error",
      `Agent 实例返回 ${resp.status}：${detail.slice(0, 300)}`,
    );
  }

  // 记住远端会话映射，供下一轮续上下文
  const remoteSession = resp.headers.get("x-session-id");
  const remoteChat = resp.headers.get("x-chat-id");
  if (appSessionId && remoteSession && remoteChat) {
    await saveAgentSession(db, user.userId, appSessionId, remoteSession, remoteChat);
  }

  if (!resp.body) {
    throw errors.internal("Agent 实例未返回流");
  }

  return new Response(convertStream(resp.body), {
    status: 200,
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache",
      "x-orion-agent-model": "agent",
      // App 端靠这两个头把本次消耗同步进额度卡片
      "x-orion-quota-used": String(quota.used),
      "x-orion-quota-limit": String(quota.limit),
    },
  });
});

// ---- POST /agent/session/reset ----
// App 侧用户新建/删除会话时调用：丢弃映射，下次发消息会开新会话。
agentRoutes.post("/session/reset", requireAuth, async (c) => {
  const user = c.get("user");
  let body: { appSessionId?: string };
  try {
    body = await c.req.json();
  } catch {
    throw errors.badRequest("请求体不是合法 JSON");
  }
  const appSessionId = String(body.appSessionId ?? "").trim();
  if (!appSessionId) throw errors.badRequest("appSessionId 不能为空");
  await clearAgentSession(c.get("db"), user.userId, appSessionId);
  return c.json({ ok: true });
});

// ---- 产物读取（Agent 改过的文件 / dev server 预览） ----
//
// 为什么需要代理：Agent 干完活产出在**沙箱**里（改的文件、起的 dev server），
// 这些只能通过 orion-forge 的 REST 端点读，而那些端点要求 API Key 鉴权。
// App 拿不到实例地址（只见 /api/agent/*），故由后端转发。
//
// 路径参数里的 :remoteSession 用 App 自己的会话 id 查映射得到，
// App 不需要知道远端 session/chat 的存在。

/** 取该用户实例的解密凭据与规范化后的根地址。 */
async function instanceTarget(c: Context<Env>) {
  const user = c.get("user");
  const instance = await requireInstance(c.get("db"), user.userId);
  const apiKey = await decryptSecret(c.env.JWT_SECRET, instance.api_key_enc);
  return {
    base: instance.base_url.replace(/\/+$/, ""),
    key: apiKey,
  };
}

/** 由 App 会话 id 反查远端 sessionId；没有映射时返回 null。 */
async function remoteSessionOf(db: Client, userId: string, appSessionId: string) {
  const mapped = await getAgentSession(db, userId, appSessionId);
  return mapped?.remote_session ?? null;
}

/**
 * GET /agent/files?appSessionId=xxx
 * 列出 Agent 在沙箱里改动的文件树。
 */
agentRoutes.get("/files", requireAuth, async (c) => {
  const user = c.get("user");
  const db = c.get("db");
  const appSessionId = String(c.req.query("appSessionId") ?? "").trim();
  if (!appSessionId) throw errors.badRequest("缺少 appSessionId");

  const remoteSession = await remoteSessionOf(db, user.userId, appSessionId);
  if (!remoteSession) throw errors.notFound("该会话尚未产生远端 Agent 会话，请先发送一条消息");

  const { base, key } = await instanceTarget(c);
  return proxyInstance(`${base}/api/sessions/${encodeURIComponent(remoteSession)}/files`, key);
});

/**
 * GET /agent/file?appSessionId=xxx&path=src/app.tsx
 * 读取单个文件内容。
 */
agentRoutes.get("/file", requireAuth, async (c) => {
  const user = c.get("user");
  const db = c.get("db");
  const appSessionId = String(c.req.query("appSessionId") ?? "").trim();
  const path = String(c.req.query("path") ?? "").trim();
  if (!appSessionId) throw errors.badRequest("缺少 appSessionId");
  if (!path) throw errors.badRequest("缺少 path");

  const remoteSession = await remoteSessionOf(db, user.userId, appSessionId);
  if (!remoteSession) throw errors.notFound("该会话尚未产生远端 Agent 会话，请先发送一条消息");

  const { base, key } = await instanceTarget(c);
  const target =
    `${base}/api/sessions/${encodeURIComponent(remoteSession)}/files/content` +
    `?path=${encodeURIComponent(path)}`;
  return proxyInstance(target, key);
});

/**
 * POST /agent/dev-server?appSessionId=xxx
 * 启动（或复用）Agent 在沙箱里起的 dev server，回传预览地址。
 *
 * 注意：forge 侧该端点**只有 POST/DELETE，没有 GET** —— 启动是写操作
 * （要装依赖、execDetached 起进程），不是查询。已跑起来时 POST 是幂等的，
 * 直接回既有地址。
 */
agentRoutes.post("/dev-server", requireAuth, async (c) => {
  const user = c.get("user");
  const db = c.get("db");
  const appSessionId = String(c.req.query("appSessionId") ?? "").trim();
  if (!appSessionId) throw errors.badRequest("缺少 appSessionId");

  const remoteSession = await remoteSessionOf(db, user.userId, appSessionId);
  if (!remoteSession) throw errors.notFound("该会话尚未产生远端 Agent 会话，请先发送一条消息");

  const { base, key } = await instanceTarget(c);
  return proxyInstance(
    `${base}/api/sessions/${encodeURIComponent(remoteSession)}/dev-server`,
    key,
    "POST",
  );
});

/**
 * DELETE /agent/dev-server?appSessionId=xxx
 * 停掉 dev server，释放沙箱端口。
 */
agentRoutes.delete("/dev-server", requireAuth, async (c) => {
  const user = c.get("user");
  const db = c.get("db");
  const appSessionId = String(c.req.query("appSessionId") ?? "").trim();
  if (!appSessionId) throw errors.badRequest("缺少 appSessionId");

  const remoteSession = await remoteSessionOf(db, user.userId, appSessionId);
  if (!remoteSession) throw errors.notFound("该会话尚未产生远端 Agent 会话，请先发送一条消息");

  const { base, key } = await instanceTarget(c);
  return proxyInstance(
    `${base}/api/sessions/${encodeURIComponent(remoteSession)}/dev-server`,
    key,
    "DELETE",
  );
});

/**
 * 转发到实例并原样回传 JSON。
 *
 * 错误码语义与 /chat 一致：401/403 说明我们存的 key 不对（用户改了实例的
 * AGENT_API_KEY 或重建了实例），对 App 报 502 而不是让它以为是自己问题。
 *
 * [method] 默认 GET；dev-server 要转发 POST/DELETE，故显式传。
 */
async function proxyInstance(
  target: string,
  key: string,
  method: "GET" | "POST" | "DELETE" = "GET",
): Promise<Response> {
  let resp: Response;
  try {
    resp = await fetch(target, {
      method,
      headers: { authorization: `Bearer ${key}`, accept: "application/json" },
    });
  } catch (e) {
    throw new ApiError(
      502,
      "agent_unreachable",
      `无法连接 Agent 实例：${e instanceof Error ? e.message : String(e)}`,
    );
  }
  const text = await resp.text();
  if (!resp.ok) {
    if (resp.status === 401 || resp.status === 403) {
      throw new ApiError(502, "agent_error", "Agent 实例鉴权失败，请检查该实例的 API Key 是否已更换");
    }
    // 业务层错误（如沙箱未初始化）原样回传，App 需要看到具体原因
    return new Response(text, {
      status: resp.status,
      headers: { "content-type": resp.headers.get("content-type") ?? "application/json" },
    });
  }
  return new Response(text, {
    status: 200,
    headers: {
      "content-type": resp.headers.get("content-type") ?? "application/json",
      "cache-control": "no-store",
    },
  });
}
