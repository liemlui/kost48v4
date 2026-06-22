# Prompt Review Screenshot UI/UX — KOST48

> Gunakan prompt ini satu per satu. Lampirkan screenshot yang disebutkan di tiap scope.
> Prompt ditulis dalam Bahasa Indonesia karena sistem ini untuk pengguna Indonesia.

Urutan yang disarankan:

Scope 5 — Public dulu (calon penghuni, dampak terbesar ke konversi)
Scope 2 — Admin/Owner (workflow harian paling kritis)
Scope 1 — Tenant (pengalaman penghuni aktif)
Scope 4 — Staff (mobile-first, 1 pengguna saja)
Scope 3 — Owner-only (jarang dibuka, paling teknis)
---

## SCOPE 1 — TENANT APP (Portal Penghuni)

**Screenshot yang dilampirkan (dari folder `tenant-audit/`):**
```
T01-login-page.png          → Halaman login awal
T01-login-filled.png        → Form login sudah diisi
T02-portal-stay.png         → Portal utama penghuni (info kamar/kontrak aktif)
T02-portal-stay-loaded.png  → Portal utama setelah data load
T03-portal-stay-detail.png  → Detail kontrak & status hunian
T03-portal-stay-full.png    → Full-page detail hunian
T04-portal-invoices.png     → Daftar tagihan/invoice penghuni
T05-portal-tickets.png      → Daftar tiket pengaduan/request
T05b-tickets-modal.png      → Modal detail tiket
T06-portal-announcements.png → Halaman pengumuman dari admin
T07-portal-loyalty.png      → Halaman poin loyalitas & leaderboard
T08-portal-checkout.png     → Form checkout / akhir masa sewa
T09-portal-renewal.png      → Form perpanjangan kontrak
T10-profile.png             → Halaman profil akun penghuni
T11-portal-profile.png      → (varian profil)
T11-guard-redirect.png      → Redirect saat akses halaman admin (guard)
T12-notifikasi-panel.png    → Panel notifikasi
T13-mobile-stay.png         → Tampilan mobile — info hunian
T13b-mobile-invoices.png    → Tampilan mobile — tagihan
T13c-mobile-tickets.png     → Tampilan mobile — tiket
T14-portal-bookings.png     → Halaman booking kamar (untuk penghuni)
```

**Konteks sistem:**
Ini adalah portal penghuni kost (KOST48 Surabaya Barat, 48 kamar). Penghuni menggunakan ini untuk:
melihat status kamar & kontrak, bayar tagihan, ajukan tiket masalah, baca pengumuman, ajukan perpanjangan, checkout, dan lihat poin loyalitas.
Bayar dilakukan via transfer bank / tunai (BUKAN payment gateway). Role: TENANT.
Belum publish — ini adalah DB testing dengan data seed.

**Yang perlu dianalisa:**

1. **Konsistensi visual** — Apakah layout, warna, tipografi, dan spacing konsisten di semua halaman? Ada komponen yang terlihat "tidak nyambung" atau berbeda gaya?

2. **Hierarki informasi** — Di halaman portal utama (T02/T03), apakah info paling penting (status kamar, jatuh tempo tagihan, kontrak aktif) mudah ditemukan tanpa scroll? Atau terpendam di bawah?

3. **Form UX** — Di form checkout (T08) dan perpanjangan (T09), apakah field-nya jelas, ada label, ada petunjuk? Ada yang membingungkan?

4. **Mobile responsiveness** — Bandingkan screenshot mobile (T13-T14) dengan versi desktop. Apakah teks tidak terpotong, tombol tidak terlalu kecil, layout tidak berantakan?

5. **Empty states** — Apakah halaman dengan data kosong (misal tagihan = 0, tiket = 0) menampilkan pesan yang informatif daripada area kosong polos?

6. **Feedback ke user** — Apakah ada loading state, konfirmasi aksi, atau error message yang terlihat? Atau ada halaman yang kelihatan "mati" saat loading?

7. **Temuan kritis** — List maksimal 5 masalah UI/UX yang paling perlu diperbaiki SEKARANG (berdasarkan visual saja), urutkan dari paling parah.

8. **Quick wins** — Apa 3 perbaikan paling cepat yang bisa dilakukan untuk meningkatkan kesan pertama penghuni?

Format jawaban: gunakan header per poin, singkat dan actionable. Sertakan referensi nama file screenshot saat menyebut temuan spesifik.

---

## SCOPE 2 — ADMIN & OWNER APP (Dashboard Manajemen)

