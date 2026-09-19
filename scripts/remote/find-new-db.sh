#!/bin/bash
# Cari database baru milik user ini dan pastikan bisa diakses. Read-only.
set -u
APP="$HOME/kost48-prod"
DBURL=$(grep -E '^DATABASE_URL' "$APP/.env" | head -1 | sed -E 's/^DATABASE_URL=//; s/^"//; s/"$//')
DBUSER=$(printf '%s' "$DBURL" | sed -E 's#^postgresql://([^:]+):.*#\1#')
DBPASS_RAW=$(printf '%s' "$DBURL" | sed -E 's#^postgresql://[^:]+:([^@]*)@.*#\1#')
DBPASS=$(printf '%s' "$DBPASS_RAW" | sed -E 's/%([0-9A-Fa-f]{2})/\\x\1/g' | xargs -0 printf '%b' 2>/dev/null || printf '%s' "$DBPASS_RAW")
export PGPASSWORD="$DBPASS"

echo "=== DATABASE YANG BISA DIAKSES USER $DBUSER ==="
psql -U "$DBUSER" -d postgres -At -c "select datname from pg_database where datistemplate = false order by datname;" 2>/dev/null \
  || echo "(tidak bisa list dari postgres; coba satu per satu)"

echo
echo "=== KANDIDAT DATABASE BARU (cek jumlah tabel masing-masing) ==="
for db in kost48s1_prod2026 kost48s1_prod kost48s1_kost48_prod2026 kost48s1_kost48_prod; do
  n=$(psql -U "$DBUSER" -d "$db" -At -c "select count(*) from pg_catalog.pg_tables where schemaname='public';" 2>/dev/null)
  if [ -n "$n" ]; then
    printf '  %-30s ADA — %s tabel\n' "$db" "$n"
  else
    printf '  %-30s tidak bisa diakses / tidak ada\n' "$db"
  fi
done

echo
echo "=== DATABASE LAMA (untuk perbandingan) ==="
psql -U "$DBUSER" -d kost48s1_kost48_prod -At -c "select count(*) from pg_catalog.pg_tables where schemaname='public';" 2>/dev/null | sed 's/^/  kost48s1_kost48_prod: /'
unset PGPASSWORD
