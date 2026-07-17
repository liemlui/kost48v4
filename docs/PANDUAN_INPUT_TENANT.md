# 📋 Panduan — Input 13 Tenant KOST48 (Data REAL)

> **8 tenant SUDAH punya email + akun portal** (auto-generated oleh `seed-prod.js`).
> **5 tenant BELUM** — lengkapi via WhatsApp.

---

## Setelah `node scripts/seed-prod.js` Selesai

### ✅ 8 Tenant — SUDAH SIAP (email + akun portal)

| Kamar | Nama | Email | Password |
|-------|------|-------|----------|
| A | Shinta Larista | shinta22larista@gmail.com | (default) |
| B | Dini Widiastutik | diniwidi11@gmail.com | (default) |
| C | Miko Rakatama A.W. | Mikorakatamaa@gmail.com | (default) |
| D | Ade Chandra | adhechan72@gmail.com | (default) |
| F2 | Patrick Wilfred | wilfredpatrick@hotmail.com | (default) |
| H | Welly Tanoto | Wellytanoto73@gmail.com | (default) |
| I | Agus Settiyo Budi | theowijaya0886@gmail.com | (default) |
| K | Meliana Tamara | melontamara556@gmail.com | (default) |

> Password default lihat output `seed-prod.js`. Kirim via WA ke masing-masing.

### ⚠️ 5 Tenant — BELUM ADA EMAIL

| Kamar | Nama | Minta via WA |
|-------|------|-------------|
| **F1** | Yufita Hieng | `Halo Kak Yufita, mohon kirim email aktif untuk akun portal KOST48 ya 🙏` |
| **G** | Yofi Nurkolifah | `Halo Kak Yofi, mohon kirim email aktif untuk akun portal KOST48 ya 🙏` |
| **J** | Lovandra | `Halo Kak Lovandra, mohon kirim email aktif untuk akun portal KOST48 ya 🙏` |
| **L** | Destarika Hasan | `Halo Kak Destarika, mohon kirim email aktif untuk akun portal KOST48 ya 🙏` |
| **M** | Gabriel Excelly P. | `Halo Kak Gabriel, mohon kirim email aktif untuk akun portal KOST48 ya 🙏` |

Setelah dapat email, input di `/tenants`:
1. Cari tenant → Edit → isi Email → Simpan
2. Klik **Akses Portal** → **Buat Akses Portal** → sistem kasih password
3. Kirim kredensial ke tenant

---

## Data Deposit (REAL)

| Tenant | Deposit |
|--------|---------|
| **Ade Chandra (D)** | **Rp200.000** |
| 12 tenant lainnya | **Tidak ada deposit** |

---

## Template WhatsApp — Kirim Kredensial

```
Halo Kak [Nama], akun portal KOST48 sudah siap! 🎉

🌐 https://[domain]/login
📧 Email: [email]
🔑 Password: [password]

Di portal bisa:
✅ Lihat status sewa & tagihan
✅ Bayar & upload bukti transfer
✅ Pantau listrik (kWh meter live)
✅ Lapor kerusakan / masalah
✅ Baca aturan & panduan lengkap

Password bisa diganti sendiri setelah login ya 🙏
```

---

## Urutan Setup Produksi (RINGKAS)

```bash
# 1. DB fresh
dropdb kost48_v3 && createdb kost48_v3

# 2. Schema + pagar
psql "$DATABASE_URL" -f setup.sql
psql "$DATABASE_URL" -f sql/bootstrap.sql

# 3. Seed OWNER
OWNER_EMAIL=owner@domain.com OWNER_PASSWORD='...' OWNER_FULLNAME='Pemilik KOST48' npm run seed:owner

# 4. Seed 13 kamar + 13 tenant + 8 akun portal
node scripts/seed-prod.js

# 5. Buat STAY (check-in) untuk 13 tenant via Admin UI /stays
#    gunakan agreedRent = TARIF KONTRAK (lihat output seed-prod)

# 6. Input email 5 tenant + buat akun portal via /tenants

# 7. Bootstrap Tuya KWH
node scripts/bootstrap-tuya-kwh.js --sync
```
