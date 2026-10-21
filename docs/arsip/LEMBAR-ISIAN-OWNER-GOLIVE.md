> **ARSIP BEKU** · dipindah dari `docs/kerja/` ke `docs/arsip/` pada 2026-10-21 (DOCS-GEN2 D4d). Isi dipindah/dipertahankan sebagai referensi; **jangan dibaca rutin**.

# LEMBAR-ISIAN-OWNER-GOLIVE — data yang harus owner isi sebelum go-live

> **Blok baca** · Jenis: **lembar isian owner (bukan antrean)** · Status: **aktif — kosong, menunggu data** · Untuk siapa: owner
> · Baca kalau: mengisi data aset, stok, foto, KTP, keuangan, dan konten aturan. · **Jangan** dibaca kalau: mencari aturan bisnis (itu [KEPUTUSAN-OWNER](../KEPUTUSAN-OWNER.md)) atau memilih tugas (itu [ANTREAN](../ANTREAN.md)).

Dibuat 20 Okt 2026 dari [checklist go-live](../../frontend/public/checklist/index.html) dan keputusan owner 19 Okt 2026. **Semua nilai di bawah sengaja kosong** — jangan diisi agen; agen tidak berhak menebak aset, stok, foto, KTP, rekening, atau saldo.

## Goal & todos

**Goal.** Owner punya satu lembar yang bisa diisi, dan agen punya bukti tertulis bahwa setiap kelompok data go-live sudah kosong/terisi — tanpa angka karangan.
**Definisi selesai.** Lima lembar terisi (aset, stok, foto, KTP, keuangan) · aturan yang belum diputuskan dijawab · sepuluh uji minimum punya bukti lulus/gagal.

| Langkah | Status | Bukti penutup |
|---|---|---|
| 1. Verifikasi read-only produksi | selesai | angka §3 (20 Okt 2026) |
| 2. Dump + cron backup harian | selesai | dump 40 KB, gzip -t OK, 62 blok `COPY`; cron terpasang; probe cron menulis 3× dalam 3 menit |
| 3. Uji restore ke DB terpisah | selesai | DB uji dibuat lewat cPanel API; restore 62 tabel; 5 hitungan cocok; DB uji dihapus |
| 4. Lembar isian owner | selesai | dokumen ini |
| 5. Sepuluh uji minimum | blokir | butuh kamar/tenant UJI + izin tulis data produksi |

## 1. Lembar isian

### 1.1 Aset tetap

Kolom: **nama · kategori · tanggal perolehan · nilai perolehan (Rp) · umur ekonomis (bulan)**. Contoh format: `AC kamar A · AC · (tanggal) · (Rp) · (bulan)`.

| Nama | Kategori | Tanggal perolehan | Nilai perolehan (Rp) | Umur ekonomis (bulan) |
|---|---|---|---|---|
|  |  |  |  |  |
|  |  |  |  |  |

### 1.2 Stok gudang

Kolom: **nama · satuan · qty awal · batas minimum**. Contoh format: `Sabun mandi · pcs · (qty) · (batas)`.

| Nama | Satuan | Qty awal | Batas minimum |
|---|---|---|---|
|  |  |  |  |
|  |  |  |  |

### 1.3 Foto kamar

Kolom: **kamar · jenis (kasur/KM/keseluruhan) · nama berkas · ukuran (KB)**. Contoh format: `A · kasur · a-kasur.jpg · (KB)`. Target halaman: minimal 3 foto per kamar, JPG/WebP, sisi terpanjang ±1600 px, <300 KB.

| Kamar | Jenis | Nama berkas | Ukuran (KB) |
|---|---|---|---|
|  |  |  |  |
|  |  |  |  |

### 1.4 KTP penghuni

Kolom: **tenant · status unggah (belum/menunggu/terverifikasi/ditolak) · status verifikasi · tanggal**. Jangan tulis NIK atau nama berkas foto di lembar ini.

