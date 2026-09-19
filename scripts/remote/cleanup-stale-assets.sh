#!/bin/bash
# Pastikan app menyajikan chunk terbaru + bersihkan aset usang dari deploy berulang.
set -u
APP="$HOME/kost48-prod"
ASSETS="$APP/client/assets"
TS=$(date +%Y%m%d-%H%M%S)

echo "=== 1. CHUNK CekPage YANG DIRUJUK index ==="
IDX=$(ls -1 "$ASSETS"/index-*.js | head -1)
echo "  index: $(basename "$IDX")"
grep -o 'CekPage-[A-Za-z0-9_-]*\.js' "$IDX" | sort -u | sed 's/^/  dirujuk: /'
grep -o 'OkupansiPage-[A-Za-z0-9_-]*\.js' "$IDX" | sort -u | sed 's/^/  dirujuk: /'

echo
echo "=== 2. ASET USANG (tidak dirujuk index/manifest) ==="
USANG=0
for f in "$ASSETS"/CekPage-*.js "$ASSETS"/OkupansiPage-*.js; do
  b=$(basename "$f")
  if ! grep -q "$b" "$IDX"; then
    echo "  usang: $b ($(stat -c %s "$f") byte)"
    USANG=$((USANG+1))
  fi
done
echo "  total usang (CekPage/OkupansiPage): $USANG"

echo
echo "=== 3. BACKUP client LALU HAPUS ASET USANG TERSEBUT ==="
tar -czf "$HOME/backups/client-$TS.tar.gz" -C "$APP" client
for f in "$ASSETS"/CekPage-*.js "$ASSETS"/OkupansiPage-*.js; do
  b=$(basename "$f")
  if ! grep -q "$b" "$IDX"; then rm -f "$f"; echo "  dihapus: $b"; fi
done
# sapu chunk lama lain yang namanya sama (pola -HASH.js) bila tidak dirujuk index maupun sw.js
echo "  cek total aset sekarang: $(find "$ASSETS" -type f | wc -l)"

echo
echo "=== 4. UJI HTTP + ISI ==="
BASE="https://kost48surabaya.com"
for p in /cek /okupansi; do curl -s -o /dev/null -w "  $p -> %{http_code}\n" --max-time 40 "$BASE$p"; done
CHUNK=$(grep -o 'CekPage-[A-Za-z0-9_-]*\.js' "$IDX" | head -1)
echo "  chunk aktif: $CHUNK"
curl -s -o /dev/null -w "  ambil /assets/$CHUNK -> %{http_code} (%{size_download} byte)\n" --max-time 40 "$BASE/assets/$CHUNK"
echo "  kata kunci di chunk aktif:"
for kata in "overlap" "Terisi 12 kamar" "1 proses Passenger"; do
  printf '    %-22s -> %s\n' "$kata" "$(grep -c "$kata" "$ASSETS/$CHUNK" || echo 0)"
done
