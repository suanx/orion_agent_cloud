import { Hono } from "hono";
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

export const agentRoutes = new Hono<Env>();

function apiBase(c: Context<Env>): string {
  const origin = c.req.header("origin") ?? c.req.header("referer");
  if (origin) {
    try {
      return new URL(origin).origin;
    } catch {
      // 非法 Origin，回落到环境变量
    }
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

  const apiKey = await decryptSecret(c.env.JWT_SECRET, instance.api_key_enc);
  const remoteBase = instance.base_url.replace(/\/+$/, "");

  const payload: Record<string, unknown> = {
    messages: body.messages,
  };
  if (mapped) {
    payload.sessionId = mapped.remote_session;
    payload.chatId = mapped.remote_chat;
  }

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
