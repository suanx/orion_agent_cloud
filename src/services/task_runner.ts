import type { Client } from "@libsql/client";
import { uuid, nowMs } from "../utils/crypto";
import { nextDailyRun } from "../plans";

/**
 * 云端定时任务执行器: 由 EdgeOne Cron Trigger 触发 (POST /tasks/run-due, 管理员令牌)。
 * LLM 调用走服务端配置的 OpenAI 兼容端点(CLOUD_LLM_*), 与用户自有 Key 隔离。
 */

export interface DueTask {
  id: string;
  user_id: string;
  name: string;
  prompt: string;
  schedule_type: string;
  schedule_hour: number;
  schedule_minute: number;
  next_run_at: number | null;
}

export async function findDueTasks(db: Client, now = nowMs()): Promise<DueTask[]> {
  const r = await db.execute({
    sql: `SELECT id, user_id, name, prompt, schedule_type, schedule_hour, schedule_minute, next_run_at
          FROM cloud_tasks
          WHERE enabled = 1 AND schedule_type = 'daily' AND next_run_at IS NOT NULL AND next_run_at <= ?
          LIMIT 50`,
    args: [now],
  });
  return r.rows as unknown as DueTask[];
}

async function callLlm(env: {
  CLOUD_LLM_BASE_URL?: string;
  CLOUD_LLM_API_KEY?: string;
  CLOUD_LLM_MODEL?: string;
}, prompt: string): Promise<string> {
  const { CLOUD_LLM_BASE_URL, CLOUD_LLM_API_KEY, CLOUD_LLM_MODEL } = env;
  if (!CLOUD_LLM_BASE_URL || !CLOUD_LLM_API_KEY || !CLOUD_LLM_MODEL) {
    throw new Error("CLOUD_LLM_* 环境变量未配置, 无法执行云端任务");
  }
  const base = CLOUD_LLM_BASE_URL.replace(/\/+$/, "");
  const resp = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: { authorization: `Bearer ${CLOUD_LLM_API_KEY}`, "content-type": "application/json" },
    body: JSON.stringify({
      model: CLOUD_LLM_MODEL,
      messages: [
        { role: "system", content: "你是 orion_agent 的云端定时任务执行器。直接完成任务并输出结果正文, 不要寒暄。" },
        { role: "user", content: prompt },
      ],
      max_tokens: 2000,
    }),
  });
  if (!resp.ok) {
    const body = await resp.text().catch(() => "");
    throw new Error(`LLM HTTP ${resp.status}: ${body.slice(0, 300)}`);
  }
  const data = (await resp.json()) as { choices?: { message?: { content?: string } }[] };
  return data.choices?.[0]?.message?.content ?? "";
}

/** 占位任务下一次执行时间; manual 任务不调度。 */
export function computeNextRun(task: { schedule_type: string; schedule_hour: number; schedule_minute: number }, now = nowMs()): number | null {
  if (task.schedule_type !== "daily") return null;
  return nextDailyRun(task.schedule_hour, task.schedule_minute, new Date(now));
}

/** 单任务执行: 写 run 记录并调 LLM, 返回结果文本。 */
export async function executeTask(
  db: Client,
  env: { CLOUD_LLM_BASE_URL?: string; CLOUD_LLM_API_KEY?: string; CLOUD_LLM_MODEL?: string },
  task: { id: string; user_id: string; name: string; prompt: string },
  now = nowMs()
): Promise<{ runId: string; result: string }> {
  const runId = `r_${uuid()}`;
  await db.execute({
    sql: "INSERT INTO task_runs (id, task_id, user_id, started_at, status) VALUES (?, ?, ?, ?, 'running')",
    args: [runId, task.id, task.user_id, now],
  });
  try {
    const result = await callLlm(env, task.prompt);
    await db.execute({
      sql: "UPDATE task_runs SET finished_at = ?, status = 'ok', result = ? WHERE id = ?",
      args: [Date.now(), result, runId],
    });
    await db.execute({ sql: "UPDATE cloud_tasks SET last_status = 'ok', last_run_at = ? WHERE id = ?", args: [now, task.id] });
    return { runId, result };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await db.execute({
      sql: "UPDATE task_runs SET finished_at = ?, status = 'error', result = ? WHERE id = ?",
      args: [Date.now(), `执行失败: ${msg}`, runId],
    });
    await db.execute({ sql: "UPDATE cloud_tasks SET last_status = 'error' WHERE id = ?", args: [task.id] });
    throw e;
  }
}

/**
 * 执行所有到期任务。独立于 Hono, 便于测试。
 * 单任务失败不影响其他任务; 结果写入 task_runs。
 */
export async function runDueTasks(
  db: Client,
  env: { CLOUD_LLM_BASE_URL?: string; CLOUD_LLM_API_KEY?: string; CLOUD_LLM_MODEL?: string },
  now = nowMs()
): Promise<{ ran: number; ok: number; failed: number }> {
  const due = await findDueTasks(db, now);
  let ok = 0;
  let failed = 0;

  for (const task of due) {
    // 先抢占: 把 next_run_at 推到下一周期, 防止并发 Cron 重复执行
    const next = computeNextRun(task, now);
    const claim = await db.execute({
      sql: `UPDATE cloud_tasks SET next_run_at = ?, last_run_at = ?, last_status = 'running'
            WHERE id = ? AND next_run_at = ?`,
      args: [next, now, task.id, task.next_run_at],
    });
    if (claim.rowsAffected === 0) continue; // 被其他实例抢占

    try {
      await executeTask(db, env, task, now);
      ok++;
    } catch {
      failed++;
    }
  }
  return { ran: due.length, ok, failed };
}
