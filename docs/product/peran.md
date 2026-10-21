# Peta peran & rute — OWNER, ADMIN, STAFF, TENANT

> **Blok baca** · Jenis: **peta peran & rute** · Status: **aktif sejak 2026-10-21 (batch D2 DOCS-GEN2)** · Untuk siapa: agen + owner yang memeriksa akses
> · Baca kalau: memeriksa role, layar inti, atau rute mana yang boleh dibuka. · **Jangan** dibaca kalau: mencari status pekerjaan (itu [ANTREAN](../ANTREAN.md)) atau aturan kerja (itu [KONTRAK](../KONTRAK.md)).

**Fakta** · potret **2026-10-21** — sumber: `frontend/src/App.tsx` dan `frontend/src/config/navigation.ts` pada pohon kerja batch D2. Jumlah rute berubah bila kode berubah; hitung ulang dengan perintah di §6.

## 1. Cara membaca

- Empat role: **OWNER · ADMIN · STAFF · TENANT** (`type Role` di `App.tsx`).
- **PUBLIK** = tanpa login. **Semua** = di dalam `ProtectedRoute` tanpa `RequireRoles` (semua role terautentikasi).
- `RequireRoles` melakukan **redirect + toast**, bukan 403. Rute yang ditolak tetap ada di kode; matriks hanya mencatat role yang **diizinkan**.
- Matriks = **guard frontend**, bukan otorisasi backend. Jangan menyimpulkan API/DB aman dari berkas ini.
- Setiap baris dibaca dari atribut `path` dan array `allowed` di `App.tsx`; role tidak disimpulkan dari nama folder halaman.

## 2. Kartu peran

**OWNER** — pemilik arah bisnis.
- **Tujuan.** Menjaga KPI, angka keuangan, tarif, aset, dan keputusan strategis.
- **Layar inti.** `/owner-dashboard` (kokpit) · `/admin-dashboard` (mode admin OWNER) · `/reports` · `/finance/accounting-setup` · `/finance/assets` · `/loss-refunds` · `/settings` · `/market-analysis`.
- **Data yang dipegang (dari layar).** KPI & tren; laba-rugi, arus kas, neraca, rasio; bagan akun, jurnal, aset, depresiasi; tarif & konten publik; akun pengguna dan tenant.
- **Aksi terlarang (dari guard).** `/dashboard` (ADMIN/STAFF) · `/staff-report`, `/staff-warehouse` (STAFF) · seluruh `/portal/*` berisi layar (TENANT; `/portal/guide` hanya redirect).
- **Metrik yang dibaca.** KPI bisnis, prioritas, tren; laporan operasional dan rasio keuangan (hint navigasi).

**ADMIN** — pelaksana operasi harian.
- **Tujuan.** Menjalankan hunian, tagihan, tiket, dan stok tanpa mengubah arah bisnis.
- **Layar inti.** `/dashboard` · `/stays` · `/invoices` · `/tickets` · `/rooms` · `/inventory` · `/announcements` · `/meter-readings`.
- **Data yang dipegang (dari layar).** Booking, penghuni, perpanjangan, keluar; tagihan dan review pembayaran; tiket dan checklist staff; kamar, stok, catatan meter.
- **Aksi terlarang (dari guard).** OWNER-only: `/owner-dashboard`, `/admin-dashboard`, `/market-analysis`, `/loss-refunds`, `/reports` · STAFF-only: `/staff-report`, `/staff-warehouse` · seluruh `/portal/*` berisi layar (kecuali `/portal/guide` yang hanya redirect).
- **Metrik yang dibaca.** Prioritas hari ini: booking, bayar, perpanjangan, keluar, tiket, stok (hint navigasi).

**STAFF** — pekerja lapangan.
- **Tujuan.** Mengerjakan tugas lapangan dan mengirim bukti kerja.
- **Layar inti.** `/dashboard` · `/tickets` · `/rooms` · `/staff-warehouse` · `/staff-report` · ditambah `/profile`, `/notifications`.
- **Data yang dipegang (dari layar).** Checklist dan tiket lapangan; kondisi kamar dan barang kamar; stok kebersihan/alat; bukti kerja bulanan, rating, audit.
- **Aksi terlarang (dari guard).** Seluruh keuangan (`/invoices`, `/invoice-payments`, `/payment-submissions/review`, `/finance/*`, `/expenses`, `/reports`, `/wifi-sales`, `/ancillary-revenue`, `/loss-refunds`, `/reminders`) · administrasi (`/stays`, `/tenants`, `/users`, `/settings`, `/inventory`, `/staff-routines`, `/staff-performance`, `/announcements`, `/meter-readings`, `/iot`, `/additional-services`, `/service-interests`, `/loyalty`, `/market-analysis`, `/owner-dashboard`, `/admin-dashboard`) · `/portal/*` berisi layar (kecuali `/portal/guide` yang hanya redirect).
- **Metrik yang dibaca.** Checklist dan prioritas hari ini; rating tenant, audit, dan kategori kinerja di laporan bulanan.

