#!/bin/bash
# Seed OWNER pertama di DB baru. Password dihasilkan di server, ditulis ke file 600, TIDAK dicetak ke output.
set -eu
APP="$HOME/kost48-prod"
NEWDB="kost48s1_prod26"
OWNER_EMAIL="${OWNER_EMAIL:-liem.lui@gmail.com}"
PWFILE="$HOME/OWNER-PASSWORD-BACA-LALU-HAPUS.txt"

cd "$APP"

echo "=== 1. CEK APAKAH SUDAH ADA USER DI DB BARU ==="
DBURL=$(grep -E '^DATABASE_URL' .env | head -1 | sed -E 's/^DATABASE_URL=//; s/^"//; s/"$//')
DBUSER=$(printf '%s' "$DBURL" | sed -E 's#^postgresql://([^:]+):.*#\1#')
DBPASS_RAW=$(printf '%s' "$DBURL" | sed -E 's#^postgresql://[^:]+:([^@]*)@.*#\1#')
DBPASS=$(printf '%s' "$DBPASS_RAW" | sed -E 's/%([0-9A-Fa-f]{2})/\\x\1/g' | xargs -0 printf '%b' 2>/dev/null || printf '%s' "$DBPASS_RAW")
export PGPASSWORD="$DBPASS"
COUNT=$(psql -U "$DBUSER" -d "$NEWDB" -At -c 'select count(*) from "User";')
echo "  jumlah user saat ini: $COUNT"
if [ "$COUNT" != "0" ]; then
  echo "  BERHENTI: sudah ada user; tidak menimpa."
  exit 0
fi

echo
echo "=== 2. BUAT PASSWORD OWNER ACAK (tidak dicetak ke output) ==="
rm -f "$PWFILE"   # hapus file usang bila ada
NODE_BIN="/home/kost48s1/nodevenv/kost48-prod/22/bin/node"
if [ ! -x "$NODE_BIN" ]; then
  echo "  node venv tidak ditemukan di $NODE_BIN"
  NODE_BIN=$(ls -1 "$HOME"/nodevenv/kost48-prod/*/bin/node 2>/dev/null | head -1)
  echo "  alternatif: ${NODE_BIN:-TIDAK ADA}"
fi
if [ ! -x "$NODE_BIN" ]; then echo "  BERHENTI: node tidak ditemukan"; exit 1; fi
echo "  node: $NODE_BIN ($("$NODE_BIN" -v))"
OWNER_PASSWORD=$(openssl rand -base64 18 | tr -d '/+=' | cut -c1-20)
echo "  panjang password: ${#OWNER_PASSWORD} karakter"

echo
echo "=== 3. JALANKAN seed-owner.js ==="
OWNER_EMAIL="$OWNER_EMAIL" OWNER_PASSWORD="$OWNER_PASSWORD" OWNER_FULLNAME='Pemilik KOST48' \
  "$NODE_BIN" scripts/seed-owner.js 2>&1 | sed "s/$OWNER_PASSWORD/<password-disembunyikan>/g" | sed 's/^/  /'

echo
echo "=== 4. SIMPAN PASSWORD KE FILE TERBATAS (baca lalu hapus) ==="
umask 077
cat > "$PWFILE" <<EOF
KOST48 — kredensial OWNER pertama (database produksi $NEWDB)
Dibuat: $(date '+%Y-%m-%d %H:%M:%S %Z')

  URL login : https://kost48surabaya.com/login
  Email     : $OWNER_EMAIL
  Password  : $OWNER_PASSWORD

LANGKAH WAJIB:
1. Login, lalu SEGERA ganti password ini lewat menu Profil/Keamanan.
2. Hapus file ini setelah password diganti:
     rm ~/OWNER-PASSWORD-BACA-LALU-HAPUS.txt
3. Setelah login: isi COA, periode OPEN, dan CashAccount lewat menu Akuntansi.

File ini hanya bisa dibaca oleh akun Anda (mode 600).
EOF
chmod 600 "$PWFILE"
ls -l "$PWFILE" | awk '{print "  "$1" "$9}'

echo
echo "=== 5. VERIFIKASI USER DI DB BARU ==="
psql -U "$DBUSER" -d "$NEWDB" -At -F' | ' -c 'select id, email, role, "createdAt"::date from "User" order by id;' | sed 's/^/  /'
echo "  jumlah user sekarang: $(psql -U "$DBUSER" -d "$NEWDB" -At -c 'select count(*) from "User";')"
unset PGPASSWORD
