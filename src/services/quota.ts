import type { Client, InValue } from "@libsql/client";
import {
  quotaDate,
  limitFor,
  msUntilWeekReset,
  weekStartDate,
  weeklyTierOf,
  WEEKLY_LIMITS,
  type PlanLimits,
} from "../plans";
import { errors } from "../utils/errors";

/**
 * 配额检查 + 原子自增。
 * 用 UPSERT 单语句原子自增, 避免读-改-写竞态;
 * 先读当前值判断是否超限(存在极小竞态窗口, 配额场景可接受)。
 */
/**
 * 消耗日配额（2026-10-11 原子化，与周配额同款方案）：
 * UPSERT 的 DO UPDATE 带 WHERE count < limit，超限时 rowsAffected=0
 * → 拒绝。消除旧「先读后写」的竞态窗口。
 */
export async function consumeQuota(
  db: Client,
  userId: string,
  plan: string,
  feature: string,
  override: Record<string, PlanLimits> | null
): Promise<{ used: number; limit: number }> {
  const limit = limitFor(plan as never, feature, override);
  if (limit <= 0) {
    throw errors.quota(`当前套餐不支持「${feature}」`);
  }
  const date = quotaDate();
  const r = await db.execute({
    sql: `INSERT INTO usage_daily (user_id, date, feature, count) VALUES (?, ?, ?, 1)
          ON CONFLICT(user_id, date, feature) DO UPDATE SET count = count + 1
          WHERE usage_daily.count < ?
          RETURNING count`,
    args: [userId, date, feature, limit] as InValue[],
  });
  if (r.rowsAffected === 0 || r.rows.length === 0) {
    const current = await getUsage(db, userId, feature);
    throw errors.quota(`「${feature}」今日额度已用尽 (${Math.max(current, limit)}/${limit})`);
  }
  const used = Number(r.rows[0]?.count ?? limit);
  if (used > limit) {
    throw errors.quota(`「${feature}」今日额度已用尽 (${limit}/${limit})`);
  }
  return { used, limit };
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

// ---------------------------------------------------------------------------
// 周配额（AI 对话等重资源功能）
// ---------------------------------------------------------------------------

export type WeeklyQuotaState = {
  tier: "free" | "pro" | "lifetime";
  used: number;
  limit: number;
  remaining: number;
  /** 本周起始日(UTC+8 周一), 用于 App 端展示。 */
  weekStart: string;
  /** 距下次自动重置的毫秒数。 */
  resetInMs: number;
};

/** 只读查询本周用量, 不消耗。 */
export async function getWeeklyUsage(
  db: Client,
  userId: string,
  feature: string
): Promise<number> {
  const r = await db.execute({
    sql: "SELECT count FROM usage_weekly WHERE user_id = ? AND week_start = ? AND feature = ?",
    args: [userId, weekStartDate(), feature] as InValue[],
  });
  return Number(r.rows[0]?.count ?? 0);
}

/** 额度快照(不消耗), 供 /license/status 与 /ai/usage 返回。 */
export async function weeklyQuotaState(
  db: Client,
  userId: string,
  plan: string,
  feature: string
): Promise<WeeklyQuotaState> {
  const tier = weeklyTierOf(plan);
  const limit = WEEKLY_LIMITS[tier][feature] ?? 0;
  const used = await getWeeklyUsage(db, userId, feature);
  return {
    tier,
    used,
    limit,
    remaining: Math.max(0, limit - used),
    weekStart: weekStartDate(),
    resetInMs: msUntilWeekReset(),
  };
}

/**
 * 消耗周配额（2026-10-11 原子化重写）。
 *
 * 旧实现的竞态：先 SELECT 判断再无条件自增——并发两个请求都读到
 * current=99 < 100，双双通过、双双 +1，上限被击穿；RETURNING 拿到的
 * 权威值也没有与 limit 兜底比对。
 *
 * 现在把「超限判定」放进 UPSERT 本身：DO UPDATE 带 WHERE count < limit，
 * 超限时该语句不影响任何行（rowsAffected=0）→ 直接拒绝；
 * RETURNING 拿自增后的权威值，再兜底比对一次（超了就抛错，
 * 宁可让最后一次请求失败也不超发）。
 */
export async function consumeWeeklyQuota(
  db: Client,
  userId: string,
  plan: string,
  feature: string
): Promise<{ used: number; limit: number }> {
  const tier = weeklyTierOf(plan);
  const limit = WEEKLY_LIMITS[tier][feature] ?? 0;
  if (limit <= 0) {
    throw errors.quota(`当前套餐不支持「${feature}」`);
  }
  const week = weekStartDate();
  const r = await db.execute({
    sql: `INSERT INTO usage_weekly (user_id, week_start, feature, count)
          VALUES (?, ?, ?, 1)
          ON CONFLICT(user_id, week_start, feature) DO UPDATE SET count = count + 1
          WHERE usage_weekly.count < ?
          RETURNING count`,
    args: [userId, week, feature, limit] as InValue[],
  });
  // rowsAffected=0：INSERT 冲突且 WHERE 未命中（已达上限）。INSERT 首次
  // 写入不受 WHERE 约束（count=1 恒 <= limit，limit<=0 上面已拒）。
  if (r.rowsAffected === 0 || r.rows.length === 0) {
    const current = await getWeeklyUsage(db, userId, feature);
    throw errors.quota(
      `本周额度已用尽 (${Math.max(current, limit)}/${limit}), 下周一 00:00 自动重置`,
    );
  }
  const used = Number(r.rows[0]?.count ?? limit);
  if (used > limit) {
    // 并发兜底：理论上 WHERE 已挡住，这里防御 RETURNING 意外值。
    throw errors.quota(`本周额度已用尽 (${limit}/${limit}), 下周一 00:00 自动重置`);
  }
  return { used, limit };
}
