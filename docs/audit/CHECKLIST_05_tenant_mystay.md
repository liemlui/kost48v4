# CHECKLIST 05 — Tenant: Dashboard Penghuni (MyStay)

> **Baca `00_INDEX.md` dulu.** Prefiks temuan: **`C05-xx`**. **Role:** TENANT. **Audit-only.**
> Re-verifikasi temuan Hermes **I6, I7, I8** di sini.

## Ruang lingkup
| Halaman | URL | File FE |
|---|---|---|
| Dashboard penghuni | `/portal/stay` | `pages/portal/MyStayPage.tsx` + `pages/portal/myStayShared.tsx` |
| Catat meter (dari dashboard) | (modal/aksi) | lihat `meter-readings` |

**Backend:** `stays` (`GET /api/stays/...`), `meter-readings`, `me/notifications`, `me/loyalty`, `deposit-ledger`. Model: `Stay`, `MeterReading`, `TenantDepositLedgerEntry`, `AppNotification`.

## Langkah audit

### A. Muat dashboard
- [ ] 1. Login TENANT → `/portal/stay`. Screenshot. Konten muncul penuh (bukan spinner selamanya)?
- [ ] 2. Layout: header + **sidebar/menu portal** + footer konsisten? (Hermes klaim sidebar hilang di halaman lain — pastikan di sini ADA sebagai baseline pembanding.)
- [ ] 3. Console: catat semua error/warning.
- [ ] 4. Network: request 200 semua? Adakah request diulang berlebihan (loop)?

### B. Isi konten & JB
- [ ] 5. Info kamar: lantai, ukuran, KM, AC, akhir sewa, cuci AC terakhir — semua terisi (bukan "-"/"undefined")?
- [ ] 6. **JB-17 (progress bar masa sewa):** Hermes lihat "100% terlewati". Untuk stay **aktif**, progress 100% berarti sewa habis — apakah benar (dekat akhir) atau bug hitung? Cek tanggal mulai & akhir stay, hitung manual: `progress = (hari berlalu / total hari) × 100`. Kalau stay masih lama tapi tampil 100% → **C05-xx HIGH**.
- [ ] 7. **JB-01 (dana titipan):** "Dana titipan" progress bar — pastikan ini **deposit jaminan** (refundable, tetap) bukan DP. Nilai = `Room.defaultDepositRupiah`? Cocokkan dengan `TenantDepositLedgerEntry`.
- [ ] 8. Kartu Tagihan & Laporan: status ("Perlu dibayar"/"Aktif") sesuai data nyata? Klik → menuju halaman yang benar?
- [ ] 9. **I6 (re-check chart):** buka Console, cari warning "width/height = -1" pada chart konsumsi listrik. Terjadi? Buka `MyStayPage.tsx`, cek apakah chart di-render conditional saat ada data. Status: fixed / masih → `C05-xx MEDIUM`.
- [ ] 10. **JB-18:** cari "Rp NaN", "NaN%", "Invalid Date" di kartu/chart/timeline.
- [ ] 11. Riwayat sewa (timeline): kronologis benar (masuk → invoice → perpanjangan)? Urutan tanggal tidak acak?
- [ ] 12. Notifikasi badge "99+": klik → daftar notifikasi muncul? (JB-15: notifikasi in-app.)

### C. Interaksi & jebakan tombol
- [ ] 13. **I7 (re-check tooltip):** tombol "Perpanjang" & "Ajukan Keluar" disabled? Ada tooltip/penjelasan kenapa disabled? Kapan seharusnya aktif (dekat akhir sewa / tanpa tagihan)? Cek logika enable di kode. Status → `C05-xx LOW`.
- [ ] 14. Tombol "Catat Meter": klik → modal/form muncul. Isi angka meter **lebih kecil** dari pembacaan sebelumnya → harus ditolak (meter tidak mungkin mundur). Uji ini — validasi meter mundur sering lupa dibuat = **potensi bug data listrik**.
- [ ] 15. Catat meter angka valid → simpan → Network `POST /api/meter-readings` 2xx? Data muncul di riwayat? **JB-12:** simpan 2× cepat → tidak dobel?
- [ ] 16. **I8 (re-check PWA):** prompt "Pasang/Nanti" muncul? Klik "Nanti" → apakah muncul lagi saat pindah halaman (bug lama) atau tersimpan? (detail di CHECKLIST_19; catat di sini bila mengganggu.)

