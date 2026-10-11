/**
 * 云端管理台单页应用（无依赖, 内联 HTML/CSS/JS）。
 * 由 GET /admin 直接返回, 数据全部走既有 /api/admin/* 接口(Bearer ADMIN_TOKEN)。
 *
 * UI 设计（2026-10-09 重写）:
 *   - 双主题液态玻璃: 只有「纯白 light / 深色 dark」两套, 全站单色系,
 *     不再提供 5 套彩色配色; 主题经 :root[data-theme] 切换 CSS 变量实现。
 *   - 首次访问跟随系统 prefers-color-scheme, 之后记住用户选择。
 *   - 布局沿用左抽屉导航 + 顶栏 + 卡片/面板结构, 与旧版基本一致。
 *   - 移动端适配: ≤900px 抽屉浮出(点击遮罩关闭), ≤760px 表格转卡片、
 *     表单纵向堆叠、确认框变底部弹层, 输入框 16px 防 iOS 聚焦缩放,
 *     触控目标 ≥44px, 兼容刘海屏 safe-area。
 *
 * 注意: 本文件是 TS 模板字符串, 页面 JS 一律用单引号字符串拼接,
 *       不用反引号与 ${, 避免转义问题。
 */
export function adminHtml(): string {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
<meta name="theme-color" content="#ffffff">
<title>Orion Cloud 管理台</title>
<style>
/* ============================================================
   Orion Cloud 管理台 —— 双主题液态玻璃
   主题只有两套: light(纯白) / dark(深色), 均为单色系。
   任何颜色都从 CSS 变量取, 换主题只换变量、不动结构。
   ============================================================ */

/* ---------- 主题变量 ---------- */
:root, :root[data-theme="light"] {
  color-scheme: light;
  --page:#ffffff;
  --text:#0d1524; --text-dim:#5f6b7e; --text-faint:#8b97a8;

  --glass:rgba(255,255,255,.60);      /* 常规玻璃面板 */
  --glass-2:rgba(255,255,255,.80);    /* 更实的玻璃: 抽屉 / 卡片 / 弹层 */
  --glass-3:rgba(255,255,255,.46);    /* 更虚的玻璃: 表头 / 吸顶条 */
  --border:rgba(13,21,36,.10);
  --border-strong:rgba(13,21,36,.20);
  --input:rgba(255,255,255,.74);
  --hover:rgba(13,21,36,.055);
  --stripe:rgba(13,21,36,.028);

  --primary:#0d1524; --on-primary:#ffffff;
  --danger:#dc2626; --danger-ink:#b91c1c; --on-danger:#ffffff;
  --ok:#047857; --ok-ink:#047857;

  --blob1:rgba(13,21,36,.075); --blob2:rgba(13,21,36,.055); --blob3:rgba(13,21,36,.045);
  --shadow:0 18px 50px rgba(13,21,36,.10), 0 2px 6px rgba(13,21,36,.05);
  --shadow-sm:0 5px 16px rgba(13,21,36,.07);
  --grain:rgba(255,255,255,.85);      /* 玻璃顶部高光 */
  --scrim:rgba(4,8,15,.45);
}
:root[data-theme="dark"] {
  color-scheme: dark;
  --page:#05070c;
  --text:#e9eef6; --text-dim:#97a3b4; --text-faint:#6f7b8c;

  --glass:rgba(255,255,255,.055);
  --glass-2:rgba(255,255,255,.085);
  --glass-3:rgba(255,255,255,.05);
  --border:rgba(255,255,255,.11);
  --border-strong:rgba(255,255,255,.24);
  --input:rgba(255,255,255,.065);
  --hover:rgba(255,255,255,.075);
  --stripe:rgba(255,255,255,.03);

  --primary:#f2f6fb; --on-primary:#0a0f18;
  --danger:#e5484d; --danger-ink:#fca5a5; --on-danger:#ffffff;
  --ok:#34d399; --ok-ink:#6ee7b7;

  --blob1:rgba(255,255,255,.085); --blob2:rgba(255,255,255,.06); --blob3:rgba(255,255,255,.045);
  --shadow:0 18px 50px rgba(0,0,0,.55), 0 2px 6px rgba(0,0,0,.35);
  --shadow-sm:0 5px 16px rgba(0,0,0,.4);
  --grain:rgba(255,255,255,.16);
  --scrim:rgba(0,0,0,.55);
}

* { margin:0; padding:0; box-sizing:border-box; }
html { -webkit-text-size-adjust:100%; }
body {
  min-height:100vh; font-family:"PingFang SC","HarmonyOS Sans SC","Microsoft YaHei",-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
  background:var(--page); color:var(--text); overflow-x:hidden;
  line-height:1.55; letter-spacing:.1px;
  -webkit-font-smoothing:antialiased; -moz-osx-font-smoothing:grayscale;
}
button { cursor:pointer; font-family:inherit; }
::selection { background:color-mix(in srgb, var(--text) 20%, transparent); }

/* ---- 背景液态光斑(极低饱和, 纯白/深色观感不变) ---- */
.blob { position:fixed; border-radius:50%; filter:blur(90px); z-index:-1;
  pointer-events:none; animation:drift 26s ease-in-out infinite alternate; }
.blob.b1 { width:46vw; height:46vw; background:var(--blob1); top:-18vw; left:-10vw; }
.blob.b2 { width:38vw; height:38vw; background:var(--blob2); bottom:-16vw; right:-8vw; animation-delay:-9s; }
.blob.b3 { width:28vw; height:28vw; background:var(--blob3); top:32vh; left:58vw; animation-delay:-17s; }
@keyframes drift { from { transform:translate(0,0) scale(1); } to { transform:translate(5vw,4vh) scale(1.14); } }

/* ---- 磨砂玻璃(液态玻璃) ---- */
.glass {
  background:var(--glass);
  backdrop-filter:blur(30px) saturate(1.7);
  -webkit-backdrop-filter:blur(30px) saturate(1.7);
  border:1px solid var(--border);
  border-radius:22px;
  box-shadow:var(--shadow), inset 0 1px 0 var(--grain);
}
/* 单色渐变文字: 深→浅, 不引入任何彩色 */
.grad-text { background:linear-gradient(120deg, var(--text), var(--text-dim));
  -webkit-background-clip:text; background-clip:text; color:transparent; }

/* ---- 按钮 ---- */
.btn {
  border:none; border-radius:13px; padding:9px 18px; font-size:14px; font-weight:650;
  color:var(--on-primary); background:var(--primary); box-shadow:var(--shadow-sm);
  transition:transform .15s, box-shadow .15s, opacity .15s, background .15s;
  min-height:38px;
}
.btn:hover { transform:translateY(-1px); }
.btn:active { transform:translateY(0); }
.btn:disabled { opacity:.5; transform:none; }
.btn.ghost {
  background:var(--glass-2); color:var(--text); border:1px solid var(--border);
  backdrop-filter:blur(18px); -webkit-backdrop-filter:blur(18px); box-shadow:none;
}
.btn.ghost:hover { background:var(--hover); transform:translateY(-1px); }
.btn.danger { background:var(--danger); color:var(--on-danger); }
.btn.danger-soft {
  background:color-mix(in srgb, var(--danger) 12%, transparent);
  color:var(--danger-ink); border:1px solid color-mix(in srgb, var(--danger) 32%, transparent);
  padding:5px 12px; font-size:12px; border-radius:10px; min-height:32px; box-shadow:none;
}
.btn.danger-soft:hover { background:color-mix(in srgb, var(--danger) 20%, transparent); transform:none; box-shadow:none; }
.btn.icon { padding:8px 13px; font-size:16px; line-height:1; border-radius:12px; }

/* ---- 表单控件 ---- */
input, select, textarea {
  background:var(--input); border:1px solid var(--border); border-radius:13px;
  padding:10px 14px; color:var(--text); font-size:14px; outline:none; font-family:inherit;
  backdrop-filter:blur(14px); -webkit-backdrop-filter:blur(14px);
  transition:border-color .18s, box-shadow .18s, background .18s;
}
input::placeholder, textarea::placeholder { color:var(--text-faint); }
input:focus, select:focus, textarea:focus {
  border-color:var(--border-strong);
  box-shadow:0 0 0 3px color-mix(in srgb, var(--text) 14%, transparent);
}
select option { color:#0d1524; background:#ffffff; }
:root[data-theme="dark"] select option { color:#e9eef6; background:#10151d; }
textarea { resize:vertical; font-family:inherit; line-height:1.6; }
input[type="checkbox"] { width:auto; accent-color:var(--primary); padding:0; }

/* ---- 表格: 桌面横排(可横向滚动), 文本按词折行而非硬拆字符 ---- */
table { width:100%; border-collapse:separate; border-spacing:0; font-size:13.5px; }
th { text-align:left; padding:12px 14px; color:var(--text-dim); font-weight:650;
  font-size:12.5px; letter-spacing:.4px; white-space:nowrap;
  border-bottom:1px solid var(--border); }
td { padding:11px 14px; border-bottom:1px solid var(--border);
  overflow-wrap:anywhere; vertical-align:middle; line-height:1.55; }
tbody tr:last-child td { border-bottom:none; }
tbody tr:nth-child(even) td { background:var(--stripe); }
tbody tr:hover td { background:var(--hover); }
.scroll-x { overflow-x:auto; -webkit-overflow-scrolling:touch; }
.scroll-x::-webkit-scrollbar, #drawer::-webkit-scrollbar { height:8px; width:8px; }
.scroll-x::-webkit-scrollbar-thumb, #drawer::-webkit-scrollbar-thumb {
  background:color-mix(in srgb, var(--text) 22%, transparent); border-radius:99px; }

.badge { display:inline-block; padding:3px 10px; border-radius:999px; font-size:12px;
  font-weight:650; letter-spacing:.2px; border:1px solid transparent; }
.badge.used { background:var(--hover); color:var(--text); border-color:var(--border); }
.badge.unused { background:color-mix(in srgb, var(--ok) 15%, transparent);
  color:var(--ok-ink); border-color:color-mix(in srgb, var(--ok) 32%, transparent); }
.badge.revoked, .badge.banned, .badge.error {
  background:color-mix(in srgb, var(--danger) 13%, transparent);
  color:var(--danger-ink); border-color:color-mix(in srgb, var(--danger) 34%, transparent); }
.mono { font-family:ui-monospace,SFMono-Regular,Consolas,monospace; letter-spacing:-.1px; }
.dim { color:var(--text-dim); }

/* ---- 左侧抽屉 ---- */
#drawer {
  position:fixed; left:0; top:0; bottom:0; width:244px; z-index:40;
  display:none;                                   /* 未登录不展示导航 */
  background:var(--glass-2);
  backdrop-filter:blur(34px) saturate(1.8); -webkit-backdrop-filter:blur(34px) saturate(1.8);
  border-right:1px solid var(--border);
  box-shadow:var(--shadow);
  padding:18px 14px calc(16px + env(safe-area-inset-bottom));
  flex-direction:column; overflow-y:auto; overscroll-behavior:contain;
  transition:margin-left .28s cubic-bezier(.4,0,.2,1), transform .28s cubic-bezier(.4,0,.2,1);
}
body.authed #drawer { display:flex; }
#drawer .brand { display:flex; align-items:center; gap:9px; padding:2px 8px 14px;
  font-size:17px; font-weight:900; letter-spacing:.5px; white-space:nowrap; }
