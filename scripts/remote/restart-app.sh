#!/bin/bash
# Restart aplikasi Passenger lalu laporkan state. Tidak mengubah data.
set -u
APP="$HOME/kost48-prod"
echo "=== 1. PROSES NODE APP SEBELUM RESTART ==="
ps -u "$(id -un)" -o pid,etime,rss,cmd 2>/dev/null | grep 'lsnode:' | grep -v grep || echo "(tidak terlihat)"
echo
echo "=== 2. KIRIM SIGTERM KE PROSES APP ==="
PIDS=$(ps -u "$(id -un)" -o pid,cmd 2>/dev/null | grep 'lsnode:' | grep -v grep | awk '{print $1}')
if [ -n "$PIDS" ]; then
  for p in $PIDS; do
    echo "  kill -TERM $p"
    kill -TERM "$p" 2>/dev/null || echo "    gagal (mungkin milik proses lain)"
  done
else
  echo "  tidak ada proses untuk dihentikan"
fi
sleep 6
echo
echo "=== 3. PROSES SETELAH SIGTERM ==="
ps -u "$(id -un)" -o pid,etime,rss,cmd 2>/dev/null | grep 'lsnode:' | grep -v grep || echo "(bersih)"
echo
echo "=== 4. PICUL ULANG DENGAN REQUEST LOKAL ==="
curl -s -o /dev/null -w "  GET / -> HTTP %{http_code} dalam %{time_total}s\n" --max-time 60 "https://kost48surabaya.com/" || echo "  gagal"
curl -s -o /dev/null -w "  GET /api/public/rooms -> HTTP %{http_code} dalam %{time_total}s\n" --max-time 60 "https://kost48surabaya.com/api/public/rooms?limit=1" || echo "  gagal"
sleep 3
echo
echo "=== 5. PROSES SETELAH PICUL ULANG ==="
ps -u "$(id -un)" -o pid,etime,rss,cmd 2>/dev/null | grep 'lsnode:' | grep -v grep || echo "(belum ada)"
echo
echo "=== 6. LOG ERROR TERBARU ==="
tail -25 "$APP/stderr.log" 2>/dev/null || echo "tidak ada stderr.log"
