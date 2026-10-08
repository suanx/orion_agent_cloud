import { Hono } from "hono";
import type { Client } from "@libsql/client";
import type { Env, Bindings } from "../env";
import { requireAuth } from "../middleware/auth";
import { errors } from "../utils/errors";
import { limitFor, parseLimitsOverride } from "../plans";

/**
 * 云端备份(整表快照)。
 *
 * 零知识: 端上用「账号密码派生密钥 + AES-GCM」加密后上传, 服务端只存密文。
 * 快照粒度 = 一张表(表名由端上定义: sessions / messages / configs / settings ...),
 * 每个 (user, device, table) 一份, 恢复时取该用户该表最新一份。
 *
 * 端点:
 *   GET    /api/backup              列出快照 + 占用统计
 *   GET    /api/backup/usage        仅占用(bytes/limit)
 *   PUT    /api/backup/:table       上传/覆盖某表快照 { payload(base64密文), nonce, updatedAt? }
 *   GET    /api/backup/:table       取回某表最新快照
 *   DELETE /api/backup/:table       删除某表快照
 *   DELETE /api/backup              清空本人全部快照
 */
export const backupRoutes = new Hono<Env>();

/** 单个快照密文上限(base64 字符数), 约 1.5MB 明文。 */
const MAX_PAYLOAD_CHARS = 2 * 1024 * 1024 * 2;
/** nonce(AES-GCM, base64) 长度校验: 12 字节 → 16 字符。 */
const NONCE_RE = /^[A-Za-z0-9+/=_-]{8,64}$/;

export function checkTableName(name: string): string {
  if (!/^[a-zA-Z0-9_]{1,32}$/.test(name)) {
    throw errors.badRequest("表名非法(仅字母/数字/下划线, ≤32 字符)");
  }
  return name;
}

export function checkCipher(payload: unknown, nonce: unknown): { payload: string; nonce: string } {
  const p = String(payload ?? "");
  const n = String(nonce ?? "");
  if (!p) throw errors.badRequest("缺少 payload(密文)");
  if (p.length > MAX_PAYLOAD_CHARS) throw errors.badRequest("单个快照过大(上限约 1.5MB 明文)");
  if (!/^[A-Za-z0-9+/=_-]+={0,2}$/.test(p)) throw errors.badRequest("payload 必须是 base64");
  if (!NONCE_RE.test(n)) throw errors.badRequest("nonce 非法(base64, 12 字节)");
  return { payload: p, nonce: n };
}

/** 用户云备份总占用(bytes)。 */
export async function backupBytes(db: Client, userId: string): Promise<number> {
  const r = await db.execute({
    sql: "SELECT coalesce(sum(length(payload_encrypted)), 0) AS b FROM backup_blobs WHERE user_id = ?",
    args: [userId],
  });
  return Number(r.rows[0]?.b ?? 0);
}

/** 套餐对云备份的字节上限。 */
export function backupLimit(c: { plan: string; env: Bindings }): number {
  return limitFor(
    c.plan as never,
    "backup_bytes",
    parseLimitsOverride(c.env.PLAN_LIMITS_OVERRIDE)
  );
}

// ---- GET /backup/usage ----
backupRoutes.get("/usage", requireAuth, async (c) => {
  const user = c.get("user");
  const db = c.get("db");
  const used = await backupBytes(db, user.userId);
  return c.json({ bytes: used, limit: backupLimit({ plan: user.plan, env: c.env }) });
});

// ---- GET /backup ----
backupRoutes.get("/", requireAuth, async (c) => {
  const user = c.get("user");
  const db = c.get("db");
  // 同一张表可能多设备各一份, 展示时取最新
  const r = await db.execute({
    sql: `SELECT table_name, device_id, length(payload_encrypted) AS size, uploaded_at
          FROM backup_blobs WHERE user_id = ?
          ORDER BY table_name, uploaded_at DESC`,
    args: [user.userId],
  });
  const latest = new Map<string, Record<string, unknown>>();
  for (const row of r.rows) {
    const t = String(row.table_name);
    if (!latest.has(t)) {
      latest.set(t, {
        table: t,
        deviceId: String(row.device_id ?? ""),
        size: Number(row.size ?? 0),
        uploadedAt: Number(row.uploaded_at ?? 0),
      });
    }
  }
  const used = await backupBytes(db, user.userId);
  return c.json({
    blobs: [...latest.values()],
    bytes: used,
    limit: backupLimit({ plan: user.plan, env: c.env }),
  });
});

