import { Hono } from "hono";
import type { Env } from "../env";
import { requireAuth } from "../middleware/auth";
import { getUsage } from "../services/quota";

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
licenseRoutes.get("/status", requireAuth, async (c) => {
  const user = c.get("user");
  const db = c.get("db");
  const usage = {
    relay_search: await getUsage(db, user.userId, "relay_search"),
    relay_fetch: await getUsage(db, user.userId, "relay_fetch"),
    task_run: await getUsage(db, user.userId, "task_run"),
  };
  return c.json({
    userId: user.userId,
    plan: user.plan,
    planExpiresAt: user.planExpiresAt,
    usageToday: usage,
    licenses: [], // 卡密已下线, 字段保留以兼容旧版 App
  });
});