.grp { font-size:10.5px; letter-spacing:2.4px; color:var(--text-faint);
  font-weight:800; margin:16px 10px 7px; }
.nav-item {
  display:flex; align-items:center; gap:11px; width:100%; min-height:44px;
  border:none; background:transparent; color:var(--text);
  font-size:14px; font-weight:600; padding:11px 13px; border-radius:14px;
  text-align:left; white-space:nowrap;
  transition:background .18s, color .18s, box-shadow .18s;
}
.nav-item:hover { background:var(--hover); }
.nav-item.active { color:var(--on-primary); background:var(--primary); box-shadow:var(--shadow-sm); }
.ic { width:18px; height:18px; flex:none; display:inline-block;
  fill:none; stroke:currentColor; stroke-width:1.8; stroke-linecap:round; stroke-linejoin:round; }
.nav-item .ic { width:18px; height:18px; }
#drawer .foot { margin-top:auto; padding-top:16px; border-top:1px solid var(--border);
  display:flex; gap:8px; }
#drawer .foot .btn { flex:1; padding:8px 10px; font-size:13px; min-height:40px;
  display:inline-flex; align-items:center; justify-content:center; gap:5px; }

/* 桌面折叠 */
body.collapsed #drawer { margin-left:-244px; }
body.collapsed #app { margin-left:0; }
#mask { position:fixed; inset:0; background:var(--scrim); z-index:35; display:none;
  backdrop-filter:blur(3px); -webkit-backdrop-filter:blur(3px); }
body.drawer-open #mask { display:block; }

/* ---- 主区 ---- */
#app { display:none; margin-left:244px; transition:margin-left .28s cubic-bezier(.4,0,.2,1); }
#app .inner { max-width:1440px; margin:0 auto; padding:0 28px 72px; }
header.top {
  position:sticky; top:0; z-index:20;
  display:flex; align-items:center; gap:10px; flex-wrap:wrap;
  padding:16px 0 15px; margin-bottom:8px;
  background:linear-gradient(180deg, var(--page) 74%, transparent);
}
header.top::after {
  content:''; position:absolute; left:0; right:0; bottom:0; height:1px;
  background:linear-gradient(90deg, var(--border), transparent 72%);
}
header.top h1 { font-size:20px; font-weight:800; letter-spacing:.3px; }
header.top .spacer { flex:1; }
section.view { display:none; }
section.view.active { display:block; }

/* 统计卡片 */
.grid.cards { display:grid; grid-template-columns:repeat(auto-fit,minmax(176px,1fr));
  gap:16px; margin-bottom:20px; }
.stat { padding:16px 18px 18px; position:relative; overflow:hidden; border-radius:20px; }
.stat .num { font-size:32px; font-weight:800; margin-top:2px; letter-spacing:-.5px;
  line-height:1.15; font-variant-numeric:tabular-nums; }
.stat .lbl { font-size:12.5px; color:var(--text-dim); letter-spacing:.3px; }
.stat::after {
  content:''; position:absolute; right:-30px; top:-30px; width:104px; height:104px;
  border-radius:50%; pointer-events:none;
  background:radial-gradient(circle, color-mix(in srgb, var(--text) 13%, transparent), transparent 72%);
}

/* 面板 */
.panel { padding:0; margin-bottom:20px; border-radius:20px; overflow:hidden;
  transition:box-shadow .2s; }
.panel:hover { box-shadow:0 14px 40px color-mix(in srgb, var(--text) 8%, transparent); }
.panel h2 {
  display:flex; align-items:center; gap:8px; flex-wrap:wrap; row-gap:8px;
  margin:0; padding:16px 20px 14px; border-bottom:1px solid var(--border);
  font-size:15.5px; font-weight:700;
}
.panel h2 .ic { width:17px; height:17px; }
.panel h2 .btn { margin-left:auto; padding:5px 13px; font-size:12.5px; min-height:32px; }
.panel > .row, .panel > .scroll-x, .panel > .note { margin-left:20px; margin-right:20px; }
.panel > .row:first-of-type { margin-top:16px; }
.panel > .row:last-child { margin-bottom:20px; }
.panel > .scroll-x:last-child, .panel > .note:last-child { margin-bottom:20px; }
.note { font-size:12.5px; line-height:1.8; }
.panel > .note { margin-top:16px; }

.row { display:flex; gap:12px; flex-wrap:wrap; align-items:center; margin-bottom:14px; }
.row > input, .row > select, .row > textarea { flex:1 1 auto; min-width:150px; }
.row > span, .row > label { font-size:13px; color:var(--text-dim); }
.row > label { display:flex; align-items:center; gap:6px; }
.empty { text-align:center; padding:30px 20px; color:var(--text-dim); font-size:14px; }

.grid.duo { display:block; }
@media (min-width:1100px) {
  .grid.duo { display:grid; grid-template-columns:1fr 1fr; gap:20px; align-items:start; }
  .grid.duo > .panel { margin-bottom:0; }
}

/* ---- Toast ---- */
#toast {
  position:fixed; left:50%; z-index:99; max-width:calc(100vw - 32px);
  bottom:calc(26px + env(safe-area-inset-bottom));
  transform:translateX(-50%) translateY(90px); opacity:0;
  padding:11px 22px; font-size:14px; font-weight:650; text-align:center;
  color:var(--on-primary); background:var(--primary);
  border-radius:999px; box-shadow:var(--shadow);
  transition:transform .3s, opacity .3s; word-break:break-word;
}
#toast.show { transform:translateX(-50%) translateY(0); opacity:1; }

/* ---- 登录 ---- */
#login { display:none; min-height:100vh; min-height:100dvh;
  align-items:center; justify-content:center; padding:24px; }
#login .box { width:min(420px,100%); padding:38px 32px; text-align:center; border-radius:26px; }
#login h1 { font-size:23px; font-weight:800; margin:16px 0 6px; }
#login p { color:var(--text-dim); font-size:13px; margin-bottom:22px; }
#login input { width:100%; margin-bottom:14px; text-align:center; }
#login .btn { width:100%; padding:12px; min-height:46px; letter-spacing:4px; }

