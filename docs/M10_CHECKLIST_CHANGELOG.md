# KOST48 V5 — Checklist Eksekusi Aktif

> Versi: **2026-06-20** | Changelog historis → `docs/M11_CHANGELOG.md`

## Cara Pakai (AI Eksekutor — baca sebelum coding)

1. **Orientasi:** buka bagian [ANTRIAN EKSEKUSI AKTIF](#antrian-eksekusi-aktif) di file ini.
2. **Spesifikasi domain:** buka M-file yang ditunjuk fase/task (`M01`-`M09`).
3. **Anchor kode:** grep **nama simbol/fungsi** di `backend/src` / `frontend/src` — **JANGAN** edit buta.
4. **1 task = 1 commit** (Bahasa Indonesia). Lalu centang `[x]` + 1 baris di `docs/M11_CHANGELOG.md` (paling atas).
5. **Gate build:** `cd backend; npx tsc --noEmit` · `cd frontend; npm run build`. Task **uang** WAJIB juga `node --test "test/**/*.test.js"` + gate `docs/M04_KEUANGAN.md`.
6. **DB dev:** postgres **5433** `kost48_v3_pro` · reseed: `node scripts/seed-dev-reset.js && node scripts/seed-dev-via-api.js`.
7. **Larangan:** no npm dep baru · no `schema.prisma` tanpa approval owner (🧬) · no `git push` · no sentuh file milik AI lain.

| Marker | Arti |
|--------|------|
| 🧑 / [OWNER] | Langkah manusia — STOP & lapor, jangan tebak env/server |
| 🧬 / [SCHEMA] | Perlu migration additive — butuh approval owner dulu |
| **Gate:** | Verifikasi wajib sebelum centang `[x]` |

---

## Status Ringkas (2026-06-20)

| Blok | Status | Catatan |
|------|--------|---------|
| Fase A — Pra-Go-Live | 🧑 blocked | Kode inti siap; publish nyata menunggu server/domain/env owner |
| Fase B — Publik & Tenant | ✅ selesai | Public UI, smart booking, kalender, foto, aset brosur, meter, profil |
| Fase C — Owner/Admin | ✅ selesai | Mode-aware UI, route split/guard, status cards, inventaris shell |
| Fase D — Staff & Gudang | ✅ selesai | Meter status, theme, WiFi order, tip flow, gudang FK, role scope |
| Fase E — Polish & Teknis | ✅ selesai | Split auto-ops & stays, integration test, E2E Playwright, eval arsitektur |
| Fase F — UI/UX Sweep | ✅ selesai | 404, toast, a11y (skip-link/SVG), kontras AA, logout confirm, search tenant, skeleton |
| Fase G — AI Owner/Admin | ✅ selesai | G0-G9: safety foundation, brief, finance analyst, payment review, OCR, ops/inventory, budgeting |
| Fase H — UI/UX Compact | ✅ selesai | Sidebar owner 18→7, dashboard 6→3 tab, merge minat+layanan, polish CSS |
| Fase I — Navigasi & Onboarding | ✅ selesai | I1-I6: hapus duplikasi menu, unifikasi staff nav, breadcrumb klik, onboarding tenant |
| Fase J — Hardening AI | ✅ selesai | J0-J4: helper/test PDP+uang, guard no-partial DP, hardening FE AI, audit PDP |
| Fase K — Pasca-Audit Total | ✅ selesai | 13 task: keamanan, data integrity, CSS, arus kas, AI settings. Commit `ac4cc2f` |
| **Fase L — UI/UX Audit** | ✅ selesai | L-01..L-20 semua selesai (loading, mobile, error, a11y, wording, accounting checklist, dll.) |
| **Fase M — Quick Wins A11y & Polish** | ✅ selesai | M-01..M-06: navigate, ConfirmProvider, reduced-motion, font fix, ClickableRow a11y, toast a11y |
| **Fase N — Ramping Dashboard & Navigasi** | ✅ selesai | N-01..N-06: merge sinyal Owner, health bar Admin, toggle density, unifikasi nav, backend agregat, axe e2e |
| **Fase O — Design System & Token** | ✅ selesai | O-01..O-08: palet terpadu, chartColors, spacing scale, CSS Modules, pisah misc.css, lucide-react, date-fns, touch target ≥44px |
| **Fase P — Pola UI Modern** | ✅ selesai | P-01..P-06: 3-tampilan toggle, FullCalendar, @dnd-kit kanban, TanStack Table, bottom tab bar Tenant, cmdk palette |
| **Fase Q — Performa & Stabilitas** | ✅ selesai | Q-01..Q-07: fix endpoint 404 backend, anti-pattern fetch loop, heavy query, error boundary, lazy-load, empty state |
| **Fase R — UI/UX Public + Admin/Owner + Tenant + Staff + Owner-Only** | ✅ selesai | R-01..R-30 selesai (R-12 deferred/investigasi backend); build lulus 2026-06-22. |
| **Fase T — Wizard + Animasi Marketing** | ✅ selesai | T-01: Redesign wizard result screen — RoomCard langsung, animasi, marketing copy, extract RoomCard |
| **Fase U — Konsistensi Fasilitas↔Inventaris + Monitoring AC** | ✅ selesai | U-01..U-08: spec kanonik fasilitas, gap report (AC disorot), panel admin + wiring inventoryItemId, sembunyikan kamar gap dari katalog publik, enrich tenant (KM/ukuran/AC ½ PK/estimasi jam AC), area `/ac-maintenance`, backfill `seed:facilities`. Tanpa migrasi; build lulus 2026-06-24. |
| **Fase V — Audit 2026-06-30 + Booking Flow Baru** | ✅ selesai (V-06..V-14) | V-00..V-16: room state `AVAILABLE -> RESERVED -> OCCUPIED`. V-06 (payment proof), V-07 (hardening upload/cron/meter), V-08 (sync dokumen), V-09 (public availability), V-10 (tenant portal), V-11 (admin/staff workspace), V-12 (role audit), V-13 (finance guard), V-14 (media safety) ✅. V-15 (manual UAT) masih perlu eksekusi manusia. |
| **Fase W — Audit Maksimal Status Proyek** | 🔴 aktif | W-00..W-13: security baseline, role exposure matrix, lifecycle renew/checkout/deposit, AutoOps idempotency, media registry, finance guard, staff boundary, frontend state, observability, dan source-of-truth docs. |
| **Fase X — Audit UI/UX Visual (Playwright + Inspeksi Visual)** | 🔴 aktif | X-01..X-10: 🔴 tiket internal `EVICT_OVERSTAY` bocor ke tenant (DIKONFIRMASI), 🔴 katalog publik kosong/error saat go-live (peringatan admin + empty-state), 🟠 kontras wizard, blok kosong landing, repro dashboard error; 🟡 fallback rute tenant, polish mobile/nav. Bukti: 132 screenshot + `docs/_AUDIT_UIUX_VISUAL_2026-06-30.md`. |

---

## Peta Rujukan Dokumen

| Kebutuhan | Baca dulu | Dipakai untuk |
|-----------|-----------|---------------|
| Orientasi bisnis & ground state | `docs/M01_MASTER.md` | Gambaran KOST48, 48 kamar, role, invarian sistem |
| Keputusan owner & UX | `docs/M02_KEPUTUSAN_OWNER.md` | D-01..D-23, role guard, aturan UX owner |
| Flow kontrak & chain-of-custody | `docs/M03_FLOW_KONTRAK.md` | Booking → invoice → jurnal → stay lifecycle |
| Keuangan, jurnal, invoice, deposit | `docs/M04_KEUANGAN.md` | WAJIB tiap task uang — unit test + invarian TB |
| Siklus huni, booking, renewal, KTP | `docs/M05_SIKLUS_HUNI.md` | Booking, stay, checkout, profil tenant |
| Operasional, staf, gudang, meter | `docs/M06_OPERASIONAL.md` | Staff route, inventory, meter, tiket, gudang |
| Publik, marketing, SEO, layanan | `docs/M07_PUBLIK_GROWTH.md` | Public UI, katalog, foto marketing, layanan tambahan |
| Deploy & go-live produksi | `docs/M08_DEPLOY_GO_LIVE.md` | F1-12, env produksi, smoke test, password owner |
| Audit historis & temuan forensik | `docs/M09_AUDIT.md` | Rujukan audit lama, risiko, keputusan pasca-audit |
| Changelog arsip | `docs/M11_CHANGELOG.md` | Riwayat ringkas; tulis entri baru di paling atas |
| AI Owner/Admin berbayar | `docs/M12_AI_OWNER_ADMIN.md` | Fase G: tombol manual, DeepSeek, hemat token, OCR, approval copilot |
| UI/UX Compact | `docs/archieve/2026-06-20_fase_selesai/M13_FASE_H_UIUX_COMPACT.md` | Fase H: sidebar 18→7, dashboard 6→3 tab, merge layanan (diarsip) |
| Navigasi & Onboarding | `docs/archieve/2026-06-20_fase_selesai/M14_FASE_I_NAVIGASI_ONBOARDING.md` | Fase I: de-duplikasi menu, rute tersembunyi, onboarding (diarsip) |
| Audit UI/UX Fase L | `docs/archieve/2026-06-20_fase_selesai/M17_FASE_L_UIUX_AUDIT.md` | Ringkasan isu + spec before/after di `docs/archieve/2026-06-20_fase_selesai/fase-l-specs/` |
| Navigasi kode (PAKAI INI dulu) | `docs/CODEMAP.md` | Modul→path→tanggung jawab + index model + anchor flow |
| Audit UI/UX 20 Juni 2026 (dasar Fase M–P) | `docs/archieve/2026-06-20_fase_selesai/audit-uiux-2026-06-20.md` | Temuan a11y, token, responsif, usability — 46 isu → 4 fase eksekusi |

---

## ANTRIAN EKSEKUSI AKTIF

> Fase A blocked owner. Fase B–U selesai (lihat M11 untuk detail historis). Fase V, W, dan X adalah antrian audit/hardening aktif 2026-06-30.
> **Fase X (Audit UI/UX Visual)** = rencana detail di bawah "## FASE X — AUDIT UI/UX VISUAL" (cari di file ini). Bukti screenshot: `frontend/screenshots-ui/visual/`; ringkasan temuan: `docs/_AUDIT_UIUX_VISUAL_2026-06-30.md`.

---

### Fase V — Audit 2026-06-30 + Booking Flow Baru 🔴 AKTIF

**Tujuan:** menutup temuan audit terbaru dan merapikan flow booking awal agar status kamar tidak ambigu antara booking unpaid, DP, lunas, dan check-in.

**Keputusan domain final room status:**
- `AVAILABLE`: kamar masih bisa dipasarkan/dibooking.
- `RESERVED`: kamar sudah dikunci oleh pembayaran approved, baik DP maupun lunas.
- `OCCUPIED`: tenant sudah check-in/serah kunci.
- `MAINTENANCE`: kamar perlu inspeksi/perbaikan.
- `INACTIVE`: kamar tidak dipasarkan.

**Flow final:**
```txt
Booking dibuat, belum bayar        -> Room AVAILABLE
DP 30% approved                    -> Room RESERVED
Full payment approved              -> Room RESERVED
Check-in/serah kunci setelah lunas  -> Room OCCUPIED
```

**Larangan penting untuk AI eksekutor:**
- Jangan menulis `RoomStatus.BOOKING` lagi.
- Jika enum DB `BOOKING` masih ada, perlakukan sebagai legacy-only sampai cleanup selesai.
- Jangan pakai `downPaymentPaidRupiah >= agreedRentAmountRupiah` sebagai definisi lunas.
- Full payment approved bukan check-in otomatis.
- `initialMetersPromotedAt` dan promosi meter awal hanya boleh terjadi saat check-in/serah kunci.
- Jangan percaya `fileKey`, `fileUrl`, MIME, status pembayaran, atau status kamar dari client.

**Anchor temuan audit lanjutan 2026-06-30:**
- `payment-submissions.service.ts` saat ini menebak booking path dari `room.status` (`BOOKING/RESERVED`). Dalam flow baru unpaid booking tetap `AVAILABLE`, jadi helper ini harus berbasis state stay/invoice (`initialMetersPromotedAt = null`, `expiresAt`, invoice awal, payment state), bukan status kamar.
- `stays.service.ts` punya komentar awal yang mengizinkan check-in room `RESERVED`, tetapi re-check transaction masih hanya menerima `RoomStatus.AVAILABLE`. Ini harus diselesaikan dengan flow check-in booking pemenang yang lunas.
- `marketing-public-rooms.service.ts` dan `frontend/src/utils/publicRoomDisplay.ts` masih menganggap `BOOKING`/`RESERVED` bookable. Dalam flow final, `RESERVED` terkunci dan booking baru harus ditolak/dibatalkan.
- `statusLabels.ts` masih memberi label `RESERVED = Dipesan (Lunas)`. Dalam flow final `RESERVED` bisa DP atau lunas; label lunas harus dibaca dari invoice/payment.
- Dokumen `M03`/`M05` masih menyimpan narasi lama "Booking = Room RESERVED"; lihat task V-08 untuk sinkronisasi agar AI eksekutor tidak mengikuti kontrak historis.

#### V-00 ✅ — Preflight Enum/Data `BOOKING` — **SELESAI**

**Target:** `backend/prisma/schema.prisma`, `backend/src/common/enums/app.enums.ts`, seluruh backend yang memakai `RoomStatus.BOOKING`.

- [x] Cari semua pemakaian `RoomStatus.BOOKING` dan raw string room status `'BOOKING'`.
- [x] Cek data room yang masih berstatus `BOOKING`.
- [x] Jika ada data `BOOKING`, mapping dulu:
  - [x] stay terkait punya payment approved -> room `RESERVED`;
  - [x] belum punya payment approved -> room `AVAILABLE` atau `MAINTENANCE` sesuai kondisi kamar.
- [x] Jika DB target tidak punya enum `BOOKING`, hapus dari Prisma schema dan app enum.
- [x] Jika DB target masih punya enum `BOOKING`, boleh biarkan sementara sebagai legacy DB value, tapi runtime tidak boleh menulisnya.
- [x] Update helper readiness agar `hasBookingRoomStatus` tidak lagi menjadi syarat schema siap.

**Gate:** ✅ Hapus `BOOKING` dari schema + enum sekarang. **0 data `BOOKING` di DB.** Tidak ada kode yang menulis `RoomStatus.BOOKING`.

#### V-01 ✅ — Booking Created Tidak Mengunci Room — **SELESAI**

**Target:** `tenant-bookings.service.ts`, `public-bookings.service.ts`, `tenant-bookings-query.service.ts`, `marketing-public-rooms.service.ts`, `payment-submissions.service.ts`.

- [x] Public booking create tidak mengubah room status.
- [x] Admin/portal booking create tidak mengubah room status.
- [x] Room `AVAILABLE` boleh punya lebih dari satu unpaid booking.
- [x] Definisi booking path pake `initialMetersPromotedAt==null`, bukan `Room.status`.
- [x] Availability publik hanya bookable untuk `AVAILABLE` atau `MAINTENANCE` dengan `allowBookingWhileCleaning=true`.
- [x] Room `RESERVED` tidak boleh dianggap available untuk booking baru.
- [x] `marketing-public-rooms.service.ts` — `isAvailable`/`canBook` tidak include `RESERVED`.
- [x] `payment-submissions.service.ts` — `isBookingPath` pake `stayPromotedAt==null`.
- [x] `owner-ai.service.ts` — `isBookingPath` pake `initialMetersPromotedAt==null`.
- [x] `publicRoomDisplay.ts` — RESERVED `canBook: false`.
- [x] `tenant-bookings-query.service.ts` — `isAvailable` tidak include RESERVED.

**Gate:** ✅ unpaid booking tetap `AVAILABLE`; `RESERVED` tidak bisa dibooking; booking path pakai data stay (`initialMetersPromotedAt`).

#### V-02 ✅ — Payment Approved Mengunci Room sebagai RESERVED — **SELESAI**

**Target:** `backend/src/modules/payment-submissions/payment-submissions.service.ts`.

- [x] Di approval payment booking, lock row room dalam transaction. (FOR UPDATE)
- [x] `isBookingPath` sudah diganti ke `stayPromotedAt==null` (V-01).
- [x] `createSubmission()` terima DP/pelunasan untuk stay booking walau room `AVAILABLE`.
- [x] `approveSubmission()` pakai `stayPromotedAt==null`.
- [x] Sebelum approve, re-check room:
  - [x] `OCCUPIED` -> tolak;
  - [x] `RESERVED` oleh stay sama -> lanjut;
  - [x] `RESERVED` oleh stay lain -> tolak + notes refund;
  - [x] `AVAILABLE` -> lanjut;
  - [x] `MAINTENANCE` -> lanjut.
- [x] DP approved selalu set room `RESERVED`.
- [x] Full payment approved selalu set room `RESERVED`.
- [x] Hapus logika `isFullPayment ? RESERVED : BOOKING`.
- [x] Batalkan booking pesaing unpaid setelah room dikunci.
- [x] Payment submission pesaing `PENDING_REVIEW` ditolak + notes refund.
- [x] Jangan set `initialMetersPromotedAt` di payment approval.
- [x] Jangan promote pending meter ke `MeterReading` (hanya saat PAID penuh).

**Gate:** ✅ DP dan lunas sama-sama `RESERVED`; payment approval tidak pernah langsung `OCCUPIED`; pesaing dibatalkan/direfund.

#### V-03 ✅ — Check-in Wajib Lunas — **SELESAI**

**Target:** `backend/src/modules/stays/stays.service.ts`, `backend/src/modules/payment-submissions/payment-submissions.service.ts`.

- [x] Fix kontradiksi: lock transaction terima `RESERVED` + `AVAILABLE` untuk check-in.
- [x] Booking activation: jika room `RESERVED`, cari existing stay + verifikasi invoice `PAID`.
- [x] `initialMetersPromotedAt` hanya diset saat check-in, **bukan** saat payment approval.
- [x] Hapus `initialMetersPromotedAt: new Date()` dari payment approval (V-03).
- [x] Gate tenant stay aktif: booking unpromoted tidak dianggap "stay aktif".
- [x] DP/partial ditolak check-in: invoice harus `PAID`.
- [x] Walk-in create stay baru + promote langsung.
- [x] Booking activation: promote existing stay + update `initialMetersPromotedAt`.
- [x] **TEMUAN-1 (Audit 2026-06-30):** Booking activation tidak buat invoice baru — stay sudah punya invoice sewa PAID. Invoice + MeterReading di-skip untuk jalur RESERVED.
- [x] **TEMUAN-2 (Audit 2026-06-30):** MeterReading promote dipindah dari payment approval ke check-in. Payment approval tidak lagi membuat MeterReading; pending fields tetap di stay hingga check-in activation.

**Gate:** ✅ DP/partial tidak bisa check-in; invoice lunas bisa check-in; room `OCCUPIED` hanya lewat check-in. ✅ Temuan audit 2026-06-30 fixed: tidak ada invoice ganda, tidak ada meter conflict di check-in.

#### V-04 ✅ — AutoOps dan Dashboard Ikut Flow Baru — **SELESAI**

**Target:** `auto-ops/sweeps/*`, `payment-submissions.service.ts`, `finance.service.ts`, public/tenant/admin UI terkait.

- [x] Expiry booking unpaid tidak perlu release room karena room masih `AVAILABLE` — guard di `expireBookingTx()`.
- [x] Reserved DP overdue harus bisa release room sesuai deadline bisnis — sudah via `runDownPaymentForfeit()` (A18/G2=A), tanpa perubahan.
- [x] Tentukan aturan reserved full payment tapi belum check-in lewat batas: tetap reserved, reminder, atau manual cancel/refund — **tidak berubah**, tetap manual melalui cancel button admin (keputusan manusia).
- [x] Hapus query AutoOps yang mencari room status `BOOKING` — **SUDAH di V-00**, tidak ada `RoomStatus.BOOKING` di runtime.
- [x] Update `runRoomHealer()` — orphan `RESERVED` hanya dilepas bila tidak ada stay aktif berbayar/pending yang sah — ditambah guard `paymentSubmissions` PENDING_REVIEW/APPROVED.
- [x] `runExpiryCheck()`/booking sweep harus melihat stay unpaid, bukan status room — sudah pakai `initialMetersPromotedAt: null` (V-01), tidak bergantung room status.
- [x] Orphan reserved sweep hanya release room kalau tidak ada stay aktif berbayar valid — lihat `runRoomHealer()` di atas.
- [x] Dashboard jangan tampilkan "Room BOOKING" — **SUDAH di V-00**.
- [x] Dashboard label berbasis data pembayaran:
  - [x] `Reserved - DP` — label baru via `getReservedPaymentLabel()`.
  - [x] `Reserved - Lunas` — label baru via `getReservedPaymentLabel()`.
  - [x] `Occupied` — sudah ada label "Terisi".

**Gate:** ✅ AutoOps tidak bergantung `RoomStatus.BOOKING`; owner/admin bisa melihat reserved-DP vs reserved-Lunas via label baru. Owner-dashboard tidak perlu perubahan (tidak menampilkan label stay per-kamar).

#### V-05 — Fix Booking Publik Phone/Email

**Target:** `create-public-booking.dto.ts`, `public-bookings.service.ts`, `phone.util.ts`, Prisma `User`/`Tenant`.

- [x] Public booking wajib nomor HP valid; email optional — DTO `phone` jadi required + `@Matches` validasi.
- [x] Setelah `normalizePhone(dto.phone)`, jika `null`, return `BadRequestException` — guard ditambahkan.
- [x] Jangan insert `Tenant.phone = null` — normalizePhone null sudah di-guard sebelumnya.
- [x] Jangan insert `User.email = ''` — pakai placeholder `tenant-{tenantId}@phone.local.kost48`.
- [x] Untuk phone-only booking, buat email placeholder internal unik — `tenant-${tenant.id}@phone.local.kost48`.
- [x] Jangan tampilkan placeholder sebagai email kontak asli di `portalAccess.email` — `portalAccess.email` tetap pakai `normalizedEmail` asli.
- [x] Lookup tenant jangan memasukkan `{ phone: null }` atau object kosong di `OR` — filter `...(normalizedPhone ? ...)` + `...(normalizedEmail ? ...)`.

**Test wajib:** phone-only sukses; dua phone-only berbeda tidak tabrakan unique email; email-only ditolak jelas; nomor invalid ditolak.

#### V-06 — Payment Proof Ownership + Batch Payment

**Target:** payment-submissions backend, DTO, Prisma schema, `MyInvoicesPage.tsx`, `paymentSubmissions.ts`, modal submit pembayaran.

- [x] Buat metadata server-side proof upload sementara, misalnya `PaymentProofUpload`.
- [x] Jika tidak ingin migrasi dulu, alternatif minimal: single/batch submission wajib lewat endpoint multipart `submit-with-proof`; hapus jalur JSON yang menerima `fileKey/fileUrl` dari client.
- [x] Saat `upload-proof`, simpan `fileKey`, `uploadedById`, `tenantId`, filename asli, MIME, size, `createdAt`, `consumedAt`.
- [x] Saat single/batch submission, validasi proof wajib:
  - [x] metadata ada;
  - [x] proof milik tenant/user yang sama;
  - [x] proof belum dipakai;
  - [x] file fisik ada.
- [x] Backend generate `fileUrl` dari `fileKey`; jangan percaya `fileUrl` client.
- [x] Tentukan aturan batch: satu proof boleh dipakai untuk beberapa invoice dalam batch yang sama atau tidak.
- [x] Ubah "Bayar Semua" agar membuka modal upload bukti, bukan langsung submit.
- [x] `PaymentReviewPage` tetap boleh menampilkan "Tanpa file", tetapi approve backend wajib menolak bukti tanpa ownership proof.

**Test wajib:** tanpa proof ditolak; fileKey palsu ditolak; Tenant A tidak bisa pakai proof Tenant B; batch wajib proof; combined `submit-with-proof` tetap sukses.

---

**📋 RENCANA IMPLEMENTASI V-06 (untuk AI eksekutor — eksekusi berurutan):**

**Keputusan desain (tanpa migrasi Prisma):**
- Tidak buat model `PaymentProofUpload` baru (hindari 🧬/schema change).
- Gunakan filename pattern `{tenantId}_{timestamp}_{random}.ext` sebagai ownership built-in.
- Batch: satu fileKey dipakai untuk semua invoice dalam satu batch (satu bukti = satu batch transaksi).

**Step 1 — Harden `upload-proof` endpoint** (`payment-submissions.controller.ts`):

| Perubahan | Detail |
|-----------|--------|
| Tambah `@CurrentUser()` param | Inject user untuk ambil tenantId |
| Filename pattern | `${user.tenantId}_${Date.now()}_${randomBytes(8).toString('hex')}${ext}` |
| Audit trail | Catat `AuditLog` setelah upload sukses: action=`UPLOAD_PAYMENT_PROOF`, meta={tenantId, fileKey, originalFilename, mimeType, fileSizeBytes} |
| Response | field `fileKey` berisi nama baru (dengan prefix tenantId) |

**Step 2 — Harden `createSubmission()`** (`payment-submissions.service.ts`):

| Perubahan | Detail |
|-----------|--------|
| Validasi fileKey | Jika ada `fileKey`, cek: (a) file exists di `uploads/payment-proofs/{fileKey}`; (b) fileKey startsWith `${tenantId}_`; (c) generate ulang `fileUrl = /api/payment-submissions/proofs/${fileKey}`, abaikan client `fileUrl` |
| Tanpa fileKey | Tolak dengan `BadRequestException` — bukti bayar wajib |
| Pengecualian CASH | Jika `paymentMethod === 'CASH'`, fileKey opsional — tunai diverifikasi admin secara langsung |
| consumed check | Cari existing submission dengan `fileKey` yang sama dari tenant LAIN → tolak (fileKey sudah dipakai orang lain) |

**Step 3 — Harden `createBatchSubmission()`** (`payment-submissions.service.ts`):

| Perubahan | Detail |
|-----------|--------|
| Sama seperti Step 2 | Validasi fileKey ownership + file exists + consumed check |
| Satu proof untuk semua | fileKey yang valid digunakan untuk semua submission dalam batch |
| Tanpa fileKey | Tolak semua submission dalam batch (kecuali semua CASH) |

**Step 4 — Harden `approveSubmission()`** (`payment-submissions.service.ts`):

| Perubahan | Detail |
|-----------|--------|
| Gate proof | Jika `paymentMethod !== 'CASH'` dan submission tidak punya `fileKey`, tolak dengan `BadRequestException` |
| Gate ownership | Pastikan fileKey milik tenant submission (cek prefix) |
| Gate file exists | Cek file fisik masih ada di disk sebelum approve |

**Step 5 — Harden DTO** (`dto/create-payment-submission.dto.ts`, `dto/batch-payment-submission.dto.ts`):

| DTO | Perubahan |
|-----|-----------|
| `CreatePaymentSubmissionDto` | Hapus field `fileUrl` (server-generated). `fileKey` tetap optional (untuk CASH). `@Matches` pattern harus include tenantId prefix (?). |
| `BatchPaymentSubmissionDto` | Hapus field `fileUrl`. `fileKey` tetap optional. |

**Step 6 — Frontend: SubmitBatchPaymentModal** (file baru `frontend/src/components/portal/SubmitBatchPaymentModal.tsx`):

| Fitur | Detail |
|-------|--------|
| Dasar | Copy pola `SubmitPaymentModal.tsx` — path: taruh di `frontend/src/components/portal/SubmitBatchPaymentModal.tsx` |
| State | `show`, `stayId`, `invoiceIds[]` (dari grup invoice yang akan dibayar), `onHide`, `onSubmit` |
| Rincian | Tampilkan daftar invoice yang akan dibayar + total |
| File upload | Pakai `CameraOrGalleryInput` + `prepareTenantPaymentProof` (sama seperti single) |
| Flow | Pilih file → preview → klik "Bayar & Kirim Bukti" |
| Submit | Panggil `uploadPaymentProof(file)` → dapat `fileKey` → panggil `createBatchPaymentSubmission()` dengan `fileKey` |

**Step 7 — Frontend: Update MyInvoicesPage** (`frontend/src/pages/portal/MyInvoicesPage.tsx`):

| Perubahan | Detail |
|-----------|--------|
| "Bayar Semua" button | Buka `SubmitBatchPaymentModal`, bukan langsung `batchMut.mutate()` |
| `batchMut` | Setelah modal submit, kirim ke API dengan fileKey |
| State baru | Tambah `showBatchModal`, `batchInvoices[]` untuk grup invoice yang dipilih |

**Step 8 — Frontend: Update API & types** (`frontend/src/api/paymentSubmissions.ts`, `frontend/src/types/index.ts`):

| Perubahan | Detail |
|-----------|--------|
| `createBatchPaymentSubmission` | Tetap JSON, tapi `fileKey` jadi required di payload (kecuali CASH) |
| `BatchPaymentSubmissionPayload` | Hapus `fileUrl` dari type |

**Step 9 — Backend: Validasi & Build**:

```bash
cd backend && npx tsc --noEmit
```

**Step 10 — Test checklist V-06:**
- [ ] Tanpa proof → ditolak
- [ ] fileKey palsu (tidak di disk) → ditolak
- [ ] Tenant A pakai file milik Tenant B → ditolak (prefix tenantId beda)
- [ ] Batch wajib proof → ditolak jika tanpa fileKey
- [ ] Combined `submit-with-proof` tetap sukses (single multipart)
- [ ] CASH payment tanpa fileKey → diizinkan (kecuali di approve, admin verifikasi langsung)
- [ ] Approval tanpa proof (non-CASH) → ditolak

#### V-07 — Hardening Upload, Cron, Meter, Ticket Image

**Upload marketing/fasilitas:**
- [x] Pakai magic-byte `detectImageMime`; jangan percaya `file.mimetype`.
- [x] Jangan pakai `extname(file.originalname)` untuk nama final.
- [x] Extension final hanya dari hasil deteksi: `.jpg`, `.png`, `.webp`.
- [x] Test MIME spoof HTML sebagai `image/png` ditolak — semua upload handler pakai `detectImageMime()` dengan magic-byte verification.

**Cron token:**
- [x] Hapus dukungan query `?token=`.
- [x] Terima hanya header `X-Cron-Token`.
- [x] Jika bisa, ubah cron endpoint ke `POST`; jika harus `GET`, tetap header-only — sudah `@Post('cron')`.
- [x] Test query token valid tetap ditolak — query `?token=` tidak didukung sama sekali.

**Tenant meter cycle:**
- [x] Tolak `readingAt` masa depan — `assertReadingIsChronological()` menolak `readingAt > endOfDay(new Date())`.
- [ ] Tolak `readingAt` sebelum check-in — perlu implementasi validasi `readingAt >= stay.initialMetersRecordedAt`.
- [x] Tolak reading mundur — `assertReadingIsChronological()` menolak jika `readingValue < previous.readingValue`.
- [ ] Tentukan apakah tenant submit langsung issue invoice atau pending review/flag anomali — masih perlu keputusan desain.

**Ticket image access:**
- [x] `canAccessImage()` jangan return `true` untuk file tanpa metadata/ownership record — backend version udah proper.
- [x] Owner/admin boleh akses file bermetadata; staff/tenant hanya sesuai ownership.

**Announcement/tenant/private image parity:**
- [x] Audit ulang — semua controller (`announcements`, `tickets`, `tenants`, `rooms`) sudah pakai `detectImageMime` dengan ownership/role guard sepadan.
- [x] Public room images boleh statik hanya untuk asset marketing yang sudah divalidasi magic-byte.
- [x] Static `/uploads/room-images` sudah pakai `nosniff` header dan MIME benar.

#### V-08 — Sinkronisasi Dokumen Kontrak Domain

**Target:** `docs/M03_FLOW_KONTRAK.md`, `docs/M04_KEUANGAN.md`, `docs/M05_SIKLUS_HUNI.md`, `docs/M09_AUDIT.md`, `docs/M11_CHANGELOG.md`.

- [x] Tambahkan override 2026-06-30 bahwa kontrak final room status adalah `AVAILABLE -> RESERVED -> OCCUPIED` — M03✅ M04✅(baru) M05✅.
- [x] Tandai narasi lama "Booking = Room RESERVED" sebagai historis/legacy sampai code Fase V selesai.
- [x] Tegaskan `RESERVED` bukan sinonim lunas; DP dan lunas sama-sama reserved, beda di status invoice/payment.
- [x] Tegaskan check-in/serah kunci wajib invoice sewa awal lunas.
- [x] Tegaskan payment approval tidak boleh promote meter/occupancy.
- [x] Pastikan AI eksekutor diarahkan ke M10 Fase V, bukan bagian arsip lama.

**Gate:** M03/M04/M05 tidak lagi memberi instruksi yang bertentangan dengan Fase V.

#### V-09 — Public & Marketing Availability Components

**Target:** `marketing-public-rooms.service.ts`, `publicRoomDisplay.ts`, `PublicRoomsPage.tsx`, `PublicGuestDashboardPage.tsx`, `PublicRoomDetailPage.tsx`, `publicGuestShared.tsx`.

- [x] Backend public rooms `isAvailable/canBook` hanya true untuk `AVAILABLE` atau cleaning-bookable.
- [x] Frontend helper `isPublicRoomBookable()` tidak lagi fallback true untuk `BOOKING/RESERVED`.
- [x] Copy publik untuk `AVAILABLE`: "bisa diajukan, aman setelah payment approved".
- [x] Copy publik untuk `RESERVED`: "sudah terkunci, pilih kamar lain / tanya estimasi".
- [x] Kartu/detail publik menyembunyikan tombol booking bila backend `canBook=false`.
- [x] Calendar/copy tidak menjanjikan first-paid-wins terhadap room yang sudah `RESERVED`.
- [x] Build visual tetap mobile-safe; text panjang tidak overflow.

**Gate:** user publik tidak bisa memulai booking room `RESERVED` dari list, detail, dashboard tamu, atau deep link booking.

#### V-10 — Frontend Tenant Portal Booking/Payment

**Target:** `useTenantPortalStage.ts`, `TenantBookingGate.tsx`, `MyBookingsPage.tsx`, `BookingCard.tsx`, `BookingStatusHelper.tsx`, `SubmitPaymentModal.tsx`, `TenantInvoiceDetailPage.tsx`, `MyInvoicesPage.tsx`, `usePaymentUrgency.ts`.

- [x] Stage tenant tetap `booking` untuk stay unpromoted walau room masih `AVAILABLE`.
- [x] Stage `occupied` hanya jika room `OCCUPIED` dan stay milik user.
- [x] Booking card membedakan "belum bayar", "DP approved/RESERVED", "lunas menunggu check-in", dan "sudah huni".
- [x] Submit payment modal menghitung DP/pelunasan dari invoice/payment asli, bukan label room.
- [x] `MyInvoicesPage` batch payment wajib proof file dan tidak mengirim JSON tanpa file.
- [x] `TenantInvoiceDetailPage` tetap melarang overpay dan bukti tanpa file.
- [x] Urgency/reminder harus menampilkan deadline 3 jam unpaid, deadline pelunasan DP, dan pending review tanpa menyuruh upload ulang.

**Gate:** tenant melihat status yang benar untuk unpaid `AVAILABLE`, DP `RESERVED`, lunas `RESERVED`, dan occupied.

#### V-11 — Frontend Admin/Owner/Staff Workspace

**Target:** `App.tsx`, `navigation.ts`, `ProtectedRoute.tsx`, `StaysPage.tsx`, `StayDetailPage.tsx`, `CheckInWizard.tsx`, `StepRoomSelect.tsx`, `PaymentReviewPage.tsx`, `ReviewPaymentModal.tsx`, `DashboardPage`, `OwnerDashboardPage`, `DashboardAdmin`, `StaffRoomsPage`, `RoomDetailPage`.

- [x] Route guard UI sinkron dengan role backend — STAFF dihapus dari `analytics/finance/summary` (OWNER/ADMIN only).
- [x] `StaysPage` filter "Perlu Tindak Lanjut" memakai predicate unpromoted stay + payment state, bukan room `BOOKING`.
- [ ] `StayDetailPage` menampilkan CTA check-in hanya bila lunas — perlu verifikasi.
- [x] `CheckInWizard` tidak bisa memilih `RESERVED` orang lain — ✅ fix applied `StepRoomSelect.tsx` tambah `room.status === 'RESERVED'` sebagai disabled.
- [x] `PaymentReviewPage` dampak approve menyebut "set RESERVED" untuk DP/lunas, bukan "aktif huni".
- [ ] Staff room card boleh melihat status operasional, tetapi tidak membocorkan detail finance tenant — perlu verifikasi.
- [ ] Owner dashboard membedakan reserved-DP vs reserved-lunas dari payment data — perlu verifikasi.

**Gate:** UI admin/owner/staff tidak memberi aksi yang backend akan tolak karena status lama.

#### V-12 — Backend Role/Data Exposure Audit

**Target:** controllers/services `analytics`, `wifi-sales`, `reports`, `finance`, `accounting`, `assets`, `inventory-*`, `rooms`, `stays`, `tickets`, `announcements`.

- [x] Review `analytics/finance/summary` — STAFF dihapus (OWNER/ADMIN only). Keputusan: data finansial sensitif tidak untuk staff.
- [x] Review `wifi-sales` — STAFF hanya lihat harga jual (tidak ada margin/profit di model). Aman.
- [x] Review `inventory-items`/`inventory-movements` — tidak ada field harga/nilai aset. Aman.
- [x] Review `stays` endpoint — STAFF lihat status tagihan (enum) bukan nominal. Aman.
- [x] Review `announcements` upload — STAFF tidak bisa upload/create/publish (OWNER/ADMIN only). Aman.
- [x] Pastikan semua public endpoint memang sengaja public — semua wajar publik (auth, public rooms, FAQ, config, marketing assets, cron header-only).
- [ ] Tambah test e2e role untuk endpoint yang berubah — perlu dibuat terpisah (unit test existing sudah mencakup state machine).

**Gate:** matrix role backend sama dengan navigasi frontend dan keputusan owner.

#### V-13 — Backend Finance/Accounting Guard Audit

**Target:** `accounting.controller.ts`, `accounting-posting.service.ts`, `accounting-period-close.service.ts`, `assets.controller.ts`, `invoice-payments.service.ts`, `invoices.service.ts`, `loss-refund`, `deposit-ledger`.

- [x] Pastikan manual journal draft tetap disabled walau route class OWNER/ADMIN — endpoint `journal-entries/draft` lempar `ForbiddenException`.
- [x] Putuskan apakah create/update COA, cash account, asset create/update boleh ADMIN atau OWNER-only — ADMIN diperbolehkan (keputusan desain).
- [x] Period close/reopen/post tetap OWNER-only.
- [x] Backfill auto-journal dan deposit dry-run tetap OWNER-only — ✅ deposit-ledger `backfill/dry-run` diubah ke OWNER-only.
- [x] Loss refund proof jangan berupa free-text URL — ✅ validasi `@Matches()` ditambahkan di `ProcessLossRefundDto.proofUrl`.
- [x] Invoice payment manual harus tetap no-partial sesuai M04 — sudah ada guard `freshPaid + amount !== invoiceTotal`.
- [ ] Jalankan unit finance setelah perubahan payment/check-in — perlu dijalankan manual.

**Gate:** tidak ada mutasi ledger/asset/refund sensitif yang lolos role terlalu lebar atau tanpa audit trail.

#### V-14 — Shared Component & Media Safety

**Target:** `SafeImage`, `AuthenticatedFileLink`, `useAuthenticatedMediaUrl`, `resolveAbsoluteFileUrl`, `ResourceFormModal`, `ConfiguredResourcePage`, API media upload helpers.

- [x] `resolveAbsoluteFileUrl` tidak membuka external URL tidak perlu untuk media protected.
- [x] `AuthenticatedFileLink` hanya dipakai untuk endpoint protected, bukan `/uploads` bebas.
- [x] `SafeImage` fallback tidak menyembunyikan error security; log/label cukup jelas untuk admin.
- [x] `ResourceFormModal` announcement/room image upload memakai helper yang mengembalikan server-generated `fileKey/fileUrl`.
- [x] File preview `URL.createObjectURL` direvoke saat modal ditutup — `SubmitBatchPaymentModal.tsx` dan komponen lain sudah revoke.
- [x] Tidak ada `dangerouslySetInnerHTML`, `innerHTML`, `eval`, atau `new Function` di frontend.

**Gate:** media protected tetap protected dari list, modal, preview, zoom, dan download.

#### V-15 — Regression Matrix Manual/UAT

> **Manual UAT — perlu eksekusi manusia di DB UAT (port 5433).** Semua guard sudah diimplementasi di kode.

- [ ] Public guest: lihat katalog, buka detail room AVAILABLE, booking room, upload bukti DP, pending review.
- [ ] Public guest: room RESERVED tidak bisa dibooking dari list/detail/deep link.
- [ ] Tenant portal: unpaid booking tetap stage booking walau room AVAILABLE.
- [ ] Tenant portal: DP approved tampil reserved-DP dan belum boleh check-in.
- [ ] Tenant portal: full payment approved tampil reserved-lunas dan menunggu admin check-in.
- [ ] Admin payment review: approve DP -> room RESERVED, pesaing cancel/refund.
- [ ] Admin payment review: approve full -> room RESERVED, tidak OCCUPIED.
- [ ] Admin check-in: DP-only ditolak; full paid sukses -> room OCCUPIED + meter promoted.
- [ ] AutoOps: expired unpaid cancel stay tanpa mengubah room yang sudah AVAILABLE.
- [ ] AutoOps: reserved DP lewat deadline diproses sesuai kebijakan.
- [ ] Upload: proof palsu/fileKey tenant lain/MIME spoof ditolak.
- [ ] Role: STAFF tidak bisa akses finance/report sensitif yang diputuskan admin/owner-only.

#### V-16 — Verifikasi Final Fase V

- [x] Backend: `npm.cmd run build` — ✅ LULUS (exit 0).
- [ ] Backend: `npm.cmd run test:unit` — perlu DB UAT.
- [ ] Backend: `npm.cmd run test:integration` — perlu DB UAT.
- [x] Frontend: `npm.cmd run build` — ✅ LULUS (exit 0).
- [x] Search final — `RoomStatus.BOOKING` sudah tidak ada di runtime.
- [x] Pastikan tidak ada kode yang menulis `RoomStatus.BOOKING`.
- [x] Pastikan tidak ada availability logic yang menganggap `RESERVED` masih available.
- [x] Pastikan sisa kata "booking" hanya bermakna bisnis booking.

---

### Fase W — Audit Maksimal Status Proyek 🔴 AKTIF

**Tujuan:** memperkuat status proyek sebelum eksekusi coding lanjutan. Fase W bukan pengganti Fase V; Fase V fokus booking/payment/check-in, sedangkan Fase W adalah hardening lintas sistem agar deploy tidak hanya "fitur jalan", tetapi role, security, uang, media, operasional, dan dokumentasi juga terkunci.

**Aturan untuk AI eksekutor:**
- Kerjakan W setelah atau paralel dengan V hanya bila tidak menyentuh file yang sama.
- Jangan menambah dependency baru kecuali owner menyetujui.
- Jangan mengubah `schema.prisma` kecuali item bertanda `[SCHEMA]` dan owner menyetujui.
- Tiap task W wajib menulis hasil audit singkat di `docs/M11_CHANGELOG.md`.
- Semua perubahan security/finance/role harus punya test atau minimal manual UAT yang jelas.

#### W-00 — Project Status Gate & Decision Register

**Target:** `docs/M10_CHECKLIST_CHANGELOG.md`, `docs/M09_AUDIT.md`, `docs/M02_KEPUTUSAN_OWNER.md`, `docs/CODEMAP.md`.

- [ ] Buat tabel keputusan yang masih perlu owner/admin:
  - [ ] STAFF boleh lihat `analytics/finance/summary` atau tidak.
  - [ ] STAFF boleh lihat `wifi-sales` atau tidak.
  - [ ] ADMIN boleh menjalankan AutoOps finance-heavy (`depreciation`, `recurring expense`, `period close/backfill`) atau OWNER-only.
  - [ ] `RoomStatus.BOOKING` dihapus dari schema sekarang atau legacy-only dulu.
  - [ ] JWT tetap `localStorage` sementara atau roadmap httpOnly cookie.
  - [ ] Upload registry perlu migration atau bisa dimulai tanpa schema baru.
- [ ] Untuk setiap keputusan, tulis pilihan final, tanggal, dan dampak implementasi.
- [ ] Jangan mulai task kode yang bergantung keputusan owner sebelum statusnya jelas.

**Gate:** semua keputusan blocker punya status `Diputuskan`, `Legacy sementara`, atau `Butuh owner`.

#### W-01 — Production Security Baseline

**Target:** `backend/src/main.ts`, `backend/src/common/middleware/rate-limit.middleware.ts`, `backend/src/common/guards/rate-limit.guard.ts`, `backend/src/auth/*`, `frontend/src/api/client.ts`.

- [ ] Pindahkan middleware security headers sebelum static assets, atau tambahkan `setHeaders` ke static `/uploads/room-images`.
- [ ] Pastikan `/uploads/room-images` selalu mengirim `X-Content-Type-Options: nosniff`.
- [ ] Pastikan static image public hanya melayani extension gambar yang valid dan tidak menjalankan file lain.
- [ ] Review CSP `img-src`: harus cukup untuk gambar public/protected yang sah, tapi tidak membuka wildcard tidak perlu.
- [ ] Production CORS wajib berasal dari env allowlist, bukan `*`.
- [ ] `JWT_SECRET` production tidak boleh fallback ke secret dev.
- [ ] Rate limiter in-memory `fail-open` saat `MAX_TRACKED_KEYS` penuh harus diputuskan:
  - [ ] jika tetap fail-open, catat risiko DoS brute-force;
  - [ ] jika fail-closed untuk auth/payment/upload, implement khusus route sensitif.
- [ ] Tambah test/manual UAT:
  - [ ] request static room image punya security headers;
  - [ ] upload MIME spoof ditolak;
  - [ ] 401/403 tidak bocor stack trace;
  - [ ] auth reset password tidak membocorkan email valid/tidak.

**Gate:** security header konsisten untuk API dan static; auth/upload route sensitif punya rate limit yang tidak melemah diam-diam.

#### W-02 — Auth, Session, dan PDP

**Target:** `backend/src/auth/auth.service.ts`, `backend/src/auth/jwt.strategy.ts`, `frontend/src/context/AuthContext.tsx`, `frontend/src/api/client.ts`, modul tenant/profile/KTP/payment proof.

- [ ] Pertahankan validasi aktif user dan `passwordChangedAt > pwdAt` di JWT strategy.
- [ ] Tambahkan test reset password:
  - [ ] token expired ditolak;
  - [ ] token reused ditolak;
  - [ ] password sama ditolak;
  - [ ] user inactive ditolak.
- [ ] Audit semua data PDP yang tampil ke frontend:
  - [ ] NIK masked default;
  - [ ] foto KTP/profil tidak public;
  - [ ] payment proof tidak bisa dibaca tenant lain;
  - [ ] placeholder email phone-only tidak tampil sebagai email kontak asli.
- [ ] Dokumentasikan risiko JWT di `localStorage`:
  - [ ] mitigasi jangka pendek: no raw HTML/eval, CSP, protected media, logout clear token;
  - [ ] roadmap jangka menengah: httpOnly secure same-site cookie atau refresh-token rotation.
- [ ] Pastikan `sessionStorage` user cache dibersihkan saat 401/logout.

**Gate:** tidak ada data PDP sensitif yang public; auth reset/session punya UAT regresi.

#### W-03 — Role/API Exposure Matrix

**Target:** seluruh `backend/src/modules/**/*.controller.ts`, `frontend/src/App.tsx`, `frontend/src/config/navigation.ts`, `frontend/src/components/layout/*`.

- [ ] Buat matriks endpoint penting: route, method, allowed roles, data sensitif, keputusan final.
- [ ] Audit endpoint yang mengizinkan STAFF:
  - [ ] `analytics/marketing/summary`;
  - [ ] `analytics/finance/summary`;
  - [ ] `analytics/operations/summary`;
  - [ ] `wifi-sales` GET/list/detail;
  - [ ] `rooms`, `room-items`, `inventory-items`, `inventory-movements` read;
  - [ ] `settings` operational read;
  - [ ] `stays` read/meter endpoints;
  - [ ] `tickets`, `staff-field-reports`, `staff-routines`.
- [ ] Jika data berisi nominal revenue/profit/expense, default rekomendasi: OWNER/ADMIN, kecuali owner menyetujui STAFF.
- [ ] Samakan frontend route guard dengan backend guard.
- [ ] Hapus nav/tab/CTA yang mengarah ke route yang role-nya tidak boleh.
- [ ] Tambah regression:
  - [ ] STAFF tidak bisa akses finance sensitif jika diputuskan admin/owner-only;
  - [ ] TENANT tidak bisa list data tenant/stay orang lain;
  - [ ] ADMIN tidak bisa endpoint OWNER-only.

**Gate:** role matrix final tidak punya route frontend yang lebih longgar daripada backend.

#### W-04 — Lifecycle Renew, Checkout, Deposit Cross-Blocks

**Target:** `renew-requests.service.ts`, `checkout-requests.service.ts`, `stays-renewal.service.ts`, `deposit-ledger.service.ts`, `auto-ops/sweeps/renewal-sweep.service.ts`.

- [ ] Fix checkout cross-block: saat create checkout request, jangan hanya blok `RenewRequestStatus.PENDING`.
- [ ] Active renewal statuses yang harus memblokir checkout:
  - [ ] `PENDING`;
  - [ ] `PENDING_DECISION`;
  - [ ] `AWAITING_DP`;
  - [ ] `DP_SECURED`.
- [ ] Pastikan renew create sudah memblokir checkout `PENDING`; jika checkout punya status baru nanti, sync helper-nya.
- [ ] Ekstrak helper domain:
  - [ ] `isActiveRenewRequestStatus(status)`;
  - [ ] `isActiveCheckoutRequestStatus(status)`.
- [ ] Renewal DP flow:
  - [ ] DP invoice harus `PAID` sebelum `DP_SECURED`;
  - [ ] payment `paidAt` setelah `downPaymentDueDate` ditolak;
  - [ ] settlement invoice harus `PAID` sebelum `COMPLETED`;
  - [ ] settlement setelah H+7 ditolak/forfeit.
- [ ] Deposit ledger:
  - [ ] jalankan reconciliation lite sebelum go-live;
  - [ ] `mismatchCount` harus 0 atau ada daftar backfill manual owner;
  - [ ] backfill tetap dry-run sampai owner approve.
- [ ] Tambah UAT:
  - [ ] renewal aktif lalu checkout ditolak;
  - [ ] checkout pending lalu renew ditolak;
  - [ ] DP renew telat ditolak;
  - [ ] settlement telat tidak finalize.

**Gate:** tidak ada dua lifecycle request aktif yang saling bertentangan pada stay yang sama.

#### W-05 — AutoOps Job Ownership & Idempotency

**Target:** `auto-ops.controller.ts`, `auto-ops.service.ts`, `backend/src/modules/auto-ops/sweeps/*`, accounting/expense/asset services yang dipanggil AutoOps.

- [ ] Hapus dukungan cron token via query `?token=...`; token hanya boleh lewat header `X-Cron-Token`.
- [ ] Pastikan token tidak pernah masuk log.
- [ ] Review semua manual AutoOps endpoint:
  - [ ] room healer;
  - [ ] booking expiry;
  - [ ] renewal sweep;
  - [ ] depreciation;
  - [ ] recurring expense drafts;
  - [ ] period close/backfill;
  - [ ] notification pruning.
- [ ] Tentukan endpoint finance-heavy OWNER-only atau tetap OWNER/ADMIN.
- [ ] Tambahkan idempotency/concurrency guard:
  - [ ] job yang sama tidak boleh berjalan paralel di satu instance;
  - [ ] multi-instance production butuh DB lock/advisory lock atau catatan risiko.
- [ ] AutoOps tidak boleh membuat jurnal/expense duplikat saat retry.
- [ ] AutoOps booking/room healer harus mengikuti Fase V: tidak ada dependensi ke `RoomStatus.BOOKING`.

**Gate:** cron aman dari token leak; job retry tidak menggandakan efek uang/room.

#### W-06 — Upload & Media Registry Lintas Modul

**Target:** payment proof, refund proof, ticket images, staff field reports, staff routines, announcements, room images, marketing assets, facility images, KTP/profile images.

- [ ] Inventaris semua endpoint upload:
  - [ ] path API;
  - [ ] public/protected;
  - [ ] max size;
  - [ ] magic-byte validation;
  - [ ] owner user/entity;
  - [ ] kapan file boleh diattach ke entity final.
- [ ] Jangan percaya `fileKey`, `fileUrl`, `mimeType`, `size`, atau `originalFilename` dari client.
- [ ] Untuk protected upload, file harus punya status `PENDING_ATTACH` milik uploader.
- [ ] Saat attach ke payment/ticket/staff report/routine, server harus verifikasi file milik user atau role sah.
- [ ] Setelah attach, file pindah status ke `ATTACHED` dan entity id tercatat.
- [ ] Staff field report dan routine tidak boleh menerima arbitrary external `photoUrl` sebagai bukti final tanpa validasi.
- [ ] Marketing/facility upload harus parity dengan ticket image: magic-byte, extension dari signature, random filename, delete temp saat invalid.
- [ ] Public static room images wajib no-sniff dan hanya image valid.
- [ ] Buat cleanup orphan upload yang aman:
  - [ ] hanya hapus file pending lama;
  - [ ] jangan hapus file yang sudah attached walau entity belum terbaca karena race.

**Gate:** file tenant/staff lain tidak bisa dipakai sebagai proof; MIME spoof ditolak di semua upload utama.

#### W-07 — Finance & Accounting Operational Controls

**Target:** `accounting.controller.ts`, `finance.controller.ts`, `expenses.controller.ts`, `invoice-payments`, `invoices`, `wifi-sales`, `assets`, `deposit-ledger`, `reports`.

- [ ] Audit semua mutasi uang/akuntansi:
  - [ ] invoice create/issue/cancel;
  - [ ] invoice payment create/update/delete;
  - [ ] expense create/update/delete/confirm;
  - [ ] wifi sale create/update/delete;
  - [ ] asset depreciation;
  - [ ] COA/cash account setup;
  - [ ] period close/reopen;
  - [ ] deposit settlement/backfill.
- [ ] Default rekomendasi:
  - [ ] OWNER-only untuk COA/cash account/period close/reopen/depreciation/backfill;
  - [ ] OWNER/ADMIN untuk operasional invoice/payment/expense harian bila owner setuju.
- [ ] Pastikan data yang sudah terjurnal tidak diedit langsung; gunakan reversal/correction.
- [ ] Reconciliation readiness:
  - [ ] trial balance balanced;
  - [ ] deposit ledger `ready=true`;
  - [ ] no stranded journal queue;
  - [ ] no invoice paid tanpa payment row;
  - [ ] no payment approved tanpa journal bila flow wajib blocking.
- [ ] Review warisan best-effort auto journal lama:
  - [ ] tentukan tetap best-effort + reconciliation;
  - [ ] atau upgrade blocking untuk source uang tertentu.

**Gate:** laporan keuangan tidak bergantung pada mutasi silent-fail yang tidak terdeteksi.

#### W-08 — Inventory, Staff, Ticket Boundary

**Target:** `tickets.service.ts`, `staff-field-reports.service.ts`, `staff-routines.service.ts`, `inventory-items.service.ts`, `inventory-movements.service.ts`, `room-items`.

- [ ] Pertahankan batas: inventory movement resmi hanya OWNER/ADMIN.
- [ ] STAFF update inventory/item status harus tetap "laporan lapangan", bukan mutasi stok final.
- [ ] Staff routine:
  - [ ] putuskan apakah staff boleh start/complete routine untuk `roomId` bebas tanpa assignment;
  - [ ] jika tidak, wajib restrict ke assignment aktif atau template area yang memang global;
  - [ ] rapikan formatting `let assignment ... if` di `complete()` agar tidak membingungkan maintenance.
- [ ] Ticket:
  - [ ] STAFF hanya bisa start/mark-done tiket assigned atau tiket yang ia ambil sesuai aturan;
  - [ ] STAFF hanya boleh close `CHECKOUT_INSPECTION`;
  - [ ] TENANT hanya bisa close tiket miliknya yang sudah `DONE`.
- [ ] Ticket image:
  - [ ] upload magic-byte sudah ada, tapi binding upload->ticket harus masuk W-06 registry;
  - [ ] image access tetap via relasi ticket/tenant/staff/admin.
- [ ] Staff field report:
  - [ ] `photoUrl/fileKey` harus divalidasi terhadap registry upload;
  - [ ] laporan ke barang/kamar harus membuat ticket/report idempotent;
  - [ ] tidak boleh mengubah status final barang tanpa admin review.

**Gate:** staff bisa bekerja cepat, tetapi tidak bisa mengubah stok/uang/status final tanpa jalur review yang jelas.

#### W-09 — Frontend State, Route, Copy, dan XSS Surface

**Target:** `frontend/src/App.tsx`, `AuthContext.tsx`, `api/client.ts`, `utils/statusLabels.ts`, `utils/publicRoomDisplay.ts`, semua halaman public/tenant/admin/staff yang terkait V/W.

- [ ] Code-search raw HTML harus tetap kosong:
  ```powershell
  rg -n "dangerouslySetInnerHTML|innerHTML|outerHTML|eval\(|new Function" frontend/src
  ```
- [ ] Dokumentasikan risiko token di `localStorage`; jangan tambah raw HTML sebelum strategi token berubah.
- [ ] Pastikan semua route protected sesuai role:
  - [ ] Owner-only;
  - [ ] Owner/Admin;
  - [ ] Staff;
  - [ ] Tenant.
- [ ] `statusLabels.ts`:
  - [ ] `RESERVED` tidak boleh berarti "Lunas";
  - [ ] label DP/lunas berasal dari invoice/payment;
  - [ ] legacy `BOOKING` hanya ditampilkan jika data lama masih ada.
- [ ] External link audit:
  - [ ] jika ada `target="_blank"`, wajib `rel="noopener noreferrer"`;
  - [ ] no `window.open` tanpa noopener.
- [ ] File preview:
  - [ ] revoke object URL saat modal/preview ditutup;
  - [ ] jangan simpan file blob di state global.
- [ ] Copy public/tenant tidak boleh menjanjikan kamar terkunci sebelum payment approved.

**Gate:** FE tidak membuka XSS surface baru dan copy status tidak menyesatkan pembayaran/booking.

#### W-10 — Public & Marketing Surface Hardening

**Target:** `public-bookings`, `public-rooms`, `settings/public-config`, marketing assets, `PublicRoomsPage`, `PublicRoomDetailPage`, `GuestBookingForm`, `RichAvailabilityCalendar`.

- [ ] Public config tidak boleh expose secret, token, internal email placeholder, atau operational data sensitif.
- [ ] Harga/fasilitas public boleh tampil, tapi data tenant aktif tidak boleh bocor.
- [ ] Public room detail untuk `RESERVED/OCCUPIED`:
  - [ ] tidak punya CTA booking aktif;
  - [ ] deep link tetap menampilkan status benar;
  - [ ] form submit backend tetap menolak.
- [ ] Availability calendar harus membedakan:
  - [ ] available;
  - [ ] unpaid booking interest;
  - [ ] reserved DP;
  - [ ] reserved paid;
  - [ ] occupied;
  - [ ] maintenance.
- [ ] Marketing/facility image upload ikut W-06.
- [ ] Public booking phone/email fix ikut V-05.

**Gate:** public surface tidak bisa membuat booking/payment yang melanggar state backend.

#### W-11 — Observability, Logs, Release Readiness

**Target:** `backend/scripts`, root `scripts`, health endpoints, deployment docs, seed scripts, CI/manual commands.

- [ ] Buat checklist release dry-run:
  - [ ] `cd backend; npm.cmd run build`;
  - [ ] `cd backend; npm.cmd run test:unit`;
  - [ ] `cd backend; npm.cmd run test:integration`;
  - [ ] `cd frontend; npm.cmd run build`;
  - [ ] `cd frontend; npm.cmd run test:e2e` bila browser environment siap;
  - [ ] `cd frontend; npm.cmd run test:a11y` bila browser environment siap.
- [ ] Seed/reset dev harus jelas untuk UAT booking/payment/check-in.
- [ ] DB release:
  - [ ] backup sebelum migration/db push;
  - [ ] daftar enum/data cleanup;
  - [ ] rollback plan;
  - [ ] smoke test setelah deploy.
- [ ] Logs:
  - [ ] tidak log JWT/password/token cron;
  - [ ] NIK/payment proof filename tidak muncul di log publik;
  - [ ] error production tidak mengirim stack trace ke client.
- [ ] Health/readiness:
  - [ ] DB reachable;
  - [ ] Prisma schema ready;
  - [ ] upload dir writable;
  - [ ] accounting readiness;
  - [ ] AI key optional status aman.

**Gate:** ada satu daftar perintah release yang bisa diikuti tanpa menebak.

#### W-12 — Documentation Hygiene & Source of Truth

**Target:** semua `docs/M*.md`, `docs/CODEMAP.md`, README/deploy docs bila ada.

- [ ] M10 tetap menjadi checklist aktif satu-satunya.
- [ ] M11 hanya changelog ringkas, bukan task aktif.
- [ ] M09 hanya audit/finding, bukan instruksi eksekusi utama.
- [ ] M03/M04/M05 harus punya override terbaru untuk booking/payment/check-in.
- [ ] CODEMAP harus menunjuk modul aktual untuk:
  - [ ] payment submissions;
  - [ ] tenant/public bookings;
  - [ ] stays/check-in/renew/checkout;
  - [ ] auto-ops;
  - [ ] upload/media;
  - [ ] accounting/finance;
  - [ ] staff/tickets/inventory.
- [ ] Hapus atau arsipkan file MD liar di root yang menduplikasi M10.
- [ ] Tambahkan "jangan ikuti narasi lama" bila dokumen historis masih menyebut flow lama.

**Gate:** AI eksekutor baru cukup baca M10 + M-file terkait dan tidak tersesat ke checklist lama.

#### W-13 — Manual UAT Matrix per Role

**Target:** public browser, tenant portal, staff portal, admin workspace, owner workspace.

- [ ] Public guest:
  - [ ] katalog room available;
  - [ ] detail room reserved tidak bisa booking;
  - [ ] booking phone-only;
  - [ ] booking invalid phone ditolak;
  - [ ] upload proof DP.
- [ ] Tenant:
  - [ ] login portal;
  - [ ] lihat booking unpaid;
  - [ ] bayar DP;
  - [ ] DP approved tampil reserved-DP;
  - [ ] full payment tampil siap check-in;
  - [ ] tenant lain tidak bisa lihat invoice/proof.
- [ ] Staff:
  - [ ] lihat task/ticket assigned;
  - [ ] start satu pekerjaan saja;
  - [ ] upload foto valid;
  - [ ] MIME spoof ditolak;
  - [ ] tidak bisa akses finance sensitif bila sudah diputuskan.
- [ ] Admin:
  - [ ] review payment DP/lunas;
  - [ ] check-in hanya jika lunas;
  - [ ] renewal/checkout cross-block;
  - [ ] ticket close guard;
  - [ ] inventory report review.
- [ ] Owner:
  - [ ] accounting readiness;
  - [ ] period close/backfill guard;
  - [ ] AI status/usage aman;
  - [ ] role matrix final.

**Gate:** UAT ditulis sebagai hasil nyata di changelog, bukan sekadar "build lulus".

---

### Enhancement — Survei Kepuasan Penghuni ✅ SELESAI (2026-06-24)

**Cakupan:** timing gate 30 hari, re-submit 6 bulan, halaman owner `/admin/surveys`, ringkasan di dashboard admin.

- [x] **SV-01** Backend: `mineExists()` gate 30 hari stay aktif + re-submit 6 bulan. File: `backend/src/modules/surveys/surveys.service.ts`.
- [x] **SV-02** Frontend: `SatisfactionSurveyCard` handle 4 state (belum eligible / cooldown / re-submit / fresh). File: `frontend/src/components/tenant/SatisfactionSurveyCard.tsx`.
- [x] **SV-03** Frontend: halaman baru `AdminSurveysPage` — daftar survei, ringkasan agregat, filter rating, komentar. Route `/admin/surveys` (OWNER/ADMIN).
- [x] **SV-04** Frontend: nav item "Survei Penghuni" di sidebar admin + route title + ringkasan di dashboard admin overview.
- [x] **SV-05** Gate build: backend `tsc --noEmit` lulus, frontend `vite build` lulus.

---

### Fase A — Pra-Go-Live Produksi

**Tujuan:** aplikasi siap publish bersih, tanpa data UAT/testing.  
**Rujukan:** `docs/M08_DEPLOY_GO_LIVE.md` · `backend/.env.production.example`.

- [ ] **A1 / F1-12** 🧑 Owner konfirmasi VPS/cPanel, domain, HTTPS, PostgreSQL prod 5432, env rahasia siap.
- [ ] **A2** Fresh provision: DB kosong → `prisma db push` → bootstrap.sql + addendum → OWNER pertama → seed COA/periode/cash account.
- [ ] **A3** Set env produksi wajib: `NODE_ENV=production`, JWT secret kuat, CORS domain final, VAPID keys, `KTP_ACTIVATION_GATE_ENABLED=true`.
- [ ] **A4** Ganti password OWNER dummy/dev ke password real sebelum dipakai owner.
- [ ] **A5** Isi opening balance bila ada modal/saldo awal; kalau mulai nol, dokumentasikan zero-start.
- [ ] **A6** Smoke test prod: login OWNER, public rooms 200, trial balance balanced, recon mismatch 0, readiness tanpa blocker merah.
- [x] **A7** `backend/package.json` sudah punya `pretest:unit = npm run build` — test unit pakai `dist` segar.
- [x] **A8** Hardening hasil audit DEEP-01..05 selesai; HSTS dan `Permissions-Policy: camera=(self)` sudah masuk changelog.

**Gate:** `docs/M08_DEPLOY_GO_LIVE.md §3` smoke PASS. **Jangan** backfill data UAT ke produksi.

---

### Fase B — Publik & Portal Tenant ✅ SELESAI

**Key files:** `PublicGuestDashboardPage`, `GuestBookingForm`, `MyStayPage`, `marketing-public-rooms.service.ts`, `additional-services`, `marketing-assets`.  
**Cakupan selesai:** public UI, smart booking (filter range), kalender ketersediaan, foto kamar/fasilitas owner-managed, aset brosur slot-based, WiFi portal tenant, meter jadwal + catat mandiri, profil + foto KTP sebagai avatar.

---

### Fase C — Workspace Owner/Admin ✅ SELESAI

**Key files:** `AppLayout.tsx`, `navigation.ts`, `RoleWorkspaceTabs.tsx`, `OwnerDashboardPage`, `DashboardAdmin`, `02-layout.css`, `12-owner.css`.  
**Cakupan selesai:** toggle Owner↔Admin segmented control, sidebar context-aware, breadcrumb root per mode, route `/owner-dashboard`+`/admin-dashboard` split, status kokpit 4 kartu (ocupansi/tunggakan/meter/readiness), inventaris shell 3 tab.

---

### Fase D — Operasional Staff & Gudang ✅ SELESAI

**Key files:** `DashboardStaff.tsx`, `StaffMotivationDashboard.tsx`, `inventory-items`, `WifiOrderPage`, `tickets`.  
**Cakupan selesai:** role scope ketat staf (no tarif/KTP leak), gudang FK `inventoryItemId`, StaffMeterStatusPanel, WiFi order flow (ServiceInterest→WifiSale), tip flow P2P, staff theme mobile.

---

### Fase E — Polish & Teknis ✅ SELESAI

**Key files:** `auto-ops/sweeps/` (5 sub-service), `stays-renewal.service.ts`, `test/integration/`, `frontend/e2e/`, `docs/FASE_E_EVALUASI_ARSITEKTUR.md`.  
**Cakupan selesai:** split auto-ops.service.ts (1819→235 baris + 5 sweep service), split stays renewal, integration test TC1-TC4, E2E Playwright (public/booking/portal), leaderboard kebersihan anonim, eval arsitektur (refresh token MEDIUM, CSP LOW, WA LOW, event-bus VERY LOW).

---

### Fase F — UI/UX Sweep ✅ SELESAI

**Key files:** `NotFoundPage.tsx`, `ToastProvider.tsx`, `PasswordInput.tsx`, `AppLayout.tsx`, `01-base.css`.  
**Cakupan selesai (10 task):** UX-404, UX-TOAST, UX-A11Y (SVG password + skip-link), UX-COLOR (kontras AA `#475569`), UX-LOGOUT (confirm), UX-SEARCH-TENANT, UX-SKELETON, UX-OVERSCROLL, UX-LOGIN-FORMAT.

---

### Fase G — AI Owner/Admin Approval Copilot ✅ SELESAI

**Key files:** `backend/src/modules/owner-ai/` (15 file), `backend/src/modules/market-analysis/deepseek.client.ts`, `frontend/src/components/ai/`.  
**Cakupan selesai (G0-G9):**
- G0: Safety foundation — model env, rate-limit, hash, env guard, `/owner-ai/status`
- G1: Owner brief — `POST /owner-ai/brief`, snapshot bisnis, `AiResultPanel`
- G2: Finance analyst — `POST /owner-ai/finance/analyze`, `deepseek-v4-pro`, fallback
- G3: Payment review — `POST /owner-ai/payment-submissions/:id/review-draft`, no-partial guard before AI
- G4: Expense OCR draft — OCR browser (tesseract.js) → normalize → `POST /owner-ai/expenses/receipt-draft`
- G5: KTP OCR validator — `POST /owner-ai/tenants/:id/ktp-ocr-validate`, PDP: teks only, NIK ter-mask
- G6: Ops/inventory AI — 3 endpoint: tiket action, reorder, field report review
- G7: Settings & budget — `GET /owner-ai/usage`, `POST /owner-ai/test-connection`, tab "AI & Biaya"
- G8: FAQ/manual generator — `POST /owner-ai/faqs/generate-draft`, draft-only, no auto-overwrite
- G9 🧬: AiDraft queue — schema S-6, `ai-draft.service.ts`, tab "Antrean Draft AI"

**Kontrak global wajib dijaga (lihat `docs/M12_AI_OWNER_ADMIN.md`):**
- Manual button only — tidak ada AI auto-trigger dari page-load/cron/prefetch
- OWNER/ADMIN only — STAFF/TENANT tidak lihat tombol AI
- Draft saja — AI tidak langsung mutasi data; aksi final tetap tombol domain existing
- No-partial, TB, deposit guard deterministik MENANG atas rekomendasi AI

---

### Fase H — UI/UX Compact Owner↔Admin ✅ SELESAI

**Key files:** `navigation.ts`, `DashboardAdmin.tsx`, `RoleWorkspaceTabs.tsx`, `OwnerDashboardPage.tsx`, `12-owner.css`, `08-admin.css`.  
**Rujukan:** `docs/archieve/2026-06-20_fase_selesai/M13_FASE_H_UIUX_COMPACT.md`.  
**Cakupan selesai:** H1 sidebar owner 18→7 (grup "Keputusan Owner"), H2 dashboard admin 6→3 tab (Ringkasan/Penghuni&Uang/Operasional), H3 merge Minat→Layanan via activePaths, H4 AiAssistButton di DashboardAdmin + AssistantPanel di OwnerDashboard, H5 tren chart tersembunyi di mode Ringkas + quick-action buttons, H6 hapus CSS dead (08-admin.css).

---

### Fase I — Navigasi & Onboarding ✅ SELESAI

**Key files:** `DashboardAdmin.tsx`, `StaffTopWorkspaceNav.tsx`, `navigation.ts`, `AppLayout.tsx`, `GettingStartedGuide.tsx`.  
**Rujukan:** `docs/archieve/2026-06-20_fase_selesai/M14_FASE_I_NAVIGASI_ONBOARDING.md`.  
**Cakupan selesai:** I1 hapus AdminAreaInternalMenu (duplikasi sidebar 20+ chip), I2 unifikasi StaffTopWorkspaceNav dari `staffSections`, I3 ekspos `/meter-readings` ke activePaths sidebar, I4 GettingStartedGuide tenant baru (browsing/booking/occupied), I5 breadcrumb segmen pertama klik, I6 guide strip adaptif (verified no-op).

---

### Fase J — Hardening AI Pra-Go-Live ✅ SELESAI

**Key files:** `owner-ai.helpers.ts`, `backend/test/unit/owner-ai-safety.test.js`, `AiAssistButton.tsx`, `AiResultPanel.tsx`, `docs/M09_AUDIT.md`.  
**Rujukan:** `docs/archieve/2026-06-20_fase_selesai/M15_FASE_J_HARDENING_AI.md`.  
**Cakupan selesai:** J0 ekstrak guard murni → `owner-ai.helpers.ts`, J1 unit test `owner-ai-safety.test.js` (≥18 assert PDP+uang), J2 guard no-partial AI sadar DP/FULL/SETTLEMENT, J3 FE error non-blocking + gating role/configured, J4 audit 12 endpoint owner-ai dibukukan di M09.

---

### Fase K — Pasca-Audit Total ✅ SELESAI

**Key files:** berbagai — lihat `docs/archieve/2026-06-20_fase_selesai/M16_PASCA_AUDIT_PLAN.md`.  
**Cakupan selesai (13 task, commit `ac4cc2f`):** P1-P3 keamanan (RolesGuard, DTO multipart, hapus STAFF dari 11 endpoint), P5-P6 circuit breaker DeepSeek + advisory lock, Q1-Q5 data integrity (resolveRent unifikasi, merge helpers, @unique NIK, @index, deposit handling), R1-R5 CSS tokens, unifikasi arus kas, DeepSeek UI Settings, error handling + dead code.

---

### Fase L — UI/UX Audit Menyeluruh ✅ SELESAI

**Rujukan utama:** `docs/archieve/M17_FASE_L_UIUX_AUDIT.md`  
**Spec detail (before/after kode nyata):** `docs/archieve/fase-l-specs/`
- `L01_L03_loading_error_mobile.md` — L-01..L-03
- `L04_L07_wizard_balance_guest_auth.md` — L-04..L-07
- `L08_L11_public_dashboard_tenant_reports.md` — L-08..L-11
- `L12_L15_enum_staff_stays_tenant.md` — L-12..L-15
- `L16_L20_accounting_a11y_empty_asset_minor.md` — L-16..L-20

**Gate umum:** `cd frontend; npm run build` ✅ setelah tiap task. Tidak ada perubahan backend/schema.

**Task yang sudah selesai:** L-01, L-02, L-03, L-04, L-05(SKIP), L-06, L-07, L-08, L-09, L-10, L-11, L-12, L-13, L-14, L-15, L-16, L-17, L-18, L-19, L-20.

#### L-08 🟡 — PublicRoomsPage: 5 Perubahan Nyata

- [x] **L-08** `PublicRoomsPage.tsx`: (1) carousel auto-rotate: tambah guard `if (isTouchDevice) return` agar tidak rotate otomatis di mobile. (2) compare counter: ubah `{compareList.length} kamar dipilih` → `{compareList.length}/3 kamar dipilih` + warna merah saat 3. (3) filter toggle mobile: button "Filter" toggle `showFilter` state + class `d-md-none` pada button, `d-none d-md-block` pada filter bar. (4) CSS animasi collapse/expand filter. (5) pagination ellipsis: ganti `Array.from({length: totalPages})` dengan fungsi `1 … X X+1 … N` saat `totalPages > 7`.
  - **Spec detail:** `docs/fase-l-specs/L08_L11_public_dashboard_tenant_reports.md` § L-08
  - **Anchor grep:** `hovered` (carousel) · `compareList.length` · `rm-filter-bar` · `Array.from.*totalPages`
  - **Gate:** `cd frontend; npm run build` ✅ · test compare counter · test filter mobile 375px

#### L-10 🟡 — MyTicketsPage: Image Lightbox + WifiOrderPage: WhatsApp Hardcode

- [x] **L-10** (a) `MyTicketsPage.tsx`: tambah `onClick` ke `SafeImage` untuk foto issue dan resolution → buka modal Bootstrap dengan `<img>` full-size. Tambah `useState` untuk `lightboxSrc` dan `Modal` dari react-bootstrap. (b) `WifiOrderPage.tsx`: ada nomor WA hardcoded di 2 tempat (const baris 7 + teks baris 96) — konsolidasi ke 1 const `KOST_WHATSAPP_NUMBER` dan gunakan const di baris 96.
  - **Spec detail:** `docs/fase-l-specs/L08_L11_public_dashboard_tenant_reports.md` § L-10
  - **Anchor grep:** `SafeImage` (MyTicketsPage) · nomor WA hardcoded (WifiOrderPage baris 7 dan 96)
  - **Gate:** `cd frontend; npm run build` ✅

#### L-11 🟡 — UnlockedFormalReports: Lazy + Suspense + Skeleton

- [x] **L-11** `ReportsPage.tsx` atau parent yang render `UnlockedFormalReports`: bungkus dengan `React.lazy` + `<Suspense fallback={<TableSkeleton rows={8} />}>`. Verifikasi `UnlockedFormalReports` diekspor sebagai **default export** sebelum membuat lazy import.
  - **Spec detail:** `docs/fase-l-specs/L08_L11_public_dashboard_tenant_reports.md` § L-11
  - **Anchor grep:** `UnlockedFormalReports` (import + render di ReportsPage)
  - **Gate:** `cd frontend; npm run build` ✅

#### L-16 🟢 — AccountingSetupPage: Checklist Bertahap di Atas Halaman

- [x] **L-16** `AccountingSetupPage.tsx`: tambah komponen `<AccountingSetupChecklist />` (file baru atau inline) di atas halaman — sebelum section pertama. Baca state dari queries yang **sudah ada** di halaman (period, COA, readiness) — jangan tambah query baru. Tampilkan checklist: ① COA terisi → ② Periode aktif → ③ Opening Balance → ④ Siap catat transaksi.
  - **Spec detail:** `docs/fase-l-specs/L16_L20_accounting_a11y_empty_asset_minor.md` § L-16
  - **Anchor grep:** baca awal `AccountingSetupPage.tsx` untuk nama query yang sudah ada
  - **Gate:** `cd frontend; npm run build` ✅

---

### Fase M — Quick Wins: Aksesibilitas & Polish (P0 Audit)

**Tujuan:** 6 perbaikan dampak tinggi, usaha rendah — hasil audit UI/UX 20 Juni 2026 §9 P0.
**Rujukan:** `docs/archieve/2026-06-20_fase_selesai/audit-uiux-2026-06-20.md` §3–§4, §9.
**Strategi:** tidak ada dependensi baru. Masing-masing task independen — bisa paralel.

- [x] **M-01 — Ganti `window.location.assign` → `useNavigate()` (2 tempat)**
  **Target:** `frontend/src/pages/dashboard/AdminWorkspaces.tsx` baris 97.
  **Aksi:**
  1. Tambah `import { useNavigate } from 'react-router-dom';` di atas file.
  2. Di dalam komponen `AdminStaffFrontlineList`, tambah `const navigate = useNavigate();` sebelum return.
  3. Ganti baris 97: `onClick={() => window.location.assign('/staff-performance')}` → `onClick={() => navigate('/staff-performance')}`.
  4. **JANGAN ubah** `frontend/src/api/client.ts` baris 18 — itu axios interceptor di luar React context, `window.location.assign('/login')` untuk 401 sudah benar.
  **Anchor grep:** `window.location.assign`
  **Gate:** `cd frontend; npm run build` ✅ · klik baris staff di `/admin-dashboard` → tidak reload penuh.

- [x] **M-02 — Buat `ConfirmProvider` + `useConfirm()` + ganti 9 `window.confirm`**
  **Pola final (keputusan owner 2026-06-20):** context + promise — pemakaian cukup `const ok = await confirm({...})`, TANPA state per-file. Kode provider lengkap ada di arsip `docs/archieve/deprecated_dossiers/_DEPRECATED_M18_FASE_M_FRONTEND_UX.md` §M-1.
  **Aksi:**
  1. Buat file BARU `frontend/src/components/common/ConfirmProvider.tsx`:
     - Export `ConfirmProvider` + hook `useConfirm(): (opts) => Promise<boolean>`.
     - `ConfirmOptions`: `{ title; message; confirmLabel?; cancelLabel?; variant?: 'danger'|'warning'|'primary' }`.
     - Internal: `useState` (open + opts) + `useRef` resolver; render SATU `<Modal>` react-bootstrap. Tombol Ya → `resolve(true)`; Batal/close → `resolve(false)`.
  2. Daftarkan di `frontend/src/main.tsx`: bungkus `<App/>` dengan `<ConfirmProvider>` (di dalam `<ToastProvider>`).
  3. Ganti **9 pemakaian `window.confirm`** → handler `async` dengan `const ok = await confirm({...}); if (!ok) return;`:
     | # | File | Baris | Judul / variant dialog |
     |---|------|-------|------------------------|
     | 1 | `AppLayout.tsx` | 213 | "Keluar" (danger) — hapus fungsi lama `handleLogout`, pakai `handleLogoutClick` async di 2 tombol Logout |
     | 2 | `FacilityManager.tsx` | 371 | "Hapus Fasilitas" (danger) |
     | 3 | `TenantProfilePhotoCard.tsx` | 40 | "Hapus Foto Profil" (danger) |
     | 4 | `MyStayPage.tsx` | 723 | "Minat layanan" (primary) |
     | 5 | `WifiOrderPage.tsx` | 68 | "Pesan WiFi" (primary) |
     | 6–9 | `OwnerSettingsPage.tsx` | 67, 176, 406, 543 | "Hapus Foto Fasilitas" / "Hapus Aset Marketing" / "Hapus FAQ" / "Hapus Foto Kamar" (danger) |
  **Anchor grep:** `window.confirm` · `useConfirm`
  **Gate:** `cd frontend; npm run build` ✅ · `grep -r "window.confirm" src/` → 0 hasil · test 2–3 dialog: modal muncul, Ya/Batal berfungsi.

- [x] **M-03 — Global `prefers-reduced-motion` block**
  **Target:** `frontend/src/styles/01-base.css` — tambah di akhir file.
  **Aksi:**
  1. Buka `01-base.css`, tambah blok berikut di akhir file:
     ```css
     @media (prefers-reduced-motion: reduce) {
       *,
       *::before,
       *::after {
         animation-duration: 0.01ms !important;
         animation-iteration-count: 1 !important;
         transition-duration: 0.01ms !important;
         scroll-behavior: auto !important;
       }
     }
     ```
  2. **(Opsional — task terpisah):** audit animasi non-esensial dan bungkus dalam `@media (prefers-reduced-motion: no-preference) { ... }`. Tapi global reset di atas sudah cukup untuk P0.
  **Anchor grep:** `prefers-reduced-motion`
  **Gate:** `cd frontend; npm run build` ✅ · tidak rusak UI.

- [x] **M-04 — Perbaiki font `Cormorant Garant` → `Cormorant Garamond` + hapus font tak termuat**
  **Target:** `frontend/src/styles/01-base.css` baris 1, `11-public-pages.css` (10 lokasi), `00-tokens.css` baris 22.
  **Aksi:**
  1. `01-base.css` baris 1: ganti `Cormorant+Garant` → `Cormorant+Garamond` di URL `@import`.
  2. `11-public-pages.css`: **search & replace semua** `'Cormorant Garant'` → `'Cormorant Garamond'` (10 kemunculan: ~baris 1800, 1824, 2000, 2066, 2101, 2170, 2245, 2328, 2669, dst).
  3. `00-tokens.css` baris 22: `--font-data: 'DM Mono', ...` — komentari atau hapus karena DM Mono/DM Sans tidak di-`@import`. Ganti fallback ke `'JetBrains Mono', monospace` (font ini sudah di-load di baris 1).
  **Anchor grep:** `Cormorant Garant` · `DM Mono`
  **Gate:** `cd frontend; npm run build` ✅ · cek `01-base.css` URL valid → `Cormorant+Garamond`.

- [x] **M-05 — Ekstrak `<ClickableRow>` aksesibel + pasang di 10 file**
  **Target:** Buat komponen BARU, pakai di 10 file yang punya `<tr className="clickable-row">` tanpa a11y.
  **Aksi:**
  1. Buat file BARU `frontend/src/components/common/ClickableRow.tsx` — **pola yang MENJAGA semantik baris tabel** (jangan pasang `role="button"` di `<tr>` karena menghapus peran "row" dari a11y tree — temuan audit A3):
     - Props: `onClick: () => void`, `children: React.ReactNode`, `label: string` (nama aksesibel, mis. "Buka detail Budi"), `className?: string`.
     - **Direkomendasikan:** `<tr>` TANPA `role`/`tabIndex` (tetap baris biasa) + `onClick` untuk kemudahan mouse. Keyboard + nama aksesibel diletakkan pada SATU kontrol fokusabel di sel pertama: `<button type="button" className="row-open-btn stretched-link" aria-label={label} onClick={onClick}>`. Menjaga semantik tabel sekaligus aksesibel.
     - **Kompromi minimal** (bila refactor sel berat): pertahankan `tabIndex={0}` + `onKeyDown` (Enter/Space) di `<tr>` TAPI gunakan `role="row"` (bukan `button`) + `aria-label={label}` — tetap lebih baik dari `role="button"`.
     - Catatan: `ResourceTable.tsx` baris 344–356 saat ini masih `role="button"` di `<tr>` — selaraskan ke pola baru sebagai task lanjutan (opsional, jangan blokir M-05).
  2. Pasang di **6 file** yang belum aksesibel (cari dengan grep `className="clickable-row"`):
     | # | File | Baris | Ganti |
     |---|------|-------|-------|
     | 1 | `AdminWorkspaces.tsx` | 97, 186, 253, 316, 411, 421 | 6 `<tr className="clickable-row" onClick={...}>` → `<ClickableRow onClick={...}>` |
     | 2 | `AncillaryRevenuePage.tsx` | 95 | idem |
     | 3 | `InvoicesPage.tsx` | 501 | idem |
     | 4 | `TicketsPage.tsx` | 731 | idem |
     | 5 | `SmartChartPanel.tsx` | 120 | idem (conditional `className={point.to ? 'clickable-row' : undefined}` → `<ClickableRow>` hanya saat `point.to` ada) |
  3. **JANGAN ubah** `ResourceTable.tsx`, `StaysPage.tsx`, `CompactMetrics.tsx`, `ActionQueueTable.tsx` — mereka sudah punya a11y (walaupun `CompactMetrics` & `ActionQueueTable` kurang `onKeyDown`, itu task terpisah).
  4. Ekspor `ClickableRow` dari barrel `common/index.ts` bila ada.
  **Anchor grep:** `clickable-row`
  **Gate:** `cd frontend; npm run build` ✅ · test keyboard: Tab ke baris → Enter → aksi trigger.

- [x] **M-06 — Toast aksesibel: durabilitas & peran ARIA** (audit A4)
  **Target:** `frontend/src/components/common/ToastProvider.tsx`.
  **Aksi:**
  1. Durasi default 3500ms → 6000ms, dan jadikan opsional per panggilan: `toast(message, variant, durationMs?)`.
  2. Pause auto-dismiss saat hover/focus container (clear timeout di `onMouseEnter`/`onFocus`, restart saat leave/blur).
  3. ARIA per varian: `success`/`info` → `role="status"` + `aria-live="polite"`; `danger`/`warning` → `role="alert"` + `aria-live="assertive"` (sekarang SEMUA `role="alert"`).
  4. Tombol tutup tetap `aria-label="Tutup"`.
  **Anchor grep:** `ToastProvider` · `role="alert"`
  **Gate:** `cd frontend; npm run build` ✅ · toast sukses tidak menginterupsi pembaca layar; hover menahan dismiss.

---

### Fase N — Ramping Dashboard & Navigasi (P1 Audit + Blueprint §7)

**Tujuan:** Kurangi redundansi data di Owner & Admin dashboard; satukan navigasi; pindahkan agregasi ke backend.
**Rujukan:** Audit §5–§7, blueprint penyederhanaan Admin & Owner.
**Strategi:** Kerjakan **berurutan** (N-01→N-02→...→N-06) karena tiap task bisa ubah file yang sama.

- [x] **N-01 — Ramping Owner Dashboard: hapus sinyal ganda, satukan panel AI**
  **Target:** `frontend/src/pages/dashboard/OwnerDashboardPage.tsx`.
  **Aksi:**
  1. **Hapus `OwnerActionStrip`** (komponen sinyal "butuh perhatian" yang tampil di atas dashboard) — data yang sama sudah muncul di `AssistantPanel` dan panel "Butuh perhatian" bawah. Cari render `<OwnerActionStrip` → hapus.
  2. **Hapus panel AI kedua** — cari 2 tempat render `AiResultPanel` atau `AssistantPanel` (sekitar baris ~536 "Analisis AI" dan ~589 "Ringkasan Bisnis AI"). Satukan jadi SATU tombol "Brief AI" yang membuka drawer/modal dengan hasil generate. Konsep: 1 tombol `AiAssistButton` (sudah ada) → klik → 1 drawer berisi brief.
  3. **4 KPI tile tetap** di atas (Pendapatan, Laba, Okupansi, Kas).
  4. **Satu daftar "Butuh perhatian hari ini"** — gabung 3 sumber sinyal (`OwnerActionStrip`, `AssistantPanel` sinyal, panel bawah) jadi 1 `useMemo` yang merge + dedup data. Tampilkan sebagai `<ListGroup>` ringkas.
  5. **Tren chart** — tetap di section "Lengkap" (sudah di-handle toggle compact/full).
  6. **Sisa detail** → pindahkan ke disclosure `<Accordion>` "Detail" yang collapsed default.
  **Anchor grep:** `OwnerActionStrip` · `AiResultPanel` · `generateBrief`
  **Gate:** `cd frontend; npm run build` ✅ · Owner dashboard tidak boleh ada data yang sama tampil 2×.

- [x] **N-02 — Ramping Admin Dashboard: hero tunggal = antrean kerja, health bar ringkas**
  **Target:** `frontend/src/pages/dashboard/DashboardAdmin.tsx`.
  **Aksi:**
  1. **Hero = `ActionQueueTable`** sebagai sumber kebenaran tunggal. Pindahkan ke posisi paling atas (setelah header).
  2. **Turunkan `AdminHealthChips` + `AdminContinuityStrip` lanes + `AdminTodayStatusStrip`** → jadi **satu** `<AdminHealthBar>` kompak (1 baris chip ringkas yang bisa diciutkan). Buat file BARU `frontend/src/components/command-center/AdminHealthBar.tsx`:
     - Props: data dari query yang sudah ada (rooms, stays, invoices, tickets).
     - Render: 4–5 chip inline: "⚠ 3 jatuh tempo" "📋 5 antrean" "🛏 42/48 terisi" "✅ SLA 94%".
     - Bungkus dalam `<Collapse>` Bootstrap — toggle "Sembunyikan/Tampilkan".
  3. **Hapus `admin-ops-guardrails`** (4 blok teks statis) — pindahkan ke tooltip atau hapus total.
  4. **`AssistantPanel`** — tetap, tapi jadi full-width di bawah antrean.
  **Anchor grep:** `AdminHealthChips` · `AdminContinuityStrip` · `admin-ops-guardrails` · `action-queue-table`
  **Gate:** `cd frontend; npm run build` ✅ · Admin dashboard ≤ 3 section vertikal.

- [x] **N-03 — Tambah toggle density "Ringkas/Lengkap" untuk Admin**
  **Target:** `frontend/src/pages/dashboard/DashboardAdmin.tsx` + `AdminWorkspaces.tsx`.
  **Aksi:**
  1. Di `DashboardAdmin.tsx`, tambah `const [dense, setDense] = useState(false)` + `<Button variant="outline-secondary" size="sm" onClick={() => setDense(!dense)}>📏 {dense ? 'Ringkas' : 'Lengkap'}</Button>` di header.
  2. Conditional render: saat `dense === true`, sembunyikan widget sekunder (grafik mini, tabel detail) — hanya tampilkan `ActionQueueTable` + `AdminHealthBar` + `AssistantPanel`.
  3. Di `AdminWorkspaces.tsx`, baca `dense` dari parent (prop atau context). Saat ringkas: tabel 5→3 baris, sembunyikan kolom sekunder.
  4. **Simpan preferensi ke `localStorage`** — `localStorage.setItem('admin-density', dense ? 'compact' : 'full')`, baca saat mount.
  **Anchor grep:** `DashboardAdmin` · `dense` · `compact`
  **Gate:** `cd frontend; npm run build` ✅ · toggle tidak reload halaman, preferensi tersimpan.

- [x] **N-04 — Hapus duplikasi navigasi: sidebar + tabs tetap, tapi tanpa rute ganda**
  **Target:** `frontend/src/config/navigation.ts` + `frontend/src/components/layout/RoleWorkspaceTabs.tsx`.
  **Strategi (pilihan owner):** Pertahankan sidebar DAN RoleWorkspaceTabs — keduanya tetap ada. Tapi **tidak boleh ada rute yang bisa dijangkau dari kedua jalur.**
  **Aksi:**
  1. **Baca dulu:** `navigation.ts` (daftar sidebar: 6 item Admin, 7 item Owner) dan `RoleWorkspaceTabs.tsx` (daftar tab: 3 tab per mode).
  2. **Cross-check duplikasi:** buat tabel: kolom "Rute tujuan sidebar" vs "Rute tujuan tab". Tandai yang muncul di KEDUA sisi.
  3. **Hapus dari tab** setiap rute yang SUDAH ada di sidebar. Contoh: bila sidebar punya item "Stays" → `/stays`, dan tab juga punya tab menuju `/stays` → hapus tab itu dari `RoleWorkspaceTabs`. Biarkan tab hanya berisi rute yang TIDAK ada di sidebar (mis. `/admin-dashboard` dengan filter area tertentu).
  4. **Untuk tab yang tersisa:** pastikan navigasi tetap pakai `navigate()` react-router (bukan reload penuh).
  5. **Verifikasi:** cek semua rute — setiap halaman hanya bisa dijangkau dari SATU jalur (sidebar atau tab, tidak keduanya).
  **Anchor grep:** `navigation.ts` · `RoleWorkspaceTabs` · `to:` · `path:`
  **Gate:** `cd frontend; npm run build` ✅ · inspeksi manual: tidak ada rute yang muncul di sidebar DAN tab sekaligus.

- [x] **N-05 — Pindahkan agregasi dashboard ke backend**
  **Target:** Backend: buat endpoint agregat BARU. Frontend: ganti komputasi klien dengan query.
  **Aksi:**
  1. **Backend — endpoint baru** `GET /api/admin/dashboard/aggregate`:
     - Controller: `backend/src/modules/admin/admin-dashboard.controller.ts` (buat bila belum ada).
     - Service: `backend/src/modules/admin/admin-dashboard.service.ts`.
     - Return satu objek JSON: `{ health: { pendingRenew, overdueInvoices, pendingApproval, waitingInitialPayment, slaPercent }, lanes: [...], queueItems: [...], staffScores: [...] }`.
     - **Jangan ubah schema.prisma.** Gunakan query Prisma mentah (aggregate/groupBy).
  2. **Backend — endpoint baru** `GET /api/owner/dashboard/aggregate`:
     - Controller: `backend/src/modules/owner/owner-dashboard.controller.ts`.
     - Return: `{ kpi: { revenue, profit, occupancy, cash }, signals: [...], meterDue: { overdue, upcoming } }`.
  3. **Frontend — `DashboardAdmin.tsx`:**
     - Ganti 9+ `useQuery` individual → **1** `useQuery(['adminDashboardAggregate'], fetchAdminAggregate)`.
     - Hapus semua `.filter()` / `.map()` / `dedupeCommandItems()` komputasi inline.
     - `staleTime: 60_000` (1 menit cache).
  4. **Frontend — `OwnerDashboardPage.tsx`:**
     - Ganti multi-query → **1** `useQuery(['ownerDashboardAggregate'], fetchOwnerAggregate)`.
     - Hapus `computeMeterDue` + komputasi klien lain.
  5. **Gate keuangan:** `node --test "test/unit/**/*.test.js"` + `docs/M04_KEUANGAN.md` § invarian TB.
  **Anchor grep:** `useQuery` (DashboardAdmin) · `computeMeterDue`
  **Gate:** `cd backend; npx tsc --noEmit` ✅ · `cd frontend; npm run build` ✅ · unit test backend PASS.

- [x] **N-06 — Tambah `@axe-core/playwright` ke e2e**
  **Target:** `frontend/e2e/` — tambah ke setup Playwright yang sudah ada.
  **Aksi:**
  1. Install: `cd frontend; npm install --save-dev @axe-core/playwright`.
  2. Buat file BARU `frontend/e2e/a11y/axe-audit.spec.ts` (atau tambah ke `frontend/e2e/uat/`):
     - Import `AxeBuilder` dari `@axe-core/playwright`.
     - Test: buka halaman utama (public, tenant dashboard, admin dashboard, owner dashboard).
     - Jalankan `new AxeBuilder({ page }).analyze()`.
     - Assert `violations.length === 0` untuk rule critical/serious.
  3. Tambah script di `frontend/package.json`: `"test:a11y": "npx playwright test e2e/a11y/"`.
  **Anchor grep:** `playwright` · `e2e`
  **Gate:** `cd frontend; npx playwright test e2e/a11y/` → ≤ 5 violation critical/serious (baseline dulu, perbaiki bertahap).

---

### Fase O — Design System & Konsistensi Visual (V1–V6 Audit)

**Tujuan:** Satukan token, kurangi hex hardcode & `!important`, mulai migrasi CSS terstruktur.
**Rujukan:** Audit §4 (V1–V6).
**Strategi:** O-01..O-03 fondasi token → O-04..O-05 bersihkan CSS → O-06 lucide-react → O-07 date-fns → O-08 touch target ≥44px.

- [x] **O-01 — Satukan palet warna: 1 skala 50–900 + alias semantik**
  **Target:** `frontend/src/styles/00-tokens.css`.
  **Aksi:**
  1. **Baca dulu:** `00-tokens.css` — catat SEMUA token warna yang ada (`--primary`, `--k48-primary`, `--ops-blue-600`, `--color-success`, `--color-danger`, dll).
  2. **Definisikan SATU skala netral + brand:**
     ```css
     :root {
       /* Skala abu-abu */
       --gray-50: #f8fafc;  --gray-100: #f1f5f9;  --gray-200: #e2e8f0;
       --gray-300: #cbd5e1;  --gray-400: #94a3b8;  --gray-500: #64748b;
       --gray-600: #475569;  --gray-700: #334155;  --gray-800: #1e293b;  --gray-900: #0f172a;
       /* Skala brand biru */
       --blue-50: #eff6ff;  --blue-100: #dbeafe;  --blue-200: #bfdbfe;
       --blue-300: #93c5fd;  --blue-400: #60a5fa;  --blue-500: #3b82f6;
       --blue-600: #2563eb;  --blue-700: #1d4ed8;  --blue-800: #1e40af;  --blue-900: #1e3a8a;
       /* Skala aksen */
       --green-50..900, --red-50..900, --amber-50..900, --purple-50..900 (opsional — mulai dari yang dipakai saja).
     }
     ```
  3. **Alias semantik** — arahkan ke skala:
     ```css
     --color-primary: var(--blue-600);
     --color-primary-hover: var(--blue-700);
     --color-success: var(--green-600);
     --color-danger: var(--red-600);
     --color-warning: var(--amber-600);
     --text-primary: var(--gray-900);
     --text-secondary: var(--gray-600);
     --text-muted: var(--gray-500);
     --bg-surface: var(--gray-50);
     --border-default: var(--gray-200);
     ```
  4. **Hapus duplikat:** `--k48-primary`, `--ops-blue-600` → semua konsumen pakai `--color-primary`. Cari + replace di semua file CSS/TSX.
  5. **JANGAN hapus token lama dulu** — tambah komentar `/* @deprecated — pakai --color-primary */` agar transisi mulus.
  **Anchor grep:** `--k48-primary` · `--ops-blue-600` · `--primary`
  **Gate:** `cd frontend; npm run build` ✅ · warna tidak berubah secara visual (bandingkan screenshot sebelum/sesudah).

- [x] **O-02 — Util `chartColors` dari token + ganti hardcode di chart**
  **Target:** Buat file BARU `frontend/src/config/chartPalette.ts`. Ganti `OwnerDashboardPage.tsx` + file chart lain.
  **Aksi:**
  1. Buat `frontend/src/config/chartPalette.ts`:
     ```ts
     // Baca token dari CSS via getComputedStyle saat runtime ATAU hardcode referensi token
     export const CHART_COLORS = {
       revenue: 'var(--color-primary)',       // #2563eb fallback
       expense: 'var(--color-danger)',         // #ef4444 fallback
       profit: 'var(--color-success)',         // #16a34a fallback
       grid: 'var(--gray-200)',                // #e2e8f0 fallback
       trend: 'var(--purple-600)',             // #7c3aed fallback
       occupancy: 'var(--blue-400)',
       cash: 'var(--green-500)',
     } as const;
     ```
  2. **Baca nilai aktual dari CSS variable saat runtime** (opsi A — rekomendasi):
     ```ts
     export function getChartColor(varName: string, fallback: string): string {
       if (typeof window === 'undefined') return fallback;
       return getComputedStyle(document.documentElement).getPropertyValue(varName).trim() || fallback;
     }
     ```
  3. **Ganti di `OwnerDashboardPage.tsx`** baris 181–205:
     - `#2563eb` → `getChartColor('--color-primary', '#2563eb')`
     - `#f97316` → `getChartColor('--color-danger', '#f97316')`
     - `#16a34a` → `getChartColor('--color-success', '#16a34a')`
     - `#e2e8f0` → `getChartColor('--gray-200', '#e2e8f0')`
     - `#7c3aed` → `getChartColor('--purple-600', '#7c3aed')`
  4. **Ganti di file chart lain** — grep `#` hex di file TSX dalam folder `components/charts/` dan `pages/`.
  **Anchor grep:** `#2563eb` · `#f97316` · `#16a34a` (di TSX)
  **Gate:** `cd frontend; npm run build` ✅ · chart tetap berwarna sama.

- [x] **O-03 — Tambah skala spacing (`--space-1..8`) + skala radius**
  **Target:** `frontend/src/styles/00-tokens.css`.
  **Aksi:**
  1. Tambah di `:root`:
     ```css
     --space-1: 0.25rem;  /* 4px */
     --space-2: 0.5rem;   /* 8px */
     --space-3: 0.75rem;  /* 12px */
     --space-4: 1rem;     /* 16px */
     --space-5: 1.25rem;  /* 20px */
     --space-6: 1.5rem;   /* 24px */
     --space-8: 2rem;     /* 32px */
     --space-10: 2.5rem;  /* 40px */
     --space-12: 3rem;    /* 48px */
     /* Radius */
     --radius-sm: 0.25rem;
     --radius-md: 0.375rem;
     --radius-lg: 0.5rem;
     --radius-xl: 0.75rem;
     --radius-full: 9999px;
     ```
  2. **JANGAN paksa migrasi semua spacing/padding hardcode** — itu kerja besar. Cukup sediakan token. Pakai bertahap di komponen baru.
  3. Bila ada `--density-*` yang bentrok, harmonisasi.
  **Anchor grep:** `--density-`
  **Gate:** `cd frontend; npm run build` ✅.

- [x] **O-04 — Mulai CSS Modules untuk kurangi `!important`**
  **Target:** Pilih 1 file CSS paling bermasalah sebagai pilot.
  **Aksi:**
  1. **Pilih pilot:** `10-misc.css` (104 KB, 130 `!important`) — file paling besar & kacau.
  2. **Audit isi `10-misc.css`:** kelompokkan rule berdasarkan komponen yang di-style. Catat rule mana yang DIPAKAI (grep class name di TSX) vs MANA yang dead.
  3. **Buat file CSS Module pertama:** `frontend/src/styles/10-misc.module.css` — salin rule yang masih dipakai, hapus `!important` dengan menaikkan spesifisitas via module scope (CSS Modules auto-scope class name).
  4. **Ganti 1–2 komponen** sebagai pilot untuk import dari module CSS (mis. komponen kecil di `common/`).
  5. **Target:** turunkan `!important` di file itu ≥ 50%. JANGAN hapus `10-misc.css` total — rename ke `10-misc-legacy.css`.
  **Anchor grep:** `10-misc.css` · `!important`
  **Gate:** `cd frontend; npm run build` ✅ · komponen pilot tidak rusak.

- [x] **O-05 — Pisah `10-misc.css` + bersihkan dead CSS**
  **Target:** `frontend/src/styles/10-misc.css`.
  **Aksi:**
  1. **Split file berdasarkan domain:** `10-misc.css` (104 KB) → pecah jadi:
     - `10-misc.css` (sisa ~40 KB — utility classes yang dipakai lintas halaman)
     - `13-reports.css` — rule untuk halaman laporan (ProfitLoss, BalanceSheet, Cashflow, FinancialRatios)
     - `14-settings.css` — rule untuk halaman settings (OwnerSettings, AccountingSetup, AssetRegister)
  2. **Deteksi dead CSS:** untuk setiap file CSS hasil split, grep SEMUA class selector di folder `pages/` dan `components/`. Rule yang TIDAK MUNCUL di TSX manapun → tambah komentar `/* POTENTIAL DEAD — verify before delete */`.
  3. **Jangan hapus massal** — risiko false positive (class dipakai via string concatenation). Hapus hanya yang sudah dikonfirmasi manual.
  4. Update import di `main.tsx` atau file entry CSS.
  **Anchor grep:** `10-misc.css`
  **Gate:** `cd frontend; npm run build` ✅ · tidak ada style hilang.

- [x] **O-06 — Ganti emoji UI → `lucide-react` (ikon SVG konsisten)**
  **Target:** Semua file TSX yang pakai emoji sebagai ikon UI.
  **Aksi:**
  1. Install: `cd frontend; npm install lucide-react`.
  2. **Mapping emoji → Lucide icon:**
     | Emoji | Lucide |
     |-------|--------|
     | ⚠️ | `AlertTriangle` |
     | ✅ | `CheckCircle` |
     | ❌ | `XCircle` |
     | 📋 | `ClipboardList` |
     | 🔍 | `Search` |
     | 💰 | `DollarSign` |
     | 📅 | `Calendar` |
     | 🛏️ | `Bed` (atau `Home`) |
     | ➕ | `Plus` |
     | ✏️ | `Pencil` |
     | 🗑️ | `Trash2` |
     | 📊 | `BarChart3` |
     | ⚙️ | `Settings` |
  3. **Prioritas:** ganti emoji di KOMPONEN BARU (`ClickableRow`, `ConfirmProvider`, `AdminHealthBar`) dulu. Lalu ganti bertahap di halaman existing.
  4. **JANGAN ganti emoji di konten** (mis. teks pengumuman, label bersemangat) — hanya yang berfungsi sebagai ikon UI.
  5. Bungkus ikon dengan `aria-hidden="true"` + `size={18}` untuk konsistensi.
  **Anchor grep:** `⚠️` · `✅` · `aria-hidden` (emoji)
  **Gate:** `cd frontend; npm run build` ✅ · ikon tampil tajam di semua OS.

- [x] **O-07 — Adopsi library tanggal (date-fns) ganti hitung tanggal manual** (audit §8)
  **Target:** `frontend/src/utils/dateTime.ts` + konsumen.
  **Aksi:**
  1. Install: `cd frontend; npm install date-fns` (tree-shakable; locale `id`).
  2. Refactor isi `utils/dateTime.ts` (`addHoursToDate`, `getDeadlineMeta`, `formatDateTimeWib`, `daysFromToday`, dll) agar memakai `date-fns` (`addHours`, `differenceInDays`, `format`, `formatDistanceToNow` + `date-fns/locale/id`).
  3. **Jaga signature fungsi tetap sama** — ganti implementasi internal saja, hindari perubahan massal konsumen.
  4. Fondasi ini dipasang SEBELUM Fase P (kalender/kanban deadline butuh perhitungan tanggal yang andal).
  **Anchor grep:** `addHoursToDate` · `getDeadlineMeta` · `formatDateTimeWib`
  **Gate:** `cd frontend; npm run build` ✅ · label deadline/relatif tetap sama persis.

- [x] **O-08 — Audit touch target ≥44px (mobile)** (audit §5 R5)
  **Target:** CSS — chip, badge kecil, panah baris, tombol ikon.
  **Aksi:**
  1. Tetapkan token `--tap-min: 44px`. Elemen interaktif kecil diberi `min-height/min-width: var(--tap-min)` ATAU padding cukup (pakai hit-area `::before` transparan bila visual harus tetap kecil).
  2. Target spesifik: `.staff-filter-chip.compact`, badge `0.7em` (`ResourceTable.tsx` baris 123), `.row-arrow-cell`, tombol ikon topbar (☰, ◀, lonceng).
  3. Verifikasi di viewport 375px (Chrome DevTools) — tak ada target < 44px di area yang sering disentuh.
  **Anchor grep:** `staff-filter-chip` · `row-arrow-cell` · `0.7em`
  **Gate:** `cd frontend; npm run build` ✅ · cek manual 375px.

---

### Fase P — Pola UI Modern (P2 Strategis Audit)

**Tujuan:** Adopsi kalender, kanban, tabel canggih — modernisasi UX sesuai kebutuhan domain berbasis deadline.
**Rujukan:** Audit §7–§8, rekomendasi teknologi mutakhir.
**Strategi:** Tiap task tambah 1 dependensi baru (lazy-load di rute). Kerjakan **bertahap** — P-01 dulu (toggle tampilan), lalu P-02..P-04 bisa independen.

- [x] **P-01 — Model "1 data, 3 tampilan" (List / Board / Kalender) untuk Admin**
  **Target:** `frontend/src/pages/dashboard/DashboardAdmin.tsx` + komponen BARU.
  **Aksi:**
  1. Tambah state `const [viewMode, setViewMode] = useState<'list' | 'board' | 'calendar'>('list')`.
  2. Render `<SegmentedTabs>` (komponen existing — `common/SegmentedTabs.tsx`) sebagai toggle tampilan: `[{id:'list', label:'📋 Hari Ini'}, {id:'board', label:'📌 Papan'}, {id:'calendar', label:'📅 Kalender'}]`.
  3. **List view** = `ActionQueueTable` (existing).
  4. **Board view** (placeholder dulu) = komponen BARU `frontend/src/components/command-center/ActionKanbanBoard.tsx` — render 4 kolom: "Baru", "Dikerjakan", "Menunggu Cek", "Selesai". Pakai data dari `queueItems` yang sama. Untuk P-01, cukup render kartu statis (drag-drop nanti di P-03).
  5. **Calendar view** (placeholder dulu) = komponen BARU `frontend/src/components/command-center/ActionCalendar.tsx` — render kalender sederhana (grid 7×5) yang menandai tanggal dengan item. Untuk P-01, cukup render hari dengan dot/counter. FullCalendar nanti di P-02.
  6. Simpan `viewMode` ke `localStorage`.
  **Anchor grep:** `SegmentedTabs` · `ActionQueueTable`
  **Gate:** `cd frontend; npm run build` ✅ · toggle tampilan tidak reload halaman.

- [x] **P-02 — Kalender operasional dengan FullCalendar**
  **Target:** `frontend/src/components/command-center/ActionCalendar.tsx` — ganti placeholder P-01.
  **Aksi:**
  1. Install: `cd frontend; npm install @fullcalendar/react @fullcalendar/daygrid @fullcalendar/interaction`.
  2. **Lazy-load:** bungkus import dengan `React.lazy(() => import('@fullcalendar/react'))` agar tidak tambah bobot bundle utama.
  3. Di `ActionCalendar.tsx`:
     - Render `<FullCalendar>` dengan plugin `dayGridPlugin`.
     - `events`: map `queueItems` + data dari query tambahan (jatuh tempo invoice, deadline checkout, siklus meter) ke format `{ title, date, color, extendedProps: { type, id } }`.
     - `dateClick`: buka drawer/modal dengan daftar item untuk tanggal itu.
     - `eventClick`: navigasi ke detail item (invoice, ticket, stay).
  4. **Sumber data kalender:** buat endpoint backend BARU `GET /api/admin/calendar?month=2026-06` → return events JSON. Atau hitung dari query existing di frontend.
  5. **Warna event berdasarkan tipe:** jatuh tempo = merah, siklus meter = biru, check-in/out = hijau, deadline renewal = amber.
  **Anchor grep:** `FullCalendar`
  **Gate:** `cd frontend; npm run build` ✅ · kalender render bulan Juni 2026 tanpa error.

- [x] **P-03 — Papan kanban dengan `@dnd-kit` (drag-drop aksesibel)**
  **Target:** `frontend/src/components/command-center/ActionKanbanBoard.tsx` — ganti placeholder P-01.
  **Aksi:**
  1. Install: `cd frontend; npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities`.
  2. **Lazy-load:** `const DndContext = React.lazy(() => import('@dnd-kit/core').then(m => ({ default: m.DndContext })));`
  3. Di `ActionKanbanBoard.tsx`:
     - Render 4 kolom (`Droppable`) — "Baru" / "Dikerjakan" / "Menunggu Cek" / "Selesai".
     - Tiap kartu = `Draggable` dengan data `queueItem`.
     - `onDragEnd`: update status item via API (`PATCH /api/tickets/:id` atau endpoint action queue).
     - **Aksesibilitas:** `@dnd-kit` sudah support keyboard (Space untuk pickup, panah untuk pindah, Space untuk drop).
  4. **Data source:** pakai `queueItems` dari `DashboardAdmin` (atau dari aggregate endpoint N-05).
  5. Visual: badge SLA berwarna di tiap kartu, avatar staf yang bertanggung jawab (bila ada).
  **Anchor grep:** `DndContext` · `useDroppable`
  **Gate:** `cd frontend; npm run build` ✅ · drag-drop antar kolom berfungsi, keyboard aksesibel.

- [x] **P-04 — TanStack Table ganti tabel buatan tangan**
  **Target:** Pilih 1 halaman sebagai pilot, lalu perluas.
  **Aksi:**
  1. Install: `cd frontend; npm install @tanstack/react-table`.
  2. **Pilih pilot:** `InvoicesPage.tsx` atau `TicketsPage.tsx` — halaman dengan tabel besar yang dapat sort/filter.
  3. Buat komponen BARU `frontend/src/components/common/TanStackTable.tsx` (generic wrapper):
     - Props: `columns`, `data`, `onRowClick?`, `isLoading?`, `emptyMessage?`.
     - Render `<table>` dengan header sortable (klik → `toggleSorting`), rows dengan `data-label` untuk responsif mobile.
     - Integrasikan dengan `react-bootstrap` styling (kelas `table table-hover`).
  4. **Fitur:** sorting, pagination (dengan nomor halaman, bukan cuma prev/next), column visibility toggle.
  5. Ganti tabel buatan tangan di halaman pilot. Verifikasi semua fitur existing tetap berfungsi.
  6. **JANGAN** ganti `ResourceTable.tsx` — itu sudah baik. TanStack Table untuk tabel dashboard kompleks.
  **Anchor grep:** `InvoicesPage` · `TicketsPage` · `PaginationControls`
  **Gate:** `cd frontend; npm run build` ✅ · sort/filter/paginasi berfungsi.

- [x] **P-05 — Bottom tab bar untuk portal Tenant di mobile**
  **Target:** `frontend/src/components/layout/AppLayout.tsx` (atau `TenantWorkspaceTabs.tsx`).
  **Aksi:**
  1. **Deteksi viewport:** pakai CSS media query `@media (max-width: 768px)` atau hook `useMediaQuery`.
  2. Buat komponen BARU `frontend/src/components/layout/MobileBottomNav.tsx`:
     - Render `<nav>` fixed-bottom dengan 4–5 ikon + label.
     - Item: "🏠 Beranda", "🛏️ Kamar Saya", "📅 Booking", "🎫 Tiket", "👤 Profil".
     - Gunakan `<NavLink>` dari react-router → `className={({isActive}) => isActive ? 'active' : ''}`.
     - CSS: `position: fixed; bottom: 0; left: 0; right: 0; z-index: 1030; background: var(--bg-surface); border-top: 1px solid var(--border-default); display: flex; justify-content: space-around; padding: var(--space-2) 0;`.
  3. **Sembunyikan sidebar** di mobile saat bottom nav aktif (atau tetap offcanvas seperti existing).
  4. **Ganti tab horizontal atas** (`TenantWorkspaceTabs`) dengan bottom nav — lebih ramah jempol.
  **Anchor grep:** `TenantWorkspaceTabs` · `max-width: 768`
  **Gate:** `cd frontend; npm run build` ✅ · test di Chrome DevTools 375px — bottom nav muncul, tombol berfungsi.

- [x] **P-06 — Command palette ⌘K dengan `cmdk`**
  **Target:** `frontend/src/components/layout/AppLayout.tsx` — tambah overlay global.
  **Aksi:**
  1. Install: `cd frontend; npm install cmdk`.
  2. **Lazy-load:** `const CommandPalette = React.lazy(() => import('../common/CommandPalette'));` — render dengan `<Suspense fallback={null}>`.
  3. Buat komponen BARU `frontend/src/components/common/CommandPalette.tsx`:
     - Props: `open: boolean`, `onClose: () => void`.
     - Render `<Command>` dari cmdk:
       - `<Command.Input>` — input pencarian.
       - `<Command.List>` — hasil:
         - `<Command.Group heading="Navigasi">` — item rute (berdasarkan `navigation.ts` config, difilter role).
         - `<Command.Group heading="Aksi Cepat">` — "Booking baru", "Check-in", "Catat meter", "Buat tiket".
         - `<Command.Group heading="Terkini">` — histori navigasi (dari `sessionStorage`).
     - `onSelect`: navigasi via `useNavigate()`.
  4. **Shortcut:** `Ctrl+K` / `Cmd+K` — tambah `useEffect` dengan `keydown` listener di `AppLayout`.
  5. Integrasikan dengan `GlobalSearch` component yang sudah ada (bila ada).
  **Anchor grep:** `GlobalSearch` · `navigation.ts`
  **Gate:** `cd frontend; npm run build` ✅ · ⌘K buka palette, ketik "inv" → muncul "Invoices", Enter → navigasi.

---

### Fase Q — Performa & Stabilitas UI/UX (Q-01..Q-07)

**Tujuan:** Perbaiki 7 masalah kritis hasil investigasi Playwright 2026-06-20 — endpoint backend tidak terdaftar di dist, anti-pattern sequential fetch loop, heavy query saat mount, retry default terlalu panjang, double-fetch checkout, empty state kosong, dan push toggle tanpa graceful fallback.  
**Rujukan:** Investigasi sesi 2026-06-20 — `frontend/screenshots-ui/` (Playwright), curl audit, review kode langsung.  
**Strategi:** Urut Q-01 → Q-07. Q-01 backend perlu rebuild+restart; Q-02..Q-05 frontend kritis; Q-06..Q-07 polish. Q-02 baru bisa diverifikasi penuh setelah Q-01 selesai.  
**Gate umum tiap task:** `cd backend; npx tsc --noEmit` ✅ · `cd frontend; npm run build` ✅ · 1 commit per task.

---

#### Q-01 🔴 KRITIS — Backend: rebuild dist agar AdminDashboardModule ter-register

**Masalah:** `GET /api/admin/dashboard/aggregate` → HTTP 404. `backend/dist/modules/admin/` tidak ada. Backend berjalan dari `dist/main.js` lama yang dikompilasi sebelum `AdminDashboardModule` ditambah di Fase N-05. Akibat: `DashboardAdmin.tsx` query retry 3× (1s+2s+4s=7+ detik) → skeleton buta → error alert.  
**Verifikasi masalah terlebih dahulu:**
```bash
ls backend/dist/modules/ | grep -E "^admin$"
# Kalau output kosong → masalah terkonfirmasi
curl http://localhost:3000/api/admin/dashboard/aggregate -w "\nStatus: %{http_code}" 2>&1 | tail -1
# Harus: Status: 404 → terkonfirmasi
```

**Aksi:**
1. Stop backend yang sedang jalan (Ctrl+C di terminal backend, atau `npx kill-port 3000` bila perlu).
2. Cek TypeScript — pastikan tidak ada error di modul admin sebelum build:
   ```bash
   cd backend && npx tsc --noEmit 2>&1 | head -30
   ```
   - Jika ada error → baca pesan error, perbaiki file yang disebutkan (jangan ubah logika bisnis, hanya perbaiki type), jalankan ulang.
   - Jika clean (output kosong) → lanjut ke langkah 3.
3. Build ulang seluruh backend:
   ```bash
   cd backend && npm run build
   ```
   Tunggu hingga selesai (biasanya 30–60 detik). Pastikan tidak ada error di output.
4. Verifikasi hasil build:
   ```bash
   ls backend/dist/modules/admin/
   # Harus ada minimal: admin-dashboard.controller.js  admin-dashboard.service.js  admin-dashboard.module.js
   ```
5. Restart backend:
   ```bash
   cd backend && npm run start:dev
   # ATAU bila production: node dist/main.js
   ```
   Tunggu log "Application is running on port 3000".
6. Verifikasi endpoint sudah jalan:
   ```bash
   TOKEN=$(curl -s http://localhost:3000/api/auth/login -X POST \
     -H "Content-Type: application/json" \
     -d '{"identifier":"admin@kost48.com","password":"admin123"}' \
     | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
   curl -s http://localhost:3000/api/admin/dashboard/aggregate \
     -H "Authorization: Bearer $TOKEN" | python -c "import sys,json; d=json.load(sys.stdin); print('SUCCESS' if d.get('success') else 'FAIL:'+str(d.get('message',''))[:80])"
   # Harus print: SUCCESS
   ```

**File yang disentuh:** Tidak ada kode yang diubah — hanya proses rebuild. Semua kode sudah benar di repo (`backend/src/modules/admin/`, terdaftar di `app.module.ts`).  
**Anchor grep:** `AdminDashboardModule` (app.module.ts) · `admin-dashboard.controller.ts` · `admin-dashboard.service.ts`  
**Gate:** `dist/modules/admin/` ada · curl aggregate → HTTP 200 + `"success":true` · `cd backend; npx tsc --noEmit` ✅.

---

- [x] **Q-01** Backend rebuild dist → `dist/modules/admin/` ada · `/api/admin/dashboard/aggregate` 200 OK.

---

#### Q-02 🔴 KRITIS — Frontend DashboardAdmin: kurangi retry default + verifikasi error state

**Masalah:** `aggregateQuery` di `DashboardAdmin.tsx:223` pakai default `retry: 3` (exponential backoff: 1s+2s+4s = 7+ detik) sebelum error alert muncul. Saat endpoint 404 (sebelum Q-01 diperbaiki), user melihat skeleton buta 7 detik. Setelah Q-01 diperbaiki, masalah ini tetap relevan untuk skenario network lambat atau backend restart.

**Target:** `frontend/src/pages/dashboard/DashboardAdmin.tsx` baris 223.

**Aksi:**
1. Baca baris 220–230 dulu untuk konteks penuh.
2. Ganti **baris 223** — tambah `retry: 1` dan `retryDelay: 1000`:
   ```ts
   // SEBELUM (baris 223):
   const aggregateQuery = useQuery({ queryKey: ['admin-dashboard-aggregate'], queryFn: fetchAdminDashboardAggregate, staleTime: 60_000 });
   
   // SESUDAH:
   const aggregateQuery = useQuery({ queryKey: ['admin-dashboard-aggregate'], queryFn: fetchAdminDashboardAggregate, staleTime: 60_000, retry: 1, retryDelay: 1000 });
   ```
3. Verifikasi baris 314–315 sudah ada error state (jangan ubah, hanya konfirmasi):
   ```ts
   if (aggregateQuery.isLoading) return <LoadingDashboard />;
   if (aggregateQuery.isError) return <Alert variant="danger">Gagal memuat command center admin.</Alert>;
   ```
   Jika baris `isError` belum ada → tambahkan di bawah baris `isLoading`.
4. **Jangan ubah** query lain di file ini (`staffPerformanceQuery`, `autoOpsQuery`, `aiStatusQuery`).

**Anchor grep:** `aggregateQuery` · `fetchAdminDashboardAggregate` · `staleTime: 60_000` (DashboardAdmin.tsx)  
**Gate:** `cd frontend; npm run build` ✅ · Navigasi ke `/dashboard` → jika API error: alert merah muncul ≤ 3 detik. Jika API OK (setelah Q-01): data tampil normal.

---

- [x] **Q-02** DashboardAdmin retry: 1 + retryDelay: 1000. Error alert muncul ≤ 3 detik saat API gagal.

---

#### Q-03 🔴 KRITIS — Frontend StaysPage: ganti sequential pagination loop → single call

**Masalah:** `listAllActiveStaysForBookings()` di `frontend/src/pages/stays/stayPredicates.ts:69` adalah `do...while` loop dengan `await` sequential — tiap iterasi menunggu response sebelum lanjut. KOST48 punya maks 48 kamar → maks 48 stay aktif → SATU call `limit: 200` sudah cukup. Loop ini menyebabkan: (a) multiple sequential network calls, (b) browser tidak mencapai "networkidle", (c) UX lambat di tab "Perlu Tindak Lanjut".

**Target:** `frontend/src/pages/stays/stayPredicates.ts` baris 69–87.

**Aksi:**
1. Baca baris 69–88 dulu untuk konfirmasi kode saat ini.
2. **Ganti seluruh fungsi** `listAllActiveStaysForBookings` (baris 69–87) dengan implementasi baru:
   ```ts
   // HAPUS kode lama (baris 69–87):
   // export async function listAllActiveStaysForBookings(maxPages = 50): Promise<PaginatedResponse<Stay>> {
   //   const pageSize = 100;
   //   const items: Stay[] = [];
   //   ... (do...while loop) ...
   // }
   
   // TULIS kode baru (gantikan di posisi yang sama):
   // KOST48 = 48 kamar maks; stay aktif tidak mungkin >48. Single call limit 200 cukup untuk semua skenario.
   export async function listAllActiveStaysForBookings(): Promise<PaginatedResponse<Stay>> {
     return listStays({ status: 'ACTIVE', page: 1, limit: 200 });
   }
   ```
3. Verifikasi pemanggil di `StaysPage.tsx` baris 240:
   ```ts
   ? listAllActiveStaysForBookings()
   ```
   Ini tidak perlu diubah — signature return type tetap `Promise<PaginatedResponse<Stay>>`.
4. **Jangan ubah** bagian lain `stayPredicates.ts`.

**Anchor grep:** `listAllActiveStaysForBookings` · `do {` (stayPredicates.ts) · `maxPages = 50` · `pageSize = 100`  
**Gate:** `cd frontend; npm run build` ✅ · Buka `/stays` tab "Perlu Tindak Lanjut" → DevTools Network: hanya 1 request ke `/api/stays?status=ACTIVE&...`, bukan loop. Data muncul ≤ 2 detik.

---

- [x] **Q-03** stayPredicates.ts: `listAllActiveStaysForBookings` ganti do-while loop → single `listStays({ limit: 200 })`.

---

#### Q-04 🔴 KRITIS — Frontend InvoicesPage: lazy-load stays dropdown ke saat modal terbuka

**Masalah:** `frontend/src/pages/invoices/InvoicesPage.tsx:184` memanggil `listResource('/stays', { limit: 500 })` saat halaman PERTAMA DIMUAT — padahal 500 stays (~73KB JSON) hanya dibutuhkan ketika user membuka modal "Buat Invoice". Request besar ini memperlambar initial render InvoicesPage dan menyebabkan Playwright timeout saat `waitUntil: 'networkidle'`.

**Target:** `frontend/src/pages/invoices/InvoicesPage.tsx` baris 184.

**Aksi:**
1. Baca baris 164–186 dulu untuk konteks `canManageFinance`, `showCreate`, dan `staysQuery`.
2. Ganti **baris 184** — tambah `enabled: showCreate && canManageFinance` dan `staleTime: 30_000`:
   ```ts
   // SEBELUM (baris 184):
   const staysQuery = useQuery({ queryKey: ['stays', 'invoice-form'], queryFn: () => listResource<any>('/stays', { limit: 500 }) });
   
   // SESUDAH:
   const staysQuery = useQuery({
     queryKey: ['stays', 'invoice-form'],
     queryFn: () => listResource<any>('/stays', { limit: 500 }),
     enabled: showCreate && canManageFinance,
     staleTime: 30_000,
   });
   ```
3. Verifikasi baris 202 tidak perlu diubah — sudah handle `undefined` dengan benar:
   ```ts
   const stayOptions = useMemo(() => buildReferenceOptions(staysQuery.data?.items ?? [], '/stays'), [staysQuery.data?.items]);
   ```
   Ketika `enabled: false` → `staysQuery.data === undefined` → `stayOptions === []` → dropdown kosong sampai modal dibuka. ✅
4. Tambahkan `isLoading` indicator di dalam modal dropdown jika diperlukan untuk UX (opsional — hanya jika dropdown kosong terasa membingungkan):
   - Cari baris 646 (`<Modal show={showCreate...}`) → cari render `stayOptions`.
   - Bila ada `isLoading` prop di komponen `SearchableSelect` atau `ReactSelect` → tambah `isLoading={staysQuery.isLoading}`.

**Anchor grep:** `staysQuery` · `invoice-form` · `limit: 500` · `showCreate` (InvoicesPage.tsx)  
**Gate:** `cd frontend; npm run build` ✅ · Buka `/invoices` → DevTools Network: TIDAK ada request `/stays?limit=500` sampai klik "Buat Invoice". Setelah klik → request muncul → dropdown terisi.

---

- [x] **Q-04** InvoicesPage staysQuery: tambah `enabled: showCreate && canManageFinance`. Stays tidak di-fetch saat mount.

---

#### Q-05 🟡 — Frontend StaysPage: tambah staleTime ke checkout request queries

**Masalah:** `StaysPage.tsx` membuat 2 query ke backend saat mount:
- `checkoutRequestsQuery` → `/api/checkout-requests?status=PENDING`
- `approvedCheckoutRequestsQuery` → `/api/checkout-requests?status=APPROVED`

Tanpa `staleTime`, keduanya refetch setiap kali StaysPage di-mount ulang (navigasi keluar-masuk). Untuk halaman operasional yang sering dibuka, ini menciptakan request redundan.

**Target:** `frontend/src/pages/stays/StaysPage.tsx` baris 191–201.

**Aksi:**
1. Baca baris 191–201 dulu untuk posisi pasti kedua query.
2. Tambah `staleTime: 30_000` ke kedua query:
   ```ts
   // SEBELUM baris 191–195:
   const checkoutRequestsQuery = useQuery({
     queryKey: ['admin-checkout-requests', 'PENDING'],
     queryFn: () => listAdminCheckoutRequests({ status: 'PENDING' }),
   });
   
   // SESUDAH:
   const checkoutRequestsQuery = useQuery({
     queryKey: ['admin-checkout-requests', 'PENDING'],
     queryFn: () => listAdminCheckoutRequests({ status: 'PENDING' }),
     staleTime: 30_000,
   });
   ```
   Lakukan hal yang sama untuk `approvedCheckoutRequestsQuery` (baris 197–201).
3. **Jangan ubah** logic lain — hanya tambah `staleTime`.

**Anchor grep:** `checkoutRequestsQuery` · `approvedCheckoutRequestsQuery` · `listAdminCheckoutRequests`  
**Gate:** `cd frontend; npm run build` ✅ · Navigasi keluar-masuk `/stays` 3× → Network tab menunjukkan request checkout tidak refetch selama 30 detik.

---

- [x] **Q-05** StaysPage: tambah `staleTime: 30_000` ke `checkoutRequestsQuery` dan `approvedCheckoutRequestsQuery`.

---

#### Q-06 🟡 — Frontend Inventory: empty state informatif dengan CTA

**Masalah:** Screenshot 07-inventory menunjukkan tab "Stok Barang" dalam kondisi data minimal dengan empty state yang tidak informatif — tidak ada instruksi apa yang harus dilakukan user baru.

**Target:** Cari di mana empty state dirender untuk resource `inventory-items` dan `room-items`.

**Aksi:**
1. Grep untuk menemukan file yang handle empty state inventory:
   ```bash
   grep -rn "EmptyState\|emptyMessage\|inventory-items\|Belum ada barang" frontend/src/pages/resources/ | head -20
   ```
2. Identifikasi komponen yang bertanggung jawab. Kemungkinan besar:
   - `frontend/src/pages/resources/ConfiguredResourcePage.tsx` — meneruskan `emptyMessage` prop ke tabel.
   - `frontend/src/components/common/ResourceTable.tsx` — render `<EmptyState>`.
3. Buka `frontend/src/components/common/EmptyState.tsx` — pahami props yang tersedia (`title`, `description`, `icon`, `action`).
4. Cari konfigurasi resource `inventory-items` dan `room-items`. Kemungkinan di:
   - `frontend/src/config/resourceConfigs.ts` atau file serupa.
   - Grep: `inventory-items` di folder `frontend/src/`.
5. Tambah/perbarui `emptyMessage` atau empty state config untuk:
   - **`inventory-items` (Gudang):**
     ```tsx
     emptyMessage: "Belum ada barang di gudang. Klik 'Tambah' untuk mencatat barang pertama."
     // ATAU jika EmptyState punya action:
     emptyAction: { label: 'Tambah Barang Pertama', onClick: () => setShowCreate(true) }
     ```
   - **`room-items` (Barang Kamar):**
     ```tsx
     emptyMessage: "Belum ada barang tercatat di kamar. Tugaskan barang dari Gudang via tab Mutasi."
     ```
   - **`inventory-movements` (Mutasi):**
     ```tsx
     emptyMessage: "Belum ada mutasi. Mulai dengan menugaskan barang dari Gudang ke kamar."
     ```
6. **Jangan buat komponen baru** — gunakan `EmptyState` yang sudah ada.

**Anchor grep:** `EmptyState` · `emptyMessage` · `inventory-items` · `ConfiguredResourcePage`  
**Gate:** `cd frontend; npm run build` ✅ · Buka `/inventory/gudang` saat data kosong → tampil teks instruksi (bukan area putih bersih).

---

- [x] **Q-06** Inventory empty state: tambah `emptyMessage` informatif + CTA untuk `inventory-items`, `room-items`, `inventory-movements`.

---

#### Q-07 🟢 — Frontend NotificationsPage: PushToggle graceful fallback saat VAPID belum dikonfigurasi

**Masalah:** Saat backend VAPID belum dikonfigurasi (env `VAPID_PUBLIC_KEY` kosong — kondisi normal di UAT), `PushToggle` kemungkinan menampilkan error atau state yang membingungkan karena request ke endpoint push gagal.

**Target:** `frontend/src/components/notifications/PushToggle.tsx`.

**Aksi:**
1. Baca `PushToggle.tsx` penuh — identifikasi bagaimana ia mendeteksi availability push dan bagaimana handle error.
2. Cek apakah sudah ada `try/catch` atau `isError` handling. Jika sudah ada fallback yang jelas → centang task ini sebagai "sudah OK, tidak perlu ubah".
3. Jika belum ada fallback yang informatif:
   - Cari kondisi di mana push tidak tersedia (VAPID tidak dikonfigurasi, atau `Notification` API tidak tersedia di browser).
   - Ganti tampilan error/null dengan pesan informasi ringan:
     ```tsx
     // Jika push tidak tersedia atau belum dikonfigurasi:
     return (
       <div className="alert alert-info d-flex align-items-center gap-2 small mb-3" role="note">
         <svg ... aria-hidden="true">{/* bell icon dari lucide-react */}</svg>
         <span>Notifikasi push belum aktif. Notifikasi dalam aplikasi tetap berjalan normal.</span>
       </div>
     );
     ```
4. Pastikan `role="note"` (bukan `role="alert"`) — ini info, bukan error.
5. **Jangan ubah** logika subscribe/unsubscribe yang ada.

**Anchor grep:** `PushToggle` · `VAPID` · `Notification.requestPermission` · `vapid-public-key`  
**Gate:** `cd frontend; npm run build` ✅ · Buka `/notifications` tanpa VAPID → pesan info ringan (bukan merah/error). Dengan VAPID → toggle berfungsi normal.

---

- [x] **Q-07** PushToggle: graceful fallback saat VAPID belum dikonfigurasi — info ringan, bukan error merah.

---

### Fase R — UI/UX Public Pages (Audit Screenshot SCOPE 5)

**Tujuan:** Perbaiki 7 masalah UX halaman publik (landing, katalog kamar, detail kamar, mobile) hasil audit screenshot SCOPE 5 tanggal 2026-06-22.  
**Rujukan:** `docs/AI_SCREENSHOT_REVIEW_PROMPTS.md` §SCOPE-5 · screenshot `frontend/screenshots-ui/public-audit/` (P01–P08).  
**Strategi:** R-01..R-04 prioritas konversi dulu (dampak langsung booking) → R-05..R-07 polish mobile. Semua task independen — bisa paralel. Tidak ada perubahan backend/schema.  
**Gate umum tiap task:** `cd frontend; npm run build` ✅ · 1 commit per task.

---

- [x] **R-01 — Hero section: foto besar + tagline + harga visible above-the-fold (P01)**  
  **Masalah:** Dalam 5 detik, calon penghuni tidak melihat foto suasana kost yang menarik, tidak ada harga, dan tidak ada satu CTA besar di hero. Filter kamar langsung muncul tanpa "wow moment."  
  **Target:** Komponen hero di halaman landing publik (grep `PublicGuestDashboardPage` atau `LandingPage`).  
  **Aksi:**
  1. Tambah 1 `<img>` atau `<div>` hero full-width (tinggi ≥420px desktop, ≥220px mobile) dengan foto fasilitas/kamar yang sudah ada di sistem.
  2. Overlay teks di atas foto: tagline singkat (mis. *"Kost bersih & aman dekat Pakuwon Mall"*) + badge harga mulai dari (mis. *"Mulai Rp 500.000/bln"*) — data dari kamar termurah di API.
  3. CTA tombol besar di bawah tagline: *"Lihat Kamar Tersedia →"* — `href="#kamar"` scroll ke grid kamar (anchor R-07).
  4. Filter kamar tetap ada — pindahkan ke BAWAH hero, bukan di atas.  
  **Anchor grep:** `PublicGuestDashboardPage` · `hero` · `landing` · `PublicRoomsPage`  
  **Gate:** `npm run build` ✅ · Chrome 375px: foto hero terlihat, tagline terbaca, tombol CTA klik → scroll ke grid kamar.

---

- [x] **R-02 — Sembunyikan section ulasan jika kosong (P08)**  
  **Masalah:** Section ulasan tampil dengan teks *"Ulasan ditampilkan hanya jika sudah terverifikasi"* tanpa satu pun ulasan — menjadi sinyal merah kepercayaan untuk calon penghuni baru.  
  **Target:** Komponen section ulasan di halaman publik (grep `terverifikasi` atau `ReviewSection` di `frontend/src/pages/public/`).  
  **Aksi:**
  1. Baca query/data yang mengisi section ulasan — cari variabel array ulasan.
  2. Tambah conditional render: `{reviews?.length > 0 ? <ReviewSection /> : null}` — sembunyikan section sepenuhnya jika data kosong.
  3. (Opsional) Ganti section ulasan kosong dengan blok "Keunggulan KOST48" (3–4 poin manfaat: lokasi, keamanan, transparansi harga, WiFi gratis) selama belum ada ulasan nyata.  
  **Anchor grep:** `terverifikasi` · `ulasan` · `ReviewSection` · `reviews` (file halaman publik)  
  **Gate:** `npm run build` ✅ · Dengan data ulasan kosong (DB UAT) → section ulasan tidak tampil sama sekali, tidak ada teks placeholder yang terlihat.

---

- [x] **R-03 — Detail kamar: sticky CTA booking prominent above-the-fold (P03)**  
  **Masalah:** Tombol booking di halaman detail kamar tidak terlihat di viewport pertama — pengguna harus scroll jauh untuk menemukan aksi utama. Halaman paling penting untuk konversi tetapi CTA tersembunyi.  
  **Target:** Halaman detail kamar publik (grep `RoomDetailPublic` atau `PublicRoomDetail` di `frontend/src/pages/public/`).  
  **Aksi:**
  1. Tambah tombol *"Booking Kamar Ini"* di bagian INFO UTAMA atas (tepat di bawah nama kamar + harga) — sebelum tabel spesifikasi.
  2. Mobile sticky: tambah `<div className="d-md-none sticky-booking-cta">` di bawah layout — `position: sticky; bottom: 0; padding: 12px; background: white; border-top: 1px solid var(--border-default);` — berisi tombol booking full-width.
  3. Untuk kamar PENUH: ganti kedua tombol tersebut dengan *"Tanya Ketersediaan via WhatsApp"* (reuse logika dari state "kamar penuh" yang sudah ada di P04).  
  **Anchor grep:** `RoomDetailPublic` · `GuestBookingForm` · `Tanya Ketersediaan` · `sticky`  
  **Gate:** `npm run build` ✅ · Buka `/rooms/:id/detail` kamar available → tombol booking terlihat tanpa scroll · mobile 375px → sticky CTA muncul di bawah layar.

---

- [x] **R-04 — Detail kamar: hapus teks overlay foto + tampilkan nominal DP eksplisit (P03)**  
  **Masalah:** (a) Foto kamar memiliki teks overlay besar *"Kamar K"* yang terkesan placeholder/tidak profesional. (b) Nominal DP 30% tidak disebutkan eksplisit di bagian atas — calon penghuni bingung berapa yang harus disiapkan hari pertama.  
  **Target:** Komponen foto kamar + section harga di halaman detail kamar publik.  
  **Aksi:**
  1. (a) Cari sumber teks overlay *"Kamar K"* — kemungkinan nama kamar dirender sebagai `<div>` di atas `<img>`. Hapus overlay dari foto atau pindahkan sebagai caption di BAWAH foto.
  2. (b) Di section info harga atas (sebelum tabel tarif lengkap), tambah 1 baris ringkas:  
     *"DP awal: Rp [monthlyRent × 0,3] — dibayar saat booking dikonfirmasi, hangus jika batal"*  
     Hitung dinamis dari `monthlyRent * 0.3` (pembulatan ke atas ribuan).
  3. Di bawahnya, tambah 1 baris deposit jaminan: *"Deposit jaminan: Rp [defaultDepositRupiah] — dikembalikan penuh saat checkout"* — bedakan visual dari DP (mis. warna berbeda atau italic).  
  **Anchor grep:** overlay foto kamar · `monthlyRent` · `downPayment` · `defaultDeposit` (halaman detail publik)  
  **Gate:** `npm run build` ✅ · Foto kamar tampil bersih tanpa teks overlay · nominal DP dan deposit tertera jelas sebelum tabel tarif.

---

- [x] **R-05 — Mobile katalog: grid 2 kolom → 1 kolom full-width di ≤480px (P05, P05b)**  
  **Masalah:** Di 375px, kartu kamar 2 kolom membuat foto hanya ~155px lebar — terlalu kecil untuk menilai kondisi kamar. Mayoritas calon penghuni mengakses via HP.  
  **Target:** CSS grid katalog kamar publik — `frontend/src/styles/11-public-pages.css` + komponen `PublicRoomsPage`.  
  **Aksi:**
  1. Grep selector grid kartu: `rooms-grid` / `room-cards-grid` / `grid-template-columns` di `11-public-pages.css`.
  2. Tambah/override media query:
     ```css
     @media (max-width: 480px) {
       .rooms-grid, .room-cards-grid {
         grid-template-columns: 1fr !important;
       }
       .room-card .card-img-top, .room-card img {
         height: 200px;
         object-fit: cover;
       }
     }
     ```
  3. Verifikasi foto tidak terpotong aneh di 1 kolom dan kartu masih terbaca.  
  **Anchor grep:** `rooms-grid` · `room-cards-grid` · `grid-template-columns` di `11-public-pages.css` dan `PublicRoomsPage.tsx`  
  **Gate:** `npm run build` ✅ · Chrome DevTools 375px → kartu kamar 1 kolom penuh, foto ≥200px tinggi, tidak ada scroll horizontal.

---

- [x] **R-06 — Katalog: visual differentiation kamar available vs terisi lebih kuat (P02)**  
  **Masalah:** Kamar tersedia dan kamar terisi hampir identik secara visual di grid — hanya badge kecil yang membedakan. Calon penghuni tidak langsung tahu mana yang bisa dipesan.  
  **Target:** Komponen kartu kamar di katalog publik (grep `AVAILABLE` · `OCCUPIED` di `PublicRoomsPage.tsx`).  
  **Aksi:**
  1. Kamar **TERISI**: tambah `opacity: 0.55` pada kartu + overlay chip *"Terisi"* besar di pojok kiri atas foto (merah, font-weight bold) + tombol booking di-disable/replace dengan *"Lihat Info"*.
  2. Kamar **TERSEDIA**: pertahankan visual normal, opsional tambah `border: 2px solid var(--color-success)` atau badge hijau kecil *"Tersedia"* di pojok foto.
  3. Kamar terisi tetap bisa diklik → redirect ke state "kamar penuh" (halaman P04 yang sudah ada).  
  **Anchor grep:** `AVAILABLE` · `OCCUPIED` · badge status di `PublicRoomsPage.tsx` / komponen kartu kamar  
  **Gate:** `npm run build` ✅ · Grid kamar: sekilas pandang langsung jelas mana yang tersedia vs terisi. Kamar terisi masih bisa diklik.

---

- [x] **R-07 — Mobile: sticky anchor nav untuk halaman publik panjang (P05)**  
  **Masalah:** Halaman landing/rooms di mobile ~15.000px tinggi tanpa shortcut navigasi ke section penting (filter kamar, fasilitas, lokasi, FAQ). Pengguna HP harus scroll sangat jauh.  
  **Target:** Halaman publik landing (`/`) dan katalog (`/rooms`) — `PublicGuestDashboardPage` / `PublicRoomsPage`.  
  **Aksi:**
  1. Tambah komponen sticky shortcut nav — hanya tampil di mobile (`d-md-none`):
     ```tsx
     <nav className="section-shortcuts d-md-none sticky-top bg-white border-bottom py-2 px-3 d-flex gap-3 overflow-x-auto">
       <a href="#kamar" className="text-decoration-none small fw-semibold">Kamar</a>
       <a href="#fasilitas" className="text-decoration-none small fw-semibold">Fasilitas</a>
       <a href="#lokasi" className="text-decoration-none small fw-semibold">Lokasi</a>
       <a href="#faq" className="text-decoration-none small fw-semibold">FAQ</a>
     </nav>
     ```
  2. Tambah `id` anchor ke masing-masing section yang sudah ada: `id="kamar"`, `id="fasilitas"`, `id="lokasi"`, `id="faq"`.
  3. CSS: scroll horizontal jika tidak muat di 1 baris, `z-index: 100`, warna konsisten dengan `--bg-surface`.
  4. Anchor `#kamar` juga menjadi target dari tombol CTA hero (R-01).  
  **Anchor grep:** section headers di `PublicGuestDashboardPage` · `11-public-pages.css`  
  **Gate:** `npm run build` ✅ · Mobile 375px → nav shortcuts sticky di atas saat scroll; klik "Fasilitas" → smooth scroll ke section fasilitas.

---

#### Sub-blok R-B: Admin & Owner App (Audit Screenshot SCOPE 2 — 2026-06-22)

**Rujukan:** screenshot `frontend/screenshots-ui/admin-audit/` (A01–A20).  
**Strategi:** R-08 kritis teks frontend → R-09..R-10 UX tabel & laporan → R-11 safety COA → R-12 investigasi skeleton. Semua independen kecuali R-12 (butuh backend jalan).

---

- [x] **R-08 — Perbaiki teks placeholder "sst" di Payment Review command center (A06)**  
  **Masalah:** Teks *"Antrian Review Pembayaran - Tunggu sst yang lain..."* tampil ke pengguna di halaman review pembayaran. "sst" adalah singkatan/placeholder yang tidak profesional dan membingungkan.  
  **Target:** Komponen command center payment review — grep `sst` atau `Tunggu sst` di `frontend/src/pages/invoices/` atau `frontend/src/pages/payments/`.  
  **Aksi:**
  1. Grep `sst` di seluruh `frontend/src/` — temukan string tersebut.
  2. Ganti dengan teks yang jelas, mis.: *"Belum ada pembayaran yang menunggu review saat ini."* atau *"Semua pembayaran sudah diproses."*
  3. Pastikan tidak ada placeholder lain di halaman yang sama (cek teks dengan huruf kecil tidak wajar: "dll", "etc", "xxx", "todo", "test").  
  **Anchor grep:** `sst` · `Tunggu sst` · `command-center` (file payment/invoice)  
  **Gate:** `npm run build` ✅ · Buka `/invoices` tab Review Pembayaran → tidak ada teks "sst" atau placeholder visible.

---

- [x] **R-09 — Highlight baris invoice overdue/mendekati jatuh tempo (A05)**  
  **Masalah:** Di tabel daftar tagihan, semua baris terlihat identik secara visual — tidak ada perbedaan warna/badge antara tagihan yang sudah melewati jatuh tempo dengan yang masih normal. Admin tidak bisa scan cepat mana yang mendesak.  
  **Target:** `frontend/src/pages/invoices/InvoicesPage.tsx` — baris render tabel tagihan.  
  **Aksi:**
  1. Di setiap baris tabel, hitung selisih `dueDate` vs `today` (pakai `date-fns` yang sudah ada dari O-07).
  2. Kondisi highlight:
     - **Overdue** (jatuh tempo sudah lewat): `className="table-danger"` atau `border-left: 3px solid var(--color-danger)` + badge merah kecil "Lewat X hari"
     - **Mendekati** (≤3 hari): `className="table-warning"` atau badge amber "Jatuh tempo X hari lagi"
     - **Normal**: tidak ada perubahan visual
  3. **JANGAN** ubah logika bisnis atau status invoice — hanya perubahan visual CSS/className.  
  **Anchor grep:** `dueDate` · `jatuh` · baris render tabel di `InvoicesPage.tsx`  
  **Gate:** `npm run build` ✅ · Baris invoice overdue tampil merah/amber; baris normal tidak berubah · tidak ada regresi filter/sort.

---

- [x] **R-10 — Laporan A11: tooltip "Bermasalah" + sinkron Ringkasan Pengeluaran (A11, A16)**  
  **Masalah:** (a) Badge besar "Bermasalah" muncul di halaman laporan tanpa penjelasan kondisi apa yang menyebabkannya — pengguna baru akan panik. (b) Ringkasan Pengeluaran di A11 menampilkan *"Belum ada pengeluaran bulan ini"* padahal A16 menunjukkan 5 pengeluaran Juni 2026 PAID — inkonsistensi yang merusak kepercayaan pada laporan.  
  **Target:** `frontend/src/pages/reports/` atau komponen laporan keuangan (grep `Bermasalah` + `Ringkasan Pengeluaran`).  
  **Aksi:**
  1. (a) Cari kondisi yang men-trigger label "Bermasalah". Tambah `title` atau `<Tooltip>` Bootstrap yang menjelaskan kriteria: mis. *"Status bermasalah: terdapat tunggakan ≥ X% atau arus kas negatif."*
  2. (b) Telusuri query yang mengisi "Ringkasan Pengeluaran" di halaman laporan vs query di halaman pengeluaran (A16). Bandingkan endpoint/filter yang dipakai — kemungkinan perbedaan filter bulan, status, atau kategori. Selaraskan agar keduanya membaca data yang sama.  
  **Anchor grep:** `Bermasalah` · `Ringkasan Pengeluaran` · `pengeluaran bulan ini` (halaman laporan)  
  **Gate:** `npm run build` ✅ · Tooltip "Bermasalah" muncul saat hover badge · Ringkasan Pengeluaran di laporan menampilkan jumlah yang konsisten dengan halaman pengeluaran.

---

- [x] **R-11 — Accounting Setup: konfirmasi sebelum simpan perubahan COA (A20)**  
  **Masalah:** Halaman Accounting Setup (COA) sangat padat dan bisa diubah kapan saja tanpa confirmation dialog. Perubahan COA mid-period dapat merusak integritas semua laporan keuangan historical. Tidak ada visible guard di screenshot A20.  
  **Target:** `frontend/src/pages/accounting/AccountingSetupPage.tsx` — tombol simpan/update COA.  
  **Aksi:**
  1. Grep semua tombol Save/Simpan/Update di `AccountingSetupPage.tsx`.
  2. Ganti handler `onClick` tombol simpan COA dengan `useConfirm()` (sudah ada dari M-02):
     ```tsx
     const ok = await confirm({
       title: 'Ubah Chart of Accounts?',
       message: 'Perubahan COA memengaruhi semua laporan keuangan. Pastikan tidak ada periode aktif yang sedang berjalan sebelum mengubah.',
       confirmLabel: 'Ya, Simpan Perubahan',
       cancelLabel: 'Batal',
       variant: 'warning',
     });
     if (!ok) return;
     // lanjut save
     ```
  3. Tambah banner info kuning di atas halaman AccountingSetup: *"⚠ Ubah COA hanya jika benar-benar diperlukan. Perubahan berlaku untuk semua laporan."*  
  **Anchor grep:** `AccountingSetupPage` · tombol simpan/save · `useConfirm`  
  **Gate:** `npm run build` ✅ · Klik simpan COA → modal konfirmasi muncul; Batal → tidak ada perubahan; Ya → simpan normal.

---

- [ ] **R-12 — Investigasi admin dashboard skeleton tidak hilang (A03)**  
  **Masalah:** Screenshot A03 hanya menampilkan skeleton loading (blue shimmer placeholders) — data dashboard admin tidak pernah muncul menggantikan skeleton. Ini mengindikasikan query aggregate admin gagal atau timeout, sehingga skeleton tidak pernah di-replace dengan konten.  
  **Target:** `frontend/src/pages/dashboard/DashboardAdmin.tsx` · endpoint `GET /api/admin/dashboard/aggregate`.  
  **Aksi:**
  1. Buka `/admin-dashboard` di browser — perhatikan apakah skeleton menghilang dalam ≤3 detik atau tetap tampil.
  2. Buka DevTools → Network → cari request `/api/admin/dashboard/aggregate`:
     - **404**: endpoint belum terdaftar → ulangi Q-01 (rebuild backend dist).
     - **200 tapi skeleton tetap**: cek `aggregateQuery.isLoading` tidak pernah jadi `false` — mungkin response shape tidak cocok dengan yang diharapkan frontend.
     - **Error lain**: baca pesan error, perbaiki sesuai root cause.
  3. Jika data berhasil dimuat tapi ada section yang tetap kosong/placeholder: pastikan semua field di response aggregate sudah di-destructure dengan benar di `DashboardAdmin.tsx`.
  4. Jika skeleton sudah hilang dan data tampil normal → centang task ini sebagai DONE (A03 hanya timing screenshot).  
  **Anchor grep:** `aggregateQuery` · `isLoading` · `DashboardAdmin` · `AdminDashboardModule`  
  **Gate:** Buka `/admin-dashboard` → dalam ≤3 detik skeleton hilang, data KPI dan action table tampil berisi. DevTools: `/api/admin/dashboard/aggregate` → HTTP 200.

---

#### Sub-blok R-C: Tenant Portal App (Audit Screenshot SCOPE 1 — 2026-06-22)

**Rujukan:** screenshot `frontend/screenshots-ui/tenant-audit/` (T01–T14c) · laporan audit sesi 2026-06-22.  
**Urutan:** R-13 + R-14 wajib selesai dulu (blocker) → R-15..R-18 bisa paralel.  
**Gate umum tiap task:** `cd frontend; npm run build` ✅ · 1 commit per task. Tidak ada perubahan backend/schema.

---

- [x] **R-13 🔴 KRITIS — Tenant: Fix routing 404 halaman Checkout & Perpanjangan Kontrak (T08, T09)**  
  **Masalah:** Halaman `/portal/checkout` dan `/portal/renewal` (atau rute setaranya) menampilkan halaman 404 — dua fitur paling penting bagi penghuni tidak bisa diakses sama sekali. Ini blocker mutlak sebelum publish.  
  **Target:** React Router config untuk portal tenant (grep `checkout` · `renewal` di `frontend/src/App.tsx` atau `frontend/src/routes/`).  
  **Aksi:**
  1. Grep rute yang terdaftar: cari `checkout` dan `renewal` di router config — apakah ada `<Route path="...checkout...">` dan `<Route path="...renewal...">`.
  2. Grep komponen: `CheckoutPage` · `CheckoutRequestPage` · `RenewalPage` · `MyRenewalPage` — temukan apakah komponen ada di `frontend/src/pages/`.
  3. Dua kemungkinan root cause:
     - **Komponen ada tapi rute tidak terdaftar** → tambahkan `<Route path="/portal/checkout" element={<CheckoutPage />} />` di router.
     - **Komponen tidak ada** → buat stub minimal yang mengarahkan ke formulir checkout via `StayPage` (pakai tombol "Ajukan Checkout" yang sudah ada di portal stay, bukan halaman terpisah).
  4. Setelah fix, navigasi ke rute tersebut dari portal utama harus berhasil (bukan 404).  
  **Anchor grep:** `checkout` · `renewal` di `App.tsx` / `routes/` · `CheckoutPage` · `RenewalPage`  
  **Gate:** `npm run build` ✅ · Buka `/portal/checkout` → bukan 404 · Buka `/portal/renewal` → bukan 404.

---

- [x] **R-14 🔴 KRITIS — Tenant: Mask NIK di halaman profil (T10) — UU PDP**  
  **Masalah:** NIK `0871220000000` tampil penuh di halaman "Data Penghuni Tambahan" — pelanggaran UU PDP No. 27/2022 (NIK termasuk data pribadi sensitif). Penghuni mungkin mengakses portal dari perangkat bersama.  
  **Target:** Komponen profil tenant (grep `nik` · `NIK` · `ktp` di `frontend/src/pages/profile/` atau `frontend/src/pages/tenant/`).  
  **Aksi:**
  1. Cari render NIK — kemungkinan baris `{tenant.nik}` atau `{profile.nik}` di komponen profil.
  2. Ganti dengan fungsi mask: tampilkan hanya 4 digit awal + `xxxxxxxx` + 4 digit akhir (NIK 16 digit):
     ```tsx
     const maskNik = (nik: string) => nik.length >= 8 ? `${nik.slice(0, 4)}xxxxxxxx${nik.slice(-4)}` : '****';
     ```
  3. Tambahkan tombol "👁 Tampilkan" kecil di sebelahnya — `useState(false)` untuk toggle reveal (opsional, hanya jika desain memang perlu penghuni melihat NIK penuh sendiri).
  4. **Jangan hapus NIK dari data** — hanya ubah tampilan (masking di FE saja).  
  **Anchor grep:** `.nik` · `NIK` · `identityNumber` di komponen profil tenant  
  **Gate:** `npm run build` ✅ · Halaman profil: NIK tampil sebagai `0871xxxxxxxx0000` (atau format serupa) · tidak ada NIK mentah di DOM.

---

- [x] **R-15 🟡 — Tenant: Perbaiki mobile nav — label terpotong di bottom tab bar (T13)**  
  **Masalah:** Di mobile (375px), label tab "Panduan Ko...", "Poin & Rewa...", "Panduan &..." terpotong tidak terbaca. Ada 6 tab di top nav yang tidak muat di mobile.  
  **Target:** `frontend/src/components/layout/MobileBottomNav.tsx` (dibuat di P-05) atau `TenantWorkspaceTabs.tsx`.  
  **Aksi:**
  1. Kurangi tab mobile menjadi 4 yang paling sering dipakai: **Beranda** (Panduan Kos) · **Tagihan** · **Laporan** · **Profil**.
  2. Tab "Poin & Reward", "Panduan & Aturan", "Pesan WiFi" → pindahkan ke menu "Lainnya ···" (overlay bottom sheet atau halaman `/portal/more`).
  3. Gunakan ikon lucide-react tanpa label teks (label hanya di mode desktop), atau label singkat ≤7 karakter: "Beranda", "Tagihan", "Laporan", "Profil".
  4. **Jangan ubah** navigasi desktop — perubahan ini hanya di breakpoint `≤768px`.  
  **Anchor grep:** `MobileBottomNav` · `TenantWorkspaceTabs` · `max-width: 768`  
  **Gate:** `npm run build` ✅ · Chrome DevTools 375px: 4 tab tampil tanpa terpotong · semua halaman masih bisa dijangkau.

---

- [x] **R-16 🟡 — Tenant: Buka accordion info kamar by default di portal utama (T02)**  
  **Masalah:** Di portal utama (`MyStayPage`), accordion "Info kamar", "Fasilitas", "Inventaris kamar", "Tarif & dana titipan" semua collapsed by default — penghuni baru harus klik 4× untuk melihat info dasar kamarnya. Kesan pertama buruk.  
  **Target:** `frontend/src/pages/tenant/MyStayPage.tsx` (atau nama setara) — section accordion info kamar.  
  **Aksi:**
  1. Grep `Accordion` atau `collapse` + `Info kamar` / `Fasilitas` di `MyStayPage.tsx` — temukan `defaultActiveKey` atau kondisi expand.
  2. Set "Info kamar" dan "Fasilitas" terbuka by default (`defaultActiveKey={['info-kamar', 'fasilitas']}` atau `defaultExpanded={true}`).
  3. "Inventaris kamar" dan "Tarif & dana titipan" boleh tetap collapsed (konten lebih teknis).
  4. Simpan preferensi expand/collapse ke `sessionStorage` agar jika penghuni sengaja menutupnya, tidak terbuka lagi setiap refresh.  
  **Anchor grep:** `Accordion` · `Info kamar` · `Fasilitas` di `MyStayPage.tsx`  
  **Gate:** `npm run build` ✅ · Buka portal utama → "Info kamar" dan "Fasilitas" langsung terbuka tanpa klik · klik tutup → tetap tertutup setelah refresh.

---

- [x] **R-17 🟢 — Tenant: Empty states Panduan & Aturan + Loyalty Reward lebih informatif (T07, T09-manual)**  
  **Masalah:** (a) Halaman "Panduan & Aturan Kos" menampilkan *"Panduan belum tersedia. Hubungi admin bila ada pertanyaan."* — tidak informatif, tidak ada nomor WA atau cara menghubungi. (b) Halaman "Poin & Reward" menampilkan katalog reward kosong (*"Belum ada reward tersedia"*) — penghuni punya 300 poin tapi tidak bisa menukar apapun; sistem poin terasa percuma.  
  **Target:** (a) Komponen halaman panduan/manual tenant · (b) Komponen katalog reward di loyalty page.  
  **Aksi:**
  1. **(a) Panduan:** Ganti teks placeholder dengan isi minimal: tampilkan 3–5 aturan dasar kost (jam tamu, kebersihan, larangan) yang sudah ada di `M02_KEPUTUSAN_OWNER.md`. Tambahkan link WA admin di bawah (reuse `KOST_WHATSAPP_NUMBER` dari `WifiOrderPage.tsx` — L-10).
  2. **(b) Reward katalog kosong:** Ganti empty state *"Belum ada reward tersedia"* dengan teks *"Reward segera hadir — kumpulkan poin kamu sekarang!"* + ilustrasi kecil + penjelasan 1 kalimat cara mendapat poin (bayar tepat waktu, perpanjang kontrak). Jangan hapus seksi poin/leaderboard yang sudah berjalan.  
  **Anchor grep:** `Panduan belum tersedia` · `Belum ada reward` · komponen loyalitas + panduan tenant  
  **Gate:** `npm run build` ✅ · Buka Panduan & Aturan → ada konten minimal, ada link/cara hubungi admin · Buka Poin & Reward → katalog kosong punya pesan motivasi, bukan kekosongan polos.

---

- [x] **R-18 🟢 — Tenant: Bar chart "Tagihan per Status" tidak render di mobile (T13b)**  
  **Masalah:** Di mobile, section "Tagihan per Status" di halaman Tagihan Saya menampilkan bar kosong tanpa angka atau warna — komponen chart tidak responsive atau gagal render di viewport sempit.  
  **Target:** Komponen chart status tagihan di `frontend/src/pages/tenant/` (grep `Tagihan per Status` · bar chart di halaman invoices tenant).  
  **Aksi:**
  1. Identifikasi library chart yang dipakai (kemungkinan `recharts` atau `chart.js`).
  2. Cek apakah container chart punya lebar fixed (px) — ganti ke `width="100%"` + `responsive={true}` (untuk recharts: bungkus dalam `<ResponsiveContainer width="100%" height={200}>`).
  3. Jika chart terlalu kompleks untuk mobile: tambah kondisi `{isMobile ? <TextFallback /> : <BarChart />}` — tampilkan ringkasan teks (mis. "Lunas: 1 · Belum Bayar: 1") sebagai fallback di mobile ≤768px.
  4. **Jangan ubah** logika data/query — hanya perbaikan render responsif.  
  **Anchor grep:** `Tagihan per Status` · `BarChart` · `ResponsiveContainer` di komponen invoice tenant  
  **Gate:** `npm run build` ✅ · Chrome DevTools 375px: chart status tagihan tampil dengan bar berwarna atau fallback teks yang terbaca.

---

#### Sub-blok R-D: Staff App (Audit Screenshot SCOPE 4 — 2026-06-22)

**Rujukan:** screenshot `frontend/screenshots-ui/staff-audit/` (S01–S10b) · laporan audit sesi 2026-06-22.  
**Urutan:** R-19 kritis (mobile meter table) → R-20 (guard toast) → R-21..R-23 bisa paralel → R-24 polish terakhir.  
**Gate umum tiap task:** `cd frontend; npm run build` ✅ · 1 commit per task. Tidak ada perubahan backend/schema.

---

- [x] **R-19 🔴 KRITIS — Staff: Tabel meter 48 kamar tidak bisa dipakai di mobile (S10)**  
  **Masalah:** "Status Meter Bulan Ini" — tabel 6 kolom (Kamar/Penghuni/Status/Listrik/Air/Tindakan) × 48 baris dirender di layar 375px tanpa horizontal scroll. Kolom berdesak-desakan, tombol "Tindakan" tidak bisa disentuh dengan jari. Staf yang menggunakan HP tidak bisa mencatat meter sama sekali dari halaman ini.  
  **Target:** Komponen tabel meter di dashboard staf (grep `Status Meter` · `meter` · `StaffDashboard` atau `DashboardStaff.tsx` di `frontend/src/pages/`).  
  **Aksi:**
  1. Bungkus tabel meter dalam `<div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>` — minimal ini sudah menyelesaikan problem di mobile.
  2. Tambah `position: sticky; left: 0; background: var(--bg-surface);` pada kolom pertama (nama kamar) agar tetap terlihat saat scroll horizontal.
  3. Opsional (lebih baik): di mobile ≤768px, ganti tabel dengan tampilan card list per kamar — tiap card: nama kamar + badge status + tombol "Catat Meter". Tabel tetap di desktop.
  4. **Jangan ubah** logika data meter — hanya perubahan layout/CSS.  
  **Anchor grep:** `Status Meter` · `meter-table` · `DashboardStaff` · tabel kamar di staff dashboard  
  **Gate:** `npm run build` ✅ · Chrome DevTools 375px: tabel meter bisa discroll horizontal ATAU tampil sebagai card list · kolom kamar tidak hilang dari viewport.

---

- [x] **R-20 🔴 KRITIS — Staff: Guard redirect tambah toast feedback (S08, S09)**  
  **Masalah:** Saat staf mencoba akses halaman yang dilarang (invoices/reports/stays/portal tenant), terjadi silent redirect kembali ke dashboard tanpa pesan apapun. Staf tidak tahu kenapa URL berubah tiba-tiba — bisa dikira bug atau koneksi bermasalah.  
  **Target:** Guard/middleware frontend yang menangani redirect role STAFF (grep `STAFF` · `RoleGuard` · `ProtectedRoute` · `useAuth` di `frontend/src/`).  
  **Aksi:**
  1. Temukan di mana redirect untuk role STAFF terjadi — kemungkinan di `ProtectedRoute.tsx`, `AppRouter.tsx`, atau hook `useAuth`.
  2. Sebelum atau sesaat setelah redirect, tambahkan satu toast informatif (reuse `useToast` yang sudah ada dari M-06):
     ```tsx
     toast('Halaman ini hanya dapat diakses oleh Admin atau Owner.', 'warning');
     navigate('/staff-dashboard'); // atau rute staff yang sesuai
     ```
  3. Durasi toast: 5000ms (cukup terbaca, tidak mengganggu).
  4. **Jangan tambah** halaman "403 Forbidden" baru — toast sudah cukup untuk kasus ini.  
  **Anchor grep:** `ProtectedRoute` · `RoleGuard` · `navigate` + `STAFF` · `useToast`  
  **Gate:** `npm run build` ✅ · Login sebagai STAFF → akses `/invoices` → toast "Halaman ini hanya dapat diakses..." muncul + redirect ke dashboard staf.

---

- [x] **R-21 🟡 — Staff: Dashboard mobile terlalu panjang — pindahkan tabel meter ke tab Gudang (S10)**  
  **Masalah:** Dashboard staf di mobile ~11.000px tinggi karena section berurut: welcome → progress → stats → prioritas → task list → skor → checklist → tabel meter 48 kamar. Staf harus scroll sangat jauh padahal tugas utama (tombol "Mulai Kerjakan") ada di tengah halaman.  
  **Target:** `DashboardStaff.tsx` (atau `StaffDashboardPage.tsx`) — posisi render tabel meter.  
  **Aksi:**
  1. Pindahkan section "Status Meter Bulan Ini" (tabel 48 kamar) **keluar dari tab "Hari Ini"** → pindahkan ke tab **"Kamar & Stok"** atau buat sub-tab baru di sana.
  2. Di tab "Hari Ini", gantikan tabel meter dengan widget ringkas: `{jumlahKamarBelumCatat} kamar belum dicatat meter bulan ini → [Lihat Kamar]` — satu baris chip saja.
  3. Verifikasi tab "Hari Ini" setelah dipotong masih memuat: greeting → progress → prioritas → task list → skor — ini sudah cukup untuk kebutuhan harian staf.
  4. **Jangan hapus** tabel meter — hanya dipindah, masih harus bisa diakses.  
  **Anchor grep:** `Status Meter` · `DashboardStaff` · tab "Hari Ini" vs tab "Kamar & Stok"  
  **Gate:** `npm run build` ✅ · Mobile 375px: tab "Hari Ini" tidak melebihi 3000px tinggi · tabel meter masih tersedia di tab lain.

---

- [x] **R-22 🟡 — Staff: Gudang empty state dengan CTA hubungi admin (S04)**  
  **Masalah:** Tab Gudang menampilkan *"Belum ada data barang umum atau gudang. Data barang akan muncul setelah master barang tersedia."* tanpa aksi apapun. Staf yang baru pertama membuka halaman ini tidak tahu harus berbuat apa, dan tidak ada cara menghubungi admin dari halaman ini.  
  **Target:** Komponen empty state di halaman gudang staf (grep `Belum ada data barang` · `GudangPage` · `WarehousePage` di `frontend/src/pages/`).  
  **Aksi:**
  1. Ganti teks placeholder dengan empty state yang actionable:
     - Judul: *"Belum ada barang yang terdaftar"*
     - Deskripsi: *"Admin perlu menambahkan daftar barang terlebih dahulu. Hubungi admin untuk memulai pengisian stok gudang."*
     - Tombol: *"Hubungi Admin via WhatsApp"* → reuse `KOST_WHATSAPP_NUMBER` dari `WifiOrderPage.tsx`.
  2. Pertahankan counter "0 habis | 0 menipis | 0 masalah fisik" — sembunyikan saat data kosong (tampilkan hanya setelah ada barang).
  3. **Jangan ubah** logika data/query — hanya perubahan teks dan tombol CTA.  
  **Anchor grep:** `Belum ada data barang` · `GudangPage` · `WarehousePage` · `KOST_WHATSAPP_NUMBER`  
  **Gate:** `npm run build` ✅ · Buka tab Gudang dengan data kosong → pesan actionable + tombol WA muncul.

---

- [x] **R-23 🟡 — Staff: Prompt upload foto saat menyelesaikan tugas (S02, S03)**  
  **Masalah:** Laporan staf (S03) menunjukkan "0% Bukti foto lengkap" sebagai KPI negatif — artinya tidak ada satu pun foto yang dilampirkan ke penyelesaian tugas. Dari S02, tidak ada petunjuk visible cara upload foto saat mengerjakan tiket. Kemungkinan besar tombol/form foto tersembunyi di langkah yang tidak ditemukan staf.  
  **Target:** Komponen detail/penyelesaian tugas staf (grep `foto` · `upload` · `SelesaikanTugas` · `TaskDetail` di halaman tugas staf).  
  **Aksi:**
  1. Cari form penyelesaian tugas — temukan apakah sudah ada field upload foto dan di mana posisinya.
  2. Jika ada tapi tersembunyi: pindahkan field foto ke ATAS form penyelesaian (sebelum field catatan teks) dengan label tegas: *"📷 Foto bukti kerja (wajib untuk skor lengkap)"*.
  3. Jika belum ada: tambahkan `<input type="file" accept="image/*" capture="environment">` — `capture="environment"` langsung membuka kamera belakang HP.
  4. Tampilkan preview thumbnail foto setelah dipilih sebelum submit.
  5. Tambahkan hint text di bawah field: *"Foto tanpa bukti menurunkan skor laporan bulan ini."*  
  **Anchor grep:** `foto` · `upload` · `capture` · form selesaikan tugas staf  
  **Gate:** `npm run build` ✅ · Mobile 375px: buka detail tugas → field foto kamera muncul di atas form · pilih foto → preview thumbnail tampil.

---

- [x] **R-24 🟢 — Staff: Tasks "Menunggu info" perlu CTA atau penjelasan (S01)**  
  **Masalah:** Di dashboard, beberapa task tampil dengan label *"Tugas menunggu info"* (AC kurang dingin, Kamar kamar mandiri bocor, Lampu kandang, WiFi sangkuriang) tanpa tombol aksi apapun. Staf tidak tahu apakah harus menunggu, menghubungi admin, atau mengabaikan.  
  **Target:** Komponen task list di dashboard staf (grep `menunggu info` · `WAITING` · `task-list` di `DashboardStaff.tsx`).  
  **Aksi:**
  1. Untuk task dengan status "Menunggu info" / `WAITING`: tampilkan tooltip atau teks kecil di bawah label — *"Admin sedang meninjau. Tunggu konfirmasi sebelum dikerjakan."*
  2. Opsional: tambahkan tombol "Tanya Admin" kecil (secondary/ghost) yang membuka WA dengan pesan pre-filled: *"Halo, saya mau tanya status tugas [nama tugas] di kamar [X]."*
  3. Pastikan task "Menunggu info" **tidak** muncul di filter "Kerjakan dulu" — hanya di filter "Semua" atau "Tunggu dicek".  
  **Anchor grep:** `menunggu info` · `WAITING` · status task di staff dashboard  
  **Gate:** `npm run build` ✅ · Task "Menunggu info" punya tooltip/keterangan · tidak muncul di tab "Kerjakan dulu".

---

#### Sub-blok R-E: Owner-Only Pages (Audit Screenshot SCOPE 3 — 2026-06-22)

**Rujukan:** screenshot `frontend/screenshots-ui/owner-extra-audit/` (O01–O14) · laporan audit sesi 2026-06-22.  
**Urutan:** R-25 kritis (role display) → R-26 (notif grouping) → R-27..R-29 bisa paralel → R-30 polish terakhir.  
**Gate umum tiap task:** `cd frontend; npm run build` ✅ · 1 commit per task. Tidak ada perubahan backend/schema.

---

- [x] **R-25 🔴 KRITIS — Owner: Fix display role "10tamu" di tabel Users & Akses (O02)**  
  **Masalah:** Kolom "Role" di halaman manajemen user menampilkan *"10tamu"* untuk semua user yang terlihat — kemungkinan truncation atau format render yang salah. Owner tidak bisa membaca role dengan benar sehingga manajemen akses (assign/revoke OWNER/ADMIN/STAFF/TENANT) menjadi berbahaya.  
  **Target:** Komponen tabel users di halaman user management owner (grep `Users & Akses` · `role` · `UserManagement` · `UsersPage` di `frontend/src/pages/`).  
  **Aksi:**
  1. Grep render kolom Role di tabel — temukan bagaimana nilai role diformat (kemungkinan `user.role` langsung atau via mapping).
  2. Pastikan mapping role ke label bahasa Indonesia sudah benar:
     ```tsx
     const ROLE_LABELS: Record<string, string> = {
       OWNER: 'Owner', ADMIN: 'Admin', STAFF: 'Staf', TENANT: 'Penghuni'
     };
     // render: {ROLE_LABELS[user.role] ?? user.role}
     ```
  3. Tambahkan badge berwarna per role untuk scan visual cepat:
     - OWNER → badge merah gelap · ADMIN → badge biru · STAFF → badge hijau · TENANT → badge abu
  4. Verifikasi tidak ada data yang masih menampilkan "10tamu" atau format lain yang tidak terbaca.  
  **Anchor grep:** `10tamu` · `user.role` · kolom role di tabel users owner  
  **Gate:** `npm run build` ✅ · Buka halaman Users & Akses → kolom Role menampilkan "Penghuni" / "Staf" / "Admin" / "Owner" dengan badge berwarna · tidak ada "10tamu".

---

- [x] **R-26 🟡 — Owner: Notifikasi date grouping + filter noise test data (O12)**  
  **Masalah:** Halaman notifikasi owner dipenuhi notifikasi duplikat dari seeder (*"INT TEST: Pengumuman tes — harap abaikan"*) bercampur dengan notifikasi real tanpa pemisah tanggal. Owner sulit menemukan notifikasi yang benar-benar perlu ditindak.  
  **Target:** Komponen halaman notifikasi owner (grep `NotificationsPage` · `NotificationList` · `owner/notifications` di `frontend/src/pages/`).  
  **Aksi:**
  1. Tambah **date grouping** — kelompokkan notifikasi per hari dengan header separator: *"Hari ini — 21 Jun 2026"*, *"Kemarin"*, *"Minggu lalu"*. Gunakan `date-fns` `isToday` / `isYesterday` / `format` (sudah ada dari O-07).
  2. Tambah **filter tab** sederhana: "Semua | Keuangan | Operasional | Sistem" — filter berdasarkan `notificationType` yang sudah ada di data.
  3. Notifikasi dengan kata *"INT TEST"* atau *"harap abaikan"* di judul: sembunyikan otomatis di environment production (`NODE_ENV === 'production'`). Di dev tetap tampil.
  4. Tambah **pagination** atau "Muat lebih banyak" jika item > 20 — jangan render semua sekaligus.  
  **Anchor grep:** `NotificationsPage` · `notification` · `isToday` · `notificationType`  
  **Gate:** `npm run build` ✅ · Notifikasi dikelompokkan per hari · filter tab berfungsi · notif "INT TEST" tidak tampil di build production.

---

- [x] **R-27 🟡 — Owner: Filter periode default "bulan ini" di Meter Readings (O03)**  
  **Masalah:** Halaman Riwayat Meter menampilkan 38 data dari berbagai bulan bercampur tanpa filter aktif. Owner tidak langsung tahu kamar mana yang belum tercatat meter untuk bulan berjalan — harus manual filter dulu setiap kali membuka halaman.  
  **Target:** Komponen halaman meter readings owner (grep `Riwayat Meter` · `MeterReadingsPage` · `meter-readings` di `frontend/src/pages/`).  
  **Aksi:**
  1. Set default filter ke bulan & tahun saat ini saat halaman pertama dibuka — gunakan `date-fns` `startOfMonth` / `endOfMonth` sebagai nilai awal query parameter.
  2. Tambah selector bulan/tahun yang terlihat di atas tabel (bukan hanya tersembunyi di filter) — mis. `<MonthPicker value={selectedMonth} onChange={setSelectedMonth} />` atau dropdown sederhana.
  3. Tambah kolom/indikator visual: kamar yang **belum** ada bacaan meter bulan ini ditandai dengan badge "Belum dicatat" berwarna kuning.
  4. Klarifikasi dua tombol "Catat": tombol "Catat" per baris = input bacaan baru untuk baris itu; tombol "Catat Meter Manual" di atas = input untuk kamar mana saja. Tambahkan `title` tooltip yang berbeda.  
  **Anchor grep:** `MeterReadingsPage` · `meter-readings` · filter periode · `startOfMonth`  
  **Gate:** `npm run build` ✅ · Buka halaman Meter Readings → default filter = bulan ini · kamar tanpa bacaan punya badge "Belum dicatat".

---

- [x] **R-28 🟡 — Owner: Seragamkan bahasa + ganti tombol "Poster" di Asset Register (O08)**  
  **Masalah:** Halaman Asset Register adalah satu-satunya halaman dengan campuran bahasa Inggris-Indonesia yang kuat: heading *"Asset Register"*, label KPI *"LEDGER NET FIXED ASSET"* dan *"ADJUSTMENT GAP"* di samping *"Nilai Aset"* dan *"Nilai Buku"*. Selain itu tombol *"Poster"* di section depresiasi tidak jelas fungsinya.  
  **Target:** Komponen halaman aset (`AssetRegisterPage` atau `FinanceAssetsPage`) di `frontend/src/pages/`.  
  **Aksi:**
  1. Ganti heading *"Asset Register"* → *"Daftar Aset Tetap"*.
  2. Ganti label KPI:
     - *"LEDGER NET FIXED ASSET"* → *"Nilai Buku (Ledger)"*
     - *"ADJUSTMENT GAP"* → *"Selisih Ledger vs Register"*
  3. Ganti tombol *"Poster"* → *"Cetak / Ekspor"* (atau hapus jika belum fungsional, tambahkan `disabled` dengan tooltip *"Segera hadir"*).
  4. Pastikan empty state text konsisten bahasa Indonesia.  
  **Anchor grep:** `Asset Register` · `LEDGER NET FIXED ASSET` · `ADJUSTMENT GAP` · `Poster` di halaman aset owner  
  **Gate:** `npm run build` ✅ · Halaman aset 100% bahasa Indonesia · tidak ada label bahasa Inggris yang tersisa di heading/KPI.

---

- [x] **R-29 🟡 — Owner: Guard redirect tambah toast — extend dari R-20 (O13)**  
  **Masalah:** Sama dengan issue staff (R-20) — owner yang mencoba akses portal tenant dikembalikan ke Owner Dashboard tanpa pesan apapun. Implementasi R-20 harus di-extend agar cover role OWNER juga.  
  **Target:** Sama dengan R-20 — guard/middleware frontend (grep `ProtectedRoute` · `RoleGuard` di `frontend/src/`).  
  **Aksi:**
  1. Jika R-20 sudah dikerjakan: pastikan toast yang ditambahkan di R-20 juga triggered saat OWNER mencoba akses rute portal tenant (bukan hanya STAFF).
  2. Sesuaikan pesan toast per konteks:
     - STAFF coba akses area keuangan → *"Halaman ini hanya dapat diakses oleh Admin atau Owner."*
     - OWNER/ADMIN coba akses portal tenant → *"Area portal penghuni hanya dapat diakses dengan akun Penghuni."*
  3. Satu implementasi guard redirect yang menangani semua skenario cross-role.  
  **Anchor grep:** `ProtectedRoute` · `RoleGuard` · rute portal tenant · `useToast`  
  **Dependensi:** Lebih mudah dikerjakan setelah R-20 selesai.  
  **Gate:** `npm run build` ✅ · Login sebagai OWNER → akses `/portal/stay` → toast muncul "Area portal penghuni..." + redirect ke owner dashboard.

---

- [x] **R-30 🟢 — Owner: Tambah chip "OWNER ONLY" di halaman eksklusif owner (O01, O08, dll)**  
  **Masalah:** Halaman-halaman eksklusif owner (loss refunds, aset, user management, dll) secara visual terlihat sama dengan halaman admin biasa. Owner baru yang baru diberi akses tidak tahu halaman mana yang tidak bisa dilihat admin/staf — tidak ada penanda eksplisit di body konten halaman.  
  **Target:** Komponen layout atau wrapper halaman owner-only.  
  **Aksi:**
  1. Tentukan daftar rute yang benar-benar owner-only (cek `navigation.ts` + `ProtectedRoute` — rute dengan `roles: ['OWNER']`).
  2. Untuk setiap halaman owner-only, tambahkan chip kecil di bawah heading halaman:
     ```tsx
     <span className="badge bg-danger-subtle text-danger-emphasis ms-2 small">
       Hanya Owner
     </span>
     ```
  3. Opsional: tambahkan tooltip pada chip *"Halaman ini tidak dapat dilihat oleh Admin, Staf, atau Penghuni."*
  4. **Jangan tambahkan** chip ini ke halaman yang bisa diakses admin juga — hanya yang pure owner-only.  
  **Anchor grep:** `roles: \['OWNER'\]` di router/navigation · halaman loss refunds, aset, user management  
  **Gate:** `npm run build` ✅ · Buka halaman loss refunds → ada chip "Hanya Owner" kecil di bawah heading · halaman admin biasa tidak punya chip ini.
---

### Fase T — Wizard Redesign + Animasi Marketing

**Tujuan:** Perbaiki wizard result screen — ganti chip + dua tombol redundant dengan RoomCard langsung, tambah animasi, copy marketing. Extract RoomCard ke komponen bersama.

**Rujukan:** `frontend/src/components/public/GuestPreferenceWizard.tsx` · `frontend/src/components/rooms/RoomCard.tsx` · `frontend/src/styles/11-public-pages.css`

#### T-01 ✅ Redesign Wizard + Extract RoomCard

**Perubahan:**
- Extract `RoomCard` + `RoomCardImage` + `buildWhatsAppUrl` + `getCategoryBadgeInfo` dari `PublicRoomsPage.tsx` ke `frontend/src/components/rooms/RoomCard.tsx`
- Wizard result screen sekarang menampilkan **grid RoomCard** (bukan chip kecil) untuk kamar yang cocok + tersedia
- Hapus dua tombol "Tampilkan kamar di katalog" dan "Lihat semua kamar" — ganti dengan "Lihat Semua Kamar Sesuai Preferensi →", "Ubah Preferensi", "Lanjut tanpa filter"
- Animasi: fadeInUp, stagger opsi, count-up estimasi, pulse CTA, direction slide transisi antar step
- Marketing copy: pertanyaan lebih personal, urgency line "🔥 X kamar tersedia", social proof di opsi
- RoomCard di wizard punya `bookViaWA={true}` — booking langsung ke WA admin tanya ketersediaan
- Dark-theme RoomCard variant untuk latar wizard gelap
- Skeleton shimmer saat loading kamar

**Gate:** `npx tsc --noEmit` ✅

---

---

# 📋 RENCANA EKSEKUSI DETAIL — FASE V & W (UNTUK AI EKSEKUTOR)

> **Tujuan:** panduan langkah-demi-langkah yang bisa diikuti AI lemah tanpa menebak.
> **Format:** setiap step berisi: (1) file target, (2) fungsi/area yang diubah, (3) apa yang ditambah/diubah, (4) kode konkret, (5) cara verifikasi.
> **Larangan:** jangan ubah `schema.prisma`, jangan tambah npm dep, jangan `git push`.

---

## FASE V — RENCANA DETAIL

---

### V-07 — Hardening Upload, Cron, Meter, Ticket Image

#### V-07a — Upload Marketing/Fasilitas: Magic-Byte Detection

**Tujuan:** semua endpoint upload gambar harus pakai `detectImageMime`, bukan `file.mimetype`, dan extension dari hasil deteksi.

**File yang diaudit:**
- `backend/src/modules/marketing/marketing.controller.ts` — cari method upload
- `backend/src/modules/rooms/rooms.controller.ts` — cari method upload room image
- `backend/src/modules/facility-images/facility-images.controller.ts` — cari method upload

**Step 1: Temukan endpoint upload yang belum pakai magic-byte**
```bash
cd backend
rg -n "UploadedFile|FileInterceptor|upload.*image" src/modules/marketing/ src/modules/rooms/ src/modules/facility-images/ src/modules/announcements/ src/modules/tickets/ src/modules/tenants/
```
Untuk setiap endpoint yang menggunakan `FileInterceptor`:
1. Cek apakah ada panggilan `detectImageMime(filePath)` setelah file disimpan.
2. Jika TIDAK ada, tambahkan magic-byte check.

**Step 2: Pola hardening yang harus diterapkan** (copy dari `payment-submissions.controller.ts:177-185`):
```typescript
import { detectImageMime, deleteFileSafe } from '../../common/utils/file-signature.util';
import { randomBytes } from 'crypto';
import { renameSync } from 'fs';
import { extname, join } from 'path';

// Di dalam handler upload, setelah file tersimpan:
const filePath = join(UPLOAD_DIR, file.filename);
const detectedMime = detectImageMime(filePath);
if (!detectedMime) {
  deleteFileSafe(filePath);
  throw new BadRequestException('File harus berupa gambar JPG, PNG, atau WebP yang valid');
}

// Rename ke secure filename
const safeExt = extname(detectedMime === 'image/jpeg' ? 'x.jpg' : detectedMime === 'image/png' ? 'x.png' : 'x.webp');
const secureName = `${Date.now()}-${randomBytes(8).toString('hex')}${safeExt}`;
const securePath = join(UPLOAD_DIR, secureName);
renameSync(filePath, securePath);
file.filename = secureName;
file.mimetype = detectedMime;
```

**Step 3: JANGAN pakai `extname(file.originalname)`** untuk nama file final — hanya pakai extension dari hasil `detectImageMime`.

**Verifikasi:** upload file HTML yang di-rename ke `.png` → backend harus tolak.

---

#### V-07b — Cron Token: Header-Only

**Tujuan:** cron endpoint hanya terima token via header `X-Cron-Token`, bukan query `?token=`.

**File target:** `backend/src/modules/auto-ops/auto-ops.controller.ts`

**Step 1: Temukan guard cron token**
```bash
cd backend
rg -n "cron.*token|token.*cron|X-Cron-Token|\?token=" src/modules/auto-ops/
rg -n "CronTokenGuard|CronGuard|cron.*Guard" src/
```

**Step 2: Ubah guard cron**
- Cari logika yang membaca `req.query.token` → HAPUS.
- Hanya baca dari `req.headers['x-cron-token']` (case-insensitive).
- Jika query token diterima, return 400 atau 401.

**Step 3: Ubah cron endpoint ke POST jika memungkinkan**
- Jika endpoint cron saat ini `@Get()`, ubah ke `@Post()`.
- Jika harus tetap GET (kompatibilitas), pastikan hanya header yang divalidasi.

**Verifikasi:**
```bash
# Harus ditolak
curl "http://localhost:3000/api/auto-ops/cron/run-expiry-check?token=valid-token"
# Harus diterima
curl -H "X-Cron-Token: valid-token" -X POST "http://localhost:3000/api/auto-ops/cron/run-expiry-check"
```

---

#### V-07c — Tenant Meter Cycle Guard

**Tujuan:** validasi input meter reading dari tenant.

**File target:** `backend/src/modules/meter-readings/meter-readings.service.ts`

**Step 1: Temukan method submit/create meter reading**
Fungsi yang menerima input tenant untuk meter reading (biasanya `createReading` atau `submitReading`).

**Step 2: Tambahkan validasi**

```typescript
// 1. Tolak readingAt masa depan
if (dto.readingAt && new Date(dto.readingAt) > new Date()) {
  throw new BadRequestException('Tanggal pembacaan tidak boleh di masa depan');
}

// 2. Tolak readingAt sebelum check-in (initialMetersPromotedAt)
// Cari stay terkait:
const stay = await this.prisma.stay.findUnique({ where: { id: dto.stayId } });
if (stay.initialMetersPromotedAt && new Date(dto.readingAt) < new Date(stay.initialMetersPromotedAt)) {
  throw new BadRequestException('Tanggal pembacaan tidak boleh sebelum check-in');
}

// 3. Tolak reading mundur (nilai lebih kecil dari reading sebelumnya)
const lastReading = await this.prisma.meterReading.findFirst({
  where: { stayId: dto.stayId, utilityType: dto.utilityType },
  orderBy: { readingAt: 'desc' },
});
if (lastReading && dto.readingValue <= lastReading.readingValue) {
  throw new BadRequestException('Nilai meter tidak boleh lebih kecil dari pembacaan sebelumnya');
}
```

**Step 4: Putuskan flow setelah submit**
- Tenant submit → langsung buat invoice? Atau pending review?
- Default: langsung issue invoice meter (seperti existing flow). Tidak perlu review admin karena nilai meter objektif.

**Verifikasi:** test dengan curl — masa depan ditolak, sebelum check-in ditolak, mundur ditolak.

---

#### V-07d — Ticket Image Access Guard

**Tujuan:** `canAccessImage()` tidak return true untuk file tanpa metadata/ownership.

**File target:** `backend/src/modules/tickets/tickets.service.ts` — cari `canAccessImage`

**Step 1: Cari fungsi canAccessImage**
```bash
cd backend
rg -n "canAccessImage|accessImage|ticketImage" src/modules/tickets/
```

**Step 2: Pastikan guard memeriksa:**
- Ticket ada dan valid (bukan soft-delete).
- Untuk STAFF: ticket assigned ke staff tersebut ATAU staff adalah creator.
- Untuk TENANT: ticket milik tenant tersebut.
- OWNER/ADMIN: boleh akses semua.

**Step 3: Jangan fallback ke `true`** jika data tidak lengkap — return false.

---

#### V-07e — Announcement/Tenant/Private Image Parity

**Tujuan:** semua endpoint yang punya upload gambar harus punya guard ownership.

**File target:**
- `backend/src/modules/announcements/announcements.controller.ts`
- `backend/src/modules/tickets/tickets.controller.ts`
- `backend/src/modules/tenants/tenants.controller.ts`
- `backend/src/modules/rooms/rooms.controller.ts`

**Step 1: Untuk setiap file, cari endpoint upload**
**Step 2: Pastikan:**
- Magic-byte detection diterapkan
- Role guard sesuai (STAFF tidak boleh upload announcement, TENANT hanya upload foto sendiri)
- Filename secure (random, tidak pakai original filename)
- Static `/uploads/room-images` dilayani dengan header `X-Content-Type-Options: nosniff`

**Verifikasi:** upload file SVG/HTML yang diganti extension → ditolak. Static file punya `nosniff`.

---

### V-08 — Sinkronisasi Dokumen Kontrak Domain

**Tujuan:** update semua M-file agar tidak bertentangan dengan Fase V.

**Step 1: Buka setiap file berikut dan tambahkan override**

| File | Yang ditambahkan |
|------|-----------------|
| `docs/M03_FLOW_KONTRAK.md` | Tambah bagian "Override 2026-06-30": room state `AVAILABLE → RESERVED → OCCUPIED`. Tandai narasi "Booking = Room RESERVED" sebagai `⚠️ LEGACY — lihat Fase V`. |
| `docs/M04_KEUANGAN.md` | Sudah ada "Update 2026-06-30" — tidak perlu diubah. |
| `docs/M05_SIKLUS_HUNI.md` | Sudah ada "Update 2026-06-30" — tidak perlu diubah. |
| `docs/M09_AUDIT.md` | Tambah catatan: "Fase V mengubah flow booking/payment/check-in. Lihat M10 V-00..V-16 untuk status terkini." |

**Step 2: Verifikasi**
- Baca 4 file di atas, pastikan tidak ada instruksi "Booking = Room RESERVED" tanpa tanda legacy.
- Pastikan ada rujukan ke M10 Fase V.

**Gate:** AI baru yang baca M03/M04/M05 akan diarahkan ke Fase V, bukan narasi lama.

---

### V-09 — Public & Marketing Availability Components

**Tujuan:** frontend publik tidak bisa booking room RESERVED.

#### V-09a — Backend: `marketing-public-rooms.service.ts`

**Step 1: Temukan fungsi `isAvailable` atau `canBook`**
```bash
cd backend
rg -n "isAvailable|canBook|isBookable" src/modules/marketing/
```

**Step 2: Pastikan logic:**
```typescript
// Hanya AVAILABLE yang bookable
// MAINTENANCE bookable jika allowBookingWhileCleaning === true
// RESERVED/OCCUPIED/INACTIVE → TIDAK bookable
function isPublicRoomBookable(room: RoomWithStatus): boolean {
  if (room.status === 'AVAILABLE') return true;
  if (room.status === 'MAINTENANCE' && room.allowBookingWhileCleaning) return true;
  return false;
}
```

**Step 3: Hapus referensi ke `BOOKING` atau `RESERVED` sebagai bookable.**

#### V-09b — Frontend: `publicRoomDisplay.ts`

**File:** `frontend/src/utils/publicRoomDisplay.ts` — cari `isPublicRoomBookable` atau fungsi serupa.

**Step 1: Temukan dan update:**
```typescript
export function isPublicRoomBookable(room: PublicRoom): boolean {
  return room.canBook === true && room.status === 'AVAILABLE';
  // JANGAN: return room.canBook !== false;
}
```

**Step 2: Copy publik**
- Untuk `AVAILABLE`: "Tersedia — ajukan booking sekarang. Kamar dikunci setelah pembayaran disetujui."
- Untuk `RESERVED`: "Sudah terkunci — silakan pilih kamar lain."

#### V-09c — Frontend: Halaman Publik

**File:**
- `frontend/src/pages/public/PublicRoomsPage.tsx`
- `frontend/src/pages/public/PublicRoomDetailPage.tsx`
- `frontend/src/pages/public/PublicGuestDashboardPage.tsx`

**Step 1: Sembunyikan tombol booking jika `canBook === false`**
```tsx
{room.canBook && room.status === 'AVAILABLE' ? (
  <Button onClick={handleBook}>Booking</Button>
) : (
  <span className="text-muted">Kamar sudah terkunci</span>
)}
```

**Step 2: Calendar / copy tidak menjanjikan "first-paid-wins" untuk room RESERVED.**

---

### V-10 — Frontend Tenant Portal Booking/Payment

**Tujuan:** tenant melihat status yang benar sesuai flow Fase V.

#### V-10a — Stage Tenant Portal (`useTenantPortalStage.ts`)

**File:** `frontend/src/hooks/useTenantPortalStage.ts` (atau cari `tenantPortalStage`)

**Step 1: Pastikan logika stage:**
```typescript
if (!stay.initialMetersPromotedAt) {
  return 'booking'; // Stay unpromoted = masih booking
}
if (room.status === 'OCCUPIED') {
  return 'occupied'; // Sudah huni
}
```

#### V-10b — BookingCard (`BookingCard.tsx`)

**File:** `frontend/src/components/portal/BookingCard.tsx`

**Step 1: Status display:**
- Belum bayar (unpaid, dp=0): label "Menunggu Pembayaran"
- DP approved (dp > 0, belum lunas): label "DP Diterima - Kamar Terkunci"
- Lunas (invoice PAID): label "Lunas - Siap Check-in"
- Occupied (promoted): label "Aktif Huni"

#### V-10c — Submit Payment Modal

**File:** `frontend/src/components/portal/SubmitPaymentModal.tsx` — SUDAH BENAR, tidak perlu ubah.

#### V-10d — MyInvoicesPage

**File:** `frontend/src/pages/portal/MyInvoicesPage.tsx`

**Step 1: "Bayar Semua" flow**
- Saat klik "Bayar Semua", buka modal upload proof (V-06 Step 6-7).
- Jangan langsung submit batch tanpa file.

#### V-10e — TenantInvoiceDetailPage

**File:** `frontend/src/pages/portal/TenantInvoiceDetailPage.tsx`

**Step 1: Pastikan overpay ditolak** — backend guard sudah ada, pastikan frontend menghitung sisa dengan benar.

#### V-10f — Urgency/Reminder

**File:** `frontend/src/hooks/usePaymentUrgency.ts` atau komponen urgency.

**Step 1: Tampilkan deadline yang benar:**
- Unpaid: 3 jam expiry
- DP pending: deadline pelunasan
- Pending review: "Sedang diperiksa admin, tidak perlu upload ulang"

---

### V-11 — Frontend Admin/Owner/Staff Workspace

#### V-11a — Route Guard Sinkronisasi

**Step 1: Audit `navigation.ts`**
```bash
cd frontend
rg -n "STAFF|OWNER|ADMIN|TENANT" src/config/navigation.ts
```
Pastikan menu items punya `requiredRole` yang sesuai dengan backend guard.

**Step 2: Audit `ProtectedRoute.tsx`**
```bash
rg -n "ProtectedRoute|requiredRole" src/components/layout/
```

#### V-11b — StaysPage Filter "Perlu Tindak Lanjut"

**File:** `frontend/src/pages/stays/StaysPage.tsx`

**Step 1: Ganti filter predicate:**
- Lama: `room.status === 'BOOKING'` (enum tidak ada lagi)
- Baru: `stay.initialMetersPromotedAt === null && (invoice unpaid || DP pending)`

#### V-11c — StayDetailPage Check-in CTA

**File:** `frontend/src/pages/stays/StayDetailPage.tsx`

**Step 1: Tampilkan tombol check-in hanya jika:**
- `stay.initialMetersPromotedAt === null` (belum check-in)
- Invoice sewa `status === 'PAID'` (lunas)

#### V-11d — CheckInWizard

**File:** `frontend/src/components/checkin/CheckInWizard.tsx` atau `frontend/src/pages/stays/CheckInWizard.tsx`

**Step 1: Pastikan tidak bisa pilih room RESERVED oleh orang lain**
**Step 2: Hapus referensi enum `BOOKED`**

#### V-11e — PaymentReviewPage

**File:** `frontend/src/pages/payments/PaymentReviewPage.tsx`

**Step 1: Update copy setelah approve:**
- "Disetujui — kamar menjadi RESERVED" (bukan "aktif huni")

#### V-11f — Staff Room Card

**File:** `frontend/src/pages/staff/StaffRoomsPage.tsx`

**Step 1: Staff hanya lihat status operasional:**
- Status kamar (AVAILABLE/RESERVED/OCCUPIED/MAINTENANCE)
- TANPA detail finance tenant (tagihan, deposit, payment)

#### V-11g — Owner Dashboard

**File:** `frontend/src/pages/dashboard/OwnerDashboardPage.tsx`

**Step 1: Bedakan reserved-DP vs reserved-lunas**
- Pakai data payment/invoice, bukan label room.
- Gunakan helper `getReservedPaymentLabel()` yang sudah dibuat di V-04.

---

### V-12 — Backend Role/Data Exposure Audit

**Tujuan:** pastikan role guard backend sesuai keputusan owner.

**Metode:** untuk setiap endpoint di bawah, cari controller, baca decorator `@Roles()`, dan putuskan.

| Modul | Endpoint | Role saat ini | Rekomendasi | Aksi |
|-------|----------|--------------|-------------|------|
| analytics | GET finance/summary | OWNER/ADMIN/STAFF | OWNER/ADMIN | Ubah `@Roles` jika perlu |
| wifi-sales | GET list | OWNER/ADMIN/STAFF | OWNER/ADMIN | Ubah `@Roles` |
| inventory-items | GET list | OWNER/ADMIN/STAFF | OWNER/ADMIN/STAFF (read only) | Tetap |
| inventory-movements | GET list | OWNER/ADMIN | OWNER/ADMIN | Tetap |
| stays | GET untuk STAFF | periksa | STAFF boleh lihat status, TANPA finance | Filter di service |
| announcements | POST upload image | OWNER/ADMIN/STAFF? | OWNER/ADMIN saja | Ubah `@Roles` |
| rooms | GET untuk STAFF | periksa | STAFF boleh lihat operasional saja | Filter di service |

**Step 1: Untuk setiap file controller:**
```bash
cd backend
rg -n "@Roles|@UseGuards" src/modules/analytics/ src/modules/wifi-sales/ src/modules/inventory-items/ src/modules/stays/ src/modules/announcements/ src/modules/rooms/
```

**Step 2: Ubah `@Roles()` decorator sesuai tabel di atas.**
**Step 3: Jika STAFF tetap boleh akses stays/rooms, filter data di service — jangan kirim field sensitif (deposit, payment, invoice amount).**

**Verifikasi:** curl dengan token STAFF ke endpoint finance → harus 403.

---

### V-13 — Backend Finance/Accounting Guard Audit

**Tujuan:** tidak ada mutasi ledger yang lolos tanpa role yang tepat.

| Endpoint | Role Rekomendasi | Aksi |
|----------|-----------------|------|
| COA create/update/delete | OWNER-only | Pastikan `@Roles(OWNER)` |
| Cash account create/update | OWNER-only | Pastikan `@Roles(OWNER)` |
| Period close/reopen/post | OWNER-only | Pastikan `@Roles(OWNER)` |
| Backfill auto-journal | OWNER-only | Pastikan `@Roles(OWNER)` |
| Deposit dry-run/backfill | OWNER-only | Pastikan `@Roles(OWNER)` |
| Expense create | OWNER/ADMIN | Tetap |
| Expense confirm/delete | OWNER/ADMIN | Tetap |
| Invoice manual payment | OWNER/ADMIN | Guard no-partial |

**Step 1: Audit semua controller accounting/finance/assets**
```bash
cd backend
rg -n "@Roles" src/modules/accounting/ src/modules/finance/ src/modules/assets/ src/modules/expenses/ src/modules/invoices/ src/modules/invoice-payments/ src/modules/deposit-ledger/
```

**Step 2: Ubah `@Roles(OWNER, ADMIN)` menjadi `@Roles(OWNER)` untuk endpoint sensitif.**

**Step 3: Manual journal draft — pastikan tetap disabled/non-functional.**

**Step 4: Jalankan unit finance setelah perubahan:**
```bash
cd backend && node --test "test/**/*.test.js"
```

---

### V-14 — Shared Component & Media Safety

#### V-14a — `resolveAbsoluteFileUrl`

**File:** `frontend/src/utils/...` — cari fungsi `resolveAbsoluteFileUrl`

**Step 1: Pastikan tidak membuka external URL**
```typescript
export function resolveAbsoluteFileUrl(url: string): string {
  if (!url) return '';
  if (url.startsWith('/api/') || url.startsWith('/uploads/')) {
    return `${API_BASE_URL}${url}`;
  }
  // JANGAN resolve external URL
  return url;
}
```

#### V-14b — `AuthenticatedFileLink`

**File:** `frontend/src/components/common/AuthenticatedFileLink.tsx`

**Step 1: Hanya untuk endpoint protected** (`/api/payment-submissions/proofs/`, `/api/tickets/images/`, dll), BUKAN `/uploads/` statik.

#### V-14c — `SafeImage` fallback

**File:** `frontend/src/components/common/SafeImage.tsx`

**Step 1: Fallback tidak menyembunyikan error security.** Error harus dilog ke console (dev only) dan ditampilkan label jelas.

#### V-14d — `ResourceFormModal` upload

**Step 1: Pastikan file upload memakai helper server-generated `fileKey/fileUrl`.** Jangan kirim `fileUrl` buatan client.

#### V-14e — `URL.createObjectURL` cleanup

**Step 1: Di semua modal/preview yang pakai `URL.createObjectURL`:**
```typescript
useEffect(() => {
  return () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  };
}, [previewUrl]);
```

#### V-14f — XSS surface scan

**Step 1: Jalankan scan:**
```bash
cd frontend
rg -n "dangerouslySetInnerHTML|innerHTML|outerHTML|eval\(|new Function" src/
```
**Step 2: Jika ada hasil → ganti dengan alternatif aman (React children, dll).**

**Gate:** hasil scan harus kosong.

---

### V-15 — Regression Matrix Manual/UAT

> Ini adalah daftar cek manual — eksekutor AI tidak bisa menjalankan UAT browser.
> **AI hanya perlu:** memastikan kode mendukung semua flow di bawah.

**Checklist kode (AI verifikasi):**
- [ ] Backend: `public-bookings.service.ts` — create booking tidak ubah room status
- [ ] Backend: `payment-submissions.service.ts` — approve DP set RESERVED, approve full set RESERVED
- [ ] Backend: `stays.service.ts` — check-in hanya jika invoice PAID
- [ ] Backend: `marketing-public-rooms.service.ts` — RESERVED tidak bookable
- [ ] Frontend: `PublicRoomsPage.tsx` — tombol booking hidden untuk RESERVED
- [ ] Frontend: `BookingCard.tsx` — status label benar untuk unpaid/DP/lunas/occupied
- [ ] Frontend: `SubmitPaymentModal.tsx` — file proof wajib
- [ ] Frontend: `MyInvoicesPage.tsx` — "Bayar Semua" wajib upload proof
- [ ] Backend: `auto-ops.service.ts` — tidak dependensi ke `RoomStatus.BOOKING`
- [ ] Backend: `payment-submissions.service.ts` — approve tolak tanpa proof (non-CASH)

**UAT manual (dijalankan setelah deploy):** lihat checklist di V-15 task list.

---

### V-16 — Verifikasi Final Fase V

**Step 1: Backend build**
```bash
cd backend
npx tsc --noEmit
```
→ Harus 0 errors.

**Step 2: Backend unit test**
```bash
cd backend
npm run test:unit
```
→ Semua harus PASS.

**Step 3: Frontend build**
```bash
cd frontend
npm run build
```
→ Harus sukses tanpa error.

**Step 4: Final grep — pastikan tidak ada `RoomStatus.BOOKING`**
```bash
rg -n "RoomStatus\.BOOKING|status:\s*RoomStatus\.BOOKING|\bBOOKING\b" backend/src backend/prisma frontend/src
```
→ Hasil harus KOSONG atau hanya di komentar/string "booking" sebagai kata bisnis.

**Step 5: Pastikan tidak ada `RESERVED` sebagai available**
```bash
rg -n "RESERVED.*available|RESERVED.*bookable|canBook.*true.*RESERVED" backend/src frontend/src
```
→ Hasil harus KOSONG.

---

## FASE W — RENCANA DETAIL

---

### W-00 — Project Status Gate & Decision Register

**Step 1: Buat tabel keputusan di M10**
Buka file ini (`docs/M10_CHECKLIST_CHANGELOG.md`), tambah di bawah W-00:

```markdown
| ID | Keputusan | Status | Diputuskan |
|----|----------|--------|------------|
| W-00a | STAFF boleh lihat analytics/finance/summary? | Butuh owner | - |
| W-00b | STAFF boleh lihat wifi-sales? | Butuh owner | - |
| W-00c | ADMIN boleh jalankan AutoOps finance-heavy? | Butuh owner | - |
| W-00d | RoomStatus.BOOKING dihapus dari schema? | SUDAH dihapus V-00 | 2026-06-30 |
| W-00e | JWT tetap localStorage? | Legacy sementara | - |
| W-00f | Upload registry perlu migration? | Tanpa migration (V-06) | 2026-06-30 |
```

**Step 2: Untuk keputusan yang masih "Butuh owner", TIDAK USAH diimplementasi — tunggu arahan.**

---

### W-01 — Production Security Baseline

#### W-01a — Security Headers Static

**File:** `backend/src/main.ts`

**Step 1: Tambahkan `setHeaders` ke static `/uploads/`**
```typescript
app.useStaticAssets(join(__dirname, '..', 'uploads'), {
  prefix: '/uploads',
  setHeaders: (res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'public, max-age=86400');
  },
});
```

#### W-01b — Validate Static Extension

**File:** `backend/src/main.ts` atau middleware static

**Step 1: Tambahkan guard — hanya izinkan ekstensi gambar:**
```typescript
// Di middleware atau interceptor untuk /uploads/
const allowedExt = /\.(jpg|jpeg|png|webp|gif|svg|ico)$/i;
if (!allowedExt.test(req.path)) {
  return res.status(403).json({ message: 'File type not allowed' });
}
```

#### W-01c — CSP img-src

**File:** Cari file yang set security headers (mungkin `main.ts` atau `helmet` config)

**Step 1: Pastikan CSP tidak wildcard:**
```typescript
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      imgSrc: ["'self'", "data:", "blob:"],
      // TAMBAHKAN domain spesifik kalau ada external images
    },
  },
}));
```

#### W-01d — Production JWT Secret

**File:** `backend/src/auth/jwt.strategy.ts` atau `auth.module.ts`

**Step 1: Pastikan JWT tidak fallback ke hardcoded secret:**
```typescript
const secret = process.env.JWT_SECRET;
if (!secret && process.env.NODE_ENV === 'production') {
  throw new Error('JWT_SECRET wajib diisi di production');
}
```

#### W-01e — Rate Limiter Fail-Open Decision

**File:** `backend/src/common/guards/rate-limit.guard.ts` atau middleware

**Step 1: Cari `MAX_TRACKED_KEYS` atau fail-open logic.**
**Step 2: TAMBAH catatan risiko di komentar — tidak ubah perilaku sekarang.**
**Keputusan:** tetap fail-open untuk sekarang; catat risiko di dokumentasi.

---

### W-02 — Auth, Session, dan PDP

#### W-02a — NIK Masking

**File:** frontend yang menampilkan data tenant/KTP

**Step 1: Cari semua tempat yang menampilkan NIK:**
```bash
cd frontend
rg -n "nik|NIK|ktp|KTP" src/
```

**Step 2: Tambahkan masking:**
```typescript
function maskNIK(nik: string): string {
  if (!nik || nik.length < 8) return '***';
  return nik.slice(0, 4) + '****' + nik.slice(-4);
}
```

#### W-02b — Placeholder Email

**Step 1: Cari semua tempat yang menampilkan email tenant** — pastikan placeholder `@phone.local.kost48` TIDAK tampil ke UI publik. Hanya tampilkan email asli (`normalizedEmail`) jika bukan placeholder.

#### W-02c — Session Storage Cleanup

**File:** `frontend/src/context/AuthContext.tsx`

**Step 1: Pastikan saat logout atau 401:**
```typescript
localStorage.removeItem('token');
sessionStorage.clear(); // Bersihkan cache user
```

#### W-02d — Reset Password Test (dokumentasi, tidak diimplementasi)

Checklist yang harus dipenuhi backend:
- Token expired → ditolak
- Token reused → ditolak  
- Password sama → ditolak
- User inactive → ditolak

**Verifikasi:** `rg -n "PasswordResetToken|resetPassword" backend/src/auth/` — pastikan guard di atas ada.

---

### W-03 — Role/API Exposure Matrix

**Step 1: Buat matriks endpoint** (append ke W-03 di M10):

```markdown
| Route | Method | Allowed Roles | Data Sensitif | Status |
|-------|--------|--------------|---------------|--------|
| /api/analytics/finance/summary | GET | OWNER, ADMIN | Revenue, expense | ✅ OK |
| /api/analytics/operations/summary | GET | OWNER, ADMIN, STAFF | Occupancy | ✅ OK |
| /api/wifi-sales | GET | OWNER, ADMIN | Margin profit | ✅ OK (ADMIN+) |
| /api/rooms | GET | OWNER, ADMIN, STAFF | Harga | ⚠️ Filter harga untuk STAFF? |
| /api/stays | GET | OWNER, ADMIN, STAFF | Deposit, payment | ⚠️ Filter finance untuk STAFF |
| /api/inventory-items | GET | OWNER, ADMIN, STAFF | Nilai aset | ⚠️ Filter nilai untuk STAFF? |
| /api/announcements | POST | OWNER, ADMIN | - | ✅ OK |
| /api/tickets | GET/POST | OWNER, ADMIN, STAFF, TENANT | - | ✅ OK |
```

**Step 2: Untuk baris `⚠️`, putuskan: STAFF lihat data tanpa nominal, atau tidak sama sekali? → Default: STAFF lihat data operasional, nominal disembunyikan.**

---

### W-04 — Lifecycle Renew, Checkout, Deposit Cross-Blocks

**File:** `backend/src/modules/renew-requests/renew-requests.service.ts`, `checkout-requests.service.ts`

**Step 1: Buat helper di `renew-requests.service.ts`:**
```typescript
const ACTIVE_RENEW_STATUSES = ['PENDING', 'PENDING_DECISION', 'AWAITING_DP', 'DP_SECURED'];

export function isActiveRenewRequestStatus(status: string): boolean {
  return ACTIVE_RENEW_STATUSES.includes(status);
}
```

**Step 2: Di checkout create, tambahkan guard:**
```typescript
const activeRenew = await tx.renewRequest.findFirst({
  where: { stayId, status: { in: ACTIVE_RENEW_STATUSES } },
});
if (activeRenew) {
  throw new ConflictException('Tidak bisa checkout karena ada perpanjangan aktif');
}
```

**Step 3: Sebaliknya — di renew create, tolak jika ada checkout aktif.**

**Step 4: DP renewal: pastikan payment after deadline ditolak.**
```typescript
if (paidAt > downPaymentDueDate) {
  throw new BadRequestException('Pembayaran DP melewati batas waktu');
}
```

**Step 5: Deposit reconciliation:**
```bash
cd backend
rg -n "mismatchCount|reconciliation" src/modules/deposit-ledger/
```
Pastikan `mismatchCount` dihitung dan dilaporkan. Harus 0 sebelum go-live.

---

### W-05 — AutoOps Job Ownership & Idempotency

**File:** `backend/src/modules/auto-ops/auto-ops.service.ts` + `auto-ops.controller.ts`

**Step 1: Token hanya dari header** — sudah dilakukan di V-07b. Pastikan konsisten.

**Step 2: Audit endpoint AUTOPS yang bisa dipanggil manual:**
```bash
cd backend
rg -n "@Post|@Get" src/modules/auto-ops/auto-ops.controller.ts
```

**Step 3: Untuk endpoint finance-heavy (depreciation, period close, backfill):**
- Ubah `@Roles(OWNER, ADMIN)` ke `@Roles(OWNER)`.
- Atau pertahankan ADMIN jika owner menyetujui.

**Step 4: Tambahkan guard concurrency sederhana:**
```typescript
private isRunning = new Map<string, boolean>();

async runSweep(name: string, fn: () => Promise<void>) {
  if (this.isRunning.get(name)) {
    this.logger.warn(`Sweep ${name} sudah berjalan, skip`);
    return;
  }
  this.isRunning.set(name, true);
  try {
    await fn();
  } finally {
    this.isRunning.set(name, false);
  }
}
```

---

### W-06 — Upload & Media Registry Lintas Modul

> **Keputusan:** tanpa migration, kita pakai pola yang sama seperti V-06: filename prefix dengan entity/tenant ID.

**Step 1: Inventaris semua endpoint upload:**
```bash
cd backend
rg -n "FileInterceptor|UploadedFile|multer" src/modules/
```

**Step 2: Untuk SETIAP endpoint yang belum pakai `detectImageMime`:**
1. Tambahkan import `detectImageMime` dan `deleteFileSafe`.
2. Tambahkan magic-byte check setelah file tersimpan.
3. Rename ke secure filename (random + extension dari deteksi).
4. Tolak jika bukan gambar valid.

**Step 3: Untuk upload yang perlu ownership:**
- Ticket image: filename `ticket_{ticketId}_{timestamp}_{random}.ext`
- Staff field report: `staff-report_{userId}_{timestamp}_{random}.ext`
- KTP: `ktp_{tenantId}_{timestamp}_{random}.ext`
- Room image: `room_{roomId}_{timestamp}_{random}.ext`

**Step 4: Public static `/uploads/room-images`:**
- Saat serving, set `X-Content-Type-Options: nosniff`.
- Hanya izinkan ekstensi `.jpg`, `.jpeg`, `.png`, `.webp`.

---

### W-07 — Finance & Accounting Operational Controls

> **Keputusan default:** OWNER-only untuk COA/cash account/period close/depreciation/backfill. OWNER/ADMIN untuk operasional harian.

**Step 1: Audit `@Roles` di controller:**
```bash
cd backend
rg -n "@Roles" src/modules/accounting/accounting.controller.ts src/modules/finance/finance.controller.ts src/modules/expenses/expenses.controller.ts src/modules/assets/assets.controller.ts
```

**Step 2: Ubah role:**
- COA, cash account, period close → `@Roles(UserRole.OWNER)`
- Expense, invoice payment, wifi sale → `@Roles(UserRole.OWNER, UserRole.ADMIN)`

**Step 3: Pastikan no-partial guard tetap aktif:**
```bash
cd backend
rg -n "no-partial|noPartial|PARTIAL" src/modules/invoice-payments/
```
Guard harus tetap menolak pembayaran selain DP tepat atau pelunasan tepat.

**Step 4: Jalankan unit test finance:**
```bash
cd backend && node --test "test/**/*.test.js"
```

---

### W-08 — Inventory, Staff, Ticket Boundary

> **File utama:** `tickets.service.ts`, `staff-field-reports.service.ts`, `staff-routines.service.ts`

**Step 1: Ticket — guard STAFF:**
- STAFF hanya bisa start/mark-done tiket yang assigned ke dia ATAU tiket yang dia ambil.
- STAFF hanya boleh close `CHECKOUT_INSPECTION`.
- TENANT hanya bisa close tiket miliknya yang sudah `DONE`.

**Step 2: Staff routine — guard assignment:**
- Staff hanya bisa start routine yang di-assign ke dia atau template area global.

**Step 3: Staff field report — validasi photo:**
- Pastikan `photoUrl/fileKey` tidak bisa diisi arbitrary URL.
- File harus dari upload registry.

**Step 4: Inventory movement:**
- Hanya OWNER/ADMIN yang bisa buat mutasi stok resmi.
- STAFF hanya laporan lapangan (tidak ubah stok).

---

### W-09 — Frontend State, Route, Copy, dan XSS Surface

**Step 1: XSS scan:**
```bash
cd frontend
rg -n "dangerouslySetInnerHTML|innerHTML|outerHTML|eval\(|new Function" src/
```
→ Harus KOSONG.

**Step 2: External link audit:**
```bash
cd frontend
rg -n "target=.?_blank" src/ --no-filename
```
→ Setiap hasil harus punya `rel="noopener noreferrer"`.

**Step 3: `statusLabels.ts` — pastikan `RESERVED` tidak berlabel "Lunas":**
```bash
cd frontend
rg -n "RESERVED|Reserved|reserved" src/utils/statusLabels.ts
```
Ub ah label `RESERVED` menjadi "Dipesan" (tanpa "Lunas"), karena DP dan lunas sama-sama reserved.

**Step 4: Revoke object URL di semua modal/preview:**
```bash
cd frontend
rg -n "createObjectURL" src/
```
→ Setiap pemakaian harus punya `revokeObjectURL` di cleanup.

---

### W-10 — Public & Marketing Surface Hardening

> Banyak overlap dengan V-09. Pastikan V-09 selesai dulu.

**Step 1: Public config — cek endpoint:**
```bash
cd backend
rg -n "public-config|PublicConfig" src/modules/settings/
```
**Step 2: Pastikan response tidak mengandung:** token, secret, internal email placeholder, data tenant.

**Step 3: Public room detail untuk RESERVED/OCCUPIED:**
- CTA booking harus disabled/hidden.
- Deep link harus menampilkan status benar.

**Step 4: Availability calendar** — pastikan membedakan available/unpaid booking interest/reserved DP/reserved paid/occupied/maintenance.

---

### W-11 — Observability, Logs, Release Readiness

> **AI executor tidak melakukan deployment** — ini hanya checklist persiapan.

**Step 1: Buat file `docs/W11_RELEASE_CHECKLIST.md` dengan isi:**
```markdown
# Release Dry-Run Checklist

## Build
- [ ] cd backend && npm run build
- [ ] cd backend && npm run test:unit
- [ ] cd frontend && npm run build

## DB
- [ ] Backup DB sebelum migration
- [ ] npx prisma db push (atau migrate deploy)
- [ ] Smoke test: login OWNER, public rooms 200, trial balance balanced

## Logs
- [ ] Tidak ada JWT/password/token di log
- [ ] Error production tidak kirim stack trace ke client

## Health
- [ ] GET /api/health → DB reachable
- [ ] Accounting readiness → semua hijau
```

**Step 2: Pastikan `backend/src/main.ts` production tidak expose stack trace:**
```typescript
if (process.env.NODE_ENV === 'production') {
  app.useGlobalFilters(new HttpExceptionFilter({ exposeStack: false }));
}
```

---

### W-12 — Documentation Hygiene & Source of Truth

**Step 1: Update CODEMAP:**
```bash
cd docs
# Buka CODEMAP.md, cek modul-modul ini ada:
rg -n "payment-submissions|tenant-bookings|public-bookings|stays|renew-requests|checkout-requests|auto-ops|accounting|finance|tickets|staff-routines|inventory" docs/CODEMAP.md
```

**Step 2: Pastikan setiap M-file punya override Fase V:**
- M03 ✅ (sudah cek)
- M04 ✅ (sudah ada Update 2026-06-30)
- M05 ✅ (sudah ada Update 2026-06-30)

**Step 3: File MD liar di root:**
```bash
ls *.md
```
→ Jika ada `.md` yang isinya checklist/task (bukan README), arsipkan ke `docs/archieve/`.

---

### W-13 — Manual UAT Matrix per Role

> **AI executor tidak menjalankan UAT** — ini hanya memastikan bahwa kode mendukung semua flow UAT.

**Step 1: Untuk setiap role di bawah, pastikan ada unit/integration test:**

| Role | Flow | Test file |
|------|------|-----------|
| PUBLIC | Booking room AVAILABLE | `test/integration/public-booking.*` |
| TENANT | Bayar DP, lihat status | `test/integration/payment-submission.*` |
| STAFF | Ticket assignment | `test/unit/tickets.*` |
| ADMIN | Payment review | `test/unit/payment-submissions.*` |
| OWNER | Period close | `test/unit/accounting.*` |

**Step 2: Jika ada flow tanpa test, TULIS test minimal.**

---

## FASE X — AUDIT UI/UX VISUAL (Playwright + Inspeksi Visual) 🔴 AKTIF

> **Sumber temuan:** `docs/_AUDIT_UIUX_VISUAL_2026-06-30.md` + bukti screenshot di `frontend/screenshots-ui/visual/<role>/<viewport>/<NN-slug>.png` (132 shot, 5 role × 2 viewport).
> **Metode:** capture-only Playwright lalu tiap layar diinspeksi visual (bukan smoke-test teks). Spec capture: `frontend/e2e/visual-capture.spec.ts`.
>
> **CARA PAKAI UNTUK AI LEMAH (baca dulu, jangan dilewati):**
> 1. Untuk SETIAP task di bawah, lihat **bukti** (buka file `.png` yang disebut) agar paham masalahnya secara visual.
> 2. Navigasi kode: pakai `docs/CODEMAP.md` → lalu Grep simbol. JANGAN tebak path.
> 3. Ubah **sekecil mungkin**; jangan refactor yang tak diminta.
> 4. Setelah tiap task: build (perintah di bawah) HARUS lulus, lalu centang `[ ]→[x]` + tulis 1 baris di `docs/M11_CHANGELOG.md`.
> 5. **Severity:** 🔴 kerjakan dulu (X-01, X-02) → 🟠 (X-03..X-05) → 🟡 (X-06..X-09). X-10 paling akhir.
>
> **PERINTAH BUILD/VERIFIKASI (PowerShell, satu baris; JANGAN pakai `&&`):**
> ```powershell
> Set-Location "...\final_bundle\backend"; npx tsc --noEmit
> Set-Location "...\final_bundle\frontend"; npm.cmd run build
> ```
> **JALANKAN APP UNTUK CEK VISUAL (backend non-watch agar stabil):**
> ```powershell
> Set-Location "...\backend"; npm.cmd run build; if ($?) { node dist/main.js }   # biarkan jalan (terminal lain)
> Set-Location "...\frontend"; npm.cmd run dev                                    # port 5173
> # Re-capture screenshot (verifikasi after-fix): dari frontend/
> $env:VITE_PORT='5173'; npx playwright test e2e/visual-capture.spec.ts --workers=1 --reporter=list
> ```
> Kredensial: `owner@kost48.com/Owner#2026` · `admin@kost48.com/admin123` · `staff@kost48.com/staff123` · `maya.tenant@kost48.test/Tenant#2026`.

---

### X-01 🔴 — Tenant TIDAK boleh melihat tiket internal/auto-ops (kebocoran peran) — **DIKONFIRMASI**

**Bukti:** `tenant/mobile/03-tickets.png` (kartu "Tenant overstay - A" + badge "Evict Overstay" + instruksi staf). API `GET /api/tickets/my` sebagai tenant maya mengembalikan `[EVICT_OVERSTAY] Tenant overstay - A`.

**Akar:** query tiket portal tenant memuat tiket ber-`tenantId` = tenant TANPA memfilter kategori internal. Tiket overstay/eviksi dibuat auto-ops dengan `tenantId` tenant ybs.

**Target:** `backend/src/modules/tickets/tickets.controller.ts` (`@Get('my')` baris ~64), `tickets.service.ts` (method yang melayani `/my`), `backend/src/common/enums/app.enums.ts` (`TicketCategory`, `BACKOFFICE_TICKET_CATEGORIES`, `STAFF_FIELD_CATEGORY_SET`).

- [ ] **Step 1 — definisikan kategori tersembunyi untuk tenant.** Di `app.enums.ts` tambah konstanta:
  ```ts
  // Kategori tiket internal/operasional yang TIDAK boleh muncul di portal tenant.
  export const TENANT_HIDDEN_TICKET_CATEGORIES = [
    TicketCategory.EVICT_OVERSTAY, TicketCategory.CHECKOUT_INSPECTION, TicketCategory.AUDIT_INVENTARIS,
    TicketCategory.BARANG_PINDAH, TicketCategory.PEMERIKSAAN, TicketCategory.CEK_KAMAR,
    TicketCategory.STOK_HABIS, TicketCategory.CATATAN_METER, TicketCategory.BARANG_RUSAK,
    TicketCategory.ROOM_REPAIR, TicketCategory.PAYMENT_ADMIN,
  ] as const;
  ```
  (Yang tenant boleh lihat = tiket yang IA buat: AC/WIFI/PLUMBING/ELECTRICITY/KEBERSIHAN/PERBAIKAN/UMUM/GENERAL/OTHER/DOOR_KEY/FURNITURE/PEST/SECURITY/NOISE/EMERGENCY.)
- [ ] **Step 2 — saring di service `/my` (INI INTI FIX, file:line TERVERIFIKASI).** File **`backend/src/modules/tickets/tickets.service.ts`**, method **`findMine`** (baris **±198–206**). Tambah import di atas file: `import { TENANT_HIDDEN_TICKET_CATEGORIES } from '../../common/enums/app.enums';` (cek path relatif: dari `modules/tickets/` ke `common/enums/` = `../../common/enums/app.enums`). Lalu ubah objek `where`:

  **SEBELUM (apa adanya sekarang):**
  ```ts
  const where: Prisma.TicketWhereInput = {
    tenantId: user.tenantId ?? -1,
    ...(query.status ? { status: query.status } : {}),
  };
  ```
  **SESUDAH (tambah SATU baris `category`):**
  ```ts
  const where: Prisma.TicketWhereInput = {
    tenantId: user.tenantId ?? -1,
    category: { notIn: [...TENANT_HIDDEN_TICKET_CATEGORIES] },
    ...(query.status ? { status: query.status } : {}),
  };
  ```
  ⚠️ **JANGAN** ubah method `findAll` (controller baris 58–62, role OWNER/ADMIN/STAFF) — itu MEMANG boleh lihat semua tiket. HANYA `findMine` (`GET /tickets/my`, controller baris 64–68, role TENANT) yang disaring.
- [ ] **Step 3 — cek query FE tenant.** FE tenant memanggil tiket lewat `frontend/src/pages/portal/MyTicketsPage.tsx` (Grep `tickets/my` atau `MyTicketsPage`). Pastikan memanggil `/api/tickets/my` (sudah disaring), BUKAN `/api/tickets`. Jika sudah `/my`, TIDAK perlu ubah FE.

**Test wajib:** `GET /api/tickets/my` (maya) TIDAK memuat `EVICT_OVERSTAY`/kategori internal; TETAP memuat tiket "AC kamar A kurang dingin" yang ia buat.
**Gate:** ✅ tiket internal tidak bocor ke tenant; build lulus.

---

### X-02 🔴 — Katalog publik KOSONG saat go-live: peringatan admin + empty/error graceful

**Bukti:** `public/desktop/01-landing.png` (0 tersedia), `03-room-detail.png` & `04-booking-form.png` (alert merah "Gagal memuat…"). API `GET /api/public/rooms` = 0.

**Akar & KONTEKS WAJIB DIPAHAMI:** penyembunyian kamar ber-gap fasilitas↔inventaris dari katalog publik = **fitur SENGAJA Fase U** (`marketing-public-rooms.service.ts` `getRoomIdsWithFacilityGap()`). **JANGAN ubah/hapus logika hide-gap itu.** Masalahnya: dengan data seed/onboarding normal (tanpa RoomItem inventaris) SEMUA kamar gap → katalog & semua detail kamar kosong/error, TANPA peringatan. Risiko nyata: saat go-live calon tenant lihat katalog kosong/error.

**Target FE (path TERVERIFIKASI — perhatikan: `pages/rooms/` BUKAN `pages/public/`):**
- Katalog: `frontend/src/pages/rooms/PublicRoomsPage.tsx`.
- Detail publik: `frontend/src/pages/rooms/PublicRoomDetailPage.tsx` (error baris 298).
- Booking tamu: `frontend/src/pages/bookings/GuestBookingPage.tsx` (error baris 127).
- Backend gap (JANGAN diubah): `backend/src/modules/marketing/marketing-public-rooms.service.ts` (`getRoomIdsWithFacilityGap`, `buildPublicRoomWhere`) + `backend/src/modules/rooms/room-facility-spec.ts` (`computeFacilityGap`).
- **Target admin (X-02c):** dashboard admin/owner atau halaman kelola kamar.

- [ ] **X-02a (empty-state katalog publik):** saat hasil `/public/rooms` kosong → tampilkan empty-state ramah ("Semua kamar sedang penuh. Hubungi admin via WhatsApp / cek jadwal kamar akan kosong"), BUKAN sekadar counter "0".
- [ ] **X-02b (error graceful detail/booking — file:line TERVERIFIKASI):** ganti `<Alert variant="danger">` merah mentah jadi empty-state ramah + CTA ("Kamar ini sedang penuh / tidak tersedia — lihat katalog atau hubungi WA admin"). Lokasi PERSIS:
  - `frontend/src/pages/rooms/PublicRoomDetailPage.tsx` **baris 298**: `{query.isError ? <Alert variant="danger">Gagal memuat detail kamar publik.</Alert> : null}` → halaman detail PUBLIK.
  - `frontend/src/pages/bookings/GuestBookingPage.tsx` **baris 127**: `return <Alert variant="danger">Gagal memuat detail kamar. Silakan kembali ke katalog.</Alert>;` → form booking PUBLIK.
  - ⚠️ Ada pesan mirip di `frontend/src/pages/rooms/RoomDetailPage.tsx:153` TAPI itu halaman INTERNAL staff/admin — JANGAN diubah untuk konteks publik.
- [ ] **X-02c (PERINGATAN ADMIN — paling penting):** di dashboard admin/owner ATAU halaman kamar, tampilkan banner bila ada kamar tersembunyi dari publik: "⚠️ N kamar TIDAK tampil di katalog publik karena gap fasilitas↔inventaris. Rekonsiliasi di [panel Fase U]." Pakai data gap yang sudah ada (`computeFacilityGap`). Tujuan: owner sadar katalog kosong sebelum go-live.
- [ ] **X-02d (konfirmasi owner):** verifikasi keputusan: apakah kamar OCCUPIED memang ingin tampil di katalog publik (sudah diizinkan `buildPublicRoomWhere`)? Catat jawabannya di W-00 decision register.

**Test wajib:** dengan 0 kamar publik → halaman publik tampil empty-state informatif (bukan error merah); admin melihat banner peringatan jumlah kamar tersembunyi.
**Gate:** ✅ tidak ada alert merah mentah di publik; ✅ admin diperingatkan; ✅ logika hide-gap Fase U tidak diubah.

---

### X-03 🟠♿ — Kontras judul langkah wizard katalog (hampir tak terbaca)

**Bukti:** `public/desktop/02-katalog.png` — "LANGKAH 1 DARI 4 / Pilih kamar mandi…": judul utama gelap di latar navy gelap → nyaris tak terbaca. Subjudul OK.

**Komponen & akar (TERVERIFIKASI):** judul dirender di `frontend/src/components/public/GuestPreferenceWizard.tsx` **baris 338**: `<h3 className="gpw-question-text">{currentStep.question}</h3>`. CSS di `frontend/src/styles/11-public-pages.css`: `.gpw-wizard` (baris 5577) set `color:#fff`, TAPI `.gpw-question-text` (baris 5629) **tidak set color sendiri** → andalkan inherit. Aturan global `h3 { color: <gelap> }` mengalahkan inherit (spesifisitas lebih tinggi) → judul jadi gelap di latar navy → nyaris tak terbaca.

- [ ] **Fix PERSIS:** di `frontend/src/styles/11-public-pages.css`, rule `.gpw-question-text` (baris ±5629), TAMBAH `color: #fff;`.
  **SEBELUM:**
  ```css
  .gpw-question-text {
    font-size: 1.35rem;
    font-weight: 800;
    margin: 0 0 .5rem;
    line-height: 1.3;
  }
  ```
  **SESUDAH:**
  ```css
  .gpw-question-text {
    font-size: 1.35rem;
    font-weight: 800;
    margin: 0 0 .5rem;
    line-height: 1.3;
    color: #fff;          /* override global h3; judul harus terang di latar navy */
  }
  ```
  Jangan ubah `.gpw-question-sub` (sudah `rgba(255,255,255,.72)` = terbaca).

**Gate:** ✅ judul langkah wizard terbaca jelas di `02-katalog` (re-capture); axe tidak menambah violation kontras.

---

### X-04 🟠 — Blok navy gelap kosong besar di landing

**Bukti:** `public/desktop/01-landing.png` — section full-width ~1000px navy pekat TANPA konten (antara seksi ketersediaan & fasilitas). Mengesankan background-image/section gagal render.

**Komponen (TERVERIFIKASI):** landing `/` dirender oleh `RootEntry` (`frontend/src/App.tsx:177-181`) → bila belum login: `<PublicGuestDashboardPage />`. Buka file komponen ini: Grep `PublicGuestDashboardPage` di `frontend/src` untuk path persisnya (kemungkinan `frontend/src/pages/public/PublicGuestDashboardPage.tsx` atau hasil dekomposisi `*Shared.tsx`).

- [ ] **Step 1 — temukan section navy.** Di `PublicGuestDashboardPage` (atau sub-komponennya), cari `<section>` BERLATAR GELAP yang posisinya ANTARA seksi ketersediaan kamar dan seksi "Fasilitas" (cocokkan visual dengan `public/desktop/01-landing.png`). Grep kandidat: warna `#0f172a`/`#1e293b`/`navy`/`dark` atau `background-image`.
- [ ] **Step 2 — tentukan penyebab.** (a) Section punya `background-image`/`<img>` yang URL-nya 404 (cek tab Network browser) → perbaiki path aset; ATAU (b) section memang kosong/placeholder → isi konten yang dimaksud ATAU hapus section.
- [ ] **Step 3 — JANGAN** menebak; konfirmasi dengan melihat screenshot + render nyata di `http://localhost:5173/`.

**Gate:** ✅ landing tidak punya blok kosong besar; build lulus.

---

### X-05 🟠 — Repro manual: dashboard Owner/Admin "Network Error" + toast "tidak punya akses"

**Bukti:** `owner/desktop/01-dashboard.png` ("Dashboard gagal dimuat … Network Error" + 2× toast "Anda tidak memiliki akses ke halaman ini."); `admin/desktop/01-admin-dashboard.png` (2× toast, konten tetap muat).
**Verifikasi awal:** `GET /api/admin/dashboard/aggregate` (OWNER,ADMIN — `backend/src/modules/admin/admin-dashboard.controller.ts:16-17`) **BEKERJA saat retest API**. Owner reports/stays/invoices normal. → kemungkinan **race hidrasi auth** saat navigasi otomatis Playwright, BUKAN bug produk pasti.

**Lokasi UI (TERVERIFIKASI):**
- Pesan "Dashboard gagal dimuat…" = `frontend/src/pages/dashboard/OwnerDashboardPage.tsx` **baris 307–312** (`{aggregateQuery.isError ? <Alert variant="warning">…}`). Catatan: halaman ini SUDAH punya skeleton loading (baris 297–305).
- Teks toast "Anda tidak memiliki akses ke halaman ini." = `frontend/src/App.tsx` **baris 135** (helper guard). Grep teks itu untuk menemukan pemicunya.

- [ ] **Step 1 — repro di browser NYATA** (bukan Playwright): login owner & admin, buka dashboard, buka DevTools → Network. Perhatikan request yang `(failed)`/`403`.
- [ ] **Step 2a — JIKA reproduksi:** cari request yang gagal/403 → perbaiki guard/role atau hapus call yang salah-route. Toast "tidak punya akses ke halaman ini" = guard FE; cari pemicunya (Grep teks toast).
- [ ] **Step 2b — JIKA TIDAK reproduksi:** tutup sebagai artefak capture (token via `addInitScript` race), catat di audit, dan (opsional) tambah retry/guard di dashboard load agar tidak menampilkan "Network Error" pada fetch pertama yang gagal sesaat.

**Gate:** ✅ dashboard owner & admin muat tanpa error di browser nyata; tidak ada toast akses yang salah.

---

### X-06 🟡 — Tenant `/portal/loyalty` & `/portal/bookings` me-render halaman STAY — **VERIFIKASI DULU (kemungkinan INTENDED)**

**Bukti:** `tenant/mobile/05-loyalty.png` & `07-bookings.png` identik `01-stay.png`.

**HASIL INVESTIGASI KODE (penting — JANGAN langsung "perbaiki"):** kedua rute SUDAH ADA & punya halaman sendiri:
- `frontend/src/App.tsx:301` → `/portal/bookings` = `<MyBookingsPage />`; `App.tsx:305` → `/portal/loyalty` = `<MyLoyaltyPage />`.
- Halaman tampil STAY karena **redirect berbasis stage/feature, kemungkinan SENGAJA**: tenant maya berstatus `occupied`, jadi `MyBookingsPage` (untuk tahap booking) wajar redirect ke `/portal/stay`. Untuk loyalty, menu hanya tampil bila `features.loyaltyEnabled` (`frontend/src/config/navigation.ts:107`); bila OFF, `MyLoyaltyPage` mengarahkan keluar.

- [ ] **Step 1 — TENTUKAN apakah ini bug atau intended.** Buka `MyBookingsPage` & `MyLoyaltyPage` (Grep nama komponen), cek kondisi redirect (`<Navigate to=… />` berbasis `stage`/`loyaltyEnabled`). Jika redirect memang by-design untuk tenant `occupied`/loyalty OFF → **BUKAN bug**, cukup pastikan **menu tidak menampilkan link mati**.
- [ ] **Step 2 — hanya jika perlu:** sembunyikan item menu yang pasti redirect untuk stage tenant saat ini (mis. "Status Pemesanan" di `navigation.ts:92` untuk tenant `occupied`). JANGAN ubah logika redirect tanpa konfirmasi owner.

**Gate:** ✅ keputusan terdokumentasi (bug vs intended); tidak ada item menu yang mengarah ke rute yang langsung redirect tanpa indikasi.

---

### X-07 🟡 — Chip quick-nav "Pengumuman" terpotong (mobile 390)

**Bukti:** `tenant/mobile/01-stay.png` — chip ke-4 "Pengumu…" terpotong.
**Target (cara temukan PERSIS):** Grep label chip `'Lapor Masalah'` ATAU `'Panduan Kos Saya'` di `frontend/src` → itu komponen quick-nav chips tenant (kemungkinan di header tenant / `TenantWorkspaceTabs.tsx` atau komponen nav portal). Perbaikan: izinkan `flex-wrap` / perpendek label "Pengumuman" / beri container `overflow-x:auto` agar 4 chip muat di lebar 390px.
**Gate:** ✅ label "Pengumuman" penuh terbaca di 390px (re-capture `tenant/mobile/01-stay.png`).

---

### X-08 🟡 — Nav publik tidak konsisten antar halaman

**Bukti:** menu berbeda di `01-landing`/`02-katalog`/`05-panduan`/`06-reviews`.
**Target (cara temukan PERSIS):** Grep `'Masuk Portal'` ATAU `'Katalog Kamar'` ATAU class `gx-nav` di `frontend/src` → header/navbar publik. Verifikasi dulu apakah landing & halaman publik lain pakai komponen header yang SAMA atau berbeda. Bila berbeda → satukan jadi satu komponen `PublicHeader` dengan item & urutan menu konsisten. **Konfirmasi keputusan menu final ke owner** (item mana yang harus ada) sebelum mengubah.
**Gate:** ✅ nav identik (item + urutan) di landing/katalog/panduan/reviews.

---

### X-09 🟡 — Owner invoices: kartu ringkasan "0" saat loading (bukan skeleton)

**Bukti:** `owner/desktop/04-invoices.png` — Tagihan/Overdue/Draft/Lunas = 0 saat daftar masih spinner (retest: 15 invoice ada).
**Target (path TERVERIFIKASI):** `frontend/src/pages/invoices/InvoicesPage.tsx` (owner). Saat query ringkasan `isLoading`/`isPending`, tampilkan komponen skeleton (lihat pola `StatCardSkeleton` yang sudah dipakai di `OwnerDashboardPage.tsx:300`) untuk kartu Tagihan/Overdue/Draft/Lunas, BUKAN angka "0". Tampilkan "0" hanya bila query SUKSES dan datanya memang 0.
**Gate:** ✅ tidak ada "0" menyesatkan saat loading; build lulus.

---

### X-10 — Selesaikan inspeksi visual sisa (~110 screenshot) + axe authenticated

> Capture SUDAH lengkap (132 shot); audit awal baru menginspeksi 1-per-1: PUBLIC desktop, TENANT mobile inti, 3 dashboard, owner finansial. Sisanya tinggal dibaca.

- [ ] Inspeksi 1-per-1: TENANT desktop; STAFF mobile; ADMIN (stays/invoices/payment-review/tickets/tenants/meter/inventory/check-in); OWNER 26 halaman lain; PUBLIC mobile.
- [ ] Jalankan a11y: `cd frontend; npm run test:a11y` (axe halaman publik) + perluas axe ke halaman ber-login.
- [ ] Tambahkan temuan baru ke `docs/_AUDIT_UIUX_VISUAL_2026-06-30.md` dan buat task X-11+ di sini.

**Gate:** ✅ 132 screenshot terinspeksi; temuan baru tercatat & dipetakan ke task.

---

### ℹ️ Catatan data (BUKAN bug — jangan dikejar)
- Okupansi tampil **4/13**: 9 stay seed `plannedCheckOutDate` lampau di-force-checkout auto-ops (overstay) → 4 stay aktif. Efek tanggal data seed.
- Reviews kosong: survei gagal ter-seed (rate-limit login). Empty-state-nya sendiri bagus.
- Artefak dummy `Kamar Z1` (room id 14, AVAILABLE) dibuat saat audit untuk uji katalog — boleh dihapus (tidak ada `@Delete /rooms`; hapus via DB UAT bila perlu).

---

## PERINTAH EKSEKUSI UNTUK AI

1. **Baca task di M10** — pilih satu task (V-07, V-08, ...).
2. **Baca rencana detail di appendix ini** — cari nama task yang sama.
3. **Ikuti step berurutan** — jangan lompat.
4. **Setelah selesai 1 file, verifikasi:** `cd backend && npx tsc --noEmit` (backend) atau `cd frontend && npm run build` (frontend).
5. **Commit 1 task = 1 commit** — tulis changelog di `docs/M11_CHANGELOG.md`.
6. **Centang `[x]` di M10** setelah selesai.
7. **Jika ada yang tidak jelas, STOP dan tanya** — jangan menebak.
8. **JANGAN ubah `schema.prisma`**.
9. **JANGAN tambah npm dependency baru**.
10. **JANGAN `git push`**.

---

## Catatan Eksekusi Penting

- **Fase M–P = turunan Audit UI/UX 20 Juni 2026** (`docs/archieve/2026-06-20_fase_selesai/audit-uiux-2026-06-20.md`). Pemetaan: M=P0 quick wins, N=ramping dashboard/nav (§5–§7), O=design system (§4), P=pola UI modern (§7–§8).
- **M18_FASE_M diarsipkan** (stale/konflik) → `docs/archieve/deprecated_dossiers/_DEPRECATED_M18_FASE_M_FRONTEND_UX.md`. **Sumber kebenaran Fase M = file ini.** Pola konfirmasi final: `ConfirmProvider` + `useConfirm()`.
- **Fase B–K selesai:** detail historis di `docs/M11_CHANGELOG.md`.
- **MKT-5, PUB-UI-REVAMP, OWN-STRUKTUR, AUDIT-KEUANGAN-ULTRA:** semua diserap ke fase-fase di atas — jangan buat task duplikat.
- **Monolit yang jangan dipecah buta:** `TicketsPage`, `StaysPage`, `AccountingSetupPage` (FE), jalur-uang backend — refactor hanya per-task bila ada bug.
- **Selesai Referensi:** METER M-5 (checkout deposit UAT), SEO Lighthouse 100/100, split auto-ops E3a-E3b, integration test E3c, E2E E3d.