### D. Keamanan data tenant (JB-19 — penting)
- [ ] 17. Network: data yang dimuat HANYA milik tenant yang login (kamar A untuk Maya). Tidak ada data tenant/kamar lain di payload.
- [ ] 18. **Coba akses stay tenant lain:** lihat id stay milik Maya di Network, lalu coba `GET /api/stays/<id_lain>` dengan token Maya → harus 403/kosong. Kalau data tenant lain keluar → **BLOCKER**.
  ```bash
  curl -s -H "Authorization: Bearer <TENANT_TOKEN>" http://localhost:3000/api/stays/<id_bukan_miliknya> | head -c 400
  ```

### E. Verifikasi kode
- [ ] 19. `MyStayPage.tsx` / `myStayShared.tsx`: cek perhitungan progress masa sewa & dana titipan (langkah 6–7). Cocok rumus.
- [ ] 20. Cek meter reading guard di `meter-readings.service.ts`: validasi angka naik (tidak mundur), milik stay tenant sendiri.

## HASIL TEMUAN

> **Status:** kode + live (login Maya Pratiwi) **SELESAI sebagian**. ⚠️ Menemukan **bug HIGH: infinite refetch loop**. Tampilan dashboard versi "occupied" **tak bisa dirender** (akun Maya tak punya stay aktif → kena loop), jadi visual chart/tooltip diverifikasi via **kode**.

### C05-01 ⛔ Infinite refetch loop `/stays/me/current` + halaman stuck skeleton — 🔴 HIGH ⭐
- **Severity:** HIGH (nyaris BLOCKER) · **Kategori:** Performa / Reliability (self-DoS)
- **Halaman/URL:** `/portal/stay` · **Role:** TENANT **tanpa stay aktif okupansi** (mis. mantan penghuni yang kontraknya habis — seperti Maya, Kamar A kini MAINTENANCE; atau tenant tahap booking).
- **Langkah reproduksi:**
  1. Login TENANT yang **tidak** punya stay `OCCUPIED` aktif (Maya `maya.tenant@kost48.test`).
  2. Buka `/portal/stay` langsung (URL/bookmark/back-button/link notifikasi).
- **Yang terjadi (bukti keras live):** `GET /api/stays/me/current` mengembalikan **404** (tenant tak punya current stay) lalu **dipanggil berulang tanpa henti**. Hitung Network: **≈600 request per 4 detik (~150 req/detik)** ke endpoint yang sama. Halaman **stuck di skeleton loader** (tak pernah menampilkan empty-state), dan **tab akhirnya crash** ("Tab no longer exists"). Console **tak ada error** (bukan render-crash React; ini refetch storm diam).
- **Yang diharapkan:** tampil empty-state "Kamu belum memiliki masa sewa aktif" (yang KODE-nya sudah ada di `MyStayPage.tsx:868-877`) — 1 request, lalu berhenti.
- **Akar masalah (analisis kode):**
  - `useTenantPortalStage.ts:35-44` & `MyStayPage.tsx:815-824`: query `/stays/me/current` dgn `retry:false` + **`refetchOnMount:true`** + `refetchOnWindowFocus/Reconnect:true`. Query **error 404** (bukan sukses) → `staleTime` tak melindungi (tak ada data sukses yang "fresh") → tiap remount komponen memicu refetch lagi.
  - Skeleton berasal dari `App.tsx` `RequireRoles` (`if (isStageLoading && role==='TENANT') return <PageLoadingSkeleton/>`, ~baris 166). `isStageLoading` bergantung pada query yang terus refetch → skeleton + remount → refetch → **loop**.
  - MyStayPage sendiri sudah benar (empty-state saat `stage!=='occupied'`), tapi tak pernah tercapai karena loop upstream.
