# KOST48 — Checklist Go-Live cPanel (Lembar Kerja Owner)

> Dibuat **12 September 2026**; **dieksekusi 13 September 2026** ke shared hosting cPanel (Node.js App/Passenger + PostgreSQL).
> Runbook kanonik tetap [M08](M08_DEPLOY_GO_LIVE.md); spesifikasi efisiensi hosting [M19](M19_EFISIENSI_HOSTING_512MB.md); urutan task [M12](M12_CHECKLIST_CHANGELOG.md).
> **Jangan tulis secret (password DB, JWT, token cron, PIN) ke dokumen ini atau ke chat.** Isi langsung di cPanel/`.env` server.
> **Status 17 Sep 2026: paket 12 Sep SUDAH LIVE di produksi** (lihat §E), dan `client/` sudah diperbarui dua kali sesudahnya — 16 Sep (`3c0qJfgImyvj`, perbaikan homepage mobile) dan **17 Sep (`BZ-Vpsd9eLX1`, target sentuh tablet 768 px + CLS mobile + target sentuh perangkat sentuh ≥1024 px)**. Sisa pekerjaan owner ada di §F.
>
> **Catatan sinkronisasi 16 Sep 2026:** §B/§C di bawah adalah lembar persiapan pra-deploy; status tiap butir sudah ditandai menurut bukti §E + [M20](M20_PRODUKSI_KOST48.md). Butir yang belum tuntas tetap ditandai, bukan dihapus.

## A. Status artefak saat dokumen ini dibuat (12 Sep 2026)

| Item | Nilai | Catatan |
|---|---|---|
| Commit sumber | `cbca06f` (branch `main`, tree kotor seperti sebelumnya) | seluruh perubahan 12 Sep ikut terpaket |
| Versi aplikasi | 1.3.0 (`Portal Ringkas`) | tanpa bump versi |
| Build ID PWA | `B70lrG6Auual` | 159 chunk; initial JS 145 KiB gzip, initial CSS 131 KiB gzip |
| Arsip paket | `kost48-deploy-bundled.tgz` — 42.749.795 byte (40,8 MB), 10.500 entri | siap unggah |
| SHA-256 arsip | `BC9176F2897B6FB444FD9A0156C90944D0D289EF8E66932217B2944DB69EEDFD` | catat di bukti rilis |
| Folder `deploy/` | 9.636 file, 93,4 MB | estimasi inode unggahan |
| Mode frontend | `VITE_API_BASE_URL=/api` | combined 1 origin: frontend dilayani Nest |
| Perubahan besar pasca paket 6 Sep | a11y 12 Sep (327 `controlId` di 58 file), performa `/portal/stay` 23→17 request, normalisasi token radius | alasan paket lama tidak boleh dipakai |
| Isi paket | 46 modul backend, 24 migration, 153 paket runtime, 162 aset klien | tanpa `uploads/`, tanpa `.env` |
| Telemetri EF-01 | `dist/common/telemetry/*` ada di paket | default OFF |

## A2. Verifikasi lokal paket (12 Sep 2026) — bukan UAT host

Database uji **sementara dan terpisah** (`kost48_pkg_verify`) dibuat di PostgreSQL 18 lokal, dibangun **hanya** dari artefak paket, lalu dihapus setelah pengujian. DB UAT `kost48_v3_pro` dan DB produksi tidak disentuh.

