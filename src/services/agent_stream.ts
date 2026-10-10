/**
 * AI SDK UI Message 流 → OpenAI 兼容 chat/completions SSE。
 *
 * 为什么需要：App 端的对话链路（[LlmClient]）只会解析 OpenAI 协议
 * （`choices[0].delta.content` / `delta.tool_calls` / `data: [DONE]`），
 * 而用户的 orion-forge 实例吐的是 Vercel AI SDK 的类型化事件流
 * （`text-start` / `text-delta` / `tool-input-available` ...）。
 * 两者事件形态完全不同，必须在这里转换。
 *
 * 转换规则（只映射 App 真正用得上的事件，其余静默丢弃）：
 *   text-delta              → delta.content
 *   reasoning-delta         → delta.reasoning_content
 *   tool-input-available    → 丢弃（工具循环在 forge 侧完成，绝不下发
 *                             tool_calls——否则 App 会再开一层本地工具
 *                             循环，触发上游重复执行整个任务，详见该分支注释）
 *   finish                  → finish_reason=stop + [DONE]
 *   error                   → 以 finish_reason=stop 收尾，正文带错误提示
 *
 * 另外：等待上游期间每 12s 发一帧 SSE 注释（": keepalive"）防止边缘节点
 * 因空闲切断连接；注释行会被客户端解析器自然跳过。
 */

export type AiSdkChunk = {
  type?: string;
  id?: string;
  delta?: string;
  text?: string;
  errorText?: string;
  toolCallId?: string;
  toolName?: string;
  input?: unknown;
  providerExecuted?: boolean;
};

const DONE = "data: [DONE]\n\n";

function sse(payload: Record<string, unknown>): string {
  return `data: ${JSON.stringify(payload)}\n\n`;
}

/** 生成一个 chunk 骨架，字段与 OpenAI chat.completion.chunk 对齐。 */
function chunk(delta: Record<string, unknown>, finishReason: string | null): string {
  return sse({
    id: "orion-agent",
    object: "chat.completion.chunk",
    created: Math.floor(Date.now() / 1000),
    model: "agent",
    choices: [{ index: 0, delta, finish_reason: finishReason }],
  });
}

/**
 * 单个 AI SDK 事件 → OpenAI delta 对象（供 App 渲染）。
 * 返回 null 表示该事件无需转发（工具事件、边界事件等）。
 *
 * 抽出来是为了让**轮询路径复用同一套映射**——流式与轮询下发给 App 的
 * delta 形态必须完全一致，否则 App 要写两套渲染逻辑。
 */
