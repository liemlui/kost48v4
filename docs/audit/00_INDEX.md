# 🔍 AUDIT MENYELURUH KOST48 V5 — INDEX MASTER

> **Tujuan:** menemukan **bug tersembunyi** di seluruh aplikasi (UI + API + logika bisnis + integritas data), bukan sekadar cek tampilan. Audit dibagi jadi **19 checklist kecil** supaya bisa dikerjakan satu-per-satu oleh AI eksekutor mana pun (termasuk model lemah). **Ini audit, BUKAN perbaikan** — eksekutor hanya mencatat temuan, tidak mengubah kode.

**Dibuat:** 2 Juli 2026 · **Basis:** `docs/PETA_SCOPE.md` + route nyata `frontend/src/App.tsx` + model `backend/prisma/schema.prisma`.

---

## 0. CARA PAKAI FILE INI (WAJIB DIBACA AI EKSEKUTOR)

1. **Baca file ini SAMPAI HABIS dulu** sebelum membuka checklist mana pun. Di sini ada: akun test, aturan main, format temuan, rubrik severity, dan **katalog jebakan bug** yang dipakai semua checklist.
2. Pilih **satu** file `CHECKLIST_XX_*.md`. Kerjakan **hanya satu checklist per sesi** supaya konteks tidak jenuh (lihat aturan cache di `CLAUDE.md`).
3. Kerjakan **setiap langkah berurutan**. Jangan lompat. Jangan menganggap "kemungkinan sudah benar" — **buktikan** dengan membuka halaman / memanggil API / membaca kode.
4. Setiap kali menemukan masalah, **catat pakai Template Temuan** (§5) ke bagian "HASIL TEMUAN" di bawah checklist tersebut.
5. Setelah selesai, isi **Definition of Done** di akhir checklist. Centang `[x]` hanya bila benar-benar dilakukan & dibuktikan.
6. **Jangan mengubah kode, DB, atau file konfigurasi.** Kalau tergoda memperbaiki: STOP, cukup catat di temuan dengan label `SARAN FIX`.

> ⚠️ **Anti-halusinasi:** Audit lama (Hermes, 2 Juli 2026) mengklaim beberapa halaman "404/kosong" padahal file-nya SUDAH ADA di repo (`MyManualPage.tsx`, `WifiOrderPage.tsx`, `MyAnnouncementsPage.tsx`). **Jangan percaya klaim tanpa verifikasi ulang.** Selalu cek route di `App.tsx` + buka halaman betulan.

---

## 1. PRASYARAT LINGKUNGAN (jalankan SEKALI di awal sesi audit)

Semua perintah dijalankan dari root repo kecuali disebut lain.

### 1a. Backend (API)
```bash
cd backend
npx tsc --noEmit          # HARUS 0 error sebelum audit. Kalau ada error → catat sebagai temuan BLOCKER.
npm run start:dev          # API hidup di http://localhost:3000/api
```

### 1b. Frontend (UI)
```bash
cd frontend
npm run dev                # UI hidup di http://localhost:5173 (kalau 5173 dipakai, Vite pindah ke 5174 — cek log terminal)
```

### 1c. Database
- **UAT (boleh dites & dimutasi):** PostgreSQL port **5433**, database `kost48_v3_pro`.
- **PRODUKSI (JANGAN SENTUH):** port 5432, database `kost48_v3`. Dilarang keras menjalankan query mutasi ke sini.
- Semua audit memakai **DB UAT (5433)**.

### 1d. Health check cepat (buktikan server hidup)
```bash
curl -s http://localhost:3000/api/health || curl -s http://localhost:3000/api   # respons apa pun selain connection-refused = hidup
```
Kalau backend/ frontend tidak mau hidup → itu **temuan BLOCKER**, hentikan audit halaman, catat dulu.

---

## 2. AKUN TEST (semua role)

| Role | Identifier (email/HP) | Password | Sumber | Catatan |
|------|----------------------|----------|--------|---------|
| ADMIN | `admin@kost48.com` | `admin123` | `scripts/uat/KOST48_V511_SMOKE.ps1` | Full akses kecuali fitur khusus OWNER |
| STAFF | `staff@kost48.com` | `staff123` | idem | Akses operasional terbatas |
| TENANT | `maya.tenant@kost48.test` | `Tenant#2026` | header audit Hermes | Kamar A. **Verifikasi dulu**; alternatif: `tenant.g2@kost48.com` |
| OWNER | `owner.test@kost48.test` | `OwnerTest#2026` | **harus di-seed** (lihat §2a) | Untuk audit dashboard owner + AI |

