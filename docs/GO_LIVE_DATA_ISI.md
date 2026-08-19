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

`seed-prod.js` sudah membuat 13 tenant (nama + NIK + tarif + deposit). Email/HP untuk **1 orang berikut belum ada** — isi di sini:

| Kamar | Nama | Email (wajib) | HP (wajib) |
|-------|------|---------------|------------|
| F1 | GUNAWAN | — *(segera checkout — tidak perlu akun portal)* | `081330787868` |

> 12 tenant lain sudah punya email+HP di `seed-prod.js`. Bila ada yang berubah, isi via UI Owner → Manajemen Tenant.

### Data detail tenant (opsional tapi berguna — via CSV `tenant-data-template.tsv`)

Kolom yang bisa diimpor `scripts/archive/import-tenant-sheet.js`: `occupation`, `companyOrCampus`, `birthDate`, `gender`, `originProvince`, `emergencyContactName`, `emergencyContactPhone`, `howDidYouHear`, `notes`.
Gender 2 tenant masih kosong: **J (Lovandra)** dan **M (Gabriel)**.

---

## 3. Data Stay / Check-in (WAJIB — via UI Owner, bukan script)

Buat Stay via **UI Owner → Stays** agar aturan bisnis jalan (check-in wajib lunas, DP≠deposit). Siapkan per tenant:

| Kamar | Nama | Tanggal Masuk | Agreed Rent (tarif kontrak) | Deposit | Meter Listrik Awal (kWh) |
|-------|------|---------------|------------------------------|---------|---------------------------|
| A | Shinta Larista | 26 Jun 2026 | 1.700.000 | 0 | ≈ 11.224 |
| B | Dini Widiastutik | 1 Apr 2026 | 1.500.000 | 0 | ≈ 6.074 |
| C | Miko Rakatama A. W. | 28 Mar 2026 | 1.600.000 | 0 | ≈ 8.178 |
| D | Ade Chandra | 24 Agu 2025 | 1.500.000 | **200.000** | ≈ 5.629 |
| F1 | GUNAWAN | 27 Jul 2026 | 1.700.000 | 0 | `[ISI]` |
| F2 | Patrick Wilfred | 8 Jun 2026 | 1.600.000 | 0 | `[ISI]` |
| G | Yofi Nurkolifah | 1 Agu 2025 | 800.000 | 0 | `[ISI]` |
| H | Welly Tanoto | 10 Mei 2025 | 800.000 | 0 | `[ISI]` |
| I | Theo Wijaya | 5 Mei 2025 | 800.000 | 0 | `[ISI]` |
| J | Lovandra | 30 Jan 2026 | 1.500.000 | 0 | ≈ 3.893 |
| K | Meliana Tamara | 10 Mei 2025 | 1.600.000 | 0 | ≈ 8.641 |
| L | Destarika Hasan | 1 Mei 2025 | 1.600.000 | 0 | ≈ 5.697 |
| M | Gabriel Excelly P. | 3 Mei 2025 | 1.200.000 | 0 | `[ISI]` |

> 📊 **Meter awal (dari `Scan/…Transaksi Lengkap` kolom `Kwh/Meter`):** angka `≈` = pembacaan meter absolut terakhir (Jun–Jul 2026). Karena data historis, **WAJIB cek fisik ulang saat go-live** — bisa beda karena masih ada pemakaian setelah tanggal itu.
> - B (6.074) & M — meter tercatat "pemakaian/bulan" (bukan absolut) sejak beberapa bulan; nilai di atas = absolut terakhir yang ketemu, **stale**.
> - F1/F2/G/H/I — tidak ada pembacaan absolut (G/H/I ECONOMY tidak ada tagihan listrik terpisah di laporan).

> 📅 **Tanggal masuk** diambil dari `Scan/KOST48_Historical_DB_AI_CONTEXT.md` §8 (`first_billing_month` per kamar saat ini). Catatan owner:
> - **B (Dini)** — sudah ngekos **sejak sebelum Nov 2024** (arsip digital baru mulai Nov 2024); awal di kamar C, pindah ke B **1 Apr 2026**. Tanggal check-in asli tidak tercatat di arsip.
> - **I (Theo Wijaya)** — **masih aktif**, tapi belum bayar **Jul + Agustus 2026 (2 bulan)**. Jangan dianggap checkout.
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

---

## 8. Data Historis Terkonsolidasi (referensi migrasi)

> 📄 Riwayat lengkap KOST48 (Nov 2024 – Agustus 2026) sudah owner konsolidasi ke **`Scan/KOST48_Historical_DB_AI_CONTEXT.md`** — 215 kwitansi, 92 pengeluaran, 59 tenant historis. Pakai sebagai sumber kebenaran historis saat migrasi/audit.

**Antrean konfirmasi SEBELUM migrasi (dari §5 file tsb — yang relevan go-live):**

| Prioritas | Temuan | Resolusi owner (18 Agu 2026) |
|-----------|--------|------------------------------|
| HIGH | Tidak ada kwitansi/rekap pemasukan **Jan–Apr 2025** | ⏳ Belum dicari owner — menyusul bila ketemu |
| HIGH | Tidak ada data **pengeluaran 2026** (token, Indihome, PDAM, dll.) | ⏳ Belum direkap sejak Jan 2026 — menyusul |
| HIGH | Periode J (Lovandra) "30 Jan – **30 Feb 2026**" (invalid) | ✅ Buat valid → **30 Jan – 28 Feb 2026** |
| HIGH | 1 kwitansi Yofi (1 Jan–1 Feb 2026) tanpa kamar jelas | ✅ Kamar **G** |
| MEDIUM | 5 party tanpa KTP (perusahaan/short-stay: PT Juara Apparel, Yuni Pizza, dll.) | Isi bila perlu; boleh `identity_type` selain KTP |
| MEDIUM | 33 record meter ada angka tapi nominal listrik belum terverifikasi | Simpan NULL, jangan paksa Rp0 |
| MEDIUM | Alias nama (Miko/Adhi, Thea/Felix, Theo="Agus Settiyo Budi") | Pakai `tenant_id` + alias, bukan nama string |

**Keputusan owner lain (18 Agu 2026):** rekening transfer diisi via **UI Owner → Settings Operasional** nanti (bukan script); email GUNAWAN (F1) **tidak perlu** (segera checkout).

**Aturan migrasi (dari §13):** urutan ROOMS → TENANTS → RECEIPTS → CHARGE_LINES → EXPENSES (buang `OWNER_PERSONAL_EXCLUDED`); jangan pakai `MONTHLY_SUMMARY` sebagai ledger; data hilang = `NULL`, bukan nol karangan.
