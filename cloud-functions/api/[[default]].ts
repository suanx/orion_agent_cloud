/**
 * EdgeOne Pages **Cloud Functions（Node.js runtime）** 入口。
 * 所有 /api/* 请求交给 Hono app 处理。
 *
 * 迁移背景（2026-10-10，网络波动根因）：
 * - 原先放在`functions/api/[[route]].ts`。`functions/` 是 EdgeOne 的legacy
 *   目录，跑 **Edge Runtime (V8)**：CPU 配额仅 200ms、代码 5MB、body 1MB，
 *   **不提供 maxDuration 配置** → edgeone.json 里的
 *   `cloudFunctions.nodejs.maxDuration = 120` 从未生效，长挂流式SSE 转发
 *   被平台腰斩，App 侧表现为「网络波动，重连 4 次全失败」。
 * - `cloud-functions/` 才是 **Node.js v20 runtime**：完整 npm 生态、
 *   Streams 可用、支持 maxDuration（默认 30s，可配至 120s）。
 *
 * ⚠️ 两个必须遵守的 EdgeOne Node Functions 约定（2026-10-10 首次迁移
 * 因踩错这两点导致线上全 502，已回滚重做）：
 * 1. catch-all 文件名必须是 `[[default]]`（**不是** Cloudflare Pages 的
 *    `[[route]]`）——平台靠这个约定识别多级通配路由。
 * 2. 入口必须 **default export** `onRequest`（官方示例：
 *    `export default function onRequest(context)`）。平台文档明确：
 *    「仅导出 onRequest / onRequestGet 等 Function Handlers 或框架实例的
 *    文件才会注册为路由」。原来的 `export const onRequest` 不会被识别。
 *    这里同时保留具名导出，供 scripts/dev-server.mjs 本地打包使用。
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
// ⚠️ 必须静态 import（2026-10-10 502 排查结论）：EdgeOne 平台打包器对
// 相对路径的动态 import() 会重写成错误路径（探针3 实测
// "Cannot find module '/src/db/client'"），对 bare specifier 动态 import()
// 不做内联（"Cannot find package '@libsql/client'"）。静态 import 才会被
// 正确打包内联。原先动态引入是为了 Edge Runtime 时代的 545 诊断，
// Node runtime 下不再需要。
import app from "../../src/index";

interface EdgeOneContext {
  request: Request;
  env: Bindings;
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

// EdgeOne 的 context 不保证提供 waitUntil / passThroughOnException，
// 对 undefined 调 .bind() 直接 TypeError → 每个请求 545（2026-10-08 线上探针实测）。
// 这里防御性兜底为空实现。
const edgeCtx = (context: EdgeOneContext) => ({
  waitUntil: (context.waitUntil ?? (() => {})).bind(context),
  passThroughOnException: (context.passThroughOnException ?? (() => {})).bind(context),
  props: {} as Record<string, unknown>,
});

export const onRequest = async (context: EdgeOneContext): Promise<Response> => {
  // 临时诊断端点（排查 502 用，修复后删除）：回传运行环境与模块加载详情
  if (new URL(context.request.url).pathname === "/api/__diag") {
    const out: Record<string, unknown> = { node: process.version, cwd: process.cwd() };
    try {
      const fs = await import("node:fs");
      out.cwdList = fs.readdirSync(process.cwd()).slice(0, 40);
      const parent = fs.readdirSync(process.cwd() + "/..", { withFileTypes: true })
        .filter((d) => d.isDirectory()).map((d) => d.name).slice(0, 30);
      out.parentDirs = parent;
    } catch (e) {
      out.fsErr = e instanceof Error ? e.message : String(e);
    }
    try {
      out.appLoaded = true;
      out.hasFetch = typeof app?.fetch === "function";
      try {
        const probe = await app?.fetch(new Request("https://x/api"), context.env, edgeCtx(context));
        out.probeStatus = probe?.status;
        out.probeBody = (await probe?.text())?.slice(0, 120);
      } catch (e2) {
        out.probeErr = e2 instanceof Error ? `${e2.name}: ${e2.message}` : String(e2);
      }
    } catch (e) {
      out.appLoaded = false;
      out.err = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
      out.stack = e instanceof Error ? (e.stack ?? "").slice(0, 900) : "";
    }
    return new Response(JSON.stringify(out, null, 2), {
      status: 200, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
    });
  }
  try {
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

// EdgeOne Node Functions 通过 default export 识别入口（见上方约定 2）。
export default onRequest;
