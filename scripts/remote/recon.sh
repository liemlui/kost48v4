#!/bin/bash
# Recon read-only server KOST48. Tidak mengubah apa pun.
echo "=== HOST ==="; hostname; pwd; id
echo
echo "=== DIREKTORI DI HOME ==="
ls -la "$HOME" | head -40
echo
echo "=== KANDIDAT APPLICATION ROOT / VENV NODE ==="
for d in "$HOME"/nodevenv "$HOME"/nodevenv/* "$HOME"/kost48* "$HOME"/public_html "$HOME"/api.kost48surabaya.com; do
  [ -e "$d" ] && echo "ADA: $d" && ls -la "$d" 2>/dev/null | head -8 && echo "---"
done
echo
echo "=== FILE PENANDA PASSENGER ==="
find "$HOME" -maxdepth 4 \( -name 'app.js' -o -name 'passenger_wsgi.py' -o -name 'stderr.log' -o -name 'package.json' \) -not -path '*/node_modules/*' 2>/dev/null | head -20
echo
echo "=== NODE & TOOLS ==="
for t in node npm psql createdb createuser tar curl wget unzip openssl git; do
  printf '%-10s %s\n' "$t" "$(command -v "$t" 2>/dev/null || echo TIDAK-ADA)"
done
echo "node -v: $(node -v 2>/dev/null || echo n/a)"
echo "psql -V: $(psql -V 2>/dev/null || echo n/a)"
echo
echo "=== DATABASE BISA DIBUAT DARI SSH? (uji koneksi read-only, tanpa membuat apa pun) ==="
psql -lqt 2>&1 | head -12
echo
echo "=== POSTGRES ENV YANG TERSEDIA ==="
env | grep -i -E 'pg|postgres|database' | sed 's/PASSWORD=.*/PASSWORD=<disembunyikan>/I' || echo "tidak ada env PG"
echo
echo "=== DISK & INODE ==="
df -h "$HOME" | tail -1
df -i "$HOME" | tail -1
echo
echo "=== JUMLAH FILE DI HOME (level 1-2) ==="
find "$HOME" -maxdepth 2 2>/dev/null | wc -l
