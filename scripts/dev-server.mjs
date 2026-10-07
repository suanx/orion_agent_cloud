#!/usr/bin/env node
/**
 * 本地部署开发服务器 —— 在真机 Node 上跑完整后端（非 mock）。
 *
 * 用途：部署到 EdgeOne 前的全端点本地验证（数据库用本地 SQLite 文件）。
 * 忠实模拟部署链路：请求交给 functions/api/[[route]].ts 的 onRequest
 * （与 EdgeOne 线上完全同一份入口代码），再进 Hono app。
 * 环境变量与 EdgeOne 控制台配置的 Bindings 同名（见 .env.example）。
 *
 * 用法:
 *   node scripts/dev-server.mjs              # 默认 127.0.0.1:8787
 *   PORT=9000 node scripts/dev-server.mjs
 * 必需环境变量（或 .env.local）:
 *   TURSO_DATABASE_URL=file:./local-dev.db   # 本地库不需要 AUTH_TOKEN
 *   JWT_SECRET=...  ADMIN_TOKEN=...
 */
import { build } from "esbuild";
import { createServer } from "node:http";
import { readFileSync, existsSync, mkdirSync } from "node:fs";

// ---- 1. 载入 .env.local（不覆盖已有环境变量）----
if (existsSync(".env.local")) {
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    const m = /^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/.exec(line);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}
for (const k of ["TURSO_DATABASE_URL", "JWT_SECRET", "ADMIN_TOKEN"]) {
  if (!process.env[k]) {
    console.error(`缺少环境变量 ${k}（写进 .env.local 或导出后重试）`);
    process.exit(1);
  }
}

// ---- 2. esbuild 打包 EdgeOne 函数入口（@libsql/client 保持外部依赖）----
mkdirSync(".dev", { recursive: true });
await build({
  entryPoints: ["functions/api/[[route]].ts"],
  bundle: true,
  platform: "node",
  format: "cjs",
  outfile: ".dev/server.cjs",
  external: ["@libsql/client"],
  logLevel: "silent",
});
const mod = await import("../.dev/server.cjs");
const onRequest = mod.onRequest ?? mod.default?.onRequest;
if (typeof onRequest !== "function") {
  console.error("打包产物中没有 onRequest —— 检查 functions/api/[[route]].ts");
  process.exit(1);
}

// ---- 3. node:http → Web fetch 桥接（与边缘运行时同语义）----
const PORT = Number(process.env.PORT || 8787);
createServer(async (req, res) => {
  const url = `http://127.0.0.1:${PORT}${req.url}`;
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const body = chunks.length ? Buffer.concat(chunks) : undefined;
  const webReq = new Request(url, {
    method: req.method,
    headers: req.headers,
    body: body && req.method !== "GET" && req.method !== "HEAD" ? body : undefined,
  });
  let webRes;
  try {
    webRes = await onRequest({
      request: webReq,
      env: process.env,
      waitUntil: () => {},
      passThroughOnException: () => {},
      props: {},
    });
  } catch (e) {
    res.writeHead(500, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: { code: "internal", message: String(e) } }));
    return;
  }
  const buf = Buffer.from(await webRes.arrayBuffer());
  const headers = {};
  webRes.headers.forEach((v, k) => { headers[k] = v; });
  res.writeHead(webRes.status, headers);
  res.end(buf);
  console.log(`${req.method} ${req.url} → ${webRes.status}`);
}).listen(PORT, "127.0.0.1", () => {
  console.log(`[orion-backend dev] http://127.0.0.1:${PORT}`);
  console.log(`  db = ${process.env.TURSO_DATABASE_URL}`);
});
