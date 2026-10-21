#!/bin/bash
# Deploy satu halaman statis /checklist ke produksi (tanpa build, tanpa restart).
# Pakai: bash scripts/remote/deploy-checklist.sh [berkas-lokal]
# Butuh: kunci SSH .ssh-kost48/kost48_deploy (lokal, tidak masuk git) + IP diizinkan host.
set -euo pipefail

HOST="${KOST48_SSH_HOST:-api.kost48surabaya.com}"
PORT="${KOST48_SSH_PORT:-4422}"
USER="${KOST48_SSH_USER:-kost48s1}"
KEY="${KOST48_SSH_KEY:-$PWD/.ssh-kost48/kost48_deploy}"
KNOWN="$PWD/.ssh-kost48/known_hosts"
SRC="${1:-frontend/public/checklist/index.html}"
DEST="/home/kost48s1/kost48-prod/client/checklist/index.html"

[ -f "$SRC" ] || { echo "GAGAL: berkas lokal tidak ada: $SRC"; exit 1; }
[ -f "$KEY" ] || { echo "GAGAL: kunci SSH tidak ada: $KEY"; exit 1; }

SSH_OPTS=(-p "$PORT" -i "$KEY" -o IdentitiesOnly=yes -o ConnectTimeout=15)
if [ -f "$KNOWN" ]; then
  SSH_OPTS+=(-o UserKnownHostsFile="$KNOWN" -o StrictHostKeyChecking=yes)
fi

echo "== 1. unggah =="
scp "${SSH_OPTS[@]}" "$SRC" "$USER@$HOST:$DEST"

echo "== 2. bukti di server =="
ssh "${SSH_OPTS[@]}" "$USER@$HOST" "ls -l '$DEST'; grep -m1 -o 'Checklist Go-Live' '$DEST' || true"

echo "== 3. smoke HTTP =="
CODE=$(curl -fsS -o /dev/null -w '%{http_code}' "https://kost48surabaya.com/checklist/?v=$(date +%s)" || true)
echo "HTTP /checklist/ = ${CODE:-GAGAL}"
[ "$CODE" = "200" ] || { echo "PERIKSA: halaman belum 200"; exit 1; }
echo "SELESAI — buka https://kost48surabaya.com/checklist/ dengan Ctrl+Shift+R"
