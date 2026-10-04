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
  if (!latest) throw new Error("UPDATE_LATEST_VERSION 未配置");

  const updateAvailable = isNewer(latest, current);
  const minSupported = env.UPDATE_MIN_VERSION ?? "0.0.0";
  return c.json({
    platform,
    supported: true,
    latest,
    current,
    minSupported,
    forceUpdate: isNewer(minSupported, current),
    updateAvailable,
    notes: env.UPDATE_NOTES ?? "",
    apkUrl: env.UPDATE_APK_URL ?? "",
  });
});
