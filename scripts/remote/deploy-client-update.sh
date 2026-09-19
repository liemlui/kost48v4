#!/bin/bash
# Pasang pembaruan client/ (halaman /okupansi + /cek) tanpa menyentuh backend.
set -eu
APP="$HOME/kost48-prod"
TS=$(date +%Y%m%d-%H%M%S)

echo "=== 1. BACKUP client LAMA ==="
tar -czf "$HOME/backups/client-$TS.tar.gz" -C "$APP" client
ls -lh "$HOME/backups/client-$TS.tar.gz" | awk '{print "  "$9" ("$5")"}'
echo "  versi lama: $(cat "$APP/client/version.json" | tr -d '\n ')"

echo
echo "=== 2. EXTRACT client BARU ==="
tar -xzf "$HOME/staging/client-update.tgz" -C "$APP/client"
echo "  versi baru: $(cat "$APP/client/version.json" | tr -d '\n ')"
echo "  jumlah aset: $(find "$APP/client/assets" -type f | wc -l)"

echo
echo "=== 3. VERIFIKASI ASET HALAMAN BARU ADA DI SERVER ==="
ls -1 "$APP/client/assets" | grep -iE 'Okupansi|CekPage' | sed 's/^/  /' || echo "  (chunk dinamai lain; dicek lewat HTTP di bawah)"

echo
echo "=== 4. UJI VIA HTTPS (tanpa restart) ==="
BASE="https://kost48surabaya.com"
curl -s -o /dev/null -w "  GET /cek               -> %{http_code}\n" --max-time 40 "$BASE/cek"
curl -s -o /dev/null -w "  GET /okupansi          -> %{http_code}\n" --max-time 40 "$BASE/okupansi"
curl -s -o /dev/null -w "  GET /update-kamar      -> %{http_code}\n" --max-time 40 "$BASE/update-kamar"
curl -s --max-time 30 "$BASE/version.json" | tr -d '\n' | sed 's/^/  version.json: /'; echo
echo "  header /cek:"
curl -s -D - -o /dev/null --max-time 40 "$BASE/cek" | grep -iE '^(HTTP|cache-control|content-type)' | sed 's/^/    /'
echo "  isi HTML /cek (cek markup):"
curl -s --max-time 40 "$BASE/cek" | grep -oE '<title>[^<]*</title>|<meta name="description"[^>]*>' | head -3 | sed 's/^/    /'