/* ---- 主题切换按钮 ---- */
.ic-moon { display:none; }
:root[data-theme="dark"] .ic-moon { display:inline-block; }
:root[data-theme="dark"] .ic-sun { display:none; }

/* ---- 二次确认弹窗 ---- */
#confirm { display:none; position:fixed; inset:0; z-index:120;
  align-items:center; justify-content:center; padding:20px;
  background:var(--scrim); backdrop-filter:blur(6px); -webkit-backdrop-filter:blur(6px); }
#confirm.show { display:flex; }
#confirm .box { width:min(440px,100%); padding:26px 24px 20px; border-radius:22px; }
#confirm h3 { font-size:17px; font-weight:800; margin:0 0 10px; display:flex; align-items:center; gap:8px; }
#confirm p { font-size:13.5px; line-height:1.7; color:var(--text-dim); margin:0 0 12px; }
#confirm .impact {
  max-height:200px; overflow:auto; margin-bottom:16px; padding:12px 14px; border-radius:14px;
  background:var(--hover); font-size:13px; line-height:1.8;
}
#confirm .impact b { font-weight:700; }
#confirm .impact .n { float:right; color:var(--danger-ink); font-weight:700; }
#confirm .acts { display:flex; gap:10px; justify-content:flex-end; }
#confirm .acts .btn { min-width:96px; }

/* 设备管理弹窗（2026-10-11 新增）：复用 confirm 的视觉规范 */
#devModal { display:none; position:fixed; inset:0; z-index:120;
  align-items:center; justify-content:center; padding:20px;
  background:var(--scrim); backdrop-filter:blur(6px); -webkit-backdrop-filter:blur(6px); }
#devModal.show { display:flex; }
#devModal .box { width:min(480px,100%); padding:26px 24px 20px; border-radius:22px; }
#devModal h3 { font-size:17px; font-weight:800; margin:0 0 10px; display:flex; align-items:center; gap:8px; }
#devModal .dim { font-size:13px; color:var(--text-dim); }
#devModal .impact {
  max-height:260px; overflow:auto; margin-bottom:16px; padding:12px 14px; border-radius:14px;
  background:var(--hover); font-size:13px; line-height:1.9;
}
#devModal .impact .n { float:right; color:var(--text-dim); font-size:12px; }
#devModal .acts { display:flex; gap:10px; justify-content:flex-end; }
#devModal .acts .btn { min-width:96px; }

/* ============================================================
   响应式: 移动端适配
   ≤900px  抽屉改为浮出式(遮罩 + 侧滑)
   ≤760px  表格转卡片、表单纵向堆叠、弹窗变底部面板
   ============================================================ */
@media (max-width:900px) {
  #drawer { transform:translateX(-102%); box-shadow:0 0 60px rgba(0,0,0,.35); }
  body.drawer-open #drawer { transform:translateX(0); }
  /* 覆盖桌面折叠态的负 margin(特异性相同, 靠后声明生效) */
  body.collapsed #drawer { margin-left:0; }
  #app, body.collapsed #app { margin-left:0; }
}

@media (max-width:760px) {
  #app .inner { padding:0 14px calc(60px + env(safe-area-inset-bottom)); }
  header.top { padding:12px 0 12px; margin-bottom:6px; gap:8px; }
  header.top h1 { font-size:17px; }
  .btn { min-height:42px; padding:9px 15px; }
  .btn.danger-soft { min-height:40px; }   /* 覆盖桌面 32px, 保证触控够大 */

  /* 统计卡片: 两列 */
  .grid.cards { grid-template-columns:repeat(2,minmax(0,1fr)); gap:10px; }
  .stat { padding:13px 14px 14px; border-radius:16px; }
  .stat .num { font-size:25px; }
  .stat .lbl { font-size:11.5px; }

  /* 面板与表单 */
  .panel h2 { padding:14px 15px 12px; font-size:14.5px; }
  .panel > .row, .panel > .scroll-x, .panel > .note { margin-left:15px; margin-right:15px; }
  .row { flex-direction:column; align-items:stretch; gap:10px; }
  .row > input, .row > select, .row > textarea {
    flex:0 0 auto !important; width:100% !important; min-width:0 !important; }
  .row > label { justify-content:flex-start; }

  /* 表格 → 卡片: 表头隐藏, 每行一张玻璃卡, 单元格标签置顶 */
  .scroll-x { overflow-x:visible; }
  .scroll-x table, .scroll-x tbody, .scroll-x tr { display:block; width:100%; }
  .scroll-x thead, .scroll-x tr.hrow { display:none; }   /* 表头行不参与卡片 */
  .scroll-x tbody tr {
    border:1px solid var(--border); border-radius:16px; overflow:hidden;
    margin-bottom:12px; padding:4px 0; background:var(--glass-2);
    box-shadow:var(--shadow-sm); transition:border-color .18s;
  }
  .scroll-x tbody tr:hover { border-color:var(--border-strong); }
  .scroll-x tbody tr:last-child { margin-bottom:0; }
  .scroll-x td {
    display:flex; flex-direction:column; align-items:stretch; gap:5px;
    width:100%; padding:9px 15px; text-align:left;
    background:transparent !important;             /* 关掉桌面斑马纹/悬停底色 */
    border-bottom:1px solid var(--border);
  }
  .scroll-x td[data-label]::before {
    content:attr(data-label); color:var(--text-dim);
    font-size:11.5px; font-weight:700; letter-spacing:.5px;
  }
  .scroll-x td:last-child { border-bottom:none; }
  .scroll-x td.empty { display:block; text-align:center; padding:26px 16px; background:transparent !important; }
  /* 操作列: 没有表头文字, 横排按钮铺满可点区域 */
  .scroll-x td:not(.empty):not([data-label]) {
    flex-direction:row; flex-wrap:wrap; gap:8px; align-items:center; padding-top:5px; }
  .scroll-x td:not(.empty):not([data-label]) > .btn { flex:1 1 92px; min-height:42px; }
  /* 表单组(如授权套餐三件套)铺满一行 */
  .scroll-x td > div { width:100%; }
  .scroll-x td > div > select, .scroll-x td > div > input {
    flex:1 1 92px !important; width:auto !important; min-width:0; }
  .scroll-x td > div > .btn { flex:1 1 92px; }

  /* 破坏性操作弹窗 → 底部面板 */
  #confirm { align-items:flex-end; padding:0; }
  #confirm .box { width:100%; border-radius:24px 24px 0 0;
    padding:24px 18px calc(18px + env(safe-area-inset-bottom)); }
  #confirm .acts .btn { flex:1; min-width:0; }

  /* 输入框字号 ≥16px, 防止 iOS 聚焦自动放大。
     表格卡里的控件带着行内小字号, 必须用 !important 覆盖。 */
  input, select, textarea { font-size:16px !important; padding:11px 14px !important; }
  .scroll-x input, .scroll-x select { padding:10px 12px !important; }
  .scroll-x .btn { font-size:13.5px !important; }
  #login .box { padding:32px 22px; }
  #login h1 { font-size:21px; }
  #toast { font-size:13.5px; padding:10px 18px; }
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
  <symbol id="i-sun" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.6v2.2M12 19.2v2.2M2.6 12h2.2M19.2 12h2.2M5.2 5.2l1.6 1.6M17.2 17.2l1.6 1.6M18.8 5.2l-1.6 1.6M6.8 17.2l-1.6 1.6"/></symbol>
  <symbol id="i-moon" viewBox="0 0 24 24"><path d="M20.5 14.8A8.7 8.7 0 0 1 9.2 3.5a8.8 8.8 0 1 0 11.3 11.3Z" fill="currentColor" stroke="none"/></symbol>
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
    <input id="tk" type="password" placeholder="ADMIN_TOKEN" autocomplete="current-password">
    <button class="btn" onclick="doLogin()">进 入</button>
    <div id="loginErr" class="dim" style="margin-top:12px; font-size:13px; min-height:18px; color:var(--danger-ink);"></div>
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

  <div class="grp">AI 模型</div>
  <button class="nav-item" data-v="prov" onclick="show('prov')"><svg class="ic" aria-hidden="true"><use href="#i-diamond"></use></svg> 供应商配置</button>
  <button class="nav-item" data-v="inst" onclick="show('inst')"><svg class="ic" aria-hidden="true"><use href="#i-diamond"></use></svg> Agent 实例授权</button>

  <div class="grp">用户管理</div>
  <button class="nav-item" data-v="usr" onclick="show('usr')"><svg class="ic" aria-hidden="true"><use href="#i-users"></use></svg> 用户列表</button>

  <div class="grp">运营监控</div>
  <button class="nav-item" data-v="usage" onclick="show('usage')"><svg class="ic" aria-hidden="true"><use href="#i-chart"></use></svg> 用量统计</button>
  <button class="nav-item" data-v="audit" onclick="show('audit')"><svg class="ic" aria-hidden="true"><use href="#i-shield"></use></svg> 审计日志</button>

  <div class="foot">
    <button class="btn ghost" onclick="toggleTheme()" title="纯白 / 深色 切换">
      <svg class="ic ic-sun" style="width:15px; height:15px;" aria-hidden="true"><use href="#i-sun"></use></svg>
      <svg class="ic ic-moon" style="width:15px; height:15px;" aria-hidden="true"><use href="#i-moon"></use></svg>
      外观
    </button>
    <button class="btn ghost" onclick="doLogout()">退出</button>
  </div>
