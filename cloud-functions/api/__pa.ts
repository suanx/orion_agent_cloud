// 二分探针 A：只静态引 hono
import { Hono } from "hono";
const app = new Hono().basePath("/api");
app.get("/__pa", (c) => c.json({ ok: true, probe: "pa-hono-only" }));
export default app;
