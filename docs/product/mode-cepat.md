# Mode Cepat (`/cepat`) — Rancangan Dua Halaman Berdampingan

Tanggal: 2026-09-25
Status: **keputusan owner terkunci; implementasi BELUM dimulai**
Tujuan: merancang halaman "Mode Cepat" sebagai permukaan kerja baru untuk semua role, hidup berdampingan dengan halaman Normal yang sekarang, tanpa menyentuh halaman Normal.
Rujukan: [KEPUTUSAN-OWNER](../KEPUTUSAN-OWNER.md) (entri 25 Sep 2026 "Dua mode") · [ANTREAN](../ANTREAN.md) (antrean resmi) · [portal-owner-admin.md](portal-owner-admin.md) §10 (kontrak kartu) · [domain/ai.md](../domain/ai.md) §G10 · [audit recon AI](../audit/ai-agenda-recon-2026-09-25.md) · [scope.md](scope.md) §B8

> Dokumen ini adalah rumah kanonik untuk **permukaan dua-mode**. Pembagian tugas dokumen: [portal-owner-admin.md](portal-owner-admin.md) §10 mengatur **bagaimana kartu keputusan diproduksi** (kontrak, pipeline, aturan AI); dokumen ini mengatur **bagaimana dua halaman berperilaku** (rute, alur login, per role, biaya, kirim/cetak).

---

## 1. Keputusan owner yang mengikat (25 Sep 2026)

| ID | Keputusan |
|---|---|
| `DUA-MODE` | Setelah login tersedia **dua halaman berdampingan**: **Mode Cepat** dan **Normal**. Bukan migrasi paksa; keduanya hidup bersama. |
| `CEPAT-SHELL-PARALEL` | Mode Cepat dibangun sebagai **shell paralel di route baru** (`/cepat`). Halaman Normal **tidak disentuh** — nol perubahan pada `AppLayout`, sidebar, dan CSS halaman lama. Rombak total hanya berlaku untuk halaman Mode Cepat. |
| `CEPAT-NAMA` | Label **"Mode Cepat"**, route **`/cepat`**. |
| `CEPAT-AI-OWNER` | **Hanya OWNER** yang memanggil AI. ADMIN, STAFF, dan TENANT memakai kartu **deterministik** (tanpa AI, tanpa biaya, tanpa tulisan biaya). |
| `CEPAT-AI-JADWAL` | Agenda AI dihitung **terjadwal 1× sehari** lalu disimpan; membuka halaman **tidak pernah** memanggil AI. Tombol "Perbarui agenda" tetap ada sebagai jalur manual. |
| `CEPAT-AI-MATI` | Saat AI mati, kuota habis, atau key belum diisi: Mode Cepat **tetap tampil penuh** dengan kartu aturan. OWNER melihat strip kecil "AI tidak aktif" + tombol coba lagi. Tidak ada halaman kosong, tidak ada galat. |
| `CEPAT-BIAYA` | Transparansi biaya **hanya untuk OWNER**. Target biaya **≤ Rp 50.000/bulan**. Angka rupiah baru ditampilkan **setelah** pencatatan usage nyata tersedia (`AI-USAGE-01`); sebelum itu yang jujur ditampilkan adalah **kuota**, bukan rupiah. |
| `CEPAT-PILIH` | Layar pilih-mode setelah login **hanya untuk OWNER dan ADMIN**. STAFF dan TENANT langsung masuk Mode Cepat. |
| `CEPAT-SAKLAR` | **Saklar permanen** `Cepat ←→ Normal` di header, satu klik, tanpa login ulang, pilihan diingat per pengguna. |
| `CEPAT-DEFAULT` | Owner menetapkan **default mode per role**; pengguna **selalu boleh mengganti sendiri**. |
| `CEPAT-KOSAKATA` | Kosakata final: **Cepat · Normal**. "Lengkap" menjadi bagian dari Normal, bukan mode ketiga. Saklar lama (`admin-density`, owner compact/full) **dipetakan**, bukan ditambah. |
| `CEPAT-GANTI-AIDL05` | Mode Cepat **menggantikan** rencana penyederhanaan navigasi `AIDL-05`. Sidebar halaman Normal tidak diubah. |
| `CEPAT-KIRIM` | Mode Cepat menyediakan **kirim ringkasan ke WhatsApp** dan **cetak**, hanya OWNER/ADMIN. Batas: tanpa NIK, tanpa foto, tanpa alamat; panjang teks dibatasi. |
| `CEPAT-ADMIN-AI-OPSI` | Tombol AI on-demand untuk ADMIN dicatat sebagai **opsi resmi yang belum dikerjakan** (syarat: maksimal 1–2 permintaan/hari, hanya atas penekanan tombol). |
| `CEPAT-ADOPSI` | Keberhasilan diukur: **tinjau adopsi setelah 30 hari pemakaian**. Jika Mode Cepat tidak dipakai, yang diperbaiki adalah isi kartunya — bukan menambah fitur. |