| Uji | Hasil |
|---|---|
| `sql/bootstrap-production-schema.sql` pada DB kosong | lulus — 63 tabel di schema `public` |
| `sql/seed-production-rooms.sql` | lulus — 13 kamar (`Room`), 13 baris `PublicRoomAvailability` |
| Boot `node dist/main.js` dari `deploy/` | listen dalam 5,8 s; RSS ≈ 155 MB (lokal, bukan angka host) |
| `GET /` | 200 `text/html`, `Cache-Control: no-store, max-age=0` |
| `GET /api/public/rooms?limit=2` | 200 JSON (`success:true`) |
| `GET /api/stays?limit=1` tanpa token | 401 JSON |
| `GET /version.json` | 200, `buildId` = `B70lrG6Auual`, `no-store` |
| `GET /login` (deep link) | 200 HTML SPA |
| `GET /api/tidak-ada` | 404 JSON |
| `GET /assets/hilang.js` | 404 (bukan `index.html`) |
| `node scripts/seed-owner.js` di paket | lulus — OWNER id 1 dibuat |
| `POST /api/auth/login` OWNER | 201, token diterima, role `OWNER` |
| `GET /api/auth/me` / `/api/accounting/readiness` / `/api/stays` dengan Bearer | 200 |
| `POST /api/auto-ops/cron` token salah | 403 |
| `POST /api/auto-ops/cron` token benar | 200 |
| `GET /api/auto-ops/cron` | 404 (hanya `POST`) |

**Batas bukti:** ini verifikasi lokal atas artefak, bukan deployment, bukan pengukuran host, dan bukan UAT lintas role. Angka RSS lokal tidak boleh dipakai sebagai bukti kecukupan 512 MB (EF-02 tetap terbuka).

### Perbaikan paket yang ikut sesi ini

- `sql/seed.sql` (854 KB) dan `sql/seed_ORIGINAL.sql` (618 KB) **dikeluarkan dari paket** — keduanya membawa data historis/PII dan dilarang di produksi. `scripts/make-deploy.mjs` kini menghapusnya saat packaging **dan** gagal bila keduanya muncul di arsip.
- `README-DEPLOY.md` di dalam paket menyebut tiga migration yang dipasang bootstrap (termasuk `20260818000000_settings_tuya_vapid`) dan menegaskan `seed.sql` tidak ikut paket.

## B. Keputusan owner — **status 16 Sep 2026** (semua sudah diputuskan/dijalankan; sisa ditandai)

1. **Jalur database — ✅ DIPUTUSKAN & DIJALANKAN: jalur A.** DB produksi **baru** `kost48s1_prod26` dibuat lewat cPanel, skema di-bootstrap bersih, OWNER pertama + COA/periode/cash account di-seed 13 Sep. DB uji lama `kost48s1_kost48_prod` **dipertahankan utuh** sebagai cadangan (penghapusan tetap perlu izin terpisah). Catatan: DB yang dibuat lewat phpPgAdmin tidak terdaftar cPanel → gagal `pg_hba` (§E temuan 3).
2. **Domain final — ✅ DIPUTUSKAN:** `https://kost48surabaya.com` (dipakai `CORS_ORIGIN`/`FRONTEND_URL`, AutoSSL aktif). Canonical `app.kost48surabaya.com` di M08 tidak dipakai.
3. **Identitas deployment (EF-00) — 🟠 SEBAGIAN:** application root, document root, Node, startup, jumlah proses, urutan env, dan nama DB sudah terisi ([M20 §2](M20_PRODUKSI_KOST48.md)). Sisa UNKNOWN: SHA tunggal artefak yang berjalan, jam deploy presisi, dan fault/interval pengukuran.
4. **Kredensial & secret baru — 🟠 SEBAGIAN:** `JWT_SECRET`, `AUTO_OPS_CRON_TOKEN`, `AVAILABILITY_OWNER_PIN`, dan kredensial DB sudah ada di produksi, **tetapi rotasi belum**: `JWT_SECRET` + password DB masih terbaca di `public_html/.htaccess` dan PIN masih `123456` → §F.1–§F.2. VAPID belum diaktifkan (push opsional).
5. **Izin menjalankan langkah server — ✅ DIBERIKAN & DIJALANKAN:** deploy paket 13 Sep, deploy `client/` 16 Sep (tanpa restart, tanpa menyentuh backend/DB/`.env`/`uploads`). Izin berikutnya tetap diminta per sesi.

