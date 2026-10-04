import { Hono } from "hono";
import type { Env } from "../env";
import { errors } from "../utils/errors";
import { nowMs } from "../utils/crypto";
import { requireAdmin } from "../middleware/auth";
import { generateCode, validatePlan } from "../services/licenses";
import { audit } from "../services/audit";

export const adminRoutes = new Hono<Env>();

adminRoutes.use("*", requireAdmin);

// ---- POST /admin/licenses/generate { plan, durationDays, count, batch } ----
adminRoutes.post("/licenses/generate", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const plan = validatePlan(String(body.plan ?? ""));
  const durationDays = Number(body.durationDays ?? 0);
  const count = Math.min(Math.max(Number(body.count ?? 1), 1), 500);
  const batch = String(body.batch ?? `batch-${nowMs()}`);
  if (plan !== "lifetime" && durationDays <= 0) {
    throw errors.badRequest("非永久套餐必须指定 durationDays");
  }

  const db = c.get("db");
  const codes: string[] = [];
  // count 上限 500, 循环内查重即可
  for (let i = 0; i < count; i++) {
    let code = generateCode();
    // 极小概率冲突, 重试几次
    for (let attempt = 0; attempt < 5; attempt++) {
      const dup = await db.execute({ sql: "SELECT 1 FROM licenses WHERE code = ?", args: [code] });
      if (dup.rows.length === 0) break;
      code = generateCode();
    }
    codes.push(code);
  }
  await db.batch(
    codes.map((code) => ({
      sql: "INSERT INTO licenses (code, plan, duration_days, batch, status, created_at) VALUES (?, ?, ?, ?, 'unused', ?)",
      args: [code, plan, durationDays, batch, nowMs()],
    }))
  );
  return c.json({ ok: true, batch, plan, durationDays, count, codes });
});

// ---- GET /admin/licenses?batch=&status= ----
adminRoutes.get("/licenses", async (c) => {
  const batch = c.req.query("batch");
  const status = c.req.query("status");
  const clauses: string[] = [];
  const args: unknown[] = [];
  if (batch) { clauses.push("batch = ?"); args.push(batch); }
  if (status) { clauses.push("status = ?"); args.push(status); }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const db = c.get("db");
  const r = await db.execute({
    sql: `SELECT code, plan, duration_days, batch, status, bound_user_id, bound_at, created_at
          FROM licenses ${where} ORDER BY created_at DESC LIMIT 1000`,
    args: args as never[],
  });
  return c.json({ licenses: r.rows });
});

// ---- POST /admin/licenses/:code/revoke ----
adminRoutes.post("/licenses/:code/revoke", async (c) => {
  const code = c.req.param("code").toUpperCase();
  const db = c.get("db");
  const r = await db.execute({
    sql: "UPDATE licenses SET status = 'revoked' WHERE code = ?",
    args: [code],
  });
  if (r.rowsAffected === 0) throw errors.notFound("卡密不存在");
  return c.json({ ok: true });
});

// ---- GET /admin/users ----
adminRoutes.get("/users", async (c) => {
  const db = c.get("db");
  const r = await db.execute({
    sql: `SELECT u.id, u.email, u.plan, u.plan_expires_at, u.status, u.created_at,
                 (SELECT COUNT(*) FROM devices d WHERE d.user_id = u.id) AS device_count
          FROM users u ORDER BY u.created_at DESC LIMIT 500`,
  });
  return c.json({ users: r.rows });
});

// ---- POST /admin/users/:id/ban | unban ----
adminRoutes.post("/users/:id/:action(ban|unban)", async (c) => {
  const id = c.req.param("id");
  const ban = c.req.param("action") === "ban";
  const db = c.get("db");
  const r = await db.execute({
    sql: "UPDATE users SET status = ?, updated_at = ? WHERE id = ?",
    args: [ban ? "banned" : "active", nowMs(), id],
  });
  if (r.rowsAffected === 0) throw errors.notFound("用户不存在");
  if (ban) {
    await db.execute({ sql: "UPDATE sessions SET revoked = 1 WHERE user_id = ?", args: [id] });
  }
  await audit(db, id, ban ? "banned" : "unbanned", "", "");
  return c.json({ ok: true });
});

// ---- GET /admin/usage?uid=&date= ----
adminRoutes.get("/usage", async (c) => {
  const uid = c.req.query("uid");
  const date = c.req.query("date");
  const db = c.get("db");
  if (uid) {
    const r = await db.execute({
      sql: "SELECT date, feature, count FROM usage_daily WHERE user_id = ? ORDER BY date DESC LIMIT 200",
      args: [uid],
    });
    return c.json({ usage: r.rows });
  }
  const r = date
    ? await db.execute({ sql: "SELECT user_id, feature, count FROM usage_daily WHERE date = ?", args: [date] })
    : await db.execute({ sql: "SELECT user_id, date, feature, count FROM usage_daily ORDER BY date DESC LIMIT 500" });
  return c.json({ usage: r.rows });
});

// ---- GET /admin/audit ----
adminRoutes.get("/audit", async (c) => {
  const db = c.get("db");
  const r = await db.execute({
    sql: "SELECT user_id, action, detail, ip, at FROM audit_log ORDER BY at DESC LIMIT 500",
  });
  return c.json({ audit: r.rows });
});
