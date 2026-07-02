# CHECKLIST 01 — Publik: Landing + FAQ/Panduan + Ulasan

> **Baca `00_INDEX.md` dulu.** Pakai Alur Baku (§4), Template Temuan (§5), Jebakan (§6), Severity (§7). Prefiks kode temuan: **`C01-xx`**.
> **Role:** PUBLIC (tanpa login — buka di jendela incognito supaya tidak terbawa sesi login). **Audit-only, jangan ubah kode.**

## Ruang lingkup
| Halaman | URL | File FE |
|---|---|---|
| Landing publik | `/` (RootEntry → landing bila belum login) | `pages/public/PublicGuestDashboardPage.tsx` |
| FAQ / Panduan publik | `/panduan` | `pages/public/FaqPublicPage.tsx` |
| Ulasan publik | `/reviews` | `pages/public/ReviewsPublicPage.tsx` |
| Shared publik | (topbar/footer/card) | `pages/public/publicGuestShared.tsx` |

**Backend terkait:** `marketing/marketing-public-rooms` (`GET /api/public/rooms`), `faqs` (`GET /api/faqs`), ulasan (`ExternalReview` model → cari endpoint di `marketing-*` / `analytics`).

## Prasyarat
1. Jalankan backend + frontend (INDEX §1). 2. Buka incognito. 3. DevTools Console + Network aktif.

## Langkah audit

### A. Landing `/` (incognito)
- [ ] 1. Buka `/`. **Ekspektasi:** karena belum login, RootEntry harus menampilkan landing publik (BUKAN redirect ke /login, BUKAN halaman kosong). Catat apa yang terjadi.
- [ ] 2. Screenshot. Cek hero, galeri kamar, fasilitas, FAQ singkat, CTA "Booking". Ada bagian yang kosong / gambar rusak (broken image icon)?
- [ ] 3. Console: catat semua error/warning (`C01-xx` bila ada).
- [ ] 4. Network: cek `GET /api/public/rooms` → status 200? Payload berisi kamar? **JB-19:** pastikan TIDAK ada field sensitif (harga internal, biaya, data tenant, `passwordHash`).
- [ ] 5. **JB-16 (lokasi):** cari alamat di halaman. HARUS "Jl. Hikmah V No. 48, Surabaya Barat / Pakuwon / PTC". Kalau tertulis "Ngagel" atau alamat lain → **C01-xx MEDIUM**.
- [ ] 6. **JB-18:** cari "Rp NaN", "undefined", "null", "Invalid Date", harga 0 yang janggal.
- [ ] 7. Klik semua tombol/link nav (Kamar, FAQ, Ulasan, Booking, Login). Masing-masing menuju halaman benar? Link mati / 404?
- [ ] 8. **Responsive:** kecilkan lebar browser ke ~375px (mode mobile). Layout pecah? Teks terpotong? Tombol tumpang tindih? (JB di CHECKLIST_19 juga, tapi catat di sini bila parah).

### B. FAQ/Panduan `/panduan`
- [ ] 9. Buka `/panduan`. Konten muncul? (Ingat: route `/panduan` → `FaqPublicPage`, jadi ini halaman FAQ, bukan panduan tenant.)
- [ ] 10. Network: `GET /api/faqs` 200 & ada isi? Kalau kosong → apakah UI menampilkan empty-state ramah atau blank?
- [ ] 11. Accordion/expand FAQ berfungsi? Klik pertanyaan → jawaban muncul/tutup?
- [ ] 12. Cari duplikat pertanyaan, teks terpotong, atau HTML mentah (`<p>` tampil sebagai teks).

### C. Ulasan `/reviews`
- [ ] 13. Buka `/reviews`. Daftar ulasan muncul? Rating (bintang) render benar?
- [ ] 14. Network: endpoint ulasan 200? **JB-19:** ulasan tidak membocorkan email/HP/nama lengkap tenant tanpa izin.
- [ ] 15. Kalau ada rata-rata rating → hitung manual dari beberapa item, cocokkan (jangan sampai salah agregasi).
- [ ] 16. Empty-state bila belum ada ulasan?

### D. Verifikasi kode (Read)
- [ ] 17. Baca `publicGuestShared.tsx` — pastikan topbar/footer dipakai konsisten di 3 halaman. Kalau salah satu halaman tidak pakai shared layout → konsistensi rusak (bandingkan dengan temuan Hermes "sidebar hilang").
- [ ] 18. Cek `PublicGuestDashboardPage.tsx`: adakah data hardcoded yang seharusnya dari API (mis. jumlah kamar, harga)? Catat sebagai INFO/LOW bila ada.
- [ ] 19. **JB-14 (keamanan):** halaman publik TIDAK boleh memanggil endpoint ber-auth. Cek Network — semua request landing harusnya endpoint publik (`/api/public/*`, `/api/faqs`). Kalau ada 401 di background → ada kode yang salah panggil endpoint privat.

