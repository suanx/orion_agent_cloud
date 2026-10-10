// 探针 2：加载真实 Hono app（触发 src/index.ts 模块级 import），看是否崩在加载阶段
import type { Bindings } from "../../src/env";
export default async function onRequest(context: { request: Request; env: Bindings }) {
  try {
    const mod = await import("../../src/index");
    const app = (mod as { default?: { fetch: Function } }).default ?? (mod as { default?: { fetch: Function } }).default;
    return new Response(JSON.stringify({ ok: true, stage: "app-loaded", hasApp: typeof app?.fetch === "function" }), {
      status: 200, headers: { "content-type": "application/json; charset=utf-8" },
    });
  } catch (e) {
    const msg = e instanceof Error ? `${e.name}: ${e.message}\n${(e.stack ?? "").slice(0,600)}` : String(e);
    return new Response(JSON.stringify({ ok: false, stage: "app-load-failed", err: msg }), {
      status: 500, headers: { "content-type": "application/json; charset=utf-8" },
    });
  }
}
