# Portal Owner & Admin — Rancangan Ringkas dan Manusiawi

Tanggal: 2026-09-23
Status: aktif (rancangan + status implementasi)
Tujuan: rancangan portal ringkas Owner/Admin — prinsip desain, peran, flow OWNER, flow ADMIN, halaman pendukung, kriteria selesai, rencana, dan status implementasi (dari M17)
Rujukan: [KEPUTUSAN-OWNER](../KEPUTUSAN-OWNER.md) · [STATUS](../STATUS.md) · [scope.md](scope.md) · [flow-utama.md](arah-produk.md)

> Migrasi dari docs/M17_PORTAL_FLOW_RINGKAS.md (B5 Tahap 3, 23 Sep 2026) pada DOC-GOV-20260922; teks rancangan tidak diubah.
> Batch B5 memindahkan **seluruh isi M17 apa adanya** (L6–L213) ke file ini; empat `[x]` status implementasi ikut apa adanya dan berada di luar domain invariant (STATUS.md + docs/history).

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

---

## 10. Lapisan Keputusan AI — arah 25 Sep 2026 (rancangan, BELUM diimplementasikan)

Latar: arahan owner 25 Sep 2026 — *"manfaatkan API AI untuk membuat simpel semua data; keputusan, kondisi, dan rekomendasi cukup diklik atau dicek ke lokasi tautan yang sudah direkomendasikan AI; tidak perlu semua ditampilkan di halaman"*. Arah ini melanjutkan PROD-SIMPLE/UX-OWNER-ADMIN (22 Sep) dan menggeser titik berat dari **menata tampilan** menjadi **AI yang menyusun alur**.

### 10.1 Prinsip

1. **Halaman utama adalah hasil pemikiran, bukan tumpahan data.** Yang tampil 3–5 kartu keputusan, bukan tabel dan grafik sekaligus.
2. **AI menyusun, manusia memutuskan.** AI tidak pernah menulis data; setiap kartu berakhir di tautan terfilter atau di wizard dengan approve manusia (sejalan dengan [domain/ai.md](../domain/ai.md) pola aman dan [scope.md](scope.md) §B8).
3. **Angka pada kartu tidak boleh dikarang AI.** Semua angka berasal dari *fact pack* yang dihitung kode deterministik; AI hanya memilih, menamai sebab, dan menyusun urutan.
4. **AI mati ≠ aplikasi mati.** Wajib ada fallback rule-based dengan bentuk kartu yang sama.
5. **Tiga lapis tampilan:** `Brief` (default, kartu keputusan) · `Kerja` (papan alur/wizard untuk eksekusi) · `Data` (semua halaman lama — tetap ada, tapi tidak lagi dipromosikan sebagai navigasi utama).

### 10.2 Kontrak kartu keputusan — **pakai ulang, bukan bikin baru**

Recon 25 Sep 2026 menemukan bentuk kartu yang dibutuhkan **sudah ada** di aplikasi: `ActionQueueItem` (`frontend/src/components/command-center/ActionQueueTable.tsx:9-31`), dipakai antrean kerja ADMIN dan sudah punya renderer + eksekutor deep-link (`openActionTarget()`, baris 56–60) serta peringkat prioritas (`:43-51`). Karena itu kontrak baru **tidak** dibuat; kartu keputusan = `ActionQueueItem` + 5 field tambahan.

Sudah tersedia di `ActionQueueItem`:

| Field | Isi | Dipakai untuk |
|---|---|---|
| `priority` | BLOCKER/HIGH/MEDIUM/WARNING/OPPORTUNITY/INFO/SUCCESS | urutan & warna kartu |
| `type`, `subject`, `issue` | judul, objek, masalah | judul + 2–3 fakta kartu |
| `recommendedAction` | satu tindakan konkret | label tombol utama |
| `actionTo` | tujuan deep-link (`navigate` bila internal) | **"tinggal klik"** |
| `ruleId`, `entityType`, `entityId`, `dedupKey` | identitas & dedupe (`utils/commandCenterDedup.ts:7-20`) | mencegah kartu AI ganda dengan kartu rule |
| `deadlineLabel`, `timeStatusLabel`, `timeStatusTone` | tenggat & status waktu | kesegaran kartu |

Field yang masih perlu ditambahkan (belum ada di tipe mana pun):

