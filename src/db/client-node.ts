import { createClient } from "@libsql/client";
import type { Client } from "@libsql/client";
import type { Bindings } from "../env";

/**
 * Node 服务端（VPS）版数据库客户端工厂。
 *
 * 与 src/db/client.ts（EdgeOne 生产版）的区别：
 * - 用 @libsql/client 主入口而非 /web 变体：Node 环境有原生 libsql 绑定，
 *   file: 本地 SQLite 需要它；EdgeOne 平台没有原生绑定，所以那边只能用 web。
 * - **允许 file: URL**。VPS 上数据落在本地 SQLite（见 docs/DEPLOY_VPS.md），
 *   零运维、备份即拷文件；Turso 保留为异地灾备与回滚点，改回 libsql://
 *   即可切回，无需改任何业务代码。
 *
 * ⚠️ 这个文件只能被 src/server/ 的 Node 构建产物引用，**绝不能**进
 * EdgeOne 部署产物（cloud-functions/api/[[default]].js）——那里没有原生
 * 绑定，import 进来会直接构建失败。scripts/build-edgeone.mjs 已通过
 * 分入口构建天然隔离：EdgeOne 只打 src/entry/api.ts。
 */
export async function getDb(env: Bindings): Promise<Client> {
  const url = env.TURSO_DATABASE_URL;
  if (!url) throw new Error("TURSO_DATABASE_URL 未配置");
  if (!url.startsWith("file:") && !env.TURSO_AUTH_TOKEN) {
    throw new Error("TURSO_AUTH_TOKEN 未配置");
  }
  return createClient({
    url,
    authToken: env.TURSO_AUTH_TOKEN || undefined,
  });
}

export type { Client };