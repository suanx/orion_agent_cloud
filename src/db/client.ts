import type { Client } from "@libsql/client";
import type { Bindings } from "../env";

/**
 * Turso 客户端工厂。
 * 每次请求新建 Client 是官方推荐做法(HTTP 无连接池概念);
 * 手机永远不直连 Turso, 所有访问经此处。
 *
 * ⚠️ 变体选择与打包隔离（2026-10-10，迁移 Node runtime 后线上 502 修复）：
 *
 * - 远程库（libsql://）**只走 `@libsql/client/web`**（纯 HTTP/fetch 实现），
 *   这是生产环境唯一路径，web 子路径是纯 ESM，无原生绑定。
 *
 * - 主入口 `@libsql/client` 会连带引入 `libsql` 包里的 `.node` 原生绑定。
 *   即使 file: 分支在生产永不执行，**打包器静态分析 import() 时仍会把该
 *   specifier 解析进产物**，Node runtime 加载函数时解析原生模块失败 →
 *   `CLOUD_FUNCTION_INVOCATION_FAILED`（静态页 200、全部 API 502）。
 *   Edge Runtime 时代表现为 545 "Error return from script"（2026-10-08）。
 *
 * - 修法：file: 分支做两件事确保生产产物里没有原生入口——
 *   ① 仅在 NODE_ENV=development/test 或显式 TURSO_ALLOW_FILE_DB=1 时执行，
 *      生产恒为 false（死代码）；
 *   ② specifier 由变量拼接，打包器无法静态解析。
 *
 * -⚠️ 不要把 `@libsql/client` / `libsql` 写进 edgeone.json 的
 *   cloudFunctions.nodejs.externalNodeModules：该配置项用于确实需要原生
 *   模块的项目（如 svg-captcha），对本项目只会把原生绑定塞进产物引爆 502。
 *
 * - Client 类型从主入口做 type-only 导入，编译期擦除，不影响打包。
 */

/** 生产环境恒为 false：确保 file: 分支在生产被视为死代码。 */
function fileDbAllowed(env: Bindings): boolean {
  const flag = env.TURSO_ALLOW_FILE_DB;
  if (flag === "1" || flag === "true") return true;
  return env.NODE_ENV === "development" || env.NODE_ENV === "test";
}

export async function getDb(env: Bindings): Promise<Client> {
  const url = env.TURSO_DATABASE_URL;
  if (!url) {
    throw new Error("TURSO_DATABASE_URL 未配置");
  }
  if (!env.TURSO_AUTH_TOKEN && !url.startsWith("file:")) {
    throw new Error("TURSO_AUTH_TOKEN 未配置");
  }

  if (url.startsWith("file:")) {
    // 仅本地 Node 开发环境（dev-server / vitest）。
    if (!fileDbAllowed(env)) {
      throw new Error("生产环境禁止使用 file: 本地数据库，请配置 libsql:// 远程库");
    }
    // specifier 变量拼接 → 打包器无法静态解析 → 原生绑定不进生产产物。
    const specifier = ["@libsql", "client"].join("/");
    const node = (await import(specifier)) as {
      createClient: (cfg: { url: string }) => Client;
    };
    return node.createClient({ url });
  }

  // 生产路径：纯 HTTP/fetch 实现，无原生绑定。
  const { createClient } = await import("@libsql/client/web");
  return createClient({
    url,
    authToken: env.TURSO_AUTH_TOKEN || undefined,
  });
}

export type { Client };