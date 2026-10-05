# M15 — Audit 360° Flow Uang (Ringkasan)

> **Audit:** 6 Jul 2026 | **Fase P1** — Payment + Accounting | Detail → `docs/archieve/M15_AUDIT_360_FLOW_UANG.md`

## Status: 🟢 90% SEHAT — 3 HIGH, 4 MEDIUM, 2 LOW, 8 positif

Flow uang dalam kondisi **sangat kuat**. Semua invarian (no-partial, deposit=liability, jurnal idempotent) terimplementasi. `FOR UPDATE` di semua titik rawan race.

## Temuan HIGH (3)

| ID | Temuan | Dampak | Rekomendasi |
|----|--------|--------|-------------|
| **P1-01** | Journal posting **best-effort** (try/catch) di `approveSubmission` | Payment approve tp jurnal gagal → TB tidak balance | Jadikan **blocking** — throw rollback |
| **P1-02** | Deposit ledger **best-effort** (logger.warn) | Deposit diterima tp tak tercatat → reconciliation mismatch | Jadikan **blocking** |
| **P1-03** | Accounting posting di tx **terpisah** dari business tx | Business tx commit tp posting gagal → window inconsistency | Unify tx / advisory lock |

## Temuan MEDIUM (4)

| ID | Temuan | Status |
|----|--------|--------|
| P1-04 | Deposit ledger sourceId dedupe risk (fallback stayId) | ⏳ Open |
| P1-05 | PENDING_REVIEW di-set EXPIRED, bukan REJECTED | ⏳ Open |
| P1-06 | Reversal gagal di tengah competing cancel | ⏳ Open |
| P1-07 | Invoice cancel — pre-check di luar tx | ⏳ Open |

## Temuan LOW (2)
- P1-08: `paidAt` fallback `new Date()` di syncInvoiceStatus
- P1-09: `buildApprovalPaymentNote` not verified

## 8 Invarian Keuangan

| # | Invarian | Status |
|---|----------|--------|
| 1 | Σ debit = Σ kredit | ✅ DB-enforced |
| 2 | Idempotent per (sourceType, sourceId) | ✅ unique constraint |
| 3 | Deposit = LIABILITY (2000), tidak pernah debit | ⚠️  (P1-02) |
| 4 | Kas = prefix 10, bukan 11 | ✅ F1-3 fix |
| 5 | No-partial menyeluruh | ✅ |
| 6 | Trial Balance seimbang | ⚠️  (P1-01) |
| 7 | Deposit mismatch = 0 | ⚠️  (P1-02) |
| 8 | Revenue ≠ DRAFT | ✅ F1-7 |

**P0 sebelum go-live:** P1-01 + P1-02 (blocking journal & deposit ledger).
