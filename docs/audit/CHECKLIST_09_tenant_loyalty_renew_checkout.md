# CHECKLIST 09 — Tenant: Loyalty + Booking Ulang + Renewal + Checkout

> **Baca `00_INDEX.md` dulu.** Prefiks temuan: **`C09-xx`**. **Role:** TENANT. **Audit-only.**
> Renewal & checkout menyentuh uang/deposit → hati-hati (JB-01, JB-10).

## Ruang lingkup
| Halaman | URL | File FE |
|---|---|---|
| Loyalty (poin/reward/referral) | `/portal/loyalty` | `pages/portal/MyLoyaltyPage.tsx` |
| Booking milik saya | `/portal/bookings` | `pages/portal/MyBookingsPage.tsx` |
| Booking kamar (tenant existing) | `/portal/booking/:roomId` | `pages/bookings/BookingPage.tsx` (guard `TenantBookingRouteGuard`) |
| Perpanjangan (renewal) | `/portal/renewal` | `pages/portal/RenewalPortalPage.tsx` |
| Pengajuan keluar (checkout) | `/portal/checkout` | `pages/portal/CheckoutPortalPage.tsx` |

**Backend:** `me/loyalty` (`loyalty`), `tenant/renew-requests`, `tenant/checkout-requests`, `tenant/bookings`. Model: `LoyaltyPoint`, `LoyaltyReward`, `Redemption`, `TenantReferral`, `RenewRequest`, `CheckoutRequest`, `Stay`, `TenantDepositLedgerEntry`.

## Langkah audit

### A. Loyalty `/portal/loyalty`
- [ ] 1. Buka. Screenshot. Saldo poin, daftar reward, kode referral tampil?
- [ ] 2. **Hitung poin:** total poin = Σ transaksi poin? **JB-18:** bukan NaN. Cek riwayat perolehan/penukaran konsisten (tidak minus tak wajar).
- [ ] 3. Tukar reward (redeem): poin cukup → berhasil, saldo berkurang benar? Poin **tidak cukup** → ditolak dengan pesan jelas (tidak bikin saldo minus)?
- [ ] 4. **JB-12:** klik redeem 2× cepat → tidak menukar 2× / saldo tidak dobel-potong? (race condition poin sering bug).
- [ ] 5. Referral: kode referral unik per tenant? Salin kode berfungsi? **JB-19:** tidak menampilkan data pemilik referral lain.

### B. Booking milik saya `/portal/bookings` & booking ulang
- [ ] 6. `/portal/bookings`: daftar booking/stay tenant tampil dengan status benar (JB-03)?
- [ ] 7. `/portal/booking/:roomId` (guard): coba akses dengan roomId acak → guard `TenantBookingRouteGuard` menolak bila tak berhak? Uji.
- [ ] 8. Booking kamar sebagai tenant existing: DP dihitung 30% (JB-01)? Alur mirip CHECKLIST_03 — cek konsistensi angka.

### C. Renewal `/portal/renewal` (JEBAKAN: 8-state machine)
- [ ] 9. Buka. Bila stay dekat akhir → opsi perpanjang muncul; bila masih lama → mungkin disabled (cek pesan).
- [ ] 10. Pilih durasi perpanjangan → biaya sewa dihitung benar (durasi × harga)? **JB-11:** sewa >1 bulan → cek info pengakuan pendapatan (tapi ini backend; FE cukup tampilkan total & DP bila ada).
- [ ] 11. Ajukan renew → Network `POST /api/tenant/renew-requests` 2xx? Status request muncul?
- [ ] 12. **JB-12:** ajukan 2× → tidak dobel request untuk stay sama?
- [ ] 13. **State machine:** ajukan renew saat sudah ada renew request aktif → ditolak? (mencegah duplikat state). Catat perilaku.
- [ ] 14. **JB-01:** perpanjangan TIDAK menagih deposit lagi (deposit tetap/berlaku terus). Kalau renew minta deposit baru → **C09-xx HIGH**.

### D. Checkout `/portal/checkout` (JEBAKAN: deposit settlement)
- [ ] 15. Buka. Info deposit jaminan yang akan dikembalikan tampil? Nilainya = deposit awal (JB-01, tetap)?
- [ ] 16. Ajukan keluar → syarat: tidak ada tagihan tertunda? Coba ajukan saat ada tagihan belum bayar → ditolak dengan alasan jelas?
- [ ] 17. Network `POST /api/tenant/checkout-requests` 2xx? Status pengajuan muncul?
- [ ] 18. **JB-10:** proses refund deposit adalah liability (akun 2000), bukan pengurang revenue. FE hanya menampilkan nominal; verifikasi jurnal ada di CHECKLIST_11/13. Di sini pastikan nominal refund = deposit, tidak dikurangi DP (DP hangus, bukan bagian refund).
- [ ] 19. **JB-12:** ajukan checkout 2× → tidak dobel?

### E. Keamanan
- [ ] 20. **JB-19:** semua data (loyalty, renew, checkout) milik tenant login. Coba endpoint dengan id milik tenant lain via curl → 403.

### F. Verifikasi kode
- [ ] 21. `RenewalPortalPage.tsx` + `renew-requests` service: cek perhitungan biaya & guard duplikat state (8-state machine di `renew-requests.service.ts`).
- [ ] 22. `CheckoutPortalPage.tsx` + `checkout-requests` service: cek guard tagihan tertunda + nominal deposit refund.

## HASIL TEMUAN
_(kosong — diisi auditor)_

## Definition of Done
- [ ] Loyalty redeem diuji (cukup/tidak cukup/double-click).
- [ ] Renewal diuji: durasi→biaya, duplikat request, deposit TIDAK ditagih ulang (JB-01).
- [ ] Checkout diuji: guard tagihan tertunda, nominal refund = deposit (bukan DP), double-submit.
- [ ] JB-19 lintas-tenant diuji.
- [ ] Temuan `C09-xx`. Update Progres Global baris 09.
