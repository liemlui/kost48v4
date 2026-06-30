# AUDIT UI/UX VISUAL — Playwright + Inspeksi Visual Claude (2026-06-30)

> Dokumen kerja (prefix `_`). Checklist eksekusi resmi → `docs/M10_CHECKLIST_CHANGELOG.md` **Fase X**.
> Metode BARU: bukan smoke-test teks. Playwright memotret seluruh app, lalu tiap layar **diinspeksi visual** (Claude benar-benar melihat gambar) → temuan ber-bukti.

## Metodologi
1. **Environment:** backend `node dist/main.js` (3000, non-watch agar stabil) + Vite dev (5173) + DB UAT 5433 `kost48_v3_pro` (data testing; prod 5432 tidak disentuh).
2. **Data:** re-seed event-path (`seed:dev:reset` → `seed:dev:api`, jalur HTTP sesuai mandat owner). Diperbaiki 2 stale di seeder agar cocok DTO terkini: hapus `occupantCount`, ganti `bookingSource:'ONLINE'`→`'WEBSITE'`. Hasil: 13 kamar, 13 tenant, 15 invoice (lunas/DP/nunggak), 25 tiket, meter (ada yg lewat jatah 30kWh).
3. **Capture:** `frontend/e2e/visual-capture.spec.ts` — capture-only, **132 screenshot** = 58 rute × 5 role × 2 viewport (desktop 1280×900 + mobile 390×844) → `frontend/screenshots-ui/visual/<role>/<viewport>/<NN-slug>.png`. 0 gagal render.
4. **Inspeksi:** tiap screenshot dibaca; temuan kritis diverifikasi ulang via API agar bukan false-positive.

**Severity:** 🔴 Kritis · 🟠 Mayor · 🟡 Minor · ♿ A11y · ℹ️ Konteks (bukan bug)

## Cakupan inspeksi (jujur)
- ✅ **Diinspeksi penuh:** PUBLIC desktop (8/8); TENANT mobile inti (01–07); STAFF dashboard; ADMIN dashboard; OWNER dashboard/stays/invoices/reports.
- ⏳ **Belum diinspeksi 1-per-1 (≈110 shot):** TENANT desktop, STAFF mobile, ADMIN halaman lain, OWNER 26 halaman lain, PUBLIC mobile, + axe-core authenticated. Screenshot SUDAH ada; tinggal dibaca. → task **X-10**.

---

## TEMUAN

### 🔴 X-01 — Tenant melihat tiket internal `EVICT_OVERSTAY` (kebocoran peran) — **DIKONFIRMASI**
- **Bukti:** `tenant/mobile/03-tickets.png` — kartu "Tenant overstay - A" + badge "Evict Overstay" + deskripsi instruksi staf ("hubungi/temui tenant, pastikan proses checkout…").
- **Verifikasi API:** `GET /api/tickets/my` sebagai `maya.tenant@kost48.test` mengembalikan 2 tiket termasuk `[EVICT_OVERSTAY] Tenant overstay - A`.
- **Akar:** query tiket portal tenant memuat tiket yang `tenantId`-nya = tenant TANPA memfilter kategori internal/auto-ops. Tiket overstay/eviksi dibuat sistem (auto-ops) dengan `tenantId` tenant ybs.
- **Dampak:** privasi & kepercayaan — tenant melihat rencana eviksi + catatan operasional internal.

### 🔴 X-02 — Katalog publik KOSONG → detail & booking error (risiko go-live) — **DIKONFIRMASI**
- **Bukti:** `public/desktop/01-landing.png` (counter "0 kamar tersedia", "Belum ada kamar tersedia"); `03-room-detail.png` ("Gagal memuat detail kamar publik."); `04-booking-form.png` ("Gagal memuat detail kamar.").
- **Verifikasi:** `GET /api/public/rooms` = 0 item. Kode `marketing-public-rooms.service.ts`: `buildPublicRoomWhere` SUDAH mengizinkan OCCUPIED tampil → penyebab bukan "semua terisi", melainkan `getRoomIdsWithFacilityGap()` menyembunyikan SEMUA kamar (gap fasilitas↔inventaris, `computeFacilityGap`).
- **Konteks penting:** penyembunyian gap = **fitur sengaja Fase U** (jangan iklankan kamar tanpa fasilitas yang dijanjikan). Jadi BUKAN bug logika. Tapi:
  - (a) data seed/onboarding normal tidak membuat `RoomItem` inventaris → SEMUA kamar gap → katalog & semua detail kamar kosong/error. **Saat go-live, bila owner belum rekonsiliasi inventaris, calon tenant lihat katalog kosong / error.**
  - (b) detail & booking kamar tak-tersedia menampilkan **alert merah mentah**, bukan empty-state ramah ("kamar penuh, lihat lainnya / hubungi WA").
  - (c) tidak terlihat **peringatan admin** "katalog publik kamu kosong karena N kamar tersembunyi (gap)".

### 🟠 X-03 — Wizard katalog: judul langkah kontras buruk (♿) 
- **Bukti:** `public/desktop/02-katalog.png` — "LANGKAH 1 DARI 4 / Pilih kamar mandi…": judul utama hampir tak terbaca (teks gelap di latar navy gelap). Subjudul OK.
- **Dampak:** WCAG contrast gagal; langkah pertama wizard (titik konversi) sulit dibaca.

