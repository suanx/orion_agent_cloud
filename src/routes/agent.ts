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
import { publicApiBase } from "../utils/public-base";
import { chunkToDelta, convertStream } from "../services/agent_stream";
import { consumeWeeklyQuota } from "../services/quota";
import {
  advanceTask,
  listActiveTasks,
  mapRunStatus,
  upsertTask,
  type AgentTask,
  getTask,
} from "../services/agent_tasks";

/**
 * forge 的 workflow run 状态 → 本服务任务状态（已在本文件内映射）。
 * 轮询端点用得上，这里给个别名方便阅读。
 */
const statusOfRun = mapRunStatus;

export const agentRoutes = new Hono<Env>();

function apiBase(c: Context<Env>): string {
  // 2026-10-11 起统一走 publicApiBase：c.req.url 在 EdgeOne 上是内部
  // SCF 域名，直接返回会让 /agent/info 的 chatUrl 公网不可达。
  return publicApiBase(c);
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

  // 未授权处理（2026-10-11 新功能）：登录了账号但管理员未在后台绑定
  // 云端 Agent 实例（或实例被停用）的用户，仍允许进入云端 Agent 界面
  // 发消息——返回一条合成的 SSE 回复「暂未授权 请联系管理员」，App 端
  // 按普通助手消息展示。不扣周额度（没有消耗任何算力）。
  const instanceRow = await getInstance(db, user.userId);
  if (!instanceRow || instanceRow.enabled !== 1) {
    const text =
      instanceRow
        ? "暂未授权 请联系管理员（你的云端 Agent 已被停用）"
        : "暂未授权 请联系管理员";
    const sse =
      `data: ${JSON.stringify({
        choices: [{ delta: { content: text }, index: 0 }],
      })}\n\ndata: [DONE]\n\n`;
    return new Response(sse, {
      status: 200,
      headers: {
        "content-type": "text/event-stream; charset=utf-8",
        "cache-control": "no-cache",
      },
    });
  }
  const instance = instanceRow;

  let body: {
    model?: string;
    /** Agent 实例侧的模型 id（用户自部署实例可选的模型列表）。 */
    modelId?: string;
    messages?: { role?: string; content?: string }[];
    appSessionId?: string;
    /** 单次回复输出上限（App 云端 Agent 配置下发 32K），透传给实例。 */
    max_tokens?: number;
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
  // 输出上限透传：App 侧 maxOutputTokens 以 OpenAI 风格 max_tokens 下发，
  // 不转发的话实例侧只能吃网关默认上限，「最大输出 32K」不生效。
  if (typeof body.max_tokens === "number" && body.max_tokens > 0) {
    payload.max_tokens = Math.floor(body.max_tokens);
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

  // 异步化衔接（2026-10-11）：forge 在响应头里给 workflow runId，中继据此
  // 登记任务。这样即使本次流被 105s 兜底截断，App 也能拿着同一个 taskId
  // 改走轮询把剩余输出接完（混和模式：先流式，超时降级）。
  const runId = resp.headers.get("x-workflow-run-id");
  if (runId && appSessionId) {
    await upsertTask(db, {
      taskId: runId,
      userId: user.userId,
      chatId: remoteChat ?? "",
      appSessionId,
    });
  }

  return new Response(convertStream(resp.body, { taskId: runId ?? undefined }), {
    status: 200,
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache",
      "x-orion-agent-model": "agent",
      // App 端靠这两个头把本次消耗同步进额度卡片
      "x-orion-quota-used": String(quota.used),
      "x-orion-quota-limit": String(quota.limit),
      // 任务 id：App 拿它在流被截断/退后台后继续轮询
      ...(runId ? { "x-orion-task-id": runId } : {}),
    },
  });
});

// ============ 云端 Agent 异步任务（2026-10-11 长任务异步化） ============
//
// EdgeOne Cloud Functions 单次请求硬上限 120s，长任务不可能靠一条流挂到
// 底。这里提供「提交即返回 + 带游标轮询」的完整异步通道：
//   ① POST /agent/tasks              启动任务，立刻返回 taskId
//   ② GET  /agent/tasks/:id/status   带 from 游标取增量输出
//   ③ GET  /agent/tasks              列出未完成任务（App 重开自动续接）
//   ④ POST /agent/tasks/:id/stop     取消
//
// 输出内容不落中继：forge 的 workflow run 流本身是持久化日志，任意时刻
// 可用 getReadable({startIndex}) 从任意游标重读，故无需 KV / 后端回调。

