#!/bin/bash
# Arahkan env var app di konfigurasi cPanel (.cl.selector/node-selector.json) ke DB baru, lalu restart & buktikan.
set -eu
HOME_DIR="$HOME"
NS="$HOME_DIR/.cl.selector/node-selector.json"
APP="$HOME/kost48-prod"
NEWDB="kost48s1_prod26"
OLDDB="kost48s1_kost48_prod"
TS=$(date +%Y%m%d-%H%M%S)

echo "=== 1. BACKUP KONFIGURASI cPanel ==="
cp -p "$NS" "$HOME_DIR/backups/node-selector.json-$TS.bak"
ls -l "$HOME_DIR/backups/node-selector.json-$TS.bak" | awk '{print "  "$9" ("$5" byte)"}'

echo
echo "=== 2. PRA-UBAH: validasi JSON ==="
if command -v python3 >/dev/null 2>&1; then
  python3 -c "import json,sys; json.load(open('$NS')); print('  JSON valid sebelum perubahan')"
else
  echo "  python3 tidak ada; lewati validasi awal"
fi

echo
echo "=== 3. GANTI NAMA DATABASE HANYA DI BARIS DATABASE_URL (kost48-prod) ==="
echo "  sebelum: $(grep -o "\"DATABASE_URL\": \"[^\"]*\"" "$NS" | sed -E 's#://([^:]+):[^@]*@#://\1:<sensor>@#' | head -2 | tr '\n' ' ')"
sed -i "s#@/$OLDDB\"#@/$NEWDB\"#g" "$NS"
echo "  sesudah: $(grep -o "\"DATABASE_URL\": \"[^\"]*\"" "$NS" | sed -E 's#://([^:]+):[^@]*@#://\1:<sensor>@#' | head -2 | tr '\n' ' ')"

echo
echo "=== 4. VALIDASI JSON SETELAH PERUBAHAN ==="
if command -v python3 >/dev/null 2>&1; then
  python3 -c "import json;d=json.load(open('$NS'));k='kost48-prod';print('  JSON valid. app_status=',d[k].get('app_status'),'domain=',d[k].get('domain'));print('  DATABASE_URL ->', d[k]['env_vars']['DATABASE_URL'].split('@')[-1])"
else
  echo "  python3 tidak ada; cek manual:"
  grep -A2 'DATABASE_URL' "$NS" | head -3 | sed -E 's#://([^:]+):[^@]*@#://\1:<sensor>@#'
fi

echo
echo "=== 5. RESTART APP ==="
PIDS=$(ps -u "$(id -un)" -o pid,cmd 2>/dev/null | grep 'lsnode:' | grep -v grep | awk '{print $1}')
for p in $PIDS; do kill -TERM "$p" 2>/dev/null && echo "  kill -TERM $p"; done
sleep 6
curl -s -o /dev/null -w "  picul: HTTP %{http_code} (%{time_total}s)\n" --max-time 90 "https://kost48surabaya.com/api/public/rooms?limit=1"
sleep 2

echo
echo "=== 6. ENV PROSES BARU (bukti langsung) ==="
PID=$(ps -u "$(id -un)" -o pid,cmd 2>/dev/null | grep 'lsnode:' | grep -v grep | awk '{print $1}' | head -1)
echo "  PID app: $PID"
tr '\0' '\n' < "/proc/$PID/environ" 2>/dev/null | grep -E '^DATABASE_URL=' | sed -E 's#://([^:]+):[^@]*@#://\1:<sensor>@#' | sed 's/^/  /'

echo
echo "=== 7. UJI PEMBEDA: penanda di DB BARU ==="
DBURL=$(grep -E '^DATABASE_URL' "$APP/.env" | head -1 | sed -E 's/^DATABASE_URL=//; s/^"//; s/"$//')
DBUSER=$(printf '%s' "$DBURL" | sed -E 's#^postgresql://([^:]+):.*#\1#')
DBPASS_RAW=$(printf '%s' "$DBURL" | sed -E 's#^postgresql://[^:]+:([^@]*)@.*#\1#')
DBPASS=$(printf '%s' "$DBPASS_RAW" | sed -E 's/%([0-9A-Fa-f]{2})/\\x\1/g' | xargs -0 printf '%b' 2>/dev/null || printf '%s' "$DBPASS_RAW")
export PGPASSWORD="$DBPASS"
psql -U "$DBUSER" -d "$NEWDB" -At -c "update \"Room\" set name='Kamar A [BARU]' where code='A';" >/dev/null
sleep 2
A=$(curl -s --max-time 40 "https://kost48surabaya.com/api/public/rooms?limit=5" | grep -o '"name":"Kamar A[^"]*"' | head -1)
echo "  API: $A"
if printf '%s' "$A" | grep -q 'BARU'; then echo "  ==> APP MEMAKAI DB BARU ✔"; VERDICT=BARU; else echo "  ==> masih DB lama"; VERDICT=LAMA; fi
psql -U "$DBUSER" -d "$NEWDB" -At -c "update \"Room\" set name='Kamar A' where code='A';" >/dev/null
echo "  penanda dikembalikan: $(psql -U "$DBUSER" -d "$NEWDB" -At -c "select name from \"Room\" where code='A';")"

echo
echo "=== 8. VERSI + JUMLAH USER ==="
echo "  version.json: $(curl -s --max-time 30 https://kost48surabaya.com/version.json | tr -d '\n ')"
echo "  user DB baru: $(psql -U "$DBUSER" -d "$NEWDB" -At -c 'select count(*) from "User";')"
echo "  user DB lama: $(psql -U "$DBUSER" -d "$OLDDB" -At -c 'select count(*) from "User";')"
echo "VERDICT=$VERDICT"
unset PGPASSWORD
