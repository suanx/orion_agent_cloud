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

  it("tool-input-available 一律丢弃：工具循环在 forge 侧完成，绝不下发 tool_calls", () => {
    // 2026-10-10 根因修复：若把 forge 的工具调用转成 tool_calls 发给
    // App，App 的编排器会在本地再开一层工具循环并触发上游重跑整个
    // 任务（双循环错配），表现为云端 Agent「没有回复内容」。
    const out = convertChunk(
      JSON.stringify({
        type: "tool-input-available",
        toolCallId: "call_1",
        toolName: "bash",
        input: { command: "ls" },
      }),
    );
    expect(out).toHaveLength(0);
    // 本地工具（非 providerExecuted）同样不转发
    const out2 = convertChunk(
      JSON.stringify({
        type: "tool-input-available",
        toolCallId: "call_2",
        toolName: "write",
        input: { path: "a.txt" },
      }),
    );
    expect(out2).toHaveLength(0);
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

describe("convertStream 边界事件（Agent 外部接入场景）", () => {
  it("tool-approval-request 转成可读提示而非静默丢弃", () => {
    const out = convertChunk(JSON.stringify({ type: "tool-approval-request", toolName: "bash" }));
    // 关键：App 场景下无人应答审批，必须让用户看到原因
    expect(out.join("")).toContain("bash");
    expect(out.join("")).toContain("无法应答审批");
  });

  it("审批事件缺 toolName 时也能提示", () => {
    const out = convertChunk(JSON.stringify({ type: "tool-approval-request" }));
    expect(out.join("")).toContain("某个操作");
  });

  it("abort 收尾为 [DONE] 且不标记 stop（区分「取消」与「正常结束」）", () => {
    const out = convertChunk(JSON.stringify({ type: "abort" })).join("");
    expect(out).toContain("data: [DONE]");
    expect(out).not.toContain('"finish_reason":"stop"');
  });

  it("文本/思考的起止边界事件被忽略", () => {
    for (const t of ["text-start", "text-end", "reasoning-start", "reasoning-end"]) {
      expect(convertChunk(JSON.stringify({ type: t }))).toEqual([]);
    }
  });

  it("message-metadata 被忽略（App 从响应头取）", () => {
    expect(convertChunk(JSON.stringify({ type: "message-metadata", messageMetadata: { modelId: "x" } }))).toEqual([]);
  });

  it("tool-output-denied 被忽略", () => {
    expect(convertChunk(JSON.stringify({ type: "tool-output-denied" }))).toEqual([]);
  });

  it("source-url / source-document 被忽略（App 无引用展示位）", () => {
    expect(convertChunk(JSON.stringify({ type: "source-url", sourceId: "s1", url: "https://x" }))).toEqual([]);
    expect(convertChunk(JSON.stringify({ type: "source-document", sourceId: "s1" }))).toEqual([]);
  });
});
