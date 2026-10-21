#!/bin/bash
# Backup penuh: database produksi + salinan app lama (ACL .env). Belum mengubah apa pun.
set -u
APP="$HOME/kost48-prod"
TS=$(date +%Y%m%d-%H%M%S)
BK="$HOME/backups"
mkdir -p "$BK"

DBURL=$(grep -E '^DATABASE_URL' "$APP/.env" | head -1 | sed -E 's/^DATABASE_URL=//; s/^"//; s/"$//')
# $DBURL memuat sandi — jangan pernah dicetak. Nama DB hanya untuk nama berkas.
DBNAME=$(printf '%s' "$DBURL" | sed -E 's#^postgresql://[^/]*/##; s#\?.*##')

echo "=== 1. DATA YANG PERLU ANDA KETAHUI UNTUK cPanel ==="
psql "$DBURL" -At -c "show server_version;" | sed 's/^/Versi PostgreSQL: /'
echo "Nama database        : $DBNAME"
echo "Kredensial           : tersimpan di $APP/.env; TIDAK dicetak di sini"
echo
echo "Saran nama database baru (pilih/pakai ini saat membuat di cPanel):"
echo "  kost48s1_prod2026"
echo

echo "=== 2. RINGKASAN ISI DATABASE (tanpa PII) ==="
psql "$DBURL" -At -F' | ' -c "select 'User', count(*) from \"User\" union all select 'Tenant', count(*) from \"Tenant\" union all select 'Stay', count(*) from \"Stay\" union all select 'Invoice', count(*) from \"Invoice\";"
echo "Jumlah stay/invoice/pembayaran (data transaksi):"
psql "$DBURL" -At -F' | ' -c "select 'Stay', count(*) from \"Stay\" union all select 'Invoice', count(*) from \"Invoice\" union all select 'InvoicePayment', count(*) from \"InvoicePayment\" union all select 'JournalEntry', count(*) from \"JournalEntry\" union all select 'MeterReading', count(*) from \"MeterReading\";"
echo

echo "=== 3. BACKUP DATABASE ==="
DUMP="$BK/db-$DBNAME-$TS.sql.gz"
if pg_dump "$DBURL" | gzip -9 > "$DUMP"; then
  ls -lh "$DUMP" | awk '{print "OK -> "$9" ("$5")"}'
  echo "uji integritas arsip:"
  gzip -t "$DUMP" && echo "  gzip -t OK"
  echo "uji isi (10 baris pertama):"
  zcat "$DUMP" | head -10 | sed 's/^/  /'
  echo "jumlah baris COPY (tabel yang ada datanya):"
  zcat "$DUMP" | grep -c '^COPY ' || true
else
  echo "GAGAL pg_dump"
fi

echo
echo "=== 4. BACKUP APP LAMA (tanpa node_modules & bundle tgz) ==="
APPBK="$BK/app-kost48-prod-$TS.tar.gz"
tar -czf "$APPBK" -C "$HOME" --exclude='kost48-prod/node_modules' --exclude='kost48-prod/kost48-deploy-bundled.tgz' kost48-prod 2>/dev/null
ls -lh "$APPBK" | awk '{print "OK -> "$9" ("$5")"}'
echo "isi penting yang ikut ter-backup:"
tar -tzf "$APPBK" | grep -E '(\.env|\.htaccess|version\.json)$' | sed 's/^/  /'

echo
echo "=== 5. RINGKASAN BACKUP ==="
ls -lh "$BK" | sed 's/^/  /'
df -h "$HOME" | tail -1 | sed 's/^/  disk: /'