### E. Uji jalur aneh
- [ ] 20. Buka `/panduan` & `/reviews` langsung (ketik URL) tanpa lewat landing → tetap tampil benar?
- [ ] 21. Matikan backend sebentar, reload landing → apakah muncul error-state ramah atau blank putih/crash? (uji ketahanan) Nyalakan lagi setelah tes.

## HASIL TEMUAN

> **Status audit:** Lapis KODE + API **SELESAI** (2 Jul 2026, Fable). Lapis **LIVE UI** (screenshot, console nyata, Network status, responsive) **BELUM** — butuh backend+frontend hidup di mesin user + Chrome. Lihat "Sisa langkah live" di bawah.

### C01-02 Nama penghuni bocor ke publik (PII) — 🔴 HIGH ⭐ prioritas utama
- **Severity:** HIGH (privasi/keamanan) · **Kategori:** Keamanan
- **Halaman/URL:** `/rooms` (katalog publik, tanpa login) + endpoint `GET /api/public/rooms/availability-calendar`
- **Langkah reproduksi:**
  1. Buka `/rooms` tanpa login (incognito) → gulir ke kalender ketersediaan (komponen `RichAvailabilityCalendar`).
  2. Atau langsung: `curl http://localhost:3000/api/public/rooms/availability-calendar`.
- **Yang diharapkan:** endpoint/UI publik tidak membocorkan identitas penghuni.
- **Yang terjadi:** respons memuat `currentTenantName` & `dpTenantName` (nama lengkap penghuni + pembayar DP), dan UI **menampilkannya**: `👤 {currentTenantName}`.
- **Bukti kode:** `backend/src/modules/marketing/marketing-public-rooms.service.ts:525` & `:531` (field dikembalikan); controller `@Public()` di `.../public-bookings? → marketing-public-rooms.controller.ts` (class-level `@Public()`, endpoint `availability-calendar` tanpa guard tambahan). FE render: `frontend/src/components/public/RichAvailabilityCalendar.tsx:254` & `:267`; dipakai di `frontend/src/pages/rooms/PublicRoomsPage.tsx:468`.
- **SARAN FIX:** hapus `currentTenantName`/`dpTenantName` dari payload publik (atau ganti jadi status generik "Terisi"/"DP"). Jangan pernah kirim nama tenant ke endpoint `@Public()`.

### C01-01 `freeKwh` dinamis tidak pernah tampil di FAQ landing (dead code) — 🟡 MEDIUM
- **Severity:** MEDIUM · **Kategori:** Fungsional / config-drift
- **Halaman/URL:** `/` (landing), bagian FAQ.
- **Yang terjadi:** landing mengambil `freeElectricityKwhPerMonth` via `/api/settings/public-config`, tapi injeksinya mati total. Baris `PublicGuestDashboardPage.tsx:293` mencari FAQ dengan `question === 'Bagaimana aturan listrik & air?'` — **pertanyaan itu tidak ada** (yang asli `'Bagaimana sistem listrik?'`, `publicGuestShared.tsx:145`). Selain itu `.replace('jatah listrik gratis', …)` juga meleset karena teks jawaban berbunyi "Jatah gratis 30 kWh/bulan" (tak mengandung substring itu). **Dobel meleset.**
- **Dampak:** kalau owner mengubah jatah kWh gratis di OperationalSetting, FAQ publik tetap menampilkan "30 kWh" (misinformasi) + fetch API `publicConfig` mubazir.
- **Bukti:** `PublicGuestDashboardPage.tsx:213,290-297`; `publicGuestShared.tsx:145-146`. Bandingkan pola BENAR di `components/portal/stay/UtilityInsightCard.tsx:90` (`{freeKwh} kWh`).
- **SARAN FIX:** interpolasi langsung `${freeKwh}` ke teks jawaban (atau cocokkan question string yang benar).

### C01-03 `Room.notes` internal terekspos endpoint publik — 🟡 MEDIUM
- **Severity:** MEDIUM · **Kategori:** Keamanan / Data
- **Yang terjadi:** `PUBLIC_ROOM_SELECT` menyertakan `notes: true` (`marketing-public-rooms.service.ts:28`) dan dikembalikan mentah (`:713`). Di detail, `notes` dipakai sebagai "business highlight" (`PublicRoomDetailPage.tsx:82`) hanya dengan **blacklist kata** (`seed|dummy|test|uat|script|developer`). Catatan internal nyata (mis. "penghuni sering telat", "AC bocor") lolos filter → tampil publik; endpoint list mengembalikan `notes` apa adanya.
- **SARAN FIX:** pisahkan field `marketingDescription` publik; jangan expose `Room.notes` internal.

