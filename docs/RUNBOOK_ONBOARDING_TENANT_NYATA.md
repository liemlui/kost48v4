# Runbook Onboarding 13 Penghuni Nyata (Go-Live)

**Tanggal:** 8 Juli 2026 · **Keputusan owner:** tanggal masuk pakai **tahun berjalan** (bukan tahun asli mulai kos) — lihat percakapan 8 Jul 2026. Semua langkah diverifikasi terhadap kode aktual (bukan asumsi).

## 0. Prasyarat — selesaikan SEBELUM hari onboarding

- [x] **NIK Dini (kamar B) tersedia:** `3275085012800021`.
- [ ] **Kamar I perlu konfirmasi identitas:** penghuni dicatat Theo Wijaya, tetapi NIK `3571021308860003` diberikan dengan nama Agus Settiyo Budi. Jangan impor sebelum dikonfirmasi owner.
- [ ] **Annisa**: NIK sudah ada (`7310035704070001`) tapi **kamar belum jelas** di daftar owner — konfirmasi kamar mana. (Catatan: F3/F4 TIDAK ADA — blok F sudah dirombak menjadi F1+F2; pilih dari 13 kamar riil.)
- [ ] **Catat angka meteran listrik 13 kamar** hari onboarding (foto tiap meteran). Wajib saat buat Stay (`CreateStayDto.initialElectricityKwh`). Meter air isi `0` (metering air default nonaktif).
- [ ] **Foto KTP tiap tenant** siap di HP/laptop (untuk upload + verifikasi).
- [ ] **Gate KTP ON**: cek **Settings → Operasional → gate verifikasi KTP** tercentang. (Sejak fix 8 Jul: env `KTP_ACTIVATION_GATE_ENABLED=true` hanya menentukan nilai awal; setelah row settings ada, UI yang menang.)
- [ ] DB produksi fresh + seed dasar selesai (COA, periode OPEN, CashAccount) sesuai `PANDUAN_DEPLOY_CPANEL.md`.

## 1. Data siklus tagihan (tanggal masuk = siklus terakhir yang sudah lewat, bulan berjalan)

| Kamar | Nama | Tgl siklus | NIK |
|---|---|---|---|
| A | Shinta Larista | 26 | 3574036206990003 |
| B | Dini Widiastutik | 1 | 3275085012800021 |
| C | Miko Rakatama Adhi Winarto | 28 | 6471051708970006 |
| D | Ade Chandra | 24 | 3173052309720009 |
| F1 | Yufita Hieng | 26 | 6405025701970003 |
| F2 | Patrick Wilfred | 8 | 3275020504910019 |
| G | Yofi Nurkolifah | 1 | 3519122204030003 |
| H | Welly Tanoto | 10 | 3578070811730004 |
| I | Theo Wijaya | 5 | 3571021308860003 (atas nama Agus Settiyo Budi — konfirmasi) |
| J | Lovandra | 30 | 3175070312930003 |
| K | Meliana Tamara | 10 | 3578125102000002 |
| L | Destarika Hasan | 1 | 1671065812020008 |
| M | Gabriel Excelly Pranajaya | 3 | 3511115908030001 |
| ❓ | Annisa | — | 7310035704070001 |

**Aturan `checkInDate`:** tanggal siklus **terakhir yang sudah lewat**. Contoh onboarding 10 Jul 2026: kamar A (siklus 26) → `2026-06-26`; kamar B (siklus 1) → `2026-07-01`; kamar F2 (siklus 8) → `2026-07-08`. Dengan ini ritme tagihan bulanan tenant tidak berubah, dan perpanjangan pertama jatuh persis di tanggal siklus berikutnya.

## 2. Urutan per tenant (ulangi 13×) — URUTAN PENTING

1. **Buat Tenant** (menu Tenants): nama, HP, NIK 16 digit. Data demografi bisa diisi otomatis nanti dari OCR KTP.
2. **KTP penghuni lama:** tandai `LEGACY` bila identitas lama dipercaya. Tenant tetap dapat login tanpa berpura-pura bahwa fotonya sudah diperiksa melalui aplikasi.
3. **Upload + verifikasi KTP resmi:** tenant dapat upload dari **Profil Saya**, atau OWNER/ADMIN dari detail tenant.
   a. Pilih foto → OCR jalan lokal → klik **"💾 Simpan Foto KTP ke Berkas Tenant"** (tombol baru 8 Jul — tanpa ini verifikasi ditolak 409).
   b. (Opsional) "Bantu Validasi KTP" (AI) → "💾 Simpan Data KTP ke Profil" (isi gender/TTL/kota otomatis).
   c. **"✅ Verifikasi Manual"** → pilih metode → setujui. Tanpa ini, gate menolak aktivasi kamar.
4. **Buat Stay:** isi harga kontrak lama pada `agreedRentAmountRupiah`; harga terbaru tetap berada pada master kamar untuk penghuni pengganti. Catat meter awal dan deposit yang benar.
5. **Invoice pertama:** langsung catat LUNAS bila periode berjalan memang sudah dibayar sebelum onboarding.
6. **Setelah invoice awal beres:** aktifkan portal. Upload KTP tenant berikutnya masuk antrean dashboard Admin.

## 3. Catatan akuntansi (baca M04 sebelum eksekusi)

- `depositCollected=true` membuat **jurnal kas masuk deposit pada `checkInDate`** + ledger deposit HELD. Uang jaminan ini nyatanya diterima bertahun-tahun lalu — kas fisik hari ini belum tentu memuatnya. Dua opsi (keputusan owner):
  - **(disarankan)** tetap centang (deposit WAJIB tercatat supaya bisa direfund saat checkout), lalu selaraskan **opening balance kas** satu kali bersama pencatatan awal; atau
  - biarkan tidak tercatat → risiko: saat tenant checkout tidak ada deposit untuk dikembalikan di sistem. Jangan pilih ini.
- Pembayaran invoice pertama (13×) tercatat sebagai kas masuk tanggal onboarding — wajar untuk start bersih, TB harus tetap seimbang (cek `GET /api/accounting/trial-balance`).

## 4. Verifikasi akhir (hari yang sama)

- [ ] 13 stay ACTIVE ter-promote (`initialMetersPromotedAt` terisi) — dashboard okupansi cocok.
- [ ] 0 invoice OVERDUE.
- [ ] Trial Balance `isBalanced: true`; reconciliation-lite mismatch 0.
- [ ] Spot-check 1 tenant login portal: lihat kamar, tagihan LUNAS, tidak ada notif nunggak.
- [ ] Riwayat sewa lama (tahun asli masuk kos) bila ingin diarsipkan → tulis di field `notes` tenant, bukan `checkInDate`.
