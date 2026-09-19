#!/bin/bash
# Periksa ketersediaan API cPanel resmi untuk mengubah env var Node.js App.
set -u
echo "=== TOOL cPanel YANG TERSEDIA ==="
for t in uapi whmapi1 cpanel cpanel-json-api; do printf '%-16s %s\n' "$t" "$(command -v "$t" 2>/dev/null || echo TIDAK-ADA)"; done

echo
echo "=== VERSI uapi ==="
uapi --version 2>&1 | head -3

echo
echo "=== CARA PAKAI MODUL NODEJS (mencari nama fungsi yang benar) ==="
uapi NodeJS 2>&1 | head -40

echo
echo "=== KONFIGURASI APP SAAT INI (via API, secret disensor) ==="
uapi NodeJS get_application_information 2>&1 | sed -E 's#(DATABASE_URL|JWT_SECRET|PIN)[^,]*#\1 <sensor>#g' | head -40
