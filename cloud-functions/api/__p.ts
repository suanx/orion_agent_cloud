// 探针：确认平台是否加载了我的构建产物（若平台忽略 .edgeone，此路由仍会由平台
// 自动构建 cloud-functions/api/ 源码，行为会不同）
import type { Bindings } from "../../src/env";
export default async function onRequest(ctx: { request: Request; env: Bindings }) {
  void ctx;
  const hasHono = (() => { try { return typeof (globalThis as any).__honoMarker; } catch { return false; } })();
  return new Response(JSON.stringify({ ok: true, probe: "p", hasHono, node: process.version }), {
    status: 200, headers: { "content-type": "application/json; charset=utf-8" },
  });
}
