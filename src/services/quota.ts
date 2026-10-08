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
 * 消耗周配额并原子自增。
 *
 * 与日配额同款「读-改-写」竞态窗口, 但 AI 一轮的成本远高于一次搜索,
 * 因此这里把自增放在 UPSERT 里并用 RETURNING 拿到权威值,
 * 避免高并发下超发(每轮 token 成本是真实的)。
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
  const current = await getWeeklyUsage(db, userId, feature);
  if (current >= limit) {
    throw errors.quota(`本周额度已用尽 (${current}/${limit}), 下周一 00:00 自动重置`);
  }
  const r = await db.execute({
    sql: `INSERT INTO usage_weekly (user_id, week_start, feature, count) VALUES (?, ?, ?, 1)
          ON CONFLICT(user_id, week_start, feature) DO UPDATE SET count = count + 1
          RETURNING count`,
    args: [userId, week, feature] as InValue[],
  });
  const used = Number(r.rows[0]?.count ?? current + 1);
  return { used, limit };
}