### 🟠 X-04 — Landing: blok navy gelap kosong besar
- **Bukti:** `public/desktop/01-landing.png` — section full-width ~1000px berwarna navy pekat TANPA konten, di antara seksi ketersediaan & fasilitas. Mengesankan background-image/section gagal render. Sangat menonjol di halaman pertama calon tenant.

### 🟠 X-05 — Owner & Admin dashboard: "Network Error" + toast "tidak punya akses" (perlu repro manual)
- **Bukti:** `owner/desktop/01-dashboard.png` ("Dashboard gagal dimuat … Network Error" + 2× toast "Anda tidak memiliki akses ke halaman ini."); `admin/desktop/01-admin-dashboard.png` (2× toast sama, konten tetap muat).
- **Verifikasi:** `GET /api/admin/dashboard/aggregate` (OWNER,ADMIN) **BEKERJA saat retest** (mengembalikan rooms/stays/invoices/tickets/…). Owner `reports`/`stays`/`invoices` juga normal.
- **Kesimpulan sementara:** kemungkinan **race hidrasi auth** saat navigasi otomatis Playwright (token via `addInitScript`) → toast guard + 1 fetch gagal sesaat. **Belum tentu bug produk.** WAJIB repro manual di browser nyata sebelum diperbaiki. Bila tak reproduksi → tutup sebagai artefak capture.

### 🟡 X-06 — Tenant: `/portal/loyalty` & `/portal/bookings` me-render halaman STAY
- **Bukti:** `tenant/mobile/05-loyalty.png` & `07-bookings.png` identik dengan `01-stay.png`.
- **Dugaan:** loyalitas toggled-OFF (OperationalSetting) + route fallback ke stay. Idealnya tab disembunyikan/diberi halaman sendiri, bukan diam-diam ke stay.

### 🟡 X-07 — Tenant stay (mobile): chip quick-nav "Pengumuman" terpotong di 390px
- **Bukti:** `tenant/mobile/01-stay.png` — label chip ke-4 "Pengumu…" terpotong.

### 🟡 X-08 — Nav publik tidak konsisten antar halaman
- **Bukti:** menu berbeda di `01-landing` vs `02-katalog` vs `05-panduan` vs `06-reviews` (item & urutan beda).

### 🟡 X-09 — Owner invoices: kartu ringkasan "0" saat loading (bukan skeleton)
- **Bukti:** `owner/desktop/04-invoices.png` — Tagihan/Overdue/Draft/Lunas = 0 sementara daftar masih spinner. Retest: data ada (15 invoice). Kemungkinan capture-timing; tetap, idealnya skeleton, bukan "0" menyesatkan.

### ℹ️ Konteks data (BUKAN bug, agar tak salah baca)
- Okupansi tampil **4/13**: 9 stay seed ber-`plannedCheckOutDate` lampau di-force-checkout auto-ops sebagai overstay → 4 stay aktif tersisa. Ini efek tanggal data seed, bukan bug app.
- Reviews/ulasan kosong: survei tidak ter-seed (rate-limit login saat seeding). Empty-state-nya sendiri bagus.
- Bottom-nav tenant tampak "di tengah" halaman = artefak full-page screenshot pada elemen `position:fixed`. Bukan bug.

---

## YANG SUDAH BAGUS (jangan diutak-atik tanpa alasan)
- Login & forgot-password publik: split-screen, foto, toggle role — polished.
- Panduan/FAQ publik + Manual tenant: rapi, badge kategori, accordion, CTA WA.
- Empty-state reviews & announcements: jelas + ajakan tindakan.
- Tenant stay & invoices (mobile): kaya — donut status, timeline riwayat sewa, dana titipan HELD, kartu tagihan + tombol bayar.
- Staff dashboard: KPI, papan kerja, prioritas, daftar tugas berfilter.
- Owner "Laporan Bisnis" & "Masa Sewa & Penghuni": dashboard finansial kaya (chart, matriks rasio, sinyal AI) — kuat.

---

## Cara reproduksi (untuk eksekutor)
```powershell
# 1) Backend stabil (non-watch) — dari backend/
Set-Location "...\final_bundle\backend"; npm.cmd run build; if ($?) { node dist/main.js }   # biarkan jalan
# 2) Frontend dev — dari frontend/
Set-Location "...\final_bundle\frontend"; npm.cmd run dev   # port 5173
# 3) (opsional) re-seed data — backend OFF dulu untuk reset:
#    node scripts/seed-dev-reset.js ; (START backend) ; node scripts/seed-dev-via-api.js
# 4) Capture ulang — dari frontend/
$env:VITE_PORT='5173'; npx playwright test e2e/visual-capture.spec.ts --workers=1 --reporter=list
# Screenshot → frontend/screenshots-ui/visual/<role>/<viewport>/
```
Kredensial: owner@kost48.com/Owner#2026 · admin@kost48.com/admin123 · staff@kost48.com/staff123 · maya.tenant@kost48.test/Tenant#2026
