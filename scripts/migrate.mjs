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
// 注意: JS 的 "." 不匹配 \r——CRLF 行上 /--.*$/ 会失配导致注释里的 ";" 漏剥
// （schema 曾被 Windows 文本模式整文件转成 CRLF 而引爆），这里归一化后再剥离
const cleaned = schema
  .replace(/\r\n/g, "\n")
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
// ---- 已有库补列(2026-10-08 多端同步): SQLite 不支持 ADD COLUMN IF NOT EXISTS,
// 逐列检查 pragma 后再ALTER, 幂等安全 ----
const COLUMNS = {
  sync_state: [
    ["device_id", "TEXT NOT NULL DEFAULT ''"],
    ["payload_encrypted", "TEXT"],
    ["nonce", "TEXT"],
  ],
  users: [
    // 账号名 agent-<5位数字>。注意这里不写 UNIQUE —— SQLite 的
    // ALTER TABLE ADD COLUMN 不接受 UNIQUE/PRIMARY KEY 约束，只能随后
    // 单独建唯一索引（见下方 idx_users_username）。
    ["username", "TEXT"],
  ],
};
for (const [table, cols] of Object.entries(COLUMNS)) {
  const info = await db.execute(`PRAGMA table_info(${table})`);
  const have = new Set(info.rows.map((r) => String(r.name)));
  for (const [name, decl] of cols) {
    if (have.has(name)) continue;
    await db.execute(`ALTER TABLE ${table} ADD COLUMN ${name} ${decl}`);
    console.log(`  补列 ${table}.${name} ${decl}`);
  }
}

// users.username 的唯一索引（新库由 schema.sql 的 UNIQUE 直接建好）。
await db.execute(
  "CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(username)"
);
console.log("  索引 idx_users_username 已就绪");

// ---- 回填老用户账号名（2026-10-09）----
// 原设计是「老用户首次登录时才回填」，结果管理台账号名列对所有老用户
// 都显示 "—"（生产库实测：列补上后 username 全为 NULL）。迁移时一次性
// 补齐，让账号名立刻可见。生成逻辑与 src/utils/register-policy.ts 的
// generateUsername 保持一致（agent- + 5 位随机数字，查库避让撞号）。
{
  const pending = await db.execute(
    "SELECT id FROM users WHERE username IS NULL OR username = ''"
  );
  if (pending.rows.length > 0) {
    const used = new Set(
      (
        await db.execute(
          "SELECT username FROM users WHERE username IS NOT NULL AND username != ''"
        )
      ).rows.map((r) => String(r.username))
    );
    const gen = () => {
      const buf = new Uint32Array(1);
      crypto.getRandomValues(buf);
      return `agent-${String(buf[0] % 100000).padStart(5, "0")}`;
    };
    let done = 0;
    for (const row of pending.rows) {
      let name = gen();
      for (let i = 0; i < 12 && used.has(name); i++) name = gen();
      used.add(name);
      await db.execute({
        sql: "UPDATE users SET username = ? WHERE id = ?",
        args: [name, row.id],
      });
      done++;
    }
    console.log(`  回填 ${done} 个账号名`);
  }
}

console.log("现有表:", check.rows.map((r) => r.name).join(", "));