export function chunkToDelta(raw: string): Record<string, unknown> | null {
  let event: AiSdkChunk;
  try {
    event = JSON.parse(raw) as AiSdkChunk;
  } catch {
    return null; // 半截 JSON（SSE 分包）或非对象，直接忽略
  }
  if (!event || typeof event.type !== "string") return null;

  switch (event.type) {
    case "text-delta": {
      const text = event.delta ?? event.text ?? "";
      if (!text) return null;
      return { content: text };
    }

    case "reasoning-delta": {
      const text = event.delta ?? event.text ?? "";
      if (!text) return null;
      return { reasoning_content: text };
    }

    case "tool-input-available": {
      // ⚠️ 全部丢弃，绝不转发（2026-10-10 根因修复）。
      //
      // 云端 Agent 的工具循环完全在 orion-forge 侧执行（auto-approve、
      // maxSteps 500），一轮请求 = 一次完整的 Agent 任务。若把这些事件
      // 转成 OpenAI tool_calls 发给 App，App 的 AgentOrchestrator 会把它
      // 当作「模型要 App 本地执行工具」→ 在手机上执行 forge 的沙箱工具
      // （tool-write/bash 等，全部失败）→ 回填错误结果 → 发起第二轮请求
      // → forge 又重跑一遍整个任务 → 双层循环无限嵌套。
      // 症状：简单问答能回复，只要 Agent 用一次工具，App 端就长时间
      // 「没有任何回复内容」（2026-10-10 用户实测 v0.2.45/46 复现）。
      //
      // providerExecuted 的平台工具（如网页搜索）本来就该丢；此处对
      // 本地工具一并丢弃——App 只消费最终文本，工具过程信息不下发。
      return null;
    }

    // 工具审批请求：App 场景下 orion-forge 已被配置为自动放行（见
    // /api/agent/chat 的 agentOptions.toolApproval），理论上不会到这里。
    // 万一实例配置有变而真的发出来了，转成正文提示——让用户知道
    // "Agent 在等一个没人点的确认"，好过流静默停住看不出原因。
    case "tool-approval-request": {
      const name = event.toolName || "某个操作";
      return {
        content: `\n\n⚠️ Agent 请求确认「${name}」，但当前调用方无法应答审批，已跳过。`,
      };
    }

    // 客户端主动中断 / 正常结束 / 出错：delta 为空，终止语义见
    // terminalOf()——abort 不能转成 stop，否则 App 会把「被取消」误认
    // 为「正常结束」。
    case "abort":
    case "finish":
      return null;

    case "tool-output-available":
    case "tool-input-start":
    case "tool-input-delta":
    case "tool-output-error":
    case "tool-input-error":
    case "tool-output-denied":
    // 文本与思考的起止边界：App 只关心增量内容，起止本身无意义
    case "text-start":
    case "text-end":
    case "reasoning-start":
    case "reasoning-end":
    // 元数据（模型 id、耗时等）：App 从响应头拿，不从流里读
    case "message-metadata":
    case "start":
    case "start-step":
    case "finish-step":
      return null; // App 侧不需要这些中间态

    // source-url / source-document（引用来源）：App 无对应展示位，
    // 丢弃即可。若日后要显示引用，需在 App 侧加事件类型。

    case "error": {
      // 以正常收尾结束，把错误作为正文回传 —— App 拿到的是可读提示，
      // 而不是半截流突然中断。
      const msg = event.errorText || "Agent 执行出错";
      return { content: `\n\n⚠️ ${msg}` };
    }

    default:
      return null;
  }
}

/**
 * 事件的终止语义：null = 流继续；"stop" = 正常收尾；"done" = 只补 [DONE]。
 * 与 chunkToDelta 分开是为了让轮询路径也能判断终态。
 */
export function terminalOf(raw: string): "stop" | "done" | null {
  let event: AiSdkChunk;
  try {
    event = JSON.parse(raw) as AiSdkChunk;
  } catch {
    return null;
  }
  if (!event || typeof event.type !== "string") return null;
  if (event.type === "finish") return "stop";
  if (event.type === "error") return "stop";
  if (event.type === "abort") return "done";
  return null;
}

/**
 * 转换单个 AI SDK 事件为 0~n 个 OpenAI 兼容 SSE 片段（流式路径用）。
 * 返回空数组表示该事件无需转发。
 */
export function convertChunk(raw: string): string[] {
  const delta = chunkToDelta(raw);
  const terminal = terminalOf(raw);
  const out: string[] = [];
  if (delta && Object.keys(delta).length > 0) out.push(chunk(delta, null));
  if (terminal === "stop") {
    out.push(chunk({}, "stop"), DONE);
  } else if (terminal === "done") {
    out.push(DONE);
  }
  return out;
}

export interface ConvertStreamOptions {
  /**
   * forge workflow runId（= 异步任务 id）。给了它，105s 兜底就不是「报错
   * 关流」而是「降级信号」：额外发一帧 task_fallback，App 据此改为轮询
   * GET /agent/tasks/:id/status?from=... 把剩余输出接完。
   */
  taskId?: string;
}

/**
 * 把一个 ReadableStream（AI SDK SSE）整体转换为 OpenAI 兼容 SSE。
 *
 * 入参格式为 `data: {...}\n\n` 的 SSE 行；非 data 行（注释、event: 行）忽略。
 */
