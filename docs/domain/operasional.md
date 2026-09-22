# Operasional — Aturan, Inventaris, Staf, Notifikasi, Auth

Tanggal: 2026-09-23
Status: aktif
Tujuan: aturan operasional harian — aturan tenant, inventaris, staf/tiket/KPI, notifikasi/pengumuman, auth/onboarding — beserta proposal meter listrik/air dan spesifikasi IoT (dari M06)
Rujukan: [M02](../M02_KEPUTUSAN_OWNER.md) · [M12](../M12_CHECKLIST_CHANGELOG.md) · [M06](../M06_OPERASIONAL.md) · [hunian.md](hunian.md) · [keuangan.md](keuangan.md) · [kontrak.md](kontrak.md)

> Migrasi dari docs/M06_OPERASIONAL.md (B1 Tahap 3, 23 Sep 2026) pada DOC-GOV-20260922; teks aturan tidak diubah.
> Indeks dossier — rujukan "dossier 14/15/16/18" dari [hunian.md](hunian.md) menunjuk ke file ini: **14** inventaris & barang kamar · **15** staf/tiket/KPI · **16** notifikasi & pengumuman · **18** auth/KTP/onboarding.
> Riwayat & bukti dipisah: identity dossier, temuan audit, dan task ke history/changelog/2026-06.md; update bertanggal Juli 2026 ke history/changelog/2026-07.md; audit 29 Jul 2026 ke audit/audit-operasional-2026-07.md.
> Duplikasi yang dicurigai (bukan diputuskan) dicatat di [history/laporan-duplikat.md](../history/laporan-duplikat.md); isi kembar tidak dihapus pada batch ini.

## Update 2026-06-19 - Fase G AI Operasional

AI operasional hanya untuk OWNER/ADMIN dan selalu manual lewat tombol. Detail implementasi ada di `docs/M09_AI_OWNER_ADMIN.md`.

- **Ticket assistant:** AI boleh merangkum tiket, menyarankan prioritas, draft note, atau aksi lanjutan. Admin/Owner tetap klik assign/start/close/request-photo secara manual.
- **Inventory assistant:** AI boleh menyusun rekomendasi reorder, stok rendah, atau estimasi pembelian. Mutasi stok, movement, expense, dan perubahan fasilitas tetap melalui endpoint existing dan approval manusia.
- **Staff field report assistant:** AI boleh membantu admin membaca laporan staf dan menyarankan keputusan. Staff tidak mendapat tombol AI berbayar.
- **Tidak ada auto-ops AI:** jangan menambahkan DeepSeek ke cron/sweeper/auto-ops. Auto-ops tetap deterministik dan murah.
- **Audit:** bila saran AI dipakai untuk review laporan/tiket/stok, catat `AuditLog.meta.ai` pada aksi final.

---
## Aturan & Panduan Tenant KOST48 — 2026-06-17

Konten aturan ini akan diisi ke **menu Panduan & Aturan Kos** di portal tenant (MyManualPage) dan halaman publik FAQ. Berdasarkan keputusan owner D-19 (F4-12): FAQ di-seed dari aturan/flow, owner edit via admin FAQ.

### A. Profil & Akomodasi KOST48

Kost 48 Surabaya – Akomodasi Nyaman & Terjangkau di Lokasi Strategis. Mencari penginapan harian di Surabaya yang nyaman, terjangkau, dan strategis? Kost 48 Surabaya adalah pilihan tepat! Berlokasi di kawasan eksklusif Pakuwon Indah, kami menawarkan akomodasi yang cocok untuk pekerja mall, tim event, keluarga acara pernikahan, supir eksekutif, peserta lomba UNESA, tamu wisuda, wisatawan transit, hingga tenaga kerja yang hendak ke Jepang.

**Lokasi:** Jl. Hikmah V No. 48, Lontar, Sambikerep, Surabaya.

