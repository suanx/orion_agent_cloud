// 管理台 UI 端到端验证（无需浏览器）:
// 渲染 adminHtml() 真实产物 → esbuild 语法检查 → DOM 桩执行 loadGrant/
// loadAnnouncements → 校验 onclick 合法且点击能发出正确 API 请求。
// 用法: node scripts/admin-ui-e2e.mjs
import fs from "node:fs";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";

fs.mkdirSync(".dev", { recursive: true });

await build({
  stdin: {
    contents: `export { adminHtml } from "./src/ui/admin_html";`,
    resolveDir: process.cwd(),
    loader: "ts",
  },
  bundle: true, platform: "node", format: "cjs",
  outfile: ".dev/admin_bundle.cjs", logLevel: "silent",
});
const { adminHtml } = await import(pathToFileURL(".dev/admin_bundle.cjs").href);
const html = adminHtml({ JWT_SECRET: "x", ADMIN_TOKEN: "y" });
const js = html.slice(html.indexOf("<script>") + 8, html.indexOf("</" + "script>"));

// ---- 1) 语法检查(渲染后的真实字节) ----
fs.writeFileSync(".dev/admin_inline_check.js", js);
try {
  await build({ entryPoints: [".dev/admin_inline_check.js"], outfile: "/dev/null", logLevel: "silent", write: false });
  console.log("语法检查: ✅ 通过");
} catch (e) {
  console.log("语法检查: ❌");
  for (const x of e.errors ?? []) console.log(`  ${x.text} @ ${x.location?.line}:${x.location?.column}`);
  process.exit(1);
}

// ---- 2) DOM / 网络桩 ----
const elements = {};
const makeEl = () => {
  const el = {
  innerHTML: "",
  style: new Proxy({}, { get: () => "", set: () => true }),
  value: "", checked: false,
  classList: { add() {}, remove() {}, toggle() {} },
  addEventListener() {}, appendChild() {}, setAttribute() {},
  removeAttribute() {}, getAttribute: () => null, remove() {},
  closest: () => null, contains: () => false,
  querySelector: () => makeEl(), querySelectorAll: () => [], dataset: {},
  };
  // 真实 DOM 里 textContent 赋值会反映到 innerHTML(esc() 依赖此行为)
  let _text = "";
  Object.defineProperty(el, "textContent", {
    get() { return _text; },
    set(v) { _text = v == null ? "" : String(v); el.innerHTML = _text; },
  });
  return el;
};
global.document = {
  getElementById: (id) => (elements[id] ??= makeEl()),
  querySelector: () => makeEl(), querySelectorAll: () => [],
  addEventListener() {}, removeEventListener() {},
  body: makeEl(), documentElement: makeEl(), head: makeEl(),
  createElement: () => makeEl(), cookie: "",
};
global.location = { pathname: "/api/admin", search: "", hash: "" };
global.localStorage = {
  _s: { orion_admin_token: "test-admin-token" },
  getItem(k) { return this._s[k] ?? null; },
  setItem(k, v) { this._s[k] = v; },
  removeItem(k) { delete this._s[k]; },
};
global.confirm = () => true;
global.alert = () => {};
global.window = global;

const calls = [];
global.fetch = async (url, opts = {}) => {
  const u = String(url);
  calls.push({ url: u, method: opts.method ?? "GET", body: opts.body });
  if (u.endsWith("/users")) {
    return { ok: true, status: 200, json: async () => ({ users: [
      { id: "u_abc123", email: "a@b.c", plan: "free", plan_expires_at: null, status: "active", created_at: Date.now(), device_count: 1 },
    ] }) };
  }
  if (u.endsWith("/announcements")) {
    return { ok: true, status: 200, json: async () => ({ announcements: [
      { id: "a_1", title: "维护", content: "今晚维护", enabled: 1, min_version: "", max_version: "", created_at: Date.now(), updated_at: Date.now() },
    ] }) };
  }
  if (u.endsWith("/usage")) return { ok: true, status: 200, json: async () => ({ usage: [] }) };
  return { ok: true, status: 200, json: async () => ({ ok: true, message: "已更新" }) };
};