| Field baru | Isi | Alasan |
|---|---|---|
| `sebab` | mengapa ini terjadi (boleh dari AI) | jawaban "kenapa" tanpa membuka halaman |
| `dampak` | apa yang berubah bila dilakukan/diabaikan | kaitan keputusan ↔ uang/okupansi (IB) |
| `sourceRefs[]` | snapshot/endpoint asal angka | menjawab "dari mana angkanya" |
| `expiresAt` | masa berlaku kartu | mencegah kartu basi tampil sebagai fakta |
| `fallback` | true bila hasil rule-based, bukan AI | transparansi & pengukuran pasca-AI |

**Batas keamanan yang wajib menyertai kontrak ini:** keluaran AI saat ini memuat `route` berupa **string bebas** dan UI belum memvalidasinya sebelum `navigate` (temuan A-1 di [audit AI 25 Sep](../audit/ai-agenda-recon-2026-09-25.md)). Kartu AI **tidak boleh** menavigasi ke string dari LLM. Rute harus dipetakan lewat allowlist deterministik (pola `ownerSignalRoute`, `frontend/src/pages/dashboard/OwnerDashboardPage.tsx:98-106`) sebelum dipakai.

### 10.3 Alur produksi kartu (pipeline)

```
1. Collector (kode)      agregat dari endpoint yang sudah ada → fact pack per domain
2. Rule engine (kode)    kondisi objektif + angka pasti + severity awal (kandidat kartu)
3. AI synthesizer        pilih 3–5 yang krusial, tulis sebab/rekomendasi/dampak, urutkan
4. Grounding validator   tolak angka/tautan yang tidak ada di fact pack → jatuh ke fallback
5. Cache                 hasil disimpan per (role, periode, snapshotHash); halaman hanya membaca
6. Aksi manusia          deep link terfilter / wizard / approve; AuditLog mencatat kartu yang dipakai
```

Langkah 1, 2, 4, dan 5 adalah kode deterministik dan **tidak memakai token**. AI hanya di langkah 3.

### 10.4 Bentuk per role

| Role | Kernel | Sumber kartu | AI? |
|---|---|---|---|
| OWNER | **Decision Deck** — 3–5 kartu keputusan + 1 skor kesehatan & 3 penyebabnya | `extraSignals` + KPI + readiness + meter | ya (sebab, prioritas, dampak) |
| ADMIN | **Papan Shift** — alur bernomor 0–5 + satu aksi berikutnya per ruang | `adminWorkLanes` + `queueItems` | ya (sebab, urutan) |
| STAFF | **Kartu tugas satu per layar** (mode Fokus, bukti foto, auto-lanjut) | checklist & tiket hari ini | tidak — deterministik (hemat biaya) |
| TENANT | **Satu kartu "langkah berikutnya"** + tombol WhatsApp | tagihan, hunian, tiket | tidak — deterministik |

Aturan hemat: AI hanya dipakai di tempat yang benar-benar butuh penalaran (OWNER, ADMIN). STAFF dan TENANT memakai kartu deterministik; AI tidak dibakar untuk pekerjaan yang sudah jelas urutannya.

### 10.5 Biaya, privasi, dan kegagalan

- Agenda dihitung **per (role, periode)**, bukan per pembukaan halaman → biaya tetap, tidak tumbuh mengikuti jumlah tampilan.
- Snapshot tetap berupa agregat tanpa PII (tanpa NIK, foto KTP, email, alamat) sesuai [domain/ai.md](../domain/ai.md) §Aturan Snapshot.
- `AI_DAILY_REQUEST_LIMIT` / budget guard yang berlaku tetap dipakai; `usage` tetap ditampilkan kecil bila tersedia.
- Kuota habis, key belum diisi, atau provider gagal → tampil kartu fallback deterministik **tanpa pesan galat** ke pengguna.

### 10.6 Benturan aturan — **SELESAI** (diputuskan owner 25 Sep 2026)

Dua aturan kanonik berbenturan dengan pengalaman yang diminta:

| Aturan berlaku | Bunyi | Benturan |
|---|---|---|
| [domain/ai.md](../domain/ai.md) §Pola Terlarang | "AI berjalan otomatis saat dashboard dibuka" | Agenda yang sudah siap saat owner membuka Kokpit tampak seperti pelanggaran huruf aturan |
| [scope.md](scope.md) §B8 | "AI FLOW (Tombol Manual Owner/Admin → Draft → Approve → Audit)" | Alur kanonik mengandaikan tombol manual ditekan lebih dulu |