**Keunggulan:**
- ✅ Dekat Pakuwon Mall & Pusat Perbelanjaan – Hanya 7-10 menit jalan kaki ke Pakuwon Mall (PTC & Supermall), Spazio, Lenmarc
- ✅ Akses Mudah ke UNESA & Acara Akademik – Hanya 10 menit berkendara ke Universitas Negeri Surabaya
- ✅ Dekat RS Lombok 22 Lontar & National Hospital – Cocok untuk keluarga pasien yang butuh akomodasi sementara
- ✅ Lingkungan Eksklusif & Aman – Dikelilingi perumahan elite Pakuwon Indah, Graha Family, Citraland, Bukit Darmo Golf
- ✅ Pilihan Kamar Beragam – Mulai dari Budget, Standard, Economy, hingga Deluxe dengan fasilitas AC/Fan & kamar mandi dalam/luar
- ✅ Fasilitas Lengkap – Wi-Fi gratis, dapur bersama, lounge nyaman, parkir luas, dan pet-friendly
- ✅ Dekat Pusat Transportasi – Transit ideal bagi wisatawan ke Malang atau Bali & akses mudah ke Bandara Juanda (27 km)

**Cocok untuk:**
- Pekerja Mall & Event Crew – Hemat & dekat lokasi kerja
- Tamu Pernikahan – Akomodasi nyaman untuk keluarga pengantin
- Supir Eksekutif – Tempat istirahat terbaik saat bos menginap di hotel mewah
- Peserta Lomba & Wisuda UNESA – Nyaman & dekat kampus
- Menunggu Renovasi Rumah – Tinggal sementara tanpa ribet
- Wisatawan Transit – Istirahat sebelum ke Malang atau Bali
- Backpacker Internasional – Ramah bule dengan harga bersahabat
- Calon Tenaga Kerja ke Jepang – Menginap sambil mengurus izin & pelatihan

### B. Aturan & Kebijakan — SEWA BULANAN

**Check-in & Check-out:**
- Check-in: 14:00 - 22:00 WIB
- Check-out: Maksimal pukul 12:00 WIB

**Kebijakan Deposit:**
- Deposit kerusakan sebesar Rp 300.000 dibutuhkan saat kedatangan. Pembayaran dilakukan saat pelunasan dan akan dikembalikan sepenuhnya saat check-out, tergantung pada pemeriksaan akomodasi.

**Kebijakan Merokok:**
- Dilarang merokok di dalam kamar. Area merokok tersedia di luar ruangan.
- Pelanggaran akan dikenakan denda Rp 200.000 untuk pembersihan ekstra.

**Kebijakan Anak & Tamu:**
- Anak di bawah 11 tahun menginap gratis jika berbagi tempat tidur dengan orang tua.
- Anak 11 tahun ke atas dihitung sebagai tamu dewasa.
- 1 Kamar Maksimal isi 2 Orang.

**Makanan & Minuman:**
- Dapur bersama tersedia bagi yang ingin memasak. Harap menjaga kebersihan setelah penggunaan.
- Sarapan tidak termasuk dalam tarif kamar (khusus harian).

**Wi-Fi & Fasilitas Umum:**
- Wi-Fi tersedia dengan biaya tambahan Rp 50.000/bulan, Rp 20.000/minggu, atau Rp 5.000/hari per perangkat untuk menjaga kualitas koneksi.
- Lounge bersama dapat digunakan oleh tamu untuk bersantai atau bekerja.

**Parkir:**
- Parkir gratis. Harap memastikan keamanan kendaraan secara pribadi.
- Parkir terbatas, harap informasikan terlebih dahulu jika membawa kendaraan.

**Hewan Peliharaan:**
- Hewan peliharaan diizinkan dengan pemberitahuan sebelumnya.
- Harap memastikan hewan peliharaan tidak mengganggu tamu lain.
- Pemilik hewan peliharaan wajib memberikan uang jaminan Rp 100.000 yang akan dikembalikan jika tidak ada kerusakan.

**Keamanan & Ketertiban:**
- Dilarang membawa dan mengkonsumsi alkohol, narkoba, atau barang ilegal di dalam area penginapan.
- Dilarang membuat kebisingan yang mengganggu tamu lain, terutama setelah pukul 22:00 WIB.
- Pengunjung yang tidak terdaftar dilarang menginap tanpa izin dari pengelola.
- Perilaku yang melanggar norma, seperti perbuatan asusila, sangat dilarang dan dapat dilaporkan ke pihak berwenang.

