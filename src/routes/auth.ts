import { Hono } from "hono";
import type { Env, Bindings } from "../env";
import { errors } from "../utils/errors";
import { hashPassword, verifyPassword, validateEmail, validatePassword } from "../utils/password";
import { sha256Hex, randomToken, uuid, nowMs } from "../utils/crypto";
import { validateRegisterEmail } from "../utils/register-policy";
import { allocateUsername, loadOrBackfillUsername } from "../services/username";
import { signJwt, accessTokenTtlSeconds } from "../utils/jwt";
import { requireAuth } from "../middleware/auth";
import { rateLimit } from "../middleware/rate-limit";
import { audit } from "../services/audit";
import { limitFor, parseLimitsOverride } from "../plans";

export const authRoutes = new Hono<Env>();

// 鉴权端点限流（2026-10-11 修复 P1 A-04）：登录/注册/刷新此前可被匿名
// 高速爆破，PBKDF2 120k 迭代还会放大服务端 CPU 消耗。窗口/上限取舍：
// 正常用户不可能一分钟登录 5 次以上。
const loginLimiter = rateLimit({ scope: "login", max: 5, windowMs: 60_000 });
const registerLimiter = rateLimit({ scope: "register", max: 3, windowMs: 60_000 });
const refreshLimiter = rateLimit({ scope: "refresh", max: 30, windowMs: 60_000 });

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
  deviceName: string,
  override: Record<string, Record<string, number>> | null = null
) {
  // 设备数上限（2026-10-11 原子化 + 可覆盖）：仅新设备计入。上限取
  // 套餐定义，并支持 PLAN_LIMITS_OVERRIDE 按 plan 覆盖（如给 lifetime
  // 放宽到 10 台）；与管理台设备管理展示的上限同源。并发下用单条
  // INSERT ... SELECT ... WHERE 保证「数量检查 + 去重」原子完成。
  const max =
    limitFor(plan as never, "max_devices", override) ||
    { free: 1, trial: 2, pro: 3, lifetime: 3 }[plan as never] ||
    1;
  const existing = await db.execute({
    sql: "SELECT 1 FROM devices WHERE user_id = ? AND device_id = ?",
    args: [userId, deviceId],
  });
  if (existing.rows.length === 0) {
    const inserted = await db.execute({
      sql: `INSERT INTO devices (user_id, device_id, device_name, activated_at, last_seen_at)
            SELECT ?, ?, ?, ?, ?
            WHERE (SELECT COUNT(*) FROM devices WHERE user_id = ?) < ?
              AND NOT EXISTS (SELECT 1 FROM devices WHERE user_id = ? AND device_id = ?)`,
      args: [userId, deviceId, deviceName, nowMs(), nowMs(), userId, max, userId, deviceId],
    });
    if (inserted.rowsAffected === 0) {
      // 区分两种失败：并发下已达上限（拒绝）vs 本设备已被并发登录插入（继续刷新）。
      const again = await db.execute({
        sql: "SELECT 1 FROM devices WHERE user_id = ? AND device_id = ?",
        args: [userId, deviceId],
      });
      if (again.rows.length === 0) {
        throw errors.forbidden(
          `当前套餐最多绑定 ${max} 台设备, 请先解绑旧设备或升级套餐`
        );
      }
    }
    return;
  }
  await db.execute({
    sql: "UPDATE devices SET last_seen_at = ?, device_name = ? WHERE user_id = ? AND device_id = ?",
    args: [nowMs(), deviceName, userId, deviceId],
  });
}

function planExpiry(plan: string, licenseExpiry: number | null): number | null {
  return plan === "lifetime" ? null : licenseExpiry;
}

/** users.username 列缺失（代码已上线但还没跑 migrate）时的可执行提示。 */
function missingUsernameColumn(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e);
  return msg.includes("no such column") && msg.includes("username");
}

