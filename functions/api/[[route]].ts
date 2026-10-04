/**
 * EdgeOne Pages Functions 入口 (Cloudflare Pages Functions 兼容约定)。
 * 所有 /api/* 请求交给 Hono app 处理。
 *
 * EdgeOne 部署时在控制台配置环境变量(.env.example 列表),
 * Cron Trigger 指向 POST /api/tasks/run-due (Header: Authorization: Bearer <ADMIN_TOKEN>)。
 */
import app from "../../src/index";
import type { Bindings } from "../../src/env";

interface EdgeOneContext {
  request: Request;
  env: Bindings;
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

export const onRequest = async (context: EdgeOneContext): Promise<Response> => {
  return app.fetch(context.request, context.env, {
    waitUntil: context.waitUntil.bind(context),
    passThroughOnException: context.passThroughOnException.bind(context),
    props: {},
  });
};
