# CHECKLIST 07 — Tenant: Lapor Masalah (Tiket) + Review & Tip Staf

> **Baca `00_INDEX.md` dulu.** Prefiks temuan: **`C07-xx`**. **Role:** TENANT. **Audit-only.**
> Re-verifikasi Hermes **I10** (tombol "Batal" tidak menutup modal — severity HIGH).

## Ruang lingkup
| Halaman | URL | File FE |
|---|---|---|
| Lapor masalah / tiket | `/portal/tickets` | `pages/portal/MyTicketsPage.tsx` |
| Review + tip staf | (dari tiket selesai) | dalam `MyTicketsPage` / komponen tiket |

**Backend:** `tickets` (`POST /api/tickets`), `tenant/staff-reviews` (`tenant-staff-reviews`). Model: `Ticket`, `StaffReview`.

## Langkah audit

### A. Form buat laporan
- [ ] 1. Login TENANT → `/portal/tickets`. Screenshot. Daftar tiket + tombol "Buat Laporan Baru" ada?
- [ ] 2. Buka form. **15 kategori** ada (Umum, Listrik, Air, AC, WiFi, Kunci, Furniture, Kebersihan, Hama, Keamanan, Keributan, Bantuan Masuk/Keluar, Tagihan/Admin, **Darurat**, Lainnya)? Cek jumlah & nama.
- [ ] 3. Upload foto: Choose File + Ambil Foto + Pilih Galeri berfungsi? Upload non-gambar ditolak?
- [ ] 4. Tombol "Kirim Laporan" disabled sampai form lengkap?

### B. ⭐ I10 — Tombol Batal (JEBAKAN UTAMA)
- [ ] 5. **I10 (re-check):** buka form, isi sebagian, klik **"Batal"**. **Ekspektasi:** modal tertutup & form ter-reset. Apakah benar tertutup, atau tidak terjadi apa-apa (bug lama)?
- [ ] 6. Buka `MyTicketsPage.tsx`, cari tombol "Batal". Cek handler `onClick` — apakah memanggil setter tutup modal (mis. `setShowCreateModal(false)`) atau kosong/`console.log`? Kutip `file:baris`.
- [ ] 7. Uji juga tombol "X"/close & klik area luar modal (overlay) → menutup? Tekan `Esc` → menutup?
- [ ] 8. Status I10: fixed / masih bug → `C07-xx` (HIGH bila masih).

### C. Kirim & verifikasi
- [ ] 9. Isi valid → kirim → Network `POST /api/tickets` 2xx. Tiket muncul di daftar dengan status "Dibuat"?
- [ ] 10. **XSS:** judul/deskripsi = `<script>alert(1)</script>` → tersimpan & ditampilkan ter-escape?
- [ ] 11. **JB-12:** kirim 2× cepat → tidak dobel?
- [ ] 12. Timeline status tiket (Dibuat → Ditugaskan → Selesai → Ditutup) tampil untuk tiket lama?
- [ ] 13. Data seed "AC kamar A kurang dingin" (status Selesai) tampil?

### D. Review + Tip staf (fitur unik)
- [ ] 14. Untuk tiket **Selesai**, opsi Review + Tip staf muncul? Metode: GoPay/DANA/ShopeePay/BCA?
- [ ] 15. Beri rating + submit review → Network `POST` ke `tenant/staff-reviews` 2xx? Tersimpan?
- [ ] 16. **JB-12:** submit review 2× → tidak dobel? Bisa review tiket yang sama berulang (spam)?
- [ ] 17. **Tip:** apakah tip benar-benar transaksi uang atau hanya menampilkan info pembayaran (QR/nomor)? **JB (finansial):** kalau ada eksekusi transfer otomatis → catat (aplikasi kost seharusnya tidak mengeksekusi transfer). Verifikasi hanya menampilkan instruksi.
- [ ] 18. Command Center / Asisten Laporan AI: muncul? **JB-08:** AI untuk tenant? Cek apakah ini fitur AI berbayar (harusnya OWNER/ADMIN only) atau sekadar template bantuan. Kalau memanggil DeepSeek berbayar dari sisi tenant → **C07-xx HIGH**.

### E. Keamanan
- [ ] 19. **JB-19:** daftar tiket hanya milik tenant login. Coba `GET /api/tickets/<id_tiket_tenant_lain>` token Maya → 403?
- [ ] 20. **Kode:** `tickets.service.ts` — guard tiket milik tenant sendiri; kategori "Darurat" ada penanganan khusus (prioritas/notif)?

## HASIL TEMUAN

