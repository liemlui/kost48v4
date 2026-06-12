# INSTRUKSI PEKERJAAN LANJUTAN — KOST48 V5.3 (untuk AI eksekutor)
**Tanggal:** 2026-06-12 · **Baseline:** commit `6c96a30` (origin/main) · **Status:** Pasca Simplifikasi Docs V2.
**Context:** Semua audit mega + UAT runtime + PWA hardening sudah selesai. Dokumen ini berisi 8 pekerjaan berikutnya (W-B01 s.d W-B08). Tugas-tugas ini membangun kode baru / patch — ikuti spesifikasi persis, jangan berimprovisasi di luar yang tertulis.

<!-- KOST48_DOCS_SYNC_20260612_NEXT_WORK_V513 -->

---

## Aturan Emas (Golden Rules)

1. **Kerjakan sequensial** W-B01 → W-B08. Satu task = verification pass = satu commit dengan pesan "fix: [nama task]" → lanjut. Jangan commit semua sekaligus.
2. **Setelah setiap backend task:** `cd backend; npx tsc --noEmit` = 0 errors.
3. **Setelah setiap frontend task:** `cd frontend; npx tsc --noEmit` = 0 errors. Untuk W-B04/W-B05 juga `cd frontend; npm run build` = PASS.
4. **STOP condition** (skip task + catat alasan + lanjut — JANGAN dipaksakan): file target tidak ditemukan; error TypeScript setelah 2 kali perbaikan; butuh npm install dependensi baru; ada perubahan di file yang juga disentuh task lain.
5. **LARANGAN MUTLAK:** Jangan tambah npm dependencies. Jangan ubah `modules/payment-submissions/approveSubmission` flow approval utama selain yang diperintahkan. Jangan ubah auto-ops, accounting, schema prisma, atau `backend/src/main.ts`. Jangan sentuh `sql/`, `scripts/`, `docs/` kecuali diperintahkan. Jangan ubah file yang sudah dimodifikasi oleh PWA hardening (cek git status).

---

## W-B01 — GAP #1: Hapus Partial Payment di Payment Submission Approval

**Referensi:** `docs/01_FLOW_MAP.md §15 GAP #1` · `docs/00_GROUND_STATE.md §2`
**Aturan owner:** *"Pembayaran harus sesuai dengan kontrak sehingga kita tidak menerima pembayaran Partial."*

### Masalah
`approveSubmission` di `payment-submissions.service.ts` (baris ±369-393) melakukan split nominal menjadi `rentPortion` + `depositPortion`, dan membiarkan invoice berstatus **PARTIAL** jika jumlah < total invoice. Ini bertentangan dengan aturan owner.

### Target file
`backend/src/modules/payment-submissions/payment-submissions.service.ts`

### Spesifikasi
1. Di dalam transaksi `approveSubmission`, setelah hitung paid amount segar (:358), tambahkan **guard penolakan**: jika total pembayaran (`rentPortion + depositPortion`) **kurang dari** total invoice (`invoice.totalAmountRupiah`) + sisa deposit yang belum dibayar (`depositRemaining`), maka **tolak** dengan 400 error + pesan "Pembayaran tidak sesuai kontrak. Jumlah pembayaran harus ≥ total invoice + sisa deposit."
2. Jangan ubah logika `depositPortion` cap (kelebihan depositPortion ditolak — itu sudah benar). Yang diubah hanya guard tambahan.
3. **Kriteria selesai:** tenant upload bukti dengan nominal kurang dari invoice → error 400. Tenant upload lunas penuh atau DP 30% + sisa sewa + jaminan → tetap bisa di-approve.

### Larangan
- Jangan ubah status invoice enum (PARTIAL tetap ada untuk jalur legacy/invoice manual).
- Jangan ubah `rejectSubmission`, `expireBooking`, atau jalur lain.
- Jangan ubah `syncInvoiceStatus`.

