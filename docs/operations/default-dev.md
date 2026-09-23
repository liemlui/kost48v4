# Default & Seed DEV

> Migrasi dari docs/M08_DEPLOY_GO_LIVE.md + docs/M11_DEFAULT_DATA.md (M11 §1a, M11 §1b, M08 Bagian 3, M11 §9) pada f8f9a589 (DOC-GOV-20260922 Tahap 3); §1b dan catatan batch B9 ditambahkan 23 September 2026.
> Sumber asli (`docs/M11_DEFAULT_DATA.md`) sudah dihapus di Fase 3 (23 Sep 2026); perintah seed untuk lingkungan PRODUKSI ada di [Produksi & Operasional Harian](produksi.md).
> **Batas lingkungan:** seluruh isi DEV di file ini memakai basis data pengembangan **port 5433**; kredensial DEV tidak pernah berlaku untuk UAT/produksi.
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
> dummy. Baca §1b di file ini (kanonik).
> dan [M14 AO-03](../audit/audit-uiux-lintas-portal-2026-07.md#ao-03--p1--kredensial-dan-data-uat-tidak-mendukung-audit-lintas-role)
> sebelum eksekusi. Provisioning serta sesi login crawl memutasi DB UAT dan
> memerlukan lingkup izin terkait. `AUDIT_CONFIRM=1` tidak memvalidasi lingkungan.
> Password dari environment proses/secret manager; kredensial DEV bukan kredensial UAT.

### 1b. Akun Audit UAT Non-Personal (AO-03) — password TIDAK ditulis di docs

Target AO-03 adalah lima persona audit (OWNER, ADMIN, STAFF, TENANT dengan stay
aktif, TENANT tanpa stay aktif) pada UAT non-produksi yang telah diverifikasi.
**Status 8 Sep 2026: skrip tersedia, akun/fixture belum dibuktikan siap.**
Password berasal dari **environment proses/secret manager**, bukan docs/test.
`frontend/.env.example` adalah contoh nama variabel; config Playwright saat ini
tidak otomatis memuat `.env.local`.

- Skrip `backend/scripts/seed-audit-users.js` (alias `npm run seed:audit-users`
  dari backend) memakai OWNER existing untuk login; membuat ADMIN/STAFF bila
  belum ada, hingga dua portal TENANT, dan fallback satu tenant dummy tanpa stay.
  Tidak membuat stay/invoice/payment atau mengganti password/role akun lama.
- Pemilihan tenant existing masih otomatis dan inventaris pagination belum
  lengkap; ringkasan selesai dapat memuat kegagalan parsial. `AUDIT_CONFIRM=1`
  hanya flag, bukan verifikasi server/DB. Tetapkan identitas audit unik dan
  tenant fixture non-personal secara eksplisit sebelum provisioning.
- **Provisioning memutasi DB; login crawl juga memperbarui `lastLoginAt` dan
  membuat `RefreshToken`.** Lingkup izin UAT harus mencakup akun/portal serta sesi
  autentikasi. Rincian gap/prasyarat: [M14 AO-03](../audit/audit-uiux-lintas-portal-2026-07.md#ao-03--p1--kredensial-dan-data-uat-tidak-mendukung-audit-lintas-role).
- Konsumsi crawler: `frontend/e2e/audit-users.ts` (env `E2E_OWNER_*`,
  `E2E_ADMIN_*`, `E2E_STAFF_*`, `E2E_TENANT_ACTIVE_*`, `E2E_TENANT_NO_STAY_*`).
  Dua state TENANT baru dideklarasikan sebagai env, belum menjadi crawl UAT nyata
  di suite aktif. Kredensial kosong membuat crawl operasional di-skip.
- Empat status tetap dibedakan: implementasi lokal (mekanisme tersedia) ≠ akun
  benar-benar di-provision ≠ crawl lulus ≠ dampak terukur. Bukti tiga crawl
  operasional wajib mencatat eksekusi tanpa skip dan role/route yang benar.

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