# TASK — Katalog `/rooms`, heatmap ketersediaan, dan wizard-first lintas role

> **Blok baca** · Jenis: **dokumen kerja tugas** · Status: **aktif — rencana, belum ada kode ditulis** · Untuk siapa: agen pelaksana + owner
> · Baca kalau: mengerjakan katalog kamar publik, heatmap ketersediaan, prediksi kamar kosong, atau wizard pembuka di beranda tiap role. · **Jangan** dibaca kalau: memilih tugas (itu [ANTREAN](../ANTREAN.md)) atau mencari aturan bisnis (itu [domain/keuangan.md](../domain/keuangan.md)).

Bentuk 7 bagian, tanpa kotak otoritatif — status pekerjaan tetap di [ANTREAN §3](../ANTREAN.md) baris `W-OWN-019`/`W-OWN-020`.

## Goal & todos

**Goal.** (1) `https://kost48surabaya.com/rooms` **default menampilkan kamar yang tersedia**, dengan ringkasan ketersediaan yang mudah dibaca di ponsel (heatmap/timeline, bukan tabel lebar). (2) Setiap kamar punya **perkiraan peluang kosong** dari data yang sudah ada (tanggal masuk, akhir kontrak, status perpanjangan, lama tinggal) — ditampilkan jujur sebagai perkiraan. (3) Beranda **tenant, staff, admin, owner** dibuka dengan **wizard jalan pintas** (“mau apa hari ini?”) dan tombol **lewati** ke tampilan penuh.

| Langkah | Status | Bukti penutup |
|---|---|---|
| 1. `/rooms` default `avail=bookable` + chip “Tersedia” aktif | belum | URL tanpa query hanya menampilkan kamar bookable; tes + render 390 px |
| 2. Ringkasan ketersediaan mobile-first (heatmap/timeline) | belum | 390/768/1440 px; tanpa scroll horizontal di 390 |
| 3. Skor peluang kosong per kamar + label | belum | unit test 4 skenario; label tidak menyatakan janji |
| 4. Wizard pembuka tenant | belum | 1 tap ke aksi utama; tombol lewati; render 390 |
| 5. Wizard pembuka staff/admin/owner | belum | pola sama + pilihan diingat per user |
| 6. Gate + deploy | belum | tsc, test, check-docs, check-fitur, smoke produksi |

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
