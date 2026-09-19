#!/bin/bash
# Ringkasan status akhir.
set -u
echo "=== VERSI & PROSES ==="
cat "$HOME/kost48-prod/client/version.json" | tr -d '\n' | sed 's/^/  /'; echo
ps -u "$(id -un)" -o pid,etime,rss,cmd 2>/dev/null | grep 'lsnode:' | grep -v grep | awk '{printf "  PID %s  up %s  RSS %.0f MB  %s\n", $1, $2, $3/1024, $4}'
echo
echo "=== ENDPOINT PRODUKSI ==="
for p in "/" "/version.json" "/api/public/rooms?limit=1" "/api/stays?limit=1"; do
  code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 40 "https://kost48surabaya.com$p")
  printf '  %-30s -> %s\n' "$p" "$code"
done
echo
echo "=== BACKUP YANG TERSIMPAN ==="
ls -1sh "$HOME/backups" | sed 's/^/  /'
echo
echo "=== DATABASE ==="
APP="$HOME/kost48-prod"
DBURL=$(grep -E '^DATABASE_URL' "$APP/.env" | head -1 | sed -E 's/^DATABASE_URL=//; s/^"//; s/"$//')
DBUSER=$(printf '%s' "$DBURL" | sed -E 's#^postgresql://([^:]+):.*#\1#')
DBPASS_RAW=$(printf '%s' "$DBURL" | sed -E 's#^postgresql://[^:]+:([^@]*)@.*#\1#')
DBPASS=$(printf '%s' "$DBPASS_RAW" | sed -E 's/%([0-9A-Fa-f]{2})/\\x\1/g' | xargs -0 printf '%b' 2>/dev/null || printf '%s' "$DBPASS_RAW")
export PGPASSWORD="$DBPASS"
echo "  aktif (dari env app): $(tr '\0' '\n' < /proc/$(pgrep -f 'lsnode:.*kost48-prod' | head -1)/environ 2>/dev/null | grep '^DATABASE_URL=' | sed -E 's#://([^:]+):[^@]*@#://\1:<sensor>@#')"
for db in kost48s1_prod26 kost48s1_kost48_prod; do
  echo "  $db: $(psql -U "$DBUSER" -d "$db" -At -c "select (select count(*) from \"User\")||' user, '||(select count(*) from \"Room\")||' kamar, '||(select count(*) from \"ChartOfAccount\")||' COA' ;" 2>&1)"
done
unset PGPASSWORD
