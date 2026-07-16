# RUNBOOK — Overhaul UI/UX Portal Admin KOST48

**Dibuat:** 2026-07-16 · **Status:** 🟡 MENUNGGU EKSEKUSI · **Branch:** main

> **Prinsip:** "Ringkas saat dilihat, lengkap saat dibuka."  
> Jangan menghapus fitur. Gunakan progressive disclosure.  
> Bahasa Indonesia operasional. Mobile-friendly.  
> OWNER di Area Admin tetap punya kewenangan OWNER.

---

## KRITERIA SELESAI (harus terpenuhi semua sebelum push)

- [ ] Tidak ada route Admin yang kehilangan akses
- [ ] Setiap route tersembunyi bisa dijangkau maksimal 2 interaksi (sub-navigation/tab)
- [ ] Tidak ada CTA penting yang menjadi lebih dari dua interaksi
- [ ] Tidak ada metrik yang ditampilkan berulang tanpa fungsi berbeda
- [ ] Tidak ada enum mentah di UI (semua pakai label Bahasa Indonesia)
- [ ] Tidak ada horizontal overflow pada viewport 375 px
- [ ] ADMIN tidak memicu endpoint OWNER-only
- [ ] OWNER di Area Admin tetap dapat menjalankan kewenangan OWNER
- [ ] Navigasi keyboard, fokus modal, dan pembaca layar tetap benar
- [ ] `npx tsc --noEmit` backend PASS (hanya fase yang menyentuh backend)
- [ ] `npm run build` frontend PASS
- [ ] Screenshot sebelum/sesudah untuk halaman utama diambil

---

## PRA-EKSEKUSI — Screenshot Sebelum

> **⚠️ WAJIB diambil SEKARANG, sebelum Fase 1 mengubah tampilan.**

- [ ] Screenshot Dashboard Admin (`/dashboard`) — desktop 1440px
- [ ] Screenshot Dashboard Admin — mobile 375px
- [ ] Screenshot Masa Sewa & Penghuni (`/stays`) — desktop 1440px
- [ ] Screenshot Keuangan (`/invoices`) — desktop 1440px
- [ ] Screenshot Staff & Tiket (`/tickets`) — desktop 1440px

---

## ATURAN STAGING & COMMIT

Karena worktree mungkin memiliki perubahan lain:

- Setiap commit WAJIB **staging selektif** — hanya file yang relevan dengan fase
- Sebelum commit: `git diff --cached --name-only` untuk verifikasi tidak ada file asing
- Sebelum commit: `git diff --cached --check` untuk whitespace error
- Commit atomik per fase (7 commit), push setelah semua selesai
- JANGAN sertakan kredensial/data produksi
- JANGAN commit file di luar scope

---

## FASE 1 — Design Foundation: Navigasi, PageHeader, Status, Pola Responsif

> **Tujuan:** Fondasi yang dipakai semua fase berikutnya. Tanpa ini, halaman lain tidak bisa dikerjakan dengan konsisten.

### 1.1 Reorganisasi Sidebar Admin

- [ ] Pecah 1 section "Operasional Kos" (10 item) menjadi 3 section:
  - **"Huni & Uang"** (3 item): Dashboard, Masa Sewa & Penghuni (`/stays` + `/tenants` + `/renew-requests`), Keuangan (`/invoices` + `/expenses` + `/payment-submissions/review` + `/wifi-sales` + `/ancillary-revenue` + `/finance/*`)
  - **"Operasional"** (3 item): Staff & Tiket (`/tickets` + `/staff-routines` + `/staff-performance`), Kamar & Stok (`/rooms` + `/inventory/*` + `/meter-readings`), Perawatan AC (`/ac-maintenance`)
  - **"Penghuni & Komunikasi"** (4 item): Survei Penghuni (`/surveys`), Preferensi Tamu (`/guest-preferences`), Pengumuman (`/announcements`), Reward (`/loyalty`)
- [ ] **Label Loyalitas dibedakan OWNER vs ADMIN:**
  - ADMIN: "Reward" (fokus operasional — proses penukaran)
  - OWNER di Area Admin: "Loyalitas & Reward" (fokus strategis — kebijakan + penukaran)
  - Karena `ownerAdminSections` saat ini diturunkan langsung dari `adminSections` (hanya ganti `/dashboard` → `/admin-dashboard`), perlu **transformasi label khusus**: OWNER di Area Admin melihat sidebar dengan struktur sama tetapi label "Reward" diganti menjadi "Loyalitas & Reward". Implementasi: fungsi `mapOwnerAdminLabels` di `navigation.ts`.
