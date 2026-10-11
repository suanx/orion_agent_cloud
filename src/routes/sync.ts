import { Hono } from "hono";
import type { Client, InValue } from "@libsql/client";
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

  // 先校验全部行、再统一写入（2026-10-11 修复）：
  // - 旧实现逐行 execute（200 行 = 200 次跨域往返，最坏 20-30s 逼近
  //   120s 上限），且中途失败会留下部分写入；行数上限检查还发生在
  //   写入之后（超限数据已落库不回滚）。
  // - 现在：先内存校验 → 一次性查出本批涉及行的现状 → 套餐行数
  //   「先检后写」→ db.batch 单次往返 + 事务写全部行。
  interface ValidRow {
    table: string;
    rowId: string;
    updatedAt: number;
    tombstone: number;
    cipher: string | null;
    nonce: string;
  }
  const valid: ValidRow[] = [];
  let skipped = 0;
  const rowKey = (t: string, r: string) => `${t}\u0000${r}`;
  const seen = new Set<string>();
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
    const key = rowKey(table, rowId);
    if (seen.has(key)) {
      skipped++; // 同批重复行：保留第一条
      continue;
    }
    seen.add(key);
    valid.push({ table, rowId, updatedAt, tombstone, cipher, nonce });
  }

  // 套餐行数「先检后写」：查出本批涉及的行里有哪些已存在，
  // 净新增数 + 当前总数不得超过上限。
  const limit0 = limit;
  if (limit0 > 0 && valid.length > 0) {
    const tables = [...new Set(valid.map((r) => r.table))];
    const existing = new Set<string>();
    // 按表分批查询（表名已过白名单，IN 参数安全）
    for (const t of tables) {
      const ids = valid.filter((r) => r.table === t).map((r) => r.rowId);
      for (let i = 0; i < ids.length; i += 100) {
        const slice = ids.slice(i, i + 100);
        const r = await db.execute({
          sql: `SELECT row_id FROM sync_state
                WHERE user_id = ? AND table_name = ? AND row_id IN (${slice.map(() => "?").join(",")})`,
          args: [user.userId, t, ...slice],
        });
        for (const row of r.rows) existing.add(rowKey(t, String(row.row_id)));
      }
    }
    const netNew = valid.filter((r) => !existing.has(rowKey(r.table, r.rowId))).length;
    const cur = await syncStats(db, user.userId);
    if (cur.rows + netNew > limit0) {
      throw errors.quota(
        `同步行数将超出套餐上限 (${cur.rows} + ${netNew} 新增 > ${limit0})，请先清理或升级套餐`,
      );
    }
  }

  // batch 单次往返 + 事务：全部成功或全部不落库。
  const stmts = valid.map((r) => ({
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
    args: [user.userId, r.table, r.rowId, r.updatedAt, r.tombstone, user.deviceId, r.cipher, r.nonce] as InValue[],
  }));
  let accepted = 0;
  if (stmts.length > 0) {
    const results = await db.batch(stmts, "write");
    // 末写胜出 WHERE 未命中（旧写入更新）不计入 accepted。
    for (const res of results) accepted += res.rowsAffected > 0 ? 1 : 0;
  }

  const stats = await syncStats(db, user.userId);
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
// 2026-10-11 修复（P1）：此前直接物理删除、不写 tombstone——与 push 的
// tombstone 设计（schema 注释「删除写 tombstone」）自相矛盾：其它设备
// pull 不到任何删除痕迹，本地数据复活/残留。现在改为写 tombstone 行
// （payload 置空），其它设备 pull 到后删本地行；tombstone 不计入
// syncStats（tombstone=0 过滤）与行数上限。
syncRoutes.delete("/rows", requireAuth, async (c) => {
  const user = c.get("user");
  const db = c.get("db");
  const table = checkTableName(c.req.query("table") ?? "");
  const rowId = c.req.query("rowId");
  const now = Date.now();
  if (rowId) {
    // 删单行：标记 tombstone（保留行以传播删除，其它设备拉到后删本地）。
    await db.execute({
      sql: `INSERT INTO sync_state
              (user_id, table_name, row_id, updated_at, tombstone, device_id, payload_encrypted, nonce)
            VALUES (?, ?, ?, ?, 1, ?, NULL, '')
            ON CONFLICT(user_id, table_name, row_id) DO UPDATE SET
              updated_at = excluded.updated_at,
              tombstone  = 1,
              device_id  = excluded.device_id,
              payload_encrypted = NULL,
              nonce      = ''`,
      args: [user.userId, table, rowId, now, user.deviceId],
    });
  } else {
    // 整表清空：现存全部行标记 tombstone（传播到其它设备）。
    await db.execute({
      sql: `UPDATE sync_state SET
              updated_at = ?, tombstone = 1, device_id = ?,
              payload_encrypted = NULL, nonce = ''
            WHERE user_id = ? AND table_name = ? AND tombstone = 0`,
      args: [now, user.deviceId, user.userId, table],
    });
  }
  return c.json({ ok: true, ...(await syncStats(db, user.userId)) });
});