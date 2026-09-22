# Default & Seed DEV

> Migrasi dari docs/M08_DEPLOY_GO_LIVE.md + docs/M11_DEFAULT_DATA.md (M11 §1a, M08 Bagian 3, M11 §9) pada f8f9a589 (DOC-GOV-20260922 Tahap 3).
> Sumber asli dipertahankan sebagai pointer.

### 1a. Akun Fondasi seed-dev (khusus database pengembangan port 5433)

| Role  | Email                  | Password    | Keterangan                        |
|-------|------------------------|-------------|-----------------------------------|
| OWNER | `owner@kost48.com`     | `Owner#2026`| Dibuat via `seed-dev-reset.js` (DEV) / `golive-setup.js` (produksi, password beda via env) |
| ADMIN | `admin@kost48.com`     | `admin123`  | **DEV only** (seed-dev); produksi buat manual |
| STAFF | `staff@kost48.com`     | `staff123`  | **DEV only** (seed-dev); produksi buat manual |

> Kredensial di atas adalah fondasi **DEV** dan TIDAK boleh dipakai sebagai kredensial audit UAT/produksi.

## Bagian 3 - `docs/archieve/2026-06-16_si_notes/_AKUN_DUMMY_DEV.md`

> DEV ONLY: akun dan data di bagian ini hanya untuk database pengembangan port 5433. Jangan pakai password ini di produksi.
>
> **Penting (AO-03, diperbarui 2026-09-08):** akun dummy di bawah adalah fondasi **DEV**.
> `backend/scripts/seed-audit-users.js` (`npm run seed:audit-users`) tersedia,
> tetapi gap target/fixture/pagination/gate sukses belum ditutup. OWNER existing
> dipakai login; skrip dapat membuat ADMIN/STAFF, dua portal TENANT dan satu tenant
> dummy. Baca [M11 §1b](../M11_DEFAULT_DATA.md#1b-akun-audit-uat-non-personal-ao-03--password-tidak-ditulis-di-docs)
> dan [M14 AO-03](../M14_AUDIT_UI_UX.md#ao-03--p1--kredensial-dan-data-uat-tidak-mendukung-audit-lintas-role)
> sebelum eksekusi. Provisioning serta sesi login crawl memutasi DB UAT dan
> memerlukan lingkup izin terkait. `AUDIT_CONFIRM=1` tidak memvalidasi lingkungan.
> Password dari environment proses/secret manager; kredensial DEV bukan kredensial UAT.

### Akun Dummy DEV (login cepat) - SI-1 event-path

Data dummy **wajib dibuat lewat endpoint nyata (HTTP)**, bukan raw insert. Ini keputusan owner 2026-06-16: dummy harus melewati kejadian bisnis asli agar aturan service, invoice, deposit, meter, jurnal, dan audit trail ikut berjalan.

Login di `http://localhost:5173/login` (field `identifier` = email).

#### Cara isi ulang (wipe + reseed)

```bash
cd backend
node scripts/seed-dev-reset.js
# restart backend dev: npm run start:dev
node scripts/seed-dev-via-api.js
```

Alternatif npm:

```bash
npm run seed:dev:reset
npm run seed:dev:api
```

Seeder raw/bypass lama **usang** untuk data bisnis karena melewati aturan service. Jangan dipakai sebagai sumber data demo aktif.

#### Back-office

| Role | Email | Password |
|------|-------|----------|
| OWNER | `owner@kost48.com` | `Owner#2026` |
| ADMIN | `admin@kost48.com` | `admin123` |
| STAFF | `staff@kost48.com` | `staff123` |

#### Penghuni (TENANT)

Password semua tenant: `Tenant#2026`.

| Kamar | Nama | Email |
|-------|------|-------|
| K-A | Maya Pratiwi | `maya.tenant@kost48.test` |
| K-B | Dimas Saputra | `dimas.tenant@kost48.test` |
| K-C | Cindy Wijaya | `cindy.tenant@kost48.test` |
| K-D | Hendra Gunawan | `hendra.tenant@kost48.test` |
| K-E | Gita Lestari | `gita.tenant@kost48.test` |
| K-F | Indah Permata | `indah.tenant@kost48.test` |
| K-G | Bayu Nugroho | `bayu.tenant@kost48.test` |
| K-H | Karin Salsabila | `karin.tenant@kost48.test` |
| K-I | Lani Kusuma | `lani.tenant@kost48.test` |
| K-J | Rizky Ramadhan | `rizky.tenant@kost48.test` |
| K-K | Putri Anggraini | `putri.tenant@kost48.test` |
| K-L | Fajar Maulana | `fajar.tenant@kost48.test` |
| K-M | Sari Melati | `sari.tenant@kost48.test` |
| K-N | Andi Wirawan | `andi.tenant@kost48.test` |
| K-O | Nadia Safitri | `nadia.tenant@kost48.test` |
| K-P | Eko Prasetyo | `eko.tenant@kost48.test` |

Kamar `K-Q` sampai `K-T` tersedia untuk uji booking/check-in.

#### Isi data terverifikasi

- 20 kamar: 16 terisi, 4 kosong.
- 16 penghuni dan 16 stay ACTIVE promoted.
- 19 invoice: 16 sewa + 3 meter listrik; 12 PAID, 7 ISSUED.
- 16 deposit HELD Rp500.000/kamar, terjurnal.
- Trial balance seimbang dan tidak ada dobel-tagih.

---

## 9. Ringkasan Perintah Seed

```bash
# DEV — Reset + seed ulang dari nol:
cd backend
npm run seed:dev:reset     # Bersihkan DB + buat kamar + akun internal
# (pastikan backend dev sudah jalan: npm run start:dev)
npm run seed:dev:api       # Buat tenant + stay + invoice + bayar + tiket + survei

# FAQ (idempoten — aman diulang):
# POST http://localhost:3000/api/faqs/seed  (perlu login OWNER)

# PRODUKSI — input data tenant real (nama, NIK, kamar, tarif):
# 1. Pastikan DB fresh & kamar sudah terbuat (via golive-setup atau seed:dev:reset)
# 2. Jalankan seed-prod:
node scripts/seed-prod.js
# 3. Email/HP/occupation tenant → input via UI Owner → Manajemen Tenant
# 4. Deposit → atur via UI Owner
```

---

*Diperbarui: 2026-07-08 · Sumber: owner KOST48 (data tenant real) + kost48surabaya.com + faqs.service.ts*

---