---

## W-B02 — GAP #3: Guard Hapus Payment Saat Kamar OCCUPIED

**Referensi:** `docs/01_FLOW_MAP.md §15 GAP #3`
**Aturan owner:** *"Room yang masih di masa kontrak, tidak dapat dibatalkan sepihak oleh admin."*

### Masalah
`invoice-payments.service.ts:209` method `remove` tidak punya guard yang mengecek apakah room sudah OCCUPIED. Admin bisa hapus invoice payment sehingga invoice turun PAID → PARTIAL/CANCELLED, padahal tenant masih menempati kamar.

### Target file
`backend/src/modules/invoice-payments/invoice-payments.service.ts`

### Spesifikasi
1. Di method `remove`, **sebelum** transaksi utama, cari `InvoicePayment` → dapatkan `invoiceId` → cari `Invoice` → lihat `InvoicesOnStays.stayId` → cari `Stay` → cek `Room.status` atau `Stay.initialMetersPromotedAt`.
2. **Tolak** (throw 409 Conflict) jika:
   - Status room === `OCCUPIED`, ATAU
   - `Stay.initialMetersPromotedAt !== null` (stay sudah promoted, artinya tenant sudah menempati)
3. Pesan error: "Tidak dapat menghapus pembayaran kamar yang sudah ditempati."
4. Guard ini hanya untuk `remove` — method `create` dan `update` tetap seperti sekarang.

### Kriteria selesai
- Admin coba remove payment untuk stay dengan room OCCUPIED → error 409.
- Admin remove payment untuk stay yang belum promoted (masih RESERVED) → tetap bisa (untuk booking yang gagal).

---

## W-B03 — GAP #4: Notifikasi Refund Manual First Paid Wins

**Referensi:** `docs/01_FLOW_MAP.md §15 GAP #4`
**Aturan owner:** Tenant yang kalah first-paid-wins karena admin telat verifikasi → notifikasi bahwa DP dikembalikan secara manual oleh admin.

### Masalah
Notifikasi A17 sudah ada (tenant kalah, ajakan pilih kamar lain). Tapi isinya belum menyebutkan bahwa DP akan dikembalikan oleh admin.

### Target file
`backend/src/modules/payment-submissions/payment-submissions.service.ts` (bagian notifikasi A17, sekitar baris 1270-1298 — cari `findOrCreateNotificationSubmissions` atau pola notifikasi terkait).

### Spesifikasi
1. Cari lokasi notifikasi A17 yang dikirim ke tenant yang kalah first-paid-wins. Notifikasi ini dikirim dari dalam transaksi `approveSubmission` setelah `cancelCompetingUnpaidBookingsTx`.
2. Update body/title notifikasi untuk menyebutkan: "Booking kamu di [nama kamar] sudah dipesan orang lain. DP-mu akan dikembalikan oleh admin. Hubungi admin untuk proses refund."
3. Jangan ubah timer/trigger notifikasi. Hanya copy pesan.

### Kriteria selesai
- Notifikasi A17 berisi ajakan hubungi admin + info refund DP manual.

---

## W-B04 — U-01: Skeleton + Prefetch Detail Kamar Publik

**Referensi:** `docs/05_UIUX_AUDIT_2026-06-12.md` (U-01 MAJOR)
**Masalah:** Halaman `/rooms/:roomId/detail` menampilkan spinner Bootstrap polos 6–8 detik sebelum konten. Root cause: barrel import backoffice modules. Solusi jangka pendek: skeleton + prefetch.

### Target files
- `frontend/src/pages/public/PublicRoomDetailPage.tsx`
- `frontend/src/pages/public/PublicRoomsPage.tsx`

### Spesifikasi

