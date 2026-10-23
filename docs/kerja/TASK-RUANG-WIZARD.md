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
| S1 | belum | | | mulai dari riset §8.6 alur C, D, E, F |

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
