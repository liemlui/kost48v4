# SPEC FASE X — AUDIT UI/UX VISUAL (instruksi eksekutor detail)

> **Peran file ini:** instruksi LENGKAP + STATUS akurat Fase X untuk AI/eksekutor "lemah" (kode before/after, file:line terverifikasi, langkah anti-salah). Ringkasan tabel ada di `docs/M10_CHECKLIST_CHANGELOG.md`. **Temuan + metodologi + bukti sudah DIGABUNG ke file ini** (dokumen kerja lama `_AUDIT_UIUX_VISUAL`, `_REVIEW_PEKERJAAN_AI_LEMAH`, `_FASE_X_SISA_DIKERJAKAN` sudah dirangkas ke sini & dihapus 2026-07-01). Screenshot bukti: `frontend/screenshots-ui/visual/<role>/<viewport>/<NN-slug>.png` (132 shot).
>
> **METODOLOGI (ringkas):** capture-only Playwright (`e2e/visual-capture.spec.ts`) memotret 132 layar (5 role × 2 viewport) → tiap layar diinspeksi visual → temuan kritis diverifikasi API. **PELAJARAN:** capture WAJIB terhadap backend NON-WATCH (`node dist/main.js`) — `nest --watch` sempat crash saat capture owner → banyak "error" owner = ARTEFAK (users/wifi-sales/reminders/settings/finance-assets sembuh setelah re-capture stabil).
>
> **TELADAN (sudah bagus — JANGAN diubah tanpa alasan):** tenant profile (NIK masked UU PDP + OCR on-device), login/forgot (split-screen), panduan/manual, payment-review/tickets/meter/check-in admin, reports/reminders/loss-refunds/invoice-payments owner, staff report/warehouse, semua empty-state (reviews/announcements/wifi). Data dummy BUKAN bug: okupansi 4/13 (auto-checkout overstay seed), reviews kosong (survei tak ter-seed), kamar dummy `Z1` id 14 (boleh hapus).

## CARA PAKAI (baca dulu, jangan dilewati)
1. Untuk SETIAP task, buka file `.png` bukti agar paham masalah secara visual.
2. Navigasi kode: `docs/CODEMAP.md` dulu → lalu Grep simbol. JANGAN tebak path.
3. Ubah **sekecil mungkin**; jangan refactor yang tak diminta.
4. Setelah tiap task: build HARUS lulus → centang `[ ]→[x]` di M10 → 1 baris di `docs/M11_CHANGELOG.md`.
5. Urutan: 🔴 (X-01, X-02) → 🟠 (X-03, X-04, X-11) → 🟡 (sisanya). X-16 a11y kapan saja.

**Build/verifikasi (PowerShell 1 baris; JANGAN `&&`):**
```powershell
Set-Location "...\final_bundle\backend"; npx tsc --noEmit
Set-Location "...\final_bundle\frontend"; npm.cmd run build
```
**Jalankan app + re-capture (backend WAJIB non-watch agar stabil):**
```powershell
Set-Location "...\backend"; npm.cmd run build; if ($?) { node dist/main.js }   # biarkan jalan (terminal lain)
Set-Location "...\frontend"; npm.cmd run dev                                    # port 5173
$env:VITE_PORT='5173'; npx playwright test e2e/visual-capture.spec.ts --workers=1 --reporter=list
```
Kredensial: `owner@kost48.com/Owner#2026` · `admin@kost48.com/admin123` · `staff@kost48.com/staff123` · `maya.tenant@kost48.test/Tenant#2026`.

## STATUS (per 2026-07-01 — setelah review AI + verifikasi Claude)

> Digabung dari review eksekutor (`_REVIEW_PEKERJAAN_AI_LEMAH`) + eksekusi (`_FASE_X_SISA_DIKERJAKAN`) + verifikasi runtime Claude. Ini **sumber status Fase X yang akurat**.

