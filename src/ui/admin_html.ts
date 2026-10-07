/**
 * 云端管理台单页应用（无依赖, 内联 HTML/CSS/JS）。
 * 由 GET /admin 直接返回, 数据全部走既有 /api/admin/* 接口(Bearer ADMIN_TOKEN)。
 * UI: 纯白背景 + 磨砂液态玻璃(backdrop-filter), 左侧抽屉式导航(桌面可折叠/移动端浮出),
 *     功能按「概览/授权管理/用户管理/运营监控」分组, 5 套配色主题,
 *     主题/令牌持久化在 localStorage。
 * 注意: 本文件是 TS 模板字符串, 页面 JS 一律用单引号字符串拼接,
 *       不用反引号与 ${, 避免转义问题。
 */
export function adminHtml(): string {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Orion Cloud 管理台</title>
<style>
:root {
  --a1: #22d3ee; --a2: #818cf8;
  --blob1: rgba(34,211,238,.42); --blob2: rgba(129,140,248,.38); --blob3: rgba(167,139,250,.34);

  --text:#172033; --text-dim:#6b7a90;
  --glass:rgba(255,255,255,.66); --glass-strong:rgba(255,255,255,.84);
  --border:rgba(20,35,70,.09); --input:rgba(255,255,255,.8);
  --page:#ffffff; --danger:#e11d48; --ok:#059669;
  --shadow:0 10px 40px rgba(30,50,90,.10);
}
:root[data-theme="violet"] { --a1:#a78bfa; --a2:#f472b6; --blob1:rgba(167,139,250,.4); --blob2:rgba(244,114,182,.34); --blob3:rgba(129,140,248,.34); }
:root[data-theme="forest"] { --a1:#34d399; --a2:#a3e635; --blob1:rgba(52,211,153,.36); --blob2:rgba(163,230,53,.3); --blob3:rgba(45,212,191,.34); }
:root[data-theme="sunset"] { --a1:#fb923c; --a2:#f43f5e; --blob1:rgba(251,146,60,.36); --blob2:rgba(244,63,94,.32); --blob3:rgba(250,204,21,.3); }
:root[data-theme="rose"]   { --a1:#fb7185; --a2:#c084fc; --blob1:rgba(251,113,133,.36); --blob2:rgba(192,132,252,.32); --blob3:rgba(244,114,182,.3); }

* { margin:0; padding:0; box-sizing:border-box; }
body {
  min-height:100vh; font-family:"PingFang SC","Microsoft YaHei",-apple-system,sans-serif;
  background:var(--page); color:var(--text); overflow-x:hidden;
}
button { cursor:pointer; font-family:inherit; }

/* ---- 纯白底 + 柔和液态光斑(低透明度, 观感仍是白底) ---- */
.blob { position:fixed; border-radius:50%; filter:blur(100px); z-index:-1; opacity:.55; animation:drift 24s ease-in-out infinite alternate; }
.blob.b1 { width:44vw; height:44vw; background:var(--blob1); top:-16vw; left:-8vw; }
.blob.b2 { width:36vw; height:36vw; background:var(--blob2); bottom:-14vw; right:-6vw; animation-delay:-8s; }
.blob.b3 { width:26vw; height:26vw; background:var(--blob3); top:34vh; left:56vw; animation-delay:-16s; }
@keyframes drift { from { transform:translate(0,0) scale(1); } to { transform:translate(5vw,4vh) scale(1.14); } }

/* ---- 磨砂玻璃 ---- */
.glass {
  background:var(--glass); backdrop-filter:blur(28px) saturate(1.8);
  -webkit-backdrop-filter:blur(28px) saturate(1.8);
  border:1px solid var(--border); border-radius:20px;
  box-shadow:var(--shadow);
}
.grad-text { background:linear-gradient(120deg,var(--a1),var(--a2)); -webkit-background-clip:text; background-clip:text; color:transparent; }
.btn {
  border:none; border-radius:12px; padding:9px 18px; font-size:14px; font-weight:600;
  color:#fff; background:linear-gradient(120deg,var(--a1),var(--a2));
  transition:transform .15s, box-shadow .15s, opacity .15s;
}
.btn:hover { transform:translateY(-1px); box-shadow:0 6px 18px color-mix(in srgb, var(--a1) 40%, transparent); }
.btn:disabled { opacity:.5; transform:none; }
.btn.ghost { background:var(--glass-strong); color:var(--text); border:1px solid var(--border); backdrop-filter:blur(16px); -webkit-backdrop-filter:blur(16px); }
.btn.danger { background:linear-gradient(120deg,#fb7185,#e11d48); }
.btn.icon { padding:8px 13px; font-size:16px; line-height:1; }
input, select, textarea {
  background:var(--input); border:1px solid var(--border); border-radius:12px;
  padding:9px 13px; color:var(--text); font-size:14px; outline:none; font-family:inherit;
  transition:border .2s, box-shadow .2s;
}
input:focus, select:focus, textarea:focus { border-color:var(--a1); box-shadow:0 0 0 3px color-mix(in srgb, var(--a1) 25%, transparent); }
select option { color:#172033; }
textarea { resize:vertical; font-family:inherit; }
table { width:100%; border-collapse:collapse; font-size:13.5px; }
th { text-align:left; padding:10px 12px; color:var(--text-dim); font-weight:600; border-bottom:1px solid var(--border); white-space:nowrap; }
td { padding:10px 12px; border-bottom:1px solid var(--border); word-break:break-all; }
tr:hover td { background:rgba(255,255,255,.7); }
.badge { display:inline-block; padding:3px 10px; border-radius:999px; font-size:12px; font-weight:600; }
.badge.used { background:color-mix(in srgb, var(--a1) 18%, transparent); color:var(--a1); }
.badge.unused { background:color-mix(in srgb, var(--ok) 14%, transparent); color:var(--ok); }
.badge.revoked, .badge.banned, .badge.error { background:color-mix(in srgb, var(--danger) 12%, transparent); color:var(--danger); }
.mono { font-family:ui-monospace,Consolas,monospace; }
.dim { color:var(--text-dim); }

/* ---- 左侧抽屉 ---- */
#drawer {
  position:fixed; left:0; top:0; bottom:0; width:236px; z-index:40;
  background:var(--glass-strong); backdrop-filter:blur(30px) saturate(1.9);
  -webkit-backdrop-filter:blur(30px) saturate(1.9);
  border-right:1px solid var(--border);
  padding:20px 14px; display:flex; flex-direction:column;
  transition:margin-left .25s ease, transform .25s ease;
  overflow-y:auto;
}
#drawer .brand { display:flex; align-items:center; gap:9px; padding:2px 8px 16px; font-size:17px; font-weight:900; letter-spacing:.5px; }
.grp { font-size:11px; letter-spacing:2.5px; color:var(--text-dim); font-weight:800; margin:16px 10px 6px; }
.nav-item {
  display:flex; align-items:center; gap:10px; width:100%;
  border:none; background:transparent; color:var(--text);
  font-size:14px; font-weight:600; padding:10px 12px; border-radius:12px;
  text-align:left; transition:background .18s, color .18s, box-shadow .18s;
}
.nav-item:hover { background:rgba(255,255,255,.9); box-shadow:0 4px 14px rgba(30,50,90,.07); }
.nav-item.active {
  color:#fff; background:linear-gradient(120deg,var(--a1),var(--a2));
  box-shadow:0 6px 18px color-mix(in srgb, var(--a1) 35%, transparent);
}
/* ---- 黑白线条图标 ---- */
.ic { width:18px; height:18px; flex:none; display:inline-block; vertical-align:-4px;
  fill:none; stroke:currentColor; stroke-width:1.8; stroke-linecap:round; stroke-linejoin:round; }
.nav-item .ic { width:18px; height:18px; vertical-align:middle; }
.panel h2 .ic { width:17px; height:17px; vertical-align:-3px; }
#drawer .foot { margin-top:auto; padding-top:16px; border-top:1px solid var(--border); display:flex; gap:8px; }
#drawer .foot .btn { flex:1; padding:8px 10px; font-size:13px;
  display:inline-flex; align-items:center; justify-content:center; gap:5px; }

/* 桌面折叠 */
body.collapsed #drawer { margin-left:-236px; }
body.collapsed #app { margin-left:0; }
#mask { position:fixed; inset:0; background:rgba(15,23,42,.3); backdrop-filter:blur(3px); -webkit-backdrop-filter:blur(3px); z-index:35; display:none; }
body.drawer-open #mask { display:block; }

/* ---- 主区 ---- */
#app { display:none; margin-left:236px; transition:margin-left .25s ease; }
#app .inner { max-width:1180px; margin:0 auto; padding:22px 20px 60px; }
header.top { display:flex; align-items:center; gap:12px; margin-bottom:20px; flex-wrap:wrap; }
header.top h1 { font-size:20px; font-weight:800; letter-spacing:.5px; }
header.top .spacer { flex:1; }
section.view { display:none; }
section.view.active { display:block; }
.grid.cards { display:grid; grid-template-columns:repeat(auto-fit,minmax(200px,1fr)); gap:14px; margin-bottom:18px; }
.stat { padding:18px 20px; position:relative; overflow:hidden; }
.stat .num { font-size:30px; font-weight:800; margin-top:4px; }
.stat .lbl { font-size:13px; color:var(--text-dim); }
.stat::after { content:''; position:absolute; right:-22px; top:-22px; width:80px; height:80px; border-radius:50%;
  background:linear-gradient(120deg,var(--a1),var(--a2)); opacity:.14; }
.panel { padding:20px; margin-bottom:18px; }
.panel h2 { font-size:16px; font-weight:700; margin-bottom:14px; display:flex; align-items:center; gap:8px; }
.row { display:flex; gap:10px; flex-wrap:wrap; align-items:center; margin-bottom:12px; }
.scroll-x { overflow-x:auto; border-radius:12px; }
.empty { text-align:center; padding:28px; color:var(--text-dim); font-size:14px; }
#toast { position:fixed; bottom:26px; left:50%; transform:translateX(-50%) translateY(80px); z-index:99;
  padding:11px 22px; font-size:14px; font-weight:600; color:#fff; border-radius:14px;
  background:rgba(15,23,42,.85); backdrop-filter:blur(12px); transition:transform .3s; }
#toast.show { transform:translateX(-50%) translateY(0); }

/* ---- 登录 ---- */
#login { display:none; min-height:100vh; align-items:center; justify-content:center; padding:20px; }
#login .box { width:min(400px,92vw); padding:38px 32px; text-align:center; }
#login h1 { font-size:24px; font-weight:800; margin:14px 0 6px; }
#login p { color:var(--text-dim); font-size:13px; margin-bottom:22px; }
#login input { width:100%; margin-bottom:14px; text-align:center; }

/* ---- 主题选择器 ---- */
.theme-pop { position:absolute; top:46px; right:0; padding:12px; z-index:50; width:210px; background:var(--glass-strong); }
.theme-dot { width:30px; height:30px; border-radius:50%; cursor:pointer; border:2px solid transparent; transition:transform .15s, border .15s; }
.theme-dot:hover { transform:scale(1.15); }
.theme-dot.sel { border-color:var(--text); }
.t-aurora { background:linear-gradient(120deg,#22d3ee,#818cf8); }
.t-violet { background:linear-gradient(120deg,#a78bfa,#f472b6); }
.t-forest { background:linear-gradient(120deg,#34d399,#a3e635); }
.t-sunset { background:linear-gradient(120deg,#fb923c,#f43f5e); }
.t-rose   { background:linear-gradient(120deg,#fb7185,#c084fc); }
.rel { position:relative; }

/* ---- 响应式: 移动端抽屉浮出 ---- */
@media (max-width:820px) {
  #drawer { transform:translateX(-100%); box-shadow:0 0 60px rgba(30,50,90,.18); }
  body.drawer-open #drawer { transform:translateX(0); }
  #app, body.collapsed #app { margin-left:0; }
  #app .inner { padding:16px 14px 60px; }
  .stat .num { font-size:24px; }
}
</style>
</head>
<body>
<svg style="display:none" aria-hidden="true">
  <symbol id="i-home" viewBox="0 0 24 24"><path d="M3 10.5 12 3l9 7.5"/><path d="M5.5 9.5V20a1 1 0 0 0 1 1H10v-5.5h4V21h3.5a1 1 0 0 0 1-1V9.5"/></symbol>
  <symbol id="i-key" viewBox="0 0 24 24"><circle cx="8" cy="15" r="4"/><path d="m11 12 8-8"/><path d="m15.5 6.5 2.5 2.5"/><path d="m18 4 2 2"/></symbol>
  <symbol id="i-users" viewBox="0 0 24 24"><circle cx="9" cy="8" r="3.5"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><path d="M16 5.2a3.5 3.5 0 0 1 0 5.6"/><path d="M17.5 14.3c1.8.9 3 2.7 3 4.7"/></symbol>
  <symbol id="i-chart" viewBox="0 0 24 24"><path d="M4 20V10"/><path d="M10 20V4"/><path d="M16 20v-7"/><path d="M21 20H3"/></symbol>
  <symbol id="i-shield" viewBox="0 0 24 24"><path d="M12 3 5 6v5.5c0 4.2 2.9 7.6 7 9.5 4.1-1.9 7-5.3 7-9.5V6l-7-3Z"/><path d="m9 12 2 2 4-4"/></symbol>
  <symbol id="i-menu" viewBox="0 0 24 24"><path d="M4 7h16"/><path d="M4 12h16"/><path d="M4 17h16"/></symbol>
  <symbol id="i-contrast" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 1 0 18Z" fill="currentColor" stroke="none"/></symbol>
  <symbol id="i-pin" viewBox="0 0 24 24"><path d="M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11Z"/><circle cx="12" cy="10" r="2.5"/></symbol>
  <symbol id="i-list" viewBox="0 0 24 24"><path d="M8 6h13"/><path d="M8 12h13"/><path d="M8 18h13"/><path d="M3.5 6h.01"/><path d="M3.5 12h.01"/><path d="M3.5 18h.01"/></symbol>
  <symbol id="i-mega" viewBox="0 0 24 24"><path d="m3 11 14-6v14L3 13v-2Z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/><path d="M17 9.5a4 4 0 0 1 0 5"/></symbol>
  <symbol id="i-diamond" viewBox="0 0 24 24"><path d="m12 3 8 9-8 9-8-9 8-9Z"/></symbol>
</svg>
<div class="blob b1"></div><div class="blob b2"></div><div class="blob b3"></div>

<!-- 登录 -->
<div id="login">
  <div class="box glass">
    <div style="display:flex; align-items:center; justify-content:center; gap:10px;">
      <svg class="ic" style="width:32px; height:32px; stroke-width:1.6;" aria-hidden="true"><use href="#i-diamond"></use></svg>
      <span class="grad-text" style="font-size:34px; font-weight:900; letter-spacing:1px;">Orion Cloud</span>
    </div>
    <h1>管理台</h1>
    <p>输入管理令牌（ADMIN_TOKEN）进入</p>
    <input id="tk" type="password" placeholder="ADMIN_TOKEN">
    <button class="btn" style="width:100%; padding:12px;" onclick="doLogin()">进 入</button>
    <div id="loginErr" class="dim" style="margin-top:12px; font-size:13px; min-height:18px; color:var(--danger);"></div>
  </div>
</div>

<!-- 左侧抽屉(功能分类导航) -->
<div id="mask" onclick="toggleDrawer()"></div>
<aside id="drawer">
  <div class="brand"><svg class="ic" style="width:20px; height:20px;" aria-hidden="true"><use href="#i-diamond"></use></svg> Orion Cloud</div>

  <div class="grp">概 览</div>
  <button class="nav-item active" data-v="dash" onclick="show('dash')"><svg class="ic" aria-hidden="true"><use href="#i-home"></use></svg> 首页</button>

  <div class="grp">授权管理</div>
  <button class="nav-item" data-v="grant" onclick="show('grant')"><svg class="ic" aria-hidden="true"><use href="#i-key"></use></svg> 账号授权</button>
  <button class="nav-item" data-v="ann" onclick="show('ann')"><svg class="ic" aria-hidden="true"><use href="#i-mega"></use></svg> 公告管理</button>

  <div class="grp">用户管理</div>
  <button class="nav-item" data-v="usr" onclick="show('usr')"><svg class="ic" aria-hidden="true"><use href="#i-users"></use></svg> 用户列表</button>

  <div class="grp">运营监控</div>
  <button class="nav-item" data-v="usage" onclick="show('usage')"><svg class="ic" aria-hidden="true"><use href="#i-chart"></use></svg> 用量统计</button>
  <button class="nav-item" data-v="audit" onclick="show('audit')"><svg class="ic" aria-hidden="true"><use href="#i-shield"></use></svg> 审计日志</button>

  <div class="foot">
    <button class="btn ghost" onclick="togglePop(event)" title="配色主题"><svg class="ic" style="width:15px; height:15px;" aria-hidden="true"><use href="#i-contrast"></use></svg> 主题</button>
    <button class="btn ghost" onclick="doLogout()">退出</button>
  </div>
</aside>

<!-- 主界面 -->
<div id="app">
 <div class="inner">
  <header class="top">
    <button class="btn ghost icon" onclick="toggleDrawer()" title="展开/收起导航"><svg class="ic" style="width:17px; height:17px;" aria-hidden="true"><use href="#i-menu"></use></svg></button>
    <h1 id="pageTitle">首页</h1>
    <div class="spacer"></div>
    <div class="rel">
      <div id="themePop" class="theme-pop glass" style="display:none;">
        <div class="dim" style="font-size:12px; margin-bottom:8px;">配色主题</div>
        <div style="display:flex; gap:9px; justify-content:center;">
          <div class="theme-dot t-aurora" data-t="aurora" onclick="setTheme('aurora')"></div>
          <div class="theme-dot t-violet" data-t="violet" onclick="setTheme('violet')"></div>
          <div class="theme-dot t-forest" data-t="forest" onclick="setTheme('forest')"></div>
          <div class="theme-dot t-sunset" data-t="sunset" onclick="setTheme('sunset')"></div>
          <div class="theme-dot t-rose" data-t="rose" onclick="setTheme('rose')"></div>
        </div>
      </div>
    </div>
  </header>

  <section id="v-dash" class="view active">
    <div class="grid cards">
      <div class="stat glass"><div class="lbl">注册用户</div><div class="num grad-text" id="sUsers">-</div></div>
      <div class="stat glass"><div class="lbl">活跃(未封禁)</div><div class="num grad-text" id="sActive">-</div></div>
      <div class="stat glass"><div class="lbl">付费账号</div><div class="num grad-text" id="sPro">-</div></div>
      <div class="stat glass"><div class="lbl">试用账号</div><div class="num grad-text" id="sTrial">-</div></div>
      <div class="stat glass"><div class="lbl">今日中继请求</div><div class="num grad-text" id="sUsage">-</div></div>
    </div>
    <div class="panel glass">
      <h2><svg class="ic" aria-hidden="true"><use href="#i-pin"></use></svg> 概览</h2>
      <div class="dim" id="dashNote" style="font-size:13.5px; line-height:1.8;">加载中...</div>
    </div>
  </section>

  <section id="v-grant" class="view">
    <div class="panel glass">
      <h2><svg class="ic" aria-hidden="true"><use href="#i-key"></use></svg> 账号授权 <button class="btn ghost" style="padding:4px 12px; font-size:12px; margin-left:auto;" onclick="loadGrant()">刷新</button></h2>
      <div class="dim" style="font-size:13px; margin-bottom:10px;">
        直接为账号设置套餐（卡密已下线）。模式：<b>设置</b> = 从现在起算；<b>顺延</b> = 在现有到期时间上叠加（更高套餐未过期时保留高套餐仅顺延）。
        free = 撤销授权。
      </div>
      <div class="scroll-x"><table id="grantTable"></table></div>
    </div>
  </section>

  <section id="v-usr" class="view">
    <div class="panel glass">
      <h2><svg class="ic" aria-hidden="true"><use href="#i-users"></use></svg> 用户列表 <button class="btn ghost" style="padding:4px 12px; font-size:12px; margin-left:auto;" onclick="loadUsers()">刷新</button></h2>
      <div class="scroll-x"><table id="usrTable"></table></div>
    </div>
  </section>

  <section id="v-usage" class="view">
    <div class="panel glass">
      <h2><svg class="ic" aria-hidden="true"><use href="#i-chart"></use></svg> 用量统计 <span class="dim" style="font-size:12px; font-weight:400;">(每日, UTC+8)</span></h2>
      <div class="scroll-x"><table id="usageTable"></table></div>
    </div>
  </section>

  <section id="v-audit" class="view">
    <div class="panel glass">
      <h2><svg class="ic" aria-hidden="true"><use href="#i-shield"></use></svg> 审计日志 <button class="btn ghost" style="padding:4px 12px; font-size:12px; margin-left:auto;" onclick="loadAudit()">刷新</button></h2>
      <div class="scroll-x"><table id="auditTable"></table></div>
    </div>
  </section>

  <section id="v-ann" class="view">
    <div class="panel glass">
      <h2><svg class="ic" aria-hidden="true"><use href="#i-mega"></use></svg> 发布/编辑公告</h2>
      <div class="row"><input id="annTitle" placeholder="公告标题" style="flex:1; min-width:220px;"></div>
      <div class="row"><textarea id="annContent" rows="5" placeholder="公告正文（App 内弹窗展示）" style="width:100%; min-width:220px;"></textarea></div>
      <div class="row">
        <span class="dim" style="font-size:13px;">版本范围（留空 = 全部版本）：</span>
        <input id="annMin" placeholder="最低版本 如 0.2.33" style="width:170px;">
        <input id="annMax" placeholder="最高版本 如 0.2.40" style="width:170px;">
        <label style="font-size:13px; display:flex; align-items:center; gap:5px;"><input type="checkbox" id="annEnabled" checked style="width:auto;"> 启用</label>
      </div>
      <div class="row">
        <button class="btn" onclick="saveAnnouncement()">发布</button>
        <button class="btn ghost" onclick="resetAnnForm()">清空表单</button>
        <span class="dim" id="annEditing" style="font-size:12px;"></span>
      </div>
    </div>
    <div class="panel glass">
      <h2><svg class="ic" aria-hidden="true"><use href="#i-list"></use></svg> 公告列表 <button class="btn ghost" style="padding:4px 12px; font-size:12px; margin-left:auto;" onclick="loadAnnouncements()">刷新</button></h2>
      <div class="scroll-x"><table id="annTable"></table></div>
    </div>
  </section>
 </div>
</div>
<div id="toast"></div>

<script>
// EdgeOne 部署时函数挂在 /api/* 下(前缀 /api); 本地 dev 直接是根路径。
var APIBASE = (location.pathname.indexOf('/api') === 0 ? '/api' : '') + '/admin';
var TOKEN = localStorage.getItem('orion_admin_token') || '';
var VIEW_META = { dash:'首页', grant:'账号授权', ann:'公告管理', usr:'用户列表', usage:'用量统计', audit:'审计日志' };

function api(path, opts) {
  opts = opts || {};
  opts.headers = Object.assign({'Authorization': 'Bearer ' + TOKEN}, opts.headers || {});
  if (opts.body && typeof opts.body !== 'string') { opts.body = JSON.stringify(opts.body); opts.headers['Content-Type'] = 'application/json'; }
  return fetch(APIBASE + path, opts).then(function(r) {
    if (r.status === 401) { doLogout(true); throw new Error('令牌无效'); }
    return r.json();
  });
}
function toast(msg) {
  var t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  setTimeout(function(){ t.classList.remove('show'); }, 2200);
}
function esc(s) { var d = document.createElement('div'); d.textContent = s == null ? '' : String(s); return d.innerHTML; }
function fmtTime(ms) { if (!ms) return '—'; var d = new Date(Number(ms)); return d.toLocaleString('zh-CN', {hour12:false}); }

// ---------- 主题 ----------
function setTheme(t) {
  document.documentElement.setAttribute('data-theme', t);
  localStorage.setItem('orion_admin_theme', t); markTheme(t);
}
function markTheme(t) {
  var dots = document.querySelectorAll('.theme-dot');
  for (var i = 0; i < dots.length; i++) dots[i].classList.toggle('sel', dots[i].getAttribute('data-t') === t);
}
function togglePop(e) { e.stopPropagation(); var p = document.getElementById('themePop'); p.style.display = p.style.display === 'none' ? 'block' : 'none'; }
document.addEventListener('click', function(e) {
  var p = document.getElementById('themePop');
  if (p && !p.contains(e.target)) p.style.display = 'none';
});

// ---------- 抽屉: 桌面折叠 / 移动端浮出 ----------
function toggleDrawer() {
  if (window.innerWidth <= 820) document.body.classList.toggle('drawer-open');
  else document.body.classList.toggle('collapsed');
}

// ---------- 登录 ----------
function doLogin() {
  var v = document.getElementById('tk').value.trim();
  if (!v) return;
  TOKEN = v;
  fetch(APIBASE + '/users', {headers: {'Authorization': 'Bearer ' + TOKEN}})
    .then(function(r) {
      if (r.status === 401) { document.getElementById('loginErr').textContent = '令牌无效'; return null; }
      if (!r.ok) { document.getElementById('loginErr').textContent = '服务异常 (' + r.status + ')'; return null; }
      localStorage.setItem('orion_admin_token', TOKEN);
      enterApp(); return null;
    })
    .catch(function() { document.getElementById('loginErr').textContent = '网络错误'; });
}
function doLogout(silent) {
  TOKEN = ''; localStorage.removeItem('orion_admin_token');
  document.getElementById('app').style.display = 'none';
  document.getElementById('login').style.display = 'flex';
  if (silent !== true) toast('已退出');
}

// ---------- 视图切换 ----------
function show(v) {
  var items = document.querySelectorAll('.nav-item');
  for (var i = 0; i < items.length; i++) items[i].classList.toggle('active', items[i].getAttribute('data-v') === v);
  var views = document.querySelectorAll('section.view');
  for (var j = 0; j < views.length; j++) views[j].classList.toggle('active', views[j].id === 'v-' + v);
  document.getElementById('pageTitle').textContent = VIEW_META[v] || '';
  if (window.innerWidth <= 820) document.body.classList.remove('drawer-open');
  if (v === 'dash') loadDashboard();
  if (v === 'grant') loadGrant();
  if (v === 'ann') loadAnnouncements();
  if (v === 'usr') loadUsers();
  if (v === 'usage') loadUsage();
  if (v === 'audit') loadAudit();
}
function enterApp() {
  document.getElementById('login').style.display = 'none';
  document.getElementById('app').style.display = 'block';
  show('dash');
}

// ---------- 首页 ----------
function loadDashboard() {
  Promise.all([api('/users'), api('/usage')]).then(function(rs) {
    var users = rs[0].users || [], usage = rs[1].usage || [];
    var banned = 0;
    for (var j = 0; j < users.length; j++) if (users[j].status === 'banned') banned++;
    var today = new Date(Date.now() + 8*3600*1000).toISOString().slice(0,10);
    var totalReq = 0;
    for (var k = 0; k < usage.length; k++) if (usage[k].date === today) totalReq += Number(usage[k].count) || 0;
    var pro = 0, trial = 0;
    for (var m = 0; m < users.length; m++) {
      if (users[m].plan === 'pro' || users[m].plan === 'lifetime') pro++;
      if (users[m].plan === 'trial') trial++;
    }
    document.getElementById('sUsers').textContent = users.length;
    document.getElementById('sActive').textContent = users.length - banned;
    document.getElementById('sPro').textContent = pro;
    document.getElementById('sTrial').textContent = trial;
    document.getElementById('sUsage').textContent = totalReq;
    document.getElementById('dashNote').innerHTML =
      '共 <b>' + users.length + '</b> 位用户：付费 ' + pro + ' · 试用 ' + trial + ' · 封禁 ' + banned +
      '<br>授权方式：管理台直接为账号设置套餐（卡密已下线）<br>今日中继请求：' + totalReq + ' 次（UTC+8 ' + today + '）';
  }).catch(function(e) { if (TOKEN) toast('加载失败: ' + e.message); });
}

// ---------- 账号授权 ----------
function loadGrant() {
  api('/users').then(function(r) {
    var rows = r.users || [];
    var html = '<tr><th>邮箱</th><th>当前套餐</th><th>到期</th><th>授权操作（套餐 / 天数 / 模式）</th><th></th></tr>';
    if (!rows.length) html += '<tr><td colspan="5" class="empty">无用户</td></tr>';
    for (var i = 0; i < rows.length; i++) {
      var u = rows[i];
      var uid = esc(u.id);
      var exp = u.plan_expires_at ? new Date(Number(u.plan_expires_at)).toLocaleString('zh-CN', {hour12:false}) : (u.plan === 'lifetime' ? '永久' : '—');
      html += '<tr><td>' + esc(u.email) + '</td>'
        + '<td><span class="badge used">' + esc(u.plan) + '</span></td><td class="dim">' + exp + '</td>'
        + '<td><div style="display:flex; gap:6px; flex-wrap:wrap; align-items:center;">'
        + '<select id="gp-' + uid + '" style="width:110px; padding:6px 8px; font-size:13px;">'
        + '<option value="free">free 撤销</option><option value="trial">trial 试用</option><option value="pro">pro 专业</option><option value="lifetime">lifetime 永久</option></select>'
        + '<input id="gd-' + uid + '" type="number" value="30" min="1" style="width:74px; padding:6px 8px; font-size:13px;" title="天数">'
        + '<select id="gm-' + uid + '" style="width:88px; padding:6px 8px; font-size:13px;">'
        + '<option value="set">设置</option><option value="extend">顺延</option></select>'
        + '<button class="btn" style="padding:6px 14px; font-size:12px;" onclick="setPlan(\'' + uid + '\')">应用</button>'
        + '</div></td>'
        + '<td><button class="btn ' + (u.status === 'banned' ? '' : 'danger') + '" style="padding:4px 12px; font-size:12px;" onclick="setBan(\'' + uid + '\',' + (u.status === 'banned') + ')">' + (u.status === 'banned' ? '解封' : '封禁') + '</button></td></tr>';
    }
    document.getElementById('grantTable').innerHTML = html;
  }).catch(function(e) { if (TOKEN) toast('加载失败: ' + e.message); });
}
function setPlan(id) {
  var body = {
    plan: document.getElementById('gp-' + id).value,
    durationDays: Number(document.getElementById('gd-' + id).value) || 0,
    mode: document.getElementById('gm-' + id).value
  };
  api('/users/' + encodeURIComponent(id) + '/plan', {method:'POST', body: body}).then(function(r) {
    toast(r.message || '已更新'); loadGrant();
  }).catch(function(e) { toast('授权失败: ' + e.message); });
}

// ---------- 公告 ----------
var editingAnnId = '';
function loadAnnouncements() {
  api('/announcements').then(function(r) {
    var rows = r.announcements || [];
    var html = '<tr><th>标题</th><th>内容</th><th>版本范围</th><th>状态</th><th>更新</th><th></th></tr>';
    if (!rows.length) html += '<tr><td colspan="6" class="empty">暂无公告</td></tr>';
    for (var i = 0; i < rows.length; i++) {
      var a = rows[i];
      var range = (a.min_version ? '≥' + a.min_version : '') + (a.max_version ? ' ≤' + a.max_version : '') || '全部版本';
      html += '<tr><td><b>' + esc(a.title) + '</b></td><td class="dim" style="max-width:260px;">' + esc(String(a.content).slice(0, 60)) + (String(a.content).length > 60 ? '…' : '') + '</td>'
        + '<td class="dim">' + esc(range) + '</td>'
        + '<td><span class="badge ' + (a.enabled ? 'unused' : 'revoked') + '">' + (a.enabled ? '启用中' : '已停用') + '</span></td>'
        + '<td class="dim">' + fmtTime(a.updated_at) + '</td>'
        + '<td style="white-space:nowrap;">'
        + '<button class="btn ghost" style="padding:4px 10px; font-size:12px;" onclick="editAnnouncement(\'' + esc(a.id) + '\')">编辑</button> '
        + '<button class="btn ghost" style="padding:4px 10px; font-size:12px;" onclick="toggleAnnouncement(\'' + esc(a.id) + '\')">' + (a.enabled ? '停用' : '启用') + '</button> '
        + '<button class="btn danger" style="padding:4px 10px; font-size:12px;" onclick="deleteAnnouncement(\'' + esc(a.id) + '\')">删除</button></td></tr>';
    }
    document.getElementById('annTable').innerHTML = html;
  }).catch(function(e) { if (TOKEN) toast('加载失败: ' + e.message); });
}
function saveAnnouncement() {
  var body = {
    title: document.getElementById('annTitle').value.trim(),
    content: document.getElementById('annContent').value.trim(),
    minVersion: document.getElementById('annMin').value.trim(),
    maxVersion: document.getElementById('annMax').value.trim(),
    enabled: document.getElementById('annEnabled').checked
  };
  if (!body.title || !body.content) { toast('标题与正文不能为空'); return; }
  if (editingAnnId) body.id = editingAnnId;
  api('/announcements', {method:'POST', body: body}).then(function() {
    toast(editingAnnId ? '公告已更新' : '公告已发布');
    resetAnnForm(); loadAnnouncements();
  }).catch(function(e) { toast('保存失败: ' + e.message); });
}
function editAnnouncement(id) {
  api('/announcements').then(function(r) {
    var rows = r.announcements || [];
    for (var i = 0; i < rows.length; i++) {
      if (rows[i].id === id) {
        editingAnnId = id;
        document.getElementById('annTitle').value = rows[i].title;
        document.getElementById('annContent').value = rows[i].content;
        document.getElementById('annMin').value = rows[i].min_version || '';
        document.getElementById('annMax').value = rows[i].max_version || '';
        document.getElementById('annEnabled').checked = !!rows[i].enabled;
        document.getElementById('annEditing').textContent = '正在编辑: ' + id;
        window.scrollTo(0, 0);
        return;
      }
    }
  }).catch(function(e) { toast('加载失败: ' + e.message); });
}
function resetAnnForm() {
  editingAnnId = '';
  document.getElementById('annTitle').value = '';
  document.getElementById('annContent').value = '';
  document.getElementById('annMin').value = '';
  document.getElementById('annMax').value = '';
  document.getElementById('annEnabled').checked = true;
  document.getElementById('annEditing').textContent = '';
}
function toggleAnnouncement(id) {
  api('/announcements/' + encodeURIComponent(id) + '/toggle', {method:'POST'}).then(function() {
    toast('已切换状态'); loadAnnouncements();
  }).catch(function(e) { toast('操作失败: ' + e.message); });
}
function deleteAnnouncement(id) {
  if (!confirm('确定删除该公告？')) return;
  api('/announcements/' + encodeURIComponent(id), {method:'DELETE'}).then(function() {
    toast('已删除'); loadAnnouncements();
  }).catch(function(e) { toast('删除失败: ' + e.message); });
}

// ---------- 用户 ----------
function loadUsers() {
  api('/users').then(function(r) {
    var rows = r.users || [];
    var html = '<tr><th>邮箱</th><th>套餐</th><th>到期</th><th>设备</th><th>状态</th><th>注册</th><th></th></tr>';
    if (!rows.length) html += '<tr><td colspan="7" class="empty">无用户</td></tr>';
    for (var i = 0; i < rows.length; i++) {
      var u = rows[i];
      var exp = u.plan_expires_at ? new Date(Number(u.plan_expires_at)).toLocaleDateString('zh-CN') : (u.plan === 'lifetime' ? '永久' : '—');
      html += '<tr><td>' + esc(u.email) + '</td>'
        + '<td>' + esc(u.plan) + '</td><td>' + exp + '</td><td>' + esc(u.device_count) + '</td>'
        + '<td>' + (u.status === 'banned' ? '<span class="badge banned">banned</span>' : '<span class="badge unused">active</span>') + '</td>'
        + '<td class="dim">' + fmtTime(u.created_at) + '</td>'
        + '<td><button class="btn ' + (u.status === 'banned' ? '' : 'danger') + '" style="padding:4px 12px; font-size:12px;" onclick="setBan(\\'' + esc(u.id) + '\\',' + (u.status === 'banned') + ')">' + (u.status === 'banned' ? '解封' : '封禁') + '</button></td></tr>';
    }
    document.getElementById('usrTable').innerHTML = html;
  }).catch(function(e) { if (TOKEN) toast('加载失败: ' + e.message); });
}
function setBan(id, banned) {
  api('/users/' + encodeURIComponent(id) + '/' + (banned ? 'unban' : 'ban'), {method:'POST'}).then(function() {
    toast(banned ? '已解封' : '已封禁'); loadUsers();
  }).catch(function(e) { toast('操作失败: ' + e.message); });
}

// ---------- 用量 ----------
function loadUsage() {
  api('/usage').then(function(r) {
    var rows = r.usage || [];
    var html = '<tr><th>日期</th><th>用户</th><th>功能</th><th>次数</th></tr>';
    if (!rows.length) html += '<tr><td colspan="4" class="empty">暂无数据</td></tr>';
    for (var i = 0; i < rows.length; i++) {
      html += '<tr><td>' + esc(rows[i].date || '') + '</td><td class="mono dim">' + esc(String(rows[i].user_id || '').slice(0, 14)) + '…</td><td>' + esc(rows[i].feature) + '</td><td><b>' + esc(rows[i].count) + '</b></td></tr>';
    }
    document.getElementById('usageTable').innerHTML = html;
  }).catch(function(e) { if (TOKEN) toast('加载失败: ' + e.message); });
}

// ---------- 审计 ----------
function loadAudit() {
  api('/audit').then(function(r) {
    var rows = r.audit || [];
    var html = '<tr><th>时间</th><th>动作</th><th>用户</th><th>详情</th><th>IP</th></tr>';
    if (!rows.length) html += '<tr><td colspan="5" class="empty">暂无记录</td></tr>';
    for (var i = 0; i < rows.length; i++) {
      html += '<tr><td class="dim">' + fmtTime(rows[i].at) + '</td><td><span class="badge used">' + esc(rows[i].action) + '</span></td><td class="mono dim">' + esc(String(rows[i].user_id || '—').slice(0, 14)) + '</td><td>' + esc(rows[i].detail || '') + '</td><td class="dim">' + esc(rows[i].ip || '') + '</td></tr>';
    }
    document.getElementById('auditTable').innerHTML = html;
  }).catch(function(e) { if (TOKEN) toast('加载失败: ' + e.message); });
}

// ---------- 启动 ----------
(function init() {
  var t = localStorage.getItem('orion_admin_theme') || 'aurora';
  document.documentElement.setAttribute('data-theme', t);
  markTheme(t);
  if (TOKEN) {
    fetch(APIBASE + '/users', {headers: {'Authorization': 'Bearer ' + TOKEN}})
      .then(function(r) { if (r.ok) enterApp(); else doLogout(true); })
      .catch(function() { doLogout(true); });
  } else {
    document.getElementById('login').style.display = 'flex';
  }
  document.getElementById('tk').addEventListener('keydown', function(e) { if (e.key === 'Enter') doLogin(); });
})();
</script>
</body>
</html>`;
}
