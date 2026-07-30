# KOST48 V5 — Master Overview & Ground State

> Dokumen orientasi utama. Detail eksekusi → `docs/M12_CHECKLIST_CHANGELOG.md`. Navigasi kode → `docs/M00_CODEMAP.md`.

## Pintu Masuk Docs Cepat

1. `docs/M01_MASTER.md` — blueprint, ground state, dan konteks bisnis global.
2. `docs/M02_KEPUTUSAN_OWNER.md` — sumber kebenaran keputusan owner sebelum ubah flow.
3. `docs/M12_CHECKLIST_CHANGELOG.md` — checklist aktif, urutan eksekusi, dan gate verifikasi.
4. `docs/M00_CODEMAP.md` — peta modul ke file; pakai ini dulu sebelum grep liar ke seluruh repo.
5. `docs/M14_AUDIT_UI_UX.md` — audit UI/UX aktif, benchmark eksternal terkurasi, bukti runtime lokal/produksi dan static-code Owner/Admin, serta pembagian kerja AO-00..AO-23.
6. Domain khusus: `M04` keuangan, `M05` siklus huni, `M06` operasional, `M07` publik/marketing, `M08` deploy, `M09` AI Owner/Admin.
7. `docs/UI_UX_OWNER_ADMIN.md` — standar aktif UI Owner/Admin: ringkas saat dilihat, lengkap saat dibuka.

Hindari membaca arsip besar kecuali benar-benar perlu forensik: `docs/archieve/*`, file `*_STALE.md`, `reference/*`, dan `backend/src/generated/*`.

## Status Terkini (2026-07-30)

- **Fase AO — Audit & Hardening UI/UX:** audit selesai pada 66 kombinasi route–viewport dan 74 route statis. Eksekusi masih terbuka; UAT berstatus RED karena dua migration pending serta crawl OWNER/ADMIN/STAFF belum tersedia. Detail: `docs/M14_AUDIT_UI_UX.md`.

- **Release Pengumuman/Notifikasi P1-P3:** implementasi selesai dan build backend/frontend lulus. Keputusan bisnis, UAT, dan gate rilis ada di `docs/RELEASE_20260723_ANNOUNCEMENT_NOTIFICATIONS.md`.
- **Perubahan lintas AI pada release ini:** uplift inventaris/fasilitas, quota utilitas berbasis periode sewa, dashboard IoT, P1-P3, hardening strict TypeScript backend, dan konsolidasi frontend/CSS telah direkonsiliasi di `M13_CHANGELOG.md`.
- **Deploy pertama:** database produksi baru dan kosong, bukan drop database UAT dan bukan migrasi data testing. Sesudah go-live, perubahan database patch-only. Runbook otoritatif: `docs/DEPLOYMENT_ONLINE_20260723.md`.

- **Fase A** — Pra-Go-Live: blocked owner (deploy nyata menunggu server/domain/env)
- **Fase B–U** — SELESAI (publik, owner, staff, AI, UI, audit, hardening, wizard, fasilitas)
- **Fase V** — Booking flow baru: inti benar (RoomStatus tanpa BOOKING), sebagian verifikasi sudah bersih
- **Fase W** — Audit Maksimal Status Proyek: SELESAI (W-01..W-09 + W-00-D1 owner decision)
- **Fase X** — Audit UI/UX Visual: SELESAI (X-01..X-16; X-14 accounting-setup 5 tab)
- **Fase Y** — Test Coverage Maksimal: **SELESAI** (19 sub-fase, 153 area; 153 PASS)
- **Fase Z** — Cross-Portal Audit: SELESAI (19 task: 1 CRITICAL, 7 HIGH, 8 MEDIUM, 3 LOW)
- **Fase AA–AJ** — Perbaikan Temuan Audit Fable: SELESAI (CHECKLIST_01–19)
- **Fase AK** — Owner-Request API Key DeepSeek via Settings: SELESAI
- **Fase AL** — Audit Reasonix Code (82 temuan, 6 critical bug): SELESAI
- **Fase AM** — Redundansi UI/UX: SELESAI (16/16)
- **Fase M14–M18** — Audit 360° + Celah Peningkatan: SELESAI
- **Fase AU** — Fix UX Admin/Owner orphaned endpoints: SELESAI
- **Finance:** Audit keuangan ultra LULUS — TB balanced, deposit MATCHED, 8 invarian PASS
- **AI:** Fase G (G0-G9) + Fase J hardening + Fase K pasca-audit SELESAI — manual-only, OWNER/ADMIN, audit meta.ai
- **G5+** — Perkuat OCR verifikasi KTP + fallback manual + bank data tenant: SELESAI
- **Schema terkini:** 61 model / 73 enum; migration rilis terbaru `20260723000000_announcement_notification_delivery` menambah kategori notifikasi dan delivery pengumuman. Gunakan ledger migration, bukan `db push`, di produksi.
- **Baseline kode terkini:** `8627289` — artefak build/session tracking sesudah perubahan P1-P3 dan refactor. Dokumentasi/runbook release di worktree ini perlu ikut di-commit bersama artefak yang disetujui sebelum deploy.