**✅ Selesai (terverifikasi):**
- **X-01** — **KRITIS: sempat diklaim selesai tapi BELUM.** Enum `TicketCategory` TIDAK punya `EVICT_OVERSTAY`; AutoOps membuat tiket kategori RAW-STRING `'EVICT_OVERSTAY'` (stay-sweep) & `'AC_CLEANING'` (maintenance-sweep) — dua ini justru yang bocor & TIDAK ada di hidden list. **FIX Claude 2026-07-01:** tambah `'EVICT_OVERSTAY'`+`'AC_CLEANING'` ke `TENANT_HIDDEN_TICKET_CATEGORIES` (`app.enums.ts`). Guard sudah ada di 3 jalur: `findMine` (list, tickets.service.ts:205), `findOne` (detail, :368), `canAccessImage` (image, :417). **Verifikasi runtime:** `GET /tickets/my` maya = 1 tiket (miliknya), EVICT_OVERSTAY HILANG. ✅
- **X-03** — `.gpw-question-text color:#fff` (verified di CSS).
- **X-02c** — banner admin katalog kosong (`admin-dashboard.service.ts` `facilityGaps` + `DashboardAdmin.tsx`).
- **X-04** — blok navy landing (`.gx-trust-section` render langsung tanpa reveal, `PublicGuestDashboardPage.tsx`).
- **X-08** — nav publik disatukan (`publicGuestShared.tsx` `NAV_LINKS`+`PUBLIC_EXTRA_LINKS`).
- **X-16 (publik)** — axe `/` & `/rooms` = 2 passed (kontras FAQ/footer + playwright port fix).
- **X-06** — dikonfirmasi **INTENDED** (redirect stage/feature; bukan bug).

**✅ Selesai (FIX Claude 2026-07-01, terverifikasi visual):**
- **X-11** — akar di FE (bukan backend): `SimpleCrudPage.tsx` paginasi server `limit:PAGE_SIZE(5)`, filter+count client-side atas 1 halaman. FIX: untuk resource ber-chip-filter, fetch dataset penuh (`limit:500`, `isFilterableResource`) → count+filter+tabel atas SELURUH data; pagination natural jadi 1 halaman (master-data kecil). Verifikasi: admin/tenants chip "Semua/Aktif/Portal Aktif = 13" (bukan 5). File: `SimpleCrudPage.tsx` (query limit + `isFilterableResource`). *(Catatan: batas 500 selaras reference-query; bila suatu resource >500 baris di masa depan, perlu facet-count backend.)*
- **X-15** — akar: `overflow-wrap: anywhere` di `.responsive-data-table td` (`09-finance.css:1274-1278`) memaksa pecah mid-token. FIX: ganti ke `overflow-wrap: break-word` + selector opsional `.num-cell`/`[data-col-kind]` `white-space:nowrap`. Berlaku ke tabel resource admin/owner + tabel invoice tenant (keduanya pakai `responsive-data-table`). Verifikasi: "Rp 45.000" & email utuh. *(Sisa minor: nomor invoice ber-hyphen "MTR-…-1-27" masih bisa wrap di tanda hubung — titik pecah wajar; beri `.num-cell` bila mau nowrap penuh.)*

**✅ Selesai minor (FIX/verifikasi Claude 2026-07-01):**
- **X-07** — chip nav tenant terpotong di 390px. FIX: `10-misc.css` mobile `.tenant-workspace-tab{min-width:0}` + `.tenant-workspace-tab strong{white-space:normal;overflow-wrap:break-word;min-width:0}` → label wrap (bukan "Pengumu…"). Verifikasi visual: "Pengumuman/Lapor Masalah/Panduan Kos Saya" penuh.
- **X-09** — SUDAH beres di kode: `InvoicesPage.tsx:517-531` `{isLoading ? <StatCardSkeleton×4/> : <StatusStrip/>}` (skeleton, bukan "0"). "0" di screenshot dulu = artefak capture backend-crash.
- **X-13** — BUKAN defect: `OwnerSettingsPage` pakai `<Spinner size="sm">` KONSISTEN di semua tab (Foto/Aset/FAQ). Skeleton hanya utk FAQ justru inkonsisten → dibiarkan.

**⬜ Sisa (butuh owner/fixture, bukan bug FE):** X-02d (konfirmasi owner: kamar OCCUPIED tampil di katalog?) · X-05 (owner `/dashboard` = denial EXPECTED; cek hanya ADMIN natural di `/dashboard`) · X-16 (axe halaman ber-login — perlu auth fixture). *(X-14 SELESAI: accounting-setup dipecah 5 tab.)*

**⚠️ Koreksi X-05:** OWNER buka `/dashboard` = **denial EXPECTED** (`/dashboard` allowed=[ADMIN,STAFF] `App.tsx:208-214`; owner default `/owner-dashboard`). Jadi toast owner = benar, BUKAN bug (capture memaksa owner ke `/dashboard`). Yang perlu dicek HANYA: ADMIN natural di `/dashboard` — kalau masih toast, baru bug guard.

