#!/bin/bash
# Verifikasi chunk yang BENAR-BENAR dimuat halaman (dibaca dari entry index), lalu sapu aset usang dengan aman.
set -u
APP="$HOME/kost48-prod"
ASSETS="$APP/client/assets"
BASE="https://kost48surabaya.com"

echo "=== 1. ENTRY YANG DIRUJUK index.html ==="
ENTRY=$(grep -oE 'assets/index-[A-Za-z0-9_-]+\.js' "$APP/client/index.html" | head -1)
echo "  entry: $ENTRY  (ada: $([ -f "$APP/$ENTRY" ] && echo ya || echo TIDAK))"

echo
echo "=== 2. CARI NAMA CHUNK HALAMAN (impor dinamis di entry & chunk terkait) ==="
for f in "$APP/$ENTRY" $(ls -1 "$ASSETS"/index-*.js); do
  grep -o 'CekPage-[A-Za-z0-9_-]*\.js' "$f" 2>/dev/null | sort -u | while read -r c; do echo "  $(basename "$f") -> $c"; done
  grep -o 'OkupansiPage-[A-Za-z0-9_-]*\.js' "$f" 2>/dev/null | sort -u | while read -r c; do echo "  $(basename "$f") -> $c"; done
done | sort -u

echo
echo "=== 3. UJI AMBIL CHUNK LEWAT HTTPS ==="
for c in $(grep -ohE '(CekPage|OkupansiPage)-[A-Za-z0-9_-]+\.js' "$ASSETS"/index-*.js 2>/dev/null | sort -u); do
  code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 30 "$BASE/assets/$c")
  printf '  %-32s -> %s\n' "$c" "$code"
done

echo
echo "=== 4. SAPU AMAN: hapus hanya chunk halaman yang TIDAK disebut di entry/asset aktif ==="
# Ambil daftar nama yang masih disebut oleh entry index + semua index-*.js (entry chain) + sw.js
AKTIF=$( { cat "$APP/$ENTRY"; cat "$ASSETS"/index-*.js 2>/dev/null; cat "$APP/client/sw.js" 2>/dev/null; } | grep -ohE '(CekPage|OkupansiPage)-[A-Za-z0-9_-]+\.js' | sort -u )
echo "  dirujuk: $(echo "$AKTIF" | tr '\n' ' ')"
for f in "$ASSETS"/CekPage-*.js "$ASSETS"/OkupansiPage-*.js; do
  [ -e "$f" ] || continue
  b=$(basename "$f")
  if ! printf '%s\n' "$AKTIF" | grep -qx "$b"; then
    echo "  hapus usang: $b"
    rm -f "$f"
  else
    echo "  pertahankan: $b"
  fi
done

echo
echo "=== 5. UJI AKHIR HALAMAN ==="
for p in /cek /okupansi /update-kamar; do curl -s -o /dev/null -w "  $p -> %{http_code}\n" --max-time 40 "$BASE$p"; done
echo "  total aset: $(find "$ASSETS" -type f | wc -l)"
echo "  version.json: $(cat "$APP/client/version.json" | tr -d '\n ')"
