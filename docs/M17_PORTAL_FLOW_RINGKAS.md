# M17 — Rancangan Portal Owner & Admin yang Ringkas dan Manusiawi

Status: SELESAI — Iterasi 1–4 tuntas.
Tujuan: menyederhanakan portal Owner/Admin dari "daftar fitur" menjadi "daftar kerja harian".

---

## 1. Prinsip desain

1. **Dashboard adalah daftar tugas, bukan kumpulan widget.**
   - Setiap kartu harus menjawab: apa yang terjadi, apa yang harus saya lakukan, satu tombol ke layar aksi.
2. **Satu layar, satu tujuan.**
   - Layar aksi tidak boleh menampung banyak fitur sekaligus.
3. **Alur input sesingkat mungkin.**
   - Admin tidak perlu paham struktur menu; cukup klik kartu tugas.
4. **Fitur lanjutan tetap ada, tapi tidak mengganggu.**
   - Masuk ke grup "Lainnya"/mode Lengkap, tidak dihapus.

---

## 2. Peran dan tujuan harian

| Peran | Tujuan saat buka portal |
|-------|-------------------------|
| OWNER | "Bisnis saya sehat atau tidak? Apa yang perlu saya putuskan hari ini?" |
| ADMIN | "Pekerjaan apa yang menunggu hari ini? Kerjakan satu per satu sampai bersih." |
| STAFF | Tidak berubah: "Checklist hari ini, kerjakan tugas, kirim bukti." |
| TENANT | Tidak berubah: "Lihat tagihan, bayar, lapor masalah." |

---

## 3. Flow OWNER

### Layar 1: Kokpit Owner (harian/mingguan)

Tampilan ringkas:

```
┌────────────────────────────────────────────────────┐
│ Dashboard Owner — Oktober 2026                    │
│ Kondisi: Sehat / Perhatian / Risiko               │
├──────────┬──────────┬──────────┬──────────────────┤
│ Pendapatan│ Laba Bersih│ Okupansi │ Kas Bersih       │
├────────────────────────────────────────────────────┤
│ BUTUH PERHATIAN                                   │
│ • 3 tagihan overdue           [Lihat Tagihan]     │
│ • 2 bukti bayar pending       [Verifikasi]        │
│ • 1 kamar kosong > 30 hari    [Lihat Kamar]       │
└────────────────────────────────────────────────────┘
```

| Input | Aksi | Output / Selesai |
|-------|------|------------------|
| Pilih periode (bulan/tahun) | Tidak wajib; default bulan berjalan | KPI berubah sesuai periode |
| Klik kartu "Butuh perhatian" | Buka layar aksi terfilter | Item selesai hilang dari daftar |
| Klik "Lihat Tagihan" | Buka `/invoices?status=OVERDUE` | Daftar tagihan overdue saja |

Aturan:
- Grafik tren, AI, IoT, dsb. **tidak tampil di mode ringkas**.
- Sinyal prioritas dihitung dari data yang sama, tetapi labelnya bahasa manusia.

### Layar 2: Laporan Bisnis (akhir bulan)

Alur tetap:
`/reports` → pilih jenis laporan → pilih periode → lihat angka → ekspor jika perlu.

| Input | Aksi | Output |
|-------|------|--------|
| Pilih jenis: Laba Rugi / Arus Kas / Neraca / Operasional | Klik tab | Laporan sesuai jenis |
| Pilih periode | Dropdown bulan/tahun | Angka periode terpilih |

### Layar 3: Pengaturan (jarang)

Hanya dibuka saat:
- pertama kali setup,
- ganti tarif/listrik/air,
- tambah akun user.

Tidak perlu diubah pada iterasi ini.

---

## 4. Flow ADMIN (alur harian)

### Layar 1: Dashboard "Hari Ini"

Tampilan yang diharapkan:

```
┌────────────────────────────────────────────────────┐
│ Dashboard Admin — Hari Ini                         │
│ Urutan kerja: 0 KTP · 1 Booking · 2 Bayar ·        │
│               3 Perpanjangan · 4 Keluar · 5 Blocker│
├────────────────────────────────────────────────────┤
│ 0. Verifikasi KTP (2)      [Periksa]               │
│ 1. Review booking (3)      [Review]                │
│ 2. Verifikasi bayar (1)    [Verifikasi]            │
│ 3. Catat meter renew (2)   [Catat Meter]           │
│ 4. Review keluar (1)       [Review]                │
│ 5. Blocker: 1 overdue, 1 stok menipis [Lihat]      │
└────────────────────────────────────────────────────┘
```