**🔴 Gate test backend MERAH (2/218 fail — Fase V, bukan UI/UX):**
- `booking-flow.integration.test.js:400` masih set `room.status='BOOKING'` (enum dihapus V-00).
- `checkout-request-guards.test.js:145` harap pesan lama "menunggu persetujuan" (service kini "permintaan perpanjangan yang sedang aktif").
→ Update ekspektasi test agar hijau (kode app sudah benar).

---

### X-01 🔴 — Tenant TIDAK boleh melihat tiket internal/auto-ops (kebocoran peran) — **DIKONFIRMASI**

**Bukti:** `tenant/mobile/03-tickets.png` & `tenant/desktop/03-tickets.png` (kartu "Tenant overstay - A" + badge "Evict Overstay" + instruksi staf). API `GET /api/tickets/my` sebagai tenant maya mengembalikan `[EVICT_OVERSTAY] Tenant overstay - A`.

**Akar:** query tiket portal tenant memuat tiket ber-`tenantId` = tenant TANPA memfilter kategori internal. Tiket overstay/eviksi dibuat auto-ops dengan `tenantId` tenant ybs.

**Target:** `backend/src/modules/tickets/tickets.controller.ts` (`@Get('my')` baris ~64), `tickets.service.ts` (`findMine`), `backend/src/common/enums/app.enums.ts` (`TicketCategory`).

- [ ] **Step 1 — konstanta kategori tersembunyi.** Di `app.enums.ts` tambah:
  ```ts
  // Kategori tiket internal/operasional yang TIDAK boleh muncul di portal tenant.
  export const TENANT_HIDDEN_TICKET_CATEGORIES = [
    TicketCategory.EVICT_OVERSTAY, TicketCategory.CHECKOUT_INSPECTION, TicketCategory.AUDIT_INVENTARIS,
    TicketCategory.BARANG_PINDAH, TicketCategory.PEMERIKSAAN, TicketCategory.CEK_KAMAR,
    TicketCategory.STOK_HABIS, TicketCategory.CATATAN_METER, TicketCategory.BARANG_RUSAK,
    TicketCategory.ROOM_REPAIR, TicketCategory.PAYMENT_ADMIN,
  ] as const;
  ```
  (Tenant boleh lihat = tiket yang IA buat: AC/WIFI/PLUMBING/ELECTRICITY/KEBERSIHAN/PERBAIKAN/UMUM/GENERAL/OTHER/DOOR_KEY/FURNITURE/PEST/SECURITY/NOISE/EMERGENCY.)
- [ ] **Step 2 — INTI FIX.** `backend/src/modules/tickets/tickets.service.ts`, method `findMine` (baris ±198–206). Import `TENANT_HIDDEN_TICKET_CATEGORIES` dari `'../../common/enums/app.enums'`. Ubah `where`:
  **SEBELUM:**
  ```ts
  const where: Prisma.TicketWhereInput = {
    tenantId: user.tenantId ?? -1,
    ...(query.status ? { status: query.status } : {}),
  };
  ```
  **SESUDAH (tambah 1 baris):**
  ```ts
  const where: Prisma.TicketWhereInput = {
    tenantId: user.tenantId ?? -1,
    category: { notIn: [...TENANT_HIDDEN_TICKET_CATEGORIES] },
    ...(query.status ? { status: query.status } : {}),
  };
  ```
  ⚠️ JANGAN ubah `findAll` (controller baris 58–62, OWNER/ADMIN/STAFF — MEMANG boleh lihat semua). Hanya `findMine` (`GET /tickets/my`, TENANT).
- [ ] **Step 3 — cek FE.** `frontend/src/pages/portal/MyTicketsPage.tsx` harus panggil `/api/tickets/my` (bukan `/api/tickets`). Bila sudah, tak perlu ubah FE.

**Test wajib:** `GET /api/tickets/my` (maya) TIDAK memuat EVICT_OVERSTAY; TETAP memuat "AC kamar A kurang dingin" yang ia buat.
**Gate:** ✅ tiket internal tidak bocor; build lulus.

---

### X-02 🔴 — Katalog publik KOSONG saat go-live: empty/error graceful + peringatan admin

**Bukti:** `public/desktop/01-landing.png` (0 tersedia), `03-room-detail.png` & `04-booking-form.png` (alert merah). API `GET /api/public/rooms` = 0.