### C. Aturan & Kebijakan — HARIAN / MINGGUAN / 2 MINGGUAN

**Check-in & Check-out:**
- Check-in: 14:00 - 22:00 WIB
- Check-out: Maksimal pukul 12:00 WIB

**Kebijakan Deposit:**
- Deposit kerusakan Rp 100.000 atau jaminan KTP dibayarkan saat check-in.
- Dikembalikan sepenuhnya saat check-out setelah pemeriksaan kamar.

**Kebijakan Merokok:**
- Dilarang merokok di dalam kamar. Area merokok di luar ruangan.
- Pelanggaran denda Rp 200.000.

**Anak & Tamu Tambahan:**
- Anak <11 tahun gratis (berbagi tempat tidur).
- Anak ≥11 tahun = tamu dewasa.
- 1 kamar maksimal 2 orang.

**Kebijakan Makanan & Minuman:**
- Dapur bersama tersedia. Harap jaga kebersihan.
- Sarapan tidak termasuk.

**Wi-Fi:**
- Wi-Fi gratis untuk tamu harian.

**Parkir:**
- Parkir gratis, terbatas. Informasikan sebelumnya jika bawa kendaraan.

**Hewan Peliharaan:**
- Diperbolehkan dengan pemberitahuan.
- Deposit Rp 100.000, dikembalikan jika tidak ada kerusakan.

**Keamanan & Ketertiban:**
- Sama dengan aturan bulanan (poin 5–8 di atas).

### D. SOP Housekeeping — KOST 48 SURABAYA

**Jam Kerja Housekeeping:**
- Senin – Sabtu: 08.00 – 16.00 WIB
- Minggu & Tanggal Merah: sesuai kebutuhan/check-out

**Peralatan Wajib Dibawa:**
| Alat | Keterangan |
|------|-----------|
| Lap Microfiber | Untuk meja, kaca, dan permukaan keras |
| Sabun Pembersih Serbaguna | Wajib pakai setiap kamar |
| Sikat WC & Cairan Pembersih | Untuk kamar mandi |
| Sapu + Pel | Lantai kamar dan lorong |
| Sarung Tangan Karet | Wajib saat bersih kamar mandi |
| Kantong Sampah | Ganti tiap hari |
| Pengharum Ruangan | 1 semprot terakhir sebelum tutup kamar |

**Checklist Pembersihan Kamar (urutan):**
1. Buka gorden, nyalakan lampu dan kipas/AC
2. Rapikan kasur dan lipat selimut/bantal
3. Buang sampah & ganti kantong baru
4. Lap meja, lemari, handle pintu, kaca
5. Sapu & pel lantai
6. Bersihkan toilet, wastafel, lantai kamar mandi
7. Kunci pintu kamar, laporkan bila ada kerusakan/kotoran berat

**Catatan Penting:**
- Dilarang menyentuh barang pribadi penyewa
- Bila menemukan: kunci, HP, uang → segera laporkan ke owner
- Setiap selesai bersih kamar, centang checklist di app

### E. Room Ready Checklist — KOST 48 SURABAYA

Format checklist yang digunakan petugas setelah kamar selesai dibersihkan dan siap huni:

**A. Kebersihan Kamar:**
| Item | Cek (✔) | Catatan Jika Tidak Sesuai |
|------|---------|--------------------------|
| Kasur rapi & sprei bersih | | |
| Bantal bersih | | |
| Lantai disapu & dipel | | |
| Meja & lemari bebas debu | | |
| Jendela & kaca bersih | | |
| Kamar mandi bersih & kering | | |
| Wastafel & toilet bersih | | |
| Sisa sampah dibuang | | |

**B. Fasilitas dan Fungsi:**
| Item | Cek (✔) | Catatan Jika Rusak / Tidak Aktif |
|------|---------|----------------------------------|
| AC menyala & dingin | | |
| Lampu utama berfungsi | | |
| Colokan listrik normal | | |
| Wi-Fi aktif (tes koneksi HP) | | |
| Kunci pintu berfungsi baik | | |