Prinsip:
- Kartu hanya muncul bila ada pekerjaan. Jika kosong, tampil "Semua aman".
- Urutan tetap 0 → 5, tidak boleh acak.
- Setiap kartu **satu tombol utama**. Detail sekunder bisa diakses lewat klik baris.

### Alur per tugas

#### 0. Verifikasi KTP
| Langkah | Layar | Input | Aksi |
|---------|-------|-------|------|
| 1 | Dashboard | — | Klik "Periksa" |
| 2 | Data Penghuni terfilter `ktpStatus=PENDING_REVIEW` | Lihat foto + hasil OCR | Klik "Setujui" atau "Tolak" |
| 3 | Modal konfirmasi | Alasan (jika tolak) | Simpan |
| Selesai | Kembali ke Dashboard | — | Kartu berkurang |

#### 1. Review booking
| Langkah | Layar | Input | Aksi |
|---------|-------|-------|------|
| 1 | Dashboard | — | Klik "Review" |
| 2 | Detail Stay | Cek kamar, durasi, harga | Klik "Approve" atau "Tolak" |
| 3 | Modal keputusan | Alasan tolak (jika tolak) | Simpan |
| Selesai | Kembali ke Dashboard | — | Kartu berkurang / pindah ke "menunggu bayar" |

#### 2. Verifikasi pembayaran
| Langkah | Layar | Input | Aksi |
|---------|-------|-------|------|
| 1 | Dashboard | — | Klik "Verifikasi" |
| 2 | Review Bukti Bayar terfilter `PENDING_REVIEW` | Cek nominal, tanggal, bukti | Klik "Approve" / "Tolak" |
| 3 | Modal keputusan | Catatan (jika tolak) | Simpan |
| Selesai | Kembali ke Dashboard | — | Kartu berkurang |

#### 3. Catat meter perpanjangan
| Langkah | Layar | Input | Aksi |
|---------|-------|-------|------|
| 1 | Dashboard | — | Klik "Catat Meter" |
| 2 | Daftar perpanjangan `PENDING` | Pilih tenant | Klik "Catat Meter" |
| 3 | Form meter | Angka kWh akhir, m³ akhir | Simpan |
| 4 | Ringkasan tagihan perpanjangan | Cek total | Klik "Approve" |
| Selesai | Kembali ke Dashboard | — | Kartu berkurang |

#### 4. Review checkout
| Langkah | Layar | Input | Aksi |
|---------|-------|-------|------|
| 1 | Dashboard | — | Klik "Review" |
| 2 | Daftar checkout `PENDING` | Cek tagihan lunas, deposit | Klik "Setujui" / "Tolak" |
| 3 | Modal keputusan | Catatan | Simpan |
| 4 | Final checkout (jika disetujui) | Cek meter akhir, denda, deposit | Klik "Finalkan" |
| Selesai | Kembali ke Dashboard | — | Kamar kembali AVAILABLE |

#### 5. Blocker operasional
| Jenis | Kartu | Layar tujuan | Aksi utama |
|-------|-------|--------------|------------|
| Tagihan overdue | "3 tagihan overdue" | `/invoices?status=OVERDUE` | Lihat tagihan |
| Tiket menunggu admin | "2 tiket perlu cek" | `/tickets?status=DONE` | Cek tiket |
| Stok menipis | "1 stok menipis" | `/inventory/gudang?status=LOW_STOCK` | Cek stok |
| Kamar bermasalah | "1 kamar gap fasilitas" | `/rooms?status=MAINTENANCE` | Cek kamar |

---

## 5. Halaman pendukung (bukan alur utama)

Halaman berikut tetap ada, tetapi tidak ditampilkan sebagai prioritas:
- Kamar & Stok
- Masa Sewa & Penghuni
- Keuangan (daftar lengkap)
- Staff & Tiket
- Pengumuman
- IoT, AC, Preferensi Tamu, Survei, Loyalitas, Bantu Penghuni (grup "Lainnya")

---

## 6. Perubahan layar yang dibutuhkan

| Area | Perubahan | Risiko |
|------|-----------|--------|
| DashboardAdmin | Ubah dari 3 area kerja + chart menjadi 1 daftar tugas 0–5 | Sedang |
| Kartu antrean | Satu tombol utama per kartu; label aksi bahasa manusia | Rendah |
| Filter tujuan | Pastikan route tujuan menerima query param (`status`, `ktpStatus`, `tab`) | Rendah |
| OwnerDashboard | Hapus panel non-prioritas dari mode ringkas; fokus KPI + prioritas | Rendah |
| Navigation | Sudah dirapikan; tinggal menyesuaikan label bila perlu | Rendah |
| Backend | Tidak perlu perubahan besar; query param filter mungkin perlu dilengkapi | Rendah-Sedang |

