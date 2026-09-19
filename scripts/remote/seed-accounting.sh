#!/bin/bash
# Seed fondasi akuntansi (COA, periode, cash account) sebagai OWNER — sesuai runbook go-live.
set -u
BASE="https://kost48surabaya.com"
PWFILE="$HOME/OWNER-PASSWORD-BACA-LALU-HAPUS.txt"
EMAIL=$(grep -E '^  Email' "$PWFILE" | awk '{print $3}')
PASS=$(grep -E '^  Password' "$PWFILE" | awk '{print $3}')
TOKEN=$(curl -s --max-time 45 -X POST "$BASE/api/auth/login" -H 'Content-Type: application/json' \
  -d "{\"identifier\":\"$EMAIL\",\"password\":\"$PASS\"}" | grep -o '"accessToken":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "login: $([ -n "$TOKEN" ] && echo OK || echo GAGAL)"

echo
echo "=== 1. SEED DEFAULT COA (POST) ==="
curl -s --max-time 120 -X POST "$BASE/api/accounting/default-coa/seed" -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{}' | head -c 600 | sed 's/^/  /'; echo

echo
echo "=== 2. CEK KEMBALI READINESS ==="
curl -s --max-time 60 -H "Authorization: Bearer $TOKEN" "$BASE/api/accounting/readiness" | tr ',' '\n' | grep -E '"(ready|score|formalStatementReady|ledgerBacked)"' | head -6 | sed 's/^/  /'

echo
echo "=== 3. ENDPOINT TERKAIT PERIODE & KAS (cek ketersediaan) ==="
for p in "/api/accounting/periods" "/api/accounting/cash-accounts" "/api/accounting/trial-balance"; do
  code=$(curl -s -o /tmp/x.json -w '%{http_code}' --max-time 45 -H "Authorization: Bearer $TOKEN" "$BASE$p")
  printf '  GET %-34s -> %s %s\n' "$p" "$code" "$(head -c 80 /tmp/x.json | tr -d '\n')"
done

echo
echo "=== 4. JUMLAH DATA AKUNTANSI DI DB BARU ==="
APP="$HOME/kost48-prod"
DBURL=$(grep -E '^DATABASE_URL' "$APP/.env" | head -1 | sed -E 's/^DATABASE_URL=//; s/^"//; s/"$//')
DBUSER=$(printf '%s' "$DBURL" | sed -E 's#^postgresql://([^:]+):.*#\1#')
DBPASS_RAW=$(printf '%s' "$DBURL" | sed -E 's#^postgresql://[^:]+:([^@]*)@.*#\1#')
DBPASS=$(printf '%s' "$DBPASS_RAW" | sed -E 's/%([0-9A-Fa-f]{2})/\\x\1/g' | xargs -0 printf '%b' 2>/dev/null || printf '%s' "$DBPASS_RAW")
export PGPASSWORD="$DBPASS"
for t in ChartOfAccount AccountingPeriod CashAccount; do
  echo "  $t: $(psql -U "$DBUSER" -d kost48s1_prod26 -At -c "select count(*) from \"$t\";" 2>&1)"
done
unset PGPASSWORD
