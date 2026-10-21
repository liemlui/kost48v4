> **ARSIP BEKU** · dipindah dari `docs/kerja/` ke `docs/arsip/` pada 2026-10-21 (DOCS-GEN2 D4d addendum). Isi dipindah ke `TASK-AKTIF.md`; **jangan dibaca rutin**.

# TASK-UIUX-SHOWCASE — beranda & katalog sebagai etalase, foto rasio apa pun tetap utuh

> **Blok baca** · Jenis: **dokumen kerja tugas (kontrak kerja + catatan goal/todos, bukan antrean)** · Status: **aktif — implementasi selesai lokal; bukti browser belum** · Untuk siapa: agen yang merawat permukaan publik
> · Baca kalau: mengerjakan atau menilai `UIUX-SHOWCASE`, atau butuh tahu mengapa foto unggahan sekarang bisa tampil utuh. · **Jangan** dibaca kalau: memilih tugas (itu [ANTREAN](../ANTREAN.md) §3) atau mencari aturan domain publik (itu [domain/publik.md](../domain/publik.md)).

## Goal & todos

**Goal.** Halaman depan dan katalog kamar menjual dengan urutan **kebutuhan → bukti → jaminan → aksi**; seluruh angka yang tampil berasal dari data sistem; foto unggahan rasio apa pun **tidak lagi terpotong** di tampilan publik, dan panel upload menyebutkan rasio yang disarankan. **Tanpa** endpoint/API baru, **tanpa** dependency baru, **tanpa** perubahan skema.

**Definisi selesai.**

1. Beranda punya section "mulai dari kebutuhan" yang tautannya mendarat di filter katalog yang sudah didukung, dan strip "empat hal yang sudah tertulis".
2. Katalog punya urutan **Rekomendasi** (ketersediaan lebih dulu, lalu tarif) dan chip kategori ber-count; parameter `category` dipahami.
3. Foto potret/panorama/brosur A4 tampil **utuh** (contain + latar blur) di kartu beranda, kartu katalog, dan galeri; galeri detail & thumbnail fasilitas memakai contain.
4. Panel upload (`ResourceFormModal`, tiga panel owner) menampilkan rekomendasi rasio + peringatan **non-blokir** per berkas.
5. Typecheck, test frontend, dan bundling Vite lulus.
6. Baris [ANTREAN](../ANTREAN.md) §3 + [changelog](../history/changelog/2026-10.md) terisi.

**Bukti penutup — potret 2026-10-18.** `npx tsc -b` exit 0 · `npx tsc --noEmit -p tsconfig.json` exit 0 · test baru `imageFrame.test.ts` + `frameImage.test.tsx` **19/19 lulus** · seluruh test frontend **274/274 di 50 berkas** · `npx vite build` exit 0 (1 m 2 s). **Batas:** `npm run build` penuh **sengaja tidak dijalankan** karena ia menjalankan `stamp-pwa-build.mjs` (mengubah ID/PWA build) — di luar lingkup perubahan tampilan; yang dibuktikan bundling `vite build` saja.

| # | Langkah | Status |
|---:|---|---|
| 1 | Recon sumber crop + panel upload | selesai |
| 2 | Util rasio murni + test | selesai |
| 3 | Komponen `FrameImage` + `ImageRatioHint` | selesai |
| 4 | Terapkan di kartu beranda/katalog/galeri + galeri detail + fasilitas | selesai |
| 5 | Section kebutuhan & jaminan di beranda | selesai |
| 6 | Urutan Rekomendasi, chip kategori, ringkasan hasil katalog | selesai |
| 7 | Rekomendasi rasio di panel upload | selesai |
| 8 | Typecheck + test + bundling | selesai |
| 9 | Dokumen: berkas ini, ANTREAN, changelog, gate dokumen | selesai |
| 10 | Bukti browser 390/768/1440 px (foto potret, chip, tautan kebutuhan) | belum |

## 1. Tujuan & definisi selesai

Tujuan pemilik: beranda + katalog harus **mengundang** calon penghuni (bukan daftar fitur), dan foto yang diunggah dari HP/brosur tidak boleh tampil terpotong. Definisi selesai ada di boks Goal & todos; yang **bukan** bagian tugas ini: perubahan alur booking, perubahan harga/nominal, penambahan foto/aset baru, dan keputusan hak pakai foto (tetap di `AO-19`).

