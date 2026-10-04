/**
 * 密码哈希: PBKDF2-SHA256 (WebCrypto, 边缘可用; bcrypt/argon2 在边缘运行时不可用)。
 * 存储格式: pbkdf2$<iterations>$<salt-hex>$<hash-hex>
 */
const ITERATIONS = 120_000;
const SALT_BYTES = 16;
const KEY_BITS = 256;

const encoder = new TextEncoder();

async function deriveBits(
  password: string,
  salt: Uint8Array,
  iterations: number
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
      hash: "SHA-256",
    },
    keyMaterial,
    KEY_BITS
  );
  let hexOut = "";
  for (const b of new Uint8Array(bits)) hexOut += b.toString(16).padStart(2, "0");
  return hexOut;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = new Uint8Array(SALT_BYTES);
  crypto.getRandomValues(salt);
  let saltHex = "";
  for (const b of salt) saltHex += b.toString(16).padStart(2, "0");
  const hash = await deriveBits(password, salt, ITERATIONS);
  return `pbkdf2$${ITERATIONS}$${saltHex}$${hash}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 4 || parts[0] !== "pbkdf2") return false;
  const iterations = Number(parts[1]);
  const saltHex = parts[2];
  if (!Number.isFinite(iterations) || iterations < 1) return false;
  const salt = new Uint8Array(saltHex.length / 2);
  for (let i = 0; i < salt.length; i++) {
    salt[i] = parseInt(saltHex.slice(i * 2, i * 2 + 2), 16);
  }
  const hash = await deriveBits(password, salt, iterations);
  // 常数时间比较
  if (hash.length !== parts[3].length) return false;
  let diff = 0;
  for (let i = 0; i < hash.length; i++) diff |= hash.charCodeAt(i) ^ parts[3].charCodeAt(i);
  return diff === 0;
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
