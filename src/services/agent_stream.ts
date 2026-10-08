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
 *   tool-input-available    → delta.tool_calls[0]（function.arguments 累积）
 *   finish                  → finish_reason=stop + [DONE]
 *   error                   → 以 finish_reason=stop 收尾，正文带错误提示
 *
 * 关于工具调用：AI SDK 把完整参数一次性下发（`input`），不做增量。
 * OpenAI 协议也允许 arguments 一次性给全，App 的解析器能处理。
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

export type ConvertOptions = {
  /**
   * 已见过的 toolCallId → 序号。OpenAI 协议要求同一次调用内
   * tool_calls 的 index 稳定，才能把 name 与后续 arguments 拼到一起。
   */
  toolIndex?: Map<string, number>;
};

/**
 * 转换单个 AI SDK 事件为 0~n 个 OpenAI 兼容 SSE 片段。
 * 返回空数组表示该事件无需转发。
 */
export function convertChunk(
  raw: string,
  opts: ConvertOptions = {},
): string[] {
  let event: AiSdkChunk;
  try {
    event = JSON.parse(raw) as AiSdkChunk;
  } catch {
    return []; // 半截 JSON（SSE 分包）或非对象，直接忽略
  }
  if (!event || typeof event.type !== "string") return [];

  const toolIndex = opts.toolIndex ?? new Map<string, number>();

  switch (event.type) {
    case "text-delta": {
      const text = event.delta ?? event.text ?? "";
      if (!text) return [];
      return [chunk({ content: text }, null)];
    }

    case "reasoning-delta": {
      const text = event.delta ?? event.text ?? "";
      if (!text) return [];
      return [chunk({ reasoning_content: text }, null)];
    }

    case "tool-input-available": {
      // 平台自己执行的工具（如网页搜索）不转发：App 侧无法驱动它们，
      // 转过去只会让对话记录出现无法响应的工具调用。
      if (event.providerExecuted) return [];
      const id = event.toolCallId;
      const name = event.toolName;
      if (!id || !name) return [];
      let idx = toolIndex.get(id);
      if (idx === undefined) {
        idx = toolIndex.size;
        toolIndex.set(id, idx);
      }
      let args = "{}";
      if (event.input !== undefined) {
        try {
          args = JSON.stringify(event.input);
        } catch {
          args = "{}";
        }
      }
      return [
        chunk(
          {
            tool_calls: [
              { index: idx, id, type: "function", function: { name, arguments: args } },
            ],
          },
          null,
        ),
      ];
    }

    case "tool-output-available":
    case "tool-input-start":
    case "tool-input-delta":
    case "tool-output-error":
    case "tool-input-error":
    case "start":
    case "start-step":
    case "finish-step":
      return []; // App 侧不需要这些中间态

    case "finish":
      return [chunk({}, "stop"), DONE];

    case "error": {
      // 以正常收尾结束，把错误作为正文回传 —— App 拿到的是可读提示，
      // 而不是半截流突然中断。
      const msg = event.errorText || "Agent 执行出错";
      return [chunk({ content: `\n\n⚠️ ${msg}` }, "stop"), DONE];
    }

    default:
      return [];
  }
}

/**
 * 把一个 ReadableStream（AI SDK SSE）整体转换为 OpenAI 兼容 SSE。
 *
 * 入参格式为 `data: {...}\n\n` 的 SSE 行；非 data 行（注释、event: 行）忽略。
 */
export function convertStream(
  upstream: ReadableStream<Uint8Array>,
  opts: ConvertOptions = {},
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const toolIndex = opts.toolIndex ?? new Map<string, number>();
  let buffer = "";
  // 兜底：上游异常/提前结束时补一个 [DONE]，否则 App 会一直等下去
  let finished = false;

  const reader = upstream.getReader();

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
        const out = convertChunk(payload, { toolIndex });
        for (const piece of out) controller.enqueue(encoder.encode(piece));
        if (out.some((p) => p.includes("[DONE]"))) sawDone = true;
      }
    }
    return sawDone;
  };

  // ⚠️ 用 pull 而非 async start：ReadableStream 的 start 若返回 Promise，
  // 会等到它 resolve 才开始拉取数据；而 start 内部又 await reader.read()
  // 就形成死锁（下游永远等不到数据，测试表现为超时）。
  // pull 每次只读一块，交替推进，是流转换的标准写法。
  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      if (finished) return;
      try {
        const { done, value } = await reader.read();
        if (done) {
          // 收尾：处理没有空行结尾的残留，再补 [DONE]
          const tail = buffer.trim();
          if (tail.startsWith("data:")) {
            const payload = tail.slice(5).trim();
            if (payload && payload !== "[DONE]") {
              for (const piece of convertChunk(payload, { toolIndex })) {
                controller.enqueue(encoder.encode(piece));
              }
            }
          }
          finished = true;
          controller.enqueue(encoder.encode(DONE));
          controller.close();
          return;
        }
        buffer += decoder.decode(value, { stream: true });
        if (drainBuffer(controller)) {
          finished = true;
          controller.enqueue(encoder.encode(DONE));
          controller.close();
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        finished = true;
        controller.enqueue(
          encoder.encode(chunk({ content: `\n\n⚠️ Agent 连接中断：${msg}` }, "stop")),
        );
        controller.enqueue(encoder.encode(DONE));
        controller.close();
      }
    },
    cancel(reason) {
      finished = true;
      return reader.cancel(reason);
    },
  });
}
