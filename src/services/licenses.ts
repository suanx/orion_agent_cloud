import { errors } from "../utils/errors";
import { nowMs } from "../utils/crypto";

export const LICENSE_PLANS = ["trial", "pro", "lifetime"] as const;
export type LicensePlan = (typeof LICENSE_PLANS)[number];

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // 去掉易混淆的 I/O/0/1

/** 生成单个卡密: ORION-XXXX-XXXX-XXXX-XXXX (无易混淆字符)。 */
export function generateCode(
  rand: (buf: Uint8Array) => void = (buf) => crypto.getRandomValues(buf)
): string {
  const bytes = new Uint8Array(16);
  rand(bytes);
  const groups: string[] = [];
  for (let g = 0; g < 4; g++) {
    let group = "";
    for (let i = 0; i < 4; i++) {
      group += CODE_ALPHABET[bytes[g * 4 + i] % CODE_ALPHABET.length];
    }
    groups.push(group);
  }
  return `ORION-${groups.join("-")}`;
}

export function normalizeCode(code: string): string {
  return code.trim().toUpperCase().replace(/\s+/g, "");
}

export function validatePlan(plan: string): LicensePlan {
  if (!(LICENSE_PLANS as readonly string[]).includes(plan)) {
    throw errors.badRequest(`plan 必须是 ${LICENSE_PLANS.join("/")}`);
  }
  return plan as LicensePlan;
}

/**
 * 激活: 计算新套餐与到期时间。
 * 规则:
 *  - lifetime: 到期时间清空(永久)
 *  - 相同或更低套餐: 在现有到期时间上顺延(未到期), 已过期则从现在起算
 *  - 更高套餐: 覆盖为 now + duration
 * 返回 { plan, expiresAt } (expiresAt 为 null 表示永久)
 */
export function applyLicense(
  currentPlan: string,
  currentExpiresAt: number | null,
  newPlan: LicensePlan,
  durationDays: number,
  now = nowMs()
): { plan: string; expiresAt: number | null } {
  if (newPlan === "lifetime") return { plan: "lifetime", expiresAt: null };

  const durationMs = durationDays * 24 * 3600 * 1000;
  const rank: Record<string, number> = { free: 0, trial: 1, pro: 2, lifetime: 3 };
  const notExpired = currentExpiresAt !== null && currentExpiresAt > now;
  const upgrade = rank[newPlan] > rank[currentPlan];

  if (upgrade || !notExpired) {
    return { plan: newPlan, expiresAt: now + durationMs };
  }
  // 同级或降级但未过期: 顺延
  return { plan: currentPlan === "lifetime" ? newPlan : currentPlan, expiresAt: currentExpiresAt + durationMs };
}
