# KOST48 — M20: Produksi & Operasional Harian (Shared Hosting)

> **Dokumen kerja untuk produksi.** Dibuat **13 September 2026** setelah deployment nyata ke shared hosting IDwebhost.
> Runbook kanonik tetap [M08](M08_DEPLOY_GO_LIVE.md); lembar kerja langkah-per-langkah [GO_LIVE_CPANEL_CHECKLIST](GO_LIVE_CPANEL_CHECKLIST.md); spesifikasi efisiensi host [M19](M19_EFISIENSI_HOSTING_512MB.md); checklist & urutan task [M12](M12_CHECKLIST_CHANGELOG.md).
> **Aturan dokumen ini:** jangan pernah menuliskan password, token, PIN, atau NIK penghuni di sini. Sebut lokasi/statusnya saja.

---

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
7. **Secret tersimpan terbaca di `public_html/.htaccess`** (`JWT_SECRET`, `DATABASE_URL` termasuk password, PIN). Ini harus dirotasi dan baris `SetEnv` rahasia dihapus.
8. **`_prisma_migrations` tidak ada** → dilarang memakai Prisma CLI untuk patch.
9. **Proses Passenger bisa menumpuk (overlap).** Saat observasi 13 Sep: sesaat setelah restart terlihat 1 proses, lalu **2 proses hidup bersamaan** (`lsnode` lama tidak langsung mati; RSS ±170–200 MB masing-masing). Ini menjawab sebagian pertanyaan M19 §9.2 soal overlap restart: **overlap nyata terjadi**, sehingga anggaran RAM harus mengasumsikan kemungkinan dua proses. Bila LVE ketat, periksa jumlah proses di cPanel dan pertimbangkan restart aplikasi penuh, bukan hanya `kill -TERM` satu PID.
10. **HTTPS di depan domain memakai challenge anti-bot (15 Sep).** `curl`/`fetch` polos dari luar (PowerShell `Invoke-WebRequest`, `node fetch`) menerima halaman "One moment, please… / Please wait while your request is being verified…" alih-alih `version.json` atau `index.html` — bukan outage, dan browser sungguhan lolos otomatis. Konsekuensi: **smoke test aset dari luar harus memakai browser** (atau dijalankan dari dalam server seperti `smoke-production.sh`), dan jangan menyimpulkan "situs rusak" dari fetch polos.
11. **SSH bisa tidak terjangkau dari IP workstation (15 Sep; pulih setelah owner membuka akses).** Percobaan deploy menemukan port 4422 (dan 22, 222, 2222, 2022, 2200, 8022, 65002, 21) **timeout**, sementara 443 terbuka dan SSH ke host lain normal → indikasi firewall/IP allowlist host. Setelah owner mengaktifkan akses, port 4422 kembali normal dan deploy `client/` berjalan (16 Sep WIB). Bila terulang: minta IP publik workstation ditambahkan di cPanel/support, atau konfirmasi port SSH terbaru sebelum sesi deploy berikutnya.

## 11. Sisa pekerjaan owner (urutan disarankan)

1. **Ganti PIN owner** (murah, cepat, mengurangi risiko paling langsung).
2. **Siapkan 4 data onboarding:**
   - bulan + hari masuk 13 penghuni (formulir sudah memuatnya, konsisten dengan spreadsheet owner),
   - 13 angka meter listrik awal (kWh) hasil cek fisik,
   - total kas + saldo bank riil per tanggal cutover (untuk opening balance),
   - deposit per penghuni (data owner hanya menyebut Ade Chandra/kamar D Rp200.000; sisanya "Tidak Deposit").
3. **Isi saldo awal** di menu Akuntansi (model yang dipilih: rekap sederhana + penagihan mulai siklus berjalan).
4. **Buat hunian (check-in) 13 kamar** + verifikasi KTP — ingat gate KTP aktif, kamar tidak bisa diaktifkan tanpa KTP terverifikasi.
5. **Pasang cron AutoOps** di cPanel (§8).
6. **Rotasi `JWT_SECRET` + password database**, hapus secret dari `.htaccess`, ganti password OWNER & 13 akun tenant, lalu hapus file password sementara di home.
7. **Bersihkan sisa aplikasi lama** (`~/kost48v3`, `~/kost48surabaya`, arsip `*.tgz` lama, `sql/seed.sql` + `sql/seed_ORIGINAL.sql` di app root) setelah yakin tidak diperlukan.
8. **Tanyakan versi PostgreSQL** ke IDwebhost.

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

Lihat [M13](M13_CHANGELOG.md) entri **2026-09-13** untuk kronologi lengkap (backup → bootstrap DB baru → extract paket → perbaikan env cPanel → seed OWNER/tenant/akuntansi → penerbitan halaman operasional).
