import { Hono, type Context } from "hono";
import type { Env } from "../env";
import { requireAuth } from "../middleware/auth";
import { consumeQuota } from "../services/quota";
import { parseLimitsOverride, nextDailyRun } from "../plans";
import { pickBackend, formatResults } from "../services/search";
import { fetchPage } from "../services/fetcher";
import { uuid, nowMs } from "../utils/crypto";
import { ApiError } from "../utils/errors";

/**
 * MCP Server (Streamable HTTP, JSON-RPC 2.0, 仅 tools 能力)。
 * orion_agent 是现成的 MCP 客户端: 在「我的 → MCP 服务器」填
 * <本服务地址>/mcp + 设备令牌即可, 端上零业务改造。
 * 工具命名: sanitizePublic("orion") + "__" + sanitize(原名) 由客户端拼接,
 * 此处返回原始名。
 */

export const mcpRoutes = new Hono<Env>();

interface JsonRpcRequest {
  jsonrpc: string;
  id?: string | number | null;
  method: string;
  params?: Record<string, unknown>;
}

const PROTOCOL_VERSION = "2024-11-05";

function jsonRpcResult(id: string | number | null, result: Record<string, unknown>) {
  return Response.json({ jsonrpc: "2.0", id, result });
}

function jsonRpcError(id: string | number | null, code: number, message: string) {
  return Response.json({ jsonrpc: "2.0", id, error: { code, message } });
}

const TOOLS = [
  {
    name: "cloud_search",
    description: "通过云端中继进行联网搜索(国内网络可达)。返回标题、链接与摘要。",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "搜索关键词" },
        max_results: { type: "number", description: "结果数量, 默认 8, 上限 20" },
      },
      required: ["query"],
    },
  },
  {
    name: "cloud_fetch",
    description: "抓取网页并提取正文(经云端代理, 自带 SSRF 防护与 2MB 上限)。",
    inputSchema: {
      type: "object",
      properties: { url: { type: "string", description: "完整的 http/https URL" } },
      required: ["url"],
    },
  },
  {
    name: "cloud_schedule_task",
    description: "创建云端定时任务: 每天 UTC+8 指定时刻由服务端调用 LLM 执行提示词, 用户在 App 打开时可拉取结果。",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "任务名称" },
        prompt: { type: "string", description: "任务提示词" },
        schedule_hour: { type: "number", description: "小时 (UTC+8, 0-23), 默认 8" },
        schedule_minute: { type: "number", description: "分钟 (0-59), 默认 0" },
      },
      required: ["name", "prompt"],
    },
  },
  {
    name: "cloud_list_tasks",
    description: "列出我的云端定时任务及最近执行状态。",
    inputSchema: { type: "object", properties: {} },
  },
];

