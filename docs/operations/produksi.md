# Produksi & Operasional Harian (Shared Hosting)

> Migrasi dari docs/M20_PRODUKSI_KOST48.md (seluruh section §1-§14) pada f8f9a589 (DOC-GOV-20260922 Tahap 3).
> Sumber asli sudah dihapus di Fase 3 (23 Sep 2026); berkas ini kanonik.

## 1. Ringkasan cepat

| | |
|---|---|
| URL produksi | `https://kost48surabaya.com` |
| Halaman operasional owner | `/cek` (checklist go-live) · `/okupansi` (ubah ketersediaan kamar) · `/update-kamar` (wizard lengkap) |
| Versi aplikasi | 1.3.0 (`Portal Ringkas`), build PWA terakhir **`BZ-Vpsd9eLX1`** (17 Sep 2026, perbaikan tablet/CLS/sentuh; sebelumnya `3c0qJfgImyvj` 16 Sep → `G2vp1MdZhTRz` 13 Sep) |
| Model proses | 1 proses Passenger (LiteSpeed `lsnode`), startup `dist/main.js` |
| Database aktif | PostgreSQL 9.6.22 di server yang sama, satu database produksi (nama ada di `.env` app) |
| Backup | folder `~/backups/` di akun hosting |

## 2. Identitas deployment (menutup sebagian EF-00 §9.1 M19)

**Pembaruan 20 Sep 2026 (laporan owner):** secret dirotasi (password DB + JWT); nilai disimpan di password manager owner, tidak dicatat di repo. `.env` produksi diperbarui; `SetEnv DATABASE_URL`/`JWT_SECRET` di `public_html/.htaccess` sudah dihapus (`grep -c` = 0). Sumber env kini `.env` + (opsional) cPanel env; prioritas cPanel di bawah tetap berlaku bila diisi.

**Cleanup 20 Sep 2026:** app root 257 → 129 MB; home dir ~1.1 GB → ~660 MB. API HTTPS 200, 13 kamar, build `BZ-Vpsd9eLX1`; koneksi `.env` melalui `psql` menghasilkan `rooms = 13`. Bukti dari laporan owner, bukan pemeriksaan server baru pada pembaruan dokumentasi ini.

| Item | Nilai |
|---|---|
| Host SSH | `api.kost48surabaya.com` port **4422** (bukan 22), user `kost48s1` |
| Nama server | `batikan.idweb.host` (IDwebhost), IP `203.161.184.69` |
| Application root | `/home/kost48s1/kost48-prod` |
| Node | `/home/kost48s1/nodevenv/kost48-prod/22/bin/node` (v22.23.2) |
| Document root | `/home/kost48s1/public_html` (Passenger diarahkan dari `.htaccess` di sana) |
| Startup file | `dist/main.js` |
| Portal cPanel | Node.js App (mode Production), PostgreSQL, Cron Jobs, phpPgAdmin (tidak dipakai untuk membuat DB) |
| Disk / inode | 1,5 TB volume, pemakaian akun ±2,2 GB; inode 66% saat snapshot 7 Sep |

### Penting: urutan prioritas environment

```
env var cPanel Node.js App   →  .htaccess (SetEnv)  →  .env di app root
   (paling kuat)                                        (paling lemah)
```

Env var cPanel tersimpan di `~/.cl.selector/node-selector.json` dan **menimpa** `.htaccess` maupun `.env`. Pada 13 Sep ini sempat membuat bingung: skema sudah dipasang di database baru, tetapi app tetap membaca database lama. **Selalu ubah `DATABASE_URL` lewat cPanel → Setup Node.js App → Environment Variables, lalu Save + Restart.**

Cara memastikan app benar-benar memakai database tertentu (bukti langsung, bukan asumsi):

- baca environment proses: `tr '\0' '\n' < /proc/<PID>/environ | grep '^DATABASE_URL='`
- atau uji penanda: ubah sementara nama satu kamar di database A, lihat apakah `/api/public/rooms` berubah, lalu kembalikan.

## 3. Yang sudah ada di produksi (13 Sep 2026)

| Komponen | Jumlah | Catatan |
|---|---|---|
| Kamar | 13 (A–M) | dari `sql/seed-production-rooms.sql`, tarif katalog sesuai M18 |
| Penghuni (Tenant) | 13 | nama, NIK, HP dari data kanonik `backend/scripts/seed-prod-tenants.js` |
| Akun portal penghuni | 12 | GUNAWAN (F1) tanpa akun — akan keluar |
| Akun OWNER | 1 | `liem.lui@gmail.com` (password sementara ada di file di server) |
| Bagan akun (COA) | 38 | hasil `POST /api/accounting/default-coa/seed` |
| Periode akuntansi | 1 | bulan berjalan, status `OPEN` |
| Cash account | 2 | Kas Tunai (default) + Bank Utama, saldo awal 0 |
| Kesiapan akuntansi | 75/100 | `formalStatementReady=false` (menunggu opening balance + transaksi) |
| Hunian / invoice / meter | 0 | belum dibuat — menunggu data owner |
| Ledger migrasi | **tidak ada** | `_prisma_migrations` tidak ada; lihat §7 |

## 4. Variabel environment yang berlaku

Diatur di cPanel → Setup Node.js App → Environment Variables:

| Variabel | Nilai | Alasan |
|---|---|---|
| `NODE_ENV` | `production` | wajib |
| `DATABASE_URL` | database produksi | satu-satunya yang menentukan DB efektif |
| `JWT_SECRET` | acak ≥32 karakter | app menolak start bila lemah/pendek |
| `AVAILABILITY_OWNER_PIN` | PIN owner | membuka `/okupansi` & wizard ketersediaan |
| `NODE_OPTIONS` | `--max-old-space-size=192` | cap heap; **tidak bisa** lewat `.env` |
| `AUTO_OPS_ENABLED` | `false` (rencana) | Passenger idle → timer in-process tak andal |
| `AUTO_OPS_CRON_TOKEN` | acak (rencana) | membuka `POST /api/auto-ops/cron` |