## C. Yang harus disiapkan sebelum menyentuh server — **status 16 Sep 2026**

- [x] Konfirmasi nama & kredensial database produksi — DB `kost48s1_prod26`, user `kost48s1_lurin` (dibuat lewat cPanel → PostgreSQL Databases; §E temuan 3). Nilai kredensial tidak ditulis di dokumen ini.
- [x] Domain final + akses cPanel (Node.js App, PostgreSQL, Cron Jobs, Terminal/SSH, AutoSSL) — tersedia; `uapi NodeJS` **tidak** ada di server ini sehingga env diubah lewat berkas konfigurasi cPanel + backup (§E temuan 2).
- [x] Nomor versi Node di panel (target: Node 22) dan kemampuan `NODE_OPTIONS` — Node **22.23.2** (venv khusus app); `NODE_OPTIONS=--max-old-space-size=192` terpasang lewat env cPanel ([M20 §4](M20_PRODUKSI_KOST48.md)).
- [x] Password baru yang kuat untuk OWNER produksi (bukan `admin123`) — dibuat 13 Sep; password sementara masih ada di `~/OWNER-PASSWORD-BACA-LALU-HAPUS.txt` → rotasi + hapus file masuk §F.3.
- [x] Keputusan jalur database (§B.1) dan jendela waktu eksekusi — jalur A (DB baru + bootstrap bersih), dieksekusi 13 Sep 2026.
- [ ] Konfirmasi apakah `uploads/` (foto kamar/bukti bayar) perlu dipindahkan dari server lama — **belum terjawab.** Deploy 13–16 Sep tidak menyentuh `uploads/`; aset privat tetap tidak boleh masuk dokroot publik.

## D. Urutan eksekusi (satu kali, di server)

Semua perintah dijalankan **tanpa** `npm install`, `npm ci`, `prisma generate`, atau `db push` di server.

1. Unggah `kost48-deploy-bundled.tgz` ke application root, lalu extract.
2. **Setup Node.js App:** Node 22, mode Production, startup file `dist/main.js`, `NODE_OPTIONS=--max-old-space-size=192` di Environment Variables cPanel (bukan `.env`).
3. Salin `.env.example` → `.env`, isi minimal: `NODE_ENV=production`, `DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGIN`, `FRONTEND_URL`, `KTP_ACTIVATION_GATE_ENABLED=true`, `PUBLIC_ONLINE_BOOKING_ENABLED=false`, `AUTO_OPS_ENABLED=false`, `AUTO_OPS_CRON_TOKEN`, `AVAILABILITY_OWNER_PIN`.
4. **Jalur A:** jalankan bootstrap + seed kamar dari Terminal (lihat [M08 Bagian D](M08_DEPLOY_GO_LIVE.md)). **Jalur B:** jangan jalankan bootstrap; siapkan patch terpisah dengan backup teruji.
5. Buat OWNER pertama sekali saja: `node scripts/seed-owner.js` dengan `OWNER_EMAIL`/`OWNER_PASSWORD`/`OWNER_FULLNAME` sementara.
6. Login OWNER → seed COA, periode OPEN, CashAccount, opening balance melalui UI.
7. Restart Application, aktifkan AutoSSL/HTTPS.
8. Jalankan smoke test (§E), baru setelah lulus pasang cron AutoOps.
9. Cron AutoOps tiap 5 menit: `curl -fsS -X POST -H "X-Cron-Token: <TOKEN>" https://<domain>/api/auto-ops/cron >/dev/null 2>&1`. Endpoint hanya `POST` + header token. **IoT Tuya tanpa cron.**

## E. Deployment produksi 13 Sep 2026 (SUDAH DIJALANKAN)

Identitas deployment (menutup sebagian EF-00 §9.1 M19):

