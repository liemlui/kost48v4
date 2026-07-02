# CHECKLIST 11 — Admin: Renewal + Checkout + Meter Readings

> **Baca `00_INDEX.md` dulu.** Prefiks temuan: **`C11-xx`**. **Role:** ADMIN/OWNER. **Audit-only.** DB UAT.
> Deposit settlement = titik uang paling rawan (JB-01, JB-10).

## Ruang lingkup
| Halaman | URL | File FE | Role |
|---|---|---|---|
| Renew requests (admin) | `/renew-requests` | `pages/renew-requests/RenewRequestsAdminPage.tsx` | OWNER/ADMIN |
| Meter readings | `/meter-readings` | `pages/rooms/MeterReadingsPage.tsx` | OWNER/ADMIN |
| Checkout (admin) | (via stays / endpoint) | `admin/checkout-requests` | OWNER/ADMIN |
| Loss refunds (kalah-cepat) | `/loss-refunds` | `pages/finance/LossRefundsPage.tsx` | **OWNER only** |

**Backend:** `admin/renew-requests`, `admin/checkout-requests`, `meter-readings`, `deposit-ledger`. Model: `RenewRequest`, `CheckoutRequest`, `MeterReading`, `TenantDepositLedgerEntry`.

## Langkah audit

### A. Renew requests `/renew-requests`
- [ ] 1. Login ADMIN → `/renew-requests`. Screenshot. Daftar permintaan renew (dari CHECKLIST_09) tampil dengan status?
- [ ] 2. **8-state machine:** telusuri transisi state. Approve renew → stay diperpanjang (tanggal akhir mundur), invoice sewa baru dibuat? Reject → status jadi ditolak?
- [ ] 3. **JB-01:** renew TIDAK menagih deposit baru (deposit tetap). Verifikasi invoice renew hanya sewa.
- [ ] 4. **JB-11:** renew durasi >1 bulan → cek pengakuan pendapatan (deferral 2200). Detail jurnal di CHECKLIST_13; di sini pastikan invoice & AR penuh di muka.
- [ ] 5. **JB-12:** approve renew 2× cepat → tidak dobel perpanjang / dobel invoice?
- [ ] 6. **JB-20:** setelah approve, daftar & stay ter-update tanpa reload manual?
- [ ] 7. Approve request untuk stay yang sudah checkout / tidak valid → ditolak (guard state)?

### B. Meter readings `/meter-readings`
- [ ] 8. Buka. Daftar pembacaan meter per kamar tampil? Filter periode/kamar?
- [ ] 9. Input meter baru: angka **lebih kecil** dari sebelumnya → ditolak (meter tak mundur)? (jebakan sama seperti CHECKLIST_05 langkah 14 — cek sisi admin).
- [ ] 10. Selisih kWh dihitung benar = (meter baru − meter lama)? Biaya listrik = selisih × tarif? **JB-13:** bulat. Cocokkan manual.
- [ ] 11. Meter dipakai untuk invoice — cek konsistensi angka meter di sini vs di invoice tenant (CHECKLIST_06).
- [ ] 12. **JB-04:** meter awal stay hanya dari check-in; meter bulanan terpisah. Tidak tercampur.
- [ ] 13. **JB-12:** simpan meter 2× → tidak dobel.

### C. Checkout admin + deposit settlement (JEBAKAN UANG)
- [ ] 14. Proses satu checkout request (dari CHECKLIST_09) via UI admin (di stays atau daftar checkout). Screenshot.
- [ ] 15. **Settlement deposit:** deposit dikembalikan penuh bila tidak ada kerusakan; dipotong bila ada. Nominal refund = deposit − potongan. **JB-01:** DP TIDAK termasuk (DP hangus, bukan refund).
- [ ] 16. **JB-10 (kritis):** settlement harus buat jurnal deposit = liability (DR 2000). Verifikasi di CHECKLIST_13 via trial-balance; di sini catat nominal & jenis transaksi. Refund bukan pengurang revenue.
- [ ] 17. Checkout dengan tagihan tertunda → ditolak? Setelah checkout, kamar → AVAILABLE?
- [ ] 18. **F1-8 guard:** settlement ditolak tanpa receipt journal? (baca M04). Uji bila memungkinkan.
- [ ] 19. **JB-12:** proses checkout 2× → deposit tidak refund 2×.

### D. Loss refunds `/loss-refunds` (OWNER only)
- [ ] 20. **JB-14:** login ADMIN buka `/loss-refunds` → **harus DITOLAK** (route `allowed={['OWNER']}`). Konfirmasi. (Uji sebagai OWNER di CHECKLIST_17.)
- [ ] 21. Catat: halaman ini menangani refund pesaing "kalah cepat" (JB-07). Alur akan diaudit penuh saat login OWNER.

### E. Verifikasi kode
- [ ] 22. `renew-requests.service.ts`: 8-state transitions valid, guard duplikat, deposit tidak ditagih ulang.
- [ ] 23. `checkout-requests.service.ts` + `deposit-ledger.service.ts`: settlement benar, jurnal 2000, DP dikecualikan.
- [ ] 24. `meter-readings.service.ts`: guard meter mundur + milik stay benar.

## HASIL TEMUAN
_(kosong — diisi auditor)_

## Definition of Done
- [ ] Renew approve/reject diuji: perpanjang benar, deposit tidak ditagih ulang, double-submit.
- [ ] Meter: guard mundur + hitung kWh/biaya dicocokkan manual.
- [ ] Checkout: settlement deposit (bukan DP), guard tagihan, double-submit; jenis jurnal dicatat untuk CHECKLIST_13.
- [ ] `/loss-refunds` ditolak untuk ADMIN (JB-14).
- [ ] Temuan `C11-xx`. Update Progres Global baris 11.
