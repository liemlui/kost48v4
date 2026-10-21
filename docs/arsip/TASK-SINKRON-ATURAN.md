> **ARSIP BEKU** · dipindah dari `docs/kerja/` ke `docs/arsip/` pada 2026-10-21 (DOCS-GEN2 D4d addendum). Isi dipindah ke `TASK-AKTIF.md`; **jangan dibaca rutin**.

# TASK-SINKRON-ATURAN — temuan teks vs kode, dan titik lemah status

> **Blok baca** · Jenis: **dokumen kerja tugas (kontrak kerja, bukan antrean)** · Status: **aktif — daftar temuan; perbaikan belum dikerjakan** · Untuk siapa: agen yang memperbaiki ketidaksesuaian aturan, dan owner yang memutuskan bagian uang
> · Baca kalau: mengerjakan `SINKRON-UANG`/`SINKRON-TEKS`, atau butuh daftar resmi ketidaksesuaian aturan. · **Jangan** dibaca kalau: memilih tugas (itu [ANTREAN](../ANTREAN.md)) atau mencari aturan kanonik (itu [harga.md](../domain/keuangan.md#d4c-harga)).

Bentuk 7 bagian mengikuti konvensi [ANTREAN §3](../ANTREAN.md) butir A-2. Status pekerjaan tetap di [ANTREAN §3](../ANTREAN.md).

## Goal & todos

**Goal.** Semua teks yang dibaca penghuni/admin (panduan, FAQ, prompt AI, komentar kode) **mengatakan hal yang sama** dengan kode dan aturan kanonik — dan bila tidak bisa, perbedaannya **tertulis sadar**, bukan tak sengaja.

| Langkah | Status | Bukti penutup |
|---|---|---|
| 1. Bekukan daftar F (tabel §2) | selesai | dokumen ini |
| 2. Perbaiki teks tanpa perilaku (F-04..F-10) | belum | 0 teks bertentangan |
| 3. Putuskan & perbaiki uang (F-01/F-02, P27) | belum | test uang + perilaku tiga kanal sama |
| 4. Tinjau status (tabel §6) | belum | keputusan per S-01..S-10 |

## 1. Tujuan & definisi selesai

1. Setiap temuan F punya **status akhir**: diperbaiki, atau **sengaja dibiarkan** dengan alasan tertulis.
2. Perbaikan teks **tidak mengubah aturan**; perbaikan uang **wajib** lewat gate uang backend.
3. Tidak ada teks yang menjanjikan perilaku yang tidak ada di kode (tamu menginap, denda merokok, refund 7 hari).
4. Setiap rekomendasi status (S) menjadi keputusan: dipertahankan (dan didokumentasikan) atau diubah (task baru).

## 2. Temuan tidak sinkron (F)

| ID | Temuan | Bukti | Dampak | Ukuran | Owner? |
|---|---|---|---|---|---|
| **F-01** | Deposit bisa di-override lewat API: `approveBooking` menulis `dto.depositAmountRupiah` (hanya cek ≥0); `stays.create` memakai `dto.depositAmountRupiah ?? room.defaultDepositRupiah` | `tenant-bookings.service.ts`, `stays.service.ts` | Deposit tidak lagi “selalu default kamar” (D-05); refund mengikuti nominal terbayar | S | **ya (P27)** |
| **F-02** | Kanal tidak paritas: booking publik menghitung **surcharge + deposit hewan**; booking portal & walk-in tidak | `public-bookings.service.ts` vs `tenant-bookings.service.ts` vs `stay.dto.ts` | Kamar/term sama bisa berharga beda antar kanal; surcharge tak tertagih | M | **ya (P27)** |
| **F-03** | Gate KTP default **OFF** (boolean), padahal dokumen menyebut “KTP wajib sebelum aktivasi”; tidak ada status KTP | `schema.prisma`, `stays.service.ts` | Kepatuhan UU PDP bergantung setting; tidak bisa melacak “menunggu verifikasi” | M | **ya (P25/P26)** |
| **F-04** | Panduan tenant: “1 kamar maksimal 2 orang” | `MyManualPage.tsx` | Bertentangan dengan D-24 (2+2 / 4+2) | XS | tidak |
| **F-05** | Panduan: renewal H-30, DP maks H-1, pelunasan H-7 | `MyManualPage.tsx` | Kode: prompt H-10, DP ≤ hari-H, pelunasan ≤ H+7 **setelah DP** | S | tidak |
| **F-06** | Panduan: tagihan listrik jatuh tempo 7 hari | `MyManualPage.tsx` | Kode: **24 jam** untuk semua invoice | XS | tidak |
| **F-07** | Panduan: “deposit bukan uang sewa, tidak bisa dipakai bayar sewa” | `MyManualPage.tsx` | Settlement **menutup semua invoice terbuka termasuk sewa** (Q5) | XS | tidak |
| **F-08** | Panduan: hewan dilarang, tamu menginap Rp50.000/malam, QRIS/e-wallet | `MyManualPage.tsx` | Kode mendukung `hasPet` + deposit hewan; tamu menginap **tidak ada**; pembayaran **bukti transfer manual** | M | tidak (kecuali arah tamu) |
| **F-09** | Prompt FAQ AI memuat aturan basi (minimal 1 bulan, DP “bulan pertama”, checkout H-7, WiFi gratis, hewan dilarang) | `faq.prompt.ts` | FAQ hasil AI bisa menerbitkan aturan palsu | S | tidak |
| **F-10** | Komentar prabayar menulis “5,5×/6; 10×/12”, kode memakai **5,7/11**; total prabayar tahunan bisa beda Rp4 dari harga term | `prepay-extension.service.ts` | Dokumen menyesatkan; selisih receh tetapi nyata | XS | tidak |
| **F-11** | Check-in tidak memblokir deposit belum lunas; yang dicek hanya invoice sewa PAID | `stays.service.ts` `create` | Deposit bisa tertagih belakangan | S | tidak (perbaiki di follow-up) |
| **F-12** | Walk-in check-in tidak punya `occupantCount`/`hasPet` di DTO meski kolomnya ada | `stay.dto.ts` | Akar keluhan owner: deposit hewan/surcharge tidak bisa otomatis | M | tidak |
| **F-13** | Akses verifikasi KTP: aturan dossier 18 menyebut **verifikasi OWNER**, controller memasang `@Roles(OWNER, ADMIN)` | `tenants.controller.ts` vs [operasional.md](../domain/hunian.md#d4c-operasional) | Wewenang verifikasi PII tidak konsisten; audit bisa mencatat ADMIN sebagai verifikator | XS | **ya — putuskan OWNER-only atau OWNER+ADMIN** |
| **F-14** | Runbook go-live/produksi masih **mewajibkan** `KTP_ACTIVATION_GATE_ENABLED=true` dan menguji “aktivasi tanpa KTP → DITOLAK”; keputusan 19 Okt 2026 menghapus blokir itu | [produksi Bagian C](../operations/produksi.md#d4b-cpanel), [produksi Bagian D](../operations/produksi.md#d4b-ktp), [produksi.md](../operations/produksi.md) | Operator berikutnya bisa menyalakan gate dan memblokir check-in sesuai kebijakan lama | S | tidak — ikut task KTP (F-14) |

## 3. Langkah prioritas

1. **F-09/F-10/F-04..F-08** — teks & komentar (tanpa perilaku), satu batch.
2. **F-01/F-02** — **P27 sudah dijawab: tegakkan di semua kanal**; gate uang backend; helper tunggal untuk tiga kanal.
3. **F-03/F-12/F-11** — masuk [TASK-HUNI-FOLLOWUP](TASK-HUNI-FOLLOWUP.md) (check-in, KTP).
4. **S-01..S-10** (§6) — tinjau, lalu hanya yang disetujui menjadi task.

## 4. Jebakan

- **Jangan “memperbaiki” teks dengan mengubah aturan.** Kalau teks dan kode berbeda, yang benar adalah kanonik — bukan yang lebih mudah ditulis.
- **F-01/F-02 menyentuh uang**: perubahan wajib lewat gate uang; jangan menyelipkan ke batch teks.
- **Deposit lama jangan di-retro**; perbaikan hanya untuk stay baru/aktivasi.
- **Prompt AI bukan tempat aturan**; setelah diperbaiki, ia harus membaca aturan dari sumber, bukan menyalin angka.

## 5. Kalau macet

| Gejala | Sebab | Tindakan |
|---|---|---|
| Teks berubah tiap batch | tidak ada sumber tunggal | pakai tabel konten di [TASK-FAQ-TENANT](TASK-FAQ-TENANT.md) |
| Test uang merah setelah patch | perilaku lama diuji | perbarui test **bersama** keputusan, bukan menghapus test |
| Owner belum menjawab P27 | menunggu | kerjakan F-04..F-10 lebih dulu |

## 6. Status & transisi: yang lemah (jawaban atas pertanyaan owner)

| ID | Kelemahan | Bukti | Risiko | Rekomendasi |
|---|---|---|---|---|
| **S-01** | `StayStatus` hanya ACTIVE/COMPLETED/CANCELLED; “sudah check-in” adalah **flag** `initialMetersPromotedAt` | `app.enums.ts`, `stays.service.ts` | Query “stay aktif” punya dua arti; pernah salah (V-03) | pertahankan + wajibkan satu helper filter; jangan menambah status tanpa kebutuhan |
| **S-02** | `CANCELLED` mencampur kedaluwarsa, gagal lunas, dan batal manual; alasannya teks bebas | `booking-sweep.service.ts` | Laporan churn vs forfeit tidak bisa dipisah | tambah `cancelReasonCode` terstruktur (additive) |
| **S-03** | Tidak ada status OVERSTAY/GRACE; overstay disimpulkan dari tanggal | `stay-sweep.service.ts` | Sweeper dan UI bisa berbeda tafsir; grace renewal H+7 tidak terlihat di stay | turunan status di API (bukan kolom) + satu definisi |
| **S-04** | `MAINTENANCE` menampung “kotor”, “rusak”, dan “diblokir”; `allowBookingWhileCleaning` membuat kamar **bisa dipesan tapi tidak bisa dihuni** | `app.enums.ts`, `room-booking.util.ts` | Salah label di katalog/operasional | pertahankan, tetapi tampilkan alasan maintenance |
| **S-05** | `RESERVED` tidak membedakan DP vs lunas | [keuangan.md](../domain/keuangan.md) | UI bisa menulis “lunas” padahal DP | sudah disengaja; jangan tambah status, cukup label dari invoice |
| **S-06** | `DepositStatus.HELD` tidak membedakan “belum dibayar” dan “ditahan”; deposit parsial legacy dibiarkan HELD | `booking-sweep.service.ts` | Settlement manual bisa buntu | tambah `depositPaidAmountRupiah` sebagai sumber (sudah), tampilkan selisih |
| **S-07** | `RenewRequest` menyimpan status lama (PENDING/APPROVED/REJECTED) bersama 10 status baru | `app.enums.ts` | Filter laporan bisa salah hitung | dokumentasikan sebagai legacy + filter kanonik |
| **S-08** | Tidak ada status REFUND_PENDING pada submission yang sudah ditransfer lalu ditolak | `payment-submissions.service.ts` | Refund bergantung ingatan admin | tambah penanda refund (kecuali loss-refund yang sudah ada) |
| **S-09** | KTP tidak punya status (hanya `ktpVerifiedAt`/`ktpDeletedAt` + boolean gate) | `schema.prisma` | Tidak bisa “menunggu verifikasi”/“ditolak” | **wajib** untuk alur baru (P25/P26) |
| **S-10** | Checkout dua langkah: persetujuan mengubah `plannedCheckOutDate`; bila final checkout tidak dilakukan, sweeper bisa memperlakukannya sebagai overstay | `checkout-requests.service.ts`, `stay-sweep.service.ts` | Tenant yang berniat keluar bisa dipaksa keluar | tambah penanda “checkout in progress” pada pemeriksaan overstay |

**Kesimpulan singkat:** yang **paling lemah** dan berdampak nyata adalah **S-03/S-09/S-10** (status tidak mampu menyatakan keadaan yang penting) dan **S-02** (alasan batal tidak terstruktur). Yang **cukup dipertahankan** adalah S-01/S-04/S-05 selama ada satu helper dan label yang jujur.

## 7. Riwayat

| Tanggal | Perubahan |
|---|---|
| 2026-10-19 | Dibuat: 14 temuan tidak sinkron (F-01..F-14) + 10 titik lemah status (S-01..S-10) dari pembacaan kode; belum ada perbaikan. F-01/F-02/F-03/F-13 menunggu keputusan; F-14 ikut task KTP. |