Di dalam `.env` app root: `CORS_ORIGIN`, `FRONTEND_URL`, `KTP_ACTIVATION_GATE_ENABLED=true`, `PUBLIC_ONLINE_BOOKING_ENABLED=false`. Ingat: `.env` **kalah** dari env var cPanel.

## 5. Operasional harian

### 5.1 Ubah ketersediaan kamar
Buka `https://kost48surabaya.com/okupansi` → masukkan PIN owner → tekan **Kosong / Terisi / Disembunyikan** pada kamar yang dimaksud. Perubahan langsung tampil di katalog publik.

- Endpoint: `GET`/`PUT /api/public/availability/setup` dengan header `X-Availability-Pin`.
- Status: `AVAILABLE` (hijau, arahkan ke WhatsApp) · `FULL` (tetap bisa ditanya) · `HIDDEN` (hilang dari katalog).
- Halaman ini aman dari tabrakan: sebelum menyimpan, status diambil ulang dari server.
- Booking online ditutup (`onlineBookingEnabled: false`) — memang kebijakan owner; status kamar diubah lewat halaman ini, bukan lewat booking.

### 5.2 Checklist status
Buka `https://kost48surabaya.com/cek`. Isinya statis (tanpa API, tanpa data pribadi). **Perbarui manual** di `frontend/src/pages/public/CekPage.tsx` setiap ada item selesai.

### 5.3 Kalau perlu lihat data/akun
- Owner/admin: login normal, lalu menu terkait (Penghuni, Kamar, Stays, Invoices, Akuntansi, Pengaturan).
- Database langsung: `psql` dari SSH memakai kredensial di `.env` (cara: baca `DATABASE_URL`, ekspor `PGPASSWORD` di dalam perintah, jangan pernah mencetaknya).

## 6. Deploy ulang (redeploy) — langkah baku

1. **Lokal:** `npm run make-deploy` dari root repo → menghasilkan `kost48-deploy-bundled.tgz` (prebuilt; server tidak build/install apa pun).
   - Catatan sandbox: Vite/esbuild butuh proses anak → jalankan dengan izin lebih luas bila muncul `spawn EPERM`.
2. **Upload:** `scp -P 4422 kost48-deploy-bundled.tgz kost48s1@api.kost48surabaya.com:~/staging/`
3. **Verifikasi checksum** di server (`sha256sum`) — bandingkan dengan nilai build lokal.
4. **Backup dulu:** `pg_dump` database + arsip `client/` lama ke `~/backups/`.
5. **Extract** ke app root **tanpa menimpa** `.env`, `uploads/`, `tmp/`, dan arsip lama:
   ```bash
   tar -xzf ~/staging/kost48-deploy-bundled.tgz -C ~/kost48-prod \
     --exclude='./.env' --exclude='./uploads' --exclude='./tmp' \
     --exclude='./kost48-deploy-bundled.tgz' --exclude='./.env.*'
   ```
6. **Restart:** `kill -TERM <PID lsnode>` lalu panggil `https://<domain>/api/public/rooms` untuk memicu Passenger menghidupkan ulang.
7. **Smoke test:** `/`, `/version.json` (build ID baru?), `/api/public/rooms` 200, `/api/stays` 401, `/login` 200, aset hilang 404, `Cache-Control: no-store` pada `version.json`/`sw.js`/`index.html`.

**Deploy frontend saja (lebih cepat):** build di lokal → `tar -czf client.tgz -C frontend/dist .` → upload → extract ke `~/kost48-prod/client`. Aset statis langsung berlaku **tanpa restart**.

### 6.1 Cara extract `client/` yang BENAR (penting — sempat salah 13 Sep)

Extract **hanya nama `client`** supaya Vite mengganti folder secara utuh:

```bash
cd ~/kost48-prod
tar -xzf ~/staging/client-update.tgz        # arsip dibuat dari frontend/dist (berisi index.html, assets/, sw.js, …)
# atau bila arsip dibuat dari parent: tar -xzf … client
```

Jangan mengekstrak isi arsip **ke dalam** `client/assets` sambil berharap folder lama tergantikan: file aset ber-hash dari build lama akan **tertinggal**, sehingga isi `assets/` bercampur antar versi. Pada 13 Sep hal ini membuat `index.html` merujuk entry build terbaru sementara beberapa chunk lama masih tersisa.

**Selalu verifikasi setelah deploy client:**

```bash
ENTRY=$(grep -oE 'assets/index-[A-Za-z0-9_-]+\.js' ~/kost48-prod/client/index.html | head -1)
ls -l ~/kost48-prod/client/$ENTRY            # harus ADA
grep -o 'CekPage-[A-Za-z0-9_-]*\.js' ~/kost48-prod/client/$ENTRY   # nama chunk yang dirujuk entry
```

Aturan praktis: **`version.json` cocok + entry yang dirujuk `index.html` ada + halaman berat dimuat tanpa error** = deploy client sehat. Jangan menghapus aset hanya karena "tidak dirujuk index.html" — entry Vite memuat chunk halaman secara dinamis dari file `assets/index-*.js`, jadi nama chunk yang benar **tidak muncul** di `index.html`. Verifikasi selalu dari file entry, bukan dari `index.html`.

## 7. Skema database & migrasi — batasan penting

