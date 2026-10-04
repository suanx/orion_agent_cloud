#!/usr/bin/env node
/**
 * 应用 schema.sql 到 Turso。
 * 用法:
 *   TURSO_DATABASE_URL=libsql://... TURSO_AUTH_TOKEN=... node scripts/migrate.mjs
 * 或在 .env 里配置后直接 node scripts/migrate.mjs
 * 幂等: 全部语句 IF NOT EXISTS。
 */
import { createClient } from "@libsql/client";
import { readFileSync, existsSync } from "node:fs";

function loadEnv() {
  if (!existsSync(".env")) return;
  for (const line of readFileSync(".env", "utf8").split("\n")) {
    const m = /^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/.exec(line);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}
loadEnv();

const url = process.env.TURSO_DATABASE_URL;
const token = process.env.TURSO_AUTH_TOKEN;
if (!url) {
  console.error("缺少 TURSO_DATABASE_URL (环境变量或 .env)");
  process.exit(1);
}
if (!token && !url.startsWith("file:")) {
  console.error("缺少 TURSO_AUTH_TOKEN (file: 本地库不需要)");
  process.exit(1);
}

const schema = readFileSync("src/db/schema.sql", "utf8");
// 剥离行注释与行尾注释(注释里可能含分号, 会破坏按 ; 切分), 再按 ; 分割
// (本 schema 的字符串字面量中不含 "--", 安全)
const cleaned = schema
  .split("\n")
  .map((line) => line.replace(/--.*$/, ""))
  .join("\n");
const statements = cleaned
  .split(";")
  .map((s) => s.trim())
  .filter((s) => s.length > 0);

const db = createClient({ url, authToken: token });
console.log(`连接 ${url} ...`);
await db.batch(statements.map((sql) => ({ sql, args: [] })), "write");
console.log(`完成: ${statements.length} 条 DDL 已应用。`);

const check = await db.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name");
console.log("现有表:", check.rows.map((r) => r.name).join(", "));