// ---- POST /auth/register ----
authRoutes.post("/register", registerLimiter, async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");
  const deviceId = String(body.deviceId ?? "").trim();
  const deviceName = String(body.deviceName ?? "").slice(0, 100);

  const emailErr = validateEmail(email);
  if (emailErr) throw errors.badRequest(emailErr);
  // 域名白名单：格式合法但不在名单内 → 「邮箱不支持」。
  // 放在格式校验之后，避免把"根本不是邮箱"的输入报成"域名不支持"。
  const domainErr = validateRegisterEmail(email, c.env.REGISTER_EMAIL_DOMAINS);
  if (domainErr) throw errors.badRequest(domainErr, "email_domain_not_allowed");
  const pwdErr = validatePassword(password);
  if (pwdErr) throw errors.badRequest(pwdErr);
  if (!deviceId) throw errors.badRequest("缺少 deviceId");

  const db = c.get("db");
  const exists = await db.execute({ sql: "SELECT id FROM users WHERE email = ?", args: [email] });
  if (exists.rows.length > 0) throw errors.conflict("该邮箱已注册");

  const userId = `u_${uuid()}`;
  const username = await allocateUsername(db);
  const passwordHash = await hashPassword(password);
  try {
    await db.execute({
      sql: `INSERT INTO users (id, username, email, password_hash, plan, plan_expires_at, status, created_at, updated_at)
            VALUES (?, ?, ?, ?, 'free', NULL, 'active', ?, ?)`,
      args: [userId, username, email, passwordHash, nowMs(), nowMs()],
    });
  } catch (e) {
    if (missingUsernameColumn(e)) {
      // 不要让调用方看到裸 SQLite 报错——这是部署顺序问题，不是用户的问题。
      throw errors.internal("数据库结构未升级，请先执行 node scripts/migrate.mjs");
    }
    // 并发注册同一邮箱（2026-10-11 修复）：先 SELECT 后 INSERT 的竞态窗口
    // 会让后者撞 UNIQUE 约束抛裸错误变 500；转为 409。
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.toUpperCase().includes("UNIQUE")) {
      throw errors.conflict("该邮箱已注册");
    }
    throw e;
  }
  await touchDevice(db, userId, "free", deviceId, deviceName, parseLimitsOverride(c.env.PLAN_LIMITS_OVERRIDE));
  const refreshToken = await createSession(db, userId, deviceId, deviceName, "refresh");
  await audit(db, userId, "register", `${username} ${email}`, c.req.header("cf-connecting-ip") ?? "");

  const pair = await issueTokens(c.env, userId, "free", null, deviceId);
  return c.json({ ...pair, refreshToken, userId, username });
});

// ---- POST /auth/login ----
authRoutes.post("/login", loginLimiter, async (c) => {
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
  if (!row) {
    // 防邮箱枚举（2026-10-11）：对不存在的用户也做一次等价 PBKDF2 计算，
    // 消除「不存在用户响应明显更快」的时序差。结果丢弃。
    await hashPassword(password);
    throw errors.unauthorized("邮箱或密码错误");
  }
  if (!(await verifyPassword(password, String(row.password_hash)))) {
    throw errors.unauthorized("邮箱或密码错误");
  }
  if (String(row.status) !== "active") throw errors.forbidden("账号已被禁用");

  const userId = String(row.id);
  // 账号名单独查：users.username 是后加的列，还没跑 migrate 的库里没有它。
  // 登录是已有用户的唯一入口，这里绝不能因为缺列就让人登不进去 ——
  // 缺列时 username 留空，App 侧回落显示 userId。
  const username = await loadOrBackfillUsername(db, userId);
  await touchDevice(db, userId, String(row.plan), deviceId, deviceName, parseLimitsOverride(c.env.PLAN_LIMITS_OVERRIDE));
  const refreshToken = await createSession(db, userId, deviceId, deviceName, "refresh");
  await audit(db, userId, "login", deviceId, c.req.header("cf-connecting-ip") ?? "");

  const pair = await issueTokens(c.env, userId, String(row.plan), planExpiry(String(row.plan), row.plan_expires_at as number | null), deviceId);
  return c.json({ ...pair, refreshToken, userId, username });
});

// ---- POST /auth/refresh (轮换) ----
authRoutes.post("/refresh", refreshLimiter, async (c) => {
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