- [ ] **Route tersembunyi tetap via `activePaths`** — tetapi setiap halaman induk WAJIB memiliki **sub-navigation** (tabs atau link di dalam halaman) sehingga route tersembunyi bisa dijangkau maksimal 2 interaksi. Contoh: halaman `/stays` punya sub-tab "Booking" | "Aktif" | "Checkout" | "Data Penghuni" (link ke `/tenants`?ktpStatus=PENDING_REVIEW).
- [ ] OWNER di Area Admin: struktur dan tujuan navigasi **sama** dengan ADMIN, tetapi label boleh menyesuaikan konteks role (contoh: "Reward" → "Loyalitas & Reward").

### 1.2 Standarisasi PageHeader

- [ ] Utilisasi komponen `PageHeader` yang sudah ada — pastikan semua halaman admin memakainya dengan:
  - **Judul** — nama halaman (contoh: "Masa Sewa & Penghuni")
  - **Subtitle** — konteks satu kalimat (contoh: "Kelola booking, penghuni aktif, perpanjangan, dan checkout.")
  - **Stat ringkas** (opsional) — maksimal 3 chip metric di bawah subtitle
  - **1 CTA utama** (opsional) — contoh: "＋ Check-in Baru" di halaman stays
- [ ] Audit semua halaman admin — yang belum pakai PageHeader, pasang

### 1.3 StatusBadge & Label Bahasa Indonesia

- [ ] Audit semua penggunaan `StatusBadge` dan label status di halaman admin
- [ ] Pastikan TIDAK ada enum mentah yang bocor ke UI (`IN_PROGRESS` → "Dikerjakan", `CANCELLED` → "Dibatalkan", dsb.)
- [ ] Konsistensi warna: bahaya = merah, perlu perhatian = kuning/orange, aman = hijau, netral = abu
- [ ] File yang disentuh: `StatusBadge.tsx`, `statusLabels.ts`, `getStatusLabel`, `getBookingStatusLabel`

### 1.4 Pola Responsif Tabel Bersama

- [ ] Buat **1 shared responsive table wrapper** (bukan sistem kartu terpisah per halaman)
- [ ] **Manfaatkan pola `data-label` yang sudah tersedia** — wrapper membaca atribut `data-label` dari sel tabel, bukan menebak nama kolom dari JSX arbitrer
- [ ] Tabel di ≥768px: tampil normal (kolom horizontal)
- [ ] Tabel di <768px: setiap `<tr>` jadi stacked card — `<td>` ditampilkan vertikal dengan `data-label` sebagai label tebal di kiri
- [ ] Pola ini dipakai di: StaysPage, InvoicesPage, TicketsPage, dan semua ConfiguredResourcePage
- [ ] **JANGAN** buat implementasi kartu terpisah per halaman — satu solusi bersama

### 1.5 Breadcrumb Kontekstual

- [ ] Perbaiki `getBreadcrumbParts` di `AppLayout.tsx`:
  - Tampilkan entitas detail, bukan hanya "Detail" — contoh: `Masa Sewa / Kamar A / Shinta`
  - **JANGAN melakukan API fetch dari AppLayout.** Nama tenant/kamar dikirim halaman detail melalui **route state / context / URL params**, bukan dari breadcrumb
  - Breadcrumb punya **fallback stabil**: jika data entitas belum tersedia, tampilkan "Detail" sebagai placeholder
- [ ] Breadcrumb root item pertama selalu link ke halaman utama sesuai role

### 1.6 Modal Safety

- [ ] **Modal dengan form panjang atau aksi sensitif** (approve booking, reject checkout, create invoice):
  - Backdrop = **static** (tidak menutup saat klik luar)
  - Jika form sudah diisi sebagian: konfirmasi "Perubahan belum disimpan" sebelum menutup
- [ ] **Modal sederhana** (konfirmasi singkat, info): backdrop click tetap boleh menutup

### GATE FASE 1
- [ ] `git diff --cached --check` sebelum commit
- [ ] `npm run build` frontend ✅
- [ ] Sidebar baru terlihat di desktop + mobile (offcanvas)
- [ ] Semua route admin masih bisa dijangkau (langsung URL atau via sub-navigation ≤ 2 interaksi)

