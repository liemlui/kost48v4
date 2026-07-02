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
_(kosong — diisi auditor)_

## Definition of Done
- [ ] Alur template→assign→completion diuji (admin + staf).
- [ ] KPI direkalkulasi manual & dicocokkan.
- [ ] JB-14 diuji: staf hanya data sendiri; `/staff-*` ditolak untuk non-staf.
- [ ] JB-12 double-submit dicek.
- [ ] Temuan `C15-xx`. Update Progres Global baris 15.