**C. Foto Dokumentasi (opsional untuk laporan digital):**
- Foto 1: Tampak kasur & meja
- Foto 2: Kamar mandi
- Foto 3: Kondisi umum ruangan

Data petugas: Tanggal, Nomor Kamar, Nama Petugas, Jam Selesai.

---
## Staff Role Scope & Operasional — 2026-06-17

### A. Scope Pekerjaan Staff
Staff KOST48 hanya mengerjakan 3 area:
1. **Reparasi** — perbaikan kerusakan kamar/fasilitas (tiket MAINTENANCE, KERUSAKAN, KUNCI)
2. **Kebersihan** — housekeeping + room ready checklist (tiket KEBERSIHAN, CHECKOUT_INSPECTION)
3. **Resepsionis** — menyambut tamu datang, antar kunci, info dasar

Staff **TIDAK BOLEH** memulai/menyetujui pemesanan layanan berbayar (WiFi, galon, TV, deposit, dll). Semua layanan berbayar harus melalui admin/owner.

### B. WiFi & Layanan Tambahan
- **WiFi Order:** Staff hanya bisa melihat status pesanan WiFi. Tombol "Mulai" untuk memulai layanan hanya untuk ADMIN/OWNER. Alternatif: ganti tombol "Pesan" yang setelah di-approve admin → masuk invoice tenant.
- **Layanan Tambahan Lain:** Galon, TV, dll — sama, admin yang memproses. Staff tidak punya akses approve.

### C. Label Saran
- **STF-SARAN-LABEL**: Ganti semua label "Kirim via Laporan" menjadi "Kirim Saran" di portal tenant. Fungsinya tetap membuat tiket (laporan), tapi judul dibedakan agar tenant tidak ragu memberi masukan non-darurat.

### D. Tip Staf — Flow Lengkap
1. Tenant selesai interaksi dengan staf (tiket CLOSED)
2. Tenant melihat kartu tip di MyTicketsPage — berisi info e-wallet staf
3. Tenant transfer manual ke e-wallet staf
4. Tenant klik tombol "Saya sudah transfer" → notifikasi ke staff
5. Staff punya **2 hari** untuk konfirmasi (via portal staff):
   - **"Sudah masuk"** → notif balik ke tenant "Terima kasih" + poin tip untuk tenant
   - **"Belum masuk"** → notif ke tenant "Silakan cek kembali"
6. Setelah 2 hari tanpa konfirmasi staff → otomatis dianggap sudah masuk (default grace)
7. Tombol "Terima Kasih" (acknowledge) di portal staff untuk memberi sinyal ke tenant

### E. Meter View untuk Staff
- Staff bisa melihat dashboard/daftar kamar yang **sudah** dan **belum** catat meter per siklus.
- Tampilkan: kode kamar, tenant, status (SUDAH / BELUM), tanggal catat terakhir.
- Gunakan data dari `MeterReading` — cukup query `MAX(readingAt)` per room.

### F. Foto Profil Tenant dari KTP
- Saat pertama upload KTP, foto tersebut otomatis dipakai sebagai foto profil tenant.
- Sistem kompres gambar (reuse `compressImageFile` yang sudah ada di frontend).
- Owner/Admin bisa upload ulang foto profil tenant via halaman edit tenant.

---
## Dossier 14 — Inventaris & Barang Kamar (normatif)

#### 1. Aturan bisnis
- **Qty single-writer:** satu-satunya pengubah qty = trigger DB `inventory_movement_sync_qty_trg`; service hanya self-healing (tulis bila beda), bukan penambah kedua.
- **Movement tak boleh diedit** (wajib mutasi koreksi); catatan ≥8 char; ADJUSTMENT ditolak.
- **RoomItem create/ubah-qty langsung DIBLOKIR** — hanya via movement ASSIGN/RETURN.
- **Staf** hanya boleh LAPOR status (DAMAGED/MAINTENANCE/MISSING) + wajib catatan/foto; status final menunggu admin.
- **Status barang saat ASSIGN ditentukan admin**, bukan auto-GOOD.
- **Riwayat barang ditarik (qty 0): hapus record RoomItem**; jejak tetap ada di movement, AuditLog, dan tiket.

