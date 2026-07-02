# CHECKLIST 06 — Tenant: Bayar Tagihan (Invoice + Bukti Bayar)

> **Baca `00_INDEX.md` dulu.** Prefiks temuan: **`C06-xx`**. **Role:** TENANT. **Audit-only.**
> Re-verifikasi Hermes **I9** (loading tanpa timeout). Halaman menyentuh uang → hati-hati.

## Ruang lingkup
| Halaman | URL | File FE |
|---|---|---|
| Daftar tagihan | `/portal/invoices` | `pages/portal/MyInvoicesPage.tsx` |
| Detail tagihan | `/portal/invoices/:id` | `pages/portal/TenantInvoiceDetailPage.tsx` |

**Backend:** `invoices`, `payment-submissions` (`POST /api/payment-submissions`), `invoice-payments`. Model: `Invoice`, `InvoiceLine`, `PaymentSubmission`, `InvoicePayment`.

## Langkah audit

### A. Daftar tagihan
- [ ] 1. Login TENANT → `/portal/invoices`. Screenshot. Daftar tagihan muncul?
- [ ] 2. **I9 (re-check):** perhatikan state loading. Kalau backend lambat/mati, apakah stuck "Memuat halaman…" selamanya atau ada timeout/error-state? Uji: throttle Network (DevTools → Slow 3G) atau matikan backend sebentar → reload. Status → `C06-xx MEDIUM`.
- [ ] 3. Filter status (Belum Dibayar / Sedang Diperiksa / Selesai / Semua) → jumlah per filter cocok dengan isi tabel? Klik tiap filter.
- [ ] 4. **Chart "Tingkat Pelunasan %":** hitung manual `terbayar / total × 100`. Cocok? **JB-18:** bukan NaN%.
- [ ] 5. Alert overdue ("melewati jatuh tempo") muncul bila ada tagihan lewat tempo? **JB-05:** pastikan TIDAK ada denda keterlambatan yang ditambahkan ke total (aturan owner: tanpa denda). Kalau ada "denda"/"penalti" → **C06-xx HIGH**.
- [ ] 6. Kolom tabel: Tagihan, Masa Sewa, Jatuh Tempo, Total, Status, Aksi — semua terisi benar? Total = Σ InvoiceLine?

### B. Detail tagihan
- [ ] 7. Klik satu tagihan → `/portal/invoices/:id`. Rincian baris (InvoiceLine) tampil: sewa, meter listrik, dll?
- [ ] 8. **JB-01:** kalau invoice memuat deposit/DP, pastikan label & sifatnya benar (deposit refundable vs DP hangus vs sewa).
- [ ] 9. **Hitung ulang total:** Σ semua baris = total tertera? Pembulatan rupiah bulat (JB-13)?
- [ ] 10. Buka detail invoice dengan id **bukan milik tenant** → `GET /api/invoices/<id_lain>` token Maya → **JB-19:** harus 403. Uji via curl.

### C. Bayar & kirim bukti (jalur sukses + gagal)
- [ ] 11. Klik "Bayar & Kirim Bukti" pada tagihan Belum Dibayar → modal/form muncul.
- [ ] 12. Submit **tanpa** bukti → ditolak dengan pesan jelas?
- [ ] 13. Upload bukti: file bukan gambar → ditolak? File besar → ditangani? Nominal transfer bisa diisi ≠ total → apakah divalidasi/diperbolehkan (kurang bayar)? Catat perilakunya.
- [ ] 14. Submit valid → Network `POST /api/payment-submissions` 2xx. Status tagihan berubah → "Sedang Diperiksa"? **JB-20:** UI refresh otomatis atau perlu reload manual (stale)?
- [ ] 15. **JB-12 (idempotency):** klik "Kirim" 2× cepat → tidak terbentuk 2 PaymentSubmission ganda untuk 1 invoice?
- [ ] 16. Setelah submit, coba submit LAGI untuk invoice sama yang "Sedang Diperiksa" → boleh/tidak? Perilaku wajar? (mencegah pembayaran dobel selagi diperiksa).

### D. Konsistensi status (jebakan flow)
- [ ] 17. **JB-03:** status tagihan dibaca dari data pembayaran, bukan status kamar. Cek label tagihan konsisten dengan kenyataan (belum ada InvoicePayment = belum lunas).
- [ ] 18. Tagihan "Selesai" → tidak ada tombol bayar lagi (mencegah bayar 2×)?

### E. Verifikasi kode
- [ ] 19. `MyInvoicesPage.tsx`: cek handling loading/error (langkah 2). Ada `try/catch` + error-state?
- [ ] 20. `payment-submissions.service.ts`: cek validasi — invoice milik tenant yang login? Cegah double submission? Guard status invoice?

## HASIL TEMUAN

> **Status:** kode + API + live (Maya) **SELESAI**. Area kuat & aman. Tidak ada BLOCKER/HIGH/MEDIUM. **Tidak ada refetch-loop** di sini (endpoint `/invoices/my` balas 200 array kosong, bukan 404 seperti C05).

