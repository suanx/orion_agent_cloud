import { Hono } from "hono";
import type { Client } from "@libsql/client";
import type { Env, Bindings } from "../env";
import { requireAuth } from "../middleware/auth";
import { errors } from "../utils/errors";
import { limitFor, parseLimitsOverride } from "../plans";
import { checkCipher, checkTableName } from "./backup";

/**
 * 多端同步(行级)。
 *
 * 零知识: 每行在端上独立加密(账号密码派生密钥 + AES-GCM), 服务端只见
 * table/row_id/updated_at/device 与密文, 无法解密内容。
 * 冲突策略: updated_at 末写胜出; 删除写 tombstone(不带密文), 其它设备拉到后删本地行。
 *
 * 端点:
 *   POST   /api/sync/push              上传变更批次 { rows: [{table,rowId,updatedAt,tombstone?,payload?,nonce?}] }
 *   GET    /api/sync/pull?since=&tables=&limit=   拉取变更(含密文)
 *   GET    /api/sync/changes?since=&tables=       轻量变更清单(不含密文, 用于"有哪些变了")
 *   GET    /api/sync/stats                        行数/占用统计
 *   DELETE /api/sync/rows?table=&rowId=           端上删除某行/某表(写 tombstone 或直接清)
 */
export const syncRoutes = new Hono<Env>();

const MAX_ROWS_PER_PUSH = 200;
const MAX_PAYLOAD_CHARS = 2 * 1024 * 1024 * 2;
const MAX_PULL = 500;

function rowLimit(c: { plan: string; env: Bindings }): number {
  return limitFor(c.plan as never, "sync_rows", parseLimitsOverride(c.env.PLAN_LIMITS_OVERRIDE));
}

async function syncStats(db: Client, userId: string): Promise<{ rows: number; bytes: number; tables: number }> {
  const r = await db.execute({
    sql: `SELECT count(*) AS n, count(DISTINCT table_name) AS t,
                 coalesce(sum(length(payload_encrypted)), 0) AS b
          FROM sync_state WHERE user_id = ? AND tombstone = 0`,
    args: [userId],
  });
  return {
    rows: Number(r.rows[0]?.n ?? 0),
    tables: Number(r.rows[0]?.t ?? 0),
    bytes: Number(r.rows[0]?.b ?? 0),
  };
}

// ---- POST /sync/push ----
syncRoutes.post("/push", requireAuth, async (c) => {
  const user = c.get("user");
  const db = c.get("db");
  const body = await c.req.json().catch(() => ({}));
  const rowsIn = Array.isArray(body.rows) ? (body.rows as Record<string, unknown>[]) : [];
  if (rowsIn.length === 0) throw errors.badRequest("缺少 rows");
  if (rowsIn.length > MAX_ROWS_PER_PUSH) {
    throw errors.badRequest(`单次最多推送 ${MAX_ROWS_PER_PUSH} 行`);
  }

  const limit = rowLimit({ plan: user.plan, env: c.env });
  let accepted = 0;
  let skipped = 0;

  for (const raw of rowsIn) {
    const table = checkTableName(String(raw.table ?? ""));
    const rowId = String(raw.rowId ?? "").trim();
    if (!rowId || rowId.length > 128) {
      skipped++;
      continue;
    }
    const updatedAt = Number(raw.updatedAt ?? 0);
    if (!Number.isFinite(updatedAt) || updatedAt <= 0) {
      skipped++;
      continue;
    }
    const tombstone = raw.tombstone === true ? 1 : 0;
    let cipher: string | null = null;
    let nonce = "";
    if (!tombstone) {
      try {
        const c1 = checkCipher(raw.payload, raw.nonce);
        cipher = `${c1.nonce}.${c1.payload}`;
        nonce = c1.nonce;
      } catch {
        skipped++;
        continue;
      }
    }
    if (cipher && cipher.length > MAX_PAYLOAD_CHARS) {
      skipped++;
      continue;
    }

    // 末写胜出: 仅当传入 updated_at >= 现有值才覆盖(旧设备的延迟写入不覆盖新数据)
    await db.execute({
      sql: `INSERT INTO sync_state
              (user_id, table_name, row_id, updated_at, tombstone, device_id, payload_encrypted, nonce)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(user_id, table_name, row_id) DO UPDATE SET
              updated_at = excluded.updated_at,
              tombstone  = excluded.tombstone,
              device_id  = excluded.device_id,
              payload_encrypted = excluded.payload_encrypted,
              nonce      = excluded.nonce
            WHERE excluded.updated_at >= sync_state.updated_at`,
      args: [user.userId, table, rowId, updatedAt, tombstone, user.deviceId, cipher, nonce],
    });
    accepted++;
  }

  const stats = await syncStats(db, user.userId);
  if (limit > 0 && stats.rows > limit) {
    throw errors.quota(`同步行数超出套餐上限 (${stats.rows}/${limit})`);
  }
  return c.json({ ok: true, accepted, skipped, serverTime: Date.now(), stats });
});