**TENANT** — penghuni.
- **Tujuan.** Memantau sewa, tagihan, dan kebutuhan huniannya sendiri.
- **Layar inti.** `/portal/stay` · `/portal/invoices` · `/portal/tickets` · `/portal/bookings` · `/portal/energy` · `/portal/announcements` · `/portal/manual` · `/portal/wifi` · `/portal/loyalty` · ditambah `/profile`, `/notifications`.
- **Data yang dipegang (dari layar).** Masa sewa dan tagihan sendiri; tiket sendiri; pemakaian listrik/air; pengumuman; poin dan reward.
- **Aksi terlarang (dari guard).** Seluruh area operasional (`/dashboard`, `/stays`, `/invoices`, `/tickets`, `/rooms/:id`, `/finance/*`, `/staff*`) dan semua rute OWNER/ADMIN; pengecualian hanya `/profile` dan `/notifications`.
- **Metrik yang dibaca.** Tagihan dan jatuh tempo, status pemesanan, progres tiket, pemakaian listrik/air (hint navigasi).

## 3. Matriks rute → role

**79 baris = 79 `<Route path=...>`** di `App.tsx` (potret 2026-10-21). Sebaran: **PUBLIK 13 · Semua 7 · RequireRoles 59 · TIDAK TERPETAKAN 0**.

| Rute | Role |
|---|---|
| `/login` | PUBLIK |
| `/forgot-password` | PUBLIK |
| `/reset-password` | PUBLIK |
| `/rooms` | PUBLIK (katalog; default TENANT stage browsing) |
| `/rooms/:roomId/detail` | PUBLIK |
| `/booking/:roomId` | PUBLIK |
| `/update-kamar` | PUBLIK |
| `/availability-setup` | PUBLIK |
| `/okupansi` | PUBLIK |
| `/cek` | PUBLIK |
| `/panduan` | PUBLIK |
| `/reviews` | PUBLIK |
| `/` | PUBLIK (RootEntry; login diarahkan ke rute default role) |
| `/cepat` | Semua (terautentikasi) — **DEPRECATED**, lihat §5 |
| `/pilih-mode` | Semua (terautentikasi) |
| `/dashboard` | ADMIN, STAFF |
| `/owner-dashboard` | OWNER |
| `/admin-dashboard` | OWNER (mode admin OWNER) |
| `/market-analysis` | OWNER |
| `/profile` | OWNER, ADMIN, STAFF, TENANT |
| `/renew-requests` | OWNER, ADMIN |
| `/loss-refunds` | OWNER |
| `/users` | OWNER, ADMIN |
| `/tenants` | OWNER, ADMIN |
| `/rooms/:id` | OWNER, ADMIN, STAFF |
| `/portal/booking/:roomId` | TENANT (plus `TenantBookingRouteGuard` stage browsing) |
| `/stays` | OWNER, ADMIN |
| `/stays/check-in` | ADMIN, OWNER |
| `/stays/assist` | OWNER, ADMIN |
| `/stays/:id` | OWNER, ADMIN |
| `/invoices` | OWNER, ADMIN |
| `/invoice-payments` | OWNER, ADMIN |
| `/payment-submissions/review` | OWNER, ADMIN |
| `/invoices/:id` | OWNER, ADMIN |
| `/announcements` | OWNER, ADMIN |
| `/meter-readings` | OWNER, ADMIN |
| `/iot` | OWNER, ADMIN |
| `/ac-maintenance` | OWNER, ADMIN |
| `/additional-services` | OWNER, ADMIN |
| `/service-interests` | OWNER, ADMIN |
| `/tickets` | OWNER, ADMIN, STAFF |
| `/staff-routines` | OWNER, ADMIN |
| `/staff-performance` | OWNER, ADMIN |
| `/surveys` | OWNER, ADMIN |
| `/guest-preferences` | OWNER, ADMIN |
| `/staff-report` | STAFF |
| `/staff-warehouse` | STAFF |
| `/inventory` | OWNER, ADMIN (induk) |
| `/inventory/gudang` | OWNER, ADMIN (warisi induk) |
| `/inventory/barang-kamar` | OWNER, ADMIN (warisi induk) |
| `/inventory/mutasi` | OWNER, ADMIN (warisi induk) |
| `/inventory-items` | Semua (redirect ke `/inventory/gudang`; isi dijaga OWNER/ADMIN) |
| `/room-items` | Semua (redirect ke `/inventory/barang-kamar`; isi dijaga OWNER/ADMIN) |
| `/inventory-movements` | Semua (redirect ke `/inventory/mutasi`; isi dijaga OWNER/ADMIN) |
| `/wifi-sales` | OWNER, ADMIN |
| `/ancillary-revenue` | OWNER, ADMIN |
| `/finance/accounting-setup` | OWNER, ADMIN |
| `/finance/assets` | OWNER, ADMIN |
| `/expenses` | OWNER, ADMIN |
| `/reminders` | OWNER, ADMIN |
| `/reports` | OWNER |
| `/settings` | OWNER, ADMIN |
| `/notifications` | OWNER, ADMIN, STAFF, TENANT |
| `/portal/announcements` | TENANT |
| `/portal/announcements/:id` | TENANT |
| `/portal/stay` | TENANT |
| `/portal/energy` | TENANT |
| `/portal/bookings` | TENANT |
| `/portal/invoices` | TENANT |
| `/portal/invoices/:id` | TENANT |
| `/portal/tickets` | TENANT |
| `/portal/loyalty` | TENANT |
| `/portal/manual` | TENANT |
| `/portal/checkout` | TENANT (stub informatif) |
| `/portal/renewal` | TENANT (stub informatif) |
| `/loyalty` | OWNER, ADMIN |
| `/portal/guide` | Semua (redirect ke `/portal/manual`; tanpa `RequireRoles`) |
| `/portal/wifi` | TENANT |
| `*` | Semua (fallback `NotFoundPage`) |