---

## 1. Identitas & Model Bisnis

- **KOST48** — kost eksklusif pria, **48 kamar** (33 reguler/10 eksklusif/5 VIP)
- **Lokasi:** Jl. Hikmah V No. 48, Surabaya Barat (dekat Pakuwon Mall/PTC — bukan Ngagel, koreksi D-01)
- **Stack:** NestJS + Prisma + PostgreSQL · React + Vite + React-Bootstrap + TanStack Query + Recharts
- **Role:** OWNER / ADMIN / STAFF / TENANT (tidak ada SUPER_ADMIN/FINANCE)
- **Status:** BELUM PUBLISH — data UAT/testing tidak dimigrasikan. Go-live pertama memakai database produksi BARU/kosong; database UAT tidak di-drop otomatis. Sesudah go-live, gunakan patch migration saja. **1 staf.** Bayar tunai+transfer.
- **Filosofi:** retensi > akuisisi; tenant = pengawas kualitas staf; auto-ops maksimal; laporan keuangan jujur.

---

## 2. Konsep Kunci Uang (WAJIB PAHAM)

> **Sumber kebenaran:** `docs/M02_KEPUTUSAN_OWNER.md` — bila konflik, M02 menang.

- **Tidak ada model Booking.** Satu `Stay` = booking→huni→selesai. Promoted = `initialMetersPromotedAt` terisi.
- **DP** (`downPayment*`, 30% sewa, **hangus**) ≠ **Deposit jaminan** (`deposit*`, dari `Room.defaultDepositRupiah`, **SELALU tetap, refundable**).
- **NO-PARTIAL menyeluruh.** Nominal bayar harus tepat (DP atau pelunasan penuh). **First-paid-wins.** Booking expiry 3 jam flat.
- **Tanpa denda keterlambatan.** Notifikasi in-app → PWA push. **AI = tombol manual Owner/Admin saja** (D-23).
- **Sewa per term:** Harian 13% · Mingguan 50% · 2Mingguan 75% · Bulanan 100% · Semester 5.7× · Tahunan 11×. (✅ owner-confirmed 2026-06-24: `pricing.helper.ts`)
- **Occupant surcharge (D-24):** Standar 2 org gratis, maks 4 (+20%/orang ekstra). Besar 4 org gratis, maks 6.

---

## 3. Indeks Dossier Domain