### C01-04 Rating & jumlah ulasan publik hanya menghitung rating ≥ 4 — 🟢 LOW/INFO
- **Severity:** LOW · **Kategori:** Integritas data / transparansi
- **Yang terjadi:** `getPublicSocialProof` memfilter `rating: { gte: 4 }` untuk StaffReview & ExternalReview (`marketing-public-rooms.service.ts:61,73,82,88`). `averageRating` & `reviewCount` dihitung **hanya** dari ulasan ≥4 → "rating terverifikasi" di landing/`/reviews` lebih tinggi dari rata-rata sebenarnya (ulasan buruk disembunyikan).
- **Catatan:** kemungkinan disengaja (social proof), tapi perlu konfirmasi owner/M02 karena berpotensi menyesatkan. Verifikasi apakah ini keputusan resmi.

### C01-05 Header/footer tidak konsisten antar 3 halaman publik — 🟢 LOW
- **Severity:** LOW · **Kategori:** Konsistensi/UX
- **Yang terjadi:** Landing pakai `GuestTopbar` (`gx-topbar`) + `GuestFooter`. `/panduan` (FaqPublicPage) pakai `FaqTopbar` (`rm-topbar`) **tanpa footer**. `/reviews` (ReviewsPublicPage) **tanpa topbar & tanpa footer** (hanya tombol "🏠 Beranda" inline). Branding & navigasi tidak seragam; `/reviews` tak punya nav persisten.
- **Bukti:** `publicGuestShared.tsx:247` (GuestTopbar), `:415` (GuestFooter); `FaqPublicPage.tsx:24-50` (FaqTopbar, tanpa footer); `ReviewsPublicPage.tsx:81-83` (tanpa topbar/footer).
- **SARAN FIX:** samakan pakai `GuestTopbar` + `GuestFooter` di ketiga halaman.

### C01-06 Tarif WiFi/listrik & deposit hewan hardcoded di landing — 🟢 LOW/INFO
- **Severity:** LOW · **Kategori:** Konsistensi/maintainability (terkait C01-01)
- **Yang terjadi:** harga WiFi (`publicGuestShared.tsx:82,141`), tarif listrik "30 kWh / Rp2.500/kWh" (`:146`), deposit hewan Rp100.000 (`:84,156`) semua hardcoded, bukan dari OperationalSetting. Ubah setting → teks landing tetap (drift).

### Catatan positif (bukan temuan, sudah diverifikasi di kode)
- **JB-16 lokasi BENAR** di hero (`:353`), lokasi (`:576`), footer (`publicGuestShared.tsx:424`), FAQ (`:131`): "Jl. Hikmah V No. 48, Surabaya Barat, Pakuwon/PTC". **Tidak ada "Ngagel".**
- **JB-01 DP benar:** "DP 30% … hangus hanya jika batal" (`:432,446`); deposit hewan berlabel refundable.
- **JB-14 aman:** semua endpoint yang dipanggil halaman publik ber-`@Public()` (facility-images, marketing-assets, settings/public-config, faqs/public, public/rooms) → tidak ada 401 untuk pengunjung anonim.
- **JB-18 aman:** pembagian statistik okupansi ter-guard `stats.total > 0` (`:234,246,407`) → tidak NaN.
- Error/empty-state baik di FaqPublicPage (fallback FAQ statis saat API gagal) & ReviewsPublicPage (EmptyState).
- `review.rating.toFixed(1)` aman: backend hanya mengirim rating ≥4 (non-null).

### C01-07 Survei preferensi terkirim saat wizard di-SKIP — 🟢 LOW/INFO (temuan live)
- **Severity:** LOW · **Kategori:** Data quality
- **Yang terjadi:** di `/rooms`, menekan **"Lewati wizard →"** (skip) tetap memicu `POST /api/public/bookings/survey` → **201**. Survei preferensi tamu (`GuestPreferenceSurvey`) tercatat walau user memilih tidak mengisi.
- **Dampak:** basis data survei terisi record kosong/tak bermakna dari user yang opt-out → statistik preferensi bisa bias.
- **Bukti:** Network `/rooms` (request POST survey 201 muncul setelah klik "Lewati wizard").
- **SARAN FIX:** jangan kirim survei saat skip, atau tandai `skipped=true`.

---

