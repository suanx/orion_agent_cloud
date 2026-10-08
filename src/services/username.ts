import type { Client } from "@libsql/client";
import { errors } from "../utils/errors";
import { nowMs } from "../utils/crypto";
import {
  generateUsername,
  USERNAME_MAX_ATTEMPTS,
} from "../utils/register-policy";

/**
 * 账号名（`agent-` + 5 位随机数字）的分配与读取。
 *
 * 三处要用：
 * - 注册：分配一个没被占用的（撞号重掷）
 * - 登录：读取，老用户为空就当场回填
 * - 管理台：展示
 *
 * 之所以单列一个 service 而不是塞进 auth.ts，是因为 license/admin 也要用，
 * 而 auth.ts 是路由文件，被 route() 挂载后不该再被当库引用。
 */

/**
 * 分配一个未被占用的账号名。
 *
 * 随机数只有 10 万个组合，撞号概率极低但不为零 —— 不查库就 INSERT 会在
 * 撞号时直接 500（users.username 有唯一索引）。连续
 * USERNAME_MAX_ATTEMPTS 次都撞说明同前缀账号已接近饱和，与其继续空转
 * 不如直接报错，避免注册接口被拖成慢请求。
 */
export async function allocateUsername(db: Client): Promise<string> {
  for (let i = 0; i < USERNAME_MAX_ATTEMPTS; i++) {
    const candidate = generateUsername();
    const hit = await db.execute({
      sql: "SELECT 1 FROM users WHERE username = ?",
      args: [candidate],
    });
    if (hit.rows.length === 0) return candidate;
  }
  throw errors.internal("账号名生成失败，请稍后重试");
}

/**
 * 读取账号名；老用户（username 为空）当场补发一个并回写。
 *
 * 整段吞掉异常：这是展示用字段，拿不到不该影响登录主流程。
 * 典型的"拿不到"就是库还没跑 migrate、users.username 列不存在——
 * 那种情况下返回空串，App 侧回落显示 userId。
 */
export async function loadOrBackfillUsername(
  db: Client,
  userId: string
): Promise<string> {
  try {
    const r = await db.execute({
      sql: "SELECT username FROM users WHERE id = ?",
      args: [userId],
    });
    const current = String(r.rows[0]?.username ?? "").trim();
    if (current) return current;
    const fresh = await allocateUsername(db);
    await db.execute({
      sql: "UPDATE users SET username = ?, updated_at = ? WHERE id = ?",
      args: [fresh, nowMs(), userId],
    });
    return fresh;
  } catch {
    return "";
  }
}

/**
 * 只读版本：管理台列表用，不回填（批量展示不该顺带写库）。
 * 列不存在时同样安全返回空串。
 */
export async function peekUsername(db: Client, userId: string): Promise<string> {
  try {
    const r = await db.execute({
      sql: "SELECT username FROM users WHERE id = ?",
      args: [userId],
    });
    return String(r.rows[0]?.username ?? "").trim();
  } catch {
    return "";
  }
}