| Dossier | Domain | Status |
|---------|--------|--------|
| `10_PEMBAYARAN_INVOICE` | bayar/approve/invoice/meter | 🟢 selesai |
| `11_BOOKING_RENEWAL` | booking + renewal | 🟢 selesai (F2-1 renewal dua-fase) |
| `12_CHECKOUT_DEPOSIT_OVERSTAY` | checkout/deposit/overstay/kabur/abandoned | 🟢 selesai |
| `13_AKUNTANSI_LAPORAN` | jurnal/laporan/expense/aset/unearned | 🟢 selesai |
| `14_INVENTARIS` | stok/movement/room-item | 🟢 selesai |
| `15_STAF_TIKET_KPI` | tiket/rutinitas/KPI/SLA/review | 🟢 selesai |
| `16_NOTIFIKASI_PENGUMUMAN` | notif/pengumuman/PWA push | 🟢 selesai |
| `17_PUBLIK_MARKETING_UIUX` | katalog/SEO/UI/chart | 🟢 selesai (SEO 100/100) |
| `18_AUTH_FONDASI_ONBOARDING` | auth/role/KTP gate | 🟢 selesai |
| `19_GAMIFIKASI_LOYALITAS` | poin/reward/referral/peer report | 🟢 selesai (F4-9+F4-13) |
| `M09_AI_OWNER_ADMIN` | AI berbayar DeepSeek (G0-G9) | 🟢 selesai |
| `archieve/2026-06-20_fase_selesai/M15_FASE_J_HARDENING_AI` | Hardening AI pra-go-live | 🗄️ arsip (J0-J4 selesai) |
| `archieve/2026-06-20_fase_selesai/M16_PASCA_AUDIT_PLAN` | Pasca-Audit Total | 🗄️ arsip (13 task, commit ac4cc2f) |

**Hierarki sumber kebenaran:** `M02_KEPUTUSAN_OWNER` → kode terverifikasi → dossier domain → `M12_CHECKLIST_CHANGELOG` (urutan eksekusi).

---

## 4. Auto-Ops Engine (6 Sweep Service, 18+ Operasi)

Mutex (DB advisory lock `pg_try_advisory_lock(1)`). **Prinsip:** uang masuk (submission PENDING/APPROVED, invoice PAID/PARTIAL) = STOP otomatisasi. Lock `FOR UPDATE` + re-cek. Timezone WIB (UTC+7). Struktur awal Fase E dipecah menjadi 5 sweep service; release P2 menambah `AnnouncementSweepService` sebagai service ke-6:

| Sweep Service | Operasi |
|---|---|
| **BookingSweep** | booking expiry, DP forfeit |
| **StaySweep** | overstay forced checkout, post-checkout auto-cancel, noon release, room healer, overstay enforcement |
| **RenewalSweep** | renewal priority expiry, renewal settlement forfeit |
| **AccountingSweep** | rent recognition (PSAK 72), auto-journal reconciliation, recurring expense draft, automatic depreciation, accounting auto-close, notification pruning |
| **MaintenanceSweep** | contract end reminders, SLA escalation, belongings abandonment, AC cleaning, referral rewards, PWA push dispatch |
| **AnnouncementSweep** | dispatch pengumuman aktif yang belum `dispatchedAt`, dedupe per penerima |

Semua operasi dijalankan sequential dalam `runAll()` untuk menghindari race condition double-cancel.

---

## 5. Invarian Sistem (Tak Boleh Dilanggar)

1. Uang masuk = otomatisasi BERHENTI.
2. Stay promoted tak pernah dibatalkan job; CANCELLED berjurnal reversal blocking.
3. Kamar tak AVAILABLE tanpa tiket CHECKOUT_INSPECTION ditutup.
4. Tiap rupiah = 1 jurnal POSTED + AuditLog; deposit = liability; no-partial.
5. Periode renewal menyambung tanpa gap/overlap; tenant lama prioritas s/d hari-H.
6. Data sensitif (KTP/NIK) minimal + terproteksi + dihapus saat keluar (UU PDP).
7. Reward/benefit selalu berjejak akuntansi (DR/CR sesuai tipe reward).
8. AI tidak langsung mutasi data; output AI = draft/rekomendasi; aksi final = approval manusia.
9. UI tidak memilih antara lengkap atau sederhana: kemampuan tetap lengkap, tetapi detail dibuka bertahap.

---

## 6. Stack & Model Aktif