#### 5. Invarian, verifikasi, tools
- **Invarian:** `qtyOnHand = stok awal + Σ delta movement` (trigger=single writer); `RoomItem.qty` per (item,kamar) = ΣASSIGN−ΣRETURN, tak pernah negatif; tiap perubahan qty berjejak movement+AuditLog; movement tak pernah diedit (koreksi=movement lawan).
- **UAT regresi F2-5:** (1) kamar 1 kasur + adminReview RETURN qty 3 → HARUS 409; (2) 2 admin paralel approve item sama → 1 sukses 1 konflik; (3) movement resmi RETURN>kamar → 409 (regresi tetap).
- **Pemeriksaan historis I-02:** query InventoryMovement RETURN dari relatedMovement adminReview → cek selisih (belum-publish: dampak retroaktif nihil; tetap fix kode).
- **Tools belum ada (rekomendasi):** inventory turnover, dead-stock (item tanpa movement >90 hari). EOQ tidak relevan (consumable sedikit).
- **Pelajaran arsitektural** (layak masuk CLAUDE.md): setiap penulis qty baru WAJIB lewat util movement resmi — jangan tulis versi longgar.


---
## Dossier 15 — Staf, Tiket & KPI (normatif)

#### 1. Aturan bisnis
- **Tiket lifecycle aktual:** OPEN → IN_PROGRESS → DONE → CLOSED, dengan CANCELLED dari kondisi yang diizinkan.
- **Kategori:** CHECKOUT_INSPECTION, EVICT_OVERSTAY, BARANG_PINDAH, AUDIT_INVENTARIS, PEMERIKSAAN, MAINTENANCE, KEBERSIHAN, KUNCI, INVENTARIS, KERUSAKAN.
- **Auto-created:** CHECKOUT_INSPECTION (setelah final checkout), EVICT_OVERSTAY (H-day overstay).
- **Staff boleh close** tiket CHECKOUT_INSPECTION → room MAINTENANCE → AVAILABLE (guard keselamatan tetap).
- **Room readiness gate:** tidak AVAILABLE jika: active stay lain, room ≠ MAINTENANCE, kondisi tidak aman.
- **Round-robin assignment (F2-10):** ✅ DISIAPKAN & DORMAN (2026-06-15). `pickStaffAssigneeTx` di `createTicketRecord` — 1 staf → semua ke dia; **≥2 staf → round-robin berbasis beban** (otomatis aktif). **Leaderboard (F3-5):** ✅ `getLeaderboard` + `GET /admin/staff-performance/leaderboard` (`active=false` saat <2 staf; auto-aktif ≥2).

#### 5. Invarian & UAT
- **Invarian:** tiket inspeksi dedupe per stay/room; staff close hanya CHECKOUT_INSPECTION; room tidak AVAILABLE tanpa close safe.
- **UAT:** (1) final checkout → tiket inspeksi muncul; (2) staff close inspeksi → room AVAILABLE; (3) KPI dashboard filter category bekerja; (4) monthRange WIB benar (pasca F2-14).

**Lintas-dossier:** tiket inspeksi → dossier 12 (checkout); staff report inventory → dossier 14; review tenant → dossier 17.


---
## Dossier 16 — Notifikasi & Pengumuman (normatif)

#### 1. Aturan bisnis
- **Notif in-app + PWA Web Push** (D2; push AKTIF sejak F4-2, 2026-06-15). Tenant/staf aktifkan via menu Notifikasi (opt-in, izin browser).
- **Pengumuman: Admin + Owner** boleh publish (J-c). Audiens TENANT = hanya yang OCCUPIED (N-03/D-10: tenant booking TIDAK terima — kode benar).
- **Reminder kontrak: H-10, H-7, H-3, H-1, H-day** (B1 — ✅ SELESAI 2026-06-14, `runContractEndReminders` REMINDER_DAYS `[10,7,3,1,0]`).
- **Push (J-d) SELESAI (F4-2): 4 kelompok event prioritas** — (1) pengingat kontrak, (2) pembayaran disetujui/ditolak, (3) booking dibatalkan/DP hangus/kalah cepat, (4) tiket baru utk staf + ajakan tenant menilai. Implementasi memush SEMUA notif in-app (pushStatus=PENDING saat create) → cakupan ≥ 4 kelompok. Selaras model tenant-pengawas.
- Notif TIDAK pernah ditulis di dalam tx yang bisa rollback (pola forced-checkout di LUAR tx).

