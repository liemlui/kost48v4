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
_(kosong — diisi auditor)_
> Untuk tiap halaman, WAJIB tulis kesimpulan: **"Klaim Hermes I1x = BENAR / STALE / SEBAGIAN"** + bukti.

## Definition of Done
- [ ] 3 halaman dibuka & di-screenshot; status kosong/isi ditentukan dengan **root cause** (data/endpoint/UI).
- [ ] Redirect `/portal/guide`→`/portal/manual` diverifikasi.
- [ ] Klaim Hermes I11/I12/I13 dinyatakan BENAR/STALE dengan bukti kode + Network.
- [ ] Form WiFi diuji (submit, batas perangkat, double-submit).
- [ ] Temuan `C08-xx`. Update Progres Global baris 08.
