# KOST48 V5 - Audit Total PWA dan Plan Perkuatan

**Tanggal audit:** 2026-06-12  
**Cakupan:** source frontend/backend, build production, manifest, service worker,
cache dan data privat, install/update/offline UX, push notification, keamanan
hosting, runbook deploy, dan smoke produksi.

## 1. Kesimpulan Eksekutif

Status source saat ini adalah **PWA MVP installable**, belum PWA operasional yang
kuat. Fondasi dasarnya sehat: manifest ada, ikon lengkap, service worker hanya
didaftarkan pada build production, API/auth sengaja tidak disimpan ke Cache
Storage, dan tidak ada antrean transaksi offline tersembunyi.

Status produksi pada saat audit adalah **RED / release blocker**:

1. `app.kost48surabaya.com` masih menyajikan build 1 Mei 2026, service worker
   `kost48-pwa-v1`, dan manifest lama. Source lokal sudah `v2` dan build
   12 Juni 2026.
2. `http://app.kost48surabaya.com/rooms` membalas `200`, bukan redirect ke HTTPS.
3. Respons HTML host app tidak membawa CSP/HSTS/security headers frontend.
   CSP pada backend API tidak melindungi dokumen React di origin frontend.
4. `sw.js` produksi memiliki `Cache-Control: public, max-age=604800`, sehingga
   pembaruan worker berisiko tertahan.
5. Manifest produksi dikirim sebagai `application/octet-stream`, bukan
   `application/manifest+json`.
6. Smoke `GET https://api.kost48surabaya.com/api/public/rooms?limit=1` membalas
   `503 Service Unavailable` pada 12 Juni 2026 sekitar 21:07 WIB.
7. Domain utama `kost48surabaya.com` masih website lama; `/rooms` di sana
   membalas 404 website lama. Host aplikasi baru adalah subdomain `app`.

**Keputusan audit:** jangan mengaktifkan promosi install PWA atau push sebelum
Phase 0 dan Phase 1 di bawah lulus. Push tidak boleh dipasang langsung sebagai
side effect transaksi; gunakan `AppNotification` sebagai event kanonis dan
delivery outbox terpisah.

## 2. Bukti yang Diverifikasi

### Source dan build

- `frontend/public/manifest.webmanifest` valid JSON.
- Semua ikon PNG yang dideklarasikan memiliki dimensi file yang benar:
  72, 96, 128, 144, 180, 192, 256, 384, dan 512 px.
- `frontend/public/sw.js` valid JavaScript (`node --check`).
- `npm run build` frontend PASS pada 2026-06-12:
  - JS utama: 1,968.61 kB minified / 551.97 kB gzip.
  - CSS utama: 661.60 kB / 103.78 kB gzip.
  - Vite memperingatkan chunk utama di atas 500 kB.
- Artefak `dist/` memuat manifest, worker, ikon, dan aset hasil build.

### Produksi

| Probe | Hasil audit |
|---|---|
| `https://app.kost48surabaya.com/rooms` | 200, HTML build 1 Mei 2026 |
| `http://app.kost48surabaya.com/rooms` | 200, tidak redirect HTTPS |
| `https://app.kost48surabaya.com/sw.js` | 200, worker `v1`, cache 7 hari |
| `https://app.kost48surabaya.com/manifest.webmanifest` | 200, MIME octet-stream, manifest lama |
| `https://app.kost48surabaya.com/icons/icon-192.png` | 200 |
| `https://api.kost48surabaya.com/api/public/rooms?limit=1` | 503 saat probe |
| `https://kost48surabaya.com/rooms` | 404 dari website lama |

Koneksi browser terintegrasi gagal dijalankan pada sandbox Windows, sehingga
prompt install, mode standalone, dan simulasi offline DevTools belum diuji
secara interaktif. Item tersebut menjadi acceptance test perangkat nyata.

## 3. Yang Sudah Sehat

1. Registrasi service worker hanya berjalan saat `import.meta.env.PROD`.
2. `/api/*` dan request ber-header `Authorization` tidak masuk Cache Storage.
3. Tidak ada cache JSON API, IndexedDB data bisnis, background sync, atau
   retry transaksi offline yang dapat menyebabkan double-posting.
4. Navigasi memakai network-first, bukan cache-first.
5. React Query dibersihkan saat login/logout sehingga data antar-user tidak
   sengaja tinggal di memory cache aplikasi.
