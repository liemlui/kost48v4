#!/bin/bash
# Extract paket baru ke app root TANPA menyentuh .env/uploads/tmp. Lalu verifikasi artefak.
set -eu
APP="$HOME/kost48-prod"
TGZ="$HOME/staging/kost48-deploy-bundled.tgz"
TS=$(date +%Y%m%d-%H%M%S)

echo "=== 1. PRA-EXTRACT: catat state lama ==="
echo "versi lama  : $(cat "$APP/client/version.json" 2>/dev/null | tr -d '\n')"
echo "build lama  : $(stat -c %y "$APP/dist/main.js" 2>/dev/null)"
echo "isi penting yang HARUS dipertahankan:"
for x in .env uploads tmp; do [ -e "$APP/$x" ] && printf '  ADA  %s (%s)\n' "$x" "$(du -sh "$APP/$x" 2>/dev/null | cut -f1)"; done

echo
echo "=== 2. BACKUP .env SEBELUM EXTRACT ==="
cp -p "$APP/.env" "$APP/.env.pre-extract-$TS"
ls -l "$APP/.env.pre-extract-$TS" | awk '{print "  "$9" ("$5" byte)"}'

echo
echo "=== 3. EXTRACT PAKET (kecualikan .env, uploads, tmp, arsip lama) ==="
tar -xzf "$TGZ" -C "$APP" \
  --exclude='./.env' --exclude='./uploads' --exclude='./tmp' \
  --exclude='./kost48-deploy-bundled.tgz' --exclude='./.env.*'
echo "extract selesai"

echo
echo "=== 4. VERIFIKASI ARTEFAK BARU ==="
echo "versi baru  : $(cat "$APP/client/version.json" | tr -d '\n')"
echo "build baru  : $(stat -c %y "$APP/dist/main.js")"
echo "jumlah file dist      : $(find "$APP/dist" -type f | wc -l)"
echo "jumlah modul backend  : $(find "$APP/dist/modules" -maxdepth 1 -type d | wc -l)"
echo "aset client           : $(find "$APP/client" -type f | wc -l)"
echo "paket runtime         : $(find "$APP/node_modules" -maxdepth 1 -type d | wc -l)"
echo "migration di bundle   : $(find "$APP/prisma/migrations" -maxdepth 1 -type d | wc -l)"

echo
echo "=== 5. PASTIKAN YANG PENTING MASIH ADA (tidak tertimpa) ==="
echo ".env      : $([ -f "$APP/.env" ] && echo OK || echo HILANG)"
echo "uploads/  : $([ -d "$APP/uploads" ] && echo OK || echo HILANG)"
echo "tmp/      : $([ -d "$APP/tmp" ] && echo OK || echo HILANG)"
grep -E '^DATABASE_URL' "$APP/.env" | sed -E 's#://([^:]+):[^@]*@#://\1:<sensor>@#' | sed 's/^/  /'
echo "  kunci env lain: $(grep -cE '^[A-Z_]+=' "$APP/.env") variabel"

echo
echo "=== 6. CEK FILE YANG TIDAK SEHARUSNYA ADA DI PAKET ==="
for f in sql/seed.sql sql/seed_ORIGINAL.sql; do
  [ -e "$APP/$f" ] && echo "  ADA (lama, dari paket sebelumnya): $f" || echo "  tidak ada: $f"
done

echo
echo "=== 7. DIST MAIN.JS BERISI FITUR EF & PINDAHKAN TELEMETRI ==="
grep -c 'MemoryTelemetry' "$APP/dist/app.module.js" | sed 's/^/  referensi telemetri di app.module.js: /'
grep -c 'AVAILABILITY_OWNER_PIN' "$APP/dist/main.js" | sed 's/^/  referensi PIN di main.js: /'

echo
echo "=== 8. UKURAN APP SETELAH EXTRACT ==="
du -sh "$APP" 2>/dev/null
find "$APP" -type f | wc -l | sed 's/^/  jumlah file: /'
df -h "$HOME" | tail -1 | sed 's/^/  disk: /'
