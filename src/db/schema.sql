-- orion-backend 数据库 schema (Turso / libSQL)
-- 迁移工具: scripts/migrate.mjs (drizzle-kit 待引入, 先用裸 SQL)

-- ============ 账号与授权 ============

CREATE TABLE IF NOT EXISTS users (
  id              TEXT PRIMARY KEY,              -- u_<uuid>
  username        TEXT UNIQUE,                   -- agent-<5位数字>, 注册时生成; 老用户首次登录回填
  email           TEXT NOT NULL UNIQUE,
  password_hash   TEXT NOT NULL,                 -- pbkdf2$iter$salt$hash (hex)
  plan            TEXT NOT NULL DEFAULT 'free',  -- free | trial | pro | lifetime
  plan_expires_at INTEGER,                       -- unix ms; lifetime 为 NULL
  status          TEXT NOT NULL DEFAULT 'active',-- active | banned
  created_at      INTEGER NOT NULL,
  updated_at      INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash         TEXT PRIMARY KEY,           -- sha256(refresh/device token) hex
  user_id            TEXT NOT NULL REFERENCES users(id),
  kind               TEXT NOT NULL,              -- refresh | device
  device_id          TEXT NOT NULL,
  device_name        TEXT NOT NULL DEFAULT '',
  expires_at         INTEGER,                    -- NULL = 永不过期(设备令牌)
  revoked            INTEGER NOT NULL DEFAULT 0,
  created_at         INTEGER NOT NULL,
  last_used_at       INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_user   ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_device ON sessions(device_id);

-- [已废弃] 卡密授权已改为账号授权(admin 直接设置 plan), 表保留供历史数据查询
CREATE TABLE IF NOT EXISTS licenses (
  code           TEXT PRIMARY KEY,               -- ORION-XXXX-XXXX-XXXX-XXXX
  plan           TEXT NOT NULL,                  -- trial | pro | lifetime
  duration_days  INTEGER NOT NULL DEFAULT 0,     -- lifetime 为 0
  bound_user_id  TEXT,
  bound_at       INTEGER,
  batch          TEXT NOT NULL DEFAULT '',
  status         TEXT NOT NULL DEFAULT 'unused', -- unused | used | revoked
  created_at     INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_licenses_batch ON licenses(batch);

CREATE TABLE IF NOT EXISTS devices (
  user_id       TEXT NOT NULL,
  device_id     TEXT NOT NULL,
  device_name   TEXT NOT NULL DEFAULT '',
  activated_at  INTEGER NOT NULL,
  last_seen_at  INTEGER NOT NULL,
  PRIMARY KEY (user_id, device_id)
);

-- ============ 用量与配额 ============

CREATE TABLE IF NOT EXISTS usage_daily (
  user_id  TEXT NOT NULL,
  date     TEXT NOT NULL,                        -- UTC+8 日期 YYYY-MM-DD
  feature  TEXT NOT NULL,                        -- relay_search | relay_fetch | task_run | ...
  count    INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, date, feature)
);

-- ============ 周额度（AI 对话等重资源功能, 每周一 00:00 UTC+8 自动归零）============

-- 用「周起始日」作为主键的一部分, 跨周自然落到新行 = 自动重置,
-- 不需要定时任务去清零(定时任务在边缘函数里并不可靠, 进程可能不常驻)。
CREATE TABLE IF NOT EXISTS usage_weekly (
  user_id   TEXT NOT NULL,
  week_start TEXT NOT NULL,                      -- UTC+8 周一日期 YYYY-MM-DD
  feature   TEXT NOT NULL,                       -- ai_chat
  count     INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, week_start, feature)
);

-- ============ AI 模型供应商（后端持 Key, App 端不接触上游密钥）============

