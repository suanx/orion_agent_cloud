import { Hono } from "hono";
import type { Env } from "../env";
import { errors } from "../utils/errors";
import { nowMs } from "../utils/crypto";
import { requireAdmin } from "../middleware/auth";
import { applyPlanGrant, validateAccountPlan } from "../services/account_plans";
import { audit } from "../services/audit";
import { weekStartDate } from "../plans";
import { deleteUser, previewDeleteUser } from "../services/user_admin";
import {
  deleteAgentInstance,
  getInstance,
  listAgentInstances,
  upsertAgentInstance,
} from "../services/agent_instances";
import {
  createProvider,
  deleteProvider,
  listProviders,
  updateProvider,
} from "../services/ai_providers";

export const adminRoutes = new Hono<Env>();

adminRoutes.use("*", requireAdmin);

// ---- GET /admin/users ----
adminRoutes.get("/users", async (c) => {
  const db = c.get("db");
  const r = await db.execute({
    sql: `SELECT u.id, u.email, u.plan, u.plan_expires_at, u.status, u.created_at,
                 (SELECT COUNT(*) FROM devices d WHERE d.user_id = u.id) AS device_count
          FROM users u ORDER BY u.created_at DESC LIMIT 500`,
  });
  return c.json({ users: r.rows });
});

// ---- POST /admin/users/:id/ban | unban ----
// 注意: 必须用 Hono v4 的 {a|b} 正则参数语法——旧式 :action(ban|unban) 在 v4
// 中退化为匹配任意段的普通参数, 会把后面注册的 /users/:id/plan 整个遮蔽掉
// （本地部署实测: 授权请求全落进 unban 分支, 返回 {"ok":true} 却不生效）
adminRoutes.post("/users/:id/:action{ban|unban}", async (c) => {
  const id = c.req.param("id");
  const ban = c.req.param("action") === "ban";
  const db = c.get("db");
  const r = await db.execute({
    sql: "UPDATE users SET status = ?, updated_at = ? WHERE id = ?",
    args: [ban ? "banned" : "active", nowMs(), id],
  });
  if (r.rowsAffected === 0) throw errors.notFound("用户不存在");
  if (ban) {
    await db.execute({ sql: "UPDATE sessions SET revoked = 1 WHERE user_id = ?", args: [id] });
  }
  await audit(db, id, ban ? "banned" : "unbanned", "", "");
  return c.json({ ok: true });
});

// ---- POST /admin/users/:id/plan { plan, durationDays, mode } ----
// 账号授权：直接设置/顺延套餐（取代卡密激活）。
adminRoutes.post("/users/:id/plan", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json().catch(() => ({}));
  const plan = validateAccountPlan(String(body.plan ?? ""));
  const durationDays = Number(body.durationDays ?? 0);
  const mode = body.mode === "extend" ? "extend" : "set";

  const db = c.get("db");
  const cur = await db.execute({
    sql: "SELECT plan, plan_expires_at FROM users WHERE id = ?",
    args: [id],
  });
  const row = cur.rows[0];
  if (!row) throw errors.notFound("用户不存在");

  const applied = applyPlanGrant(
    String(row.plan ?? "free"),
    (row.plan_expires_at as number | null) ?? null,
    plan,
    durationDays,
    mode as "set" | "extend"
  );

  await db.execute({
    sql: "UPDATE users SET plan = ?, plan_expires_at = ?, updated_at = ? WHERE id = ?",
    args: [applied.plan, applied.expiresAt, nowMs(), id],
  });
  await audit(db, id, "plan_grant", `${mode} ${plan} ${durationDays}d`, c.req.header("cf-connecting-ip") ?? "");

  return c.json({
    ok: true,
    plan: applied.plan,
    planExpiresAt: applied.expiresAt,
    message:
      applied.expiresAt === null
        ? applied.plan === "free"
          ? "已撤销授权（free）"
          : "已设为永久授权"
        : `已授权至 ${new Date(applied.expiresAt).toISOString()}`,
  });
});

// ---- 公告（弹窗公告）----

// ---- GET /admin/announcements ----
adminRoutes.get("/announcements", async (c) => {
  const db = c.get("db");
  const r = await db.execute(
    "SELECT id, title, content, enabled, min_version, max_version, created_at, updated_at FROM announcements ORDER BY updated_at DESC LIMIT 200"
  );
  return c.json({ announcements: r.rows });
});