</aside>

<!-- 主界面 -->
<div id="app">
 <div class="inner">
  <header class="top">
    <button class="btn ghost icon" onclick="toggleDrawer()" title="展开/收起导航" aria-label="展开/收起导航"><svg class="ic" style="width:17px; height:17px;" aria-hidden="true"><use href="#i-menu"></use></svg></button>
    <h1 id="pageTitle">首页</h1>
    <div class="spacer"></div>
    <button class="btn ghost icon" id="themeBtn" onclick="toggleTheme()" title="纯白 / 深色 切换" aria-label="切换纯白或深色主题">
      <svg class="ic ic-sun" style="width:17px; height:17px;" aria-hidden="true"><use href="#i-sun"></use></svg>
      <svg class="ic ic-moon" style="width:17px; height:17px;" aria-hidden="true"><use href="#i-moon"></use></svg>
    </button>
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
      <div class="dim note" id="dashNote">加载中...</div>
    </div>
  </section>

  <section id="v-grant" class="view">
    <div class="panel glass">
      <h2><svg class="ic" aria-hidden="true"><use href="#i-key"></use></svg> 账号授权 <button class="btn ghost" onclick="loadGrant()">刷新</button></h2>
      <div class="dim note">
        直接为账号设置套餐（卡密已下线）。模式：<b>设置</b> = 从现在起算；<b>顺延</b> = 在现有到期时间上叠加（更高套餐未过期时保留高套餐仅顺延）。
        free = 撤销授权。
      </div>
      <div class="scroll-x"><table id="grantTable"></table></div>
    </div>
  </section>

  <section id="v-usr" class="view">
    <div class="panel glass">
      <h2><svg class="ic" aria-hidden="true"><use href="#i-users"></use></svg> 用户列表 <button class="btn ghost" onclick="loadUsers()">刷新</button></h2>
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
      <h2><svg class="ic" aria-hidden="true"><use href="#i-shield"></use></svg> 审计日志 <button class="btn ghost" onclick="loadAudit()">刷新</button></h2>
      <div class="scroll-x"><table id="auditTable"></table></div>
    </div>
  </section>

  <section id="v-ann" class="view">
    <div class="panel glass">
      <h2><svg class="ic" aria-hidden="true"><use href="#i-mega"></use></svg> 发布/编辑公告</h2>
      <div class="row"><input id="annTitle" placeholder="公告标题"></div>
      <div class="row"><textarea id="annContent" rows="5" placeholder="公告正文（App 内弹窗展示）" style="width:100%; min-width:220px;"></textarea></div>
      <div class="row">
        <span class="dim">版本范围（留空 = 全部版本）：</span>
        <input id="annMin" placeholder="最低版本 如 0.2.33">
        <input id="annMax" placeholder="最高版本 如 0.2.40">
        <label><input type="checkbox" id="annEnabled" checked> 启用</label>
      </div>
      <div class="row">
        <button class="btn" onclick="saveAnnouncement()">发布</button>
        <button class="btn ghost" onclick="resetAnnForm()">清空表单</button>
        <span class="dim" id="annEditing" style="font-size:12px;"></span>
      </div>
    </div>
    <div class="panel glass">
      <h2><svg class="ic" aria-hidden="true"><use href="#i-list"></use></svg> 公告列表 <button class="btn ghost" onclick="loadAnnouncements()">刷新</button></h2>
      <div class="scroll-x"><table id="annTable"></table></div>
    </div>
  </section>

  <section id="v-prov" class="view">
    <div class="panel glass">
      <h2><svg class="ic" aria-hidden="true"><use href="#i-diamond"></use></svg> 新建/编辑 AI 模型供应商</h2>
      <div class="row">
        <input id="pvName" placeholder="展示名，如 官方中转" style="flex:1; min-width:180px;">
        <input id="pvBase" placeholder="上游根地址，如 https://api.example.com/v1" style="flex:2; min-width:260px;">
      </div>
      <div class="row">
        <input id="pvKey" type="password" placeholder="API Key（编辑时留空 = 不改动已有 Key）" style="flex:1; min-width:220px;">
        <input id="pvSort" type="number" placeholder="排序（小的优先）" style="width:150px;" value="0">
      </div>
      <div class="row">
        <textarea id="pvModels" rows="4" placeholder='模型列表(JSON 数组)，如 [{"name":"gpt-4o-mini","label":"GPT-4o mini","contextWindow":128000}]' style="width:100%; min-width:220px;"></textarea>
      </div>
      <div class="row">
        <button class="btn" onclick="saveProvider()">保存</button>
        <button class="btn ghost" onclick="resetProviderForm()">清空表单</button>
        <label><input type="checkbox" id="pvEnabled" checked> 启用（停用后 App 端不再显示云端模型）</label>
        <span class="dim" id="pvEditing" style="font-size:12px;"></span>
      </div>
      <p class="dim note">
        API Key 用 JWT_SECRET 派生密钥加密后存库，永不回传给 App；更换 JWT_SECRET 会导致已存 Key 无法解密，需重新录入。<br>
        计费口径：一轮对话 = 一次请求（无论该轮工具调用多少次），消耗 1 点周额度。额度每周一 00:00（UTC+8）自动归零。
      </p>
    </div>
    <div class="panel glass">
      <h2><svg class="ic" aria-hidden="true"><use href="#i-list"></use></svg> 已配置供应商 <button class="btn ghost" onclick="loadProviders()">刷新</button></h2>
      <div class="scroll-x"><table id="pvTable"></table></div>
    </div>
    <div class="panel glass">
      <h2><svg class="ic" aria-hidden="true"><use href="#i-chart"></use></svg> 本周云端额度用量 <button class="btn ghost" onclick="loadWeeklyUsage()">刷新</button></h2>
      <div class="scroll-x"><table id="pvUsageTable"></table></div>
    </div>
  </section>

  <section id="v-inst" class="view">
    <div class="panel glass">
      <h2><svg class="ic" aria-hidden="true"><use href="#i-diamond"></use></svg> 开通/编辑用户 Agent 实例</h2>
      <div class="row">
        <input id="aiUserId" placeholder="用户 ID（管理台用户列表可复制，如 u_xxxx）" style="flex:2; min-width:260px;">
        <input id="aiLabel" placeholder="App 内显示名（默认「云端 Agent」）" style="flex:1; min-width:180px;">
      </div>
      <div class="row">
        <input id="aiBaseUrl" placeholder="实例地址，如 https://my-forge.example.com（不含 /api）" style="flex:2; min-width:260px;">
      </div>
      <div class="row">
        <input id="aiApiKey" type="password" placeholder="API Key（该实例的 AGENT_API_KEY；编辑时留空 = 不改动）" style="flex:1; min-width:260px;">
        <label><input type="checkbox" id="aiEnabled" checked> 启用（停用后该用户 App 内入口消失）</label>
      </div>
      <div class="row">
        <button class="btn" onclick="saveAgentInstance()">保存授权</button>
        <button class="btn ghost" onclick="clearAgentInstanceForm()">清空表单</button>
      </div>
      <p class="dim note">
        用户自行部署 orion-forge 后，把它的地址与 AGENT_API_KEY 填在这里即可开通。<br>
        App 端<b>不提供任何填写入口</b>，也看不到这个地址与密钥——只知道自己有「云端 Agent」可用。未开通的用户不显示任何入口。
      </p>
    </div>
    <div class="panel glass">
      <h2><svg class="ic" aria-hidden="true"><use href="#i-list"></use></svg> 已授权实例 <button class="btn ghost" onclick="loadAgentInstances()">刷新</button></h2>
      <div class="scroll-x"><table id="aiTable"></table></div>
    </div>
  </section>
 </div>
</div>
<div id="toast"></div>

<!-- 破坏性操作二次确认（删除用户等）。内容由 confirmDeleteUser 填。 -->
<div id="confirm">
  <div class="box glass">
    <h3><svg class="ic" aria-hidden="true" style="width:19px;height:19px;vertical-align:-4px;"><use href="#i-shield"></use></svg><span id="cfTitle">确认删除</span></h3>
    <p id="cfDesc"></p>
    <div class="impact" id="cfImpact"></div>
    <div class="acts">
      <button class="btn ghost" id="cfCancel">取消</button>
      <button class="btn danger" id="cfOk">确认删除</button>
    </div>
  </div>
