# Akun Dummy DEV (login cepat) — SI-1 event-path

> ⚠️ **HANYA DB pengembangan** (port **5433** `kost48_v3_pro`). Data dibuat **lewat endpoint
> nyata** (HTTP), bukan raw insert — aturan bisnis berlaku (keputusan owner 2026-06-16).
> JANGAN dipakai di produksi (di prod, OWNER pakai password kuat).

Login di `http://localhost:5173/login` (field "identifier" = email).

## Cara isi ulang (wipe + reseed)
```
cd backend
node scripts/seed-dev-reset.js     # 1) TRUNCATE semua + fondasi (user/COA/periode/kas)
#    >> RESTART backend dev (npm run start:dev) <<
node scripts/seed-dev-via-api.js   # 2) data bisnis via HTTP (tenant/stay/invoice/bayar/meter)
```
(atau `npm run seed:dev:reset` lalu `npm run seed:dev:api`.)

## Back-office
| Role | Email | Password |
|------|-------|----------|
| **OWNER** | `owner@kost48.com` | `Owner#2026` |
| **ADMIN** | `admin@kost48.com` | `admin123` |
| **STAFF** | `staff@kost48.com` | `staff123` |

## Penghuni (TENANT) — password semua: `Tenant#2026`
Pola email `<nama-depan>.tenant@kost48.test`. 16 penghuni menempati kamar **K-A … K-P**
(check-in via `POST /stays`: deposit tunai Rp500.000 + meter awal; sewa auto-terbit & 12 dari 16 lunas).

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

Kamar **K-Q … K-T** (4) = **AVAILABLE** (kosong, untuk uji booking/check-in).

## Isi data (hasil seed terverifikasi)
- 20 kamar (16 terisi, 4 kosong) · 16 penghuni · 16 stay ACTIVE (semua promoted).
- 19 invoice: 16 sewa + 3 meter listrik; **12 PAID, 7 ISSUED** (4 sewa menunggak + 3 meter). Tanpa dobel-tagih.
- 16 deposit HELD (Rp500.000/kamar) terjurnal. **Neraca saldo SEIMBANG.**
