-- orion-backend 数据库 schema (Turso / libSQL)
-- 迁移工具: scripts/migrate.mjs (drizzle-kit 待引入, 先用裸 SQL)

-- ============ 账号与授权 ============

CREATE TABLE IF NOT EXISTS users (
  id              TEXT PRIMARY KEY,              -- u_<uuid>
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

CREATE TABLE IF NOT EXISTS sync_state (
  user_id    TEXT NOT NULL,
  table_name TEXT NOT NULL,
  row_id     TEXT NOT NULL,
  updated_at INTEGER NOT NULL,
  tombstone  INTEGER NOT NULL DEFAULT 0,
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
