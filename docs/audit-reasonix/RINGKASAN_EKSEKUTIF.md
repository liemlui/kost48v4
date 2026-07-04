# 📋 RINGKASAN EKSEKUTIF — AUDIT REASONIX CODE

> **Total: 82 temuan** (6 kritis, 15 tinggi, 35 menengah, 26 rendah)
> **Auditor:** Reasonix Code (DeepSeek V4 Pro) via sub-agent v4-flash × 5 batch
> **Tanggal:** 4 Juli 2026

---

## 🔴 6 TEMUAN KRITIS — Harus Diperbaiki Sebelum Go-Live

| # | Temuan | File | Dampak |
|---|--------|------|--------|
| **C1** | DISCOUNT line → journal TIDAK terposting (silent, Σdebit≠Σkredit) | `accounting-posting-helpers.ts:70-76` | Trial Balance rusak, AR-Revenue mismatch |
| **C2** | Overdue aging pakai gross, bukan net (abaikan partial payment) | `reports.service.ts:117` | Laporan piutang menyesatkan owner |
| **C3** | Renewal cross-term: MONTHLY→YEARLY undercharge 1/11 | `renew-requests.service.ts:267` | Sewa 12 bulan cuma dibayar 1 bulan |
| **C4** | Collection rate: akrual vs kas campur (period mismatch) | `finance.service.ts:77-86` | Rate >100% atau <0% mungkin |
| **C5** | Journal gagal diswallow tanpa retry (`journalPending=true`) | `payment-submissions.service.ts:794-806` | Invoice tanpa journal entry |
| **C6** | `dateOnly()` 4 implementasi berbeda — inconsistent period boundary | `accounting.service.ts`, `accounting-posting-helpers.ts`, `accounting-period-close.service.ts`, `accounting-readiness.service.ts` | Batas periode akuntansi tidak konsisten |

---

## 🟠 15 TEMUAN TINGGI

| # | Temuan | File |
|---|--------|------|
| **H1** | `InvoicesService.updateLine()` — cast `undefined` → hapus field di DB | `invoices.service.ts:180-184` |
| **H2** | `CreateStayDto` — `@IsNumberString` tolak JSON number asli | `stay.dto.ts:58-63` |
| **H3** | Booking sweeper vs approval race: no auto-refund | `booking-sweep.service.ts:76-100` |
| **H4** | DP forfeit: PAID invoice kecil block forfeit | `booking-sweep.service.ts:126-130` |
| **H5** | Checkout `complete()` tanpa `FOR UPDATE` — race condition | `stays.service.ts:771-803` |
| **H6** | Balance sheet: double-count current profit untuk partially-closed period | `accounting-reports.service.ts:520-525` |
| **H7** | Cashflow `cashBeginning` fragile — asumsi opening balance | `accounting-reports.service.ts:830-845` |
| **H8** | `CreatePortalTicketDto` — category tanpa validasi enum | `ticket.dto.ts:89-91` |
| **H9** | `RenewRequestsService.decideByTenant()` — "TIDAK" tanpa transaksi | `renew-requests.service.ts:218-225` |
| **H10** | `CheckoutRequestsService.approveRequest()` — TOCTOU tanpa FOR UPDATE | `checkout-requests.service.ts:106-120` |
| **H11** | Admin dashboard: revenue exclude WiFi (beda dgn owner dashboard) | `finance.service.ts:77-81` |
| **H12** | `seed-dev-via-api.js` — `ymd()` UTC vs WIB bisa salah tanggal | `seed-dev-via-api.js:26` |
| **H13** | Multiple invoice untuk stay+period sama — tidak ada unique guard | `invoices.service.ts:226-228` |
| **H14** | C19-01 & C19-02: responsive bug masih OPEN | `CHECKLIST_19:69-97` |
| **H15** | Z-19: Owner dashboard belum diverifikasi | `M10:430` |

---

## 🟡 35 TEMUAN MENENGAH (sample 15)

| # | Temuan |
|---|--------|
| **M1** | `buildLineData` tidak apply `roundRupiah` — potensi 1-Rp drift |
| **M2** | Invoice dengan 50+ line — insert satu-per-satu, tidak pakai `createMany` |
| **M3** | `addMonths` di seed pakai `setMonth()` — 31 Jan + 1 bulan = 3 Mar |
| **M4** | `staff-assignment.util.ts` — N+1 query per staf |
| **M5** | `maintenance-sweep.service.ts` — N+1 query per room |
| **M6** | `expenses.service.ts` — `where: any` bypass type safety |
| **M7** | `accounting-readiness.service.ts` — stringly-typed model delegate |
| **M8** | Penanganan error: `Error` biasa, bukan `HttpException` (5+ file) |
| **M9** | `deepseek.client.ts` — error mapping buruk (semua 500) |
| **M10** | `renew-requests.admin.controller.ts` — pagination broken, hardcode page=1 |
| **M11** | `RejectPaymentSubmissionDto` — `reviewNotes` bisa string kosong |
| **M12** | Survey summary load SEMUA rows ke memori |
| **M13** | Business health score: correlated factors double-counted |
| **M14** | Owner dashboard revenue trend: accrual + cash dicampur |
| **M15** | `SatisfactionSurveyCard` — inline style hardcode warna |
| ... | _(20 temuan lain di file detail)_ |

