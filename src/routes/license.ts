import { Hono } from "hono";
import type { Env } from "../env";
import { errors } from "../utils/errors";
import { nowMs } from "../utils/crypto";
import { requireAuth } from "../middleware/auth";
import { normalizeCode, applyLicense, type LicensePlan } from "../services/licenses";
import { getUsage } from "../services/quota";
import { audit } from "../services/audit";

export const licenseRoutes = new Hono<Env>();

// ---- POST /license/activate { code } ----
licenseRoutes.post("/activate", requireAuth, async (c) => {
  const user = c.get("user");
  const body = await c.req.json().catch(() => ({}));
  const code = normalizeCode(String(body.code ?? ""));
  if (!/^ORION(-[A-Z0-9]{4}){4}$/.test(code)) throw errors.badRequest("卡密格式不正确");

  const db = c.get("db");
  const r = await db.execute({
    sql: "SELECT code, plan, duration_days, bound_user_id, status FROM licenses WHERE code = ?",
    args: [code],
  });
  const lic = r.rows[0];
  if (!lic) throw errors.notFound("卡密不存在");
  if (String(lic.status) === "revoked") throw errors.forbidden("卡密已被作废");
  if (lic.bound_user_id !== null && String(lic.bound_user_id) !== user.userId) {
    throw errors.conflict("卡密已被其他账号绑定");
  }

  const curPlanRow = await db.execute({
    sql: "SELECT plan, plan_expires_at FROM users WHERE id = ?",
    args: [user.userId],
  });
  const cur = curPlanRow.rows[0];
  const applied = applyLicense(
    String(cur?.plan ?? "free"),
    (cur?.plan_expires_at as number | null) ?? null,
    String(lic.plan) as LicensePlan,
    Number(lic.duration_days)
  );

  // 原子绑定: 仅当 status 未被并发改变时生效
  const upd = await db.execute({
    sql: `UPDATE licenses SET bound_user_id = ?, bound_at = ?, status = 'used'
          WHERE code = ? AND status = 'unused'`,
    args: [user.userId, nowMs(), code],
  });
  if (lic.bound_user_id === null && upd.rowsAffected === 0) {
    throw errors.conflict("卡密绑定冲突, 请重试");
  }

  await db.execute({
    sql: "UPDATE users SET plan = ?, plan_expires_at = ?, updated_at = ? WHERE id = ?",
    args: [applied.plan, applied.expiresAt, nowMs(), user.userId],
  });
  await audit(db, user.userId, "activate", `${code} -> ${applied.plan}`, c.req.header("cf-connecting-ip") ?? "");

  return c.json({
    ok: true,
    plan: applied.plan,
    planExpiresAt: applied.expiresAt,
    message: applied.expiresAt === null ? "已激活永久授权" : `已激活, 有效期至 ${new Date(applied.expiresAt).toISOString()}`,
  });
});

// ---- GET /license/status ----
licenseRoutes.get("/status", requireAuth, async (c) => {
  const user = c.get("user");
  const db = c.get("db");
  const usage = {
    relay_search: await getUsage(db, user.userId, "relay_search"),
    relay_fetch: await getUsage(db, user.userId, "relay_fetch"),
    task_run: await getUsage(db, user.userId, "task_run"),
  };
  const licenses = await db.execute({
    sql: "SELECT code, plan, duration_days, bound_at FROM licenses WHERE bound_user_id = ? ORDER BY bound_at",
    args: [user.userId],
  });
  return c.json({
    userId: user.userId,
    plan: user.plan,
    planExpiresAt: user.planExpiresAt,
    usageToday: usage,
    licenses: licenses.rows.map((row) => ({
      code: row.code,
      plan: row.plan,
      durationDays: row.duration_days,
      boundAt: row.bound_at,
    })),
  });
});