// ---- PUT /backup/:table ----
backupRoutes.put("/:table", requireAuth, async (c) => {
  const user = c.get("user");
  const db = c.get("db");
  const table = checkTableName(c.req.param("table") ?? "");
  const body = await c.req.json().catch(() => ({}));
  const { payload, nonce } = checkCipher(body.payload, body.nonce);
  const now = Date.now();
  const updatedAt = Number(body.updatedAt ?? now);
  if (!Number.isFinite(updatedAt) || updatedAt <= 0) throw errors.badRequest("updatedAt 非法");

  // 配额: 现有占用 - 本表旧值 + 新值 ≤ 套餐上限
  const old = await db.execute({
    sql: "SELECT length(payload_encrypted) AS s FROM backup_blobs WHERE user_id = ? AND device_id = ? AND table_name = ?",
    args: [user.userId, user.deviceId, table],
  });
  const oldSize = Number(old.rows[0]?.s ?? 0);
  const used = await backupBytes(db, user.userId);
  const limit = backupLimit({ plan: user.plan, env: c.env });
  const next = used - oldSize + payload.length;
  if (limit > 0 && next > limit) {
    throw errors.quota(`云备份空间不足 (${fmtMb(next)}/${fmtMb(limit)}), 请先删除旧备份`);
  }

  await db.execute({
    sql: `INSERT INTO backup_blobs (user_id, device_id, table_name, payload_encrypted, uploaded_at)
          VALUES (?, ?, ?, ?, ?)
          ON CONFLICT(user_id, device_id, table_name)
          DO UPDATE SET payload_encrypted = excluded.payload_encrypted, uploaded_at = excluded.uploaded_at`,
    args: [user.userId, user.deviceId, table, `${nonce}.${payload}`, updatedAt],
  });
  return c.json({ ok: true, table, size: payload.length, bytes: next, limit });
});

// ---- GET /backup/:table ----
backupRoutes.get("/:table", requireAuth, async (c) => {
  const user = c.get("user");
  const db = c.get("db");
  const table = checkTableName(c.req.param("table") ?? "");
  const r = await db.execute({
    sql: `SELECT device_id, payload_encrypted, uploaded_at FROM backup_blobs
          WHERE user_id = ? AND table_name = ? ORDER BY uploaded_at DESC LIMIT 1`,
    args: [user.userId, table],
  });
  const row = r.rows[0];
  if (!row) throw errors.notFound("云端没有该表的备份");
  const raw = String(row.payload_encrypted);
  const dot = raw.indexOf(".");
  return c.json({
    table,
    deviceId: String(row.device_id ?? ""),
    nonce: dot > 0 ? raw.slice(0, dot) : "",
    payload: dot > 0 ? raw.slice(dot + 1) : raw,
    uploadedAt: Number(row.uploaded_at ?? 0),
  });
});

// ---- DELETE /backup/:table ----
backupRoutes.delete("/:table", requireAuth, async (c) => {
  const user = c.get("user");
  const db = c.get("db");
  const table = checkTableName(c.req.param("table") ?? "");
  await db.execute({
    sql: "DELETE FROM backup_blobs WHERE user_id = ? AND table_name = ?",
    args: [user.userId, table],
  });
  return c.json({ ok: true, table, bytes: await backupBytes(db, user.userId) });
});

// ---- DELETE /backup(清空) ----
backupRoutes.delete("/", requireAuth, async (c) => {
  const user = c.get("user");
  const db = c.get("db");
  await db.execute({ sql: "DELETE FROM backup_blobs WHERE user_id = ?", args: [user.userId] });
  return c.json({ ok: true, bytes: 0 });
});

function fmtMb(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}