6. `AppNotification` sudah menjadi pusat notifikasi in-app dan memiliki
   recipient, title, body, link, entity, serta status read.
7. Endpoint bukti pembayaran sudah role-scoped dan tidak menjadi static file.

Fondasi di atas harus dipertahankan selama hardening. Khusus operasi pembayaran,
approval, invoice, jurnal, checkout, renew, dan inventory mutation tetap
**network-only**.

## 4. Temuan Audit

### PWA-01 - CRITICAL - Produksi tertinggal dari source

Host app masih membawa worker `v1`, manifest tiga ikon, dan bundle 1 Mei 2026.
Repo sudah memiliki worker `v2`, ikon tambahan, favicon, dan build terbaru.
Akibatnya hasil UAT source tidak sama dengan kode yang diterima pengguna.

**Aksi:** deploy ulang current `dist/`, catat commit SHA, dan jadikan pemeriksaan
versi HTML/worker/manifest sebagai release gate.

### PWA-02 - CRITICAL - HTTP tidak dipaksa ke HTTPS

Host app melayani aplikasi penuh melalui HTTP. Service worker dan Web Push
memerlukan secure context; lebih serius lagi, HTML/JS HTTP dapat dimodifikasi
di jaringan dan mencuri kredensial atau JWT `localStorage`.

**Aksi:** redirect permanen HTTP ke HTTPS pada edge/web server, aktifkan HSTS
di host app, lalu uji dari profil browser baru.

### PWA-03 - CRITICAL - Frontend tidak memiliki security headers

Security headers di `backend/src/main.ts` hanya melekat pada respons API.
Dokumen React berasal dari `app.kost48surabaya.com` dan saat audit tidak
memiliki CSP/HSTS/X-Content-Type-Options/Referrer-Policy/Permissions-Policy.
Karena JWT disimpan di `localStorage`, CSP frontend adalah mitigasi XSS utama.

**Aksi:** pasang header pada host frontend. CSP minimal harus mengizinkan hanya
origin app, `https://api.kost48surabaya.com` untuk `connect-src` dan gambar API
yang memang diperlukan, serta `worker-src 'self'`.

### PWA-04 - HIGH - Strategi cache terlalu luas

`sw.js` baris 67-87 menangkap seluruh `GET` same-origin non-navigation, walaupun
komentarnya menyebut aset statis. Endpoint baru di luar `/api`, file privat,
download, atau respons dinamis dapat ikut tersimpan tanpa sengaja.

**Aksi:** gunakan allowlist eksplisit berdasarkan path dan destination:
`/assets/*`, `/icons/*`, manifest, font, dan gambar marketing publik. Default
untuk request lain adalah network/browser.

### PWA-05 - HIGH - Aktivasi menghapus cache milik origin lain

`sw.js` baris 39-42 menghapus semua cache yang namanya bukan cache aktif.
Jika origin dipakai fitur/app lain, worker KOST48 dapat menghapus cache yang
bukan miliknya.

**Aksi:** hapus hanya cache dengan prefix `kost48-`.

### PWA-06 - HIGH - Update worker tidak terkoordinasi

Worker memanggil `skipWaiting()` dan `clients.claim()` otomatis tanpa UI
update, `updatefound`, `waiting`, `controllerchange`, atau reload terkontrol.
Pada aplikasi operasional, versi baru dapat mengambil kontrol di tengah sesi
tanpa pengguna tahu.

**Aksi:** worker baru menunggu; UI menampilkan "Versi baru tersedia"; pengguna
memilih refresh; app mengirim pesan `SKIP_WAITING`, lalu reload sekali setelah
`controllerchange`.

### PWA-07 - HIGH - Header cache produksi salah untuk worker

`sw.js` produksi dikirim dengan cache publik tujuh hari. Manifest juga memakai
MIME nonstandar. Ini memperbesar drift dan menyulitkan rollback/update cepat.

**Aksi header:**

| Resource | Kebijakan |
|---|---|
| `/sw.js` | `Cache-Control: no-cache, no-store, must-revalidate` |
| `/index.html` dan SPA fallback | `Cache-Control: no-cache` |
| `/manifest.webmanifest` | `application/manifest+json`, `no-cache` |
| `/assets/<hash>.*` | `public, max-age=31536000, immutable` |
| ikon tanpa hash | cache pendek atau versioned filename |

