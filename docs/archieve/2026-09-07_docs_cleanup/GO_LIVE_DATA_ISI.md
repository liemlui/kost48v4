# GO-LIVE KOST48 â€” Data yang Harus Diisi Owner

> **Arah aktif 6 Sep 2026:** [M12](M12_CHECKLIST_CHANGELOG.md) adalah checklist tunggal; **Fase EF diprioritaskan dan Fase MA ditunda**. Isi identitas deployment dan pengamatan pasif pada [M19 Â§9](M19_EFISIENSI_HOSTING_512MB.md#9-pencatatan-hosting-ef-00-dan-ef-02) terlebih dahulu. Form ini untuk persiapan data bisnis, bukan izin seed, deploy, restart, atau mutasi DB. Nama/jumlah data pada catatan lama belum membuktikan data produksi saat ini.
> Jangan isi/commit password, token atau key ke dokumen/chat. Isikan kredensial langsung melalui mekanisme aplikasi/server yang diizinkan; laporan cukup status tersedia/belum.

> Isi file ini **sebelum** deploy produksi. Kolom `[ISI]` = wajib Anda isi.
> Data kamar + 13 tenant (nama/NIK/tarif) **sudah ada** di `backend/scripts/seed-prod.js` â€” tidak perlu diisi ulang.
> Yang perlu Anda isi di bawah = data yang TIDAK ada di script / masih placeholder.

---

## 0. Kredensial Akun (JANGAN commit ke git - set via env di server)

| Akun | Email | Password | Status |
|------|-------|----------|--------|
| OWNER | `liem.lui@gmail.com` | diset via env `OWNER_PASSWORD` saat seed - TIDAK ditulis di repo/chat | sudah Anda tentukan |
| ADMIN | `[ISI]` | `[ISI]` | opsional â€” buat manual via UI/`seed-prod-reset.js` |
| STAFF (1 orang) | `[ISI]` | `[ISI]` | wajib â€” ada 1 staf |

> Catatan keamanan: password OWNER TIDAK ditulis di dokumen ini. Set via env `OWNER_PASSWORD` saat seeding - JANGAN commit nilai ke git/chat. Bila memakai jalur `seed-prod-reset.js`, password wajib >=12 karakter (lebih ketat dari `seed-owner.js` min 8).

---

## 1. Env Produksi (A3) â€” checklist konfigurasi server

| Variabel | Nilai | Keterangan |
|----------|-------|------------|
| `NODE_ENV` | `production` | wajib |
| `DATABASE_URL` | `[ISI]` | postgres produksi 5432 `kost48_v3` |
| `JWT_SECRET` | `[ISI]` | random â‰¥32 char |
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

`seed-prod.js` sudah membuat 13 tenant (nama + NIK + tarif + deposit). Email/HP untuk **1 orang berikut belum ada** â€” isi di sini:

| Kamar | Nama | Email (wajib) | HP (wajib) |
|-------|------|---------------|------------|
| F1 | GUNAWAN | â€” *(segera checkout â€” tidak perlu akun portal)* | `081330787868` |

> 12 tenant lain sudah punya email+HP di `seed-prod.js`. Bila ada yang berubah, isi via UI Owner â†’ Manajemen Tenant.

### Data detail tenant (opsional tapi berguna â€” via CSV `tenant-data-template.tsv`)

Kolom yang bisa diimpor `scripts/archive/import-tenant-sheet.js`: `occupation`, `companyOrCampus`, `birthDate`, `gender`, `originProvince`, `emergencyContactName`, `emergencyContactPhone`, `howDidYouHear`, `notes`.
Gender 2 tenant masih kosong: **J (Lovandra)** dan **M (Gabriel)**.

---

## 3. Data Stay / Check-in (WAJIB â€” via UI Owner, bukan script)

Buat Stay via **UI Owner â†’ Stays** agar aturan bisnis jalan (check-in wajib lunas, DPâ‰ deposit). Siapkan per tenant:

| Kamar | Nama | Tanggal Masuk | Agreed Rent (tarif kontrak) | Deposit | Meter Listrik Awal (kWh) |
|-------|------|---------------|------------------------------|---------|---------------------------|
| A | Shinta Larista | 26 Jun 2026 | 1.700.000 | 0 | â‰ˆ 11.224 |
| B | Dini Widiastutik | 1 Apr 2026 | 1.500.000 | 0 | â‰ˆ 6.074 |
| C | Miko Rakatama A. W. | 28 Mar 2026 | 1.600.000 | 0 | â‰ˆ 8.178 |
| D | Ade Chandra | 24 Agu 2025 | 1.500.000 | **200.000** | â‰ˆ 5.629 |
| F1 | GUNAWAN | 27 Jul 2026 | 1.700.000 | 0 | `[ISI]` |
| F2 | Patrick Wilfred | 8 Jun 2026 | 1.600.000 | 0 | `[ISI]` |
| G | Yofi Nurkolifah | 1 Agu 2025 | 800.000 | 0 | `[ISI]` |
| H | Welly Tanoto | 10 Mei 2025 | 800.000 | 0 | `[ISI]` |
| I | Theo Wijaya | 5 Mei 2025 | 800.000 | 0 | `[ISI]` |
| J | Lovandra | 30 Jan 2026 | 1.500.000 | 0 | â‰ˆ 3.893 |
| K | Meliana Tamara | 10 Mei 2025 | 1.600.000 | 0 | â‰ˆ 8.641 |
| L | Destarika Hasan | 1 Mei 2025 | 1.600.000 | 0 | â‰ˆ 5.697 |
| M | Gabriel Excelly P. | 3 Mei 2025 | 1.200.000 | 0 | `[ISI]` |

> ðŸ“Š **Meter awal (dari `Scan/â€¦Transaksi Lengkap` kolom `Kwh/Meter`):** angka `â‰ˆ` = pembacaan meter absolut terakhir (Junâ€“Jul 2026). Karena data historis, **WAJIB cek fisik ulang saat go-live** â€” bisa beda karena masih ada pemakaian setelah tanggal itu.
> - B (6.074) & M â€” meter tercatat "pemakaian/bulan" (bukan absolut) sejak beberapa bulan; nilai di atas = absolut terakhir yang ketemu, **stale**.
> - F1/F2/G/H/I â€” tidak ada pembacaan absolut (G/H/I ECONOMY tidak ada tagihan listrik terpisah di laporan).

> ðŸ“… **Tanggal masuk** diambil dari `Scan/KOST48_Historical_DB_AI_CONTEXT.md` Â§8 (`first_billing_month` per kamar saat ini). Catatan owner:
> - **B (Dini)** â€” sudah ngekos **sejak sebelum Nov 2024** (arsip digital baru mulai Nov 2024); awal di kamar C, pindah ke B **1 Apr 2026**. Tanggal check-in asli tidak tercatat di arsip.
> - **I (Theo Wijaya)** â€” **masih aktif**, tapi belum bayar **Jul + Agustus 2026 (2 bulan)**. Jangan dianggap checkout.
> âš ï¸ `seed-prod.js` TIDAK membuat stay/invoice/bayar. Semua dibuat via UI Owner agar konsisten (DP 30% lunas â†’ check-in, dst).

---

## 4. Keuangan Fondasi (A5)

| Item | Nilai | Keterangan |
|------|-------|------------|
| Opening balance (saldo awal kas/bank) | `[ISI]` | atau tulis "ZERO-START" |
| Rekening tujuan transfer â€” Nama Bank | `[ISI]` | tampil di portal "Bayar Tagihan" |
| Rekening tujuan transfer â€” No. Rekening | `[ISI]` | |
| Rekening tujuan transfer â€” Atas Nama | `[ISI]` | |

> Rekening diisi via **UI Owner â†’ Settings â†’ Operasional** setelah deploy (bukan script).

---

## 5. Layanan Tambahan (opsional â€” biar portal "hidup")

| Layanan | Harga | Keterangan |
|---------|-------|------------|
| WiFi per perangkat/bulan | `[ISI]` (contoh: 50.000) | via UI Owner â†’ AdditionalService |
| Lainnya (parkir, dll.) | `[ISI]` | |

---

## 6. Pengumuman Awal (opsional)

| Judul | Isi | Kategori |
|-------|-----|----------|
| `[ISI]` (mis. "Selamat Datang") | `[ISI]` | `info` / `urgent` / `maintenance` |

---

## 7. Audit yang Harus Dilakukan (ringkasan â€” detail di chat)

- **A1** Konfirmasi server/domain/HTTPS/PostgreSQL 5432/env rahasia.
- **A2** Fresh provision DB kosong â†’ `prisma migrate deploy` â†’ OWNER â†’ COA/periode/kas.
- **A3** Env produksi (lihat Â§1).
- **A4** Ganti password OWNER dari dummy -> set password real via env `OWNER_PASSWORD` (>=12 bila memakai `seed-prod-reset.js`; nilai tidak ditulis di repo/chat).
- **A5** Opening balance / zero-start.
- **A6** Smoke test: login OWNER, `/api/public/rooms` 200, trial balance `isBalanced:true`, recon mismatch 0, readiness tanpa merah.

---

## 8. Data Historis Terkonsolidasi (referensi migrasi)

> ðŸ“„ Riwayat lengkap KOST48 (Nov 2024 â€“ Agustus 2026) sudah owner konsolidasi ke **`Scan/KOST48_Historical_DB_AI_CONTEXT.md`** â€” 215 kwitansi, 92 pengeluaran, 59 tenant historis. Pakai sebagai sumber kebenaran historis saat migrasi/audit.

**Antrean konfirmasi SEBELUM migrasi (dari Â§5 file tsb â€” yang relevan go-live):**

| Prioritas | Temuan | Resolusi owner (18 Agu 2026) |
|-----------|--------|------------------------------|
| HIGH | Tidak ada kwitansi/rekap pemasukan **Janâ€“Apr 2025** | â³ Belum dicari owner â€” menyusul bila ketemu |
| HIGH | Tidak ada data **pengeluaran 2026** (token, Indihome, PDAM, dll.) | â³ Belum direkap sejak Jan 2026 â€” menyusul |
| HIGH | Periode J (Lovandra) "30 Jan â€“ **30 Feb 2026**" (invalid) | âœ… Buat valid â†’ **30 Jan â€“ 28 Feb 2026** |
| HIGH | 1 kwitansi Yofi (1 Janâ€“1 Feb 2026) tanpa kamar jelas | âœ… Kamar **G** |
| MEDIUM | 5 party tanpa KTP (perusahaan/short-stay: PT Juara Apparel, Yuni Pizza, dll.) | Isi bila perlu; boleh `identity_type` selain KTP |
| MEDIUM | 33 record meter ada angka tapi nominal listrik belum terverifikasi | Simpan NULL, jangan paksa Rp0 |
| MEDIUM | Alias nama (Miko/Adhi, Thea/Felix, Theo="Agus Settiyo Budi") | Pakai `tenant_id` + alias, bukan nama string |

**Keputusan owner lain (18 Agu 2026):** rekening transfer diisi via **UI Owner â†’ Settings Operasional** nanti (bukan script); email GUNAWAN (F1) **tidak perlu** (segera checkout).

**Aturan migrasi (dari Â§13):** urutan ROOMS â†’ TENANTS â†’ RECEIPTS â†’ CHARGE_LINES â†’ EXPENSES (buang `OWNER_PERSONAL_EXCLUDED`); jangan pakai `MONTHLY_SUMMARY` sebagai ledger; data hilang = `NULL`, bukan nol karangan.