- **SARAN FIX:** perlakukan **404 sebagai hasil valid "tidak ada stay"** (queryFn tangkap 404 → `return null` sukses, bukan throw) sehingga `staleTime` berlaku & loop berhenti; ATAU matikan `refetchOnMount` pada query ini; ATAU jadikan `isStageLoading` false begitu `stayNotFound` true. **Prioritaskan** — ini menghantam backend & bisa meng-crash tab.
- **Catatan pemicu:** login normal tenant `browsing` biasanya diarahkan ke `/rooms` (bukan `/portal/stay`), jadi tidak semua tenant kena setiap saat — tapi mantan penghuni / akses langsung ke `/portal/stay` **pasti** kena. Mantan penghuni tetap punya role TENANT + akses portal.

### ✅ Verifikasi kode (bagian yang BENAR)
- **JB-17 (progress masa sewa) BENAR:** `getLeaseProgress` (`utils/dateTime.ts:159-170`) meng-clamp `percentElapsed` 0–100, `totalDays=max(1,…)`. "100% terlewati" (yang Hermes lihat) **benar** bila kontrak memang sudah habis (bukan bug). Overdue → "Lewat X hari" (`LeaseProgressHero.tsx:15-40`).
- **JB-01 (dana titipan = deposit) BENAR:** progress dana titipan `pct = target>0 ? min(100,round(paid/target*100)) : 0` (`MyStayPage.tsx:673`) — ter-guard, tak NaN. Label "dana titipan"/"Titipan" = deposit jaminan (refundable), terpisah dari DP.
- **I6 (chart width/height -1) kemungkinan FIXED:** chart listrik dirender kondisional `trendPoints.length >= 2` dengan `height=max(140, …)` (`UtilityInsightCard.tsx:108-115`) + empty-state (`:74`). (Belum bisa dikonfirmasi live krn dashboard occupied tak ter-render.)
- **I7 (tooltip tombol disabled) sebagian FIXED:** tombol "Catat Meter" disabled punya `title` penjelas (`MyStayPage.tsx:515-517`: "Dibuka H-10 sebelum akhir sewa…"). Tombol Perpanjang/Ajukan Keluar belum diverifikasi live.
- **JB-19 (isolasi data) secara struktur aman:** tenant memakai endpoint self-scoped `/stays/me/current` (tak ada param id yang bisa dimanipulasi); `/stays` (list admin) → **403** utk TENANT (terverifikasi C04). Ada guard DEV-warning bila `stay.tenantId !== currentUserTenantId` (`MyStayPage.tsx:837-838`).

### Belum terverifikasi live (butuh tenant dgn stay OCCUPIED aktif)
- Tampilan dashboard "occupied": chart listrik nyata (I6), tooltip Perpanjang/Ajukan Keluar (I7), PWA prompt (I8), badge notifikasi, timeline riwayat, catat meter (termasuk uji meter mundur).
- **Kredensial tenant occupied tidak tersedia** (Maya tak punya stay aktif; password tenant lain di seed tidak diketahui). **Rekomendasi:** sediakan 1 akun tenant occupied test, atau jalankan ulang bagian ini setelah C05-01 diperbaiki (agar Maya bisa render bila datanya diubah).

## Definition of Done
- [ ] Dashboard dimuat, screenshot, console+network diperiksa.
- [ ] Progress masa sewa & dana titipan dihitung manual (JB-17/JB-01).
- [ ] Hermes I6, I7, I8 di-verifikasi ulang & dicatat statusnya.
- [ ] Catat meter diuji termasuk kasus meter mundur (jebakan).
- [ ] JB-19 diuji: akses stay tenant lain via curl ditolak.
- [ ] Temuan `C05-xx`. Update Progres Global baris 05.
