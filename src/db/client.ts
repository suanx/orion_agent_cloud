import type { Client } from "@libsql/client";
import type { Bindings } from "../env";

/**
 * Turso 客户端工厂（生产版）。
 * 每次请求新建 Client 是官方推荐做法（HTTP 无连接池概念）；
 * 手机永远不直连 Turso，所有访问经此处。
 *
 * ⚠️ 本文件会被 EdgeOne 平台的构建器打包。对该构建器有两条硬约束
 * （2026-10-10 线上 502 排查、探针实测结论）：
 * 1. 依赖必须**静态 import**——动态 import() 的 bare specifier 不会被
 *    内联（运行时报 Cannot find package），相对路径会被重写成错误路径
 *    （Cannot find module '/src/...'）；
 * 2. 不能有任何**打包器解析不了的 import**——变量拼接的 specifier 会
 *    让整个函数构建失败（CLOUD_FUNCTION_INVOCATION_FAILED，而同项目里
 *    零依赖的函数正常 200）。
 * 因此本文件只允许出现静态 import，且只引 `@libsql/client/web`
 * （纯 fetch 实现，无原生绑定）。本地 file: SQLite 支持在
 * scripts/dev-db-client.ts（dev-server 打包时替换本文件），见其说明。
 */
import { createClient as createWebClient } from "@libsql/client/web";

export async function getDb(env: Bindings): Promise<Client> {
  const url = env.TURSO_DATABASE_URL;
  if (!url) {
    throw new Error("TURSO_DATABASE_URL 未配置");
  }
  if (!env.TURSO_AUTH_TOKEN) {
    throw new Error("TURSO_AUTH_TOKEN 未配置");
  }
  if (url.startsWith("file:")) {
    throw new Error(
      "生产环境禁止使用 file: 本地数据库（本地开发请用 scripts/dev-server.mjs）",
    );
  }
  return createWebClient({
    url,
    authToken: env.TURSO_AUTH_TOKEN || undefined,
  });
}

export type { Client };
