import { errors } from "./utils/errors";

/** 套餐与功能配额(每日, UTC+8)。override 见 PLAN_LIMITS_OVERRIDE 环境变量。 */
export const PLANS = ["free", "trial", "pro", "lifetime"] as const;
export type Plan = (typeof PLANS)[number];

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