**Screenshot yang dilampirkan (dari folder `admin-audit/`):**
```
A01-owner-dashboard.png      → Dashboard owner (ringkasan semua)
A02-owner-dashboard-dedicated.png → Owner dashboard khusus /owner-dashboard
A03-admin-dashboard.png      → Dashboard admin (lebih operasional)
A04-stays-list.png           → Daftar hunian aktif (tabel stays)
A05-invoices.png             → Daftar invoice & status pembayaran
A06-payment-review.png       → Review & verifikasi pembayaran
A07-tickets-admin.png        → Manajemen tiket dari sisi admin
A08-announcements-admin.png  → Kelola pengumuman
A09-tenants.png              → Daftar penghuni
A10-renew-requests.png       → Request perpanjangan dari penghuni
A11-reports.png              → Laporan keuangan & operasional
A12-settings.png             → Pengaturan sistem (harga, aturan, dll)
A13-loyalty-admin.png        → Leaderboard poin loyalitas penghuni
A14-inventory-gudang.png     → Inventaris & gudang perlengkapan
A15-market-analysis.png      → Analisa pasar AI (via DeepSeek)
A16-expenses.png             → Pencatatan pengeluaran
A17-staff-performance.png    → Performa staf
A18-staff-routines.png       → Jadwal rutinitas staf
A19-guard-admin.png          → Guard redirect (admin coba akses tenant portal)
A20-accounting-setup.png     → Setup akuntansi (COA, konfigurasi jurnal)
```

**Konteks sistem:**
Dashboard untuk OWNER dan ADMIN kost 48 kamar. Owner: akses penuh + laporan keuangan + konfigurasi. Admin: operasional harian. Fitur utama: manajemen hunian, verifikasi bayar, tiket, laporan neraca. Tidak ada denda keterlambatan. Bayar tunai/transfer manual. 1 staf tetap.

**Yang perlu dianalisa:**

1. **Efisiensi workflow utama** — Admin membuka app ini tiap pagi untuk: cek siapa yang belum bayar, cek tiket baru, proses check-in/out. Apakah dashboard (A03) langsung menampilkan 3 info itu? Atau harus buka menu dulu?

2. **Tabel & data density** — Halaman stays (A04), invoices (A05), tenants (A09): apakah tabel terlalu padat, atau terlalu longgar? Apakah kolom yang paling sering dicek (status, jatuh tempo, nama) di posisi paling kiri/terlihat?

3. **Verifikasi pembayaran (A06)** — Ini adalah flow paling kritis. Apakah UI jelas mana yang "menunggu verifikasi" vs "sudah lunas"? Ada tombol approve yang mudah ditemukan?

4. **Laporan keuangan (A11)** — Apakah angka-angka penting (pendapatan bulan ini, tagihan belum lunas, saldo) langsung terlihat? Atau penuh dengan tabel kecil yang butuh zoom?

5. **Pengaturan & COA (A12, A20)** — Ini jarang dibuka tapi penting. Apakah form setting terasa "berbahaya" (mudah salah klik)? Ada konfirmasi sebelum simpan?

6. **Konsistensi navigasi** — Apakah sidebar/menu konsisten di semua halaman admin? Ada halaman yang terasa "orphan" (tidak jelas posisinya di navigasi)?

7. **Temuan kritis** — 5 masalah UI/UX terbesar di area admin/owner, urutkan.

8. **Bandingkan A01 vs A03** — Owner dashboard vs admin dashboard: sudah cukup berbeda? Atau terlalu mirip padahal kebutuhan mereka berbeda?

Format jawaban: header per poin, singkat, sertakan nama file screenshot saat menyebut temuan.

---

## SCOPE 3 — OWNER-ONLY PAGES (Fitur Eksklusif Owner)

**Screenshot yang dilampirkan (dari folder `owner-extra-audit/`):**
```
O01-loss-refunds.png         → DP hangus & refund deposit (hanya OWNER)
O02-users.png                → Manajemen akun user & role
O03-meter-readings.png       → Input bacaan meter listrik & air
O04-additional-services.png  → Kelola layanan tambahan (laundry, dll)
O05-service-interests.png    → Minat layanan dari penghuni
O06-wifi-sales.png           → Penjualan voucher WiFi
O07-ancillary-revenue.png    → Pendapatan non-sewa (WiFi, laundry, dll)
O08-finance-assets.png       → Register & depresiasi aset tetap
O09-reminders.png            → Pengingat kontrak jatuh tempo
O10-room-detail.png          → Detail kamar lengkap (versi owner)
O11-check-in-wizard.png      → Wizard check-in penghuni baru
O12-owner-notifications.png  → Notifikasi untuk owner
O13-owner-portal-guard.png   → Guard: owner coba akses portal tenant (harus ditolak)
O14-invoice-payments.png     → Riwayat pembayaran invoice
```

