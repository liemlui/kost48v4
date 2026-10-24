# TASK — Katalog `/rooms`, heatmap ketersediaan, dan wizard-first lintas role

> **Blok baca** · Jenis: **dokumen kerja tugas** · Status: **aktif — fase A (katalog tersedia + heatmap + skor peluang + wizard pembuka) sudah live; Program "ROOMS & AKUN V2" di §8 (kode S3–S6 ada, belum di-deploy)** · Untuk siapa: agen pelaksana + owner
> · Baca kalau: mengerjakan katalog kamar publik, heatmap ketersediaan, prediksi kamar kosong, atau wizard pembuka di beranda tiap role. · **Jangan** dibaca kalau: memilih tugas (itu [ANTREAN](../ANTREAN.md)) atau mencari aturan bisnis (itu [domain/keuangan.md](../domain/keuangan.md)).

Bentuk 7 bagian, tanpa kotak otoritatif — status pekerjaan tetap di [ANTREAN §3](../ANTREAN.md) baris `W-OWN-019`/`W-OWN-020`.

## Goal & todos

**Goal.** (1) `https://kost48surabaya.com/rooms` **default menampilkan kamar yang tersedia**, dengan ringkasan ketersediaan yang mudah dibaca di ponsel (heatmap/timeline, bukan tabel lebar). (2) Setiap kamar punya **perkiraan peluang kosong** dari data yang sudah ada (tanggal masuk, akhir kontrak, status perpanjangan, lama tinggal) — ditampilkan jujur sebagai perkiraan. (3) Beranda **tenant, staff, admin, owner** dibuka dengan **wizard jalan pintas** (“mau apa hari ini?”) dan tombol **lewati** ke tampilan penuh.

| Langkah | Status | Bukti penutup |
|---|---|---|
| 1. `/rooms` default `avail=bookable` + chip "Tersedia" aktif | **selesai 22 Okt** | `PublicRoomsPage.tsx`: `availParam === null ? "bookable"`; chip "Tersedia" aktif di render produksi |
| 2. Ringkasan ketersediaan mobile-first (heatmap/timeline) | **selesai 22–23 Okt** | `AvailabilityHeatmap.tsx` — kalender bulanan; sejak 23 Okt sel hanya memuat kamar yang MULAI kosong di tanggal itu |
| 3. Skor peluang kosong per kamar + label | **selesai 22 Okt** | `utils/vacancyEstimate.ts` (`estimateVacancy`, `estimateVacancyOnDate`) + 18 test; `utils/vacancyCalendar.ts` + 9 test |
| 4. Wizard pembuka tenant | **selesai 22 Okt** | `components/common/QuickStartWizard.tsx` dipakai `ActiveStayContent` ("Apa yang mau kamu kerjakan?"), tombol lewati diingat per user |
| 5. Wizard pembuka staff/admin/owner | **selesai 22 Okt** | `QuickStartWizard` scope 4 role; `AppLayout` tidak berubah |
| 6. Gate + deploy | **selesai 23 Okt** | tsc FE/BE 0, vitest 62 berkas/351 test, check-fitur 58/80, check-docs BERSIH; deploy client build `Z1Qr7_YnZFAK` + smoke produksi |

## 1. Tujuan & definisi selesai

1. **Default jujur.** Membuka `/rooms` tanpa parameter menampilkan **kamar yang bisa dipesan** (bookable), bukan seluruh 13 kamar. Filter “Semua” tetap ada sebagai pilihan eksplisit.
2. **Ringkasan ketersediaan mudah dipahami.** Tabel 7 hari diganti **heatmap/timeline per kamar** yang terbaca di 390 px: satu baris per kamar, blok warna per hari, legenda ringkas, ketuk kamar → detail. Tabel lama boleh dipertahankan sebagai tampilan “rinci” opsional.
3. **Peluang kosong.** Setiap kamar terisi punya **skor 0–100** + label (“Cenderung kosong ≤7 hari”, “Mungkin”, “Cenderung lanjut”) dari heuristik yang bisa diuji, dengan catatan “perkiraan, bukan janji”. Tidak menampilkan nama penghuni di halaman publik.
4. **Wizard lebih dulu.** Halaman pertama tiap role = wizard aksi (3–6 pilihan) + tombol **“Lewati, tampilkan semua”**. Wizard hanya jalan pintas: tidak menyimpan data pribadi, tidak menggantikan navigasi penuh.
5. **Mobile-first.** Wizard dan heatmap dirancang 390 px dulu, lalu 768/1440. Target: aksi terpenting ≤1 ketuk dari beranda.
6. **Tidak merusak yang sudah ada.** Filter, sortir, bandingkan, paginasi, PWA, dan rute lama tetap bekerja; `check-fitur` hijau.

## 2. Kondisi awal + cara mengukur ulang

| Bagian | Keadaan 21 Okt 2026 | Bukti |
|---|---|---|
| Rute katalog | `/rooms` → `RoomsRouteEntry` → `PublicRoomsPage` | `frontend/src/pages/rooms/RoomsRouteEntry.tsx`, `PublicRoomsPage.tsx` |
| Filter default | `avail` kosong → **semua kamar** tampil (13), termasuk yang terisi | `PublicRoomsPage.tsx` — `const avail = (searchParams.get("avail") ?? "")` |
| Ringkasan ketersediaan | `RichAvailabilityCalendar` 330 baris, matriks 7 hari (tabel), legend warna | `frontend/src/components/public/RichAvailabilityCalendar.tsx`; CSS `11-public-pages.css` blok `PUB-CALENDAR` |
| Data kalender (publik) | `/public/rooms/availability-calendar`: `checkInDate`, `plannedCheckOutDate`, `remainingDays`, `hasPendingRenew`, `renewStatus`, `dpTenantName`, `currentTenantName`, `days[7]` | `backend/src/modules/marketing/marketing-public-rooms.service.ts` |
| Halaman ketersediaan lain | `/okupansi`, `/update-kamar`, `/availability-setup` (wizard ketersediaan yang sudah ada) | `frontend/src/App.tsx`, `pages/public/OkupansiPage.tsx`, `PublicAvailabilityWizardPage.tsx` |
| Wizard yang sudah ada | `GuestPreferenceWizard` (4 pertanyaan preferensi) di katalog; Mode Cepat `/cepat` untuk OWNER/ADMIN | `components/public/GuestPreferenceWizard.tsx`, `pages/cepat/**`, [ANTREAN](../ANTREAN.md) `W-OWN-015` |
| Beranda per role | OWNER/ADMIN/STAFF dashboard penuh; TENANT `/portal/stay` langsung konten | `config/navigation.ts`, `pages/dashboard/**`, `pages/portal/MyStayPage.tsx` |

**Cara mengukur ulang:** `rg -n "avail" frontend/src/pages/rooms/PublicRoomsPage.tsx` · `rg -n "currentTenantName" backend/src/modules/marketing` · `rg -n "RichAvailabilityCalendar" frontend/src` · buka `/rooms` di 390 px dan hitung kamar yang tampil tanpa filter.

## 3. Langkah prioritas

1. **Default tersedia (XS).** `avail` default `bookable`; chip “Tersedia (n)” aktif; “Semua kamar” jadi pilihan; pertahankan parameter URL agar tautan lama tetap sah. Tes: render tanpa query → hanya bookable.
2. **Ringkasan mobile-first (M).** Bangun `AvailabilityHeatmap` (baru) di samping `RichAvailabilityCalendar`: satu baris per kamar, 7/14 hari, warna: kosong hijau, huni abu, booking DP biru, perbaikan amber, perpanjangan ungu; ketuk → `/rooms/:id`. Tabel lama tetap ada di balik toggle “Tampilan rinci”. Jangan render nama penghuni.
3. **Skor peluang kosong (S).** Fungsi murni `estimateVacancy(room, today)` di `frontend/src/utils/vacancyEstimate.ts`; input dari kalender publik. Aturan: `status AVAILABLE` → 100; sisa kontrak ≤7 hari tanpa perpanjangan **+45**, ≤30 **+25**, ≤60 **+10**; lama tinggal <90 hari **+30**, <180 **+15**; term harian/mingguan/2-mingguan **+15**; perpanjangan pending **−30**, selesai **−40**; clamp 0–100. Label ambang: ≥70 / 40–69 / <40. Tampil sebagai badge + tooltip “perkiraan dari tanggal kontrak & lama tinggal”. Unit test 4 skenario (baru masuk, hampir habis, sudah lama, sudah perpanjang).
4. **Wizard pembuka TENANT (M).** Kartu “Apa yang mau kamu kerjakan?” di atas `/portal/stay`: Bayar tagihan · Catat meter · Lapor masalah · Ajukan keluar · Lihat aturan; tombol “Lewati, tampilkan semua”. Aksi memakai tombol yang sudah ada (jangan duplikasi logika); tanpa data baru.
5. **Wizard pembuka STAFF/ADMIN/OWNER (M).** Manfaatkan pola Mode Cepat (`/cepat`) yang sudah ada: 5–6 aksi teratas per role + “Lewati ke dashboard penuh”; pilihan lewati diingat per `user.id` (pola yang sama dengan preferensi Cepat). Jangan mengubah `AppLayout` global tanpa regresi; kalau shell berubah, jalankan regresi Owner.
6. **Gate + rilis (S).** `tsc --noEmit`, suite frontend, `check-docs`, `check-fitur` (rute/wizard baru), render 390/768/1440, lalu `npm run make-deploy` + deploy prosedur SSH (izin owner) + smoke dari server.

## 4. Jebakan

- **PII di endpoint publik.** `currentTenantName`/`dpTenantName` ada di payload publik. Heatmap publik **tidak boleh** menampilkan nama; pertimbangkan menghapus field itu dari respons publik (periksa pemakai lain dulu).
- **Jangan menjanjikan prediksi.** Skor = perkiraan dari data kontrak, bukan ramalan. Selalu tampilkan frasa “perkiraan” dan jangan pernah dipakai untuk menagih/mengusir.
- **Tabel lebar di 390 px.** Jangan memaksa matriks 7 kolom; pakai baris kamar + blok hari, atau scroll hanya pada wadah heatmap dengan sticky kolom kode.
- **Wizard bukan gerbang.** Selalu ada “lewati”; jangan menyembunyikan fitur di balik wizard; jangan menyimpan data pribadi (hanya preferensi tampilan per user).
- **Jangan menduplikasi aksi.** Wizard memanggil handler/tombol yang sudah ada (bayar, meter, tiket, keluar), bukan menulis ulang alur.
- **Regresi katalog.** Filter/sortir/bandingkan/paginasi dan tautan `?avail=` lama harus tetap jalan; `check-fitur` wajib hijau bila rute/feature registry berubah.
- **Performa shared hosting.** Skor dihitung di klien dari data kalender yang sudah ada; jangan menambah endpoint atau query per kamar.

## 5. Verifikasi

- `cd frontend && npx tsc --noEmit -p tsconfig.json`
- `cd frontend && npm test` (suite penuh; sebutkan bila hanya terarah)
- `node scripts/check-docs.mjs` — wajib BERSIH
- `node scripts/check-fitur.mjs` — bila rute/registry berubah
- Render 390/768/1440 px: `/rooms` (default tersedia, heatmap, badge peluang), `/portal/stay` (wizard tenant), dashboard staff/admin/owner (wizard + lewati)
- `git diff --check` sebelum commit; deploy hanya dengan izin owner + backup + smoke dari server.

## 6. Catatan penyimpangan

Belum ada.

## 7. Riwayat

| Tanggal | Perubahan |
|---|---|
| 2026-10-21 | Dibuat dari instruksi owner: `/rooms` default kamar tersedia, perkuat UI/UX + heatmap ketersediaan, tampilkan peluang kamar kosong (lama tinggal <3 bulan paling mungkin keluar), wizard-first di beranda tenant/staff/admin/owner dengan tombol lewati. Belum ada kode ditulis. |
| 2026-10-22 | Langkah 1–5 selesai: katalog default `bookable`, `AvailabilityHeatmap`, `estimateVacancy` (+ unit test), `QuickStartWizard` 4 role dengan tombol lewati. |
| 2026-10-23 | Kalender diubah ke bentuk **peristiwa** (`utils/vacancyCalendar.ts`): sel hanya memuat kamar yang MULAI kosong di tanggal itu, chip kode kamar maks 3 + "+N", legenda satu baris. Deploy client `Z1Qr7_YnZFAK` + verifikasi produksi (axe 0 violation, keyboard lulus). Program V2 dipetakan ke §8 (antrean `W-OWN-021`). |
| 2026-10-23 | **Fase S1 (sesi ini):** L1 ukur ulang → HEAD 2b3ed1b2, build live Z1Qr7_YnZFAK, 13 kamar (12 terisi · F1 kosong), booking online mati, `Stay.pricingTerm` ada tetapi belum dipakai rumus, 9 dari 12 kontrak lewat tanggal, Kmr C bertentangan antar-endpoint; Stay ACTIVE / CheckoutRequest / akun TENANT = UNKNOWN (tanpa akses DB). L2 riset enam alur bersumber dicatat di §8.9. Lima pertanyaan owner P34–P38 ditulis di [TANYA-OWNER](TANYA-OWNER.md). **Tanpa kode.** |
| 2026-10-23 | **Jawaban owner sesi ini:** P34 (a) · P35 (a) · P36 (a) · P38 bentuk (b) → register [KEPUTUSAN-OWNER](../KEPUTUSAN-OWNER.md) `ROOMS-AKUN-V2 S1`; blok P34–P36 dihapus dari TANYA-OWNER, P38 dipersempit jadi pertanyaan angka persentase. Sisa terbuka: angka DP (P38) dan P37 (default berjalan). **Tanpa kode** — S3 baru boleh mulai setelah rencana rinci S2. |
| 2026-10-23 | **Owner menegaskan DP 30%** → register `ROOMS-AKUN-V2 S1b`; blok P38 dihapus dari TANYA-OWNER. Terukur saat itu: 30% **sudah** kanonik ([domain/keuangan](../domain/keuangan.md)) dan sudah dihitung di booking publik (`roundRupiah(agreedRent × 30 / 100)`, LUNAS = 100%), jadi **tidak ada perubahan rumus** — S7 tinggal gerbang akun + idempotensi + tahan double-book. Koreksi tercatat: DP 30% ≠ deposit jaminan. **TANYA-OWNER kembali ke 1 pertanyaan terbuka (P37).** |

## 8. Program ROOMS dan AKUN V2 (23 Okt 2026)

Status: **rencana disetujui owner, belum ada kode**. Antrean: `W-OWN-021`. **Satu sesi = satu fase.**
Berkas ini adalah rumah rencana + progres program; jangan membuat dokumen paralel.

### 8.1 Misi (kutipan owner — jangan ditafsirkan lain)

1. Peluang kosong dipetakan lebih tegas: sewa **< bulanan** (harian/mingguan/2-mingguan) = peluang kosong **paling tinggi**, lalu **< 6 bulan**, lalu **≥ 1 tahun**.
2. Label kamar ditulis **"Kmr B", "Kmr C"**, dst.
3. Kartu/detail kamar di `/rooms` **compact**, jangan besar.
4. Fitur **DP**: calon penghuni **wajib punya akun** lebih dulu.
5. **Akun**: email atau nomor HP atau NIK — "login pakai 3 hal itu bisa?" (butuh riset + keputusan owner).
6. **Tenant belum sewa vs sudah sewa** harus jelas dibedakan sistem.
7. **Booking**: wajib login, atau dibuat admin/owner manual (keputusan owner).
8. Fitur per role tampil **sesederhana mungkin**: wizard a/b/c dulu, bukan menu penuh di hadapan user.
9. "Setelah semua fitur kita kuat, baru di-test dan publish lagi."

### 8.2 Protokol wajib setiap sesi (tidak boleh dilompati)

| L | Langkah | Syarat lolos |
|---|---|---|
| L1 | Baca & ukur | AGENTS.md → ANTREAN (`W-OWN-021`) → dokumen ini → ukur ulang keadaan di §8.6 |
| L2 | **Riset dulu** | dasar teori + sumber dicatat 3–6 baris per alur; **dilarang bertanya atau membuat rencana sebelum ini ada** |
| L3 | Tanya owner | format AGENTS §4: konteks · opsi a/b/c · konsekuensi tiap opsi · rekomendasi + alasan · default bila tidak dijawab; salin ke `docs/kerja/TANYA-OWNER.md` |
| L4 | Rencana masuk docs | perpanjang berkas ini; belum ada kode sebelum rencana fase itu ada di sini |
| L5 | Kerjakan + verifikasi | langkah kecil, bukti terkecil yang membuktikan acceptance, laporan AGENTS §8; test kosong atau artefak basi bukan PASS |
| L6 | Tutup sesi | perbarui §8.4 + riwayat bertanggal + satu baris "langkah berikutnya"; cetak kartu pengingat §8.5 |

### 8.3 Fase (9 fase berurutan, satu sesi satu fase)

| Fase | Nama | Selesai bila |
|---|---|---|
| S1 | Riset + keputusan owner | jawaban pertanyaan §8.6 tercatat di `TANYA-OWNER.md`/`KEPUTUSAN-OWNER.md`, atau default tertulis dipilih |
| S2 | Rencana rinci masuk dokumen | `node scripts/check-docs.mjs` BERSIH; belum ada kode |
| S3 | Peluang kosong berjenjang | satu fungsi murni + tabel bobot terbaca manusia + unit test; dipakai katalog **dan** kalender; tidak ada rumus ganda |
| S4 | Label "Kmr X" + kartu compact | 390/768/1440 px, target sentuh ≥44 px, axe 0 violation, `check-fitur` hijau |
| S5 | Akun & login multi-identifier | login email & nomor HP terbukti manual; anti-enumerasi + rate limit ada test; 12 akun TENANT lama tetap bisa masuk |
| S6 | Pemisahan calon vs penghuni | guard + navigasi + label per state; tidak ada kebocoran akses |
| S7 | DP dengan akun wajib | `npm run test:unit` backend lulus; idempoten; tahan double-book; baris uji dihapus setelahnya |
| S8 | Booking + wizard-first per role | 4 role diuji 390 px; "Lihat semua menu" ada; axe + keyboard lulus |
| S9 | Pengerasan + test + **publish** | semua gate hijau + izin owner + smoke produksi + jalur rollback tersedia |