**Akar & KONTEKS (WAJIB):** sembunyikan kamar ber-gap fasilitas↔inventaris = **fitur SENGAJA Fase U** (`marketing-public-rooms.service.ts` `getRoomIdsWithFacilityGap`). **JANGAN ubah logika hide-gap.** Karena data normal tanpa RoomItem inventaris → SEMUA kamar gap → katalog & detail kosong/error tanpa peringatan.

**Target FE (path TERVERIFIKASI — `pages/rooms/` BUKAN `pages/public/`):**
- Katalog: `frontend/src/pages/rooms/PublicRoomsPage.tsx`.
- Detail publik: `frontend/src/pages/rooms/PublicRoomDetailPage.tsx` (error baris 298).
- Booking tamu: `frontend/src/pages/bookings/GuestBookingPage.tsx` (error baris 127).
- Backend gap (JANGAN diubah): `marketing-public-rooms.service.ts` + `backend/src/modules/rooms/room-facility-spec.ts` (`computeFacilityGap`).

- [ ] **X-02a** empty-state katalog: `/public/rooms` kosong → pesan ramah ("Semua kamar sedang penuh. Hubungi admin via WA / cek jadwal kamar akan kosong"), bukan counter "0".
- [ ] **X-02b** error graceful (file:line): ganti `<Alert variant="danger">` di `PublicRoomDetailPage.tsx:298` dan `GuestBookingPage.tsx:127` jadi empty-state + CTA. ⚠️ `RoomDetailPage.tsx:153` = INTERNAL, JANGAN diubah.
- [ ] **X-02c** (paling penting) peringatan admin: banner "⚠️ N kamar tidak tampil di katalog publik karena gap fasilitas↔inventaris" di dashboard admin/owner atau halaman kamar (pakai `computeFacilityGap`).
- [ ] **X-02d** konfirmasi owner: apakah kamar OCCUPIED memang ingin tampil di katalog publik (sudah diizinkan `buildPublicRoomWhere`)? Catat di W-00.

**Gate:** ✅ tanpa alert merah mentah di publik; ✅ admin diperingatkan; ✅ logika hide-gap Fase U tidak diubah.

---

### X-03 🟠♿ — Kontras judul langkah wizard katalog

**Bukti:** `public/desktop/02-katalog.png` (+ mobile) — judul "Pilih kamar mandi…" gelap di latar navy → nyaris tak terbaca.

**Akar (TERVERIFIKASI):** `frontend/src/components/public/GuestPreferenceWizard.tsx:338` `<h3 className="gpw-question-text">`. CSS `frontend/src/styles/11-public-pages.css`: `.gpw-wizard` (5577) set `color:#fff`, tapi `.gpw-question-text` (5629) tak set color → global `h3{color:gelap}` menang (spesifisitas).

- [ ] **Fix:** di `11-public-pages.css` rule `.gpw-question-text` (±5629) TAMBAH `color: #fff;` (biarkan `.gpw-question-sub` apa adanya).

**Gate:** ✅ judul terbaca jelas (re-capture `02-katalog`); axe tak nambah violation kontras.

---

### X-04 🟠 — Blok navy gelap kosong besar di landing

**Bukti:** `public/desktop/01-landing.png` (+ mobile) — section navy ~1000px TANPA konten antara seksi ketersediaan & fasilitas.

**Komponen (TERVERIFIKASI):** landing `/` = `RootEntry` (`frontend/src/App.tsx:177-181`) → `<PublicGuestDashboardPage />` (Grep `PublicGuestDashboardPage` untuk path).

- [ ] Cari `<section>` berlatar gelap di antara "ketersediaan" & "Fasilitas" (cocokkan visual). Grep warna `#0f172a`/`#1e293b`/`background-image`.
- [ ] Tentukan penyebab: (a) `background-image`/`<img>` 404 (cek Network) → perbaiki aset; ATAU (b) section kosong → isi/hapus.
- [ ] JANGAN menebak; konfirmasi via render nyata `http://localhost:5173/`.

**Gate:** ✅ landing tanpa blok kosong besar; build lulus.

---

### X-11 🟠 — Badge chip filter = subset 1 halaman, BUKAN total (halaman "Master data")

**Bukti (persist re-capture, NYATA):** `admin/desktop/07-tenants.png` "Semua Tenant **5**"/"Portal Aktif **5**" vs total **13**; `owner/desktop/15-expenses.png` "Semua Biaya **5**" vs **12 data**. (Tidak konsisten: `/users` benar 16/16.)

