# TASK — Katalog `/rooms`, heatmap ketersediaan, dan wizard-first lintas role

> **Blok baca** · Jenis: **dokumen kerja tugas** · Status: **aktif — fase A (katalog tersedia + heatmap + skor peluang + wizard pembuka) sudah live; Program "ROOMS & AKUN V2" masuk §8 (rencana, belum ada kode)** · Untuk siapa: agen pelaksana + owner
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
| S1 | **selesai** (P37 tetap terbuka dengan default berjalan) | sesi 23 Okt 2026 | §8.9 (L1+L2) + register [KEPUTUSAN-OWNER](../KEPUTUSAN-OWNER.md) `ROOMS-AKUN-V2 S1` & `S1b`: P34 (a) bulanan bergulir · P35 (a) NIK bukan alat masuk · P36 (a) akun wajib di titik DP · P38 **DP 30%** (kanonik, sudah berjalan di kode) | **S2 rencana rinci** ditulis ke berkas ini (tanpa kode); P37 boleh diputuskan kapan saja |

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