#### 5. Konvensi & invarian
- **Konvensi event baru:** penerima eksplisit; linkTo terdalam relevan; dedupe key (recipient, entityType, entityId, title); best-effort never-throw; di LUAR tx bila pasca-commit.
- **Util target:** `notifySafe({recipient,dedupeKey,...})` terpusat (Langkah 1 murah) sebelum outbox push (Phase 3).
- **Prioritas penutupan:** renew (vacancy) > A17 copy (kepercayaan) > payment-submitted (kecepatan kas) > ticket-assign (SLA) > room-ready > wifi.
- **Pola terbaik (template):** `checkout-requests.service.ts:294-345` notifyOwnerAdminOnCreate.


---
## Dossier 18 — Auth, Fondasi & Onboarding (KTP) (normatif)

#### 1. Aturan bisnis
- **E-1 APP_GUARD global default-deny TERPASANG** (sejak V5.12.2) — controller baru otomatis 401 kecuali `@Public`. (Koreksi: kontrak lama "tidak ada guard global" BASI.)
- **Role: OWNER/ADMIN/STAFF/TENANT.** **OWNER-only (D-17):** (a) tutup/buka periode akuntansi, (b) hapus/nonaktif user & staf, (c) ubah setelan kamar & harga, (d) proses deposit & refund settlement — ADMIN tidak boleh.
- **forgotPassword enumeration-safe** (respons identik); token reset di-hash SHA-256; suspend memutus sesi seketika (jwt.strategy validasi DB/request).
- **Rate limit:** global 300/menit/IP, auth 10/15menit/IP (in-memory; multi-instance perlu store bersama).
- **Onboarding minimal: nama + HP + KTP**; data lain dapat dilengkapi lewat quest gamifikasi.
- **KTP (E1/P1-P4):** upload **saat check-in / sebelum aktivasi**; tanpa KTP verified → **blokir aktivasi kamar** (tak jadi OCCUPIED); simpan **terproteksi Bearer-scoped, admin/owner-only, hapus saat tenant keluar** (UU PDP); **cukup FOTO** (verifikasi visual, tidak simpan NIK).
- File security (sudah ada, pola dipakai KTP): magic-byte, rename CSPRNG, anti path-traversal, `private, no-store`.

#### 5. Invarian & verifikasi
- **Invarian:** controller tanpa `@Public` = wajib auth (default-deny); suspend = sesi putus seketika; token reset sekali pakai + berbatas waktu + disimpan sebagai hash; data sensitif (KTP) minimal + terproteksi + dihapus saat keluar.
- **UAT:** (1) controller baru tanpa @Public → 401; (2) suspend tenant → request berikutnya 401; (3) ADMIN coba tutup periode/ubah harga → 403 (pasca F2-16); (4) aktivasi kamar tanpa KTP verified → blocked (pasca F3-17); (5) forgot-password user tak-ada vs ada → respons identik.
- **Lintas-dossier:** OWNER-only deposit → dossier 12/13; KTP gate aktivasi → dossier 11 (booking); helper konsolidasi → dossier 14.


---
## Proposal — Meter Listrik & Air: Pascabayar Murni (normatif; keputusan owner 2026-06-16)

#### Keputusan inti

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

#### Aturan siklus meter

- **Jangkar (anchor)** per stay = tanggal tagih (mis. tiap tanggal 25; ikut check-in/renewal).
- **Jendela catat = H-10 → hari-H**. **Telat boleh** (lupa sampai ganti periode tetap valid).
- **Satu invoice meter per siklus.** Siklus diukur dari **tanggal catatan terakhir**, bukan
  kalender. Catatan berikutnya hanya boleh dibuka mulai (jendela H-10 anchor berikutnya).
  Contoh sah: catat 10 Mar lalu 25 Mar = dua siklus berurutan, masing-masing 1 nilai.
