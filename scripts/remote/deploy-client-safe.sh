#!/bin/bash
# Pasang client/ baru TANPA menyisakan chunk lama: folder diganti utuh, bukan ditimpa.
# Dipakai setelah `deploy/client-update.tgz` diunggah ke ~/staging/ (lihat M20 §6.1).
# Aman rollback: client lama disimpan sebagai client-old-<timestamp>.
set -eu

APP="$HOME/kost48-prod"
# Arsip bisa diberikan sebagai argumen pertama; default mengikuti M20 §6.
STAGING="${1:-$HOME/staging/client-update.tgz}"
TS=$(date +%Y%m%d-%H%M%S)
BASE="https://kost48surabaya.com"

[ -f "$STAGING" ] || { echo "GAGAL: arsip tidak ada di $STAGING"; exit 1; }
echo "arsip   : $STAGING ($(stat -c%s "$STAGING") byte)"

echo "=== 1. BACKUP client lama ==="
mkdir -p "$HOME/backups"
tar -czf "$HOME/backups/client-$TS.tar.gz" -C "$APP" client
echo "  backup  : client-$TS.tar.gz"
echo "  versi   : $(tr -d '\n ' < "$APP/client/version.json")"

echo
echo "=== 2. EKSTRAK KE FOLDER BARU (client lama belum disentuh) ==="
rm -rf "$APP/client-new"
mkdir -p "$APP/client-new"
tar -xzf "$STAGING" -C "$APP/client-new"
echo "  aset baru: $(find "$APP/client-new/assets" -type f | wc -l)"

echo
echo "=== 3. VERIFIKASI ENTRY DARI index.html (bukan dari daftar tebakan) ==="
ENTRY=$(grep -oE 'assets/index-[A-Za-z0-9_-]+\.js' "$APP/client-new/index.html" | head -1)
if [ -z "$ENTRY" ] || [ ! -f "$APP/client-new/$ENTRY" ]; then
  echo "  GAGAL: entry '$ENTRY' tidak ada — client lama TIDAK disentuh"
  exit 1
fi
echo "  entry   : $ENTRY (ada)"

echo
echo "=== 4. TUKAR FOLDER ==="
mv "$APP/client" "$APP/client-old-$TS"
mv "$APP/client-new" "$APP/client"
echo "  client baru aktif; client lama = client-old-$TS"
echo "  rollback: mv $APP/client-old-$TS $APP/client"

echo
echo "=== 5. UJI HTTPS (aset statis berlaku tanpa restart) ==="
curl -s -o /dev/null -w "  GET /        -> %{http_code}\n" --max-time 40 "$BASE/"
curl -s -o /dev/null -w "  GET /rooms   -> %{http_code}\n" --max-time 40 "$BASE/rooms"
curl -s -o /dev/null -w "  GET /cek     -> %{http_code}\n" --max-time 40 "$BASE/cek"
echo "  version.json (dari server): $(curl -s --max-time 30 "$BASE/version.json" | tr -d '\n ' | head -c 120)"
echo "  version.json (lokal disk) : $(tr -d '\n ' < "$APP/client/version.json")"
echo
echo "  backend/DB/.env/uploads tidak disentuh; tanpa restart."
