# CHECKLIST 15 — Operasional: Rutinitas Staf + KPI + Laporan Lapangan

> **Baca `00_INDEX.md` dulu.** Prefiks temuan: **`C15-xx`**. **Role:** ADMIN/OWNER/STAFF. **Audit-only.** DB UAT.

## Ruang lingkup
| Halaman | URL | File FE | Role |
|---|---|---|---|
| Rutinitas staf (admin) | `/staff-routines` | `pages/staff-routines/StaffRoutinesAdminPage.tsx` | OWNER/ADMIN |
| KPI staf (admin) | `/staff-performance` | `pages/admin/AdminStaffPerformancePage.tsx` | OWNER/ADMIN |
| Laporan bulanan staf | `/staff-report` | `pages/staff/StaffMonthlyReportPage.tsx` | **STAFF only** |
| Gudang staf | `/staff-warehouse` | `pages/staff/StaffWarehousePage.tsx` | **STAFF only** |
| Rooms staf | (via `/rooms/:id`) | `pages/rooms/StaffRoomsPage.tsx` / `RoomDetailPage.tsx` | OWNER/ADMIN/STAFF |

**Backend:** `staff-routines` (+admin), `staff-performance` (+admin), `staff-field-reports`. Model: `StaffRoutineTemplate`, `StaffRoutineAssignment`, `StaffRoutineCompletion`, `StaffPerformanceEvent`, `StaffWorkAudit`, `StaffFieldReport`.

## Langkah audit

### A. Rutinitas (admin) `/staff-routines`
- [ ] 1. Login ADMIN. Buat **template** rutinitas → assign ke staf → cek assignment muncul. Screenshot tiap langkah.
- [ ] 2. Template dengan field kosong → ditolak? Assign ke staf tidak aktif → ditolak?
- [ ] 3. **JB-12:** buat/assign 2× cepat → tidak dobel.
- [ ] 4. Console/Network bersih? N+1 pada daftar assignment?

### B. Completion (sisi staf)
- [ ] 5. Login STAFF → lihat rutinitas yang di-assign. Tandai **selesai** (completion) → tercatat + memicu `StaffPerformanceEvent`?
- [ ] 6. **JB-14:** staf hanya lihat assignment miliknya. Coba lihat assignment staf lain via curl → 403.
- [ ] 7. Complete rutinitas yang sudah selesai / bukan miliknya → ditolak (guard)?

### C. KPI `/staff-performance` (rekalkulasi)
- [ ] 8. Login ADMIN. KPI per staf tampil (jumlah rutinitas selesai, tiket, dll)?
- [ ] 9. **Rekalkulasi manual:** ambil 1 staf, hitung metriknya dari data mentah (completion/tiket), cocokkan dengan KPI tampil. Salah agregasi = **C15-xx MEDIUM/HIGH**.
- [ ] 10. **JB-18:** pembagian rasio KPI tidak /0 → NaN/Infinity. Periode tanpa data → empty-state.
- [ ] 11. Chart KPI render benar (bukan width -1)?

### D. Laporan bulanan & gudang staf (STAFF only)
- [ ] 12. Login STAFF → `/staff-report`: isi laporan bulanan (field report) → tersimpan? `StaffFieldReport` terbentuk?
- [ ] 13. `/staff-warehouse`: daftar barang gudang untuk staf tampil? (integrasi inventory — CHECKLIST_16).
- [ ] 14. **JB-14:** `/staff-report` & `/staff-warehouse` — login ADMIN/TENANT akses → ditolak (route STAFF only). Uji.

### E. Laporan lapangan review (admin)
- [ ] 15. Admin melihat `StaffFieldReport` dari staf → bisa review/approve? Status ter-update?
- [ ] 16. **JB-19:** laporan lapangan tidak bocor ke tenant.

### F. Kode
- [ ] 17. `staff-routines.service.ts` + `staff-performance`: guard kepemilikan, transisi completion valid, perhitungan KPI (helper).
- [ ] 18. Cek `StaffWorkAudit` mencatat aktivitas (jejak audit ada).

## HASIL TEMUAN

> **Status:** **kode SELESAI** (bersih); **live TERTUNDA** (backend down).

### ✅ Verifikasi kode — BENAR
- **KPI NaN-safe (`staff-performance.service.ts`):** helper `avg` **guard empty** — `if (!values.length) return null` (`:52-54`) → tak ada NaN (JB-18). Rasio lain ter-guard: resolution `resolutionHours.length ? … : …` (`:270`), `proofCompletionRate = proofRequired ? … : 100` (`:299`). Insight berbasis **rule** (`buildRuleInsight` `:526`), bukan AI berbayar.
- Guard kepemilikan/transisi tiket & staf sudah dikonfirmasi (C07/C14). `StaffWorkAudit` = jejak audit.

### ✅ LIVE CONFIRMED (`/staff-routines` owner, 3 Jul)
- **Render:** "Atur Pekerjaan Rutin Staf" — form Tambah checklist (Nama, **Jadwal Harian/Mingguan/Bulanan**, **Area** [umum/bersih-bersih/KM/kamar/stok/meter/keamanan], Catatan, Urutan, **Butuh foto**, **Butuh catatan**, Aktif). Stats "Checklist aktif 0 / Selesai 7 hari 0 / Butuh bantuan 0" (tanpa NaN). Empty-state "Belum ada pekerjaan rutin". Copy: "Staff hanya melihat daftar kerja sederhana di beranda" (pemisahan admin vs staff).
- Endpoint `/staff-performance` KPI 200 owner (agregasi NaN-safe sudah kode-verified); TENANT → 403/404 (JB-14).
- **`/staff-performance` RENDER (live):** "Kinerja Staf" tampil **insight rule-based** — "Prioritas tinggi · **Risiko 84** · AC kamar K perlu service cuci — tugas selesai/ditutup tapi **belum ada foto penyelesaian** → sarankan audit random / minta foto bukti bulanan [Audit]". Skor risiko = angka valid (**tanpa NaN**), **rule-based** (bukan AI berbayar, selaras JB-08). Konfirmasi logika `proofCompletionRate` (tugas done tanpa foto → flag risiko).

### Live TERTUNDA (butuh BE hidup)
- Template→assign→completion (admin+staf), KPI rekalkulasi manual, `/staff-report` & `/staff-warehouse` (STAFF-only, JB-14), field report review.

## Definition of Done — status
- [x] KPI NaN-safe + insight rule-based diverifikasi kode.
- [~] Live alur routine/KPI/laporan: tertunda (backend down).
- [x] Temuan `C15-xx` (nihil bug kode); INDEX baris 15 diupdate.

## Definition of Done
- [ ] Alur template→assign→completion diuji (admin + staf).
- [ ] KPI direkalkulasi manual & dicocokkan.
- [ ] JB-14 diuji: staf hanya data sendiri; `/staff-*` ditolak untuk non-staf.
- [ ] JB-12 double-submit dicek.
- [ ] Temuan `C15-xx`. Update Progres Global baris 15.
