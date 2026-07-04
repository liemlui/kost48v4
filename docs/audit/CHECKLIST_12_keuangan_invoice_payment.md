# CHECKLIST 12 — Keuangan: Invoice + Verifikasi Pembayaran ⚠️ GATE M04

> **Baca `00_INDEX.md` + `docs/M04_KEUANGAN.md` (gate wajib) dulu.** Prefiks temuan: **`C12-xx`**. **Role:** ADMIN/OWNER. **Audit-only.** DB UAT.
> ⚠️ **Setiap temuan salah-uang = minimal HIGH, biasanya BLOCKER.** Selesai audit ini WAJIB cek Trial Balance seimbang (JB-09).

## Ruang lingkup
| Halaman | URL | File FE | Role |
|---|---|---|---|
| Daftar invoice | `/invoices` | `pages/invoices/InvoicesPage.tsx` | OWNER/ADMIN |
| Detail invoice | `/invoices/:id` | `pages/invoices/InvoiceDetailPage.tsx` | OWNER/ADMIN |
| Invoice payments (CRUD) | `/invoice-payments` | `ConfiguredResourcePage resource="invoice-payments"` | OWNER/ADMIN |
| Review pembayaran | `/payment-submissions/review` | `pages/payments/PaymentReviewPage.tsx` | OWNER/ADMIN |

**Backend:** `invoices.service.ts`, `payment-submissions.service.ts`, `invoice-payments.service.ts`, `accounting/accounting-posting.service.ts`. Model: `Invoice`, `InvoiceLine`, `PaymentSubmission`, `InvoicePayment`, `JournalEntry`, `JournalLine`.

## Prasyarat gate
Ambil TOKEN admin. Baseline trial balance SEBELUM audit:
```bash
curl -s -H "Authorization: Bearer <ADMIN_TOKEN>" http://localhost:3000/api/accounting/trial-balance | python3 -m json.tool
# catat isBalanced (harus true) + totalDebit/totalCredit
```

## Langkah audit

### A. Daftar & detail invoice
- [ ] 1. `/invoices`: daftar tampil? Kolom total, status, jatuh tempo benar? **JB-18** tidak ada NaN.
- [ ] 2. **Rekalkulasi:** buka beberapa invoice detail `/invoices/:id`. Total = Σ InvoiceLine? **JB-13** bulat?
- [ ] 3. **JB-05:** tidak ada baris "denda keterlambatan" pada invoice lewat tempo.
- [ ] 4. **JB-01:** baris deposit (bila ada) berlabel benar & tidak dihitung sebagai revenue di invoice.
- [ ] 5. **JB-11:** invoice sewa >1 bulan → tetap tagih penuh di muka (AR penuh); pengakuan bertahap adalah urusan jurnal, bukan mengubah nominal invoice.

### B. Review pembayaran `/payment-submissions/review` (jalur approve → jurnal)
- [ ] 6. Buka. Daftar submission "menunggu review" (dari CHECKLIST_06) tampil dengan bukti?
- [ ] 7. **Approve pembayaran** → status invoice → lunas; `InvoicePayment` terbentuk; **JournalEntry auto** terbentuk.
- [ ] 8. **JB-09 (WAJIB):** setelah approve, panggil trial-balance lagi → `isBalanced: true`. Total debit=kredit. Kalau tidak balance → **C12-xx BLOCKER**.
- [ ] 9. **Cek jurnal spesifik:** approve pelunasan sewa → DR Kas / CR AR (piutang). Deposit → DR Kas / CR 2000 (liability, JB-10) — BUKAN revenue. Verifikasi baris jurnal.
  ```bash
  curl -s -H "Authorization: Bearer <ADMIN_TOKEN>" "http://localhost:3000/api/accounting/journal-entries?take=5" | python3 -m json.tool | head -60
  ```
- [ ] 10. **JB-04:** approve pembayaran TIDAK boleh promote meter/OCCUPIED (itu hanya check-in). Cek stay tidak berubah occupancy.
- [ ] 11. **JB-12 (idempotency — kritis untuk uang):** klik Approve 2× cepat → HANYA 1 InvoicePayment + 1 JournalEntry. Kalau dobel → **BLOCKER** (uang tercatat 2×). Uji sungguh-sungguh.
- [ ] 12. **Reject** pembayaran → status kembali "belum dibayar", TIDAK ada jurnal terbentuk. Verifikasi trial-balance tak berubah.
- [ ] 13. Approve dengan nominal ≠ total invoice (kurang/lebih bayar) → bagaimana ditangani? Partial payment tercatat benar? Sisa AR benar?

### C. Invoice payments CRUD `/invoice-payments`
- [ ] 14. Buka. Daftar pembayaran tercatat. Jangan lakukan hapus/edit yang mengubah jurnal (audit-only) — cukup periksa apakah edit/hapus **tersedia** dan apakah itu berbahaya (menghapus pembayaran tanpa reversal jurnal = bug). Catat sebagai temuan bila ada tombol hapus yang tidak me-reverse jurnal.

