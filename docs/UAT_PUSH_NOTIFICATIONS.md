# UAT Push Notification Produksi

## Tujuan

Memverifikasi alur end-to-end Web Push KOST48 tanpa membocorkan secret VAPID atau mengganggu akun penghuni nyata.

## Prasyarat

- Frontend berjalan melalui HTTPS dan service worker aktif.
- Backend memiliki `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, dan `VAPID_SUBJECT` yang valid. Jangan salin nilainya ke ticket, chat, atau screenshot.
- AutoOps aktif: proses always-on menjalankan interval, atau cPanel cron memanggil `POST /api/auto-ops/cron` dengan header `X-Cron-Token` secara berkala.
- Gunakan akun uji OWNER/ADMIN/TENANT dan perangkat/browser uji. Jangan mengirim data pribadi melalui notifikasi uji.

## Prosedur

1. Login sebagai akun uji, buka `/notifications`, dan pastikan kartu push ditampilkan.
2. Tekan **Aktifkan**, setujui permission browser, lalu muat ulang halaman. Kartu harus berubah menjadi aktif.
3. Dengan token akun yang sama, panggil `GET /api/push/vapid-public-key`. Respons harus menyatakan `enabled: true`; jangan menyimpan nilai `publicKey` pada laporan UAT.
4. Buat satu notifikasi yang aman di lingkungan UAT, atau pakai event uji yang sudah tersedia. Pastikan notifikasi muncul di halaman dan Bell.
5. Jalankan AutoOps biasa atau trigger OWNER/ADMIN `POST /api/auto-ops/run/push-dispatch`.
6. Pastikan perangkat menerima push dengan judul, isi, dan aksi navigasi yang sesuai. Ketuk push dan pastikan aplikasi membuka `linkTo` yang benar.
7. Ulangi langkah 5. Notifikasi yang sama tidak boleh dikirim ulang setelah statusnya `SENT`.
8. Matikan push melalui kartu notifikasi dan pastikan subscription perangkat tidak lagi menerima push baru.

## Bukti yang Dicatat

- Waktu pengujian, environment, role akun uji, dan browser/perangkat.
- Hasil `enabled` endpoint VAPID (boolean saja).
- Hasil dispatch: `processed`, `sent`, `failed`, `noDevice`, dan `deactivated`.
- Screenshot permission browser dan push yang diterima, tanpa token, endpoint subscription, atau data personal.
- Hasil klik push menuju halaman tujuan.

## Troubleshooting

| Gejala | Pemeriksaan |
|---|---|
| Kartu menyatakan push belum aktif | Pastikan VAPID env terpasang lalu restart backend; cek endpoint public key. |
| Tombol aktif gagal | Pastikan HTTPS, service worker terdaftar, dan browser tidak memblokir permission. |
| Subscription ada tetapi tidak ada push | Pastikan AutoOps/cron berjalan dan `PUSH_DISPATCH_ENABLED` bukan `false`; trigger endpoint dispatch manual untuk diagnosis. |
| `failed` bertambah | Periksa log backend. Status 404/410 menonaktifkan subscription usang; pengguna perlu mengaktifkan ulang. |
| Push diterima dua kali | Catat ID notifikasi, status push, dan waktu dispatch; ini regresi idempotensi yang harus diperbaiki sebelum go-live. |

## Kriteria Lulus

- Push dapat diaktifkan dan dimatikan pada perangkat uji.
- Satu notifikasi `PENDING` terkirim sekali, menjadi `SENT`, dan membuka tujuan yang benar.
- Notifikasi in-app tetap tersedia bila VAPID tidak dikonfigurasi atau perangkat tidak memiliki subscription.
- Tidak ada secret, token, endpoint subscription, atau data penghuni pada bukti UAT.
