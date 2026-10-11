/**
 * VPS 内置定时调度器 —— 替代 EdgeOne 的 Cron Trigger。
 *
 * EdgeOne Pages 的「定时触发」是平台侧能力，迁到 VPS 后没有了，
 * 而云端任务（cloud_tasks / runDueTasks）必须有人按时叫醒，否则
 * 用户设的「每天 8:00 定时任务」永远不会执行。
 *
 * 实现取舍：直接调 runDueTasks(db, env)，**不走 HTTP 自请求**。
 * 自请求（fetch 本机 /api/tasks/run-due）多一次序列化 + 需要 ADMIN_TOKEN，
 * 还得等自己端口起来；进程内直调更简单、启动即可用、无需鉴权。
 * 该端点 POST /api/tasks/run-due 仍保留，可供外部手动触发排障。
 *
 * 调度频率：默认 5 分钟（与原来 EdgeOne Cron 的建议周期一致）。
 * 任务粒度是「每天 HH:MM」，5 分钟的检查间隔足够，不会漏也不会重复执行
 * —— runDueTasks 内部靠 next_run_at 推进 + 条件更新保证幂等。
 */
import { getDb } from "../db/client-node";
import { runDueTasks } from "../services/task_runner";
import type { Bindings } from "../env";

const INTERVAL_MS = Number(process.env.SCHEDULER_INTERVAL_MS || 5 * 60 * 1000);

let timer: NodeJS.Timeout | null = null;
let running = false;

/** 执行一轮到期任务。running 标志防止上一轮未结束就叠加下一轮。 */
async function tick(env: Bindings): Promise<void> {
  if (running) {
    console.warn("[scheduler] 上一轮尚未结束，跳过本次 tick");
    return;
  }
  running = true;
  const started = Date.now();
  try {
    const db = await getDb(env);
    const stats = await runDueTasks(db, env);
    // 全部没到期时 ran=0，属于常态，不刷日志
    if (stats.ran > 0) {
      console.log(
        `[scheduler] 执行 ${stats.ran} 个到期任务：` +
          `成功 ${stats.ok} / 失败 ${stats.failed}（耗时 ${Date.now() - started}ms）`,
      );
    }
  } catch (e) {
    // 单轮失败不能拖垮调度器：记日志后等下一轮
    console.error("[scheduler] 本轮执行出错:", e instanceof Error ? e.message : e);
  } finally {
    running = false;
  }
}

export function startScheduler(): void {
  const env = process.env as unknown as Bindings;
  // 启动时先立刻跑一轮：服务重启/崩溃恢复期间错过的到期任务能及时补上
  void tick(env);
  timer = setInterval(() => void tick(env), INTERVAL_MS);
  console.log(`[scheduler] 已启动，每 ${Math.round(INTERVAL_MS / 1000)}s 检查一次到期任务`);
  const stop = () => {
    if (timer) clearInterval(timer);
    timer = null;
  };
  process.on("SIGTERM", stop);
  process.on("SIGINT", stop);
}