- **Pencatat:** staf / admin / owner / **mandiri tenant**.
- **Input listrik & air BERSAMA** (satu form). Baris air hanya jika toggle air ON.

#### Perhitungan

```
pemakaianKwh   = meterSekarang − meterTerakhir
tagihanListrik = max(0, pemakaianKwh − kuotaGratisKwh) × tarifPerKwh
tagihanAir     = (toggle air ON) ? max(0, pemakaianM3 − kuotaGratisM3) × tarifPerM3 : 0
```

- Saat dicatat → **auto-generate invoice meter** (baris ELECTRICITY + WATER bila aktif).
- Invoice sewa/perpanjangan diberi catatan eksplisit:
  *"Belum termasuk listrik/air — tagihan meter terbit terpisah saat dicatat."*

#### Konstanta owner-settable (Settings owner) — nyambung permintaan "konstanta di Settings"

| Kunci | Default | Catatan |
|------|---------|---------|
| `freeElectricityKwhPerMonth` | **30** | jatah gratis listrik / siklus |
| `electricityTariffPerKwhRupiah` | **2500** | tarif kelebihan (kini); per-kamar boleh override |
| `waterMeteringEnabled` | **false** | toggle: air dihitung atau tidak (belum ada meter air) |
| `waterTariffPerM3Rupiah` | (ada) | dipakai bila toggle ON |
| `freeWaterM3PerMonth` | 0 | opsional |

Sumber TUNGGAL (hindari duplikasi). Per-kamar tetap bisa override tarif bila perlu.

#### UI

- **/rooms (depan):** saat stay masuk jendela H-10 & meter belum dicatat siklus ini →
  badge **"Catat meter"** di kartu + status kamar. Angka meter terakhir tampil di detail kamar.
- **Form catat meter gabungan** (listrik+air) untuk staf/admin/owner + versi mandiri tenant.
- **"Bayar sekaligus":** kelompokkan invoice sewa + meter yang sama-sama OPEN.

---
## Bagian 6 — IoT Monitoring (KWH Tuya + Water Flow ESP32)

> **Fondasi implementasi selesai (2026-07-23); rollout hardware dan UAT masih gate.** Spek lengkap: `M15_IOT_KWH_WATER_IMPLEMENTATION_PLAN.md` + `M14_IOT_TUYA_DEVICES.md`. Telemetry tidak pernah otomatis membuat tagihan.

**Update quota energi:** aturan kanonik quota listrik ada di [keuangan.md](keuangan.md) § Quota Utilitas Berbasis Periode Sewa Lunas — **tidak diulang di sini** (dedup D-01, keputusan owner 23 Sep 2026). Catat meter/renewal tetap jalur bisnis yang menerbitkan invoice, bukan polling Tuya.

### Hardware Terpasang

| Jenis | Jumlah | Status | Integrasi |
|---|---|---|---|
| **KWH Meter Tuya per kamar** | 13 (snapshot: 11 online) | Tuya Cloud API | Polling cron 10 menit → `IotTelemetry` (bukan `MeterReading` billing) |
| **CCTV BARDI IP Camera** | 5 (4 online) | Tuya Cloud | Fase lanjutan (snapshot dashboard) |
| **Smart Lock** | 1 (online) | Tuya Cloud | Fase lanjutan (remote unlock) |
| **Water Flow D20 + ESP32-C3** | 2-3 unit (rollout hardware) | Signed HTTP POST | `/api/iot/v1/readings` (HMAC per device) |

### Arsitektur Backend (aktif)

```
ESP32-C3+D20 → signed POST /api/iot/v1/readings → IotIngestMessage + IotTelemetry
Tuya KWH Meter → Tuya Cloud API → IotPollingService (interval/cron 10 menit) → IotTelemetry
Tenant/owner → overview dan history dengan pembaruan berkala; billing tetap memakai MeterReading terpisah
```

- **1 backend** (tidak bikin backend baru — hemat RAM shared hosting)
- **Tanpa MQTT**; Tuya dipoll melalui REST dan portal tenant memakai polling terikat agar worker shared hosting tidak tertahan koneksi panjang.
- **Kredensial ESP32** disimpan terenkripsi per device dan request ditandatangani HMAC; bukan JWT pengguna.
- Endpoint cron Tuya: `POST /api/iot/tuya/cron` dengan header `X-Iot-Cron-Token`.

