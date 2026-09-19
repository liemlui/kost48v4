#!/bin/bash
# Uji apakah ada jalur koneksi lain (TCP) + apakah database baru benar-benar kosong.
set -u
APP="$HOME/kost48-prod"
DBURL=$(grep -E '^DATABASE_URL' "$APP/.env" | head -1 | sed -E 's/^DATABASE_URL=//; s/^"//; s/"$//')
DBUSER=$(printf '%s' "$DBURL" | sed -E 's#^postgresql://([^:]+):.*#\1#')
DBPASS_RAW=$(printf '%s' "$DBURL" | sed -E 's#^postgresql://[^:]+:([^@]*)@.*#\1#')
DBPASS=$(printf '%s' "$DBPASS_RAW" | sed -E 's/%([0-9A-Fa-f]{2})/\\x\1/g' | xargs -0 printf '%b' 2>/dev/null || printf '%s' "$DBPASS_RAW")
export PGPASSWORD="$DBPASS"

echo "=== UJI LEWAT TCP 127.0.0.1:5432 (kadang punya aturan pg_hba berbeda) ==="
psql -h 127.0.0.1 -p 5432 -U "$DBUSER" -d kost48s1_prod2026 -At -c 'select 1;' 2>&1 | head -2

echo
echo "=== PORT POSTGRES YANG TERBUKA ==="
(ss -ltnp 2>/dev/null || netstat -ltn 2>/dev/null) | grep -E '5432|5433' || echo "tidak terlihat"

echo
echo "=== UJI KONEKSI DB BARU SEBAGAI USER LAIN (kalau ada hak) ==="
psql -U "$DBUSER" -d kost48s1_prod2026 -At -c 'select 1;' 2>&1 | head -2

echo
echo "=== INFO DARI USER 'kost48s1' (peer auth) ==="
psql -d kost48s1_kost48_prod -At -c "select current_user;" 2>&1 | head -2

echo
echo "=== APAKAH DATABASE BARU PUNYA TABEL (lewat akun yang bisa masuk DB lama) ==="
echo "(tidak bisa diperiksa tanpa akses; dibuktikan dari cPanel/phpPgAdmin)"
unset PGPASSWORD
