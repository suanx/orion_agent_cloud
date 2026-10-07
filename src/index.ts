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
import { mcpRoutes } from "./routes/mcp";
import { adminRoutes } from "./routes/admin";
import { adminHtml } from "./ui/admin_html";
import { requireAuth } from "./middleware/auth";

const app = new Hono<Env>();

// 每请求新建 Turso HTTP 客户端
app.use("*", async (c, next) => {
  if (c.req.path.startsWith("/update")) return next(); // 版本检查无需数据库
  c.set("db", getDb(c.env));
  await next();
});

app.get("/", (c) =>
  c.json({
    service: "orion-backend",
    version: "0.1.0",
    endpoints: ["/auth", "/license", "/relay", "/tasks", "/mcp", "/update", "/announcement", "/admin"],
  })
);

// 管理台 UI(单页, 无需鉴权——数据接口全部要求 ADMIN_TOKEN)。
// 必须先于 app.route("/admin", adminRoutes) 注册, 否则会被管理 API 的
// 鉴权中间件拦下; adminRoutes 的子路径(/admin/licenses 等)不受影响。
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
  return c.json({ error: { code: e.code, message: e.message } }, 500);
});

export default app;
