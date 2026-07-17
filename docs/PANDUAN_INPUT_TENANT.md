# 📋 Panduan — Input Data 13 Tenant via Admin UI

> **Metode paling simpel.** Tidak perlu Google Sheets, Apps Script, atau Vercel.
> Semua dari halaman `/tenants` yang sudah ada di aplikasi.

---

## Alur Kerja (13 tenant ≈ 30 menit)

### Untuk Setiap Tenant:

**1. WhatsApp tenant** (minta 2 data wajib):
```
Halo Kak [Nama], untuk akses portal KOST48, mohon kirim:
1. Email aktif (untuk login)
2. Nomor HP (WhatsApp)

Opsional — kalau berkenan:
3. Nama kontak darurat + nomor HP-nya
4. Pekerjaan + nama perusahaan/kampus
5. Tanggal lahir (DD-MM-YYYY)
```

**2. Buka Admin UI:**
```
https://[domain]/tenants
```
Login sebagai OWNER/ADMIN.

**3. Cari tenant → klik Edit:**
- Cari nama tenant di tabel atau search bar
- Klik tombol **Edit** (pensil)

**4. Isi field:**
| Field | Isi |
|-------|-----|
| Email Tenant | (dari WhatsApp tenant) |
| No. HP | (dari WhatsApp tenant) |
| Nama Kontak Darurat | (opsional) |
| Telp Kontak Darurat | (opsional) |
| Pekerjaan | (opsional) |
| Instansi / Kampus | (opsional) |
| Tanggal Lahir | (opsional) |
| Jenis Kelamin | (opsional) |
| Kota Asal | Surabaya (default) |
| Provinsi Asal | (opsional) |

Klik **Simpan**.

**5. Buat akses portal:**
- Setelah simpan, klik **Akses Portal** (atau buka tab "Portal" di detail tenant)
- Klik **Buat Akses Portal**
- Sistem akan generate password otomatis
- Catat email + password

**6. Kirim kredensial ke tenant via WA:**
```
Halo Kak [Nama], akun portal KOST48 sudah siap! 🎉

🌐 https://[domain]/login
📧 Email: [email]
🔑 Password: [password]

Di portal bisa:
✅ Lihat status sewa & tagihan
✅ Bayar & upload bukti
✅ Pantau listrik (kWh meter live)
✅ Lapor kerusakan
✅ Baca aturan & panduan

Password bisa diganti sendiri setelah login ya 🙏
```

**7. Ulangi untuk tenant berikutnya.**

---

## Daftar 13 Tenant (contekan)

| Kamar | Nama | NIK (4 digit akhir) |
|-------|------|---------------------|
| A | Shinta Larista | xxxx6990003 |
| B | Dini Widiastutik | xxxx2800021 |
| C | Miko Rakatama Adhi Winarto | xxxx8970006 |
| D | Ade Chandra | xxxx9720009 |
| F1 | Yufita Hieng | xxxx1970003 |
| F2 | Patrick Wilfred | xxxx4910019 |
| G | Yofi Nurkolifah | xxxx4030003 |
| H | Welly Tanoto | xxxx1730004 |
| I | Agus Settiyo Budi | xxxx8860003 |
| J | Lovandra | xxxx2930003 |
| K | Meliana Tamara | xxxx2000002 |
| L | Destarika Hasan | xxxx2020008 |
| M | Gabriel Excelly Pranajaya | xxxx8030001 |

---

## Field yang TIDAK bisa diedit di form ini

4 field marketing hanya bisa diisi tenant sendiri via profil:

| Field | Cara isi |
|-------|----------|
| Status Pernikahan | Tenant buka Profil → isi sendiri |
| Kendaraan | Tenant buka Profil → isi sendiri |
| Kebiasaan Merokok | Tenant buka Profil → isi sendiri |
| Tahu Kos dari mana | Tenant buka Profil → isi sendiri |

> Tidak kritis untuk go-live — bisa diisi tenant nanti setelah login.

---

## Fallback: Import CSV (jika suatu saat perlu bulk import)

Script `backend/scripts/import-tenant-sheet.js` tetap tersedia. Pakai jika:
- Tenant data sudah terkumpul di spreadsheet (format CSV)
- Mau import sekaligus 13 tenant

```bash
node scripts/import-tenant-sheet.js tenant-data.csv
```