-- 一行 = 一个上游 OpenAI 兼容服务。api_key 存密文(见 services/ai_providers.ts 的
-- 加密口径), 绝不回传给 App; App 只拿到 id/名称/模型列表, 请求打 /api/ai/chat。
CREATE TABLE IF NOT EXISTS llm_providers (
  id           TEXT PRIMARY KEY,                  -- p_<uuid>
  name         TEXT NOT NULL,                     -- 展示名, 如「官方中转」
  base_url     TEXT NOT NULL,                     -- 上游根, 如 https://api.x.com/v1
  api_key_enc  TEXT NOT NULL,                     -- AES-GCM 密文(p_<keyId> 派生)
  models       TEXT NOT NULL DEFAULT '[]',        -- JSON 数组: [{name,label,kind,...}]
  enabled      INTEGER NOT NULL DEFAULT 1,
  sort         INTEGER NOT NULL DEFAULT 0,        -- 越小越靠前
  created_at   INTEGER NOT NULL,
  updated_at   INTEGER NOT NULL
);

-- ============ 用户自部署的 Agent 实例（orion-forge）============

-- 一个用户一份授权：由管理员在管理台录入实例地址与 API Key，
-- App 端**看不到地址、也看不到任何配置入口**，只知道自己有"云端 Agent"。
-- base_url/api_key_enc 永不下发给 App。
CREATE TABLE IF NOT EXISTS agent_instances (
  user_id     TEXT PRIMARY KEY,                  -- 一个用户一个实例
  base_url    TEXT NOT NULL,                     -- 用户自部署的 orion-forge 地址
  api_key_enc TEXT NOT NULL,                     -- AES-GCM 密文(与 llm_providers 同口径)
  enabled     INTEGER NOT NULL DEFAULT 1,        -- 停用后 App 侧入口消失
  label       TEXT NOT NULL DEFAULT '云端 Agent', -- 下发给 App 的展示名
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);

-- App 会话 ↔ Agent 实例会话的映射。
-- open-agents 侧每次对话必须有 sessionId+chatId，而 App 是自己的会话体系，
-- 这里按 (user_id, app_session_id) 记住对方返回的 id，续上下文时复用。
CREATE TABLE IF NOT EXISTS agent_sessions (
  user_id        TEXT NOT NULL,
  app_session_id TEXT NOT NULL,                  -- App 侧会话 id
  remote_session TEXT NOT NULL,                  -- open-agents sessionId
  remote_chat    TEXT NOT NULL,                  -- open-agents chatId
  updated_at     INTEGER NOT NULL,
  PRIMARY KEY (user_id, app_session_id)
);

