// 临时探针：验证 Node runtime 本身能否正常响应（不碰DB/Hono）
export default function onRequest(context: { request: Request }) {
  return new Response(
    JSON.stringify({
      ok: true,
      runtime: "nodejs-probe",
      node: typeof process !== "undefined" ? process.version : "no-process",
      hasFetch: typeof fetch === "function",
      hasStream: typeof ReadableStream === "function",
      ua: context.request.headers.get("user-agent") ?? "none",
    }),
    { status: 200, headers: { "content-type": "application/json; charset=utf-8" } },
  );
}
