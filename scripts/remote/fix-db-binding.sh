#!/bin/bash
# Arahkan .htaccess (yang mengalahkan .env) ke DB baru, restart, lalu buktikan dengan penanda.
set -eu
APP="$HOME/kost48-prod"
HT="$HOME/public_html/.htaccess"
NEWDB="kost48s1_prod26"
OLDDB="kost48s1_kost48_prod"
TS=$(date +%Y%m%d-%H%M%S)

echo "=== 1. BACKUP .htaccess ==="
cp -p "$HT" "$HOME/backups/htaccess-$TS.bak"
ls -l "$HOME/backups/htaccess-$TS.bak" | awk '{print "  "$9" ("$5" byte)"}'

echo
echo "=== 2. GANTI NAMA DATABASE DI BARIS SetEnv DATABASE_URL ==="
sed -i "/SetEnv DATABASE_URL/s#@/$OLDDB#@/$NEWDB#" "$HT"
grep -E 'SetEnv DATABASE_URL' "$HT" | sed -E 's#://([^:]+):[^@]*@#://\1:<sensor>@#' | sed 's/^/  sekarang: /'

echo
echo "=== 3. RESTART APP ==="
PIDS=$(ps -u "$(id -un)" -o pid,cmd 2>/dev/null | grep 'lsnode:' | grep -v grep | awk '{print $1}')
for p in $PIDS; do kill -TERM "$p" 2>/dev/null && echo "  kill -TERM $p"; done
sleep 6

echo
echo "=== 4. PICUL ULANG ==="
curl -s -o /dev/null -w "  GET /api/public/rooms -> HTTP %{http_code} (%{time_total}s)\n" --max-time 90 "https://kost48surabaya.com/api/public/rooms?limit=1"

echo
echo "=== 5. UJI PEMBEDA (penanda di DB baru) ==="
DBURL=$(grep -E '^DATABASE_URL' "$APP/.env" | head -1 | sed -E 's/^DATABASE_URL=//; s/^"//; s/"$//')
DBUSER=$(printf '%s' "$DBURL" | sed -E 's#^postgresql://([^:]+):.*#\1#')
DBPASS_RAW=$(printf '%s' "$DBURL" | sed -E 's#^postgresql://[^:]+:([^@]*)@.*#\1#')
DBPASS=$(printf '%s' "$DBPASS_RAW" | sed -E 's/%([0-9A-Fa-f]{2})/\\x\1/g' | xargs -0 printf '%b' 2>/dev/null || printf '%s' "$DBPASS_RAW")
export PGPASSWORD="$DBPASS"
psql -U "$DBUSER" -d "$NEWDB" -At -c "update \"Room\" set name='Kamar M [penanda-uji]' where code='M';" >/dev/null
sleep 2
RESP=$(curl -s --max-time 40 "https://kost48surabaya.com/api/public/rooms?limit=20")
if printf '%s' "$RESP" | grep -q 'penanda-uji'; then
  echo "  ==> APP MEMBACA DB BARU (kost48s1_prod26) — BERHASIL"
  VERDICT="BARU"
else
  echo "  ==> masih DB lama"
  VERDICT="LAMA"
fi
psql -U "$DBUSER" -d "$NEWDB" -At -c "update \"Room\" set name='Kamar M' where code='M';" >/dev/null
echo "  penanda dikembalikan: $(psql -U "$DBUSER" -d "$NEWDB" -At -c "select name from \"Room\" where code='M';")"

echo
echo "=== 6. VERSI YANG DILAYANI + JUMLAH USER DI DB BARU ==="
echo "  version.json: $(curl -s --max-time 30 https://kost48surabaya.com/version.json | tr -d '\n ')"
echo "  user di DB baru: $(psql -U "$DBUSER" -d "$NEWDB" -At -c 'select count(*) from "User";')"
echo "  user di DB lama: $(psql -U "$DBUSER" -d "$OLDDB" -At -c 'select count(*) from "User";')"

echo
echo "=== 7. LOG ERROR SETELAH RESTART ==="
tail -8 "$APP/stderr.log" 2>/dev/null | sed 's/^/  /'
echo "VERDICT=$VERDICT"
unset PGPASSWORD