</div>

<!-- 设备管理（2026-10-11 新增）：查看/解绑用户设备。内容由 showDevices 填。 -->
<div id="devModal">
  <div class="box glass">
    <h3><svg class="ic" aria-hidden="true" style="width:19px;height:19px;vertical-align:-4px;"><use href="#i-users"></use></svg><span id="devTitle">设备管理</span></h3>
    <p id="devQuota" class="dim"></p>
    <div class="impact" id="devList"><div class="dim">加载中…</div></div>
    <div class="acts">
      <button class="btn ghost" onclick="closeDevices()">关闭</button>
      <button class="btn ghost" onclick="showDevices(_devUserId)">刷新</button>
    </div>
  </div>
</div>

<script>
// EdgeOne 部署时函数挂在 /api/* 下(前缀 /api); 本地 dev 直接是根路径。
var APIBASE = (location.pathname.indexOf('/api') === 0 ? '/api' : '') + '/admin';
var TOKEN = localStorage.getItem('orion_admin_token') || '';
var VIEW_META = { dash:'首页', grant:'账号授权', ann:'公告管理', prov:'供应商配置', inst:'Agent 实例授权', usr:'用户列表', usage:'用量统计', audit:'审计日志' };
// 抽屉浮出断点, 必须与 CSS @media (max-width:900px) 保持一致
var MOBILE_W = 900;

/**
 * 统一的接口调用。
 *
 * ⚠️ 超时保护（2026-10-11 管理台「删除卡死」修复）：
 * 管理台所有请求与 App 的云端 Agent 长流共用同一个云函数，繁忙时请求会
 * 排队；而 fetch 默认**永不超时** —— 请求一挂起，界面就永远停在上一个
 * 状态（按钮禁用、toast 不消失、列表空白），用户只能强制刷新。这里给每个
 * 请求套上 AbortController，超时后抛出可读错误，界面总能恢复可操作。
 *
 * @param opts.timeout 超时毫秒数，默认 20s；删除等重操作可传更长。
 */
function api(path, opts) {
  opts = opts || {};
  var timeout = opts.timeout || 20000;
  opts.headers = Object.assign({'Authorization': 'Bearer ' + TOKEN}, opts.headers || {});
  if (opts.body && typeof opts.body !== 'string') { opts.body = JSON.stringify(opts.body); opts.headers['Content-Type'] = 'application/json'; }

  var ctrl = (typeof AbortController !== 'undefined') ? new AbortController() : null;
  var timer = null;
  if (ctrl) {
    opts.signal = ctrl.signal;
    timer = setTimeout(function() { try { ctrl.abort(); } catch (e) {} }, timeout);
  }
  var clear = function() { if (timer) { clearTimeout(timer); timer = null; } };

  return fetch(APIBASE + path, opts).then(function(r) {
    clear();
    if (r.status === 401) { doLogout(true); throw new Error('令牌无效'); }
    return r.json();
  }, function(e) { clear(); throw e; }).catch(function(e) {
    clear();
    if (e && e.name === 'AbortError') {
      throw new Error('请求超时（' + Math.round(timeout / 1000) + ' 秒无响应），请重试');
    }
    throw e;
  });
}

/**
 * 带超时的 fetch 信号（供登录校验等不走 api() 的请求使用）。
 *
 * 页面初始化那次 fetch('/users') 此前是裸 fetch —— 请求一挂起就既不
 * 进入应用也不提示错误，管理员强制刷新后只能停在登录页干等，正是
 * 「刷新后用户页面出不来」的成因。这里让它最多等 ms 毫秒。
 */
function timeoutSignal(ms) {
  if (typeof AbortController === 'undefined') {
    return { signal: undefined, clear: function () {} };
  }
  var ctrl = new AbortController();
  var timer = setTimeout(function () { try { ctrl.abort(); } catch (e) {} }, ms);
  return { signal: ctrl.signal, clear: function () { clearTimeout(timer); } };
}

/**
 * 表格加载态占位。
 *
 * 之前列表在请求期间保持上一次的内容（首次进入则是空白），管理员点「刷新」
 * 或删除后看不出到底在不在加载，容易判定为卡死。现在先落一行明确的
 * 「加载中…」，请求无论成功失败都会覆盖它。
 */