### PWA-08 - HIGH - Delivery auth dan cache bukti pembayaran belum aman

Endpoint bukti pembayaran mengirim
`Cache-Control: private, max-age=3600`. Cache browser privat tetap dapat
menyimpan gambar sensitif pada perangkat bersama dan berpotensi menampilkannya
setelah pergantian akun. Di sisi frontend, preview dan link memakai `<img src>`
atau `<a href>` langsung ke endpoint yang dilindungi Bearer JWT. Tag browser
tersebut tidak mengirim header `Authorization`, sehingga preview/link berpotensi
401 walaupun request Axios lain berhasil.

**Aksi:** ambil file melalui Axios/fetch authenticated dengan `responseType:
'blob'`, render memakai object URL, dan revoke URL saat tidak dipakai. Backend
diubah menjadi `Cache-Control: private, no-store` dan `Vary: Authorization`.
UAT harus memastikan preview bekerja dan bukti lama tidak terbuka setelah
logout/login akun lain.

### PWA-09 - HIGH - Belum ada kontrak UX offline

Shell dapat terbuka offline, tetapi aplikasi tidak memiliki banner offline,
halaman fallback khusus, penanda data tidak tersedia, atau guard eksplisit pada
aksi berisiko. Pengguna dapat melihat form aktif lalu mendapat error jaringan
generik.

**Aksi:** Phase 1 hanya mendukung shell/read-only offline. Saat offline:

- tampilkan status global yang jelas;
- blokir submit/mutation bisnis sebelum request;
- jangan antrekan transaksi ke background sync;
- sediakan retry saat koneksi kembali;
- halaman privat tidak boleh menampilkan data user lama dari persistent cache.

### PWA-10 - MEDIUM - Precache best-effort dapat sukses dalam keadaan kosong

Semua kegagalan `cache.add` ditelan melalui `Promise.allSettled`. Worker tetap
aktif walaupun shell inti gagal disimpan. Daftar manual juga tidak mencakup
bundle hash hasil Vite saat install.

**Aksi:** gunakan precache manifest yang dihasilkan build, atau bedakan aset
wajib dan opsional. Instalasi worker harus gagal jika shell wajib gagal.

### PWA-11 - MEDIUM - Launch dan manifest belum role-aware

`start_url` selalu `/rooms`, sehingga owner/admin/staff/tenant yang membuka app
terpasang selalu masuk katalog publik. Manifest belum memiliki `id`, shortcut,
screenshots, categories, atau `display_override`. `portrait-primary` juga tidak
cocok untuk dashboard tablet/desktop.

**Aksi:** gunakan launch route stabil seperti `/launch?source=pwa`, redirect
berdasarkan sesi/role, tambahkan `id`, hapus lock orientasi, lalu tambahkan
shortcut yang aman dan publik.

### PWA-12 - MEDIUM - Tidak ada install dan update UX

Tidak ada `beforeinstallprompt`, `appinstalled`, deteksi display mode, petunjuk
iOS, atau telemetry install/update.

**Aksi:** tampilkan CTA install setelah engagement yang wajar, hanya dari aksi
pengguna, dan jangan mengganggu login/transaksi. Sediakan petunjuk khusus ketika
browser tidak mendukung prompt programatik.

### PWA-13 - MEDIUM - Ikon valid tetapi lemah secara visual

Ikon maskable aman dari crop, namun logo inti sangat kecil dengan ruang kosong
besar. Pada launcher dan notification badge, identitas sulit dikenali.

**Aksi:** buat master icon sederhana, kontras tinggi, memenuhi safe zone
maskable, lalu ekspor ulang favicon, any-purpose, maskable, dan badge monokrom.

### PWA-14 - MEDIUM - Cold start terlalu berat

Build menghasilkan satu JS utama sekitar 552 kB gzip dan CSS sekitar 104 kB
gzip. Ini memperlambat install/first load, memperbesar update download, dan
menurunkan ketahanan pada jaringan seluler.

**Aksi:** selesaikan code splitting route/role, lazy-load Recharts dan halaman
admin/finance, serta audit CSS. Selaras dengan UI/UX `U-01`.

### PWA-15 - MEDIUM - Runbook belum menguji kontrak PWA

Runbook hanya meminta deploy `dist/` dan membuka `/rooms`/login. Belum ada gate
HTTPS, SPA fallback, MIME, cache headers, versi worker, offline, update, atau
rollback worker.