> Login lewat UI: buka `/login`. Login lewat API: `POST /api/auth/login` body `{ "identifier": "...", "password": "..." }` → respons berisi token (JWT). Simpan token untuk panggilan API ber-auth: header `Authorization: Bearer <token>`.

### 2a. Seed akun OWNER test (jalankan SEKALI, sebelum CHECKLIST_17)
Script idempoten (aman diulang, tidak menimpa kalau email sudah ada):
```bash
cd backend
# pastikan .env menunjuk DB UAT 5433 (DATABASE_URL=...:5433/kost48_v3_pro)
OWNER_EMAIL=owner.test@kost48.test OWNER_PASSWORD='OwnerTest#2026' OWNER_FULLNAME='Owner Test Audit' node scripts/seed-owner.js
```
Verifikasi: login owner via API harus balas token dengan role `OWNER`. Kalau gagal → catat temuan.

> ⚠️ Jangan seed owner ke DB produksi (5432). Pastikan `DATABASE_URL` = port 5433 sebelum menjalankan.

---

## 3. ATURAN EMAS AUDIT (baca tiap kali)

1. **Audit-only.** Tidak mengubah kode, migrasi, atau data produksi.
2. **Buktikan, jangan asumsikan.** Setiap "✅ OK" harus punya bukti: screenshot, cuplikan console, respons API, atau kutipan kode (`file:baris`).
3. **Nol toleransi ke console error.** JS error / warning di console = minimal MEDIUM. Catat pesan lengkap + halaman.
4. **Cek 3 lapis tiap fitur:** (a) UI/UX yang terlihat, (b) respons API di tab Network, (c) kode + data yang mendasarinya. Bug tersembunyi biasanya di lapis (b)/(c) yang tidak terlihat dari UI.
5. **Uji jalur gagal, bukan cuma jalur sukses.** Submit form kosong, input negatif, angka sangat besar, teks XSS (`<script>alert(1)</script>`), klik dobel cepat, akses tanpa login, akses lintas-role.
6. **Bahasa Indonesia** untuk semua catatan temuan (konsisten dengan repo).
7. **Sumber kebenaran aturan bisnis:** `docs/M02_KEPUTUSAN_OWNER.md` (84 keputusan) & M-file domain. Kalau UI bertentangan dengan M02 → itu temuan.

---

## 4. ALUR BAKU AUDIT SATU HALAMAN (ulangi untuk tiap halaman di checklist)

Ini "resep" yang dipakai berulang. Setiap checklist akan menunjuk ke langkah-langkah ini.

**Langkah A — Persiapan**
1. Login sebagai role yang diminta checklist.
2. Buka URL halaman (dari daftar di checklist).
3. Buka DevTools → tab **Console** (kosongkan dulu) & tab **Network** (aktifkan "Preserve log").

**Langkah B — Observasi visual**
4. Screenshot kondisi awal. Apakah ada konten, atau kosong/blank/spinner selamanya?
5. Cek layout: header, sidebar/menu, footer muncul konsisten dengan halaman lain? (sidebar hilang = temuan).
6. Cek teks: ada typo, teks placeholder ("lorem", "TODO", "undefined", "NaN", "Rp NaN", "Invalid Date")?

**Langkah C — Console & Network**
7. Baca Console: catat SEMUA error & warning (pesan lengkap).
8. Baca Network: adakah request gagal (status 4xx/5xx)? Adakah request yang sama diulang berkali-kali (indikasi loop / N+1)? Adakah data sensitif bocor (passwordHash, token orang lain)?

**Langkah D — Interaksi (uji jalur sukses & gagal)**
9. Klik setiap tombol & link. Apakah melakukan sesuatu? Tombol mati (disabled) — apakah wajar & ada penjelasan?
10. Isi setiap form dengan data valid → submit → cek sukses + data benar-benar tersimpan (cek via API/refresh).
11. Isi form dengan data TIDAK valid (kosong, salah format, negatif, sangat besar) → harus ada pesan error yang jelas, bukan diam / crash.
12. Uji tombol "Batal"/"Tutup"/"X" pada modal — harus benar-benar menutup & mereset form.

