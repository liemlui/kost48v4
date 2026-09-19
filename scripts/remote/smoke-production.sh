#!/bin/bash
# Smoke test produksi lewat HTTPS dari sisi server. Password dibaca dari file, tidak dicetak.
set -u
APP="$HOME/kost48-prod"
PWFILE="$HOME/OWNER-PASSWORD-BACA-LALU-HAPUS.txt"
BASE="https://kost48surabaya.com"

echo "=== 1. HOMEPAGE & ASET ==="
curl -s -o /dev/null -w "  GET /                     -> %{http_code} (%{time_total}s, %{size_download} byte)\n" --max-time 60 "$BASE/"
curl -s -o /dev/null -w "  GET /version.json          -> %{http_code}\n" --max-time 30 "$BASE/version.json"
curl -s -o /dev/null -w "  GET /login (deep link SPA) -> %{http_code}\n" --max-time 30 "$BASE/login"
curl -s -o /dev/null -w "  GET /portal/stay (SPA)     -> %{http_code}\n" --max-time 30 "$BASE/portal/stay"
curl -s -o /dev/null -w "  GET /assets/hilang.js      -> %{http_code} (harus 404)\n" --max-time 30 "$BASE/assets/hilang.js"

echo
echo "=== 2. HEADER CACHE (gate PWA) ==="
for p in /version.json /sw.js /index.html; do
  h=$(curl -s -D - -o /dev/null --max-time 30 "$BASE$p" | grep -i '^cache-control:' | tr -d '\r')
  printf '  %-16s %s\n' "$p" "${h:-TIDAK ADA}"
done

echo
echo "=== 3. API PUBLIK & PROTEKSI ==="
curl -s -o /dev/null -w "  GET /api/public/rooms      -> %{http_code}\n" --max-time 30 "$BASE/api/public/rooms?limit=2"
curl -s -o /dev/null -w "  GET /api/stays (tanpa token) -> %{http_code} (harus 401)\n" --max-time 30 "$BASE/api/stays?limit=1"
curl -s -o /dev/null -w "  GET /api/tidak-ada         -> %{http_code} (harus 404)\n" --max-time 30 "$BASE/api/tidak-ada"

echo
echo "=== 4. JUMLAH KAMAR DARI API ==="
curl -s --max-time 30 "$BASE/api/public/rooms?limit=50" | grep -o '"code":"[A-Z0-9]*"' | wc -l | sed 's/^/  kamar terlihat: /'

echo
echo "=== 5. LOGIN OWNER (end-to-end) ==="
if [ ! -f "$PWFILE" ]; then echo "  file password tidak ada; lewati login"; exit 0; fi
EMAIL=$(grep -E '^  Email' "$PWFILE" | awk '{print $3}')
PASS=$(grep -E '^  Password' "$PWFILE" | awk '{print $3}')
echo "  login sebagai: $EMAIL"
RESP=$(curl -s --max-time 45 -X POST "$BASE/api/auth/login" -H 'Content-Type: application/json' \
  -d "{\"identifier\":\"$EMAIL\",\"password\":\"$PASS\"}")
TOKEN=$(printf '%s' "$RESP" | grep -o '"accessToken":"[^"]*"' | head -1 | cut -d'"' -f4)
if [ -z "$TOKEN" ]; then
  echo "  LOGIN GAGAL. Respons (password tidak ada di sini): $(printf '%s' "$RESP" | head -c 300)"
  exit 1
fi
echo "  LOGIN BERHASIL (token diterima)"

echo
echo "=== 6. ENDPOINT TERPROTEKSI DENGAN TOKEN OWNER ==="
for p in "/api/auth/me" "/api/accounting/readiness" "/api/stays?limit=1" "/api/tenants?limit=1" "/api/invoices?limit=1"; do
  code=$(curl -s -o /tmp/prot.json -w '%{http_code}' --max-time 45 -H "Authorization: Bearer $TOKEN" "$BASE$p")
  printf '  GET %-28s -> %s\n' "$p" "$code"
done
echo "  ringkasan readiness:"
curl -s --max-time 45 -H "Authorization: Bearer $TOKEN" "$BASE/api/accounting/readiness" | head -c 400 | sed 's/^/    /'; echo

echo
echo "=== 7. CEK GATE KTP ==="
curl -s --max-time 45 -H "Authorization: Bearer $TOKEN" "$BASE/api/settings/operational" | head -c 500 | sed 's/^/  /'; echo

echo
echo "=== 8. LOG ERROR APP TERBARU ==="
tail -6 "$APP/stderr.log" 2>/dev/null | sed 's/^/  /'
echo "(selesai)"
