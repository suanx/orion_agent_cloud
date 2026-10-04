import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword, validatePassword, validateEmail } from "../src/utils/password";

describe("PBKDF2 密码哈希", () => {
  it("哈希后可验证", async () => {
    const stored = await hashPassword("abc12345");
    expect(stored.startsWith("pbkdf2$")).toBe(true);
    expect(await verifyPassword("abc12345", stored)).toBe(true);
  });

  it("错误密码验证失败", async () => {
    const stored = await hashPassword("abc12345");
    expect(await verifyPassword("abc12345x", stored)).toBe(false);
    expect(await verifyPassword("", stored)).toBe(false);
  });

  it("相同密码每次盐不同, 哈希不同但都可验证", async () => {
    const a = await hashPassword("same-password-1");
    const b = await hashPassword("same-password-1");
    expect(a).not.toBe(b);
    expect(await verifyPassword("same-password-1", a)).toBe(true);
    expect(await verifyPassword("same-password-1", b)).toBe(true);
  });

  it("损坏的存储串返回 false 而非抛异常", async () => {
    expect(await verifyPassword("x", "not-a-hash")).toBe(false);
    expect(await verifyPassword("x", "pbkdf2$abc$zz$ff")).toBe(false);
  });
});

describe("输入校验", () => {
  it("密码规则", () => {
    expect(validatePassword("short1")).toContain("8 位");
    expect(validatePassword("onlyletters")).toContain("字母与数字");
    expect(validatePassword("12345678")).toContain("字母与数字");
    expect(validatePassword("abc12345")).toBeNull();
    expect(validatePassword("a".repeat(73) + "1")).toContain("72 位");
  });

  it("邮箱规则", () => {
    expect(validateEmail("a@b.c")).toBeNull();
    expect(validateEmail("bad")).not.toBeNull();
    expect(validateEmail("a@b")).not.toBeNull();
    expect(validateEmail("a b@c.com")).not.toBeNull();
  });
});