function renderLoading(id, cols) {
  var el = document.getElementById(id);
  if (el) el.innerHTML = '<tr><td colspan="' + cols + '" class="empty">加载中…</td></tr>';
}
function toast(msg) {
  var t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  setTimeout(function(){ t.classList.remove('show'); }, 2200);
}
// 2026-10-11 安全修复（P0）：esc 追加引号转义。
// 原实现 textContent→innerHTML 只转义 & < >，不转义单双引号——
// 而 email 是用户可控字段（注册正则允许单引号），曾被直接拼进
// onclick 的 JS 字符串里造成存储型 XSS。现统一转义引号；
// 用户可控字段的按钮改走 data-* + 事件委托，不再拼 JS 字符串。
function esc(s) {
  var d = document.createElement('div');
  d.textContent = s == null ? '' : String(s);
  return d.innerHTML.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function fmtTime(ms) { if (!ms) return '—'; var d = new Date(Number(ms)); return d.toLocaleString('zh-CN', {hour12:false}); }

/**
 * 渲染表格并按表头给每个 td 打上 data-label。
 * 移动端(≤760px)表格转卡片后, 单元格靠 data-label 显示列名;
 * 桌面端不受影响(标签只在媒体查询里出现)。
 * colspan 的空态行、空表头列不打标签。
 */
function renderTable(id, html) {
  var el = document.getElementById(id);
  el.innerHTML = html;
  var trs = el.querySelectorAll('tr');
  if (!trs.length) return;
  var heads = trs[0].querySelectorAll('th');
  if (!heads.length) return;
  // 表头行没有用 thead 包裹, 只是一条普通首行; 移动端卡片化时
  // 只把 thead 设为 display:none 藏不掉它, 这里打标记交给 CSS 处理。
  trs[0].classList.add('hrow');
  var labels = [];
  for (var i = 0; i < heads.length; i++) labels.push(heads[i].textContent.trim());
  for (var r = 1; r < trs.length; r++) {
    var tds = trs[r].querySelectorAll('td');
    for (var c = 0; c < tds.length && c < labels.length; c++) {
      if (!labels[c] || tds[c].getAttribute('colspan')) continue;
      tds[c].setAttribute('data-label', labels[c]);
    }
  }
}

// ---------- 主题: 只有纯白 / 深色两套 ----------
function setTheme(t) {
  var v = t === 'dark' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', v);
  localStorage.setItem('orion_admin_theme', v);
  var meta = document.querySelector('meta[name="theme-color"]');
  if (meta && meta.setAttribute) meta.setAttribute('content', v === 'dark' ? '#05070c' : '#ffffff');
}
function toggleTheme() {
  var isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  setTheme(isDark ? 'light' : 'dark');
  toast(isDark ? '已切换到纯白模式' : '已切换到深色模式');
}
function currentTheme() {
  var t = document.documentElement.getAttribute('data-theme');
  return t === 'dark' ? 'dark' : 'light';
}

// ---------- 抽屉: 桌面折叠 / 移动端浮出 ----------
function toggleDrawer() {
  if (window.innerWidth <= MOBILE_W) document.body.classList.toggle('drawer-open');
  else document.body.classList.toggle('collapsed');
}
function closeDrawerIfMobile() {
  if (window.innerWidth <= MOBILE_W) document.body.classList.remove('drawer-open');
}

// ---------- 登录 ----------
function doLogin() {
  var v = document.getElementById('tk').value.trim();
  if (!v) return;
  TOKEN = v;
  var err = document.getElementById('loginErr');
  err.textContent = '验证中…';
  var ts = timeoutSignal(15000);
  fetch(APIBASE + '/users', {headers: {'Authorization': 'Bearer ' + TOKEN}, signal: ts.signal})
    .then(function(r) {
      ts.clear();
      if (r.status === 401) { err.textContent = '令牌无效'; return null; }
      if (!r.ok) { err.textContent = '服务异常 (' + r.status + ')'; return null; }
      err.textContent = '';
      localStorage.setItem('orion_admin_token', TOKEN);
      enterApp(); return null;
    })
    .catch(function(e) {
      ts.clear();
      err.textContent = (e && e.name === 'AbortError') ? '连接超时，请重试' : '网络错误';
    });
}
function doLogout(silent) {
  TOKEN = ''; localStorage.removeItem('orion_admin_token');
  document.body.classList.remove('authed', 'drawer-open');
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
  closeDrawerIfMobile();
  if (v === 'dash') loadDashboard();
  if (v === 'grant') loadGrant();
  if (v === 'ann') loadAnnouncements();
  if (v === 'prov') { loadProviders(); loadWeeklyUsage(); }
  if (v === 'inst') loadAgentInstances();
  if (v === 'usr') loadUsers();
  if (v === 'usage') loadUsage();
  if (v === 'audit') loadAudit();
}
function enterApp() {
  document.body.classList.add('authed');
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
    var html = '<tr><th>邮箱</th><th>当前套餐</th><th>到期</th><th>授权操作</th><th></th></tr>';
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
        + '<button class="btn" style="padding:6px 14px; font-size:12px;" onclick="setPlan(\\'' + uid + '\\')">应用</button>'
        + '</div></td>'
        + '<td><button class="btn ' + (u.status === 'banned' ? '' : 'danger') + '" style="padding:4px 12px; font-size:12px;" onclick="setBan(\\'' + uid + '\\',' + (u.status === 'banned') + ')">' + (u.status === 'banned' ? '解封' : '封禁') + '</button></td></tr>';
    }
    renderTable('grantTable', html);
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

// ---------- 用户 Agent 实例授权（orion-forge）----------
function clearAgentInstanceForm() {
  document.getElementById('aiUserId').value = '';
  document.getElementById('aiLabel').value = '';
  document.getElementById('aiBaseUrl').value = '';
  document.getElementById('aiApiKey').value = '';
  document.getElementById('aiEnabled').checked = true;
}
function loadAgentInstances() {
  renderLoading('aiTable', 7);
  api('/agent-instances').then(function(r) {
    var rows = r.instances || [];
    var html = '<tr><th>用户</th><th>邮箱</th><th>实例地址</th><th>显示名</th><th>Key</th><th>状态</th><th></th></tr>';
    if (!rows.length) html += '<tr><td colspan="7" class="empty">尚未给任何用户开通 —— App 端不显示任何入口</td></tr>';
    for (var i = 0; i < rows.length; i++) {
      var a = rows[i];
      html += '<tr><td class="dim">' + esc(a.userId) + '</td>'
        + '<td>' + esc(a.email || '—') + '</td>'
        + '<td class="dim" style="max-width:240px;">' + esc(a.baseUrl) + '</td>'
        + '<td>' + esc(a.label || '云端 Agent') + '</td>'
        + '<td class="dim">' + (a.keyConfigured ? '已配置' : '—') + '</td>'
        + '<td><span class="badge ' + (a.enabled ? 'unused' : 'revoked') + '">' + (a.enabled ? '已开通' : '已停用') + '</span></td>'
        + '<td style="white-space:nowrap;">'
        + '<button class="btn ghost" style="padding:4px 10px; font-size:12px;" onclick="editAgentInstance(\\'' + esc(a.userId) + '\\')">编辑</button> '
        + '<button class="btn danger" style="padding:4px 10px; font-size:12px;" onclick="deleteAgentInstance(\\'' + esc(a.userId) + '\\')">删除</button></td></tr>';
    }
    renderTable('aiTable', html);
  }).catch(function(e) { if (TOKEN) toast('加载失败: ' + e.message); });
}
function saveAgentInstance() {
  var body = {
    userId: document.getElementById('aiUserId').value.trim(),
    baseUrl: document.getElementById('aiBaseUrl').value.trim(),
    apiKey: document.getElementById('aiApiKey').value.trim(),
    label: document.getElementById('aiLabel').value.trim(),
    enabled: document.getElementById('aiEnabled').checked
  };
  if (!body.userId || !body.baseUrl) { toast('用户 ID 与实例地址不能为空'); return; }
  // 不在前端判断 Key 是否必填：新建时后端会拒（"新建实例必须填写 API Key"），
  // 编辑时留空表示不改。前端硬判反而需要缓存状态，徒增复杂度。
  api('/agent-instances', {method:'POST', body: body}).then(function() {
    toast('已保存授权');
    clearAgentInstanceForm(); loadAgentInstances();
  }).catch(function(e) { toast('保存失败: ' + e.message); });
}
function editAgentInstance(userId) {
  api('/agent-instances').then(function(r) {
    var rows = r.instances || [];
    for (var i = 0; i < rows.length; i++) {
      if (rows[i].userId === userId) {
        document.getElementById('aiUserId').value = rows[i].userId;
        document.getElementById('aiBaseUrl').value = rows[i].baseUrl;
        document.getElementById('aiLabel').value = rows[i].label || '';
        document.getElementById('aiEnabled').checked = !!rows[i].enabled;
        // Key 不回显，留空即不改
        document.getElementById('aiApiKey').value = '';
        window.scrollTo(0, 0);
        return;
      }
    }
  }).catch(function(e) { toast('加载失败: ' + e.message); });
}
function deleteAgentInstance(userId) {
  if (!window.confirm('确认删除该用户的 Agent 授权？App 内的入口会立即消失。')) return;
  // 超时给到 30s：云函数繁忙时请求会排队，但不能让它无限挂起。
  api('/agent-instances/' + encodeURIComponent(userId), {method:'DELETE', timeout:30000}).then(function() {
    toast('已删除授权');
    // 刷新失败也要有反馈：列表自身的 catch 会 toast，这里不再二次提示。
    loadAgentInstances();
  }).catch(function(e) { toast('删除失败: ' + e.message); });
}

// ---------- AI 模型供应商 ----------
var editingProviderId = '';
function resetProviderForm() {
  editingProviderId = '';
  document.getElementById('pvName').value = '';
  document.getElementById('pvBase').value = '';
  document.getElementById('pvKey').value = '';
  document.getElementById('pvSort').value = '0';
  document.getElementById('pvModels').value = '';
  document.getElementById('pvEnabled').checked = true;
  document.getElementById('pvEditing').textContent = '';
}
function parseModelsInput(raw) {
  var s = (raw || '').trim();
  if (!s) return [];
  var parsed = JSON.parse(s);          // 语法错会抛, 由调用方 catch
  if (!Array.isArray(parsed)) throw new Error('模型列表必须是 JSON 数组');
  for (var i = 0; i < parsed.length; i++) {
    if (!parsed[i] || !parsed[i].name) throw new Error('第 ' + (i + 1) + ' 个模型缺少 name 字段');
  }
  return parsed;
}
function loadProviders() {
  api('/providers').then(function(r) {
    var rows = r.providers || [];
    var html = '<tr><th>名称</th><th>上游地址</th><th>模型</th><th>Key</th><th>排序</th><th>状态</th><th></th></tr>';
    if (!rows.length) html += '<tr><td colspan="7" class="empty">暂无供应商 —— App 端不会显示云端模型</td></tr>';
    for (var i = 0; i < rows.length; i++) {
      var p = rows[i];
      var ms = p.models || [];
      var names = [];
      for (var j = 0; j < ms.length; j++) names.push(ms[j].label || ms[j].name);
      html += '<tr><td><b>' + esc(p.name) + '</b></td>'
        + '<td class="dim" style="max-width:280px;">' + esc(p.baseUrl) + '</td>'
        + '<td class="dim" style="max-width:260px;">' + esc(names.join(', ') || '—') + '</td>'
        + '<td class="dim">' + esc(p.keyState || '已配置') + '</td>'
        + '<td class="dim">' + esc(String(p.sort)) + '</td>'
        + '<td><span class="badge ' + (p.enabled ? 'unused' : 'revoked') + '">' + (p.enabled ? '启用中' : '已停用') + '</span></td>'
        + '<td style="white-space:nowrap;">'
        + '<button class="btn ghost" style="padding:4px 10px; font-size:12px;" onclick="editProvider(\\'' + esc(p.id) + '\\')">编辑</button> '
        + '<button class="btn ghost" style="padding:4px 10px; font-size:12px;" onclick="toggleProvider(\\'' + esc(p.id) + '\\')">' + (p.enabled ? '停用' : '启用') + '</button> '
        + '<button class="btn danger" style="padding:4px 10px; font-size:12px;" onclick="deleteProvider(\\'' + esc(p.id) + '\\')">删除</button></td></tr>';
    }
    renderTable('pvTable', html);
  }).catch(function(e) { if (TOKEN) toast('加载失败: ' + e.message); });
}
function saveProvider() {
  var body = {
    name: document.getElementById('pvName').value.trim(),
    baseUrl: document.getElementById('pvBase').value.trim(),
    apiKey: document.getElementById('pvKey').value.trim(),
    sort: Number(document.getElementById('pvSort').value) || 0,
    enabled: document.getElementById('pvEnabled').checked
  };
  if (!body.name || !body.baseUrl) { toast('名称与上游地址不能为空'); return; }
  if (!editingProviderId && !body.apiKey) { toast('新建时 API Key 不能为空'); return; }
  try {
    body.models = parseModelsInput(document.getElementById('pvModels').value);
  } catch (e) {
    toast('模型列表格式错误: ' + e.message); return;
  }
  if (!body.models.length) { toast('至少配置一个模型'); return; }
  if (editingProviderId) body.id = editingProviderId;
  api('/providers', {method:'POST', body: body}).then(function() {
    toast(editingProviderId ? '供应商已更新' : '供应商已创建');
    resetProviderForm(); loadProviders();
  }).catch(function(e) { toast('保存失败: ' + e.message); });
}
function editProvider(id) {
  api('/providers').then(function(r) {
    var rows = r.providers || [];
    for (var i = 0; i < rows.length; i++) {
      if (rows[i].id === id) {
        editingProviderId = id;
        document.getElementById('pvName').value = rows[i].name;
        document.getElementById('pvBase').value = rows[i].baseUrl;
        // Key 不回显, 留空表示不改动
        document.getElementById('pvKey').value = '';
        document.getElementById('pvSort').value = String(rows[i].sort);
        document.getElementById('pvModels').value = JSON.stringify(rows[i].models || [], null, 2);
        document.getElementById('pvEnabled').checked = !!rows[i].enabled;
        document.getElementById('pvEditing').textContent = '正在编辑: ' + rows[i].name + '（Key 留空即不改动）';
        window.scrollTo(0, 0);
        return;
      }
    }
  }).catch(function(e) { toast('加载失败: ' + e.message); });
}
function toggleProvider(id) {
  api('/providers').then(function(r) {
    var rows = r.providers || [];
    for (var i = 0; i < rows.length; i++) {
      if (rows[i].id !== id) continue;
      var body = {
        id: id,
        name: rows[i].name,
        baseUrl: rows[i].baseUrl,
        apiKey: '',                 // 不改动已有 Key
        models: rows[i].models || [],
        enabled: !rows[i].enabled,
        sort: rows[i].sort
      };
      return api('/providers', {method:'POST', body: body}).then(function() {
        toast(body.enabled ? '已启用' : '已停用'); loadProviders();
      }).catch(function(e) { toast('操作失败: ' + e.message); });
    }
  }).catch(function(e) { toast('加载失败: ' + e.message); });
}
function deleteProvider(id) {
  if (!window.confirm('确认删除该供应商？App 端将不再显示其云端模型。')) return;
  api('/providers/' + encodeURIComponent(id), {method:'DELETE'}).then(function() {
    toast('已删除');
    if (editingProviderId === id) resetProviderForm();
    loadProviders();
  }).catch(function(e) { toast('删除失败: ' + e.message); });
}
function loadWeeklyUsage() {
  api('/weekly-usage').then(function(r) {
    var rows = r.usage || [];
    var html = '<tr><th>用户</th><th>功能</th><th>本周用量</th><th>周起始</th></tr>';
    if (!rows.length) html += '<tr><td colspan="4" class="empty">本周暂无用量</td></tr>';
    for (var i = 0; i < rows.length; i++) {
      var u = rows[i];
      html += '<tr><td class="dim">' + esc(u.user_id) + '</td>'
        + '<td>' + esc(u.feature) + '</td>'
        + '<td><b>' + esc(String(u.count)) + '</b></td>'
        + '<td class="dim">' + esc(u.week_start) + '</td></tr>';
    }
    renderTable('pvUsageTable', html);
  }).catch(function(e) { if (TOKEN) toast('加载失败: ' + e.message); });
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
        + '<button class="btn ghost" style="padding:4px 10px; font-size:12px;" onclick="editAnnouncement(\\'' + esc(a.id) + '\\')">编辑</button> '
        + '<button class="btn ghost" style="padding:4px 10px; font-size:12px;" onclick="toggleAnnouncement(\\'' + esc(a.id) + '\\')">' + (a.enabled ? '停用' : '启用') + '</button> '
        + '<button class="btn danger" style="padding:4px 10px; font-size:12px;" onclick="deleteAnnouncement(\\'' + esc(a.id) + '\\')">删除</button></td></tr>';
    }
    renderTable('annTable', html);
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
  renderLoading('usrTable', 8);
  api('/users').then(function(r) {
    var rows = r.users || [];
    var html = '<tr><th>账号名</th><th>邮箱</th><th>套餐</th><th>到期</th><th>设备</th><th>状态</th><th>注册</th><th style="text-align:right;">操作</th></tr>';
    if (!rows.length) html += '<tr><td colspan="8" class="empty">无用户</td></tr>';
    for (var i = 0; i < rows.length; i++) {
      var u = rows[i];
      var exp = u.plan_expires_at ? new Date(Number(u.plan_expires_at)).toLocaleDateString('zh-CN') : (u.plan === 'lifetime' ? '永久' : '—');
      // 老用户还没回填账号名时显示 —（首次登录会自动补发）
      var uname = u.username ? '<span class="mono">' + esc(u.username) + '</span>' : '<span class="dim">—</span>';
      html += '<tr><td>' + uname + '</td>'
        + '<td>' + esc(u.email) + '</td>'
        + '<td>' + esc(u.plan) + '</td><td>' + exp + '</td><td>' + esc(u.device_count) + '</td>'
        + '<td>' + (u.status === 'banned' ? '<span class="badge banned">banned</span>' : '<span class="badge unused">active</span>') + '</td>'
        + '<td class="dim">' + fmtTime(u.created_at) + '</td>'
        + '<td style="text-align:right; white-space:nowrap;">'
        // 事件委托（2026-10-11 P0 修复）：email 用户可控，不再拼进
        // onclick 的 JS 字符串；id/email 经 esc（含引号转义）放 data-*。
        + '<button class="btn ghost" style="padding:4px 10px; font-size:12px;" data-act="devices" data-uid="' + esc(u.id) + '">设备(' + esc(String(u.device_count ?? 0)) + ')</button> '
        + '<button class="btn ' + (u.status === 'banned' ? '' : 'danger') + '" style="padding:4px 12px; font-size:12px;" data-act="ban" data-uid="' + esc(u.id) + '" data-banned="' + (u.status === 'banned') + '">' + (u.status === 'banned' ? '解封' : '封禁') + '</button> '
        + '<button class="btn danger-soft" data-act="deluser" data-uid="' + esc(u.id) + '" data-email="' + esc(u.email) + '">删除</button>'
        + '</td></tr>';
    }
    renderTable('usrTable', html);
  }).catch(function(e) { if (TOKEN) toast('加载失败: ' + e.message); });
}
function setBan(id, banned) {
  api('/users/' + encodeURIComponent(id) + '/' + (banned ? 'unban' : 'ban'), {method:'POST'}).then(function() {
    toast(banned ? '已解封' : '已封禁'); loadUsers();
  }).catch(function(e) { toast('操作失败: ' + e.message); });
}

