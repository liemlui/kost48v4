#!/bin/bash
# Uji pembeda: app membaca DB BARU atau DB LAMA?
# Caranya: ubah nama satu kamar di DB baru (tidak dipakai app lain), lihat respons API publik, lalu kembalikan.
set -u
APP="$HOME/kost48-prod"
NEWDB="kost48s1_prod26"
OLDDB="kost48s1_kost48_prod"
DBURL=$(grep -E '^DATABASE_URL' "$APP/.env" | head -1 | sed -E 's/^DATABASE_URL=//; s/^"//; s/"$//')
DBUSER=$(printf '%s' "$DBURL" | sed -E 's#^postgresql://([^:]+):.*#\1#')
DBPASS_RAW=$(printf '%s' "$DBURL" | sed -E 's#^postgresql://[^:]+:([^@]*)@.*#\1#')
DBPASS=$(printf '%s' "$DBPASS_RAW" | sed -E 's/%([0-9A-Fa-f]{2})/\\x\1/g' | xargs -0 printf '%b' 2>/dev/null || printf '%s' "$DBPASS_RAW")
export PGPASSWORD="$DBPASS"

echo "=== KONDISI SEBELUM UJI ==="
echo -n "DB baru kamar M: "; psql -U "$DBUSER" -d "$NEWDB" -At -c "select name||' / '||status from \"Room\" where code='M';"
echo -n "DB lama kamar M: "; psql -U "$DBUSER" -d "$OLDDB" -At -c "select name||' / '||status from \"Room\" where code='M';"
echo -n "API publik sebelum: "; curl -s --max-time 30 "https://kost48surabaya.com/api/public/rooms?limit=20" | tr ',' '\n' | grep -A1 '"code":"M"' | tr '\n' ' '; echo

echo
echo "=== PASANG PENANDA DI DB BARU (dikembalikan setelah uji) ==="
psql -U "$DBUSER" -d "$NEWDB" -At -c "update \"Room\" set name='Kamar M [penanda-uji]' where code='M';" | sed 's/^/  /'
sleep 2

echo
echo "=== HASIL DARI API PUBLIK ==="
RESP=$(curl -s --max-time 30 "https://kost48surabaya.com/api/public/rooms?limit=20")
echo "$RESP" | grep -o '"name":"Kamar M[^"]*"' | head -3 | sed 's/^/  /'
if printf '%s' "$RESP" | grep -q 'penanda-uji'; then
  echo "  ==> APP MEMBACA DB BARU (kost48s1_prod26) — benar"
  VERDICT="BARU"
else
  echo "  ==> APP MASIH MEMBACA DB LAMA (kost48s1_kost48_prod) — perlu perbaikan .htaccess"
  VERDICT="LAMA"
fi

echo
echo "=== KEMBALIKAN NAMA KAMAR ==="
psql -U "$DBUSER" -d "$NEWDB" -At -c "update \"Room\" set name='Kamar M' where code='M';" | sed 's/^/  /'
psql -U "$DBUSER" -d "$NEWDB" -At -c "select code||' = '||name from \"Room\" where code='M';" | sed 's/^/  sekarang: /'

echo
echo "=== INFO TAMBAHAN: DATABASE_URL DI .htaccess vs .env ==="
echo "  .env     : $(grep -E '^DATABASE_URL' "$APP/.env" | sed -E 's#://([^:]+):[^@]*@#://\1:<sensor>@#')"
echo "  .htaccess: $(grep -E 'SetEnv DATABASE_URL' "$HOME/public_html/.htaccess" 2>/dev/null | sed -E 's#://([^:]+):[^@]*@#://\1:<sensor>@#' | sed 's/SetEnv DATABASE_URL //')"
echo
echo "VERDICT=$VERDICT"
unset PGPASSWORD
