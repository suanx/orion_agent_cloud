import { Hono } from "hono";
import type { Env, Bindings } from "../env";
import { errors } from "../utils/errors";
import { hashPassword, verifyPassword, validateEmail, validatePassword } from "../utils/password";
import { sha256Hex, randomToken, uuid, nowMs } from "../utils/crypto";
import { signJwt, accessTokenTtlSeconds } from "../utils/jwt";
import { requireAuth } from "../middleware/auth";
import { audit } from "../services/audit";

export const authRoutes = new Hono<Env>();

const REFRESH_TTL = 30 * 24 * 3600 * 1000; // 30 天

interface TokenPayload {
  accessToken: string;
  expiresIn: number;
  plan: string;
  planExpiresAt: number | null;
}

async function issueTokens(
  env: Bindings,
  userId: string,
  plan: string,
  planExpiresAt: number | null,
  deviceId: string
): Promise<TokenPayload> {
  const accessToken = await signJwt(
    { sub: userId, plan, exp: Math.floor(nowMs() / 1000) + accessTokenTtlSeconds(), did: deviceId },
    env.JWT_SECRET
  );
  return { accessToken, expiresIn: accessTokenTtlSeconds(), plan, planExpiresAt };
}

async function createSession(
  db: import("@libsql/client").Client,
  userId: string,
  deviceId: string,
  deviceName: string,
  kind: "refresh" | "device"
): Promise<string> {
  const raw = kind === "device" ? `dt_${randomToken()}` : `rt_${randomToken()}`;
  const hash = await sha256Hex(raw);
  await db.execute({
    sql: `INSERT INTO sessions (token_hash, user_id, kind, device_id, device_name, expires_at, created_at, last_used_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [hash, userId, kind, deviceId, deviceName, kind === "device" ? null : nowMs() + REFRESH_TTL, nowMs(), nowMs()],
  });
  // 刷新令牌轮换: 清掉同设备旧 refresh
  if (kind === "refresh") {
    await db.execute({
      sql: "UPDATE sessions SET revoked = 1 WHERE user_id = ? AND device_id = ? AND kind = 'refresh' AND token_hash != ?",
      args: [userId, deviceId, hash],
    });
  }
  return raw;
}

async function touchDevice(
  db: import("@libsql/client").Client,
  userId: string,
  plan: string,
  deviceId: string,
  deviceName: string
) {
  // 设备数上限: 仅新设备计入; 达到上限拒绝绑定(升级套餐可放宽)
  const existing = await db.execute({
    sql: "SELECT 1 FROM devices WHERE user_id = ? AND device_id = ?",
    args: [userId, deviceId],
  });
  if (existing.rows.length === 0) {
    const MAX_DEVICES: Record<string, number> = { free: 1, trial: 2, pro: 3, lifetime: 3 };
    const count = await db.execute({
      sql: "SELECT COUNT(*) AS n FROM devices WHERE user_id = ?",
      args: [userId],
    });
    if (Number(count.rows[0]?.n ?? 0) >= (MAX_DEVICES[plan] ?? 1)) {
      throw errors.forbidden(
        `当前套餐最多绑定 ${MAX_DEVICES[plan] ?? 1} 台设备, 请先解绑旧设备或升级套餐`
      );
    }
  }
  await db.execute({
    sql: `INSERT INTO devices (user_id, device_id, device_name, activated_at, last_seen_at)
          VALUES (?, ?, ?, ?, ?)
          ON CONFLICT(user_id, device_id) DO UPDATE SET last_seen_at = excluded.last_seen_at`,
    args: [userId, deviceId, deviceName, nowMs(), nowMs()],
  });
}

function planExpiry(plan: string, licenseExpiry: number | null): number | null {
  return plan === "lifetime" ? null : licenseExpiry;
}

// ---- POST /auth/register ----
authRoutes.post("/register", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");
  const deviceId = String(body.deviceId ?? "").trim();
  const deviceName = String(body.deviceName ?? "").slice(0, 100);

  const emailErr = validateEmail(email);
  if (emailErr) throw errors.badRequest(emailErr);
  const pwdErr = validatePassword(password);
  if (pwdErr) throw errors.badRequest(pwdErr);
  if (!deviceId) throw errors.badRequest("缺少 deviceId");

  const db = c.get("db");
  const exists = await db.execute({ sql: "SELECT id FROM users WHERE email = ?", args: [email] });
  if (exists.rows.length > 0) throw errors.conflict("该邮箱已注册");

  const userId = `u_${uuid()}`;
  const passwordHash = await hashPassword(password);
  await db.execute({
    sql: `INSERT INTO users (id, email, password_hash, plan, plan_expires_at, status, created_at, updated_at)
          VALUES (?, ?, ?, 'free', NULL, 'active', ?, ?)`,
    args: [userId, email, passwordHash, nowMs(), nowMs()],
  });
  await touchDevice(db, userId, "free", deviceId, deviceName);
  const refreshToken = await createSession(db, userId, deviceId, deviceName, "refresh");
  await audit(db, userId, "register", email, c.req.header("cf-connecting-ip") ?? "");

  const pair = await issueTokens(c.env, userId, "free", null, deviceId);
  return c.json({ ...pair, refreshToken, userId });
});

// ---- POST /auth/login ----
authRoutes.post("/login", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");
  const deviceId = String(body.deviceId ?? "").trim();
  const deviceName = String(body.deviceName ?? "").slice(0, 100);
  if (!email || !password || !deviceId) throw errors.badRequest("缺少 email/password/deviceId");

  const db = c.get("db");
  const r = await db.execute({
    sql: "SELECT id, password_hash, plan, plan_expires_at, status FROM users WHERE email = ?",
    args: [email],
  });
  const row = r.rows[0];
  if (!row || !(await verifyPassword(password, String(row.password_hash)))) {
    throw errors.unauthorized("邮箱或密码错误");
  }
  if (String(row.status) !== "active") throw errors.forbidden("账号已被禁用");

  const userId = String(row.id);
  await touchDevice(db, userId, String(row.plan), deviceId, deviceName);
  const refreshToken = await createSession(db, userId, deviceId, deviceName, "refresh");
  await audit(db, userId, "login", deviceId, c.req.header("cf-connecting-ip") ?? "");

  const pair = await issueTokens(c.env, userId, String(row.plan), planExpiry(String(row.plan), row.plan_expires_at as number | null), deviceId);
  return c.json({ ...pair, refreshToken, userId });
});

// ---- POST /auth/refresh (轮换) ----
authRoutes.post("/refresh", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const refreshToken = String(body.refreshToken ?? "");
  if (!refreshToken.startsWith("rt_")) throw errors.unauthorized("令牌格式错误");

  const db = c.get("db");
  const hash = await sha256Hex(refreshToken);
  const r = await db.execute({
    sql: `SELECT s.user_id, s.device_id, s.device_name, s.expires_at, u.plan, u.plan_expires_at, u.status
          FROM sessions s JOIN users u ON u.id = s.user_id
          WHERE s.token_hash = ? AND s.kind = 'refresh' AND s.revoked = 0`,
    args: [hash],
  });
  const row = r.rows[0];
  if (!row) throw errors.unauthorized("刷新令牌无效");
  if (row.expires_at !== null && Number(row.expires_at) < nowMs()) {
    throw errors.unauthorized("刷新令牌已过期, 请重新登录");
  }
  if (String(row.status) !== "active") throw errors.forbidden("账号已被禁用");

  const userId = String(row.user_id);
  const deviceId = String(row.device_id);
  await db.execute({ sql: "UPDATE sessions SET revoked = 1 WHERE token_hash = ?", args: [hash] });
  const newRefresh = await createSession(db, userId, deviceId, String(row.device_name), "refresh");

  const plan = String(row.plan);
  const pair = await issueTokens(c.env, userId, plan, planExpiry(plan, row.plan_expires_at as number | null), deviceId);
  return c.json({ ...pair, refreshToken: newRefresh, userId });
});

// ---- POST /auth/logout ----
authRoutes.post("/logout", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const refreshToken = String(body.refreshToken ?? "");
  if (refreshToken.startsWith("rt_")) {
    const db = c.get("db");
    await db.execute({
      sql: "UPDATE sessions SET revoked = 1 WHERE token_hash = ? AND kind = 'refresh'",
      args: [await sha256Hex(refreshToken)],
    });
  }
  return c.json({ ok: true });
});

// ---- GET /auth/devices ----
authRoutes.get("/devices", requireAuth, async (c) => {
  const db = c.get("db");
  const r = await db.execute({
    sql: `SELECT d.device_id, d.device_name, d.activated_at, d.last_seen_at,
                 (SELECT COUNT(*) FROM sessions s WHERE s.user_id = d.user_id AND s.device_id = d.device_id AND s.revoked = 0) AS active_sessions
          FROM devices d WHERE d.user_id = ? ORDER BY d.activated_at`,
    args: [c.get("user").userId],
  });
  return c.json({
    devices: r.rows.map((row) => ({
      deviceId: row.device_id,
      deviceName: row.device_name,
      activatedAt: row.activated_at,
      lastSeenAt: row.last_seen_at,
      activeSessions: Number(row.active_sessions),
      current: row.device_id === c.get("user").deviceId,
    })),
  });
});

// ---- DELETE /auth/devices/:deviceId (解绑) ----
authRoutes.delete("/devices/:deviceId", requireAuth, async (c) => {
  const target = String(c.req.param("deviceId") ?? "");
  const user = c.get("user");
  if (target === user.deviceId && user.kind === "jwt") {
    throw errors.badRequest("不能解绑当前设备, 请先用目标设备操作或走换机流程");
  }
  const db = c.get("db");
  const r = await db.execute({
    sql: "DELETE FROM devices WHERE user_id = ? AND device_id = ?",
    args: [user.userId, target],
  });
  if (r.rowsAffected === 0) throw errors.notFound("设备不存在");
  await db.execute({
    sql: "UPDATE sessions SET revoked = 1 WHERE user_id = ? AND device_id = ?",
    args: [user.userId, target],
  });
  await audit(db, user.userId, "unbind", target, c.req.header("cf-connecting-ip") ?? "");
  return c.json({ ok: true });
});

// ---- POST /auth/device-token (换长期设备令牌, 供 MCP 配置) ----
authRoutes.post("/device-token", requireAuth, async (c) => {
  const user = c.get("user");
  const body = await c.req.json().catch(() => ({}));
  const deviceId = String(body.deviceId ?? user.deviceId ?? "").trim();
  if (!deviceId) throw errors.badRequest("缺少 deviceId");
  const db = c.get("db");
  const token = await createSession(db, user.userId, deviceId, String(body.deviceName ?? ""), "device");
  await audit(db, user.userId, "device_token_issued", deviceId, "");
  return c.json({ deviceToken: token, note: "请妥善保存, 仅可在设备管理中吊销" });
});
