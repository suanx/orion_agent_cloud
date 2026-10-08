#!/usr/bin/env bash
# orion_agent_cloud 全端点集成测试（对本地部署 dev-server 实测，非 mock）
# 前置: dev-server 已启动(127.0.0.1:8787)，local-dev.db 已 migrate
set -u
BASE="http://127.0.0.1:8787"
ADMIN="local-dev-admin-token"
PASS=0; FAIL=0
# 每次运行用唯一邮箱, 保证套件可对同一库重复执行
ALICE="alice_$(date +%s%N)@local.dev"
ok()   { PASS=$((PASS+1)); echo "  ✅ $1"; }
bad()  { FAIL=$((FAIL+1)); echo "  ❌ $1"; }
check() { # check <说明> <期望码> <实际码>
  if [ "$2" = "$3" ]; then ok "$1 ($3)"; else bad "$1 期望 $2 实际 $3"; fi
}

echo "== 1. 基础 =="
check "GET /api 服务信息" 200 "$(curl -s -o /dev/null -w '%{http_code}' $BASE/api)"
check "GET /api/admin 管理台UI" 200 "$(curl -s -o /dev/null -w '%{http_code}' $BASE/api/admin)"

echo "== 2. 账号体系 =="
REG=$(curl -s -X POST -H "Content-Type: application/json" -d "{\"email\":\"$ALICE\",\"password\":\"Test12345!\",\"deviceId\":\"dev-e2e-001\",\"deviceName\":\"e2e测试机\"}" $BASE/api/auth/register)
AT=$(echo "$REG" | python -c "import json,sys; print(json.load(sys.stdin).get('accessToken',''))" 2>/dev/null)
[ -n "$AT" ] && ok "注册返回 accessToken" || bad "注册失败: $(echo $REG | head -c 120)"
RT=$(echo "$REG" | python -c "import json,sys; print(json.load(sys.stdin).get('refreshToken',''))")
DUP=$(curl -s -o /dev/null -w '%{http_code}' -X POST -H "Content-Type: application/json" -d "{\"email\":\"$ALICE\",\"password\":\"Test12345!\",\"deviceId\":\"dev-e2e-001\",\"deviceName\":\"e2e测试机\"}" $BASE/api/auth/register)
check "重复注册被拒(409/400)" 409 "$DUP"
LOGIN=$(curl -s -X POST -H "Content-Type: application/json" -d "{\"email\":\"$ALICE\",\"password\":\"Test12345!\",\"deviceId\":\"dev-e2e-001\"}" $BASE/api/auth/login)
AT2=$(echo "$LOGIN" | python -c "import json,sys; print(json.load(sys.stdin).get('accessToken',''))")
[ -n "$AT2" ] && ok "登录返回 accessToken" || bad "登录失败"
# 登录会为同一设备签发新的 refresh 会话(旧的被轮换) → 用 login 的令牌做 refresh 测试
RT2IN=$(echo "$LOGIN" | python -c "import json,sys; print(json.load(sys.stdin).get('refreshToken',''))")
REF=$(curl -s -X POST -H "Content-Type: application/json" -d "{\"refreshToken\":\"$RT2IN\"}" $BASE/api/auth/refresh)
RT2=$(echo "$REF" | python -c "import json,sys; print(json.load(sys.stdin).get('refreshToken',''))")
[ -n "$RT2" ] && ok "refresh 轮换出新 refreshToken" || bad "refresh 失败: $(echo $REF | head -c 120)"
OLD=$(curl -s -o /dev/null -w '%{http_code}' -X POST -H "Content-Type: application/json" -d "{\"refreshToken\":\"$RT\"}" $BASE/api/auth/refresh)
check "复用已轮换的旧 refreshToken 被拒(401)" 401 "$OLD"
BADJ=$(curl -s -o /dev/null -w '%{http_code}' $BASE/api/license/status -H "Authorization: Bearer fake.jwt.token")
check "伪造 JWT 被拒(401)" 401 "$BADJ"
DEV=$(curl -s $BASE/api/auth/devices -H "Authorization: Bearer $AT2")
echo "$DEV" | python -c "import json,sys; d=json.load(sys.stdin); assert len(d.get('devices',[]))>=1" 2>/dev/null && ok "设备列表含当前设备" || bad "设备列表异常: $(echo $DEV | head -c 120)"
DTP=$(curl -s -X POST $BASE/api/auth/device-token -H "Authorization: Bearer $AT2")
DT=$(echo "$DTP" | python -c "import json,sys; print(json.load(sys.stdin).get('deviceToken',''))")
case "$DT" in dt_*) ok "设备长期令牌 dt_ 前缀" ;; *) bad "设备令牌异常: $(echo $DTP | head -c 120)" ;; esac