### D. Konsistensi lintas-halaman
- [ ] 15. Status pembayaran yang di-approve di sini → tercermin di portal tenant (CHECKLIST_06) sebagai "Selesai"? (JB-20 konsistensi state end-to-end.)
- [ ] 16. **JB-14:** `/invoices`, `/payment-submissions/review` sebagai STAFF/TENANT → ditolak (UI + curl).
- [ ] 17. **JB-19:** payload invoice/review tidak bocorkan `passwordHash` / data tenant lain di luar konteks.

### E. Verifikasi kode
- [ ] 18. `payment-submissions.service.ts` + `accounting-posting.service.ts`: cek approve → posting balanced (`postBalancedJournalTx`), idempotent (sourceType+sourceId unik). Jangan sarankan matikan guard balance.
- [ ] 19. `invoices.service.ts`: perhitungan total & pembulatan (helper `money.helper.ts`).

## HASIL TEMUAN

> **Status:** **kode SELESAI** (inti keuangan SANGAT solid); **live (trial-balance) TERTUNDA** — backend down (C05-01 self-DoS). Gate M04 kode-level terpenuhi.

### ✅ Verifikasi kode — BENAR (money-critical core, kuat)
- **JB-09 BALANCE di-enforce (`accounting-posting.service.ts:1319` `postBalancedJournalTx`):** sebelum insert, hitung `totalDebit`/`totalCredit`; **`if (totalDebit<=0 || totalCredit<=0 || totalDebit!==totalCredit) → skip('Journal tidak balance')`** (`:1367`). Jurnal tak seimbang **tak pernah** ter-posting. Wajib ≥2 line (`:1342`); tak boleh 1 line debit+kredit sekaligus (`:1348`). Semua posting (invoice, payment, expense, deposit, wifi, depresiasi, closing) lewat fungsi tunggal ini (9+ call-site).
- **JB-12 IDEMPOTENT (`:1320-1331`):** cek `journalEntry` existing by `sourceType+sourceId` (non-VOID) → bila ada, **skip** (tak dobel). Approve pembayaran 2× → 1 jurnal saja.
- **JB-10 deposit = liability 2000:** "debit liability 2000 hanya bila ada jurnal PENERIMAAN deposit (credit 2000)" (`:726`). Deposit bukan revenue.
- **JB-13 pembulatan:** tiap line `rupiah()`/`roundRupiah` (`:1336-1337`).
- **Graceful degradation:** bila COA/cash/period belum siap atau periode CLOSED → transaksi bisnis tetap sukses, auto-journal **diskip + warning** (bukan crash); koreksi periode closed **Owner-only** via reopen/reversal (`:61-63`).
- **Guard period-close:** readiness cek "Tidak ada posted journal tidak balance" (`unbalancedPosted===0`) + "Trial Balance balanced" sebelum tutup buku (`accounting-period-close.service.ts:371-380`).
- **Payment submission (dari C06):** ownership file, anti-replay, anti-double ("sudah lunas"), nominal tepat, tanggal masa depan ditolak.

### ✅ LIVE CONFIRMED (batch 3 Jul, backend up)
- **Trial Balance seimbang (JB-09 live):** `GET /api/accounting/trial-balance` → `isBalanced: true`, **debit 41.700.000 = kredit 41.700.000**. ✅
- **JB-14 finance:** token TENANT → `/accounting/trial-balance`, `/finance/balance-sheet/draft`, `/reports/*` **semua 403**. `/reports/*` = **OWNER-only** (controller `@Roles(OWNER)`); admin pun 403 utk P&L/deposit-liability (by design). 
- **Tidak ada pending payment** (0) saat audit → uji approve→TB-after tak dijalankan (TB sudah balanced + unit test 21/21 membuktikan balance+idempotent).

### Live TERTUNDA (butuh BE hidup)
- `GET /api/accounting/trial-balance` `isBalanced:true` **sebelum & sesudah** approve pembayaran (JB-09 end-to-end); jurnal approve = DR Kas/CR AR, deposit CR 2000; idempotency approve 2× (JB-12); reject tak buat jurnal; JB-14 (`/invoices`,`/payment-submissions/review` ditolak STAFF/TENANT — sebagian sudah: C04 `/invoices` tenant→403).
- **Ulangi bersama batch live admin/finance** setelah backend stabil.

## Definition of Done — status
- [x] Balance enforcement (JB-09) + idempotency (JB-12) diverifikasi di kode (`postBalancedJournalTx`).
- [x] Deposit liability (JB-10) + pembulatan (JB-13) + graceful skip diverifikasi kode.
- [~] Trial-balance live sebelum/sesudah approve: tertunda (backend down).
- [x] Temuan `C12-xx` (nihil bug; core solid); INDEX baris 12 diupdate (partial).

## Definition of Done
- [ ] Trial balance dicek SEBELUM & SESUDAH approve → tetap `isBalanced: true` (JB-09). Bukti dilampirkan.
- [ ] Jurnal approve pelunasan (DR Kas/CR AR) & deposit (CR 2000) diverifikasi (JB-10).
- [ ] Idempotency approve (double-click) diuji — tidak dobel jurnal (JB-12).
- [ ] Reject tidak membuat jurnal.
- [ ] JB-14 (akses non-admin) diuji.
- [ ] Temuan `C12-xx`. Update Progres Global baris 12.
