import { errors } from "../utils/errors";
import { nowMs } from "../utils/crypto";

/**
 * 账号授权（v0.2 起取代卡密）：管理员直接为账号设置/顺延套餐，
 * 写入 users.plan + users.plan_expires_at，中间件按 effectivePlan
 * 过期自动降级 free。
 */

export const ACCOUNT_PLANS = ["free", "trial", "pro", "lifetime"] as const;
export type AccountPlan = (typeof ACCOUNT_PLANS)[number];

const RANK: Record<string, number> = { free: 0, trial: 1, pro: 2, lifetime: 3 };

export function validateAccountPlan(plan: string): AccountPlan {
  if (!(ACCOUNT_PLANS as readonly string[]).includes(plan)) {
    throw errors.badRequest(`plan 必须是 ${ACCOUNT_PLANS.join("/")}`);
  }
  return plan as AccountPlan;
}

export type GrantMode = "set" | "extend";

/**
 * 授权计算：
 *  - plan = free：无论模式，清除为免费（撤销授权）
 *  - lifetime：永久（到期时间清空）
 *  - mode = set：直接设置，到期 = now + durationDays
 *  - mode = extend（顺延）：
 *      · 同套餐且未过期 → 现有到期时间 + durationDays
 *      · 现有更高套餐未过期 → 保留高套餐，仅顺延其到期时间
 *      · 其余（升级 / 已过期）→ 从 now + durationDays 起算
 */
export function applyPlanGrant(
  currentPlan: string,
  currentExpiresAt: number | null,
  plan: AccountPlan,
  durationDays: number,
  mode: GrantMode,
  now = nowMs()
): { plan: string; expiresAt: number | null } {
  if (plan === "free") return { plan: "free", expiresAt: null };
  if (plan === "lifetime") return { plan: "lifetime", expiresAt: null };
  if (durationDays <= 0) {
    throw errors.badRequest("非永久套餐必须指定 durationDays (> 0)");
  }

  const durationMs = durationDays * 24 * 3600 * 1000;

  if (mode === "set") {
    return { plan, expiresAt: now + durationMs };
  }

  // extend
  const notExpired = currentExpiresAt !== null && currentExpiresAt > now;
  if (notExpired && currentPlan === plan) {
    return { plan, expiresAt: currentExpiresAt + durationMs };
  }
  if (notExpired && (RANK[currentPlan] ?? 0) > (RANK[plan] ?? 0)) {
    // 保留更高套餐，仅顺延其到期时间
    return { plan: currentPlan, expiresAt: currentExpiresAt! + durationMs };
  }
  return { plan, expiresAt: now + durationMs };
}