**Aksi:** gunakan bagian PWA yang ditambahkan ke `06_DEPLOY_RUNBOOK.md`.

### PWA-16 - MEDIUM - Belum ada test dan observability PWA

Tidak ada test manifest-assets, rule cache, offline navigation, update worker,
multi-account isolation, install, atau push delivery.

**Aksi:** buat smoke otomatis HTTP/header dan Playwright/browser test. Simpan
metrik versi app, versi worker, install, update accepted, subscription aktif,
push sent/failed/expired tanpa merekam payload sensitif.

### PWA-17 - PLANNED - Push notification belum diimplementasikan

Belum ada `PushSubscription`, endpoint subscribe/unsubscribe, VAPID, delivery
outbox, push handler, notification click handler, preference, retry, atau
cleanup subscription 404/410.

Ini sesuai keputusan lama D2, tetapi sekarang harus dikerjakan setelah fondasi
PWA dan keamanan hosting lulus.

## 5. Plan Perkuatan Bertahap

### Phase 0 - Release Gate Produksi

**Estimasi:** 0.5-1.5 hari.  
**Tujuan:** source, host, dan API berada pada versi yang sama dan secure.

- [ ] Tetapkan canonical frontend: `https://app.kost48surabaya.com`.
- [ ] Semua HTTP redirect 301/308 ke HTTPS.
- [ ] Aktifkan HSTS dan security headers frontend.
- [ ] Pastikan backend CORS memuat tepat origin canonical.
- [ ] Deploy `dist/` dari commit yang dicatat.
- [ ] Terapkan MIME dan cache header pada tabel PWA-07.
- [ ] Pastikan SPA fallback mengembalikan `index.html` hanya untuk navigation,
      bukan untuk aset yang hilang.
- [ ] `GET /api/public/rooms?limit=1` kembali 200.
- [ ] Verifikasi HTML, manifest, worker, JS, dan CSS berasal dari rilis yang sama.
- [ ] Jangan publikasikan tombol install sebelum semua item PASS.

### Phase 1 - Cache Safety, Update, dan Offline UX

**Estimasi:** 2-4 hari.  
**Tujuan:** worker aman untuk aplikasi transaksi dan perilaku offline jujur.

- [x] Ganti catch-all cache dengan allowlist aset publik.
- [x] Pisahkan cache `kost48-precache-*`, `kost48-static-*`, dan opsional
      `kost48-public-images-*`.
- [x] Cleanup hanya prefix `kost48-`.
- [x] Gunakan revision/build ID otomatis, bukan bump manual saja.
- [x] Tambah offline fallback yang eksplisit.
- [x] Tambah global online/offline state dan retry UX.
- [x] Blokir semua mutation bisnis ketika offline.
- [x] Tambah update available toast dan reload terkontrol.
- [x] Gunakan authenticated blob loader untuk payment proof; backend
      `private, no-store` + `Vary: Authorization`.
- [ ] Tambah smoke test cache isolation dua akun.

### Phase 2 - Installability dan Performance

**Estimasi:** 2-5 hari.  
**Tujuan:** app mudah dipasang dan cepat dibuka pada perangkat target.

- [x] Tambah manifest `id` dan role-aware launch melalui root route.
- [x] Hapus `orientation: portrait-primary`.
- [x] Tambah install CTA dan update UX dasar.
- [ ] Tambah petunjuk install khusus iOS.
- [ ] Desain ulang ikon launcher/maskable/badge.
- [x] Tambah shortcut manifest yang aman dan publik.
- [ ] Tambah screenshots manifest setelah aset final tersedia.
- [x] Code split per role dan route; lazy-load modul admin/chart/finance.
- [ ] Capai budget akhir: entry JS < 250 kB gzip dan CSS < 80 kB gzip,
      lalu turunkan bertahap berdasarkan hasil nyata.

### Phase 3 - Web Push dengan Outbox

**Estimasi:** 4-8 hari termasuk UAT.  
**Tujuan:** push reliable tanpa mengganggu transaksi utama.

#### Data model

- `PushSubscription`
  - `userId`, `endpoint` unique, `p256dh`, `auth`, `expirationTime`;
  - device/browser metadata minimal;
  - `createdAt`, `lastSeenAt`, `revokedAt`.