**Target:** halaman list "Master data" + endpoint count. Mulai `/tenants` (FE: Grep `Semua Tenant`/`Portal Aktif`; BE: service tenants penghitung badge). Pola sama utk `/expenses`.

- [ ] Tentukan sumber angka badge (array halaman aktif vs endpoint count). Bila dari `items.length` page → itu bug-nya.
- [ ] Perbaiki: badge dari **count total per-filter** (query `count` backend per where filter), bukan panjang halaman.
- [ ] Cek konsistensi halaman list lain.

**Gate:** ✅ "Semua X" = total data (13/12), bukan ukuran halaman (5); konsisten.

---

### X-05 🟡 — Toast "Anda tidak memiliki akses ke halaman ini." (×2) dashboard Owner/Admin — NYATA

**Update 2026-07-01 (RE-CAPTURE backend stabil):**
- ❌ "Dashboard gagal dimuat / Network Error" = **ARTEFAK** (nest-watch crash). Re-capture: HILANG → DITUTUP.
- ✅ **Toast "tidak memiliki akses" (×2) TETAP muncul** owner+admin dashboard → nyata.

**Akar (TERVERIFIKASI):** `frontend/src/App.tsx` `RequireRoles` (138–160); `useEffect` (147–152) → `getDeniedMessage` (135) + `toast(...)` saat `isDenied = user && !allowed.includes(role)`. "×2" = StrictMode double-invoke (dev).

- [ ] Repro browser nyata: login owner/admin, landing NATURAL, cek toast.
- [ ] Grep `<RequireRoles` di `App.tsx`; cari rute yang `allowed` tak memuat OWNER/ADMIN saat dashboard mount.
- [ ] Perbaiki: (a) tambah role ke `allowed` bila memang boleh; (b) jangan toast saat tujuan redirect = `getDefaultRoute(user)` sendiri.
- [ ] Cek: capture menavigasi owner ke `/dashboard`; pastikan `getDefaultRoute(OWNER)` = `/owner-dashboard` (owner tak pernah ke `/dashboard`).

**Gate:** ✅ owner & admin landing natural TANPA toast akses.

---

### X-06 🟡 — Tenant `/portal/loyalty` & `/portal/bookings` render halaman STAY — VERIFIKASI DULU (kemungkinan INTENDED)

**Bukti:** `tenant/mobile/05-loyalty.png` & `07-bookings.png` identik `01-stay.png`.

**INVESTIGASI KODE (JANGAN langsung perbaiki):** rute SUDAH punya halaman sendiri (`App.tsx:301` `MyBookingsPage`, `:305` `MyLoyaltyPage`). Tampil STAY karena redirect stage/feature **kemungkinan SENGAJA** (tenant `occupied` → bookings ke stay; loyalty hanya bila `loyaltyEnabled`, `navigation.ts:107`).

- [ ] Tentukan bug vs intended (cek `<Navigate>` berbasis `stage`/`loyaltyEnabled` di kedua page). Bila by-design → cukup pastikan menu tak menampilkan link mati.
- [ ] Hanya bila perlu: sembunyikan item menu yang pasti redirect utk stage tenant saat ini. JANGAN ubah logika redirect tanpa konfirmasi owner.

**Gate:** ✅ keputusan terdokumentasi; tak ada item menu → rute yang langsung redirect tanpa indikasi.

---

### X-07 🟡 — Chip quick-nav "Pengumuman" terpotong (mobile 390)

**Bukti:** `tenant/mobile/01-stay.png` — chip ke-4 "Pengumu…" terpotong (di DESKTOP penuh — jadi mobile-only).
**Target:** Grep `'Lapor Masalah'`/`'Panduan Kos Saya'` → komponen chip nav tenant. Fix: `flex-wrap` / perpendek label / `overflow-x:auto`.
**Gate:** ✅ "Pengumuman" penuh terbaca di 390px.

---

### X-08 🟡 — Nav publik tidak konsisten antar halaman

**Bukti:** menu beda di `01-landing`/`02-katalog`/`05-panduan`/`06-reviews`.
**Target:** Grep `'Masuk Portal'`/`'Katalog Kamar'`/`gx-nav` → header publik. Verifikasi apakah komponen header sama/berbeda; bila beda → satukan `PublicHeader` (item+urutan konsisten). **Konfirmasi menu final ke owner** sebelum ubah.
**Gate:** ✅ nav identik di landing/katalog/panduan/reviews.

---

