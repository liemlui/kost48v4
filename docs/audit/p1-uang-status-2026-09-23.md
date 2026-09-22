# Status Temuan P1-01..P1-09 (Audit 360° Flow Uang, Jul 2026) — Verifikasi 23 Sep 2026

Jenis bukti: **verifikasi statis source** (membaca kode), **bukan** verifikasi runtime.
Baseline: HEAD `9512ad73` (setelah commit dokumentasi 23 Sep 2026). Tidak ada test/build/server/hook yang dijalankan.
Rujukan asal temuan: `docs/M04_KEUANGAN.md` §`## Audit 360° Flow Uang (Jul 2026)` dan arsip `docs/archieve/_previous_cycles/M15_AUDIT_360_FLOW_UANG.md`.

## Metode

Diperiksa pola pada jalur pemanggilan posting jurnal dan deposit ledger: apakah panggilan di-`await` di dalam transaksi bisnis, apakah dibungkus `try/catch` yang menelan error, apakah service terkait menelan error secara internal, dan transaksi (`tx`) mana yang dipakai.

## Hasil

| ID | Klaim M04 (Jul 2026) | Kondisi kode 23 Sep 2026 | Bukti | Status |
|---|---|---|---|---|
| **P1-01** | Jurnal *best-effort* (`try/catch`) di `approveSubmission` | Posting di-`await` di dalam transaksi bisnis tanpa `catch` lokal; `postBalancedJournalTx` melempar `InternalServerErrorException`; `catch` terluar **rethrow** → gagal jurnal = rollback approval | `payment-submissions.service.ts:594`, `:816-819`, `:1018-1096` (`:1095` rethrow); `accounting-posting.service.ts:1342-1386` | **Indikasi diperbaiki** (statis) |
| **P1-02** | Deposit ledger *best-effort* (`logger.warn`) | `recordDepositReceivedTx`/`recordDepositSettlementTx` di-`await` di dalam `tx`; `deposit-ledger.service.ts` **tidak memiliki satu pun** `try/catch` atau `logger.warn` | `payment-submissions.service.ts:865-879`; `stays.service.ts:1127`, `:1567`, `:1742`; `booking-sweep.service.ts:211`; `deposit-ledger.service.ts:159-198` | **Indikasi diperbaiki** (statis) |
| **P1-03** | Posting di transaksi **terpisah** dari transaksi bisnis | Posting memakai `tx` yang sama dengan tulisan bisnis (`postInvoiceIssuedTx(tx,…)`, `postInvoicePaymentTx(tx,…)`, `postDepositReceivedForStayTx(tx,…)`) | `payment-submissions.service.ts:816`, `:818`, `:880`; `accounting-posting.service.ts:1343` | **Indikasi diperbaiki** (statis) |
| **P1-04..P1-07** (MEDIUM) | Dedupe sourceId, EXPIRED→REJECTED, reversal partial, pre-check di luar tx | **Belum diperiksa** | — | UNKNOWN |
| **P1-08..P1-09** (LOW) | `paidAt` fallback, note not verified | **Belum diperiksa** | — | UNKNOWN |

## Catatan residual (temuan baru dari verifikasi ini)

1. **Jejak `journalPending`.** Nama field itu tinggal sebagai komentar warisan (`payment-submissions.service.ts:1104`) beserta metode retry jurnal (`:1100-1194`); pencarian tidak menemukan penulisan field tersebut lagi. **Belum diverifikasi** apakah endpoint retry masih terekspos dan apakah masih ada submission lama berstatus `journalPending`.
2. **Jalur senyap pada ledger deposit.** `recordDepositReceivedTx` mengembalikan `null` tanpa error bila `amount <= 0` (`deposit-ledger.service.ts:161`) atau stay tidak ditemukan (`:176`). Artinya ada jalur "deposit diterima tanpa entri ledger" yang tidak memicu kegagalan. Sempit, karena pemanggil baru saja memperbarui stay pada transaksi yang sama, tetapi polanya sejenis dengan risiko yang dilaporkan P1-02.

## Batas bukti

- Verifikasi **statis**; tidak membuktikan perilaku runtime dan tidak menggantikan test. Gate uang (`npm run test:unit` backend + M04) tetap tidak dijalankan pada task ini.
- Hanya jalur yang disebut di tabel yang diperiksa. Jalur lain (mis. reversal, sweeper lain, posting expense) **tidak** diperiksa.
- Status "indikasi diperbaiki" berlaku untuk pola yang diperiksa, **bukan** jaminan tidak ada celah lain.
- Temuan `P1-04..P1-09` tetap UNKNOWN sampai diperiksa.