- `PushDelivery`
  - `appNotificationId`, `pushSubscriptionId`;
  - `status` PENDING/SENT/RETRY/DEAD;
  - `attemptCount`, `nextAttemptAt`, `sentAt`, error/status terakhir;
  - unique `(appNotificationId, pushSubscriptionId)`.
- Opsional `NotificationPreference`
  - kategori, enabled, quiet hours WIB, dan kebijakan isi lock-screen.

#### Backend

- [ ] Simpan VAPID private key hanya di secret env.
- [ ] Endpoint public key, subscribe, unsubscribe, list devices/preferences.
- [ ] `AppNotificationService.create()` tetap membuat notifikasi kanonis.
- [ ] Setelah create, enqueue delivery dalam transaksi DB yang aman.
- [ ] Worker/cron mengirim outbox; retry 429/5xx dengan backoff.
- [ ] Respons 404/410 menonaktifkan subscription.
- [ ] Push failure tidak rollback pembayaran/checkout/approval.
- [ ] Dedup memakai ID notifikasi dan subscription, bukan title saja.

#### Frontend dan worker

- [ ] Minta permission hanya dari klik pengguna, bukan saat load/login.
- [ ] Daftarkan subscription setelah login dan detach saat logout/ganti akun.
- [ ] `push` handler hanya menerima schema payload minimal.
- [ ] `notificationclick` hanya membuka path same-origin yang di-allowlist.
- [ ] Fokus tab yang sudah ada sebelum membuka window baru.
- [ ] Payload lock-screen tidak memuat nominal, bukti bayar, password, atau PII.
- [ ] In-app notification tetap source of truth ketika push tidak terkirim.

#### Urutan kategori push

1. Reminder kontrak H-7/H-3/H-1/H-day dan forced checkout.
2. Pembayaran approved/rejected dan booking kalah first-paid-wins.
3. Checkout/renew approved/rejected.
4. Tiket/staff assignment yang benar-benar time-sensitive.
5. Announcement opsional sesuai preference.

### Phase 4 - Offline Operasional Terbatas

**Status:** opsional, bukan target awal.

Hanya pertimbangkan draft tiket/laporan staf setelah Phase 0-3 stabil. Wajib
memakai IndexedDB, idempotency key, status queued/sent/failed yang terlihat,
conflict policy, batas ukuran foto, dan logout cleanup. Jangan pernah queue
approval pembayaran, jurnal, invoice issue/cancel, checkout final, atau mutasi
stok tanpa desain konsistensi khusus.

## 6. Acceptance Test Wajib

### Hosting dan install

- [ ] HTTP selalu redirect HTTPS.
- [ ] Manifest MIME benar dan seluruh icon 200.
- [ ] Fresh profile menawarkan install pada browser yang mendukung.
- [ ] Android Chrome, desktop Chrome/Edge, dan iOS Home Screen diuji.
- [ ] App terpasang membuka role-aware launch route.

### Cache dan offline

- [ ] Offline reload route publik membuka fallback yang jelas.
- [ ] Offline route privat tidak menampilkan data akun lama dari persistent cache.
- [ ] Mutation offline diblokir sebelum request dan tidak terkirim ulang diam-diam.
- [ ] Cache Storage hanya berisi cache ber-prefix `kost48-`.
- [ ] Tidak ada response `/api`, proof, atau Authorization di Cache Storage.

### Update dan rollback

- [ ] Deploy build N+1 memunculkan update prompt pada client build N.
- [ ] Refresh terkontrol memuat seluruh bundle N+1 tanpa mixed version.
- [ ] Rollback worker dan HTML dapat diterima client tanpa menunggu tujuh hari.

### Multi-user dan data privat

- [ ] Login A, logout, login B pada device sama tidak menampilkan data A.
- [ ] Preview/link proof memakai request Bearer authenticated dan tidak 401.
- [ ] Bukti pembayaran A tidak dapat dibuka dari cache setelah login B.
- [ ] Logout melepaskan binding push user A pada device.

### Push

- [ ] Permission allow, deny, dan dismissed memiliki UX yang benar.
- [ ] Satu user multi-device menerima delivery terpisah tanpa duplikasi per device.
- [ ] Subscription expired 410 dibersihkan.
- [ ] Klik notification membuka/fokus route yang aman.
- [ ] Push failure tidak memengaruhi commit transaksi bisnis.
- [ ] Quiet hours dan preference kategori bekerja dalam WIB.