#### A. Skeleton di PublicRoomDetailPage.tsx
1. Saat `isLoading === true`, render **skeleton card** (bukan spinner):
   - Placeholder gambar: div persegi panjang abu-abu dengan pulsing animation.
   - Placeholder judul kamar: 2 baris abu-abu (lebar 60% dan 40%).
   - Placeholder harga: 1 baris abu-abu (lebar 30%).
   - Placeholder tabel istilah sewa: 3 baris abu-abu.
2. Saat `isError === true`, tampilkan "Gagal memuat detail kamar. Coba lagi." dengan tombol retry.
3. Gunakan CSS class Bootstrap `placeholder-glow` + `placeholder`.
4. Jangan ubah struktur layout — hanya ubah kondisi render saat loading.

#### B. Prefetch on hover/tap di PublicRoomsPage.tsx
1. Saat user **hover** atau **focus** pada kartu kamar di katalog, jalankan `queryClient.prefetchQuery` untuk detail kamar tersebut.
2. Gunakan key yang sama dengan `useQuery` di `PublicRoomDetailPage`.
3. Jangan prefetch jika data sudah ada di cache.

### Larangan
- Jangan ubah Vite config, barrel imports, atau struktur module.
- Jangan tambah dependensi baru.

### Kriteria selesai
- Halaman detail kamar menampilkan skeleton alih-alih spinner saat loading.
- Hover kartu katalog → detail kamar ter-prefetch (terlihat di React Query devtools).

---

## W-B05 — U-02: Pagination / Lazy-Load Katalog Kamar

**Referensi:** `docs/05_UIUX_AUDIT_2026-06-12.md` (U-02 MAJOR)
**Masalah:** 48 kamar + semua foto dimuat sekaligus. Berat di mobile.

### Target files
- `frontend/src/pages/public/PublicRoomsPage.tsx`
- Backend: tidak perlu diubah jika backend sudah support `limit`/`skip` query params (cek dulu)

### Spesifikasi
1. Cek dulu apakah endpoint `GET /api/public/rooms` sudah menerima query parameters `limit` dan `skip`. Jika sudah, lanjut. Jika belum, **STOP** dan catat "backend tidak support pagination — perlu tambah di marketing-public-rooms.service.ts".
2. Ubah frontend `PublicRoomsPage.tsx`:
   - Ganti load-all dengan **infinite scroll** atau **pagination numbered** (pilih yang lebih sederhana — pagination numbered).
   - Default: 12 kamar per halaman.
   - Tampilkan `Pagination` Bootstrap di bawah konten.
   - Saat pindah halaman, scroll ke atas.
3. **Kriteria selesai:** katalog publik hanya memuat 12 kamar per halaman, pagination bekerja, foto hanya termuat untuk kamar yang tampil.

---

## W-B06 — E-6 Timezone WIB di Scheduler Auto-Ops

**Referensi:** `docs/03_AUDIT_MEGA_2026-06.md` E-6 · `docs/07_NEXT_WORK_INSTRUCTIONS.md` W-05
**Masalah:** Auto-ops scheduler menggunakan UTC, sementara aturan bisnis (noon release pk 12:00, H+1 cut-off, pengingat H-day) semuanya menggunakan **WIB (UTC+7)**.

### Target file
`backend/src/modules/auto-ops/auto-ops.service.ts`

### Spesifikasi
1. Pada method `runAll` atau fungsi yang menentukan apakah job perlu dijalankan, **konversi waktu sekarang ke WIB** menggunakan `Intl.DateTimeFormat('Asia/Jakarta')` atau offset manual +7 jam.
2. Job yang peka waktu (noon release, downPaymentForfeit, overstayForcedCheckout, contractEndReminders) harus membandingkan dengan **waktu WIB**, bukan UTC.
3. **Jangan ubah database** — kolom tanggal tetap UTC. Hanya logika pembanding yang diubah.

### Kriteria selesai
- Job noon release berjalan pada pk 12:00 WIB, bukan pk 12:00 UTC.

---

## W-B07 — E-7 Round-Robin Assignment Tiket

