#!/bin/bash
# Verifikasi gate KTP + temukan endpoint seed COA yang benar. Read-only.
set -u
BASE="https://kost48surabaya.com"
PWFILE="$HOME/OWNER-PASSWORD-BACA-LALU-HAPUS.txt"
EMAIL=$(grep -E '^  Email' "$PWFILE" | awk '{print $3}')
PASS=$(grep -E '^  Password' "$PWFILE" | awk '{print $3}')
TOKEN=$(curl -s --max-time 45 -X POST "$BASE/api/auth/login" -H 'Content-Type: application/json' \
  -d "{\"identifier\":\"$EMAIL\",\"password\":\"$PASS\"}" | grep -o '"accessToken":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "token diperoleh: $([ -n "$TOKEN" ] && echo ya || echo TIDAK)"

echo
echo "=== 1. GATE KTP (nilai efektif) ==="
curl -s --max-time 45 -H "Authorization: Bearer $TOKEN" "$BASE/api/accounting/readiness" >/dev/null
curl -s --max-time 45 -H "Authorization: Bearer $TOKEN" "$BASE/api/settings/operational" | tr ',' '\n' | grep -i -E 'ktp|gate' | head -10 | sed 's/^/  /'

echo
echo "=== 2. COBA BACA SETTINGS OPERASIONAL (nama endpoint alternatif) ==="
for p in "/api/settings" "/api/operational-settings" "/api/settings/operational" "/api/accounting/settings"; do
  code=$(curl -s -o /tmp/s.json -w '%{http_code}' --max-time 30 -H "Authorization: Bearer $TOKEN" "$BASE$p")
  printf '  GET %-32s -> %s\n' "$p" "$code"
done

echo
echo "=== 3. CARI KONFIGURASI GATE KTP DI DB BARU ==="
APP="$HOME/kost48-prod"
DBURL=$(grep -E '^DATABASE_URL' "$APP/.env" | head -1 | sed -E 's/^DATABASE_URL=//; s/^"//; s/"$//')
DBUSER=$(printf '%s' "$DBURL" | sed -E 's#^postgresql://([^:]+):.*#\1#')
DBPASS_RAW=$(printf '%s' "$DBURL" | sed -E 's#^postgresql://[^:]+:([^@]*)@.*#\1#')
DBPASS=$(printf '%s' "$DBPASS_RAW" | sed -E 's/%([0-9A-Fa-f]{2})/\\x\1/g' | xargs -0 printf '%b' 2>/dev/null || printf '%s' "$DBPASS_RAW")
export PGPASSWORD="$DBPASS"
echo "  kolom OperationalSetting:"
psql -U "$DBUSER" -d kost48s1_prod26 -At -c "select column_name from information_schema.columns where table_name='OperationalSetting' order by ordinal_position;" | tr '\n' ' ' | fold -w 110 | sed 's/^/    /'
echo
echo "  baris OperationalSetting:"
psql -U "$DBUSER" -d kost48s1_prod26 -At -F' | ' -c "select id, \"aiFeaturesEnabled\", \"aiManualOnly\" from \"OperationalSetting\";" 2>&1 | sed 's/^/    /'

echo
echo "=== 4. ENDPOINT SEED COA (cek ketersediaan, belum dijalankan) ==="
code=$(curl -s -o /tmp/coa.json -w '%{http_code}' --max-time 30 -H "Authorization: Bearer $TOKEN" "$BASE/api/accounting/default-coa/seed")
echo "  GET  /api/accounting/default-coa/seed -> $code ($(head -c 120 /tmp/coa.json | tr -d '\n'))"

echo
echo "=== 5. JUMLAH COA & CASH ACCOUNT SAAT INI ==="
echo "  ChartOfAccount: $(psql -U "$DBUSER" -d kost48s1_prod26 -At -c 'select count(*) from "ChartOfAccount";' 2>&1)"
echo "  AccountingPeriod: $(psql -U "$DBUSER" -d kost48s1_prod26 -At -c 'select count(*) from "AccountingPeriod";' 2>&1)"
echo "  CashAccount: $(psql -U "$DBUSER" -d kost48s1_prod26 -At -c 'select count(*) from "CashAccount";' 2>&1)"
unset PGPASSWORD
