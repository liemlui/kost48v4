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

> **Status:** live (Maya) + kode + log **SELESAI**. ⚠️ Menemukan **503 sistemik** yang menyatukan beberapa bug (C05-01, C08-01). Renewal/Checkout flow tak bisa diuji live (Maya tak punya stay aktif → redirect ke /portal/stay yang kena loop) → logika uang diverifikasi via kode.

### C09-01 ⛔ 503 sistemik `/tenant/bookings/my` (+ `/announcements/active`) — 🔴 HIGH ⭐ (menyatukan C05-01 & C08-01)
- **Severity:** HIGH · **Kategori:** Reliability / backend (kemungkinan drift skema UAT)
- **Bukti live:** `GET /api/tenant/bookings/my?limit=20` → **503** berulang (124 request GET+OPTIONS teramati). `/portal/bookings` **stuck "Memuat halaman…"**. Sama dengan `/announcements/active` (C08-01).
- **Dampak luas (menyatukan 3 gejala):**
  1. `/portal/bookings` broken (langsung).
  2. `/portal/announcements` broken (C08-01, endpoint 503 serupa).
  3. **`/portal/stay` loop (C05-01)** — hook `useTenantPortalStage` memanggil `/tenant/bookings/my` (`bookingsQuery`) yang 503 + `/stays/me/current` yang 404; keduanya error → `isStageLoading` tak settle → skeleton + refetch storm.
  4. `/portal/renewal` & `/portal/checkout` **redirect ke `/portal/stay`** (tenant tanpa stay) → ikut kena loop.
- **Akar masalah:** `ServiceUnavailableException` di `tenant-bookings.service.ts:59,243,885` (`findMine` line 877 memanggil `isBookingSchemaReady` line 885, atau catch `isBookingSchemaDriftError` → 503). Pesan kode: *"Fitur booking belum aktif penuh karena database belum sinkron. Jalankan sinkronisasi schema."* → **kemungkinan besar UAT DB (5433) drift** (kolom/enum yang di-select `findMine` tidak ada di DB, padahal `tsc` hijau karena cocok dgn `schema.prisma`). Endpoint publik `/public/rooms` pakai `PUBLIC_ROOM_SELECT` sempit → tak menyentuh kolom drift → tetap 200.
- **SARAN FIX:** (1) **jalankan sinkronisasi schema di UAT** (`prisma migrate deploy` / `db push` pada `kost48_v3_pro`) lalu re-test — kemungkinan besar menyembuhkan C05/C08/C09 sekaligus; (2) perbaiki ketahanan FE: jangan refetch storm saat 503, tampilkan error-state; (3) konfirmasi via **console backend live** stack `ServiceUnavailable` persisnya (log ter-rotate tak menyimpan pesannya).
- **Catatan:** bila di produksi schema sudah sinkron, gejala ini mungkin tak muncul — **verifikasi di lingkungan produksi**. Tetap HIGH karena menandakan degradasi tidak anggun (whole-page break + storm).
- **✅ UPDATE PASCA-FIX (terverifikasi 2 Jul):** owner menjalankan **`prisma migrate deploy`/`db push` + restart backend** → `/api/tenant/bookings/my` & `/api/announcements/active` sekarang **200** (sebelumnya 503). **Root cause C09-01 = schema drift UAT — TERKONFIRMASI & RESOLVED.** C08-01 (announcements) juga sembuh. **NAMUN loop `/portal/stay` (C05-01) TETAP ADA** (tab masih crash) → C05-01 adalah bug FE independen (query `/stays/me/current` 404 + `refetchOnMount`), **bukan** disebabkan 503 — harus diperbaiki terpisah di FE.

### ✅ Verifikasi (kode + live) — BENAR
- **Loyalty (`/portal/loyalty`) live OK:** render "Poin Kebaikan & Reward — 0 poin", statistik 0/0/0 (Maya belum ada poin) — **tanpa NaN** (JB-18). Tab Katalog Reward / Penukaran / Riwayat ada. Tak loop, tak 503.
- **JB-01 renewal tidak menagih deposit ulang:** invoice renewal = **rent-only** (`renew-requests.service.ts:84` `renewalRentRupiah = stay.agreedRentAmountRupiah`; DP 30% via invoice terpisah `:268`; **tak ada baris deposit**). Deposit satu kali, tetap.
- **JB-10 checkout deposit = liability:** settlement di `deposit-ledger.service.ts` pakai `INCREASE_LIABILITY`/`DECREASE_LIABILITY` (`:180,229,242-253`); refund = `depositRefundedRupiah` (deposit − potongan), **bukan** dari DP. Konsisten dengan akun liability 2000.

### Belum teruji live (butuh tenant dgn stay aktif + backend sehat)
- Alur submit renewal (8-state, JB-12) & checkout (guard tagihan tertunda, JB-12), loyalty redeem (cukup/tidak cukup/double-click) — Maya 0 poin & tanpa stay aktif, plus 503 memblokir. Uji ulang setelah C09-01 (schema sync) + pakai tenant occupied.

## Definition of Done — status
- [x] Loyalty diuji live (0-state, no NaN). Redeem: tak teruji (0 poin).
- [x] Renewal JB-01 (deposit tak ditagih ulang) + Checkout JB-10 (deposit liability) diverifikasi via kode.
- [~] Renewal/checkout flow live: terblokir (redirect ke /portal/stay loop + 503) → **temuan C09-01**.
- [x] Temuan `C09-xx` (termasuk 503 sistemik); INDEX baris 09 diupdate.

## Definition of Done
- [ ] Loyalty redeem diuji (cukup/tidak cukup/double-click).
- [ ] Renewal diuji: durasi→biaya, duplikat request, deposit TIDAK ditagih ulang (JB-01).
- [ ] Checkout diuji: guard tagihan tertunda, nominal refund = deposit (bukan DP), double-submit.
- [ ] JB-19 lintas-tenant diuji.
- [ ] Temuan `C09-xx`. Update Progres Global baris 09.