- Database produksi **tidak memiliki tabel `_prisma_migrations`**. Artinya **`prisma migrate deploy` tidak dapat dipakai**; ia akan mencoba menerapkan ulang migration dan gagal pada objek yang sudah ada.
- Jalur yang dipakai saat go-live: `sql/bootstrap-production-schema.sql` (menolak jalan bila schema `public` sudah berisi tabel) + `sql/seed-production-rooms.sql` (idempoten, `ON CONFLICT DO NOTHING`).
- `sql/seed.sql` dan `sql/seed_ORIGINAL.sql` membawa data historis/PII → **dilarang** di produksi; paket baru sudah tidak memuatnya, tetapi salinannya masih ada di app root dari paket 18 Agu.
- **Patch skema berikutnya harus direncanakan eksplisit** (review SQL manual + backup teruji), bukan dengan Prisma CLI.
- PostgreSQL **9.6.22 sudah end-of-life** (Nov 2021). Layak ditanyakan ke hosting apakah tersedia versi lebih baru.

## 8. AutoOps & cron

- Di shared hosting: `AUTO_OPS_ENABLED=false` + `AUTO_OPS_CRON_TOKEN=<acak>`.
- Cron cPanel tiap 5 menit:
  ```bash
  curl -fsS -X POST -H "X-Cron-Token: <TOKEN>" https://kost48surabaya.com/api/auto-ops/cron >/dev/null 2>&1
  ```
- Endpoint hanya menerima `POST` + header `X-Cron-Token` (query `?token=` dihapus). Token salah → 403. Satu panggilan menjalankan seluruh sweep sekaligus membangunkan app yang idle.
- **Jangan** memasang cron IoT Tuya — pembacaan kWh bersifat on-demand.
- Ingat: row `OperationalSetting.autoOpsEnabled` masih `true`, jadi **wajib** set `AUTO_OPS_ENABLED=false` di env cPanel agar timer in-process tidak ikut hidup.

## 9. Backup, rollback, pemulihan

| Kebutuhan | Cara |
|---|---|
| Backup database | `pg_dump` memakai kredensial `.env`, hasil `gzip` ke `~/backups/` |
| Backup app | arsip `~/kost48-prod` tanpa `node_modules` dan tanpa arsip besar |
| Rollback kode | extract paket/`client` versi sebelumnya dari `~/backups/` |
| Rollback database | ubah `DATABASE_URL` env cPanel ke database lama (masih utuh), lalu restart |
| Restore data | hanya untuk korupsi nyata dan atas keputusan owner |

Backup yang sudah ada (13 Sep 2026): `db-*.sql.gz`, `app-kost48-prod-*.tar.gz`, `client-*.tar.gz`, `htaccess-*.bak`, `node-selector.json-*.bak`, semuanya di `~/backups/`.

## 10. Jebakan yang sudah terbukti (jangan diulang)

1. **`.env` tidak mengalahkan env cPanel** — gejala: skema baru ada, app tetap pakai DB lama. Ubah lewat cPanel.
2. **Database yang dibuat lewat phpPgAdmin tidak terdaftar di cPanel** → tidak mendapat aturan `pg_hba` → selalu `no pg_hba.conf entry`. Buat database lewat cPanel → PostgreSQL Databases, lalu assign user lewat **Add User To Database**.
3. **`uapi NodeJS` tidak terpasang** di server ini → tidak ada API resmi untuk env var app.
4. **`node` bukan bagian dari PATH sesi SSH** → pakai path venv lengkap (`~/nodevenv/kost48-prod/22/bin/node`).
5. **`psql` tidak otomatis punya akses** → kredensial ada di `.env` app.
6. **`psql` menolak query `?schema=public`** pada URI (Prisma yang memahaminya).
7. **Secret pernah tersimpan terbaca di `public_html/.htaccess`** (`JWT_SECRET`, `DATABASE_URL` termasuk password, PIN). **20 Sep 2026:** password DB + JWT dirotasi; kedua `SetEnv DATABASE_URL`/`JWT_SECRET` dihapus (`grep -c` = 0), sesuai laporan owner. Status penggantian PIN masih menunggu konfirmasi (§11).
8. **`_prisma_migrations` tidak ada** → dilarang memakai Prisma CLI untuk patch.
9. **Proses Passenger bisa menumpuk (overlap).** Saat observasi 13 Sep: sesaat setelah restart terlihat 1 proses, lalu **2 proses hidup bersamaan** (`lsnode` lama tidak langsung mati; RSS ±170–200 MB masing-masing). Ini menjawab sebagian pertanyaan M19 §9.2 soal overlap restart: **overlap nyata terjadi**, sehingga anggaran RAM harus mengasumsikan kemungkinan dua proses. Bila LVE ketat, periksa jumlah proses di cPanel dan pertimbangkan restart aplikasi penuh, bukan hanya `kill -TERM` satu PID.
10. **HTTPS di depan domain memakai challenge anti-bot (15 Sep).** `curl`/`fetch` polos dari luar (PowerShell `Invoke-WebRequest`, `node fetch`) menerima halaman "One moment, please… / Please wait while your request is being verified…" alih-alih `version.json` atau `index.html` — bukan outage, dan browser sungguhan lolos otomatis. Konsekuensi: **smoke test aset dari luar harus memakai browser** (atau dijalankan dari dalam server seperti `smoke-production.sh`), dan jangan menyimpulkan "situs rusak" dari fetch polos.
11. **SSH bisa tidak terjangkau dari IP workstation (15 Sep; pulih setelah owner membuka akses).** Percobaan deploy menemukan port 4422 (dan 22, 222, 2222, 2022, 2200, 8022, 65002, 21) **timeout**, sementara 443 terbuka dan SSH ke host lain normal → indikasi firewall/IP allowlist host. Setelah owner mengaktifkan akses, port 4422 kembali normal dan deploy `client/` berjalan (16 Sep WIB). Bila terulang: minta IP publik workstation ditambahkan di cPanel/support, atau konfirmasi port SSH terbaru sebelum sesi deploy berikutnya.

