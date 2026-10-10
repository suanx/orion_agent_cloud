/**
 * EdgeOne Pages **Cloud Functions**（Node.js runtime）入口。
 * 所有 /api/* 请求交给 Hono app 处理。
 *
 * 为什么在 cloud-functions/ 而不是旧的 functions/（2026-10-10）：
 * - `functions/` 是 EdgeOne 的legacy 路径，跑 **Edge Runtime (V8)**，
 *   CPU 配额仅 200ms、代码 5MB、body 1MB，且不提供 maxDuration 配置；
 *   `edgeone.json` 里的 `cloudFunctions.nodejs.maxDuration` 对它无效。
 * - `cloud-functions/` 才是 **Node.js v20 runtime**：完整 npm 生态、
 *   Streams 可用、支持 `maxDuration`（默认 30s，可配至 120s）。
 * 云端 Agent 中继是「长挂的流式 SSE 转发」（一次任务挂几分钟），
 * 必须跑 Node.js runtime 才能吃到 120s 上限——2026-10-10 用户实测
 * v0.2.49（30s→120s 修复上线）云端 Agent 仍「重连 4 次全失败」，
 * 即旧目录导致该配置从未生效。
 *
 * ⚠️ app 采用 onRequest 内动态 import：模块级静态 import 一旦在运行时
 * 初始化崩溃，只会返回不可读的 545 "Error return from script"；
 * 动态加载 + try/catch 后，任何模块级错误都会以 500 JSON
 * 返回错误原文，可直接定位（2026-10-08 线上 545 排查探针）。
 *
 * EdgeOne 部署时在控制台配置环境变量(.env.example 列表),
 * Cron Trigger 指向 POST /api/tasks/run-due (Header: Authorization: Bearer <ADMIN_TOKEN>)。
 */
import type { Bindings } from "../../src/env";

interface EdgeOneContext {
  request: Request;
  env: Bindings;
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

// 545 真正根因（线上探针实测）：EdgeOne 的 context 不提供 waitUntil /
// passThroughOnException（那是 Cloudflare Pages 的约定），对 undefined 调
// .bind() 直接 TypeError → 每个请求 545。这里防御性兜底为空实现。
const edgeCtx = (context: EdgeOneContext) => ({
  waitUntil: (context.waitUntil ?? (() => {})).bind(context),
  passThroughOnException: (context.passThroughOnException ?? (() => {})).bind(context),
  props: {} as Record<string, unknown>,
});

export const onRequest = async (context: EdgeOneContext): Promise<Response> => {
  try {
    const mod = await import("../../src/index");
    const app = (mod as { default?: typeof mod.default & { fetch: Function } }).default
      ?? mod.default;
    return await app.fetch(context.request, context.env, edgeCtx(context));
  } catch (e) {
    // 模块加载/初始化失败的错误原文直接返回（部署诊断期临时行为）
    const msg = e instanceof Error ? `${e.name}: ${e.message}\n${e.stack ?? ""}` : String(e);
    return new Response(JSON.stringify({ moduleError: msg }, null, 2), {
      status: 500,
      headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
    });
  }
};
