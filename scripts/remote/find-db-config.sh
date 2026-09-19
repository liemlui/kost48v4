#!/bin/bash
# Cari nama database baru dari konfigurasi cPanel + uji koneksi. Read-only.
set -u
APP="$HOME/kost48-prod"
DBURL=$(grep -E '^DATABASE_URL' "$APP/.env" | head -1 | sed -E 's/^DATABASE_URL=//; s/^"//; s/"$//')
DBUSER=$(printf '%s' "$DBURL" | sed -E 's#^postgresql://([^:]+):.*#\1#')
DBPASS_RAW=$(printf '%s' "$DBURL" | sed -E 's#^postgresql://[^:]+:([^@]*)@.*#\1#')
DBPASS=$(printf '%s' "$DBPASS_RAW" | sed -E 's/%([0-9A-Fa-f]{2})/\\x\1/g' | xargs -0 printf '%b' 2>/dev/null || printf '%s' "$DBPASS_RAW")
export PGPASSWORD="$DBPASS"

echo "=== postgres-db-count ==="
cat "$HOME/.cpanel/datastore/postgres-db-count" 2>/dev/null

echo
echo "=== FILE DI ~/.cpanel (yang berkaitan database) ==="
find "$HOME/.cpanel" -maxdepth 3 -type f 2>/dev/null | grep -i -E 'postgres|database|sql' | head -20

echo
echo "=== CARI NAMA DATABASE DI SEMUA FILE KONFIG cPanel ==="
grep -rhoE 'kost48s1[a-zA-Z0-9_]*' "$HOME/.cpanel" 2>/dev/null | sort -u | head -20

echo
echo "=== UJI KONEKSI KE KANDIDAT NAMA ==="
for db in kost48s1_prod2026 kost48s1_prod kost48s1_kost48_prod2026 kost48s1_kost48_prod2 kost48s1_new kost48s1_prod2027; do
  out=$(psql -U "$DBUSER" -d "$db" -At -c "select 'BISA MASUK';" 2>&1 | head -1)
  printf '  %-30s -> %s\n' "$db" "$out"
done

echo
echo "=== COBA KONEK KE DATABASE 'template1' UNTUK LIST SEMUA DB ==="
psql -U "$DBUSER" -d template1 -At -c "select datname from pg_database where datistemplate=false order by datname;" 2>&1 | head -20
unset PGPASSWORD
