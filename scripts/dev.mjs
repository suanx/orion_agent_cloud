#!/usr/bin/env node
/**
 * 本地开发服务器: 用 file: SQLite(本地文件)跑完整的 Hono app,
 * 无需 Turso 即可联调鉴权/卡密/任务等全部流程。
 *
 * 用法:
 *   node scripts/migrate.mjs                      # 若用本地库, 先把 URL 换成 file:./local.db
 *   TURSO_DATABASE_URL=file:./local.db \
 *   JWT_SECRET=dev-secret-0123456789abcdef0123456789abcdef \
 *   ADMIN_TOKEN=dev-admin \
 *   UPDATE_LATEST_VERSION=0.1.9 \
 *   node scripts/dev.mjs                          # 默认 127.0.0.1:8787
 */
import { createServer } from "node:http";
import app from "../src/index.ts";

const env = process.env;

const server = createServer(async (req, res) => {
  try {
    const chunks = [];
    for await (const ch of req) chunks.push(ch);
    const body = chunks.length ? Buffer.concat(chunks) : undefined;
    const url = `http://${req.headers.host ?? "localhost"}${req.url}`;
    const request = new Request(url, {
      method: req.method,
      headers: req.headers,
      body: ["GET", "HEAD"].includes(req.method) ? undefined : body,
    });
    const resp = await app.fetch(request, env, {
      waitUntil: () => {},
      passThroughOnException: () => {},
      props: {},
    });
    res.writeHead(resp.status, Object.fromEntries(resp.headers));
    const buf = Buffer.from(await resp.arrayBuffer());
    res.end(buf);
  } catch (e) {
    res.writeHead(500, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: { code: "internal", message: String(e) } }));
  }
});

const port = Number(env.PORT ?? 8787);
server.listen(port, "127.0.0.1", () => {
  console.log(`orion-backend dev server: http://127.0.0.1:${port}`);
});