**Konteks sistem:**
Halaman-halaman ini hanya bisa diakses OWNER (bukan admin, staf, atau penghuni). Fokus pada: keuangan mendalam, konfigurasi bisnis, data sensitif (user management, aset, loss DP). Kost belum publish, DB testing.

**Yang perlu dianalisa:**

1. **Wizard check-in (O11)** — Ini adalah flow paling kompleks (pilih kamar → pilih tenant → isi tanggal → setting DP/deposit → konfirmasi). Apakah langkah-langkah jelas? Ada progress indicator? Apakah setiap step tidak terlalu banyak field?

2. **Loss refunds (O01)** — Halaman yang paling "sensitif" secara keuangan (DP hangus / deposit dikembalikan). Apakah UI membedakan kedua kondisi ini dengan jelas? Ada risiko klik salah?

3. **Meter readings (O03)** — Input bacaan meter tiap bulan. Apakah form cukup simpel? Ada validasi input angka? Kelihatan bulan/periode-nya?

4. **User management (O02)** — Assign role (OWNER/ADMIN/STAFF/TENANT). Apakah mudah membaca siapa punya role apa? Apakah ada perlindungan dari "owner hapus dirinya sendiri secara tidak sengaja"?

5. **Aset tetap (O08)** — Pencatatan aset & depresiasi. Apakah form terasa seperti form akuntansi yang proper? Ada field yang tidak jelas maksudnya?

6. **Konsistensi dengan admin pages** — Apakah halaman owner-only terlihat berbeda dari halaman admin biasa (misal ada badge/label "OWNER"), atau tampilannya sama saja?

7. **Temuan kritis** — 5 masalah UI/UX terbesar, urutkan.

8. **Guard (O13)** — Apakah redirect saat owner coba akses portal tenant menampilkan pesan yang informatif ("Anda tidak punya akses ke area ini") atau langsung redirect diam-diam?

Format jawaban: header per poin, singkat, sertakan nama file screenshot saat menyebut temuan.

---

## SCOPE 4 — STAFF APP (Aplikasi Staf Operasional)

**Screenshot yang dilampirkan (dari folder `staff-audit/`):**
```
S01-staff-dashboard.png      → Dashboard utama staf
S02-staff-tickets.png        → Daftar tiket dari sudut pandang staf
S03-staff-report.png         → Laporan bulanan performa staf
S04-staff-warehouse.png      → Inventaris gudang & barang kamar
S05-staff-profile.png        → Profil akun staf
S06-staff-notifications.png  → Notifikasi staf
S07-staff-room-detail.png    → Detail kamar (staf boleh lihat, tidak bisa ubah tarif)
S08-staff-guard.png          → Guard: staf coba akses /invoices, /reports, /stays
S09-staff-portal-guard.png   → Guard: staf coba akses portal tenant
S10-mobile-dashboard.png     → Dashboard staf di mobile
S10b-mobile-staff-report.png → Laporan staf di mobile
```

**Konteks sistem:**
Ada 1 staf tetap. Tugas utama: cek & selesaikan tiket pemeliharaan, input rutinitas harian (kebersihan, dll), cek stok gudang. Staf TIDAK boleh lihat data keuangan (invoice, laporan, stays). App ini digunakan di HP (bukan laptop).

**Yang perlu dianalisa:**

1. **Mobile-first (S10, S10b)** — Karena staf pakai HP, ini yang paling penting. Apakah dashboard dan laporan staf nyaman dibaca di layar 375px? Tombol cukup besar untuk disentuh? Tidak ada overflow teks?

2. **Dashboard staf (S01)** — Apakah langsung terlihat "tugas apa yang harus dilakukan hari ini"? Atau staf harus cari-cari dulu? Tiket baru dan rutinitas harus ada di atas.

3. **Tiket dari sisi staf (S02)** — Staf menerima dan menyelesaikan tiket. Apakah jelas tiket mana yang belum ditangani? Ada tombol "selesaikan" yang mudah diakses? Bisa tambah foto/keterangan?

4. **Gudang (S04)** — Staf input stok masuk/keluar. Apakah form simpel? Ada fitur scan atau harus ketik manual? Apakah item dengan stok menipis terlihat menonjol?

5. **Laporan staf (S03)** — Ini yang dilihat owner untuk evaluasi staf. Apakah metrik yang ditampilkan relevan (jumlah tiket selesai, rutinitas selesai, skor)? Apakah staf juga bisa lihat skornya sendiri?

