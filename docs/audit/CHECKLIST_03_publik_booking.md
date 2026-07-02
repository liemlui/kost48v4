# CHECKLIST 03 — Publik: Booking Tamu (DP 30% + KTP + Expiry 3 jam)

> **Baca `00_INDEX.md` dulu.** Prefiks temuan: **`C03-xx`**. **Role:** PUBLIC (incognito). **Audit-only — jangan sampai mengotori DB produksi; gunakan DB UAT 5433.**
> ⚠️ **Flow paling rawan uang & race condition.** Kerjakan pelan-pelan.

## Ruang lingkup
| Halaman | URL | File FE |
|---|---|---|
| Booking tamu (shell) | `/booking/:roomId` | `pages/bookings/GuestBookingPage.tsx` |
| Form booking | (di dalam) | `pages/bookings/GuestBookingForm.tsx` |
| Ringkasan kamar | (di dalam) | `pages/bookings/GuestBookingRoomSummary.tsx` |
| Sukses booking | (setelah submit) | `pages/bookings/GuestBookingSuccess.tsx` |
| Helper harga/validasi | — | `pages/bookings/guestBookingUtils.ts` |

**Backend:** `public/bookings` (`POST /api/public/bookings`) → `public-bookings.service.ts`, `pricing.helper.ts`. Expiry 3 jam: `auto-ops.service.ts` (BookingSweep). Model utama: **`Stay`** (JB-02: tidak ada model Booking).

## Konsep yang WAJIB dipahami (kalau salah, semua audit salah)
- **JB-01:** DP = 30% dari sewa, **hangus** bila batal. Deposit jaminan = terpisah, refundable, tetap.
- **JB-06:** booking belum bayar → hangus otomatis 3 jam.
- **JB-03:** setelah booking dibuat tapi belum bayar, kamar tetap **AVAILABLE** (bukan langsung dikunci).
- **JB-07:** dua orang boleh booking kamar sama; yang pertama bayar & di-approve menang, pesaing dibatalkan.

## Langkah audit

### A. Buka form
- [ ] 1. Dari `/rooms` pilih kamar AVAILABLE → klik Booking → mendarat di `/booking/:roomId`. Screenshot.
- [ ] 2. Ringkasan kamar (kanan/atas) tampil: nama kamar, harga sewa, **DP 30%**, deposit, total yang harus ditransfer. Cek angkanya.
- [ ] 3. **JB-01 + hitung manual:** DP harus = `round(hargaSewa × 0.30)`. Hitung sendiri, cocokkan dengan yang tampil. **Selisih = C03-xx HIGH (salah uang).**
- [ ] 4. **JB-13:** DP bulat (tanpa desimal). Kalau sewa mis. 1.333.333 → DP = 400.000 (dibulatkan), bukan 399.999,9.
- [ ] 5. Deposit = `Room.defaultDepositRupiah`, ditampilkan terpisah dari DP, disebut refundable/jaminan.

### B. Validasi form (uji jalur GAGAL dulu — di sinilah bug sembunyi)
- [ ] 6. Submit form **kosong** → harus muncul pesan error per field, BUKAN diam / crash / kirim tetap. (Bandingkan temuan Hermes I3 di auth — pola sama sering terulang.)
- [ ] 7. Isi nama dengan angka/simbol saja; email format salah (`abc`); No. HP huruf → validasi menolak?
- [ ] 8. **KTP:** upload file bukan gambar (mis. .txt/.exe) → ditolak? Upload gambar sangat besar (>10MB) → ditangani (bukan hang)? Field KTP wajib?
- [ ] 9. Tanggal masuk: pilih tanggal **masa lalu** → ditolak? Tanggal sangat jauh (tahun 2099) → ditangani?
- [ ] 10. **XSS:** isi nama = `<script>alert(1)</script>` → saat tampil di ringkasan/sukses, harus ter-escape (tampil sebagai teks), bukan tereksekusi.

### C. Jalur sukses + verifikasi data
- [ ] 11. Isi semua valid → submit. Network: `POST /api/public/bookings` status 2xx? Respons berisi id stay + instruksi transfer?
- [ ] 12. Halaman sukses (`GuestBookingSuccess`) tampil: nomor booking, nominal DP, rekening tujuan, **batas waktu 3 jam**? Ada countdown?
- [ ] 13. **Verifikasi DB (UAT):** cek `Stay` baru terbentuk. Status awal & kamar tetap AVAILABLE (JB-03). Field `downPayment*` terisi, `deposit*` sesuai. `initialMetersPromotedAt` HARUS null (JB-04 — belum check-in).
  ```bash
  # contoh cek via API admin (login admin dulu, ambil token):
  curl -s -H "Authorization: Bearer <ADMIN_TOKEN>" "http://localhost:3000/api/admin/bookings?take=5" | head -c 1500
  ```
