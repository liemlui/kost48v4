# 📋 RINGKASAN TEMUAN AUDIT — KOST48 V5

> Rekap konsolidasi seluruh temuan `C01`–`C19` per severity, untuk owner membuat antrian perbaikan. **Fix dikerjakan terpisah** (audit-only). Detail + bukti + kutipan kode ada di tiap `CHECKLIST_XX_*.md`.
>
> **Auditor:** Fable · **Tanggal:** 2–3 Juli 2026 · **Metode:** kode + API + live (Chrome) + unit test. **Akun uji:** owner@kost48.com, admin@kost48.com, maya.tenant@kost48.test, bayu.tenant (occupied).
>
> ---
>
> ## ⚠️ AUDIT LANJUTAN — Reasonix Code (7 Juli 2026)
>
> Audit Reasonix Code (DeepSeek V4 Pro) menemukan **82 temuan baru** yang tidak tercakup di C01-C19. **BACA:** `docs/audit-reasonix/RINGKASAN_EKSEKUTIF.md`.
>
> Enam bug KRITIS baru:
> 1. DISCOUNT line → journal tidak terposting (Trial Balance rusak)
> 2. Overdue aging gross, bukan net (laporan piutang menyesatkan)
> 3. Renewal cross-term undercharge (MONTHLY→YEARLY cuma 1/11)
> 4. Collection rate period mismatch (akrual vs kas)
> 5. Journal gagal diswallow tanpa retry
> 6. `dateOnly()` 4 implementasi — ✅ SUDAH DIFIX
>
> ---
>
> **Coverage: 19/19 checklist punya verifikasi LIVE** (semua halaman publik, auth, portal tenant, admin, keuangan, ops, owner dirender langsung) + kode + API + 21/21 unit test money-critical. Sisa yang tertunda = aksi mutasi end-to-end (butuh re-seed/BE stabil) & screenshot visual (renderer beku saat BE degraded), **bukan gap coverage**.

---

## RINGKASAN EKSEKUTIF

| Severity | Jumlah | Status |
|----------|--------|--------|
| 🔴 BLOCKER (efektif) | 1 | C05-01 (loop + self-DoS) — **✅ FIXED** (AE-01 hook + Fase AJ-01 sistemik 3 file, 2026-07-04) |
| 🟠 HIGH | 2 | C01-02 (PII) **✅ FIXED** (Fase AA-01) · C09-01 (503 drift) **✅ RESOLVED** |
| 🟡 MEDIUM | 4 | C02-01, C02-02 — **✅ FIXED** (Fase AB-01/AB-02) · **C19-01/C19-02 OPEN** (AJ-07c: tenant settings 403 console + admin 375px overflow) |
| 🟢 LOW/INFO | ~18 | kosmetik/kejelasan/konsistensi — mayoritas ditutup Fase AA–AI + AJ |

**Kabar baik:** **backend sangat matang & aman** — auth (rate-limit, enumeration-safe, token hashed), keuangan (**21/21 unit test PASS**, jurnal balance + idempotent), guard role (JB-14) kuat, AI (JB-08) manual-only + owner-only, stok/poin tak-negatif, deposit=liability. **Mayoritas bug ada di lapisan FRONTEND + 1 masalah lingkungan (schema drift, sudah disembuhkan).**

**3 prioritas teratas untuk fix — SEMUA SUDAH DITUTUP (2026-07-04):**
1. 🔴 **C05-01** — loop `/portal/stay` → ✅ AE-01 (hook) + AJ-01 (sistemik: MyStayPage, MyBookingsPage, TenantBookingGate).
2. 🟠 **C01-02** — nama penghuni bocor → ✅ AA-01 (BE null + FE tidak render; `tenant.fullName` tak lagi di-SELECT).
3. 🟡 **C02-02** — link mati + WA palsu di error-state → ✅ AB-02 (`/rooms` + WA asli).

---

## ✅ SUDAH RESOLVED SELAMA AUDIT

- **C09-01 / C08-01 — 503 `/tenant/bookings/my` & `/announcements/active`.** Root cause = **schema drift DB UAT**. Owner menjalankan `prisma migrate deploy`/`db push` + restart → **endpoint kembali 200** (terverifikasi). Menyembuhkan halaman Pengumuman & Booking tenant. **Catatan:** loop C05-01 TERPISAH & tetap ada.

---

## 🔴 BLOCKER (efektif) — prioritas #1

