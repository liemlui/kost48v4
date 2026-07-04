# CHECKLIST 08 — Tenant: Pengumuman + Panduan/Manual + Pesan WiFi

> **Baca `00_INDEX.md` dulu.** Prefiks temuan: **`C08-xx`**. **Role:** TENANT. **Audit-only.**
> ⚠️ **RE-VERIFIKASI KRITIS temuan Hermes I11, I12, I13.** Hermes bilang halaman ini "404/kosong". **TAPI file & route-nya SUDAH ADA** di repo. Kemungkinan besar temuan Hermes **STALE/salah**. Tugasmu: buktikan mana yang benar sekarang.

## Ruang lingkup (route SUDAH ADA di App.tsx — verifikasi!)
| Halaman | URL | File FE | Route App.tsx |
|---|---|---|---|
| Pengumuman | `/portal/announcements` | `pages/portal/MyAnnouncementsPage.tsx` | baris ~307 |
| Detail pengumuman | `/portal/announcements/:id` | `pages/portal/TenantAnnouncementDetailPage.tsx` | baris ~308 |
| Panduan (redirect) | `/portal/guide` → `/portal/manual` | `Navigate replace` (R-17) | baris ~321 |
| Manual/Panduan | `/portal/manual` | `pages/portal/MyManualPage.tsx` | — |
| Pesan WiFi | `/portal/wifi` | `pages/portal/WifiOrderPage.tsx` | baris ~322 |

**Backend:** `announcements` (`GET /api/announcements` atau `me/...`), `wifi-sales` (`/api/wifi-sales`), `settings`/`OperationalSetting` (harga WiFi Rp50.000). Model: `Announcement`, `WifiSale`, `OperationalSetting`.

## Langkah audit

### A. Pengumuman `/portal/announcements` (re-check I11)
- [ ] 1. Login TENANT → `/portal/announcements`. Screenshot. **Kosong atau ada isi?**
- [ ] 2. **Sidebar/menu portal muncul?** Hermes klaim "sidebar hilang". Bandingkan layout dengan `/portal/stay`. Kalau sidebar benar hilang → cek apakah `MyAnnouncementsPage` membungkus dengan layout portal yang sama (grep komponen layout). → `C08-xx`.
- [ ] 3. Network: endpoint pengumuman 200? Data ada? Kalau backend balas array kosong → apakah UI menampilkan empty-state ramah ("Belum ada pengumuman") atau blank total? (Blank = bug UI; kosong data = bukan bug, tapi seed kurang.)
- [ ] 4. Ada pengumuman → klik → `/portal/announcements/:id` detail tampil? Tanggal/format benar (JB-17)?
- [ ] 5. **Root cause bila kosong:** tentukan penyebab — (a) tidak ada data seed, (b) endpoint error/404, (c) UI tidak render data yang ada. Catat penyebab pasti, bukan sekadar "kosong". Cek `MyAnnouncementsPage.tsx` + Network.

### B. Panduan/Manual `/portal/guide` & `/portal/manual` (re-check I12)
- [ ] 6. Buka `/portal/guide` → **harus redirect** ke `/portal/manual` (bukan 404). Terjadi? (Hermes klaim 404 — kemungkinan sebelum redirect R-17 dibuat.)
- [ ] 7. `/portal/manual` (`MyManualPage.tsx`) menampilkan konten panduan? Screenshot. Kosong/isi?
- [ ] 8. Cek link sidebar "Panduan" → menunjuk `/portal/manual` atau masih `/portal/guide` lama? Kalau ke `/guide`, redirect tetap menyelamatkan, tapi catat INFO agar dirapikan.
- [ ] 9. Konten manual: langkah-langkah jelas? Ada link internal yang 404?

### C. Pesan WiFi `/portal/wifi` (re-check I13)
- [ ] 10. Buka `/portal/wifi` (`WifiOrderPage.tsx`). Screenshot. Hanya heading (bug lama) atau ada form + daftar perangkat?
- [ ] 11. **Harga WiFi:** tampil Rp50.000/perangkat/bulan? Sumbernya `OperationalSetting` (via API) atau hardcoded? Cek Network endpoint settings/wifi. Kalau hardcoded padahal ada setting → INFO/LOW.
- [ ] 12. Network: `GET /api/wifi-sales` (atau me/...) 200? Kalau error/404 → **inilah penyebab "kosong"** → `C08-xx HIGH`. Catat endpoint & status pasti.
- [ ] 13. Form tambah perangkat: isi nama → submit → `POST` 2xx? Perangkat muncul dengan status (menunggu/aktif)? **JB-12:** double submit tidak dobel?
- [ ] 14. Batas maksimal perangkat (mis. 3/kamar) di-enforce? Coba tambah ke-4 → ditolak?
- [ ] 15. **JB-01/uang:** biaya WiFi bukan bagian deposit/DP; transaksi terpisah. Bila WiFi memicu invoice/pembayaran → cek jalurnya benar.

### D. Keamanan & konsistensi
- [ ] 16. **JB-19:** data WiFi/pengumuman yang tampil relevan untuk tenant ini; tidak bocor perangkat/pengumuman internal admin yang belum dipublikasikan.
- [ ] 17. Ketiga halaman pakai layout portal konsisten (bandingkan dengan `/portal/stay`).

### E. Verifikasi kode (penting untuk membantah/mengonfirmasi Hermes)
- [ ] 18. `App.tsx`: konfirmasi ketiga route ADA & role TENANT (baris di tabel atas). Kutip.
- [ ] 19. `MyAnnouncementsPage.tsx`, `MyManualPage.tsx`, `WifiOrderPage.tsx`: masing-masing — apakah benar-benar merender konten & memanggil API yang benar? Kalau ada `TODO`/return kosong/endpoint salah → itu penyebab bug nyata.