echo "== 3. 授权（账号授权制）=="
DEV2=$(curl -s -o /dev/null -w '%{http_code}' -X POST -H "Content-Type: application/json" -d "{\"email\":\"$ALICE\",\"password\":\"Test12345!\",\"deviceId\":\"dev-e2e-002\"}" $BASE/api/auth/login)
check "free 套餐第二台设备登录被拒(403)" 403 "$DEV2"
DEV2=$(curl -s -o /dev/null -w '%{http_code}' -X POST -H "Content-Type: application/json" -d "{\"email\":\"$ALICE\",\"password\":\"Test12345!\",\"deviceId\":\"dev-e2e-002\"}" $BASE/api/auth/login)
check "free 套餐第二台设备登录被拒(403)" 403 "$DEV2"
check "POST /api/license/activate 卡密下线(410)" 410 "$(curl -s -o /dev/null -w '%{http_code}' -X POST -H "Content-Type: application/json" -d '{"code":"X"}' $BASE/api/license/activate)"
ST=$(curl -s $BASE/api/license/status -H "Authorization: Bearer $AT2")
PLAN0=$(echo "$ST" | python -c "import json,sys; print(json.load(sys.stdin).get('plan',''))")
[ "$PLAN0" = "free" ] && ok "初始套餐 free" || bad "初始套餐: $PLAN0"

echo "== 4. 管理台：账号授权 =="
USER_ID=$(curl -s $BASE/api/admin/users -H "Authorization: Bearer $ADMIN" | ALICE_MAIL="$ALICE" python -c "import json,sys,os; us=json.load(sys.stdin)['users']; print(next(u['id'] for u in us if u['email']==os.environ['ALICE_MAIL']))")
GP=$(curl -s -X POST -H "Authorization: Bearer $ADMIN" -H "Content-Type: application/json" -d '{"plan":"pro","durationDays":30,"mode":"set"}' $BASE/api/admin/users/$USER_ID/plan)
echo "$GP" | python -c "import json,sys; d=json.load(sys.stdin); assert d['ok'] and d['plan']=='pro'" 2>/dev/null && ok "授权 pro 30 天(set)" || bad "授权失败: $(echo $GP | head -c 300)"
ST2=$(curl -s $BASE/api/license/status -H "Authorization: Bearer $AT2")
echo "$ST2" | python -c "import json,sys; d=json.load(sys.stdin); assert d['plan']=='pro' and d['planExpiresAt']" 2>/dev/null && ok "status 反映 pro + 到期时间" || bad "status 未更新: $(echo $ST2 | head -c 150)"
EXT=$(curl -s -X POST -H "Authorization: Bearer $ADMIN" -H "Content-Type: application/json" -d '{"plan":"pro","durationDays":10,"mode":"extend"}' $BASE/api/admin/users/$USER_ID/plan)
echo "$EXT" | python -c "import json,sys; d=json.load(sys.stdin); assert d['ok']" 2>/dev/null && ok "顺延模式 extend" || bad "顺延失败: $(echo $EXT | head -c 150)"
NOAUTH=$(curl -s -o /dev/null -w '%{http_code}' -X POST -H "Content-Type: application/json" -d '{"plan":"pro","durationDays":1}' $BASE/api/admin/users/$USER_ID/plan)
check "无 ADMIN_TOKEN 调管理接口被拒(401)" 401 "$NOAUTH"