- **Backend:** NestJS + TypeScript + Prisma 7 + PostgreSQL. Auth JWT Bearer 24jam + Refresh Token (httpOnly cookie sejak M17). CORS + rate-limit in-memory. 46 modul.
- **Frontend:** React 18 + Vite 5 + React-Bootstrap + TanStack Query + Recharts. ±50 route.
- **DB:** `kost48_v3_pro` (UAT, port 5433). Produksi pertama memakai database baru yang ditetapkan owner (mis. `kost48_prod`), bukan asumsi/reuse database lama `kost48_v3`.
- **61 Prisma model (73 enum):** `User`, `Tenant`, `Room`, `RoomFacility`, `Stay`, `TenantDepositLedgerEntry`, `MeterReading`, `IotDevice`, `IotIngestMessage`, `IotTelemetry`, `Invoice`, `InvoiceLine`, `InvoicePayment`, `PasswordResetToken`, `PaymentSubmission`, `Ticket`, `StaffRoutineTemplate`, `StaffRoutineAssignment`, `StaffRoutineCompletion`, `StaffWorkAudit`, `StaffPerformanceEvent`, `StaffReview`, `Announcement`, `InventoryItem`, `RoomItem`, `InventoryMovement`, `StaffFieldReport`, `RenewRequest`, `CheckoutRequest`, `WifiSale`, `Expense`, `FixedAsset`, `AssetDepreciationRun`, `AssetDepreciationLine`, `AppNotification`, `PushSubscription`, `AuditLog`, `AiDraft`, `ChartOfAccount`, `CashAccount`, `AccountingPeriod`, `OpeningBalanceBatch`, `OpeningBalanceLine`, `JournalEntry`, `JournalLine`, `RentRecognitionSchedule`, `RoomTransfer`, `LoyaltyPoint`, `LoyaltyReward`, `Redemption`, `PeerBehaviorReport`, `TenantReferral`, `Faq`, `OperationalSetting`, `AdditionalService`, `ServiceInterest`, `SatisfactionSurvey`, `MarketAnalysis`, `GuestPreferenceSurvey`, `ExternalReview`, `RefreshToken`.

---

## 7. Perintah Kerja

```bash
# Backend
cd backend
npx tsc --noEmit          # type check
npm run start:dev         # API http://localhost:3000/api
node --test "test/**/*.test.js"  # unit test

# Frontend
cd frontend
npm run build             # build + tsc
npm run dev               # dev server

# DB UAT (port 5433, jangan prod 5432)
node scripts/seed-dev-reset.js && node scripts/seed-dev-via-api.js
```

**Akun dev:** `owner@kost48.com / Owner#2026` (OWNER) · `admin@kost48.com / admin123` (ADMIN) · `staff@kost48.com / staff123` · 16 tenant `@kost48.test / Tenant#2026`.

---

## 🆕 Audit Lintas Scope — 29 Jul 2026 (Reasonix)

> **Tujuan:** mengidentifikasi risiko cross-cutting, inkonsistensi antar scope, peluang shared module extraction, dan efisiensi kode di seluruh 8 domain yang telah di-deep-audit.

---

### A. RISIKO CROSS-SCOPE — Scope Merusak Scope Lain

#### A1. 🔴 CRITICAL — Journal Posting Best-Effort = Silent Data Loss

**Dampak:** Laporan keuangan tidak lengkap. Tidak ada recovery path otomatis.  
**Scope terdampak:** Siklus Huni → Keuangan, Operasional → Keuangan

| Pola | Lokasi | Scope Pemanggil | Dampak ke Scope Keuangan |
|---|---|---|---|
| `postInvoiceIssuedTx().catch(...)` | `tenant-bookings.service.ts:362` | Booking → Keuangan | Invoice issued tanpa jurnal piutang |
| `postInvoiceIssuedTx().catch(...)` | `stays-renewal.service.ts:196,368` | Renewal → Keuangan | 2 titik: DP + settlement |
| `postInvoiceIssuedTx().catch(...)` | `stays.service.ts:449,514,833` | Check-in/Complete → Keuangan | Deposit + sewa awal + denda |
| `postInvoiceIssuedTx().catch(...)` | `room-transfer.service.ts:256` | Transfer → Keuangan | Invoice transfer tanpa jurnal |
| `postWifiSale().catch(...)` | `wifi-sales.service.ts:44` | Operasional → Keuangan | Record WifiSale tanpa jurnal pendapatan (bukan invoice, tapi record penjualan) |
| `postDepositReceivedForStayTx()` try/catch | `payment-submissions.service.ts:904` | Keuangan → Keuangan | Deposit diterima tanpa jurnal liabilitas |
| `recordDepositReceivedTx()` try/catch | `payment-submissions.service.ts:898` | Keuangan → Keuangan | Deposit ledger bolong — PALING KRITIS |

