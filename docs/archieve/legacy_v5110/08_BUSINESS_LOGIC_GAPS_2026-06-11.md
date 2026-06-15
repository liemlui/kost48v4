# KOST48 V5 — Gap Logika Bisnis & Arahan Owner

**Versi:** 2026-06-11  
**Sumber:** Arahan langsung owner (Liem Lui) — menjawab audit temuan #10, #11, #13, #17 + memperkenalkan model DP 30%.

<!-- KOST48_DOCS_SYNC_20260611_BUSINESS_LOGIC_GAPS -->

---

## 1. Prinsip Bisnis yang Ditetapkan Owner

### 1.1 Tidak Boleh Ada Tunggakan Sewa (No Rent Gap)

- Tenant mendapat notifikasi H-10, H-7, H-3, H-1, H-day sebelum kontrak habis (`plannedCheckOutDate`).
- **Pada H-day pk 13:00, tenant wajib checkout secara fisik.**
- **Pada H-day pk 12:00, status kamar dibuka ke public.** Public sudah bisa melihat dan membooking kamar tersebut.
- Jika tenant belum checkout saat H-day lewat, dia **tidak bisa perpanjang otomatis** — harus **check-in ulang** (rebooking).
- Room release otomatis pk 12:00 H-day. Jika ada tenant baru yang booking+DP/lunas, tenant lama wajib keluar 3 jam setelah booking baru disetujui.

**Dampak pada audit #10:**
Renewal telat (melewati `plannedCheckOutDate`) **ditolak**. Tidak perlu hitung gap sewa karena secara bisnis tidak boleh ada.

```
Implementasi: stays.service.ts:945-956
- Cek: if (today >= plannedCheckOut) → tolak transaksi renewal
- Admin tidak bisa perpanjang kontrak yang sudah lewat
- Tenant harus daftar ulang (create new stay)
```

### 1.2 Checkout = Keluar, Bukan Perpanjang

- Checkout request hanya boleh mempercepat (≤ `plannedCheckOutDate`), tidak boleh memperpanjang.
- Jika tenant ingin perpanjang, harus melalui flow renewal (bayar dulu), bukan checkout.

**Dampak pada audit #11:**
`checkout-requests.service.ts:173-176` — tolak bila `requestedCheckOutDate > plannedCheckOutDate` saat ini.

```
Implementasi:
- approveCheckoutRequest: if (requestedCheckOutDate > plannedCheckOutDate) → tolak
- Pesan error: "Tanggal checkout tidak boleh melebihi tanggal kontrak. 
  Untuk perpanjangan, silakan ajukan perpanjangan sewa."
```

### 1.3 Meter Bisa Dicatat Kapan Pun (Tidak Perlu Lock Edit)

- Meter reading bisa dicatat kapan pun dan bisa diedit kapan pun.
- Tagihan selalu dihitung dari **selisih checkpoint**: bandingkan angka meter checkpoint terakhir yang sudah dibayar dengan angka meter baru.
- Kalau meter salah input, cukup edit. Invoice berikutnya akan otomatis menyesuaikan karena selisih checkpoint yang dihitung.
- Saat checkout akhir, semua selisih meter dari checkpoint terakhir sampai checkout ditagih.

**Dampak pada audit #17:**
**BUKAN bug.** Edit meter historis tidak perlu diblokir. Auditor salah klasifikasi. Yang penting adalah konsistensi perhitungan selisih, bukan melarang edit.

### 1.4 DP Hangus Jika Guest Kabur / Tidak Bisa Dihubungi

- Jika guest kabur tanpa checkout → deposit dipotong/dihanguskan (forfeit).
- Jika guest tidak bisa dihubungi → deposit hilang.
- Deposit forfeit sudah ada di kode (`processDeposit` dengan status `FORFEITED`). Yang belum ada adalah trigger otomatis "guest kabur" berbasis waktu/gagal komunikasi.

---

## 2. DP 30% Model — Fitur Baru

### 2.1 Aturan DP 30%

| Aturan | Nilai |
|--------|-------|
| **Wajib DP?** | Ya, untuk semua booking mandiri (public booking, tenant rebooking) |
| **Besaran DP** | 30% dari **harga sewa periode pertama** (tidak termasuk deposit, tidak termasuk utilitas estimasi) |
| **Kapan wajib bayar DP?** | Sebelum H-day check-in. Kamar tidak diplot sampai DP dibayar |
| **H-10 meaning** | H-10 dari `plannedCheckOutDate` kontrak saat ini — notifikasi dikirim ke tenant |
| **DP mengunci** | Setelah DP dibayar → kamar diplot (status RESERVED) untuk tenant tersebut |
| **Lunas sebelum H-day** | Jika tenant melunasi sebelum H-day → masuk flow **perpanjangan sewa** (renewal) — durasi ditambah, checkout diadjust |
| **Gagal bayar** | Jika belum lunas **H+1** (satu hari setelah `plannedCheckOutDate`) → dianggap gagal kontrak, DP tidak dikembalikan, kamar dilepas, tenant harus rebooking |

