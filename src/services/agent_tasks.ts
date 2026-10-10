import type { Client } from "@libsql/client";
import { nowMs } from "../utils/crypto";

/**
 * 云端 Agent 异步任务的元数据读写。
 *
 * ⚠️ 这里**不存输出内容**：forge 的 workflow run 流本身就是持久化日志，
 * 任意时刻可用 getReadable({ startIndex }) 从任意游标重读。中继只记住
 * 「哪个任务是谁的、跑到哪个下标了」，输出由轮询时向 forge 现取。
 * 这样既省掉 KV/分片存储，也不需要后端回调写状态。
 */

export type AgentTaskStatus = "running" | "done" | "failed" | "stopped";

export interface AgentTask {
  task_id: string;
  user_id: string;
  chat_id: string;
  app_session_id: string;
  status: AgentTaskStatus;
  cursor: number;
  error: string | null;
  created_at: number;
  updated_at: number;
  finished_at: number | null;
}

/** forge workflow run 状态 → 本服务的任务状态。 */
export function mapRunStatus(runStatus: string): AgentTaskStatus {
  switch (runStatus) {
    case "completed":
      return "done";
    case "failed":
      return "failed";
    case "cancelled":
      return "stopped";
    default:
      // pending / running / workflow_suspended 都算「还在跑」
      return "running";
  }
}

export async function upsertTask(
  db: Client,
  task: {
    taskId: string;
    userId: string;
    chatId: string;
    appSessionId: string;
  },
): Promise<void> {
  const now = nowMs();
  await db.execute({
    sql: `INSERT INTO agent_tasks
            (task_id, user_id, chat_id, app_session_id, status, cursor, created_at, updated_at)
          VALUES (?, ?, ?, ?, 'running', 0, ?, ?)
          ON CONFLICT(task_id) DO UPDATE SET
            chat_id = excluded.chat_id,
            app_session_id = excluded.app_session_id,
            updated_at = excluded.updated_at`,
    args: [task.taskId, task.userId, task.chatId, task.appSessionId, now, now],
  });
}

export async function getTask(
  db: Client,
  taskId: string,
): Promise<AgentTask | null> {
  const r = await db.execute({
    sql: `SELECT task_id, user_id, chat_id, app_session_id, status, cursor, error,
                 created_at, updated_at, finished_at
          FROM agent_tasks WHERE task_id = ?`,
    args: [taskId],
  });
  const row = r.rows[0] as unknown as AgentTask | undefined;
  return row ?? null;
}

/** 游标推进 + 状态更新。终态时补 finished_at。 */
export async function advanceTask(
  db: Client,
  taskId: string,
  patch: { cursor: number; status: AgentTaskStatus; error?: string | null },
): Promise<void> {
  const now = nowMs();
  const terminal = patch.status !== "running";
  await db.execute({
    sql: `UPDATE agent_tasks
          SET cursor = ?, status = ?, error = ?, updated_at = ?,
              finished_at = CASE WHEN ? THEN ? ELSE finished_at END
          WHERE task_id = ?`,
    args: [
      patch.cursor,
      patch.status,
      patch.error ?? null,
      now,
      terminal ? 1 : 0,
      now,
      taskId,
    ],
  });
}

/** App 重开时列出「还没跑完」的任务，用于自动续接。 */
export async function listActiveTasks(
  db: Client,
  userId: string,
  limit = 20,
): Promise<AgentTask[]> {
  const r = await db.execute({
    sql: `SELECT task_id, user_id, chat_id, app_session_id, status, cursor, error,
                 created_at, updated_at, finished_at
          FROM agent_tasks
          WHERE user_id = ? AND status = 'running'
          ORDER BY updated_at DESC LIMIT ?`,
    args: [userId, limit],
  });
  return r.rows as unknown as AgentTask[];
}
