import { Hono } from "hono";
import type { Env } from "./env";
import { getDb } from "./db/client";
import { ApiError, errors } from "./utils/errors";
import { authRoutes } from "./routes/auth";
import { licenseRoutes } from "./routes/license";
import { relayRoutes } from "./routes/relay";
import { taskRoutes } from "./routes/tasks";
import { updateRoutes } from "./routes/update";
import { announcementRoutes } from "./routes/announcement";
import { backupRoutes } from "./routes/backup";
import { syncRoutes } from "./routes/sync";
import { mcpRoutes } from "./routes/mcp";
import { adminRoutes } from "./routes/admin";
import { adminHtml } from "./ui/admin_html";
import { requireAuth } from "./middleware/auth";

// 全部路由挂在 /api 前缀下：EdgeOne 函数文件是 functions/api/[[route]].ts，
// 只有 /api/* 会进入函数且带着前缀原样到达这里——此前路由挂在根路径，
// /api/auth/* 等全部 404（云端功能在线上从未真正通过，被 App 的静默降级掩盖，
// 2026-10-08 本地部署实测复现后修复）。
const app = new Hono<Env>().basePath("/api");

// 每请求新建 Turso HTTP 客户端
app.use("*", async (c, next) => {
  // basePath("/api") 后 c.req.path 带 /api 前缀(此前写 "/update" 永不匹配,
  // 版本检查也被迫建库连接——2026-10-08 修正)
  if (c.req.path.startsWith("/api/update")) return next(); // 版本检查无需数据库
  c.set("db", await getDb(c.env));
  await next();
});

app.get("/", (c) =>
  c.json({
    service: "orion-backend",
    version: "0.1.0",
    endpoints: [
      "/api/auth", "/api/license", "/api/relay", "/api/tasks", "/api/mcp",
      "/api/update", "/api/announcement", "/api/backup", "/api/sync", "/api/admin",
    ],
  })
);

// 管理台 UI(单页, 无需鉴权——数据接口全部要求 ADMIN_TOKEN)。
// 必须先于 adminRoutes 注册, 否则会被管理 API 的鉴权中间件拦下;
// adminRoutes 的子路径(/api/admin/users 等)不受影响。
app.get("/admin", (c) =>
  c.html(adminHtml(), 200, {
    "cache-control": "no-store",
  })
);

app.route("/auth", authRoutes);
app.route("/license", licenseRoutes);
app.route("/relay", relayRoutes);
app.route("/tasks", taskRoutes);
app.route("/update", updateRoutes);
app.route("/announcement", announcementRoutes);
app.route("/backup", backupRoutes);
app.route("/sync", syncRoutes);
app.route("/mcp", mcpRoutes);
app.route("/admin", adminRoutes);

// 健康检查(带鉴权, 验证整条链路: JWT -> Turso)
app.get("/health", requireAuth, (c) => c.json({ ok: true, user: c.get("user").userId, plan: c.get("user").plan }));

// 404
app.notFound((c) => {
  const e = errors.notFound("端点不存在");
  return c.json({ error: { code: e.code, message: e.message } }, 404);
});

// 统一错误处理
app.onError((err, c) => {
  if (err instanceof ApiError) {
    return c.json({ error: { code: err.code, message: err.message } }, err.status as never);
  }
  console.error("[orion-backend] unhandled:", err);
  const e = errors.internal();
  // 排障开关: DEBUG_ERRORS=true 时 500 响应附带原始错误与堆栈(定位边缘运行时与
  // 本地行为差异时开启)。默认关闭, 避免线上暴露内部细节。
  if (c.env.DEBUG_ERRORS === "true") {
    return c.json(
      {
        error: {
          code: e.code,
          message: `${err.name}: ${err.message}`,
          stack: String((err as Error).stack ?? "").split("\n").slice(0, 4).join(" | "),
        },
      },
      500
    );
  }
  return c.json({ error: { code: e.code, message: e.message } }, 500);
});

export default app;
