# 🚀 KOST48 v1.1.0 — Deploy cPanel Shared Hosting (512MB)

> **Paket:** `kost48-deploy-bundled.tgz` (43MB) — backend + frontend + **node_modules** PREBUILT.
> **Server TIDAK build apa pun. TIDAK npm install. TIDAK npm ci.** Extract → isi .env → start.
> Tanpa tsc, tanpa prisma generate, tanpa devDependencies.

---

## PRA-SYARAT

- cPanel dengan Node.js 22 + PostgreSQL
- Domain + SSL (AutoSSL gratis dari cPanel)
- File `kost48-deploy-bundled.tgz` sudah di-download dari repo

---

## LANGKAH DEMI LANGKAH (≈20 menit)

### 1. BUAT DATABASE

```
cPanel → PostgreSQL Databases
```

| Field | Isi |
|-------|-----|
| Database | `kost48_v3` |
| User | (buat baru, mis. `kost48_user`) |
| Password | (generate kuat, simpan) |
| Privileges | **ALL PRIVILEGES** |

Catat:
```
DATABASE_URL=postgresql://kost48_user:PASSWORD@127.0.0.1:5432/kost48_v3?schema=public
```

---

### 2. UPLOAD & EXTRACT

```
cPanel → File Manager → folder root (mis. /home/user/kost48)
```

1. Upload `kost48-deploy-bundled.tgz` (43MB)
2. Klik kanan → **Extract**
3. Pastikan struktur:
   ```
   /home/user/kost48/
   ├── dist/              ← backend compiled
   ├── client/            ← frontend SPA
   ├── node_modules/      ← SEMUA production dependencies (176 packages)
   ├── prisma/            ← schema.prisma
   ├── sql/               ← setup.sql + bootstrap.sql
   ├── scripts/           ← seed-owner.js + bootstrap-tuya-kwh.js
   ├── package.json
   └── .env.example
   ```

> ⚠️ Jika File Manager extract menghasilkan subfolder, pindahkan semua isinya ke root.

---

### 3. SETUP NODE.JS APP + .ENV

```
cPanel → Setup Node.js App
```

| Field | Isi |
|-------|-----|
| Node.js version | **22** |
| Application mode | **Production** |
| Application root | `/home/user/kost48` |
| Application URL | (pilih domain) |
| Startup file | **`dist/main.js`** |

**Environment Variables:**
```
NODE_OPTIONS=--max-old-space-size=192
```
> ⚠️ `NODE_OPTIONS` WAJIB di sini, **TIDAK BISA** via `.env`.

Klik **Create** — **JANGAN** start dulu.

---

### 4. ISI .ENV

Buka **Terminal** (cPanel → Terminal, atau SSH):

```bash
cd /home/user/kost48
cp .env.example .env
nano .env
```

**Isi minimal `.env`:**
```env
DATABASE_URL="postgresql://kost48_user:PASSWORD@127.0.0.1:5432/kost48_v3?schema=public"
JWT_SECRET="(generate di bawah)"
NODE_ENV=production
CORS_ORIGIN="https://domain-anda.com"
KTP_ACTIVATION_GATE_ENABLED=true
AUTO_OPS_ENABLED=false
AUTO_OPS_CRON_TOKEN="(generate di bawah)"

# ── Tuya IoT (KWH meter) ──
TUYA_ACCESS_KEY=(dari Tuya IoT Console)
TUYA_SECRET_KEY=(dari Tuya IoT Console)
TUYA_API_BASE=https://openapi.tuyaus.com
IOT_TUYA_POLL_ENABLED=false
IOT_TUYA_POLL_MINUTES=10
IOT_TUYA_CRON_TOKEN="(generate di bawah)"
IOT_STALE_AFTER_MINUTES=30

# ── ESP32 Water Flow (opsional) ──
IOT_MASTER_KEY=(generate di bawah)
```

**Generate secret:**
```bash
# JWT Secret (64 byte hex)
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Token cron auto-ops + IoT (masing-masing 32 byte hex)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# IOT_MASTER_KEY (32 byte base64, untuk ESP32)
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

---

### 5. SETUP DATABASE

```bash
# 1. Schema via Prisma
npx prisma db push