**Yang tidak berubah oleh keputusan ini:** nominal uang, tarif, aturan DP/deposit, jurnal, permission, status hunian, kontrak API, dan pola aman AI ([domain/ai.md](../domain/ai.md) §Pola Aman). Tidak ada schema baru.

---

## 2. Dua halaman berdampingan

| Aspek | **Mode Cepat** (`/cepat`) | **Normal** (sekarang) |
|---|---|---|
| Isi | 3–5 kartu keputusan + papan kerja | Sidebar + dashboard + tabel + laporan |
| Sumber kartu | Aturan (semua role) ∪ AI (OWNER saja) | — |
| Dipakai untuk | "Apa yang harus saya kerjakan/putuskan sekarang" | Mencari, mengaudit, mengoreksi, ekspor |
| Route | **baru** | **tidak diubah sama sekali** |
| Shell | komponen layout baru | `AppLayout` yang ada |
| Risiko regresi | rendah (kode baru) | **nol** (tidak disentuh) |
| Rollback | matikan flag / hapus menu | tidak perlu |

Prinsip: Mode Cepat **tidak menggantikan** halaman Normal. Setiap kartu yang butuh kedalaman memberi tautan ke halaman Normal pada lokasi yang sudah terfilter — dan menyediakan jalan kembali.

---

## 3. Perilaku setelah login

```
login sukses
  ├─ OWNER / ADMIN  → layar pilih-mode (Cepat atau Normal)  → shell terpilih
  └─ STAFF / TENANT → langsung Mode Cepat                    (saklar tetap tersedia)
```

- **Default per role** ditetapkan OWNER di Pengaturan; pengguna boleh mengganti kapan saja (`CEPAT-DEFAULT`).
- **Saklar header** selalu tampil di kedua shell: `[ Cepat | Normal ]`. Perpindahan tidak memuat ulang sesi.
- Pilihan terakhir pengguna **diingat** (per pengguna, per perangkat).
- STAFF/TENANT tidak melihat layar pilih-mode karena Mode Cepat mereka gratis dan deterministik — memilih di antara keduanya hanya menambah langkah tanpa makna (`CEPAT-PILIH`).
- Titik sambung kode yang sudah ada: `getDefaultRoute(role, tenantStage)` di `frontend/src/config/navigation.ts` — percabangan role sudah punya rumahnya.

**Kosakata & pensiun saklar (`CEPAT-KOSAKATA`).** Saat ini sudah ada `admin-density` (Ringkas/Lengkap) dan mode owner compact/full. Setelah Mode Cepat ada, pemetaannya:

| Saklar lama | Nasib |
|---|---|
| `admin-density` = Ringkas | menjadi Mode Cepat (bukan saklar kedua di dalam Normal) |
| `admin-density` = Lengkap | menjadi Normal |
| owner `Ringkas` | menjadi Mode Cepat |
| owner `Lengkap` | menjadi Normal |

Aturan: **jangan sampai pengguna menghadapi dua saklar yang artinya mirip.** Saat Mode Cepat dirilis untuk satu role, saklar lama role itu dinonaktifkan.

---

## 4. Bentuk Mode Cepat per role

### 4.1 OWNER — satu-satunya pemakai AI

```
┌ ── Mode Cepat ─────────────────────  [ Normal ] ┐
│ Skor kesehatan 78/100 ▲+4   Agustus 2026        │
│ AI: agenda dibuat 05:31 · sisa kuota 12/20      │  ← strip biaya: OWNER saja
│                              [ Perbarui agenda ]│
├─────────────────────────────────────────────────┤
│ ⛔ 4 kamar kosong > 30 hari                     │
│    sebab: 2 kamar AC rusak                      │
│    dampak: potensi kehilangan ±Rp X/bulan       │
│    [ Lihat kamar ]   kenapa?                    │
│ ⚠ Margin turun 6% vs Juli → [ Lihat rincian ]   │
│ ✓ 3 area lain aman                              │
└─────────────────────────────────────────────────┘
```