---

## 7. Kriteria selesai

1. Owner membuka Kokpit dan dalam 5 detik tahu kondisi bisnis + apa yang perlu diputuskan.
2. Admin membuka Dashboard dan melihat urutan kerja 0–5; bisa menyelesaikan satu tugas tanpa mencari menu.
3. Setiap kartu tugas memiliki tepat satu tombol utama.
4. Tidak ada fitur yang hilang; fitur lanjutan tetap dapat diakses dari "Lainnya".
5. Mode "Lengkap" tetap tersedia untuk pengguna yang sudah terbiasa.

---

## 8. Rencana implementasi

1. **Iterasi 1**: DashboardAdmin menjadi daftar tugas berurutan (ganti area tabs).
2. **Iterasi 2**: Kartu tugas dengan tombol utama + route terfilter.
3. **Iterasi 3**: OwnerDashboard ringkas (KPI + prioritas) sesuai rancangan.
4. **Iterasi 4**: Uji flow end-to-end (booking → bayar → perpanjangan → checkout) dan cleanup widget lama.

## 9. Status implementasi

- [x] **Iterasi 1** — DashboardAdmin jadi daftar tugas harian berurutan 0–5 (`AdminWorkLaneCards`). Mode ringkas default; mode Lengkap (toggle ⊕) tetap menampilkan workspace/chart lama. Blocker step 5 kini mencakup gap fasilitas.
- [x] **Iterasi 2** — Kartu tugas + route terfilter (query param `status`/`ktpStatus`) dipastikan di semua halaman tujuan. `StaysPage` sudah membaca `status` (BOOKINGS/CHECKOUT); `SimpleCrudPage` memetakan `/rooms?status=MAINTENANCE`, `/inventory/gudang?status=LOW_STOCK`, dan `/tenants?ktpStatus=PENDING_REVIEW` ke filter resource (filter `KTP_REVIEW` baru untuk tenant); `TicketsPage` membaca `status=DONE`; `InvoicesPage` membaca `status=OVERDUE`; `RenewRequestsAdminPage` membaca `status=PENDING` (opsi filter `Perlu Meter` baru, kartu tugas kini mengarah ke `/renew-requests?status=PENDING`); `PaymentReviewPage` tetap default `PENDING_REVIEW`. Tanpa perubahan backend.
- [x] **Iterasi 3** — OwnerDashboard ringkas (KPI + prioritas) sesuai rancangan. Default mode `compact` (bukan responsif), period picker disembunyikan saat ringkas, panel prioritas melebar penuh, AI panel & tren chart hanya di mode Lengkap. Sinyal prioritas kini punya CTA eksplisit (`Lihat Tagihan` → `/invoices?status=OVERDUE`, `Verifikasi` → `/payment-submissions/review`, `Lihat Tagihan` → `/invoices?status=BILLING`, `Lihat Kamar` → `/rooms?status=AVAILABLE`) plus sinyal baru kamar kosong via query `/rooms` klien; label sinyal dibuat manusiawi (`Bukti bayar pending`, dsb.). `SimpleCrudPage` juga diperluas membaca `status=AVAILABLE/OCCUPIED/RESERVED/MAINTENANCE` untuk `/rooms`.
- [x] **Iterasi 4** — Uji flow end-to-end (booking → bayar → perpanjangan → checkout) di UAT via API + Playwright. Booking online yang kamarnya masih `AVAILABLE` kini muncul di antrean admin (predikat booking diperbaiki: tidak lagi menuntut `RESERVED` sebelum bayar). Rute CTA perpanjangan dikoreksi dari `status=PENDING` (selalu kosong) menjadi dinamis per state: `DP_SECURED` → Catat Meter, `AWAITING_DP` → Konfirmasi DP, `PENDING_DECISION` → Lihat. Backend: renewal dengan pemakaian 0 kWh (jatah gratis penuh) tidak lagi membuat `InvoiceLine` qty=0 yang melanggar `invoice_line_non_negative_chk`. Widget lama Visual Dashboard (GaugeChart, ActivityRing, SnippetCard, ComplicationGrid, RatingDisplay) dihapus dari DashboardAdmin + file komponennya dibersihkan. Test: FE vitest 135/135 ✅, BE 74/74 ✅, build FE ✅, build BE ✅.
