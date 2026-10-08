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
  if (u.endsWith("/providers")) {
    return { ok: true, status: 200, json: async () => ({ providers: [
      { id: "p_1", name: "官方中转", baseUrl: "https://api.example.com/v1",
        models: [{ name: "gpt-4o-mini", label: "GPT-4o mini" }],
        enabled: true, sort: 0, keyState: "已配置" },
    ] }) };
  }
  if (u.endsWith("/agent-instances") || /\/agent-instances\//.test(u)) {
    // 按方法区分：POST 是保存、DELETE 是删除、GET 才是列表。
    // ⚠️ 不能用 calls.filter(POST).length > 0 判断——此前其他测试已产生过
    // POST 记录，会让列表桩误返回保存结果，导致列表为空、onclick 数为 0。
    const method = opts.method ?? "GET";
    if (method === "POST") {
      return { ok: true, status: 200, json: async () => ({ ok: true }) };
    }
    if (method === "DELETE") {
      return { ok: true, status: 200, json: async () => ({ ok: true }) };
    }
    return { ok: true, status: 200, json: async () => ({ instances: [
      { userId: "u_agent_1", email: "agent@local.dev", plan: "pro",
        baseUrl: "https://forge.example.com", enabled: true,
        label: "云端 Agent", keyConfigured: true },
    ] }) };
  }
  if (u.endsWith("/weekly-usage")) {
    return { ok: true, status: 200, json: async () => ({ weekStart: "2026-10-05", usage: [
      { user_id: "u_abc123", week_start: "2026-10-05", feature: "ai_chat", count: 7 },
    ] }) };
  }
  return { ok: true, status: 200, json: async () => ({ ok: true, message: "已更新" }) };
};

