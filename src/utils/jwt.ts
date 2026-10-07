import { hex } from "./crypto";

/**
 * JWT (HS256) — WebCrypto 实现, 边缘运行时可用。
 * 仅用于短时 Access Token; Refresh/Device Token 是长随机串, 存库哈希校验。
 */

const encoder = new TextEncoder();

export interface JwtPayload {
  sub: string; // user id
  plan: string; // free | trial | pro | lifetime
  exp: number; // unix 秒
  iat: number;
  did?: string; // 绑定设备
}

function b64urlEncode(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * base64url 解码。输入非法（长度 %4==1、含非法字符等）时 atob 会抛
 * DOMException——畸形 token 必须按 401 处理而不是 500（本地部署实测：
 * "fake.jwt.token" 直接把 verifyJwt 炸成未处理异常），所以这里吞掉
 * 异常返回 null，由调用方按 malformed 处理。
 */
function b64urlDecode(input: string): Uint8Array | null {
  try {
    const pad = input.length % 4 === 0 ? "" : "=".repeat(4 - (input.length % 4));
    const bin = atob(input.replace(/-/g, "+").replace(/_/g, "/") + pad);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
  } catch {
    return null;
  }
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

export async function signJwt(
  payload: Omit<JwtPayload, "iat">,
  secret: string
): Promise<string> {
  const header = b64urlEncode(encoder.encode(JSON.stringify({ alg: "HS256", typ: "JWT" })));
  const full: JwtPayload = { ...payload, iat: Math.floor(Date.now() / 1000) };
  const body = b64urlEncode(encoder.encode(JSON.stringify(full)));
  const key = await hmacKey(secret);
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(`${header}.${body}`));
  return `${header}.${body}.${b64urlEncode(new Uint8Array(sig))}`;
}

export type VerifyResult =
  | { ok: true; payload: JwtPayload }
  | { ok: false; reason: "malformed" | "bad_signature" | "expired" };

export async function verifyJwt(token: string, secret: string): Promise<VerifyResult> {
  const parts = token.split(".");
  if (parts.length !== 3) return { ok: false, reason: "malformed" };
  const [header, body, sig] = parts;
  const key = await hmacKey(secret);
  const sigBytes = b64urlDecode(sig);
  if (!sigBytes) return { ok: false, reason: "malformed" };
  const valid = await crypto.subtle.verify(
    "HMAC",
    key,
    sigBytes,
    encoder.encode(`${header}.${body}`)
  );
  if (!valid) return { ok: false, reason: "bad_signature" };
  let payload: JwtPayload;
  try {
    const bodyBytes = b64urlDecode(body);
    if (!bodyBytes) return { ok: false, reason: "malformed" };
    payload = JSON.parse(new TextDecoder().decode(bodyBytes));
  } catch {
    return { ok: false, reason: "malformed" };
  }
  if (typeof payload.exp !== "number" || payload.exp * 1000 < Date.now()) {
    return { ok: false, reason: "expired" };
  }
  return { ok: true, payload };
}

export function accessTokenTtlSeconds(): number {
  return 2 * 60 * 60; // 2 小时
}

/** 用于测试: 返回十六进制签名(供断言), 不直接使用。 */
export async function hmacHex(message: string, secret: string): Promise<string> {
  const key = await hmacKey(secret);
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return hex(sig);
}
