# 🚀 KOST48 V5 — Panduan Deploy ke cPanel (RAM 512MB)

> **Status:** ✅ Kode siap deploy | **Target:** cPanel shared hosting dengan Node.js + PostgreSQL
>
> Panduan ini sudah **diuji langsung** di sesi deploy 4 Juli 2026. Semua jebakan & solusi tercatat di [Troubleshooting](#troubleshooting).
>
> Ringkasan eksekutif → `docs/M08_DEPLOY_GO_LIVE.md` | Runbook dalam paket → `deploy/README-DEPLOY.md`

---

## 1. Gambaran

**Arsitektur:** Combined single-server — backend NestJS menyajikan frontend React + API dalam **1 port** via Passenger. Tanpa CORS (same-origin), tanpa build di server.

**Tiga pilar hemat resource:**

| Pilar | Penjelasan |
|-------|------------|
| **PREBUILT** | `tsc`, `vite build`, `prisma generate` semua di lokal. Server hanya install dependency produksi dari lockfile deploy |
| **COMBINED** | Satu proses Node serve frontend + API. Entry: `dist/main.js` |
| **HEAP TERBATAS** | `NODE_OPTIONS=--max-old-space-size=192` membatasi konsumsi RAM |
| **CRON EXTERNAL** | Passenger tidak always-on — auto-ops digerakkan cPanel Cron Jobs |

**Estimasi resource setelah deploy:**

| Metrik | Nilai |
|--------|-------|
| RAM idle | ~120-180 MB |
| RAM puncak | ~250-300 MB |
| Inode (file) | +~2.000 (dari ±46.700) |
| Entry process | +1 (total ~6/15) |

---

## 2. Pra-syarat

Buka **cPanel → Resource Usage** dan catat baseline:

- [ ] **RAM:** catat yang terpakai sekarang (situs lama ~139MB)
- [ ] **Inode:** catat yang terpakai (~46.700/75.000)
- [ ] **Entry Process:** catat (~5/15)

> ⚠️ **PENTING:** Database produksi harus **KOSONG** — ini deploy START BERSIH, bukan migrasi dari UAT.

---

## 3. Langkah 1 — Bersihkan hosting

1. cPanel → **File Manager**
2. Hapus atau rename folder situs lama (mis. `public_html/` → `public_html_lama/`)
3. Tunggu 1-2 menit, refresh **Resource Usage**
4. Pastikan RAM dan inode sudah turun

---

## 4. Langkah 2 — Buat database PostgreSQL

### Di cPanel

1. cPanel → **PostgreSQL Databases**
2. **Create New Database:** nama `kost48_v3` → **Create Database**
3. **Create New User:** username bebas + password kuat → **Create User**
4. **Add User to Database:** pilih user + database → **ALL PRIVILEGES** → **Add**

### Catat kredensial

```
DATABASE_URL = "postgresql://USER:PASSWORD@localhost:5432/kost48_v3?schema=public"
```

---

## 5. Langkah 3 — Build paket deploy di lokal

Di PC ini (root folder proyek):

```bash
npm run make-deploy
```

**Hasil:** folder `deploy/` (~686 file) + `kost48-deploy.tgz` (siap upload).

Kalau `frontend/dist` dan `backend/dist` sudah fresh dari build sebelumnya, bisa bungkus ulang tanpa build:

```bash
npm run make-deploy:fast
```

> 💡 **Kenapa prebuilt?** Di server RAM 512MB, `tsc` sendirian bisa OOM, dan `npm ci` penuh (dengan devDeps) bisa puluhan ribu file — memboroskan inode. Prebuilt = server hanya install dependensi produksi.

---

## 6. Langkah 4 — Upload ke cPanel

1. cPanel → **File Manager** → masuk folder app (mis. `~/kost48v3`)
2. **Upload** → pilih `kost48-deploy.tgz` → tunggu selesai
3. Klik kanan file → **Extract** → **Extract File(s)**

**Struktur folder setelah extract:**

```
~/kost48v3/
├── dist/                  # Backend prebuilt (entry: main.js)
├── client/                # Frontend prebuilt (HTML/JS/CSS/gambar)
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── sql/
│   └── bootstrap.sql
├── scripts/
│   └── seed-owner.js
├── package.json
├── package-lock.json
├── .env.example
└── README-DEPLOY.md
```

---

## 7. Langkah 5 — Setup Node.js App

1. cPanel → **Setup Node.js App** → **Create Application**

| Field | Nilai |
|-------|-------|
| **Node.js version** | `22` |
| **Application mode** | `Production` |
| **Application root** | `/home/username/kost48v3` |
| **Application URL** | Pilih domain |
| **Application startup file** | `dist/main.js` |

### Environment Variables (Add Variable satu per satu)

| Nama | Nilai | Catatan |
|------|-------|---------|
| `NODE_OPTIONS` | `--max-old-space-size=192` | ⚠️ WAJIB lewat sini, tidak bisa via `.env` |
| `DATABASE_URL` | `postgresql://USER:PASS@localhost:5432/kost48_v3?schema=public` | Prisma pakai `?schema=public` |
| `JWT_SECRET` | generate acak min 32 karakter | Server **menolak start** kalau <12 karakter |
| `NODE_ENV` | `production` | |
| `CORS_ORIGIN` | `https://domainmu.com` | Combined same-origin, tanpa `/api` |
| `KTP_ACTIVATION_GATE_ENABLED` | `true` | ⚠️ WAJIB `true` di produksi. Env ini hanya menentukan **nilai awal** saat row settings pertama terbentuk; setelah itu gate dikelola via UI **Settings → Operasional** (nilai DB yang menang). Verifikasi setelah deploy: coba aktivasi kamar tanpa KTP terverifikasi → harus DITOLAK |
| `AUTO_OPS_ENABLED` | `false` | Shared hosting — cron eksternal |
| `AUTO_OPS_CRON_TOKEN` | generate acak 48 karakter | Untuk proteksi endpoint cron |

2. Klik **Create** — **jangan start dulu!**

---

## 8. Langkah 6 — SSH: install dependencies

Dari halaman **Setup Node.js App**, copy perintah SSH yang ditampilkan. Contoh:

```
source /home/username/nodevenv/kost48v3/22/bin/activate && cd /home/username/kost48v3
```

### Buka SSH

```bash
ssh username@domainmu.com
```

### Masuk virtual environment & install

```bash
# Copy-paste perintah dari halaman Setup Node.js App
source /home/username/nodevenv/kost48v3/22/bin/activate && cd /home/username/kost48v3

# ⚠️ Kalau wrapper npm error (eval/backtick), bypass dengan npm ci langsung:
npm ci --omit=dev --omit=optional --ignore-scripts --no-audit --no-fund --progress=false
```

> **Jebakan umum:** `npm run cpanel:install` kadang gagal karena wrapper npm cPanel rusak (error `unexpected EOF while looking for matching backtick`). Kalau itu terjadi, langsung jalankan command `npm ci` hemat resource di atas. Hasilnya sama.

### Setup .env

```bash
cp .env.example .env
nano .env
```

Isi dengan nilai **sama persis** seperti Environment Variables di langkah 5. Simpan (`Ctrl+O` → `Ctrl+X`).

> 💡 `.env` dibaca oleh NestJS **dan** oleh `seed-owner.js`. Env cPanel hanya dibaca Node/Passenger — karena itu `.env` juga harus diisi.

---

## 9. Langkah 7 — Schema & pagar database

> ⚠️ Pastikan app **STOP** sebelum langkah ini.

---

### Jalur A: `prisma db push` (⭐ DISARANKAN — paling minim masalah)

```bash
# Di SSH, app harus STOP
npm run cpanel:migrate
```

Ini = `npx prisma db push --skip-generate`. Membuat seluruh 42 tabel langsung dari `schema.prisma` — **tanpa perlu file `migration.sql`** (menghindari risiko file SQL korup/format aneh saat transfer antar OS).

---

### Jalur B: pgAdmin (manual, aman)

1. cPanel → cari **pgAdmin** / **phpPgAdmin** / **Adminer**
2. Klik database `kost48_v3` → **Query Tool**
3. Buka `setup.sql` di paket deploy → copy **seluruh isi** → paste → **Execute**
4. Ulangi untuk `sql/bootstrap.sql`

---

### Jalur C: psql (command line, butuh koneksi tepat)

```bash
# ⚠️ cPanel PostgreSQL sering pakai Unix socket, bukan TCP.
# Coba socket dulu (tanpa -h):
psql -U username_db -d kost48_v3 -f setup.sql

# Kalau perlu TCP, paksa IPv4:
psql -h 127.0.0.1 -p 5432 -U username_db -d kost48_v3 -f setup.sql

# ⚠️ JANGAN pakai ?schema=public di URL psql — itu parameter Prisma, bukan PostgreSQL!
# Kalau pakai connection string:
psql "host=127.0.0.1 port=5432 user=username_db dbname=kost48_v3 sslmode=require" \
  -f sql/bootstrap.sql
```

---

### ⚠️ WAJIB setelah schema terbentuk: pagar DB

Apapun jalur yang dipilih (A/B/C), **`bootstrap.sql` HARUS dijalankan**. Ini berisi trigger, CHECK constraint, dan carve-out deposit guard yang **tidak ada di schema Prisma**.

Pakai **pgAdmin** (copy-paste isi `sql/bootstrap.sql` → Execute) — paling minim risiko.

---

## 10. Langkah 8 — Seed OWNER pertama

```bash
OWNER_EMAIL=owner@domainmu.com \
OWNER_PASSWORD='PasswordKuat#2026!' \
OWNER_FULLNAME='Nama Pemilik' \
npm run seed:owner
```

**Output sukses:** `✅ OWNER created`  
**Kalau sudah ada:** `ℹ️ OWNER already exists, skip` (idempoten, aman dijalankan ulang)

---

## 11. Langkah 9 — Nyalakan aplikasi

1. cPanel → **Setup Node.js App** → **Start**
2. Tunggu 10-15 detik, cek log → harus muncul `Nest application successfully started`
3. **AutoSSL:** cPanel → **SSL/TLS Status** → **Run AutoSSL** untuk domain
4. Verifikasi: buka `https://domainmu.com` — harus tampil halaman login

### Kalau memory fault

Stop → edit Env → `NODE_OPTIONS=--max-old-space-size=160` → Start ulang

---

## 12. Langkah 10 — Smoke test

| Test | URL / Command | Hasil yang diharapkan |
|------|---------------|-----------------------|
| Frontend | `https://domainmu.com/` | Halaman login KOST48 |
| API publik | `https://domainmu.com/api/public/rooms` | JSON 200, array rooms |
| Login OWNER | `POST /api/auth/login` dengan email+password | 200 + `access_token` |
| Deep-link | `https://domainmu.com/portal/stay` | Login page (bukan 404) |

Setelah login OWNER:

1. **Seed COA:** `POST /api/accounting/default-coa/seed`
2. Buat **Periode OPEN** + **CashAccount** (Cash 1000, Bank 1010)
3. Cek **Trial Balance** → `isBalanced: true`

---

## 13. Langkah 11 — Cron Job auto-ops

cPanel → **Cron Jobs** → **Add New Cron Job:**

| Setting | Nilai |
|---------|-------|
| Interval | `*/5` (tiap 5 menit) |
| Command | `curl -fsS -X POST -H "X-Cron-Token: TOKEN_ANDA" https://domainmu.com/api/auto-ops/cron >/dev/null 2>&1` |

> ⚠️ Endpoint ini **POST**, bukan GET. Token dikirim via header `X-Cron-Token`.  
> Ganti `TOKEN_ANDA` dengan nilai `AUTO_OPS_CRON_TOKEN` dari langkah 5.

**Verifikasi:** jalankan command curl di terminal — harus balas 200.

---

## 14. Langkah 12 — Final check

### cPanel Resource Usage

| Metrik | Target |
|--------|--------|
| **Memory faults** | **0** — kalau >0, turunkan NODE_OPTIONS |
| **RAM** | Idle ~120-180 MB |
| **Inode** | Di bawah 70.000 |
| **Entry Process** | ≤8 |

### cPanel Errors

cPanel → **Metrics → Errors** — pastikan kosong dari aplikasi kost48.

---

## 15. Pasca-deploy

### Wajib

- [ ] **Ganti password OWNER** dari `PasswordKuat#2026!` ke password produksi
- [ ] **Simpan kredensial:** DATABASE_URL, JWT_SECRET, AUTO_OPS_CRON_TOKEN, password OWNER
- [ ] **Catat commit SHA** (`git log -1 --oneline`)

### Opsional

- [ ] **Web Push:** generate VAPID key → tambahkan `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`
- [ ] **Email:** set `BREVO_API_KEY` + `MAIL_FROM_*`
- [ ] **AI:** set `DEEPSEEK_API_KEY` + env terkait (lihat `docs/M09_AI_OWNER_ADMIN.md`)

---

## 16. Troubleshooting

### `npm run cpanel:install` error: "unexpected EOF while looking for matching backtick"

**Penyebab:** Wrapper npm Passenger rusak (bug di eval shell).

**Solusi:** Jangan pakai `npm run`. Jalankan langsung:

```bash
source /home/username/nodevenv/kost48v3/22/bin/activate && cd /home/username/kost48v3
npm ci --omit=dev --omit=optional --ignore-scripts --no-audit --no-fund --progress=false
```

---

### `psql: FATAL: no pg_hba.conf entry for host "::1"`

**Penyebab:** `localhost` resolve ke IPv6 (`::1`), tapi PostgreSQL cPanel hanya terima IPv4 atau socket.

**Solusi:**

```bash
# A. Paksa IPv4
psql -h 127.0.0.1 -p 5432 -U username_db -d kost48_v3 -f ...

# B. Pakai socket (tanpa -h)
psql -U username_db -d kost48_v3 -f ...

# C. Connection string
psql "host=127.0.0.1 port=5432 user=username_db dbname=kost48_v3 sslmode=require" -f ...
```

---

### `psql: missing "=" after "port" in connection info string`

**Penyebab:** Connection string format salah — setiap pasangan harus `key=value` (pakai `=`, bukan spasi), dan **tanpa flag `-h`** (langsung sebagai argumen pertama).

**Benar:**

```bash
psql "host=127.0.0.1 port=5432 user=username_db dbname=kost48_v3" -f file.sql
```

**Salah:**

```bash
psql -h "host=127.0.0.1 port 5432 user=username_db dbname=kost48_v3" -f file.sql
```

---

### `psql: invalid uri query parameter: "schema"`

**Penyebab:** URL mengandung `?schema=public` (parameter Prisma), tapi `psql` tidak mengenalnya.

**Solusi:** Hapus `?schema=public` dari URL saat dipakai di `psql`. Format itu hanya untuk Prisma, bukan PostgreSQL native.

---

### `ERROR: syntax error at or near "CREATE"` di pgAdmin saat jalankan migration.sql

**Penyebab:** File `migration.sql` korup saat transfer — komentar dan perintah menempel tanpa newline. Contoh: `-- CreateSchemaCREATE SCHEMA...`.

**Solusi termudah:** Jangan pakai file `migration.sql`. Gunakan **Jalur A — `prisma db push`** (langkah 7) yang membaca langsung dari `schema.prisma`, bukan dari file SQL.

---

### App tidak start / 503

1. Cek log di Setup Node.js App → **View Log**
2. Kemungkinan:
   - `JWT_SECRET` terlalu pendek (<12 karakter) → app sengaja menolak start
   - `DATABASE_URL` salah → cek kredensial PostgreSQL
   - `dist/main.js` tidak ditemukan → pastikan extract di folder benar

---

### Memory faults > 0

1. Stop app
2. `NODE_OPTIONS=--max-old-space-size=160`
3. Start ulang
4. Kalau masih fault → pertimbangkan upgrade hosting atau VPS

---

### Auto-ops tidak jalan

1. Pastikan `AUTO_OPS_ENABLED=false`
2. Cek cron job terpasang: cPanel → **Cron Jobs**
3. Tes curl manual dengan `-v` → pastikan 200, bukan 403
4. Token salah? Cek `AUTO_OPS_CRON_TOKEN` di env

---

### Timeline perkiraan

| Langkah | Estimasi |
|---------|----------|
| 1. Bersihkan hosting | 2 menit |
| 2. Buat database | 2 menit |
| 3. Build paket (lokal) | 2-5 menit |
| 4. Upload | 1-5 menit |
| 5. Setup Node.js App | 3 menit |
| 6. SSH + install deps | 2-3 menit |
| 7. Schema DB | 1-5 menit |
| 8. Seed OWNER | 1 menit |
| 9. Nyalakan app | 1 menit |
| 10. Smoke test | 5 menit |
| 11. Cron Job | 2 menit |
| 12. Final check | 2 menit |
| **Total** | **±30-40 menit** |
