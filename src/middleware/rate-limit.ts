import type { Context, Next } from "hono";

/**
 * 进程内滑动窗口限流（2026-10-11 修复 P1 A-04：全站零速率限制）。
 *
 * ⚠️ 局限（有意取舍，先求有）：EdgeOne 多 isolate 各有一份内存桶，
 * 全局限流上限 = 单桶 × isolate 数。对「脚本高速撞库」仍能把单连接
 * 的爆破速度压到每窗口 N 次；要精确全局限流需上共享存储（Turso 计数
 * 表或 Redis），当前先不做 schema 变更。
 *
 * 仅挂在鉴权端点（login/register/refresh）——这三个端点无套餐门槛、
 * 可被匿名高速调用，且 PBKDF2 120k 迭代会让每个请求吃掉服务端
 * 几十毫秒 CPU（DoS 放大器）。
 */

interface Bucket {
  hits: number[];
}

const buckets = new Map<string, Bucket>();

/** 定期清理过期桶，防 Map 无限膨胀。 */
let lastSweep = 0;
function sweep(now: number, windowMs: number) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [k, b] of buckets) {
    b.hits = b.hits.filter((t) => now - t < windowMs);
    if (b.hits.length === 0) buckets.delete(k);
  }
}

export function clientIp(c: Context): string {
  return (
    c.req.header("cf-connecting-ip") ??
    c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  );
}

export interface RateLimitOptions {
  /** 窗口内最大请求数。 */
  max: number;
  /** 窗口长度（毫秒）。 */
  windowMs: number;
  /** 桶的命名空间（如 "login"），避免与其它端点共享计数。 */
  scope: string;
}

export function rateLimit(opts: RateLimitOptions) {
  return async (c: Context, next: Next) => {
    const now = Date.now();
    const key = `${opts.scope}:${clientIp(c)}`;
    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = { hits: [] };
      buckets.set(key, bucket);
    }
    bucket.hits = bucket.hits.filter((t) => now - t < opts.windowMs);
    if (bucket.hits.length >= opts.max) {
      const retryAfterSec = Math.ceil(
        (opts.windowMs - (now - bucket.hits[0])) / 1000,
      );
      c.header("retry-after", String(Math.max(1, retryAfterSec)));
      return c.json(
        { error: "rate_limited", message: `请求过于频繁，请 ${retryAfterSec} 秒后重试` },
        { status: 429 },
      );
    }
    bucket.hits.push(now);
    sweep(now, opts.windowMs);
    await next();
  };
}