**Root cause:** Module `expenses.service.ts:107` (`confirmExpense`) menggunakan pola BLOCKING yang benar (throw jika gagal), tapi `create()` expense sendiri (line 72) juga best-effort. **Tidak ada 1 modul pun yang 100% blocking** — semua modul punya minimal 1 titik best-effort journal.

**Perbaikan:** AN-03 harus diperluas — bukan hanya 15 call site `postBalancedJournalTx`, tapi **semua 20+ call site journal/invoice posting** harus seragam BLOCKING.

#### A2. 🟠 HIGH — Timezone Inconsistency = Data Salah Lintas Scope

**Dampak:** Laporan keuangan, SLA tiket, dan kalender ketersediaan bisa bergeser 7 jam (UTC vs WIB).  
**Scope terdampak:** Semua scope yang menggunakan `new Date()`.

| File | Pola | Masalah |
|---|---|---|
| `owner-ai.service.ts:126,144,168` | `new Date().setHours(0,0,0,0)` | **Timezone-dependent** — `setHours()` pakai TZ lokal proses Node. Jika `TZ=UTC` → reset jam 7 pagi WIB (bug). Jika `TZ=Asia/Jakarta` → benar. Tidak eksplisit. Plus bug: bucket reset bisa terlambat 1 hari. |
| `staff-performance.service.ts:6,21` | `Date.now() + WIB_OFFSET_MS` | Raw offset — tidak menggunakan shared util |
| `accounting-period-close.service.ts:51` | `previousUtcMonth(now = new Date())` | Tidak dinormalisasi ke WIB |
| ✅ `stays.service.ts:697,726,936` | `startOfJakartaBusinessDay()` | BENAR — contoh rujukan |

**Root cause:** Dua util WIB sudah ada (`date.util.ts:30` + `date-only.ts:22`) tapi tidak dipakai seragam.

#### A3. 🟡 MEDIUM — Audit Log di Luar Transaction = Trail Tidak Atomik

**Dampak:** Audit trail hilang jika proses crash antara tx commit dan audit log write.  
**Pattern benar:** `stays.service.ts` — audit log di DALAM `$transaction` (atomic dengan bisnis write)  
**Pattern salah:** `payment-submissions.service.ts:1071` — audit log di LUAR tx (fire-and-forget)

### B. PENGIRIMAN DATA TIDAK MASUK AKAL

#### B1. PIN Header vs JWT — Dual Auth untuk Operasi Owner

- `public-availability.controller.ts` — PUT setup ketersediaan via `X-Availability-Pin` header
- `owner-ai.controller.ts` — operasi AI owner via JWT + `@Roles(OWNER)`
- Keduanya = operasi owner-level, tapi mekanisme auth BERBEDA

**Risiko:** PIN bocor = attacker bisa ubah ketersediaan publik tanpa JWT. Sementara operasi AI yang lebih sensitif (data keuangan) dilindungi JWT penuh. Hirarki proteksi tidak konsisten.

#### B2. Notifikasi `.catch(() => undefined)` vs `.catch(logger.error)` — Silent vs Logged

| Pattern | Count | Contoh |
|---|---|---|
| `.catch(() => undefined)` | ~8 titik | `peer-report.service.ts:48,73`, `tickets.service.ts:992` |
| `.catch(logger.warn)` | ~12 titik | `auto-ops/sweeps`, `announcements.service.ts` |
| `.catch(logger.error)` | ~5 titik | `auth.service.ts:324`, `announcements.service.ts:120` |

**Tidak ada standar logging level untuk kegagalan notifikasi.**

### C. MODUL BERSAMA — Extraction Candidates

#### C1. 🔴 PRIORITAS — `assertOwnerOrAdmin` (4 DUPLIKAT SEMANTIK)