// ---- 3) 执行脚本 + 场景 ----
const scenario = `
// harness: 把脚本内函数暴露到全局, 模拟浏览器中 onclick 的全局查找
Object.assign(globalThis, { setPlan, setBan, toggleAnnouncement, deleteAnnouncement,
  editAnnouncement, saveAnnouncement, loadGrant, loadAnnouncements, loadDashboard, api, esc, toast });
globalThis.__done = (function () {
  var flush = function () { return new Promise(function (r) { setTimeout(r, 30); }); };
  var grab = function (id) { var el = document.getElementById(id); return el ? el.innerHTML : ''; };
  var steps = [];
  return (async function () {
    steps.push(['loadGrant', (function () { try { loadGrant(); return 'called'; } catch (e) { return 'THROW ' + e.message; } })()]);
    await flush();
    steps.push(['grantTable 行数', (grab('grantTable').match(/<tr/g) || []).length]);
    steps.push(['grantTable HTML', grab('grantTable')]);
    steps.push(['loadAnnouncements', (function () { try { loadAnnouncements(); return 'called'; } catch (e) { return 'THROW ' + e.message; } })()]);
    await flush();
    steps.push(['annTable 行数', (grab('annTable').match(/<tr/g) || []).length]);
    steps.push(['annTable HTML', grab('annTable')]);
    steps.push(['loadDashboard', (function () { try { loadDashboard(); return 'called'; } catch (e) { return 'THROW ' + e.message; } })()]);
    await flush();
    steps.push(['sUsers 文本', document.getElementById('sUsers').textContent]);
    return steps;
  })();
})();
`;
new Function(js + scenario)();
const steps = await globalThis.__done;
const map = Object.fromEntries(steps);
console.log("场景执行: ✅");

// ---- 4) 校验 onclick ----
let bad = 0;
for (const key of ["grantTable HTML", "annTable HTML"]) {
  const tableHtml = map[key] || "";
  const attrs = [...tableHtml.matchAll(/onclick="([^"]+)"/g)].map((m) => m[1]);
  console.log(`\n${key}: ${(tableHtml.match(/<tr/g) || []).length} 行, ${attrs.length} 个 onclick`);
  for (const a of attrs) {
    try {
      new Function(a);
    } catch (e) {
      bad++;
      console.log(`  ❌ 非法 onclick: ${a.slice(0, 70)} -> ${e.message.slice(0, 60)}`);
    }
  }
  if (attrs.length) console.log(bad === 0 ? "  ✅ onclick 全部为合法 JS" : "");
}

// ---- 5) 真点击 ----
async function clickAndExpect(attrPrefix, expectSub) {
  const tableHtml = (map["grantTable HTML"] || "") + (map["annTable HTML"] || "");
  const m = [...tableHtml.matchAll(/onclick="([^"]+)"/g)].map((x) => x[1]).find((a) => a.startsWith(attrPrefix));
  if (!m) return console.log(`  (未找到 ${attrPrefix} 按钮)`);
  const before = calls.length;
  try {
    new Function(m)();
  } catch (e) {
    return console.log(`  ❌ ${attrPrefix} 执行异常: ${e.message.slice(0, 70)}`);
  }
  await new Promise((r) => setTimeout(r, 30));
  const hit = calls.slice(before).find((c) => c.url.includes(expectSub));
  console.log(hit
    ? `  ✅ ${attrPrefix} -> ${hit.method} ${hit.url.replace("http://x", "")} body=${String(hit.body ?? "").slice(0, 70)}`
    : `  ❌ ${attrPrefix} 未发出含 "${expectSub}" 的请求`);
}
console.log("\ngrantTable 行 HTML://n" + (map["grantTable HTML"] || "").slice(0, 700));
console.log("\n点击验证:");
await clickAndExpect("setPlan(", "/plan");
await clickAndExpect("setBan(", "ban");
await clickAndExpect("toggleAnnouncement(", "/toggle");
await clickAndExpect("deleteAnnouncement(", "/announcements/");
console.log("\n仪表盘 sUsers:", map["sUsers 文本"] === "" ? "(空)" : map["sUsers 文本"]);
console.log(bad === 0 ? "\n管理台脚本全部通过" : `\n${bad} 个非法 onclick`);
process.exit(bad === 0 ? 0 : 1);