import { Hono } from "hono";
import type { Env } from "../env";
import { errors } from "../utils/errors";
import { nowMs } from "../utils/crypto";
import { requireAdmin } from "../middleware/auth";
import { applyPlanGrant, validateAccountPlan } from "../services/account_plans";
import { audit } from "../services/audit";

export const adminRoutes = new Hono<Env>();

adminRoutes.use("*", requireAdmin);

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

// ---- POST /admin/users/:id/plan { plan, durationDays, mode } ----
// 账号授权：直接设置/顺延套餐（取代卡密激活）。
adminRoutes.post("/users/:id/plan", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json().catch(() => ({}));
  const plan = validateAccountPlan(String(body.plan ?? ""));
  const durationDays = Number(body.durationDays ?? 0);
  const mode = body.mode === "extend" ? "extend" : "set";

  const db = c.get("db");
  const cur = await db.execute({
    sql: "SELECT plan, plan_expires_at FROM users WHERE id = ?",
    args: [id],
  });
  const row = cur.rows[0];
  if (!row) throw errors.notFound("用户不存在");

  const applied = applyPlanGrant(
    String(row.plan ?? "free"),
    (row.plan_expires_at as number | null) ?? null,
    plan,
    durationDays,
    mode as "set" | "extend"
  );

  await db.execute({
    sql: "UPDATE users SET plan = ?, plan_expires_at = ?, updated_at = ? WHERE id = ?",
    args: [applied.plan, applied.expiresAt, nowMs(), id],
  });
  await audit(db, id, "plan_grant", `${mode} ${plan} ${durationDays}d`, c.req.header("cf-connecting-ip") ?? "");

  return c.json({
    ok: true,
    plan: applied.plan,
    planExpiresAt: applied.expiresAt,
    message:
      applied.expiresAt === null
        ? applied.plan === "free"
          ? "已撤销授权（free）"
          : "已设为永久授权"
        : `已授权至 ${new Date(applied.expiresAt).toISOString()}`,
  });
});

// ---- 公告（弹窗公告）----

// ---- GET /admin/announcements ----
adminRoutes.get("/announcements", async (c) => {
  const db = c.get("db");
  const r = await db.execute(
    "SELECT id, title, content, enabled, min_version, max_version, created_at, updated_at FROM announcements ORDER BY updated_at DESC LIMIT 200"
  );
  return c.json({ announcements: r.rows });
});

// ---- POST /admin/announcements { id?, title, content, enabled, minVersion?, maxVersion? } ----
// 带 id 为更新, 不带为新建。
adminRoutes.post("/announcements", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const title = String(body.title ?? "").trim();
  const content = String(body.content ?? "").trim();
  if (!title || !content) throw errors.badRequest("title 与 content 不能为空");
  const minVersion = String(body.minVersion ?? "").trim();
  const maxVersion = String(body.maxVersion ?? "").trim();
  const enabled = body.enabled === false ? 0 : 1;
  const db = c.get("db");
  const now = nowMs();

  if (body.id) {
    const r = await db.execute({
      sql: `UPDATE announcements SET title = ?, content = ?, enabled = ?, min_version = ?, max_version = ?, updated_at = ?
            WHERE id = ?`,
      args: [title, content, enabled, minVersion, maxVersion, now, String(body.id)],
    });
    if (r.rowsAffected === 0) throw errors.notFound("公告不存在");
    await audit(db, null, "announcement_update", String(body.id), "");
    return c.json({ ok: true, id: String(body.id) });
  }

  const id = `a_${crypto.randomUUID()}`;
  await db.execute({
    sql: "INSERT INTO announcements (id, title, content, enabled, min_version, max_version, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    args: [id, title, content, enabled, minVersion, maxVersion, now, now],
  });
  await audit(db, null, "announcement_create", id, "");
  return c.json({ ok: true, id });
});

// ---- POST /admin/announcements/:id/toggle ----
adminRoutes.post("/announcements/:id/toggle", async (c) => {
  const id = c.req.param("id");
  const db = c.get("db");
  await db.execute({
    sql: "UPDATE announcements SET enabled = CASE WHEN enabled = 1 THEN 0 ELSE 1 END, updated_at = ? WHERE id = ?",
    args: [nowMs(), id],
  });
  await audit(db, null, "announcement_toggle", id, "");
  return c.json({ ok: true });
});

// ---- DELETE /admin/announcements/:id ----
adminRoutes.delete("/announcements/:id", async (c) => {
  const id = c.req.param("id");
  const db = c.get("db");
  await db.execute({ sql: "DELETE FROM announcements WHERE id = ?", args: [id] });
  await audit(db, null, "announcement_delete", id, "");
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
