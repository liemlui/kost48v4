# Akun Dummy DEV (login cepat)

> ⚠️ **HANYA untuk DB pengembangan** (port **5433** `kost48_v3_pro`). Dibuat oleh
> `backend/scripts/seed-dev-dummy.js` (wipe + isi atomik). **JANGAN dipakai di produksi** —
> di produksi, ganti password OWNER dengan yang kuat.

Login di `http://localhost:5173/login`. Field "identifier" = email.

## Back-office
| Role | Email | Password |
|------|-------|----------|
| **OWNER** | `owner@kost48.com` | `Owner#2026` |
| **ADMIN** | `admin@kost48.com` | `admin123` |
| **STAFF** | `staff@kost48.com` | `staff123` |

## Penghuni (TENANT) — semua password sama: `Tenant#2026`
Pola email: `<nama-depan>.tenant@kost48.test`. 16 tenant pertama menempati kamar A–P:

| Kamar | Nama | Email |
|-------|------|-------|
| A | Maya Pratiwi | `maya.tenant@kost48.test` |
| B | Dimas Saputra | `dimas.tenant@kost48.test` |
| C | Cindy Wijaya | `cindy.tenant@kost48.test` |
| D | Hendra Gunawan | `hendra.tenant@kost48.test` |
| E | Gita Lestari | `gita.tenant@kost48.test` |
| F | Indah Permata | `indah.tenant@kost48.test` |
| G | Bayu Nugroho | `bayu.tenant@kost48.test` |
| H | Karin Salsabila | `karin.tenant@kost48.test` |
| I | Lani Kusuma | `lani.tenant@kost48.test` |
| J | Rizky Ramadhan | `rizky.tenant@kost48.test` |
| K | Putri Anggraini | `putri.tenant@kost48.test` |
| L | Fajar Maulana | `fajar.tenant@kost48.test` |
| M | Sari Melati | `sari.tenant@kost48.test` |
| N | Andi Wirawan | `andi.tenant@kost48.test` |
| O | Nadia Safitri | `nadia.tenant@kost48.test` |
| P | Eko Prasetyo | `eko.tenant@kost48.test` |

Kamar Q–U (5 kamar) = **AVAILABLE** (kosong, untuk uji booking).

## Reset / isi ulang dummy
```
cd backend && node scripts/seed-dev-dummy.js
```
Setelah seed, login owner → **Pengaturan ▸ "Siapkan Bagan Akun (COA)"** untuk fondasi
akuntansi (agar laporan keuangan terisi; tanpa ini KPI keuangan = Rp 0).
