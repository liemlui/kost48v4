#!/bin/bash
# Diagnosa: apakah database baru terdaftar di cPanel & user sudah di-assign. Read-only.
set -u
echo "=== DAFTAR DATABASE & USER DARI DATASTORE cPanel ==="
for f in "$HOME"/.cpanel/datastore/*postgres* "$HOME"/.cpanel/datastore/*pgsql*; do
  [ -f "$f" ] && echo "--- $f ---" && cat "$f" && echo
done
echo
echo "=== JEJAK DATABASE BARU DI DIREKTORI cPanel ==="
grep -rl 'prod2026' "$HOME/.cpanel" 2>/dev/null | head -10
echo
echo "=== FILE pg_hba YANG BISA DIBACA USER ==="
for f in /etc/pg_hba.conf /var/lib/pgsql/data/pg_hba.conf "$HOME/.pgpass"; do
  if [ -r "$f" ]; then echo "BISA DIBACA: $f"; else echo "tidak bisa dibaca: $f"; fi
done
echo
echo "=== APAKAH ADA JEJAK AKSES DB BARU DI RIWAYAT PSQL/SHELL ==="
grep -h 'prod2026' "$HOME/.psql_history" 2>/dev/null | tail -5
grep -h 'prod2026' "$HOME/.bash_history" 2>/dev/null | tail -5
echo
echo "=== UJI ULANG KONEKSI KE DB BARU (untuk memastikan status terkini) ==="
APP="$HOME/kost48-prod"
DBURL=$(grep -E '^DATABASE_URL' "$APP/.env" | head -1 | sed -E 's/^DATABASE_URL=//; s/^"//; s/"$//')
DBUSER=$(printf '%s' "$DBURL" | sed -E 's#^postgresql://([^:]+):.*#\1#')
DBPASS_RAW=$(printf '%s' "$DBURL" | sed -E 's#^postgresql://[^:]+:([^@]*)@.*#\1#')
DBPASS=$(printf '%s' "$DBPASS_RAW" | sed -E 's/%([0-9A-Fa-f]{2})/\\x\1/g' | xargs -0 printf '%b' 2>/dev/null || printf '%s' "$DBPASS_RAW")
PGPASSWORD="$DBPASS" psql -U "$DBUSER" -d kost48s1_prod2026 -At -c 'select 1;' 2>&1 | head -2
