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
const CASCADE_TABLES: {
  table: string;
  label: string;
  /** 该表关联用户的列名，默认 user_id。 */
  column?: string;
  /** true = 解绑归还而非删行（用于卡密等库存资产）。 */
  unbind?: boolean;
}[] = [
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
  // licenses 特殊处理（见下）：列名是 bound_user_id 而非 user_id，
  // 且卡密是发卡库存资产 —— 删用户应解绑归还库存，而不是删行。
  { table: "licenses", label: "卡密记录", column: "bound_user_id", unbind: true },
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

/** 一条待执行语句（batch 用）。 */
interface Stmt {
  sql: string;
  args: unknown[];
  /** 归属表名，用于统计 removed。 */
  table: string;
  label: string;
}

/**
 * 按清理清单构造语句序列（先子表后父表）。
 *
 * 抽出来是为了让「批量事务」与「逐表兜底」两条路径共用同一份语句，
 * 不出现两处 SQL 各写一遍、改一处漏一处的风险。
 */
function buildCleanupStatements(uid: string, keepAudit: boolean): Stmt[] {
  const stmts: Stmt[] = [];
  for (const { table, label, column = "user_id", unbind } of CASCADE_TABLES) {
    // 保留审计日志时跳过 audit_log 的删除，改走下面的置空语句
    if (keepAudit && table === "audit_log") continue;
    stmts.push(
      unbind
        ? {
            // unbind 表（licenses）：解绑归还库存而非删行
            sql: `UPDATE ${table} SET ${column} = NULL, bound_at = NULL, status = 'unused' WHERE ${column} = ?`,
            args: [uid],
            table,
            label,
          }
        : {
            sql: `DELETE FROM ${table} WHERE ${column} = ?`,
            args: [uid],
            table,
            label,
          },
    );
  }
  if (keepAudit) {
    stmts.push({
      sql: "UPDATE audit_log SET user_id = NULL WHERE user_id = ?",
      args: [uid],
      table: "audit_log",
      label: "审计日志（已保留，仅解除关联）",
    });
  }
  // 最后删用户本体
  stmts.push({
    sql: "DELETE FROM users WHERE id = ?",
    args: [uid],
    table: "users",
    label: "用户",
  });
  return stmts;
}

/**
 * 删除一个用户及其全部关联数据。
 *
 * ⚠️ 性能（2026-10-11 管理台「删除卡死」修复）：
 * 清理涉及十几张表，若逐表 `await db.execute()`，每张表都是一次
 * EdgeOne（国内）→ Turso（ap-northeast-1）的跨域 HTTP 往返，实测单表
 * 110~160ms、整体 2~3 秒；管理台页面此时没有任何 loading，用户看到的就是
 * 「点删除后界面假死」。改为**一次 batch 事务**把全部语句提交，往返次数
 * 从 ~16 次降到 1 次。
 *
 * batch 失败（例如老库缺表）时自动回退到逐表串行 + 逐表容错，保证
 * 「部分表不存在也能把用户删掉」的原有语义不变。
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
  const stmts = buildCleanupStatements(uid, opts.keepAudit !== false);

  // ---- 快路径：一次事务批量提交 ----
  try {
    const results = await db.batch(
      stmts.map((s) => ({ sql: s.sql, args: s.args as never[] })),
      "write",
    );
    for (let i = 0; i < stmts.length; i++) {
      const n = results[i]?.rowsAffected ?? 0;
      if (n > 0) removed[stmts[i].table] = n;
    }
    return { userId: uid, email, removed, failed };
  } catch (e) {
    // 批量路径失败（多为缺表/结构不符）：清空统计，走下面的逐表兜底
    failed.push(
      `批量清理失败，已回退逐表清理：${e instanceof Error ? e.message : String(e)}`,
    );
    for (const k of Object.keys(removed)) delete removed[k];
  }

  // ---- 兜底路径：逐表串行 + 逐表 try/catch ----
  // 某张表不存在（比如老库没 migrate）不应该让整个删除失败。
  for (const { sql, args, table, label } of stmts) {
    try {
      const r = await db.execute({ sql, args: args as never[] });
      if (r.rowsAffected > 0) removed[table] = r.rowsAffected;
    } catch (e) {
      failed.push(`${label}(${table}): ${e instanceof Error ? e.message : String(e)}`);
    }
  }

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

  // ---- 快路径：一次往返统计全部表 ----
  // 与 deleteUser 同理：逐表 COUNT 是十几趟跨域往返（实测预览 ~2.5s），
  // 在管理台表现为「点删除后弹窗半天不出数字、像卡住」。合并成一条 SQL。
  const items = CASCADE_TABLES.map(({ table, label, column = "user_id" }) => ({
    table,
    label,
    column,
  }));
  try {
    const sql =
      "SELECT " +
      items
        .map((it, i) => `(SELECT COUNT(*) FROM ${it.table} WHERE ${it.column} = ?) AS c${i}`)
        .join(", ");
    const r = await db.execute({ sql, args: items.map(() => uid) as never[] });
    const row = r.rows[0] as unknown as Record<string, unknown> | undefined;
    if (row) {
      for (let i = 0; i < items.length; i++) {
        const n = Number(row[`c${i}`] ?? 0);
        if (n > 0) {
          counts[items[i].label] = n;
          total += n;
        }
      }
      return { email: String(found.rows[0].email ?? ""), counts, total };
    }
  } catch {
    // 缺表或结构不符：清空结果，走下面的逐表兜底
    for (const k of Object.keys(counts)) delete counts[k];
    total = 0;
  }

  // ---- 兜底路径：逐表统计 ----
  for (const { table, label, column = "user_id" } of items) {
    try {
      const r = await db.execute({
        sql: `SELECT COUNT(*) AS n FROM ${table} WHERE ${column} = ?`,
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
