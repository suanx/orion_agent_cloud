import { describe, expect, it, beforeEach } from "vitest";
import { createClient, type Client } from "@libsql/client";
import { deleteUser, previewDeleteUser } from "../src/services/user_admin";

/**
 * 删除用户的级联清理测试。
 *
 * 用真实的内存 SQLite，而不是 mock —— 级联清理的正确性取决于
 * 「哪些表有数据、哪些表没有」以及 rowsAffected 的真实行为，
 * mock 掉就没测到东西。
 */

const TABLES = [
  "sessions",
  "devices",
  "usage_daily",
  "usage_weekly",
  "sync_state",
  "backup_blobs",
  "licenses",
  "cloud_tasks",
  "task_runs",
  "kb_documents",
  "kb_chunks",
  "share_links",
  "agent_instances",
  "agent_sessions",
  "audit_log",
];

async function newDb(): Promise<Client> {
  const db = createClient({ url: "file::memory:" });
  await db.execute(
    `CREATE TABLE users (id TEXT PRIMARY KEY, email TEXT UNIQUE,
       password_hash TEXT, plan TEXT DEFAULT 'free', status TEXT DEFAULT 'active',
       created_at INTEGER, updated_at INTEGER)`,
  );
  for (const t of TABLES) {
    await db.execute(
      `CREATE TABLE ${t} (user_id TEXT${t === "audit_log" ? ", action TEXT" : ""})`,
    );
  }
  // cloud_tasks 被 task_runs 引用，这里不建外键约束——
  // 真实 schema 里有，但 libsql 默认不开 foreign_keys，
  // 正因如此删除必须显式逐表清理（见 user_admin.ts 顶部说明）。
  return db;
}

async function seed(db: Client, userId: string, counts: Record<string, number>) {
  await db.execute({
    sql: "INSERT INTO users (id,email,password_hash,created_at,updated_at) VALUES (?,?,?,?,?)",
    args: [userId, `${userId}@test.dev`, "x", 1000, 1000],
  });
  for (const [table, n] of Object.entries(counts)) {
    // audit_log 额外有 action 列（非空），其余表只有 user_id
    const cols = table === "audit_log" ? "user_id, action" : "user_id";
    const ph = table === "audit_log" ? "?, 'login'" : "?";
    for (let i = 0; i < n; i++) {
      await db.execute({
        sql: `INSERT INTO ${table} (${cols}) VALUES (${ph})`,
        args: [userId],
      });
    }
  }
}

async function countOf(db: Client, table: string, userId: string): Promise<number> {
  const r = await db.execute({
    sql: `SELECT COUNT(*) AS n FROM ${table} WHERE user_id = ?`,
    args: [userId],
  });
  return Number(r.rows[0]?.n ?? 0);
}

describe("deleteUser 级联清理", () => {
  let db: Client;
  beforeEach(async () => {
    db = await newDb();
  });

  it("删除不存在的用户报错", async () => {
    await expect(deleteUser(db, "u_missing")).rejects.toThrow();
  });

  it("空 userId 被拒绝", async () => {
    await expect(deleteUser(db, "   ")).rejects.toThrow();
  });

  it("删掉用户本体", async () => {
    await seed(db, "u_1", {});
    await deleteUser(db, "u_1");
    const r = await db.execute("SELECT COUNT(*) AS n FROM users WHERE id = 'u_1'");
    expect(Number(r.rows[0]?.n)).toBe(0);
  });

  it("级联清理全部关联表，不留孤儿行", async () => {
    // 每张表都塞 3 行，若有表漏清就会残留
    const counts: Record<string, number> = {};
    for (const t of TABLES) counts[t] = 3;
    await seed(db, "u_2", counts);

    const report = await deleteUser(db, "u_2");

    for (const t of TABLES) {
      const left = await countOf(db, t, "u_2");
      expect(left, `${t} 仍有残留`).toBe(0);
    }
    expect(Object.keys(report.removed).length).toBeGreaterThan(0);
  });

  it("默认保留审计日志（user_id 置空而非删行）", async () => {
    await seed(db, "u_3", { audit_log: 5, devices: 2 });
    const report = await deleteUser(db, "u_3", { keepAudit: true });

    const rows = await db.execute("SELECT user_id FROM audit_log");
    expect(rows.rows.length).toBe(5);
    for (const r of rows.rows) expect(r.user_id).toBeNull();
    expect(report.failed).toEqual([]);
  });

  it("keepAudit=false 时审计日志一起删", async () => {
    await seed(db, "u_4", { audit_log: 3 });
    await deleteUser(db, "u_4", { keepAudit: false });
    const r = await db.execute("SELECT COUNT(*) AS n FROM audit_log");
    expect(Number(r.rows[0]?.n)).toBe(0);
  });

  it("只影响目标用户，其他用户数据不动", async () => {
    await seed(db, "u_a", { devices: 2, audit_log: 1 });
    await seed(db, "u_b", { devices: 7, audit_log: 3 });

    await deleteUser(db, "u_a");

    expect(await countOf(db, "devices", "u_b")).toBe(7);
    const auditB = await db.execute(
      "SELECT COUNT(*) AS n FROM audit_log WHERE user_id = 'u_b'",
    );
    expect(Number(auditB.rows[0]?.n)).toBe(3);
  });

  it("表缺失时记录到 failed 但不中断删除", async () => {
    // 造一个 schema 里没有的表，验证不阻断
    const db2 = createClient({ url: "file::memory:" });
    await db2.execute(
      "CREATE TABLE users (id TEXT PRIMARY KEY, email TEXT, password_hash TEXT, plan TEXT, status TEXT, created_at INTEGER, updated_at INTEGER)",
    );
    await db2.execute({
      sql: "INSERT INTO users VALUES ('u_5','u_5@t.dev','x','free','active',1,1)",
    });
    // db2 只有 users 表 —— 所有子表都会失败
    const report = await deleteUser(db2, "u_5");
    expect(report.failed.length).toBeGreaterThan(0);
    // 关键：用户本体仍被删掉了
    const r = await db2.execute("SELECT COUNT(*) AS n FROM users WHERE id='u_5'");
    expect(Number(r.rows[0]?.n)).toBe(0);
  });
});

describe("previewDeleteUser", () => {
  it("统计各类数据的条数与总数", async () => {
    const db = await newDb();
    await seed(db, "u_6", { devices: 4, usage_daily: 6, backup_blobs: 2 });

    const info = await previewDeleteUser(db, "u_6");
    expect(info.email).toBe("u_6@test.dev");
    expect(info.counts["设备"]).toBe(4);
    expect(info.counts["每日用量"]).toBe(6);
    expect(info.counts["云备份数据"]).toBe(2);
    expect(info.total).toBe(12);
  });

  it("空用户只统计到 0", async () => {
    const db = await newDb();
    await seed(db, "u_7", {});
    const info = await previewDeleteUser(db, "u_7");
    expect(info.total).toBe(0);
    expect(Object.keys(info.counts)).toHaveLength(0);
  });

  it("用户不存在报错", async () => {
    const db = await newDb();
    await expect(previewDeleteUser(db, "nope")).rejects.toThrow();
  });

  it("预览不修改任何数据", async () => {
    const db = await newDb();
    await seed(db, "u_8", { devices: 3 });
    await previewDeleteUser(db, "u_8");
    expect(await countOf(db, "devices", "u_8")).toBe(3);
  });
});
