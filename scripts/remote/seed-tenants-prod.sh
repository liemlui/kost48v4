#!/bin/bash
# Jalankan seed-prod-tenants.js di server terhadap API produksi.
# Password tenant dibuat di server, disimpan ke file 600, tidak dicetak.
set -eu
APP="$HOME/kost48-prod"
NODE_BIN="/home/kost48s1/nodevenv/kost48-prod/22/bin/node"
PWFILE="$HOME/TENANT-PASSWORD-AWAL-BACA-LALU-HAPUS.txt"
PWFILE_OWNER="$HOME/OWNER-PASSWORD-BACA-LALU-HAPUS.txt"

OWNER_EMAIL=$(grep -E '^  Email' "$PWFILE_OWNER" | awk '{print $3}')
OWNER_PASSWORD=$(grep -E '^  Password' "$PWFILE_OWNER" | awk '{print $3}')

TENANT_PASSWORD=$(openssl rand -base64 18 | tr -d '/+=' | cut -c1-16)
echo "password awal tenant dibuat (${#TENANT_PASSWORD} karakter) — disimpan ke file terbatas, tidak dicetak"

cd "$APP"
API_BASE="https://kost48surabaya.com/api" \
OWNER_EMAIL="$OWNER_EMAIL" \
OWNER_PASSWORD="$OWNER_PASSWORD" \
SEED_TENANT_PASSWORD="$TENANT_PASSWORD" \
"$NODE_BIN" "$HOME/staging/seed-prod-tenants.js" 2>&1 | sed "s/$TENANT_PASSWORD/<password-disembunyikan>/g; s/$OWNER_PASSWORD/<password-owner-disembunyikan>/g"

echo
echo "=== SIMPAN PASSWORD AWAL TENANT KE FILE TERBATAS ==="
umask 077
cat > "$PWFILE" <<EOF
KOST48 — password awal akun portal TENANT (produksi kost48s1_prod26)
Dibuat: $(date '+%Y-%m-%d %H:%M:%S %Z')

  URL login : https://kost48surabaya.com/login
  Password  : $TENANT_PASSWORD   (SAMA untuk semua akun tenant yang baru dibuat)
  Email     : lihat daftar tenant di menu Owner → Manajemen Tenant

CATATAN:
- GUNAWAN (kamar F1) tidak dibuatkan akun portal (sesuai data: segera checkout).
- Minta setiap penghuni mengganti password setelah login pertama.
- Hapus file ini setelah semua penghuni diberi akses:
    rm ~/TENANT-PASSWORD-AWAL-BACA-LALU-HAPUS.txt
EOF
chmod 600 "$PWFILE"
ls -l "$PWFILE" | awk '{print "  "$1" "$9}'

echo
echo "=== VERIFIKASI DI DATABASE ==="
DBURL=$(grep -E '^DATABASE_URL' "$APP/.env" | head -1 | sed -E 's/^DATABASE_URL=//; s/^"//; s/"$//')
DBUSER=$(printf '%s' "$DBURL" | sed -E 's#^postgresql://([^:]+):.*#\1#')
DBPASS_RAW=$(printf '%s' "$DBURL" | sed -E 's#^postgresql://[^:]+:([^@]*)@.*#\1#')
DBPASS=$(printf '%s' "$DBPASS_RAW" | sed -E 's/%([0-9A-Fa-f]{2})/\\x\1/g' | xargs -0 printf '%b' 2>/dev/null || printf '%s' "$DBPASS_RAW")
export PGPASSWORD="$DBPASS"
echo "  Tenant: $(psql -U "$DBUSER" -d kost48s1_prod26 -At -c 'select count(*) from "Tenant";')  |  User TENANT: $(psql -U "$DBUSER" -d kost48s1_prod26 -At -c "select count(*) from \"User\" where role='TENANT';")  |  User total: $(psql -U "$DBUSER" -d kost48s1_prod26 -At -c 'select count(*) from "User";')"
echo "  daftar (nama | NIK | HP):"
psql -U "$DBUSER" -d kost48s1_prod26 -At -F' | ' -c 'select "fullName", "identityNumber", phone from "Tenant" order by id;' | sed 's/^/    /'
unset PGPASSWORD