// ---------- 设备管理（2026-10-11 新增） ----------
var _devUserId = '';

/** 打开某用户的设备列表弹窗。 */
function showDevices(userId) {
  _devUserId = userId;
  document.getElementById('devModal').classList.add('show');
  document.getElementById('devList').innerHTML = '<div class="dim">加载中…</div>';
  api('/users/' + encodeURIComponent(userId) + '/devices').then(function(r) {
    document.getElementById('devTitle').textContent = '设备管理 · ' + (r.plan || '?');
    document.getElementById('devQuota').textContent =
      '已绑定 ' + (r.devices || []).length + ' / 上限 ' + (r.maxDevices || 1) + ' 台（上限由套餐决定，可用 PLAN_LIMITS_OVERRIDE 覆盖）';
    var ds = r.devices || [];
    if (!ds.length) {
      document.getElementById('devList').innerHTML = '<div class="dim">该用户没有绑定任何设备。</div>';
      return;
    }
    var html = '';
    for (var i = 0; i < ds.length; i++) {
      var d = ds[i];
      var seen = d.last_seen_at ? new Date(Number(d.last_seen_at)).toLocaleString('zh-CN', {hour12:false}) : '—';
      html += '<div style="margin-bottom:10px;">'
        + '<div><b>' + esc(d.device_name || '未命名设备') + '</b>'
        + '<span style="float:right;"><button class="btn danger" style="padding:3px 10px; font-size:12px;" data-dev="' + esc(d.device_id) + '">解绑</button></span></div>'
        + '<div class="dim" style="font-size:12px; word-break:break-all;">' + esc(d.device_id) + '</div>'
        + '<div class="dim" style="font-size:12px;">最后活跃 ' + esc(seen) + ' · 活跃会话 ' + esc(String(d.active_sessions)) + '</div>'
        + '</div>';
    }
    document.getElementById('devList').innerHTML = html;
  }).catch(function(e) {
    document.getElementById('devList').innerHTML = '<div class="dim">加载失败：' + esc(e.message) + '</div>';
  });
}

