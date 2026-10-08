/**
 * 用户自部署 Agent 实例（orion-forge）的授权与转发。
 *
 * 与 [llm_providers] 的区别：
 *  - llm_providers 是**平台方**统一配置的共享上游（一对多）；
 *  - agent_instances 是**每个用户**一份实例地址与密钥（一对一），
 *    且只能由管理台录入 —— App 端不提供任何填写入口。
 *
 * App 端只拿到"有没有开通"和"往哪发请求"，永远拿不到 base_url 与密钥。
 */

import type { Client } from "@libsql/client";
import { hex, nowMs, uuid } from "../utils/crypto";
import { errors } from "../utils/errors";

const encPrefix = "v1:";

/** 与 ai_providers 同口径：JWT_SECRET 派生 AES-GCM 密钥。 */
async function deriveKey(secret: string): Promise<CryptoKey> {
  const raw = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`orion_agent_llm_provider_key:${secret}`),
  );
  return crypto.subtle.importKey("raw", raw, { name: "AES-GCM" }, false, [
    "encrypt",
    "decrypt",
  ]);
}

export async function encryptSecret(secret: string, plain: string): Promise<string> {
  const key = await deriveKey(secret);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(plain)),
  );
  const joined = new Uint8Array(iv.length + ct.length);
  joined.set(iv, 0);
  joined.set(ct, iv.length);
  return `${encPrefix}${hex(joined)}`;
}

export async function decryptSecret(secret: string, enc: string): Promise<string> {
  if (!enc.startsWith(encPrefix)) {
    throw errors.internal("实例密钥格式不正确");
  }
  const h = enc.slice(encPrefix.length);
  const joined = new Uint8Array(h.length / 2);
  for (let i = 0; i < joined.length; i++) {
    joined[i] = parseInt(h.slice(i * 2, i * 2 + 2), 16);
  }
  if (joined.length < 13) throw errors.internal("实例密钥密文长度异常");
  try {
    const pt = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: joined.slice(0, 12) },
      await deriveKey(secret),
      joined.slice(12),
    );
    return new TextDecoder().decode(pt);
  } catch {
    throw errors.internal("实例密钥解密失败：JWT_SECRET 可能已变更，需重新录入");
  }
}

export type AgentInstanceRow = {
  user_id: string;
  base_url: string;
  api_key_enc: string;
  enabled: number;
  label: string;
};

export type PublicAgentInfo = {
  enabled: boolean;
  /** 下发给 App 的名称（不含任何地址信息）。 */
  label: string;
  /** 请求地址：恒为本后端中继，App 拿不到用户实例的真实地址。 */
  chatUrl: string;
  /** 模型名（App 侧模型选择器里显示用）。 */
  model: string;
};

function normalizeBaseUrl(raw: string): string {
  const b = raw.trim().replace(/\/+$/, "");
  let parsed: URL;
  try {
    parsed = new URL(b);
  } catch {
    throw errors.badRequest("实例地址不合法，需形如 https://your-forge.example.com");
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw errors.badRequest("实例地址必须以 http(s):// 开头");
  }
  return b;
}

export async function getInstance(db: Client, userId: string): Promise<AgentInstanceRow | null> {
  const r = await db.execute({
    sql: `SELECT user_id, base_url, api_key_enc, enabled, label
          FROM agent_instances WHERE user_id = ?`,
    args: [userId],
  });
  return (r.rows[0] as unknown as AgentInstanceRow) ?? null;
}

/** 管理台列表（不含密钥明文）。 */
export async function listAgentInstances(db: Client): Promise<
  (AgentInstanceRow & { email: string | null; plan: string | null })[]
> {
  const r = await db.execute(
    `SELECT a.user_id, a.base_url, a.api_key_enc, a.enabled, a.label,
            u.email, u.plan
     FROM agent_instances a LEFT JOIN users u ON u.id = a.user_id
     ORDER BY a.updated_at DESC`,
  );
  return r.rows as unknown as (AgentInstanceRow & {
    email: string | null;
    plan: string | null;
  })[];
}