## 7. Definition of Done

PWA dinyatakan **kuat untuk produksi** ketika:

1. Phase 0 dan Phase 1 100% PASS.
2. Tidak ada cache API/data privat dan tidak ada mutation offline implisit.
3. Update worker bisa dipantau, diterima, dan di-rollback.
4. Install diuji pada minimal Android dan desktop; iOS diuji bila menjadi target.
5. Push baru dianggap selesai setelah outbox, retry, cleanup 410, preference,
   multi-device, dan UAT transaksi non-blocking lulus.

## 8. Hardening yang Sudah Diimplementasikan di Source

Implementasi berikut selesai pada 12 Juni 2026 setelah temuan awal di atas.
Ini memperkuat source, tetapi **belum mengubah status produksi RED** sampai build
ini dideploy dan seluruh acceptance test perangkat/hosting lulus.

### Status temuan setelah perbaikan source

| Area | Status source | Catatan |
|---|---|---|
| Cache allowlist dan cleanup prefix | SELESAI | Hanya aset publik eksplisit; cache lain tidak dihapus |
| Precache shell dan bundle hash | SELESAI | HTML build diparsing saat install dan aset entry wajib diprecache |
| Cache namespace per build | SELESAI | Build ID fingerprint seluruh dist; worker lama/baru tidak berbagi cache |
| Update lifecycle | SELESAI | Worker menunggu; UI menawarkan update; reload setelah `controllerchange` |
| Offline UX | SELESAI | Banner global, fallback `/offline.html`, mutation diblokir |
| Kegagalan lazy chunk | SELESAI | Error boundary memberi recovery, bukan layar kosong |
| Quality gate PWA build | SELESAI | Manifest, ikon, SW, build ID, cache contract, chunk, dan budget diverifikasi |
| Sesi saat jaringan gagal | SELESAI | Token tidak dihapus karena network error; profil hanya di `sessionStorage` |
| Install UX dan role-aware launch | SELESAI | Prompt install, `id`, start `/`, shortcut, tanpa lock orientasi |
| Kamera dan galeri | SELESAI DI SOURCE | Tombol kamera belakang + galeri pada tiket, staf, dan bukti bayar |
| Kompresi foto | SELESAI | Fallback tanpa ketergantungan tunggal `createImageBitmap`; EXIF/GPS dibuang |
| Bukti pembayaran privat | SELESAI | Blob fetch Bearer, object URL direvoke, `private, no-store` |
| Foto tiket privat | SELESAI | Magic bytes, nama acak, rate limit, endpoint auth dan scope tiket |
| Foto pengumuman | SELESAI | Endpoint upload yang sebelumnya hilang kini tersedia dan terproteksi |
| Foto kamar publik | DIPERKUAT | Magic bytes, nama acak, rate limit; tetap publik karena konten marketing |
| HTTPS/header/MIME produksi | BELUM | Wajib diperbaiki di hosting saat deploy |
| Push/outbox | BELUM, SENGAJA | Tidak boleh masuk sebelum Phase 0/1 UAT |
| Code splitting | SELESAI TAHAP 1 | Entry awal 272 KiB gzip, 76 JS chunk; target akhir 250 KiB belum tercapai |

### Matriks kemampuan PWA

| Kemampuan | Keputusan | Alasan |
|---|---|---|
| Install ke Home Screen/Desktop | AKTIF | Nilai nyata, izin rendah |
| Offline app shell | AKTIF | Navigasi/fallback jelas tanpa menyimpan data bisnis |
| Mutation offline | DILARANG | Mencegah double submit dan konflik pembayaran/stok |
| Kamera langsung | AKTIF OPT-IN | Hanya setelah klik pengguna; kamera belakang untuk bukti lapangan |
| Galeri/file picker | AKTIF | Fallback wajib dan penting untuk screenshot bukti bayar |
| Push notification | DITUNDA | Perlu consent, VAPID, outbox, retry, preference, cleanup 410 |
| Background Sync | DITUNDA KETAT | Hanya calon draft tiket ber-idempotency; bukan transaksi finansial |
| Web Share | OPSIONAL NANTI | Cocok hanya untuk link kamar publik, bukan invoice/foto privat |
| App Badge | OPSIONAL SETELAH PUSH | Harus mengikuti unread count kanonis |
| Wake Lock | TIDAK AKTIF | Belum ada kebutuhan yang mengalahkan biaya baterai |
| Geolocation | TIDAK AKTIF | Tidak diperlukan bisnis dan menambah data sensitif |
| Mikrofon/audio | TIDAK AKTIF | Tidak diperlukan |
| Kontak, Bluetooth, NFC, USB | TIDAK AKTIF | Tidak ada use case dan permukaan izin terlalu besar |
| Periodic Background Sync | TIDAK AKTIF | Dukungan terbatas dan tidak dibutuhkan |