async function toolCall(
  c: Context<Env>,
  name: string,
  args: Record<string, unknown>
): Promise<{ content: { type: string; text: string }[]; isError?: boolean }> {
  const user = c.get("user");
  const db = c.get("db");
  const override = parseLimitsOverride(c.env.PLAN_LIMITS_OVERRIDE);
  const text = (t: string) => ({ content: [{ type: "text", text: t }] });

  try {
    switch (name) {
      case "cloud_search": {
        const query = String(args.query ?? "").trim();
        if (!query) return text("错误: query 不能为空");
        const max = Math.min(Math.max(Number(args.max_results ?? 8), 1), 20);
        await consumeQuota(db, user.userId, user.plan, "relay_search", override);
        const backend = pickBackend(c.env);
        const results = await backend.search(query, max);
        return text(`[${backend.name} 搜索] ${query}\n\n${formatResults(results)}`);
      }
      case "cloud_fetch": {
        const url = String(args.url ?? "").trim();
        if (!url) return text("错误: url 不能为空");
        await consumeQuota(db, user.userId, user.plan, "relay_fetch", override);
        const page = await fetchPage(url);
        return text(`# ${page.title}\n来源: ${page.url}\n\n${page.content}${page.truncated ? "\n\n(内容已截断)" : ""}`);
      }
      case "cloud_schedule_task": {
        const tname = String(args.name ?? "").trim().slice(0, 100);
        const prompt = String(args.prompt ?? "").trim().slice(0, 8000);
        if (!tname || !prompt) return text("错误: name/prompt 不能为空");
        // NaN 守卫（2026-10-11）：非法值回落默认，防 INSERT NaN / Invalid Date。
        const numOr = (v: unknown, d: number) => {
          const n = Number(v);
          return Number.isFinite(n) ? n : d;
        };
        const hour = Math.min(Math.max(numOr(args.schedule_hour ?? 8, 8), 0), 23);
        const minute = Math.min(Math.max(numOr(args.schedule_minute ?? 0, 0), 0), 59);
        const count = await db.execute({
          sql: "SELECT COUNT(*) AS n FROM cloud_tasks WHERE user_id = ?",
          args: [user.userId],
        });
        const MAX_TASKS: Record<string, number> = { free: 1, trial: 5, pro: 20, lifetime: 20 };
        if (Number(count.rows[0]?.n ?? 0) >= (MAX_TASKS[user.plan] ?? 1)) {
          return text(`错误: 当前套餐(${user.plan})云端任务数量已达上限, 请升级套餐`);
        }
        const nextRun = nextDailyRun(hour, minute);
        await db.execute({
          sql: `INSERT INTO cloud_tasks (id, user_id, name, prompt, schedule_type, schedule_hour, schedule_minute, enabled, next_run_at, created_at)
                VALUES (?, ?, ?, ?, 'daily', ?, ?, 1, ?, ?)`,
          args: [`t_${uuid()}`, user.userId, tname, prompt, hour, minute, nextRun, nowMs()],
        });
        const at = nextRun ? new Date(nextRun).toISOString() : "不调度";
        return text(`已创建云端定时任务「${tname}」, 每日 UTC+8 ${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")} 执行(下次: ${at})。`);
      }
      case "cloud_list_tasks": {
        const r = await db.execute({
          sql: `SELECT name, schedule_hour, schedule_minute, enabled, last_status, last_run_at
                FROM cloud_tasks WHERE user_id = ? ORDER BY created_at DESC LIMIT 50`,
          args: [user.userId],
        });
        if (r.rows.length === 0) return text("暂无云端定时任务。");
        return text(
          r.rows
            .map(
              (t) =>
                `「${t.name}」每日 ${String(t.schedule_hour).padStart(2, "0")}:${String(t.schedule_minute).padStart(2, "0")} | ${t.enabled ? "启用" : "停用"} | 上次: ${t.last_status ?? "未运行"}`
            )
            .join("\n")
        );
      }
      default:
        return { ...text(`未知工具: ${name}`), isError: true };
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (e instanceof ApiError && e.status === 429) {
      return text(`错误: ${msg}`);
    }
    return { ...text(`错误: ${msg}`), isError: true };
  }
}

// ---- POST /mcp (JSON-RPC) ----
mcpRoutes.post("/", requireAuth, async (c) => {
  const body = (await c.req.json().catch(() => null)) as JsonRpcRequest | null;
  if (!body || body.jsonrpc !== "2.0" || typeof body.method !== "string") {
    return jsonRpcError(null, -32600, "Invalid Request");
  }
  const id = body.id ?? null;

  switch (body.method) {
    case "initialize":
      return jsonRpcResult(id, {
        protocolVersion: PROTOCOL_VERSION,
        capabilities: { tools: {} },
        serverInfo: { name: "orion-cloud", version: "0.1.0" },
      });
    case "notifications/initialized":
      return new Response(null, { status: 202 });
    case "tools/list":
      return jsonRpcResult(id, { tools: TOOLS });
    case "tools/call": {
      const params = body.params ?? {};
      const name = String(params.name ?? "");
      const args = (params.arguments ?? {}) as Record<string, unknown>;
      const result = await toolCall(c, name, args);
      return jsonRpcResult(id, result);
    }
    case "ping":
      return jsonRpcResult(id, {});
    default:
      return jsonRpcError(id, -32601, `Method not found: ${body.method}`);
  }
});

// ---- GET /mcp: orion 探活用 ----
mcpRoutes.get("/", requireAuth, (c) => c.json({ server: "orion-cloud", protocolVersion: PROTOCOL_VERSION, transport: "streamable-http" }));
