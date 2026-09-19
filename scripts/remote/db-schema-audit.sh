#!/bin/bash
# Inventaris schema database produksi (read-only) untuk menilai kesiapan patch.
set -u
APP="$HOME/kost48-prod"
DBURL=$(grep -E '^DATABASE_URL' "$APP/.env" | head -1 | sed -E 's/^DATABASE_URL=//; s/^"//; s/"$//')
DBUSER=$(printf '%s' "$DBURL" | sed -E 's#^postgresql://([^:]+):.*#\1#')
DBPASS_RAW=$(printf '%s' "$DBURL" | sed -E 's#^postgresql://[^:]+:([^@]*)@.*#\1#')
DBNAME=$(printf '%s' "$DBURL" | sed -E 's#.*@/##; s#\?.*##')
DBPASS=$(printf '%s' "$DBPASS_RAW" | sed -E 's/%([0-9A-Fa-f]{2})/\\x\1/g' | xargs -0 printf '%b' 2>/dev/null || printf '%s' "$DBPASS_RAW")
export PGPASSWORD="$DBPASS"
Q() { psql -U "$DBUSER" -d "$DBNAME" -At -F' | ' -c "$1" 2>&1; }

echo "=== JUMLAH TABEL ==="
Q "select count(*) from pg_catalog.pg_tables where schemaname='public';"

echo
echo "=== TABEL TERKAIT PEMBAYARAN / INVOICE (memastikan tabel mana yang ada) ==="
Q "select tablename from pg_catalog.pg_tables where schemaname='public' and (tablename ilike '%payment%' or tablename ilike '%invoice%') order by tablename;"

echo
echo "=== 30 TABEL TERAKHIR (abjad) ==="
Q "select tablename from pg_catalog.pg_tables where schemaname='public' order by tablename offset 32;"

echo
echo "=== JUMLAH BARIS DATA BISNIS ==="
for t in User Room Tenant Stay Invoice PaymentSubmission JournalEntry MeterReading Announcement Ticket; do
  c=$(psql -U "$DBUSER" -d "$DBNAME" -At -c "select count(*) from \"$t\";" 2>/dev/null)
  printf '%-20s %s\n' "$t" "${c:-tabel tidak ada}"
done

echo
echo "=== KOLOM YANG DITAMBAHKAN MIGRATION TERBARU (cek apakah schema sudah up-to-date) ==="
Q "select table_name||'.'||column_name from information_schema.columns where table_schema='public' and column_name in ('ktpVerificationMethod','ktpVerificationNotes','occupantCount','roomCategory','identityNumber') order by 1;"

echo
echo "=== TABEL BARU DARI MIGRATION 2026 (harus ada bila schema terbaru) ==="
Q "select tablename from pg_catalog.pg_tables where schemaname='public' and tablename in ('PublicRoomAvailability','Announcement','ExternalReview','AiDraft','OperationalSetting','ServiceInterest','AdditionalService','GuestPreferenceSurvey','PushSubscription') order by tablename;"

echo
echo "=== VERSI POSTGRESQL ==="
Q "show server_version;"

unset PGPASSWORD
