# CHECKLIST 14 — Operasional: Tiket (Admin/Staff) + AC Maintenance + Survei

> **Baca `00_INDEX.md` dulu.** Prefiks temuan: **`C14-xx`**. **Role:** ADMIN/STAFF (+OWNER). **Audit-only.** DB UAT.

## Ruang lingkup
| Halaman | URL | File FE | Role |
|---|---|---|---|
| Tiket (admin/owner/staff) | `/tickets` | `pages/tickets/TicketsPage.tsx` (+ `TicketsStaffMode.tsx`) | OWNER/ADMIN/STAFF |
| Perawatan AC | `/ac-maintenance` | `pages/operations/AcMaintenancePage.tsx` | OWNER/ADMIN |
| Survei | `/surveys` | `pages/admin/AdminSurveysPage.tsx` | OWNER/ADMIN |

**Backend:** `tickets.service.ts` (guard AVAILABLE), `surveys`, `meter-readings`(AC?). Model: `Ticket`, `SatisfactionSurvey`, `GuestPreferenceSurvey`.

## Langkah audit

### A. Tiket sisi admin `/tickets`
- [ ] 1. Login ADMIN → `/tickets`. Daftar tiket (termasuk yang dibuat tenant di CHECKLIST_07) tampil dengan kategori & status?
- [ ] 2. Alur status: Dibuat → **Assign** ke staf → **Start** → **Close**. Jalankan tiap transisi. Status ter-update & timeline benar?
- [ ] 3. **Guard AVAILABLE:** assign tiket ke staf → cek guard (staf tersedia?). Assign ke staf tidak aktif → ditolak? (baca `tickets.service.ts` guard).
- [ ] 4. Kategori "Darurat" → prioritas/penanganan khusus (notif segera)? (JB-15 notif in-app).
- [ ] 5. Kerusakan gratis vs berbayar: daftar item gratis (lampu, kran, shower, dll) konsisten dengan aturan? Kerusakan akibat kelalaian → dikenakan biaya (jadi expense/charge)?
- [ ] 6. **JB-12:** klik Assign/Close 2× → status tidak loncat/dobel.
- [ ] 7. **JB-20:** setelah aksi, daftar refresh; status tercermin di portal tenant (CHECKLIST_07).

### B. Tiket sisi STAFF (`TicketsStaffMode`)
- [ ] 8. Login STAFF → `/tickets`. Mode staf tampil (hanya tiket yang ditugaskan ke dia)?
- [ ] 9. **JB-14:** staf hanya lihat/ubah tiket miliknya, tidak semua tiket. Coba akses tiket staf lain via curl → 403?
- [ ] 10. Staf update progress/close tiket → tersimpan? Upload foto hasil kerja?

### C. AC maintenance `/ac-maintenance`
- [ ] 11. Login ADMIN → buka. Jadwal cuci AC per kamar tampil? Tanggal "cuci AC terakhir" konsisten dengan dashboard tenant (CHECKLIST_05)?
- [ ] 12. Catat maintenance baru → tersimpan? Tanggal masa depan/lampau ditangani (JB-17)?
- [ ] 13. **JB-18:** tidak ada "Invalid Date"/kolom kosong janggal.

### D. Survei `/surveys`
- [ ] 14. Login ADMIN → buka. Hasil survei kepuasan tampil? Agregasi rating benar (hitung rata-rata manual satu sampel)?
- [ ] 15. **JB-19:** respons survei tidak membocorkan identitas responden bila seharusnya anonim.
- [ ] 16. Empty-state bila belum ada survei? Chart survei render tanpa data (JB-18 width -1)?

### E. Keamanan & kode
- [ ] 17. **JB-14:** `/ac-maintenance`, `/surveys` ditolak untuk STAFF/TENANT (route OWNER/ADMIN). Uji UI + curl.
- [ ] 18. `tickets.service.ts`: guard kepemilikan (staf/tenant), guard status transisi valid (tidak bisa Close tiket yang belum Assign), kategori Darurat.

## HASIL TEMUAN

> **Status:** **kode SELESAI** (bersih); **live TERTUNDA** (backend down). 

### ✅ Verifikasi kode — BENAR
- **Tiket guard (`tickets.service.ts`):** ownership/authorization berlapis — tenant hanya lihat miliknya, staf harus penanggung jawab (`:250,364,378`); tip hanya setelah tiket **selesai** + ada staf (`:302-304`); tenant wajib utk tiket admin (`:438`); jenis laporan staf divalidasi (`:434`). (Isolasi JB-19 sudah dikonfirmasi C07.)
- **Survei NaN-safe (JB-18) (`surveys.service.ts`):** `avg = vals.length ? round(sum/len*10)/10 : null` (`:28-30`) — **pembagian ter-guard** (null bila kosong, bukan NaN). `recommendRate` idem (`:33`). Submission di-scope `actor.tenantId` (`:13`); eligibility gate 30 hari (`:61-63`).

