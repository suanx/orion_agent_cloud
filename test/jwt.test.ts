import { describe, it, expect } from "vitest";
import { signJwt, verifyJwt, accessTokenTtlSeconds } from "../src/utils/jwt";

const SECRET = "test-secret-0123456789abcdef0123456789abcdef";

describe("JWT (HS256)", () => {
  it("签发后可验证, payload 还原", async () => {
    const token = await signJwt(
      { sub: "u_1", plan: "free", exp: Math.floor(Date.now() / 1000) + 60 },
      SECRET
    );
    const result = await verifyJwt(token, SECRET);
    expect(result.ok, `verify 失败: ${JSON.stringify(result)}`).toBe(true);
    if (result.ok) {
      expect(result.payload.sub).toBe("u_1");
      expect(result.payload.plan).toBe("free");
    }
  });

  it("过期令牌返回 expired", async () => {
    const token = await signJwt(
      { sub: "u_1", plan: "free", exp: Math.floor(Date.now() / 1000) - 10 },
      SECRET
    );
    const result = await verifyJwt(token, SECRET);
    expect(result).toMatchObject({ ok: false, reason: "expired" });
  });

  it("密钥不符返回 bad_signature", async () => {
    const token = await signJwt(
      { sub: "u_1", plan: "free", exp: Math.floor(Date.now() / 1000) + 60 },
      SECRET
    );
    const result = await verifyJwt(token, "another-secret-0123456789abcdef01234567");
    expect(result).toMatchObject({ ok: false, reason: "bad_signature" });
  });

  it("篡改 payload 返回 bad_signature", async () => {
    const token = await signJwt(
      { sub: "u_1", plan: "free", exp: Math.floor(Date.now() / 1000) + 60 },
      SECRET
    );
    const [h, , s] = token.split(".");
    const forgedBody = btoa(JSON.stringify({ sub: "u_2", plan: "pro", exp: 9999999999, iat: 1 }))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
    const result = await verifyJwt(`${h}.${forgedBody}.${s}`, SECRET);
    expect(result).toMatchObject({ ok: false, reason: "bad_signature" });
  });

  it("畸形令牌返回 malformed", async () => {
    expect(await verifyJwt("abc", SECRET)).toMatchObject({ ok: false, reason: "malformed" });
    expect(await verifyJwt("a.b", SECRET)).toMatchObject({ ok: false, reason: "malformed" });
  });

  it("Access Token TTL = 2 小时", () => {
    expect(accessTokenTtlSeconds()).toBe(7200);
  });
});