**Referensi:** `docs/03_AUDIT_MEGA_2026-06.md` E-7 · `docs/07_NEXT_WORK_INSTRUCTIONS.md` W-04
**Masalah:** Penugasan otomatis tiket selalu ke staf dengan id terkecil (beban timpang).

### Target file
`backend/src/modules/tickets/tickets.service.ts`

### Spesifikasi
1. Di method `assign` atau method yang menetapkan `assigneeId` otomatis (cek di sekitar :373), ubah logika dari "staf id terkecil" menjadi **round-robin** berdasarkan: staf yang **paling sedikit tugas aktif (status OPEN/IN_PROGRESS)**.
2. Jika ada staf yang tidak punya tugas aktif, pilih staf dengan tugas paling sedikit.
3. Fallback: jika semua staf memiliki jumlah tugas yang sama, pilih random (bukan id terkecil).

### Larangan
- Jangan input absensi/kehadiran staf. Cuma optimasi assignment.

---

## W-B08 — Backup Otomatis + Monitoring Uptime

**Referensi:** Prompt owner 2026-06-12 — kebutuhan operasional produksi.
**Masalah:** Tidak ada backup terjadwal dan monitoring. Jika backend mati jam 2 pagi, tidak ada yang tahu.

### Target
File/cron script baru di `scripts/` folder.

### Spesifikasi

#### A. Backup Script
Buat file `scripts/backup-prod.ps1` (PowerShell):
1. Backup DB: `pg_dump -h localhost -p 5432 -U postgres -Fc kost48_v3 > backup_$(Get-Date -Format yyyyMMdd_HHmmss).dump`
2. Retensi: hapus file backup lebih dari 30 hari.
3. Log: tulis "OK [timestamp] size" atau "FAIL [timestamp] error" ke `backup.log`.
4. Jangan simpan password di script — asumsikan `.pgpass` sudah di-set.

#### B. Uptime Monitoring Script
Buat file `scripts/health-check.ps1`:
1. `curl.exe -sS http://localhost:3000/api/public/rooms?limit=1` — jika response bukan 200 atau timeout > 5 detik, kirim alert.
2. Karena belum ada notifikasi WA/email, alert cukup ditulis ke `health-check.log` + exit code 1.
3. Jalankan tiap 5 menit via Windows Task Scheduler (dokumentasi di komentar script).

### Larangan
- Jangan pasang dependensi baru (curl.exe sudah ada di Windows).
- Jangan konfigurasi Task Scheduler (cuma dokumentasi).

### Kriteria selesai
- Script backup dijalankan → file .dump terbuat.
- Script health check dijalankan → log terisi.

---

## Ringkasan Semua Task

| ID | Tugas | Kategori | File Utama | Estimasi |
|---|---|---|---|---|
| W-B01 | 🔴 Hapus partial payment | Backend | `payment-submissions.service.ts` | 1 sesi |
| W-B02 | 🟠 Guard remove payment OCCUPIED | Backend | `invoice-payments.service.ts` | 1 sesi |
| W-B03 | 🟡 Update notifikasi refund manual | Backend | `payment-submissions.service.ts` | 0.5 sesi |
| W-B04 | 🟠 Skeleton + prefetch detail kamar | Frontend | `PublicRoomDetailPage.tsx` | 1 sesi |
| W-B05 | 🟡 Pagination katalog 48 kamar | Frontend | `PublicRoomsPage.tsx` | 1 sesi |
| W-B06 | 🟡 Timezone WIB auto-ops | Backend | `auto-ops.service.ts` | 0.5 sesi |
| W-B07 | 🔵 Round-robin assignment tiket | Backend | `tickets.service.ts` | 0.5 sesi |
| W-B08 | 🔵 Backup + monitoring | Scripts | `scripts/backup-prod.ps1` | 1 sesi |

**Total estimasi:** ±6–7 sesi AI eksekutor.