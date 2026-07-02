# CHECKLIST 02 — Publik: Katalog Kamar + Detail Kamar

> **Baca `00_INDEX.md` dulu.** Prefiks temuan: **`C02-xx`**. **Role:** PUBLIC (incognito). **Audit-only.**

## Ruang lingkup
| Halaman | URL | File FE |
|---|---|---|
| Katalog kamar | `/rooms` | `pages/rooms/RoomsRouteEntry.tsx` → `pages/rooms/PublicRoomsPage.tsx` |
| Detail kamar | `/rooms/:roomId/detail` | `pages/rooms/PublicRoomDetailPage.tsx` |

**Backend:** `GET /api/public/rooms` (list), detail kamar publik (cari di `marketing-public-rooms.service.ts`). Model: `Room`, `RoomFacility`.

## Langkah audit

### A. Katalog `/rooms`
- [ ] 1. Buka `/rooms` (incognito). Screenshot. Daftar kamar muncul dengan foto, nama, harga, status?
- [ ] 2. Network `GET /api/public/rooms` 200? Berapa kamar dikembalikan? (Ingat total 48 kamar — tapi publik mungkin hanya menampilkan yang AVAILABLE. Cocokkan jumlah dengan status.)
- [ ] 3. **JB-03 (status kamar):** kamar yang sudah RESERVED/OCCUPIED — apakah tetap tampil sebagai "tersedia" dan bisa di-booking? Itu bug. Kamar tak-tersedia harus jelas (badge "Penuh"/disabled).
- [ ] 4. **JB-01/JB-18:** harga tampil bulat & wajar (bukan "Rp NaN", bukan desimal). Cek harga = harga sewa, bukan tercampur DP/deposit.
- [ ] 5. Filter (bila ada: lantai, harga, ukuran, AC) → ubah filter, cek daftar ter-update & jumlah cocok. Filter kombinasi (2 filter sekaligus) tidak saling menimpa?
- [ ] 6. Sortir (bila ada) → hasil benar-benar terurut?
- [ ] 7. Klik satu kartu kamar → menuju `/rooms/:roomId/detail` yang benar (roomId cocok)?
- [ ] 8. Foto: broken image? Lazy-load bekerja? Foto placeholder bila kamar tanpa foto?

### B. Detail kamar `/rooms/:roomId/detail`
- [ ] 9. Buka detail satu kamar. Screenshot. Info lengkap: lantai, ukuran, KM dalam/luar, AC, fasilitas, harga sewa, deposit?
- [ ] 10. **JB-01 (DP vs deposit):** kalau halaman menyebut "deposit" — nilainya = `Room.defaultDepositRupiah` dan disebut refundable. Kalau menyebut "DP" — 30% sewa, hangus. Pastikan tidak tertukar/tercampur. **Salah label = C02-xx MEDIUM/HIGH.**
- [ ] 11. Galeri foto / lightbox: klik foto → membesar? Navigasi next/prev jalan? Tutup lightbox jalan?
- [ ] 12. Fasilitas (accordion 10 item) expand/collapse jalan?
- [ ] 13. Tombol "Booking" → menuju `/booking/:roomId` dengan roomId benar. **Untuk kamar tak tersedia**, tombol harus disabled / tidak muncul.
- [ ] 14. Network: detail endpoint 200? **JB-19:** payload tidak membocorkan data internal (tenant penghuni saat ini, catatan admin, biaya internal).

### C. Uji jalur gagal
- [ ] 15. Buka detail dengan roomId **tidak ada** (mis. `/rooms/999999/detail`) → harus empty/404 ramah, BUKAN crash/blank/spinner selamanya.
- [ ] 16. Buka detail dengan roomId **non-angka** (`/rooms/abc/detail`) → ditangani (tidak crash)?
- [ ] 17. **JB-14:** dari incognito, apakah endpoint detail admin kamar (`/api/rooms/:id`) bisa diakses tanpa token? Coba `curl http://localhost:3000/api/rooms/1` tanpa Authorization → harus 401/403. (Bedakan endpoint publik `/api/public/rooms` vs privat `/api/rooms`.)