---

## FASE 2 — Dashboard Admin (Command Center)

> **Tujuan:** Dashboard yang langsung bisa dipahami dalam 5 detik, tidak padat, tindakan utama terlihat.

### 2.1 Tab "Ringkasan" — Sederhanakan

- [ ] Tampilkan HANYA:
  - **AdminHealthBar** (okupansi + overdue + tiket — sudah ada, tetap)
  - **3-5 item antrean teratas** (pakai `ActionQueueTable` dengan `maxItems=5`, tanpa view mode board/calendar di overview — view mode toggle hanya muncul saat expand "Semua Antrean")
  - **Sinyal KTP pending** — badge kecil "[N] KTP perlu diperiksa" → klik menuju `/tenants?ktpStatus=PENDING_REVIEW` (filter spesifik, bukan sekadar `/tenants`)
  - **Status AutoOps singkat** — HANYA jika gagal atau butuh tindakan; jika normal, tidak muncul
  - **Ringkasan survei** — tetap seperti sekarang
- [ ] **Pertahankan `dense` toggle** selama Fase 1–5. Evaluasi dan hapus hanya setelah pengujian Fase 6 membuktikan desain default sudah cukup ringkas.
- [ ] **Pindahkan dari Ringkasan:** AI Brief, AutoOps panel detail, P-01 view mode toggle (list/board/calendar) — semuanya ke tab masing-masing

### 2.2 Tab "Penghuni & Uang"

- [ ] Tetap sebagai workspace stays + finance — konten dari `AdminStaysUnifiedList` + `AdminFinanceWorkspace`
- [ ] **Tambah sub-tab di halaman ini:** "Booking & Huni" | "Tagihan & Bayar" — agar user tidak scroll panjang
- [ ] **Tambah sinyal KTP pending lengkap** di sub-tab "Booking & Huni" — tabel antrean KTP dengan tombol "Periksa" per tenant
- [ ] `AdminProcessLine` tetap di sini sebagai pengingat flow

### 2.3 Tab "Operasional"

- [ ] Tetap sebagai workspace tiket + staff + kamar
- [ ] **Pindahkan AutoOps Control Panel ke sini** — sebagai bagian dari operasional
- [ ] **Tambah sub-tab:** "Tiket & Staff" | "Kamar & Stok"

### 2.4 AI Brief — OWNER-only, Kolapsibel di Tab Relevan

- [ ] AI Brief HANYA tampil untuk OWNER yang sedang dalam mode Area Admin
- [ ] BUKAN di tab Ringkasan dan BUKAN panel global di atas dashboard
- [ ] Tampil sebagai **panel kolapsibel di tab "Penghuni & Uang"** (konteks bisnis) — label: "🔮 Brief AI (Owner)"
- [ ] ADMIN reguler TIDAK melihat panel AI Brief sama sekali

### GATE FASE 2
- [ ] `git diff --cached --check` sebelum commit
- [ ] Dashboard admin bisa diakses di `/dashboard` (ADMIN) dan `/admin-dashboard` (OWNER)
- [ ] 3 tab berfungsi: Ringkasan, Penghuni & Uang, Operasional
- [ ] AI Brief muncul hanya untuk OWNER di Area Admin, di tab Penghuni & Uang
- [ ] KTP pending badge di Ringkasan → klik menuju `/tenants?ktpStatus=PENDING_REVIEW`
- [ ] AutoOps panel muncul di tab Operasional
- [ ] `npm run build` frontend ✅

---

## FASE 3 — Halaman Huni & Uang (Stays + Invoices + Keuangan)

> **Tujuan:** Halaman list/detail yang jelas, dengan "Perlu Tindakan" di atas, detail di bawah.

### 3.1 StaysPage (`/stays`)

- [ ] **Sub-navigation tabs:** "Booking" | "Aktif" | "Checkout" | "Data Penghuni" (link ke `/tenants?ktpStatus=PENDING_REVIEW` untuk KTP pending)
- [ ] **Section "Perlu Tindakan"** di atas tabel — berisi item booking yang perlu approval, checkout yang perlu review
- [ ] **StayAnalyticsPanel** tetap, tapi pindah ke bawah atau jadi kolapsibel agar tidak mendominasi
- [ ] Tabel pakai pola responsif Fase 1.4
- [ ] Semua route tersembunyi (`/tenants`, `/renew-requests`) bisa dijangkau dari sub-navigation ini — maksimal 2 interaksi

