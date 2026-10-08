# 三端部署指南

Orion Agent 系统的三个端如何从零部署、怎么串起来、怎么验证。

| 端 | 仓库 | 技术栈 | 部署平台 | 职责 |
|---|---|---|---|---|
| **App** | [suanx/orion_agent](https://github.com/suanx/orion_agent) | Flutter / Dart | GitHub Actions → APK | 用户界面，本地优先，端上加密 |
| **后端** | [suanx/orion_agent_cloud](https://github.com/suanx/orion_agent_cloud) | Hono / TypeScript | 腾讯云 EdgeOne Pages | 账号、配额、中继、云备份、同步、公告 |
| **Agent 平台** | [suanx/orion-forge](https://github.com/suanx/orion-forge) | Next.js / React | Vercel | 云端 Coding Agent（用户自部署，可选） |

---

## 目录

- [整体架构](#整体架构)
- [部署顺序与依赖](#部署顺序与依赖)
- [第 1 步 · 准备账号](#第-1-步--准备账号)
- [第 2 步 · 部署后端](#第-2-步--部署后端)
- [第 3 步 · 构建与分发 App](#第-3-步--构建与分发-app)
- [第 4 步 · 部署 Agent 平台（可选）](#第-4-步--部署-agent-平台可选)
- [第 5 步 · 后台配置](#第-5-步--后台配置)
- [验证清单](#验证清单)
- [运维手册](#运维手册)
- [常见问题](#常见问题)

---

## 整体架构

```text
┌──────────────────────────────┐
│  App（Flutter）               │
│  本地优先 · 端上加密           │
│                              │
│  会话/消息/设置 → SQLite      │
│  密钥推导 → AES-GCM 加密      │
└──────────┬───────────────────┘
           │ HTTPS，仅云功能需要
           │ （账号/配额/中继/备份/同步/公告/更新）
           ▼
┌──────────────────────────────┐        ┌──────────────────────┐
│  后端（Hono on EdgeOne）       │◄──────►│  Turso / libSQL       │
│                              │        │  18 张表             │
│  /api/auth   账号             │        └──────────────────────┘
│  /api/license/status 配额      │
│  /api/relay  搜索抓取中继       │
│  /api/backup 云备份            │
│  /api/sync   多端同步          │
│  /api/ai     云端模型中继       │
│  /api/agent  Agent 中继        │
│  /api/announcement 公告       │
│  /api/update/check 更新       │
│  /api/admin  管理台 UI        │
└──────────┬───────────────────┘
           │ 中继（服务端持 Key，App 不接触）
           ▼
┌──────────────────────────────┐
│  Agent 平台（orion-forge）      │
│  用户自部署 · 一用户一实例      │
│  POST /api/agent/chat         │
└──────────────────────────────┘

        ┌──────────────────────┐
        │  Cloudflare R2       │
        │  APK + 更新清单       │
        │  （App 构建时写入）   │
        └──────────────────────┘
```

### 三端的边界

**为什么要有后端**：App 是本地优先的，聊天记录、设置、知识库全在手机本地。后端只负责「单机做不到的事」——多设备同步、跨端备份、账号授权、额度、云端模型代理。**不登录也能正常使用 App**，云功能只是置灰。

**为什么 Agent 平台是可选的**：它是云端 Coding Agent 能力（跑代码、改仓库），与日常聊天无关。用户不部署不影响 App 其余功能。

**为什么 App 端不存第三方 Key**：所有需要 Key 的服务（云端模型、Agent 实例）都由后端中转，Key 加密存库且永不回传。App 只拿到自家的中继地址。

---

## 部署顺序与依赖

```text
① 后端 ──→ ② App ──→ ③ 后台配置
                ↑
④ Agent 平台 ───┘（可选，App 需重新登录才生效）
```

**必须先做后端**：App 编译时把后端地址写死在代码里（`lib/services/cloud_config.dart`），后端没上线就改地址等于把 App 指向空气。

**Agent 平台最后做**：它由管理员在后台逐个账号授权，App 只是拉取结果，顺序反了也没影响。

---

## 第 1 步 · 准备账号

| 服务 | 用途 | 是否必需 | 获取 |
|---|---|---|---|
| **GitHub** | 源码托管 + CI 构建 | 必需 | [github.com](https://github.com) |
| **腾讯云 EdgeOne** | 跑后端边缘函数 | 必需 | [edgeone.ai](https://edgeone.ai) |
| **Turso** | libSQL 托管数据库 | 必需 | [app.turso.tech](https://app.turso.tech)（GitHub 登录即可） |
| **Cloudflare R2** | 存 APK + 更新清单 | 必需 | [dash.cloudflare.com](https://dash.cloudflare.com) |
| **Vercel** | 跑 Agent 平台 | 可选 | [vercel.com](https://vercel.com) |

---

## 第 2 步 · 部署后端

### 2.1 创建数据库

1. 登录 [app.turso.tech](https://app.turso.tech)
2. 创建数据库，取名 `orion`，**区域选离用户最近的**（`hkg` 香港 / `sin` 新加坡 / `nrt` 东京）
3. 拿到两样东西：
   - **Database URL**：`libsql://orion-你的组织名.turso.io`
   - **Auth Token**：网页端生成，或用 CLI `turso db tokens create orion`

> ⚠️ **Token 权限**：生产库建议用只读以外的完整权限组，因为 `db:migrate` 需要 DDL 权限。但运行期只需要读写。

### 2.2 初始化表结构

克隆仓库并执行迁移：

```bash
git clone https://github.com/suanx/orion_agent_cloud.git
cd orion_agent_cloud
npm install

# 本地写一份 .env（生产环境在 EdgeOne 控制台配）
cp .env.example .env
```

编辑 `.env`，**至少填这 4 项**：

```dotenv
TURSO_DATABASE_URL=libsql://orion-你的组织名.turso.io
TURSO_AUTH_TOKEN=你的token
JWT_SECRET=<用 openssl rand -hex 32 生成>
ADMIN_TOKEN=<管理台登录口令，自己定>
PUBLIC_BASE_URL=https://你的后端域名
```

生成密钥：

```bash
openssl rand -hex 32    # JWT_SECRET 用
openssl rand -hex 16    # ADMIN_TOKEN 用
```

执行迁移：

```bash
npm run db:migrate
```

**必须看到 18 张表全部建成**（幂等，全部 `IF NOT EXISTS`）：

```
users  sessions  licenses  devices  usage_daily  usage_weekly
llm_providers  agent_instances  agent_sessions  cloud_tasks
task_runs  sync_state  backup_blobs  kb_documents  kb_chunks
share_links  audit_log  announcements
```

> 🔴 **这是最容易踩的坑**：EdgeOne 部署的是**代码**，数据库是**另一套东西**，两者不同步。
> 如果管理台「保存供应商」显示成功但列表读不出来，99% 是忘了跑这一步——
> 保存接口不查库（只返回 `{ok:true, id}`），只有刷新列表才查库。
> 核对方法：直连 Turso 执行 `SELECT name FROM sqlite_master WHERE type='table';`

> 🔴 **每次升级代码后都要重跑 `npm run db:migrate`**。
> 迁移脚本除了建表，还负责给**已有库补列**（如 `users.username` 账号名）
> 与建索引；只建表不管补列，新代码一跑就会撞 `no such column`。
> 各接口对此的降级表现不同：
>
> | 接口 | 没跑迁移时的表现 |
> |---|---|
> | `POST /auth/register` | 500，提示「数据库结构未升级」（有意做的可执行提示） |
> | `POST /auth/login` | 正常登录，`username` 返回空串 |
> | `GET /admin/users` | 自动退回旧查询，只是少了「账号名」一列 |

### 2.3 部署到 EdgeOne

1. 登录 [EdgeOne 控制台](https://console.cloud.tencent.com/edgeone)，新建 **Pages** 项目
2. 连接 GitHub 仓库 `suanx/orion_agent_cloud`
3. 构建配置**仓库里已有 `edgeone.json`，直接识别**：

   | 项 | 值 |
   |---|---|
   | Install Command | `npm install` |
   | Build Command | `npm run typecheck` |
   | Output Directory | `public` |
   | Framework | `none` |

4. 在项目的**环境变量**里配置（对应 `.env.example`）：

   ```
   TURSO_DATABASE_URL      = libsql://orion-xxx.turso.io
   TURSO_AUTH_TOKEN        = <token>
   JWT_SECRET              = <openssl rand -hex 32>
   ADMIN_TOKEN             = <管理台口令>
   PUBLIC_BASE_URL         = https://你的后端域名
   SEARCH_PROVIDER         = duckduckgo
   UPDATE_LATEST_VERSION   = 0.2.40
   UPDATE_MIN_VERSION      = 0.2.0
   UPDATE_FORCE_UPDATE     = false
   UPDATE_NOTES            = 请阅读 RELEASE_NOTES.md
   UPDATE_APK_URL          = https://<R2域名>/orion/orion-agent.apk
   # 可选：注册邮箱域名白名单（逗号分隔）。不配则用默认值
   # qq.com,189.cn,139.com,163.com,126.com
   # REGISTER_EMAIL_DOMAINS = qq.com,189.cn,139.com,163.com,126.com
   ```

   > ⚠️ `PUBLIC_BASE_URL` **建议显式配置**。留空时后端会尝试从请求头 `Origin`/`Referer`
   > 推断，但 App 的请求可能不带这些头，推断失败会导致云端模型地址拼不出来。

5. 部署。完成后记下后端域名（如 `https://orion.example.com`）

> ⚠️ **注意 EdgeOne Pages 的路径前缀**：后端所有路由都挂在 `/api` 下
> （`new Hono().basePath("/api")`）。所以完整地址是 `https://你的域名/api/...`。
> 早期版本漏掉 `/api` 前缀会导致全部 404。

### 2.4 验证后端

```bash
# 健康检查（需鉴权，返回 401 说明路由通、鉴权生效）
curl -i https://你的域名/api/health

# 公开端点：公告（无需登录，App 启动时拉的就是它）
curl "https://你的域名/api/announcement?platform=android&version=0.2.40"

# 注册策略：白名单内的邮箱应返回 200/…，名单外的应返回 400「邮箱不支持」
curl -i -X POST https://你的域名/api/auth/register \
  -H 'content-type: application/json' \
  -d '{"email":"test@gmail.com","password":"abc12345","deviceId":"dev_test","deviceName":"t"}'
```

- 返回 **401** → 路由和鉴权都正常 ✅
- 返回 **404** → 检查 EdgeOne 的构建输出与函数路由配置
- `/api/announcement` 返回 `{"announcement":null}` → 完全正常，说明还没有公告
- 注册 `gmail.com` 返回 **400 + 「邮箱不支持，仅支持以下邮箱注册：…」** → 白名单生效 ✅
- 注册 `qq.com` 返回 **500 + 「数据库结构未升级」** → 忘了跑 `npm run db:migrate`

打开管理台确认页面能加载：

```
https://你的域名/api/admin
```

用 `ADMIN_TOKEN` 登录（页面本身可匿名打开，数据接口才要鉴权）。
**能进管理台 = 后端部署成功**。

---

## 第 3 步 · 构建与分发 App

### 3.1 配置代码内的后端地址

App 的后端地址**写死在代码里**，不暴露给用户配置（避免被探测与滥用）：

```dart
// lib/services/cloud_config.dart
static const String baseUrl = 'https://orion.example.com';
```

**换后端地址只改这一处**，所有云功能自动跟随。

### 3.2 配置 GitHub 仓库 Secrets

进入 `Settings → Secrets and variables → Actions`，添加 5 个 Repository secrets：

| Secret | 说明 | 怎么拿 |
|---|---|---|
| `R2_ENDPOINT` | S3 兼容端点 | `https://<accountid>.r2.cloudflarestorage.com` |
| `R2_ACCESS_KEY_ID` | 访问密钥 ID | R2 → Manage R2 → API Tokens |
| `R2_SECRET_ACCESS_KEY` | 访问密钥 | 同上 |
| `R2_BUCKET` | 存储桶名 | 如 `registry` |
| `R2_PUBLIC_BASE` | 公开访问域名 | 如 `https://gr.example.com` |

> 🔴 **密钥权限**：R2 token 必须限定到该 bucket（Object Read & Write）。
> 用全局 API Token 权限过大，一旦泄露整个账号的桶都受影响。

### 3.3 设置版本号并推送

版本号是**唯一真相源**，必须同步两处：

```bash
# 1. pubspec.yaml —— 这是唯一真相源
version: 0.2.40+52

# 2. lib/ui/about_screen.dart
const String kAppVersion = '0.2.40';
```

> 🔴 **发版红线：在已发布版本上追加任何功能，都必须先提升版本号。**
>
> 原因：`UpdateService.isNewer()` 只比较版本号的前三段数字，**buildNumber 不参与比较**。
> 忘记 bump → 客户端与服务端版本号相等 → 判定「已是最新」→ **CI 全绿、APK 已上传，
> 但用户永远收不到更新提示**。这个坑踩过两次。

```bash
git add -A && git commit -m "release: v0.2.41 —— <变更摘要>"
git push origin main
```

### 3.4 CI 做了什么

推送后 GitHub Actions 自动跑，**33 个步骤**：

```text
代码检查    Analyze（静态分析）→ Test（单测）
    ↓
打包        生成 Android 脚手架 → 注入 MainActivity → 设 applicationId
           → 构建 Debian rootfs → Pub get → Drift 代码生成
    ↓
构建        flutter build apk（开启混淆）
    ↓
分发        → GitHub Releases
           → Cloudflare R2（上传 APK）
           → 写 R2 更新清单 latest.json
           → 清理 R2 历史 APK（只保留最近 2 个）
```

> ⚠️ **About `docs/CI_ANALYZE_REPORT.md`**：Analyze 失败时 CI 会把完整报错写进这个文件
> 并提交回仓库。排查 CI 时执行 `git fetch && git show origin/main:docs/CI_ANALYZE_REPORT.md`
> 就能看到报错原文——比在网页上翻日志快得多。

### 3.5 更新清单格式

CI 会写 `R2_PUBLIC_BASE/orion/latest.json`：

```json
{
  "version": "0.2.40",
  "buildNumber": 138,
  "apkUrl": "https://gr.example.com/orion/orion-agent-v0.2.40.apk",
  "sha256": "a12a0ecd996ff39e4...",
  "notes": "# Orion Agent v0.2.40 更新说明（正式版）..."
}
```

App 的更新检查链路：**R2 清单 → 云端 `/api/update/check` → GitHub Releases**，
任一可用即可。R2 清单优先。

> ⚠️ **双渠道发布**：`main` 分支发正式版，`beta` 分支发预发布版（prerelease）。
> beta 版本号必须**高于**当前稳定版（预留 +5 buffer）。

### 3.6 双通道分支

| 分支 | 产出 | 说明 |
|---|---|---|
| `main` | GitHub Release（正式版）+ R2 | 稳定通道 |
| `beta` | GitHub Release（prerelease） | 测试通道 |

---

## 第 4 步 · 部署 Agent 平台（可选）

云端 Coding Agent 能力。**用户自己部署**，你在后台逐个授权。

### 4.1 部署前提

orion-forge 在 Vercel 平台能力之上构建，**无法脱离 Vercel 部署**：

| 依赖 | 用途 | 不可省略 |
|---|---|---|
| **Vercel** | 宿主平台 + 持久化工作流（Workflow SDK） | ✅ |
| **Vercel Sandbox** | Agent 的代码执行环境 | ✅ |
| **Vercel OAuth** | 登录 | 视需求 |
| **Neon / Postgres** | 会话与消息持久化 | ✅ |
| **Upstash Redis / KV** | 限流与缓存 | ✅ |
| **GitHub App** | 改仓库 / 提 PR | 不用可跳过 |

### 4.2 部署步骤

```bash
git clone https://github.com/suanx/orion-forge.git
cd orion-forge
corepack enable                    # 项目锁定 pnpm 11.5.1
pnpm install
```

一键部署（会引导配置各项凭据）：

```bash
pnpm web            # 启动 web 应用开发服务器
pnpm build          # 构建
```

或直接用 Vercel 的 "Import Project"，填入根目录的环境变量。

### 4.3 环境变量（21 项）

**必填**：

```
POSTGRES_URL                        Neon/Postgres 连接串
BETTER_AUTH_SECRET                  会话签名密钥（openssl rand -hex 32）
VERCEL_PROJECT_PRODUCTION_URL       你的站点地址
VERCEL_SANDBOX_BASE_SNAPSHOT_ID     沙箱基础快照（用 pnpm sandbox:snapshot-base 生成）
AGENT_API_KEY                       ★ App 接入用，见下
```

**按需**：

```
REDIS_URL, KV_URL                             Upstash Redis / KV
NEXT_PUBLIC_VERCEL_APP_CLIENT_ID / VERCEL_APP_CLIENT_SECRET    Vercel OAuth
NEXT_PUBLIC_GITHUB_CLIENT_ID / GITHUB_CLIENT_SECRET           GitHub OAuth
GITHUB_APP_ID / GITHUB_APP_PRIVATE_KEY / NEXT_PUBLIC_GITHUB_APP_SLUG / GITHUB_WEBHOOK_SECRET
ELEVENLABS_API_KEY                          语音功能
ORION_FORGE_RESOURCE_PROFILE                资源配置档位
```

### 4.4 为 App 接入开通 API Key

这是对接的关键一步。在 orion-forge 的环境变量里设置：

```dotenv
# 自部署时生成一个强随机值，只交给你的后端保管
AGENT_API_KEY=openssl-rand-hex-32-的输出
# 合成用户 id：同一个 key 的所有调用共享会话历史
AGENT_API_KEY_USER_ID=external-app
```

自部署到自有域名时，还要放行来源（或直接关闭 BotID 检查）：

```dotenv
# 浏览器访问时放行的来源，逗号分隔（通配符同 Vercel 风格）
BOTID_EXTRA_ALLOWED_HOSTS=你的站点域名
# 已有 API Key 防护时可直接关闭 BotID
BOTID_SKIP_CHECK=false
```

> 💡 `AGENT_API_KEY` 的作用：orion-forge 原有端点都依赖浏览器会话登录态，
> App 拿不到就调不通。设置后携带该 key 的请求会被识别并放行——
> **这不影响原有 Web 登录流程**（留空则完全不启用）。

### 4.5 验证 Agent 平台

```bash
# 无 key 应返回 401（说明路由存在、鉴权生效）
curl -i https://你的forge域名/api/agent/chat

# 带 key 应进入业务流程（首次会自动建会话）
curl -X POST https://你的forge域名/api/agent/chat \
  -H "Authorization: Bearer 你的AGENT_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"写个快排"}]}'
```

响应头会回传 `x-session-id` / `x-chat-id`，存下即可续用上下文。

---

## 第 5 步 · 后台配置

打开 `https://你的后端域名/api/admin`，用 `ADMIN_TOKEN` 登录。

### 5.1 必做：录入 AI 模型供应商

**不配这个，App 登录后额度卡片不显示、模型选择器里没有云端模型。**

1. 进入「AI 模型 → 供应商配置」
2. 填四項：

   | 字段 | 填法 |
   |---|---|
   | 展示名 | 随便取，如 `官方中转` |
   | 上游根地址 | OpenAI 兼容地址，如 `https://api.deepseek.com/v1` |
   | API Key | 上游的 key（用 `JWT_SECRET` 派生密钥加密存库，**永不回传**） |
   | 模型列表 | JSON 数组，见下 |
   | 排序 | 数字，越小越靠前 |

3. **单个模型的最简填法**：

   ```json
   [{"name": "gpt-4o-mini"}]
   ```

   完整填法：

   ```json
   [
     {
       "name": "gpt-4o-mini",
       "label": "GPT-4o mini",
       "contextWindow": 128000,
       "maxOutputTokens": 16384
     }
   ]
   ```

   | 字段 | 必填 | 说明 |
   |---|---|---|
   | `name` | ✅ | **上游文档里的真实模型名**，后端会原样转发 |
   | `label` | ❌ | App 内显示名 |
   | `contextWindow` | ❌ | 仅用于界面展示，不截断请求 |
   | `kind` | ❌ | `"chat"`（默认）或 `"embedding"` |

   > ⚠️ `name` 填错会导致上游报 `model not found`。不确定就填 `0` 或省略 `contextWindow`。

4. 保存后**点刷新**确认列表能显示。保存成功但列表空 → 多半是数据库没 migrate。

### 5.1.1 云端模型额度档位

按**对话轮次**计费——一轮 = 一次 `/api/ai/chat` 请求，无论该轮工具调用几次。
每周一 00:00 (UTC+8) 自动归零（靠主键含 `week_start` 跨周落到新行实现，
不依赖定时任务——边缘函数进程不常驻，定时清零不可靠）。

| 套餐 | 每周轮次 |
|---|---|
| 免费版 `free` | 100 |
| 专业版 `pro` | 1000 |
| 永久版 `lifetime` | 20000 |

定义在 `src/plans.ts` 的 `WEEKLY_LIMITS`。改档位改这里，重新部署即可。

> 永久版给 20000 是「不限性质感」而非真无限——成本真实，留个上限防单账号打爆。

### 5.2 可选：授权用户使用 Agent 平台

1. 先让用户部署自己的 orion-forge 实例（[第 4 步](#第-4-步--部署-agent-平台可选)）
2. 进入「AI 模型 → Agent 实例授权」
3. 填三项：

   | 字段 | 填法 |
   |---|---|
   | 用户 ID | App 用户的 `u_xxx`，可在「用户列表」查到 |
   | 实例地址 | 用户部署的 orion-forge 域名 |
   | API Key | 该实例的 `AGENT_API_KEY` |

4. 保存。用户在 App 里**重新登录后**，模型选择器底部会出现「云端 Agent」。

> 🔒 **App 端零提示**：未授权的用户在 App 里看不到任何入口，也没有地方能填地址。
> 这是设计如此——用户不需要知道 orion-forge 的存在。

### 5.3 可选：发公告

「账号授权 → 公告管理」→ 新建。填标题与正文、启用即可。

**App 侧行为**：启动后 1.2 秒拉取，**每次冷启动都弹一次**，
后台有启用的公告就弹窗。

- 同一次启动内最多弹一次（不会因为多个入口重复弹遮罩）
- 公告接口是**公开**的（无需登录），用户没登录也能看到
- 可设版本范围（`min_version` / `max_version`），只对特定版本弹
- 改了公告内容，下次启动照常弹（不再依赖「已读」标记）
- 更早的 App 版本仍是「点过‘我知道了’就不再弹」，升级后才生效

### 5.4 可选：给账号授权套餐

「账号授权」页 → 选用户 → 设套餐。

| 模式 | 语义 |
|---|---|
| 设置 | 从当前时间起算 |
| 顺延 | 在现有到期时间上叠加 |

`lifetime`（永久）覆盖一切；更高套餐未过期时授权低级套餐会保留高套餐到期时间。到期自动降级 `free`。

### 5.5 注册策略：邮箱白名单与账号名

后端在 `POST /auth/register` 上做了两层限制（实现见 `src/utils/register-policy.ts`）。

**① 邮箱域名白名单**

只允许这些域名注册，其余一律 **400 +「邮箱不支持，仅支持以下邮箱注册：…」**：

```
qq.com  189.cn  139.com  163.com  126.com
```

- 要改名单：配环境变量 `REGISTER_EMAIL_DOMAINS`（逗号分隔，可带 `@`），见 `.env.example`
- 校验顺序是「先格式、后域名」，所以 `not-an-email` 报的是格式错误，不会误报成域名不支持
- **只管注册**，登录不受影响——老用户拿自己的邮箱正常登录

**② 账号名 `agent-` + 5 位随机数字**

注册时后端生成（如 `agent-04731`），写入 `users.username`（唯一索引）：

- 生成时查库避让撞号，连续 12 次都撞才报错
- **老用户首次登录自动回填**，不需要手工迁移数据
- 下发位置：`/auth/register`、`/auth/login`、`/license/status` 三处的 `username` 字段
- 管理台「用户列表」第一列展示；未回填的显示 `—`
- App 端个人中心显示 `账号 agent-04731 · 点按复制邮箱`，拿不到时回落显示 `u_xxxx`

> ⚠️ 这一列是后加的，**必须先跑 `npm run db:migrate`**（详见 2.2）。

---

## 验证清单

部署完成后逐项确认。**前 4 项是硬性门槛**。

### 后端

```bash
# ① 路由与鉴权（返回 401 即正常）
curl -i https://你的域名/api/health

# ② 公开端点（返回 announcement:null 即正常）
curl "https://你的域名/api/announcement?platform=android&version=0.2.40"

# ③ 管理台能加载
# 浏览器打开 https://你的域名/api/admin，用 ADMIN_TOKEN 登录
```

### App

- [ ] App 内「关于」显示版本号正确
- [ ] 能注册账号并登录
- [ ] 登录后账号页显示套餐与周额度
- [ ] 模型选择器底部出现云端模型
- [ ] 选云端模型发一条消息，能正常回复
- [ ] 收到后台发布的公告弹窗
- [ ] 「检查更新」能看到最新版本

### Agent 平台（若部署了）

- [ ] 用户重新登录后，模型选择器底部出现「云端 Agent」
- [ ] 选它发消息，能返回代码或文件修改
- [ ] 后台「Agent 实例授权」列表能显示该实例

---

## 运维手册

### 换后端域名

改 App 代码里的**一处**：

```dart
// lib/services/cloud_config.dart
static const String baseUrl = 'https://新域名';
```

改完重新打包发布。**后端不需要任何改动**。

### 加一张数据库表

1. 在 `src/db/schema.sql` 里加 `CREATE TABLE IF NOT EXISTS ...`
2. 提交推送，EdgeOne 自动部署
3. **跑迁移**：`npm run db:migrate`

> 🔴 **每次给后端加新表都要跑 migrate**，否则会出现「保存成功但读不出来」的假象
> ——保存接口不查库，只有刷新列表才查。

### 换 JWT_SECRET 的代价

上游模型 Key 用 `JWT_SECRET` 派生密钥加密。**换 `JWT_SECRET` 后已录入的 Key 全部无法解密，需要重新录入**。

### R2 清理策略

每次正式发布后自动清理，只保留最近 2 个 APK（当前版 + 上一版回滚位）。不匹配命名模式的对象一律不动。

### 更新强更 / 普通更新

```
UPDATE_FORCE_UPDATE=true    → 全部用户强更
UPDATE_FORCE_UPDATE=false   → 普通更新（低于 MIN_VERSION 仍强更）
```

### 定时任务（云端）

云端定时任务需要配 Cron Trigger 调 `POST /api/tasks/run-due`（用 `ADMIN_TOKEN` 鉴权）。

> ⚠️ 边缘函数进程不常驻，**不要依赖进程内定时器**。这也是为什么周额度重置
> 靠「主键含 week_start，跨周自然落到新行」而不是定时清零。

---

## 常见问题

### 管理台保存成功，但列表不显示

**九成是数据库没建表。** 保存接口只返回 `{ok:true,id}` 不查库，刷新列表才查库。

```bash
npm run db:migrate
# 确认 18 张表都在
```

### 所有接口都 404

检查 EdgeOne 是否丢了 `/api` 前缀。后端所有路由挂在 `basePath("/api")` 下，
完整地址是 `https://域名/api/...`。

### 更新提示不弹

按顺序对比三处版本号：

| 位置 | 查看方式 |
|---|---|
| `pubspec.yaml` | `grep '^version:' pubspec.yaml` |
| App 自报 | `lib/ui/about_screen.dart` 的 `kAppVersion` |
| 服务器清单 | `curl R2地址/orion/latest.json` 看 `version` |

三处必须一致，且**服务器版本号必须更高**。`buildNumber` 不参与比较。

### CI 卡在 Analyze 但看不到报错

```bash
git fetch origin
git show origin/main:docs/CI_ANALYZE_REPORT.md
```

CI 失败时会把报错写进这个文件并提交回来。

> 🔴 **commit message 里别写「跳过 CI」的方括号标记**（形如 `[skip ci]`），
> 哪怕只是说明文字里的举例——GitHub 会因此跳过整个 workflow。

### 云端模型不显示

按顺序查：

1. 后台「供应商配置」列表能否看到已保存的供应商（看不到 → 没 migrate）
2. 后端是否配了 `PUBLIC_BASE_URL`
3. App 是否**退出后重新登录**（云端配置是登录时拉取的）
4. 供应商的 `enabled` 是否为开

### 云端额度显示 0

额度卡只在后端返回 `aiQuota` 字段时显示。检查 `JWT_SECRET` 是否配好
（后端鉴权失败时不会下发额度）。

### 公告不弹窗

- 后台公告是否**启用**
- 公告的版本范围是否覆盖当前 App 版本
- 该公告是否已被标记已读（改内容可重弹）
- 「稍后看」后有 6 小时静默期

### 搜索中继报 500

`SEARCH_PROVIDER=duckduckgo` 是免 Key 的默认后端。若报 501/超时，
可能被网络环境拦了，试试换 `serper` 或 `bocha`（需对应 API Key）。

---

## 安全清单

部署前逐项确认：

- [ ] `JWT_SECRET` 与 `ADMIN_TOKEN` 都是随机生成的长串，不是默认值
- [ ] R2 token 权限限定到单个 bucket，不是全局 API Token
- [ ] `AGENT_API_KEY` 只保存在后端与 orion-forge 两处，**绝不下发到 App**
- [ ] App 里只有 `PUBLIC_BASE_URL`，无任何第三方 Key
- [ ] `DEBUG_ERRORS=false`（生产环境开会把原始错误与堆栈返回给客户端）
- [ ] 数据库 Token 用最小权限组
- [ ] `BOTID_SKIP_CHECK` 只在已有其他防护时开启