- [ ] 14. **JB-18:** di halaman sukses tidak ada "Rp NaN"/"undefined".

### D. Jebakan expiry & race (uji khusus)
- [ ] 15. **JB-06 (expiry 3 jam):** cari logika expiry. Karena menunggu 3 jam tak praktis, verifikasi lewat KODE: baca `auto-ops.service.ts` cari BookingSweep — batas 3 jam benar? Yang di-expire hanya yang belum bayar? DP di-hangus-kan (bukan direfund)? Catat bila logika mencurigakan.
- [ ] 16. **JB-12 (idempotency / double submit):** klik tombol "Kirim Booking" 2× sangat cepat (atau submit lalu back lalu submit lagi) → apakah terbentuk 2 Stay ganda untuk 1 orang? Itu bug.
- [ ] 17. **JB-07 (pesaing):** buat 2 booking incognito berbeda untuk **kamar yang sama** → keduanya boleh terbentuk (kamar belum terkunci). Catat: apakah sistem memberi tahu kamar sedang diperebutkan? (Verifikasi resolusi menang/kalah ada di CHECKLIST_10 sisi admin.)

### E. Verifikasi kode
- [ ] 18. `guestBookingUtils.ts` + `pricing.helper.ts`: cek rumus DP 30% & pembulatan (JB-13). Cocok antara FE & BE? (FE hitung untuk tampilan, BE hitung untuk simpan — kalau beda rumus → bisa beda angka = bug).
- [ ] 19. `public-bookings.service.ts`: cek validasi server-side (jangan hanya andalkan validasi FE). Cek guard: apakah bisa booking kamar yang sudah OCCUPIED lewat API langsung (bypass UI)?
  ```bash
  curl -s -X POST http://localhost:3000/api/public/bookings -H "Content-Type: application/json" -d '{"roomId":<id_kamar_occupied>, ...}' 
  ```
- [ ] 20. **JB-19:** respons `POST /api/public/bookings` tidak mengembalikan data internal/tenant lain.

## HASIL TEMUAN

> **Status:** kode + API + live **SELESAI** (2 Jul 2026, Fable). **Flow paling solid sejauh ini** — tidak ada temuan HIGH/MEDIUM. Final submit "Ajukan Booking" **sengaja TIDAK ditekan** (hindari tulis data + aturan izin form); jalur create diverifikasi lewat kode + review step (langkah 1–3 tanpa write).

### ✅ Verifikasi kuat (kode + live) — bagian yang BENAR
- **JB-01 DP & deposit BENAR (live, Kamar G 850rb):** review step menampilkan **DP 30% = Rp 255.000** (=850.000×0,3 tepat), Sisa Rp 595.000, Deposit jaminan Rp 300.000 (refundable), Total Rp 1.150.000. Rumus FE = backend: `dpAmount=Math.round(totalRent*0.3)` (`GuestBookingForm.tsx:145`) vs `roundRupiah(agreedRent*30/100)` (`public-bookings.service.ts:333`). `totalRent`=`baseRent`+`occupantSurcharge`, `baseRent=calculateRentByPricingTerm(...)` **helper yang sama** dipakai FE & BE → konsisten.
- **JB-03 kamar tetap AVAILABLE** setelah booking: `public-bookings.service.ts:340` "Room status left as-is … Tidak ada UPDATE Room." (verifikasi kode.)
- **JB-04 meter tak dipromosikan** saat booking; sweep skip stay yang sudah `initialMetersPromotedAt` (`booking-sweep.service.ts:89`).
- **JB-06 expiry 3 jam:** `BOOKING_REVIEW_DEADLINE_HOURS = env ?? 3` (`auto-ops.constants.ts:2`); sweep membatalkan stay belum-bayar & **DP hangus dijurnal** (`booking-sweep.service.ts:142-173`, `postDownPaymentForfeitTx`).
- **JB-07 first-paid-wins:** guard kamar OCCUPIED/RESERVED (`:211-216`), guard stay aktif (`:219-231`), guard tenant sudah punya booking aktif (`:234-253`); UI menjelaskan "first-paid-wins" + "kedaluwarsa 3 jam" (review step).
- **JB-12 double-submit:** tombol `disabled={isSubmitting}` (`GuestBookingForm.tsx:597`) + guard duplikat tenant di backend.
- **Validasi:** NIK tepat 16 digit (`guestBookingUtils.ts:120`), phone/email minimal satu, **honeypot `website`** (server tolak `:144`), **tanggal lampau ditolak server** (`:160`), occupant hard-cap (`:315`). Live: submit kosong → error inline, form tak lanjut.
- **XSS aman (live):** nama diisi `Audit <b>XSS</b> Test` → di review tampil sebagai teks literal (React escape), bukan HTML ter-render.
- **Privasi KTP:** OCR "Foto diproses di perangkat, tidak diunggah" (on-device). Anti-fraud: "Jangan transfer sebelum tagihan resmi muncul di portal."
- **Console 0 error**, langkah 1→4 lancar, tanggal checkout math benar (2 Jul + 1 bln = 2 Agustus 2026).