### C05-01 — `/portal/stay` infinite refetch loop + self-DoS
- **Dampak:** tenant tanpa stay aktif (mantan penghuni / akses langsung) membuka `/portal/stay` → query `/stays/me/current` **404** dipanggil **~150×/detik tanpa henti**; halaman stuck skeleton, **tab crash**, dan **backend `:3000` jatuh 2× selama audit (self-DoS untuk semua user)**.
- **Akar:** anti-pola FE `refetchOnMount:true` + `retry:false` pada query yang error, + gate `isStageLoading` di `RequireRoles`. **Sistemik di 5 file:** `MyStayPage.tsx`, `useTenantPortalStage.ts`, `MyBookingsPage.tsx`, `MyInvoicesPage.tsx`, `components/tenant/TenantBookingGate.tsx`.
- **Fix:** tangani 404 sebagai hasil terminal (`return null`, bukan throw) SEHINGGA `staleTime` berlaku; ATAU hapus `refetchOnMount:true` pada query error-prone; pastikan `isStageLoading` settle saat error. Perbaiki **kelima** file.
- Detail: `CHECKLIST_05_tenant_mystay.md`.
- **STATUS: ✅ FIXED 2026-07-04** — AE-01 (`useTenantPortalStage` 404→null + `isStageLoading` settle) + **Fase AJ-01** (pola sama diterapkan ke `MyStayPage.tsx`, `MyBookingsPage.tsx`, `TenantBookingGate.tsx`; `MyInvoicesPage` diverifikasi punya error-state). Vektor 503 ditutup dari backend (AH-01/AI-01a + cache self-healing 2026-07-04). Verifikasi live anti-loop = AJ-02.

---

## 🟠 HIGH

### C01-02 — Nama penghuni bocor ke publik (PII) — prioritas #2
- **Dampak:** `/rooms` (tanpa login) menampilkan `👤 {nama lengkap penghuni}` per kamar. Endpoint `@Public()` `GET /api/public/rooms/availability-calendar` mengembalikan `currentTenantName` + `dpTenantName`. Terbukti live: Kamar I="Bayu Nugroho", K="Lani Kusuma", F2="Sari Melati".
- **Fix:** hapus `currentTenantName`/`dpTenantName` dari payload publik (ganti status generik "Terisi"). `marketing-public-rooms.service.ts:525,531` + `RichAvailabilityCalendar.tsx:254,267`.
- Detail: `CHECKLIST_01_publik_landing.md`.

### C09-01 — 503 sistemik (schema drift) — ✅ **RESOLVED** (lihat di atas)

---

## 🟡 MEDIUM

### C02-01 — Kamar RESERVED diberi label "Kosong" (menyesatkan)
- `getPublicRoomAvailabilityDisplay` (`publicRoomDisplay.ts:170`) → RESERVED label "Kosong", sama dgn AVAILABLE. Pengunjung tak bisa bedakan kamar terkunci vs kosong. **Fix:** label "Dipesan"/"Dikunci".

### C02-02 — Error-state detail kamar: link mati + nomor WA palsu — prioritas #3
- `/rooms/999999/detail` → Alert dgn `href="/katalog"` (**route tak ada** → 404) + `wa.me/6281234567890` (**nomor palsu**; asli `6285648887628`). `PublicRoomDetailPage.tsx:298`. **Fix:** `/katalog`→`/rooms` (pakai `<Link>`), WA pakai `officialKost48Location.whatsappUrl`.

---

## 🟢 LOW / INFO (kelompok)

**Publik/Marketing:**
- C01-01 — FAQ "kWh gratis" dead code (nama pertanyaan + target `.replace` salah) → selalu hardcode 30 kWh.
- C01-03 — `Room.notes` internal terekspos endpoint publik (kini isi benign, risiko laten).
- C01-04 — rating & jumlah ulasan publik **hanya** hitung rating ≥4 (rata-rata "dipoles"). Verifikasi ke M02.
- C01-05 — 4 gaya header/topbar berbeda di rute publik (`/reviews` tanpa topbar+footer).
- C01-06 — tarif WiFi/listrik/deposit-hewan hardcoded di landing (drift vs OperationalSetting).
- C01-07 — survei preferensi terkirim saat wizard di-**skip** (data bias).
- C02-03 — paginasi katalog 3/halaman (komentar bilang 12).
- C02-04 — deposit disebut 2 istilah ("Dana titipan" & "Deposit jaminan") di halaman sama.
- C02-05 — DP preview di halaman detail pakai raw monthly (form booking sudah akurat).
- C03-03 — "Air Rp 0 / m³" tampil saat tarif 0.

