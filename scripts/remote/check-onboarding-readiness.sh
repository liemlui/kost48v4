#!/bin/bash
# Cek kesiapan onboarding: fitur aktif, field wajib untuk stay, dan dampak tarif.
set -u
BASE="https://kost48surabaya.com"
PWFILE="$HOME/OWNER-PASSWORD-BACA-LALU-HAPUS.txt"
EMAIL=$(grep -E '^  Email' "$PWFILE" | awk '{print $3}')
PASS=$(grep -E '^  Password' "$PWFILE" | awk '{print $3}')
TOKEN=$(curl -s --max-time 45 -X POST "$BASE/api/auth/login" -H 'Content-Type: application/json' \
  -d "{\"identifier\":\"$EMAIL\",\"password\":\"$PASS\"}" | grep -o '"accessToken":"[^"]*"' | head -1 | cut -d'"' -f4)
AUTH="Authorization: Bearer $TOKEN"

echo "=== 1. STATUS FITUR (fitur apa yang aktif) ==="
curl -s --max-time 45 -H "$AUTH" "$BASE/api/settings/operational" | python3 -c "
import json,sys
d=json.load(sys.stdin)['data']
for k in ['ktpVerificationGateEnabled','autoOpsEnabled','aiFeaturesEnabled','tenantLoyaltyEnabled','journalReconciliationEnabled','waterMeteringEnabled','notificationPruningEnabled']:
    print(f'  {k} = {d.get(k)}')
" 2>/dev/null | sed 's/^/ /'

echo
echo "=== 2. DAMPAK TARIF: apakah check-in memakai tarif kamar atau tarif kontrak? ==="
grep -rn "monthlyRateRupiah" "$HOME/kost48-prod/dist/modules/stays/stays.service.js" 2>/dev/null | head -5 | sed 's/^/  /'
grep -rn "agreedRent\|contractRate\|rentAmountRupiah\|monthlyRentRupiah" "$HOME/kost48-prod/dist/modules/stays/stays.service.js" 2>/dev/null | head -8 | sed 's/^/  /'

echo
echo "=== 3. FIELD TABEL STAY YANG WAJIB (NOT NULL tanpa default) ==="
APP="$HOME/kost48-prod"
DBURL=$(grep -E '^DATABASE_URL' "$APP/.env" | head -1 | sed -E 's/^DATABASE_URL=//; s/^"//; s/"$//')
DBUSER=$(printf '%s' "$DBURL" | sed -E 's#^postgresql://([^:]+):.*#\1#')
DBPASS_RAW=$(printf '%s' "$DBURL" | sed -E 's#^postgresql://[^:]+:([^@]*)@.*#\1#')
DBPASS=$(printf '%s' "$DBPASS_RAW" | sed -E 's/%([0-9A-Fa-f]{2})/\\x\1/g' | xargs -0 printf '%b' 2>/dev/null || printf '%s' "$DBPASS_RAW")
export PGPASSWORD="$DBPASS"
psql -U "$DBUSER" -d kost48s1_prod26 -At -c "select column_name||' ('||data_type||')' from information_schema.columns where table_name='Stay' and is_nullable='NO' order by ordinal_position;" | tr '\n' ' ' | fold -w 115 | sed 's/^/  /'
echo
echo "=== 4. KOLOM STAY YANG BERHUBUNGAN TARIF/DEPOSIT ==="
psql -U "$DBUSER" -d kost48s1_prod26 -At -c "select column_name||' : '||data_type from information_schema.columns where table_name='Stay' and (column_name ilike '%rate%' or column_name ilike '%rent%' or column_name ilike '%deposit%' or column_name ilike '%tarif%') order by ordinal_position;" | sed 's/^/  /'
echo
echo "=== 5. ENDPOINT STAYS YANG TERSEDIA (cek kontrak API) ==="
curl -s --max-time 45 -H "$AUTH" "$BASE/api/stays?limit=1" | head -c 200 | sed 's/^/  /'; echo
unset PGPASSWORD