# 2. Seed — fix ownership + trigger + data master (1 file, 1x run)
psql "postgresql://kost48s1@/kost48s1_kost48_v3" -f sql/seed.sql
```

> ⚠️ **Ganti `kost48s1_lurin`** di baris 5 `seed.sql` jika user PostgreSQL di `DATABASE_URL` berbeda.
> File `sql/fix-ownership.sql` tetap disertakan sebagai referensi standalone.

---

### 6. SEED OWNER PERTAMA

```bash
OWNER_EMAIL=owner@domain-anda.com \
OWNER_PASSWORD='PasswordKuatMin8Char' \
OWNER_FULLNAME='Pemilik KOST48' \
npm run seed:owner
```

---

### 7. START APP

Kembali ke **cPanel → Setup Node.js App** → klik **Start**.

Cek apakah app hidup:
```bash
curl -s http://localhost:3000/ | head -5       # harus return HTML
curl -s http://localhost:3000/api/public/rooms  # harus return JSON
```

---

### 8. SETUP SSL

```
cPanel → SSL/TLS Status → pilih domain → Run AutoSSL
```

Setelah HTTPS aktif, update `.env`:
```env
CORS_ORIGIN="https://domain-anda.com"
```
Lalu **Restart App**.

---

### 9. SETUP CRON JOBS (WAJIB — 2 cron)

```
cPanel → Cron Jobs
```

**Cron 1 — Auto-Ops (tiap 5 menit):**
```
*/5 * * * * curl -fsS -X POST -H "X-Cron-Token: ISI_AUTO_OPS_CRON_TOKEN" https://domain-anda.com/api/auto-ops/cron >/dev/null 2>&1
```

**Cron 2 — IoT Tuya Polling (tiap 10 menit):**
```
*/10 * * * * curl -fsS -X POST -H "X-Iot-Cron-Token: ISI_IOT_TUYA_CRON_TOKEN" https://domain-anda.com/api/iot/tuya/cron >/dev/null 2>&1
```

> Shared hosting pakai Passenger — app idle-sleep saat sepi. Cron membangunkannya.

---

### 10. BOOTSTRAP TUYA KWH (sekali setelah deploy)

```bash
cd /home/user/kost48
node scripts/bootstrap-tuya-kwh.js --sync
```

Ini akan register 13 KWH meter + tarik data telemetry pertama dari Tuya Cloud.

---

### 11. SETUP AWAL DI UI (login OWNER)

1. Buka `https://domain-anda.com` → **Login** dengan email & password OWNER
2. Seed Chart of Accounts: **Finance → Accounting Setup** → klik tombol seed COA
3. Buat **Periode Akuntansi** OPEN (bulan berjalan)
4. Buat **Cash Account** (rekening operasional)
5. Isi data kamar, fasilitas, foto (via UI Admin)

---

### 12. BUAT FOLDER UPLOADS

```bash
mkdir -p /home/user/kost48/uploads
chmod 700 /home/user/kost48/uploads
```

---

### 13. SMOKE TEST

| Cek | Action |
|-----|--------|
| Halaman publik | Buka `https://domain-anda.com` — tampil landing |
| API publik | `curl https://domain-anda.com/api/public/rooms` → JSON 200 |
| Login OWNER | Login → masuk dashboard |
| Trial Balance | Finance → Accounting Setup → TB balanced |
| IoT Dashboard | `/iot` → 13 KWH device, 11 online |
| Memory | cPanel → Resource Usage → **0 memory faults** |

---

## TROUBLESHOOTING

| Masalah | Solusi |
|---------|--------|
| App tidak start | Cek error log di Setup Node.js App. Pastikan Node 22 |
| 502 Bad Gateway | Tunggu 30 detik. Cek `NODE_OPTIONS=--max-old-space-size=192` |
| Memory faults | Turunkan `NODE_OPTIONS` ke `--max-old-space-size=160` |
| Tuya 503 | Cek `TUYA_ACCESS_KEY` + `TUYA_SECRET_KEY`. Restart app |
| IoT dashboard kosong | Jalankan `node scripts/bootstrap-tuya-kwh.js --sync` |
| KTP gate OFF | Cek `KTP_ACTIVATION_GATE_ENABLED=true` di .env, restart |
| Cron tidak jalan | Cek token di header cocok dengan .env |

---

## REDEPLOY (update)

```bash
# 1. Stop app (cPanel → Setup Node.js App → Stop)
# 2. Backup database + uploads/
pg_dump "postgresql://..." > backup-$(date +%Y%m%d).sql
tar -czf uploads-backup-$(date +%Y%m%d).tgz uploads/

# 3. Extract TGZ baru (TANPA hapus uploads/ atau .env)
# 4. Start app
```

> **TIDAK perlu npm install** — node_modules sudah termasuk dalam TGZ.

---

**Versi:** 1.2.0 · **Build:** 2026-07-18 · **TGZ:** `kost48-deploy-bundled.tgz` (33MB)
