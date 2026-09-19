#!/bin/bash
# Verifikasi isi chunk halaman baru + kontrak API yang dipakainya.
set -u
APP="$HOME/kost48-prod"
BASE="https://kost48surabaya.com"

echo "=== 1. ISI CHUNK HALAMAN BARU ==="
for f in $(ls -1 "$APP/client/assets" | grep -iE 'CekPage|OkupansiPage'); do
  echo "--- $f ($(stat -c %s "$APP/client/assets/$f") byte) ---"
  for kata in "Checklist Go-Live" "Perlu keputusan owner" "Urutan yang disarankan" "Ketersediaan Kamar" "X-Availability-Pin" "Tersembunyi" "Muat ulang"; do
    n=$(grep -c "$kata" "$APP/client/assets/$f" 2>/dev/null || true)
    printf '    %-26s %s\n' "$kata" "${n:-0}"
  done
done

echo
echo "=== 2. ASET DIAMBIL LEWAT HTTPS ==="
for f in $(ls -1 "$APP/client/assets" | grep -iE 'CekPage|OkupansiPage'); do
  curl -s -o /dev/null -w "  /assets/$f -> %{http_code} (%{size_download} byte, cache: %header{cache-control})\n" --max-time 40 "$BASE/assets/$f"
done

echo
echo "=== 3. KONTRAK API YANG DIPAKAI HALAMAN /okupansi (read-only) ==="
PIN=$(grep -E '^SetEnv AVAILABILITY_OWNER_PIN' "$HOME/public_html/.htaccess" | awk '{print $3}')
curl -s -o /dev/null -w "  GET  /api/public/availability/setup (PIN benar) -> %{http_code}\n" --max-time 40 -H "X-Availability-Pin: $PIN" "$BASE/api/public/availability/setup"
curl -s -o /dev/null -w "  GET  /api/public/availability/setup (PIN salah) -> %{http_code}\n" --max-time 40 -H "X-Availability-Pin: salah" "$BASE/api/public/availability/setup"

echo
echo "=== 4. STATUS KAMAR SAAT INI (yang akan tampil di /okupansi) ==="
curl -s --max-time 40 -H "X-Availability-Pin: $PIN" "$BASE/api/public/availability/setup" | python3 -c "
import json,sys
d=json.load(sys.stdin)['data']
print('  onlineBookingEnabled:', d.get('onlineBookingEnabled'))
for r in d['rooms']:
    print('   ', r['code'], '->', r['publicStatus'])
" 2>/dev/null

echo
echo "=== 5. LOG ERROR TERBARU (pastikan tidak ada galat baru) ==="
tail -4 "$APP/stderr.log" 2>/dev/null | sed 's/^/  /'