### X-09 🟡 — Owner invoices: kartu ringkasan "0" saat loading (bukan skeleton)

**Bukti:** `owner/desktop/04-invoices.png` — 0/0/0/0 saat daftar masih spinner (retest: 15 invoice).
**Target:** `frontend/src/pages/invoices/InvoicesPage.tsx`. Saat query `isLoading`/`isPending` → skeleton (pola `StatCardSkeleton`, lihat `OwnerDashboardPage.tsx:300`), bukan "0". "0" hanya bila query SUKSES & data memang 0.
**Gate:** ✅ tak ada "0" menyesatkan saat loading; build lulus.

---

### X-13 🟡 — Owner `/settings` tab FAQ tampil spinner saat loading

**Bukti:** `owner/desktop/11-settings.png` (capture-timing). **Target:** Settings owner (Grep `FAQ Publik`). Skeleton, bukan spinner telanjang.
**Gate:** ✅ skeleton saat loading tab.

---

### X-14 🟡 — Owner `/finance/accounting-setup` sangat padat (≈7600px)

**Bukti:** `owner/desktop/18-accounting-setup.png` — belasan panel bertumpuk. **Target:** `AccountingSetupPage.tsx`. Pertimbangkan tab/accordion (Setup · Ledger · Aset · Periode · Saldo Awal). **Konfirmasi ke owner** (power-tool, mungkin sengaja padat).
**✅ SELESAI 2026-07-01 (owner go-ahead):** dipecah 5 tab (`Setup · Ledger · Aset · Periode · Saldo Awal`), tab tersinkron URL `?tab=`. Logika query/mutasi utuh; navigasi lintas-section pindah-tab-lalu-scroll. Build lulus.
**Gate:** ✅ keputusan terdokumentasi + dikerjakan; terbagi tab.

---

### X-15 🟡 — Teks sel tabel pecah mid-token (currency/ID/email/invoice)

**Bukti:** `tenant/desktop/02-invoices.png` "Rp 45.00⏎0" & "MTR-…-1⏎27"; `admin/desktop/07-tenants.png` email "…tes⏎t"; `owner/desktop/21-users.png` ID "16"→"1⏎6"; `15-expenses.png` ID "12"→"1⏎2".
**Target:** kolom currency/ID/email/invoice (InvoicesPage tenant, TenantsPage admin, UsersPage, ExpensesPage). Beri `white-space:nowrap` + `font-variant-numeric:tabular-nums`; `min-width` memadai atau truncate+`title` utk email.
**Gate:** ✅ angka/ID/email tak pecah mid-token (re-capture).

---

### X-16 ⬜ — a11y axe untuk halaman ber-login

**Bukti/dasar:** `frontend/e2e/a11y/axe-audit.spec.ts` saat ini hanya halaman publik (tanpa login). **Target:** perluas axe ke halaman ber-login (owner/admin/staff/tenant) memakai token-injection seperti `visual-capture.spec.ts`. Target ≤5 critical/serious per halaman.
- [ ] Jalankan `cd frontend; npm run test:a11y` (baseline publik).
- [ ] Tambah spec axe ber-login (login API → addInitScript token → analyze per rute kunci).
- [ ] Catat violation → task X-17+ bila ada.
**Gate:** ✅ axe jalan utk halaman ber-login; violation terdokumentasi.

---

### X-10 ✅ SELESAI (2026-07-01) — Inspeksi menyeluruh + RE-CAPTURE backend stabil

- [x] Inspeksi 1-per-1 semua role × 2 viewport (sampling menyeluruh; empty-state divalidasi).
- [x] Re-capture OWNER+ADMIN backend non-watch → pisahkan artefak vs bug (X-05).
- **PELAJARAN:** capture pertama saat `nest --watch` CRASH (giliran owner) → banyak "error" owner = ARTEFAK (users/wifi-sales/reminders/settings/finance-assets sembuh setelah re-capture). → capture WAJIB backend non-watch.

---

### ℹ️ Catatan data (BUKAN bug — jangan dikejar)
- Okupansi **4/13**: 9 stay seed `plannedCheckOutDate` lampau di-force-checkout auto-ops (overstay). Efek tanggal data seed.
- Reviews kosong: survei tak ter-seed (rate-limit login). Empty-state-nya bagus.
- Kamar dummy `Z1` (room id 14, AVAILABLE) dibuat saat audit untuk uji katalog — boleh dihapus (tak ada `@Delete /rooms`; via DB UAT bila perlu).
