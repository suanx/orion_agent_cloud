/**
 * 密码哈希: PBKDF2-SHA256 (WebCrypto, 边缘可用; bcrypt/argon2 在边缘运行时不可用)。
 * 存储格式: pbkdf2$<iterations>$<salt-hex>$<hash-hex>
 *
 * ⚠️ 边缘运行时兼容性(2026-10-08 线上注册 500 "Param Invalid"):
 * EdgeOne 的 WebCrypto 在 deriveBits 上直接抛 Param Invalid(Node 同一代码正常),
 * 因此不能假定 12 万次迭代与字符串形式 "SHA-256" 处处可用。这里按候选列表逐个
 * 尝试, 并把**实际生效的迭代数**写进存储串—— verifyPassword 从串里读回该
 * 迭代数, 注册与校验路径天然一致。
 */
const ITER_PREFERRED = 120_000;
/** 候选: 迭代数 × hash 参数形式(部分运行时只接受对象形式)。 */
const CANDIDATES: Array<{ iterations: number; hash: string | { name: string } }> = [
  { iterations: ITER_PREFERRED, hash: "SHA-256" },
  { iterations: ITER_PREFERRED, hash: { name: "SHA-256" } },
  { iterations: 10_000, hash: "SHA-256" },
  { iterations: 10_000, hash: { name: "SHA-256" } },
  { iterations: 1_000, hash: "SHA-256" },
  { iterations: 1_000, hash: { name: "SHA-256" } },
];
const SALT_BYTES = 16;
const KEY_BITS = 256;

const encoder = new TextEncoder();

async function deriveBits(
  password: string,
  salt: Uint8Array,
  iterations: number,
  hash: string | { name: string }
): Promise<string> {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: salt as BufferSource,
      iterations,
      hash,
    },
    keyMaterial,
    KEY_BITS
  );
  let hexOut = "";
  for (const b of new Uint8Array(bits)) hexOut += b.toString(16).padStart(2, "0");
  return hexOut;
}

/** 依次尝试候选参数, 返回首个成功结果; 全失败则抛出带原因的异常。 */
async function deriveWithFallback(
  password: string,
  salt: Uint8Array
): Promise<{ hash: string; iterations: number }> {
  let lastErr: unknown = null;
  for (const c of CANDIDATES) {
    try {
      const hash = await deriveBits(password, salt, c.iterations, c.hash);
      if (c.iterations !== ITER_PREFERRED || typeof c.hash !== "string") {
        console.log(
          `[auth] PBKDF2 降级生效: iterations=${c.iterations} hash=${
            typeof c.hash === "string" ? c.hash : "object"
          }`
        );
      }
      return { hash, iterations: c.iterations };
    } catch (e) {
      lastErr = e;
    }
  }
  throw new Error(
    `密码哈希失败(PBKDF2 候选全部不可用): ${
      lastErr instanceof Error ? `${lastErr.name}: ${lastErr.message}` : String(lastErr)
    }`
  );
}

export async function hashPassword(password: string): Promise<string> {
  const salt = new Uint8Array(SALT_BYTES);
  crypto.getRandomValues(salt);
  let saltHex = "";
  for (const b of salt) saltHex += b.toString(16).padStart(2, "0");
  const { hash, iterations } = await deriveWithFallback(password, salt);
  return `pbkdf2$${iterations}$${saltHex}$${hash}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 4 || parts[0] !== "pbkdf2") return false;
  const iterations = Number(parts[1]);
  const saltHex = parts[2];
  const expect = parts[3];
  if (!Number.isFinite(iterations) || iterations < 1 || !saltHex || !expect) return false;
  const salt = new Uint8Array(saltHex.length / 2);
  for (let i = 0; i < salt.length; i++) {
    salt[i] = parseInt(saltHex.slice(i * 2, i * 2 + 2), 16);
  }
  // 同一密码可能因运行时差异要用不同 hash 参数形式, 逐个尝试;
  // 一旦算出哈希且长度不符即判定密码错误, 不再继续。
  const forms: Array<string | { name: string }> = ["SHA-256", { name: "SHA-256" }];
  for (const form of forms) {
    let hash: string;
    try {
      hash = await deriveBits(password, salt, iterations, form);
    } catch {
      continue; // 该形式在此运行时不可用
    }
    if (hash.length !== expect.length) return false;
    let diff = 0;
    for (let i = 0; i < hash.length; i++) diff |= hash.charCodeAt(i) ^ expect.charCodeAt(i);
    return diff === 0;
  }
  return false;
}

/** 密码强度最低要求: 8-72 位, 含字母与数字。 */
export function validatePassword(password: string): string | null {
  if (typeof password !== "string" || password.length < 8) return "密码至少 8 位";
  if (password.length > 72) return "密码最长 72 位";
  if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) return "密码需同时包含字母与数字";
  return null;
}

export function validateEmail(email: string): string | null {
  if (typeof email !== "string" || email.length < 3 || email.length > 254) return "邮箱格式不正确";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "邮箱格式不正确";
  return null;
}