**Resolusi yang ditetapkan owner (entri "2026-09-25 — Dua mode", `CEPAT-AI-JADWAL`):** agenda AI dihitung **terjadwal 1× sehari** lalu disimpan, dan **halaman hanya membaca**. Membuka halaman tidak pernah memanggil AI, sehingga tidak ada biaya per tampilan dan tidak ada tulisan otomatis — dua larangan yang relevan tetap utuh, termasuk UAT Fase G item 1. Tombol "Perbarui agenda" tetap ada di luar jadwal. Rumah simpanannya memakai antrean draft `AiDraft` (G9) yang sudah ada.

Keputusan lanjutan yang menyertainya: AI **hanya untuk OWNER**; biaya ditampilkan hanya ke OWNER dengan target ≤ Rp 50.000/bulan; dan AI mati tidak boleh mengosongkan halaman. Rincian perilaku: [mode-cepat.md](mode-cepat.md) §5–§6.

Konsekuensi yang sudah diputuskan:

- Agenda dihitung **terjadwal**, halaman **membaca**. Rumah simpanan: `AiDraft` (G9; `backend/src/modules/owner-ai/ai-draft.service.ts` + `ai-draft.controller.ts`) dengan status `DRAFT → APPLIED/REJECTED/EXPIRED` dan retensi 60 hari — **tanpa schema baru**.
- **Ketergantungan yang belum terbukti:** pemicu terjadwal di produksi (cron AutoOps masih terbuka di [STATUS](../STATUS.md) §3). Sampai terbukti, jalur tombol manual yang dipakai — dan itu tidak menghambat, karena kartu aturan tidak bergantung pada AI.

### 10.7 Kriteria selesai

1. OWNER dapat menyebut 3 keputusan bulan ini dalam < 60 detik tanpa membuka menu.
2. ADMIN dapat menyelesaikan satu tugas langsung dari kartu, tanpa mencari menu.
3. Setiap kartu punya tepat satu aksi primer + tautan "kenapa" (lihat `facts`/`sourceRefs`).
4. Dengan AI dimatikan atau kuota habis, halaman tetap menampilkan kartu (fallback) dan tidak menampilkan galat.
5. Tidak ada angka pada kartu yang tidak dapat ditelusuri ke fact pack.
6. Navigasi menyusut menjadi 3–4 pintu utama; route lama tetap terjangkau lewat pencarian dan tautan kartu.

## 11. Arahan kerja lanjutan (checklist ada di STATUS)

Rancangan di §10 dipotong menjadi task bernomor agar dapat dieksekusi satu per satu. **Antrean resmi tetap [STATUS](../STATUS.md)** — daftar berikut hanya ringkasan arah:

| ID | Pekerjaan | Prasyarat |
|---|---|---|
| `AIDL-01` | Kontrak kartu (`ActionQueueItem` + `sebab`/`dampak`/`sourceRefs`/`expiresAt`/`fallback`) + mesin kartu **aturan** lintas role, termasuk fallback | tidak ada |
| `AIDL-02` | Shell Mode Cepat `/cepat` + percabangan login + saklar header + pemetaan saklar lama | `AIDL-01` |
| `AIDL-03` | Allowlist rute + tautan rekomendasi AI yang bisa diklik (OWNER) | `AIDL-02` |
| `AIDL-04` | Agenda AI terjadwal 1×/hari + strip biaya/kuota | `AIDL-03` + `AI-USAGE-01` + pemicu terjadwal terbukti |
| `AIDL-05` | Kirim ringkasan WhatsApp + cetak (OWNER/ADMIN) | `AIDL-02` |
| `AIDL-06` | Tinjau adopsi 30 hari | `AIDL-02` dirilis dan dipakai |
| `AI-USAGE-01` | Catat usage token + konstanta harga (menutup temuan A-5/A-6) | tidak ada |

Urutan ini menaruh **mesin kartu aturan lebih dulu**: ia melayani ADMIN, STAFF, dan TENANT sepenuhnya serta menjadi jalur fallback OWNER — sehingga penyederhanaan sudah terasa **tanpa satu rupiah token pun**. AI (`AIDL-03`/`AIDL-04`) hanya menambah kualitas sebab dan prioritas di atasnya.

**Perubahan dari rancangan 25 Sep sebelumnya (setelah keputusan "Dua mode"):** item lama `AIDL-01` (menampilkan `route` AI) bergeser menjadi `AIDL-03`; item lama `AIDL-05` (penyederhanaan navigasi halaman Normal) **dibatalkan** — digantikan oleh Mode Cepat; dan urutan `AIDL-02`/`AIDL-03` bertukar karena mesin kartu aturan kini menjadi fondasi, bukan tahap sementara. Rincian permukaan dua-mode: [mode-cepat.md](mode-cepat.md).
