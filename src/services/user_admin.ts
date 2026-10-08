import type { Client } from "@libsql/client";
import { errors } from "../utils/errors";

/**
 * 删除用户及其全部关联数据。
 *
 * ⚠️ 必须显式逐表清理，不能指望 `ON DELETE CASCADE`：
 * schema 里只有 sessions 一张表声明了 `REFERENCES users(id)`，
 * 且 libsql/SQLite 默认**不开** `PRAGMA foreign_keys`，
 * 其余表（devices / usage_* / sync_state / backup_blobs / kb_* /
 * cloud_tasks / task_runs / agent_* / share_links / audit_log）
 * 在数据库层面根本不与 users 建立约束 —— 直接 DELETE FROM users
 * 会留下大量孤儿行，而用户表里又查不到它们，等于数据泄漏且无法回收。
 *
 * 清理顺序：先子表后父表（sessions 有外键，最后删）。
 */
const CASCADE_TABLES: { table: string; label: string }[] = [
  { table: "task_runs", label: "任务执行记录" },
  { table: "cloud_tasks", label: "云端任务" },
  { table: "kb_chunks", label: "知识库分块" },
  { table: "kb_documents", label: "知识库文档" },
  { table: "sync_state", label: "多端同步行" },
  { table: "backup_blobs", label: "云备份数据" },
  { table: "share_links", label: "分享链接" },
  { table: "usage_daily", label: "每日用量" },
  { table: "usage_weekly", label: "每周用量" },
  { table: "agent_sessions", label: "Agent 会话映射" },
  { table: "agent_instances", label: "Agent 实例授权" },
  { table: "devices", label: "设备" },
  { table: "licenses", label: "卡密记录" },
  { table: "sessions", label: "登录会话" },
  { table: "audit_log", label: "审计日志（该用户相关行）" },
];

export interface DeleteUserReport {
  userId: string;
  email: string;
  /** 逐表实际删除的行数，键为表名。 */
  removed: Record<string, number>;
  /** 清理失败但不影响主流程的表（数据仍在，需人工处理）。 */
  failed: string[];
}

/**
 * 删除一个用户及其全部关联数据。
 *
 * @param keepAudit 是否保留该用户的审计日志。审计日志用于追溯管理员
 *   操作，默认**保留**（只把 user_id 置空而非删行）—— 否则删用户会
 *   让「谁在什么时候授权了谁」的记录凭空消失。
 */
export async function deleteUser(
  db: Client,
  userId: string,
  opts: { keepAudit?: boolean } = {},
): Promise<DeleteUserReport> {
  const uid = String(userId ?? "").trim();
  if (!uid) throw errors.badRequest("userId 不能为空");

  const found = await db.execute({
    sql: "SELECT id, email FROM users WHERE id = ?",
    args: [uid],
  });
  if (!found.rows[0]) throw errors.notFound("用户不存在");
  const email = String(found.rows[0].email ?? "");

  const removed: Record<string, number> = {};
  const failed: string[] = [];

  // 先把关联数据清空。逐表 try/catch：某张表不存在（比如老库没 migrate）
  // 不应该让整个删除失败。
  for (const { table, label } of CASCADE_TABLES) {
    if (opts.keepAudit && table === "audit_log") continue;
    try {
      const r = await db.execute({
        sql: `DELETE FROM ${table} WHERE user_id = ?`,
        args: [uid],
      });
      if (r.rowsAffected > 0) removed[table] = r.rowsAffected;
    } catch (e) {
      // 表不存在或结构不符：记下来，不阻断主流程
      failed.push(`${label}(${table}): ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  // 审计日志保留策略：user_id 置空，行留下
  if (opts.keepAudit) {
    try {
      const r = await db.execute({
        sql: "UPDATE audit_log SET user_id = NULL WHERE user_id = ?",
        args: [uid],
      });
      if (r.rowsAffected > 0) removed["audit_log"] = r.rowsAffected;
    } catch {
      // 审计表异常不影响用户删除
    }
  }

  // 最后删用户本体
  await db.execute({ sql: "DELETE FROM users WHERE id = ?", args: [uid] });
  removed["users"] = 1;

  return { userId: uid, email, removed, failed };
}

/**
 * 检查删除该用户会波及多少数据（供管理台二次确认展示）。
 */
export async function previewDeleteUser(
  db: Client,
  userId: string,
): Promise<{ email: string; counts: Record<string, number>; total: number }> {
  const uid = String(userId ?? "").trim();
  if (!uid) throw errors.badRequest("userId 不能为空");
  const found = await db.execute({
    sql: "SELECT email FROM users WHERE id = ?",
    args: [uid],
  });
  if (!found.rows[0]) throw errors.notFound("用户不存在");

  const counts: Record<string, number> = {};
  let total = 0;
  for (const { table, label } of CASCADE_TABLES) {
    try {
      const r = await db.execute({
        sql: `SELECT COUNT(*) AS n FROM ${table} WHERE user_id = ?`,
        args: [uid],
      });
      const n = Number(r.rows[0]?.n ?? 0);
      if (n > 0) {
        counts[label] = n;
        total += n;
      }
    } catch {
      // 表不存在：跳过
    }
  }
  return { email: String(found.rows[0].email ?? ""), counts, total };
}