### 4.2 ADMIN — deterministik, tanpa AI

```
┌ ── Mode Cepat ─────────────────────  [ Normal ] ┐
│ Urutan kerja: 0 KTP · 1 Booking · 2 Bayar ·     │
│               3 Renew · 4 Checkout · 5 Blocker  │
├─────────────────────────────────────────────────┤
│ Aksi berikutnya: Review booking Ani (kamar 12)  │
│ sisa 2 jam                        [ Review → ]  │
├─────────────────────────────────────────────────┤
│ [ Booking · 3 ] [ Bayar · 2 ] [ Ops · 1 ]       │
│ [ Kirim ringkasan shift ]  [ Cetak ]            │
└─────────────────────────────────────────────────┘
```

Sumber angka sudah ada: `useOperationalStressIndex` (`frontend/src/hooks/useOperationalStressIndex.ts`), `priorityActionFromQueue` (`frontend/src/pages/dashboard/dashboardShared.tsx`), dan `adminWorkLanes` (`frontend/src/pages/dashboard/DashboardAdmin.tsx`). **Tidak ada permintaan AI** di role ini.

### 4.3 STAFF — satu tugas per layar

```
┌ Mode Cepat ─────────────────── Tugas 2 dari 6 ┐
│ Cuci AC kamar 12 (penghuni: Sari)             │
│ 3 langkah · ±20 menit                         │
│ [ Ambil bukti ]   [ Selesai & lanjut ]        │
│ ▸ Sisa hari: kebersihan lorong, stok sabun    │
└───────────────────────────────────────────────┘
```

### 4.4 TENANT — satu langkah berikutnya

```
┌ Mode Cepat ───────────────────────────────────┐
│ Langkah berikutnya: bayar tagihan September   │
│ Rp 1.250.000 · jatuh tempo 28 Sep (4 hari)    │
│ [ Bayar sekarang ]   [ Tanya via WhatsApp ]   │
│ Kamar 12 · sewa s/d 30 Sep · listrik 42 kWh   │
└───────────────────────────────────────────────┘
```

---

## 5. Aturan AI di Mode Cepat

Batas ini **tidak boleh dilonggarkan tanpa keputusan owner baru**:

1. **AI hanya OWNER.** ADMIN/STAFF/TENANT tidak punya jalur AI di Mode Cepat.
2. **AI tidak berjalan saat halaman dibuka.** Agenda dihitung penjadwal 1× sehari dan disimpan (rumah simpanan: antrean draft `AiDraft`, G9, sudah ada). Membuka halaman = membaca. Biaya per tampilan **nol**.
3. **AI tidak menulis data.** Kartu berakhir di tautan terfilter, wizard, atau approve manusia; mutasi tetap lewat endpoint domain.
4. **Angka hanya dari snapshot.** AI tidak boleh membuat angka yang tidak ada di snapshot; jika kurang → `missingData`.
5. **Rute dari AI tidak boleh langsung dieksekusi.** Wajib lolos allowlist deterministik sebelum `navigate` (temuan A-1; pola fungsi `ownerSignalRoute` di `frontend/src/pages/dashboard/OwnerDashboardPage.tsx`).
6. **Kartu = aturan ∪ AI, jangan pernah AI saja.** Ini penjamin anti-bolong: kalau AI lupa menyebut sesuatu, kartu dari aturan tetap tampil.
7. **AI mati ≠ halaman mati** (`CEPAT-AI-MATI`).

Catatan konsistensi aturan: pola "agenda terjadwal lalu disimpan" **tidak melanggar** Larangan "AI berjalan otomatis saat dashboard dibuka" maupun UAT Fase G item 1, karena tidak ada pemanggilan AI pada peristiwa membuka halaman. Batas ini dicatat di [domain/ai.md](../domain/ai.md) §G10.

---

## 6. Biaya AI (`CEPAT-BIAYA`)

**Target:** ≤ Rp 50.000/bulan untuk seluruh pemakaian AI (hanya OWNER).

Mekanisme penjaga:

| Penjaga | Nilai |
|---|---|
| Frekuensi terjadwal | **1 permintaan/hari** |
| Jalur manual | tombol "Perbarui agenda", tetap dibatasi kuota harian yang ada |
| Batas keluaran | `AI_MAX_OUTPUT_TOKENS` yang sudah ada |
| Masukan | snapshot agregat (bukan tabel mentah), sesuai [domain/ai.md](../domain/ai.md) §Aturan Snapshot |
| Cache | hasil disimpan; tidak ada pemanggilan per pembukaan halaman |
| Tampilan | strip biaya/kuota **hanya OWNER** |