// ---- POST /admin/announcements { id?, title, content, enabled, minVersion?, maxVersion? } ----
// 带 id 为更新, 不带为新建。
adminRoutes.post("/announcements", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const title = String(body.title ?? "").trim();
  const content = String(body.content ?? "").trim();
  if (!title || !content) throw errors.badRequest("title 与 content 不能为空");
  const minVersion = String(body.minVersion ?? "").trim();
  const maxVersion = String(body.maxVersion ?? "").trim();
  const enabled = body.enabled === false ? 0 : 1;
  const db = c.get("db");
  const now = nowMs();

  if (body.id) {
    const r = await db.execute({
      sql: `UPDATE announcements SET title = ?, content = ?, enabled = ?, min_version = ?, max_version = ?, updated_at = ?
            WHERE id = ?`,
      args: [title, content, enabled, minVersion, maxVersion, now, String(body.id)],
    });
    if (r.rowsAffected === 0) throw errors.notFound("公告不存在");
    await audit(db, null, "announcement_update", String(body.id), "");
    return c.json({ ok: true, id: String(body.id) });
  }

  const id = `a_${crypto.randomUUID()}`;
  await db.execute({
    sql: "INSERT INTO announcements (id, title, content, enabled, min_version, max_version, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    args: [id, title, content, enabled, minVersion, maxVersion, now, now],
  });
  await audit(db, null, "announcement_create", id, "");
  return c.json({ ok: true, id });
});

// ---- POST /admin/announcements/:id/toggle ----
adminRoutes.post("/announcements/:id/toggle", async (c) => {
  const id = c.req.param("id");
  const db = c.get("db");
  await db.execute({
    sql: "UPDATE announcements SET enabled = CASE WHEN enabled = 1 THEN 0 ELSE 1 END, updated_at = ? WHERE id = ?",
    args: [nowMs(), id],
  });
  await audit(db, null, "announcement_toggle", id, "");
  return c.json({ ok: true });
});

// ---- DELETE /admin/announcements/:id ----
adminRoutes.delete("/announcements/:id", async (c) => {
  const id = c.req.param("id");
  const db = c.get("db");
  await db.execute({ sql: "DELETE FROM announcements WHERE id = ?", args: [id] });
  await audit(db, null, "announcement_delete", id, "");
  return c.json({ ok: true });
});

// ---- GET /admin/usage?uid=&date= ----
adminRoutes.get("/usage", async (c) => {
  const uid = c.req.query("uid");
  const date = c.req.query("date");
  const db = c.get("db");
  if (uid) {
    const r = await db.execute({
      sql: "SELECT date, feature, count FROM usage_daily WHERE user_id = ? ORDER BY date DESC LIMIT 200",
      args: [uid],
    });
    return c.json({ usage: r.rows });
  }
  const r = date
    ? await db.execute({ sql: "SELECT user_id, feature, count FROM usage_daily WHERE date = ?", args: [date] })
    : await db.execute({ sql: "SELECT user_id, date, feature, count FROM usage_daily ORDER BY date DESC LIMIT 500" });
  return c.json({ usage: r.rows });
});

// ---- GET /admin/audit ----
adminRoutes.get("/audit", async (c) => {
  const db = c.get("db");
  const r = await db.execute({
    sql: "SELECT user_id, action, detail, ip, at FROM audit_log ORDER BY at DESC LIMIT 500",
  });
  return c.json({ audit: r.rows });
});

// ---- AI 模型供应商（上游 Key 加密存储, 永不回传明文）----

// ---- GET /admin/providers ----
// 列表里刻意不含 api_key_enc：管理台只需知道"配了哪家、有哪些模型、
// 启没启用"，改 Key 走编辑表单提交。
adminRoutes.get("/providers", async (c) => {
  const db = c.get("db");
  const rows = await listProviders(db);
  return c.json({
    providers: rows.map((r) => ({
      id: r.id,
      name: r.name,
      baseUrl: r.base_url,
      models: JSON.parse(r.models || "[]"),
      enabled: !!r.enabled,
      sort: r.sort,
      // 只给"已配置"这一事实, 不泄露任何 Key 片段
      keyState: "已配置",
    })),
  });
});

