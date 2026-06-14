# PROPOSAL SCHEMA ADDITIVE — BACKLOG FASE 4 (S-3): F4-11 s/d F4-15
**Status:** PROPOSAL (BELUM mengubah `schema.prisma`). 2026-06-15. Owner minta "lanjut semua". Semua ADDITIVE (nullable/ber-default/tabel baru) → zero-risk baris lama.
**Cara approve:** "OK semua" / approve sebagian / koreksi. Implementasi urut: simpel → kompleks.

---

## F4-12 — FAQ/Manual tenant — **TANPA SCHEMA BARU** ✅
Model `Faq` (question/answer/category/sortOrder/isActive) sudah ada. Cukup: halaman tenant **"Panduan/Aturan"** baca FAQ per kategori + kurasi konten dari `03_KEPUTUSAN_OWNER`/dossier. Bisa langsung dikerjakan.

## F4-15 — Penjadwalan cuci AC (berbasis kWh) — `model Room`
```prisma
  hasAc            Boolean   @default(false)
  acWattage        Int?      // watt AC (1/2 PK ≈ 380-450)
  acLastCleanedAt  DateTime?
  acCleanIntervalDays Int    @default(90) // ~3 bulan
```
- Estimasi jam pakai dari kWh listrik kamar ÷ (watt/1000). Sweeper: bila lewat `acCleanIntervalDays` sejak `acLastCleanedAt` (atau ambang jam) → auto tiket `AC_CLEANING`. Saat selesai → admin catat Expense (bayar tukang). Tiket reuse model `Ticket`.

## F4-13b — Reward "special request" → tugas staf — `model LoyaltyReward`
```prisma
  fulfillmentTaskCategory String?  // mis. "CLEANING_COMMON" → auto-create tiket saat FULFILLED
  fulfillmentTaskTitle    String?
```
- Saat redemption FULFILLED & reward punya `fulfillmentTaskCategory` → auto-create `Ticket` tugas staf (bersihkan kamar mandi luar/area umum/dapur umum). Tetap jurnal reward M4.

## F4-14 — Tip staf P2P (tidak dijurnal) — `model User`
```prisma
  tipGopay String?
  tipOvo   String?
  tipDana  String?
  tipBank  String?  // "BCA 123456 a.n. ..."
```
- Setelah tiket tenant selesai, UI tampilkan link/nomor tip staf assignee. **TIDAK ada jurnal/rekap** (P2P, di luar buku kos). Hanya menyimpan info pembayaran staf.

## F4-11 — Renewal/prabayar fleksibel kapan saja — `model RenewRequest` (minimal)
```prisma
  prepaidMonths Int?  // jumlah bulan prabayar (>1 → unearned via F4-1)
  isEarly       Boolean @default(false) // diajukan sebelum dekat akhir kontrak
```
- Reuse flow renewal (F2-1) + RentRecognitionSchedule (F4-1). Tenant boleh ajukan kapan saja, pilih N bulan (harga bulanan); prabayar >1 bln → deferral 2200 (mekanisme F4-1 sudah ada). Sebagian besar logika reuse.

## F4-13a — Review/masukan saat renewal → poin — `model RenewRequest` (minimal)
```prisma
  tenantReview      String?
  tenantReviewAt    DateTime?
```
- Saat tenant isi review di alur renewal → award poin (sourceType `RENEWAL_REVIEW`, idempotent per renewRequestId). Reuse LoyaltyService.

## F4-13c — Quest perbaikan sikap (peer, anonim) — **KOMPLEKS, model baru**
```prisma
enum PeerReportStatus { REPORTED ACKNOWLEDGED IMPROVED CONFIRMED DISMISSED }
model PeerBehaviorReport {
  id           Int      @id @default(autoincrement())
  reporterTenantId Int   // DIRAHASIAKAN dari reportee
  reporteeTenantId Int
  category     String
  description  String
  status       PeerReportStatus @default(REPORTED)
  confirmedAt  DateTime?
  createdAt    DateTime @default(now())
  // relations...
}
```
- Tenant A lapor B (anonim) → admin moderasi → B diberi tahu "ada keluhan" (tanpa identitas A) → B perbaiki → A konfirmasi membaik → B dapat poin. **Privasi: B tak pernah tahu A.** Paling rumit; **saya sarankan dikerjakan TERAKHIR / atau ditunda** sampai yang lain selesai.

---

## Ringkasan & urutan eksekusi yang disarankan
| Urut | Task | Schema | Kompleksitas |
|---|---|---|---|
| 1 | F4-12 FAQ/manual | — | rendah |
| 2 | F4-15 cuci AC | Room +4 | sedang |
| 3 | F4-13b reward→tugas staf | LoyaltyReward +2 | rendah |
| 4 | F4-14 tip staf | User +4 | rendah (tanpa jurnal) |
| 5 | F4-11 renewal fleksibel | RenewRequest +2 | sedang (reuse F4-1) |
| 6 | F4-13a review-renewal | RenewRequest +2 | rendah |
| 7 | F4-13c quest sikap anonim | +enum +model PeerBehaviorReport | TINGGI (sarankan terakhir/ditunda) |

> **Aksi owner:** OK semua schema S-3? Atau approve sebagian (mis. semua kecuali F4-13c)? Khusus **F4-14 tip TIDAK dijurnal** dan **F4-13c kompleks** — konfirmasi mau lanjut atau tunda.
