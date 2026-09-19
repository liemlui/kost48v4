#!/bin/bash
# Verifikasi paket yang diunggah + cek isi DB produksi (read-only, tanpa mengubah apa pun).
set -u

echo "=== CHECKSUM PAKET DI SERVER ==="
sha256sum "$HOME/staging/kost48-deploy-bundled.tgz"
ls -l "$HOME/staging/kost48-deploy-bundled.tgz"
echo "Checksum lokal yang diharapkan: BC9176F2897B6FB444FD9A0156C90944D0D289EF8E66932217B2944DB69EEDFD"
echo

echo "=== NAMA DATABASE DARI .env APP (password disensor) ==="
grep -E '^DATABASE_URL' "$HOME/kost48-prod/.env" | sed -E 's#://([^:]+):[^@]*@#://\1:<sensor>@#'
DBNAME=$(grep -E '^DATABASE_URL' "$HOME/kost48-prod/.env" | sed -E 's#.*@/##; s#["'"'"'].*##; s#\?.*##')
echo "DBNAME terdeteksi: $DBNAME"
echo

echo "=== UJI KONEKSI PSQL (peer auth, tanpa password) ==="
if psql -d "$DBNAME" -c 'select 1' >/dev/null 2>&1; then
  echo "KONEKSI BERHASIL"
  echo
  echo "--- jumlah baris tabel penting (indikasi data nyata) ---"
  psql -d "$DBNAME" -At -F' | ' -c "
    select 'User', count(*) from \"User\"
    union all select 'Room', count(*) from \"Room\"
    union all select 'Tenant', count(*) from \"Tenant\"
    union all select 'Stay', count(*) from \"Stay\"
    union all select 'Stay ACTIVE', count(*) from \"Stay\" where status='ACTIVE'
    union all select 'Invoice', count(*) from \"Invoice\"
    union all select 'Payment', count(*) from \"Payment\"
    union all select 'PublicRoomAvailability', count(*) from \"PublicRoomAvailability\"
    order by 1;"
  echo
  echo "--- daftar kamar + status ---"
  psql -d "$DBNAME" -At -F' | ' -c 'select code, status, "monthlyRateRupiah" from "Room" order by code;'
  echo
  echo "--- daftar user (email + role + kapan dibuat) ---"
  psql -d "$DBNAME" -At -F' | ' -c 'select email, role, "createdAt"::date from "User" order by id;'
  echo
  echo "--- status migrasi (tabel ledger) ---"
  psql -d "$DBNAME" -At -c 'select count(*) from "_prisma_migrations";' 2>&1
else
  echo "psql peer auth GAGAL:"
  psql -d "$DBNAME" -c 'select 1' 2>&1 | head -3
  echo
  echo "--- role database yang ada di server ini ---"
  psql -d postgres -At -c "select rolname from pg_roles where rolname like 'kost48%';" 2>&1 | head -10
fi