6. **Guard experience (S08, S09)** — Saat staf coba buka halaman yang tidak diizinkan, apakah pesan redirect jelas dan tidak bikin panik?

7. **Temuan kritis** — 5 masalah UI/UX terbesar untuk staf, urutkan dari yang paling menghambat kerja harian.

8. **Perbandingan dengan admin** — Apakah navigasi sidebar staf sudah disederhanakan (hanya menu yang relevan) atau masih menampilkan semua menu seperti admin?

Format jawaban: header per poin, singkat, sertakan nama file screenshot saat menyebut temuan.

---

## SCOPE 5 — PUBLIC PAGES (Halaman Marketing Publik)

**Screenshot yang dilampirkan (dari folder `public-audit/`):**
```
P01-landing.png           → Landing page utama (/) — halaman marketing KOST48
P02-rooms-list.png        → Katalog kamar publik (/rooms)
P03-room-detail-public.png → Detail kamar publik (/rooms/:id/detail)
P04-guest-booking-form.png → Form booking untuk calon penghuni (/booking/:id)
P05-mobile-landing.png    → Landing page di mobile (375px)
P05b-mobile-rooms.png     → Katalog kamar di mobile (375px)
P06-unauth-guard.png      → Redirect ke login saat akses dashboard tanpa login
P07-forgot-password.png   → Halaman lupa password
P08-rooms-social-proof.png → Tampilan social proof di /rooms
```

**Konteks sistem:**
Halaman publik ini adalah wajah pertama KOST48 ke calon penghuni. Tidak butuh login. Lokasi: Jl. Hikmah V No. 48, Surabaya Barat (dekat Pakuwon Mall / PTC). Target: calon penghuni yang cari kost via HP. Bayar via transfer bank / tunai setelah booking disetujui admin. Kost belum publish (sedang persiapan go-live).

**Yang perlu dianalisa:**

1. **First impression (P01)** — Calon penghuni yang pertama kali buka website: apakah dalam 5 detik mereka tahu ini kost apa, di mana, dan berapa harganya? Apakah hero section compelling? Ada CTA yang jelas?

2. **Katalog kamar (P02, P08)** — Apakah kartu kamar menampilkan info yang cukup (harga, tipe, ketersediaan, AC/kipas, kamar mandi dalam/luar)? Apakah filter mudah digunakan? Kamar yang tersedia (bookable) terlihat berbeda dari yang occupied?

3. **Detail kamar (P03)** — Halaman paling penting untuk konversi. Apakah foto kamar ada? Fasilitas jelas? Tombol booking terlihat menonjol? Ada info harga yang jelas (per bulan, DP berapa)?

4. **Booking form (P04)** — Calon penghuni isi form ini untuk mulai proses booking. Apakah field-nya jelas? Ada penjelasan proses selanjutnya setelah submit (contoh: "admin akan konfirmasi dalam X jam")? Atau langsung submit dan bingung?

5. **Mobile (P05, P05b)** — Mayoritas pengguna akan dari HP. Apakah teks tidak terlalu kecil? Tombol booking mudah disentuh? Gambar kamar tidak terpotong? Navigasi mudah?

6. **Social proof (P08)** — Apakah ada ulasan penghuni, statistik hunian, atau info yang membuat calon penghuni merasa yakin? Atau halaman rooms terasa dingin/korporat?

7. **Konversi path** — Dari landing → pilih kamar → booking, apakah setiap langkah ada CTA yang jelas untuk lanjut ke langkah berikutnya? Ada titik kebuntuan (dead end)?

8. **Temuan kritis** — 5 masalah UI/UX terbesar yang bisa membuat calon penghuni kabur sebelum booking, urutkan.

9. **Bandingkan P05 vs P01** — Desktop vs mobile landing: apakah kesan pertama sama kuatnya? Atau versi mobile terasa "downgrade"?

Format jawaban: header per poin, singkat, sertakan nama file screenshot saat menyebut temuan. Fokus pada perspektif calon penghuni yang awam teknologi.

---

> **Catatan untuk reviewer AI:**
> - Sistem ini belum live, ini DB testing — jadi data yang terlihat adalah seed/dummy
> - Bayar = manual (transfer/tunai), bukan payment gateway — jangan rekomendasikan integrasi Midtrans/Xendit
> - Tidak ada fitur denda keterlambatan — itu keputusan owner, bukan bug
> - Role hierarchy: OWNER > ADMIN > STAFF > TENANT (guard sudah ditest berfungsi)
> - Bahasa UI: Indonesia
