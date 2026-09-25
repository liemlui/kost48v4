# Audit Z-19 — Dashboard Owner

Tanggal: 25 September 2026
Jenis: audit statis read-only
Status: **Z19-T1..T4 diperbaiki lokal; gate visual/runtime belum ditutup**

## Lingkup

- UI dan state dashboard: `OwnerDashboardPage.tsx`, `ownerDashboardState.ts`, CSS Owner, serta unit state terkait.
- Kontrak frontend: `GET /owner/dashboard/aggregate`.
- Producer backend: controller/service Owner dan agregasi `FinanceService.ownerDashboard()`.
- Guard route dan role OWNER.
- Rancangan produk: dashboard sebagai daftar kerja yang menjawab kondisi bisnis dan tindakan berikutnya.

Tidak ada source, DB, server, atau data produksi yang diubah. Browser in-app tidak dapat tersambung karena integrasi sesi menolak metadata sandbox; server tidak dimulai. Karena itu viewport, keyboard, touch, Axe, screenshot bebas PII, dan perilaku dengan data runtime tetap **UNKNOWN**.

## Ringkasan hasil

Kontrak dasar sudah baik: route frontend dan endpoint backend sama-sama OWNER-only; tiga sumber inti (dashboard, readiness, meter jatuh tempo) diambil melalui satu agregat; default tampilan ringkas; loading/error/no-activity/stale dibedakan; dan sinyal utama memiliki CTA terfilter. Namun dashboard belum layak dinyatakan PASS karena empat temuan berikut dapat membuat keputusan owner salah atau membingungkan.

## Temuan

### Z19-T1 — TINGGI — status “Aman” dapat tampil ketika sumber sinyal tambahan gagal — DIPERBAIKI LOKAL 25 SEP

`iotQuery` dan `roomsQuery` berada di luar endpoint agregat. `extraSignals` hanya menambahkan sinyal saat masing-masing query tidak error; kegagalan keduanya tidak ditampilkan. Badge prioritas kemudian memakai hanya jumlah `data.signals + extraSignals`, sehingga bila sinyal inti kosong tetapi query kamar/IoT gagal, layar dapat menyatakan **Aman** walaupun dua sumber belum diketahui.

Dampak: owner dapat menganggap tidak ada kamar kosong atau perangkat stale saat sumber datanya justru gagal dimuat.

Acceptance perbaikan: kegagalan parsial harus menghasilkan state “data belum lengkap/perlu cek”, tidak boleh dihitung sebagai “Aman”; refresh dan error harus menyebut sumber yang gagal.

Implementasi Z19-FIX-A: kegagalan `roomsQuery`/`iotQuery` sekarang menghasilkan badge dan empty-state **Data belum lengkap**, alert menyebut sumber yang gagal, dan copy melarang kesimpulan aman sebelum refresh. Helper murni `ownerPrioritySourceFailures()` memiliki regresi untuk tidak ada kegagalan, masing-masing sumber, dan kedua sumber.

### Z19-T2 — TINGGI — “Laba Bersih” tidak memakai basis yang sama antara KPI dan grafik — DIPERBAIKI LOKAL 25 SEP

KPI `netProfit` dihitung secara akrual sebagai invoice + WiFi − expense. Data tren menghitung `netProfit` dari payment + WiFi − expense (basis kas). UI memberi keduanya label **Laba Bersih** tanpa menjelaskan perbedaan basis.

Dampak: kartu dan grafik untuk bulan yang sama dapat berbeda walaupun labelnya identik; ini berisiko menyesatkan keputusan keuangan.

Acceptance perbaikan: gunakan definisi yang sama, atau ganti label/copy sehingga basis akrual dan kas dinyatakan eksplisit. Karena menyentuh interpretasi uang, implementasi wajib mengikuti gate uang di `STATUS.md` §7.

### Z19-T3 — SEDANG — scope periode KPI berbeda dari scope sinyal tindakan — DIPERBAIKI LOKAL 25 SEP

KPI invoice/payment/expense/WiFi memakai bulan yang dipilih. Sebaliknya overdue memakai tanggal hari ini, sedangkan pending payment dan outstanding merupakan snapshot global. Pada mode Lengkap, owner dapat memilih bulan historis tetapi strip kondisi tetap menggabungkan angka periode historis dengan antrean tindakan saat ini tanpa label scope.

Dampak: headline “kondisi bulan ini” dan daftar prioritas dapat dibaca sebagai satu periode yang sama padahal bukan.

Acceptance perbaikan: label sinyal sebagai “kondisi saat ini” dan pisahkan dari ringkasan periode, atau filter semua sinyal sesuai periode dengan keputusan produk yang eksplisit.

