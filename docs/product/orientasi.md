# Orientasi Proyek & Konteks Bisnis KOST48 V5

Tanggal: 2026-09-23
Status: aktif
Tujuan: orientasi produk — identitas & model bisnis, konsep kunci uang, invarian sistem, stack & model aktif, dan perintah kerja (dari M01)
Rujukan: [KEPUTUSAN-OWNER](../KEPUTUSAN-OWNER.md) · [STATUS](../STATUS.md) · [PETA-KODE](../PETA-KODE.md) · [scope.md](scope.md) · [flow-utama.md](arah-produk.md)

> Migrasi dari docs/M01_MASTER.md (B5 Tahap 3, 23 Sep 2026) pada DOC-GOV-20260922; teks orientasi tidak diubah.
> Batch B5 memisahkan materi bertanggal M01: status terkini 2026-09-08 → [changelog 2026-09](../history/changelog/2026-09.md); riwayat status 30 Juli 2026 → [changelog 2026-07](../arsip/changelog-2026-07.md); indeks dossier historis → [fase-lama](../arsip/fase-lama.md); Audit Lintas Scope 29 Jul 2026 → [audit-lintas-scope-2026-07-29.md](../audit/audit-lintas-scope-2026-07-29.md).
> **Auto-Ops Engine (asal §4) dipindah ke rumah kanonik aturan operasional:** [domain/operasional.md](../domain/operasional.md) (koreksi B5, 23 Sep 2026) — teks tidak diubah; nomor bagian mengikuti asalnya.

## Pintu Masuk Docs Cepat

1. [STATUS.md](../STATUS.md) — blueprint kerja: antrean aktif, urutan eksekusi, gate verifikasi, invariant, keputusan owner ringkas.
2. [KEPUTUSAN-OWNER.md](../KEPUTUSAN-OWNER.md) — sumber kebenaran keputusan owner sebelum mengubah flow.
3. [PETA-KODE.md](../PETA-KODE.md) — peta modul ke file; pakai ini dulu sebelum grep liar ke seluruh repo.
4. [AUDIT.md](../AUDIT.md) — status audit, temuan bertanggal, dan gate Fase AO (AO-00..AO-23).
5. [ATURAN.md](../ATURAN.md) — aturan domain: keuangan, hunian, operasional, harga, publik, AI/IoT; rincian per topik di `docs/domain/`.
6. [OPERASI.md](../OPERASI.md) — runbook deploy, produksi harian, go-live, env, data master; rincian di `docs/operations/`. Baca ini dulu sebelum menyentuh server.
7. [product/scope.md](scope.md) dan [product/portal-owner-admin.md](portal-owner-admin.md) — scope per role/flow dan prinsip portal ringkas.
8. [docs/README.md](../README.md) — indeks navigasi lengkap; peta path lama (M00–M20) ke rumah kanonik ada di §6.

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
> **Ringkasan orientasi, bukan aturan kanonik.** Aturan rinci: harga & surcharge → [domain/harga.md](../domain/harga.md); uang/DP/deposit/invarian pembayaran → [domain/keuangan.md](../domain/keuangan.md); siklus huni → [domain/hunian.md](../domain/hunian.md); operasional & Auto-Ops → [domain/operasional.md](../domain/operasional.md).

- **Tidak ada model Booking.** Satu `Stay` = booking→huni→selesai. Promoted = `initialMetersPromotedAt` terisi.
- **DP** (`downPayment*`, hangus) ≠ **Deposit jaminan** (`deposit*`, refundable). Besaran DP, nominal deposit, dan larangan ubah oleh ADMIN **tidak diulang di sini** — lihat [harga.md §7](../domain/harga.md#7-uang-muka-dp--deposit); perlakuan akuntansinya di [keuangan.md](../domain/keuangan.md).
- **NO-PARTIAL menyeluruh.** Nominal bayar harus tepat (DP atau pelunasan penuh). **First-paid-wins**; batas waktu booking (flat) mengikuti [hunian.md § Dossier 11](../domain/hunian.md#dossier-11--booking--renewal-normatif).
- **Tanpa denda keterlambatan.** Notifikasi in-app → PWA push. **AI = tombol manual Owner/Admin saja** (D-23).
- **Sewa per term:** semua term diturunkan dari tarif bulanan memakai tabel multiplikator — angka **tidak diulang di sini**, lihat [harga.md §2](../domain/harga.md#2-formula-multiplikator-pricing_multipliers) (provenance owner-confirmed 2026-06-24 + `pricing.helper.ts` ikut ke kanonik).
- **Occupant surcharge (D-24):** batas penghuni per ukuran kamar dan tarif per kepala ekstra **tidak diulang di sini** — lihat [harga.md §8](../domain/harga.md#8-penghuni-ekstra--surcharge-20).

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

**Akun dev & perintah seed:** kanonik di [operations/default-dev.md](../operations/default-dev.md) — daftar akun tidak diulang di sini (dedup D-04, koreksi B5, 23 Sep 2026).