/** 取实例凭据（base + 解密后的 key）。 */
async function agentCreds(c: Context<Env>) {
  const user = c.get("user");
  const instance = await requireInstance(c.get("db"), user.userId);
  const apiKey = await decryptSecret(c.env.JWT_SECRET, instance.api_key_enc);
  return { base: instance.base_url.replace(/\/+$/, ""), key: apiKey };
}

/**
 * POST /agent/tasks
 * 启动一个 Agent 任务，立刻返回 taskId（不等待任务完成）。
 *
 * forge 的 /api/agent/chat 语义本就是「start() 后 workflow 独立存活」，
 * 响应头一到就能拿到 x-workflow-run-id；中继读完头即取消响应体——
 * 取消的只是本条流视图，run 照常在 Vercel 上跑（现有 105s 截断后
 * App 重连同一 run 的设计已在生产验证过这一点）。
 */
agentRoutes.post("/tasks", requireAuth, async (c) => {
  const user = c.get("user");
  const db = c.get("db");

  let body: {
    messages?: { role?: string; content?: string }[];
    appSessionId?: string;
    modelId?: string;
    max_tokens?: number;
  };
  try {
    body = await c.req.json();
  } catch {
    throw errors.badRequest("请求体不是合法 JSON");
  }
  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    throw errors.badRequest("messages 不能为空");
  }

  const appSessionId = String(body.appSessionId ?? "").trim();
  if (!appSessionId) throw errors.badRequest("appSessionId 不能为空");

  const mapped = await getAgentSession(db, user.userId, appSessionId);
  // 异步模型下只在**提交时**扣一次额度——此前 App 每轮重连都 POST 一次
  // /agent/chat，会被重复扣周额度（旁支问题在此一并按设计消除）。
  const quota = await consumeWeeklyQuota(db, user.userId, user.plan, "agent_run");
  const { base, key } = await agentCreds(c);

  const payload: Record<string, unknown> = { messages: body.messages };
  if (mapped) {
    payload.sessionId = mapped.remote_session;
    payload.chatId = mapped.remote_chat;
  }
  const requestedModel = typeof body.modelId === "string" ? body.modelId.trim() : "";
  if (requestedModel) payload.modelId = requestedModel;
  if (typeof body.max_tokens === "number" && body.max_tokens > 0) {
    payload.max_tokens = Math.floor(body.max_tokens);
  }

  let resp: Response;
  try {
    resp = await fetch(`${base}/api/agent/chat`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${key}`,
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
    throw new ApiError(
      resp.status === 401 || resp.status === 403 ? 502 : resp.status === 429 ? 429 : 502,
      "agent_error",
      `Agent 实例返回 ${resp.status}：${detail.slice(0, 300)}`,
    );
  }

  const remoteSession = resp.headers.get("x-session-id");
  const remoteChat = resp.headers.get("x-chat-id");
  if (remoteSession && remoteChat) {
    await saveAgentSession(db, user.userId, appSessionId, remoteSession, remoteChat);
  }

  const taskId = resp.headers.get("x-workflow-run-id");
  if (!taskId) {
    // 拿不到 runId 就没法轮询，退化成同步流——总比丢任务强。
    return new Response(convertStream(resp.body as ReadableStream<Uint8Array>), {
      status: 200,
      headers: {
        "content-type": "text/event-stream; charset=utf-8",
        "cache-control": "no-cache",
        "x-orion-quota-used": String(quota.used),
        "x-orion-quota-limit": String(quota.limit),
      },
    });
  }

  // 只取消本条流视图；workflow run 继续在 forge 侧执行。
  try {
    await resp.body?.cancel();
  } catch {
    /* 取消竞态，忽略 */
  }

  await upsertTask(db, {
    taskId,
    userId: user.userId,
    chatId: remoteChat ?? "",
    appSessionId,
  });

  return c.json({
    taskId,
    chatId: remoteChat ?? "",
    sessionId: remoteSession ?? "",
    status: "running",
    used: quota.used,
    limit: quota.limit,
  });
});

/**
 * GET /agent/tasks/:id/status?from=N
 * 带游标取增量输出。deltas 与流式路径**完全同构**（content /
 * reasoning_content），App 可直接复用同一套渲染逻辑。
 */
agentRoutes.get("/tasks/:id/status", requireAuth, async (c) => {
  const user = c.get("user");
  const db = c.get("db");
  const taskId = String(c.req.param("id") ?? "").trim();
  if (!taskId) throw errors.badRequest("缺少任务 id");

  const task = await getTask(db, taskId);
  if (!task || task.user_id !== user.userId) throw errors.notFound("任务不存在");

  const rawFrom = Number.parseInt(String(c.req.query("from") ?? "0"), 10);
  const from = Number.isFinite(rawFrom) && rawFrom > 0 ? rawFrom : 0;
  // follow：允许长轮询一小会儿，减少 App 空转请求；默认 0（即时返回）。
  const rawFollow = Number.parseInt(String(c.req.query("follow") ?? "0"), 10);
  const follow = Number.isFinite(rawFollow) && rawFollow > 0 ? Math.min(rawFollow, 8_000) : 0;

  const { base, key } = await agentCreds(c);
  const url =
    `${base}/api/agent/streams/${encodeURIComponent(taskId)}` +
    `?from=${from}&follow=${follow}`;

  let resp: Response;
  try {
    resp = await fetch(url, {
      headers: { authorization: `Bearer ${key}`, accept: "application/json" },
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
    throw new ApiError(
      resp.status === 401 || resp.status === 403 ? 502 : 502,
      "agent_error",
      `Agent 实例返回 ${resp.status}：${detail.slice(0, 300)}`,
    );
  }

  const data = (await resp.json()) as {
    status?: string;
    from?: number;
    total?: number;
    chunks?: unknown[];
  };
  const runStatus = data.status ?? "running";
  const taskStatus = statusOfRun(runStatus);
  const total = typeof data.total === "number" ? data.total : from;

  // 复用流式路径的同一套映射：UI chunk → OpenAI delta
  const deltas: Record<string, unknown>[] = [];
  for (const chunk of data.chunks ?? []) {
    const delta = chunkToDelta(JSON.stringify(chunk));
    if (delta) deltas.push(delta);
  }

  await advanceTask(db, taskId, {
    cursor: total,
    status: taskStatus,
    error: taskStatus === "failed" ? "forge run failed" : null,
  });

  return c.json({
    taskId,
    status: taskStatus,
    runStatus,
    from,
    total,
    deltas,
  });
});

/**
 * GET /agent/tasks
 * 当前用户未完成的任务（App 重开后自动续接用）。
 */
agentRoutes.get("/tasks", requireAuth, async (c) => {
  const user = c.get("user");
  const db = c.get("db");
  const tasks = await listActiveTasks(db, user.userId);
  return c.json({
    tasks: tasks.map((t: AgentTask) => ({
      taskId: t.task_id,
      appSessionId: t.app_session_id,
      chatId: t.chat_id,
      status: t.status,
      cursor: t.cursor,
      updatedAt: t.updated_at,
    })),
  });
});

/**
 * POST /agent/tasks/:id/stop
 * 取消任务：先让 forge 显式 cancel（异步模型下客户端早已断流，
 * 靠「不读它」是停不下来的），再本地标记。
 */
agentRoutes.post("/tasks/:id/stop", requireAuth, async (c) => {
  const user = c.get("user");
  const db = c.get("db");
  const taskId = String(c.req.param("id") ?? "").trim();
  if (!taskId) throw errors.badRequest("缺少任务 id");

  const task = await getTask(db, taskId);
  if (!task || task.user_id !== user.userId) throw errors.notFound("任务不存在");

  const { base, key } = await agentCreds(c);
  try {
    await fetch(`${base}/api/agent/streams/${encodeURIComponent(taskId)}/cancel`, {
      method: "POST",
      headers: { authorization: `Bearer ${key}`, accept: "application/json" },
    });
  } catch {
    // 取消是尽力而为：实例不可达时也要把本地标成已停止，
    // 否则 App 会一直轮询一个实际上已经没人管的任务。
  }

  await advanceTask(db, taskId, { cursor: task.cursor, status: "stopped" });
  return c.json({ ok: true, taskId, status: "stopped" });
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
