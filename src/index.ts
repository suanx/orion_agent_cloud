import { Hono } from "hono";
import type { Env } from "./env";
import { getDb } from "./db/client";
import { ApiError, errors } from "./utils/errors";
import { authRoutes } from "./routes/auth";
import { licenseRoutes } from "./routes/license";
import { relayRoutes } from "./routes/relay";
import { taskRoutes } from "./routes/tasks";
import { updateRoutes } from "./routes/update";
import { mcpRoutes } from "./routes/mcp";
import { adminRoutes } from "./routes/admin";
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
    endpoints: ["/auth", "/license", "/relay", "/tasks", "/mcp", "/update", "/admin"],
  })
);

app.route("/auth", authRoutes);
app.route("/license", licenseRoutes);
app.route("/relay", relayRoutes);
app.route("/tasks", taskRoutes);
app.route("/update", updateRoutes);
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
