/**
 * AI 模型供应商的服务端管理。
 *
 * 设计要点:
 * - **上游 Key 只存在后端**, 加密后存 llm_providers.api_key_enc,
 *   任何面向 App 的响应都不含明文(见 toPublicProvider)。
 * - 加密用 JWT_SECRET 派生 AES-GCM 密钥, 不额外引入密钥管理;
 *   换 JWT_SECRET 会导致已存 Key 无法解密(需重新录入), 这点在
 *   .env.example 里注明。
 * - models 存 JSON 数组, 结构与 App 端 ProviderModel 对齐, 便于 App
 *   直接映射成可选模型。
 */

import type { Client } from "@libsql/client";
import { hex, nowMs, uuid } from "../utils/crypto";
import { errors, ApiError } from "../utils/errors";

/** 与 App 端 lib/models/llm_config.dart 的 ProviderModel 对齐。 */
export type ProviderModelSpec = {
  name: string; // 请求体里的 model 字段
  label?: string; // 展示名
  kind?: "chat" | "embedding";
  contextWindow?: number;
  maxOutputTokens?: number;
};

export type PublicProvider = {
  id: string;
  name: string;
  /** App 端请求地址：直接打后端中继, App 不接触上游地址。 */
  chatUrl: string;
  models: ProviderModelSpec[];
};

/** 内部行(含密文), 仅服务端使用。 */
type ProviderRow = {
  id: string;
  name: string;
  base_url: string;
  api_key_enc: string;
  models: string;
  enabled: number;
  sort: number;
};

const encPrefix = "v1:";

/** 从 JWT_SECRET 派生 32 字节 AES 密钥(SHA-256, 够用且免去 PBKDF2 的迭代开销)。 */
async function deriveKey(secret: string): Promise<CryptoKey> {
  const raw = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`orion_agent_llm_provider_key:${secret}`)
  );
  return crypto.subtle.importKey("raw", raw, { name: "AES-GCM" }, false, [
    "encrypt",
    "decrypt",
  ]);
}

export async function encryptApiKey(secret: string, plain: string): Promise<string> {
  const key = await deriveKey(secret);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = new TextEncoder().encode(plain);
  const ct = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, data)
  );
  // iv | ciphertext
  const joined = new Uint8Array(iv.length + ct.length);
  joined.set(iv, 0);
  joined.set(ct, iv.length);
  return `${encPrefix}${hex(joined)}`;
}

export async function decryptApiKey(secret: string, enc: string): Promise<string> {
  // 2026-10-11：解密失败改用 503（全局 handler 只吞 5xx 文案，500 会被
  // 泛化成「服务器内部错误」，管理员/App 无法知道该做什么）。503 带
  // 明确的修复指引直通调用方。
  const badKey = (detail: string) =>
    new ApiError(
      503,
      "provider_key_invalid",
      `供应商 API Key 无法解密（${detail}）——请在管理台编辑该供应商，重新填写 API Key 并保存`,
    );
  if (!enc.startsWith(encPrefix)) {
    throw badKey("密文缺少 v1: 前缀");
  }
  let joined: Uint8Array;
  try {
    joined = hexToBytes(enc.slice(encPrefix.length));
  } catch {
    throw badKey("密文不是合法 hex");
  }
  if (joined.length < 13) throw badKey("密文长度异常");
  const iv = joined.slice(0, 12);
  const ct = joined.slice(12);
  const key = await deriveKey(secret);
  try {
    const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ct);
    return new TextDecoder().decode(pt);
  } catch {
    // 换过 JWT_SECRET 会走到这里
    throw badKey("JWT_SECRET 可能已变更");
  }
}

