import { Hono } from "hono";
import type { Env } from "../env";

/**
 * 弹窗公告（公开端点, 供 App 启动时拉取）。
 * GET /announcement?platform=android&version=0.2.35
 * 返回当前启用、且版本范围覆盖 [version] 的最新一条公告。
 * 版本范围语义: min_version/max_version 为空 = 不限; 否则含端点闭区间。
 */
export const announcementRoutes = new Hono<Env>();

function versionParts(v: string): number[] {
  return v.split(".").map((n) => Number(n) || 0);
}

/** a >= b (逐段数字比较, 段数不足补 0) */
function versionAtLeast(a: string, b: string): boolean {
  if (!b) return true;
  const pa = versionParts(a);
  const pb = versionParts(b);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff < 0) return false;
  }
  return true;
}

/** a <= b */
function versionAtMost(a: string, b: string): boolean {
  if (!b) return true;
  const pa = versionParts(a);
  const pb = versionParts(b);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff > 0) return false;
  }
  return true;
}

announcementRoutes.get("/", async (c) => {
  const platform = c.req.query("platform") ?? "android";
  const version = c.req.query("version") ?? "0.0.0";
  if (platform !== "android") {
    return c.json({ announcement: null });
  }

  const db = c.get("db");
  const r = await db.execute({
    sql: `SELECT id, title, content, min_version, max_version, updated_at
          FROM announcements
          WHERE enabled = 1
          ORDER BY updated_at DESC
          LIMIT 20`,
  });
  for (const row of r.rows) {
    const min = String(row.min_version ?? "");
    const max = String(row.max_version ?? "");
    if (versionAtLeast(version, min) && versionAtMost(version, max)) {
      return c.json({
        announcement: {
          id: String(row.id),
          title: String(row.title),
          content: String(row.content),
          updatedAt: Number(row.updated_at),
        },
      });
    }
  }
  return c.json({ announcement: null });
});