| Tenant | Status unggah | Status verifikasi | Tanggal |
|---|---|---|---|
|  |  |  |  |
|  |  |  |  |

### 1.5 Keuangan

Kolom: **rekening penerima (bank · nomor · atas nama) · saldo awal per tanggal cutover (kas · bank)**. Contoh format: `Bank · (nomor) · (atas nama) · (Rp kas) · (Rp bank)`.

| Bank | Nomor rekening | Atas nama | Saldo kas (Rp) | Saldo bank (Rp) | Tanggal cutover |
|---|---|---|---|---|---|
|  |  |  |  |  |  |
|  |  |  |  |  |  |

### 1.6 Konten & aturan yang belum diputuskan

Isi keputusan, bukan nilai karangan. Status "belum" berarti halaman FAQ belum boleh menyebut aturan itu.

| Topik | Keputusan | Status |
|---|---|---|
| Tamu menginap |  | belum |
| Merokok |  | belum |
| Jam tenang |  | belum |
| Wi-Fi berbayar/gratis + harga |  | belum |
| Batas overstay & jam checkout |  | belum |
| Alamat resmi (dua versi di sistem) |  | belum |
| Nomor WhatsApp admin |  | belum |

## 2. Aturan yang sudah diputuskan (bahan FAQ)

Angka di bawah berasal dari keputusan owner 19 Okt 2026 ([KEPUTUSAN-OWNER](../KEPUTUSAN-OWNER.md)) dan dari basis data produksi (potret 20 Okt 2026). Teks FAQ final tetap wajib menunjuk sumber kanonik di [TASK-FAQ-TENANT](TASK-FAQ-TENANT.md).

| Topik | Nilai berlaku | Sumber |
|---|---|---|
| Listrik | Rp2.500/kWh (default global) | keputusan 19 Okt + `OperationalSetting` |
| Air | gratis sementara; metering OFF | keputusan 19 Okt + `OperationalSetting` |
| Jatah listrik gratis | 30 kWh/bulan | `OperationalSetting` |
| Deposit hewan | Rp100.000 (refundable) | `OperationalSetting` |
| Penghuni tambahan | +20% per kepala | `OperationalSetting` |
| Deposit kamar | Rp300.000–600.000 sesuai kamar | data `Room` |
| Prabayar | 1–24 bulan | keputusan 19 Okt |
| Pembayaran | DP atau pelunasan penuh; bukti transfer manual; jatuh tempo 24 jam | keputusan 19 Okt |
| KTP | tidak memblokir check-in; wajib setelahnya | keputusan 19 Okt |

## 3. Angka terverifikasi 20 Okt 2026

