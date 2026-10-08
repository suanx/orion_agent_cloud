import { describe, it, expect } from "vitest";
import {
  weekStartDate,
  msUntilWeekReset,
  weeklyTierOf,
  WEEKLY_LIMITS,
  PLAN_LABELS,
} from "../src/plans";
import {
  encryptApiKey,
  decryptApiKey,
  toPublicProvider,
} from "../src/services/ai_providers";

describe("周起始日(UTC+8 周一)", () => {
  it("周一当天的任意时刻都算本周起点", () => {
    // 2026-10-05 是周一
    const mon = new Date("2026-10-05T00:00:00+08:00");
    expect(weekStartDate(mon)).toBe("2026-10-05");
    // 周一 23:59 (UTC+8)
    const monNight = new Date("2026-10-05T23:59:00+08:00");
    expect(weekStartDate(monNight)).toBe("2026-10-05");
  });

  it("周日归到上一个周一", () => {
    // 2026-10-11 是周日
    const sun = new Date("2026-10-11T12:00:00+08:00");
    expect(weekStartDate(sun)).toBe("2026-10-05");
  });

  it("周中任意一天都映射到本周周一", () => {
    // 周三 2026-10-07
    const wed = new Date("2026-10-07T08:30:00+08:00");
    expect(weekStartDate(wed)).toBe("2026-10-05");
  });

  it("跨月边界仍正确", () => {
    // 2026-11-01 是周日, 本周一应为 10-26
    expect(weekStartDate(new Date("2026-11-01T10:00:00+08:00"))).toBe("2026-10-26");
  });

  it("跨年边界仍正确", () => {
    // 2027-01-03 是周日, 本周一应为 2026-12-28
    expect(weekStartDate(new Date("2027-01-03T10:00:00+08:00"))).toBe("2026-12-28");
  });
});

describe("距下次周重置", () => {
  it("周一 00:00 重置后立即重算为 7 天", () => {
    const mon = new Date("2026-10-05T00:00:00+08:00");
    const ms = msUntilWeekReset(mon);
    expect(ms).toBe(7 * 24 * 3600 * 1000);
  });

  it("周日应小于 1 天（周一 00:00 到来）", () => {
    const sun = new Date("2026-10-11T23:00:00+08:00");
    expect(msUntilWeekReset(sun)).toBe(1 * 3600 * 1000);
  });

  it("始终为正数且不超过 7 天", () => {
    for (let h = 0; h < 24 * 8; h += 7) {
      const ms = msUntilWeekReset(new Date(Date.now() + h * 3600 * 1000));
      expect(ms).toBeGreaterThan(0);
      expect(ms).toBeLessThanOrEqual(7 * 24 * 3600 * 1000);
    }
  });
});

describe("三档周额度", () => {
  it("trial 等非三档套餐归入免费版", () => {
    expect(weeklyTierOf("trial")).toBe("free");
    expect(weeklyTierOf("free")).toBe("free");
    expect(weeklyTierOf("unknown-plan")).toBe("free");
  });

  it("pro / lifetime 各归自身档位", () => {
    expect(weeklyTierOf("pro")).toBe("pro");
    expect(weeklyTierOf("lifetime")).toBe("lifetime");
  });

  it("三档额度递增且都有非零额度", () => {
    const f = WEEKLY_LIMITS.free.ai_chat;
    const p = WEEKLY_LIMITS.pro.ai_chat;
    const l = WEEKLY_LIMITS.lifetime.ai_chat;
    expect(f).toBeGreaterThan(0);
    expect(p).toBeGreaterThan(f);
    expect(l).toBeGreaterThan(p);
  });

  it("三档都有中文展示名", () => {
    expect(PLAN_LABELS.free).toBe("免费版");
    expect(PLAN_LABELS.pro).toBe("专业版");
    expect(PLAN_LABELS.lifetime).toBe("永久版");
  });
});

describe("供应商 Key 加密", () => {
  const SECRET = "test-jwt-secret-value";

  it("加密后可解密回原文", async () => {
    const plain = "sk-upstream-abcdef123456";
    const enc = await encryptApiKey(SECRET, plain);
    expect(enc).not.toContain(plain);
    expect(await decryptApiKey(SECRET, enc)).toBe(plain);
  });

  it("同一明文两次加密得到不同密文（随机 IV）", async () => {
    const a = await encryptApiKey(SECRET, "sk-same");
    const b = await encryptApiKey(SECRET, "sk-same");
    expect(a).not.toBe(b);
    expect(await decryptApiKey(SECRET, a)).toBe(await decryptApiKey(SECRET, b));
  });

  it("换 JWT_SECRET 后无法解密", async () => {
    const enc = await encryptApiKey(SECRET, "sk-x");
    await expect(decryptApiKey("another-secret", enc)).rejects.toThrow(
      /JWT_SECRET/
    );
  });

  it("密文被篡改时解密失败", async () => {
    const enc = await encryptApiKey(SECRET, "sk-tamper");
    // 改动密文尾部（不含前缀与 IV 区）
    const body = enc.slice("v1:".length);
    const flipped = body.slice(0, -2) + (body.endsWith("00") ? "11" : "00");
    await expect(decryptApiKey(SECRET, "v1:" + flipped)).rejects.toThrow();
  });

  it("非 v1: 前缀的密文直接拒绝", async () => {
    await expect(decryptApiKey(SECRET, "deadbeef")).rejects.toThrow(/v1:/);
  });
});

describe("对外供应商形态不含密钥", () => {
  const row = {
    id: "p_1",
    name: "官方中转",
    base_url: "https://api.example.com/v1",
    api_key_enc: "v1:aabbcc",
    models: JSON.stringify([{ name: "gpt-4o-mini", label: "GPT-4o mini" }]),
    enabled: 1,
    sort: 0,
  };

  it("不含 base_url 与 api_key_enc", () => {
    const pub = toPublicProvider(row, "https://orion.example.com");
    const dumped = JSON.stringify(pub);
    expect(dumped).not.toContain("api_key_enc");
    expect(dumped).not.toContain("aabbcc");
    // chatUrl 指向自己的中继, 不含上游地址
    expect(pub.chatUrl).toBe("https://orion.example.com/api/ai/chat");
    expect(dumped).not.toContain("api.example.com");
  });

  it("models 正确解析", () => {
    const pub = toPublicProvider(row, "");
    expect(pub.models).toHaveLength(1);
    expect(pub.models[0]!.name).toBe("gpt-4o-mini");
  });

  it("models 是坏 JSON 时降级为空数组而非抛错", () => {
    const bad = { ...row, models: "{not json" };
    expect(toPublicProvider(bad, "").models).toEqual([]);
  });

  it("apiBase 传空串时 chatUrl 仍以 /api/ai/chat 结尾", () => {
    expect(toPublicProvider(row, "").chatUrl).toBe("/api/ai/chat");
  });
});
