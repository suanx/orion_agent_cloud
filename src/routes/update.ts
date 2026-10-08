import { Hono } from "hono";
import type { Env } from "../env";

export const updateRoutes = new Hono<Env>();

function versionParts(v: string): number[] {
  return v.split(".").map((n) => Number(n) || 0);
}

export function isNewer(candidate: string, current: string): boolean {
  const a = versionParts(candidate);
  const b = versionParts(current);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const diff = (a[i] ?? 0) - (b[i] ?? 0);
    if (diff !== 0) return diff > 0;
  }
  return false;
}

// ---- GET /update/check?platform=android&current=0.1.9 ----
updateRoutes.get("/check", async (c) => {
  const env = c.env;
  const platform = c.req.query("platform") ?? "android";
  const current = c.req.query("current") ?? "0.0.0";
  if (platform !== "android") {
    return c.json({ platform, supported: false, latest: current, updateAvailable: false });
  }
  const latest = env.UPDATE_LATEST_VERSION ?? "";
  if (!latest) {
    // 未配置更新源时优雅降级(返回无更新), 而不是 500——App 端会自然
    // 回退 GitHub Releases 检查, 管理台补配环境变量后即自动生效
    return c.json({
      platform,
      supported: true,
      latest: current,
      current,
      updateAvailable: false,
      forceUpdate: false,
      configured: false,
      hint: "UPDATE_LATEST_VERSION 未配置(EdgeOne 环境变量)",
    });
  }

  const updateAvailable = isNewer(latest, current);
  const minSupported = env.UPDATE_MIN_VERSION ?? "0.0.0";
  // 强制更新开关: UPDATE_FORCE_UPDATE='true' 时本次更新为强更;
  // 低于 minSupported 的版本无论如何都强更(兜底)。
  const forceFlag = env.UPDATE_FORCE_UPDATE === "true";
  const forceUpdate = updateAvailable && (forceFlag || isNewer(minSupported, current));
  return c.json({
    platform,
    supported: true,
    latest,
    current,
    minSupported,
    forceUpdate,
    updateAvailable,
    notes: env.UPDATE_NOTES ?? "",
    apkUrl: env.UPDATE_APK_URL ?? "",
  });
});