**Langkah E — Verifikasi kode & data**
13. Buka file FE yang tercantum di checklist (Read). Cocokkan: apakah UI melakukan apa yang kode klaim?
14. Buka modul BE terkait (endpoint). Cek: validasi input ada? guard role ada? error ditangani?
15. Cek integritas data terkait "jebakan" di §6 (mis. DP vs deposit, TB balance).

**Langkah F — Catat**
16. Setiap masalah → Template Temuan (§5). Setiap yang OK → cukup centang di checklist.

---

## 5. TEMPLATE TEMUAN (salin untuk tiap bug)

```markdown
### [KODE-TEMUAN] Judul singkat masalah
- **Severity:** BLOCKER | HIGH | MEDIUM | LOW | INFO
- **Halaman/URL:** /portal/xxx
- **Role:** TENANT/ADMIN/...
- **Langkah reproduksi:**
  1. ...
  2. ...
- **Yang diharapkan (expected):** ...
- **Yang terjadi (actual):** ...
- **Bukti:** (pesan console / status Network / screenshot / kutipan)
- **Lokasi kode:** `frontend/src/...tsx:123` dan/atau `backend/src/modules/.../*.service.ts:45`
- **Kcategori:** UI/UX | Fungsional | Keamanan | Data/Akuntansi | Performa | Aksesibilitas | Konsistensi
- **SARAN FIX:** (opsional, 1-2 kalimat — JANGAN diterapkan, hanya catatan)
```

**Penomoran kode temuan:** `<NoChecklist>-<Urut>`. Contoh di CHECKLIST_06 temuan ke-3 = `C06-03`. Ini bikin temuan mudah dilacak & tidak bentrok.

---

## 6. KATALOG "JEBAKAN BUG TERSEMBUNYI" (domain KOST48) — CEK DI SETIAP CHECKLIST RELEVAN

Bug paling berbahaya di aplikasi ini bukan tampilan, tapi **salah logika bisnis**. Berikut jebakan spesifik domain — tiap checklist menunjuk yang relevan dengan nomor JB-xx:

- **JB-01 · DP ≠ Deposit.** `downPayment*` (DP, 30% sewa, **hangus/tidak refundable**) BEDA dengan `deposit*` (deposit jaminan, **refundable**, dari `Room.defaultDepositRupiah`, **SELALU tetap** nilainya). Cari UI yang menukar istilah, atau deposit yang berubah nilainya, atau DP yang direfund. Ini bug klasik.
- **JB-02 · Tidak ada model `Booking`.** Satu `Stay` mewakili booking→huni→selesai. "Promoted" = `initialMetersPromotedAt` terisi. Jangan cari entitas Booking; cek Stay.
- **JB-03 · RESERVED bukan berarti lunas.** Room status: belum bayar=AVAILABLE, DP approved=RESERVED, lunas=RESERVED, check-in=OCCUPIED. Status lunas dibaca dari **invoice/payment**, BUKAN dari status kamar dan BUKAN dari `downPaymentPaidRupiah`. Label "Reserved-DP" vs "Reserved-Lunas" harus dibedakan dari data pembayaran.
- **JB-04 · Meter awal hanya dipromosikan saat CHECK-IN.** Payment approval TIDAK boleh promote meter/occupancy. Kalau approve pembayaran langsung bikin kamar OCCUPIED / set meter → bug.
- **JB-05 · Tidak ada denda keterlambatan.** Kalau ada UI/logika "denda", "late fee", "penalti telat bayar" → bug (bertentangan aturan owner).
- **JB-06 · Expiry booking 3 jam.** Booking publik belum bayar hangus setelah 3 jam (BookingSweep). Cek timer/countdown & apakah sweep benar mengubah status.
- **JB-07 · Booking pesaing.** Saat satu pembayaran di-approve, booking pesaing yang belum bayar dibatalkan; pesaing yang sudah transfer perlu jalur refund "kalah cepat". Cek race condition 2 orang booking kamar sama.
- **JB-08 · AI berbayar = manual button only, OWNER/ADMIN saja.** AI hanya bikin draft/rekomendasi; manusia approve. Kalau ada AI auto-jalan, atau tombol AI muncul untuk STAFF/TENANT → bug. Setiap aksi AI wajib `AuditLog` `meta.ai`.
- **JB-09 · Trial Balance WAJIB seimbang.** Setiap `JournalEntry`: Σdebit = Σkredit (sampai rupiah). `GET /api/accounting/trial-balance` → `isBalanced: true`. Kalau tidak balance → bug posting BLOCKER.
- **JB-10 · Deposit = liability (akun 2000).** Deposit masuk kas tapi kredit ke 2000 (liability), BUKAN revenue. Cashflow tidak boleh menghitung deposit sebagai pendapatan/operating-in.
- **JB-11 · Unearned revenue PSAK 72 (akun 2200).** Sewa >1 bulan (6/12 bln) ditangguhkan ke 2200 lalu diakui straight-line per bulan. Invoice & AR tetap penuh di muka; hanya pengakuan pendapatan dibagi. Cek jangan double-count.
- **JB-12 · Idempotency.** Klik tombol submit 2× cepat (bayar, approve, buat tiket, seed) tidak boleh bikin data ganda / jurnal dobel. Uji ini.
- **JB-13 · Pembulatan Rupiah.** Semua nilai rupiah harus bulat (helper `money.helper.ts`). Cari angka desimal aneh, `Rp1.234,5`, atau floating error.
- **JB-14 · Guard role / akses lintas-role.** Coba akses URL admin sambil login sebagai TENANT (atau ubah role di token). Harus ditolak (redirect/403), bukan tampil. Cek endpoint API juga, bukan cuma UI (UI sembunyi tapi API terbuka = bug keamanan).
- **JB-15 · Notifikasi in-app, bukan SMS/email eksternal.** Menuju PWA push. Kalau ada klaim kirim SMS → cek.
- **JB-16 · Lokasi benar:** Jl. Hikmah V No. 48, Surabaya Barat (Pakuwon/PTC) — BUKAN Ngagel. Cek teks di landing/footer.
- **JB-17 · Data tanggal & timezone.** Cari "Invalid Date", tanggal masa depan yang tak masuk akal, atau salah offset (WIB). Progress bar masa sewa "100% terlewati" untuk stay aktif = curiga.
- **JB-18 · Angka kosong/null.** "Rp NaN", "undefined", "null", "0" yang seharusnya ada isinya, chart width/height = -1 (render tanpa data).
- **JB-19 · Kebocoran data.** Respons API tidak boleh mengandung `passwordHash`, token orang lain, atau data tenant lain. Cek payload Network.
- **JB-20 · State setelah aksi.** Setelah bayar/renew/checkout, apakah UI refresh & status berubah benar? Atau perlu reload manual (stale state)?

---

## 7. RUBRIK SEVERITY

| Severity | Definisi | Contoh |
|----------|----------|--------|
| **BLOCKER** | Aplikasi/flow inti tak bisa dipakai, ATAU salah uang, ATAU lubang keamanan | TB tidak balance; tenant bisa lihat data tenant lain; halaman crash; tsc error |
| **HIGH** | Fitur penting rusak / bikin user stuck / data salah non-uang | Tombol Batal tak menutup modal; submit form diam tanpa feedback; halaman kosong |
| **MEDIUM** | Mengganggu tapi ada jalan lain; console error non-fatal; a11y penting | Chart -1; missing autocomplete; loading tanpa timeout |
| **LOW** | Kosmetik / minor | Tooltip kurang; spacing; teks kurang jelas |
| **INFO** | Bukan bug, catatan/observasi/saran peningkatan | Ide fitur; utang teknis kecil |

---

## 8. DAFTAR CHECKLIST (kerjakan urut, atau sesuai prioritas)

| # | File | Area | Role | Prioritas |
|---|------|------|------|-----------|
| 01 | `CHECKLIST_01_publik_landing.md` | Landing + FAQ + Ulasan publik | PUBLIC | Sedang |
| 02 | `CHECKLIST_02_publik_katalog_kamar.md` | Katalog + detail kamar | PUBLIC | Sedang |
| 03 | `CHECKLIST_03_publik_booking.md` | Booking tamu (DP/KTP/expiry) | PUBLIC | **Tinggi** |
| 04 | `CHECKLIST_04_auth.md` | Login/Forgot/Reset + guard role | Semua | **Tinggi** |
| 05 | `CHECKLIST_05_tenant_mystay.md` | Dashboard penghuni | TENANT | **Tinggi** |
| 06 | `CHECKLIST_06_tenant_invoice_bayar.md` | Invoice + bayar tenant | TENANT | **Tinggi** |
| 07 | `CHECKLIST_07_tenant_tiket.md` | Lapor masalah + review/tip staf | TENANT | Sedang |
| 08 | `CHECKLIST_08_tenant_info.md` | Pengumuman + Panduan + WiFi | TENANT | Sedang |
| 09 | `CHECKLIST_09_tenant_loyalty_renew_checkout.md` | Loyalty + Renewal + Checkout | TENANT | **Tinggi** |
| 10 | `CHECKLIST_10_admin_booking_stay.md` | Approve booking + Stays + Check-in | ADMIN | **Tinggi** |
| 11 | `CHECKLIST_11_admin_renew_checkout_meter.md` | Renew + Checkout + Meter | ADMIN | **Tinggi** |
| 12 | `CHECKLIST_12_keuangan_invoice_payment.md` | Invoice + verifikasi bayar (GATE M04) | ADMIN | **Tinggi** |
| 13 | `CHECKLIST_13_keuangan_akuntansi.md` | Akuntansi + Aset + Biaya + Laporan (GATE M04) | ADMIN/OWNER | **Tinggi** |
| 14 | `CHECKLIST_14_ops_tiket_survey.md` | Tiket admin/staff + AC + Survei | ADMIN/STAFF | Sedang |
| 15 | `CHECKLIST_15_ops_staff_routines.md` | Rutinitas + KPI + laporan lapangan | ADMIN/STAFF | Sedang |
| 16 | `CHECKLIST_16_ops_inventory_layanan.md` | Inventaris + WiFi-sales + layanan + loyalty admin | ADMIN/STAFF | Sedang |
| 17 | `CHECKLIST_17_owner_dashboard_ai.md` | Dashboard owner/admin + AI + notif + reminder | OWNER/ADMIN | **Tinggi** |
| 18 | `CHECKLIST_18_admin_master_settings.md` | Users + Tenants + Rooms + Announcements + Settings | ADMIN/OWNER | Sedang |
| 19 | `CHECKLIST_19_lintas_pwa_a11y.md` | PWA + aksesibilitas + konsistensi + responsive + 404 | Semua | Sedang |

---

## 9. PROGRES GLOBAL (isi saat checklist selesai)

| # | Status | Auditor | Tgl | #Temuan (B/H/M/L) |
|---|--------|---------|-----|-------------------|
| 01 | ✅ Selesai + REVISI (kode+API+live+build+error-state; responsive ke C19) | Fable + Reasonix | 2026-07-02 | 0/1/2/4 |
| 02 | ✅ Selesai + REVISI (kode+API+live+build; responsive ke C19) | Fable + Reasonix | 2026-07-02 | 0/0/2/3 |
| 03 | ✅ Selesai (kode+API+live; submit nyata & responsive ditunda) | Fable | 2026-07-02 | 0/0/0/3 |
| 04 | ✅ Selesai (kode+API+live; JB-14 kuat) | Fable | 2026-07-02 | 0/0/0/3 |
| 05 | 🟨 Sebagian (kode ✅ + live loop bug; occupied-view pending) | Fable | 2026-07-02 | 0/1/0/0 |
| 06 | ✅ Selesai (kode+API+live; submit flow via kode) | Fable | 2026-07-02 | 0/0/0/2 |
| 07 | ⬜ Belum | | | |
| 08 | ⬜ Belum | | | |
| 09 | ⬜ Belum | | | |
| 10 | ⬜ Belum | | | |
| 11 | ⬜ Belum | | | |
| 12 | ⬜ Belum | | | |
| 13 | ⬜ Belum | | | |
| 14 | ⬜ Belum | | | |
| 15 | ⬜ Belum | | | |
| 16 | ⬜ Belum | | | |
| 17 | ⬜ Belum | | | |
| 18 | ⬜ Belum | | | |
| 19 | ⬜ Belum | | | |

> Ganti ⬜ Belum → 🟨 Proses → ✅ Selesai. Isi jumlah temuan per severity, mis. `2/1/3/0`.
