import { describe, it, expect } from "vitest";
import {
  applyPlanGrant,
  validateAccountPlan,
} from "../src/services/account_plans";
import { ApiError } from "../src/utils/errors";

const NOW = 1_700_000_000_000;
const DAY = 24 * 3600 * 1000;

describe("账号授权: applyPlanGrant", () => {
  it("set: trial/pro 从当前时间起算", () => {
    expect(applyPlanGrant("free", null, "pro", 30, "set", NOW)).toEqual({
      plan: "pro",
      expiresAt: NOW + 30 * DAY,
    });
  });

  it("set: lifetime 永久（到期时间清空）", () => {
    expect(applyPlanGrant("free", null, "lifetime", 0, "set", NOW)).toEqual({
      plan: "lifetime",
      expiresAt: null,
    });
  });

  it("set: free 撤销授权", () => {
    expect(
      applyPlanGrant("pro", NOW + 10 * DAY, "free", 0, "set", NOW)
    ).toEqual({ plan: "free", expiresAt: null });
  });

  it("extend: 同套餐未过期 → 在现有到期时间上顺延", () => {
    const cur = NOW + 10 * DAY;
    expect(applyPlanGrant("pro", cur, "pro", 30, "extend", NOW)).toEqual({
      plan: "pro",
      expiresAt: cur + 30 * DAY,
    });
  });

  it("extend: 同套餐已过期 → 从当前时间起算", () => {
    const cur = NOW - 5 * DAY;
    expect(applyPlanGrant("pro", cur, "pro", 30, "extend", NOW)).toEqual({
      plan: "pro",
      expiresAt: NOW + 30 * DAY,
    });
  });

  it("extend: 更高套餐未过期 → 顺延其到期时间", () => {
    const cur = NOW + 10 * DAY;
    expect(applyPlanGrant("pro", cur, "trial", 30, "extend", NOW)).toEqual({
      plan: "pro",
      expiresAt: cur + 30 * DAY,
    });
  });

  it("extend: 更低套餐且已过期 → 从当前时间起算", () => {
    expect(applyPlanGrant("free", null, "trial", 7, "extend", NOW)).toEqual({
      plan: "trial",
      expiresAt: NOW + 7 * DAY,
    });
  });

  it("extend: lifetime 永远永久", () => {
    expect(
      applyPlanGrant("pro", NOW + 10 * DAY, "lifetime", 0, "extend", NOW)
    ).toEqual({ plan: "lifetime", expiresAt: null });
  });

  it("非永久套餐 durationDays <= 0 报错", () => {
    expect(() => applyPlanGrant("free", null, "pro", 0, "set", NOW)).toThrow(
      ApiError
    );
  });

  it("validateAccountPlan 拒绝未知套餐", () => {
    expect(() => validateAccountPlan("vip")).toThrow(ApiError);
    expect(validateAccountPlan("pro")).toBe("pro");
  });
});
