#!/bin/bash
# Verifikasi akhir: chunk terpasang + daftar backup.
set -u
APP="$HOME/kost48-prod"
echo "=== CHUNK CekPage DI SERVER ==="
ls -l --time-style=+%H:%M "$APP/client/assets" | grep -i cekpage
f=$(ls -1 "$APP/client/assets" | grep -i 'CekPage' | head -1)
echo "  nama: $f"
echo "  ukuran: $(stat -c %s "$APP/client/assets/$f") byte"
echo "  cek kata kunci baru:"
for kata in "overlap" "Terisi 12 kamar" "13 akun portal" "Passenger menyajikan"; do
  printf '    %-22s -> %s\n' "$kata" "$(grep -c "$kata" "$APP/client/assets/$f" 2>/dev/null || echo 0)"
done
echo "  cek kata kunci LAMA (harus 0):"
for kata in "1 proses Passenger" "Semua kamar saat ini tampil Penuh"; do
  printf '    %-32s -> %s\n' "$kata" "$(grep -c "$kata" "$APP/client/assets/$f" 2>/dev/null || echo 0)"
done

echo
echo "=== SEMUA BACKUP (urut waktu) ==="
ls -lht --time-style=+'%d %H:%M' "$HOME/backups" | sed 's/^/  /'

echo
echo "=== VERSI & PROSES ==="
cat "$APP/client/version.json" | tr -d '\n' | sed 's/^/  /'; echo
ps -u "$(id -un)" -o pid,etime,rss,cmd 2>/dev/null | grep 'lsnode:' | grep -v grep | awk '{printf "  PID %s up %s RSS %.0f MB\n", $1, $2, $3/1024}'
