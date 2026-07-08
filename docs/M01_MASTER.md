# KOST48 V5 — Master Overview & Ground State

> Dokumen orientasi utama. Detail eksekusi → `docs/M12_CHECKLIST_CHANGELOG.md`. Navigasi kode → `docs/M00_CODEMAP.md`.

## Pintu Masuk Docs Cepat

1. `docs/M01_MASTER.md` — blueprint, ground state, dan konteks bisnis global.
2. `docs/M02_KEPUTUSAN_OWNER.md` — sumber kebenaran keputusan owner sebelum ubah flow.
3. `docs/M12_CHECKLIST_CHANGELOG.md` — checklist aktif, urutan eksekusi, dan gate verifikasi.
4. `docs/M00_CODEMAP.md` — peta modul ke file; pakai ini dulu sebelum grep liar ke seluruh repo.
5. Domain khusus: `M04` keuangan, `M05` siklus huni, `M06` operasional, `M07` publik/marketing, `M08` deploy, `M09` AI Owner/Admin.

Hindari membaca arsip besar kecuali benar-benar perlu forensik: `docs/archieve/*`, file `*_STALE.md`, `reference/*`, dan `backend/src/generated/*`.

## Status Terkini (2026-07-08)

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
- **Schema terkini:** S-6 (migration `20260619140000_ai_draft_queue`) + S-5 + S-4 + additive KTP fields
- **Commit terkini:** `8bfb713` — feat: finalize AU fixes and consolidate docs

---

## 1. Identitas & Model Bisnis

- **KOST48** — kost eksklusif pria, **48 kamar** (33 reguler/10 eksklusif/5 VIP)
- **Lokasi:** Jl. Hikmah V No. 48, Surabaya Barat (dekat Pakuwon Mall/PTC — bukan Ngagel, koreksi D-01)
- **Stack:** NestJS + Prisma + PostgreSQL · React + Vite + React-Bootstrap + TanStack Query + Recharts
- **Role:** OWNER / ADMIN / STAFF / TENANT (tidak ada SUPER_ADMIN/FINANCE)
- **Status:** BELUM PUBLISH — DB = data testing. Deploy = START BERSIH (fresh, bukan migrasi). **1 staf.** Bayar tunai+transfer.
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

## 4. Auto-Ops Engine (5 Sweep Service, 18+ Operasi)

Mutex (DB advisory lock `pg_try_advisory_lock(1)`). **Prinsip:** uang masuk (submission PENDING/APPROVED, invoice PAID/PARTIAL) = STOP otomatisasi. Lock `FOR UPDATE` + re-cek. Timezone WIB (UTC+7). Sejak Fase E di-split ke 5 sweep service:

| Sweep Service | Operasi |
|---|---|
| **BookingSweep** | booking expiry, DP forfeit |
| **StaySweep** | overstay forced checkout, post-checkout auto-cancel, noon release, room healer, overstay enforcement |
| **RenewalSweep** | renewal priority expiry, renewal settlement forfeit |
| **AccountingSweep** | rent recognition (PSAK 72), auto-journal reconciliation, recurring expense draft, automatic depreciation, accounting auto-close, notification pruning |
| **MaintenanceSweep** | contract end reminders, SLA escalation, belongings abandonment, AC cleaning, referral rewards, PWA push dispatch |

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

---

## 6. Stack & Model Aktif

- **Backend:** NestJS + TypeScript + Prisma 7 + PostgreSQL. Auth JWT Bearer 24jam + Refresh Token (httpOnly cookie sejak M17). CORS + rate-limit in-memory. 42 modul.
- **Frontend:** React 18 + Vite 5 + React-Bootstrap + TanStack Query + Recharts. ±50 route.
- **DB:** `kost48_v3_pro` (UAT, port 5433) / `kost48_v3` (produksi, port 5432).
- **57 Prisma model (69 enum):** `User`, `Tenant`, `Room`, `RoomFacility`, `Stay`, `TenantDepositLedgerEntry`, `MeterReading`, `Invoice`, `InvoiceLine`, `InvoicePayment`, `PasswordResetToken`, `PaymentSubmission`, `Ticket`, `StaffRoutineTemplate`, `StaffRoutineAssignment`, `StaffRoutineCompletion`, `StaffWorkAudit`, `StaffPerformanceEvent`, `StaffReview`, `Announcement`, `InventoryItem`, `RoomItem`, `InventoryMovement`, `StaffFieldReport`, `RenewRequest`, `CheckoutRequest`, `WifiSale`, `Expense`, `FixedAsset`, `AssetDepreciationRun`, `AssetDepreciationLine`, `AppNotification`, `PushSubscription`, `AuditLog`, `AiDraft`, `ChartOfAccount`, `CashAccount`, `AccountingPeriod`, `OpeningBalanceBatch`, `OpeningBalanceLine`, `JournalEntry`, `JournalLine`, `RentRecognitionSchedule`, `RoomTransfer`, `LoyaltyPoint`, `LoyaltyReward`, `Redemption`, `PeerBehaviorReport`, `TenantReferral`, `Faq`, `OperationalSetting`, `AdditionalService`, `ServiceInterest`, `SatisfactionSurvey`, `MarketAnalysis`, `GuestPreferenceSurvey`, `ExternalReview`, `RefreshToken`.

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