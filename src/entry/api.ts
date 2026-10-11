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
 * ⚠️ 三个必须遵守的 EdgeOne Node Functions 约定（2026-10-10 全天排查，
 * 每条都以线上实测验证过）：
 * 1. catch-all 文件名必须是 `[[default]]`（**不是** Cloudflare Pages 的
 *    `[[route]]`）。扩展名只认 `.js` / `.ts`——`.mjs` 不会注册路由，
 *    /api/* 会直接落到静态 HTML。
 * 2. 入口必须 **default export** `onRequest`（官方示例：
 *    `export default function onRequest(context)`）。平台文档明确：
 *    「仅导出 onRequest / onRequestGet 等 Function Handlers 或框架实例的
 *    文件才会注册为路由」。原来的 `export const onRequest` 不会被识别。
 *    这里同时保留具名导出，供 scripts/dev-server.mjs 本地打包使用。
 * 3. **函数文件必须零外部 import（自包含）**：平台对 cloud-functions/
 *    源码自动构建时完全不处理 npm 依赖——哪怕只静态 import 一个 hono
 *    也会 CLOUD_FUNCTION_INVOCATION_FAILED。因此部署产物是 esbuild
 *    全内联 bundle（cloud-functions/api/[[default]].js，由
 *    `npm run build` 生成并提交入仓），平台眼里它就是个零依赖函数。
 *
 * ⚠️ maxDuration=120 实测确认生效（2026-10-10 sleep 探针：挂 100s 正常
 * 返回 200；SCF 默认超时仅 30s）。前提就是函数必须跑在
 * `cloud-functions/`（Node v20 runtime），legacy `functions/` 目录
 * 是 Edge Runtime，cloudFunctions 配置对它完全无效。
 *
 * EdgeOne 部署时在控制台配置环境变量(.env.example 列表),
 * Cron Trigger 指向 POST /api/tasks/run-due (Header: Authorization: Bearer <ADMIN_TOKEN>)。
 */
import type { Bindings } from "../env";
// ⚠️ 必须静态 import（2026-10-10 502 排查结论）：EdgeOne 平台打包器对
// 相对路径的动态 import() 会重写成错误路径（探针3 实测
// "Cannot find module '/src/db/client'"），对 bare specifier 动态 import()
// 不做内联（"Cannot find package '@libsql/client'"）。静态 import 才会被
// 正确打包内联。原先动态引入是为了 Edge Runtime 时代的 545 诊断，
// Node runtime 下不再需要。
import app from "../index";

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
  try {
    return await app.fetch(context.request, context.env, edgeCtx(context));
  } catch (e) {
    // 模块加载/初始化失败（2026-10-11 安全修复 P1）：错误原文含完整堆栈，
    // 旧实现无条件回给公网调用者（绕过主 app 的 DEBUG_ERRORS 开关）。
    // 现在仅在 DEBUG_ERRORS=true 时带详情，其余只回通用错误。
    const detail = e instanceof Error ? `${e.name}: ${e.message}\n${e.stack ?? ""}` : String(e);
    const show = String(context.env?.DEBUG_ERRORS ?? "") === "true";
    if (show) console.error("[entry] module error:", detail);
    const body = show
      ? JSON.stringify({ moduleError: detail }, null, 2)
      : JSON.stringify({ error: "internal_error" });
    return new Response(body, {
      status: 500,
      headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
    });
  }
};

// EdgeOne Node Functions 通过 default export 识别入口（见上方约定 2）。
export default onRequest;
