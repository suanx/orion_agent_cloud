import { describe, it, expect } from "vitest";
import {
  generateCode,
  normalizeCode,
  applyLicense,
  validatePlan,
} from "../src/services/licenses";
import { ApiError } from "../src/utils/errors";

describe("卡密生成", () => {
  it("格式 ORION-XXXX-XXXX-XXXX-XXXX", () => {
    const code = generateCode();
    expect(code).toMatch(/^ORION(-[A-Z0-9]{4}){4}$/);
  });

  it("不含易混淆字符 I/O/0/1", () => {
    for (let i = 0; i < 50; i++) {
      const code = generateCode();
      expect(code.replace(/ORION-/g, "")).not.toMatch(/[IO01]/);
    }
  });

  it("可注入随机源(可测性)", () => {
    let call = 0;
    const fake = (buf: Uint8Array) => {
      for (let i = 0; i < buf.length; i++) buf[i] = (call * 7 + i * 13) % 256;
      call++;
    };
    expect(generateCode(fake)).toMatch(/^ORION-/);
  });});

describe("卡密归一化", () => {
  it("小写/空格归一为大写紧凑格式", () => {
    expect(normalizeCode(" orion-abcd-efgh-jkmn-pqrt ")).toBe("ORION-ABCD-EFGH-JKMN-PQRT");
  });
});

describe("套餐校验", () => {
  it("非法套餐抛 400", () => {
    expect(() => validatePlan("forever")).toThrow(ApiError);
    expect(() => validatePlan("pro")).not.toThrow();
  });
});

describe("激活规则 applyLicense", () => {
  const DAY = 24 * 3600 * 1000;
  const NOW = 1_700_000_000_000;

  it("lifetime 覆盖一切, 到期清空", () => {
    const r = applyLicense("pro", NOW + DAY, "lifetime", 0, NOW);
    expect(r).toEqual({ plan: "lifetime", expiresAt: null });
  });

  it("free + pro: 从现在起算", () => {
    const r = applyLicense("free", null, "pro", 30, NOW);
    expect(r.plan).toBe("pro");
    expect(r.expiresAt).toBe(NOW + 30 * DAY);
  });

  it("同级未过期: 顺延", () => {
    const r = applyLicense("pro", NOW + 10 * DAY, "pro", 30, NOW);
    expect(r.plan).toBe("pro");
    expect(r.expiresAt).toBe(NOW + 40 * DAY);
  });

  it("同级已过期: 从现在起算", () => {
    const r = applyLicense("pro", NOW - DAY, "pro", 30, NOW);
    expect(r.expiresAt).toBe(NOW + 30 * DAY);
  });

  it("高级套餐未过期时激活低级卡密: 保留高级到期再顺延", () => {
    const r = applyLicense("pro", NOW + 10 * DAY, "trial", 30, NOW);
    expect(r.plan).toBe("pro");
    expect(r.expiresAt).toBe(NOW + 40 * DAY);
  });

  it("高级套餐已过期时激活低级卡密: 从现在起算低级", () => {
    const r = applyLicense("pro", NOW - DAY, "trial", 30, NOW);
    expect(r.plan).toBe("trial");
    expect(r.expiresAt).toBe(NOW + 30 * DAY);
  });
});