echo "== 5. 公告（弹窗公告）=="
# 清空历史公告, 保证可重复运行
for aid in $(curl -s $BASE/api/admin/announcements -H "Authorization: Bearer $ADMIN" | python -c "import json,sys; [print(a['id']) for a in json.load(sys.stdin).get('announcements',[])]" 2>/dev/null); do
  curl -s -o /dev/null -X DELETE "$BASE/api/admin/announcements/$aid" -H "Authorization: Bearer $ADMIN"
done
N0=$(curl -s "$BASE/api/announcement?platform=android&version=9.9.9")
echo "$N0" | python -c "import json,sys; assert json.load(sys.stdin)['announcement'] is None" 2>/dev/null && ok "无公告时返回 null(用 9.9.9 探测)" || bad "空公告异常: $(echo $N0 | head -c 120)"
curl -s -X POST -H "Authorization: Bearer $ADMIN" -H "Content-Type: application/json" -d '{"title":"维护通知","content":"今晚 02:00-03:00 维护","minVersion":"0.2.35","maxVersion":"0.2.40"}' $BASE/api/admin/announcements > /dev/null
A1=$(curl -s "$BASE/api/announcement?platform=android&version=0.2.36")
echo "$A1" | python -c "import json,sys; d=json.load(sys.stdin)['announcement']; assert d and d['title']=='维护通知'" 2>/dev/null && ok "版本范围内命中公告" || bad "公告未命中: $(echo $A1 | head -c 150)"
A2=$(curl -s "$BASE/api/announcement?platform=android&version=0.2.10")
echo "$A2" | python -c "import json,sys; assert json.load(sys.stdin)['announcement'] is None" 2>/dev/null && ok "范围外版本(0.2.10)不推送" || bad "版本过滤失效: $(echo $A2 | head -c 120)"
A3=$(curl -s "$BASE/api/announcement?platform=ios&version=0.2.36")
echo "$A3" | python -c "import json,sys; assert json.load(sys.stdin)['announcement'] is None" 2>/dev/null && ok "非 android 平台不推送" || bad "平台过滤失效"

echo "== 6. 更新分发（强更开关）=="
U1=$(curl -s "$BASE/api/update/check?platform=android&current=0.2.30")
echo "$U1" | python -c "import json,sys; d=json.load(sys.stdin); assert d['updateAvailable'] and d['forceUpdate']==False" 2>/dev/null && ok "FORCE=false → 普通更新(forceUpdate=false)" || bad "强更开关异常: $(echo $U1 | head -c 150)"
U2=$(curl -s "$BASE/api/update/check?platform=android&current=0.2.10")
echo "$U2" | python -c "import json,sys; d=json.load(sys.stdin); assert d['forceUpdate']==True" 2>/dev/null && ok "低于 MIN_VERSION 一律强更(兜底)" || bad "MIN_VERSION 兜底失效"