### 2.2 Alur DP Lengkap

```
Step 1: Tenant submit booking → status stay = ACTIVE (RESERVED), expiresAt = H-0 pk 23:59
Step 2: Tenant bayar DP 30% dari sewa periode pertama → depositPaidAmountRupiah = DP
Step 3: Room diplot (RESERVED). DP tercatat di deposit ledger.

Step 4a: Jika tenant lunas + perpanjang sebelum H-day
         → flow renewal: durasi ditambah, plannedCheckOutDate diadjust
         → Deposit total = DP + sisa pelunasan
         → Kamar tetap OCCUPIED setelah H-day

Step 4b: Jika tenant tidak lunas dan tidak checkout H-day pk 13:00
         → Auto-ops H+1: status CANCELLED
         → DP forfeit (tidak dikembalikan)
         → Kamar dilepas (AVAILABLE)
         → Tenant harus rebooking untuk masuk lagi

Step 4c: Jika tenant checkout normal (H-day pk 13:00)
         → invoice dibuat sampai H-day
         → DP dipotong untuk sisa tagihan
         → Sisa deposit dikembalikan (refund) jika ada
```

### 2.3 Gap Kode yang Perlu Dibangun

| Gap | Keterangan | Prioritas |
|-----|-----------|-----------|
| **DP 30% calculation** | Belum ada logika `depositAmountRupiah = 30% * agreedRentAmountRupiah * periodMonths` | P1 |
| **Room release pk 12:00 H-day** | Belum ada scheduler/trigger untuk set room `status = AVAILABLE` pada jam tersebut | P1 |
| **3-hour forced checkout** | Belum ada mekanisme "jika room sudah dibooking baru, tenant lama wajib keluar 3 jam" | P1 |
| **Notifikasi H-10 s.d H-day** | Notifikasi sistem sudah ada untuk pengingat pembayaran, tapi perlu diverifikasi benar terkirim untuk kontrak habis | P2 |
| **Auto-cancel H+1 gagal bayar** | Auto-ops existing hanya 3 jam untuk booking baru. H+1 untuk kontrak habis belum ada | P1 |
| **DP forfeit otomatis** | Deposit forfeit manual sudah ada, tapi forfeit otomatis saat auto-cancel H+1 belum | P1 |
| **Check-in ulang flow** | Belum ada flow "rebooking" yang reusable — harusnya tenant bisa langsung booking lagi tanpa data baru | P2 |

---

## 3. Dampak pada Audit Findings (Revisi Verdict)

| # Temuan | Verdict Audit | Verdict Setelah Arahan Owner | Alasan |
|----------|--------------|------------------------------|--------|
| #10 Gap sewa | P1 — Logika serius | **P0 — Harus diblokir** | Owner: tidak boleh ada tunggakan. Renewal setelah H-day harus ditolak. Eksisting mengizinkan. |
| #11 Checkout extend | P1 — Logika serius | **P0 — Harus diblokir** | Owner: checkout = keluar. Tolak extend. |
| #13 PaidAt CLOSED | P1 — Logika serius | **P2 — Rendah** | DP dibayar sebelum H-day → periode selalu OPEN. Risiko CLOSED minimal. |
| #17 Edit meter | P1 — Logika serius | **BUKAN BUG — downgrade** | Owner: meter bisa diedit kapan pun. Selisih checkpoint yang dihitung, bukan angka absolut. |

---

## 4. Konfirmasi Final — Gap Logika yang Tersisa

### 4.1 Gap Terjawab

| # | Gap | Terjawab? |
|---|-----|-----------|
| Bagaimana jika tenant ingin perpanjang sebelum H-day? | ✅ Ya — renewal normal, lunas + adjust `plannedCheckOutDate` |
| Bagaimana jika tenant checkout sebelum H-day? | ✅ Ya — checkout early, sisa sewa prorata, DP dipotong untuk sisa tagihan |
| Bagaimana jika DP kurang dari 30%? | ✅ Tolak booking — DP wajib ≥ 30% |
| Bagaimana jika tenant tidak checkout tapi sudah bayar full? | ✅ Dianggap perpanjangan otomatis — `plannedCheckOutDate` diadjust |
| Bagaimana jika meter salah input? | ✅ Edit diizinkan. Invoice berikutnya pakai selisih checkpoint terakhir |
| Apakah DP bisa diangsur? | ✅ Ya — bisa PARTIAL sampai full. Tapi batas H+1 tetap berlaku |