| Butir | Angka | Cara |
|---|---|---|
| Tenant / Stay aktif / Invoice | 13 / 11 / 11 | kueri read-only |
| Invoice lunas | 11 · Rp14.600.000 | kueri read-only |
| Jurnal | 23 | kueri read-only |
| Akun | 13 (12 TENANT, 0 ADMIN, 0 STAFF) | kueri read-only |
| KTP terverifikasi / berkas | 0 / 0 | kueri read-only |
| Foto kamar | DB `Room.images` 0; berkas statis 80 (14 MB) di `/room-images`, HTTP 200; katalog menampilkan foto; F1/F2 memakai foto generik; URL gambar dari API 404 tetapi UI memetakan ke `/room-images` | kueri + HTTP + render |
| Aset tetap / stok / barang kamar | 0 / 0 / 0 | kueri read-only |
| Dump terbaru | 40 KB, 62 blok `COPY`, gzip OK | `gzip -t` |
| Restore | 62 tabel; Stay 11, Invoice 11, InvoicePayment 11, JournalEntry 23, Tenant 13 | uji di DB terpisah |
| Baris invoice | hanya RENT 11; listrik/air 0 baris | kueri read-only |
| Integritas invoice | 0 selisih total vs pembayaran; 11/11 lunas | kueri read-only |
| Jurnal | debit = kredit Rp29.400.000; 0 tidak seimbang | kueri read-only |
| Meter reading | 11 listrik + 11 air | kueri read-only |
| VAPID | kunci publik/privat kosong | kueri read-only |
| Kontak darurat / bukti bayar / FAQ | 0 / 0 / 0 baris (FAQ modul punya isi statis) | kueri read-only |
| Worker | 2 proses, RSS ±306 MiB | `ps` |
| Katalog /rooms | 13 kamar (9+4), tarif 850 rb–1,8 jt, foto tampil, tanpa scroll horizontal | render 1440/390 |
| Detail kamar A | deposit Rp500.000, total awal Rp2.200.000, 7 foto | render 1440 |
| Cacat tampilan | kartu "Deposit jaminan" menampilkan placeholder mentah (PublicRoomDetailPage baris 324); pola sama di MeterTab, GlobalSearch, LoyaltyAdminPage | baca kode + render |
| FAQ publik | API 0 entri; halaman `/panduan` menampilkan 12 FAQ statis (accordion, jawaban tertutup) | render + baca kode |
| Domain/HTTPS | TLS 1.3; sertifikat Let's Encrypt valid s.d. 29 Des 2026; build `dyPs68LPy2yq` | TLS + version.json |
| Rollback | 2 arsip dist 19,9 MB (19 Okt) + bundel lokal; belum diuji | ls server |

## 4. Batas

- Angka di §3 adalah potret sesaat; bukan rata-rata atau puncak.
- Restore terbukti, tetapi dump harus disaring dua baris `plpgsql` (akun bukan pemilik extension). Cron baru terbukti lewat probe; run terjadwal pertama 21 Okt 02.00 belum terlihat.
- Cron AutoOps dan sepuluh uji minimum **belum dijalankan**; lihat status di tabel Goal & todos.
- Lembar ini tidak memberi izin mengubah data produksi.

## 5. Rencana 10 uji (siap dijalankan setelah izin)

| Uji | Data/izin | Langkah inti | Bukti | Status |
|---|---|---|---|---|
| g1 login OWNER | owner hadir | login, buka dashboard, cek konsol | tangkapan layar tanpa galat | belum |
| g2 13 kamar + foto | foto F1/F2 | buka katalog `/rooms` + detail kamar, cek tarif/deposit/foto | 13 kamar, tarif & deposit benar di detail (Rp500 rb), foto tampil; cacat placeholder di kartu deposit | sebagian |
| g3 11 invoice lunas | — | reload, buka laporan | tidak minus; data 11 lunas Rp14,6 jt sudah terbukti | sebagian |
| g4 check-in UJI | kamar+tenant UJI | check-in, cek stay/invoice/jurnal/meter | total invoice & deposit sebelum/sesudah | blokir |
| g5 tenant login + bukti | 1 tenant izin | login, lihat tagihan, unggah bukti | submission muncul; saldo tidak berubah sebelum approve | blokir |
| g6 checkout UJI | stay UJI | ajukan checkout, inspeksi, settlement | deposit sebelum/sesudah | blokir |
| g7 restore | — | sudah dijalankan 20 Okt | 62 tabel, 5 hitungan cocok | selesai |
| g8 PWA + push | VAPID | pasang di 1 perangkat, kirim push | push diterima | blokir |
| g9 cron AutoOps | token + endpoint | panggil POST /api/auto-ops/cron dengan header X-Cron-Token lewat cron | log + pengingat muncul; sweep mengubah data (expiry/reminder/jurnal) → butuh izin | blokir |
| g10 ADMIN/STAFF | email valid | buat akun, login, uji batas akses | akun + daftar menu | blokir |

## 6. Blokir keputusan

