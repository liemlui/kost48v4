# Produksi & Operasional Harian (Shared Hosting)

<!-- kotak-non-otoritatif -->
> **Catatan (2026-10-05, batch B4):** kotak `[ ]` di berkas ini adalah **langkah operasional**, bukan antrean tugas.
> Antrean resmi ada di `docs/ANTREAN.md` (menjadi `docs/ANTREAN.md` pada B5). Penanda ini dikenali gate dokumen (aturan R3).


> Migrasi dari docs/M20_PRODUKSI_KOST48.md (seluruh section §1-§14) pada f8f9a589 (DOC-GOV-20260922 Tahap 3).
> Sumber asli sudah dihapus di Fase 3 (23 Sep 2026); berkas ini kanonik.
> **Status:** aktif — runbook produksi & operasional harian; langkah di dalamnya operasional (bukan antrean tugas).

## Daftar isi

- [Bagian A — Akses server (SSH/scp)](#d4b-akses-ssh)
- [Bagian B — Backup & restore produksi](#d4b-backup)
- [Bagian C — Setup cPanel pertama kali](#d4b-cpanel)
- [Bagian D — Verifikasi gate KTP](#d4b-ktp)
- [Bagian E — Kapasitas RAM 512 MB](#d4b-kapasitas)
- [Bagian F — Harness verifikasi uang](#d4b-verifikasi)


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
| F1 | 1.700.000 | 1.700.000 |
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

Lihat [M13](../arsip/changelog-2026-09.md) entri **2026-09-13** untuk kronologi lengkap (backup → bootstrap DB baru → extract paket → perbaikan env cPanel → seed OWNER/tenant/akuntansi → penerbitan halaman operasional).

---

> **Migrasi batch B9 (23 September 2026):** bagian data produksi `docs/operations/default-dev.md` di-append ke file ini tanpa menulis ulang isinya; hanya tautan relatif yang disesuaikan dengan basis folder tujuan. Bagian yang ditambahkan: § Status penggunaan data untuk go-live, §1c Data Tenant Produksi (GO-LIVE), §1b Akun Audit UAT (aktor/fixture), §7 Data Tenant Produksi per kamar, §3a Data Lapangan Produksi Owner, §7b Data Audit Fasilitas Lapangan, dan §8 DeepSeek AI — API Key & Konfigurasi.
>
> **Batas lingkungan (eksplisit):** bagian-bagian di bawah adalah **PRODUKSI / GO-LIVE** — data penghuni nyata, ground truth lapangan, audit fasilitas, dan konfigurasi AI produksi. Materi DEV ada di [Default & Seed DEV](default-dev.md); audit UAT non-personal mengikuti [audit AO-03](../arsip/audit-uiux-lintas-portal-2026-07.md#ao-03--p1--kredensial-dan-data-uat-tidak-mendukung-audit-lintas-role). Nilai secret/PII **tidak digandakan** dari file lain: API key tetap ditulis sebagai lokasi, bukan nilainya.

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
- **Keputusan owner 2026-10-07 (`PII-DOC-TENANT`) — exception bertanggal:** blok data tenant (§16) dan data lapangan, termasuk NIK, **sengaja dipertahankan di dokumen ini** sebagai referensi onboarding. Ini **bukan** kelalaian dan **jangan dihapus atau diredaksi** oleh agen tanpa keputusan baru; aturan pada butir di atas tetap berlaku penuh. Yang perlu diketahui apa adanya: nilai ini **sudah berada di riwayat git**, sehingga meredaksi berkas tidak menghapus jejaknya — pembersihan riwayat adalah keputusan terpisah. Register: [KEPUTUSAN-OWNER](../KEPUTUSAN-OWNER.md) §6.

### 1c. Data Tenant Produksi (GO-LIVE)

> **Batas:** §1b menyiapkan aktor/fixture **UAT non-produksi**; password berasal dari environment proses/secret manager dan tidak ditulis di docs. Data penghuni nyata di §1c dan §7 hanya masuk lewat UI/runbook produksi.


**Sumber data:** Owner KOST48, 2026-07. NIK (KTP) sudah diverifikasi.
Email & HP placeholder — akan dilengkapi via **UI Owner → Manajemen Tenant** sebelum aktivasi portal.

| Kamar | Nama                   | NIK                 | Tgl Masuk | Tarif Kontrak/bln | Deposit     | Keterangan               |
|-------|------------------------|---------------------|-----------|-------------------|-------------|--------------------------|
| A     | Shinta Larista         | 3574036206990003    | 26        | 1.700.000         | —           | DELUXE Mezzanine, AC     |
| B     | Tenant Kamar B       | 3275085012800021    | 1         | 1.500.000         | —           | DELUXE, AC               |
| C     | Miko Rakatama A. W.    | 6471051708970006    | 28        | 1.600.000         | —           | DELUXE, AC               |
| D     | Ade Chandra            | 3173052309720009    | 24        | 1.500.000         | 200.000     | DELUXE, AC               |
| F1    | GUNAWAN                | 1505062511740001    | 27        | 1.700.000         | —           | DELUXE Mezzanine, AC     |
| F2    | Patrick Wilfred        | 3275020504910019    | 8         | 1.600.000         | —           | DELUXE Mezzanine, AC     |
| G     | Yofi Nurkolifah        | 3519122204030003    | 1         | 800.000           | —           | ECONOMY, Kipas            |
| H     | Welly Tanoto           | 3578070811730004    | 10        | 800.000           | —           | ECONOMY, Kipas            |
| I     | Tenant Kamar I            | 3571021308860003    | 5         | 800.000           | —           | ECONOMY, Kipas            |
| J     | Lovandra               | 3175070312930003    | 30        | 1.500.000         | —           | DELUXE, AC               |
| K     | Meliana Tamara         | 3578125102000002    | 10        | 1.600.000         | —           | DELUXE, LARGE, AC        |
| L     | Destarika Hasan        | 1671065812020008    | 1         | 1.600.000         | —           | DELUXE, LARGE, AC        |
| M     | Gabriel Excelly P.     | 3511115908030001    | 3         | 1.200.000         | —           | STANDARD, LARGE, Kipas   |

> **Catatan:** `Tgl Masuk` = tanggal hari (bulan bervariasi per tenant — akan dilengkapi via UI).
> **Deposit:** Hanya Ade Chandra (Kamar D) Rp200.000. Sisanya tidak ada deposit.
> **Email & HP tenant** belum tersedia — input via UI Owner sebelum aktivasi portal penghuni.

---
## 16. Data Tenant Produksi — Skenario per Kamar

Data real dari owner. Seed via `seed-prod.js`. Tgl Masuk = tanggal hari (bulan menyusul — akan dilengkapi via UI Owner).

| Kamar | Nama                   | NIK                 | Tgl Msk | Tarif Kontrak | Deposit  | Gender | Keterangan                     |
|-------|------------------------|---------------------|---------|---------------|----------|--------|--------------------------------|
| A     | Shinta Larista         | 3574036206990003    | 26      | 1.700.000     | —        | F      | DELUXE Mezzanine, AC           |
| B     | Tenant Kamar B       | 3275085012800021    | 1       | 1.500.000     | —        | F      | DELUXE, AC                     |
| C     | Miko Rakatama A. W.    | 6471051708970006    | 28      | 1.600.000     | —        | M      | DELUXE, AC                     |
| D     | Ade Chandra            | 3173052309720009    | 24      | 1.500.000     | 200.000  | M      | DELUXE, AC                     |
| F1    | GUNAWAN                | 1505062511740001    | 27      | 1.700.000     | —        | M      | DELUXE Mezzanine, AC           |
| F2    | Patrick Wilfred        | 3275020504910019    | 8       | 1.600.000     | —        | M      | DELUXE Mezzanine, AC           |
| G     | Yofi Nurkolifah        | 3519122204030003    | 1       | 800.000       | —        | F      | ECONOMY, Kipas                 |
| H     | Welly Tanoto           | 3578070811730004    | 10      | 800.000       | —        | M      | ECONOMY, Kipas                 |
| I     | Tenant Kamar I            | 3571021308860003    | 5       | 800.000       | —        | M      | ECONOMY, Kipas                 |
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

Sumber: konfirmasi owner 2026-07-08. Data ini adalah ground truth lapangan awal, tetapi **belum boleh dianggap sudah ada di database produksi** sampai diinput lewat UI/seed/runbook. Jangan masukkan full NIK, foto KTP, password jaringan, token, atau API key ke repo.

**✅ Status NIK per 2026-07: Semua 13 tenant sudah punya NIK lengkap.**
- Tenant Kamar B ✅ NIK ################ — data lengkap, tinggal upload foto KTP via UI
- Tenant Kamar I — nama tampil di sistem; NIK atas nama **pemilik KTP** ✅ ################ — data lengkap

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
## 17. Data Audit Fasilitas Lapangan

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
> - Referensi lengkap: `docs/arsip/legacy/AUDIT_INVENTARIS_LENGKAP.md`

## 18. DeepSeek AI — API Key & Konfigurasi


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


<a id="d4b-akses-ssh"></a>
## Bagian A — Akses server (SSH/scp)

> **Blok baca** · Jenis: **runbook akses** · Status: **aktif (potret 2026-10-18)** · **Jangan** dibaca kalau: pekerjaan hanya di repo lokal dan tidak menyentuh server · Untuk siapa: sesi/agen yang perlu masuk server produksi · Baca kalau: butuh SSH/scp, restart Passenger, recon, atau rollback rilis.

> **Berkas ini memuat _path_ kunci, bukan isinya.** Jangan pernah menyalin kunci privat, isi `.env`, password, token, NIK, atau data tenant ke dokumen, chat, atau log. Kunci privat tidak pernah ditulis di sini.

### 1. Identitas server (terverifikasi 2026-10-18)

| Butir | Nilai |
|---|---|
| Host SSH | `api.kost48surabaya.com` → `203.161.184.69` |
| Port | `4422` (bukan 22) |
| User | `kost48s1` |
| Home | `/home/kost48s1` · hostname `batikan.idweb.host` · shell `/bin/bash` |
| Host key (expect) | `ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIDz1LkMb1mMgLlipEYHW8utncxyVjZk9C5ZMagDxBzxQ` |
| Panel | cPanel (LiteSpeed + Passenger), akun shared hosting, RAM 512 MB |

Cocokkan host key sebelum mengetik apa pun: `ssh-keygen -F '[api.kost48surabaya.com]:4422' -f kost48-known_hosts`.

### 2. Autentikasi

- Wajib **publickey**. Password ada di server, tetapi **tidak boleh** diminta, ditulis, atau ditempel agen — termasuk di chat dan log.
- Kunci rilis: `.ssh-kost48/kost48_deploy` (ED25519, tanpa passphrase), fingerprint
  `SHA256:lFhZEwXqjUMrGQlzUc6rsJGmWJkDvErDNmgG4xLQabg`.
- Kunci publiknya terpasang di `~/.ssh/authorized_keys` (komentar `dsh-release-2026-10-18`).
  Panel cPanel → SSH Access **tidak** menampilkan kunci ini; yang tampil di sana (`dsh-deploy-kost48`)
  adalah kunci lain buatan cPanel yang tidak dipakai agen.
- **Kunci privat tidak boleh di-commit.** `.ssh-kost48/` dan `kost48-known_hosts` sudah masuk
  `.gitignore`; tetap jangan pakai `git add -A`.
- Kunci hilang/dicabut → minta owner memasang ulang kunci publik (cPanel SSH Access → Import Key,
  atau `printf '%s\n' '<baris publik>' >> ~/.ssh/authorized_keys` dari sesi PuTTY milik owner).
  Jangan meminta password, jangan membuat kunci baru tanpa izin.
- Kunci ini memberi shell penuh sebagai `kost48s1`. Cabut barisnya di `~/.ssh/authorized_keys`
  begitu tidak dipakai.

### 3. Perintah yang bekerja di mesin ini

Windows + sandbox DSH: `%USERPROFILE%\.ssh` tidak bisa ditulis, jadi `known_hosts` disimpan di repo.

```powershell
$ssh = "C:\WINDOWS\System32\OpenSSH\ssh.exe"
& $ssh -p 4422 -i .ssh-kost48\kost48_deploy -o IdentitiesOnly=yes -o BatchMode=yes `
  -o UserKnownHostsFile=kost48-known_hosts kost48s1@api.kost48surabaya.com 'whoami; hostname'
```

```powershell
$scp = "C:\WINDOWS\System32\OpenSSH\scp.exe"
& $scp -P 4422 -i .ssh-kost48\kost48_deploy -o IdentitiesOnly=yes `
  -o UserKnownHostsFile=kost48-known_hosts .\skrip.sh kost48s1@api.kost48surabaya.com:~/
```

- Perintah panjang: kirim sebagai berkas (`scp`), jalankan `ssh … 'bash ~/skrip.sh; rm -f ~/skrip.sh'`.
- **Jangan** menaruh `$()`, `|`, atau kutip ganda di dalam string perintah satu-baris: PowerShell membuang
  kutipnya lalu bash memecah perintah (pernah menghasilkan `syntax error near unexpected token` dan
  `command not found`). Berkas skrip menghindari seluruh kelas kesalahan ini.
- Heredoc di server: pakai `cat > ~/x.sh <<'EOF' … EOF` lalu `bash ~/x.sh`.

### 4. Peta server (potret 2026-10-18)

| Butir | Nilai |
|---|---|
| `APP_ROOT` | `/home/kost48s1/kost48-prod` — `dist/`, `client/`, `node_modules/`, `prisma/`, `sql/`, `scripts/`, `.env`, `uploads/`, `stderr.log`, `tmp/` |
| `PUBLIC_ROOT` | `/home/kost48s1/public_html` — `.htaccess` memuat `PassengerAppRoot` + `PassengerStartupFile dist/main.js`, Node `nodevenv/kost48-prod/22` |
| Paket | profil `combined`: frontend dilayani proses Nest yang sama (`VITE_API_BASE_URL=/api`, satu origin) |
| Restart | `mkdir -p /home/kost48s1/kost48-prod/tmp && touch /home/kost48s1/kost48-prod/tmp/restart.txt` |
| Log | `~/kost48-prod/stderr.log` · `~/access-logs/kost48surabaya.com-ssl_log` (jangan dump penuh) |
| Backup rilis | `~/backup-YYYYmmdd-HHMM-uiux/` (`dist`, `client`, `env.backup` mode 600, `package.json`) |

Rollback (hanya bila smoke gagal). **Cek path dulu**, baru hapus:

```bash
APP=/home/kost48s1/kost48-prod; BK=~/backup-20261018-0729-uiux
echo "APP=$APP"; ls -la "$APP" | head
rm -rf "$APP/dist" "$APP/client" && cp -a "$BK/dist" "$BK/client" "$APP/" && touch "$APP/tmp/restart.txt"
```

### 5. Larangan di server

Tanpa `npm install`/`npm ci`, build, `prisma generate`/`db push`, seed (`node scripts/seed-owner.js`),
atau migrasi. Tanpa menghentikan/menonaktifkan service lain. Tanpa menimpa `.env` dan `uploads/`.
Tanpa `cat` isi `.env`, `.bash_history`, atau `~/OWNER-PASSWORD-BACA-LALU-HAPUS.txt` — berkas itu **ada**,
dan isinya tidak boleh dibaca, disalin, atau ditampilkan. Jalur saja yang boleh dilaporkan.

### 6. Jebakan yang sudah terbukti

- RAM akun **512 MB**; satu proses app ≈ 185–207 MB. Build/npm di server berisiko OOM — paket dibuat di lokal.
- `/` setelah restart bisa **±20 detik** (cold start); panggilan berikutnya ±0,05 s. Satu request pertama
  tidak boleh dipakai menyimpulkan "down".
- `app.kost48surabaya.com` dan `api.kost48surabaya.com` **tidak** melayani aplikasi (`app./rooms` = 404,
  `app./` = halaman "Index of /"). Smoke hanya di `https://kost48surabaya.com`.
- `curl` HTTPS dari shell DSH gagal (`SEC_E_NO_CREDENTIALS`). Jalankan curl **di server**, bukan di workstation;
  kegagalan curl lokal bukan bukti situs mati.
- Monitor kualitas hosting memeriksa `api.kost48surabaya.com` (404 permanen). Alert uptime dari panel itu
  bukan bukti situs down — buktinya log akses (`200` dominan, `0 × 5xx` pada 18 Okt 2026).
- Ekstraksi arsip menimpa `dist/` + `client/` + `node_modules/`; `uploads/` dan `.env` tidak ada di dalam arsip,
  jadi aman. Tetap backup dulu.

### 7. Jejak akses terakhir

2026-10-18 07:29–07:36 WIB: recon, backup (`backup-20261018-0729-uiux`, 57 MB), unggah 43.033.340 byte
(SHA-256 `9a76dc23…fe39b`), extract, restart, smoke 4 URL `200`, buildId `BZ-Vpsd9eLX1` → `0Dc2WPRpp8Me`.
Rincian: `docs/arsip/bukti-2026-10.md` §15.

2026-10-21 15:45–15:47 WIB: deploy commit `68766d98`, bundle 43.073.633 byte (SHA-256 `1f34e90b…e61b2e`),
backup `app-pre-wfin002-20261021-154541.tgz` (32 MB), extract tanpa `.env`/`uploads`/`tmp`, restart;
smoke `/`, `/login`, `/api/public/rooms`, `/version.json` **200** + `/api/stays` **401**, buildId `zuOIOPU762vn`.


<a id="d4b-backup"></a>
## Bagian B — Backup & restore produksi

> **Blok baca** · Jenis: **runbook operasi** · Status: **aktif — dieksekusi 20 Okt 2026; run terjadwal pertama belum terlihat** · Untuk siapa: owner/operator yang menjalankan backup
> · Baca kalau: akan membuat dump produksi, memasang jadwal harian, atau menguji restore. · **Jangan** dibaca kalau: mencari aturan bisnis (itu [ATURAN](../ATURAN.md)).

### 1. Keputusan & tujuan

Keputusan owner **P24 (19 Okt 2026)**: *"Ya dump sekarang dan lakukan rekomendasi kamu."* Rekomendasi yang disetujui: **dump sekarang + jadwal harian + retensi 14 hari + satu uji restore** ke database terpisah.

Alasannya terukur: dump terakhir **13 Sep 2026**; data 18 Okt (11 tagihan, 11 pembayaran, 23 jurnal) tidak tercakup backup mana pun yang terlihat, dan belum ada bukti restore.

### 2. Yang sudah ada

- Skrip dump: [backup.sh](../../scripts/remote/backup.sh) — membaca `DATABASE_URL` dari `~/kost48-prod/.env`, menulis `~/backups/db-<nama>-<ts>.sql.gz` + arsip app, lalu menguji `gzip -t`. **Tidak** mencetak sandi.
- Folder `~/backups` di server. Sejak 20 Okt 2026: cron harian + retensi 14 hari terpasang, uji restore lulus, dan catatan bukti ada di §7. Skrip dipakai dengan URL utuh (tidak lagi mengurai nama DB dari URL).

### 3. Langkah A — dump sekarang

Jalankan dari mesin yang punya akses SSH ke server produksi (bukan dari aplikasi):

```bash
ssh <user>@<host>
cd ~/kost48-prod
bash scripts/remote/backup.sh
```

Yang harus terlihat di keluaran: `OK -> /home/<user>/backups/db-<nama>-<ts>.sql.gz (<ukuran>)`, `gzip -t OK`, dan jumlah baris `COPY` > 0. Catat nama berkas + ukuran + waktu. **Jangan** menyalin isi dump atau kredensial ke chat.

### 4. Langkah B — jadwal harian + retensi 14 hari

Pasang cron milik user aplikasi (bukan root), jam 02.00 WIB server:

```cron
0 2 * * * /bin/bash /home/<user>/kost48-prod/scripts/remote/backup.sh >> /home/<user>/backups/backup.log 2>&1
```

Retensi (hapus dump dan arsip app lebih tua dari 14 hari; hanya dua pola itu):

```cron
30 2 * * * find /home/<user>/backups -maxdepth 1 \( -name 'db-*.sql.gz' -o -name 'app-kost48-prod-*.tar.gz' \) -mtime +14 -delete
```

Arsip app ikut masuk retensi karena skrip membuat salinan app setiap run (±50 MB); tanpa ini folder tumbuh tanpa batas.

Bukti yang dicatat: `crontab -l` memuat dua baris di atas; `tail backup.log` menunjukkan run pertama sukses; `ls -lh ~/backups` menunjukkan berkas baru.

### 5. Langkah C — uji restore ke database terpisah

**Jangan** restore ke database produksi. Gunakan DB uji sementara:

```bash
DB=kost48_restore_test_$(date +%Y%m%d)
createdb "$DB"
gunzip -c ~/backups/db-<nama>-<ts>.sql.gz | psql -d "$DB"
psql -d "$DB" -At -F' | ' -c 'select '\''Stay'\'', count(*) from "Stay" union all select '\''Invoice'\'', count(*) from "Invoice" union all select '\''InvoicePayment'\'', count(*) from "InvoicePayment" union all select '\''JournalEntry'\'', count(*) from "JournalEntry" union all select '\''Tenant'\'', count(*) from "Tenant";'
dropdb "$DB"
```

**Lulus bila** jumlah `Stay`, `Invoice`, `InvoicePayment`, `JournalEntry`, dan `Tenant` sama dengan produksi saat dump diambil; `psql` tidak melaporkan error; DB uji dihapus setelahnya.

**Catatan 20 Okt 2026 (terbukti di server):** akun DB bukan pemilik extension `plpgsql`, sehingga restore penuh berhenti di `COMMENT ON EXTENSION plpgsql`. Saring dua baris itu sebelum restore:

```bash
gunzip -c ~/backups/db-<nama>-<ts>.sql.gz \
  | grep -vE '^(CREATE EXTENSION IF NOT EXISTS plpgsql|COMMENT ON EXTENSION plpgsql)' \
  | psql "$DBURL_TEST" -q -v ON_ERROR_STOP=1
```

Hasil uji: 62 tabel dibuat, lima hitungan cocok dengan produksi, DB uji dihapus.

### 6. Bukti yang wajib dicatat

1. Nama berkas dump + ukuran + waktu + hasil `gzip -t`.
2. Baris cron (tanpa kredensial) + log run pertama.
3. Hasil hitung 5 tabel di DB uji + pernyataan DB uji sudah dihapus.
4. Pernyataan eksplisit: **restore diuji**, bukan hanya "dump dibuat".

Bukti ditulis di [bukti-2026-10](../arsip/bukti-2026-10.md) (bagian baru) — bukan di berkas ini.

### 7. Status eksekusi

- **19 Okt 2026:** belum dijalankan — shell sesi agen gagal start (`0xC0000142`).
- **20 Okt 2026 06:31 WIB:** dump dibuat (40 KB, `gzip -t` OK, 62 blok `COPY`); cron dua baris terpasang; probe cron terbukti menulis 3× dalam 3 menit; restore ke DB uji berhasil (62 tabel; Stay 11, Invoice 11, InvoicePayment 11, JournalEntry 23, Tenant 13); DB uji dihapus.
- Retensi 14 hari juga menghapus arsip app (`app-kost48-prod-*.tar.gz`), karena skrip membuatnya setiap run.
- Run terjadwal pertama (21 Okt 02.00 WIB) belum terlihat saat catatan ini ditulis.
- Runbook ini **tidak** memberi izin mengubah data produksi; restore hanya ke DB terpisah.


<a id="d4b-cpanel"></a>
## Bagian C — Setup cPanel pertama kali

### Appendix B — Deploy cPanel Step-by-Step


> Runbook ini berlaku untuk release setelah 2026-07-23. Keputusan database dan gate lengkap ada di `docs/operations/produksi.md`; bila ada konflik, dokumen tersebut menang.

##### Keputusan sebelum mulai

Untuk go-live pertama, buat **database produksi baru dan kosong**. Jangan drop database UAT dan jangan memasukkan data UAT/seed historis ke produksi. Sesudah go-live, pembaruan database hanya melalui patch migration.

Jangan mulai jika salah satu kondisi berikut belum terpenuhi:

- SHA `main` rilis, backup UAT/uploads, dan build backend/frontend sudah tercatat.
- Domain HTTPS, kredensial DB baru, dan seluruh secret produksi sudah tersedia.
- Bootstrap guard database (constraint/trigger di luar Prisma) sudah diuji pada PostgreSQL kosong. `sql/seed.sql` bukan bootstrap karena membawa data historis/PII.
- Temuan pencarian tenant booking serta UAT visual lintas portal sudah ditutup.

##### 1. Buat database baru

Di **PostgreSQL Databases**, buat database baru, user baru, password kuat, lalu berikan hak hanya pada database itu. Contoh URL:

```env
DATABASE_URL="postgresql://USER:PASSWORD@127.0.0.1:5432/kost48_prod?schema=public"
```

Simpan database UAT lama sebagai backup read-only. Penghapusan membutuhkan persetujuan owner terpisah.

##### 2. Unggah paket rilis

Bangun bundle dari SHA rilis di mesin tepercaya, unggah `kost48-deploy-bundled.tgz` ke folder app (misalnya `/home/USER/kost48`), dan extract. Bundle ini sudah memuat backend/frontend prebuilt serta runtime `node_modules`; jangan menimpa `.env` atau `uploads/` bila melakukan redeploy.

Di **Setup Node.js App** gunakan Node 22, mode Production, application root folder app, dan startup file `dist/main.js`. Set `NODE_OPTIONS=--max-old-space-size=192` di environment cPanel, bukan di `.env`.

##### 3. Isi environment

Salin `.env.example` ke `.env`, lalu isi minimal:

```env
NODE_ENV=production
DATABASE_URL="...database produksi baru..."
JWT_SECRET="...acak dan kuat..."
CORS_ORIGIN="https://domain-anda"
FRONTEND_URL="https://domain-anda"
KTP_ACTIVATION_GATE_ENABLED=true
AUTO_OPS_ENABLED=false
AUTO_OPS_CRON_TOKEN="...acak dan kuat..."
TUYA_ACCESS_KEY="...Tuya Access ID..."
TUYA_SECRET_KEY="...Tuya Access Secret..."
TUYA_API_BASE=https://openapi.tuyaus.com
IOT_TUYA_POLL_ENABLED=false
IOT_TUYA_CRON_TOKEN="...acak dan kuat..."
IOT_STALE_AFTER_MINUTES=30
##### Isi hanya jika ESP32 water meter dipakai; simpan permanen di password manager.
IOT_MASTER_KEY="...32 byte base64 atau 64 hex..."
```

Tambahkan VAPID (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`) sebelum mengaktifkan push. Jangan menaruh secret di command history, ticket, atau screenshot.

##### 4. Jangan install atau menjalankan Prisma di server

Tidak ada perintah berikut yang boleh dijalankan di server:

```bash
npm install
npm ci
prisma db push
prisma migrate deploy
```

Database tidak disentuh otomatis oleh bundle. Verifikasi dulu apakah target benar-benar fresh atau sudah memiliki schema/data nyata. Patch database—bila memang dibutuhkan—harus ditentukan terpisah, dibackup, direview, dan dilakukan melalui metode yang disetujui owner. `prisma db push`, reset, penghapusan ledger, dan `sql/seed.sql` tetap dilarang.

Setelah migration, pasang hanya bootstrap guard yang telah diuji dan disetujui. Bila artefak guard belum tersedia/terverifikasi, berhenti: aplikasi belum siap go-live.

##### 5. Seed fondasi tanpa data historis

```bash
OWNER_EMAIL=owner@domain-anda \
OWNER_PASSWORD='password-kuat-sementara' \
OWNER_FULLNAME='Pemilik KOST48' \
npm run seed:owner
```

Kemudian login sebagai OWNER dan buat COA, periode OPEN, cash account, opening balance atau catatan zero-start, kamar/fasilitas, dan onboarding penghuni nyata melalui UI/runbook. Jangan menjalankan seed teraudit yang membawa tenant, transaksi, atau PII.

Setelah 13 kamar produksi tersedia, daftarkan registry Tuya secara idempoten dan tarik snapshot pertama:

```bash
node scripts/bootstrap-tuya-kwh.js --sync
```

Periksa mapping device ID ke kode kamar sebelum melanjutkan. Jangan jalankan bootstrap ini bila daftar perangkat produksi belum diverifikasi.

##### 6. Start, HTTPS, dan cron

Start aplikasi dari cPanel, aktifkan AutoSSL, lalu pastikan domain HTTPS sudah aktif sebelum UAT push.

Tambahkan cron AutoOps setiap lima menit:

```cron
*/5 * * * * curl -fsS -X POST -H "X-Cron-Token: <AUTO_OPS_CRON_TOKEN>" https://<domain>/api/auto-ops/cron >/dev/null 2>&1
```

Endpoint cron hanya menerima `POST` dan header `X-Cron-Token`; token query string tidak didukung. Cron ini juga menjalankan dispatch pengumuman terjadwal serta push outbox.

**IoT kWh meter TIDAK memakai cron.** Pembacaan Tuya bersifat **on-demand (kumulatif)** untuk menghemat shared hosting idle-sleep: tenant membuka halaman meter atau memanggil `POST /api/iot/tenant/refresh` → backend membaca total kWh kumulatif (`add_ele`) saat itu dan menghitung selisih terhadap titik acuan (`MeterReading`) terakhir. Timer internal tetap OFF (`IOT_TUYA_POLL_ENABLED=false`). **Jangan pasang cron `iot/tuya/cron`.**

Kill/rollback IoT: pastikan `IOT_TUYA_POLL_ENABLED=false`, tidak ada cron `iot/tuya/cron`, lalu nonaktifkan device melalui registry bila perlu. Variabel `IOT_ENABLED` tidak ada dan tidak boleh dijadikan prosedur rollback.

##### 7. Smoke test dan UAT

- Buka `/` dan cek `/api/public/rooms` menghasilkan respons sehat.
- Login OWNER; endpoint terproteksi harus menolak tanpa token.
- Jalankan `POST /api/auto-ops/run` sekali melalui UI/API OWNER/ADMIN.
- Login OWNER, buka `/iot`, pastikan 13 mapping yang diverifikasi tampil dan tidak ada data `stale` setelah snapshot awal.
- Panggil `POST /api/iot/tenant/refresh` (atau `POST /api/iot/tuya/sync-all` untuk OWNER/ADMIN) sekali; respons harus mengembalikan total kWh kumulatif tanpa polling ganda dan tanpa membutuhkan cron.
- Pastikan endpoint kompatibilitas klien lama `/api/iot/stream/tenant/raw` merespons `204` dan tidak membuka `text/event-stream`.
- Pastikan `/sw.js`, `/version.json`, dan navigasi HTML mengirim `Cache-Control: no-store`; aset hash `/assets/*` harus `immutable`.
- Uji pengumuman langsung dan terjadwal; pastikan `dispatchedAt` hanya terisi sekali.
- Jalankan `docs/domain/hunian.md` bila VAPID/push diaktifkan.
- Catat SHA rilis, waktu, hasil migration, hasil smoke, dan lokasi backup tanpa menyimpan secret/PII.

##### Redeploy setelah go-live

1. Jadwalkan maintenance window bila migration ada.
2. Backup database dan `uploads/`; uji backup pada lingkungan non-produksi.
3. Extract bundle SHA baru tanpa menimpa `.env`/`uploads`, lalu restart aplikasi. Evaluasi patch database secara terpisah bila release memang mengubah schema.
4. Restart dan jalankan smoke/UAT yang relevan.

Jangan reset database, menjalankan seed, atau memakai `db push` pada produksi yang telah berisi data nyata.

---

**Digabung dari docs/operations/form-go-live.md** (DOCS-CLEANUP-1, 2026-09-24) - isi blok disalin utuh.

### Formulir Isi Data Go-Live

> Migrasi dari docs/FORM_ISI_DATA_GO_LIVE.md (A-F) pada f8f9a589 (DOC-GOV-20260922 Tahap 3).
> Sumber asli sudah dihapus di Fase 3 (23 Sep 2026); berkas ini kanonik.

### A. Akun Admin & Staf

| Peran | Email | Password | Nama Lengkap |
|-------|-------|----------|--------------|
| ADMIN (opsional) | `[ ... ]` | Atur langsung di aplikasi | `[ ... ]` |
| STAFF (1 orang) | `[ ... ]` | Atur langsung di aplikasi | `[ ... ]` |

---

### B. Data Tenant yang Belum Lengkap

#### B1. Email + Gender + Pekerjaan (yang masih kosong)

| Kamar | Nama | Email | Gender (L/P) | Pekerjaan |
|-------|------|-------|--------------|-----------|
| F1 | GUNAWAN | — *(segera checkout — tidak perlu akun portal)* | `[ ... ]` | `[ ... ]` |
| J | Lovandra | `lovandra.fachri103@gmail.com` | `[ ... ]` | `[ ... ]` |
| M | Gabriel Excelly Pranajaya | `gabrielexcelly1908@gmail.com` | `[ ... ]` | `[ ... ]` |

> Email **G** (`jtt1234511@gmail.com`) dan **L** (`desterikahasan@gmail.com`) sudah terisi (keluar dari daftar kosong).
> **Pekerjaan (`occupation`) masih kosong untuk semua 13 tenant** — opsional, isi di §B2 bila mau lengkap.

#### B2. Pekerjaan (occupation) — semua 13 tenant

| Kamar | Nama | Pekerjaan |
|-------|------|-----------|
| A | Shinta Larista | `[ ... ]` |
| B | Tenant Kamar B | `[ ... ]` |
| C | Miko Rakatama Adhi Winarto | `[ ... ]` |
| D | Ade Chandra | `[ ... ]` |
| F1 | GUNAWAN | `[ ... ]` |
| F2 | Patrick Wilfred | `[ ... ]` |
| G | Yofi Nurkolifah | `[ ... ]` |
| H | Welly Tanoto | `[ ... ]` |
| I | Tenant Kamar I | `[ ... ]` |
| J | Lovandra | `[ ... ]` |
| K | Meliana Tamara | `[ ... ]` |
| L | Destarika Hasan | `[ ... ]` |
| M | Gabriel Excelly Pranajaya | `[ ... ]` |

---

### C. Data Check-in per Kamar (WAJIB)

> `Tarif Kontrak` sudah ada di sistem. Yang perlu diisi: **bulan+tahun masuk** (tanggal hari sudah ada) dan **meter listrik awal**.

| Kamar | Nama | Tanggal Masuk (hari sudah ada) | Bulan + Tahun Masuk | Meter Listrik Awal (kWh) |
|-------|------|-------------------------------|---------------------|---------------------------|
| A | Shinta Larista | 26 | Jun 2026 | ≈ 11.224 |
| B | Tenant Kamar B | 1 | Apr 2026 | ≈ 6.074 |
| C | Miko Rakatama A. W. | 28 | Mar 2026 | ≈ 8.178 |
| D | Ade Chandra | 24 | Agu 2025 | ≈ 5.629 |
| F1 | GUNAWAN | 27 | Jul 2026 | `[ ... ]` |
| F2 | Patrick Wilfred | 8 | Jun 2026 | `[ ... ]` |
| G | Yofi Nurkolifah | 1 | Agu 2025 | `[ ... ]` |
| H | Welly Tanoto | 10 | Mei 2025 | `[ ... ]` |
| I | Tenant Kamar I | 5 | Mei 2025 | `[ ... ]` |
| J | Lovandra | 30 | Jan 2026 | ≈ 3.893 |
| K | Meliana Tamara | 10 | Mei 2025 | ≈ 8.641 |
| L | Destarika Hasan | 1 | Mei 2025 | ≈ 5.697 |
| M | Gabriel Excelly P. | 3 | Mei 2025 | `[ ... ]` |

> 📅 **Bulan+tahun masuk** diambil dari `Scan/KOST48_Historical_DB_AI_CONTEXT.md` §8. Catatan: **B (Dini)** ngekos sejak sebelum Nov 2024 (arsip mulai Nov 2024), pindah C→B 1 Apr 2026; **I (Theo)** masih aktif tapi belum bayar Jul+Agustus 2026.
> 📊 **Meter `≈`** = pembacaan absolut terakhir (Jun–Jul 2026), **wajib cek fisik ulang** saat go-live.

---

### D. Keuangan

| Item | Nilai |
|------|-------|
| Opening balance (saldo awal kas/bank) | `[ ... ]` (atau tulis "ZERO-START") |
| Rekening transfer — Nama Bank | diisi owner via UI Owner → Settings Operasional |
| Rekening transfer — No. Rekening | diisi owner via UI Owner → Settings Operasional |
| Rekening transfer — Atas Nama | diisi owner via UI Owner → Settings Operasional |

---

### E. Layanan Tambahan (opsional)

| Layanan | Harga / bulan |
|---------|---------------|
| WiFi per perangkat | `[ ... ]` (contoh: 50.000) |
| Lainnya: `[ ... ]` | `[ ... ]` |

---

### F. Pengumuman Awal (opsional)

| Judul | Isi | Kategori (info/urgent/maintenance) |
|-------|-----|-----------------------------------|
| `[ ... ]` | `[ ... ]` | `[ ... ]` |


<a id="d4b-ktp"></a>
## Bagian D — Verifikasi gate KTP

#### F.1 Verifikasi gerbang KTP produksi (tanpa menampilkan secret)

**Latar:** `KTP_ACTIVATION_GATE_ENABLED` **default OFF**; runbook deploy menandainya WAJIB di produksi. Bila OFF, aktivasi kamar dapat lolos **tanpa KTP terverifikasi** (bertentangan dengan maksud UU PDP dan temuan D-17). Keputusan owner 23 Sep 2026: **ditunda dengan risiko diterima sementara**, wajib ditinjau sebelum onboarding penghuni nyata ([KEPUTUSAN-OWNER](../KEPUTUSAN-OWNER.md)).

**Prasyarat:** izin akses cPanel/lingkungan aplikasi. Jangan menampilkan nilai secret lain; nilai `true`/`false` pada flag ini bukan secret.

1. **Periksa keberadaan & nilai** — cPanel → Environment Variables aplikasi Node.js (atau `.env` produksi, hanya baca). Catat: ada/tidak, `true`/`false`.
2. **Bila belum ada atau `false`** — set `KTP_ACTIVATION_GATE_ENABLED=true`, lalu restart aplikasi mengikuti prosedur redeploy (§G/§J). Jangan mengubah env lain pada langkah ini.
3. **Bukti** — tanggal, nama pemeriksa, status sebelum/sesudah, tanpa screenshot yang memuat secret.
4. **Uji perilaku** — jalankan di UAT/DEV: aktivasi kamar atau approve booking untuk tenant tanpa KTP terverifikasi **harus DITOLAK**. **Jangan** membuat tenant/booking uji di produksi; bila uji hanya bisa di produksi, jangan lakukan dan tulis **BELUM TERBUKTI**.
5. **Tindak lanjut** — catat hasil di [ANTREAN](../ANTREAN.md) antrean #1. Bila tetap ditunda, tegaskan risiko dan syarat peninjauan sebelum onboarding penghuni nyata.


<a id="d4b-kapasitas"></a>
## Bagian E — Kapasitas RAM 512 MB

### 11. Aturan kapasitas RAM: 512 MB adalah batas kerja, naik kuota bukan rekomendasi pertama

Berlaku untuk setiap agen yang bekerja di repo ini. Batas akun **LVE 512 MB** adalah batas kerja; menaikkan kuota (1 GB) **bukan** jawaban pertama atas gejala kehabisan memori atau 5xx, dan hanya boleh direkomendasikan sebagai pilihan terakhir dengan bukti terukur.

**Angka dasar (potret 2026-10-19, audit read-only di server produksi):**

| Keadaan | RSS worker | Perkiraan akun LVE | Terhadap 512 MB |
|---|---|---|---|
| 1 worker (steady state) | 171–176 MiB | 199–272 MiB | aman, sisa ±240 MiB |
| 2 worker (overlap restart) | ±353 MiB | 376–449 MiB | muat, mepet |
| 3 worker | ±530 MiB | 553–626 MiB | **melewati limit → kill/5xx** |

Selisih LVE−RSS (23–96 MiB) adalah overhead akun yang belum terjelaskan penuh; jangan dijumlahkan sebagai anggaran pasti. Bukti ini menjawab sebagian EF-02 (beban 20 request paralel); cold start dan puncak AutoOps belum diukur, jadi verdict kelayakan penuh tetap terbuka.

**Urutan diagnosis wajib sebelum menyebut kuota:**
1. Hitung worker (`pgrep -c lsnode`, `pgrep -a lsnode`). Worker lama yang tidak mati saat SIGTERM adalah penyebab paling sering — lihat [produksi](produksi.md) bagian overlap restart.
2. Periksa scheduler ganda: timer in-process (`AUTO_OPS_ENABLED`) dan cron; jangan menyalakan keduanya.
3. Periksa pool DB (`max`, timeout) dan modul berat yang di-import eager.
4. Baru setelah 1–3 terbukti bersih, ukur puncak LVE pada skenario yang sah.

**Ambang merekomendasikan naik kuota — semua wajib terpenuhi:**
- jumlah worker sudah dikunci dan diverifikasi (1, atau 2 saat overlap restart);
- puncak LVE terukur **≥470 MiB** (headroom <10%) pada **≥3 pengukuran** skenario sah (overlap 2 worker + sweep AutoOps), bukan estimasi;
- penyebabnya bukan akumulasi worker, timer ganda, atau pool tanpa batas;
- rekomendasi menyertakan angka sebelum/sesudah, biaya, dan rollback.

**Aturan angka:** klaim "hemat X MB" wajib berasal dari pengukuran sebelum/sesudah di server yang sama; estimasi diberi label **estimasi**. `--max-old-space-size=192` sudah aktif di produksi — jangan diubah tanpa uji beban. Bila 5xx muncul saat 1 worker dan LVE <400 MiB, penyebabnya bukan kapasitas — jangan ajukan kuota.


<a id="d4b-verifikasi"></a>
## Bagian F — Harness verifikasi uang

> Dipindah apa adanya dari `docs/domain/keuangan.md` Bagian 1 (Tahap 3 S2.b3, 23 Sep 2026) pada DOC-GOV-20260922.
> Sumber asli: `docs/arsip/legacy/2026-06-16_root_docs_pre_M/05_VERIFIKASI_KEUANGAN.md` (tetap di arsip).
> **Isi tidak diubah.** Blok gate per-task di akhir tetap memuat 5 `[ ]` dan tetap wajib untuk task uang (AGENTS §8 + gate M04).
> Rujukan aturan aktif: [domain/keuangan.md](../domain/keuangan.md).
> **Status:** aktif — harness verifikasi uang; wajib dibaca sebelum task yang menyentuh uang.

### Bagian 1 - `docs/arsip/legacy/2026-06-16_root_docs_pre_M/05_VERIFIKASI_KEUANGAN.md`

#### 05 — HARNESS VERIFIKASI KEUANGAN (jaring pengaman AI eksekutor)
**Tujuan:** memastikan **hitungan keuangan tetap handal** saat kode disentuh AI lemah. `tsc 0` TIDAK cukup — kode bisa lolos compile tapi salah angka (bukti: bug F-18 = kembaran F-01 yang lolos audit V1). Jalankan harness ini SETELAH tiap task keuangan (dossier 13) dan tiap task uang (dossier 10/12).
**Aturan inti:** kalau salah satu cek di bawah GAGAL → **JANGAN commit**, perbaiki dulu. Kalau tak yakin → STOP & lapor.

---
##### 1. INVARIAN KEUANGAN (HARAM dilanggar — kalau pernah false, ada bug)
1. **Setiap JournalEntry balance:** Σ debit = Σ kredit (DB-enforced; jangan matikan guard `postBalancedJournalTx`).
2. **Idempotent:** 1 (sourceType, sourceId) = maksimal 1 jurnal POSTED non-VOID.
3. **Deposit = LIABILITY** (akun 2000), bukan revenue. Saldo 2000 TIDAK pernah debit (kalau debit → F-24 belum difix).
4. **Kas = akun prefix `10` (1000/1010/1020)**, BUKAN `11` (1100 = PIUTANG). Cashflow/rasio yang menyebut "kas" harus pakai `cashAccountId` atau prefix `10`.
5. **No-partial:** total pembayaran = DP-persis ATAU pelunasan-penuh; invoice tak pernah PARTIAL liar.
6. **Trial Balance seimbang:** total debit = total kredit (sampai ke rupiah).
7. **Rekonsiliasi deposit: mismatch = 0** (snapshot stay = ledger = akun 2000).
8. **Revenue ≠ invoice DRAFT** (DRAFT belum diterbitkan, bukan pendapatan).

##### 2. ⛔ DO-NOT-TOUCH (kode SUDAH BENAR — jangan "diperbaiki")
| Kode | Lokasi | Kenapa jangan disentuh |
|---|---|---|
| `postBalancedJournalTx` (inti jurnal) | `accounting-posting.service.ts` — metode `postBalancedJournalTx` | Guard balance+idempotent+periode OPEN. Mesin jurnal SEHAT. ⚠️ Rujukan lokasi memakai **nama metode**, bukan nomor baris (KONTRAK §7): nomor baris basi setiap berkas disunting. |
| Blok saldo kas E-4 | `accounting-reports.service.ts` — metode `cashflow`, blok saldo per CashAccount | Saldo per CashAccount = opening + Σ(D−K) line ber-cashAccountId. SUDAH BENAR — F1-3 meniru pola INI, jangan ubah blok ini. |
| 10 fungsi posting (D/K) | `accounting-posting.service.ts` — metode `post*Tx` (10 fungsi posting) | Semua balance+idempotent. Hanya F1-8 (settlement guard) yang menambah CEK, bukan ubah jurnal. |
| Trial Balance + opening fallback | `accounting-reports.service.ts` — metode `trialBalance` | Anti-double-count. |
| Tutup buku (closing/reopen versioned) | `accounting-period-close.service.ts` | Paling matang; jangan utak-atik. |
| `recalculateInvoiceTotal` (DISCOUNT−) | `invoices.service.ts` — metode `recalculateInvoiceTotal` | Konsisten dgn trigger DB. ⚠️ Rujukan lokasi memakai **nama metode**, bukan nomor baris (KONTRAK §7). |

##### 3. UNIT TEST (zero-dependency — pakai test runner BAWAAN Node, TANPA npm install)
> Proyek belum punya jest. JANGAN install. Pakai `node --test` (Node ≥18) terhadap hasil build `dist/`. Test = file CommonJS di `backend/test/unit/`.
**Cara jalankan:** `cd backend && npm run build && node --test "test/unit/**/*.test.js"` → harus semua PASS (hijau). (Catatan: `node --test test/` GAGAL di Node 22/Windows — pakai pola glob ini. `test/integration/**` bergerbang env dan **bukan** bagian perintah ini; glob lama `test/**/*.test.js` ikut menariknya.)
**Script siap-pakai (sudah ditambahkan):** di `backend/package.json` → `"test:unit": "node --test \"test/unit/**/*.test.js\""` → jalankan `npm run test:unit`. (Kutipan glob dikoreksi 2026-10-10 agar sama dengan skrip hari ini.)

###### File 1 — `backend/test/unit/pricing.test.js` (SIAP PAKAI — angka sudah diverifikasi dari kode)
```js
const test = require('node:test');
const assert = require('node:assert');
const P = require('../../dist/modules/tenant-bookings/pricing.helper.js');

test('calculateRentByPricingTerm — tarif bulanan 1.700.000 (owner decision: WEEKLY=0.5, SMESTERLY=5.7, YEARLY=11)', () => {
  assert.strictEqual(P.calculateRentByPricingTerm(1700000, 'DAILY'), 225000);    // 221.000 → bulat naik 5.000
  assert.strictEqual(P.calculateRentByPricingTerm(1700000, 'WEEKLY'), 850000);   // 0.5 × 1.700.000 = 850.000
  assert.strictEqual(P.calculateRentByPricingTerm(1700000, 'BIWEEKLY'), 1275000); // 0.75 × 1.700.000 = 1.275.000 → 1.275.000
  assert.strictEqual(P.calculateRentByPricingTerm(1700000, 'MONTHLY'), 1700000);
  assert.strictEqual(P.calculateRentByPricingTerm(1700000, 'SMESTERLY'), 9690000); // 5.7 × 1.700.000 = 9.690.000 → 9.690.000
  assert.strictEqual(P.calculateRentByPricingTerm(1700000, 'YEARLY'), 18700000);   // 11.0 × 1.700.000 = 18.700.000 → 18.700.000
});
test('pembulatan naik ke 5.000', () => {
  assert.strictEqual(P.calculateRentByPricingTerm(1333000, 'DAILY'), 175000);    // 173.290 → 175.000
  assert.strictEqual(P.roundUpToNearest(1, 5000), 5000);
  assert.strictEqual(P.roundUpToNearest(5000, 5000), 5000);
  assert.strictEqual(P.roundUpToNearest(0), 0);
  assert.strictEqual(P.roundUpToNearest(-5), 0);
});
test('term tidak valid / rate 0 → 0', () => {
  assert.strictEqual(P.calculateRentByPricingTerm(0, 'MONTHLY'), 0);
  assert.strictEqual(P.calculateRentByPricingTerm(1000000, 'XXX'), 0);
});
test('utilitas included hanya term pendek', () => {
  for (const t of ['DAILY','WEEKLY','BIWEEKLY']) assert.strictEqual(P.isUtilitiesIncludedForPricingTerm(t), true);
  for (const t of ['MONTHLY','SMESTERLY','YEARLY']) assert.strictEqual(P.isUtilitiesIncludedForPricingTerm(t), false);
});
```

###### File 2 — `backend/test/unit/periode.test.js` (SIAP PAKAI — UTC, exclusive end)
```js
const test = require('node:test');
const assert = require('node:assert');
const S = require('../../dist/modules/stays/stays.helpers.js');
const iso = (d) => d.toISOString().slice(0, 10);

test('calculatePeriodEnd — end eksklusif', () => {
  assert.strictEqual(iso(S.calculatePeriodEnd(new Date(Date.UTC(2026,8,1)), 'DAILY')),   '2026-09-02');
  assert.strictEqual(iso(S.calculatePeriodEnd(new Date(Date.UTC(2026,8,1)), 'WEEKLY')),  '2026-09-08');
  assert.strictEqual(iso(S.calculatePeriodEnd(new Date(Date.UTC(2026,8,1)), 'MONTHLY')), '2026-10-01');
});
test('addCalendarMonthsClamped — clamp akhir bulan', () => {
  assert.strictEqual(iso(S.calculatePeriodEnd(new Date(Date.UTC(2026,0,31)), 'MONTHLY')), '2026-02-28'); // 31 Jan +1bln → 28 Feb
});
```

###### File 3 — `backend/test/unit/cashflow-classifier.test.js` (BUAT SAAT F1-3)
Saat F1-3 mengekstrak fungsi classifier kas (deteksi line kas via `cashAccountId != null`, klasifikasi sekali per line), tulis test: line ber-cashAccountId debit → operating-in; line AR (1100) → BUKAN kas (operating-in = 0); OPENING_BALANCE → bukan arus operasi. **DP/angka harapan: lihat skenario emas §5.**

> Fungsi lain (DP 30% = `Math.round(rent*30/100)`, splitRent/Deposit) ada di service (bukan helper murni) — diuji via skenario emas §5, bukan unit test.

##### 4. HARNESS REKONSILIASI (alat audit BAWAAN — jalankan tiap selesai task finance)
| Endpoint | Harapan SEHAT | Kalau GAGAL artinya |
|---|---|---|
| `GET /api/accounting/trial-balance` | `isBalanced: true` (debit=kredit) | ada jurnal tak balance → bug posting |
| `GET /api/deposit-ledger/reconciliation-lite` | `mismatch: 0` | snapshot stay ≠ ledger → bug deposit |
| `GET /api/accounting/deposit-reconciliation` | `reconciliationStatus: MATCHED` (atau OPENING_BALANCE_ONLY) | akun 2000 ≠ operational held → F-24/F-06 |
| `GET /api/accounting/cashflow` | beginning + netCashflow = ending | breakdown arus salah → F1-3 belum benar |
| `GET /api/accounting/financial-ratios` | expenseRatio masuk akal (mis. 25, bukan 1e8); occupancy>0 saat ada penghuni | F-02/F-04/F-18 belum benar |

**Aturan:** jalankan SEBELUM mulai (catat baseline) & SESUDAH task. Angka boleh berubah, tapi invarian §1 harus tetap true.

##### 5. SKENARIO EMAS (end-to-end, angka eksak — verifikasi setelah Fase 1)
Di DB bersih + COA seeded + CashAccount Cash(1000)+Bank(1010) + periode OPEN:
1. Kamar tarif bulanan **1.700.000**, deposit **500.000**. Booking MONTHLY → DP 30% = **510.000**.
2. Tenant bayar DP 510.000 (transfer) → approve → jurnal `INVOICE_PAYMENT` D Bank 510.000 / K AR 510.000. Kamar RESERVED, expiresAt null.
3. Pelunasan = sisa sewa (1.700.000−510.000=1.190.000) + deposit 500.000 = **1.690.000** → approve → kamar OCCUPIED, meter promoted. Deposit → jurnal D Bank / K 2000 (liability) 500.000.
4. **Cek:** trial-balance seimbang; cashflow operating-in bulan ini = 510.000+1.190.000 = **1.700.000** (kas dari pelunasan sewa) — BUKAN angka AR; deposit 500.000 masuk kas tapi kredit 2000 (liability, bukan revenue). reconciliation-lite mismatch=0.
5. Checkout → settlement FULL_REFUND 500.000 → D 2000 / K Bank 500.000 → saldo 2000 kembali 0. reconciliation MATCHED.
> Bila angka cashflow menampilkan mutasi PIUTANG (1100) sebagai "kas" → F1-3 belum benar. Bila expenseRatio = jutaan persen → F1-4 belum benar.

##### 6. GATE PER-TASK (centang sebelum commit task finance)
- `tsc --noEmit` 0 error.
- `npm run test:unit` (`node --test "test/**/*.test.js"`) semua PASS (kalau task menyentuh fungsi ber-test).
- 5 invarian §1 yang relevan tetap true (cek via §4 endpoint).
- Angka harapan task terpenuhi (lihat "selesai bila" di `08_CHECKLIST` — checklist 2026-06-13, kini di `.docs-legacy/2026-06-16_root_docs_pre_M/08_CHECKLIST.md` — atau dossier 13 di domain/keuangan.md).
- Tidak menyentuh kode di DO-NOT-TOUCH §2.
- Kalau ada yang ✗ → JANGAN commit; perbaiki atau STOP & lapor.

---

**Konservasi:** 5 `[ ]` pada gate per-task di atas dipertahankan; jumlah checkbox proyek tidak berubah oleh pemindahan ini.

