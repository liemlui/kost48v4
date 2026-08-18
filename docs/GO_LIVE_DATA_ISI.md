# GO-LIVE KOST48 — Data yang Harus Diisi Owner

> Isi file ini **sebelum** deploy produksi. Kolom `[ISI]` = wajib Anda isi.
> Data kamar + 13 tenant (nama/NIK/tarif) **sudah ada** di `backend/scripts/seed-prod.js` — tidak perlu diisi ulang.
> Yang perlu Anda isi di bawah = data yang TIDAK ada di script / masih placeholder.

---

## 0. Kredensial Akun (JANGAN commit ke git — masuk `.env` di server)

| Akun | Email | Password | Status |
|------|-------|----------|--------|
| OWNER | `liem.lui@gmail.com` | `Lurin1234%` | ✅ sudah Anda tentukan |
| ADMIN | `[ISI]` | `[ISI]` | opsional — buat manual via UI/`seed-prod-reset.js` |
| STAFF (1 orang) | `[ISI]` | `[ISI]` | wajib — ada 1 staf |

> ⚠️ Catatan keamanan: password OWNER `Lurin1234%` panjang 9 karakter — lolos `seed-owner.js` (min 8), TAPI **ditolak** `seed-prod-reset.js` (min 12). Bila Anda pakai jalur `seed-prod-reset.js`, ganti ke password ≥12 karakter. Password ini TIDAK boleh masuk commit — set via env `OWNER_PASSWORD` saat seeding.

---

## 1. Env Produksi (A3) — checklist konfigurasi server

