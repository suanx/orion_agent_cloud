import { createClient, type Client } from "@libsql/client";
import type { Bindings } from "../env";

/**
 * Turso HTTP 模式客户端。
 * 边缘函数里每次请求新建 Client 是官方推荐做法(HTTP 无连接池概念);
 * 手机永远不直连 Turso, 所有访问经此处。
 */
export function getDb(env: Bindings): Client {
  if (!env.TURSO_DATABASE_URL) {
    throw new Error("TURSO_DATABASE_URL 未配置");
  }
  const isLocal = env.TURSO_DATABASE_URL.startsWith("file:");
  if (!env.TURSO_AUTH_TOKEN && !isLocal) {
    throw new Error("TURSO_AUTH_TOKEN 未配置");
  }
  return createClient({
    url: env.TURSO_DATABASE_URL,
    authToken: env.TURSO_AUTH_TOKEN || undefined,
  });
}

export type { Client };
