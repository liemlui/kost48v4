#!/bin/bash
# UJI READ-ONLY fitur ketersediaan kamar (wizard publik). Tidak mengubah data apa pun.
set -u
BASE="https://kost48surabaya.com"
PIN=$(grep -E '^SetEnv AVAILABILITY_OWNER_PIN' "$HOME/public_html/.htaccess" | awk '{print $3}')

echo "=== 1. GET /api/public/rooms (katalog publik) ==="
curl -s --max-time 40 "$BASE/api/public/rooms?limit=20" | python3 -c "
import json,sys
d=json.load(sys.stdin)['data']
items=d.get('items',[])
print('  jumlah kamar tampil:', len(items))
for r in items:
    print('   ', r.get('code'), '|', r.get('status'), '|', r.get('availabilityLabel') or r.get('publicAvailability') or '-')
" 2>/dev/null | head -20

echo
echo "=== 2. GET /api/public/availability (setup wizard) — TANPA PIN (harus ditolak) ==="
curl -s -o /tmp/av1.json -w "  HTTP %{http_code} | " --max-time 40 "$BASE/api/public/availability/setup"; head -c 150 /tmp/av1.json; echo

echo
echo "=== 3. GET /api/public/availability (setup wizard) — DENGAN PIN ==="
curl -s -o /tmp/av2.json -w "  HTTP %{http_code}\n" --max-time 40 -H "X-Availability-Pin: $PIN" "$BASE/api/public/availability/setup"
python3 - <<'PY' 2>/dev/null
import json
d=json.load(open('/tmp/av2.json'))
data=d.get('data') or {}
print('  kunci respons:', list(data.keys())[:8])
rooms=data.get('rooms') or []
print('  jumlah kamar di wizard:', len(rooms))
for r in rooms[:5]:
    print('   ', r.get('code'), '|', r.get('status'), '|', r.get('availabilityStatus') or r.get('publicStatus') or '-')
PY
head -c 300 /tmp/av2.json | sed 's/^/  ringkas: /'; echo

echo
echo "=== 4. CEK NILAI PublicRoomAvailability DI DB ==="
APP="$HOME/kost48-prod"
DBURL=$(grep -E '^DATABASE_URL' "$APP/.env" | head -1 | sed -E 's/^DATABASE_URL=//; s/^"//; s/"$//')
DBUSER=$(printf '%s' "$DBURL" | sed -E 's#^postgresql://([^:]+):.*#\1#')
DBPASS_RAW=$(printf '%s' "$DBURL" | sed -E 's#^postgresql://[^:]+:([^@]*)@.*#\1#')
DBPASS=$(printf '%s' "$DBPASS_RAW" | sed -E 's/%([0-9A-Fa-f]{2})/\\x\1/g' | xargs -0 printf '%b' 2>/dev/null || printf '%s' "$DBPASS_RAW")
export PGPASSWORD="$DBPASS"
psql -U "$DBUSER" -d kost48s1_prod26 -At -F' | ' -c 'select r.code, r.status, a.status from "Room" r left join "PublicRoomAvailability" a on a."roomId"=r.id order by r.code;' | sed 's/^/  /'
unset PGPASSWORD

echo
echo "=== 5. HALAMAN WIZARD DI FRONTEND ==="
curl -s -o /dev/null -w "  GET /ketersediaan -> %{http_code}\n" --max-time 30 "$BASE/ketersediaan"
curl -s --max-time 30 "$BASE/assets/PublicAvailabilityWizardPage-Byl4_pTs.js" | head -c 200 | sed 's/^/  aset wizard: /'; echo