### Threat model media/foto

Kontrol yang sekarang ada:

1. Browser hanya menawarkan JPG/PNG/WebP; backend tetap memeriksa magic bytes.
2. Batas upload backend 2 MB dan rate limit per user/IP mengurangi disk abuse.
3. Nama file menggunakan random 128-bit, bukan nama asli yang mudah ditebak.
4. Bukti privat hanya diambil melalui request Bearer; service worker tidak
   mencegat `/api/*` atau request ber-Authorization.
5. Endpoint privat memakai `X-Content-Type-Options: nosniff`,
   `Cache-Control: private, no-store`, dan `Vary: Authorization`.
6. Foto tiket yang sudah terikat record mengikuti scope tenant/assignee/report.
7. Canvas re-encoding di klien membuang metadata EXIF/GPS sebelum upload.

### Risiko tersisa

1. **Produksi belum aman sampai deploy.** HTTP redirect, HSTS, CSP frontend,
   MIME manifest, cache header worker, API 503, dan drift build masih blocker.
2. JWT masih di `localStorage`; migrasi ke cookie `HttpOnly Secure SameSite`
   membutuhkan desain refresh/session revocation backend dan bukan perubahan
   PWA kecil.
3. Upload yang dibatalkan sebelum form disimpan dapat meninggalkan orphan file.
   Tambahkan tabel asset/upload ownership dan cleanup job sebelum skala besar.
4. Magic-byte validation bukan antivirus atau full image decode. Untuk exposure
   publik besar, pertimbangkan server-side decode/re-encode dan scanning.
5. Rate limiter masih in-memory; multi-replica memerlukan Redis/shared store.
6. Entry JS turun ke 272 KiB gzip dan CSS 101 KiB gzip, tetapi masih di atas
   target akhir 250 KiB/80 KiB. Vendor dan CSS perlu dipisah/dirampingkan lagi.
7. Browser interaktif sandbox gagal; kamera fisik, install prompt, standalone,
   offline DevTools, dan update N ke N+1 belum dapat dinyatakan PASS.

### Verifikasi implementasi

- Backend `npm run build`: PASS setelah endpoint tiket, kamar, pengumuman, dan
  payment-proof hardening.
- Frontend `npm run build`: PASS; 1,477 modul; 76 JS chunk; entry JS
  904.34 kB minified / 278.89 kB gzip (quality gate menghitung 272 KiB);
  CSS 662.16 kB / 103.89 kB gzip (quality gate 101 KiB).
- Build ID otomatis: `c2aoy-NA1HTp`; `dist/version.json`, meta build pada HTML,
  dan namespace cache service worker memakai ID yang sama.
- `npm run pwa:verify`: PASS untuk manifest/icon dimension, output wajib,
  sintaks dan kontrak worker, build ID, larangan cache media privat, jumlah
  chunk, serta budget entry saat ini 380 KiB JS / 120 KiB CSS.
- `node --check frontend/public/sw.js`: PASS.
- Manifest JSON parse: PASS.
- `dist/` memuat `sw.js`, `offline.html`, dan `manifest.webmanifest`.
- `git diff --check`: PASS.

### UAT perangkat nyata yang wajib

- Android Chrome dan iPhone Safari/Home Screen: kamera belakang, galeri,
  cancel permission, file terlalu besar, format salah, rotasi foto, dan upload.
- Akun tenant A tidak dapat membuka foto tenant B; staf hanya foto tugas/report
  yang berhak; owner/admin tetap dapat review.
- Login A, logout, login B pada perangkat sama: object URL lama sudah direvoke
  dan bukti A tidak dapat dibuka dari history/cache.
- Install fresh, offline setelah first controlled load, update build N ke N+1,
  rollback, dan stale worker.
- Audit Cache Storage memastikan hanya cache `kost48-pwa-*` dan tidak ada URL
  `/api`, bukti bayar, foto tiket, atau pengumuman privat.
