import { Hono } from "hono";
import type { Env } from "../env";
import { errors } from "../utils/errors";
import { uuid, nowMs } from "../utils/crypto";
import { requireAuth, requireAdmin } from "../middleware/auth";
import { consumeQuota } from "../services/quota";
import { parseLimitsOverride, nextDailyRun } from "../plans";
import { executeTask, runDueTasks } from "../services/task_runner";

export const taskRoutes = new Hono<Env>();

const MAX_TASKS_BY_PLAN: Record<string, number> = { free: 1, trial: 5, pro: 20, lifetime: 20 };

// ---- GET /tasks ----
taskRoutes.get("/", requireAuth, async (c) => {
  const db = c.get("db");
  const r = await db.execute({
    sql: `SELECT id, name, prompt, schedule_type, schedule_hour, schedule_minute, enabled,
                 next_run_at, last_run_at, last_status, created_at
          FROM cloud_tasks WHERE user_id = ? ORDER BY created_at DESC`,
    args: [c.get("user").userId],
  });
  return c.json({ tasks: r.rows });
});

// ---- POST /tasks { name, prompt, scheduleType, scheduleHour, scheduleMinute } ----
taskRoutes.post("/", requireAuth, async (c) => {
  const user = c.get("user");
  const body = await c.req.json().catch(() => ({}));
  const name = String(body.name ?? "").trim().slice(0, 100);
  const prompt = String(body.prompt ?? "").trim().slice(0, 8000);
  const scheduleType = body.scheduleType === "manual" ? "manual" : "daily";
  // NaN 守卫（2026-10-11）：传 "abc" 时 Number=NaN，clamp 全失效 →
  // INSERT NaN 或产出 Invalid Date。非法值回落默认。
  const numOr = (v: unknown, d: number) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : d;
  };
  const hour = Math.min(Math.max(numOr(body.scheduleHour ?? 8, 8), 0), 23);
  const minute = Math.min(Math.max(numOr(body.scheduleMinute ?? 0, 0), 0), 59);
  if (!name || !prompt) throw errors.badRequest("缺少 name/prompt");

  const db = c.get("db");
  const count = await db.execute({
    sql: "SELECT COUNT(*) AS n FROM cloud_tasks WHERE user_id = ?",
    args: [user.userId],
  });
  const maxTasks = MAX_TASKS_BY_PLAN[user.plan] ?? 1;
  if (Number(count.rows[0]?.n ?? 0) >= maxTasks) {
    throw errors.quota(`当前套餐最多 ${maxTasks} 个云端任务, 请升级或删除旧任务`);
  }

  const id = `t_${uuid()}`;
  const nextRun = scheduleType === "daily" ? nextDailyRun(hour, minute) : null;
  await db.execute({
    sql: `INSERT INTO cloud_tasks (id, user_id, name, prompt, schedule_type, schedule_hour, schedule_minute, enabled, next_run_at, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
    args: [id, user.userId, name, prompt, scheduleType, hour, minute, nextRun, nowMs()],
  });
  return c.json({ ok: true, id, nextRunAt: nextRun });
});

// ---- DELETE /tasks/:id ----
taskRoutes.delete("/:id", requireAuth, async (c) => {
  const db = c.get("db");
  const r = await db.execute({
    sql: "DELETE FROM cloud_tasks WHERE id = ? AND user_id = ?",
    args: [String(c.req.param("id") ?? ""), c.get("user").userId],
  });
  if (r.rowsAffected === 0) throw errors.notFound("任务不存在");
  await db.execute({
    sql: "DELETE FROM task_runs WHERE task_id = ? AND user_id = ?",
    args: [String(c.req.param("id") ?? ""), c.get("user").userId],
  });
  return c.json({ ok: true });
});

// ---- PATCH /tasks/:id { enabled? } ----
taskRoutes.patch("/:id", requireAuth, async (c) => {
  const body = await c.req.json().catch(() => ({}));
  if (typeof body.enabled !== "boolean") throw errors.badRequest("仅支持更新 enabled 字段");

  const user = c.get("user");
  const db = c.get("db");
  const id = String(c.req.param("id") ?? "");

  if (!body.enabled) {
    const r = await db.execute({
      sql: "UPDATE cloud_tasks SET enabled = 0 WHERE id = ? AND user_id = ?",
      args: [id, user.userId],
    });
    if (r.rowsAffected === 0) throw errors.notFound("任务不存在");
    return c.json({ ok: true });
  }

  // 重新启用: 按当前时刻重算下次执行时间
  const task = await db.execute({
    sql: "SELECT schedule_hour, schedule_minute, schedule_type FROM cloud_tasks WHERE id = ? AND user_id = ?",
    args: [id, user.userId],
  });
  const row = task.rows[0];
  if (!row) throw errors.notFound("任务不存在");
  const nextRun =
    String(row.schedule_type) === "daily"
      ? nextDailyRun(Number(row.schedule_hour), Number(row.schedule_minute))
      : null;
  await db.execute({
    sql: "UPDATE cloud_tasks SET enabled = 1, next_run_at = ? WHERE id = ? AND user_id = ?",
    args: [nextRun, id, user.userId],
  });
  return c.json({ ok: true, nextRunAt: nextRun });
});

// ---- GET /tasks/results?after=<ms> (App 打开时拉取补跑结果) ----
taskRoutes.get("/results", requireAuth, async (c) => {
  const after = Number(c.req.query("after") ?? 0);
  const db = c.get("db");
  const r = await db.execute({
    sql: `SELECT r.id, r.task_id, t.name AS task_name, r.started_at, r.finished_at, r.status, r.result
          FROM task_runs r JOIN cloud_tasks t ON t.id = r.task_id
          WHERE r.user_id = ? AND r.started_at > ? AND r.status != 'running'
          ORDER BY r.started_at DESC LIMIT 100`,
    args: [c.get("user").userId, after],
  });
  return c.json({
    results: r.rows.map((row) => ({
      id: row.id,
      taskId: row.task_id,
      taskName: row.task_name,
      startedAt: row.started_at,
      finishedAt: row.finished_at,
      status: row.status,
      result: row.result,
    })),
    serverTime: nowMs(),
  });
});

// ---- POST /tasks/run-due (EdgeOne Cron Trigger 调用, 管理员令牌) ----
taskRoutes.post("/run-due", requireAdmin, async (c) => {
  const db = c.get("db");
  const stats = await runDueTasks(db, c.env);
  return c.json({ ok: true, ran: stats.ran, succeeded: stats.ok, failed: stats.failed });
});

// 手动立即执行一次自己的任务(消耗 task_run 配额)
taskRoutes.post("/:id/run", requireAuth, async (c) => {
  const user = c.get("user");
  const db = c.get("db");
  const override = parseLimitsOverride(c.env.PLAN_LIMITS_OVERRIDE);
  await consumeQuota(db, user.userId, user.plan, "task_run", override);

  const task = await db.execute({
    sql: "SELECT id, user_id, name, prompt FROM cloud_tasks WHERE id = ? AND user_id = ?",
    args: [String(c.req.param("id") ?? ""), user.userId],
  });
  const row = task.rows[0];
  if (!row) throw errors.notFound("任务不存在");

  try {
    const { result } = await executeTask(db, c.env, {
      id: String(row.id),
      user_id: String(row.user_id),
      name: String(row.name),
      prompt: String(row.prompt),
    });
    return c.json({ ok: true, result });
  } catch (e) {
    throw errors.internal(`任务执行失败: ${e instanceof Error ? e.message : String(e)}`);
  }
});