| Item | Nilai |
|---|---|
| Host SSH | `api.kost48surabaya.com` port **4422**, user `kost48s1`, server `batikan.idweb.host` (IP `203.161.184.69`) |
| Application root | `/home/kost48s1/kost48-prod` |
| Startup | Passenger, `dist/main.js`, Node `22.23.2` (`/home/kost48s1/nodevenv/kost48-prod/22/bin/node`) |
| Domain produksi | `https://kost48surabaya.com` (PassengerAppRoot dari `public_html/.htaccess`) |
| Artefak terpasang | paket 12 Sep 2026, build PWA `B70lrG6Auual`, SHA-256 `BC9176F2…EEDFD` (checksum cocok setelah upload) |
| Database produksi baru | `kost48s1_prod26` (PostgreSQL **9.6.22**, socket lokal, user `kost48s1_lurin`) |
| Database lama | `kost48s1_kost48_prod` — **dipertahankan utuh**, 13 akun uji, 62 tabel |
| OWNER pertama | `liem.lui@gmail.com` (id 1), dibuat 13 Sep 2026 |
| Backup sebelum perubahan | `~/backups/db-kost48s1_kost48_prod-20260913-073908.sql.gz` (31 KB), `~/backups/app-kost48-prod-20260913-073908.tar.gz` (32 MB), `~/backups/htaccess-*.bak`, `~/backups/node-selector.json-*.bak` |

### Temuan penting saat eksekusi

1. **Urutan prioritas env: env cPanel Node.js App > `.htaccess` > `.env`.** `DATABASE_URL` di `.env` **tidak berpengaruh** karena env var app di sidebar cPanel (`~/.cl.selector/node-selector.json`) menimpanya. Gejala: skema sudah di DB baru, tetapi app tetap membaca DB lama. Dibuktikan dengan penanda nama kamar di kedua DB, bukan dengan asumsi.
2. **`uapi NodeJS` tidak tersedia di server ini** (`Cpanel/API/NodeJS.pm` tidak ada), jadi tidak ada API resmi untuk mengubah env var app; perubahan dilakukan pada file konfigurasi cPanel dengan backup + validasi JSON.
3. **Database yang dibuat lewat phpPgAdmin tidak terdaftar di cPanel**, sehingga tidak mendapat aturan `pg_hba` dan login selalu `no pg_hba.conf entry`. Database harus dibuat lewat menu cPanel → PostgreSQL Databases, lalu user di-assign lewat "Add User To Database".
4. **`.htaccess` `public_html` menyimpan secret dalam teks biasa** (`JWT_SECRET`, `DATABASE_URL` termasuk password DB, `AVAILABILITY_OWNER_PIN 123456`). Lihat §F.1 untuk rotasi.
5. **`seed.sql`/`seed_ORIGINAL.sql` masih ada di app root** dari paket 18 Agu (paket baru tidak lagi membawanya). Kandidat dibersihkan.
6. Dua direktori app lama (`~/kost48v3`, `~/kost48surabaya`) dan dua arsip 43 MB masih memakai disk/inode.

### Bukti smoke test produksi (13 Sep 2026, lewat HTTPS)

| Uji | Hasil |
|---|---|
| `GET /` | 200, 3.437 byte |
| `GET /version.json` | 200, `buildId` = `B70lrG6Auual` (naik dari `1BavS58Sb96-`) |
| `GET /login`, `/portal/stay` (deep link) | 200 HTML SPA |
| `GET /assets/hilang.js` | 404 |
| `Cache-Control` `/version.json`, `/sw.js`, `/index.html` | `no-store, max-age=0` |
| `GET /api/public/rooms` | 200; **13 kamar** terlihat |
| `GET /api/stays` tanpa token | 401 |
| `GET /api/tidak-ada` | 404 JSON |
| `POST /api/auth/login` OWNER | sukses, token diterima |
| `GET /api/auth/me`, `/api/stays`, `/api/tenants`, `/api/invoices` dengan Bearer | 200 |
| Gate KTP efektif | `ktpVerificationGateEnabled: true` |
| `POST /api/accounting/default-coa/seed` | 38 akun COA dibuat |
| Proses Passenger | 1 instance (sebelumnya 2), RSS ≈ 200 MB |
| Environment proses (bukti langsung) | `DATABASE_URL=...@/kost48s1_prod26` |

