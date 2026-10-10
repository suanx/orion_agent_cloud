#!/usr/bin/env node
/**
 * EdgeOne Pages Cloud Functions 构建脚本。
 *
 * 为什么需要它（2026-10-10线上 502 修复）：
 * 平台按Build Output 约定要求产物形如
 *   .edgeone/cloud-functions/api-node/{index.mjs, config.json}
 * 之前 edgeone.json 的 buildCommand 是 `npm run typecheck`——只做类型
 * 检查，**不产出任何文件**，平台拿不到入口与依赖，函数调用直接
 * `CLOUD_FUNCTION_INVOCATION_FAILED`（静态页 200、全部 API 502）。
 *
 * 本脚本产出平台要求的目录结构：
 *   1. 用 esbuild 把 cloud-functions/api/[[default]].ts 打成单文件 ESM，
 *      **把 hono / @libsql/client/web 一起打进产物**（平台不再需要
 *      自己去 node_modules 找依赖）；
 *   2. src/ 下的模块经由入口的动态 import 被打包进去；
 *   3. 写 config.json 路由表，把 ^/api/(.*)$ 映射到函数。
 *
 * 注意：不打包 @libsql/client 主入口（含 libsql 的 .node 原生绑定），
 * 生产只走 /web 变体（纯 fetch）——见 src/db/client.ts 的说明。
 */
import { build } from "esbuild";
import { mkdirSync, writeFileSync, rmSync, cpSync, existsSync } from "node:fs";

const OUT_DIR = ".edgeone";
const API_DIR = `${OUT_DIR}/cloud-functions/api-node`;

rmSync(OUT_DIR, { recursive: true, force: true });
mkdirSync(API_DIR, { recursive: true });

// 静态资源：outputDirectory 指向 .edgeone（函数产物所在根），平台只从这里
// 取产物，所以 public/ 必须复制进来，否则首页/管理台会404。
if (existsSync("public")) {
  cpSync("public", OUT_DIR, { recursive: true });
  console.log("[build-edgeone] 已复制 public/ 静态资源");
}

await build({
  entryPoints: ["cloud-functions/api/[[default]].ts"],
  bundle: true,
  platform: "node",
  target: "node20",
  format: "esm",
  outfile: `${API_DIR}/index.mjs`,
  // 主入口含原生绑定，生产走不到；显式 external 防止误引入。
  external: ["@libsql/client", "libsql"],
  banner: {
    js: [
      "// 由 scripts/build-edgeone.mjs 生成，请勿手改。",
      "// 源入口：cloud-functions/api/[[default]].ts",
    ].join("\n"),
  },
  logLevel: "error",
});

// 路由表：把 /api/* 全部交给这一个函数（对应源码的 [[default]] catch-all）。
// 放在 handle: "filesystem" 之后，静态资源（public/）优先命中。
const config = {
  version: 3,
  routes: [
    { handle: "filesystem" },
    { src: "^/api(/.*)?$" },
    { src: "/.*" },
  ],
};

writeFileSync(`${API_DIR}/config.json`, `${JSON.stringify(config, null, 2)}\n`);

console.log(`[build-edgeone]产物已生成：${API_DIR}`);