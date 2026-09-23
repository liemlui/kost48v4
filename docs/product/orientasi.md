# Orientasi Proyek & Konteks Bisnis KOST48 V5

Tanggal: 2026-09-23
Status: aktif
Tujuan: orientasi produk — identitas & model bisnis, konsep kunci uang, Auto-Ops Engine, invarian sistem, stack & model aktif, dan perintah kerja (dari M01)
Rujukan: [M02](../M02_KEPUTUSAN_OWNER.md) · [STATUS](../STATUS.md) · [PETA-KODE](../PETA-KODE.md) · [scope.md](scope.md) · [flow-utama.md](flow-utama.md)

> Migrasi dari docs/M01_MASTER.md (B5 Tahap 3, 23 Sep 2026) pada DOC-GOV-20260922; teks orientasi tidak diubah.
> Batch B5 memisahkan materi bertanggal M01: status terkini 2026-09-08 → [changelog 2026-09](../history/changelog/2026-09.md); riwayat status 30 Juli 2026 → [changelog 2026-07](../history/changelog/2026-07.md); indeks dossier historis → [fase-lama](../history/fase-lama.md); Audit Lintas Scope 29 Jul 2026 → [audit-lintas-scope-2026-07-29.md](../audit/audit-lintas-scope-2026-07-29.md).

## Pintu Masuk Docs Cepat

1. `docs/M01_MASTER.md` — blueprint, ground state, dan konteks bisnis global.
2. `docs/M02_KEPUTUSAN_OWNER.md` — sumber kebenaran keputusan owner sebelum ubah flow.
3. `docs/M12_CHECKLIST_CHANGELOG.md` — checklist aktif, urutan eksekusi, dan gate verifikasi.
4. `docs/M00_CODEMAP.md` — peta modul ke file; pakai ini dulu sebelum grep liar ke seluruh repo.
5. `docs/M14_AUDIT_UI_UX.md` — audit UI/UX aktif, benchmark eksternal terkurasi, bukti runtime lokal/produksi dan static-code Owner/Admin, serta pembagian kerja AO-00..AO-23.
6. Domain khusus: `M04` keuangan, `M05` siklus huni, `M06` operasional, `M07` publik/marketing, `M08` deploy, `M09` AI Owner/Admin.
7. `docs/M17_PORTAL_FLOW_RINGKAS.md` — prinsip portal ringkas; `docs/M18_ATURAN_HARGA_KAMAR.md` — harga; `docs/M19_EFISIENSI_HOSTING_512MB.md` — batas teknis EF dan data hosting.
8. `docs/M20_PRODUKSI_KOST48.md` — **produksi & operasional harian** (identitas deployment, env, redeploy, backup/rollback, jebakan, sisa pekerjaan owner). Baca ini dulu sebelum menyentuh server.

Hindari membaca arsip besar kecuali benar-benar perlu forensik: `docs/archieve/*`, file `*_STALE.md`, `reference/*`, dan `backend/src/generated/*`.

## 1. Identitas & Model Bisnis

- **KOST48** — kost eksklusif pria, **48 kamar** (33 reguler/10 eksklusif/5 VIP)
- **Lokasi:** Jl. Hikmah V No. 48, Surabaya Barat (dekat Pakuwon Mall/PTC — bukan Ngagel, koreksi D-01)
- **Stack:** NestJS + Prisma + PostgreSQL · React + Vite + React-Bootstrap + TanStack Query + Recharts
- **Role:** OWNER / ADMIN / STAFF / TENANT (tidak ada SUPER_ADMIN/FINANCE)
- **Status deployment terbaru:** UNKNOWN sampai identitas artefak/host diperoleh (M19 §9). Kebijakan go-live pertama: data UAT/testing tidak dimigrasikan. Go-live pertama memakai database produksi BARU/kosong; database UAT tidak di-drop otomatis. Sesudah go-live, gunakan patch migration saja. **1 staf.** Bayar tunai+transfer.
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
- **62 Prisma model (74 enum; hitungan schema lokal 6 Sep 2026, daftar berikut navigasi):** `User`, `Tenant`, `Room`, `RoomFacility`, `Stay`, `TenantDepositLedgerEntry`, `MeterReading`, `IotDevice`, `IotIngestMessage`, `IotTelemetry`, `Invoice`, `InvoiceLine`, `InvoicePayment`, `PasswordResetToken`, `PaymentSubmission`, `Ticket`, `StaffRoutineTemplate`, `StaffRoutineAssignment`, `StaffRoutineCompletion`, `StaffWorkAudit`, `StaffPerformanceEvent`, `StaffReview`, `Announcement`, `InventoryItem`, `RoomItem`, `InventoryMovement`, `StaffFieldReport`, `RenewRequest`, `CheckoutRequest`, `WifiSale`, `Expense`, `FixedAsset`, `AssetDepreciationRun`, `AssetDepreciationLine`, `AppNotification`, `PushSubscription`, `AuditLog`, `AiDraft`, `ChartOfAccount`, `CashAccount`, `AccountingPeriod`, `OpeningBalanceBatch`, `OpeningBalanceLine`, `JournalEntry`, `JournalLine`, `RentRecognitionSchedule`, `RoomTransfer`, `LoyaltyPoint`, `LoyaltyReward`, `Redemption`, `PeerBehaviorReport`, `TenantReferral`, `Faq`, `OperationalSetting`, `AdditionalService`, `ServiceInterest`, `SatisfactionSurvey`, `MarketAnalysis`, `GuestPreferenceSurvey`, `ExternalReview`, `RefreshToken`.

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
