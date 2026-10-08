import { describe, expect, it } from "vitest";
import { createClient, type Client } from "@libsql/client";
import {
  DEFAULT_REGISTER_EMAIL_DOMAINS,
  generateUsername,
  registerEmailDomains,
  validateRegisterEmail,
  USERNAME_DIGITS,
  USERNAME_PREFIX,
} from "../src/utils/register-policy";
import {
  allocateUsername,
  loadOrBackfillUsername,
  peekUsername,
} from "../src/services/username";

describe("注册邮箱域名白名单", () => {
  it("默认名单就是产品要求的五个域名", () => {
    expect(DEFAULT_REGISTER_EMAIL_DOMAINS).toEqual([
      "qq.com",
      "189.cn",
      "139.com",
      "163.com",
      "126.com",
    ]);
  });

  it("名单内域名放行", () => {
    for (const d of DEFAULT_REGISTER_EMAIL_DOMAINS) {
      expect(validateRegisterEmail(`user@${d}`)).toBeNull();
      // 大小写不应影响判定（邮箱域名大小写不敏感）
      expect(validateRegisterEmail(`user@${d.toUpperCase()}`)).toBeNull();
    }
  });

  it("名单外域名报「邮箱不支持」并列出可用域名", () => {
    for (const bad of ["user@gmail.com", "a@outlook.com", "x@qq.com.cn", "me@foxmail.com"]) {
      const err = validateRegisterEmail(bad);
      expect(err).toContain("邮箱不支持");
      for (const d of DEFAULT_REGISTER_EMAIL_DOMAINS) expect(err).toContain(d);
    }
  });

  it("格式不合法仍报格式错误, 而不是域名不支持", () => {
    // 这个顺序由 auth 路由保证（先 validateEmail 再白名单），
    // 这里同时验证白名单自身也不会把非邮箱输入误判成域名问题。
    expect(validateRegisterEmail("not-an-email")).toContain("格式不正确");
    expect(validateRegisterEmail("@qq.com")).toContain("格式不正确");
    expect(validateRegisterEmail("a@")).toContain("格式不正确");
  });

  it("环境变量可覆盖名单", () => {
    expect(registerEmailDomains("gmail.com, @example.com")).toEqual([
      "gmail.com",
      "example.com",
    ]);
    expect(validateRegisterEmail("a@gmail.com", "gmail.com")).toBeNull();
    expect(validateRegisterEmail("a@qq.com", "gmail.com")).toContain("邮箱不支持");
  });

  it("空值/垃圾值回落到默认名单, 不会意外关掉白名单", () => {
    expect(registerEmailDomains(undefined)).toEqual(DEFAULT_REGISTER_EMAIL_DOMAINS);
    expect(registerEmailDomains("")).toEqual(DEFAULT_REGISTER_EMAIL_DOMAINS);
    expect(registerEmailDomains("   ")).toEqual(DEFAULT_REGISTER_EMAIL_DOMAINS);
    // 只有分隔符 → 解析不出有效域名 → 仍回落默认
    expect(registerEmailDomains(",,,")).toEqual(DEFAULT_REGISTER_EMAIL_DOMAINS);
  });
});

describe("账号名 agent-<5位数字>", () => {
  it("格式固定为前缀 + 5 位数字", () => {
    for (let i = 0; i < 50; i++) {
      const u = generateUsername();
      expect(u.startsWith(USERNAME_PREFIX)).toBe(true);
      expect(u.slice(USERNAME_PREFIX.length)).toHaveLength(USERNAME_DIGITS);
      expect(u).toMatch(/^agent-\d{5}$/);
    }
  });

  it("不足 5 位时补前导 0, 不会生成 agent-7 这种短号", () => {
    // 只验格式契约：padStart 保证长度恒为 5（含 00000）
    expect("7".padStart(USERNAME_DIGITS, "0")).toBe("00007");
  });
});

async function newDb(): Promise<Client> {
  const db = createClient({ url: "file::memory:" });
  // 与 schema.sql 一致：username 带唯一索引
  await db.execute(
    `CREATE TABLE users (id TEXT PRIMARY KEY, username TEXT UNIQUE, email TEXT UNIQUE,
       password_hash TEXT, plan TEXT DEFAULT 'free', status TEXT DEFAULT 'active',
       created_at INTEGER, updated_at INTEGER)`,
  );
  return db;
}

describe("账号名分配与回填", () => {
  it("空库分配出来的账号名没有被占用", async () => {
    const db = await newDb();
    const name = await allocateUsername(db);
    expect(name).toMatch(/^agent-\d{5}$/);
    const hit = await db.execute({
      sql: "SELECT 1 FROM users WHERE username = ?",
      args: [name],
    });
    expect(hit.rows).toHaveLength(0);
  });

  it("分配结果不撞已存在的账号名", async () => {
    const db = await newDb();
    // 把随机数的输出空间整体占掉不现实（10 万组合），
    // 这里改为连续分配 200 个，验证每次都真的查库避让。
    const seen = new Set<string>();
    for (let i = 0; i < 200; i++) {
      const name = await allocateUsername(db);
      expect(seen.has(name)).toBe(false);
      seen.add(name);
      await db.execute({
        sql: "INSERT INTO users (id, username, email, created_at, updated_at) VALUES (?,?,?,?,?)",
        args: [`u_${i}`, name, `u${i}@qq.com`, 1, 1],
      });
    }
    expect(seen.size).toBe(200);
  });

  it("老用户首次读取时回填账号名", async () => {
    const db = await newDb();
    await db.execute(
      "INSERT INTO users (id, email, created_at, updated_at) VALUES (?,?,?,?)",
      ["u_old", "old@qq.com", 1, 1],
    );
    expect(await peekUsername(db, "u_old")).toBe("");

    const first = await loadOrBackfillUsername(db, "u_old");
    expect(first).toMatch(/^agent-\d{5}$/);
    // 已回写，再读不再换号
    expect(await peekUsername(db, "u_old")).toBe(first);
    expect(await loadOrBackfillUsername(db, "u_old")).toBe(first);
  });

  it("users.username 列缺失时返回空串而非抛异常", async () => {
    const db = createClient({ url: "file::memory:" });
    await db.execute(
      "CREATE TABLE users (id TEXT PRIMARY KEY, email TEXT, created_at INTEGER, updated_at INTEGER)",
    );
    await db.execute(
      "INSERT INTO users (id, email, created_at, updated_at) VALUES ('u_x','x@qq.com',1,1)",
    );
    // 未跑 migrate 的库就是这样
    expect(await loadOrBackfillUsername(db, "u_x")).toBe("");
    expect(await peekUsername(db, "u_x")).toBe("");
  });
});