// ---- 3) 执行脚本 + 场景 ----
const scenario = `
// harness: 把脚本内函数暴露到全局, 模拟浏览器中 onclick 的全局查找
Object.assign(globalThis, { setPlan, setBan, toggleAnnouncement, deleteAnnouncement,
  editAnnouncement, saveAnnouncement, loadGrant, loadAnnouncements, loadDashboard, api, esc, toast,
  loadProviders, loadWeeklyUsage, saveProvider, editProvider, toggleProvider, deleteProvider,
  parseModelsInput, resetProviderForm,
  loadAgentInstances, saveAgentInstance, editAgentInstance, deleteAgentInstance,
  clearAgentInstanceForm });
globalThis.__done = (function () {
  var flush = function () { return new Promise(function (r) { setTimeout(r, 30); }); };
  var grab = function (id) { var el = document.getElementById(id); return el ? el.innerHTML : ''; };
  var steps = [];
  return (async function () {
    steps.push(['loadGrant', (function () { try { loadGrant(); return 'called'; } catch (e) { return 'THROW ' + e.message; } })()]);
    await flush();
    steps.push(['grantTable 行数', (grab('grantTable').match(/<tr>/g) || []).length]);
    steps.push(['grantTable HTML', grab('grantTable')]);
    steps.push(['loadAnnouncements', (function () { try { loadAnnouncements(); return 'called'; } catch (e) { return 'THROW ' + e.message; } })()]);
    await flush();
    steps.push(['annTable 行数', (grab('annTable').match(/<tr>/g) || []).length]);
    steps.push(['annTable HTML', grab('annTable')]);
    steps.push(['loadProviders', (function () { try { loadProviders(); return 'called'; } catch (e) { return 'THROW ' + e.message; } })()]);
    await flush();
    steps.push(['pvTable 行数', (grab('pvTable').match(/<tr>/g) || []).length]);
    steps.push(['pvTable HTML', grab('pvTable')]);
    steps.push(['loadWeeklyUsage', (function () { try { loadWeeklyUsage(); return 'called'; } catch (e) { return 'THROW ' + e.message; } })()]);
    await flush();
    steps.push(['pvUsageTable HTML', grab('pvUsageTable')]);
    // 模型 JSON 解析: 合法/非法/缺 name 三种
    steps.push(['parseModels 合法', JSON.stringify(parseModelsInput('[{"name":"m1"}]'))]);
    steps.push(['parseModels 非法JSON', (function () { try { parseModelsInput('{bad'); return 'NO THROW'; } catch (e) { return 'THROW ok'; } })()]);
    steps.push(['parseModels 缺name', (function () { try { parseModelsInput('[{"label":"x"}]'); return 'NO THROW'; } catch (e) { return 'THROW ok'; } })()]);
    steps.push(['parseModels 空', JSON.stringify(parseModelsInput(''))]);
    // 保存供应商: 填表单后应发出 POST /providers 且带上 models 数组
    document.getElementById('pvName').value = '新供应商';
    document.getElementById('pvBase').value = 'https://api.new.com/v1';
    document.getElementById('pvKey').value = 'sk-test';
    document.getElementById('pvModels').value = '[{"name":"m1","label":"M1"}]';
    steps.push(['saveProvider', (function () { try { saveProvider(); return 'called'; } catch (e) { return 'THROW ' + e.message; } })()]);
    await flush();
    steps.push(['loadAgentInstances', (function () { try { loadAgentInstances(); return 'called'; } catch (e) { return 'THROW ' + e.message; } })()]);
    await flush();
    steps.push(['aiTable 行数', (grab('aiTable').match(/<tr>/g) || []).length]);
    steps.push(['aiTable HTML', grab('aiTable')]);
    document.getElementById('aiUserId').value = 'u_agent_new';
    document.getElementById('aiBaseUrl').value = 'https://new-forge.example.com';
    document.getElementById('aiApiKey').value = 'sk-agent-key';
    steps.push(['saveAgentInstance', (function () { try { saveAgentInstance(); return 'called'; } catch (e) { return 'THROW ' + e.message; } })()]);
    await flush();
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
for (const key of ["grantTable HTML", "annTable HTML", "pvTable HTML", "pvUsageTable HTML", "aiTable HTML"]) {
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
// wantMethod: 有些动作(如 toggleProvider)会先 GET 列表再 POST,
// 不限定方法会先匹配到 GET 从而误判"只发了读请求"。
async function clickAndExpect(attrPrefix, expectSub, fromKey, wantMethod) {
  const key = fromKey ?? "grantTable HTML";
  const tableHtml = (map[key] || "");
  const m = [...tableHtml.matchAll(/onclick="([^"]+)"/g)].map((x) => x[1]).find((a) => a.startsWith(attrPrefix));
  if (!m) return console.log(`  (未找到 ${attrPrefix} 按钮)`);
  const before = calls.length;
  try {
    new Function(m)();
  } catch (e) {
    return console.log(`  ❌ ${attrPrefix} 执行异常: ${e.message.slice(0, 70)}`);
  }
  // 两跳(GET→POST)需要更长的等待
  await new Promise((r) => setTimeout(r, 80));
  const hit = calls.slice(before).find((c) =>
    c.url.includes(expectSub) && (!wantMethod || c.method === wantMethod));
  console.log(hit
    ? `  ✅ ${attrPrefix} -> ${hit.method} ${hit.url.replace("http://x", "")} body=${String(hit.body ?? "").slice(0, 70)}`
    : `  ❌ ${attrPrefix} 未发出 ${wantMethod ?? ""} 含 "${expectSub}" 的请求`);
  return !!hit;
}
console.log("\ngrantTable 行 HTML://n" + (map["grantTable HTML"] || "").slice(0, 700));
console.log("\n模型 JSON 解析:");
for (const k of ["parseModels 合法", "parseModels 非法JSON", "parseModels 缺name", "parseModels 空"]) {
  console.log(`  ${k}: ${map[k]}`);
}
console.log("\n点击验证:");
await clickAndExpect("setPlan(", "/plan", undefined, "POST");
await clickAndExpect("setBan(", "ban", undefined, "POST");
await clickAndExpect("toggleAnnouncement(", "/toggle", "annTable HTML", "POST");
await clickAndExpect("deleteAnnouncement(", "/announcements/", "annTable HTML", "DELETE");
await clickAndExpect("editProvider(", "/providers", "pvTable HTML", "GET");
const toggleOk = await clickAndExpect("toggleProvider(", "/providers", "pvTable HTML", "POST");
await clickAndExpect("deleteProvider(", "/providers/", "pvTable HTML", "DELETE");
await clickAndExpect("editAgentInstance(", "/agent-instances", "aiTable HTML", "GET");
const aiDelOk = await clickAndExpect("deleteAgentInstance(", "/agent-instances/", "aiTable HTML", "DELETE");
const aiSaveCall = calls.find(
  (c) =>
    c.method === "POST" &&
    c.url.endsWith("/agent-instances") &&
    String(c.body ?? "").includes("userId"),
);
const aiSaveOk = !!aiSaveCall;
console.log(
  aiSaveOk
    ? `  ✅ saveAgentInstance -> POST ${aiSaveCall.url.replace("http://x", "")} body=${String(aiSaveCall.body).slice(0, 90)}`
    : "  ❌ saveAgentInstance 未发出带 userId 的 POST /agent-instances",
);

// saveProvider 应发出带 models 数组的 POST
const spCall = calls.find((c) => c.method === "POST" && c.url.endsWith("/providers") && String(c.body ?? "").includes("models"));
console.log(spCall
  ? `  ✅ saveProvider -> POST ${spCall.url.replace("http://x", "")} body=${String(spCall.body).slice(0, 90)}`
  : "  ❌ saveProvider 未发出带 models 的 POST /providers");

console.log("\n仪表盘 sUsers:", map["sUsers 文本"] === "" ? "(空)" : map["sUsers 文本"]);
console.log(bad === 0 && spCall && toggleOk && aiDelOk && aiSaveOk ? "\n管理台脚本全部通过" : `\n失败: onclick非法=${bad} saveProvider=${!!spCall} toggleProvider=${!!toggleOk} aiDelete=${!!aiDelOk} aiSave=${!!aiSaveOk}`);
process.exit(bad === 0 && spCall && toggleOk && aiDelOk && aiSaveOk ? 0 : 1);