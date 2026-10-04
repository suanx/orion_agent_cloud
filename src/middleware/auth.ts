import type { Context, Next } from "hono";
import type { Env } from "../env";
import { verifyJwt } from "../utils/jwt";
import { errors } from "../utils/errors";
import { sha256Hex, nowMs } from "../utils/crypto";
import { assertPlan } from "../plans";
import type { Client } from "@libsql/client";

export interface AuthedUser {
  userId: string;
  plan: string;
  deviceId: string;
  kind: "jwt" | "device"; // device = 长期设备令牌(MCP 用)
  planExpiresAt: number | null;
}

declare module "hono" {
  interface ContextVariableMap {
    db: Client;
    user: AuthedUser;
  }
}

function bearer(c: Context): string | null {
  const h = c.req.header("authorization");
  if (!h) return null;
  const m = /^Bearer\s+(.+)$/i.exec(h.trim());
  return m ? m[1].trim() : null;
}

async function userRow(db: Client, userId: string) {
  const r = await db.execute({
    sql: "SELECT id, plan, plan_expires_at, status FROM users WHERE id = ?",
    args: [userId],
  });
  return r.rows[0] ?? null;
}

/** 计划过期检查: 过期降级为 free (trial/pro 有期限, lifetime 无)。 */
function effectivePlan(plan: string, expiresAt: number | null): string {
  if (expiresAt === null) return plan; // free / lifetime
  return expiresAt > nowMs() ? plan : "free";
}

/**
 * 鉴权中间件: 接受两种凭据
 *  1. JWT (Bearer eyJ...)      — App 业务接口
 *  2. 设备令牌 (Bearer dt_...) — 长期令牌, MCP 端点用(orion 的 MCP 配置无 OAuth 流程)
 */
export async function requireAuth(c: Context<Env>, next: Next) {
  const token = bearer(c);
  if (!token) throw errors.unauthorized();

  const db = c.get("db");
  const env = c.env;
  let user: AuthedUser;

  if (token.startsWith("dt_")) {
    const hash = await sha256Hex(token);
    const r = await db.execute({
      sql: `SELECT s.user_id, s.device_id, u.plan, u.plan_expires_at, u.status
            FROM sessions s JOIN users u ON u.id = s.user_id
            WHERE s.token_hash = ? AND s.kind = 'device' AND s.revoked = 0`,
      args: [hash],
    });
    const row = r.rows[0];
    if (!row) throw errors.unauthorized("设备令牌无效或已吊销");
    if (String(row.status) !== "active") throw errors.forbidden("账号已被禁用");
    user = {
      userId: String(row.user_id),
      plan: effectivePlan(String(row.plan), row.plan_expires_at as number | null),
      deviceId: String(row.device_id),
      kind: "device",
      planExpiresAt: (row.plan_expires_at as number | null) ?? null,
    };
    await db.execute({
      sql: "UPDATE sessions SET last_used_at = ? WHERE token_hash = ?",
      args: [nowMs(), hash],
    });
  } else {
    const result = await verifyJwt(token, env.JWT_SECRET);
    if (!result.ok) {
      throw errors.unauthorized(
        result.reason === "expired" ? "登录已过期, 请重新登录" : "令牌无效"
      );
    }
    const row = await userRow(db, result.payload.sub);
    if (!row) throw errors.unauthorized("账号不存在");
    if (String(row.status) !== "active") throw errors.forbidden("账号已被禁用");
    user = {
      userId: result.payload.sub,
      plan: effectivePlan(String(row.plan), (row.plan_expires_at as number | null) ?? null),
      deviceId: result.payload.did ?? "",
      kind: "jwt",
      planExpiresAt: (row.plan_expires_at as number | null) ?? null,
    };
  }

  assertPlan(user.plan); // 防御性校验: plan 字段必须合法
  c.set("user", user);
  await next();
}

/** 管理员鉴权: 独立令牌, 不走用户体系。 */
export async function requireAdmin(c: Context<Env>, next: Next) {
  const token = bearer(c);
  if (!token || token !== c.env.ADMIN_TOKEN) {
    throw errors.unauthorized("管理员令牌无效");
  }
  await next();
}