### 3.2 StayDetailPage (`/stays/:id`)

- [ ] Breadcrumb: `Masa Sewa / Kamar [Kode] / [Nama Tenant]` — data dari route state/context, fallback "Detail"
- [ ] Info kamar, tenant, masa sewa, deposit — dalam cards terstruktur
- [ ] Aksi (perpanjang, checkout, catat meter) di panel terpisah
- [ ] Riwayat dan audit di tab/panel bawah

### 3.3 InvoicesPage (`/invoices`)

- [ ] **Sub-navigation tabs:** "Tagihan" | "Review Pembayaran" (link ke `/payment-submissions/review`) | "Pengeluaran" (link ke `/expenses`) | "WiFi" (link ke `/wifi-sales`) | "Pendapatan Lain" (link ke `/ancillary-revenue`)
- [ ] **Ringkasan angka** di atas: Total Tagihan, Terkumpul, Overdue — sebelum chart
- [ ] Filter status: "Semua" | "Belum Dibayar" | "Overdue" | "Lunas" | "Draft"
- [ ] Tabel pakai pola responsif Fase 1.4
- [ ] Tombol "＋ Buat Tagihan" sebagai CTA utama
- [ ] Semua route tersembunyi keuangan bisa dijangkau dari sub-navigation ini

### 3.4 InvoiceDetailPage (`/invoices/:id`)

- [ ] Breadcrumb: `Keuangan / [Nomor Invoice]`
- [ ] Info tagihan + payment history dalam layout clear
- [ ] Aksi: issue, cancel, bayar manual — dengan konfirmasi + modal static backdrop

### GATE FASE 3
- [ ] `git diff --cached --check` sebelum commit
- [ ] Semua halaman huni & uang bisa dibuka
- [ ] Filter, sort, paginasi berfungsi
- [ ] Tabel responsif di mobile tidak overflow
- [ ] Semua route tersembunyi keuangan bisa dijangkau ≤ 2 interaksi dari `/stays` atau `/invoices`
- [ ] `npm run build` frontend ✅

---

## FASE 4 — Halaman Operasional (Tickets, Staff, Kamar, AC)

> **Tujuan:** Halaman operasional jelas, ringkas, dengan antrean prioritas.

### 4.1 TicketsPage (`/tickets`)

- [ ] **Sub-navigation tabs:** "Tiket" | "Rutinitas Staff" (link ke `/staff-routines`) | "Kinerja" (link ke `/staff-performance`)
- [ ] Filter tab tiket: "Semua" | "Baru" | "Dikerjakan" | "Selesai" | "Ditutup"
- [ ] **Section "Prioritas"** — tiket OPEN tanpa assignee + tiket DONE menunggu cek admin
- [ ] AdminStaffFieldReportQueue tetap di bawah
- [ ] TicketAnalyticsPanel tetap, kolapsibel
- [ ] Tabel pakai pola responsif Fase 1.4

### 4.2 Kamar & Stok (`/rooms` + inventory)

- [ ] `/rooms` — **sub-navigation tabs:** "Status Kamar" | "Catatan Meter" (link ke `/meter-readings`) | "Inventaris" (link ke `/inventory`)
- [ ] Grid kamar responsif dengan status color-coding
- [ ] `/inventory` — tabs (Gudang, Barang Kamar, Mutasi) berfungsi + PageHeader
- [ ] `/inventory/*` — bisa dijangkau dari `/rooms` ≤ 2 interaksi

### 4.3 Perawatan AC (`/ac-maintenance`)

- [ ] PageHeader + tabel jadwal cuci AC — sudah ada, verifikasi konsistensi

### GATE FASE 4
- [ ] `git diff --cached --check` sebelum commit
- [ ] Semua halaman operasional bisa dibuka
- [ ] Tidak ada horizontal overflow di mobile
- [ ] Semua route tersembunyi operasional bisa dijangkau ≤ 2 interaksi
- [ ] `npm run build` frontend ✅

---

## FASE 5 — CRUD Generik & Komunikasi

> **Tujuan:** Halaman generik (users, tenants, announcements, FAQ, loyalty) tetap punya konteks domain.

