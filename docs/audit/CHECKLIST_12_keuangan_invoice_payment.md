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
_(kosong — diisi auditor)_

## Definition of Done
- [ ] Trial balance dicek SEBELUM & SESUDAH approve → tetap `isBalanced: true` (JB-09). Bukti dilampirkan.
- [ ] Jurnal approve pelunasan (DR Kas/CR AR) & deposit (CR 2000) diverifikasi (JB-10).
- [ ] Idempotency approve (double-click) diuji — tidak dobel jurnal (JB-12).
- [ ] Reject tidak membuat jurnal.
- [ ] JB-14 (akses non-admin) diuji.
- [ ] Temuan `C12-xx`. Update Progres Global baris 12.