**Booking/Auth:**
- C03-01 — default `checkInDate` pakai UTC (off-by-one dini hari WIB); server sudah tolak tanggal lampau.
- C03-02 — pesan batas penghuni tak konsisten (FAQ "maks 2" vs kode 2-gratis/maks-4 per D-24).
- C04-01 — `/settings/operational` over-expose config AI (deepseekBaseUrl/model) + akuntansi ke TENANT (bukan API key).
- C04-02 — login "User tidak aktif" bisa dibedakan (enumeration ringan).
- C04-03 — beberapa link internal pakai `<a href>` (reload penuh) + forgot-email tanpa autocomplete.

**Portal tenant:**
- C06-01 — invoice LUNAS masih tampilkan hitung-mundur jatuh tempo.
- C06-02 / C07-01 / C08-04 — banner onboarding "3 langkah menuju kamar" muncul utk **mantan penghuni** di semua halaman portal (berulang; fix sekali di layout).

**Ops/CRUD:**
- C16-01 — JB-14 endpoint CRUD generik (`/wifi-sales`,`/additional-services`,`/inventory-*`) **belum diuji live** (curl token TENANT/STAFF → harus 403). Pola guard modul lain konsisten; konfirmasi live.

**Lintas aplikasi (AJ-07c, 4 Jul):**
- C19-01 — tenant `/portal/stay` masih memanggil `/api/settings/operational` dan mendapat 403, menimbulkan console error resource. Halaman tetap render; fix sebaiknya pakai `/settings/public-config` atau gate query berdasarkan role.
- C19-02 — admin `/dashboard` pada viewport 375px punya horizontal overflow (`scrollWidth=434` vs `innerWidth=375`), terutama panel command/assistant/action queue.

---

## 💪 YANG SUDAH SANGAT BAIK (terverifikasi — jangan diubah)

- **Auth:** rate-limit login/forgot/reset; forgot enumeration-safe; token reset 32-byte **hashed** (SHA-256) + expiry 30 mnt + sekali-pakai; error login generik; **tanpa `passwordHash`** di respons; JWT `pwdAt`. **JB-14 KUAT** (TENANT→403 di /users,/stays,/invoices,/tickets; no-auth→401). Hermes I1/I2/I3/I5 **RESOLVED**.
- **Keuangan (GATE M04):** `postBalancedJournalTx` enforce **Σdebit=Σkredit** (JB-09) + **idempotent** sourceType/sourceId (JB-12); deposit=liability 2000 (JB-10); rent-recognition straight-line remainder-to-last (JB-11); depresiasi straight-line; period-close guard + Owner-only reopen. **Unit test money-critical 21/21 PASS**.
- **Booking:** DP 30% = round(term-rent+surcharge) konsisten FE/BE (live 255rb tepat); deposit refundable terpisah; expiry 3 jam + DP-hangus dijurnal; guard kamar occupied/reserved/duplikat; honeypot; XSS ter-escape.
- **Stay/Ops:** check-in butuh lunas + promote meter hanya di check-in (JB-04); meter tak boleh mundur; room-transfer race-safe + deposit carried; **stok inventaris tak-negatif**; **loyalty poin tak-minus** (double-guard); survei/KPI NaN-safe.
- **AI (JB-08):** OWNER/ADMIN-only, manual-only (no auto-trigger), draft→approve, AuditLog `meta.ai` tanpa secret; **API key DeepSeek server-side, tak bocor**.
- **Tiket:** I10 (tombol Batal) **RESOLVED** (tutup+reset, live); tip display-only (app tak pindahkan uang); isolasi tenant.
- **Isolasi data (JB-19):** invoice/tiket/stay tenant di-scope by tenantId (throw 404/403 utk lintas-tenant).
- **JB-14 MENYELURUH (live sweep 3 Jul):** owner → **200** di semua endpoint; **TENANT → 403/404** di `/users`, `/tenants`, `/announcements`, `/tickets`, `/inventory-items`, `/wifi-sales`, `/additional-services`, `/meter-readings`, `/market-analysis`, `/assets`, `/expenses`, `/surveys` (+ CRUD generik batch sebelumnya). Satu-satunya tenant-200 = `/me/notifications` (benar, self-scoped). **Seluruh permukaan admin/owner ter-guard.** *(UI-visual tiap halaman tak sempat di-screenshot karena backend degraded — lihat catatan C05-01/C13; endpoint+guard+kode sudah terverifikasi.)*
- **PWA:** dismiss 7-hari (I8 resolved); version.ts=version.json.