export async function upsertAgentInstance(
  db: Client,
  secret: string,
  input: { userId: string; baseUrl: string; apiKey?: string; enabled?: boolean; label?: string },
): Promise<void> {
  const userId = input.userId.trim();
  if (!userId) throw errors.badRequest("userId 不能为空");

  // 校验用户存在，避免挂到不存在的账号上
  const u = await db.execute({ sql: "SELECT id FROM users WHERE id = ?", args: [userId] });
  if (u.rows.length === 0) throw errors.notFound("用户不存在");

  const existing = await getInstance(db, userId);
  const label = (input.label ?? "").trim() || "云端 Agent";

  if (existing) {
    // apiKey 留空 = 不改动已有密钥
    const enc = input.apiKey?.trim()
      ? await encryptSecret(secret, input.apiKey.trim())
      : existing.api_key_enc;
    await db.execute({
      sql: `UPDATE agent_instances
            SET base_url = ?, api_key_enc = ?, enabled = ?, label = ?, updated_at = ?
            WHERE user_id = ?`,
      args: [
        normalizeBaseUrl(input.baseUrl),
        enc,
        input.enabled === false ? 0 : 1,
        label,
        nowMs(),
        userId,
      ],
    });
    return;
  }

  if (!input.apiKey?.trim()) {
    throw errors.badRequest("新建实例必须填写 API Key");
  }
  await db.execute({
    sql: `INSERT INTO agent_instances
          (user_id, base_url, api_key_enc, enabled, label, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: [
      userId,
      normalizeBaseUrl(input.baseUrl),
      await encryptSecret(secret, input.apiKey.trim()),
      input.enabled === false ? 0 : 1,
      label,
      nowMs(),
      nowMs(),
    ],
  });
}

export async function deleteAgentInstance(db: Client, userId: string): Promise<void> {
  const r = await db.execute({ sql: "DELETE FROM agent_instances WHERE user_id = ?", args: [userId] });
  if (Number(r.rowsAffected ?? 0) === 0) throw errors.notFound("未找到该用户的实例授权");
  // 会话映射一并清掉，避免留着指向已删实例的 id
  await db.execute({ sql: "DELETE FROM agent_sessions WHERE user_id = ?", args: [userId] });
}

/** App 侧视图：只暴露"开没开通 + 往哪发"，绝不含真实地址与密钥。 */
export function toPublicAgentInfo(
  row: AgentInstanceRow | null,
  apiBase: string,
): PublicAgentInfo {
  const base = apiBase.replace(/\/+$/, "");
  return {
    enabled: !!row && row.enabled === 1,
    label: row?.label ?? "云端 Agent",
    chatUrl: `${base}/api/agent/chat`,
    // App 侧只暴露一个虚拟模型名；真实模型由 Agent 实例内部决定
    model: "agent",
  };
}

/** 取用户可用的实例；未开通/停用时返回 null。 */
export async function requireInstance(
  db: Client,
  userId: string,
): Promise<AgentInstanceRow> {
  const row = await getInstance(db, userId);
  if (!row) throw errors.forbidden("尚未开通云端 Agent");
  if (row.enabled !== 1) throw errors.forbidden("云端 Agent 已被停用");
  return row;
}

// ---------------- App 会话 ↔ Agent 会话映射 ----------------

export async function getAgentSession(
  db: Client,
  userId: string,
  appSessionId: string,
): Promise<{ remote_session: string; remote_chat: string } | null> {
  const r = await db.execute({
    sql: `SELECT remote_session, remote_chat FROM agent_sessions
          WHERE user_id = ? AND app_session_id = ?`,
    args: [userId, appSessionId],
  });
  return (r.rows[0] as unknown as { remote_session: string; remote_chat: string }) ?? null;
}

export async function saveAgentSession(
  db: Client,
  userId: string,
  appSessionId: string,
  remoteSession: string,
  remoteChat: string,
): Promise<void> {
  await db.execute({
    sql: `INSERT INTO agent_sessions
          (user_id, app_session_id, remote_session, remote_chat, updated_at)
          VALUES (?, ?, ?, ?, ?)
          ON CONFLICT(user_id, app_session_id)
          DO UPDATE SET remote_session = excluded.remote_session,
                        remote_chat = excluded.remote_chat,
                        updated_at = excluded.updated_at`,
    args: [userId, appSessionId, remoteSession, remoteChat, nowMs()],
  });
}

export async function clearAgentSession(
  db: Client,
  userId: string,
  appSessionId: string,
): Promise<void> {
  await db.execute({
    sql: "DELETE FROM agent_sessions WHERE user_id = ? AND app_session_id = ?",
    args: [userId, appSessionId],
  });
}

export { uuid };
