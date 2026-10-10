import type { Client } from "@libsql/client";
import type { Bindings } from "../src/env";
import { createClient } from "@libsql/client";

/**
 * 本地开发版 Turso 客户端工厂（**只被 scripts/dev-server.mjs 打包使用**，
 * 永远不会被 EdgeOne 平台构建器看到——dev-server 的 esbuild onLoad 钩子
 * 会用它替换 src/db/client.ts）。
 *
 * 与生产版 src/db/client.ts 的唯一区别：支持 file: 本地 SQLite
 * （主入口 @libsql/client 含 libsql 原生绑定，本地 Node 环境没问题，
 * 但绝不能进平台产物，所以拆成两个文件）。
 */
export async function getDb(env: Bindings): Promise<Client> {
  const url = env.TURSO_DATABASE_URL;
  if (!url) {
    throw new Error("TURSO_DATABASE_URL 未配置");
  }
  if (url.startsWith("file:")) {
    return createClient({ url });
  }
  if (!env.TURSO_AUTH_TOKEN) {
    throw new Error("TURSO_AUTH_TOKEN 未配置");
  }
  return createClient({
    url,
    authToken: env.TURSO_AUTH_TOKEN || undefined,
  });
}

export type { Client };