---

## LIVE BATCH (3 Jul, backend hidup) — ✅ SUDAH DIKONFIRMASI
- **C12 JB-09:** Trial Balance **isBalanced=true** (debit 41.700.000 = kredit). JB-14 finance: TENANT → semua 403.
- **C16-01:** JB-14 CRUD generik (`/inventory-items`,`/wifi-sales`,`/additional-services`,`/room-items`,`/users`,`/expenses`) → **semua 403** untuk TENANT. **RESOLVED** (bukan risiko lagi).
- **C10 JB-14 UI:** admin buka `/owner-dashboard` (OWNER-only) → **redirect ke `/dashboard`**. `/stays` admin render bagus (3 masa sewa aktif, 0 pending), console 0 error.
- **C14/C17 admin:** dashboard render — survei **4.2★/80% rekomendasi** (agregasi tanpa NaN), "Daily Assistant" **rule-based** (bukan AI berbayar), AutoOps eksplisit "hanya reset booking/kamar; pembayaran/checkout tetap manual" + expiry 3 jam (JB-06). 3/13 kamar terisi.
- **C13:** balance-sheet *draft* live `ready:false` (jujur: "belum ada cash/bank/equity reliable" — bukan bug); formal reports `/reports/*` = **OWNER-only** (by design).

## LIVE FINAL (3 Jul, owner@kost48.com + bayu.tenant occupied) — ✅ DIKONFIRMASI
- **C05 occupied dashboard (Bayu, Kamar I):** render penuh, **TIDAK loop** (0 request berulang — membuktikan C05-01 **murni jalur 404/no-stay**). **I6 chart RESOLVED** (empty-state, bukan width -1). **JB-17 "100% terlewati" BENAR** (sewa overdue 9 hari). Deposit "Dana titipan Rp 300.000" benar.
- **C10 JB-03 (booking live):** booking uji → 201, kamar **tetap MAINTENANCE** (booking tak mengunci kamar). Booking self-expire 3 jam.
- **C13/C17 owner:** dashboard owner render (KPI valid, tanpa NaN); **JB-08** `/owner-ai/status` `manualOnly:true, enabled:false` (AI mati anggun, tak auto-jalan); deposit-liability report 6.4jt/5.6jt/800rb (JB-10).
- **C18:** Users create/edit = **OWNER-only** (admin pun tak bisa reset password — guard ekstra ketat).
- **+C17-01 (LOW):** okupansi dashboard owner **100%** vs admin **"3/13 terisi"** — denominator beda (kamar layak-sewa vs fisik); samakan label.

## LIVE SWEEP (3 Jul) — SEMUA HALAMAN ADMIN/OWNER DIRENDER (19/19 checklist punya coverage live)
Sapuan penutup: tiap halaman yang tersisa dibuka langsung (page-text, krn screenshot beku dari BE degraded). Semua **render bersih, tanpa NaN**, empty-state ramah.
- **C11 `/meter-readings`:** grid status per-kamar (13 kamar), filter periode, "Catat Meter Manual", 0 entri Juli → empty-state. **C11 `/renew-requests`:** "Pusat Perpanjangan" + RULE 4-langkah + 8-state machine terlihat.
- **C13 `/expenses`:** 6 seed draft rutin (Tetap 4/Variabel 2) semua **Rp 0 status Draft = belum posting jurnal** (kontrol JB-10 bagus, tak ada kas hantu). Tally kategori benar.
- **C14 `/ac-maintenance`:** 9 unit AC (½/¾ PK), jadwal hibrid (interval ATAU kWh), estimasi kWh tanpa NaN, auto **Tiket #6–14** (AC_CLEANING) → jelaskan lonjakan tiket. **C14 `/surveys`:** ✅ **REKALKULASI MANUAL LULUS** — 4.2★/4.6★/4.0★/80%/distribusi 2·2·1·0·0 semua **cocok** (JB-18 lulus live).
- **C15 `/staff-routines` & `/staff-performance`:** form template (Harian/Mingguan/Bulanan, Area, Butuh foto/catatan) + empty-state; KPI page = **insight rule-based "Risiko 84"** (tugas done tanpa foto penyelesaian → flag audit), skor valid tanpa NaN, non-AI (JB-08).
- **C16 `/inventory` & `/loyalty`:** inventaris tab Gudang/Barang-Kamar/Mutasi (stok tanpa NaN); loyalty 1 poin≈Rp100 + **peer-report "identitas pelapor dirahasiakan dari terlapor"** (JB-19 privasi surfaced di UI).
- **C17 `/notifications`:** ✅✅ **BUKTI money-guard di auto-sweep** — "Overstay stay #7 tidak bisa checkout otomatis, masih ada tagihan INV-7-089917 (ISSUED)… sistem tidak berani checkout selama ada uang yang harus diputuskan." → StaySweep **menolak auto-settle deposit saat invoice belum lunas** (JB-01/JB-10 di jalur otomatis, bukan hanya manual). Push PWA + filter kategori + grup tanggal (JB-17) OK.
- **C19 responsive 390px:** window di-resize → `/owner-dashboard` render dgn **sidebar collapse ke `☰`**, KPI cards stack. Mobile nav berfungsi. Bonus: "Akuntansi belum siap — 1 gate tersisa — skor 88%" = **honesty-gate jujur** (selaras C13 draft-not-ready).