## 2. Kondisi awal + cara mengukur ulang

Fakta yang diverifikasi dari kode (bukan ingatan):

| Fakta | Bukti (kutipan, bukan nomor baris) |
|---|---|
| Sumber crop = CSS, bukan upload | `.gx-room-image { object-fit: cover }`, `.rm-card-img { object-fit: cover }`, `.gx-gallery-img { aspect-ratio: 16/9; object-fit: cover }`, `.gx-facility-photo { width: 3rem; object-fit: cover }`, `.room-detail-gallery-image { object-fit: cover }`, `.gx-hero-bg { background-size: cover }` |
| Kompresi klien tidak mengubah rasio | `frontend/src/utils/compressImageFile.ts` hanya mengecilkan `maxSide`, tidak memotong |
| Panel upload tidak menyebut rasio | `ResourceFormModal.tsx` (`Form.Text` kamar/pengumuman), `OwnerSettingsPanels.tsx` (fasilitas, aset marketing, foto kamar) |
| Angka katalog hardcoded | teks empty-state sebelumnya memuat "Katalog memiliki 22 kamar" — diganti kalimat tanpa angka |

**Cara mengukur ulang:** `npx tsc -b` · `npx vitest run` · `npx vite build` (cwd `frontend`). Ketiganya memerlukan spawn proses (esbuild/vitest) yang **diblokir sandbox `workspace-write`** dengan `Error: spawn EPERM`; jalankan dengan izin akses penuh **satu kali** untuk satu rencana bukti, jangan minta berulang per potongan.

## 3. Langkah yang dikerjakan

1. `frontend/src/utils/imageFrame.ts` — fungsi murni: `imageRatio`, `frameModeForRatio`, `frameModeForDimensions`, `evaluateUploadRatio`, `readImageDimensions`, `UPLOAD_RATIO_GUIDES` (6 target: kartu, detail, hero, fasilitas, galeri, marketing).
2. `frontend/src/components/common/FrameImage.tsx` — `<img>` yang memilih `cover`/`contain` dari rasio asli setelah `load`; contain memakai salinan blur dekoratif. Default `cover` sampai foto terbaca (tata letak lama tidak berubah).
3. `frontend/src/components/common/ImageRatioHint.tsx` — baris rekomendasi + hook `useUploadRatioCheck` (`checkFile`/`checkFiles`) + `UploadRatioNotice`. Peringatan **tidak** memblokir unggahan.
4. Penerapan: `publicGuestShared.tsx` (kartu beranda), `RoomCard.tsx` (carousel katalog), `PublicGuestDashboardPage.tsx` (galeri brosur), `07-public.css` (galeri detail), `11-public-pages.css` (thumbnail fasilitas).
5. Beranda: section `gx-fit-*` (3 kebutuhan dengan count nyata + deep-link filter), strip `gx-guarantee-*` (DP 30%, listrik pascabayar, perbaikan wajar gratis, harga tertera = ditagih), baris `gx-hero-trust`.
6. Katalog: `sort=recommended`, chip kategori `Ekonomi/Standar/Deluxe (n)` dari data, `category` di URL, ringkasan hasil `role="status"` + tarif mulai, label grup filter "Harga" → "Urutkan".
7. Panel upload: `ImageRatioHint` + `UploadRatioNotice` di empat tempat; pemeriksaan rasio dijalankan sebelum unggah.

**Landasan pemasaran yang dipakai — dan batasnya.** Kerangka berikut dipakai sebagai **lensa desain**, bukan bukti empiris: model hierarki efek (perhatian → minat → keinginan → aksi) menentukan urutan section; *signaling* menjelaskan mengapa foto asli, status kamar live, dan angka jujur lebih kuat daripada klaim; *elaboration likelihood* memisahkan rute sentral (spesifikasi kamar, aturan DP/listrik) dari rute periferal (visual, bukti sosial); *jobs-to-be-done* menjadi dasar section "mulai dari kebutuhan"; *choice architecture* menjadi dasar urutan + chip + count; *risk reversal* menjadi dasar strip jaminan; kelangkaan hanya dipakai bila angkanya berasal dari data. **Tidak ada uji A/B, tidak ada sitasi formal, dan tidak ada klaim efek konversi di repo ini** — bila dokumen ini dipakai untuk tugas akademik, sumber primer wajib diverifikasi terpisah.

