/**
 * 注册策略：邮箱域名白名单 + 账号名生成。
 *
 * 两项都是 2026-10-09 的产品要求：
 * 1. 只允许指定邮箱域名注册，其它域名一律「邮箱不支持」；
 * 2. 账号名固定为 `agent-` + 5 位随机数字（用户不需要自己起用户名）。
 */

/** 默认允许的注册邮箱域名（小写，不含 @）。 */
export const DEFAULT_REGISTER_EMAIL_DOMAINS = [
  "qq.com",
  "189.cn",
  "139.com",
  "163.com",
  "126.com",
];

/**
 * 解析白名单：优先用环境变量 REGISTER_EMAIL_DOMAINS（逗号分隔，可带 @），
 * 没配或配了但解析不出任何域名时回落到默认白名单。
 *
 * 留空环境变量 = 用默认值；**不支持用空值关闭白名单**——关闭限制应当改代码，
 * 而不是靠"忘配环境变量"这种副作用发生。
 */
export function registerEmailDomains(override?: string | null): string[] {
  const raw = String(override ?? "").trim();
  if (!raw) return DEFAULT_REGISTER_EMAIL_DOMAINS;
  const list = raw
    .split(",")
    .map((s) => s.trim().toLowerCase().replace(/^@+/, ""))
    .filter((s) => s.length > 0 && s.includes("."));
  return list.length > 0 ? list : DEFAULT_REGISTER_EMAIL_DOMAINS;
}

/**
 * 注册专用的邮箱校验：先过通用格式（validateEmail），再过域名白名单。
 *
 * 返回 null = 通过；返回字符串 = 给用户的拒绝原因（会原样进 400 响应体）。
 * 白名单拒绝必须说清「不支持」以及支持哪些，否则用户只会看到一个
 * 不知道该换什么邮箱的报错。
 */
export function validateRegisterEmail(
  email: string,
  envDomains?: string | null
): string | null {
  const at = email.lastIndexOf("@");
  if (at <= 0 || at === email.length - 1) return "邮箱格式不正确";
  const domain = email.slice(at + 1).toLowerCase();
  const allowed = registerEmailDomains(envDomains);
  if (!allowed.includes(domain)) {
    return `邮箱不支持，仅支持以下邮箱注册：${allowed.join("、")}`;
  }
  return null;
}

/** 账号名前缀。 */
export const USERNAME_PREFIX = "agent-";

/** 账号名数字位数：`agent-` 之后固定 5 位（不足补前导 0）。 */
export const USERNAME_DIGITS = 5;

/**
 * 生成一个账号名：`agent-` + 5 位随机数字，如 `agent-04731`。
 *
 * 用 crypto.getRandomValues 而非 Math.random：账号名虽不是秘密，
 * 但同一批注册若可预测，会方便别人撞出"谁注册了哪个号"。
 * 固定 5 位（含前导 0）保证长度一致，前端按等宽字体对齐不会错位。
 */
export function generateUsername(): string {
  const span = 10 ** USERNAME_DIGITS;
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  const n = buf[0] % span;
  return `${USERNAME_PREFIX}${String(n).padStart(USERNAME_DIGITS, "0")}`;
}

/**
 * 账号名撞号上限。5 位数字有 10 万个组合，正常注册密度下撞不上；
 * 撞了就重掷，连续 12 次都撞上说明库里同前缀账号已接近饱和，
 * 继续重掷只会白白拉长注册耗时，直接抛错让上层报 500 更诚实。
 */
export const USERNAME_MAX_ATTEMPTS = 12;
