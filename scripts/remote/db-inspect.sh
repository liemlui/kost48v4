#!/bin/bash
# Membaca kredensial DB dari .env app (tanpa mencetaknya) lalu memeriksa isi database produksi. Read-only.
set -u

APP="$HOME/kost48-prod"
DBURL=$(grep -E '^DATABASE_URL' "$APP/.env" | head -1 | sed -E 's/^DATABASE_URL=//; s/^"//; s/"$//')

DBUSER=$(printf '%s' "$DBURL" | sed -E 's#^postgresql://([^:]+):.*#\1#')
DBPASS_RAW=$(printf '%s' "$DBURL" | sed -E 's#^postgresql://[^:]+:([^@]*)@.*#\1#')
DBNAME=$(printf '%s' "$DBURL" | sed -E 's#.*@/##; s#\?.*##')
# Decode persen-encoding (%25 -> %) tanpa mencetak hasilnya.
DBPASS=$(printf '%s' "$DBPASS_RAW" | sed -E 's/%([0-9A-Fa-f]{2})/\\x\1/g' | xargs -0 printf '%b' 2>/dev/null || printf '%s' "$DBPASS_RAW")

echo "user=$DBUSER  database=$DBNAME  (password tidak dicetak)"
export PGPASSWORD="$DBPASS"

echo
echo "=== UJI KONEKSI ==="
if psql -U "$DBUSER" -d "$DBNAME" -At -c 'select current_database(), current_user, version();' 2>&1 | head -3; then
  echo "KONEKSI OK"
else
  echo "koneksi gagal"
fi

echo
echo "=== JUMLAH BARIS TABEL PENTING ==="
psql -U "$DBUSER" -d "$DBNAME" -At -F' | ' -c "
  select 'User', count(*) from \"User\"
  union all select 'Room', count(*) from \"Room\"
  union all select 'Tenant', count(*) from \"Tenant\"
  union all select 'Stay', count(*) from \"Stay\"
  union all select 'Invoice', count(*) from \"Invoice\"
  union all select 'Payment', count(*) from \"Payment\"
  union all select 'PublicRoomAvailability', count(*) from \"PublicRoomAvailability\"
  union all select 'OperationalSetting', count(*) from \"OperationalSetting\"
  order by 1;" 2>&1

echo
echo "=== KAMAR ==="
psql -U "$DBUSER" -d "$DBNAME" -At -F' | ' -c 'select code, status from "Room" order by code;' 2>&1

echo
echo "=== USER (email + role) ==="
psql -U "$DBUSER" -d "$DBNAME" -At -F' | ' -c 'select id, email, role, "createdAt"::date from "User" order by id;' 2>&1

echo
echo "=== LEDGER MIGRATION ==="
psql -U "$DBUSER" -d "$DBNAME" -At -c 'select count(*) from "_prisma_migrations";' 2>&1
psql -U "$DBUSER" -d "$DBNAME" -At -F' | ' -c 'select migration_name from "_prisma_migrations" order by migration_name;' 2>&1 | tail -5

echo
echo "=== APAKAH SCHEMA SUDAH LENGKAP (jumlah tabel) ==="
psql -U "$DBUSER" -d "$DBNAME" -At -c "select count(*) from pg_catalog.pg_tables where schemaname='public';" 2>&1

unset PGPASSWORD