12. **JWT_SECRET placeholder di `.env` = app tidak boot.** Pesan `JWT_SECRET production must be a strong random key (≥32 chars)`. Pastikan nilai asli di `.env`, bukan template `ganti-dengan-secret-acak-kuat-min-32-char`.
13. **Edit `.env` dengan `sed` bisa gagal senyap** bila password mengandung karakter khusus (mis. `%`, `#`). Pakai `awk` untuk rewrite seluruh baris `KEY="..."` atau `nano` untuk nilai dengan simbol; bandingkan `md5sum` sebelum dan sesudah hanya di server, tanpa mencatat nilainya di dokumen.
14. **Setelah kill Passenger (`kill -TERM`), app TIDAK selalu auto-revive.** Bila `curl` balas 503, restart via cPanel → Setup Node.js App → tombol Restart, atau trigger beberapa kali dengan `curl`. Cek `stderr.log` untuk error boot.

Catatan 12–14 berasal dari laporan operasional owner pada 20 Sep 2026; tidak diuji ulang pada pembaruan dokumentasi ini.

## 11. Sisa pekerjaan owner (urutan disarankan)

**Status 20 Sep 2026:** penyelesaian di bawah mengikuti laporan owner; item tanpa konfirmasi tetap terbuka.

- [ ] **Ganti PIN owner** — belum dikonfirmasi.
- [ ] **Siapkan 4 data onboarding:**
   - bulan + hari masuk 13 penghuni (formulir sudah memuatnya, konsisten dengan spreadsheet owner),
   - 13 angka meter listrik awal (kWh) hasil cek fisik,
   - total kas + saldo bank riil per tanggal cutover (untuk opening balance),
   - deposit per penghuni (data owner hanya menyebut Ade Chandra/kamar D Rp200.000; sisanya "Tidak Deposit").
- [ ] **Isi saldo awal** di menu Akuntansi (model yang dipilih: rekap sederhana + penagihan mulai siklus berjalan).
- [ ] **Buat hunian (check-in) 13 kamar** + verifikasi KTP — ingat gate KTP aktif, kamar tidak bisa diaktifkan tanpa KTP terverifikasi.
- [ ] **Pasang cron AutoOps** di cPanel (§8).
- [x] **Rotasi `JWT_SECRET` + password database** — selesai 20 Sep 2026; `.env` diperbarui.
- [x] **Hapus secret dari `.htaccess`** — `SetEnv DATABASE_URL`/`JWT_SECRET` dihapus; `grep -c` = 0, 20 Sep 2026.
- [ ] **Ganti password OWNER** — belum dikonfirmasi.
- [ ] **Ganti password 13 akun tenant** — belum dikonfirmasi; penghapusan file password tidak membuktikan penggantian password akun.
- [x] **Hapus file password tenant sementara** `~/TENANT-PASSWORD-AWAL-BACA-LALU-HAPUS.txt` — selesai 20 Sep 2026; status file password OWNER terpisah belum dikonfirmasi.
- [x] **Bersihkan sisa aplikasi lama** — `~/kost48v3`, `~/kost48surabaya`, 5 tgz staging lama, 3 folder `client-old-*`, `sql/seed.sql` + `sql/seed_ORIGINAL.sql` dihapus 20 Sep 2026. `~/backups` dan `~/lui` dipertahankan.
- [ ] **Tanyakan versi PostgreSQL** ke IDwebhost.

## 12. Data yang sudah disiapkan owner tetapi **belum** dimasukkan

- **Sewa yang disepakati berbeda dari tarif katalog** untuk 11 dari 13 kamar. Angka ini dipakai lewat `Stay.agreedRentAmountRupiah` saat check-in, **bukan** dengan mengubah `Room.monthlyRateRupiah` (M18: tarif bulanan adalah satu-satunya sumber kebenaran harga publik dan semua term turunannya).

| Kamar | Tarif katalog | Sewa disepakati |
|---|---|---|
| A | 1.700.000 | 1.700.000 |
| B | 1.700.000 | 1.500.000 |
| C | 1.700.000 | 1.600.000 |
| D | 1.600.000 | 1.500.000 |
| F1 | 1.750.000 | 1.700.000 |
| F2 | 1.750.000 | 1.600.000 |
| G/H/I | 850.000 | 800.000 |
| J | 1.600.000 | 1.500.000 |
| K/L | 1.800.000 | 1.600.000 |
| M | 1.400.000 | 1.200.000 |

- GUNAWAN (F1) masih tercatat sebagai tenant tanpa akun portal; sheet owner tidak memuat namanya di kamar F1 → perlu keputusan sebelum membuat hunian.
- Kamar C berstatus `AVAILABLE` di katalog publik (bukan hasil sesi ini) — bila tidak sesuai kenyataan, ubah lewat `/okupansi`.

## 13. Perkakas sesi yang tersimpan di repo

| Berkas | Kegunaan |
|---|---|
| `scripts/ssh-kost48.ps1` | jalankan satu perintah SSH ke produksi |
| `scripts/ssh-kost48-script.ps1` | kirim skrip bash panjang (base64) ke server — bebas masalah quoting |
| `scripts/remote/*.sh` | skrip recon, backup, bootstrap DB, extract paket, restart, smoke test, seed tenant/OWNER, seed akuntansi, verifikasi halaman |
| `scripts/make-deploy.mjs` | generator paket deploy (kini mengeluarkan `sql/seed.sql` dari paket) |
| `frontend/src/pages/public/OkupansiPage.tsx` · `CekPage.tsx` | halaman `/okupansi` dan `/cek` |

Kunci SSH privat **tidak** disimpan di repo (`%TEMP%\kost48ssh` di workstation). Jangan pernah menaruh kredensial di dalam skrip ini.

---

## 14. Riwayat singkat deployment ini