echo "== 7. MCP JSON-RPC =="
TOOLS=$(curl -s -X POST -H "Authorization: Bearer $AT2" -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' $BASE/api/mcp)
echo "$TOOLS" | python -c "import json,sys; d=json.load(sys.stdin); names=[t['name'] for t in d['result']['tools']]; assert 'cloud_search' in names and 'cloud_schedule_task' in names" 2>/dev/null && ok "tools/list 含云端工具" || bad "tools/list 异常: $(echo $TOOLS | head -c 150)"

echo "== 8. 中继与 SSRF 防护 =="
SRF=$(curl -s -o /dev/null -w '%{http_code}' "$BASE/api/relay/fetch?url=http://127.0.0.1:8787/api" -H "Authorization: Bearer $AT2")
check "SSRF: 抓取环回地址被拒(400)" 400 "$SRF"
SRF2=$(curl -s -o /dev/null -w '%{http_code}' "$BASE/api/relay/fetch?url=http://169.254.169.254/meta" -H "Authorization: Bearer $AT2")
check "SSRF: 云元数据地址被拒(400)" 400 "$SRF2"

echo "== 9. Cron 端点 =="
CRON=$(curl -s -o /dev/null -w '%{http_code}' -X POST -H "Authorization: Bearer $ADMIN" $BASE/api/tasks/run-due)
check "POST /api/tasks/run-due (ADMIN)" 200 "$CRON"
CRON2=$(curl -s -o /dev/null -w '%{http_code}' -X POST $BASE/api/tasks/run-due)
check "run-due 无令牌被拒(401)" 401 "$CRON2"

echo "== 10. 云备份（零知识快照）=="
B64="Y2lwaGVydGV4dC1wYXlsb2Fk"   # base64('ciphertext-payload')
NONCE="AAAAAAAAAAAAAAAA"
NOAUTH=$(curl -s -o /dev/null -w '%{http_code}' -X PUT -H "Content-Type: application/json" -d "{\"payload\":\"$B64\",\"nonce\":\"$NONCE\"}" $BASE/api/backup/sessions)
check "未鉴权上传备份被拒(401)" 401 "$NOAUTH"
UP=$(curl -s -X PUT -H "Authorization: Bearer $AT2" -H "Content-Type: application/json" -d "{\"payload\":\"$B64\",\"nonce\":\"$NONCE\"}" $BASE/api/backup/sessions)
echo "$UP" | python -c "import json,sys; d=json.load(sys.stdin); assert d['ok'] and d['limit']>0" 2>/dev/null && ok "上传快照(含 free 套餐 5MB 上限)" || bad "上传失败: $(echo $UP | head -c 120)"
BADT=$(curl -s -o /dev/null -w '%{http_code}' -X PUT -H "Authorization: Bearer $AT2" -H "Content-Type: application/json" -d "{\"payload\":\"$B64\",\"nonce\":\"$NONCE\"}" "$BASE/api/backup/bad-name!")
check "非法表名被拒(400)" 400 "$BADT"
BADP=$(curl -s -o /dev/null -w '%{http_code}' -X PUT -H "Authorization: Bearer $AT2" -H "Content-Type: application/json" -d '{"payload":"not base64!!","nonce":"AAAAAAAAAAAAAAAA"}' $BASE/api/backup/sessions)
check "非base64密文被拒(400)" 400 "$BADP"
LIST=$(curl -s $BASE/api/backup -H "Authorization: Bearer $AT2")
echo "$LIST" | python -c "import json,sys; d=json.load(sys.stdin); assert any(b['table']=='sessions' for b in d['blobs'])" 2>/dev/null && ok "备份列表含 sessions" || bad "列表异常: $(echo $LIST | head -c 120)"
GETB=$(curl -s $BASE/api/backup/sessions -H "Authorization: Bearer $AT2")
echo "$GETB" | python -c "import json,sys,base64; d=json.load(sys.stdin); assert base64.b64decode(d['payload']).decode()=='ciphertext-payload' and d['nonce']" 2>/dev/null && ok "密文原样回读(端到端一致)" || bad "回读异常: $(echo $GETB | head -c 120)"
USAGE=$(curl -s $BASE/api/backup/usage -H "Authorization: Bearer $AT2")
PLAN_NOW=$(curl -s $BASE/api/license/status -H "Authorization: Bearer $AT2" | python -c "import json,sys; print(json.load(sys.stdin).get('plan',''))" 2>/dev/null)
echo "$USAGE" | USAGE_PLAN="$PLAN_NOW" python -c "
import json,os,sys
d=json.load(sys.stdin); plan=os.environ.get('USAGE_PLAN','')
want={'free':5*1024*1024,'trial':20*1024*1024,'pro':100*1024*1024,'lifetime':500*1024*1024}.get(plan)
assert d['bytes']>0 and (want is None or d['limit']==want), (plan, d)
" 2>/dev/null && ok "占用统计与套餐匹配($PLAN_NOW)" || bad "占用统计异常: $(echo $USAGE | head -c 120)"

echo "== 11. 多端同步（行级密文）=="
NOW=$(python -c "import time; print(int(time.time()*1000))")
OLD=$(python -c "import time; print(int(time.time()*1000)-60000)")
P1=$(curl -s -X POST -H "Authorization: Bearer $AT2" -H "Content-Type: application/json" -d "{\"rows\":[{\"table\":\"sessions\",\"rowId\":\"s_1\",\"updatedAt\":$NOW,\"payload\":\"$B64\",\"nonce\":\"$NONCE\"},{\"table\":\"messages\",\"rowId\":\"m_1\",\"updatedAt\":$NOW,\"payload\":\"$B64\",\"nonce\":\"$NONCE\"},{\"table\":\"sessions\",\"rowId\":\"s_2\",\"updatedAt\":$NOW,\"payload\":\"$B64\",\"nonce\":\"$NONCE\"}]}" $BASE/api/sync/push)
echo "$P1" | python -c "import json,sys; d=json.load(sys.stdin); assert d['accepted']==3 and d['skipped']==0 and d['stats']['rows']==3" 2>/dev/null && ok "批量推送 3 行" || bad "推送异常: $(echo $P1 | head -c 150)"
STALE=$(curl -s -X POST -H "Authorization: Bearer $AT2" -H "Content-Type: application/json" -d "{\"rows\":[{\"table\":\"sessions\",\"rowId\":\"s_1\",\"updatedAt\":$OLD,\"payload\":\"b2xkZXItcGF5bG9hZA==\",\"nonce\":\"$NONCE\"}]}" $BASE/api/sync/push)
KERR=$(mktemp); KEEP=$(curl -s "$BASE/api/sync/pull?since=0&tables=sessions" -H "Authorization: Bearer $AT2" | python -c "import json,sys,base64; d=json.load(sys.stdin); r=[x for x in d['rows'] if x['rowId']=='s_1'][0]; assert base64.b64decode(r['payload']).decode()=='ciphertext-payload'" 2>"$KERR"); KRC=$?
[ "$KRC" = "0" ] && ok "末写胜出: 旧时间戳写入未覆盖新数据" || bad "冲突策略失效 rc=$KRC err=$(head -c 200 $KERR); token=${AT2:0:12}…; pull=$(curl -s "$BASE/api/sync/pull?since=0&tables=sessions" -H "Authorization: Bearer $AT2" | head -c 120)"
TOMB=$(curl -s -X POST -H "Authorization: Bearer $AT2" -H "Content-Type: application/json" -d "{\"rows\":[{\"table\":\"sessions\",\"rowId\":\"s_2\",\"updatedAt\":$NOW,\"tombstone\":true}]}" $BASE/api/sync/push)
TERR=$(mktemp); TCHK=$(curl -s "$BASE/api/sync/pull?since=0&tables=sessions" -H "Authorization: Bearer $AT2" | python -c "import json,sys; d=json.load(sys.stdin); r=[x for x in d['rows'] if x['rowId']=='s_2'][0]; assert r['tombstone'] and r['payload']==''" 2>"$TERR"); TRC=$?
[ "$TRC" = "0" ] && ok "删除写 tombstone(不带密文)" || bad "tombstone 异常 rc=$TRC err=$(head -c 200 $TERR)"
CH=$(curl -s "$BASE/api/sync/changes?since=0" -H "Authorization: Bearer $AT2")
echo "$CH" | python -c "import json,sys; d=json.load(sys.stdin); assert len(d['changes'])==3 and all('payload' not in c for c in d['changes'])" 2>/dev/null && ok "changes 轻量清单(不含密文)" || bad "changes 异常: $(echo $CH | head -c 120)"
FILT=$(curl -s "$BASE/api/sync/pull?since=0&tables=messages" -H "Authorization: Bearer $AT2")
echo "$FILT" | python -c "import json,sys; d=json.load(sys.stdin); assert len(d['rows'])==1 and d['rows'][0]['table']=='messages'" 2>/dev/null && ok "按表过滤 pull" || bad "表过滤失效: $(echo $FILT | head -c 120)"
SKIP=$(curl -s -X POST -H "Authorization: Bearer $AT2" -H "Content-Type: application/json" -d '{"rows":[{"table":"bad table!","rowId":"x","updatedAt":1},{"table":"ok","rowId":"","updatedAt":1}]}' $BASE/api/sync/push)
SK=$(curl -s -o /dev/null -w '%{http_code}' -X POST -H "Authorization: Bearer $AT2" -H "Content-Type: application/json" -d '{"rows":[{"table":"ok","rowId":"","updatedAt":1}]}' $BASE/api/sync/push)
check "空 rowId 被跳过(仍 200)" 200 "$SK"
SYN=$(curl -s -o /dev/null -w '%{http_code}' -X POST -H "Content-Type: application/json" -d '{"rows":[]}' $BASE/api/sync/push)
check "未鉴权同步被拒(401)" 401 "$SYN"

echo "== 12. 跨用户隔离 =="
REG2=$(curl -s -X POST -H "Content-Type: application/json" -d "{\"email\":\"bob_$(date +%s)@local.dev\",\"password\":\"Test12345!\",\"deviceId\":\"dev-bob-1\"}" $BASE/api/auth/register)
ATB=$(echo "$REG2" | python -c "import json,sys; print(json.load(sys.stdin).get('accessToken',''))")
ISO=$(curl -s -o /dev/null -w '%{http_code}' $BASE/api/backup/sessions -H "Authorization: Bearer $ATB")
check "B 读不到 A 的备份(404)" 404 "$ISO"
SYNISO=$(curl -s "$BASE/api/sync/pull?since=0" -H "Authorization: Bearer $ATB" | python -c "import json,sys; print(len(json.load(sys.stdin)['rows']))")
[ "$SYNISO" = "0" ] && ok "B 拉不到 A 的同步数据" || bad "同步数据未隔离: $SYNISO 行"
ST2=$(curl -s $BASE/api/sync/stats -H "Authorization: Bearer $ATB")
echo "$ST2" | python -c "import json,sys; d=json.load(sys.stdin); assert d['rows']==0 and d['rowLimit']==2000" 2>/dev/null && ok "B 的同步统计为空(free 2000 行上限)" || bad "统计异常: $(echo $ST2 | head -c 120)"

echo "== 13. 清理与幂等 =="
DELR=$(curl -s -X DELETE -H "Authorization: Bearer $AT2" "$BASE/api/sync/rows?table=sessions" )
echo "$DELR" | python -c "import json,sys; assert json.load(sys.stdin)['ok']" 2>/dev/null && ok "删除某表同步数据" || bad "删除表失败"
DELB=$(curl -s -X DELETE -H "Authorization: Bearer $AT2" "$BASE/api/backup/sessions")
echo "$DELB" | python -c "import json,sys; assert json.load(sys.stdin)['bytes']>=0" 2>/dev/null && ok "删除备份快照" || bad "删除备份失败"
DELALL=$(curl -s -X DELETE -H "Authorization: Bearer $ATB" $BASE/api/backup)
echo "$DELALL" | python -c "import json,sys; assert json.load(sys.stdin)['bytes']==0" 2>/dev/null && ok "清空备份(幂等)" || bad "清空失败"

echo ""
echo "======================================"
echo "通过 $PASS / $((PASS+FAIL))"
[ $FAIL -eq 0 ] && echo "🎉 全部通过" || echo "⚠️ 有 $FAIL 个失败"
exit $FAIL
