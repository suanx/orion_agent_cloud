/**
 * EdgeOne Pages Functions 入口 (Cloudflare Pages Functions 兼容约定)。
 * 所有 /api/* 请求交给 Hono app 处理。
 *
 * ⚠️ app 采用 onRequest 内动态 import：模块级静态 import 一旦在边缘运行时
 * 初始化崩溃（如原生绑定），EdgeOne 只会返回不可读的 545 "Error return
 * from script"；动态加载 + try/catch 后，任何模块级错误都会以 500 JSON
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

const edgeCtx = (context: EdgeOneContext) => ({
  waitUntil: context.waitUntil.bind(context),
  passThroughOnException: context.passThroughOnException.bind(context),
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