### C03-01 Default `checkInDate` pakai UTC (off-by-one dini hari WIB) — 🟢 LOW
- **Severity:** LOW · **Kategori:** Fungsional / timezone (JB-17)
- **Yang terjadi:** `INITIAL_FORM.checkInDate = new Date().toISOString().slice(0,10)` (`guestBookingUtils.ts:25`) memakai tanggal **UTC**, dan `min` input juga (`GuestBookingForm.tsx:300`). Pada 00:00–07:00 WIB, UTC masih "kemarin" → default = tanggal lampau → server menolak "Tanggal check-in tidak boleh di masa lalu" (`public-bookings.service.ts:160`) bila user tak mengubahnya. Tidak konsisten dengan landing yang pakai `getTodayDateInput()` (tz-adjusted, `publicGuestShared.tsx:194`).
- **SARAN FIX:** pakai helper tanggal lokal (offset WIB) untuk default & `min`.

### C03-02 Pesan batas penghuni tidak konsisten (2 free vs FAQ "maks 2" vs guide "1") — 🟢 LOW
- **Severity:** LOW · **Kategori:** Konsistensi konten (verifikasi M02 D-24)
- **Yang terjadi:** sistem: STANDARD **2 gratis / maks 4** (+20%/ekstra), form booking menampilkannya benar ("Kamar standar: 2 orang gratis, maks 4"). Tapi FAQ landing berbunyi "**Maksimal 2 orang per kamar**" (`publicGuestShared.tsx:136`). Copy publik bertentangan dengan sistem (kode mengacu "Keputusan owner D-24", `pricing.helper.ts:59`).
- **SARAN FIX:** samakan FAQ dengan D-24 (2 gratis, maks 4).

### C03-03 "Air Rp 0 / m³" tampil saat tarif air = 0 — 🟢 LOW
- **Severity:** LOW · **Kategori:** UI/kejelasan (JB-18)
- **Yang terjadi:** kamar dengan `waterTariffPerM3Rupiah=0` (mis. Kamar G) menampilkan "Listrik Rp 2.500 / kWh · **Air Rp 0 / m³**" (`publicRoomDisplay.ts:120`, template literal, bukan `CurrencyDisplay`). "Rp 0" janggal.
- **SARAN FIX:** sembunyikan bila 0 atau tulis "Air termasuk".

### C03-04 DP preview di halaman DETAIL (bukan form) memakai raw monthly — 🟢 INFO
- **Severity:** INFO · **Kategori:** Konsistensi (lihat C02-05)
- **Yang terjadi:** DP di halaman **detail** = `Math.round(monthly*0.3)` (raw monthly, tanpa term/surcharge). DP di **form booking** akurat (term+surcharge, = backend). Hanya preview detail yang bisa berbeda untuk term non-bulanan / occupant ekstra. Booking form = sumber kebenaran & sudah benar.

### Diteruskan
- **Verifikasi create end-to-end (JB-03/JB-04 live)** belum dieksekusi (tak menekan submit demi hindari tulis Tenant/User/Stay + aturan izin). Bila diinginkan, bisa dilakukan 1 booking uji terkontrol di UAT lalu cek room tetap AVAILABLE & `initialMetersPromotedAt=null` via API.
- **Responsive & build**: ditunda ke C19 / mesin user.

## Definition of Done — status
- [x] DP 30% dihitung manual & dicocokkan live (255rb) — JB-01/JB-13.
- [x] Form diuji jalur gagal (kosong) + XSS (escaped). NIK 16-digit, honeypot, past-date (server) diverifikasi kode.
- [x] JB-03/JB-04/JB-06/JB-07/JB-12 diverifikasi via kode + UI messaging.
- [ ] Submit nyata + verifikasi Stay di DB (ditunda — butuh izin tulis).
- [x] Temuan `C03-xx` dicatat; INDEX baris 03 diupdate.

## Definition of Done
- [ ] DP 30% dihitung manual & dicocokkan (JB-01/JB-13).
- [ ] Form diuji jalur gagal (kosong, format salah, file salah, tanggal lampau, XSS).
- [ ] Booking sukses diverifikasi di DB: Stay terbentuk, kamar tetap AVAILABLE, meter belum promote (JB-03/JB-04).
- [ ] Double-submit (JB-12) & pesaing (JB-07) diuji. Expiry 3 jam (JB-06) diverifikasi via kode.
- [ ] Endpoint diuji bypass UI (booking kamar occupied via curl).
- [ ] Temuan `C03-xx`. Update Progres Global baris 03.