function hexToBytes(h: string): Uint8Array {
  const out = new Uint8Array(h.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(h.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

function parseModels(raw: string): ProviderModelSpec[] {
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (m): m is ProviderModelSpec =>
        !!m && typeof m.name === "string" && m.name.trim() !== ""
    );
  } catch {
    // models 是 JSON 列, 手工改库可能写坏; 宁可当空也不让整个列表挂掉
    return [];
  }
}

/** 对外形态：绝不含 base_url / api_key。 */
export function toPublicProvider(
  row: ProviderRow,
  apiBase: string
): PublicProvider {
  return {
    id: row.id,
    name: row.name,
    chatUrl: `${apiBase.replace(/\/+$/, "")}/api/ai/chat`,
    models: parseModels(row.models),
  };
}

export async function listProviders(db: Client): Promise<ProviderRow[]> {
  const r = await db.execute({
    sql: `SELECT id, name, base_url, api_key_enc, models, enabled, sort
          FROM llm_providers ORDER BY sort ASC, created_at ASC`,
  });
  return r.rows as unknown as ProviderRow[];
}

export async function listEnabledProviders(db: Client): Promise<ProviderRow[]> {
  const r = await db.execute({
    sql: `SELECT id, name, base_url, api_key_enc, models, enabled, sort
          FROM llm_providers WHERE enabled = 1 ORDER BY sort ASC, created_at ASC`,
  });
  return r.rows as unknown as ProviderRow[];
}

export async function getProvider(
  db: Client,
  id: string
): Promise<ProviderRow | null> {
  const r = await db.execute({
    sql: `SELECT id, name, base_url, api_key_enc, models, enabled, sort
          FROM llm_providers WHERE id = ?`,
    args: [id],
  });
  return (r.rows[0] as unknown as ProviderRow) ?? null;
}

export type ProviderInput = {
  name: string;
  baseUrl: string;
  apiKey?: string; // 空表示不改动已有 Key(编辑场景)
  models: ProviderModelSpec[];
  enabled: boolean;
  sort?: number;
};

function normalizeBaseUrl(raw: string): string {
  const b = raw.trim().replace(/\/+$/, "");
  if (!/^https?:\/\//i.test(b)) {
    throw errors.badRequest("base_url 必须以 http(s):// 开头");
  }
  return b;
}

function validateModels(models: ProviderModelSpec[]): ProviderModelSpec[] {
  if (!Array.isArray(models) || models.length === 0) {
    throw errors.badRequest("至少配置一个模型");
  }
  return models.map((m) => ({
    name: String(m.name).trim(),
    label: m.label ? String(m.label).trim() : undefined,
    kind: m.kind === "embedding" ? "embedding" : "chat",
    contextWindow: Number(m.contextWindow) || 0,
    maxOutputTokens: Number(m.maxOutputTokens) || 0,
  }));
}

export async function createProvider(
  db: Client,
  secret: string,
  input: ProviderInput
): Promise<string> {
  const name = input.name.trim();
  if (!name) throw errors.badRequest("供应商名称不能为空");
  if (!input.apiKey?.trim()) throw errors.badRequest("新建供应商必须填写 API Key");
  const id = `p_${uuid()}`;
  const ts = nowMs();
  await db.execute({
    sql: `INSERT INTO llm_providers
          (id, name, base_url, api_key_enc, models, enabled, sort, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id,
      name,
      normalizeBaseUrl(input.baseUrl),
      await encryptApiKey(secret, input.apiKey.trim()),
      JSON.stringify(validateModels(input.models)),
      input.enabled ? 1 : 0,
      Number(input.sort) || 0,
      ts,
      ts,
    ],
  });
  return id;
}

export async function updateProvider(
  db: Client,
  secret: string,
  id: string,
  input: ProviderInput
): Promise<void> {
  const existing = await getProvider(db, id);
  if (!existing) throw errors.notFound("供应商不存在");
  const name = input.name.trim();
  if (!name) throw errors.badRequest("供应商名称不能为空");
  const enc = input.apiKey?.trim()
    ? await encryptApiKey(secret, input.apiKey.trim())
    : existing.api_key_enc;
  await db.execute({
    sql: `UPDATE llm_providers
          SET name = ?, base_url = ?, api_key_enc = ?, models = ?, enabled = ?, sort = ?, updated_at = ?
          WHERE id = ?`,
    args: [
      name,
      normalizeBaseUrl(input.baseUrl),
      enc,
      JSON.stringify(validateModels(input.models)),
      input.enabled ? 1 : 0,
      input.sort === undefined ? existing.sort : Number(input.sort) || 0,
      nowMs(),
      id,
    ],
  });
}

export async function deleteProvider(db: Client, id: string): Promise<void> {
  const r = await db.execute({
    sql: "DELETE FROM llm_providers WHERE id = ?",
    args: [id],
  });
  if (Number(r.rowsAffected ?? 0) === 0) {
    throw errors.notFound("供应商不存在");
  }
}

/**
 * 挑一个能用的供应商: 优先指定 id, 否则按 sort 取第一个启用的。
 * appId 仅用于日志/回传, 让 App 侧知道实际用了哪家的模型。
 */
export async function resolveProviderForChat(
  db: Client,
  secret: string,
  providerId: string | undefined,
  model: string
): Promise<{ row: ProviderRow; apiKey: string; baseUrl: string; model: string }> {
  const rows = providerId
    ? [await getProvider(db, providerId)].filter((r): r is ProviderRow => !!r)
    : await listEnabledProviders(db);
  if (rows.length === 0) {
    throw errors.internal("后端尚未配置可用的 AI 模型供应商");
  }
  const row = rows[0]!;
  const models = parseModels(row.models);
  const chosen =
    models.find((m) => m.name === model) ??
    // 没指定或指定的不存在 → 退回第一个聊天模型
    models.find((m) => m.kind !== "embedding");
  if (!chosen) {
    throw errors.badRequest(`供应商「${row.name}」未配置可用模型`);
  }
  const baseUrl = normalizeBaseUrl(row.base_url);
  // 平台内部地址守卫（2026-10-11 修复 P1）：管理台曾在 EdgeOne 内部
  // SCF 域名下操作，apiBase 旧回落链把内部域名存进了 base_url——
  // 上游转发永远失败。这里显式拦截并给出可执行的修复指引（503，
  // 服务端可预期的运维态而非 500）。
  if (/(\.qcloudteo\.com|pages-scf-|\.internal$)/i.test(baseUrl)) {
    throw new ApiError(
      503,
      "provider_misconfigured",
      `供应商「${row.name}」的 base_url 配置了平台内部地址（${baseUrl}），请在管理台改为上游模型的公网地址后重试`,
    );
  }
  return {
    row,
    apiKey: await decryptApiKey(secret, row.api_key_enc),
    baseUrl,
    model: chosen.name,
  };
}