---

## 🟢 26 TEMUAN RENDAH (sample 10)

| # | Temuan |
|---|--------|
| **L1** | Semua controller tidak ada `@ApiOperation` (~40+ endpoint) |
| **L2** | DTO invoice, stays, room-transfer tidak ada `@ApiProperty` |
| **L3** | `formatRupiah` diduplikasi di 3+ file frontend |
| **L4** | 6+ `console.error` di production code |
| **L5** | Inline style hardcode warna (#fff, #f59e0b, #dc2626) di 7+ komponen |
| **L6** | `SkeletonLoader` pakai `key={index}` |
| **L7** | `new Date()` tanpa `isNaN` guard di 8+ file |
| **L8** | Renew enum 10 state, dokumentasi sebut "8-state" |
| **L9** | `staff-performance.service.ts` — `monthRange()` WIB offset salah |
| **L10** | `push.service.ts` — `Number(error?.statusCode)` → NaN |
| ... | _(16 temuan lain di file detail)_ |

---

## ✅ YANG SUDAH SANGAT BAIK (diverifikasi — jangan diubah)

- ✅ Pricing multiplier satu sumber (`pricing.helper.ts`)
- ✅ Deposit immutable, carry on transfer, refund guard ketat
- ✅ Trial Balance Σdebit=Σkredit enforced (kecuali bug DISCOUNT)
- ✅ Utility billing: negative guard, chronological guard, tariff from settings
- ✅ JB-14 guard role menyeluruh
- ✅ Invoice status flow D-02 no-partial enforced
- ✅ Loyalty double-guard tak-negatif + idempotent
- ✅ Stock inventory tak-negatif (double guard)
- ✅ Rent recognition PSAK 72 straight-line + remainder
- ✅ Period-close guard di posting journal
- ✅ Payment overpayment blocked (ConflictException)
- ✅ KPI scoring NaN-safe, di-clamp 0-100
- ✅ Empty state di 20+ halaman (komponen `EmptyState` reuseable)
- ✅ Fase AJ-01 s/d AJ-06 selesai

---

## REKOMENDASI URUTAN PERBAIKAN

### Prioritas 1 — Bug Uang (sebelum go-live)
1. **DISCOUNT journal posting** — 1-2 jam
2. **Overdue aging net** — 30 menit
3. **Renewal cross-term guard** — 1 jam
4. **Collection rate period mismatch** — 1 jam
5. **Journal pending retry** — 2 jam

### Prioritas 2 — Data Integrity
6. **`dateOnly()` unifikasi** — 1 jam
7. **`updateLine()` undefined guard** — 30 menit
8. **`CreatePortalTicketDto` category validation** — 15 menit
9. **Multiple invoice duplicate guard** — 1 jam
10. **Seed UTC→WIB fix** — 30 menit

### Prioritas 3 — Testing & Responsive
11. **Z-19 owner login verification** — 🧑 manusia
12. **C19-01 endpoint tenant fix** — 30 menit
13. **C19-02 CSS mobile admin** — 30 menit
14. **Checklist 11/13/17 live test** — 3 jam

### Prioritas 4 — Polish
15. N+1 queries (staff-assignment, maintenance-sweep)
16. Error handling: `Error` → `HttpException`
17. `@ApiOperation` + `@ApiProperty` di semua endpoint
18. Inline style → CSS variables
19. Duplicate `formatRupiah` → import dari `formatCurrency.ts`

---

**Baca file detail:**
- `01_FINANSIAL_PERHITUNGAN.md` — bug uang + journal
- `02_LOGIKA_BISNIS.md` — edge case flow bisnis
- `03_LAPORAN_AKUNTANSI.md` — akurasi laporan
- `04_UI_UX.md` — frontend issues
- `05_MODUL_OPERASIONAL.md` — inventory, tiket, AC, staf
- `06_MODUL_LAINNYA.md` — WiFi, loyalty, survei, notifikasi
- `07_CODE_QUALITY.md` — error handling, N+1, code smells
- `08_REPORTING_DASHBOARD.md` — KPI & dashboard accuracy
