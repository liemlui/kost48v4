#!/bin/bash
# Inspeksi kondisi app produksi yang sedang berjalan. Read-only.
APP="$HOME/kost48-prod"

echo "=== ISI ROOT APP ==="
ls -la "$APP"
echo
echo "=== VERSI YANG BERJALAN SEKARANG ==="
cat "$APP/client/version.json" 2>/dev/null || echo "version.json tidak ada"
echo
echo "=== TANGGAL BUILD ARTEFAK LAMA (dist/main.js & client) ==="
stat -c '%y  %n' "$APP/dist/main.js" 2>/dev/null
stat -c '%y  %n' "$APP/client/index.html" 2>/dev/null
stat -c '%y  %n' "$APP/package.json" 2>/dev/null
echo
echo "=== UKURAN & JUMLAH FILE APP LAMA ==="
du -sh "$APP" 2>/dev/null
find "$APP" -type f 2>/dev/null | wc -l
echo
echo "=== ADA UPLOADS (data pengguna) DI DALAM APP? ==="
if [ -e "$APP/uploads" ]; then
  du -sh "$APP/uploads" 2>/dev/null
  ls -la "$APP/uploads" | head -10
  find "$APP/uploads" -type f 2>/dev/null | wc -l
else
  echo "TIDAK ADA folder uploads di $APP"
fi
echo
echo "=== CARI UPLOADS DI SELURUH HOME (data foto kamar/bukti bayar) ==="
for u in "$HOME"/*/uploads "$HOME"/uploads; do [ -e "$u" ] && du -sh "$u" 2>/dev/null && find "$u" -type f 2>/dev/null | wc -l; done
echo
echo "=== STRUKTUR .htaccess PENANDA PASSENGER ==="
cat "$APP/.htaccess" 2>/dev/null || echo "tidak ada .htaccess di app root"
echo "--- public_html/.htaccess ---"
cat "$HOME/public_html/.htaccess" 2>/dev/null | head -40
echo
echo "=== KUNCI ENV YANG ADA (NILAI DISENSOR) ==="
sed -E 's/=.*/=<disembunyikan>/' "$APP/.env" 2>/dev/null | grep -v '^#' | grep -v '^$'
echo
echo "=== DATABASE URL PEMBANDING (host/port/nama DB saja, password disensor) ==="
grep -E '^DATABASE_URL' "$APP/.env" 2>/dev/null | sed -E 's#://([^:]+):[^@]*@#://\1:<sensor>@#'
echo
echo "=== LOG ERROR TERAKHIR (20 baris) ==="
tail -20 "$APP/stderr.log" 2>/dev/null || echo "stderr.log tidak ada"
echo
echo "=== APLIKASI LAIN YANG JUGA MENUNJUK KE DOMAIN ==="
ls -la "$HOME/kost48v3" 2>/dev/null | head -6
cat "$HOME/kost48v3/client/version.json" 2>/dev/null
echo
echo "=== PROSES NODE YANG BERJALAN ==="
ps -u kost48s1 -o pid,etime,rss,cmd 2>/dev/null | grep -i -E 'node|passenger' | grep -v grep | head -10 || echo "tidak terlihat (proses Passenger mungkin milik user lain)"
