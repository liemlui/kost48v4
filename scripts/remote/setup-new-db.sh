#!/bin/bash
# Setup database baru: arahkan .env, bootstrap schema, seed kamar, verifikasi.
# DB lama TIDAK disentuh. Password tidak pernah dicetak.
set -eu
APP="$HOME/kost48-prod"
NEWDB="kost48s1_prod26"
OLDDB="kost48s1_kost48_prod"
TS=$(date +%Y%m%d-%H%M%S)
cd "$APP"

echo "=== 0. BACA KREDENSIAL DARI .env (tidak dicetak) ==="
DBURL=$(grep -E '^DATABASE_URL' .env | head -1 | sed -E 's/^DATABASE_URL=//; s/^"//; s/"$//')
DBUSER=$(printf '%s' "$DBURL" | sed -E 's#^postgresql://([^:]+):.*#\1#')
DBPASS_RAW=$(printf '%s' "$DBURL" | sed -E 's#^postgresql://[^:]+:([^@]*)@.*#\1#')
DBHOSTPART=$(printf '%s' "$DBURL" | sed -E 's#^postgresql://[^:]+:[^@]*@##')
DBPASS=$(printf '%s' "$DBPASS_RAW" | sed -E 's/%([0-9A-Fa-f]{2})/\\x\1/g' | xargs -0 printf '%b' 2>/dev/null || printf '%s' "$DBPASS_RAW")
export PGPASSWORD="$DBPASS"
echo "user=$DBUSER  host_part=$DBHOSTPART"
echo "db lama=$OLDDB  db baru=$NEWDB"

echo
echo "=== 1. VERIFIKASI AKSES KE DB BARU ==="
psql -U "$DBUSER" -d "$NEWDB" -At -c "select current_database()||' | user='||current_user||' | '||version();" | head -1

echo
echo "=== 2. CEK DB BARU BENAR-BENAR KOSONG (syarat bootstrap) ==="
BEFORE=$(psql -U "$DBUSER" -d "$NEWDB" -At -c "select count(*) from pg_catalog.pg_tables where schemaname='public';")
echo "jumlah tabel sebelum bootstrap: $BEFORE"
if [ "$BEFORE" != "0" ]; then
  echo "BERHENTI: DB baru tidak kosong. Tidak ada yang diubah."
  exit 1
fi

echo
echo "=== 3. BACKUP .env LALU ARAHKAN KE DB BARU ==="
cp -p .env ".env.bak-$TS"
sed -i "s#@/$OLDDB#@/$NEWDB#" .env
echo "baris DATABASE_URL sekarang (password disensor):"
grep -E '^DATABASE_URL' .env | sed -E 's#://([^:]+):[^@]*@#://\1:<sensor>@#'
echo "backup .env: .env.bak-$TS"

echo
echo "=== 4. BOOTSTRAP SCHEMA (schema.sql + 3 migration) ==="
psql -U "$DBUSER" -d "$NEWDB" --single-transaction -v ON_ERROR_STOP=1 -f sql/bootstrap-production-schema.sql > /tmp/bootstrap.log 2>&1 && echo "bootstrap OK" || { echo "bootstrap GAGAL:"; tail -20 /tmp/bootstrap.log; exit 1; }
grep -ciE '^(CREATE TABLE|CREATE TYPE|ALTER TABLE)' /tmp/bootstrap.log | sed 's/^/  statement DDL dieksekusi: /'

echo
echo "=== 5. SEED 13 KAMAR ==="
psql -U "$DBUSER" -d "$NEWDB" -v ON_ERROR_STOP=1 -f sql/seed-production-rooms.sql 2>&1 | tail -5

echo
echo "=== 6. PASTIKAN TABEL LEDGER MIGRATION ADA (dibutuhkan saat app start) ==="
psql -U "$DBUSER" -d "$NEWDB" -At -c "select count(*) from pg_catalog.pg_tables where schemaname='public' and tablename='_prisma_migrations';" | sed 's/^/  _prisma_migrations count: /'

echo
echo "=== 7. VERIFIKASI HASIL ==="
psql -U "$DBUSER" -d "$NEWDB" -At -F' | ' -c "select 'tabel total', count(*)::text from pg_catalog.pg_tables where schemaname='public';"
psql -U "$DBUSER" -d "$NEWDB" -At -F' | ' -c "select 'Room', count(*)::text from \"Room\" union all select 'PublicRoomAvailability', count(*)::text from \"PublicRoomAvailability\" union all select 'User', count(*)::text from \"User\" union all select 'Tenant', count(*)::text from \"Tenant\";"
echo "daftar kamar:"
psql -U "$DBUSER" -d "$NEWDB" -At -F' | ' -c 'select code, status, "monthlyRateRupiah" from "Room" order by code;' | tr '\n' ' ' ; echo
echo
echo "=== 8. KONFIRMASI DB LAMA MASIH UTUH ==="
psql -U "$DBUSER" -d "$OLDDB" -At -c "select 'db lama: '||count(*)||' tabel, '||(select count(*) from \"User\")||' user' from pg_catalog.pg_tables where schemaname='public';"
unset PGPASSWORD
