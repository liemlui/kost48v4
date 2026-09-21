# Appendix — Seed Master Data (Patch Tenant Aman) — arsip 2026-07-08

> Diarsipkan dari docs/M11_DEFAULT_DATA.md L544–572 pada 5c54c1be (DOC-GOV-20260922 Tahap 3).
> Prosedur ini tidak lagi tersedia: seed-master-data.sql dihapus 2026-07-18 (commit ab21d3b9, digabung ke seed.sql).
> Jangan jalankan §Appendix ini untuk data tenant; alur seeding hidup ada di docs/operations/.

## Appendix — Seed Master Data (Patch Tenant Aman)


Gunakan **[seed-master-data.sql](../backend/sql/seed-master-data.sql)** — satu file yang menggabungkan semua patch data awal. Jalankan sekali, semua data masuk.

#### Isi

| Bagian | Sumber | Target Tabel |
|--------|--------|-------------|
| 13 Tenant Master | NIK, WhatsApp, email, tarif sewa, deposit | `Tenant`, `Stay`, `User` |
| Update Kontak | WhatsApp lengkap + 2 email baru (Lovandra, Destarika) | `Tenant`, `User` |
| ~180 Kwitansi | Riwayat pembayaran Jul 2025 – Jul 2026 | `Invoice`, `InvoiceLine`, `InvoicePayment` |
| ~50 Tenant Historis | Tenant non-aktif dari data kwitansi | `Tenant` (isActive=false) |
| ~100 Stay Historis | Periode sewa historis | `Stay` (INACTIVE) |
| ~92 Expense | Pengeluaran 2021-2025 (listrik, wifi, air, renovasi, dll) | `Expense` |

#### Cara Menjalankan

```bash
### Backup database dulu
pg_dump "$DATABASE_URL" > backup_before_seed.sql

### Jalankan satu file untuk semua
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f sql/seed-master-data.sql
```

#### Idempoten

Aman dijalankan ulang. Semua INSERT pakai `WHERE NOT EXISTS`, semua UPDATE pakai `IS DISTINCT FROM`. Tidak ada DELETE.