export function convertStream(
  upstream: ReadableStream<Uint8Array>,
  options: ConvertStreamOptions = {},
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  let buffer = "";
  // 兜底：上游异常/提前结束时补一个 [DONE]，否则 App 会一直等下去
  let finished = false;
  /** 已消费的 forge chunk 数 = 下次轮询的 startIndex（forge 流下标）。 */
  let consumedChunks = 0;

  const reader = upstream.getReader();
  // 进行中的上游读取：keepalive 空转期间 read() 的 Promise 必须缓存复用，
  // 否则会对同一 reader 并发排多条 read。
  let pendingRead: Promise<ReadableStreamReadResult<Uint8Array>> | null = null;

  /** keepalive 间隔：边缘节点（EdgeOne/CDN）对无数据响应流通常 30~60s
   * 切连接；12s 一帧注释保活，长任务（Agent 沙箱跑几分钟）不再被拦腰
   * 断开（App 端症状：HttpException Connection closed while receiving
   * data）。注释帧以 ":" 开头，非 data 行，客户端解析器一律跳过。 */
  const KEEPALIVE_MS = 12_000;
  const KEEPALIVE_FRAME = encoder.encode(": keepalive\n\n");

  /** 总时长硬截止（2026-10-10 根因修复）。
   *
   * EdgeOne Cloud Functions maxDuration 平台上限 120s（官方 10~120s，
   * 无法调高）：超时后平台强杀整个函数，客户端收到的是**不可解析的
   * 504 HTML 页**（App 表现为请求失败/一直转圈）。此前 forge 侧看门狗
   * 也是 120s，与平台上限同归于尽——看门狗永远慢一步，可读错误永远
   * 到不了客户端（2026-10-10 端到端实测 504@122s）。
   *
   * 现在中继在 105s 主动收尾：给上游留 ~15s 余量的同时，保证以一条
   * OpenAI 兼容的错误 chunk + [DONE] 正常关流，App 能解析出明确提示。
   * forge 侧模型看门狗 80s 会先触发并送达真正的根因文案；本截止只兜
   * 「forge 整体静默/超长任务」的底。 */
  const TOTAL_DEADLINE_MS = 105_000;
  const startedAt = Date.now();

  /** 处理缓冲区里的完整事件，返回是否已收到 [DONE]。 */
  const drainBuffer = (controller: ReadableStreamDefaultController<Uint8Array>): boolean => {
    let sawDone = false;
    // SSE 以空行分隔事件；最后一段可能不完整，留到下一轮
    let idx: number;
    while ((idx = buffer.indexOf("\n\n")) !== -1) {
      const rawEvent = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      for (const line of rawEvent.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;
        const payload = trimmed.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;
        // 每个 UI chunk 都占 forge 流的一个下标（不管有没有转成 delta），
        // 所以计数必须在转换之前——它才是轮询续接的正确游标。
        consumedChunks += 1;
        const out = convertChunk(payload);
        for (const piece of out) controller.enqueue(encoder.encode(piece));
        if (out.some((p) => p.includes("[DONE]"))) sawDone = true;
      }
    }
    return sawDone;
  };

  // ⚠️ 2026-10-10 根因修复：读上游的逻辑绝不能放在 pull() 里。
  //
  // 实测证据（逐字节读中继 chat 响应 115.6s，一个字节都没收到，连中继
  // 自己每 12s 的 keepalive 注释帧都没有）：EdgeOne Cloud Functions 平台
  // 不驱动本流的 pull()（或把响应体整体缓冲到函数结束才吐出）。pull 版
  // 下 reader.read() 永远不被调用 → 上游 forge 的数据永远不被消费 →
  // forge 侧数据积压 → 120s 平台强杀 → 客户端收到不可解析的 504 HTML
  // 页 → App 一直转圈。同一现象同时解释了「keepalive 发不出去」。
  //
  // 改为 start() 内 fire-and-forget 主动泵：与下游消费节奏解耦，函数一
  // 进入就开始读上游并 enqueue 进流的内部队列。
  //   · 若平台只是「不驱动 pull」→ 客户端立刻恢复实时流式输出；
  //   · 若平台整体缓冲到函数结束 → 至少上游能被消费、run 正常跑完、
  //     完整内容随响应一次性到达（不再 504）。
  // 两种情况都比 pull 版严格更优。
  //
  // 注意：start() 本身必须同步返回（泵用 void 起跑，不得 await），否则
  // 会推迟流的构造 resolve；也不要指望 pull 被平台回调。
  const pump = async (
    controller: ReadableStreamDefaultController<Uint8Array>,
  ): Promise<void> => {
    /** 关流：补 [DONE] 并 close；对已取消的流 enqueue 会抛，一律吞掉。 */
    const finishStream = (): void => {
      finished = true;
      try {
        controller.enqueue(encoder.encode(DONE));
        controller.close();
      } catch {
        /* 流已被下游取消 */
      }
    };
    try {
      for (;;) {
        if (finished) return;
        // 总时长兜底：到 105s 仍未读完，主动发错误提示并关流，
        // 抢在 EdgeOne 120s 平台强杀之前（见 TOTAL_DEADLINE_MS 注释）。
        if (Date.now() - startedAt > TOTAL_DEADLINE_MS) {
          void reader.cancel("relay total deadline reached").catch(() => {});
          try {
            if (options.taskId) {
              // 降级而不是失败：告诉 App「任务还在跑，改轮询接着取」。
              // from = 已消费的 forge chunk 数，正好是轮询的起始下标。
              controller.enqueue(
                encoder.encode(
                  chunk(
                    {
                      task_fallback: {
                        taskId: options.taskId,
                        from: consumedChunks,
                      },
                    },
                    "task_fallback",
                  ),
                ),
              );
            } else {
              controller.enqueue(
                encoder.encode(
                  chunk(
                    {
                      content:
                        "\n\n⚠️ 云端 Agent 响应超时：105 秒内未完成本次任务，" +
                        "连接已主动关闭（避免平台强杀导致请求失败）。" +
                        "模型网关可能排队，请稍后重试。",
                    },
                    "stop",
                  ),
                ),
              );
            }
          } catch {
            return;
          }
          finishStream();
          return;
        }
        if (!pendingRead) pendingRead = reader.read();
        let timer: ReturnType<typeof setTimeout> | undefined;
        const idle = new Promise<"idle">((resolve) => {
          timer = setTimeout(() => resolve("idle"), KEEPALIVE_MS);
        });
        const raced = await Promise.race([pendingRead, idle]);
        clearTimeout(timer);
        // 等待期间下游 cancel 了：立刻收手，enqueue 会抛
        if (finished) return;
        if (raced === "idle") {
          try {
            controller.enqueue(KEEPALIVE_FRAME);
          } catch {
            return;
          }
          continue;
        }
        pendingRead = null;
        const { done, value } = raced;
        if (done) {
          // 收尾：处理没有空行结尾的残留，再补 [DONE]
          const tail = buffer.trim();
          if (tail.startsWith("data:")) {
            const payload = tail.slice(5).trim();
            if (payload && payload !== "[DONE]") {
              for (const piece of convertChunk(payload)) {
                controller.enqueue(encoder.encode(piece));
              }
            }
          }
          finishStream();
          return;
        }
        buffer += decoder.decode(value, { stream: true });
        if (drainBuffer(controller)) {
          // 上游已发 [DONE]：回收上游读取，避免连接挂着
          void reader.cancel("upstream done").catch(() => {});
          finishStream();
          return;
        }
      }
    } catch (e) {
      if (finished) return;
      const msg = e instanceof Error ? e.message : String(e);
      finished = true;
      try {
        controller.enqueue(
          encoder.encode(chunk({ content: `\n\n⚠️ Agent 连接中断：${msg}` }, "stop")),
        );
        controller.enqueue(encoder.encode(DONE));
        controller.close();
      } catch {
        /* 流已被下游取消 */
      }
    }
  };

  return new ReadableStream<Uint8Array>({
    start(controller) {
      void pump(controller);
    },
    cancel(reason) {
      finished = true;
      pendingRead = null;
      return reader.cancel(reason);
    },
  });
}