### 5.1 ConfiguredResourcePage — Context-Aware Header

- [ ] Tambah mapping resource → header text (judul + subtitle per resource):
  - `users` → "Akun Pengguna" / "Kelola akun owner, admin, staf, dan penghuni."
  - `tenants` → "Data Penghuni" / "Verifikasi KTP, data diri, dan riwayat penghuni."
  - `announcements` → "Pengumuman" / "Buat dan kelola pengumuman untuk penghuni."
  - `expenses` → "Pengeluaran" / "Catat dan pantau biaya operasional kos."
  - `wifi-sales` → "Penjualan WiFi" / "Kelola pesanan WiFi tenant."
  - `additionalServices` → "Layanan Tambahan" / "Atur layanan tambahan yang bisa dipesan tenant."
- [ ] Semua pakai PageHeader + pola responsif Fase 1.4

### 5.2 Halaman Loyalitas — Konteks Berbeda OWNER vs ADMIN

- [ ] `/loyalty` (ADMIN): fokus "Penukaran Reward" — daftar redemption yang perlu diproses, dengan tab "Katalog" (read-only)
- [ ] `/loyalty` (OWNER): "Loyalitas & Reward" — tab "Katalog" | "Penukaran" | "Kebijakan" (full access)
- [ ] Perbedaan konteks dari role, bukan dari route terpisah

### 5.3 Halaman Khusus Non-Generik

- [ ] `/surveys` — AdminSurveysPage, verifikasi PageHeader + responsif
- [ ] `/guest-preferences` — GuestPreferencesPage, verifikasi

### GATE FASE 5
- [ ] `git diff --cached --check` sebelum commit
- [ ] Semua halaman CRUD + komunikasi bisa dibuka
- [ ] Setiap halaman punya header kontekstual
- [ ] Halaman loyalty berbeda konteks OWNER vs ADMIN
- [ ] `npm run build` frontend ✅

---

## FASE 6 — Mobile, Accessibility, Empty/Loading/Error States

> **Tujuan:** Portal admin bisa dipakai nyaman di HP, accessibility terpenuhi, semua state tertangani.

### 6.1 Mobile Bottom Nav untuk Admin

- [ ] 5 item stabil: **Dashboard**, **Huni**, **Uang**, **Tiket**, **Lainnya** (menu overflow/hamburger)
- [ ] HANYA muncul di viewport < 768px
- [ ] JANGAN menduplikasi seluruh sidebar — ini navigasi cepat, bukan navigasi penuh
- [ ] Sidebar offcanvas tetap bisa dibuka via tombol hamburger

### 6.2 Responsive Polishing

- [ ] Uji SEMUA halaman admin di 375px, 768px, 1440px
- [ ] Pastikan tidak ada horizontal overflow
- [ ] Pastikan tombol CTA tetap mudah dijangkau (touch target ≥ 44px)
- [ ] Pastikan modal full-width di mobile, tidak terpotong

### 6.3 Empty, Loading, Error States

- [ ] Setiap halaman list: empty state pakai `EmptyState` komponen (ikon + judul + deskripsi + CTA)
- [ ] Setiap halaman list: loading state pakai skeleton (`TableSkeleton` atau `PageLoadingSkeleton`)
- [ ] Setiap halaman list: error state pakai `Alert variant="danger"` dengan tombol "Coba Lagi"
- [ ] Setiap halaman detail: error 404 pakai `NotFoundPage`

### 6.4 Accessibility

- [ ] Semua modal: fokus terjebak di dalam, ESC menutup (kecuali modal form sensitif dengan backdrop static)
- [ ] Semua tombol ikon punya `aria-label`
- [ ] Semua form input punya `<label>` terasosiasi
- [ ] Skip-to-content link berfungsi
- [ ] Kontras warna minimum AA — verifikasi dengan **pengujian axe yang bisa direproduksi**, simpan hasilnya sebagai file
- [ ] **JANGAN** jadikan Axe DevTools sebagai gate otomatis — gunakan pengujian manual yang hasilnya dicatat

### 6.5 Evaluasi Dense Toggle

- [ ] Setelah semua halaman selesai di-overhaul dan diuji di Fase 6:
  - Jika desain default sudah cukup ringkas → **hapus** dense toggle
  - Jika masih ada halaman yang terlalu padat → pertahankan sampai ada solusi desain yang lebih baik
