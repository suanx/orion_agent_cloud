/** WebCrypto 基础设施(边缘运行时与 Node 20+ 均内置 crypto 全局)。 */

export async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return hex(digest);
}

export function hex(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let out = "";
  for (const b of bytes) out += b.toString(16).padStart(2, "0");
  return out;
}

/** 长随机令牌(设备令牌/刷新令牌), 32 字节 = 64 hex 字符。 */
export function randomToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return hex(bytes);
}

export function uuid(): string {
  return crypto.randomUUID();
}

export function nowMs(): number {
  return Date.now();
}