function closeDevices() {
  document.getElementById('devModal').classList.remove('show');
  _devUserId = '';
}

/** 解绑单台设备（吊销其全部会话，与 App 端自助解绑同语义）。 */
function unbindDevice(userId, deviceId) {
  if (!window.confirm('确认解绑该设备？其全部登录会话将被吊销。')) return;
  api('/users/' + encodeURIComponent(userId) + '/devices/' + encodeURIComponent(deviceId), {method:'DELETE', timeout:30000})
    .then(function() {
      toast('设备已解绑');
      showDevices(userId);
      loadUsers();
    })
    .catch(function(e) { toast('解绑失败: ' + e.message); });
}

// 事件委托：用户表按钮（data-act）统一在这里分发（2026-10-11 P0 修复）。
document.addEventListener('click', function(e) {
  var t = e.target && e.target.closest ? e.target.closest('[data-act]') : null;
  if (t) {
    var act = t.getAttribute('data-act');
    if (act === 'ban') {
      setBan(t.getAttribute('data-uid'), t.getAttribute('data-banned') === 'true');
      return;
    }
    if (act === 'deluser') {
      confirmDeleteUser(t.getAttribute('data-uid'), t.getAttribute('data-email'));
      return;
    }
    if (act === 'devices') {
      showDevices(t.getAttribute('data-uid'));
      return;
    }
  }
  // 设备弹窗里的解绑按钮（data-dev）
  var ub = e.target && e.target.closest ? e.target.closest('[data-dev]') : null;
  if (ub && _devUserId) {
    unbindDevice(_devUserId, ub.getAttribute('data-dev'));
  }
});

// ---------- 删除用户（破坏性操作，两步确认）----------
// 关闭确认框时记住「待删 id」，由 confirmDeleteUserOk 真正执行。
var _pendingDeleteId = '';

/**
 * 打开删除确认框，并先拉取「会波及哪些数据」展示给管理员。
 *
 * 不直接删的原因：删用户会连带清掉云备份、同步数据、Agent 授权等
 * 十几张表的内容（不可恢复）。管理员必须先看到具体条数再决定。
 */
function confirmDeleteUser(id, email) {
  _pendingDeleteId = id;
  document.getElementById('cfTitle').textContent = '删除用户';
  document.getElementById('cfDesc').textContent =
    '将永久删除 ' + email + '，并清理其全部关联数据。此操作不可恢复。';
  document.getElementById('cfImpact').textContent = '正在统计…';
  document.getElementById('confirm').classList.add('show');
  api('/users/' + encodeURIComponent(id) + '/delete-preview', {timeout:15000}).then(function(r) {
    // 统计请求返回时可能已经换了别的用户，别覆盖新弹窗的内容
    if (_pendingDeleteId !== id) return;
    var counts = r.counts || {};
    var keys = Object.keys(counts);
    if (!keys.length) {
      document.getElementById('cfImpact').textContent = '该用户没有任何关联数据。';
      return;
    }
    var html = '';
    for (var i = 0; i < keys.length; i++) {
      html += '<div>' + esc(keys[i]) + '<span class="n">' + esc(counts[keys[i]]) + ' 条</span></div>';
    }
    html += '<div style="margin-top:8px;padding-top:8px;border-top:1px solid var(--border);">'
          + '合计<b>' + esc(r.total || 0) + '</b> 条'
          + '<span style="float:right;color:var(--text-dim);font-size:12px;">审计日志将保留</span></div>';
    document.getElementById('cfImpact').innerHTML = html;
  }).catch(function(e) {
    if (_pendingDeleteId !== id) return;
    document.getElementById('cfImpact').textContent = '统计失败：' + e.message;
  });
}

/** 确认框点「确认删除」。 */
function confirmDeleteUserOk() {
  var id = _pendingDeleteId;
  if (!id) return;
  var btn = document.getElementById('cfOk');
  btn.disabled = true; btn.textContent = '删除中…';
  // 超时给到 30s：清理涉及多张表，且云函数繁忙时会排队，但不能无限挂起
  // —— 挂起会让按钮永远停在「删除中…」（此前管理台「卡死」的直接观感）。
  api('/users/' + encodeURIComponent(id), {method:'DELETE', timeout:30000}).then(function(r) {
    closeConfirm();
    var n = r.removed ? Object.keys(r.removed).length : 0;
    toast('已删除，清理 ' + n + ' 张表');
    if (r.failed && r.failed.length) toast('部分表清理失败，请检查: ' + r.failed.join('; '));
    loadUsers();
  }).catch(function(e) {
    // 无论超时还是业务失败，都把确认框与按钮恢复，界面不能留在死状态。
    btn.disabled = false; btn.textContent = '确认删除';
    toast('删除失败: ' + e.message);
  });
}

/** 关闭确认框。 */
function closeConfirm() {
  _pendingDeleteId = '';
  document.getElementById('confirm').classList.remove('show');
  var btn = document.getElementById('cfOk');
  if (btn) { btn.disabled = false; btn.textContent = '确认删除'; }
}

// ---------- 用量 ----------
function loadUsage() {
  renderLoading('usageTable', 4);
  api('/usage').then(function(r) {
    var rows = r.usage || [];
    var html = '<tr><th>日期</th><th>用户</th><th>功能</th><th>次数</th></tr>';
    if (!rows.length) html += '<tr><td colspan="4" class="empty">暂无数据</td></tr>';
    for (var i = 0; i < rows.length; i++) {
      html += '<tr><td>' + esc(rows[i].date || '') + '</td><td class="mono dim">' + esc(String(rows[i].user_id || '').slice(0, 14)) + '…</td><td>' + esc(rows[i].feature) + '</td><td><b>' + esc(rows[i].count) + '</b></td></tr>';
    }
    renderTable('usageTable', html);
  }).catch(function(e) { if (TOKEN) toast('加载失败: ' + e.message); });
}

// ---------- 审计 ----------
function loadAudit() {
  renderLoading('auditTable', 5);
  api('/audit').then(function(r) {
    var rows = r.audit || [];
    var html = '<tr><th>时间</th><th>动作</th><th>用户</th><th>详情</th><th>IP</th></tr>';
    if (!rows.length) html += '<tr><td colspan="5" class="empty">暂无记录</td></tr>';
    for (var i = 0; i < rows.length; i++) {
      html += '<tr><td class="dim">' + fmtTime(rows[i].at) + '</td><td><span class="badge used">' + esc(rows[i].action) + '</span></td><td class="mono dim">' + esc(String(rows[i].user_id || '—').slice(0, 14)) + '</td><td>' + esc(rows[i].detail || '') + '</td><td class="dim">' + esc(rows[i].ip || '') + '</td></tr>';
    }
    renderTable('auditTable', html);
  }).catch(function(e) { if (TOKEN) toast('加载失败: ' + e.message); });
}

// ---------- 启动 ----------
(function init() {
  // 首次访问跟随系统深浅色, 之后以用户选择为准。
  // 兼容旧版遗留的 5 套彩色主题值(aurora/violet/...) —— 一律回落到纯白。
  var t = localStorage.getItem('orion_admin_theme');
  if (t !== 'dark' && t !== 'light') {
    t = (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';
  }
  setTheme(t);
  if (TOKEN) {
    // 自动登录校验同样需要超时：挂起时不能既进不去又不报错（见 timeoutSignal 注释）
    var ts = timeoutSignal(15000);
    fetch(APIBASE + '/users', {headers: {'Authorization': 'Bearer ' + TOKEN}, signal: ts.signal})
      .then(function(r) { ts.clear(); if (r.ok) enterApp(); else doLogout(true); })
      .catch(function() { ts.clear(); doLogout(true); });
  } else {
    document.getElementById('login').style.display = 'flex';
  }
  document.getElementById('tk').addEventListener('keydown', function(e) { if (e.key === 'Enter') doLogin(); });

  // 删除确认框：取消 / 确认 / 点遮罩 / ESC
  // 用 addEventListener 而非内联 onclick —— TS 模板里的 onclick 需要
  // 逐层转义单引号（上次管理台按钮全瘫就是这里少转义了一层）。
  document.getElementById('cfCancel').addEventListener('click', closeConfirm);
  document.getElementById('cfOk').addEventListener('click', confirmDeleteUserOk);
  document.getElementById('confirm').addEventListener('click', function(e) {
    if (e.target === this) closeConfirm();   // 点遮罩空白处
  });
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && document.getElementById('confirm').classList.contains('show')) {
      closeConfirm();
    }
    // 移动端抽屉: ESC 关闭
    if (e.key === 'Escape' && document.body.classList.contains('drawer-open')) {
      document.body.classList.remove('drawer-open');
    }
  });
})();
</script>
</body>
</html>`;
}
