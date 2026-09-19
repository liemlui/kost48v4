#!/bin/bash
# Lengkapi fondasi akuntansi: periode OPEN bulan berjalan + CashAccount Kas/Bank.
# Saldo awal = 0 (zero-start); saldo nyata diisi owner lewat UI.
set -u
BASE="https://kost48surabaya.com"
PWFILE="$HOME/OWNER-PASSWORD-BACA-LALU-HAPUS.txt"
EMAIL=$(grep -E '^  Email' "$PWFILE" | awk '{print $3}')
PASS=$(grep -E '^  Password' "$PWFILE" | awk '{print $3}')
TOKEN=$(curl -s --max-time 45 -X POST "$BASE/api/auth/login" -H 'Content-Type: application/json' \
  -d "{\"identifier\":\"$EMAIL\",\"password\":\"$PASS\"}" | grep -o '"accessToken":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "login: $([ -n "$TOKEN" ] && echo OK || echo GAGAL)"
[ -n "$TOKEN" ] || exit 1
AUTH="Authorization: Bearer $TOKEN"
JSON="Content-Type: application/json"

YEAR=$(date +%Y); MONTH=$(date +%-m)
FIRST="$(date +%Y-%m-01)"
LAST="$(date -d "$(date +%Y-%m-01) +1 month -1 day" +%Y-%m-%d 2>/dev/null || date +%Y-%m-%d)"
echo "periode: $YEAR-$MONTH ($FIRST s/d $LAST)"

echo
echo "=== 1. BUAT PERIODE OPEN ==="
RESP=$(curl -s --max-time 60 -X POST "$BASE/api/accounting/periods" -H "$AUTH" -H "$JSON" \
  -d "{\"year\":$YEAR,\"month\":$MONTH,\"startDate\":\"$FIRST\",\"endDate\":\"$LAST\",\"status\":\"OPEN\",\"notes\":\"Periode awal produksi\"}")
printf '%s' "$RESP" | head -c 400 | sed 's/^/  /'; echo

echo
echo "=== 2. CARI ID AKUN COA UNTUK KAS & BANK ==="
curl -s --max-time 45 -H "$AUTH" "$BASE/api/accounting/accounts" > /tmp/acc.json
CASH_ID=$(python3 - <<'PY' 2>/dev/null || true
import json
d=json.load(open('/tmp/acc.json'))
items=d.get('data') or []
if isinstance(items,dict): items=items.get('items',[])
for a in items:
    if a.get('code')=='1000': print(a.get('id')); break
PY
)
BANK_ID=$(python3 - <<'PY' 2>/dev/null || true
import json
d=json.load(open('/tmp/acc.json'))
items=d.get('data') or []
if isinstance(items,dict): items=items.get('items',[])
for a in items:
    if a.get('code')=='1010': print(a.get('id')); break
PY
)
echo "  akun 1000 (Cash on Hand) id: ${CASH_ID:-tidak ditemukan}"
echo "  akun 1010 (Bank Main)    id: ${BANK_ID:-tidak ditemukan}"
if [ -z "${CASH_ID:-}" ] || [ -z "${BANK_ID:-}" ]; then
  echo "  tidak bisa lanjut tanpa id akun; menampilkan 3 akun pertama:"
  head -c 300 /tmp/acc.json | sed 's/^/    /'; echo
  exit 1
fi

echo
echo "=== 3. BUAT CASH ACCOUNT: KAS TUNAI (default) ==="
curl -s --max-time 60 -X POST "$BASE/api/accounting/cash-accounts" -H "$AUTH" -H "$JSON" \
  -d "{\"name\":\"Kas Tunai\",\"accountType\":\"CASH\",\"chartOfAccountId\":$CASH_ID,\"openingBalanceRupiah\":0,\"isDefault\":true,\"isActive\":true,\"notes\":\"Kas fisik di lokasi\"}" \
  | head -c 300 | sed 's/^/  /'; echo

echo
echo "=== 4. BUAT CASH ACCOUNT: BANK UTAMA ==="
curl -s --max-time 60 -X POST "$BASE/api/accounting/cash-accounts" -H "$AUTH" -H "$JSON" \
  -d "{\"name\":\"Bank Utama\",\"accountType\":\"BANK\",\"chartOfAccountId\":$BANK_ID,\"openingBalanceRupiah\":0,\"isDefault\":false,\"isActive\":true,\"notes\":\"Rekening bank operasional\"}" \
  | head -c 300 | sed 's/^/  /'; echo

echo
echo "=== 5. VERIFIKASI HASIL ==="
echo -n "  periode : "; curl -s --max-time 45 -H "$AUTH" "$BASE/api/accounting/periods" | tr ',' '\n' | grep -E '"(year|month|status)"' | tr '\n' ' '; echo
echo -n "  kas/bank: "; curl -s --max-time 45 -H "$AUTH" "$BASE/api/accounting/cash-accounts" | tr ',' '\n' | grep -E '"(name|accountType|isDefault|currentBalanceRupiah)"' | tr '\n' ' '; echo

echo
echo "=== 6. READINESS & TRIAL BALANCE ==="
curl -s --max-time 60 -H "$AUTH" "$BASE/api/accounting/readiness" | python3 -c "
import json,sys
d=json.load(sys.stdin)['data']
print('  ready=',d.get('ready'),' score=',d.get('score'),' ledgerBacked=',d.get('ledgerBacked'),' formalStatementReady=',d.get('formalStatementReady'))
for g in d.get('gates',[]):
    print('   -', 'OK ' if g.get('ready') else 'BELUM', g.get('key'), '|', g.get('note',''))
" 2>/dev/null || curl -s --max-time 60 -H "$AUTH" "$BASE/api/accounting/readiness" | head -c 400 | sed 's/^/  /'
curl -s --max-time 60 -H "$AUTH" "$BASE/api/accounting/trial-balance" | head -c 300 | sed 's/^/  trial-balance: /'; echo