| File:Line | Pesan Error |
|---|---|
| `inventory-items.service.ts:137` | "Staff hanya boleh melihat data stok..." |
| `inventory-movements.service.ts:107` | "Staff hanya boleh melihat riwayat stok..." |
| `room-items.service.ts:64` | "Staff hanya boleh melihat inventaris kamar..." |
| `rooms.service.ts:558` | "Staff hanya boleh melihat data kamar..." |

**🆕 KOREKSI Codex Sol:** Bukan 4 salinan byte-identik — pesan error BEDA per konteks. Tapi logika role SAMA: `![OWNER,ADMIN].includes(actor.role)`. Duplikasi semantik, tetap layak diekstrak dengan parameter pesan.  
**Usulan:** Extract ke `common/guards/owner-admin.guard.ts` — 1 definisi, 4 pemakaian. Hemat ~30 baris duplikat.

#### C2. 🟠 PRIORITAS — Journal Posting Wrapper

Semua call site `postInvoiceIssuedTx().catch(...)` harus diganti dengan wrapper BLOCKING:
```typescript
// common/utils/journal-posting.util.ts
async function postJournalBlocking(postingFn, ...args) {
  const result = await postingFn(...args);
  if (!result?.posted) throw new ConflictException('Gagal mencatat jurnal — transaksi dibatalkan');
  return result;
}
```
**Hemat:** 9+ blok `.catch()` dihapus, konsistensi terjamin.

#### C3. 🟡 PRIORITAS — `notifySafe()` Fire-and-Forget Utility