## 4. Jebakan nyata yang sudah terukur

- **Spesifisitas CSS mobile.** `@media (max-width: 480px)` di `11-public-pages.css` memasang `object-fit: cover` pada `.gx-room-image` (dua kelas). Aturan contain karena itu memakai `.frame-image.frame-image-contain { object-fit: contain !important }`; tanpa `!important` foto potret kembali terpotong di HP.
- **Dua salinan handler di `ResourceFormModal.tsx`.** Berkas ini memuat handler unggah **dua kali**; yang dipakai JSX adalah salinan **di dalam** `config.fields.map` (menutupi yang di luar). Menyunting hanya salinan luar = perubahan tidak berpengaruh. Kedua salinan disamakan; duplikasi lama **tidak dirapikan** (di luar lingkup).
- **Jangan `npm run build` untuk perubahan UI.** Skrip itu menjalankan `stamp-pwa-build.mjs` + `verify-pwa.mjs` sehingga ID PWA berubah; untuk validasi CSS/bundling cukup `npx vite build`.
- **Brosur A4 vs galeri 16:9.** Rasio potret 0,71 berada di luar toleransi 4:3, jadi `UPLOAD_RATIO_GUIDES.gallery` punya rentang alternatif eksplisit; tanpa itu panel akan memperingatkan brosur yang justru sah.
- **Angka hardcoded.** Empty-state katalog menyebut jumlah kamar tetap; jumlah kamar berubah tanpa kode — diganti kalimat tanpa angka.

## 5. Kalau macet (gejala → sebab → tindakan)

| Gejala | Sebab paling sering | Tindakan |
|---|---|---|
| Foto potret tetap terpotong | hanya CSS yang diubah, `FrameImage` belum dipakai di elemen itu | bungkus `<img>` dengan `FrameImage` di komponen kartu yang bersangkutan |
| Latar blur menutupi foto/badge | `z-index` ditambahkan ke backdrop | biarkan backdrop `z-index: auto` dan img utama `position: relative` tanpa z-index; badge/overlay sesudahnya tetap di atas |
| Peringatan rasio muncul untuk foto yang benar | target panduan salah (mis. brosur memakai target `hero`) | pakai target yang sesuai; tambah rentang alternatif, jangan melonggarkan toleransi global |
| Test gagal `spawn EPERM` | sandbox menolak spawn esbuild | minta akses penuh sekali untuk satu rencana bukti; jangan mengubah kode untuk mencari jalan |

## 6. Catatan penyimpangan

- **Tumpang-tindih dengan `AO-18`/`AO-19`.** Tugas ini menambah section dan menstandarkan perilaku foto; keputusan owner pada `AO-19` (hak pakai foto, izin optimasi, keseragaman aset) **tetap terbuka** dan tidak diambil alih.
- **Default urutan katalog tidak diubah.** "Rekomendasi" hanya tersedia sebagai pilihan; menjadikannya default = perubahan perilaku pengguna yang harus diputuskan owner.
- **`PETA-KODE.md` tidak disentuh.** Berkas tangga itu sudah di dekat plafon 16 KB; peta berkas baru dicatat di dokumen ini.
- **`scripts/docs-lines.baseline.json` tidak diubah.** Ratchet baris hanya naik dengan keputusan owner; kenaikan baris dari dokumen ini menunggu keputusan itu.
- **Tidak ada perubahan backend/API/skema** dan tidak ada dependency baru.

## 7. Riwayat

| Tanggal | Perubahan |
|---|---|
| 2026-10-18 | Dibuat setelah implementasi selesai lokal. Implementasi: util + komponen + section beranda + katalog + panel upload. Verifikasi: typecheck, 19 test baru, 274/274 seluruh frontend, `vite build` exit 0. Belum: bukti browser, `npm run build` penuh, mutasi bukti pagar. |
