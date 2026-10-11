import type { Context } from "hono";
import type { Env } from "../env";

/**
 * 对外的站点公网地址推导（2026-10-11 修复 P1「云端模型一直重连」）。
 *
 * 根因：EdgeOne 的 Cloud Functions 收到的 `c.req.url` 是平台内部 SCF
 * 转发地址（`*.pages-scf-*.qcloudteo.com`），不是公网域名。旧 apiBase
 * 的回落链在「无 Origin/Referer（原生 HTTP 客户端）且 PUBLIC_BASE_URL
 * 未配」时会把这个内部地址当公网地址返回——App 拿到它拼 chatUrl，
 * 公网不可达 → 永远连不上（一直重新连接）。
 *
 * 新优先级：
 * 1. Origin/Referer（浏览器场景，公网域名）
 * 2. PUBLIC_BASE_URL（显式配置即权威公网地址）
 * 3. c.req.url——但内部平台域名不算数，跳过
 * 全部落空时才退回原始请求 origin（保持旧行为兜底）。
 */
const INTERNAL_HOST_RE =
  /(\.qcloudteo\.com$|\.pages-scf-|\.internal$|^localhost$|^127\.|^0\.0\.0\.0$)/i;

export function isInternalHost(originOrUrl: string): boolean {
  try {
    return INTERNAL_HOST_RE.test(new URL(originOrUrl).host);
  } catch {
    return true;
  }
}

export function publicApiBase(c: Context<Env>): string {
  const origin = c.req.header("origin") ?? c.req.header("referer");
  if (origin) {
    try {
      const u = new URL(origin).origin;
      if (!isInternalHost(u)) return u;
    } catch {
      // 非法 Origin，继续回落
    }
  }
  const configured = (c.env.PUBLIC_BASE_URL || "").replace(/\/+$/, "");
  if (configured && !isInternalHost(configured)) return configured;
  try {
    const u = new URL(c.req.url).origin;
    if (!isInternalHost(u)) return u;
  } catch {
    // c.req.url 异常，退回兜底
  }
  return configured || (origin || "");
}
