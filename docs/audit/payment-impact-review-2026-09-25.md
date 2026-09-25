# Review independen IMPACT-01 — 25 September 2026

## Hasil

Review statis producer → endpoint → consumer terhadap commit `933bdff5` menemukan satu gap tingkat sedang: kegagalan mengambil ringkasan dampak hanya menampilkan peringatan, tetapi tidak memblokir approve. Akibatnya, tujuan “lihat dampak sebelum tindakan” dapat dilewati ketika endpoint preview gagal.

`IMPACT-01-FIX-A` menutup gap tersebut di frontend: selama preview masih dimuat, gagal, atau tidak menghasilkan data, tombol approve dinonaktifkan dan alasannya tersedia pada judul tombol. Peringatan gagal diubah menjadi blocker eksplisit. Pengaman lain, termasuk checklist dan `paymentPolicy`, tetap berlaku.

## Kontrak yang diperiksa

- `GET /payment-submissions/:id/impact` dilindungi `JwtAuthGuard`, `RolesGuard`, dan role OWNER/ADMIN.
- Preview dan transaksi approve memakai helper alokasi/status yang sama; approve menghitung ulang di dalam transaksi dan tetap menjadi otoritas akhir.
- Endpoint serta helper tidak diubah dalam FIX-A; tidak ada perubahan schema, nominal, jurnal, permission, atau kontrak respons.
- Referensi jurnal invoice memakai `INVOICE_PAYMENT:<invoicePaymentId>` dan referensi deposit memakai `DEPOSIT:<stayId>`, sesuai jalur posting booking saat ini.

## Verifikasi

- Frontend: `npm.cmd run test -- src/test/components/reviewPaymentModalImpact.test.tsx` — exit 0, 3/3 test lulus. Percobaan awal 2/3 karena test mengabaikan checklist wajib; ekspektasi diperbaiki tanpa melemahkan guard.
- Gate uang backend: `npm.cmd run test:unit` — exit 0; build penuh lewat `pretest:unit`, 147/147 test lulus.
- `git diff --check` diperiksa sebelum commit.

## Batas

Runtime, DB, browser, viewport, keyboard, dan Axe tidak diuji. Approval backend tetap menolak state/nominal yang tidak sah, tetapi perilaku jaringan nyata dan perubahan data serentak belum diukur.
