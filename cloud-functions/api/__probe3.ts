// 探针 3：逐个 import src/index.ts 的直接依赖，定位哪个模块级初始化在 Node runtime 崩
import type { Bindings } from "../../src/env";

type Result = { mod: string; ok: boolean; err?: string };

export default async function onRequest(context: { request: Request; env: Bindings }) {
  void context; // 仅探针，忽略入参
  const results: Result[] = [];
  const mods = [
    "@libsql/client/web",
    "../../src/db/client",
    "../../src/utils/errors",
    "../../src/middleware/auth",
    "../../src/routes/agent",
    "../../src/routes/auth",
    "../../src/routes/admin",
    "../../src/routes/ai",
    "../../src/routes/relay",
    "../../src/routes/tasks",
    "../../src/routes/mcp",
    "../../src/routes/sync",
    "../../src/routes/backup",
    "../../src/routes/license",
    "../../src/routes/update",
    "../../src/routes/announcement",
    "../../src/ui/admin_html",
    "../../src/index",
  ] as const;

  for (const m of mods) {
    try {
      await import(/* @vite-ignore */ m);
      results.push({ mod: m, ok: true });
    } catch (e) {
      const msg = e instanceof Error ? `${e.name}: ${e.message} | ${(e.stack ?? "").split("\n").slice(1,3).join(" <- ")}` : String(e);
      results.push({ mod: m, ok: false, err: msg.slice(0, 300) });
    }
  }
  const failed = results.filter((r) => !r.ok);
  return new Response(
    JSON.stringify({ total: results.length, failedCount: failed.length, failed }, null, 2),
    { status: 200, headers: { "content-type": "application/json; charset=utf-8" } },
  );
}