**Prasyarat jujur:** `usage` token saat ini **tidak dipersistensi** (temuan A-6) dan `AuditLog.meta.ai` **tidak pernah ditulis** (temuan A-5). Karena itu:

- Sebelum `AI-USAGE-01` selesai: strip hanya menampilkan **kuota**, bukan rupiah.
- Setelah usage nyata terkumpul: angka rupiah dihitung dari satu konstanta harga, lalu target di atas **diverifikasi atau dikoreksi** — bukan diklaim.

Menampilkan rupiah tanpa dasar pencatatan = mengarang angka, dan itu dilarang aturan AI kita sendiri.

**Ketergantungan pemicu terjadwal:** "otomatis 1× sehari" memerlukan penjadwal yang benar-benar berjalan di produksi. Cron AutoOps saat ini **belum terpasang** (STATUS §3, prasyarat #3) dan keberadaan penjadwal internal **UNKNOWN**. Karena itu `AIDL-04` wajib memverifikasi pemicunya lebih dulu; sampai terbukti, agenda berjalan lewat tombol manual (Mode Cepat tetap berfungsi penuh karena kartu aturan tidak butuh AI).

---

## 7. Anti-bolong: tiga aturan yang membuatnya teruji

1. **Kartu = aturan ∪ AI.** Tidak ada kondisi di mana satu-satunya sumber kartu adalah AI.
2. **Setiap aksi selesai di dalam Mode Cepat** (wizard/drawer), atau jika harus menyerahkan ke halaman Normal, handoff harus eksplisit **dan** ada tombol kembali yang mendarat di Mode Cepat — bukan dilempar ke daftar tabel tanpa jalan pulang.
3. **Matriks 6 flow × langkah diuji.** Keenam flow utama (`FLOW-CORE-CAKUPAN`: penghuni masuk, tagihan & verifikasi pembayaran, perpanjangan, checkout/deposit, pengeluaran, dashboard harian) dipecah per langkah; setiap langkah wajib punya pintu masuk yang bekerja di Mode Cepat. "Tidak bolong" dibuktikan lewat daftar itu, bukan lewat klaim.

---

## 8. Kirim & cetak (`CEPAT-KIRIM`)

- Tombol tersedia untuk **OWNER dan ADMIN** saja.
- **Kirim ke WhatsApp** memakai tautan `wa.me` berisi teks ringkasan yang dibuat sistem (bukan AI), mis. serah terima shift: apa yang selesai, apa yang menggantung, apa yang menunggu owner.
- **Cetak** memakai pola yang sudah ada (`StaffReportPrintButton`).
- **Batas privasi:** tanpa NIK, tanpa foto identitas, tanpa alamat lengkap, tanpa nomor rekening. Nama penghuni dan nominal boleh (dipakai untuk bekerja oleh role yang memang berhak).
- **Batas teknis:** teks ringkasan dibatasi panjangnya karena URL punya limit; ringkasan harus versioned agar formatnya stabil.

---

## 9. Yang sengaja TIDAK diubah

- Halaman Normal: `AppLayout`, sidebar, `navigation.ts`, seluruh halaman modul, dan CSS halaman lama — **nol perubahan**.
- Kontrak API dan endpoint yang ada: tidak ada endpoint publik baru.
- Invariant uang, huni, permission, dan status.
- Schema database: **tidak ada tabel baru** (rumah simpanan memakai `AiDraft` yang sudah ada).
- Gate yang sedang terbuka (AO-14, AO-23, EF, dll.) tidak dibatalkan dan tidak diubah.

---

## 10. Kriteria selesai

1. OWNER dapat berpindah `Cepat ↔ Normal` dalam satu klik, tanpa login ulang, dan pilihannya diingat.
2. STAFF dan TENANT langsung masuk Mode Cepat tanpa layar pilihan.
3. ADMIN dan STAFF dapat menyelesaikan satu tugas penuh dari dalam Mode Cepat.
4. Dengan AI dimatikan, kuota habis, atau key kosong: Mode Cepat tetap tampil penuh dengan kartu aturan; tidak ada galat.
5. Dengan AI aktif: membuka Mode Cepat **tidak** memicu permintaan AI (dibuktikan lewat log/usage).
6. Tidak ada `navigate` ke rute yang tidak lolos allowlist.
7. Halaman Normal terbukti tidak berubah (diff bersih pada berkas shell lama).
8. Keenam flow utama dapat diselesaikan tanpa keluar dari Mode Cepat tanpa jalan pulang.

**Ukuran adopsi (`CEPAT-ADOPSI`, ditinjau setelah 30 hari):**

- Berapa sering OWNER/ADMIN membuka Mode Cepat dibanding Normal.
- Berapa banyak kartu yang benar-benar diklik (bukan hanya dilihat).
- Jika rendah: yang diperbaiki adalah **isi dan urutan kartu**, bukan menambah fitur.

---

## 11. Opsi resmi yang BELUM dikerjakan

| Opsi | Syarat bila diaktifkan |
|---|---|
| Tombol AI on-demand untuk ADMIN (`CEPAT-ADMIN-AI-OPSI`) | maksimal 1–2 permintaan/hari, hanya atas penekanan tombol, tidak pernah otomatis; wajib lewat gate yang sama (allowlist rute, snapshot, fallback) |
| Menggerakkan `/cek` dari generator/endpoint publik | keputusan owner tersendiri; halaman publik berisi data operasional dan pernah digerbang lalu dibuka kembali |

---

## 12. Risiko & batas yang diketahui

| Risiko | Dampak | Mitigasi |
|---|---|---|
| Mode Cepat tidak dipakai (halaman Normal tetap jadi kebiasaan) | seluruh penyederhanaan tidak terasa | ukur adopsi 30 hari; perbaiki isi kartu, bukan menambah fitur |
| Penjadwal harian tidak tersedia di produksi | agenda otomatis tidak jalan | verifikasi pemicu sebelum `AIDL-04`; tombol manual sebagai jalur yang tetap bekerja |
| Angka biaya belum dapat dibuktikan | owner tidak bisa memverifikasi target Rp 50.000 | tampilkan kuota sampai `AI-USAGE-01` selesai |
| Shell baru menambah permukaan yang harus dirawat | dua tempat perbaikan bug | reuse hook data & `command-center/*`, bukan menulis ulang logika |
| Ringkasan WhatsApp membawa data keluar aplikasi | kebocoran data | batas PII, panjang teks, hanya OWNER/ADMIN |

**Batas dokumen ini:** rancangan dan keputusan arah. Belum ada implementasi, verifikasi, atau pengukuran runtime; seluruh angka rupiah adalah **target**, bukan hasil.

---

## 13. Antrean (kanonik di STATUS)

| ID | Pekerjaan | Prasyarat |
|---|---|---|
| `AIDL-01` | Kontrak kartu + mesin kartu **aturan** lintas role (termasuk fallback) | tidak ada |
| `AIDL-02` | Shell Mode Cepat `/cepat` + percabangan login + saklar header + pemetaan saklar lama | `AIDL-01` |
| `AIDL-03` | Allowlist rute + tautan rekomendasi AI yang bisa diklik (OWNER) | `AIDL-02` |
| `AIDL-04` | Agenda AI terjadwal 1×/hari + strip biaya/kuota | `AIDL-03` + `AI-USAGE-01` + pemicu terjadwal terbukti |
| `AIDL-05` | Kirim ringkasan WhatsApp + cetak (OWNER/ADMIN) | `AIDL-02` |
| `AIDL-06` | Tinjau adopsi 30 hari | `AIDL-02` dirilis dan dipakai |
| `AI-USAGE-01` | Catat usage token + konstanta harga (menutup temuan A-5/A-6) | tidak ada |

---

## 14. Pembaruan 2026-09-25 (lanjutan) — dua desain dan aturan sewa penghuni

Ditambahkan setelah owner meninjau rancangan role TENANT. **Bagian ini mengembangkan §1–§13; yang bertentangan di bawah ini dinyatakan digantikan.** Register keputusan: [KEPUTUSAN-OWNER](../KEPUTUSAN-OWNER.md) entri "2026-09-25 — Dua desain (Lama/Baru) dan aturan sewa penghuni".

### 14.1 Yang berubah dari §1–§13

| Semula (§1–§13) | Menjadi |
|---|---|
| Kosakata "Cepat · Normal" (`CEPAT-KOSAKATA`) | **"Desain Lama · Desain Baru"** — Desain Lama = UI sekarang, Desain Baru = Mode Cepat |
| Halaman Normal hidup berdampingan, pengguna memilih | **Owner memilih tampilan untuk semua role**; pengguna tetap boleh mengganti sendiri; **aturan backend berlaku sama di kedua desain** |
| TENANT "satu kartu langkah berikutnya + WhatsApp" (bentuk ringkas) | **Rancangan 21 layar** yang mencakup seluruh pekerjaan penghuni, tanpa bergantung pada halaman Normal |

Yang **tetap berlaku**: AI hanya OWNER (§5), kartu = aturan ∪ AI (§7), agenda terjadwal lalu dibaca (§5), halaman lama tidak dirombak (§9), dan gate yang terbuka tidak dibatalkan.

### 14.2 Aturan sewa penghuni (ringkas; rincian di KEPUTUSAN-OWNER)

1. **Harga lama dipegang** selama kos dan bayar tepat waktu (`Stay.agreedRentAmountRupiah` vs `Room.monthlyRateRupiah`).
2. **Lewat jatuh tempo → dihitung penghuni baru:** hanya DP 30%, harga sekarang, boleh tinggal **5 hari**; kamar dapat ditawarkan di iklan.
3. **Bila 5 hari itu juga lewat:** kamar ditawarkan kembali, **DP hangus**, dan itu **selalu diinformasikan**; **deposit titipan dikembalikan**; staff membersihkan kamar dalam 3 jam.
4. **Tidak ada aturan "menunggak >30 hari"** — manual penghuni masih memuatnya dan harus diperbaiki.
5. **Ganti kontrak sewa** (bulanan ⇄ 2 mingguan ⇄ mingguan ⇄ harian) memakai rumus yang sama dari harga dasar, bila diambil **sebelum** jatuh tempo.
6. **Listrik & air sudah termasuk** untuk 2 mingguan, mingguan, dan harian; **kembali ke bulanan → memotret angka meter kWh sebagai acuan baru**.
7. **Prabayar/tambah masa pakai 1–24 bulan** lewat halaman penghuni (endpoint sudah ada), diblokir bila masih ada tagihan belum lunas.
8. **Kebersamaan/timeline & engagement** boleh ditampilkan; dilarang kelangkaan palsu, papan peringkat yang mempermalukan, dan menahan informasi.

### 14.3 Konsekuensi teknis yang sudah terverifikasi ada

| Kebutuhan | Yang sudah ada |
|---|---|
| Prabayar | `POST /stays/:id/prepay-extension` + `PrepayExtensionService` (jurnal, pengakuan bertahap, poin loyalitas) |
| Harga lama vs harga sekarang | `Stay.agreedRentAmountRupiah`, `Stay.pricingTerm`, `Room.monthlyRateRupiah` per satuan waktu |
| Rumus harga | `pricing.helper.ts` (`PRICING_MULTIPLIERS`: 13% / 50% / 75% / 100% / 5,7× / 11×, dibulatkan per Rp 5.000) |
| Listrik termasuk untuk kontrak pendek | `isUtilitiesIncludedForPricingTerm` |
| Kamar bekas keluar paksa | skema mencatat: status pembersihan oleh staff, **sudah boleh dipesan dengan DP** (keputusan owner 2026-06-11) |
| Timeline masa sewa | `StayHistoryTimeline` (4 langkah + progress deposit) |
| Catat meter dengan foto | tombol Catat Meter + halaman Energi |

### 14.4 Yang belum ada, dan karena itu tercatat sebagai pekerjaan

- Route `/cepat` **belum terdaftar** di `App.tsx`; seluruh Desain Baru masih rancangan.
- Halaman penghuni untuk **prabayar**, **ganti kontrak sewa**, **DP hangus**, dan **acuan meter baru** belum ada.
- **Mekanisme iklan kamar**, **hitungan 5 hari**, dan **pemberitahuan otomatis** DP hangus belum ada.
- Pemicu terjadwal harian (cron) masih terbuka seperti dicatat di §6.
- Kewenangan penghuni memicu prabayar sendiri belum diperiksa (endpoint yang ada bersifat aksi admin/owner).

### 14.5 Peta alur seluruh halaman

Sebelum role TENANT difinalkan, seluruh halaman yang ada dipetakan dalam satu berkas: [design/alur-semua-halaman.html](../../design/alur-semua-halaman.html) — flowchart lima lapis, kartu per bagian dengan tampilan depan, dan daftar seluruh rute `App.tsx`. Berkas itu diverifikasi otomatis: setiap rute di `App.tsx` wajib muncul di peta, dan rute karangan akan menggagalkan pemeriksa (`design/.preview/check-alur.mjs`).

---