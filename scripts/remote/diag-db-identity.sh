#!/bin/bash
# Baca environment proses app yang BERJALAN (sumber kebenaran) + uji dua arah.
set -u
APP="$HOME/kost48-prod"
NEWDB="kost48s1_prod26"
OLDDB="kost48s1_kost48_prod"

PID=$(ps -u "$(id -un)" -o pid,cmd 2>/dev/null | grep 'lsnode:' | grep -v grep | awk '{print $1}' | head -1)
echo "=== PID APP: $PID ==="

echo
echo "=== ENVIRONMENT PROSES (hanya yang relevan, nilai disensor) ==="
if [ -n "$PID" ] && [ -r "/proc/$PID/environ" ]; then
  tr '\0' '\n' < "/proc/$PID/environ" | grep -E '^(DATABASE_URL|JWT_SECRET|NODE_OPTIONS|AVAILABILITY_OWNER_PIN|CORS_ORIGIN|NODE_ENV|AUTO_OPS_ENABLED|PORT)=' \
    | sed -E 's#(DATABASE_URL=).*@/#\1<sensor>@/#; s#(JWT_SECRET=).*#\1<sensor>#; s#(AVAILABILITY_OWNER_PIN=).*#\1<sensor>#' | sed 's/^/  /'
else
  echo "  /proc/$PID/environ tidak bisa dibaca (izin)"
fi

echo
echo "=== KONFIGURASI ENV DI SIDEBAR cPanel NODE.JS APP ==="
find "$HOME" -maxdepth 3 -type f \( -name 'envvars' -o -name '*.json' -o -name 'nodeapp*' \) -path '*node*' 2>/dev/null | head
for f in "$HOME"/.cl.selector/* "$HOME"/.cpanel/datastore/*nodeapp* "$HOME"/nodevenv/kost48-prod/22/.env; do
  [ -f "$f" ] && echo "--- $f ---" && sed -E 's#(DATABASE_URL|JWT_SECRET|TOKEN|PIN)[= "]+[^ "]+#\1 <sensor>#g' "$f" | head -20
done
grep -rl 'kost48s1_kost48_prod' "$HOME/.cl.selector" "$HOME/.cpanel/datastore" 2>/dev/null | head -5

echo
echo "=== UJI ARAH 1: penanda di DB BARU terlihat di API? ==="
DBURL=$(grep -E '^DATABASE_URL' "$APP/.env" | head -1 | sed -E 's/^DATABASE_URL=//; s/^"//; s/"$//')
DBUSER=$(printf '%s' "$DBURL" | sed -E 's#^postgresql://([^:]+):.*#\1#')
DBPASS_RAW=$(printf '%s' "$DBURL" | sed -E 's#^postgresql://[^:]+:([^@]*)@.*#\1#')
DBPASS=$(printf '%s' "$DBPASS_RAW" | sed -E 's/%([0-9A-Fa-f]{2})/\\x\1/g' | xargs -0 printf '%b' 2>/dev/null || printf '%s' "$DBPASS_RAW")
export PGPASSWORD="$DBPASS"
psql -U "$DBUSER" -d "$NEWDB" -At -c "update \"Room\" set name='Kamar A [BARU]' where code='A';" >/dev/null
sleep 2
A_NEW=$(curl -s --max-time 30 "https://kost48surabaya.com/api/public/rooms?limit=5" | grep -o '"name":"Kamar A[^"]*"' | head -1)
echo "  API bilang: $A_NEW"

echo
echo "=== UJI ARAH 2: penanda di DB LAMA terlihat di API? ==="
psql -U "$DBUSER" -d "$OLDDB" -At -c "update \"Room\" set name='Kamar B [LAMA]' where code='B';" >/dev/null
sleep 2
B_OLD=$(curl -s --max-time 30 "https://kost48surabaya.com/api/public/rooms?limit=5" | grep -o '"name":"Kamar B[^"]*"' | head -1)
echo "  API bilang: $B_OLD"

echo
echo "=== KESIMPULAN ==="
if printf '%s' "$A_NEW" | grep -q 'BARU'; then echo "  App memakai DB BARU"; else echo "  penanda DB baru TIDAK terlihat"; fi
if printf '%s' "$B_OLD" | grep -q 'LAMA'; then echo "  App memakai DB LAMA (masih)"; else echo "  penanda DB lama tidak terlihat"; fi

echo
echo "=== KEMBALIKAN NAMA KAMAR DI KEDUA DB ==="
psql -U "$DBUSER" -d "$NEWDB" -At -c "update \"Room\" set name='Kamar A' where code='A';" >/dev/null
psql -U "$DBUSER" -d "$OLDDB" -At -c "update \"Room\" set name='Kamar B' where code='B';" >/dev/null
echo "  DB baru  A = $(psql -U "$DBUSER" -d "$NEWDB" -At -c "select name from \"Room\" where code='A';")"
echo "  DB lama  B = $(psql -U "$DBUSER" -d "$OLDDB" -At -c "select name from \"Room\" where code='B';")"
unset PGPASSWORD