-- ============ 云端 Agent 异步任务 (2026-10-11 长任务异步化) ============
--
-- 为什么需要：EdgeOne Cloud Functions 单次请求硬上限 120s，长任务不可能靠
-- 一条流挂到底。改为「提交即返回 + 带游标轮询」：本表只存任务元数据，
-- 输出内容不存在中继——forge 的 workflow run 流本身是持久化日志，任意
-- 时刻可用 getReadable({startIndex}) 从任意游标重读，故无需 KV / 回调。
CREATE TABLE IF NOT EXISTS agent_tasks (
  task_id        TEXT PRIMARY KEY,               -- = forge workflow runId (wrun_xxx)
  user_id        TEXT NOT NULL,
  chat_id        TEXT NOT NULL,                  -- forge chatId
  app_session_id TEXT NOT NULL,                  -- App 侧会话 id，用于重开续接
  status         TEXT NOT NULL DEFAULT 'running',-- running | done | failed | stopped
  cursor         INTEGER NOT NULL DEFAULT 0,     -- 已下发给 App 的 forge chunk 数
  error          TEXT,
  created_at     INTEGER NOT NULL,
  updated_at     INTEGER NOT NULL,
  finished_at    INTEGER
);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_user   ON agent_tasks(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_active ON agent_tasks(user_id, status);

-- ============ 云端定时任务 ============

CREATE TABLE IF NOT EXISTS cloud_tasks (
  id           TEXT PRIMARY KEY,                 -- t_<uuid>
  user_id      TEXT NOT NULL,
  name         TEXT NOT NULL,
  prompt       TEXT NOT NULL,
  schedule_type TEXT NOT NULL DEFAULT 'daily',   -- manual | daily
  schedule_hour   INTEGER NOT NULL DEFAULT 8,    -- UTC+8
  schedule_minute INTEGER NOT NULL DEFAULT 0,
  enabled      INTEGER NOT NULL DEFAULT 1,
  next_run_at  INTEGER,                          -- unix ms
  last_run_at  INTEGER,
  last_status  TEXT,
  created_at   INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_tasks_user ON cloud_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_due  ON cloud_tasks(enabled, next_run_at);

CREATE TABLE IF NOT EXISTS task_runs (
  id          TEXT PRIMARY KEY,                  -- r_<uuid>
  task_id     TEXT NOT NULL REFERENCES cloud_tasks(id),
  user_id     TEXT NOT NULL,
  started_at  INTEGER NOT NULL,
  finished_at INTEGER,
  status      TEXT NOT NULL DEFAULT 'running',   -- running | ok | error
  result      TEXT
);
CREATE INDEX IF NOT EXISTS idx_runs_user ON task_runs(user_id, started_at);

-- ============ 同步 (M4, 预留) ============

-- ============ 多端同步 (行级密文 + 变更元数据) ============
-- 行级零知识同步: 每行独立加密后上传, 服务端只见 row_id/时间戳/设备, 读不到内容。
-- 冲突策略: updated_at 末写胜出(excluded.updated_at >= 现有才覆盖); 删除写 tombstone。
CREATE TABLE IF NOT EXISTS sync_state (
  user_id    TEXT NOT NULL,
  table_name TEXT NOT NULL,
  row_id     TEXT NOT NULL,
  updated_at INTEGER NOT NULL,
  tombstone  INTEGER NOT NULL DEFAULT 0,
  device_id     TEXT NOT NULL DEFAULT '',        -- 最后写入的设备(冲突排查/多设备归属)
  payload_encrypted TEXT,                        -- 行级密文(tombstone 行为 NULL)
  nonce      TEXT,                               -- AES-GCM nonce(base64), 与密文配套
  PRIMARY KEY (user_id, table_name, row_id)
);

CREATE TABLE IF NOT EXISTS backup_blobs (
  user_id           TEXT NOT NULL,
  device_id         TEXT NOT NULL,
  table_name        TEXT NOT NULL,
  payload_encrypted TEXT NOT NULL,               -- 端上加密后的密文, 服务端零知识
  uploaded_at       INTEGER NOT NULL,
  PRIMARY KEY (user_id, device_id, table_name)
);

-- ============ 云端知识库 (M4, 预留) ============

CREATE TABLE IF NOT EXISTS kb_documents (
  id          TEXT PRIMARY KEY,                  -- d_<uuid>
  user_id     TEXT NOT NULL,
  title       TEXT NOT NULL,
  chunk_count INTEGER NOT NULL DEFAULT 0,
  status      TEXT NOT NULL DEFAULT 'ready',     -- pending | ready | error
  created_at  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_kbdocs_user ON kb_documents(user_id);

CREATE TABLE IF NOT EXISTS kb_chunks (
  id         TEXT PRIMARY KEY,                   -- c_<uuid>
  doc_id     TEXT NOT NULL REFERENCES kb_documents(id),
  user_id    TEXT NOT NULL,
  idx        INTEGER NOT NULL,
  content    TEXT NOT NULL,
  embedding  BLOB,                               -- F32_BLOB, 维度随用户 embedding 模型
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_kbchunks_doc ON kb_chunks(doc_id);

-- ============ 分享与审计 ============

CREATE TABLE IF NOT EXISTS share_links (
  id               TEXT PRIMARY KEY,
  user_id          TEXT NOT NULL,
  session_snapshot TEXT NOT NULL,               -- JSON
  expires_at       INTEGER,
  created_at       INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_log (
  id      INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT,
  action  TEXT NOT NULL,                         -- register | login | activate | unbind | ...
  detail  TEXT NOT NULL DEFAULT '',
  ip      TEXT NOT NULL DEFAULT '',
  at      INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_log(user_id, at);

-- ============ 弹窗公告 ============

CREATE TABLE IF NOT EXISTS announcements (
  id          TEXT PRIMARY KEY,                  -- a_<uuid>
  title       TEXT NOT NULL,
  content     TEXT NOT NULL,
  enabled     INTEGER NOT NULL DEFAULT 1,
  min_version TEXT NOT NULL DEFAULT '',           -- 空 = 不限; 含端点(<=)
  max_version TEXT NOT NULL DEFAULT '',           -- 空 = 不限; 含端点(>=)
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);
