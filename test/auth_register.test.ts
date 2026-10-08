import { describe, expect, it, beforeEach } from "vitest";
import { Hono } from "hono";
import { createClient, type Client } from "@libsql/client";
import { authRoutes } from "../src/routes/auth";
import type { Env } from "../src/env";

/**
 * 注册链路的集成测试：真实路由 + 真实内存 SQLite。
 *
 * 单测 register_policy.test.ts 只验了"函数算得对不对"，
 * 这里验的是"路由真的调了它、错误真的按这个形状返回、账号名真的入库"——
 * 这几件事任一没接上，白名单就只是摆设。
 */

const TEST_ENV = {
  TURSO_DATABASE_URL: "file::memory:",
  TURSO_AUTH_TOKEN: "",
  JWT_SECRET: "test-secret-test-secret-test-secret-32b",
  ADMIN_TOKEN: "test-admin",
  REGISTER_EMAIL_DOMAINS: "",
} as unknown as Env["Bindings"];

async function newDb(): Promise<Client> {
  const db = createClient({ url: "file::memory:" });
  await db.execute(`CREATE TABLE users (
    id TEXT PRIMARY KEY, username TEXT, email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL, plan TEXT NOT NULL DEFAULT 'free',
    plan_expires_at INTEGER, status TEXT NOT NULL DEFAULT 'active',
    created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL)`);
  await db.execute(`CREATE UNIQUE INDEX idx_users_username ON users(username)`);
  await db.execute(`CREATE TABLE sessions (
    token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL, kind TEXT NOT NULL,
    device_id TEXT NOT NULL, device_name TEXT NOT NULL DEFAULT '',
    expires_at INTEGER, revoked INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL, last_used_at INTEGER NOT NULL)`);
  await db.execute(`CREATE TABLE devices (
    user_id TEXT NOT NULL, device_id TEXT NOT NULL,
    device_name TEXT NOT NULL DEFAULT '', activated_at INTEGER NOT NULL,
    last_seen_at INTEGER NOT NULL, PRIMARY KEY (user_id, device_id))`);
  await db.execute(`CREATE TABLE audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT, action TEXT NOT NULL,
    detail TEXT NOT NULL DEFAULT '', ip TEXT NOT NULL DEFAULT '', at INTEGER NOT NULL)`);
  return db;
}

function buildApp(db: Client, env: Partial<Env["Bindings"]> = {}) {
  const app = new Hono<Env>();
  app.use("*", async (c, next) => {
    c.set("db" as never, db as never);
    await next();
  });
  // 与 src/index.ts 的错误形状保持一致，否则断言的是测试自己发明的格式
  app.onError((err, c) => {
    const e = err as { status?: number; code?: string; message: string };
    return c.json(
      { error: { code: e.code ?? "internal", message: e.message } },
      (e.status ?? 500) as never
    );
  });
  app.route("/auth", authRoutes);
  return { app, env: { ...TEST_ENV, ...env } as Env["Bindings"] };
}

function regBody(overrides: Record<string, unknown> = {}) {
  return {
    email: "someone@qq.com",
    password: "abc12345",
    deviceId: "dev_test_1",
    deviceName: "测试机",
    ...overrides,
  };
}

async function register(
  app: Hono<Env>,
  env: Env["Bindings"],
  body: Record<string, unknown>
) {
  const res = await app.request(
    "/auth/register",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    },
    env
  );
  return { status: res.status, data: (await res.json().catch(() => ({}))) as any };
}