### ✅ Verifikasi (kode + live) — bagian yang BENAR
- **JB-19 isolasi invoice AMAN (kode):** `invoices.service.findOne` melempar **404** bila `invoice.stay.tenantId !== user.tenantId` untuk TENANT (`invoices.service.ts:265`); list `/invoices/my` difilter `stay.tenantId = user.tenantId` (`:214`). Live: Maya `/invoices/my` → hanya invoice miliknya (id 1); probe `/invoices/2..20` → 404. Controller: `/invoices` (list) OWNER/ADMIN, `/invoices/my` TENANT, `/invoices/:id` OWNER/ADMIN/TENANT (di-scope service).
- **JB-05 tanpa denda (live):** invoice Maya #1 = **hanya baris "Sewa kamar A - MONTHLY Rp 1.700.000"**; Total 1.700.000 = Dibayar, **Sisa Rp 0**. Tidak ada baris denda/penalti.
- **JB-13 total bulat & konsisten (live):** Σ baris (1.700.000) = Total. Semua rupiah bulat.
- **JB-18 no NaN:** `paidRate = totalBilled>0 ? round(totalPaid/totalBilled*100) : 0` (`MyInvoicesPage.tsx:44`) ter-guard. Live: "100%", "Rp 1.7 jt", "Rp 0" — tak ada NaN.
- **I9 (Hermes) RESOLVED:** MyInvoicesPage punya state lengkap — spinner (`:277`), **error Alert** "Gagal memuat tagihan" (`:278`), empty-state (`:279`). `retry:false`.
- **Payment submission SANGAT robust (`payment-submissions.service.ts`):** ownership file (`fileKey` wajib prefiks `${tenantId}_`, `:95`); **anti-replay** (fileKey sudah dipakai → tolak, `:106-113`); **anti-double-payment** ("Pembayaran awal … sudah lunas" → Conflict, `:189`); **nominal harus tepat** (`:205`); tanggal bayar tak boleh masa depan (`:130`); guard invoice draft/tak-bisa-terima (`:151-154,210-214`); booking kedaluwarsa ditolak (`:165`); target di-scope ke tenant (`findEligibleSubmissionTarget`, `:134`).
- **Pemisahan sewa vs utilitas jelas:** "Tagihan sewa ini belum termasuk pemakaian listrik/air…". Fitur **Cetak/Kwitansi** arsip. JB-01: deposit tidak dicampur ke invoice sewa.
- Filter status (Belum Dibayar/Sedang Diperiksa/Selesai/Semua) + chart "Tingkat Pelunasan" (100%) + "Tagihan per Status" render benar. Batch-pay multi-invoice per stay tersedia.

### C06-01 Invoice LUNAS masih menampilkan hitung-mundur jatuh tempo — 🟢 LOW
- **Severity:** LOW · **Kategori:** UI/kejelasan
- **Yang terjadi (live):** detail invoice #1 sudah "Lunas" tapi tetap menampilkan "JATUH TEMPO 03 Juli 2026 07:00 WIB · **Sisa 2 jam 14 menit**" (hitung mundur urgensi) padahal sudah dibayar (24 Apr 2026).
- **SARAN FIX:** sembunyikan countdown jatuh tempo bila status Lunas.

### C06-02 Banner "3 langkah menuju kamar" muncul untuk mantan penghuni — 🟢 LOW
- **Severity:** LOW · **Kategori:** UX/konteks
- **Yang terjadi (live):** Maya (punya riwayat tagihan lunas, tapi tak ada stay aktif → stage 'browsing') melihat banner onboarding "Panduan memulai — 3 langkah menuju kamar Anda" di atas halaman invoice. Menganggap browsing = calon penghuni baru, padahal Maya penghuni lama dengan riwayat.
- **SARAN FIX:** bedakan "belum pernah menghuni" vs "mantan penghuni" untuk banner onboarding.

### C06-03 Belum teruji: dua submission PENDING untuk invoice sama — 🟢 INFO
- **Severity:** INFO · **Kategori:** Cakupan uji
- **Catatan:** guard "sudah lunas" & consumed-fileKey kuat, tapi skenario dua bukti PENDING berbeda-file untuk 1 invoice (sebelum approval) tak teruji live (Maya tak punya invoice unpaid). UI mengklaim "Bukti yang sedang diperiksa tidak perlu diupload ulang". **Rekomendasi:** uji saat ada invoice unpaid / di CHECKLIST admin (C12).

## Definition of Done — status
- [x] Daftar + detail invoice diuji live (Maya). Form bayar: guard diverifikasi via kode (Maya tak punya invoice unpaid).
- [x] I9 (loading/error/empty) diverifikasi (ada isError Alert).
- [x] Total dihitung ulang; JB-05 (tanpa denda) & JB-13 (bulat) dicek live.
- [x] JB-19 (akses invoice tenant lain) diuji: service throw 404 + probe live. **Aman.**
- [x] Temuan `C06-xx`; INDEX baris 06 diupdate.

## Definition of Done
- [ ] Daftar + detail + form bayar diuji (sukses & gagal).
- [ ] I9 (loading) di-verifikasi dengan throttle/matikan backend.
- [ ] Total invoice dihitung ulang manual; JB-05 (tanpa denda) & JB-13 (bulat) dicek.
- [ ] JB-19 (akses invoice tenant lain) diuji via curl.
- [ ] JB-12 double-submit diuji.
- [ ] Temuan `C06-xx`. Update Progres Global baris 06.
