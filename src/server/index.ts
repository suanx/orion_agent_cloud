/**
 * Node 服务端（VPS）入口 —— Hono app 的常驻进程形态。
 *
 * 为什么要有这个入口（2026-10-11 迁移到 104.168.92.213）：
 * 1. **去掉 120s 硬上限**。EdgeOne Pages 的 Cloud Functions（Node runtime）
 *    maxDuration 配置上限就是 120s，云端 Agent 中继是长挂流式 SSE 转发
 *    （单任务挂几分钟），曾被平台腰斩，App 侧表现为「网络波动，重连 4 次全失败」。
 *    自建 VPS 上没有这个限制，SSE 可以一直挂着。
 * 2. **拿到 Node 原生能力**。后台常驻定时任务、WebSocket、文件系统、
 *    子进程这些在边缘运行时里都做不了的事，迁到 VPS 后全部解锁。
 * 3. **数据落在自己机器上**。见 src/db/client-node.ts（file: SQLite 可切换）。
 *
 * 与 EdgeOne 入口的关系：**共享同一份 Hono app（src/index.ts）**，
 * 13 个路由模块、约 30 个服务文件零改动复用。两条部署链并存：
 *   - EdgeOne：src/entry/api.ts（保持不变，cloud-functions/ 产物照旧可发）
 *   - VPS：    src/server/index.ts（本文件）
 * 因此以后加功能只需改业务代码，两边同时生效。
 *
 * ⚠️ 与 scripts/dev-server.mjs 的关键差异：dev-server 用 arrayBuffer()
 * 把响应**全部缓冲完**才写回（便于打日志），那在开发里没问题，但生产上
 * 会让 SSE 退化成「等任务跑完才一次性吐出」——App 侧就是「网络波动」。
 * 这里用 @hono/node-server 的 serve()，Response.body 以 ReadableStream
 * 直通底层 socket，逐块透传，流式语义与直连 forion-forge 一致。
 */
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import app from "../index";
import { startScheduler } from "./scheduler";

process.on("unhandledRejection", (reason) => {
  console.error("[orion-server] unhandledRejection (early):", reason);
});

// ---- 环境变量装载 ----
// 优先级：真实环境变量 > .env 文件。systemd 部署时用 EnvironmentFile，
// 本地跑时用 .env，方便两套环境共用同一份代码。
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const envFile = process.env.ORION_ENV_FILE ?? ".env";
if (existsSync(envFile)) {
  for (const line of readFileSync(resolve(envFile), "utf8").split("\n")) {
    const m = /^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/.exec(line);
    if (m && !process.env[m[1]]) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
}

for (const k of ["TURSO_DATABASE_URL", "JWT_SECRET", "ADMIN_TOKEN"]) {
  if (!process.env[k]) {
    console.error(`[orion-server] 缺少环境变量 ${k}（检查 ${envFile}）`);
    process.exit(1);
  }
}

const PORT = Number(process.env.PORT || 8787);
const HOST = process.env.HOST || "0.0.0.0";

// ---- 静态页（public/index.html，与 EdgeOne 的输出目录保持一致）----
// Hono app 挂的是 /api 前缀，非 /api 的路径交到这里，不会与 API 冲突。
app.get("/", (c) => c.redirect("/index.html"));
app.use("/assets/*", serveStatic({ root: "./public" }));
app.get("/index.html", serveStatic({ path: "./public/index.html" }));
// live_admin.html 是开发期从管理台抓下来的快照，方便离线排查
app.get("/live_admin.html", serveStatic({ path: "./public/live_admin.html" }));

// ---- 启动 ----
// 2026-10-11 审查修复（P0）：此前 fetch 是写死的 404 stub（整站宕机），
// startScheduler 被注释（定时任务永不执行），且引用了未导入的 Env /
// ExecutionContext 类型、package.json 缺 @hono/node-server 依赖。
// 现恢复为 app.fetch 直通 + 启动调度器。
try {
  const server = serve(
    {
      fetch: app.fetch,
      port: PORT,
      hostname: HOST,
    },
    (info) => {
      console.log(
        `[orion-server] listening on http://${info.address}:${info.port}`,
      );
      startScheduler();
    },
  );

  // ---- 优雅退出 ----
  const shutdown = (signal: string) => {
    console.log(`[orion-server] 收到 ${signal}，正在关闭...`);
    server.close(() => {
      console.log("[orion-server] 已关闭");
      process.exit(0);
    });
    // setTimeout(() => process.exit(0), 10_000).unref();
  };
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));

  process.on("unhandledRejection", (reason) => {
    console.error("[orion-server] unhandledRejection:", reason);
  });
} catch (e) {
  console.error("[orion-server] 启动阶段同步异常:", e);
  process.exit(1);
}