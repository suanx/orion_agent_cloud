import { errors } from "./utils/errors";

/** 套餐与功能配额。 */

/** 日配额(每日, UTC+8)—— relay / 定时任务等轻量功能。 */
export const PLANS = ["free", "trial", "pro", "lifetime"] as const;
export type Plan = (typeof PLANS)[number];

/** 周配额(每周一 00:00 UTC+8 归零)—— AI 对话等重资源功能。 */
export const WEEKLY_PLANS = ["free", "pro", "lifetime"] as const;
export type WeeklyPlan = (typeof WEEKLY_PLANS)[number];

export const PLAN_LIMITS: Record<Plan, Record<string, number>> = {
  free: {
    relay_search: 20,
    relay_fetch: 20,
    task_run: 3,
    max_devices: 1,
    max_tasks: 1,
    backup_bytes: 5 * 1024 * 1024,   // 云备份 5MB
    sync_rows: 2000,                // 同步行数
  },
  trial: {
    relay_search: 100,
    relay_fetch: 100,
    task_run: 10,
    max_devices: 2,
    max_tasks: 5,
    backup_bytes: 20 * 1024 * 1024,  // 20MB
    sync_rows: 10000,
  },
  pro: {
    relay_search: 500,
    relay_fetch: 500,
    task_run: 60,
    max_devices: 3,
    max_tasks: 20,
    backup_bytes: 100 * 1024 * 1024, // 100MB
    sync_rows: 50000,
  },
  lifetime: {
    relay_search: 500,
    relay_fetch: 500,
    task_run: 60,
    max_devices: 3,
    max_tasks: 20,
    backup_bytes: 500 * 1024 * 1024, // 500MB
    sync_rows: 200000,
  },
};

/**
 * 周配额(单位: 次)。三档: 免费版 / 专业版 / 永久版。
 *
 * 按「对话轮次」计费——一轮 = 一次 /ai/chat 请求(无论该轮工具调用几次)，
 * 对用户好理解，也不会因为开了工具就突然烧掉配额。
 * 永久版给 20000 看着多，但它是「不限性质感」而不是真无限：
 * 成本是真实的，留一个上限防止单账号被打爆。
 */
export const WEEKLY_LIMITS: Record<WeeklyPlan, Record<string, number>> = {
  free: {
    ai_chat: 100, // 免费版：每周 100 轮
  },
  pro: {
    ai_chat: 1000, // 专业版：每周 1000 轮
  },
  lifetime: {
    ai_chat: 20000, // 永久版：每周 20000 轮
  },
};

/** 套餐展示名(App 端额度卡片直接用这三个词)。 */
export const PLAN_LABELS: Record<WeeklyPlan, string> = {
  free: "免费版",
  pro: "专业版",
  lifetime: "永久版",
};

/**
 * 把内部套餐名映射到周配额档位。
 * trial(历史遗留的试用套餐)按免费版计, 避免出现第四个未知档位。
 */
export function weeklyTierOf(plan: string): WeeklyPlan {
  if (plan === "pro" || plan === "lifetime") return plan;
  return "free";
}


export type PlanLimits = Record<string, number>;

export function parseLimitsOverride(raw: string | undefined): Record<string, PlanLimits> | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return null;
    return parsed as Record<string, PlanLimits>;
  } catch {
    return null;
  }
}

export function limitFor(
  plan: Plan,
  feature: string,
  override: Record<string, PlanLimits> | null
): number {
  const limits = override?.[plan] ?? PLAN_LIMITS[plan];
  return limits[feature] ?? 0;
}

export function assertPlan(plan: string): Plan {
  if (!(PLANS as readonly string[]).includes(plan)) {
    throw errors.internal(`未知套餐: ${plan}`);
  }
  return plan as Plan;
}

/** UTC+8 当日日期字符串, 配额按中国时区自然日计算。 */
export function quotaDate(now = new Date()): string {
  const cst = new Date(now.getTime() + 8 * 3600 * 1000);
  return cst.toISOString().slice(0, 10);
}

/**
 * UTC+8 本周的周一日期字符串(周配额的主键之一)。
 *
 * 重置逻辑 = 跨周自然落到新行, 不做定时清零。
 * 用 UTC+8 的周一定义, 因此每周一 00:00(北京) 跨到新的一周。
 */
export function weekStartDate(now = new Date()): string {
  const cst = new Date(now.getTime() + 8 * 3600 * 1000);
  const dow = (cst.getUTCDay() + 6) % 7; // 周一=0 … 周日=6
  cst.setUTCDate(cst.getUTCDate() - dow);
  return cst.toISOString().slice(0, 10);
}

/** 距下次周重置还有多少毫秒(用于 App 端展示「x 天后重置」)。 */
export function msUntilWeekReset(now = new Date()): number {
  const cst = new Date(now.getTime() + 8 * 3600 * 1000);
  const dow = (cst.getUTCDay() + 6) % 7;
  // 本周一 00:00 已过, 目标 = 下周一 00:00
  const next = Date.UTC(
    cst.getUTCFullYear(),
    cst.getUTCMonth(),
    cst.getUTCDate() - dow + 7
  );
  return next - cst.getTime();
}

/** daily 任务的下次执行时间 (UTC+8 的 HH:MM), 手动任务返回 null。 */
export function nextDailyRun(
  scheduleHour: number,
  scheduleMinute: number,
  now = new Date()
): number | null {
  const cst = new Date(now.getTime() + 8 * 3600 * 1000);
  cst.setUTCHours(scheduleHour, scheduleMinute, 0, 0);
  let next = cst.getTime() - 8 * 3600 * 1000;
  if (next <= now.getTime()) next += 24 * 3600 * 1000;
  return next;
}
