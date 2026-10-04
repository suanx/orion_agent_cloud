# orion_agent_cloud

[orion_agent](https://github.com/suanx/orion_agent)（Android 本地优先 AI 助手）的云端后端。
运行在**腾讯云 EdgeOne Pages** 边缘函数上，数据库使用 **Turso**（libSQL 托管服务），
为 orion_agent 提供账号体系、卡密激活授权、搜索/抓取中继、云端定时任务、MCP 云端服务与更新分发。

> 设计原则：orion 端上保持本地优先、可完全离线；云端只负责单机做不到的事。
> 未登录/未激活只是云功能置灰，本地功能不受任何影响。

## 功能一览

| 模块 | 端点 | 说明 |
|---|---|---|
| 账号 | `POST /api/auth/register` `login` `refresh` `logout` | JWT(2h) + Refresh Token(30d，一次性轮换+复用检测) |
| 设备 | `GET/DELETE /api/auth/devices` | 设备列表/解绑；套餐设备数上限（free=1 / trial=2 / pro=3） |
| 设备令牌 | `POST /api/auth/device-token` | 长期令牌(`dt_`)，供 orion 的 MCP 配置使用 |
| 卡密激活 | `POST /api/license/activate` `GET /api/license/status` | 试用/专业/永久三档；到期自动降级 free |
| 管理台 | `/api/admin/*` | 卡密批量生成(≤500/批)/吊销/查询、用户封禁、用量与审计 |
| 搜索中继 | `GET /api/relay/search?q=` | DuckDuckGo(免Key) / Serper / 博查 三后端可切换 |
| 抓取中继 | `GET /api/relay/fetch?url=` | SSRF 防护 + 2MB 上限 + 正文抽取 |
| 云端任务 | `/api/tasks` CRUD + `GET /tasks/results?after=` | Cron 到期由服务端调 LLM 执行，App 打开拉取补跑 |
| Cron 入口 | `POST /api/tasks/run-due` | 管理员令牌，接 EdgeOne Cron Trigger |
| MCP 服务 | `POST /api/mcp` | JSON-RPC 2.0：cloud_search / cloud_fetch / cloud_schedule_task / cloud_list_tasks |
| 更新分发 | `GET /api/update/check` | 版本清单 + 强更判断 + APK 地址 |
| 健康检查 | `GET /api/health` | 鉴权 + 数据库全链路验证 |

**套餐配额**（每日，UTC+8）：free 搜索/抓取 20 次、云端任务 1 个；trial 100 次 / 5 个；
pro 与 lifetime 500 次 / 20 个。可用 `PLAN_LIMITS_OVERRIDE` 环境变量覆盖（JSON）。

**卡密激活规则**：lifetime 覆盖一切（永久）；同级未过期顺延；已过期从激活日起算；
高套餐未过期时激活低级卡密，保留高套餐到期时间再顺延。

---

## 部署教程（EdgeOne Pages + Turso）

全程约 15 分钟，无需服务器，免费额度起步。

### 第 1 步 · 创建 Turso 数据库

1. 注册/登录 [app.turso.tech](https://app.turso.tech)（GitHub 账号即可）
2. 安装 Turso CLI 或直接在网页端创建数据库，取名 `orion`，区域选离你最近的
   （如 `hkg` 香港 / `sin` 新加坡）
3. 拿到两样东西：
   - **数据库 URL**：`libsql://orion-你的组织.turso.io`
   - **Auth Token**：`turso db tokens create orion`（或网页端生成）

### 第 2 步 · 建表（13 张表）

本机执行（任选其一）：

```bash
git clone https://github.com/suanx/orion_agent_cloud.git
cd orion_agent_cloud
npm install

TURSO_DATABASE_URL=libsql://orion-你的组织.turso.io \
TURSO_AUTH_TOKEN=你的token \
npm run db:migrate
```

成功会输出：`完成: 22 条 DDL 已应用` 并列出全部表名。
脚本是幂等的，重复执行安全。

### 第 3 步 · 部署到 EdgeOne Pages

1. 登录[腾讯云 EdgeOne 控制台](https://console.cloud.tencent.com/edgeone)，
   进入 **Pages** → **创建项目** → 连接 Git 仓库（选本仓库），或直接上传代码
2. 构建配置：
   - 框架预设：**None**
   - 安装命令：`npm install`
   - 构建命令：`npm run typecheck`
   - 输出目录：`dist`（纯函数项目，目录留空亦可）
   - `functions/` 目录会被自动识别为**边缘函数**（Cloudflare Pages Functions 兼容约定），
     所有 `/api/*` 请求由 `functions/api/[[route]].ts` 接管
3. **配置环境变量**（控制台 → 项目设置 → 环境变量，完整清单见 `.env.example`）：

   | 变量 | 必填 | 说明 |
   |---|---|---|
   | `TURSO_DATABASE_URL` | ✅ | 第 1 步的 libsql:// URL |
   | `TURSO_AUTH_TOKEN` | ✅ | 第 1 步的 token |
   | `JWT_SECRET` | ✅ | `openssl rand -hex 32` 生成 |
   | `ADMIN_TOKEN` | ✅ | 管理台令牌，同样用长随机串 |
   | `SEARCH_PROVIDER` | 可选 | `duckduckgo`(默认) / `serper` / `bocha` |
   | `SERPER_API_KEY` / `BOCHA_API_KEY` | 可选 | 对应搜索后端的 Key |
   | `CLOUD_LLM_BASE_URL` 等 3 项 | 可选 | 云端定时任务用的 OpenAI 兼容端点 |
   | `UPDATE_LATEST_VERSION` 等 3 项 | 可选 | 应用内检查更新用 |
   | `PLAN_LIMITS_OVERRIDE` | 可选 | JSON，覆盖套餐配额 |

4. 部署完成后会得到 `https://xxx.edgeone.app` 形式的域名

### 第 4 步 · 验证部署

```bash
# 版本清单（无需鉴权）
curl "https://xxx.edgeone.app/api/update/check?platform=android&current=0.1.9"

# 注册测试账号
curl -X POST https://xxx.edgeone.app/api/auth/register \
  -H "content-type: application/json" \
  -d '{"email":"a@b.c","password":"abc12345","deviceId":"phone-1"}'

# 管理台生成 2 张 pro 30 天卡密
curl -X POST https://xxx.edgeone.app/api/admin/licenses/generate \
  -H "authorization: Bearer 你的ADMIN_TOKEN" -H "content-type: application/json" \
  -d '{"plan":"pro","durationDays":30,"count":2,"batch":"first"}'
```

### 第 5 步 · 配置 Cron Trigger（云端定时任务）

EdgeOne 控制台 → 你的 Pages 项目 → **边缘函数** → **定时触发**：

- 触发地址：`POST https://xxx.edgeone.app/api/tasks/run-due`
- 请求头：`Authorization: Bearer <ADMIN_TOKEN>`
- 周期：每 5–15 分钟一次即可（任务粒度是"每天 HH:MM"）

### 第 6 步 · orion_agent 端接入

- **MCP**：「我的 → MCP 服务器」→ 添加：
  - 名称：`orion-cloud`；端点：`https://xxx.edgeone.app/api/mcp`
  - 或在 App 内登录后调 `POST /api/auth/device-token` 换取 `dt_` 设备令牌
- **搜索/抓取中继**：模型工具配置中将端点指向
  `https://xxx.edgeone.app/api/relay/search` / `/api/relay/fetch`
  （携带 `Authorization: Bearer <JWT 或 dt_ 令牌>`）

---

## 本地开发

```bash
npm install

# 用本地 SQLite 文件即可跑通全流程(无需 Turso)
TURSO_DATABASE_URL=file:./local.db node scripts/migrate.mjs

TURSO_DATABASE_URL=file:./local.db \
JWT_SECRET=dev-secret-0123456789abcdef0123456789abcdef \
ADMIN_TOKEN=dev-admin \
npx tsx scripts/dev.mjs        # http://127.0.0.1:8787

npm test        # 34 个单元测试
npm run typecheck
```

## 安全设计要点

- 密码 PBKDF2-SHA256（12 万次迭代 + 随机盐），WebCrypto 实现，边缘运行时可用
- Access / Refresh / Device 三种令牌分离；Refresh 一次性轮换；仅存 SHA-256 哈希
- 卡密原子绑定（`WHERE status='unused'` 条件更新防并发）；敏感操作写 `audit_log`
- SSRF：中继拦截内网/环回/元数据地址；响应体 ≤ 2MB
- 配额 UPSERT 原子自增；云功能由服务端强制校验，**本地功能不做云端锁死**
- Turso authToken 只存边缘函数环境变量，App 端只见 JWT / 设备令牌

## 许可

仅供个人学习与使用，与 orion_agent 主项目一致。

## 相关仓库

- [orion_agent](https://github.com/suanx/orion_agent) —— Android 端（Flutter）
