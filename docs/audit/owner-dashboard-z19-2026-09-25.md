# Audit Z-19 — Dashboard Owner

Tanggal: 25 September 2026
Jenis: audit statis read-only
Status: **SELESAI SECARA STATIS DENGAN TEMUAN; gate Z-19 belum ditutup**

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

### Z19-T1 — TINGGI — status “Aman” dapat tampil ketika sumber sinyal tambahan gagal

`iotQuery` dan `roomsQuery` berada di luar endpoint agregat. `extraSignals` hanya menambahkan sinyal saat masing-masing query tidak error; kegagalan keduanya tidak ditampilkan. Badge prioritas kemudian memakai hanya jumlah `data.signals + extraSignals`, sehingga bila sinyal inti kosong tetapi query kamar/IoT gagal, layar dapat menyatakan **Aman** walaupun dua sumber belum diketahui.

Dampak: owner dapat menganggap tidak ada kamar kosong atau perangkat stale saat sumber datanya justru gagal dimuat.

Acceptance perbaikan: kegagalan parsial harus menghasilkan state “data belum lengkap/perlu cek”, tidak boleh dihitung sebagai “Aman”; refresh dan error harus menyebut sumber yang gagal.

### Z19-T2 — TINGGI — “Laba Bersih” tidak memakai basis yang sama antara KPI dan grafik

KPI `netProfit` dihitung secara akrual sebagai invoice + WiFi − expense. Data tren menghitung `netProfit` dari payment + WiFi − expense (basis kas). UI memberi keduanya label **Laba Bersih** tanpa menjelaskan perbedaan basis.

Dampak: kartu dan grafik untuk bulan yang sama dapat berbeda walaupun labelnya identik; ini berisiko menyesatkan keputusan keuangan.

Acceptance perbaikan: gunakan definisi yang sama, atau ganti label/copy sehingga basis akrual dan kas dinyatakan eksplisit. Karena menyentuh interpretasi uang, implementasi wajib mengikuti gate uang di `STATUS.md` §7.

### Z19-T3 — SEDANG — scope periode KPI berbeda dari scope sinyal tindakan

KPI invoice/payment/expense/WiFi memakai bulan yang dipilih. Sebaliknya overdue memakai tanggal hari ini, sedangkan pending payment dan outstanding merupakan snapshot global. Pada mode Lengkap, owner dapat memilih bulan historis tetapi strip kondisi tetap menggabungkan angka periode historis dengan antrean tindakan saat ini tanpa label scope.

Dampak: headline “kondisi bulan ini” dan daftar prioritas dapat dibaca sebagai satu periode yang sama padahal bukan.

Acceptance perbaikan: label sinyal sebagai “kondisi saat ini” dan pisahkan dari ringkasan periode, atau filter semua sinyal sesuai periode dengan keputusan produk yang eksplisit.

### Z19-T4 — RENDAH — indikator stale menghilang selama background refresh

`dashboardStale` mensyaratkan `!isRefreshing`. Saat data lama sedang di-refetch, nilai lama tetap dirender tetapi penanda “Data tertunda” sementara hilang. Tombol refresh juga tidak memasukkan status fetch kamar/IoT ke `isRefreshing`.

Acceptance perbaikan: usia data lama tetap terlihat sampai data baru sukses; status refresh mencakup seluruh sumber yang dipicu tombol.

## Hal yang sudah terpenuhi secara statis

- Guard frontend `/owner-dashboard` dan endpoint backend membatasi OWNER.
- Loading skeleton, error + retry, no-activity, serta nilai nol valid tersedia.
- Default mode ringkas menyembunyikan AI dan grafik; prioritas tampil sebagai CTA.
- CTA overdue, outstanding, pending payment, kamar kosong, meter, readiness, dan IoT memiliki tujuan.
- Unit test helper mencakup stale boundary, nol valid, dan beberapa pembeda periode tanpa aktivitas.

## Gate yang masih terbuka

- Reproduksi Z19-T1 dengan kegagalan parsial API.
- Rekonsiliasi angka KPI vs tren memakai fixture bulan yang sama.
- Verifikasi OWNER pada 1024/1280/1440 px, touch, dan keyboard.
- Axe serious/critical = 0 dan screenshot bebas PII.
- Uji CTA menuju daftar terfilter dan state loading/error/empty/stale pada runtime.

Z-19 tetap `[ ]`. Temuan implementasi dapat digabung dengan sisa AO-20, tetapi perubahan uang Z19-T2 harus menjadi scope terpisah dengan gate uang.