// ---- GET /sync/pull ----
syncRoutes.get("/pull", requireAuth, async (c) => {
  const user = c.get("user");
  const db = c.get("db");
  const since = Number(c.req.query("since") ?? 0);
  if (!Number.isFinite(since) || since < 0) throw errors.badRequest("since 非法");
  const limit = Math.min(Number(c.req.query("limit") ?? 200) || 200, MAX_PULL);
  const tables = (c.req.query("tables") ?? "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean)
    .map(checkTableName);
  if (tables.length > 8) throw errors.badRequest("tables 最多 8 张");

  const where = ["user_id = ?", "updated_at > ?"];
  const args: Array<string | number> = [user.userId, since];
  if (tables.length) {
    where.push(`table_name IN (${tables.map(() => "?").join(",")})`);
    args.push(...tables);
  }
  const r = await db.execute({
    sql: `SELECT table_name, row_id, updated_at, tombstone, device_id, payload_encrypted
          FROM sync_state WHERE ${where.join(" AND ")}
          ORDER BY updated_at ASC LIMIT ?`,
    args: [...args, limit],
  });
  return c.json({
    serverTime: Date.now(),
    rows: r.rows.map((row) => {
      const raw = String(row.payload_encrypted ?? "");
      const dot = raw.indexOf(".");
      return {
        table: String(row.table_name),
        rowId: String(row.row_id),
        updatedAt: Number(row.updated_at),
        tombstone: Number(row.tombstone) === 1,
        deviceId: String(row.device_id ?? ""),
        nonce: dot > 0 ? raw.slice(0, dot) : "",
        payload: dot > 0 ? raw.slice(dot + 1) : "",
      };
    }),
  });
});

// ---- GET /sync/changes(轻量, 不含密文) ----
syncRoutes.get("/changes", requireAuth, async (c) => {
  const user = c.get("user");
  const db = c.get("db");
  const since = Number(c.req.query("since") ?? 0);
  if (!Number.isFinite(since) || since < 0) throw errors.badRequest("since 非法");
  const r = await db.execute({
    sql: `SELECT table_name, row_id, updated_at, tombstone, device_id
          FROM sync_state WHERE user_id = ? AND updated_at > ?
          ORDER BY updated_at ASC LIMIT ?`,
    args: [user.userId, since, MAX_PULL],
  });
  return c.json({
    serverTime: Date.now(),
    changes: r.rows.map((row) => ({
      table: String(row.table_name),
      rowId: String(row.row_id),
      updatedAt: Number(row.updated_at),
      tombstone: Number(row.tombstone) === 1,
      deviceId: String(row.device_id ?? ""),
    })),
  });
});

// ---- GET /sync/stats ----
syncRoutes.get("/stats", requireAuth, async (c) => {
  const user = c.get("user");
  const db = c.get("db");
  const stats = await syncStats(db, user.userId);
  return c.json({ ...stats, rowLimit: rowLimit({ plan: user.plan, env: c.env }) });
});

// ---- DELETE /sync/rows?table=&rowId= ----
syncRoutes.delete("/rows", requireAuth, async (c) => {
  const user = c.get("user");
  const db = c.get("db");
  const table = checkTableName(c.req.query("table") ?? "");
  const rowId = c.req.query("rowId");
  if (rowId) {
    // 删单行: 直接移除(端上已确认不需要, 不再传播 tombstone)
    await db.execute({
      sql: "DELETE FROM sync_state WHERE user_id = ? AND table_name = ? AND row_id = ?",
      args: [user.userId, table, rowId],
    });
  } else {
    await db.execute({
      sql: "DELETE FROM sync_state WHERE user_id = ? AND table_name = ?",
      args: [user.userId, table],
    });
  }
  return c.json({ ok: true, ...(await syncStats(db, user.userId)) });
});