Implementasi Z19-FIX-B: headline “Kondisi periode terpilih” tidak lagi memuat kalimat jumlah antrean global; panel terpisah bernama “Prioritas operasional”. Setiap sinyal diberi scope eksplisit: overdue, outstanding, pending payment, kamar, readiness, dan IoT = **Saat ini**; meter = **Periode terpilih**. Copy panel menjelaskan bahwa KPI mengikuti periode yang dipilih.

### Z19-T4 — RENDAH — indikator stale menghilang selama background refresh — DIPERBAIKI LOKAL 25 SEP

`dashboardStale` mensyaratkan `!isRefreshing`. Saat data lama sedang di-refetch, nilai lama tetap dirender tetapi penanda “Data tertunda” sementara hilang. Tombol refresh juga tidak memasukkan status fetch kamar/IoT ke `isRefreshing`.

Acceptance perbaikan: usia data lama tetap terlihat sampai data baru sukses; status refresh mencakup seluruh sumber yang dipicu tombol.

Implementasi Z19-FIX-A: kalkulasi stale tidak lagi dinetralkan oleh `isRefreshing`; status refresh kini mencakup aggregate, AI status, kamar, dan IoT.

## Hal yang sudah terpenuhi secara statis

- Guard frontend `/owner-dashboard` dan endpoint backend membatasi OWNER.
- Loading skeleton, error + retry, no-activity, serta nilai nol valid tersedia.
- Default mode ringkas menyembunyikan AI dan grafik; prioritas tampil sebagai CTA.
- CTA overdue, outstanding, pending payment, kamar kosong, meter, readiness, dan IoT memiliki tujuan.
- Unit test helper mencakup stale boundary, nol valid, dan beberapa pembeda periode tanpa aktivitas.

## Gate yang masih terbuka

- Verifikasi runtime kegagalan parsial API untuk implementasi Z19-T1.
- Rekonsiliasi angka KPI vs tren memakai data runtime/UAT bulan yang sama.
- Verifikasi OWNER pada 1024/1280/1440 px, touch, dan keyboard.
- Axe serious/critical = 0 dan screenshot bebas PII.
- Uji CTA menuju daftar terfilter dan state loading/error/empty/stale pada runtime.

Verifikasi lokal terbaru setelah Z19-FIX-B: `npm.cmd run test -- src/test/unit/ownerDashboardState.test.ts` **18/18 lulus**; `npm.cmd run build` exit 0, build `G4tda1dB7c3a`, PWA verification passed. Browser/server/DB tidak dijalankan, sehingga verifikasi visual/runtime tetap UNKNOWN.

Z-19 tetap `[ ]` hanya karena verifikasi visual/runtime belum dilakukan. Seluruh temuan statis Z19-T1..T4 sudah diperbaiki lokal.

## Status implementasi Z19-T2 — 25 September 2026 (scope uang terpisah)

Keputusan owner `Z19-T2-BASIS` (25 Sep 2026, [KEPUTUSAN-OWNER](../KEPUTUSAN-OWNER.md)): **"Laba Bersih" disatukan pada basis akrual**. Implementasi dijalankan sebagai scope uang terpisah sesuai syarat di atas.

- **Perubahan:** seri `trendMonths` pada `FinanceService.ownerDashboard()` berhenti memakai **kas** (`InvoicePayment.paymentDate`) dan kini memakai **akrual tagihan** (`Invoice.periodStart`, status bukan `DRAFT`/`CANCELLED`) + WiFi − beban — rumus yang sama dengan KPI `netProfitRupiah`. Kontrak respons tidak berubah: `trendMonths`/`trend6Months` tetap `{ year, month, revenue, expense, netProfit }`.
- **Bukti (gate uang):** cwd `backend`, `npm run test:unit` **exit 0** — build penuh via `pretest:unit`, **147/147 test lulus**; 3 test baru di `backend/test/unit/owner-dashboard-trend-basis.test.js` mengunci (a) `trendMonths[x].netProfit === kpi.netProfitRupiah` untuk bulan yang sama, (b) SQL trend memakai `periodStart` dan **tidak** lagi `InvoicePayment`, (c) bulan tanpa data tetap nol dan titik bulan berjalan tidak bergeser.
- **Kontrak frontend:** target Vitest `ownerDashboardState.test.ts` **18/18 lulus**; build frontend exit 0, build `G4tda1dB7c3a`, PWA verification passed.
- **Residual (bukan bug baru):** kartu "Pendapatan" **tetap kas** (keputusan M15) sehingga boleh berbeda dari seri `revenue` trend yang kini akrual; **penjelasan basis di UI (label/caption) tetap milik sesi Z-19** karena menyentuh copy dashboard.
- **Belum diukur:** runtime/browser/DB tidak dijalankan; bukti ini level kode + unit test.