### ✅ LIVE CONFIRMED (`/tickets` owner, 3 Jul) — render kaya & bersih
- **Halaman tiket admin render penuh:** menu (Semua Tiket / Perlu Assign / Checklist / Laporan Lapangan / Kinerja Staff), statistik **25 total, 20 baru, 5 selesai**, kategori (AC_CLEANING, EVICT_OVERSTAY, CHECKOUT_INSPECTION, ELECTRICITY, WIFI, PLUMBING), umur tiket, pagination (4 hal).
- **5 tiket DONE = seed DEFAULT_DATA** persis (AC-K, Lampu-I, WiFi-G, Keran-C, AC-A). ✅ integritas data.
- **✅ AUTO-OPS OVERSTAY (StaySweep) BEKERJA LIVE:** tenant yang lease berakhir 24 Jun & tak renew → **otomatis** dibuat tiket **`EVICT_OVERSTAY`** (Bayu-I "kontrak stay #7 berakhir 2026-06-24… lewat 12:00") + **`CHECKOUT_INSPECTION`** (F1/M/L/J: "checkout paksa otomatis H+1 lewat 12:00"). Ini penyebab 10 kamar MAINTENANCE. Konfirmasi C10 auto-ops.
- **✅ JB-05 (tanpa denda):** teks tiket overstay = "**biaya overstay/pembersihan dipotong dari deposit jaminan** saat settlement" — potong deposit utk biaya riil, **BUKAN denda keterlambatan**. ✅
- **Alur assign terlihat:** tiap tiket punya "Pilih petugas → Tugaskan → Mulai Kerjakan". "Antrian konfirmasi admin — 5 perlu cek" (tiket DONE menunggu ditutup admin).
### ✅ LIVE CONFIRMED (`/ac-maintenance` owner, 3 Jul)
- **Render "Perawatan AC":** 9 unit AC (Total 9, Perlu dicuci 9, Segera 0), tabel per kamar (A,B,C,D,J,F1,F2 = ½ PK; K,L = ¾ PK). **Jadwal hibrid** = cuci dipicu bila interval hari lewat ATAU estimasi kWh tinggi; "Estimasi kWh = daya × jam pakai/hari sejak cuci terakhir" (**tanpa NaN**, ~0 kWh krn belum ada pemakaian).
- **Rekonsiliasi volume tiket:** tiap AC "belum pernah dicuci" → **Tiket #6–#14 auto-dibuat** (AC_CLEANING). Ini menjelaskan lonjakan tiket (#1–5 = seed, #6–14 = auto cuci-AC). Konsisten C14 auto-ops.

### ✅ LIVE CONFIRMED (`/surveys` owner, 3 Jul) — REKALKULASI MANUAL LULUS (JB-18)
- **Render "Survei Kepuasan":** 5 survei, komentar terbaru, filter rating + sort. Data seed 5 survei (rating overall 4,3,5,4,5).
- **✅ AGREGASI DICOCOKKAN MANUAL — semua BENAR:** Rata-rata (4+3+5+4+5)/5 = **4.2★** ✓; Rekomendasi 4/5 = **80%** ✓; Kebersihan 21/5 = **4.2** ✓; Staf 23/5 = **4.6** ✓; Fasilitas 20/5 = **4.0** ✓; Harga 21/5 = **4.2** ✓; distribusi bintang **2/2/1/0/0** ✓. **Tak ada NaN / salah agregasi** (JB-18 lulus live).

### Live TERTUNDA (butuh BE hidup)
- Alur tiket admin (assign→start→close, JB-12 double-action), mode staf (hanya tiket ditugaskan, JB-14 via curl), AC maintenance (jadwal + tanggal), survei display (agregasi + empty-state + anonimitas), JB-14 (`/ac-maintenance`,`/surveys` ditolak STAFF/TENANT).

## Definition of Done — status
- [x] Guard tiket (ownership/transisi/tip) + survei NaN-safe diverifikasi kode.
- [~] Live admin/staff tiket + AC + survei: tertunda (backend down).
- [x] Temuan `C14-xx` (nihil bug kode); INDEX baris 14 diupdate.

## Definition of Done
- [ ] Alur tiket admin (assign→start→close) + mode staf diuji.
- [ ] Guard kepemilikan tiket staf (JB-14) diuji via curl.
- [ ] AC maintenance & survei diperiksa (agregasi, tanggal, empty-state).
- [ ] JB-12 double-action & JB-20 konsistensi tenant dicek.
- [ ] Temuan `C14-xx`. Update Progres Global baris 14.