| Butir | Sebab | Pemilik | Estimasi |
|---|---|---|---|
| 10 uji menulis data | butuh kamar/tenant UJI + izin tulis produksi | owner | 1–2 jam |
| KTP gate | **selesai 20 Okt 2026:** `ktpVerificationGateEnabled=false` di DB (env masih true, DB prioritas); check-in tidak lagi ditolak gate | owner | — |
| Rotasi sandi DB | sandi terekspos 20 Okt; jawaban belum ada | owner | 30 menit |
| Cron AutoOps | `AUTO_OPS_ENABLED=false` dan crontab kosong; token ada, tetapi endpoint memicu sweep yang mengubah data (expiry, reminder, jurnal) | owner+agen | 30 menit |
| FAQ statis | "maksimal 4 orang per kamar" bertentangan dengan 4+2 LARGE; "tidak ada jam malam" dan WiFi Rp50.000 sudah tampil padahal belum diputuskan owner | owner+agen | 20 menit |
| Bug tampilan | placeholder formatRupiah tampil mentah di kartu deposit halaman detail kamar; 3 pola sama di kode lain; perbaikan belum di-deploy | owner+agen | 20 menit |
| PII di halaman checklist | nama 1 penghuni muncul 2× di `/checklist/` dan `/checklist/golive.html`; sumber lokal sudah diredaksi, halaman live belum | owner | 10 menit + deploy |
| Foto/KTP/aset/stok/rekening | KTP, aset, stok, rekening belum ada; foto katalog ada, sisa foto khusus F1/F2 dan pengisian `Room.images` | owner | hari |

## 7. Langkah uji untuk dijalankan owner (default b)

Prasyarat: dump 20 Okt sudah ada; gate KTP sudah `false`; buka aplikasi di browser dengan akun OWNER. Setiap langkah dicatat waktunya; agen menjalankan kueri pembanding sebelum/sesudah.

| Uji | Langkah | Lulus bila |
|---|---|---|
| g1 | Masuk `/login` sebagai OWNER, buka `/owner-dashboard` | dashboard terbuka; konsol tanpa galat merah |
| g2 | Buka `/rooms` halaman 1 dan 2, lalu `/rooms/1/detail` | 13 kamar (A–M); tarif & foto tampil; deposit Rp500.000 di detail |
| g3 | Buka `/invoices` dan `/reports` | 11 lunas Rp14.600.000; angka tidak minus setelah muat ulang |
| g4 | Buat kamar `UJI` (tarif Rp1, deposit 0, nonaktif) + tenant `TENANT UJI`; buka `/stays/check-in` | stay, invoice, jurnal, meter awal terbentuk; angka sebelum/sesudah dicatat |
| g5 | Buat akun tenant UJI; login; buka `/portal/invoices`; unggah bukti bayar | submission muncul; saldo tidak berubah sebelum approve |
| g6 | Buka `/stays/:id` (staf) atau `/portal/checkout` (tenant); isi inspeksi; setujui settlement | deposit sebelum/sesudah tercatat; sisa deposit benar |
| g8 | Pasang PWA di 1 HP; izinkan notifikasi; kirim push uji | push diterima; aplikasi terbuka dari ikon |
| g9 | Pasang cron AutoOps (token dari owner), tunggu 1 menit | log cron + pengingat kontrak muncul; tidak ada 5xx |
| g10 | Buat akun di `/users` (email valid); login | menu terbatas; tidak bisa membuka menu OWNER |

**Kueri pembanding (agen):** hitung `Tenant`/`Stay`/`Invoice`/`InvoicePayment`/`JournalEntry`/`MeterReading`; jumlah `InvoicePayment`; debit/kredit jurnal; `depositAmountRupiah`/`depositPaidAmountRupiah` stay UJI. Catat sebelum dan sesudah tiap uji.

**Batas:** invoice/jurnal yang sudah terbit tidak dihapus; catat nomornya agar bisa dibedakan. Kamar/tenant UJI dihapus hanya bila belum punya invoice/jurnal.
