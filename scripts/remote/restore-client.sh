#!/bin/bash
# Diagnosa + restore client dari backup terakhir yang KONSISTEN.
set -u
APP="$HOME/kost48-prod"
ASSETS="$APP/client/assets"

echo "=== 1. ISI SETIAP BACKUP client (index + chunk halaman baru) ==="
for b in $(ls -1t "$HOME"/backups/client-*.tar.gz); do
  echo "--- $(basename "$b") ($(stat -c %y "$b" | cut -d. -f1)) ---"
  tar -tzf "$b" | grep -E 'assets/(index-[A-Za-z0-9_-]+\.js|CekPage-[A-Za-z0-9_-]+\.js|OkupansiPage-[A-Za-z0-9_-]+\.js)$' | sed 's/^/    /'
done

echo
echo "=== 2. KONDISI SEKARANG di client/assets ==="
ls -1 "$ASSETS" | grep -E '^(index-[A-Za-z0-9_-]+\.js|CekPage.*|OkupansiPage.*)$' | sed 's/^/  /'
echo "  total file assets: $(find "$ASSETS" -type f | wc -l)"

echo
echo "=== 3. RESTORE dari backup TERAKHIR ==="
LATEST=$(ls -1t "$HOME"/backups/client-*.tar.gz | head -1)
echo "  memakai: $(basename "$LATEST")"
rm -rf "$APP/client"
tar -xzf "$LATEST" -C "$APP"
echo "  client dipulihkan. version.json: $(cat "$APP/client/version.json" | tr -d '\n ')"
echo "  total file assets sekarang: $(find "$ASSETS" -type f | wc -l)"

echo
echo "=== 4. VERIFIKASI RUJUKAN index -> chunk ==="
IDX=$(ls -1 "$ASSETS"/index-*.js | head -1)
echo "  index: $(basename "$IDX")"
for pola in 'CekPage-[A-Za-z0-9_-]*\.js' 'OkupansiPage-[A-Za-z0-9_-]*\.js'; do
  R=$(grep -o "$pola" "$IDX" | sort -u)
  if [ -n "$R" ]; then
    for r in $R; do
      if [ -f "$ASSETS/$r" ]; then echo "    OK   $r (ada)"; else echo "    HILANG $r"; fi
    done
  else
    echo "    (tidak dirujuk index: $pola)"
  fi
done

echo
echo "=== 5. UJI HALAMAN LEWAT HTTPS ==="
BASE="https://kost48surabaya.com"
for p in /cek /okupansi; do curl -s -o /dev/null -w "  $p -> %{http_code}\n" --max-time 40 "$BASE$p"; done
