// e2e 调试用：清空本地测试库里的 AI 相关数据与测试账号。
// 用法: node scripts/reset-e2e-ai.mjs
import { createClient } from "@libsql/client";

const url = process.env.TURSO_DATABASE_URL ?? "file:./local-dev-ai.db";
const db = createClient({ url });

await db.execute({ sql: "DELETE FROM llm_providers" });
await db.execute({ sql: "DELETE FROM usage_weekly" });
// 先清关联表（sessions/usage_daily/... 对 users 有外键），再删账号
const TEST_USER = `email LIKE 'probe%'
  OR email LIKE 'carol_%'
  OR email LIKE 'alice_%'
  OR email LIKE 'bob_%'`;
for (const table of [
  "sessions",
  "usage_daily",
  "usage_weekly",
  "backup_blobs",
  "sync_state",
  "cloud_tasks",
  "task_runs",
]) {
  await db.execute({
    sql: `DELETE FROM ${table} WHERE user_id IN (SELECT id FROM users WHERE ${TEST_USER})`,
  });
}
await db.execute({ sql: `DELETE FROM users WHERE ${TEST_USER}` });
console.log("cleaned:", url);
