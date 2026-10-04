import type { Client, InValue } from "@libsql/client";
import { quotaDate, limitFor, type PlanLimits } from "../plans";
import { errors } from "../utils/errors";

/**
 * 配额检查 + 原子自增。
 * 用 UPSERT 单语句原子自增, 避免读-改-写竞态;
 * 先读当前值判断是否超限(存在极小竞态窗口, 配额场景可接受)。
 */
export async function consumeQuota(
  db: Client,
  userId: string,
  plan: string,
  feature: string,
  override: Record<string, PlanLimits> | null
): Promise<{ used: number; limit: number }> {
  const limit = limitFor(plan as never, feature, override);
  const date = quotaDate();

  const current = await db.execute({
    sql: "SELECT count FROM usage_daily WHERE user_id = ? AND date = ? AND feature = ?",
    args: [userId, date, feature],
  });
  const used = Number(current.rows[0]?.count ?? 0);
  if (limit <= 0 || used >= limit) {
    throw errors.quota(`「${feature}」今日额度已用尽 (${used}/${limit})`);
  }

  await db.execute({
    sql: `INSERT INTO usage_daily (user_id, date, feature, count) VALUES (?, ?, ?, 1)
          ON CONFLICT(user_id, date, feature) DO UPDATE SET count = count + 1`,
    args: [userId, date, feature],
  });
  return { used: used + 1, limit };
}

/** 只读查询(管理台/状态页用), 不消耗配额。 */
export async function getUsage(
  db: Client,
  userId: string,
  feature: string
): Promise<number> {
  const r = await db.execute({
    sql: "SELECT count FROM usage_daily WHERE user_id = ? AND date = ? AND feature = ?",
    args: [userId, quotaDate(), feature] as InValue[],
  });
  return Number(r.rows[0]?.count ?? 0);
}