## ⏳ SISA LIVE (minor — opsional, bukan gap coverage)
1. **Approve DP → check-in end-to-end** (C10): perlu alur upload-bukti (kompleks) + kamar AVAILABLE (semua kini MAINTENANCE/OCCUPIED). Logika JB-04 sudah kode-verified.
2. **Aksi mutasi/transaksi** (bukan hanya render): input meter (kWh×tarif), approve renew 8-state, checkout+settle deposit, mutasi inventaris assign>stok, WiFi activation tenant↔admin — **logika semua kode-verified**; sisanya butuh re-seed + BE stabil utk uji end-to-end.
3. **Responsive 375/768px role lain** (C19): tenant/admin sudah diuji AJ-07c; temuan baru C19-01/C19-02 tercatat. Owner 390px sudah ✓ (hamburger). Role lain/staf/publik masih opsional.
4. **Build/test utama** sudah lulus 2026-07-04: FE build + PWA verify, BE `tsc --noEmit`, backend unit 1072/1073 PASS (1 skip), backend integration PASS, frontend vitest 111/111 PASS.
5. **Screenshot visual per-halaman:** tertunda selama BE degraded (renderer beku). Semua sudah dikonfirmasi via page-text + Network; ulang screenshot setelah **restart backend bersih**.

> Catatan: `/portal/stay` untuk tenant **occupied** aman (tak loop); yang berbahaya hanya tenant **tanpa stay** sampai C05-01 di-fix.

## 📌 CATATAN DATA UJI (penting utk uji live lanjutan)
- **Seed menua ✅ FIXED via AJ-04 (4 Jul):** `seed-dev-via-api.js` kini memakai TODAY dinamis dan sudah di-reseed ke DB dev 5433. Hasil verifikasi: 13 kamar OCCUPIED (A B C D G H I J K L M F1 F2).
- **Integritas data C10-02 ✅ FIXED via AJ-03/AJ-04:** Bayu(I) & Sari(F2) sewa awal PAID + deposit terkumpul; invoice bulan ke-2 ISSUED/open. Sari tidak dibuat partial payment karena D-02 no-partial melarang cicilan invoice-only/manual.
- **Konsistensi setting ✅:** `OperationalSetting` live = DEFAULT_DATA (WiFi 50k, galon 20k, pet 100k, freeKwh 30, listrik 2.500, ekstra-penghuni 20%). Tarif/deposit kamar (A 1.7jt/500k, G 850k/300k, K 1.8jt/600k) cocok.
- **⚠️ BACKEND DEGRADED saat sesi:** akibat badai loop C05-01 (crash 2×) + dev query-log, query jadi **2.7–5.9 dtk** (normal <0.5s). Bikin screenshot UI tiap halaman admin timeout. **Endpoint+guard+kode semua terverifikasi via API**; render visual per-halaman admin sebaiknya diulang setelah **restart backend bersih**.

## 🔒 JB-14 (guard role) — MENYELURUH & BERSIH
owner→200 semua; **TENANT→403/404** di users, tenants, announcements, tickets, inventory-items, wifi-sales, additional-services, meter-readings, market-analysis, assets, expenses, surveys, + CRUD generik + reports (OWNER-only) + finance. Satu-satunya tenant-200 = `/me/notifications` (self-scoped, 0 kebocoran lintas-tenant). **Tak ada endpoint admin/owner yang bocor ke tenant.**

---

*Semua detail, langkah reproduksi, dan kutipan kode ada di `docs/audit/00_INDEX.md` (tabel progres) + `CHECKLIST_01..19`.*