### Model Prisma (aktif)

- `IotDevice` — registry ESP32/Tuya, mapping kamar, credential terenkripsi
- `IotIngestMessage` — envelope idempoten/replay-safe per event atau poll
- `IotTelemetry` — metrik dinormalisasi dari water flow maupun Tuya, lengkap kualitas data
- `MeterReading` — tetap satu-satunya snapshot yang dipakai billing

### Polling dan tindak lanjut

| Sweeper | Trigger | Aksi |
|---|---|---|
| **IotPollingService** | Interval always-on atau cron tiap 10 menit | Polling perangkat Tuya aktif → simpan telemetry |
| **Anomali/kebocoran** | Belum diaktifkan sebagai auto-action | Tetap kandidat observability; perlu threshold, UAT sensor, dan keputusan operasional sebelum alert otomatis |

### Referensi

| Topik | Dokumen |
|---|---|
| Inventaris device + Device ID | `docs/M15_IOT.md` |
| Spek implementasi | memory `iot-water-kwh-spec` |
| Peta scope | `docs/M10_PETA_SCOPE.md` § IoT & Monitoring |
| Proposal meter pascabayar | `docs/M06_OPERASIONAL.md` § Bagian 5 (M-1..M-5 ✅) |

---

## Lampiran — Peta kode & coverage modul operasional (dari M06)

#### 2. Peta kode (3 jalur sinkron qty)
| Jalur | Lokasi | Lock | Validasi RETURN | Status |
|---|---|---|---|---|
| 1. Movement resmi | `inventory-movements.service.ts:43-70` | ✅ `:88` | ✅ `:94-103` | 🟢 RUJUKAN EMAS |
| 2. Laporan staf (status only) | `room-items.service.ts:115-274` | n/a | n/a | 🟢 |
| 3. Admin-review field report (boleh buat movement) | `staff-field-reports.service.ts:478-505` | ❌ | ❌ | 🔴 I-02 |

#### 2. Peta kode
| Aksi | Lokasi |
|---|---|
| Ticket CRUD + assign/close | `tickets.service.ts` |
| Auto-create CHECKOUT_INSPECTION | `stays.service.ts:605-654` (dedupe) |
| Staff work queue | `tickets.controller.ts` GET endpoint |
| KPI calculation (resolved rate, avg time) | `tickets.service.ts` / frontend dashboard |
| Staff review (tenant rating) | `reviews` module |

#### 2. Coverage matrix (verifikasi grep)
✅ ada: payment approved/rejected, booking approved/rejected, checkout created/approved/rejected, reminder H-10/H-7/H-3/H-1/H-day, forced-checkout, A17 dua-varian, notif siklus renewal, booking-dibatalkan-sweeper, announcement, review ≤2, overstay-blocked admin, prompt renewal H-10 + fallback admin tenant tanpa portal.
✅ baru (F3-1): ticket-assigned→assignee (saat assignee berubah, skip self), room-ready→OWNER/ADMIN (CHECKOUT_INSPECTION close → kamar AVAILABLE, dedupe).
❌ bolong: wifi-order TIDAK ADA event in-app (tenant pesan via WhatsApp di `WifiOrderPage`).
✅ baru: payment-submitted→OWNER/ADMIN dan prompt-review tenant setelah tiket selesai, keduanya best-effort + dedupe.
✅ RESOLVED (K-6/K-8): ticket-closed BARANG_PINDAH kini ke staf assignee (di luar tx).

#### 2. Peta kode
| Aksi | Lokasi |
|---|---|
| Login/me/forgot/reset/change | `auth.service.ts:28/75/96/152/218` |
| Guard global + @Public | `common/guards/*`, `app.module.ts` (E-1) |
| Rate limit | `common/middleware/rate-limit.middleware.ts` |
| User/tenant CRUD + portal access | `users.service.ts`, `tenants.service.ts:47/60/73` |
| File proof terproteksi (pola utk KTP) | `payment-submissions` proof endpoint + `common/utils/file-signature.util.ts` |
