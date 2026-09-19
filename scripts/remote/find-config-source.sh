#!/bin/bash
# Cari SEMUA sumber konfigurasi env/Passenger yang mungkin menang. Read-only.
set -u
echo "=== SEMUA FILE .htaccess DI HOME (dengan penanda Passenger/SetEnv) ==="
find "$HOME" -maxdepth 3 -name '.htaccess' -not -path '*/node_modules/*' 2>/dev/null | while read -r f; do
  echo "--- $f ($(stat -c %y "$f" | cut -d. -f1)) ---"
  grep -E 'Passenger|SetEnv' "$f" 2>/dev/null | sed -E 's#(DATABASE_URL|JWT_SECRET|CRON_TOKEN|OWNER_PIN)[ =]+[^ ]+#\1 <sensor>#' | sed 's/^/    /'
done

echo
echo "=== CARI DATABASE_URL / JWT_SECRET DI SEMUA FILE KONFIG (nilai disensor) ==="
grep -rl --include='.htaccess' --include='.env' --include='*.conf' -E 'SetEnv DATABASE_URL|^DATABASE_URL' "$HOME" 2>/dev/null | grep -v node_modules | head -20

echo
echo "=== FILE .env YANG ADA BESERTA DATABASE_URL-NYA ==="
for f in "$HOME"/*/.env; do
  [ -f "$f" ] || continue
  u=$(grep -E '^DATABASE_URL' "$f" 2>/dev/null | sed -E 's#://([^:]+):[^@]*@#://\1:<sensor>@#')
  printf '  %-45s %s\n' "$f" "$u"
done

echo
echo "=== APP PASSENGER AKTIF (dari proses berjalan) ==="
ps -u "$(id -un)" -o pid,etime,cmd 2>/dev/null | grep 'lsnode:' | grep -v grep | sed 's/^/  /'

echo
echo "=== DOMAIN -> DOCUMENT ROOT (dari konfigurasi cPanel) ==="
for f in "$HOME"/.cpanel/datastore/*domain* "$HOME"/.cpanel/datastore/*vhost*; do
  [ -f "$f" ] && echo "--- $f ---" && head -20 "$f"
done
grep -rl 'kost48surabaya' "$HOME/.cpanel/datastore" 2>/dev/null | head -5

echo
echo "=== CEK public_html: apakah ada index.html/aset app lain yang menutupi ==="
ls -la "$HOME/public_html" | head -20

echo
echo "=== ISI PENUH .htaccess public_html (secret disensor) ==="
sed -E 's#(SetEnv (DATABASE_URL|JWT_SECRET|AUTO_OPS_CRON_TOKEN|AVAILABILITY_OWNER_PIN)) .*#\1 <sensor>#' "$HOME/public_html/.htaccess"