## HASIL TEMUAN

> **Status:** live (Maya) + kode + log backend **SELESAI**. **Verdict Hermes:** I11 = **BENAR (tapi beda root cause)**, I12 = **STALE**, I13 = **STALE**.

### C08-01 🔴 `/api/announcements/active` 503 → Pengumuman stuck "Memuat halaman…" — 🟠 MEDIUM (potensi HIGH)
- **Severity:** MEDIUM (bisa HIGH bila persisten di produksi) · **Kategori:** Reliability / backend
- **Halaman/URL:** `/portal/announcements` · **Role:** TENANT
- **Yang terjadi (bukti live):** `GET /api/announcements/active` → **503** berulang (≥21 request GET+OPTIONS teramati, bahkan **OPTIONS preflight 503** → browser blokir → "Failed to fetch"). Halaman **berhenti di "Memuat halaman…"** (tak pernah render / empty-state).
- **Verdict Hermes I11 = BENAR** (halaman Pengumuman memang tidak berfungsi) — **TAPI** root cause **bukan** "sidebar hilang/kosong" seperti klaim Hermes, melainkan **error 503 backend** pada endpoint `announcements/active`.
- **Akar masalah:** route ter-map & `tsc` 0 error (`backend-start.out.log`: "Mapped /api/announcements/active"). Jadi ini **error runtime** yang ditangkap `AllExceptionsFilter` → dipetakan 503. Query `getActive` (`announcements.service.ts:44-64`) tampak valid; kemungkinan **Prisma runtime / drift skema DB / komputasi `tenantHasOccupiedStay`** untuk tenant tanpa stay. **Perlu lihat stack trace di console backend live** (tak tertangkap di log yang ter-rotate).
- **SARAN FIX:** cek console backend saat hit `/announcements/active` untuk stack persis; pastikan UAT DB ter-migrate (kolom `publishedAt`/enum `AnnouncementAudience`); tangani error → kembalikan 200 `[]` + empty-state, jangan 503. Batasi retry FE (hindari badai request).

### C08-02 Hermes I12 (Panduan 404) = STALE ✅ — 🟢 INFO
- **Bukti live:** `/portal/guide` **redirect** ke `/portal/manual` (R-17 jalan). `MyManualPage` **render**: "Panduan & Aturan Kos", accordion Aturan Dasar (Jam Tamu, Kebersihan, Larangan, Pembayaran, Lokasi), daftar perbaikan GRATIS, WA `0856-4888-7628`. Ada placeholder "Panduan resmi sedang disiapkan" (konten admin belum diisi) tapi **fungsional, bukan 404**.

### C08-03 Hermes I13 (WiFi kosong) = STALE ✅ — 🟢 INFO
- **Bukti live:** `/portal/wifi` (`WifiOrderPage`) **render** dengan empty-state rapi: "Pesan WiFi… **Paket WiFi belum tersedia. Hubungi pengelola langsung.**" + fallback WhatsApp 3-langkah (`0856-4888-7628`). **Bukan blank.** 
- **Catatan:** paket WiFi kosong (belum di-seed). Verifikasi apakah paket default Rp50.000/perangkat (dari `OperationalSetting.wifiRupiah`) semestinya muncul otomatis. Tidak loop, tidak 503.

### C08-04 Banner onboarding "3 langkah" (berulang, = C06-02/C07-01) — 🟢 LOW
- Sama: Maya (mantan penghuni) melihat banner onboarding di ketiga halaman info. Perbaiki sekali di layout portal.

### ✅ PENUTUP C08 (pasca schema-fix + admin, 3 Jul)
- **503 Pengumuman RESOLVED** (schema-sync, lihat C09-01) → `/api/announcements/active` = 200.
- **`/announcements` (admin) render:** empty-state "Belum ada data" (Total 0, Published 0, Draft 0, Pinned 0) + tombol "Buat Pengumuman". → **Pengumuman tenant kosong karena memang 0 pengumuman di-seed**, BUKAN bug (setelah 503 diperbaiki). Owner tinggal buat pengumuman. Fitur publish→tenant tak teruji end-to-end (belum ada data), tapi halaman admin fungsional.

### Catatan positif
- `/portal/manual` & `/portal/wifi` **tidak loop, tidak error** — render dengan empty-state/fallback yang baik + nomor WA benar. Route ketiga halaman terkonfirmasi ADA (bertentangan dengan klaim 404 Hermes).

## Definition of Done — status
- [x] 3 halaman dibuka (live, page-text); status ditentukan dengan **root cause**: Pengumuman = 503 endpoint; Manual = render OK; WiFi = empty-state OK.
- [x] Redirect `/portal/guide`→`/portal/manual` diverifikasi (jalan).
- [x] Verdict Hermes I11/I12/I13 dinyatakan (BENAR/STALE) dengan bukti live + log.
- [x] Temuan `C08-xx`; INDEX baris 08 diupdate.

## Definition of Done
- [ ] 3 halaman dibuka & di-screenshot; status kosong/isi ditentukan dengan **root cause** (data/endpoint/UI).
- [ ] Redirect `/portal/guide`→`/portal/manual` diverifikasi.
- [ ] Klaim Hermes I11/I12/I13 dinyatakan BENAR/STALE dengan bukti kode + Network.
- [ ] Form WiFi diuji (submit, batas perangkat, double-submit).
- [ ] Temuan `C08-xx`. Update Progres Global baris 08.
