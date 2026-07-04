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

> **Status:** **kode SELESAI** (solid); **live TERTUNDA** (backend sempat down 2× karena loop C05-01 — hindari `/portal/stay`). Logika uang/data terverifikasi kuat.

### ✅ Verifikasi kode — BENAR (kuat)
- **Meter readings — guard lengkap (`meter-readings.service.ts`):**
  - **Tidak boleh mundur:** `if (previous && readingValue.lt(previous.readingValue)) throw Conflict('Angka meter tidak boleh lebih kecil dari catatan sebelumnya')` (`:76-78`). ✅ (pakai Decimal `.lt`, presisi).
  - Negatif ditolak (`:28`); **tanggal masa depan ditolak** (`:50`, JB-17); duplikat tanggal ditolak (`:63`).
- **Checkout — guard tagihan tertunda (`checkout-requests.service.ts`):**
  - **Ada invoice belum dibayar → Conflict** "Tagihan #X belum dibayar" (`:34-43`). ✅ Tak bisa checkout dengan tunggakan.
  - **Ownership:** `throw Forbidden('Anda bukan pemilik stay ini')` (`:66`, JB-19); stay tak ada → 404 (`:58`).
- **Renew (dari C09):** invoice renewal **rent-only**, deposit **tak** ditagih ulang (JB-01); forfeit DP bila pelunasan lewat H+7 (`renew-requests.service.ts:254`).
- **Deposit settlement (dari C09):** liability `INCREASE/DECREASE_LIABILITY` (JB-10), refund = deposit−potongan (bukan DP), `deposit-ledger.service.ts:180-253`.

### ✅ LIVE CONFIRMED (`/renew-requests` owner, 3 Jul)
- **Render penuh:** "Pusat Perpanjangan" + **RULE 4 langkah**: (1) Review cek tenant & tanggal → (2) **Catat meter** (listrik & air wajib) → (3) Tagihan dibuat (**Sewa + listrik + air**) → (4) Tenant bayar ("**Belum lunas = tetap block**"). Konfirmasi flow renew + guard lunas.
- **8-state machine terlihat** sebagai filter: Keputusan Tenant · Menunggu DP · DP Aman/Pelunasan · Selesai · Ditolak · Ditolak Tenant · Prioritas Berakhir · Hangus (= 8 state, cocok kode).
- Empty-state (0 request — Dimas/B yang skenario renew sudah di-sweep bersama stay-nya). Stats 0/0/0 tanpa NaN.

### ✅ LIVE CONFIRMED (`/meter-readings` owner, 3 Jul)
- **Render "Riwayat Meter":** filter PERIODE (bulan+tahun, default Juli 2026); **STATUS PENCATATAN BULAN INI** = grid per kamar (A,B,C,D,G,H,I,J,K,L,M,F1,F2 = 13 kamar), tiap kamar "Belum dicatat" + tombol "+ Catat"; "SEMUA BACAAN — JULI 2026: **0 entri**" empty-state ramah + "Catat Meter Manual". Tanpa NaN/error. Konfirmasi UI catat-meter admin (guard mundur/negatif/future sudah kode-verified `:76-78/:28/:50`).

### Live TERTUNDA (butuh BE hidup; JANGAN buka /portal/stay)
- `/renew-requests` (approve/reject 8-state, JB-12), `/meter-readings` (input + hitung kWh×tarif cocokkan manual), checkout admin (settlement + jurnal), **`/loss-refunds`** (OWNER-only → login ADMIN harus DITOLAK, JB-14).
- **Ulangi bersama batch live admin** setelah backend stabil.

## Definition of Done — status
- [x] Meter guard (mundur/negatif/future/duplikat) diverifikasi kode.
- [x] Checkout guard (tagihan tertunda + ownership) diverifikasi kode.
- [x] Renew JB-01 + deposit JB-10 diverifikasi kode (C09).
- [~] Live admin (renew/meter/checkout/loss-refunds): tertunda — backend down (C05-01 self-DoS).
- [x] Temuan `C11-xx`; INDEX baris 11 diupdate (partial).

## Definition of Done
- [ ] Renew approve/reject diuji: perpanjang benar, deposit tidak ditagih ulang, double-submit.
- [ ] Meter: guard mundur + hitung kWh/biaya dicocokkan manual.
- [ ] Checkout: settlement deposit (bukan DP), guard tagihan, double-submit; jenis jurnal dicatat untuk CHECKLIST_13.
- [ ] `/loss-refunds` ditolak untuk ADMIN (JB-14).
- [ ] Temuan `C11-xx`. Update Progres Global baris 11.
