// 二分探针 B：只静态引 @libsql/client/web
import { createClient } from "@libsql/client/web";
export default async function onRequest(context: { request: Request; env: { TURSO_DATABASE_URL?: string; TURSO_AUTH_TOKEN?: string } }) {
  const url = context.env.TURSO_DATABASE_URL ?? "";
  let dbTest = "skipped";
  if (url.startsWith("libsql://")) {
    try {
      const c = createClient({ url, authToken: context.env.TURSO_AUTH_TOKEN });
      const r = await c.execute("SELECT 1");
      dbTest = `ok rows=${r.rows.length}`;
    } catch (e) {
      dbTest = `err: ${e instanceof Error ? e.message : String(e)}`.slice(0, 150);
    }
  }
  return new Response(JSON.stringify({ ok: true, probe: "pb-libsql-web", dbTest }), {
    status: 200, headers: { "content-type": "application/json; charset=utf-8" },
  });
}