> **Status:** kode + live (Maya) **SELESAI**. Area kuat. **Temuan Hermes I10 RESOLVED (dikonfirmasi live).** Tidak ada BLOCKER/HIGH/MEDIUM. Tidak ada refetch-loop (6 call `stays/me/current`, bukan 600).

### ✅ I10 (tombol Batal) — RESOLVED, dikonfirmasi live + kode
- **Bukti live (via DOM):** buka modal "Buat Laporan Baru" → ketik judul "UJI XSS <b>x</b>" → klik **"Batal"** → **modal tertutup** (`modalClosedAfterBatal: true`) → buka lagi → field judul **kosong** (form ter-reset). ✅
- **Bukti kode:** `MyTicketsPage.tsx:389` — `onClick={() => { setShowCreate(false); setFormState(initialForm); setError(''); }}`. Sama untuk `onHide` (X / Esc / overlay, `:339`). Old bug (Batal tak menutup) **sudah diperbaiki**.

### ✅ Verifikasi lain (kode + live) — BENAR
- **15 kategori** (`MyTicketsPage.tsx:139-153`): Bantuan umum, Listrik, Air/Plumbing, AC, WiFi, Kunci/Pintu, Furniture, Kebersihan, Hama, Keamanan, Keributan, Bantuan Masuk/Keluar, Tagihan/Admin, **Darurat**, Lainnya. ✅
- **JB-08 (AI berbayar) CLEAN:** "Command Center / Asisten Laporan Kamu" = **ringkasan lokal berbasis rule** (`AssistantPanel` dari `components/command-center`, item dari `useMemo` tiket, `:190-192`), **bukan** panggilan DeepSeek/owner-ai. Live: panel berlabel "Rule / Info". Tidak ada AI berbayar untuk tenant.
- **JB-12 double-submit:** tombol "Kirim Laporan" `disabled={createMutation.isPending || !formState.title.trim()}` (`:390`). ✅
- **JB-19 isolasi tiket AMAN:** `/tickets/my` di-scope `tenantId=user.tenantId` (`tickets.service.ts:204`); `findOne` & `tip-acknowledge` throw bila `ticket.tenantId !== user.tenantId` (`:299-300,363`). Controller: `/tickets` list = OWNER/ADMIN/STAFF, `/tickets/my` = TENANT.
- **Tip = DISPLAY-ONLY (aman finansial):** live menampilkan nomor e-wallet staf (GoPay/DANA/ShopeePay/Bank) + tombol "tandai" (acknowledge). Teks eksplisit "**di luar pembayaran kos**", "Hanya dihitung berapa kali (**tanpa nominal**)". **Aplikasi tidak mengeksekusi transfer** — tenant transfer manual. ✅
- **Timeline tiket** (Dibuat → Ditugaskan → Selesai dikerjakan → Ditutup) tampil benar (seed "AC kamar A kurang dingin", Selesai). **Review prompt** ("Beri Nilai") + **daftar perbaikan GRATIS** (lampu, kran, shower, kebocoran, flush, stop kontak) tampil.
- **XSS:** judul menerima `<b>x</b>` sebagai string di input (React escape saat render — konsisten dgn C03). Submit nyata tak dilakukan (hindari tulis data).

### C07-01 Banner onboarding "3 langkah menuju kamar" untuk mantan penghuni — 🟢 LOW (berulang, = C06-02)
- **Severity:** LOW · **Kategori:** UX/konteks
- **Yang terjadi:** sama seperti C06-02 — Maya (mantan penghuni, tak ada stay aktif) melihat banner "Panduan memulai — 3 langkah menuju kamar Anda" di atas halaman tiket. **Pola berulang di semua halaman portal** untuk tenant tanpa stay aktif (stage 'browsing'). Perbaiki sekali di layout portal.

## Definition of Done — status
- [x] I10 (tombol Batal) diverifikasi **live + kode** — RESOLVED (tutup + reset form).
- [x] 15 kategori dikonfirmasi. Upload/kamera ada (`CameraOrGalleryInput`). XSS: input as-string.
- [x] Review/tip diperiksa; JB-08 (AI) clean; tip display-only (no money moved).
- [x] JB-19 (isolasi tiket) diverifikasi via kode (service scope + ownership throw).
- [x] Temuan `C07-xx`; INDEX baris 07 diupdate.

## Definition of Done
- [ ] I10 (tombol Batal) di-verifikasi via UI **dan** kode (kutip baris). Status dicatat.
- [ ] Form 15 kategori + upload diuji (sukses & gagal + XSS).
- [ ] Review/tip staf diuji; JB-08 (AI berbayar untuk tenant) diperiksa.
- [ ] JB-19 (tiket tenant lain) diuji.
- [ ] Temuan `C07-xx`. Update Progres Global baris 07.