### 8.4 Progres program (perbarui setiap sesi)

| Fase | Status | Sesi/tanggal | Bukti | Langkah berikutnya |
|---|---|---|---|---|
| S1 | **selesai** (P37 tetap terbuka dengan default berjalan) | sesi 23 Okt 2026 | §8.9 (L1+L2) + register [KEPUTUSAN-OWNER](../KEPUTUSAN-OWNER.md) `ROOMS-AKUN-V2 S1` & `S1b`: P34 (a) bulanan bergulir · P35 (a) NIK bukan alat masuk · P36 (a) akun wajib di titik DP · P38 **DP 30%** (kanonik, sudah berjalan di kode) | S2 rencana rinci |
| S2 | **selesai** | sesi 23 Okt 2026 (sesi S2) | §8.10 = rencana rinci S3–S9 (7 blok: perubahan berkas · acceptance terkecil · risiko · urutan) · §8.11 = L1 ukur ulang + temuan baru dari kode · `check-docs` BERSIH, tidak ada kode berubah | **S3** eksekusi: kirim `pricingTerm` ke publik, `termRisk` + `VACANCY_WEIGHT_TABLE`, aturan bulanan bergulir |
| S3 | **selesai** | sesi 23 Okt 2026 (sesi S3) | [§8.12](#812-sesi-23-okt-2026-sesi-s3--peluang-kosong-berjenjang-bukti): `VACANCY_WEIGHT_TABLE` + `termRisk` + aturan bergulir P34 (a) semua di `utils/vacancyEstimate.ts`; `pricingTerm` + fakta kontrak whitelist dikirim backend (katalog **dan** kalender); chip di `RoomCard`, tabel bobot di `AvailabilityHeatmap`; vitest 367 lulus · tsc FE/BE 0 · `check-docs` BERSIH | **S4** label "Kmr X" + kartu compact |
| S4 | **selesai** | sesi 23 Okt 2026 (sesi S4) | [§8.13](#813-sesi-23-okt-2026-sesi-s4--label-kmr-x--kartu-compact-bukti): `roomDisplayCode()` satu helper ("Kmr A"/"Kmr F1") + unit test; kartu katalog dipangkas ke satu elemen dominan (harga bulanan) dengan chip peluang kosong S3 tetap tampil; `RoomPreviewCard` & judul detail memakai helper yang sama; target sentuh ≥44×44 px di 390/768/1440 px; axe 0 violation · `check-fitur` bersih | **S5** identitas: bukti anti-enumerasi + penguncian percobaan |
| S5 | **selesai** — kecuali uji manual "12 akun TENANT lama" yang **BELUM TERBUKTI** (tanpa kunci akses DB) | sesi 24 Okt 2026 (sesi S5) | [§8.14](#814-sesi-24-okt-2026-sesi-s5--identitas-bukti-anti-enumerasi-dan-penguncian-percobaan): `DUMMY_PASSWORD_HASH` cost 10 dibuat sekali saat modul dimuat → jalur identifier tak dikenal membayar satu `bcrypt.compare` (median selisih **1,7 ms**, ambang berkas test 20 ms); penguncian **5 gagal → 15 menit** per identifier+IP tanpa kunci permanen, pesan 429 menyebut sisa menit, `AuditLog` `AUTH_LOGIN_LOCKOUT` dengan identifier **tersamar** (HMAC 12 hex); NIK **0** rujukan di `src/auth`; BE **211 lulus** · tsc FE/BE 0 · `check-docs` BERSIH | **S6** pemisahan calon vs penghuni |
| S6 | **selesai** | sesi 24 Okt 2026 (sesi S6) | [§8.15](#815-sesi-24-okt-2026-sesi-s6--pemisahan-calon-penghuni-dan-penghuni): `ProtectedRoute` menerima `allowRoles` + `allowStages` (penolakan = toast pesan + pengalihan, bukan spinner abadi); 12 rute portal tenant dipisah per tahap dari satu sumber `TENANT_ROUTE_STAGES`; satu tabel label per tahap (calon "Cari kamar"/"Pengajuan saya", penghuni "Kamar saya"/"Tagihan") + seksi "Lihat semua menu" di setiap tahap; backend: TENANT tanpa stay → 404 + daftar kosong; FE vitest penuh lulus · BE **217 lulus** · tsc FE/BE 0 | **S7** DP: gerbang akun, idempotensi, tahan double-book |
| S7 | **selesai** | sesi 24 Okt 2026 (sesi S7) | [§8.16](#816-sesi-24-okt-2026-sesi-s7--dp-gerbang-akun-idempotensi-tahan-double-book): pengajuan tamu tidak lagi membuat akun (`user.create` 0, tanpa kata sandi di respons) + kode pengajuan `K48-xxxx-y`; klaim `POST /tenant/bookings/claim` (kontak sama persis, pesan seragam) + jalur cadangan OWNER/ADMIN `POST /admin/bookings/:stayId/link-account`; gerbang DP dua lapis + pesan berisi langkah klaim; tolak duplikat pembayaran (stay+invoice+nominal+tanggal, jendela 24 jam); cek irisan rentang + retry 40001 di 2 jalur booking; BE **241 lulus** (dari 217) · FE 389 lulus · tsc FE/BE 0 · `check-docs` BERSIH · ANTREAN 16.375 byte; **batas: jaminan aplikasi saja, tanpa exclusion constraint DB** | **S8** booking + wizard-first per role (P37 a: wizard jadi layar pertama tiap peran, "Lihat semua menu" selalu terlihat) + alur klaim di UI |
| S8 | **selesai** | sesi 24 Okt 2026 (sesi S8) | [§8.17](#817-sesi-24-okt-2026-sesi-s8--booking-dan-wizard-first-per-peran-bukti): alur tamu→kode→klaim→DP tersambung di UI (CTA "Ajukan sewa" tanpa akun, kode pengajuan + langkah klaim, panel "Klaim pengajuan" di `/portal/bookings` dengan pesan seragam apa adanya + jalan keluar admin); wizard jadi layar pertama 4 peran lewat `AppLayout` pada rute pendaratan (bukan rute baru), "Lihat semua menu" 44 px dan terlihat tanpa menggulir di 390 px, "lewati" diingat per pengguna; FE **68 berkas / 407 test** lulus · tsc FE 0 · axe **0 violation** di 9 sampel · `check-fitur` bersih (58 fitur/80 rute, tanpa rute baru) · `check-docs` BERSIH | **S9** pengerasan + gate penuh + izin owner + deploy client-only |
| S9 | belum mulai | — | rencana: sama (deploy hanya dengan izin owner) | — |

### 8.5 Kartu pengingat (cetak di awal dan akhir setiap sesi)

```
PENGINGAT PROGRAM ROOMS dan AKUN V2
1. Sesi ini = fase ___ dari 9. Fase: ___
2. Sudah riset? sumber: ___   Belum -> JANGAN tanya / JANGAN buat rencana
3. Rencana fase ini ada di docs: ___
4. Fase sebelumnya selesai + bukti tercatat? tidak -> STOP
5. Menyentuh uang/skema/identitas? -> keputusan owner dulu
6. JANGAN deploy sebelum S9 (dan tanpa izin owner)
7. Akhiri sesi: bukti + update §8.4 + 1 baris langkah berikutnya
```

### 8.6 Alur kerja, riset wajib, dan pertanyaan terbuka

| Alur | Keadaan terukur | Riset wajib sebelum bertanya | Pertanyaan terbuka ke owner |
|---|---|---|---|
| **A. Peluang kosong berjenjang** | `estimateVacancy` memakai sisa kontrak + lama tinggal + perpanjangan; `pricingTerm` (DAILY…YEARLY) **belum** masuk rumus | aturan deterministik vs model statistik untuk 13 kamar tanpa label historis; kalibrasi (Brier score); turnover sewa pendek vs panjang | `pricingTerm` dominan? ambang 6 bulan & 1 tahun? 3 kelas, 4 kelas, atau skor 0–100 + label? |
| **B. Label "Kmr X" + kartu compact** | kartu katalog sekarang besar; kode kamar `Room.code` (A, B, F1, …) | WCAG 2.2 target size; kepadatan kartu mobile; Hick's law untuk isi kartu | label hanya di tampilan atau juga data? tinggi kartu target & berapa kartu per layar 390 px? elemen apa yang boleh dibuang? |
| **C. Akun & login email/HP/NIK** | `User.email` unik + password bcrypt; `Tenant.phone` & `Tenant.identityNumber` (unik) ada di tabel terpisah, **bukan** kredensial | NIST SP 800-63B; OWASP Authentication Cheat Sheet; UU PDP 27/2022 (minimalisasi data); risiko NIK sebagai identifier | login cukup email **atau** nomor HP (tanpa NIK)? NIK sebagai kredensial atau hanya verifikasi check-in? perlu OTP, kanal apa? nasib 12 akun TENANT lama? |
| **D. DP wajib akun** | fakta tetap: DP hangus ≠ deposit jaminan refundable; no-partial; first-paid-wins; kedaluwarsa booking 3 jam; `Stay` = booking→huni→selesai (tanpa model `Booking`) | reservation TTL/hold; idempotensi pembayaran; verifikasi bukti transfer manual | urutan alur final? persentase DP? TTL setelah pengajuan? siapa boleh verifikasi (ingat: STAFF tanpa akses invoice)? refund pihak yang kalah? nyalakan `PUBLIC_ONLINE_BOOKING_ENABLED` (sekarang mati)? |
| **E. Booking: login vs manual** | publik bisa "ajukan" tanpa akun; booking online publik dimatikan di env produksi; admin/owner bisa membuat manual | drop-off pendaftaran sebelum checkout; pola guest-checkout lalu klaim akun; risiko booking palsu | tamu boleh mengajukan tanpa akun lalu wajib akun saat DP? wajib login sejak awal? atau admin/owner saja yang membuat? |
| **F. Wizard-first per role** | `QuickStartWizard` sudah ada (4 role, tombol lewati diingat per user) tetapi navigasi penuh masih tampil; Mode Cepat `/cepat` + `/pilih-mode` deprecated | progressive disclosure (NN/g); task-based home vs menu lengkap; discoverability mobile | wizard jadi beranda tiap role? maksimal berapa pilihan? beda per role? menggantikan Mode Cepat lama? |

### 8.7 Aturan dokumen & deploy

- Rencana dan progres program **hanya** di berkas ini (tier kerja, tidak di-cap byte). Membuat berkas
  kerja baru = keputusan owner (ratchet R16 di `scripts/docs-tier.baseline.json`).
- Deploy **hanya** di S9 + izin owner. Jalur client-only yang sudah terbukti: `cd frontend && npm run build`
  → `tar -czf ../../tmp/client-update.tgz -C dist .` → `scp` ke `~/staging/` → `bash ~/staging/deploy-client-safe.sh`
  → verifikasi `version.json` + axe/keyboard di produksi; rollback `client-old-<ts>`.
- DB: dilarang `prisma migrate`; patch = SQL manual + `pg_dump` + transaksi `BEGIN/COMMIT` + hapus baris uji.

### 8.8 Larangan khusus program

- Menulis rumus peluang kosong kedua di tempat lain (satu sumber, ada test).
- Menjanjikan prediksi ("pasti kosong") — wajib "perkiraan, bukan janji".
- Menampilkan nama/NIK/telepon penghuni di halaman publik, log, atau screenshot.
- Menambah dependency/skema/migrasi tanpa izin; mengubah `AppLayout`/navigasi global tanpa regresi 4 role.
- Deploy sebelum S9, `git add -A`, `reset --hard`, `stash`, atau push paksa.
- Menyembunyikan fitur tanpa jalan keluar "Lihat semua menu".

### 8.9 Sesi 23 Okt 2026 — bukti L1 (ukur ulang) dan L2 (riset)

**A. Keadaan terukur** (potret 23 Okt 2026; dibaca dari API publik produksi dan dari repo — bukan dari catatan lama).

| Hal | Hasil ukur | Cara ukur |
|---|---|---|
| HEAD / branch | 2b3ed1b2 · main · tanpa perubahan terlacak | git rev-parse + status |
| Build yang melayani produksi | Z1Qr7_YnZFAK, sama dengan dist lokal | GET /version.json |
| Daftar kamar | 13: A, B, C, D, G, H, I, J, K, L, M, F1, F2 | GET /public/rooms |
| Huni saat ini | 12 terisi · 1 kosong (F1) · 0 perbaikan · 0 reserved | GET /public/rooms/summary |
| Booking online publik | MATI — onlineBookingEnabled false di 13 dari 13 kamar | payload kamar |
| Stay ACTIVE | UNKNOWN — akses DB produksi tidak tersedia sesi ini (SSH ditolak, kunci deploy tidak ada di mesin). Angka "11" di prompt belum terbukti dan tidak boleh disamakan dengan "12 kamar terisi" | percobaan SSH, dicatat sebagai batas |
| Baris CheckoutRequest | UNKNOWN (sebab sama) | — |
| Jumlah akun TENANT | UNKNOWN (sebab sama) | — |
| Term sewa penghuni | tersimpan di kolom pricingTerm (wajib), tetapi tidak dikirim ke publik dan belum dibaca rumus peluang kosong | schema + service |
| Tanggal kontrak | 9 dari 12 kamar terisi berakhir 1–10 Okt 2026 (13–22 hari lewat) dengan remainingDays 0; yang masih di depan hanya A (26 Okt), D (24 Okt), J (30 Okt) | kalender publik |
| Rumus peluang kosong pada data nyata | skor 63 untuk A, D, J · 53 untuk 8 kamar · 100 untuk C dan F1 → praktis hanya dua nilai, tidak membedakan 13 kamar | modul vacancyEstimate dijalankan atas payload produksi |
| Kontradiksi antar-endpoint | Kmr C: katalog menyebut OCCUPIED, kalender menyebut AVAILABLE dengan 14 dari 14 hari KOSONG | dua endpoint publik |

**B. Riset wajib per alur (L2)** — dasar teori + sumber, 3–6 baris per alur.

**Alur A — peluang kosong berjenjang.** Dengan 12 kontrak dan nol label historis "penghuni keluar", model survival/Cox tidak bisa diestimasi (tidak ada event time) dan classifier apa pun hanya menghafal 12 baris; aturan 10 kejadian per variabel menuntut 10 kejadian yang kita tidak punya. Vittinghoff & McCulloch menunjukkan aturan itu bisa terlalu konservatif, tetapi dasarnya simulasi bersampel besar — bukan izin memakai n sama dengan 13. Kalibrasi wajib diukur sebagai proper scoring rule (Brier), dan dokumentasi scikit-learn memperingatkan skor Brier rendah tidak otomatis berarti terkalibrasi serta isotonic "more prone to overfitting, especially on small datasets". Karena itu jalan yang bisa dipertanggungjawabkan: tabel bobot terbaca manusia (termasuk pricingTerm) + ambang manual, sambil mulai menyimpan label "keluar" sekarang supaya kalibrasi bisa dihitung saat kejadian cukup. Sumber: Peduzzi dkk., J Clin Epidemiol 49(12):1373–1379 (1996), doi 10.1016/S0895-4356(96)00236-3 · Vittinghoff & McCulloch, Am J Epidemiol 165(6):710–718 (2007), doi 10.1093/aje/kwk052 · Brier, Mon Wea Rev 78(1):1–3 (1950) · scikit-learn "Probability calibration" (https://scikit-learn.org/stable/modules/calibration.html).

**Alur B — label "Kmr X" dan kartu compact.** WCAG 2.2 SC 2.5.8 (Level AA) menetapkan minimum 24×24 CSS px dengan lima pengecualian; itu lantai kepatuhan, bukan target desain, sedangkan SC 2.5.5 (Level AAA) menetapkan 44×44 CSS px. Pedoman platform sejalan: Apple HIG 44×44 pt (minimum 28×28 pt), Android 48×48 dp dengan jarak ≥8 dp (sekitar 9 mm fisik). Hick (1952) menunjukkan waktu putus naik sebanding isi informasi (≈5 bit/detik), jadi 13 kartu penuh sekaligus mahal — segmentasi filter menurunkan beban tanpa menghapus pilihan. NN/g menyarankan hierarki dibangun lewat kontras (maks 2 warna primer), skala (maks 3 ukuran teks) dan grouping, sehingga tiap kartu cukup satu elemen dominan. Sumber: w3.org WAI "Understanding SC 2.5.8" dan "Understanding SC 2.5.5" · Apple HIG Accessibility · Google Accessibility "Touch target size" · Hick, QJEP 4(1):11–26 (1952), doi 10.1080/17470215208416600 · NN/g "Visual Hierarchy in UX" (2021).

**Alur C — akun dan tanda masuk.** Login sekarang sudah menerima email ATAU nomor HP (satu kolom identifier, dicari ke email lalu ke nomor HP tenant), dengan pesan galat seragam, cek status aktif setelah verifikasi sandi, dan rate limit pada endpoint login — jadi premis §8.6 "kredensial hanya email" tidak akurat dan sisa pekerjaan S5 menyangkut NIK + bukti anti-enumerasi, bukan membangun login HP dari nol. NIST SP 800-63B menuntut pembatasan laju percobaan dan menghindari kredensial berbasis pengetahuan yang tipis; OWASP Authentication Cheat Sheet menambahkan pencegahan enumerasi pengguna (pesan generik, waktu respons seragam) dan penguncian percobaan. NIK adalah data pribadi bersifat spesifik, sementara NIK beredar di fotokopi KTP; dipakai sebagai kredensial ia berperan sebagai oracle enumerasi, bukan penguat keamanan. Sumber: NIST SP 800-63B (https://pages.nist.gov/800-63-3/sp800-63b.html) · OWASP Authentication Cheat Sheet · UU 27/2022 (nomor pasal BELUM TERVERIFIKASI dari teks resmi — halaman JDIH tidak terbaca mesin, jadi jangan dikutip sebagai pasal).

**Alur D — DP wajib akun.** Booking sekarang langsung membuat baris Stay (tidak ada model Booking terpisah); kedaluwarsa review 3 jam dan tenggat bayar setelah disetujui 3 jam; nominal DP = deposit kamar + deposit hewan dari satu helper tiga kanal. Preseden hold reservasi berdurasi jam, bukan menit: Airbnb menahan tanggal dengan tenggat 12 jam (1 jam bila check-in kurang dari 12 jam), Stripe Checkout memberi tenggat sesi 30 menit–24 jam (default 24 jam) — jadi TTL 3 jam yang berjalan masih wajar. Idempotensi tidak menggantikan jaminan DB: kunci idempoten Stripe dipangkas setelah sekitar 24 jam. Di PostgreSQL, SERIALIZABLE hanya menjamin eksekusi setara serial bila aplikasi mengulang transaksi pada SQLSTATE 40001, sedangkan unique index mengunci kunci unik, bukan irisan rentang tanggal — untuk "satu kamar satu booking aktif per rentang" perlu exclusion constraint atau SERIALIZABLE + retry (bagian exclusion constraint belum dibaca langsung dari dokumentasi: ditandai inferensi). Sumber: Stripe "Idempotent requests" · Stripe "Create a Checkout Session" · PostgreSQL 18 "Transaction Isolation" · Airbnb Help "Verifying your identity".

**Alur E — booking: login atau manual.** Baymard mencatat 18% pembeli membatalkan checkout karena situs memaksa membuat akun pada daftar alasan abandonment (halaman diperbarui Sep 2025), jadi gate akun di titik minat membebani calon tamu yang masih membandingkan kos. Pola industri menaruh akun di titik uang: Shopify membuat profil pelanggan otomatis dari email yang belum terdaftar dan memakai akun passwordless kode 6 digit. Risiko form publik dijawab dengan anti-automation, bukan akun: OWASP OAT-019 Account Creation (CWE-799), praktik vendor memakai captcha dan melarang bot menyelesaikan checkout; rate limit endpoint booking publik sekarang 5 permintaan per 10 menit. Sumber: Baymard "Cart Abandonment Rate" · Shopify Help "Customer accounts" dan "Bot protection" · OWASP OAT-019.

**Alur F — wizard-first per role.** NN/g progressive disclosure (Nielsen 2006) membolehkan "show only a few of the most important options", tetapi mensyaratkan "it must be obvious how users progress from the primary to the secondary disclosure levels" — jadi tombol "Lihat semua menu" wajib eksplisit; lebih dari dua tingkat disclosure "typically have low usability", dan wizard bermasalah bila langkahnya saling bergantung. Jalan keluar itu bukan formalitas: heuristic recognition over recall menuntut fungsi tetap mudah ditemukan, bukan hanya bisa diingat. Apple HIG menargetkan tab bar lima atau kurang dan memperingatkan tab "More" membuat konten tersembunyi sulit ditemukan — karena itu wizard tidak boleh menjadi satu-satunya jalan ke fitur. Sumber: NN/g "Progressive Disclosure" (2006) · NN/g "Memory Recognition and Recall" (2024) · Apple HIG "Tab bars".

**C. Keputusan owner (dijawab 23 Okt 2026).** P34 **(a)** kontrak lewat tanggal dianggap bulanan bergulir · P35 **(a)** NIK bukan alat masuk, login tetap email atau nomor HP · P36 **(a)** tamu boleh mengajukan tanpa akun dan akun wajib saat membayar DP · P38 **(b) DP 30% × tarif periode**, sama dengan aturan kanonik 23 Sep 2026 dan **sudah berjalan di kode** (`downPaymentAmountRupiah`); tercatat koreksi bahwa DP 30% berbeda dari deposit jaminan. Rincian di register [KEPUTUSAN-OWNER](../KEPUTUSAN-OWNER.md) entri `ROOMS-AKUN-V2 S1` dan `S1b`. Masih terbuka: **P37** wizard sebagai beranda — default "beranda tidak berubah" berjalan sampai owner menyatakan lain. Belum ada kode yang boleh ditulis untuk S3–S8 sebelum rencana rinci S2 masuk dokumen.

**D. Batas kejujuran sesi ini.** Angka Stay ACTIVE, CheckoutRequest, dan jumlah akun TENANT **tidak terukur** (tanpa akses DB) dan ditulis UNKNOWN. Research di atas adalah teori dari sumber sekunder, bukan uji pada data kost ini: belum ada satu pun label historis "penghuni keluar" yang dipakai menghitung akurasi. Tidak ada kode, skema, atau data yang diubah pada sesi ini.

### 8.10 Rencana rinci S3 sampai S9 (disusun di sesi S2, 23 Okt 2026)

Isi bagian ini menggantikan "rencana ≤10 baris" fase DRAFT untuk S3–S9. Fakta yang dipakai = hasil ukur
ulang sesi S2 ([§8.11](#811-sesi-23-okt-2026-sesi-s2--bukti-l1-ulang-dan-rencana-s3s9)) + riset [§8.9](#89-sesi-23-okt-2026--bukti-l1-ukur-ulang-dan-l2-riset).
**Satu sesi satu fase**; tiap fase berhenti di checkpoint tertulis di bloknya. Fase yang butuh keputusan owner
wajib berhenti **sebelum** menulis kode, bukan sesudah.

#### Aturan yang berlaku di semua fase S3–S9

- **Satu sumber rumus peluang kosong** = `frontend/src/utils/vacancyEstimate.ts`. Berkas lain hanya memanggil;
  `vacancyCalendar.ts` hanya memilih peristiwa. Dilarang menambah rumus, bobot, atau ambang di komponen,
  backend, CSS, atau dokumen.
- **Tanpa PII**: nama/NIK/telepon penghuni tidak boleh masuk payload publik, log, atau screenshot. Tanggal
  kontrak sudah publik lewat `GET /api/public/rooms/availability-calendar` (potret 23 Okt 2026), jadi field
  tanggal boleh ditambah ke katalog **dengan whitelist**; nama tidak boleh ikut.
- **Batas keras**: `prisma migrate` dilarang; skema/migrasi DB, nominal uang, dan kredensial identitas =
  keputusan owner dulu; deploy hanya di S9 + izin eksplisit owner; tanpa dependency baru.
- **Gate kode** (dijalankan hanya oleh fase yang menulis kode): `cd frontend && npx tsc --noEmit` ·
  `cd frontend && npx vitest run` (penuh, latar belakang) · `cd backend && npx tsc --noEmit -p tsconfig.json` ·
  `cd backend && npm run test:unit` (**wajib** untuk S7 karena menyentuh uang & waktu-jeda) ·
  `node scripts/check-fitur.mjs` · `node scripts/check-docs.mjs`.
- **Penutup tiap sesi**: bukti perintah + exit code, baris [§8.4](#84-progres-program-perbarui-setiap-sesi),
  satu baris "langkah berikutnya", kartu pengingat [§8.5](#85-kartu-pengingat-cetak-di-awal-dan-akhir-setiap-sesi).

#### S3 — Peluang kosong berjenjang

Tujuan: satu skor yang membedakan **tiga kelas masa sewa** (pendek < bulanan · 1–6 bulan · ≥ 1 tahun sesuai
misi [§8.1](#81-misi-kutipan-owner--jangan-ditafsirkan-lain) butir 1), ditambah aturan **bulanan bergulir**
(P34 a), dipakai katalog **dan** kalender.

**Perubahan berkas**
- `backend/src/modules/marketing/marketing-public-rooms.service.ts` — baris kamar di `getAvailabilityCalendar`
  mengirim `pricingTerm` stay aktif hari itu (enum `PricingTerm`; nilainya sudah dibaca untuk proyeksi
  `SHORT_TERMS`, tetapi belum pernah dikirim ke publik). Tanpa kolom nama/telepon.
- `frontend/src/types/core.ts` — tipe `PublicRoom` + tipe baris kalender menerima `pricingTerm?: PricingTerm | null`.
- `frontend/src/utils/vacancyEstimate.ts` — **satu-satunya tempat rumus**: `pricingTerm` masuk `VacancyInput`,
  fungsi `termRisk(pricingTerm)`, tabel bobot ekspor `VACANCY_WEIGHT_TABLE` (dipakai UI **dan** test supaya
  angka di layar = angka yang diuji), dan aturan bulanan bergulir di `estimateVacancyOnDate`: bila tanggal
  mulai kosong sudah lewat dan term-nya bulanan atau lebih panjang, kamar dinilai pada siklus bulan berikutnya,
  alasan ditulis "siklus bulanan berikutnya", status tetap "perkiraan".
- `frontend/src/utils/vacancyCalendar.ts` — hanya meneruskan field; tetap tanpa perhitungan.
- `frontend/src/components/public/AvailabilityHeatmap.tsx` — tampilkan `VACANCY_WEIGHT_TABLE` sebagai tabel
  HTML terbaca pembaca layar di panel legenda (bukan teks bebas), dan teruskan `pricingTerm` ke estimator
  (baris kamar sudah di-spread, jadi tinggal dipakai).
- `frontend/src/components/rooms/RoomCard.tsx` — chip peluang kosong di katalog memakai fungsi yang sama,
  berlabel "perkiraan".
- Test: `frontend/src/test/unit/vacancyEstimate.test.ts`, `frontend/src/test/unit/vacancyCalendar.test.ts`.

**Acceptance terkecil**
- `cd frontend && npx vitest run src/test/unit/vacancyEstimate.test.ts src/test/unit/vacancyCalendar.test.ts`
  lulus, termasuk test baru: satu per kelas term, satu kasus **kontrak lewat** (bulanan bergulir, `today`
  disuntik), satu kasus "sebelum tanggal kosong selalu RENDAH".
- Bukti satu sumber: `rg -n "termRisk|remainingRisk|tenureRisk" --glob "frontend/src/**"` hanya cocok di
  `utils/vacancyEstimate.ts` (+ berkas test).
- Bukti membedakan: estimator dijalankan atas payload produksi yang tersimpan menghasilkan **≥ 3 nilai skor
  berbeda** untuk 13 kamar (pembanding: potret §8.9 hanya 53/63/100).
- `cd frontend && npx tsc --noEmit` exit 0 · `cd backend && npx tsc --noEmit -p tsconfig.json` exit 0.

**Risiko**
- Menambah field ke katalog publik = permukaan data baru. Mitigasi: whitelist eksplisit (tanggal + term saja),
  test yang gagal bila kunci `currentTenantName`/`fullName`/`phone` muncul di payload katalog.
- Skor kamar yang kontraknya lewat bisa **naik** karena bergulir, lalu dibaca sebagai janji. Mitigasi: teks
  alasan wajib menyebut "siklus bulanan berikutnya", label tetap "perkiraan, bukan janji".
- Menambah `termRisk` mengubah skor lama sehingga sebagian ekspektasi test lama harus diperbarui. Mitigasi:
  yang diubah hanya angka harapan, **invarian** (monoton turun terhadap lama tinggal, perpanjangan menekan
  peluang) tetap diuji; setiap perubahan angka dicatat di badan sesi.

**Urutan pengerjaan**: (1) kirim `pricingTerm` dari backend + tipe FE; (2) `termRisk` + `VACANCY_WEIGHT_TABLE`
di satu berkas; (3) aturan bergulir di `estimateVacancyOnDate`; (4) test per kelas + kasus lewat; (5) chip
katalog; (6) tabel bobot di heatmap; (7) jalankan gate + bukti "membedakan" di atas payload nyata.

**Hasil sesi S3 (23 Okt 2026)** — urutan (1)–(7) dikerjakan, dengan dua penyesuaian yang dicatat terbuka:
(a) katalog publik **juga** mengirim fakta kontrak ber-whitelist (tanggal, `remainingDays`, `pricingTerm`,
status pengajuan) — tanpa itu chip di `RoomCard` tidak punya dasar hitung; helper backend
`getProjectedAvailabilityByRoomId` diperluas menjadi `getPublicStayFactsByRoomId` (satu query stay + dua query
status, tanpa PII). (b) Sewa **pendek tidak digulirkan** bulanan: kontraknya memang sudah jatuh tempo dan kelas
itu justru paling mungkin kosong, jadi menggulirkannya sebulan akan menurunkan peluang pada kelas yang
seharusnya tertinggi. Angka bobot + sebaran skor + batas kejujuran ada di [§8.12](#812-sesi-23-okt-2026-sesi-s3--peluang-kosong-berjenjang-bukti).

#### S4 — Label "Kmr X" dan kartu compact

Tujuan: label tampilan "Kmr A"/"Kmr F1" ( **`Room.code` tidak diubah**), kartu katalog ringkas, target sentuh
≥ 44 px, terbaca di 390/768/1440 px.

**Perubahan berkas**
- `frontend/src/utils/publicRoomDisplay.ts` — helper tampilan `roomDisplayCode(code)` → "Kmr A"; satu tempat,
  dipakai semua tampilan publik. Data kamar tetap `code = "A"`.
- `frontend/src/components/rooms/RoomCard.tsx` — label memakai helper; `room.name` turun menjadi subjudul;
  isi kartu dipangkas ke satu elemen dominan (riset [§8.9](#89-sesi-23-okt-2026--bukti-l1-ukur-ulang-dan-l2-riset) alur B).
- `frontend/src/pages/public/publicGuestShared.tsx` — `RoomPreviewCard` memakai helper yang sama.
- `frontend/src/pages/rooms/PublicRoomDetailPage.tsx` — judul "Kmr F1", rincian tetap lengkap.
- `frontend/src/styles/11-public-pages.css` — tinggi kartu, jarak, target sentuh ≥ 44 CSS px; **tanpa**
  menurunkan kontras (warna chip dari commit `c808df5a` dipertahankan).
- `docs/FITUR.md` hanya bila path komponen berubah (kalau tidak, tidak disentuh).

**Acceptance terkecil**
- `node scripts/check-fitur.mjs` → `bersih — <n> fitur, <n> rute`, exit 0.
- Bukti 3 lebar: tangkapan layar `/rooms` di 390/768/1440 px tanpa scroll horizontal + axe-core **0 violation**.
- Target sentuh: `getBoundingClientRect()` semua kontrol di kartu ≥ 44 × 44 CSS px (dicatat sebagai angka).
- `cd frontend && npx tsc --noEmit` exit 0 · `cd frontend && npx vitest run` penuh lulus.

**Risiko**
- Kartu terlalu ringkas = informasi hilang. Mitigasi: halaman detail tetap memuat semua; yang dibuang hanya
  duplikasi di kartu.
- Label tampilan menyimpang dari data. Mitigasi: unit test helper (A, F1, kode kosong) + tidak ada perubahan DB.
- CSS `11-public-pages.css` dipakai halaman publik lain. Mitigasi: hanya selektor `.rm-*`, plus bukti visual
  halaman publik lain yang memakai berkas itu.

**Urutan pengerjaan**: (1) helper label + test; (2) kartu katalog; (3) kartu pratinjau; (4) judul detail;
(5) CSS target sentuh; (6) ukur 3 lebar + axe; (7) `check-fitur`.

#### S5 — Identitas: bukti anti-enumerasi dan penguncian percobaan

Tujuan: NIK **tidak** jadi kredensial (P35 a); yang ditutup adalah bukti anti-enumerasi dan penguncian
percobaan. Keadaan terukur: login sudah menerima email **atau** nomor HP, pesan galat seragam, cek `isActive`
dilakukan **setelah** verifikasi sandi, dan bucket `login` = 10 permintaan / 5 menit
(`backend/src/common/guards/rate-limit.guard.ts`). Yang belum ada: waktu respons seragam untuk identifier tak
dikenal dan penguncian percobaan per akun.

**Perubahan berkas**
- `backend/src/auth/auth.service.ts` — `bcrypt.compare` terhadap hash tiruan saat identifier tidak ditemukan
  (waktu respons setara), dan penghitung percobaan gagal per `identifier` + IP dengan jeda 15 menit; kegagalan
  penguncian dicatat ke `AuditLog` **tanpa** identifier lengkap (hanya bentuk tersamar).
- `backend/src/common/guards/rate-limit.guard.ts` — tidak diubah kecuali penguncian butuh bucket baru; bila
  perlu, tambah entri di tabel `configs` (bukan jalur baru).
- Test baru `backend/test/unit/auth-anti-enumeration.test.js` — pesan galat identik untuk identifier tak
  dikenal vs sandi salah; selisih **median** waktu respons dua jalur di bawah ambang yang ditetapkan di berkas
  test; penguncian aktif setelah N gagal lalu pulih setelah jeda.
- `backend/test/unit/auth-login-refresh.test.js` — tambah kasus akun TENANT lama (email dan nomor HP) tetap
  bisa masuk.

**Acceptance terkecil**
- `cd backend && npm run test:unit` lulus (jumlah test naik, tidak ada test dihapus/dilemahkan).
- `cd backend && npx tsc --noEmit -p tsconfig.json` exit 0.
- Uji manual "12 akun TENANT lama tetap bisa masuk" **butuh data produksi**: akses ukur dipulihkan owner
  23 Okt 2026 (keputusan register `ROOMS-AKUN-V2 S2`, baca-saja). Bila saat S5 dimulai kunci belum tersedia,
  hasilnya ditulis **BELUM TERBUKTI** (bukan "lulus") dan dicatat di §8.4 sebagai sisa.

**Risiko**
- Penguncian = alat DoS terhadap akun sendiri. Mitigasi: kunci per kombinasi identifier + IP, durasi pendek,
  tanpa kunci permanen, dan pesan yang memberi tahu sisa waktu.
- Waktu respons seragam menambah latensi login (± satu `bcrypt.compare`). Mitigasi: hash tiruan dibuat sekali
  saat modul dimuat, biaya tetap, diukur di test.
- Penghitung di memori proses tidak berlaku lintas replika. Mitigasi: dicatat sebagai batas; tidak menambah
  dependency/Redis tanpa izin owner.

**Urutan pengerjaan**: (1) `bcrypt` tiruan; (2) penguncian + audit; (3) test anti-enumerasi; (4) test akun lama;
(5) `test:unit`; (6) catat batas uji manual 12 akun.

**Hasil sesi S5 (24 Okt 2026)** — urutan (1)–(6) dikerjakan, dengan dua penyesuaian yang dicatat terbuka:
(a) `rate-limit.guard.ts` **tidak** diubah: penguncian 5 kegagalan per identifier+IP sudah lebih ketat daripada
bucket `login` (10 permintaan/5 menit per IP), jadi tidak perlu bucket baru. IP klien masuk kunci lewat
`req.ip` (`trust proxy` sudah `1` di `main.ts`), sehingga `login()` menerima `LoginRequestContext` — itu
satu-satunya perubahan tanda tangan. (b) Test waktu memakai **median** dengan dua putaran pemanasan yang
dibuang; ambang tetap 20 ms (pengukuran pertama tanpa pemanasan: 14,6 ms). Bukti lengkap, angka, dan batas
kejujuran di [§8.14](#814-sesi-24-okt-2026-sesi-s5--identitas-bukti-anti-enumerasi-dan-penguncian-percobaan).

#### S6 — Pemisahan calon penghuni dan penghuni

Tujuan: sistem **membedakan tegas** calon (belum sewa) dan penghuni (sudah sewa) di navigasi, label, dan akses.
Keadaan terukur: `useTenantPortalStage` sudah menghasilkan tiga tahap (`browsing`/`booking`/`occupied`) dan
`config/navigation.ts` sudah memilih tautan per tahap, **tetapi** `ProtectedRoute.tsx` hanya memeriksa token —
tidak memeriksa peran maupun tahap, jadi rute tenant tetap terbuka untuk calon.

**Perubahan berkas**
- `frontend/src/components/layout/ProtectedRoute.tsx` — menerima `allowRoles` dan (untuk TENANT) `allowStages`;
  menolak dengan pengalihan yang punya pesan jelas, bukan layar kosong.
- `frontend/src/App.tsx` — rute portal tenant diberi `allowStages`, rute kamar publik dan status pengajuan
  dibiarkan terbuka untuk calon.
- `frontend/src/config/navigation.ts` — label per tahap (calon: "Cari kamar", "Pengajuan saya"; penghuni:
  "Kamar saya", "Tagihan"), tanpa menghilangkan tautan "Lihat semua menu".
- `frontend/src/hooks/useTenantPortalStage.ts` — nama tahap untuk calon dibuat eksplisit (tanpa mengubah
  sumber data `/stays/me/current` + `/tenant/bookings/my`).
- Backend: `backend/src/modules/tenant-bookings/tenant-bookings.controller.ts` + `stays` — pastikan TENANT tanpa
  booking/stay ditolak (404/403) dan **tidak** membocorkan data stay orang lain; test regresi.

**Acceptance terkecil**
- Test unit `frontend/src/test/unit/navigation*.test.ts` (baru/besuai nama yang ada): untuk tahap calon,
  `getNavigationLinks` tidak memuat rute bayar/tagihan; untuk tahap penghuni, memuat.
- Test backend: TENANT tanpa stay → `GET /stays/me/current` 404, `GET /tenant/bookings/my` daftar kosong.
- 4 peran dirender 390 px tanpa menu bocor (bukti tangkapan layar per peran).

**Risiko**
- Guard baru bisa mengunci penghuni lama yang stay-nya belum terbentuk. Mitigasi: tahap `browsing` tetap boleh
  membuka status pengajuan; ada jalan keluar "Lihat semua menu" (larangan [§8.8](#88-larangan-khusus-program)).
- Dua pola label bisa membingungkan. Mitigasi: satu tabel label per tahap di `navigation.ts`, diuji.

**Urutan pengerjaan**: (1) definisi tahap calon; (2) guard rute; (3) navigasi + label; (4) test frontend;
(5) test backend penolakan; (6) bukti 4 peran 390 px.

#### S7 — DP: gerbang akun, idempotensi, tahan double-book

Tujuan: P36 (a) ditegakkan — tamu **boleh** mengajukan tanpa akun, akun **wajib** saat membayar DP, booking
tanpa akun **tidak mengunci** kamar, dan jalur ADMIN/OWNER tetap ada sebagai cadangan. **Nominal tidak diubah**
(DP 30 % × tarif periode sudah berjalan, P38).

**Fakta terukur yang jadi dasar (potret 2026-10-23)**: `public-bookings.service.ts` **membuat akun TENANT
otomatis** saat tamu mengajukan (kata sandi sementara diacak pada baris ±114, akun dibuat ±237–247, kata sandi
dikembalikan di respons ±381). Jadi gerbang "akun saat DP" hari ini **tidak** berlaku: akun lahir di titik
ajukan. Kamar dikunci `SELECT ... FOR UPDATE` di dalam transaksi, dan `Stay` **tidak punya** unique index untuk
irisan rentang tanggal.

**Perubahan berkas**
- `backend/src/modules/tenant-bookings/public-bookings.service.ts` — pengajuan tamu menyimpan `Tenant` +
  `Stay` **tanpa** membuat `User` dan tanpa mengembalikan kata sandi; respons memuat kode pengajuan, bukan
  kredensial.
- `backend/src/modules/tenant-bookings/tenant-bookings.controller.ts` — endpoint klaim
  `POST /tenant/bookings/claim`: akun TENANT yang login mengaitkan pengajuan yang kontak email/nomor HP-nya
  **sama persis** dengan kontak pengajuan; gagal = pesan seragam tanpa membocorkan keberadaan pengajuan.
- `backend/src/modules/tenant-bookings/admin-bookings.controller.ts` — jalur cadangan OWNER/ADMIN mengaitkan
  pengajuan ke akun secara manual (untuk kasus kontak berbeda).
- `backend/src/modules/payment-submissions/payment-submissions.controller.ts` + service — pembayaran DP tetap
  `@Roles(TENANT)` dan **wajib** memeriksa kepemilikan stay; tanpa akun terklaim, DP tidak bisa dibayar
  (gerbang P36 a) dan pesan mengarahkan ke klaim/masuk.
- Idempotensi pembayaran: kunci idempoten pada pengajuan pembayaran + penolakan duplikat (stay + nominal +
  jendela waktu yang sama). **Tanpa kolom/tabel baru**; bila ternyata mustahil tanpa skema, fase berhenti dan
  pemilik keputusan = owner (skema).
- Tahan double-book: cek irisan rentang setelah `FOR UPDATE` + ulang transaksi pada SQLSTATE 40001.
  **Keputusan owner 23 Okt 2026** (register `ROOMS-AKUN-V2 S2`): jaminan ditegakkan **di aplikasi saja**,
  constraint exclusion PostgreSQL **tidak** dibuat — karena itu batas "balapan antar-proses masih mungkin"
  **wajib** ditulis di laporan S7, bukan diklaim tertutup.
- Test baru: `backend/test/unit/booking-guest-to-account.test.js`, `payment-idempotency.test.js`,
  `booking-overlap.test.js`.

**Acceptance terkecil**
- `cd backend && npm run test:unit` **lulus** (gate uang; wajib) dan jumlah test naik.
- `cd backend && npx tsc --noEmit -p tsconfig.json` exit 0.
- Bukti perilaku: pengajuan tamu tanpa akun → baris `User` **tidak** bertambah (test dengan mock Prisma
  mencatat pemanggilan `user.create`), DP tidak bisa dibayar sebelum klaim, dan pengajuan ganda dengan kunci
  sama menghasilkan satu baris.
- Baris/data uji yang dipakai untuk verifikasi dihapus setelahnya (laporan menyebut apa yang dihapus).

**Risiko**
- Tamu tidak bisa membayar DP karena klaim gagal (kontak beda). Mitigasi: jalur cadangan OWNER/ADMIN + pesan
  yang menyebut langkah berikutnya, bukan jalan buntu.
- Menghapus akun otomatis menghilangkan jalur "langsung punya sandi". Mitigasi: undangan membuat sandi setelah
  klaim; socialisasi di halaman status pengajuan.
- Tanpa constraint DB, dua pengajuan bersamaan masih bisa lolos pada replika berbeda. Mitigasi: dicatat sebagai
  batas jujur; usulan constraint = keputusan owner berikutnya.

**Urutan pengerjaan**: (1) hentikan pembuatan akun + respons kode pengajuan; (2) endpoint klaim + jalur
cadangan admin; (3) gerbang DP + cek kepemilikan; (4) idempotensi; (5) cek irisan + retry; (6) `test:unit`;
(7) hapus baris uji + catat batas.

#### S8 — Booking dan wizard-first per peran

Tujuan: alur final pengajuan (a) tamu mengajukan → akun saat DP tersambung utuh di UI, dan wizard menjadi
**layar pertama tiap peran**. **P37 sudah diputuskan owner 23 Okt 2026 = (a)** (register `ROOMS-AKUN-V2 S2`):
wizard pembuka jadi layar pertama TENANT/STAFF/ADMIN/OWNER dengan tombol **"Lihat semua menu" selalu terlihat**
dan pilihan "lewati" tetap diingat per pengguna.

**Perubahan berkas**
- `frontend/src/pages/rooms/PublicRoomDetailPage.tsx` — CTA "Ajukan sewa" tanpa login, formulir kontak minimum
  (nama, telepon, email opsional), hasil = kode pengajuan yang bisa dilacak.
- `frontend/src/pages/public/PublicGuestDashboardPage.tsx` + `publicGuestShared.tsx` — halaman status
  pengajuan: kode, tanggal, langkah berikutnya ("buat akun/masuk untuk membayar DP"), tanpa data penghuni lain.
- `frontend/src/components/common/QuickStartWizard.tsx` — dipakai sebagai layar pertama tiap peran (P37 a),
  ditambah varian TENANT tahap calon (aksi: cari kamar, ajukan, lacak pengajuan).
- `frontend/src/components/layout/AppLayout.tsx` + `frontend/src/App.tsx` — titik pasang wizard sebagai layar
  pertama per peran, dengan tombol "Lihat semua menu" **selalu terlihat** (larangan [§8.8](#88-larangan-khusus-program)
  melarang menyembunyikan fitur tanpa jalan keluar) dan tanpa regresi 4 peran.

**Acceptance terkecil**
- 4 peran dirender 390 px: wizard tampil sebagai layar pertama, tombol "Lihat semua menu" terlihat tanpa
  menggulir (bukti tangkapan layar per peran + angka posisi tombol), axe 0 violation, urutan Tab masuk akal.
- Menekan "Lihat semua menu" membuka navigasi penuh dan pilihan "lewati" diingat setelah muat ulang (bukti
  langkah demi langkah, bukan klaim).
- `cd frontend && npx vitest run` penuh lulus; `cd frontend && npx tsc --noEmit` exit 0.
- `node scripts/check-fitur.mjs` bersih (rute baru terdaftar di `docs/FITUR.md`).

**Risiko**
- Pengguna yang sudah hafal alur harus melewati wizard sekali (pilihan diingat, jadi tidak berulang) dan
  operator bisa merasa dihambat. Mitigasi: "Lihat semua menu" selalu terlihat + "lewati" per pengguna.
- Alur tamu menambah langkah sebelum DP. Mitigasi: pengajuan tetap satu layar; langkah akun baru muncul di
  titik uang.

**Urutan pengerjaan**: (1) CTA + formulir pengajuan; (2) halaman status + kode; (3) klaim dari status ke akun;
(4) wizard calon; (5) daftar rute di `docs/FITUR.md`; (6) bukti 4 peran + axe.

#### S9 — Pengerasan, test penuh, dan publish

Tujuan: semua gate hijau, izin owner diperoleh, deploy client-only, smoke produksi, dan jalur rollback terbukti.

**Perubahan berkas**
- Tidak ada perubahan fitur baru. Yang berubah: `docs/ANTREAN.md` (status), [§8.4](#84-progres-program-perbarui-setiap-sesi),
  dan — setelah deploy — `frontend/dist` hasil build (tidak di-commit) + catatan versi di dokumen bukti.

**Acceptance terkecil**
- Gate: `cd frontend && npx tsc --noEmit` · `cd frontend && npx vitest run` penuh ·
  `cd backend && npx tsc --noEmit -p tsconfig.json` · `cd backend && npm run test:unit` ·
  `node scripts/check-fitur.mjs` · `node scripts/check-docs.mjs` · `git diff --check` — semua exit 0.
- Izin owner tertulis untuk deploy (keputusan owner, bukan asumsi agen).
- Deploy client-only: `cd frontend && npm run build` → `tar -czf ../../tmp/client-update.tgz -C dist .` →
  `scp` ke `~/staging/` → `bash ~/staging/deploy-client-safe.sh` → smoke: `GET /version.json` menampilkan
  buildId baru, `/rooms` memuat 13 kamar, axe + keyboard di produksi.
- Rollback: `client-old-<ts>` tersedia dan jalurnya disebut di laporan.
- **Tidak** menyalakan `PUBLIC_ONLINE_BOOKING_ENABLED` di fase ini; flag tetap MATI sampai owner memutuskan.

**Risiko**
- Fitur baru tidak terlihat karena booking publik masih MATI. Mitigasi: dicatat di laporan; menyalakan flag =
  keputusan owner terpisah.
- Deploy mengubah produksi. Mitigasi: hanya client (tanpa migrasi/back end), rollback disiapkan lebih dulu,
  smoke dijalankan setelah deploy.
- RAM LVE 512 MB. Mitigasi: tidak ada proses baru; build dijalankan lokal, bukan di server.

**Urutan pengerjaan**: (1) jalankan semua gate; (2) minta izin owner; (3) build + paket; (4) deploy;
(5) smoke + axe/keyboard; (6) catat bukti + rollback; (7) tutup `W-OWN-021` di ANTREAN **hanya** bila semua
gate + smoke terbukti.

### 8.11 Sesi 23 Okt 2026 (sesi S2) — bukti L1 ulang dan rencana S3–S9

**A. L1 ukur ulang** (dijalankan sesi S2, potret 2026-10-23; perintah + hasil apa adanya).

| Hal | Hasil ukur | Selisih vs potret prompt | Cara ukur |
|---|---|---|---|
| HEAD / branch | `d3f8bdd4` · `main` · 1 commit di depan `origin/main`, belum dipush | sama | `git log --oneline -1`, `git status -sb` |
| Build produksi | `Z1Qr7_YnZFAK` | sama | `GET https://kost48surabaya.com/version.json` |
| Kamar | 13: A,B,C,D,G,H,I,J,K,L,M,F1,F2 | sama | `GET /api/public/rooms` (11.974 B) |
| Huni | `occupied 12 · bookable 1 · maintenance 0 · reserved 0 · total 13` | sama | `GET /api/public/rooms/summary` |
| Booking online publik | MATI — `onlineBookingEnabled` true di **0 dari 13** kamar | sama | payload kamar |
| Tanggal kontrak | **8** kamar punya tanggal berakhir 1–10 Okt 2026 dengan `remainingDays 0` (B, G, H, I, K, L, M, F2) · **3** masih di depan (A 26 Okt / 3 hari, D 24 Okt / 1 hari, J 30 Okt / 7 hari) · **C dan F1 tanpa tanggal** | **beda cara hitung**: kalimat "9 dari 12" ikut menghitung C yang tidak punya tanggal kontrak; angka yang bisa dipertanggungjawabkan = 8 tanggal eksplisit + C tanpa data | `GET /api/public/rooms/availability-calendar` |
| Cacat Kmr C | katalog `OCCUPIED`/`FULL`, kalender `AVAILABLE` + 14/14 hari tanpa status HUNI, `checkInDate`/`plannedCheckOutDate` null | sama (dicatat, **tidak** diperbaiki) | dua endpoint publik |
| Stay ACTIVE / CheckoutRequest / akun TENANT | **UNKNOWN** — tanpa akses DB (kunci deploy tidak ada di mesin) | sama | percobaan tidak dilakukan sesi ini |

**B. Temuan baru yang mengubah rencana** (dibaca dari kode, bukan dari catatan lama):
`public-bookings.service.ts` membuat akun TENANT otomatis + mengembalikan kata sandi sementara pada respons
pengajuan (baris ±114, ±237–247, ±381) — jadi premis "akun baru lahir saat DP" **belum** benar dan menjadi
pekerjaan inti S7. `Stay` tidak punya unique index untuk irisan rentang tanggal; penguncian kamar sekarang
bersandar pada `SELECT ... FOR UPDATE` + cek di aplikasi. `ProtectedRoute.tsx` hanya memeriksa token (bukan
peran/tahap) — inti pekerjaan S6. Bucket `login` = 10 permintaan / 5 menit; waktu respons dan penguncian
percobaan belum seragam — inti pekerjaan S5. `pricingTerm` sudah dibaca backend untuk proyeksi `SHORT_TERMS`
tetapi belum pernah dikirim ke publik — inti pekerjaan S3.

**C. Rencana rinci** = [§8.10](#810-rencana-rinci-s3-sampai-s9-disusun-di-sesi-s2-23-okt-2026), tujuh blok fase
dengan perubahan berkas · acceptance terkecil · risiko · urutan pengerjaan. **Setelah rencana ditulis**, owner
menjawab **P37 (a)** — wizard jadi layar pertama tiap peran —, **memulihkan akses ukur produksi (baca-saja)**,
dan memutuskan **double-book ditegakkan di aplikasi tanpa perubahan skema**. Ketiganya masuk register
[KEPUTUSAN-OWNER](../KEPUTUSAN-OWNER.md) entri `ROOMS-AKUN-V2 S2`; blok §8.10 S5, S7, dan S8 sudah disesuaikan
dengan keputusan itu. **Tidak ada pertanyaan owner yang terbuka** saat sesi S2 ditutup.

**D. Batas kejujuran sesi ini.** Sesi ini **docs-only**: `git diff` hanya menyentuh `docs/kerja/TASK-RUANG-WIZARD.md`
dan `docs/ANTREAN.md`; tidak ada kode, skema, DB, build, atau deploy yang dijalankan (sesuai AGENTS §7 untuk
pekerjaan dokumen — `tsc`/`vitest`/`test:unit`/`build` **sengaja tidak** dijalankan). Rencana di §8.10 belum
dibuktikan bisa dieksekusi: acceptance tiap fase adalah **target**, bukan hasil. Angka Stay ACTIVE,
CheckoutRequest, dan jumlah akun TENANT tetap UNKNOWN. Nomor baris kode di §8.11 B adalah potret 23 Okt 2026
dan bisa bergeser setelah suntingan berikutnya. Cacat Kmr C dicatat, tidak diperbaiki. P37 tetap terbuka
dengan default "beranda tidak berubah".

### 8.12 Sesi 23 Okt 2026 (sesi S3) — peluang kosong berjenjang: bukti

**A. L1 ukur ulang** (dijalankan sesi S3, potret 2026-10-23; perintah + hasil apa adanya).

| Hal | Hasil ukur | Selisih vs potret prompt |
|---|---|---|
| HEAD / branch | `d3f8bdd4` · `main` · 1 commit di depan `origin/main`, belum dipush; 4 berkas dokumen S2 belum di-commit | sama |
| Build produksi | `Z1Qr7_YnZFAK` | sama |
| Kamar / huni | 13 kamar · `occupied 12 · bookable 1 · maintenance 0 · reserved 0 · total 13` | sama |
| Booking online publik | MATI — `onlineBookingEnabled` true di 0 dari 13 kamar | sama |
| Tanggal kontrak | 8 kamar berakhir 1–10 Okt 2026 dengan `remainingDays 0` (B, G, H, I, K, L, M, F2) · 3 masih di depan (A 26 Okt/3 hari, D 24 Okt/1 hari, J 30 Okt/7 hari) · C dan F1 tanpa tanggal | sama dengan §8.11 |
| Kunci SSH/deploy | **TIDAK ADA** — `~/.ssh` tidak ada, `$TEMP/kost48ssh` tidak ada, tidak ada `*.pem` di mesin/repo | izin akses ukur (keputusan S2) belum bisa dipakai di mesin ini |
| Stay ACTIVE / baris CheckoutRequest / akun TENANT | **UNKNOWN** — tanpa akses DB; tidak dikarang | sama |
| Cacat Kmr C | katalog `OCCUPIED`/`FULL`, kalender `AVAILABLE` | sama; dicatat, **tidak** diperbaiki (bukan S3) |

**B. Yang berubah (kode, sesi ini).** Satu sumber rumus tetap `frontend/src/utils/vacancyEstimate.ts`:
`VACANCY_WEIGHT_TABLE` (7 baris terbaca manusia: DAILY +24 · WEEKLY +20 · BIWEEKLY +16 · MONTHLY +10 ·
SMESTERLY +6 · YEARLY 0 · tanpa data 0, tiap baris satu alasan), `termRisk()`, `rollsMonthly()`, aturan
**bulanan bergulir** P34 (a) di `estimateVacancyOnDate`, dan pemilih tanggal `estimateNextVacancy()` untuk
kartu katalog. `vacancyCalendar.ts` tidak menambah perhitungan apa pun. Backend
(`marketing-public-rooms.service.ts`) mengirim `pricingTerm` + fakta kontrak ber-whitelist di **kalender** dan
**katalog**; tipe `PublicRoom`/baris kalender di FE ikut diperbarui. `RoomCard.tsx` memasang chip
"Perkiraan kosong &lt;tgl&gt; · peluang …"; `AvailabilityHeatmap.tsx` merender `VACANCY_WEIGHT_TABLE` sebagai
tabel HTML (caption + `th scope`) di panel legenda.

**C. Angka sebelum → sesudah** (estimator lokal dijalankan atas payload kalender produksi 2026-10-23…11-05;
skrip sekali pakai di `$TMPDIR`, tidak masuk repo):

| Hal | Sebelum (potret S2) | Sesudah (kode S3) |
|---|---|---|
| Sebaran skor 13 kamar, dinilai hari ini | 53 · 63 · 100 | 100×2 · 63×3 · 53×8 → **3 nilai** (tidak berubah; payload produksi belum membawa `pricingTerm`) |
| Kamar dengan **peristiwa kosong bertanggal** | 3 (A 26/10, D 24/10, J 30/10) | **11** (A 26/10, D 24/10, J 30/10, B/G/L 1/11, M 3/11, I 5/11, F2 8/11, H/K 10/11) |
| Skor pada tanggal peristiwa | 53 (A/D/J) · 100 (C, F1) | 100×2 · 53×11 → 2 nilai |
| Bobot masa sewa | tidak ada | DAILY +24 · WEEKLY +20 · BIWEEKLY +16 · MONTHLY +10 · SMESTERLY +6 · YEARLY 0 |
| Sensitivitas term (skor 13 kamar bila payload membawa term itu) | — | DAILY 87/77 · WEEKLY 83/73 · BIWEEKLY 79/69 · MONTHLY 73/63 · SMESTERLY 69/59 · YEARLY 63/53 |
| `pricingTerm` per kamar di produksi | tidak dikirim | **UNKNOWN** — belum ada di payload produksi (deploy = S9) dan DB tidak terbaca |

**D. Verifikasi** — hasil apa adanya, **potret 2026-10-23** (angka test di bawah boleh basi; ukur ulang dengan
perintahnya). `cd frontend` → `npx tsc --noEmit` **exit 0** · `npx vitest run` penuh
**potret 2026-10-23: 62 berkas, 367 test lulus** · `npx vitest run src/test/unit/vacancyEstimate.test.ts
src/test/unit/vacancyCalendar.test.ts` **potret 2026-10-23: 41 test lulus** · `npx vitest run
src/test/components/roomCard.test.tsx` **potret 2026-10-23: 6 test lulus** · `cd backend` →
`npx tsc --noEmit -p tsconfig.json` **exit 0** · `node scripts/check-docs.mjs` **BERSIH — 0 pelanggaran** ·
`node scripts/check-fitur.mjs` **bersih** · `git diff --check` **bersih**. Bukti satu sumber:
`rg -n "termRisk|remainingRisk|tenureRisk|VACANCY_WEIGHT_TABLE" --glob "frontend/src/**"` hanya cocok di
`utils/vacancyEstimate.ts` + berkas test; UI hanya mengimpor.

**E. Batas kejujuran sesi ini.** (1) **Tidak di-deploy** dan `PUBLIC_ONLINE_BOOKING_ENABLED` tidak disentuh;
kode baru belum pernah jalan di produksi, jadi `pricingTerm` belum terbukti sampai jumpa di payload nyata.
(2) **Tidak dijalankan**: `cd backend && npm run test:unit` — S3 tidak menyentuh `pricing.helper.ts`/rumus
uang/skema; `npm run build`; axe/keyboard di browser 390/768/1440 px (itu S4/S9). Tampilan chip di kartu dan
tabel bobot di heatmap **belum dilihat mata di browser** — yang terbukti hanya "test render lulus", bukan
"tampilannya benar". (3) Sebaran skor tetap **sempit (3 nilai)** karena term belum dikirim server: bobot
`termRisk` hanya membedakan kamar bila kamar-kamarnya punya masa sewa berbeda. Bobot **tidak** digeser supaya
"kelihatan bagus". (4) Peristiwa kosong 11 kamar adalah hasil aturan bergulir atas data kontrak yang **sudah
lewat tanggal** — bukan bukti penghuni benar-benar akan keluar; tetap berlabel "perkiraan, bukan janji".
(5) `pricingTerm` per kamar, Stay ACTIVE, CheckoutRequest, dan jumlah akun TENANT tetap UNKNOWN.

### 8.13 Sesi 23 Okt 2026 (sesi S4) — label "Kmr X" + kartu compact: bukti

**A. L1 ukur ulang** (dijalankan sesi S4, potret 2026-10-23; perintah + hasil apa adanya).

| Hal | Hasil ukur | Selisih vs potret prompt |
|---|---|---|
| HEAD / branch | `30ebfdf3` · `main` · `## main...origin/main` (sinkron, tidak ada commit tertunda) | sama |
| Build produksi | `Z1Qr7_YnZFAK` (`GET /version.json`) | sama |
| Kamar | 13: A,B,C,D,G,H,I,J,K,L,M,F1,F2 (payload `/api/public/rooms` 11.974 B) | sama |
| Huni | `occupied 12 · bookable 1 · maintenance 0 · reserved 0 · total 13` (`/api/public/rooms/summary`) | sama |
| Booking online publik | MATI — `onlineBookingEnabled` true di **0 dari 13** kamar | sama |
| Tanggal kontrak | **8** berakhir 1–10 Okt 2026 (B,G,H,I,K,L,M,F2) · **3** di depan (A 26/10, D 24/10, J 30/10) · C dan F1 tanpa tanggal | sama dengan §8.11/§8.12 |
| `pricingTerm` di payload produksi | **TIDAK ADA** (kode S3 belum di-deploy) | sama |
| Kunci SSH/deploy | **tetap TIDAK ADA** — `~/.ssh` tidak ada, `$TEMP/kost48ssh` tidak ada, tidak ada `*.pem` hasil pencarian di `C:\Users\lieml` | izin akses ukur (keputusan S2) **belum** bisa dipakai di mesin ini |
| Stay ACTIVE / baris CheckoutRequest / akun TENANT | **UNKNOWN** — tanpa akses DB; tidak dikarang | sama |
| Cacat Kmr C | katalog `OCCUPIED`, kalender `AVAILABLE` | sama; dicatat, **tidak** diperbaiki (bukan S4) |

**B. Yang berubah (kode, sesi ini).**

- `frontend/src/utils/publicRoomDisplay.ts` — `roomDisplayCode(code, fallback)` + `ROOM_DISPLAY_CODE_PREFIX`
  ("Kmr"). **Satu tempat**; `Room.code` di data tidak berubah. Spasi dirapikan, kode kosong/`null` memakai
  `fallback` pemanggil supaya tidak ada label "Kmr " menggantung.
- `frontend/src/components/rooms/RoomCard.tsx` — label `Kmr A`, `room.name` turun jadi subjudul, tabel harga
  **6 term** + daftar fasilitas dipangkas dari kartu (keduanya tetap lengkap di halaman detail), harga bulanan
  menjadi **satu elemen dominan**. Chip peluang kosong S3 **tetap** dirender (`VacancyChip` tidak disentuh).
- `frontend/src/pages/public/publicGuestShared.tsx` — `RoomPreviewCard` memakai helper yang sama; nama kamar
  jadi subjudul. Tidak ada selektor `.gx-*` baru (berkas CSS hanya boleh diubah pada `.rm-*`).
- `frontend/src/pages/rooms/PublicRoomDetailPage.tsx` — `h1` dan `h2` "Kmr X", nama kamar pindah ke baris
  subjudul; rincian (6 term tarif, fasilitas, deposit, DP) **tidak** dipangkas.
- `frontend/src/styles/11-public-pages.css` — **hanya selektor `.rm-*`**: gambar kartu 190→156 px (144 px di
  ≤640 px), padding/gap lebih rapat, skala teks kartu menjadi **3 ukuran** (1.35 / 1 / .75 rem), target sentuh
  tombol bandingkan 32→44 px, tombol geser foto 28→44 px, tombol aksi + "Lihat detail" `min-height: 44px`.
  **Cacat kontras yang ditemukan lalu diperbaiki**: `.rm-btn-detail:hover` memakai `--pub-brand-blue-hover`
  (`#0284c7`) = **4,09:1** di atas kartu putih → gagal WCAG AA (4,5:1) dan itulah satu-satunya violation yang
  sempat muncul; hover diganti `#075985` = **7,93:1**.
- Test: `roomDisplayCode.test.ts` (baru, 6 kasus) · `roomPreviewCard.test.tsx` (baru, 2 kasus) ·
  `roomCard.test.tsx` diperbarui (label "Kmr A-01", fallback kode kosong, harga dominan & tidak ada tabel di
  kartu) · `e2e/a11y/rooms.spec.ts` (baru, 3 test: 3 lebar + axe + target sentuh, tabel bobot heatmap, judul
  halaman detail).
- `docs/FITUR.md` **tidak** disentuh: tidak ada path komponen/rute yang berubah (`check-fitur` bersih).

**C. Angka sebelum → sesudah.**

Kartu pertama di `/rooms` (`?avail=all&sort=price-asc`, 9 kartu halaman 1), diukur `getBoundingClientRect()`.
"Sebelum" = **kartu yang dilayani produksi** (`buildId Z1Qr7_YnZFAK`, kode sebelum S3 dan S4 → tanpa chip);
"sesudah" = **build lokal** sesi S4.

| Lebar | Tinggi kartu sebelum (produksi) | Tinggi kartu sesudah (lokal S4) | Δ |
|---|---:|---:|---:|
| 390 px | 703 px (lebar 366) | **452 px** (lebar 366) | −251 px (−36%) |
| 768 px | 721 px (lebar 237) | **485 px** (lebar 237) | −236 px (−33%) |
| 1440 px | 650 px (lebar 421) | **429 px** (lebar 421) | −221 px (−34%) |

| Hal | Sebelum | Sesudah |
|---|---|---|
| Tabel harga di kartu | 6 baris per kartu (54 baris untuk 9 kartu) | **0** — harga bulanan 1 baris (elemen dominan) |
| Daftar fasilitas di kartu | ada (`FacilityList`, maks 3) | **0** — pindah ke halaman detail |
| Ukuran teks di kartu | 8 nilai (.65/.7/.72/.74/.78/.8/1.1/1.25 rem) | **3** nilai (1.35 / 1 / .75 rem) + glyph ikon |
| Target sentuh kontrol kartu | 32 px (bandingkan), 28 px (geser foto), ±31 px (tombol aksi) | **≥ 44 × 44 px**, 0 kontrol di bawah 44 px pada 390/768/1440 px |
| Kontras tombol "Lihat detail" saat hover | 4,09:1 (`#0284c7`) — gagal AA | **7,93:1** (`#075985`) |
| axe-core violation `/rooms` | belum pernah diukur | **0** di 390/768/1440 px (termasuk `--repeat-each=2` → 6 test lulus); 1 violation yang sempat muncul = cacat kontras hover `.rm-btn-detail` yang **diperbaiki** — lihat §B dan §E.3 |
| Scroll horizontal | belum pernah diukur | **tidak ada** di 390/768/1440 px |
| Label kamar | "A" / "F1" di kartu; judul detail = `room.name` | **"Kmr A" / "Kmr F1"** di kartu, kartu pratinjau, dan judul detail |
| Chip peluang kosong S3 di kartu | ada di kode, belum pernah dirender | **tampil & benar**: "Perkiraan kosong 30/10 · peluang …", `title` memuat "bukan janji" |

**D. Verifikasi** — hasil apa adanya (potret 2026-10-23/24, build **lokal**, bukan produksi).

- `cd frontend && npx tsc --noEmit` → **exit 0**.
- `cd frontend && npx vitest run` → potret 2026-10-23/24: **64 berkas / 377 test lulus** (riwayat: potret S3 di
  §8.12 = 62 berkas / 367 test; S4 menambah 2 berkas dan 10 test).
- `cd frontend && npx vitest run src/test/unit/roomDisplayCode.test.ts src/test/components/roomCard.test.tsx
  src/test/components/roomPreviewCard.test.tsx` → potret 2026-10-23/24: **3 berkas / 16 test lulus**.
- `cd frontend && npx playwright test e2e/a11y/rooms.spec.ts` → **3 test lulus**; potret akhir dengan
  `--repeat-each=2` → **6 test lulus** (chromium, `baseURL` `http://localhost:5173`, dev server lokal).
  Angka yang dicetak spec: 390 px → kartu 9, kontrol 29, minW/minH **44/44**, axe **0**; 768 px → idem;
  1440 px → idem; chip "Perkiraan kosong 30/10"; axe saat tombol detail di-hover → **0**.
  Screenshot (di **luar repo**, `%TEMP%\kost48-s4-shots`): `rooms-390.png`, `rooms-768.png`,
  `rooms-1440.png`, `rooms-390-card.png`, `rooms-768-card.png`, `rooms-1440-card.png`,
  `rooms-detail-390.png` + `s4-rooms-measure.json`.
- `node scripts/check-fitur.mjs` → `bersih — 58 fitur, 80 rute, 80 rute App.tsx`.
- `node scripts/check-docs.mjs` → **BERSIH — 0 pelanggaran**; `node scripts/check-docs.selftest.mjs` tidak dijalankan.
- `git diff --check` → bersih; `git status --short` → hanya 8 berkas terlacak berubah + 3 berkas baru milik S4
  (tidak ada `git add -A`; berkas untracked lama tetap tidak disentuh).
- **TIDAK dijalankan**: `cd backend && npx tsc --noEmit -p tsconfig.json` dan `cd backend && npm run test:unit`
  — S4 tidak menyentuh backend/uang/jurnal/skema. `npm run build` tidak dijalankan (deploy = S9).

**E. Batas kejujuran sesi ini.**

1. **Tidak di-deploy**, `PUBLIC_ONLINE_BOOKING_ENABLED` tidak disentuh. Semua bukti visual berasal dari
   **build lokal**; produksi masih `Z1Qr7_YnZFAK` (kode pra-S3/S4), jadi tidak ada satu pun klaim "tampilan
   produksi sudah begini".
2. **Data uji bukan data produksi**: spec memakai fixture 13 kamar dengan kode yang sama, tetapi tanggal
   kontrak/tarif dibuat relatif terhadap hari berjalan supaya chip deterministik. Yang terbukti: perilaku
   tampilan terhadap bentuk payload, bukan terhadap isi DB produksi.
3. **Axe sempat tidak stabil, penyebabnya ditemukan dan diperbaiki (bukan ditoleransi).** Satu run mencatat
   1 violation di 390 px, menghilang di run berikutnya. Setelah spec mencetak rincian node, violation itu
   adalah `color-contrast` pada `.rm-btn-detail` — terjadi hanya ketika tetikus kebetulan berhenti di tombol itu
   (efek tangkapan layar kartu), karena warna **hover** lamanya `#0284c7` hanya **4,09:1** di atas kartu putih
   (gagal AA 4,5:1). Probe 4 keadaan (hover/tanpa hover, 2×) menunjukkan `color: rgb(3,105,161)` = 5,93:1 tanpa
   hover. Diperbaiki dengan hover `#075985` = 7,93:1, **dan** spec sekarang (a) memindahkan tetikus ke posisi
   netral sebelum axe dan (b) mengukur axe lagi saat tombol detail di-hover, supaya regresi ini tidak kembali
   diam-diam. Cacat ini **sudah ada sebelum S4** (aturan hover lama), bukan akibat pemangkasan kartu.
4. **Halaman detail punya 3 pelanggaran axe lama** yang **bukan** dari S4 — `color-contrast`
   (`.room-detail-above-fold-price`), `landmark-one-main` (shell halaman tanpa `<main>`), `region`. Dicatat
   sebagai temuan bertanggal; **tidak** diperbaiki karena di luar fase ini dan menyentuh shell halaman publik.
   Konsekuensinya: klaim "axe 0" hanya berlaku untuk `/rooms`, bukan seluruh halaman publik.
5. **Target sentuh 44 px** diukur pada kontrol yang **terender**. Tombol geser foto (`‹ ›`) hanya dirender saat
   gambar di-hover, jadi di layar sentuh ia tidak muncul — diukur setelah hover dipaksa, bukan gaya sentuh nyata.
6. **Yang belum pernah dilihat mata**: (a) tampilan `/rooms` di perangkat/sentuh sungguhan — yang ada hanya
   tangkapan Chromium desktop-emulasi 390/768/1440 px; (b) `RoomPreviewCard` di halaman beranda tamu
   (`PublicGuestDashboardPage`) — bukti hanya unit test render; (c) halaman publik lain yang sama-sama memakai
   `11-public-pages.css` (mis. beranda/tim kami) — meskipun diff hanya menyentuh `.rm-*`, tidak ada tangkapan
   layar halaman itu di sesi ini.
7. **Informasi yang hilang dari kartu adalah keputusan sadar**: harga semua term dan daftar fasilitas hanya ada
   di halaman detail sekarang. Kalau owner ingin salah satunya kembali ke kartu, itu perubahan S4 lanjutan
   (bukan regresi diam-diam).
8. `pricingTerm` per kamar, Stay ACTIVE, baris CheckoutRequest, dan jumlah akun TENANT tetap **UNKNOWN**
   (tanpa akses DB). Cacat Kmr C tetap dicatat, tidak diperbaiki.

### 8.14 Sesi 24 Okt 2026 (sesi S5) — identitas: bukti anti-enumerasi dan penguncian percobaan

**A. L1 ukur ulang** (dijalankan sesi S5, potret 2026-10-24; perintah + hasil apa adanya).

| Hal | Hasil ukur | Selisih vs potret prompt |
|---|---|---|
| HEAD / branch | `04b26a23` · `main` · `## main...origin/main` (sinkron, tidak ada commit tertunda) | sama |
| Build produksi | `Z1Qr7_YnZFAK` (`GET /version.json`) | sama — kode S3, S4, dan S5 belum di-deploy |
| Kamar | 13: A,B,C,D,G,H,I,J,K,L,M,F1,F2 (payload `/api/public/rooms` 11.974 B) | sama |
| Huni | `occupied 12 · bookable 1 · maintenance 0 · reserved 0 · total 13` | sama |
| Booking online publik | MATI — `onlineBookingEnabled` true di **0 dari 13** kamar | sama |
| `pricingTerm` di payload produksi | **TIDAK ADA** (kode S3 belum di-deploy) | sama |
| Kunci SSH/deploy | **tetap TIDAK ADA** — `~/.ssh` tidak ada, `$TEMP/kost48ssh` tidak ada, tidak ada `*.pem` di `C:\Users\lieml` (kedalaman 2) | izin akses ukur (keputusan S2) **belum** bisa dipakai di mesin ini |
| Stay ACTIVE / baris CheckoutRequest / akun TENANT | **UNKNOWN** — tanpa akses DB; tidak dikarang | sama |
| Cacat Kmr C | katalog `OCCUPIED`, kalender `AVAILABLE` | sama; dicatat, **tidak** diperbaiki (bukan S5) |

**B. Yang berubah (kode, sesi ini).**

- `backend/src/auth/auth.service.ts` **(1) anti-enumerasi waktu respons.** `DUMMY_PASSWORD_HASH =
  bcrypt.hashSync(<sandi acak>, 10)` dibuat **sekali saat modul dimuat**; cost 10 = cost seluruh hash sandi
  di repo ini. Jalur "identifier tidak ditemukan" sekarang menjalankan
  `await bcrypt.compare(dto.password, DUMMY_PASSWORD_HASH)` sebelum melempar galat, sehingga ia membayar
  satu `bcrypt.compare` seperti jalur "sandi salah". Pesan dan status kedua jalur tetap **identik**
  (`Email/nomor HP atau password salah`, 401) — tidak ada pesan/status baru yang bisa dipakai menebak
  keberadaan akun.
- `backend/src/auth/auth.service.ts` **(2) penguncian percobaan.** Peta `failedLoginAttempts` per proses:
  kunci = identifier ternormalisasi (`08xx` dan `628xx` **berbagi satu hitungan**, email di-lowercase) **+ IP**;
  `MAX_FAILED_LOGIN_ATTEMPTS = 5`; `LOGIN_LOCKOUT_MS = 15 menit` dihitung dari saat ambang dilampaui;
  percobaan saat terkunci → `429` dengan pesan yang menyebut sisa menit. Tidak ada kunci permanen: setelah
  jeda lewat, hitungan dibuang dan login normal kembali. Login dengan sandi benar menghapus hitungan.
- `backend/src/auth/auth.service.ts` **(2b) audit tersamar.** Saat kunci aktif, satu baris
  `AuditLog` ditulis dengan `action = AUTH_LOGIN_LOCKOUT`, `entityType = Auth`, `entityId` = bentuk tersamar,
  dan `meta = { identifierMask, clientIp, failedAttempts, lockedForMinutes }`. Bentuk tersamar =
  `email|phone:hmac-<12 hex>` dari **HMAC-SHA256 dengan kunci acak per proses**, bukan `sha256` polos: ruang
  nomor HP Indonesia cukup kecil untuk dibalik brute force, jadi hash tanpa kunci bukan penyamaran. Kegagalan
  menulis audit **tidak** membatalkan penguncian (dicatat sebagai `logger.error` tanpa identifier).
- `backend/src/auth/auth.service.ts` **(2c) batas memori.** Peta dibatasi `FAILED_LOGIN_MAX_KEYS = 10.000`
  dengan prune dua tahap (buang entri kedaluwarsa, lalu buang yang paling awal) supaya serangan identifier
  unik tidak menghabiskan RAM. Batas ini **wajib dibaca sebagai batas**: peta hidup di memori proses, jadi
  penguncian **tidak berlaku lintas replika**; tidak ada Redis/dependency baru.
- `backend/src/auth/auth.controller.ts` — `login()` meneruskan `req.ip` sebagai `LoginRequestContext`.
  `main.ts` sudah menyetel `trust proxy = 1`, jadi IP adalah IP klien di belakang Passenger/LiteSpeed.
- `backend/src/common/guards/rate-limit.guard.ts` — **tidak diubah.** Bucket `login` (10 permintaan / 5 menit
  per IP) tetap; penguncian 5 kegagalan per identifier+IP lebih dulu bekerja, guard tetap pagar luar per IP.
- Test baru `backend/test/unit/auth-anti-enumeration.test.js` (6 kasus) dan dua kasus baru di
  `backend/test/unit/auth-login-refresh.test.js` (LOGIN-6, LOGIN-7).
- **NIK tidak menjadi kredensial (P35 a) — bukti pemeriksaan kode, bukan klaim.** `identityNumber` tidak
  muncul sama sekali di `backend/src/auth/`; di seluruh `backend/src/` (tanpa `src/generated/**`) ia hanya
  muncul di `tenants.service.ts` (validasi keunikan NIK saat admin menyimpan data KTP, `identityNumber: true`
  pada `select`), `public-bookings.service.ts` (menyimpan NIK saat pengajuan tamu),
  `owner-ai.service.ts` (membaca NIK untuk konteks AI), dan dua DTO. **0** dari `user.findFirst`/`findUnique`
  di `backend/src/**` memakai `identityNumber`; jalur login hanya mencari lewat `email` lalu `Tenant.phone`
  (`role: TENANT`, `isActive: true`).

**C. Angka sebelum → sesudah.**

| Hal | Sebelum (potret S4) | Sesudah (kode S5) |
|---|---|---|
| `bcrypt.compare` pada jalur identifier tak dikenal | **0** (langsung lempar galat) | **1** terhadap hash tiruan cost 10 |
| Median waktu respons dua jalur (9 sampel + 2 pemanasan, ambang **20 ms** di berkas test) | belum pernah diukur | identifier tak dikenal **201,7 ms** · sandi salah **203,5 ms** → **selisih 1,7 ms** |
| Biaya satu `bcrypt.compare` cost 10 di mesin ini | — | **191,2 ms** (pembanding: tanpa hash tiruan selisihnya mendekati satu bcrypt penuh) |
| Pesan galat & status HTTP dua jalur | sama (`Email/nomor HP atau password salah`, 401) — tapi waktunya berbeda | sama **dan** waktunya setara |
| Percobaan gagal sebelum dikunci | tidak ada batas per akun (hanya 10 permintaan/5 menit per IP dari guard) | **5** per identifier+IP, lalu **429** "Coba lagi dalam 15 menit" |
| Jejak audit saat terkunci | tidak ada | 1 baris `AuditLog` `AUTH_LOGIN_LOCKOUT`, identifier **tersamar** (`email:hmac-…` / `phone:hmac-…`, 12 hex) |
| Test backend (`npm run test:unit`) | **203 lulus / 0 gagal** (6 suite) | **211 lulus / 0 gagal** (6 suite) — +6 kasus anti-enumerasi, +2 kasus TENANT lama |
| Kasus `auth-login-refresh.test.js` | 11 | **13** (LOGIN-6 email, LOGIN-7 nomor HP berformat bebas) |

Catatan metoda: pengukuran **pertama** (tanpa pemanasan JIT) memberi selisih **14,6 ms** — masih di bawah
ambang, tetapi terlalu dekat untuk diandalkan. Yang ditambahkan adalah **pemanasan dua putaran yang dibuang**,
bukan perubahan ambang; ambang tetap **20 ms** dan tetap ditulis di berkas test bersama alasannya.

**D. Verifikasi** — hasil apa adanya (potret 2026-10-24).

- `cd backend && npm run test:unit` (memicu `pretest:unit` = full build) → potret 2026-10-24: **211 test lulus,
  0 gagal**, 6 suite, 198 subtest TAP, exit 0.
- `cd backend && node --test test/unit/auth-anti-enumeration.test.js` → **6/6 lulus**.
  `cd backend && node --test test/unit/auth-login-refresh.test.js` → **13/13 lulus**.
- `cd backend && npx tsc --noEmit -p tsconfig.json` → **exit 0**.
- `cd frontend && npx tsc --noEmit` → **exit 0**. **`npx vitest run` sengaja TIDAK dijalankan**: frontend tidak
  disentuh sama sekali (tidak ada berkas `frontend/**` di diff) dan tidak ada string pesan login yang berubah
  di FE — pesan `Email/nomor HP atau password salah` datang dari backend, FE hanya menampilkannya.
- `node scripts/check-fitur.mjs` → `bersih — 58 fitur, 80 rute, 80 rute App.tsx`.
- `node scripts/check-docs.mjs` → **BERSIH — 0 pelanggaran**; `git diff --check` → bersih.
- Berkas yang berubah: `backend/src/auth/auth.service.ts`, `backend/src/auth/auth.controller.ts`,
  `backend/test/unit/auth-login-refresh.test.js`, berkas baru `backend/test/unit/auth-anti-enumeration.test.js`,
  plus dokumen ini dan `docs/ANTREAN.md`. **`rate-limit.guard.ts` tidak disentuh.**

**E. Batas kejujuran sesi ini.**

1. **Uji manual "12 akun TENANT lama tetap bisa masuk" = BELUM TERBUKTI**, bukan "lulus". Yang terbukti hanya
   unit test dengan **Prisma tiruan** (LOGIN-6/LOGIN-7) atas bentuk akun yang sama: TENANT dengan email, dan
   TENANT tanpa email yang masuk lewat nomor HP. Butuh **kunci akses baca-saja produksi** (keputusan register
   `ROOMS-AKUN-V2 S2`) yang **belum ada di mesin ini**; angka akun TENANT di produksi tetap **UNKNOWN**.
2. **Tidak di-deploy.** Produksi masih `Z1Qr7_YnZFAK`, jadi tidak ada satu pun klaim "anti-enumerasi bekerja di
   produksi". Seluruh angka waktu di §C diukur di mesin kerja dengan Prisma tiruan, **bukan** dengan latensi
   PostgreSQL/Passenger sungguhan.
3. **Residu waktu yang diketahui dan tidak ditutup**: jalur email dikenal dan email tak dikenal sama-sama
   melakukan **1** kueri, tetapi jalur **nomor HP** tak dikenal melakukan 2 kueri (`User` lalu `Tenant`) dan
   nomor HP dikenal 3 kueri. Selisih ±1 kueri (~orde 1 ms) tertutup oleh biaya bcrypt (~190 ms di mesin ini),
   tetapi tidak nol. Tidak diukur di test karena Prisma tiruan tidak punya latensi.
4. **`bcrypt.compare` tiruan mengasumsikan semua hash sandi produksi cost 10.** Seluruh pemanggilan
   `bcrypt.hash(...)` di `backend/src/**` memakai cost 10, tetapi hash warisan yang dibuat di luar kode ini
   tidak bisa diperiksa tanpa akses DB. Bila ada akun ber-cost lain, jalur itu tetap lebih lambat/lebih cepat
   dari hash tiruan.
5. **Penguncian in-memory tidak lintas replika** dan hilang saat proses restart. Ini batas yang ditulis, bukan
   cacat tersembunyi; memperbaikinya butuh penyimpanan bersama (Redis/DB) = keputusan owner + dependency baru.
6. **Pesan 429 menyebut sisa waktu** sesuai rencana §8.10 S5. Pesan itu **tidak** membocorkan keberadaan akun
   karena hitungan gagal juga ditambah di cabang `!user` (`registerFailedLogin` dipanggil sebelum galat 401
   dilempar), sehingga identifier yang tidak ada bisa terkunci dengan pesan yang sama. Sifat ini terbukti
   **dari kode**, **bukan** dari test khusus: ENUM-3 mengunci akun yang ada, ENUM-1/ENUM-2 hanya melakukan satu
   kegagalan pada identifier tak dikenal (tidak sampai ambang).
7. **Yang belum pernah dijalankan**: uji beban/paralel atas peta penguncian; uji di perangkat/browser; login
   sungguhan ke API produksi; `npm run build` untuk deploy (deploy = S9).

### 8.15 Sesi 24 Okt 2026 (sesi S6) — pemisahan calon penghuni dan penghuni

**A. L1 ukur ulang** (dijalankan sesi S6, potret 2026-10-24; perintah + hasil apa adanya).

| Hal | Hasil ukur | Selisih vs potret prompt |
|---|---|---|
| HEAD / branch | `04b26a23` · `main` · `## main...origin/main` (sinkron) | sama |
| Working tree saat mulai | 5 modified + 1 untracked = kerja S5 (`auth.service.ts`, `auth.controller.ts`, `auth-login-refresh.test.js`, `docs/ANTREAN.md`, berkas ini, `auth-anti-enumeration.test.js`) — **utuh, tidak disentuh** | sama |
| Build produksi | `Z1Qr7_YnZFAK` (`GET /version.json`) | sama — kode S3–S6 belum di-deploy |
| Kamar | 13: A,B,C,D,G,H,I,J,K,L,M,F1,F2 (payload `/api/public/rooms` 11.974 B) | sama |
| Huni | `occupied 12 · bookable 1 · maintenance 0 · reserved 0 · total 13` | sama |
| Booking online publik | MATI — `onlineBookingEnabled` true di **0 dari 13** | sama |
| `pricingTerm` di payload produksi | **TIDAK ADA** (kode S3 belum di-deploy) | sama |
| Kunci SSH/deploy | **tetap TIDAK ADA** — `~/.ssh` tidak ada, `$TEMP/kost48ssh` tidak ada, tidak ada `*.pem` (kedalaman 2) | izin akses ukur (register `ROOMS-AKUN-V2 S2`) **belum** bisa dipakai di mesin ini |
| Stay ACTIVE / baris CheckoutRequest / akun TENANT / `pricingTerm` per kamar | **UNKNOWN** — tanpa akses DB; tidak dikarang | sama |
| Cacat Kmr C | katalog `OCCUPIED`, kalender `AVAILABLE` | sama; dicatat, **tidak** diperbaiki (bukan S6) |

**B. Yang berubah (kode, sesi ini).**

- `frontend/src/config/navigation.ts` — **satu sumber pemisahan tahap.** Definisi eksplisit
  `TENANT_CANDIDATE_STAGES` (`browsing`+`booking` = calon), `TENANT_OCCUPANT_STAGE` (`occupied`),
  `isTenantCandidateStage()`, `isTenantOccupantStage()`, `TENANT_STAGE_NAMES`. Izin rute per tahap
  `TENANT_ROUTE_STAGES` (tujuan → tahap) + `tenantStageAllowsRoute()`. Inventaris menu
  `TENANT_MENU_ITEMS` (tujuan + ikon + hint, **tanpa** label), **satu** tabel label per tahap
  `TENANT_STAGE_LABELS`, dan `TENANT_ALL_MENU_TITLE = 'Lihat semua menu'`. `getTenantMenuLinks()` +
  `getTenantMenuItemStages()` diekspor untuk uji cakupan.
- `frontend/src/hooks/useTenantPortalStage.ts` — tipe tahap diambil dari `config/navigation.ts`
  (**satu** union, bukan dua salinan), hasil hook menambah `stageName` + `isCandidate`. Sumber data
  **tidak diubah**: `/stays/me/current` + `/tenant/bookings/my` dengan query key yang sama.
- `frontend/src/components/layout/ProtectedRoute.tsx` — menerima `allowRoles` dan (khusus TENANT)
  `allowStages`. Penolakan → toast pesan jelas **lalu** `<Navigate replace>` ke
  `getDefaultRoute(role, stage)`; selama tahap masih dimuat ditampilkan `PageLoadingSkeleton`, bukan
  penolakan prematur. Tidak ada layar kosong / spinner abadi.
- `frontend/src/App.tsx` — 12 rute portal tenant dipisah dari **sumber yang sama**
  (`TENANT_ROUTE_STAGES`): grup terbuka calon+penghuni (`/portal/bookings`, `/portal/manual`) dan grup
  khusus penghuni (`/portal/stay`, `/portal/invoices[/:id]`, `/portal/tickets`, `/portal/energy`,
  `/portal/announcements[/:id]`, `/portal/loyalty`, `/portal/wifi`, `/portal/checkout`,
  `/portal/renewal`). `/rooms` dan `/portal/booking/:roomId` **tidak** dikunci (katalog publik untuk
  calon; rute booking punya `TenantBookingRouteGuard` sendiri). Rute 3 peran lain tidak disentuh.
- `frontend/src/test/unit/navigation.test.ts` — diperluas 8 → **13 test** (tidak ada yang dihapus).
- `frontend/src/test/pages/protectedRouteStage.test.tsx` — **baru**, 6 test guard.
- `frontend/src/test/fixtures/mobileNavBaseline.json` — baseline W-OWN-010 diregenerasi lewat mekanisme
  bawaan test (hapus → jalankan → jalankan lagi). Diff dibaca: **hanya** tiga label tenant berubah
  ("Panduan Kos Saya"→"Kamar saya", "Bayar Tagihan"→"Tagihan", "Lapor Masalah"→"Lapor masalah");
  struktur, href, dan entri staff/admin/owner identik.
- `backend/src/modules/stays/stays-query.service.ts` — `findCurrentForTenant`: TENANT tanpa baris
  `Tenant` kini `NotFoundException` **404** (dulu `ConflictException` 409), sejalan dengan FE yang
  memperlakukan 404 sebagai "belum ada sewa".
- `backend/src/modules/tenant-bookings/tenant-bookings.service.ts` — `findMine`: TENANT tanpa baris
  `Tenant` kini mengembalikan `{ items: [], meta }` **tanpa galat dan tanpa kueri stay**.
- `backend/test/unit/tenant-stage-access.test.js` — **baru**, 6 kasus regresi.

**C. Angka sebelum → sesudah.**

| Hal | Sebelum (potret S5) | Sesudah (kode S6) |
|---|---|---|
| `ProtectedRoute` memeriksa | token saja | token + peran (`allowRoles`) + tahap TENANT (`allowStages`) |
| Rute portal tenant yang dijaga tahap | **0** dari 12 | **12** dari 12 (2 rute untuk semua tahap, 10 rute khusus penghuni) |
| Menu tahap `browsing` | 1 tautan (`/rooms`) | 3 tautan (Cari kamar, Pengajuan saya, Panduan) dalam 2 seksi |
| Menu tahap `booking` | 2 tautan, termasuk `/portal/invoices` ("Tagihan Awal") | 3 tautan, **tanpa** rute bayar/tagihan |
| Menu tahap `occupied` | "Portal Penghuni"/"Lainnya", label "Panduan Kos Saya"/"Bayar Tagihan" | "Menu utama"/"Lihat semua menu", label "Kamar saya"/"Tagihan" |
| Seksi jalan keluar "Lihat semua menu" | tidak ada (seksi bernama "Lainnya" hanya di tahap occupied) | ada di **3 dari 3** tahap, isinya tepat semua tujuan sah tahap itu |
| TENANT tanpa baris Tenant → `GET /stays/me/current` | **409** Conflict | **404** Not Found |
| TENANT tanpa baris Tenant → `GET /tenant/bookings/my` | **409** Conflict | **200** `{ items: [] }`, 0 kueri |
| Test frontend (berkas / test) | 64 berkas / 378 test | **65 berkas / 389 test** |
| Test backend (`npm run test:unit`) | 211 lulus / 0 gagal | **217 lulus / 0 gagal** (6 suite) |

**D. Verifikasi** — hasil apa adanya (potret 2026-10-24, cwd = akar repo).

- `cd frontend && npx vitest run` (penuh, latar belakang) → potret 2026-10-24: **65 berkas / 389 test
  lulus, 0 gagal**.
- `cd frontend && npx vitest run src/test/unit/navigation.test.ts` → **13/13 lulus** (termasuk 5 kasus
  baru: larangan rute bayar untuk calon, label "Tagihan"/"Kamar saya" untuk penghuni, seksi "Lihat
  semua menu" di semua tahap, menu↔guard sepakat, menu penghuni tanpa jalan buntu).
- `cd frontend && npx vitest run src/test/pages/protectedRouteStage.test.tsx` → **6/6 lulus**.
- `cd frontend && npx tsc --noEmit` → **exit 0**.
- `cd backend && npx tsc --noEmit -p tsconfig.json` → **exit 0**.
- `cd backend && npm run test:unit` (memicu `pretest:unit` = full build) → **217 lulus, 0 gagal**,
  6 suite, exit 0. `node --test test/unit/tenant-stage-access.test.js` → **6/6 lulus**.
- `node scripts/check-fitur.mjs` → `bersih — 58 fitur, 80 rute, 80 rute App.tsx`.
- `node scripts/check-docs.mjs` → **BERSIH — 0 pelanggaran**; `wc -c docs/ANTREAN.md` → lihat laporan
  sesi (plafon 16.384 byte).
- Bukti 390 px (dev server lokal `vite --port 5174`, API ditiru, **di luar repo**
  `%TEMP%\kost48-s6-shots`): tenant calon = `Cari kamar · Pengajuan saya · Panduan` (seksi "Calon
  penghuni" + "Lihat semua menu"); tenant penghuni = `Kamar saya · Tagihan · Lapor masalah · Energi ·
  Pengumuman · Panduan · Pesan WiFi` (seksi "Menu utama" + "Lihat semua menu"); staff = 6 tautan;
  admin = 16 tautan; owner = 12 tautan. **Menu bocor 0**, `pageError` 0. Tangkapan:
  `s6-390-{tenant-calon,tenant-penghuni,staff,admin,owner}.png` + `s6-390-report.json`.

**E. Batas kejujuran sesi ini.**

1. **Tidak di-deploy.** Produksi tetap `Z1Qr7_YnZFAK`, jadi **tidak ada** klaim bahwa pemisahan akses
   berlaku di produksi. Semua bukti = build/kode **LOKAL**.
2. **Bukti 390 px bukan login sungguhan.** Sesi disuntik (token demo + cache user di
   `localStorage`/`sessionStorage`) dan API ditiru lewat *route interception* Playwright; tidak ada
   akun produksi yang dipakai dan tidak ada data penghuni sungguhan di layar. Yang terbukti:
   **pemilihan menu dan guard merender tanpa menu bocor di browser 390 px**, bukan perilaku server.
3. **Guard diuji sebagai komponen, bukan end-to-end.** Test `protectedRouteStage` memakai
   `useTenantPortalStage` tiruan; rantai "API → tahap → guard" hanya terbukti lewat unit test backend
   (`findCurrentForTenant`/`findMine`) dan test menu — **belum** lewat browser dengan token nyata.
4. **Perubahan 409 → 404 pada `!tenantId` adalah perubahan kontrak API.** Pemakai lain yang
   mengharapkan 409 harus menyesuaikan; di repo ini tidak ada test/consumer yang mengharapkan 409
   (`rg` atas `Akun tenant belum terhubung` menyisakan `tenant-bookings.service.ts` untuk
   `createBooking`/`cancel` yang **tidak** diubah).
5. **`getTenantMenuItemStages` memisahkan "boleh dibuka" dari "tampil di menu".** `/rooms` dan
   `/portal/bookings` tetap boleh dibuka penghuni lewat URL (status pengajuan untuk calon), tetapi
   tidak ditampilkan sebagai menu penghuni karena halaman itu mengalihkan ke `/portal/stay`. Ini
   keputusan teknis, bukan keputusan owner.
6. **Yang belum pernah dijalankan**: login sungguhan ke API produksi; axe/WCAG penuh untuk shell
   390 px (bukti sesi ini hanya label menu + tangkapan layar); `npm run build` untuk deploy (deploy =
   S9); uji beban atas `/tenant/bookings/my` untuk TENANT tanpa `tenantId`.
### 8.16 Sesi 24 Okt 2026 (sesi S7) — DP: gerbang akun, idempotensi, tahan double-book

**A. L1 ukur ulang** (dijalankan sesi S7, potret 2026-10-24; perintah + hasil apa adanya).

| Hal | Hasil ukur | Selisih vs potret prompt |
|---|---|---|
| HEAD / branch | `04b26a23` · `main` · `## main...origin/main` (sinkron) | sama |
| Working tree saat mulai | 13 modified + 3 untracked milik S5/S6 (`auth-anti-enumeration.test.js`, `tenant-stage-access.test.js`, `protectedRouteStage.test.tsx`) — **utuh, tidak disentuh** | sama |
| Kunci SSH/deploy | `~/.ssh` **tidak ada**, `$TEMP/kost48ssh` **tidak ada**, `*.pem` **0** — tetapi **`.ssh-kost48/` ADA** (`kost48_deploy` 419 B + `known_hosts`, 18 Okt 08:00) | **BEDA**: potret S6 menulis "TIDAK ADA". Isi kunci tidak dibaca/dicetak; sesi ini tetap tidak memakai akses produksi |
| Build produksi | **tidak diukur ulang** — tidak ada permintaan jaringan ke produksi pada sesi ini | UNKNOWN sesi ini (potret terakhir `Z1Qr7_YnZFAK`) |
| Kamar / huni / booking online publik | **tidak diukur ulang** (tidak ada panggilan API produksi sesi ini) | UNKNOWN sesi ini |
| Stay ACTIVE / baris CheckoutRequest / akun TENANT / `pricingTerm` per kamar | **UNKNOWN** — tidak ada akses DB; kunci ada tetapi tidak dipakai | sama |
| `docs/ANTREAN.md` | 16.370 byte (plafon 16.384) | sama |
| Test yang lulus | BE **217** / 6 suite · FE **389** / 65 berkas | sama |

**B. Fakta yang dibuktikan ulang dari kode sebelum menulis** (bukan ingatan):

1. `public-bookings.service.ts` membuat akun TENANT otomatis: `temporaryPassword = \`Kost48${randomInt(...)}\`` (baris 114), `bcrypt.hash` (115), `tx.user.create` (236), dan `temporaryPassword` dikembalikan di respons (381).
2. Kamar dikunci `FOR UPDATE` **2 kali** (119, 141), tetapi **tidak ada** perbandingan irisan rentang tanggal: `checkInDate`/`plannedCheckOutDate` hanya divalidasi (89–112) dan dikirim ke INSERT (291–313).
3. Kepemilikan stay pada pembayaran **sudah** difilter di SQL: `payment-submissions.queries.ts` baris 35 `AND s."tenantId" = ${tenantId}`. Jadi inti gerbang DP = tidak ada akun yang terklaim ke Tenant pemilik stay.
4. `POST /auth/register` (`auth.service.ts` 93–141) **sudah** menempelkan akun baru ke `Tenant` yang belum punya user bila emailnya cocok — itu jalur "akun lahir di titik DP" yang dipakai, dan **tidak diubah** (warisan S5).
5. Validasi bukti bayar menuntut `fileKey` untuk metode non-CASH (bukti bayar manual tetap wajib).

**C. Yang berubah (kode, sesi ini).**

- `backend/src/modules/tenant-bookings/public-bookings.service.ts` — pengajuan tamu **berhenti membuat akun**: `temporaryPassword`/`bcrypt.hash`/`tx.user.create` dihapus, `Stay.createdById` = **NULL**, audit `CREATE_PUBLIC_BOOKING` tanpa aktor User. Respons memuat **kode pengajuan** (`booking.referenceCode`) alih-alih kredensial; kunci `portalAccess` dipertahankan dengan penanda `requiresAccount`/`claimRequired` + instruksi (tanpa password). Transaksi dibungkus retry serialisasi dan memanggil cek irisan rentang.
- `backend/src/modules/tenant-bookings/tenant-bookings.helpers.ts` — tambah tiga helper bersama: `buildBookingReferenceCode(stayId)` (kode `K48-xxxx-y`, deterministik, alfabet tanpa I/O/B/0/1), `findUnclaimedGuestTenantIds()` (Tenant tanpa user + punya stay ACTIVE + kontak **exact match**), `assertNoOverlappingStayTx()` (irisan `[masuk, keluar)` per kamar, mengabaikan pengajuan kedaluwarsa yang belum bayar DP), `withSerializationRetry()` (maks 3 percobaan pada SQLSTATE 40001), dan `GUEST_CLAIM_UNIFORM_MESSAGE`.
- `backend/src/modules/tenant-bookings/tenant-bookings.service.ts` — `claimGuestBookings()` (idempoten bila sudah punya stay ACTIVE; menolak melepas akun yang punya riwayat; 0 atau >1 kandidat → pesan seragam) dan `linkBookingAccount()` (jalur cadangan OWNER/ADMIN, audit `LINK_BOOKING_ACCOUNT`). Jalur portal `createBooking` ikut memakai cek irisan + retry.
- `backend/src/modules/tenant-bookings/tenant-bookings.controller.ts` — `POST /tenant/bookings/claim` (`@Roles(TENANT)`).
- `backend/src/modules/tenant-bookings/admin-bookings.controller.ts` — `POST /admin/bookings/:stayId/link-account` (`@Roles(OWNER, ADMIN)`), DTO baru `dto/link-booking-account.dto.ts` (`userId` atau `email`).
- `backend/src/modules/payment-submissions/payment-submissions.service.ts` — gerbang DP dua lapis: `findEligibleSubmissionTarget` (SQL) + pemeriksaan `eligibility.tenantId !== tenantId`; saat stay tidak ditemukan/bukan miliknya, `buildStayOwnershipFailure()` memberi pesan berisi langkah klaim **hanya** bila kontak pemanggil cocok dengan pengajuan belum berakun, dan 404 seragam untuk sisanya. Ditambah tolak-duplikat sebelum INSERT.
- `backend/src/modules/payment-submissions/payment-submissions.utils.ts` — `PAYMENT_IDEMPOTENCY_WINDOW_MS` (24 jam) + `paymentIdempotencyWindowStart()`, mendokumentasikan batas (bukan idempotency key sejati).
- `frontend/src/types/core.ts` + `frontend/src/pages/bookings/GuestBookingSuccess.tsx` — konsekuensi kontrak respons: tipe `PublicBookingResult` menerima `referenceCode` (dan `isNewUser` jadi opsional), halaman sukses menampilkan **kode pengajuan + langkah klaim**, bukan password sementara yang sudah tidak ada.
- Test baru: `backend/test/unit/booking-guest-to-account.test.js` (10 test), `payment-idempotency.test.js` (5 test), `booking-overlap.test.js` (9 test).

**D. Angka sebelum dan sesudah** (potret 2026-10-24, semua lokal).

| Hal | Sebelum | Sesudah |
|---|---|---|
| Test backend (`npm run test:unit`) | 217 lulus / 6 suite | **241 lulus / 6 suite** (+24, tidak ada test dihapus/dilemahkan) |
| Test frontend (`npx vitest run`) | 389 lulus / 65 berkas | 389 lulus / 65 berkas (tidak berubah) |
| `user.create` saat tamu mengajukan | 1 akun per tamu baru | **0** (test mencatat 0 pemanggilan) |
| Kata sandi di respons pengajuan | ada (`temporaryPassword`) | **tidak ada** (respons hanya memuat kode pengajuan) |
| Cek irisan rentang tanggal | tidak ada | ada, di 2 jalur pembuatan booking |
| Retry SQLSTATE 40001 | tidak ada | maks 3 percobaan |
| Tolak duplikat pengajuan pembayaran | hanya "masih ada yang PENDING untuk invoice ini" | + kunci idempoten (stay+invoice+nominal+tanggal bayar) dalam jendela 24 jam |
| Endpoint baru | 0 | 2 (klaim TENANT, kait-akun OWNER/ADMIN) |
| `docs/ANTREAN.md` | 16.370 byte | 16.375 byte (plafon 16.384) |

**E. Verifikasi** — hasil apa adanya (cwd = akar repo kecuali disebut).

- `cd backend && npx tsc --noEmit -p tsconfig.json` → **exit 0**.
- `cd backend && npm run test:unit` (memicu `pretest:unit` = full build) → potret 2026-10-24: **241 lulus, 0 gagal**, 6 suite, exit 0.
- `cd frontend && npx tsc --noEmit` → **exit 0**.
- `cd frontend && npx vitest run` (penuh) → potret 2026-10-24: **65 berkas / 389 test lulus, 0 gagal**.
- `node scripts/check-fitur.mjs` → `bersih — 58 fitur, 80 rute, 80 rute App.tsx`.
- `node scripts/check-docs.mjs` → **BERSIH — 0 pelanggaran, 0 pemeriksaan dilewati**.
- `wc -c docs/ANTREAN.md` → **16.375** (≤ 16.384).
- `git diff --check` → **exit 0** (hanya peringatan CRLF pada berkas warisan S5/S6).
- `git log --oneline -1` → `04b26a23`; `git status -sb` → `## main...origin/main`, tanpa commit/push.

**F. Batas kejujuran sesi ini.**

1. **Tanpa constraint DB, double-book belum tertutup rapat.** Jaminan S7 = **aplikasi saja** (`FOR UPDATE` baris Room + cek irisan). Dua pengajuan bersamaan pada koneksi/proses/replika berbeda **masih bisa lolos**; exclusion constraint PostgreSQL tidak dibuat (keputusan owner `ROOMS-AKUN-V2 S2`) dan tidak diklaim tertutup.
2. **Idempotensi tanpa skema punya batas jendela.** Kunci diturunkan dari kolom yang sudah ada dan hanya berlaku **24 jam**; pengajuan identik setelah jendela itu tidak bisa dibedakan dari pembayaran baru. Ini bukan `Idempotency-Key` seperti Stripe.
3. **Semua bukti perilaku lewat Prisma tiruan**, bukan DB sungguhan: tidak ada transaksi PostgreSQL nyata, tidak ada `FOR UPDATE` nyata, dan skenario balapan tidak dijalankan. Yang terbukti = urutan panggilan, bentuk kueri, dan pesan galat.
4. **Retry 40001 tidak terpicu hari ini**: transaksi berjalan pada isolasi default (READ COMMITTED), serialisasi nyata datang dari `FOR UPDATE`. Pengulangan hanya diuji lewat mock.
5. **Yang belum pernah dijalankan**: deploy/`npm run build` produksi (deploy = S9); `prisma migrate` (dilarang); akses DB/SSH produksi (kunci ada di `.ssh-kost48/` tetapi tidak dipakai sesi ini); login dan klaim sungguhan ke API nyata; alur klaim di UI portal (bagian S8).
6. **Klaim memindahkan `User.tenantId`, bukan menghapus data.** Baris `Tenant` lama hasil pendaftaran tetap ada tanpa user — **tidak dihapus** (hapus data = keputusan owner). Akun yang sudah punya riwayat hunian/pengajuan ditolak untuk diklaim.
7. **Pemegang email pengajuan bisa mengklaim lewat pendaftaran.** `POST /auth/register` (warisan S5, tidak diubah) menempelkan akun baru ke `Tenant` pengajuan bila emailnya cocok, tanpa verifikasi email/OTP. S7 tidak menambah verifikasi kontak; jalur cadangan OWNER/ADMIN disediakan untuk kasus kontak berbeda.
8. **Nominal tidak disentuh.** DP tetap `roundRupiah(sewa × 30%)` (test: 1.500.000 → 450.000); `pricing.helper.ts`/`booking-charges.helper.ts`/jurnal tidak diubah.
9. **Kode pengajuan bukan autentikasi.** Ia hanya penanda yang bisa disebut ke admin; tidak bisa dipakai mengambil alih pengajuan (klaim tetap butuh akun + kontak sama persis).

**G. Data uji yang dihapus.** Tidak ada baris/data uji yang dibuat pada sesi ini: seluruh verifikasi berjalan di memori dengan Prisma tiruan, tanpa menyentuh DB produksi maupun dev. Tidak ada tabel/kolom/migrasi baru.

### 8.17 Sesi 24 Okt 2026 (sesi S8) — booking dan wizard-first per peran: bukti

**A. L1 ukur ulang** (dijalankan sesi S8, potret 2026-10-24; perintah + hasil apa adanya, cwd = akar repo).

| Hal | Hasil ukur | Selisih vs potret prompt |
|---|---|---|
| HEAD / branch | `5968bb65` · `main` · `## main...origin/main` (sinkron, tanpa commit lokal) | sama |
| Working tree saat mulai | bersih dari kerja agen; untracked milik owner (`design/`, `.design-audit/`, `*.sh`, `room-images/*.jpg|png`, `kost48-deploy-bundled*.tgz`, `rilis-hash.txt`) **utuh, tidak disentuh** | sama |
| Kunci SSH/deploy | `.ssh-kost48/` **ADA** (`kost48_deploy` 419 B + `known_hosts` + `owner-password-baru.txt`), `kost48-known_hosts` ADA. Isi kunci tidak dibaca/dicetak; sesi ini **tidak** memakai akses produksi | sama |
| Build produksi | **tidak diukur ulang** (tidak ada permintaan jaringan ke produksi pada sesi ini) | UNKNOWN sesi ini (potret terakhir `Z1Qr7_YnZFAK`) |
| Kamar / huni / booking online publik | **tidak diukur ulang** (tanpa panggilan API produksi) | UNKNOWN sesi ini |
| Stay ACTIVE / CheckoutRequest / akun TENANT / `pricingTerm` per kamar | **UNKNOWN** — akses DB tidak dipakai | sama |
| `docs/ANTREAN.md` | 16.375 byte (plafon 16.384) | sama |
| Test yang lulus | BE 241 / 6 suite · FE 389 / 65 berkas | sama |
| Cacat Kmr C | masih tercatat (katalog `OCCUPIED` vs kalender `AVAILABLE`) — **tidak** diperbaiki (bukan S8) | sama |

**B. Fakta yang dibuktikan ulang dari kode sebelum menulis** (bukan ingatan):

1. `public-bookings.service.ts` mengembalikan `booking.referenceCode` + `portalAccess.requiresAccount|claimRequired` dan **tidak** memuat `temporaryPassword` (warisan S7 utuh).
2. `POST /tenant/bookings/claim` ada di `tenant-bookings.controller.ts` (`@Roles(TENANT)`), hasil `{ alreadyClaimed, tenantId, claimed[] }`; semua jalur gagal = `GUEST_CLAIM_UNIFORM_MESSAGE` (`tenant-bookings.helpers.ts`).
3. `QuickStartWizard` **belum** menjadi layar pertama: ia hanya kartu di dalam dashboard owner/admin/staff dan di panduan kos penghuni (`ActiveStayContent`), sehingga menu penuh tetap tampil lebih dulu.
4. Form pengajuan tamu **mewajibkan NIK 16 digit** di FE (`validateStep1`), padahal DTO backend `identityNumber` **opsional** — penghalang untuk "kontak minimum" pada §8.10 S8.

**C. Yang berubah (kode, sesi ini).**

- `frontend/src/pages/rooms/PublicRoomDetailPage.tsx` — CTA utama menjadi **"Ajukan sewa"** (above-the-fold, kartu samping, sticky mobile) + catatan "Tanpa akun. Akun baru wajib saat membayar DP…". Saat `onlineBookingEnabled=false`/kamar tidak bisa diajukan, CTA tetap jalur WhatsApp dan catatan menyebut booking online ditutup.
- `frontend/src/pages/bookings/guestBookingUtils.ts` — **NIK tidak lagi wajib** saat mengajukan (kontak minimum: nama + telepon, email opsional; NIK tetap divalidasi 16 digit **bila diisi**), sejalan dengan DTO backend dan P35/P36. Ditambah `describePublicBookingError()`: status **503** dipetakan ke `onlineBookingClosed` + kalimat jalan keluar.
- `frontend/src/pages/bookings/GuestBookingPage.tsx` — memakai `describePublicBookingError`; 503 menampilkan panel "Booking online sedang ditutup" + tombol WhatsApp (bukan hanya galat form); judul menjelaskan "tanpa akun, kode pengajuan".
- `frontend/src/pages/bookings/GuestBookingForm.tsx` — label NIK menjadi "(opsional)".
- `frontend/src/pages/bookings/GuestBookingSuccess.tsx` — halaman status pengajuan: kode pengajuan, tanggal, langkah berikutnya, CTA **"Masuk & klaim pengajuan"** + "Daftar dulu", dan penegasan bahwa kode **bukan** kata sandi/alat masuk. Tanpa query string, tanpa PII di URL.
- `frontend/src/pages/public/PublicGuestDashboardPage.tsx` — seksi "Sudah mengajukan kamar? Lanjutkan dari akun." (masuk/daftar → klaim di "Pengajuan saya"); memakai kelas `gx-*` yang sudah ada, tanpa mengubah `11-public-pages.css`.
- `frontend/src/api/bookings.ts` — `claimGuestBookings()` + tipe `GuestClaimResult`/`GuestClaimedBooking` untuk endpoint S7.
- `frontend/src/pages/portal/MyBookingsPage.tsx` — panel **"Klaim pengajuan tamu"**: tombol memanggil `POST /tenant/bookings/claim` tanpa parameter, galat ditampilkan **apa adanya dari server** (pesan seragam) + tombol "Hubungi admin KOST48", sukses menampilkan kode `K48-…` + tautan "Lanjut kirim bukti DP" (anchor ke daftar booking). Pesan galat **tidak** lewat `toTenantFriendlyError` supaya tidak ditulis ulang.
- `frontend/src/components/common/QuickStartWizard.tsx` — satu sumber untuk kartu + layar pertama: `OWNER/ADMIN/STAFF_QUICK_START`, kunci preferensi `kost48-quickstart:<scope>:<userId>` (`isQuickStartSkipped`/`setQuickStartSkipped`), `getQuickStartFirstScreen(role, stage)` (TENANT memakai inventaris menu S6 — calon: cari kamar/pengajuan/panduan; penghuni: kamar saya/tagihan/…), dan komponen `QuickStartFirstScreen` dengan tombol **"Lihat semua menu"** di header.
- `frontend/src/config/navigation.ts` — tambah `getTenantPrimaryMenuLinks()` (urutan `TENANT_STAGE_PRIMARY` lebih dulu) dan `getTenantSections` memakainya, supaya menu portal dan aksi wizard memakai satu daftar.
- `frontend/src/components/layout/AppLayout.tsx` — merender `QuickStartFirstScreen` **menggantikan isi halaman** saat pengguna membuka rute pendaratannya sendiri (`getDefaultRoute`) dan belum memilih "Lihat semua menu"; pilihan disimpan per pengguna sehingga bertahan setelah muat ulang.
- `frontend/src/styles/10-misc.css` — gaya `.quickstart-first-*` (mobile-first 1 kolom, tombol 44 px, padding bawah agar tidak tertutup nav bawah).
- `frontend/src/styles/07-public.css` — perbaikan kontras blok tarif above-the-fold (`--gray-500`→`--gray-600`, angka `--gray-900`): axe 4,46:1 → lulus 4,5:1.
- Test baru: `src/test/unit/quickStartFirstScreen.test.tsx` (8), `src/test/pages/tenantClaim.test.tsx` (5), `src/test/unit/guestBookingError.test.ts` (4); `src/test/unit/guestBookingValidation.test.ts` +1 test dan 1 test NIK-wajib diganti menjadi "NIK boleh kosong" (perubahan persyaratan, bukan pelemahan: backend memang opsional).
- `docs/FITUR.md` **tidak berubah**: tidak ada rute/halaman baru (layar pertama dirender `AppLayout` pada rute yang sudah terdaftar; klaim menempel di `/portal/bookings`), dan tier T1 dokumen sudah tepat di plafon R16 sehingga penambahan apa pun akan melanggar `check-docs`.

**D. Angka sebelum dan sesudah** (potret 2026-10-24, semua lokal).

| Hal | Sebelum | Sesudah |
|---|---|---|
| Test frontend (`npx vitest run`) | 65 berkas / 389 test | **68 berkas / 407 test** (+3 berkas, +18 test; tidak ada test dihapus) |
| Test backend (`npm run test:unit`) | 241 / 6 suite | tidak dijalankan — backend **tidak disentuh** |
| Wizard sebagai layar pertama | kartu di dalam dashboard (menu penuh tampil lebih dulu) | layar pertama 4 peran di rute pendaratan; "Lihat semua menu" 44 px, `top` 226–361 px pada viewport 844 px |
| Syarat NIK saat mengajukan | wajib 16 digit (FE) | opsional (FE mengikuti DTO backend); tetap 16 digit bila diisi |
| Jalan keluar saat `POST /public/bookings` 503 | hanya pesan galat di form | panel "Booking online ditutup" + WhatsApp + tautan katalog |
| Klaim pengajuan di UI | tidak ada | panel di `/portal/bookings`, pesan seragam apa adanya + jalur admin |
| axe (9 sampel 390 px) | — | **0 violation** di semua sampel |
| `check-fitur` | 58 fitur / 80 rute | **58 fitur / 80 rute** (tanpa rute baru) |
| `docs/ANTREAN.md` | 16.375 byte | **16.371 byte** (menyusut 4 B; plafon 16.384 — suntingan baris W-OWN-021 dibuat lebih pendek, bukan lebih panjang) |

**E. Bukti manual 390 px + axe + urutan Tab** (dev server lokal `vite --port 5174`, **API ditiru** lewat *route interception* Playwright, sesi disuntik token demo + cache user; artefak **di luar repo** `%TEMP%\kost48-s8-shots`).

| Peran | Rute pendaratan | Judul wizard | Aksi | Tombol "Lihat semua menu" (top–bottom / tinggi / viewport) | Terlihat tanpa menggulir | Setelah diklik | Setelah muat ulang |
|---|---|---|---|---|---|---|---|
| OWNER | `/owner-dashboard` | Mau kerjakan apa hari ini? | 4 | 303–347 / 44 / 844 | ya | wizard lepas (≤0,5 dtk), Kokpit Owner tampil | wizard tidak muncul, kunci `kost48-quickstart:owner:901` |
| ADMIN | `/dashboard` | Mulai dari mana? | 4 | 226–270 / 44 / 844 | ya | wizard lepas, dashboard admin tampil | wizard tidak muncul, kunci `…:admin:902` |
| STAFF | `/dashboard` | Tugas hari ini | 4 | 343–387 / 44 / 844 | ya | wizard lepas, shell staff tampil | wizard tidak muncul, kunci `…:staff:903` |
| TENANT (calon) | `/rooms` | Mau cari kamar atau lanjutkan pengajuan? | 3 (Cari kamar · Pengajuan saya · Panduan) | 361–405 / 44 / 844 | ya | wizard lepas, katalog tampil | wizard tidak muncul, kunci `…:tenant-calon:904` |

- Tangkapan: `s8-390-{owner,admin,staff,tenant}-{wizard,fullmenu,after-reload}.png` + `s8-390-publik-{beranda,detail-kamar,form-pengajuan}.png` + `s8-390-tenant-klaim{,-sukses}.png` + `s8-390-report.json`.
- axe (axe-core dari `node_modules`, tag `wcag2a/wcag2aa/wcag21a/wcag21aa`): **0 violation** pada 9 sampel — 4 layar wizard, beranda publik, detail kamar, form pengajuan, panel klaim, dan panel klaim setelah klaim berhasil. Incomplete yang tersisa: `color-contrast` (butuh latar nyata/gradien) dan `aria-prohibited-attr` — bukan pelanggaran, tetapi **bukan** bukti bebas masalah; lihat F.
- Urutan Tab: pada semua peran, Tab melewati elemen chrome dulu (menu Cepat/Normal, brand, profil, keluar, nav peran) lalu masuk ke aksi wizard dan berakhir di "Lihat semua menu"; tidak ada fokus trap, tidak ada `tabindex` positif. Contoh TENANT: `Portal Penghuni → profil → Keluar → Cari kamar → Pengajuan saya → Panduan → Lihat semua menu`.
- Klaim di UI (sampel `tenant-klaim`): klik "Klaim pengajuan" → kode `K48-0005-A` tampil, tautan "Lanjut kirim bukti DP" ada.

**F. Batas kejujuran sesi ini.**

1. **Tidak di-deploy.** Produksi tetap pada build terakhir yang terukur (`Z1Qr7_YnZFAK`, tidak diukur ulang sesi ini). Semua bukti = **build lokal**; tidak ada klaim bahwa wizard/klaim berlaku di produksi.
2. **Bukti 390 px/axe bukan login sungguhan.** Sesi disuntik (token demo + cache user di `localStorage`/`sessionStorage`) dan API ditiru lewat *route interception*. Tidak ada akun atau data penghuni sungguhan di layar. Yang terbukti: **wizard dirender sebagai layar pertama, tombol "Lihat semua menu" terlihat tanpa menggulir, dan pilihan "lewati" bertahan setelah muat ulang** — bukan perilaku server.
3. **API tiruan tidak lengkap.** Setelah "Lihat semua menu", dashboard ADMIN/STAFF memunculkan galat komponen karena fixture tiruan tidak menyediakan semua bentuk data (`board.final`, `marketingAssets`). Galat itu **artefak harness**, bukan temuan produk; karena itu axe hanya diklaim untuk 9 sampel di atas.
4. **axe 0 violation artinya**: alat axe-core (tag WCAG 2.1 A/AA) tidak menemukan pelanggaran otomatis pada **state halaman** yang dipindai; butir `color-contrast` yang berstatus *incomplete* tidak diperiksa karena latar gradien, dan axe **tidak** menggantikan uji manusia/pembaca layar.
5. **`guestBookingValidation` berubah karena persyaratan berubah.** NIK tidak lagi wajib saat mengajukan. Ini konsekuensi P36 (a)/P35 (a) dan kontrak DTO backend (`identityNumber` opsional), bukan pelonggaran gate untuk meluluskan test.
6. **Batas double-book tetap berlaku.** S7 hanya menjamin di aplikasi (`FOR UPDATE` + cek irisan + retry 40001). S8 tidak menambah constraint DB, jadi **balapan antar-proses masih mungkin** dan tidak diklaim tertutup.
7. **"Halaman status pengajuan" bukan halaman publik baru.** Rencana §8.10 menyebut `PublicGuestDashboardPage`/`publicGuestShared`; kenyataannya halaman itu beranda publik. S8 memakai jalur yang aman: status tampil di **hasil pengajuan** (`GuestBookingSuccess`) dan di portal **setelah klaim**. Endpoint lacak-pengajuan-publik lewat kode **tidak dibuat** (risiko enumerasi, default teraman) sehingga `publicGuestShared.tsx` tidak disentuh.
8. **TENANT: wizard tumpang tindih dengan tab tahap S6.** Tab "Calon penghuni/Lihat semua menu" sudah tampil di atas wizard dan memuat tautan yang sama. Tidak dihapus (P37 a + §8.8 melarang menyembunyikan jalan keluar); penggabungan tampilan = keputusan UX owner, dicatat sebagai bahan S9.
9. **Yang belum pernah dijalankan**: deploy/`npm run build` produksi (deploy = S9); `prisma migrate` (dilarang); akses DB/SSH produksi; login & klaim sungguhan ke API nyata; uji dua peramban/perangkat fisik; `cd backend && npm run test:unit` (backend tidak disentuh sesi ini).

**G. Data uji yang dihapus.** Tidak ada baris/data uji yang dibuat atau dihapus pada sesi ini: tidak ada DB yang disentuh, tidak ada migrasi/skrip SQL, dan seluruh artefak bukti (skrip Playwright, tangkapan layar, `report.json`) berada **di luar repo** (`%TEMP%\kost48-s8-shots`, `%TEMP%\kost48-s8-proof`) sehingga `git status --short` hanya memuat berkas yang memang diubah.