## 4. Temuan dari penurunan

1. **`/cepat` dan `/pilih-mode` hanya dijaga `ProtectedRoute`**, jadi **TENANT pun bisa membukanya**. Ini bukan pelanggaran gate, tetapi harus diperhitungkan saat `/cepat` dihapus.
2. **`/portal/guide` tanpa `RequireRoles`**: semua role terautentikasi bisa memicu redirect ke `/portal/manual`; isi manual tetap dijaga TENANT.
3. **Tiga rute redirect inventaris** (`/inventory-items`, `/room-items`, `/inventory-movements`) juga tanpa `RequireRoles`; yang dijaga adalah targetnya. STAFF yang membukanya akan diredirect lagi oleh `RequireRoles` di `/inventory/*`.
4. **OWNER punya dua mode nyata**: `/owner-dashboard` dan `/admin-dashboard`, keduanya OWNER-only. ADMIN **tidak** boleh membuka `/admin-dashboard`; jangan menyebutnya "dashboard admin".
5. **`navigation.ts` bukan daftar akses.** Ia kurasi sidebar: 8 tautan OWNER, 12 ADMIN, 5 STAFF, 7 TENANT (occupied) + 1 loyalty opsional, sedangkan `App.tsx` punya 79 rute. Detail, profil, notifikasi, redirect, dan stub sengaja tidak masuk sidebar; selisih ini temuan, bukan kesalahan.
6. **`/portal/checkout` dan `/portal/renewal` adalah stub** (komentar kode R-13), bukan layar penuh.
7. **Tiga halaman operasional publik** (`/okupansi`, `/update-kamar`, `/availability-setup`) tidak punya guard frontend. Otorisasi backend-nya **tidak diperiksa** di D2.
8. **Dua rute kamar berbeda**: `/rooms/:id` (OWNER/ADMIN/STAFF) dan `/rooms/:roomId/detail` (PUBLIK). Jangan saling menggantikan.

## 5. `/cepat` deprecated dan tiga elemen yang dipindah

Keputusan owner `DOCS-GEN2` (Q1=a): **satu desain, Normal**. `/cepat` **deprecated**; tiga elemennya dipindah ke **kokpit OWNER** sebagai mode ringkas:

1. **Antrean keputusan** — daftar hal yang menunggu keputusan OWNER.
2. **Metrik ringkas** — KPI inti dalam satu layar.
3. **Aksi satu klik** — tindakan cepat dari kokpit.

**D2 tidak mengubah kode.** Penghapusan `/cepat` dan pemindahan elemen adalah task kode terpisah. `/pilih-mode` adalah pintu pemilihan mode; setelah `/cepat` hilang ia kehilangan fungsi dan perlu diputuskan di task yang sama.

## 6. Menghitung ulang

```powershell
node -e "const s=require('fs').readFileSync('frontend/src/App.tsx','utf8');console.log((s.match(/<Route\s+path=/g)||[]).length)"
```

Angka itu harus sama dengan jumlah baris matriks §3. Bila berbeda, matriks basi: turunkan ulang, jangan mengarang role.

## 7. Batas

- Hanya guard rute frontend. Permission API, kepemilikan data di DB, dan kontrol backend **tidak** diaudit di sini.
- Perilaku halaman tidak dibuka di browser pada D2; seluruh isi diturunkan statis dari kode.
- "Data yang dipegang" adalah data yang tampil di layar role, bukan klaim kepemilikan tabel DB.
- Angka rute adalah potret; kode yang berubah setelah 2026-10-21 membatalkan angka ini.

## 8. Riwayat

| Tanggal | Perubahan |
|---|---|
| 2026-10-21 | Dibuat pada batch D2 DOCS-GEN2: empat kartu role, matriks 79 rute dari `App.tsx`, temuan guard, dan status `/cepat` deprecated. |
