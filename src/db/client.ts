import type { Client } from "@libsql/client";
import type { Bindings } from "../env";

/**
 * Turso 客户端工厂。
 * 边缘函数里每次请求新建 Client 是官方推荐做法(HTTP 无连接池概念);
 * 手机永远不直连 Turso, 所有访问经此处。
 *
 * ⚠️ 变体选择(2026-10-08 线上 545 排查结论):
 * - 远程库(libsql://)必须用 `@libsql/client/web`(纯 HTTP/fetch 实现)。
 *   主入口 "." 在 EdgeOne 打包时解析到 node 变体(原生绑定), 边缘运行时
 *   import 阶段即崩溃, 所有 /api/* 请求 545 "Error return from script";
 * - file:(本地 SQLite)只有 Node 开发环境(dev-server)会走到, 用动态
 *   import 加载 node 变体——边缘运行时永远不执行这个分支, 不会进入
 *   关键路径;
 * - Client 类型从主入口做 type-only 导入, 编译期擦除, 不影响打包。
 */
export async function getDb(env: Bindings): Promise<Client> {
  const url = env.TURSO_DATABASE_URL;
  if (!url) {
    throw new Error("TURSO_DATABASE_URL 未配置");
  }
  if (!env.TURSO_AUTH_TOKEN && !url.startsWith("file:")) {
    throw new Error("TURSO_AUTH_TOKEN 未配置");
  }
  if (url.startsWith("file:")) {
    // 仅本地 Node 开发环境; 动态 import 避免原生绑定进入边缘产物关键路径
    const node = await import("@libsql/client");
    return node.createClient({ url });
  }
  const { createClient } = await import("@libsql/client/web");
  return createClient({
    url,
    authToken: env.TURSO_AUTH_TOKEN || undefined,
  });
}

export type { Client };
