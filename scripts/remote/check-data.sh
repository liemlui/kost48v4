#!/bin/bash
# Pencarian read-only: apakah ada data unggahan (foto kamar, bukti bayar) di akun ini.
echo "=== SEMUA FOLDER uploads DI HOME (file saja, bukan folder kosong) ==="
find "$HOME" -maxdepth 4 -type d -name uploads -not -path '*/node_modules/*' 2>/dev/null | while read -r d; do
  n=$(find "$d" -type f 2>/dev/null | wc -l)
  s=$(du -sh "$d" 2>/dev/null | cut -f1)
  echo "$d  ->  $n file, $s"
done
echo
echo "=== CARI FILE GAMBAR MILIK PENGGUNA DI LUAR ASET BAWAAN ==="
find "$HOME" -type f \( -iname '*.jpg' -o -iname '*.jpeg' -o -iname '*.png' -o -iname '*.webp' -o -iname '*.pdf' \) \
  -not -path '*/node_modules/*' -not -path '*/client/*' -not -path '*/public_html/*' -not -path '*/.trash/*' 2>/dev/null | head -20
echo
echo "=== JUMLAH FILE DI FOLDER uploads ROOM-IMAGES ==="
find "$HOME/kost48-prod/uploads" -type f 2>/dev/null | wc -l
find "$HOME/public_html/uploads" -type f 2>/dev/null | wc -l
echo
echo "=== BACKUP DATABASE YANG PERNAH DIBUAT ==="
find "$HOME" -maxdepth 3 -type f \( -iname '*.sql' -o -iname '*.dump' -o -iname '*backup*' \) -not -path '*/node_modules/*' 2>/dev/null | head -15
echo
echo "=== SISA BUNDLE LAMA (pemakaian disk/inode) ==="
for f in "$HOME"/*/kost48-deploy-bundled.tgz "$HOME"/kost48-deploy-bundled.tgz; do
  [ -e "$f" ] && ls -lh "$f" | awk '{print $5"  "$9}'
done
echo
echo "=== TOTAL PEMAKAIAN DISK DI HOME ==="
du -sh "$HOME" 2>/dev/null
echo "=== TOTAL FILE DI HOME ==="
find "$HOME" -type f -not -path '*/node_modules/*' 2>/dev/null | wc -l
