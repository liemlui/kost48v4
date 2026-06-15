# PROPOSAL — Meter Listrik & Air: Pascabayar Murni (keputusan owner 2026-06-16)

Status: **DISETUJUI owner (model & tampilan)**, implementasi BERTAHAP (belum mulai).
Terkait: dossier `10_PEMBAYARAN_INVOICE`, `03_KEPUTUSAN_OWNER`, `12_CHECKOUT_DEPOSIT_OVERSTAY`.

## Keputusan inti

1. **Listrik 100% PASCABAYAR. TIDAK ada deposit listrik / saldo / token.**
   - Alasan: deposit listrik = saldo terselubung → menyisakan saldo saat checkout, melawan
     janji marketing. Pakai dulu, bayar kemudian (khusus meter).
2. **Pengaman checkout = DEPOSIT JAMINAN yang sudah ada** (refundable, tetap). Tagihan meter
   periode terakhir yang belum dibayar saat checkout → dipotong dari deposit jaminan, sisanya
   dikembalikan. (Tidak ada jenis deposit baru.)
3. **Invoice meter TERPISAH dari invoice sewa**, tapi bisa **"bayar sekaligus"** (dikelompokkan),
   demi transparansi. (Bukan merge fisik baris.)
4. **Marketing:** "Listrik bukan token/prabayar. Pakai dulu, bayar kemudian. Saat checkout tidak
   ada sisa saldo listrik. Transparan & pro-tenant." (untuk halaman publik/katalog).

## Aturan siklus meter

- **Jangkar (anchor)** per stay = tanggal tagih (mis. tiap tanggal 25; ikut check-in/renewal).
- **Jendela catat = H-10 → hari-H**. **Telat boleh** (lupa sampai ganti periode tetap valid).
- **Satu invoice meter per siklus.** Siklus diukur dari **tanggal catatan terakhir**, bukan
  kalender. Catatan berikutnya hanya boleh dibuka mulai (jendela H-10 anchor berikutnya).
  Contoh sah: catat 10 Mar lalu 25 Mar = dua siklus berurutan, masing-masing 1 nilai.
- **Pencatat:** staf / admin / owner / **mandiri tenant**.
- **Input listrik & air BERSAMA** (satu form). Baris air hanya jika toggle air ON.

## Perhitungan

```
pemakaianKwh   = meterSekarang − meterTerakhir
tagihanListrik = max(0, pemakaianKwh − kuotaGratisKwh) × tarifPerKwh
tagihanAir     = (toggle air ON) ? max(0, pemakaianM3 − kuotaGratisM3) × tarifPerM3 : 0
```

- Saat dicatat → **auto-generate invoice meter** (baris ELECTRICITY + WATER bila aktif).
- Invoice sewa/perpanjangan diberi catatan eksplisit:
  *"Belum termasuk listrik/air — tagihan meter terbit terpisah saat dicatat."*

## Konstanta owner-settable (Settings owner) — nyambung permintaan "konstanta di Settings"

| Kunci | Default | Catatan |
|------|---------|---------|
| `freeElectricityKwhPerMonth` | **30** | jatah gratis listrik / siklus |
| `electricityTariffPerKwhRupiah` | **2500** | tarif kelebihan (kini); per-kamar boleh override |
| `waterMeteringEnabled` | **false** | toggle: air dihitung atau tidak (belum ada meter air) |
| `waterTariffPerM3Rupiah` | (ada) | dipakai bila toggle ON |
| `freeWaterM3PerMonth` | 0 | opsional |

Sumber TUNGGAL (hindari duplikasi). Per-kamar tetap bisa override tarif bila perlu.

## UI

- **/rooms (depan):** saat stay masuk jendela H-10 & meter belum dicatat siklus ini →
  badge **"Catat meter"** di kartu + status kamar. Angka meter terakhir tampil di detail kamar.
- **Form catat meter gabungan** (listrik+air) untuk staf/admin/owner + versi mandiri tenant.
- **"Bayar sekaligus":** kelompokkan invoice sewa + meter yang sama-sama OPEN.

## Rencana implementasi BERTAHAP (aman, tiap fase bisa dirilis)

- **M-1 (fondasi) — ✅ SELESAI 2026-06-16:** konstanta owner-settable di Settings (free kWh 30, tarif 2500,
  toggle air, tarif air). Backend: model `OperationalSetting` (singleton id=1) + modul `settings`
  (`GET /api/settings/operational` owner/admin, `PUT` owner-only). Frontend: tab "Tarif & Konstanta"
  di OwnerSettingsPage (`api/settings.ts`). Verified GET/PUT + UI.
- **M-2 — ✅ SELESAI 2026-06-16:** `POST /meter-readings/cycle` (OWNER/ADMIN) catat listrik+air
  sekaligus → usage sejak catatan terakhir → kurangi jatah gratis → tarif (room override →
  OperationalSetting) → auto-issue invoice meter via `invoicesService.createWithLinesAndIssue`
  (accounting di-skip aman bila COA belum siap). Reading pertama / dalam jatah gratis = tanpa invoice.
  Frontend: `MeterCycleModal` di tab Meter (`MeterTab`) — tombol "Catat & Terbitkan Tagihan" untuk
  owner/admin. Verified API (80kWh−30=50×tarif) + screenshot modal.
- **M-3 — ⏳ SEBAGIAN (2026-06-16):** ✅ pencatatan **mandiri tenant** auto-issue invoice
  ("system-issued", keputusan owner) — `/meter-readings/cycle` izinkan TENANT (kamar sendiri,
  roomId diabaikan demi keamanan); `createWithLinesAndIssue` opsi `systemIssued`; GET
  `/settings/operational` dibuka semua role; tombol "Catat Meter Listrik/Air" di portal tenant
  (MyStayPage, reuse MeterCycleModal). Verified API (tenant maya 70−30=40×tarif) + UI.
  ⏳ **BELUM:** badge "Catat meter" H-10 (backoffice + portal tenant) — butuh hitung "jatuh tempo".
- **M-4:** "bayar sekaligus" (group invoice OPEN) + catatan "belum termasuk listrik" di invoice sewa.
- **M-5:** checkout: tagihan meter terakhir dipotong dari deposit jaminan; teks marketing publik.

## Catatan kondisi sekarang (verifikasi sebelum implementasi)

- Saat ini meter ikut **settlement invoice perpanjangan** (renew-requests.service: electricityReadingValue
  / meterReadingAt → meterSummary). M-2 menggeneralisasi ini jadi siklus mandiri + bukan-perpanjangan.
- Model sudah ada: `MeterReading`, `InvoiceLineType.ELECTRICITY/WATER`, `Room/Stay.electricityTariffPerKwhRupiah`,
  `waterTariffPerM3Rupiah`. Belum ada: konstanta global free-quota + toggle air + siklus 1×/bulan generik.