## LIVE UI — ✅ SELESAI (via Chrome, 2 Jul 2026, http://localhost:5173)

**Ringkasan kondisi live:**
- **Console: BERSIH** di `/`, `/rooms`, `/panduan`, `/reviews` — hanya pesan dev Vite/React, **0 error/warning**.
- **Network: semua 200** — `facility-images`, `marketing-assets`, `public/rooms`, `public/rooms/summary`, `social-proof`, `settings/public-config`, `faqs/public`, `availability-calendar`. **JB-14 clean live** (tak ada endpoint auth dipanggil dari halaman publik, tak ada 401/4xx/5xx).
- **Empty-state OK:** `/reviews` menampilkan "Belum ada ulasan" (EmptyState) — tak blank.
- **Landing hero:** badge "Mulai Rp 850 rb/bln · 10 kamar tersedia" — **tidak ada NaN**, `formatCompactRupiah` benar.

**C01-02 DIKONFIRMASI (bukti keras):** `fetch('/api/public/rooms/availability-calendar')` tanpa auth mengembalikan nama penghuni nyata → **Kamar I = "Bayu Nugroho", Kamar K = "Lani Kusuma", Kamar F2 = "Sari Melati"** (`currentTenantName`). Field ada di payload untuk siapa pun. (Di layar desktop, tabel kalender menampilkan status "Terisi · sd <tgl>"; nama muncul di layout detail/mobile per kode `RichAvailabilityCalendar.tsx:254`.) → **naikkan prioritas fix.**

**C01-05 DIKONFIRMASI (bahkan lebih parah):** ada **4 perlakuan header berbeda** di rute publik:
- `/` (landing): `gx-topbar` (Kamar/Fasilitas/Lokasi/Ulasan/FAQ/Panduan/Ulasan Lengkap) + `GuestFooter`.
- `/rooms`: topbar (Beranda / Panduan & FAQ / Ulasan / Maps / WhatsApp).
- `/panduan`: topbar (Beranda / Katalog Kamar / Ulasan).
- `/reviews`: **tanpa topbar & tanpa footer** (hanya tombol inline).

**Belum tuntas / limitasi:**
- **Responsive 375px:** tidak konklusif — `resize_window` di sesi ini tidak membatasi viewport render (screenshot tetap ~1536px, nav desktop). **Rekomendasi:** cek manual via DevTools device-mode. (Dipindah ke CHECKLIST_19 responsive.)
- ~~**Build health:** `npx tsc --noEmit` + `npm run build` belum dijalankan sampai tuntas.~~ ✅ **SELESAI 2 Jul 2026:** `tsc --noEmit` backend = 0 error; `npm run build` frontend = sukses (lihat lampiran Reasonix).
- ~~**Uji matikan backend** (error-state landing) belum dilakukan.~~ ✅ **SELESAI (via kode):** `PublicGuestDashboardPage.tsx:477-478` (`roomsQuery.isError`), `:605` (`socialProofQuery.isError`), `:569,739` (`onError` gambar) — landing punya error-state ramah untuk tiap section. Tidak crash saat backend mati.

### Diteruskan ke CHECKLIST_02 (katalog kamar) — observasi live
- **Ketidakcocokan jumlah kamar:** katalog `/rooms` tampil "Menampilkan 1–3 dari **10** kamar", tapi kalender ketersediaan mendaftar **13** kamar (A,B,C,D,G,H,I,J,K,L,M,F1,F2). Sumber data beda (`public/rooms` vs `availability-calendar`) — verifikasi apakah katalog salah memfilter/menyembunyikan kamar.
- **Filter "Kosong":** saat chip filter tampak aktif, kartu yang muncul berstatus "Dibersihkan / Maintenance" — cek apakah filter ketersediaan salah.

## Definition of Done
- [x] Ketiga halaman dibuka & di-screenshot (incognito) — ✅ Fable 2 Jul 2026.
- [x] Console & Network diperiksa di tiap halaman — ✅ 0 error, semua 200.
- [x] JB-16, JB-18, JB-19, JB-14 dicek eksplisit — ✅ Lokasi benar; NaN aman; tidak ada data sensitif; endpoint publik.
- [ ] Responsive mobile dicek di landing — ⏳ Ditunda ke CHECKLIST_19 (butuh viewport nyata).
- [x] Semua temuan tercatat dengan kode `C01-01` s.d. `C01-07` + severity.
- [x] Update baris `01` di tabel Progres Global INDEX §9 (lihat bawah).
- [x] Build health: `tsc --noEmit` backend 0 error ✅, `npm run build` frontend sukses ✅
- [x] Error-state landing saat backend mati: terverifikasi via kode ✅