### 4.2 Gap Belum Terjawab (Perlu Keputusan Owner Lanjutan)

| # | Gap | Pertanyaan |
|---|-----|-----------|
| G1 | **3-jam forced checkout** — bagaimana memastikan tenant lama benar-benar keluar? Apakah staf akan turun tangan? | Apakah ada mekanisme fisik (staf ngecek kamar, ganti kunci) atau hanya sistem (status diubah)? |
| G2 | **Jika tenant baru batal setelah DP 30%** — DP hangus? | Apakah DP 30% bersifat non-refundable untuk semua kondisi? |
| G3 | **Rebooking setelah gagal kontrak** — apakah DP lama hangus total? | Tenant yang gagal bayar H+1: apakah DP 30% yang sudah dibayar hangus 100% atau bisa dipindah ke booking baru? |
| G4 | **Harga sewa periode pertama untuk DP** — apakah sewa 1 bulan atau sewa sesuai `pricingTerm` (mis. bulanan = 1 bulan, mingguan = 1 minggu)? | Tolong konfirmasi komponen perhitungan DP: `30% * agreedRentAmount * 1 bulan` atau `30% * agreedRentAmount * pricingTerm`? |
| G5 | **Room release pk 12:00** — apakah ini mutlak? Misal tenant lama belum keluar fisik tapi pk 12:00 sudah lewat, apakah booking baru tetap diproses? | Apakah ada grace period fisik atau pk 12:00 adalah batas keras? |

---

## 5. Ringkasan Final — Semua Temuan Terklasifikasi Ulang

| Prioritas | Temuan | Tipe | ACT |
|-----------|--------|------|-----|
| **P0** | #1 Schema drift cancelReason | Schema + migration | ACT-2 |
| **P0** | #2 Cancel skip accounting | Logika murni | ACT-1 |
| **P0** | #3 Expiry race + zombie | Logika murni | ACT-3 |
| **P0** | #4 Refund deposit fiktif | Logika murni | ACT-1 |
| **P0** | #5 DepositPortion tanpa cap | Logika murni | ACT-1 |
| **P0** | #6 catch dalam transaksi | Logika murni | ACT-1 |
| **P0** | #7 Race overpayment | Logika murni | ACT-1 |
| **P0** | #8 TOCTOU duplikat PENDING | Schema index + logika | ACT-2 |
| **P1** | #9 Jurnal PAYMENT reversal | Akuntansi | ACT-3 |
| **P0** | #10 Gap sewa — **revisi ke P0** | Logika bisnis | ACT-4 |
| **P0** | #11 Checkout extend — **revisi ke P0** | Logika bisnis | ACT-4 |
| **P1** | #12 Jurnal VOID blocking | Akuntansi | ACT-3 |
| **P2** | #13 PaidAt CLOSED — **revisi ke P2** | Akuntansi ringan | ACT-4 |
| **P1** | #14 Unique constraint nullable | Schema index | ACT-2 |
| **P1** | #15 RenewRequest tenant inkonsisten | Schema migration | ACT-2 |
| **P1** | #16 TOCTOU check-in manual | Logika murni | ACT-2 |
| **NON-BUG** | ~~#17 Edit meter historis~~ | — | **Dihapus** |
| **P2** | #18–#29 Keamanan & polish | Tersebar | ACT-5 |

---

## 6. ACT Plan Final (Setelah Arahan Owner)

| ACT | Isi | Temuan | File | Prioritas |
|-----|-----|--------|------|-----------|
| **ACT-1** | Stop-the-bleed logika | #2, #4, #5, #6, #7 | ~5 backend | Tertinggi |
| **ACT-2** | Schema, index, migration | #1, #8, #14, #15, #16 | ~5 backend + 3 migration | Tinggi |
| **ACT-3** | Konkurensi & akuntansi | #3, #9, #12 | ~5 backend | Sedang |
| **ACT-4** | Kebijakan bisnis owner | #10, #11, #13 + DP model + room release + auto-cancel H+1 | ~6 backend + scheduler | Sedang |
| **ACT-BIG** | P2 polish & keamanan | #18–#29 | ~12 backend | Rendah |

**Estimasi total:** 5 ACT session, 2-3 jam kerja (tidak termasuk UAT).

---

*Dokumen ini disusun berdasarkan verifikasi audit + arahan langsung owner. Update berikutnya setelah ACT-1 dimulai.*