# Runbook Onboarding 13 Penghuni Nyata (Go-Live)

**Tanggal:** 8 Juli 2026 · **Keputusan owner:** tanggal masuk pakai **tahun berjalan** (bukan tahun asli mulai kos) — lihat percakapan 8 Jul 2026. Semua langkah diverifikasi terhadap kode aktual (bukan asumsi).

## 0. Prasyarat — selesaikan SEBELUM hari onboarding

- [ ] **NIK Dini (kamar B) & Theo Wijaya (kamar I) belum ada** — kumpulkan dulu. Form tenant menolak tanpa NIK 16 digit (`tenant.dto.ts` — `@Matches(^\d{16}$)`).
- [ ] **Annisa**: NIK sudah ada (`7310035704070001`) tapi **kamar belum jelas** di daftar owner — konfirmasi kamar mana (F3/F4?).
- [ ] **Catat angka meteran listrik 13 kamar** hari onboarding (foto tiap meteran). Wajib saat buat Stay (`CreateStayDto.initialElectricityKwh`). Meter air isi `0` (metering air default nonaktif).
- [ ] **Foto KTP tiap tenant** siap di HP/laptop (untuk upload + verifikasi).
- [ ] **Gate KTP ON**: cek **Settings → Operasional → gate verifikasi KTP** tercentang. (Sejak fix 8 Jul: env `KTP_ACTIVATION_GATE_ENABLED=true` hanya menentukan nilai awal; setelah row settings ada, UI yang menang.)
- [ ] DB produksi fresh + seed dasar selesai (COA, periode OPEN, CashAccount) sesuai `PANDUAN_DEPLOY_CPANEL.md`.

## 1. Data siklus tagihan (tanggal masuk = siklus terakhir yang sudah lewat, bulan berjalan)

| Kamar | Nama | Tgl siklus | NIK |
|---|---|---|---|
| A | Shinta Larista | 26 | 3574036206990003 |
| B | Dini | 1 | ❓ kumpulkan |
| C | Miko Rakatama Adhi Winarto | 28 | 6471051708970006 |
| D | Ade Chandra | 24 | 3173052309720009 |
| F1 | Yufita Hieng | 26 | 6405025701970003 |
| F2 | Patrick Wilfred | 8 | 3275020504910019 |
| G | Yofi Nurkolifah | 1 | 3519122204030003 |
| H | Welly Tanoto | 10 | 3578070811730004 |
| I | Theo Wijaya | 5 | ❓ kumpulkan |
| J | Lovandra | 30 | 3175070312930003 |
| K | Meliana Tamara | 10 | 3578125102000002 |
| L | Destarika Hasan | 1 | 1671065812020008 |
| M | Gabriel Excelly Pranajaya | 3 | 3511115908030001 |
| ❓ | Annisa | — | 7310035704070001 |

**Aturan `checkInDate`:** tanggal siklus **terakhir yang sudah lewat**. Contoh onboarding 10 Jul 2026: kamar A (siklus 26) → `2026-06-26`; kamar B (siklus 1) → `2026-07-01`; kamar F2 (siklus 8) → `2026-07-08`. Dengan ini ritme tagihan bulanan tenant tidak berubah, dan perpanjangan pertama jatuh persis di tanggal siklus berikutnya.

## 2. Urutan per tenant (ulangi 13×) — URUTAN PENTING

1. **Buat Tenant** (menu Tenants): nama, HP, NIK 16 digit. Data demografi bisa diisi otomatis nanti dari OCR KTP.
2. **Upload + verifikasi KTP** (wizard Check-in → pilih tenant → kartu "Bantu Validasi KTP"):
   a. Pilih foto → OCR jalan lokal → klik **"💾 Simpan Foto KTP ke Berkas Tenant"** (tombol baru 8 Jul — tanpa ini verifikasi ditolak 409).
   b. (Opsional) "Bantu Validasi KTP" (AI) → "💾 Simpan Data KTP ke Profil" (isi gender/TTL/kota otomatis).
   c. **"✅ Verifikasi Manual"** → pilih metode → setujui. Tanpa ini, gate menolak aktivasi kamar.
3. **Buat Stay (walk-in, wizard Check-in)**: kamar, `checkInDate` sesuai aturan §1, term MONTHLY, harga sewa aktual, **meter awal listrik = angka hari ini**, air = 0. Centang **deposit diterima tunai** bila uang jaminan tenant itu memang kamu pegang (lihat §3).
4. **Invoice pertama otomatis ISSUED, jatuh tempo 24 JAM** sejak dibuat (aturan no-debt, `calculateDueDate` = now+24h — BUKAN akhir periode). Tenant nyatanya **sudah bayar** periode berjalan → **langsung catat pembayaran LUNAS (tunai)** di menu Invoices hari itu juga. Kalau ditunda >24 jam, sistem menandai menunggak + notifikasi salah kirim.
5. **Baru setelah invoice lunas**: buat **akses portal** tenant (biar tenant tidak melihat/menerima notif "tagihan menunggak" untuk sewa yang sudah dibayar).

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
