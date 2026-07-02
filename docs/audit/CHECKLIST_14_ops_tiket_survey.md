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
_(kosong — diisi auditor)_

## Definition of Done
- [ ] Alur tiket admin (assign→start→close) + mode staf diuji.
- [ ] Guard kepemilikan tiket staf (JB-14) diuji via curl.
- [ ] AC maintenance & survei diperiksa (agregasi, tanggal, empty-state).
- [ ] JB-12 double-action & JB-20 konsistensi tenant dicek.
- [ ] Temuan `C14-xx`. Update Progres Global baris 14.