## F. Sisa pekerjaan owner

**Status 20 Sep 2026:** berdasarkan laporan owner; password OWNER dan PIN belum dikonfirmasi, tetap terbuka. Bukti server tidak diulang pada pembaruan dokumentasi ini.

- [x] **Rotasi secret (JWT + password DB)** — selesai 20 Sep 2026: password user `kost48s1_lurin` dirotasi via cPanel, `JWT_SECRET` dirotasi, `.env` produksi diperbarui. Nilai disimpan di password manager owner, tidak dicatat di repo.
- [x] **Hapus `SetEnv DATABASE_URL`/`JWT_SECRET` dari `.htaccess`** — `public_html/.htaccess` bersih dari kedua entri tersebut (`grep -c` = 0), 20 Sep 2026. Env bersumber dari `.env` + (opsional) env cPanel; cPanel tetap diprioritaskan bila diisi.
- [ ] **Ganti PIN owner** `AVAILABILITY_OWNER_PIN` — belum dikonfirmasi; nilai tidak dicatat di dokumen ini.
- [ ] **Ganti password OWNER pertama.** Belum dikonfirmasi; login dan ganti lewat menu Profil, lalu hapus file sementara `~/OWNER-PASSWORD-BACA-LALU-HAPUS.txt` (status penghapusan file OWNER belum dikonfirmasi).
- [x] **Hapus file password tenant** `~/TENANT-PASSWORD-AWAL-BACA-LALU-HAPUS.txt` — selesai 20 Sep 2026; penghapusan file tidak membuktikan penggantian password akun tenant.
- [ ] **Lengkapi fondasi akuntansi lewat UI:** periode `OPEN` (1, bulan berjalan) dan 2 CashAccount (Kas Tunai + Bank Utama, saldo awal 0) **sudah dibuat 13 Sep 2026** — catatan lama "masih 0" tidak berlaku lagi. Yang belum: **opening balance diisi** (atau zero-start dicatat), karena kesiapan akuntansi masih 75/100 dengan `formalStatementReady=false` ([M20 §3](M20_PRODUKSI_KOST48.md)).
- [ ] **Cron AutoOps** (setelah UAT): Environment Variables cPanel → `AUTO_OPS_ENABLED=false` + `AUTO_OPS_CRON_TOKEN=<acak>`; cPanel Cron Jobs tiap 5 menit → `POST /api/auto-ops/cron` dengan header `X-Cron-Token`. **Jangan** pasang cron IoT Tuya.
- [ ] **Onboarding penghuni nyata** melalui `docs/FORM_ISI_DATA_GO_LIVE.md`.
- [x] **Pembersihan disk/inode** — selesai 20 Sep 2026: `~/kost48v3` (191 MB), `~/kost48surabaya` (24 MB), 5 tgz staging lama (~98 MB), 3 folder `client-old-*`, `sql/seed.sql` (854 KB) + `sql/seed_ORIGINAL.sql` (618 KB) dihapus. App root 257 → 129 MB; home dir ~1.1 GB → ~660 MB; `~/backups` dan `~/lui` dipertahankan. Inode sesudah cleanup belum diukur.
- [ ] **PostgreSQL 9.6.22 sudah EOL** (Nov 2021) — tanyakan ke IDwebhost apakah tersedia versi lebih baru.

## G. Catatan teknis untuk release berikutnya

