#!/bin/bash
# Pasang pembaruan client kedua (koreksi teks /cek) + verifikasi + cek tautan dokumen.
set -eu
APP="$HOME/kost48-prod"
TS=$(date +%Y%m%d-%H%M%S)

echo "=== 1. BACKUP + EXTRACT client ==="
tar -czf "$HOME/backups/client-$TS.tar.gz" -C "$APP" client
tar -xzf "$HOME/staging/client-update2.tgz" -C "$APP/client"
echo "  versi lama -> baru: $(cat "$HOME/backups/client-$TS.tar.gz" >/dev/null 2>&1 && echo ok)"
echo "  version.json sekarang: $(cat "$APP/client/version.json" | tr -d '\n ')"

echo
echo "=== 2. UJI HTTP ==="
BASE="https://kost48surabaya.com"
for p in /cek /okupansi /update-kamar; do
  curl -s -o /dev/null -w "  GET $p -> %{http_code}\n" --max-time 40 "$BASE$p"
done

echo
echo "=== 3. ISI TEKS YANG DIPERBARUI DI CHUNK CekPage ==="
f=$(ls -1 "$APP/client/assets" | grep -i 'CekPage' | head -1)
echo "  chunk: $f"
grep -o '13 akun portal penghuni' "$APP/client/assets/$f" | head -1 | sed 's/^/  ditemukan: /'
grep -o '13 tenant' "$APP/client/assets/$f" | head -1 | sed 's/^/  ditemukan: /'

echo
echo "=== 4. TAUTAN DOKUMEN BARU (cek berkas ada di server? tidak — dokumen di repo lokal) ==="
echo "  (dilewati; verifikasi tautan dilakukan di workstation)"

echo
echo "=== 5. RINGKASAN AKHIR PRODUKSI ==="
echo -n "  versi: "; curl -s --max-time 30 "$BASE/version.json" | tr -d '\n '
echo
ps -u "$(id -un)" -o pid,etime,rss,cmd 2>/dev/null | grep 'lsnode:' | grep -v grep | awk '{printf "  proses: PID %s up %s RSS %.0f MB\n", $1, $2, $3/1024}'
ls -1sh "$HOME/backups" | tail -4 | sed 's/^/  backup: /'
