import { Hono } from "hono";
import type { Env } from "../env";
import { requireAuth } from "../middleware/auth";
import { getUsage, weeklyQuotaState } from "../services/quota";
import { PLAN_LABELS } from "../plans";

/**
 * 授权状态（v0.2 起为账号授权, 卡密已移除）。
 * - POST /license/activate → 410（卡密体系已下线, 管理台直接为账号设置套餐）
 * - GET  /license/status   → 账号套餐与今日用量（保留, App 端在用）
 */
export const licenseRoutes = new Hono<Env>();

licenseRoutes.post("/activate", async (c) => {
  return c.json(
    {
      error: {
        code: "license_removed",
        message: "卡密激活已下线：授权改由管理台直接为账号设置套餐",
      },
    },
    410
  );
});

// ---- GET /license/status ----
// App 端登录后的总状态：套餐 + 今日用量 + 本周云端模型额度。
// 云端额度放在这里而不是让 App 多打一次接口，是因为这个页面本来就要请求，
// 一次拿全能少一轮往返（旧版 App 不读 aiQuota 也不受影响）。
licenseRoutes.get("/status", requireAuth, async (c) => {
  const user = c.get("user");
  const db = c.get("db");
  const usage = {
    relay_search: await getUsage(db, user.userId, "relay_search"),
    relay_fetch: await getUsage(db, user.userId, "relay_fetch"),
    task_run: await getUsage(db, user.userId, "task_run"),
  };
  const ai = await weeklyQuotaState(db, user.userId, user.plan, "ai_chat");
  return c.json({
    userId: user.userId,
    plan: user.plan,
    planExpiresAt: user.planExpiresAt,
    usageToday: usage,
    // 云端模型周额度（每周一 00:00 UTC+8 自动归零）
    aiQuota: {
      tier: ai.tier,
      tierLabel: PLAN_LABELS[ai.tier],
      used: ai.used,
      limit: ai.limit,
      remaining: ai.remaining,
      weekStart: ai.weekStart,
      resetInMs: ai.resetInMs,
    },
    licenses: [], // 卡密已下线, 字段保留以兼容旧版 App
  });
});