- [ ] Keputusan dicatat di changelog

### GATE FASE 6
- [ ] `git diff --cached --check` sebelum commit
- [ ] Tidak ada horizontal overflow di 375px
- [ ] Hasil pengujian axe dicatat — 0 critical issues di halaman admin utama
- [ ] Mobile bottom nav muncul dan berfungsi
- [ ] `npm run build` frontend ✅

---

## FASE 7 — Pengujian Lintas Route, Dokumentasi & Git

> **Tujuan:** Verifikasi menyeluruh, dokumentasi diperbarui, commit atomik, push.

### 7.1 Pengujian Lintas Route

- [ ] Login sebagai `admin@kost48.com` — buka SEMUA halaman admin dan sub-navigation
- [ ] Login sebagai `owner@kost48.com` — buka Kokpit Owner, toggle ke Area Admin, buka semua halaman + sub-navigation
- [ ] Verifikasi: ADMIN tidak bisa akses `/owner-dashboard`, `/reports`, `/market-analysis`
- [ ] Verifikasi: OWNER di Area Admin tetap bisa buka `/reports` (kewenangan OWNER tidak hilang)
- [ ] Console browser: 0 error, 0 failed request (kecuali 403 yang memang disengaja)
- [ ] Verifikasi route tersembunyi bisa dijangkau ≤ 2 interaksi

### 7.2 Build & Type Check

- [ ] `cd backend && npx tsc --noEmit` — PASS (hanya jika fase menyentuh backend; kalau murni frontend skip)
- [ ] `cd frontend && npm run build` — PASS
- [ ] `cd frontend && npm run dev` — jalankan, pastikan tidak ada crash

### 7.3 Screenshot Sesudah

- [ ] Dashboard Admin — desktop 1440px
- [ ] Dashboard Admin — mobile 375px
- [ ] Masa Sewa & Penghuni — desktop 1440px
- [ ] Keuangan — desktop 1440px
- [ ] Staff & Tiket — desktop 1440px

### 7.4 Update Dokumentasi

- [ ] `docs/UI_UX_OWNER_ADMIN.md` — perbarui anchor implementasi, struktur navigasi baru, pola responsif
- [ ] `docs/M00_CODEMAP.md` — update jika ada perubahan struktur file signifikan
- [ ] `docs/M12_CHECKLIST_CHANGELOG.md` — tambah fase baru "Overhaul Admin UX" dengan checklist ini
- [ ] `docs/M13_CHANGELOG.md` — prepend entri changelog

### 7.5 Commit & Push (Atomik)

Setiap commit: staging selektif → `git diff --cached --name-only` → `git diff --cached --check` → commit.

- [ ] **Commit 1:** `feat: restruktur navigasi & sidebar admin (3 section, label kontekstual)`
- [ ] **Commit 2:** `feat: overhaul dashboard admin — ringkasan, sub-tab, AI owner-only`
- [ ] **Commit 3:** `feat: standarisasi halaman huni & uang + sub-navigation`
- [ ] **Commit 4:** `feat: standarisasi halaman operasional + sub-navigation`
- [ ] **Commit 5:** `feat: CRUD generik context-aware + loyalty konteks role`
- [ ] **Commit 6:** `feat: mobile nav admin, responsive polish, empty/loading/error, a11y`
- [ ] **Commit 7:** `docs: update dokumentasi pasca overhaul admin UX`
- [ ] `git push origin main`

### GATE FASE 7
- [ ] Semua kriteria selesai (lihat atas) tercentang
- [ ] Build frontend PASS
- [ ] 7 commit terpush ke origin/main
- [ ] Screenshot sebelum/sesudah terlampir
- [ ] Tidak ada route admin yang kehilangan akses

---

## LAPORAN AKHIR

Setelah semua fase selesai, isi laporan berikut:

| Item | Isi |
|------|-----|
| **Ringkasan hasil** | ... |
| **Halaman utama yang berubah** | ... |
| **Fitur yang tetap dipertahankan** | ... |
| **Hasil build** | BE: ... / FE: ... |
| **Dokumentasi diperbarui** | ... |
| **Commit hash & pesan** | ... |
| **Status push** | ... |
| **Keputusan dense toggle** | ... |
| **Risiko / pekerjaan lanjutan** | ... |