Tidak ada wrapper notifikasi terpusat. Setiap modul menulis `.catch()` manual. Usulan:
```typescript
// common/utils/notification.util.ts
function notifySafe(notificationService, params) {
  void notificationService.createOnce(params).catch((err) => {
    Logger.warn(`Notifikasi gagal: ${params.entityType}#${params.entityId}`, err);
  });
}
```
**Hemat:** ~15 blok `.catch()` manual diganti 1 pemanggilan.

#### C4. 🟡 PRIORITAS — Pagination + `$transaction` Boilerplate

Pattern berikut muncul 20+ kali:
```typescript
const { page, limit, skip, take } = buildPagination(query.page, query.limit);
const [items, totalItems] = await this.prisma.$transaction([
  this.prisma.X.findMany({ where, skip, take, orderBy: ... }),
  this.prisma.X.count({ where }),
]);
return { items, meta: buildMeta(page, limit, totalItems) };
```
**Usulan:** `paginatedQuery(prisma, model, where, query)` — 5 baris → 1 baris.

#### C5. 🟢 LOW — Dead Code: `IotRetiredStreamController`

`iot-retired-stream.controller.ts` — 15 baris, selalu return 204. Kompatibilitas PWA lama. Bisa dihapus setelah konfirmasi tidak ada PWA client yang masih connect.

### D. EFISIENSI KODE — Competitive Programming Perspective

#### D1. 🔴 N+1 Query — Notifikasi per Admin dalam Loop

```typescript
// peer-report.service.ts:44-49
const admins = await this.prisma.user.findMany({ where: { role: { in: ['ADMIN', 'OWNER'] } } });
for (const admin of admins) {
  await this.appNotification.createOnce({ recipientUserId: admin.id, ... }).catch(() => undefined);
}
```
**Masalah:** 1 admin = 1 query. 3 admin = 3 query. **Saran:** `createMany` batch insert.

#### D2. 🟠 `process.env` Evaluasi Runtime Berulang

- `auto-ops.constants.ts` — 17 `process.env.X ?? default` dievaluasi setiap import
- `owner-ai.service.ts` — ~25 akses langsung
- `accounting-sweep.service.ts` — 16 akses dengan duplikasi fallback logic

**Masalah:** Tidak ada caching, tidak ada validasi saat startup. Env yang salah baru ketahuan saat runtime.  
**Saran:** `AppConfigService` dengan validasi startup + caching.

#### D3. 🟡 DeepSeek Client — Tanpa Request Deduplication

`deepseek.client.ts` tidak punya deduplication. Dua klik cepat dari owner → 2 request identik ke DeepSeek → 2× biaya API.  
**Saran:** In-memory dedup key (hash input + ttl 30 detik) sebelum kirim request.

#### D4. 🟡 `marketing-public-rooms.service.ts` — 1112 Baris, Tanpa Cache

Katalog kamar publik (endpoint paling sering diakses) tidak punya cache layer. Setiap request = query ulang ke DB. Padahal data kamar jarang berubah.  
**Saran:** In-memory cache TTL 60 detik untuk `getPublicRooms()` dan `getPublicSocialProof()`.

#### D5. 🟢 `owner-ai.service.ts` — 1418 Baris Monolith

Service terbesar di seluruh codebase. Bisa di-split menjadi: `ai-brief.service.ts`, `ai-finance.service.ts`, `ai-payment-review.service.ts`, `ai-ops.service.ts`.

### E. MATRIKS DEPENDENSI CROSS-SCOPE

| Scope Hulu ↓ / Hilir → | Siklus Huni | Keuangan | Operasional | Publik | IoT |
|---|---|---|---|---|---|
| **Siklus Huni** | — | ✅ Invoice + Journal | ✅ Ticket checkout | ✅ Room status | ❌ |
| **Keuangan** | ❌ | — | ❌ | ❌ | ❌ |
| **Operasional** | ❌ | ✅ Wifi journal | — | ❌ | ❌ |
| **Publik** | ❌ | ❌ | ❌ | — | ❌ |
| **IoT** | ❌ | ❌ | ❌ | ❌ | — |

**Observasi:** Scope Keuangan adalah **sink** — semua scope mengirim data ke keuangan (invoice, journal, wifi sale), tapi keuangan tidak mengirim ke scope lain. Ini berarti setiap best-effort di scope hulu = data loss di keuangan. **Keuangan harus jadi scope paling ketat, bukan paling longgar.**

### F. REKOMENDASI PRIORITAS

| # | Rekomendasi | Impact | Effort |
|---|---|---|---|
| **X1** | Seragamkan SEMUA journal posting → BLOCKING (perluas AN-03 ke 20+ call site) | 🔴 Mencegah silent data loss di 7 scope | 3-4 jam |
| **X2** | Extract `assertOwnerOrAdmin` ke shared guard | 🟠 Hapus 4 duplikat, konsisten | 30 menit |
| **X3** | Buat `AppConfigService` — validasi env startup + cache | 🟠 Cegah runtime error, hemat evaluasi | 2 jam |
| **X4** | Fix timezone di `owner-ai.service.ts` — pakai `startOfJakartaBusinessDay` | 🟠 Cegah data AI salah hari | 15 menit |
| **X5** | Buat `notifySafe()` wrapper + batch notifikasi admin | 🟡 Standarisasi, hemat N query | 1 jam |
| **X6** | Buat `paginatedQuery()` utility | 🟡 Hemat boilerplate 20+ modul | 1 jam |
| **X7** | Cache katalog publik (TTL 60s) | 🟡 Perf utama (endpoint terpopuler) | 1 jam |
| **X8** | DeepSeek request deduplication | 🟡 Hemat biaya API | 30 menit |
| **X9** | Split `owner-ai.service.ts` (1418→4 file) | 🟢 Maintainability | 2 jam |
| **X10** | Hapus `IotRetiredStreamController` | 🟢 Dead code removal | 5 menit |

### G. RISK RATING LINTAS SCOPE

| Kategori | Rating | Detail |
|---|---|---|
| Journal consistency | 🔴 **CRITICAL** | 7 scope mengirim data ke keuangan via best-effort |
| Timezone consistency | 🟠 **HIGH** | 3 file pakai UTC, bukan WIB |
| Auth consistency | 🟡 **MEDIUM** | PIN vs JWT untuk operasi owner |
| DRY violations | 🟠 **HIGH** | 4 duplikat assertOwnerOrAdmin, 20+ boilerplate pagination |
| Performance | 🟡 **MEDIUM** | Tanpa cache publik, N+1 notifikasi, env runtime |
| **Overall** | 🟠 **HIGH** — prioritas X1-X4 harus dikerjakan sebelum go-live |