// ---- POST /admin/providers（新建; 带 id 为更新, apiKey 空则不改动已有 Key）----
adminRoutes.post("/providers", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const input = {
    name: String(body.name ?? ""),
    baseUrl: String(body.baseUrl ?? ""),
    apiKey: String(body.apiKey ?? ""),
    models: Array.isArray(body.models) ? body.models : [],
    enabled: body.enabled !== false,
    sort: Number(body.sort) || 0,
  };
  const db = c.get("db");
  if (body.id) {
    const id = String(body.id);
    await updateProvider(db, c.env.JWT_SECRET, id, input);
    await audit(db, null, "provider_update", id, input.name);
    return c.json({ ok: true, id });
  }
  const id = await createProvider(db, c.env.JWT_SECRET, input);
  await audit(db, null, "provider_create", id, input.name);
  return c.json({ ok: true, id });
});

// ---- DELETE /admin/providers/:id ----
adminRoutes.delete("/providers/:id", async (c) => {
  const id = c.req.param("id");
  await deleteProvider(c.get("db"), id);
  await audit(c.get("db"), null, "provider_delete", id, "");
  return c.json({ ok: true });
});

// ---- GET /admin/weekly-usage ----
// 本周额度总览：谁用了多少, 用于判断要不要给账号升档。
adminRoutes.get("/weekly-usage", async (c) => {
  const db = c.get("db");
  const week = weekStartDate();
  const r = await db.execute({
    sql: `SELECT user_id, week_start, feature, count FROM usage_weekly
          WHERE week_start = ? ORDER BY count DESC LIMIT 500`,
    args: [week],
  });
  return c.json({ weekStart: week, usage: r.rows });
});

// ---- 用户自部署 Agent 实例（orion-forge）授权 ----

// ---- GET /admin/agent-instances ----
// 列表不含密钥明文；keyConfigured 只表示"是否已配置"。
adminRoutes.get("/agent-instances", async (c) => {
  const rows = await listAgentInstances(c.get("db"));
  return c.json({
    instances: rows.map((r) => ({
      userId: r.user_id,
      email: r.email,
      plan: r.plan,
      baseUrl: r.base_url,
      enabled: !!r.enabled,
      label: r.label,
      keyConfigured: !!r.api_key_enc,
    })),
  });
});

// ---- POST /admin/agent-instances（带 userId 为更新，不带为新建）----
// App 端不提供任何入口，只有管理员在这里录入实例地址与 API Key。
adminRoutes.post("/agent-instances", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const userId = String(body.userId ?? "").trim();
  if (!userId) throw errors.badRequest("userId 不能为空");
  const baseUrl = String(body.baseUrl ?? "").trim();
  if (!baseUrl) throw errors.badRequest("实例地址不能为空");

  const db = c.get("db");
  const existed = await getInstance(db, userId);
  await upsertAgentInstance(db, c.env.JWT_SECRET, {
    userId,
    baseUrl,
    // 编辑时留空 = 不改动已有 Key
    apiKey: String(body.apiKey ?? ""),
    enabled: body.enabled !== false,
    label: String(body.label ?? ""),
  });
  await audit(
    db,
    null,
    existed ? "agent_instance_update" : "agent_instance_create",
    userId,
    baseUrl,
  );
  return c.json({ ok: true, userId });
});

// ---- DELETE /admin/agent-instances/:userId ----
adminRoutes.delete("/agent-instances/:userId", async (c) => {
  const userId = c.req.param("userId");
  await deleteAgentInstance(c.get("db"), userId);
  await audit(c.get("db"), null, "agent_instance_delete", userId, "");
  return c.json({ ok: true });
});

// ---- 删除用户 ----
// 两步式：先 GET 预览波及范围（管理台二次确认弹窗展示），再 DELETE 真正删。
// keepAudit 默认 1：审计日志行保留、user_id 置空 —— 删用户不该抹掉
// 「谁在什么时候授权了谁」的追溯记录。

// ---- GET /admin/users/:id/delete-preview ----
adminRoutes.get("/users/:id/delete-preview", async (c) => {
  const id = c.req.param("id");
  const info = await previewDeleteUser(c.get("db"), id);
  return c.json(info);
});

// ---- DELETE /admin/users/:id ----
adminRoutes.delete("/users/:id", async (c) => {
  const id = c.req.param("id");
  const db = c.get("db");
  // ?keepAudit=0 时连审计日志一起删（合规场景用，默认保留）
  const keepAudit = c.req.query("keepAudit") !== "0";
  const report = await deleteUser(db, id, { keepAudit });
  await audit(
    db,
    null,
    "user_delete",
    id,
    `${report.email} 已删除，清理 ${Object.keys(report.removed).length} 张表` +
      (report.failed.length ? `，失败: ${report.failed.join("; ")}` : ""),
  );
  return c.json({ ok: true, ...report });
});
