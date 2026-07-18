# Finance Data — sudah termasuk dalam seed-master-data.sql

Data keuangan historis (~180 kwitansi + ~92 expense) sudah digabung ke dalam **[seed-master-data.sql](../backend/sql/seed-master-data.sql)**. 

Lihat [PATCH_DATA_TENANT_AMAN.md](./PATCH_DATA_TENANT_AMAN.md) untuk panduan lengkap.

Jalankan:
```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f sql/seed-master-data.sql
```