### D. Verifikasi kode
- [ ] 18. `PublicRoomsPage.tsx`: cek bagaimana status kamar difilter/ditampilkan. Cocokkan dengan JB-03 (baca status dari data yang benar).
- [ ] 19. `PublicRoomDetailPage.tsx`: cek label harga/deposit/DP di kode — cocok dengan aturan JB-01.
- [ ] 20. Cek konsistensi format Rupiah (helper `toLocaleString('id-ID')` atau util format). Ada yang pakai format beda?

## HASIL TEMUAN

> **Status:** kode + API + live UI **SELESAI** (2 Jul 2026, Fable, http://localhost:5173). Console **bersih** (0 error) di katalog & detail; semua API publik 200.

### C02-01 Kamar RESERVED diberi label "Kosong" (menyesatkan) — 🟡 MEDIUM
- **Severity:** MEDIUM · **Kategori:** Fungsional / kejelasan status (JB-03)
- **Yang terjadi:** di `getPublicRoomAvailabilityDisplay`, status **RESERVED** mengembalikan `label: "Kosong"` walau copy-nya berbunyi "Kamar sudah dikunci tenant". Label ini **sama persis** dengan kamar AVAILABLE (dua-duanya "Kosong"), padahal `canBook` beda. Pengunjung tak bisa membedakan kamar yang sudah dikunci vs benar-benar kosong dari teks badge.
- **Bukti:** `frontend/src/utils/publicRoomDisplay.ts:170` (RESERVED → label "Kosong") vs `:179` (AVAILABLE → label "Kosong").
- **SARAN FIX:** label RESERVED jadi "Dipesan"/"Dikunci"/"Reserved", bukan "Kosong".

### C02-02 Error-state detail kamar: link mati `/katalog` + nomor WA palsu — 🟡 MEDIUM
- **Severity:** MEDIUM · **Kategori:** Fungsional / navigasi (+ konsistensi kontak)
- **Langkah reproduksi:** buka `/rooms/999999/detail` (id numerik tak ada) → muncul Alert kuning.
- **Yang terjadi:** Alert memuat 2 link rusak (dikonfirmasi via DOM):
  - "Lihat katalog kamar" → `href="/katalog"` — **route ini TIDAK ADA** (yang benar `/rooms`) → klik = 404. Juga `<a>` biasa (full reload), bukan React `<Link>`.
  - "hubungi admin via WhatsApp" → `href="https://wa.me/6281234567890"` — **nomor placeholder palsu**; nomor admin asli `6285648887628` (muncul 8× di repo, `6281234567890` cuma 1× yaitu di sini).
  - Teks "Kamar ini sedang penuh / tidak tersedia" menyesatkan untuk kamar yang memang tak ada (bukan penuh).
- **Bukti:** `frontend/src/pages/rooms/PublicRoomDetailPage.tsx:298`. Live: href terverifikasi `/katalog` & `wa.me/6281234567890`.
- **Catatan:** path id **non-numerik** (`/rooms/abc/detail`) aman — pakai EmptyState bersih tanpa link rusak (`:299`). Hanya path id numerik-tak-ada yang kena.
- **SARAN FIX:** ganti `/katalog`→`/rooms` (pakai `<Link>`), nomor WA pakai `officialKost48Location.whatsappUrl`, perbaiki wording.

### C02-03 Ukuran halaman katalog = 3 (komentar bilang 12) — 🟢 LOW
- **Severity:** LOW · **Kategori:** UX / komentar-kode tidak sinkron
- **Yang terjadi:** `ROOMS_PER_PAGE = 3` (`PublicRoomsPage.tsx:35`), tapi komentar `:214` berbunyi "paginasi 12 per halaman". Dengan 13 kamar → 4+ halaman untuk daftar yang kecil. Kemungkinan komentar basi atau page-size tak sengaja kekecilan.
- **SARAN FIX:** samakan nilai & komentar (mis. 9–12/halaman).

### C02-04 Deposit disebut dua istilah di halaman yang sama — 🟢 LOW
- **Severity:** LOW · **Kategori:** Konsistensi istilah (JB-01)
- **Yang terjadi:** deposit refundable (`defaultDepositRupiah`) disebut "Dana titipan" (`PublicRoomDetailPage.tsx:326,472`) sekaligus "Deposit jaminan" (`:357`) di halaman detail yang sama → bisa membingungkan.
- **SARAN FIX:** pilih satu istilah konsisten.

### C02-05 DP selalu 30% MONTHLY + tiga angka uang berbeda — 🟢 LOW/INFO
- **Severity:** LOW · **Kategori:** Kejelasan uang (cross-check CHECKLIST_03)
- **Yang terjadi:** "DP awal" = `Math.round(monthlyRent*0.3)` selalu dari tarif **bulanan** apa pun term yang dipilih (`:340`). Detail juga menampilkan "Estimasi awal: sewa pertama + dana titipan = Total awal" (`:409,470-473`). Jadi ada 3 nominal (DP, sewa pertama, total awal) — verifikasi user paham DP itu tanda jadi (bukan tambahan di atas total), dan apakah DP semestinya mengikuti term terpilih, bukan selalu bulanan.

### Catatan positif (terverifikasi kode + live)
- **JB-01 detail BENAR:** DP ("Rp X · Dibayar saat booking dikonfirmasi. Hangus jika dibatalkan.") dan Deposit jaminan ("Dikembalikan penuh saat checkout (refundable).") dipisah jelas & eksplisit (`:337-364`).
- **JB-14 aman (live):** `GET /api/rooms/1` tanpa token → **401**; endpoint publik detail/list **tidak** membocorkan tenant/biaya (hanya `notes`). DTO: `marketing-public-rooms.service.ts:698-734`.
- **roomId invalid ditangani:** non-numerik → EmptyState; numerik-tak-ada → Alert (tanpa crash). Console 0 error.
- **Galeri:** carousel + fallback broken-image + empty-state "Foto kamar menyusul".
- **`CurrencyDisplay showZero={false}`** mencegah "Rp 0".

### Observasi / diteruskan
- **Jumlah kamar:** list publik = **13** kamar (bukan 48). Katalog default filter `avail=bookable` → tampil "10 kamar" (10 bookable dari 13). "48" = kapasitas gedung/branding; DB = data testing (sesuai CLAUDE.md). Konfirmasi ke owner bahwa 13 memang seed saat ini.
- **Filter "Kosong"** menyertakan kamar MAINTENANCE yang `allowBookingWhileCleaning=true` (badge kartu "Dibersihkan / Maintenance"). Logis, tapi label chip "Kosong" vs badge "Maintenance" membingungkan → pertimbangkan penamaan chip "Bisa diajukan".
- **C01-03 (notes) reconfirmed:** `notes` ikut di DTO publik (`:719`). Seed sekarang berisi spesifikasi kamar yang wajar (contoh Kamar A: "2m×3,5m + Mezanin…"), jadi belum ada kebocoran nyata — tetapi risiko laten tetap (blacklist kata rapuh).
- **Responsive:** belum (limitasi resize sesi) — dikumpulkan di CHECKLIST_19.
- ~~**Build:** belum~~ ✅ **SELESAI 2 Jul 2026:** `tsc --noEmit` backend = 0 error; `npm run build` frontend = sukses (dari C01).

## Definition of Done
- [x] Katalog + ≥3 detail (Kamar A id 1, id tak ada, id non-numerik) dibuka & di-screenshot ✅
- [x] JB-03 (status), JB-01 (DP/deposit), JB-14 (privat 401), JB-19 (payload) dicek eksplisit ✅
- [x] roomId invalid & non-angka diuji ✅
- [x] Temuan `C02-01` s.d. `C02-05` tercatat; Progres INDEX §9 baris 02 diupdate ✅
- [x] Build health: `tsc --noEmit` backend 0 error ✅, `npm run build` frontend sukses ✅
- [ ] Responsive mobile — ditunda ke CHECKLIST_19 ⏳