| Variabel | Nilai | Keterangan |
|----------|-------|------------|
| `NODE_ENV` | `production` | wajib |
| `DATABASE_URL` | `[ISI]` | postgres produksi 5432 `kost48_v3` |
| `JWT_SECRET` | `[ISI]` | random ≥32 char |
| `CORS_ORIGIN` | `[ISI]` | domain final frontend |
| `FRONTEND_URL` | `[ISI]` | domain final |
| `KTP_ACTIVATION_GATE_ENABLED` | `true` | WAJIB di produksi |
| `AUTO_OPS_ENABLED` | `false` | shared hosting/Passenger |
| `AUTO_OPS_CRON_TOKEN` | `[ISI]` | untuk cPanel Cron `POST /api/auto-ops/cron` |
| `BREVO_API_KEY` + `MAIL_FROM_*` | `[ISI]` | email reset password |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT` | `[ISI]` | opsional (PWA push) |
| `DEEPSEEK_API_KEY` | `[ISI]` | opsional (AI berbayar; kosongkan = offline) |
| `IOT_TUYA_POLL_ENABLED` | `false` | default; aktifkan setelah UAT lapangan |

---

## 2. Data Tenant yang Masih Kurang

`seed-prod.js` sudah membuat 13 tenant (nama + NIK + tarif + deposit). Email/HP untuk **5 orang berikut belum ada** — isi di sini:

| Kamar | Nama | Email (wajib) | HP (wajib) |
|-------|------|---------------|------------|
| F1 | Yufita Hieng | `[ISI]` | `[ISI]` |
| G | Yofi Nurkolifah | `[ISI]` | `[ISI]` |
| J | Lovandra | `[ISI]` | `[ISI]` |
| L | Destarika Hasan | `[ISI]` | `[ISI]` |
| M | Gabriel Excelly Pranajaya | `[ISI]` | `[ISI]` |

> 8 tenant lain sudah punya email+HP di `seed-prod.js`. Bila ada yang berubah, isi via UI Owner → Manajemen Tenant.

### Data detail tenant (opsional tapi berguna — via CSV `tenant-data-template.tsv`)

Kolom yang bisa diimpor `import-tenant-sheet.js`: `occupation`, `companyOrCampus`, `birthDate`, `gender`, `originProvince`, `emergencyContactName`, `emergencyContactPhone`, `howDidYouHear`, `notes`.
Gender 2 tenant masih kosong: **J (Lovandra)** dan **M (Gabriel)**.

---

## 3. Data Stay / Check-in (WAJIB — via UI Owner, bukan script)

Buat Stay via **UI Owner → Stays** agar aturan bisnis jalan (check-in wajib lunas, DP≠deposit). Siapkan per tenant:

| Kamar | Nama | Tanggal Masuk | Agreed Rent (tarif kontrak) | Deposit | Meter Listrik Awal (kWh) |
|-------|------|---------------|------------------------------|---------|---------------------------|
| A | Shinta Larista | 26/[ISI bln] | 1.700.000 | 0 | `[ISI]` |
| B | Dini Widiastutik | 1/[ISI bln] | 1.500.000 | 0 | `[ISI]` |
| C | Miko Rakatama A. W. | 28/[ISI bln] | 1.600.000 | 0 | `[ISI]` |
| D | Ade Chandra | 24/[ISI bln] | 1.500.000 | **200.000** | `[ISI]` |
| F1 | Yufita Hieng | 26/[ISI bln] | 1.700.000 | 0 | `[ISI]` |
| F2 | Patrick Wilfred | 8/[ISI bln] | 1.600.000 | 0 | `[ISI]` |
| G | Yofi Nurkolifah | 1/[ISI bln] | 800.000 | 0 | `[ISI]` |
| H | Welly Tanoto | 10/[ISI bln] | 800.000 | 0 | `[ISI]` |
| I | Agus Settiyo Budi | 5/[ISI bln] | 800.000 | 0 | `[ISI]` |
| J | Lovandra | 30/[ISI bln] | 1.500.000 | 0 | `[ISI]` |
| K | Meliana Tamara | 10/[ISI bln] | 1.600.000 | 0 | `[ISI]` |
| L | Destarika Hasan | 1/[ISI bln] | 1.600.000 | 0 | `[ISI]` |
| M | Gabriel Excelly P. | 3/[ISI bln] | 1.200.000 | 0 | `[ISI]` |

> ⚠️ **Penting:** "Tanggal Masuk" = tanggal hari di bulan yang Anda tentukan (bulan tiap tenant bisa beda — konfirmasi kapan sewa aktif).
> ⚠️ `seed-prod.js` TIDAK membuat stay/invoice/bayar. Semua dibuat via UI Owner agar konsisten (DP 30% lunas → check-in, dst).

---

## 4. Keuangan Fondasi (A5)

| Item | Nilai | Keterangan |
|------|-------|------------|
| Opening balance (saldo awal kas/bank) | `[ISI]` | atau tulis "ZERO-START" |
| Rekening tujuan transfer — Nama Bank | `[ISI]` | tampil di portal "Bayar Tagihan" |
| Rekening tujuan transfer — No. Rekening | `[ISI]` | |
| Rekening tujuan transfer — Atas Nama | `[ISI]` | |

> Rekening diisi via **UI Owner → Settings → Operasional** setelah deploy (bukan script).

---

## 5. Layanan Tambahan (opsional — biar portal "hidup")

| Layanan | Harga | Keterangan |
|---------|-------|------------|
| WiFi per perangkat/bulan | `[ISI]` (contoh: 50.000) | via UI Owner → AdditionalService |
| Lainnya (parkir, dll.) | `[ISI]` | |

---

## 6. Pengumuman Awal (opsional)

| Judul | Isi | Kategori |
|-------|-----|----------|
| `[ISI]` (mis. "Selamat Datang") | `[ISI]` | `info` / `urgent` / `maintenance` |

---

## 7. Audit yang Harus Dilakukan (ringkasan — detail di chat)

- **A1** Konfirmasi server/domain/HTTPS/PostgreSQL 5432/env rahasia.
- **A2** Fresh provision DB kosong → `prisma migrate deploy` → OWNER → COA/periode/kas.
- **A3** Env produksi (lihat §1).
- **A4** Ganti password OWNER dari dummy → `Lurin1234%` (atau yang ≥12 bila pakai reset).
- **A5** Opening balance / zero-start.
- **A6** Smoke test: login OWNER, `/api/public/rooms` 200, trial balance `isBalanced:true`, recon mismatch 0, readiness tanpa merah.