describe("注册：邮箱域名白名单", () => {
  let db: Client;
  beforeEach(async () => {
    db = await newDb();
  });

  it("名单内域名注册成功并返回账号名", async () => {
    const { app, env } = buildApp(db);
    const { status, data } = await register(app, env, regBody());
    expect(status).toBe(200);
    expect(data.username).toMatch(/^agent-\d{5}$/);
    expect(data.userId).toMatch(/^u_/);
    expect(data.accessToken).toBeTruthy();

    const row = (await db.execute("SELECT username, email FROM users")).rows[0];
    expect(String(row.username)).toBe(data.username);
    expect(String(row.email)).toBe("someone@qq.com");
  });

  it("名单外域名被拒：400 + 「邮箱不支持」且列出可用域名", async () => {
    const { app, env } = buildApp(db);
    const { status, data } = await register(
      app,
      env,
      regBody({ email: "user@gmail.com" })
    );
    expect(status).toBe(400);
    expect(data.error.code).toBe("email_domain_not_allowed");
    expect(data.error.message).toContain("邮箱不支持");
    expect(data.error.message).toContain("qq.com");
    expect(data.error.message).toContain("126.com");
    // 拒绝的用户不该留下任何记录
    expect((await db.execute("SELECT id FROM users")).rows).toHaveLength(0);
  });

  it("五个默认域名全部放行", async () => {
    const { app, env } = buildApp(db);
    for (const [i, domain] of ["qq.com", "189.cn", "139.com", "163.com", "126.com"].entries()) {
      const { status, data } = await register(
        app,
        env,
        regBody({ email: `u${i}@${domain}`, deviceId: `dev_${i}` })
      );
      expect(status, `${domain} 应放行`).toBe(200);
      expect(data.username).toMatch(/^agent-\d{5}$/);
    }
    expect((await db.execute("SELECT id FROM users")).rows).toHaveLength(5);
  });

  it("格式不合法报格式错误，不误报成域名不支持", async () => {
    const { app, env } = buildApp(db);
    const { status, data } = await register(app, env, regBody({ email: "not-an-email" }));
    expect(status).toBe(400);
    expect(data.error.message).toContain("格式不正确");
  });

  it("环境变量可改名单", async () => {
    const { app, env } = buildApp(db, { REGISTER_EMAIL_DOMAINS: "gmail.com" });
    const ok = await register(app, env, regBody({ email: "a@gmail.com" }));
    expect(ok.status).toBe(200);
    const no = await register(app, env, regBody({ email: "b@qq.com", deviceId: "dev_2" }));
    expect(no.status).toBe(400);
    expect(no.data.error.message).toContain("邮箱不支持");
  });

  it("重复邮箱返回 409", async () => {
    const { app, env } = buildApp(db);
    expect((await register(app, env, regBody())).status).toBe(200);
    const again = await register(app, env, regBody());
    expect(again.status).toBe(409);
    expect(again.data.error.message).toContain("已注册");
  });
});

describe("注册与登录：账号名下发", () => {
  let db: Client;
  beforeEach(async () => {
    db = await newDb();
  });

  it("登录返回与注册相同的账号名", async () => {
    const { app, env } = buildApp(db);
    const reg = await register(app, env, regBody());
    expect(reg.status).toBe(200);

    const res = await app.request(
      "/auth/login",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: "someone@qq.com",
          password: "abc12345",
          deviceId: "dev_test_1",
          deviceName: "测试机",
        }),
      },
      env
    );
    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data.username).toBe(reg.data.username);
  });

  it("老用户（username 为空）首次登录自动回填", async () => {
    const { app, env } = buildApp(db);
    // 迁移前就存在的用户：没有账号名
    const { hashPassword } = await import("../src/utils/password");
    await db.execute({
      sql: `INSERT INTO users (id, email, password_hash, created_at, updated_at)
            VALUES ('u_old', 'old@qq.com', ?, 1, 1)`,
      args: [await hashPassword("abc12345")],
    });
    expect(
      (await db.execute("SELECT username FROM users WHERE id='u_old'")).rows[0]
        ?.username
    ).toBeNull();

    const res = await app.request(
      "/auth/login",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: "old@qq.com",
          password: "abc12345",
          deviceId: "dev_old",
          deviceName: "老设备",
        }),
      },
      env
    );
    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data.username).toMatch(/^agent-\d{5}$/);

    const row = (await db.execute("SELECT username FROM users WHERE id='u_old'"))
      .rows[0];
    expect(String(row.username)).toBe(data.username);
  });
});
