# 云端 Agent 长任务异步化设计（混合模式）

> 2026-10-11 设计定稿。参考实现：桌面 `edgeone-relay`（腾讯文档三段式骨架）。
> 用户决策：① 完成后 **App 内自动续接**（不做 APNs/FCM 推送）；
> ② **混合模式**——短任务维持现有实时流，长任务降级异步 + 轮询。

## 1. 为什么不需要参考工程里的 KV + callback

参考工程假设「后端跑完才知道结果」，所以要 callback 把输出回写 EdgeOne KV。
**我们不需要**：forge 侧的 workflow run 流本身就是持久化日志——

| 能力 | 事实依据 |
|---|---|
| run 脱离请求存活 | `start(runAgentWorkflow)` 后响应断开，run 继续跑（现有 105s 截断重连就是证据） |
| 任意游标重读 | `getRun(runId).getReadable({ startIndex: N })`（`@workflow/core` run.d.ts:50） |
| 已写入总量 | `readable.getTailIndex()`（run.d.ts:35，无 chunk 时 -1） |
| 状态查询 | `run.status`（running/pending/completed/failed/canceled） |
| 主动取消 | `run.cancel()`（run.d.ts:125） |
| 并发多读者 | App 重试 4 次都在 `getReadable()`，互不影响 |

因此：**forge 的 run 流 = 唯一事实源**。中继不存 chunk、不收回调，只需一张
任务元数据表（Turso）。比参考工程少一整套 KV 分片/回调鉴权/清理逻辑。

## 2. 三端职责

```
App                        中继 (EdgeOne ≤120s)              forge (Vercel)          workflow
 │ ① POST /agent/tasks ────> 建行 agent_tasks ──────────────> POST /api/agent/chat ──> start(run)
 │      <── {taskId} 立即返回  (读到 x-workflow-run-id 即      (拿 header 后 abort 上游
 │                               abort 上游、落库、响应)        body；run 不受影响)
 │ ② 流式阶段：复用现有 POST /agent/chat SSE（不变）
 │    接近 105s 截止且 run 仍活跃 → SSE 发 task_fallback{taskId, from} → 正常关流
 │ ③ 轮询阶段：GET /agent/tasks/:id/status?from=N ──────────> GET /api/agent/streams/:id?from=N
 │      <── {status, chunks(OpenAI格式), total}  (convertChunk 转换后返回)   getReadable({startIndex:N})
 │ ④ 完成/失败 → 渲染收尾；App 重开时 GET /api/agent/tasks?active=1 自动续接
 │ ⑤ 停止：POST /agent/tasks/:id/stop ──────────────────────> POST /api/agent/streams/:id/cancel
```

### forge 新增（两个端点，均 API Key 鉴权、maxDuration=10）
- `GET  /api/agent/streams/[runId]?from=N&follow=<ms>`：
  `getReadable({startIndex:N})` → `getTailIndex()` → 立即读完已落盘部分；
  `follow>0` 时最多再等 `follow` 毫秒新 chunk（0 = 纯轮询）。
  返回 `{ status, from, total: tail+1, chunks: UI消息chunk[] }`。
- `POST /api/agent/streams/[runId]/cancel`：`run.cancel()`。

### 中继新增（orion_agent_cloud）
- `POST /api/agent/tasks`：JWT 鉴权 → 扣周额度（**只扣一次**，顺带解决
  重试重复扣费旁支）→ 调 forge chat 拿 `x-workflow-run-id`/`x-chat-id`
  → abort 上游 → Turso `agent_tasks` 落行 → 返回 `{taskId, chatId, sessionId}`。
- `GET  /api/agent/tasks/:id/status?from=N`：校验归属 → 代理 forge streams
  端点 → `convertChunk` 转成 OpenAI chunk（**与流式输出同格式，App 复用
  llm_client 解析**）→ 更新 cursor/status → 返回。
- `GET  /api/agent/tasks?active=1`：当前用户未完成任务列表（App 重开续接用）。
- `POST /api/agent/tasks/:id/stop`：代理 forge cancel + 标记 stopped。
- `/agent/chat` 流式路径改动最小化：105s 截止前若 run 仍 active，
  发一个 `task_fallback` SSE 事件（含 taskId 与 from=已转发 chunk 计数）再关流。

### App（orion_agent，本地 commit 不推送）
- `task_fallback` 事件 → 关流、切轮询循环：`status?from=cursor` 喂进
  **现有的 OpenAI chunk 解析路径**（llm_client 不用新解析器），直到终态。
- 云端会话持久化 taskId；进云端 Agent 页时查 `active=1` 有未完成任务
  → 自动续接轮询 → 完成后消息自动补齐（这就是「App 内自动续接」）。
- 停止按钮 → `stop` 端点。

## 3. Turso 表

```sql
CREATE TABLE agent_tasks (
  task_id        TEXT PRIMARY KEY,   -- = forge workflow runId
  user_id        TEXT NOT NULL,
  chat_id        TEXT NOT NULL,
  app_session_id TEXT NOT NULL,
  status         TEXT NOT NULL DEFAULT 'running', -- running|done|failed|stopped
  cursor         INTEGER NOT NULL DEFAULT 0,      -- 中继已转发 chunk 数（fallback 用）
  error          TEXT,
  created_at     INTEGER NOT NULL,
  updated_at     INTEGER NOT NULL,
  finished_at    INTEGER
);
CREATE INDEX idx_agent_tasks_user_active ON agent_tasks(user_id, status);
```

## 4. 关键取舍与已验证事实

- **游标语义**：replay 永远从 0 起（chat 路由无 startIndex 参数），所以
  「本连接已转发 chunk 数 == forge 流位置」恒成立 → fallback 事件携带的
  from 值对 App 精确。App 侧已有的前缀比对重放对齐（f79385d）兜底重叠。
- **abort 上游不杀 run**：cancelable-readable 的 cancel 只解除本 reader，
  activeStreamId 保持、workflow 继续——现有 105s 截断重连已反复验证。
- **额度**：任务创建时扣一次；轮询/status 不扣。
- **额度上限**：轮询 2s 一次，5 分钟任务 ≈150 次调用；中继免费额度 100w/月
  ≈ 6600 任务/月，可加退避（前 10s 1s，之后 3s/5s）后续优化。
- **不做**：APNs/FCM 推送（用户已选 App 内续接）、EdgeOne KV（不需要）、
  forge callback（不需要）。

## 5. 实施顺序

1. forge：streams 两个端点 + typecheck + 部署（持续授权范围内）
2. 中继：表迁移 + 三端点 + fallback 事件 + 部署
3. 端到端探测脚本：短任务流式回归 + 长任务（工具型 prompt）触发
   fallback → 轮询 → done 全链路
4. App：llm_client/providers 接 fallback + 轮询 + 续接（本地 commit，
   等发版指令）
