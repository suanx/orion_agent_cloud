#!/usr/bin/env node
/**
 * EdgeOne Pages 部署产物构建脚本。
 *
 * 产物：cloud-functions/api/[[default]].js —— **完全自包含**的单文件
 * ESM bundle（内联 hono、@libsql/client/web 与全部 src/ 源码），零外部
 * import。它会作为普通"源码函数"提交进仓库，由平台源码自动构建部署。
 *
 * 为什么这样绕（2026-10-10 全天排查结论，三个探针实测）：
 * 1. 平台对 cloud-functions/ 源码做自动构建时**完全不处理 npm 依赖**——
 *    只静态引一个 hono 的函数也 CLOUD_FUNCTION_INVOCATION_FAILED（探针
 *    __pa），而零依赖函数正常 200（探针1 / __p）。静态/动态 import 都
 *    救不了：动态的相对路径被重写成错误路径、bare specifier 不内联。
 * 2. Build Output API（.edgeone/cloud-functions/api-node/）路线也失败：
 *    即便产物提交进仓库，函数仍 502（与源码目录共存的干扰未完全排除，
 *    该路线整体放弃）。
 * 3. 唯一被证明可靠的是「cloud-functions/api/ 下的自包含文件 → 200」
 *    （探针1、__p 都是这种形态）——所以把 bundle 直接作为部署源提交，
 *    平台眼里它就是一个零依赖的普通函数。
 *
 * 注意：@libsql/client/web 是纯 fetch 实现（无原生绑定），可安全全内联；
 * 主入口（含 libsql 原生绑定）在生产代码中已无任何引用（src/db/client.ts
 * 只有 web 变体的静态 import）。本地 file: SQLite 支持在
 * scripts/dev-db-client.ts，由 dev-server 的 esbuild onLoad 钩子替换，
 * 不进此产物。
 */
import { build } from "esbuild";
import { writeFileSync, mkdirSync } from "node:fs";

mkdirSync("cloud-functions/api", { recursive: true });

await build({
  entryPoints: ["src/entry/api.ts"],
  bundle: true,
  platform: "node",
  target: "node20",
  format: "esm"  // .js + type:module => ESM；若平台按 CJS 处理会失败，届时改 cjs,
  outfile: "cloud-functions/api/[[default]].js",
  // 无 external：hono 与 @libsql/client/web 全部内联，产物零外部 import。
  banner: {
    js: [
      "// ⚠️ 本文件由 `npm run build` 生成（源入口 src/entry/api.ts），请勿手改；",
      "// 改动请编辑 src/ 与构建脚本后重新构建并提交。",
      "// 平台约束见 scripts/build-edgeone.mjs 头注释：函数必须自包含，",
      "// 平台源码自动构建不处理 npm 依赖（2026-10-10 探针实测）。",
    ].join("\n"),
  },
  logLevel: "error",
});

// 自包含校验：产物里不允许残留任何对外部模块的引用（node: 内建除外，
// 它们由 Node runtime 提供，永远可用）。
import { readFileSync } from "node:fs";
const src = readFileSync("cloud-functions/api/[[default]].js", "utf8");
const badStatic = [...src.matchAll(/^\s*import\s+[^;]*?from\s+["']([^"']+)["']/gm)]
  .map((m) => m[1]).filter((s) => !s.startsWith("node:"));
const badDynamic = [...src.matchAll(/import\(\s*["']([^"']+)["']\s*\)/g)]
  .map((m) => m[1]).filter((s) => !s.startsWith("node:"));
if (badStatic.length || badDynamic.length) {
  console.error("[build-edgeone] ❌ 产物不自包含，残留外部引用：",
    [...new Set([...badStatic, ...badDynamic])]);
  process.exit(1);
}
console.log(
  `[build-edgeone] ✅ cloud-functions/api/[[default]].js 已生成 ` +
  `(${(src.length / 1024).toFixed(0)}KB，自包含)`,
);