Lihat [M13](../M13_CHANGELOG.md) entri **2026-09-13** untuk kronologi lengkap (backup → bootstrap DB baru → extract paket → perbaikan env cPanel → seed OWNER/tenant/akuntansi → penerbitan halaman operasional).

---

> **Migrasi batch B9 (23 September 2026):** bagian data produksi `docs/M11_DEFAULT_DATA.md` di-append ke file ini tanpa menulis ulang isinya; hanya tautan relatif yang disesuaikan dengan basis folder tujuan. Bagian yang ditambahkan: § Status penggunaan data untuk go-live, §1c Data Tenant Produksi (GO-LIVE), §1b Akun Audit UAT (aktor/fixture), §7 Data Tenant Produksi per kamar, §3a Data Lapangan Produksi Owner, §7b Data Audit Fasilitas Lapangan, dan §8 DeepSeek AI — API Key & Konfigurasi.
>
> **Batas lingkungan (eksplisit):** bagian-bagian di bawah adalah **PRODUKSI / GO-LIVE** — data penghuni nyata, ground truth lapangan, audit fasilitas, dan konfigurasi AI produksi. Materi DEV ada di [Default & Seed DEV](default-dev.md); audit UAT non-personal mengikuti [audit AO-03](../audit/audit-uiux-lintas-portal-2026-07.md#ao-03--p1--kredensial-dan-data-uat-tidak-mendukung-audit-lintas-role). Nilai secret/PII **tidak digandakan** dari file lain: API key tetap ditulis sebagai lokasi, bukan nilainya.

<a id="status-penggunaan-data-untuk-go-live"></a>
<a id="1c-data-tenant-produksi-go-live"></a>
<a id="7-data-tenant-produksi--skenario-per-kamar"></a>
<a id="3a-data-lapangan-produksi-owner--belum-otomatis-masuk-db"></a>
<a id="7b-data-audit-fasilitas-lapangan"></a>
<a id="8-deepseek-ai--api-key--konfigurasi"></a>

## 15. Status penggunaan data untuk go-live (produksi)
- Go-live pertama menggunakan database produksi baru/kosong. **Jangan menjalankan seed tenant/transaksi historis atau menyalin data UAT** hanya karena data tersebut tercantum di dokumen ini.
- Tabel penghuni dan data lapangan adalah referensi onboarding yang wajib dikonfirmasi ulang owner pada hari input. Input penghuni nyata dilakukan melalui UI/runbook terlindungi, setelah KTP dan dasar akuntansi siap.
- NIK, foto KTP, password, token, dan kredensial lain adalah data sensitif. Jangan salin ke paket deploy, log, screenshot, atau artefak publik. Lihat `DEPLOYMENT_ONLINE_20260723.md` dan runbook onboarding untuk jalur produksi.

### 1c. Data Tenant Produksi (GO-LIVE)

> **Batas:** §1b menyiapkan aktor/fixture **UAT non-produksi**; password berasal dari environment proses/secret manager dan tidak ditulis di docs. Data penghuni nyata di §1c dan §7 hanya masuk lewat UI/runbook produksi.


**Sumber data:** Owner KOST48, 2026-07. NIK (KTP) sudah diverifikasi.
Email & HP placeholder — akan dilengkapi via **UI Owner → Manajemen Tenant** sebelum aktivasi portal.

| Kamar | Nama                   | NIK                 | Tgl Masuk | Tarif Kontrak/bln | Deposit     | Keterangan               |
|-------|------------------------|---------------------|-----------|-------------------|-------------|--------------------------|
| A     | Shinta Larista         | 3574036206990003    | 26        | 1.700.000         | —           | DELUXE Mezzanine, AC     |
| B     | Dini Widiastutik       | 3275085012800021    | 1         | 1.500.000         | —           | DELUXE, AC               |
| C     | Miko Rakatama A. W.    | 6471051708970006    | 28        | 1.600.000         | —           | DELUXE, AC               |
| D     | Ade Chandra            | 3173052309720009    | 24        | 1.500.000         | 200.000     | DELUXE, AC               |
| F1    | GUNAWAN                | 1505062511740001    | 27        | 1.700.000         | —           | DELUXE Mezzanine, AC     |
| F2    | Patrick Wilfred        | 3275020504910019    | 8         | 1.600.000         | —           | DELUXE Mezzanine, AC     |
| G     | Yofi Nurkolifah        | 3519122204030003    | 1         | 800.000           | —           | ECONOMY, Kipas            |
| H     | Welly Tanoto           | 3578070811730004    | 10        | 800.000           | —           | ECONOMY, Kipas            |
| I     | Theo Wijaya            | 3571021308860003    | 5         | 800.000           | —           | ECONOMY, Kipas            |
| J     | Lovandra               | 3175070312930003    | 30        | 1.500.000         | —           | DELUXE, AC               |
| K     | Meliana Tamara         | 3578125102000002    | 10        | 1.600.000         | —           | DELUXE, LARGE, AC        |
| L     | Destarika Hasan        | 1671065812020008    | 1         | 1.600.000         | —           | DELUXE, LARGE, AC        |
| M     | Gabriel Excelly P.     | 3511115908030001    | 3         | 1.200.000         | —           | STANDARD, LARGE, Kipas   |

> **Catatan:** `Tgl Masuk` = tanggal hari (bulan bervariasi per tenant — akan dilengkapi via UI).
> **Deposit:** Hanya Ade Chandra (Kamar D) Rp200.000. Sisanya tidak ada deposit.
> **Email & HP tenant** belum tersedia — input via UI Owner sebelum aktivasi portal penghuni.

---
## 7. Data Tenant Produksi — Skenario per Kamar

Data real dari owner. Seed via `seed-prod.js`. Tgl Masuk = tanggal hari (bulan menyusul — akan dilengkapi via UI Owner).

| Kamar | Nama                   | NIK                 | Tgl Msk | Tarif Kontrak | Deposit  | Gender | Keterangan                     |
|-------|------------------------|---------------------|---------|---------------|----------|--------|--------------------------------|
| A     | Shinta Larista         | 3574036206990003    | 26      | 1.700.000     | —        | F      | DELUXE Mezzanine, AC           |
| B     | Dini Widiastutik       | 3275085012800021    | 1       | 1.500.000     | —        | F      | DELUXE, AC                     |
| C     | Miko Rakatama A. W.    | 6471051708970006    | 28      | 1.600.000     | —        | M      | DELUXE, AC                     |
| D     | Ade Chandra            | 3173052309720009    | 24      | 1.500.000     | 200.000  | M      | DELUXE, AC                     |
| F1    | GUNAWAN                | 1505062511740001    | 27      | 1.700.000     | —        | M      | DELUXE Mezzanine, AC           |
| F2    | Patrick Wilfred        | 3275020504910019    | 8       | 1.600.000     | —        | M      | DELUXE Mezzanine, AC           |
| G     | Yofi Nurkolifah        | 3519122204030003    | 1       | 800.000       | —        | F      | ECONOMY, Kipas                 |
| H     | Welly Tanoto           | 3578070811730004    | 10      | 800.000       | —        | M      | ECONOMY, Kipas                 |
| I     | Theo Wijaya            | 3571021308860003    | 5       | 800.000       | —        | M      | ECONOMY, Kipas                 |
| J     | Lovandra               | 3175070312930003    | 30      | 1.500.000     | —        | M?     | DELUXE, AC                     |
| K     | Meliana Tamara         | 3578125102000002    | 10      | 1.600.000     | —        | F      | DELUXE LARGE, AC               |
| L     | Destarika Hasan        | 1671065812020008    | 1       | 1.600.000     | —        | F      | DELUXE LARGE, AC               |
| M     | Gabriel Excelly P.     | 3511115908030001    | 3       | 1.200.000     | —        | F?     | STANDARD LARGE, Kipas          |

> **Catatan:**
> - Gender `?` = perlu konfirmasi owner.
> - Email/HP/occupation → input via UI Owner.
> - **Deposit:** Hanya Ade Chandra (Kamar D) Rp200.000. Sisanya tidak ada deposit.
> - Data tanggal check-in (Tgl Msk) hanya hari; bulan menyesuaikan realitas masing-masing tenant.

---

### 3a. Data Lapangan Produksi Owner — Belum Otomatis Masuk DB


### 3a. Data Lapangan Produksi Owner — Belum Otomatis Masuk DB

Sumber: konfirmasi owner 2026-07-08. Data ini adalah ground truth lapangan awal, tetapi **belum boleh dianggap sudah ada di database produksi** sampai diinput lewat UI/seed/runbook. Jangan masukkan full NIK, foto KTP, password jaringan, token, atau API key ke repo.

**✅ Status NIK per 2026-07: Semua 13 tenant sudah punya NIK lengkap.**
- Dini Widiastutik (Kamar B) ✅ NIK 3275085012800021 — data lengkap, tinggal upload foto KTP via UI
- Theo Wijaya (Kamar I) — nama tampil di sistem; NIK atas nama **Agus Settiyo Budi** ✅ 3571021308860003 — data lengkap

| Area | Data owner-confirmed | Status DB/aplikasi | Target input |
|------|----------------------|--------------------|--------------|
| Kamar F3/F4 | FINAL (owner 2026-07-08): TIDAK ADA — blok F dirombak menjadi F1+F2 | Tidak dibuat di master `Room`; total kamar tetap 13 | — |
| Lampu area bersama | 7 titik: depan poster, teras depan, dapur, lorong, pojok lorong, depan KM belakang, lorong belakang | BELUM jadi inventory/aset | `InventoryItem`/`FixedAsset` bila ingin dilacak, atau checklist operasional |
| CCTV area bersama | 5 titik: depan 2, depan dapur 1, area depan KM belakang 1, lorong belakang 1 | BELUM jadi inventory/aset; wajib review privasi angle kamera | `InventoryItem`/`FixedAsset`; dokumen notice CCTV |
| Bola pemadam api/APAR | Rencana 3-5 titik | BELUM dibeli/dipasang/final | `InventoryItem`/`FixedAsset` + checklist emergency |
| Kamar mandi dalam | F1 closet jongkok; kamar mandi dalam lain closet duduk | BELUM detail per room item | `RoomFacility` + `RoomItem` per kamar |
| Kamar mandi luar | 2 unit: satu closet duduk, satu khusus mandi; bak air plastik besar; tidak ada shower | BELUM ada model khusus area bersama | Checklist operasional; dapat dicatat sebagai facility umum/manual |
| Dapur outdoor | Kran ada, tempat sampah ada, rak piring tidak ada, ventilasi tidak perlu, kompor/selang/regulator/tabung LPG ada | BELUM jadi inventory/aset lengkap | `InventoryItem`/`FixedAsset` untuk kompor/LPG; checklist gas |
| Jemuran bersama | 1 jemuran besar area kamar belakang | BELUM jadi inventory/aset | `InventoryItem` bila perlu dilacak |
| Anak kunci | Perlu daftar master/cadangan per kamar | BELUM diinput | Checklist audit kelengkapan data kamar; catatan room/stay |
| Garansi barang | Jika ada: AC, router, pompa, CCTV, kasur | BELUM terstruktur | `FixedAsset.notes` atau dokumen operasional |
| Foto audit kondisi kamar saat ini | Perlu foto audit setiap kamar sebelum input data produksi | BELUM dibuat | Upload/file operasional; jangan simpan foto mentah di repo |
| Materi cetak | Nomor darurat, emergency flow, denah evakuasi, notice CCTV, aturan penghuni, checklist kamar/fasilitas | BELUM dibuat | Dokumen cetak + portal/manual tenant bila relevan |

Kebijakan owner terkait kerusakan:

- Kerusakan normal/aus/bocor/lampu mati/AC bermasalah/fasilitas mulai tidak layak: owner/staff memperbaiki atau mengganti.
- Kerusakan sengaja, salah pakai berat, kehilangan barang/kunci, atau pelanggaran aturan: direview sebagai tanggung jawab tenant.
- Kondisi kamar saat audit produksi sebaiknya difoto sebagai baseline data yang adil.
## 7b. Data Audit Fasilitas Lapangan

> **Status:** Template siap diisi. Data dikumpulkan owner saat audit keliling.
> Kolom `Kondisi` & `Catatan` diisi manual — hasil audit lapangan.
>
> **Audit 2026-07 — Kondisi umum SEMUA KAMAR:**
> - KM dalam: closet standar duduk + jet shower + shower ✅ kondisi prima
> - Ember & gayung: ✅ ada
> - **Gantungan baju**: ✅ ada di setiap kamar & kamar mandi
> - **Tempat sabun**: ✅ ada di setiap kamar mandi
> - Kunci pintu & jendela: ✅ aman, semua ok
> - Plafond & tembok: ✅ baik, beberapa sudah cat ulang
> - Semua yg ada kasur: ✅ ada sprei
> - **Kamar B: kasur kosong** (tenant tidak mau)

### Per Kamar (13 kamar: A–D, F1–F2, G–M)

| Kamar | Item | Ada? | Kondisi | Catatan |
|-------|------|------|---------|---------|
| **A** | Lampu kamar | ✅ | baik | |
| | AC Midea | ✅ | baik, remote ada | |
| | Kasur | ukuran 160 | | |
| | Lemari plastik kecil | ✅ | | |
| | Meja | — | tdk ada | |
| | Sprei | ✅ ada | | |
| | Bantal | ✅ ada | | |
| | Tempat sampah | ✅ ada | | |
| | Kloset Toto duduk + jet shower + shower | ✅ | ✅ prima | |
| | Meter listrik awal | | | |
| **B** | Lampu kamar | ✅ | baik | |
| | AC Midea | ✅ | baik, remote ada | |
| | Kasur | **kosong** | | tenant tidak mau |
| | Lemari | — | tdk ada | |
| | Meja | — | tdk ada | |
| | Sprei | — | | tdk ada kasur |
| | Bantal | — | | |
| | Tempat sampah | ✅ ada | | |
| | Kloset Toto duduk + jet shower + shower | ✅ | ✅ prima | |
| | Meter listrik awal | | | |
| **C** | Lampu kamar | ✅ | baik | |
| | AC Akari | ✅ | baik, remote ada | |
| | Kasur | ukuran 120 | | |
| | Lemari plastik | ✅ | | |
| | Meja | — | tdk ada | |
| | Sprei | ✅ ada | | |
| | Bantal | ✅ ada | | |
| | Guling | ✅ ada | | inventaris? |
| | Tempat sampah | ✅ ada | | |
| | Kloset Toto duduk + jet shower + shower | ✅ | ✅ prima | |
| | Meter listrik awal | | | |
| **D** | Lampu kamar | ✅ | baik | |
| | AC Sharp | ✅ | baik, remote ada | |
| | Kasur | ukuran 140 | | |
| | Lemari | ✅ | tipe? | |
| | Meja | — | tdk ada | |
| | Sprei | ✅ ada | | |
| | Bantal | ✅ ada | | |
| | Tempat sampah | ✅ ada | | |
| | Kloset American Standard duduk + jet shower + shower | ✅ | ✅ prima | |
| | Meter listrik awal | | | |
| **F1** | Lampu kamar | ✅ | baik | |
| | AC Daikin | ✅ | baik, remote ada | |
| | Kasur | **2 unit ukuran 90** | | |
| | Lemari triplek besar | ✅ | | |
| | Meja | — | tdk ada | |
| | Sprei | ✅ ada | | |
| | Bantal | ✅ ada | | |
| | Guling | ✅ ada | | inventaris? |
| | Tempat sampah | ✅ ada | | |
| | Kloset American Standard **jongkok** + jet shower + shower | ✅ | ✅ prima | |
| | Meter listrik awal | | | |
| **F2** | Lampu kamar | ✅ | baik | |
| | AC Samsung | ✅ | baik, remote ada | |
| | Kasur | ukuran 90 | | |
| | Lemari plastik | ✅ | | |
| | Meja | — | tdk ada | |
| | Sprei | ✅ ada | | |
| | Bantal | ✅ ada | | |
| | Tempat sampah | ✅ ada | | |
| | Kloset DBS duduk + jet shower + shower | ✅ | ✅ prima | |
| | Meter listrik awal | | | |
| **G** | Lampu kamar | ✅ | baik | |
| | Kipas | **1 unit** | | |
| | KM Luar bersama | — | | |
| | Kasur | **belum diaudit** | | |
| | Lemari | **belum diaudit** | | |
| | Meja | — | tdk ada | |
| | Tempat sampah | ✅ ada | | |
| | Meter listrik awal | | | |
| **H** | Lampu kamar | ✅ | baik | |
| | Kipas | **1 unit** | | |
| | KM Luar bersama | — | | |
| | Kasur | **belum diaudit** | | |
| | Lemari | **belum diaudit** | | |
| | Meja | — | tdk ada | |
| | Tempat sampah | ✅ ada | | |
| | Meter listrik awal | | | |
| **I** | Lampu kamar | ✅ | baik | |
| | Kipas | **1 unit** | | |
| | KM Luar bersama | — | | |
| | Kasur | ukuran 140 | | |
| | Lemari plastik | ✅ | | |
| | Meja belajar | ✅ | | |
| | Sprei | ✅ ada | | |
| | Bantal | ✅ ada | | |
| | Guling | ✅ ada | | inventaris? |
| | Tempat sampah | ✅ ada | | |
| | Meter listrik awal | | | |
| **J** | Lampu kamar | ✅ | baik | |
| | AC LG AV-A5UCY | ✅ | baik, remote ada | |
| | Kasur | **Springbed ukuran 160** | | |
| | Lemari plastik | ✅ | | |
| | Meja | — | tdk ada | |
| | Sprei | ✅ ada | | |
| | Bantal | ✅ ada | | |
| | Guling | ✅ ada | | inventaris? |
| | Tempat sampah | ✅ ada | | |
| | Kloset Toto duduk + jet shower + shower | ✅ | ✅ prima | |
| | Meter listrik awal | | | |
| **K** | Lampu kamar | ✅ | baik | |
| | AC LG AV-A5UCY | ✅ | baik, remote ada | |
| | Kasur | **Springbed ukuran 180** | | |
| | Lemari | **belum diaudit** | | |
| | Meja | — | tdk ada | |
| | Sprei | ✅ ada | | |
| | Bantal | ✅ ada | | |
| | Tempat sampah | ✅ ada | | |
| | Kloset Toto duduk + jet shower + shower | ✅ | ✅ prima | |
| | Meter listrik awal | | | |
| **L** | Lampu kamar | ✅ | baik | |
| | AC Aqua | ✅ | baik, remote ada | |
| | Kasur | **Springbed ukuran 180** | | |
| | Lemari | ✅ | | |
| | Meja belajar | ✅ | | |
| | Sprei | ✅ ada | | |
| | Bantal | ✅ ada | | |
| | Tempat sampah | ✅ ada | | |
| | Kloset Toto duduk + jet shower + shower | ✅ | ✅ prima | |
| | Meter listrik awal | | | |
| **M** | Lampu kamar | ✅ | baik | |
| | Kipas | **2 unit** | | |
| | KM dalam | — | | |
| | Kasur | **Springbed ukuran 160** | | |
| | Lemari plastik | ✅ | | |
| | Meja | — | tdk ada | |
| | Sprei | ✅ ada | | |
| | Bantal | ✅ ada | | |
| | Guling | ✅ ada | | inventaris? |
| | Tempat sampah | ✅ ada | | |
| | Kloset Toto duduk + jet shower + shower | ✅ | ✅ prima | |
| | Meter listrik awal | | | |

### Area Bersama

| Area | Item | Ada? | Kondisi | Catatan |
|------|------|------|---------|---------|
| **Lampu** | Depan poster | 1 | | |
| | Teras depan | 1 | | |
| | Dapur | 1 | | |
| | Lorong | 1 | | |
| | Pojok lorong | 1 | | |
| | Depan KM belakang | 1 | | |
| | Lorong belakang | 1 | | |
| **CCTV** | Depan (2) | 2 | | |
| | Depan dapur | 1 | | |
| | Area depan KM belakang | 1 | | |
| | Lorong belakang | 1 | | |
| **KM Luar** | Closet duduk | 1 | | |
| | Khusus mandi | 1 | | |
| | Bak plastik besar | 2 | | |
| | Ember & gayung | ✅ ada | ✅ prima | |
| | Gantungan baju | ✅ ada | | |
| | Tempat sabun | ✅ ada | | |
| **Dapur** | Kompor + LPG | | | |
| | Kran | | | |
| | Tempat sampah | | | |
| **Lain** | Tandon air | | | |
| | Pompa air | | | |
| | Jemuran besar | | | |
| | APAR/ pemadam | rencana 3-5 | | |
| | Anak kunci cadangan | | | |
| | Kunci pintu & jendela (semua kamar) | ✅ | ✅ aman | |
| | Plafond & tembok | ✅ | ✅ baik, cat ulang | |

> **Data yang masih perlu dilengkapi audit lanjutan:**
> - Ukuran kamar & KM P×L×T — belum diukur
> - Model/PK/watt/serial/tahun AC — via foto label
> - Merek, model, watt kipas — belum dicatat
> - Kasur & lemari G, H — belum diaudit
> - Lemari K — belum diaudit
> - Tipe/bahan lemari D — belum spesifik
> - Jumlah bantal per kamar — inventaris KOST48
> - Jumlah sikat per KM (sikat lantai & kloset) — inventaris KOST48
> - Kepastian guling inventaris (C, F1, I, J, M)
> - **Gudang** — belum diaudit
> - **Ruang umum** — belum diaudit
> - Referensi lengkap: `docs/archieve/AUDIT_INVENTARIS_LENGKAP.md`

## 8. DeepSeek AI — API Key & Konfigurasi


| Item | Nilai | Lokasi |
|------|-------|--------|
| API Key | `sk-...` (dari platform.deepseek.com) | `backend/.env` `DEEPSEEK_API_KEY=` atau Settings → AI & Biaya (OWNER) |
| Model default | `deepseek-chat` | `backend/.env` `DEEPSEEK_MODEL=` |
| Base URL | `https://api.deepseek.com` | `backend/.env` `DEEPSEEK_BASE_URL=` (fallback) |
| Status | ✅ Terverifikasi | `POST /owner-ai/test-connection` — latency ~1.2s, 18 token |

**Cara pakai:**
1. Daftar di https://platform.deepseek.com → buat API key
2. Tempel di `backend/.env`: `DEEPSEEK_API_KEY=sk-xxx`
3. Atau login OWNER → **Pengaturan → AI & Biaya** → isi key → Simpan (langsung aktif, tanpa restart)
4. Klik **"Tes Koneksi DeepSeek"** untuk verifikasi

> API key dari Settings (DB) lebih aman karena tidak tersimpan di file .env yang bisa ke-commit.
> Env `DEEPSEEK_API_KEY` tetap jadi fallback bila Settings kosong.
