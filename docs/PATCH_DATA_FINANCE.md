# Patch 14 — Import Data Master Finance dari Excel

Gunakan [patch-14-master-data-finance.sql](../backend/sql/patch-14-master-data-finance.sql) untuk mengimpor **seluruh data keuangan historis** dari `Scan/Master_Database_Kost_48_Lengkap_Terkini.xlsx`.

## Data yang Diimpor

| Bagian | Sumber Sheet | Jumlah | Target Tabel |
|--------|-------------|--------|-------------|
| A. Tenant Historis | Kwitansi + Data Tenant Terkini | ~50 tenant | `Tenant` |
| B. Stay Historis | Kwitansi (periode sewa) | ~100 stay | `Stay` (INACTIVE) |
| C. Invoice + Payment | Kwitansi (pembayaran) | ~180 invoice | `Invoice`, `InvoiceLine`, `InvoicePayment` |
| D. Expense 2025 | Master Pengeluaran | ~25 expense | `Expense` |
| E. Expense Tahunan | Detail Pengeluaran Tahunan | ~67 expense | `Expense` |

## Cara Menjalankan

```bash
# Backup database dulu!
pg_dump "$DATABASE_URL" > backup_before_patch14.sql

# Jalankan patch
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f sql/patch-14-master-data-finance.sql
```

## Idempotensi

Patch **aman dijalankan ulang**. Semua INSERT menggunakan `WHERE NOT EXISTS` sehingga data yang sudah ada tidak diduplikasi. Tidak ada DELETE atau UPDATE destruktif.

## Jika Ingin Regenerate

Jika Excel diperbarui, jalankan ulang parser:

```bash
node scripts/parse-excel-master-data.mjs     # Parse Excel → JSON
node scripts/generate-patch-14-sql.mjs        # JSON → SQL
```

## Verifikasi

Query verifikasi otomatis di akhir patch menampilkan jumlah data per bagian. Bandingkan dengan ekspektasi:

- Tenant Historis: ~35 (50 total - 13 aktif dari patch-13 - 2 duplikat)
- Stay INACTIVE: ~100
- Invoice Historis: ~180
- Expense 2025: ~25
- Expense Tahunan: ~67