- **Tidak ada ledger migrasi** di DB produksi (`_prisma_migrations` tidak ada), jadi `prisma migrate deploy` tidak bisa dipakai. Patch skema harus eksplisit dan teruji.
- Redeploy = extract paket baru ke `~/kost48-prod` **tanpa** menimpa `.env`, `uploads/`, `tmp/`; lalu ubah env var di cPanel bila perlu dan restart aplikasi (`kill -TERM` proses `lsnode:` → Passenger menghidupkan ulang pada request berikutnya).
- Skrip bantu sesi ini tersimpan di `scripts/remote/*.sh` + `scripts/ssh-kost48*.ps1` (kredensial tidak disimpan di dalamnya; key SSH ada di `%TEMP%\kost48ssh`).

## H. Daftar periksa smoke test (rujukan; sudah dijalankan 13 Sep — lihat §E)

- [ ] `https://<domain>/` memuat SPA; `/version.json` menampilkan build ID paket.
- [ ] `GET /api/public/rooms` → 200 JSON; `GET /api/stays` tanpa token → 401.
- [ ] Login OWNER berhasil; menu role sesuai.
- [ ] `/api/accounting/readiness` → `formalStatementReady`; trial balance `isBalanced=true`.
- [ ] `GET /api/deposit-ledger/reconciliation-lite` → mismatch 0 (baseline dicatat).
- [ ] `POST /api/auto-ops/run` sekali oleh OWNER/ADMIN berhasil; cron dengan token sama berjalan dan menolak token salah (403).
- [ ] Header cache: `/sw.js`, `/version.json`, `/index.html` → `no-store`; `/assets/*` → `immutable`.
- [ ] Deep link `/login`, `/portal/stay` → HTML SPA; aset hilang → 404 (bukan `index.html`).
- [ ] Aktivasi kamar tanpa KTP terverifikasi **DITOLAK** (bukti gate KTP aktif).
- [ ] cPanel Resource Usage: catat PMEM, fault, EP saat idle dan setelah dashboard dibuka (bahan EF-02).
- [ ] Catat SHA paket, waktu deploy, build ID, hasil smoke — tanpa secret/PII.

## I. Rollback

- **Kode:** extract paket versi sebelumnya (tanpa menimpa `.env`/`uploads/`) → Restart Application.
- **Database:** DB lama `kost48s1_kost48_prod` masih utuh; untuk kembali, ubah `DATABASE_URL` di **Environment Variables cPanel** (bukan `.env`) ke DB lama lalu restart.
- **PWA:** `index.html`, `sw.js`, `version.json`, `manifest.webmanifest` harus konsisten satu set.
- **Data:** restore backup `~/backups/db-*.sql.gz` hanya bila ada korupsi nyata dan atas keputusan owner.
- **Cron:** hentikan job bila auto-ops bermasalah; jangan hapus key DB untuk mematikan fitur.

## J. Jebakan yang sudah diketahui

- `sql/seed.sql` berisi data historis/PII → **dilarang** di produksi; gunakan `sql/seed-production-rooms.sql`.
- `sql/bootstrap-production-schema.sql` menolak jalan bila schema `public` sudah berisi tabel (perilaku sengaja).
- Bootstrap saat ini membuat tabel `_prisma_migrations` **tanpa satu pun entri ledger** (terverifikasi: 0 baris pada uji 12 Sep). Akibatnya `prisma migrate deploy` berikutnya akan mencoba menerapkan ulang 24 migration dan gagal pada objek yang sudah ada. Keputusan yang perlu diambil owner sebelum release berikutnya: (a) catat ledger setelah bootstrap, atau (b) tetapkan proses patch skema eksplisit tanpa Prisma CLI. **Belum diselesaikan di paket ini.**
- `.env` tidak bisa menyetel `NODE_OPTIONS`; wajib lewat Environment Variables cPanel.
- Env kosong + row `OperationalSetting` default dapat menyalakan AutoOps in-process di Passenger yang idle-sleep → pastikan `AUTO_OPS_ENABLED=false` benar-benar terbaca.
- Paket tidak membawa `uploads/` dan `.env` — memang disengaja; data upload dikelola terpisah.
