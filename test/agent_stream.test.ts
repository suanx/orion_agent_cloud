import { describe, it, expect } from "vitest";
import { convertChunk, convertStream } from "../src/services/agent_stream";

/** 解析一条 OpenAI 兼容 SSE 行。 */
function parseLine(sse: string): Record<string, unknown> | null {
  const line = sse.trim().split("\n")[0] ?? "";
  if (!line.startsWith("data:")) return null;
  const payload = line.slice(5).trim();
  if (!payload || payload === "[DONE]") return null;
  return JSON.parse(payload) as Record<string, unknown>;
}

type Delta = {
  content?: string;
  reasoning_content?: string;
  tool_calls?: { index: number; id: string; function: { name: string; arguments: string } }[];
};

function deltaOf(sse: string): Delta {
  const obj = parseLine(sse);
  const choices = obj?.choices as { delta: Delta }[] | undefined;
  return choices?.[0]?.delta ?? {};
}

function sseOf(event: Record<string, unknown>): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

describe("AI SDK 事件 → OpenAI 兼容 SSE", () => {
  it("text-delta 映射为 delta.content", () => {
    const out = convertChunk(JSON.stringify({ type: "text-delta", delta: "你好" }));
    expect(out).toHaveLength(1);
    expect(deltaOf(out[0]!).content).toBe("你好");
  });

  it("reasoning-delta 映射为 delta.reasoning_content", () => {
    const out = convertChunk(JSON.stringify({ type: "reasoning-delta", delta: "想…" }));
    expect(deltaOf(out[0]!).reasoning_content).toBe("想…");
  });

  it("finish 输出 finish_reason=stop 并紧跟 [DONE]", () => {
    const out = convertChunk(JSON.stringify({ type: "finish" }));
    expect(out).toHaveLength(2);
    expect(parseLine(out[0]!)?.choices).toEqual([
      { index: 0, delta: {}, finish_reason: "stop" },
    ]);
    expect(out[1]).toContain("[DONE]");
  });

  it("工具调用带 index/id/name/arguments，且 index 稳定", () => {
    const toolIndex = new Map<string, number>();
    const a = convertChunk(
      JSON.stringify({
        type: "tool-input-available",
        toolCallId: "call_1",
        toolName: "bash",
        input: { command: "ls" },
      }),
      { toolIndex },
    );
    const b = convertChunk(
      JSON.stringify({
        type: "tool-input-available",
        toolCallId: "call_2",
        toolName: "write",
        input: { path: "a.txt" },
      }),
      { toolIndex },
    );
    const t1 = deltaOf(a[0]!).tool_calls?.[0];
    const t2 = deltaOf(b[0]!).tool_calls?.[0];
    expect(t1).toMatchObject({ index: 0, id: "call_1" });
    expect(t1?.function.name).toBe("bash");
    expect(JSON.parse(t1?.function.arguments ?? "{}")).toEqual({ command: "ls" });
    // 第二个工具必须是 index 1，否则 App 侧会把两个调用拼成一个
    expect(t2?.index).toBe(1);
    expect(t2?.function.name).toBe("write");
  });

  it("同一 toolCallId 重复出现时 index 不变", () => {
    const toolIndex = new Map<string, number>();
    const ev = JSON.stringify({
      type: "tool-input-available",
      toolCallId: "call_x",
      toolName: "bash",
      input: { command: "pwd" },
    });
    const first = convertChunk(ev, { toolIndex });
    const second = convertChunk(ev, { toolIndex });
    expect(deltaOf(second[0]!).tool_calls?.[0]?.index).toBe(
      deltaOf(first[0]!).tool_calls?.[0]?.index,
    );
  });

  it("providerExecuted 的工具被跳过（App 无法驱动）", () => {
    const out = convertChunk(
      JSON.stringify({
        type: "tool-input-available",
        toolCallId: "c",
        toolName: "web_search",
        input: {},
        providerExecuted: true,
      }),
    );
    expect(out).toHaveLength(0);
  });

  it("error 事件以正文提示收尾而不是断流", () => {
    const out = convertChunk(JSON.stringify({ type: "error", errorText: "沙箱超时" }));
    expect(deltaOf(out[0]!).content).toContain("沙箱超时");
    expect(out.some((o) => o.includes("[DONE]"))).toBe(true);
  });

  it("中间态事件被静默丢弃", () => {
    for (const type of [
      "start",
      "start-step",
      "finish-step",
      "tool-input-start",
      "tool-input-delta",
      "tool-output-available",
      "text-start",
      "text-end",
    ]) {
      expect(convertChunk(JSON.stringify({ type }))).toHaveLength(0);
    }
  });

  it("非法 JSON 与缺 type 的事件不抛错", () => {
    expect(convertChunk("{不是json")).toHaveLength(0);
    expect(convertChunk("{}")).toHaveLength(0);
    expect(convertChunk("null")).toHaveLength(0);
  });
});

describe("整流转换", () => {
  function streamOf(text: string): ReadableStream<Uint8Array> {
    const enc = new TextEncoder();
    return new ReadableStream({
      start(c) {
        c.enqueue(enc.encode(text));
        c.close();
      },
    });
  }

  it("多事件按序拼接为一个完整 SSE 输出", async () => {
    const upstream = streamOf(
      [
        sseOf({ type: "text-delta", delta: "你" }),
        sseOf({ type: "text-delta", delta: "好" }),
        sseOf({ type: "finish" }),
      ].join(""),
    );
    const out = await new Response(convertStream(upstream)).text();
    expect(out).toContain('"content":"你"');
    expect(out).toContain('"content":"好"');
    expect(out).toContain('"finish_reason":"stop"');
    expect(out.trimEnd().endsWith("data: [DONE]")).toBe(true);
  });

  it("上游异常也要收尾（补 [DONE]），不能让 App 一直等", async () => {
    const upstream = new ReadableStream<Uint8Array>({
      start(c) {
        c.error(new Error("连接断了"));
      },
    });
    const out = await new Response(convertStream(upstream)).text();
    expect(out).toContain("[DONE]");
    expect(out).toContain("连接断了");
  });

  it("上游正常结束但没发 finish 时仍补 [DONE]", async () => {
    const upstream = streamOf(sseOf({ type: "text-delta", delta: "半句" }));
    const out = await new Response(convertStream(upstream)).text();
    expect(out).toContain("[DONE]");
  });

  it("忽略非 data 行（event:/注释/心跳）", async () => {
    const upstream = streamOf(
      [": ping", "event: message", "", sseOf({ type: "text-delta", delta: "ok" }), sseOf({ type: "finish" })].join(
        "\n",
      ),
    );
    const out = await new Response(convertStream(upstream)).text();
    expect(out).toContain('"content":"ok"');
    // 心跳不应被当成内容
    expect(out).not.toContain("ping");
  });
});
