# Patch data 13 tenant yang aman

Gunakan [patch-13-tenant-master-data.sql](../backend/sql/patch-13-tenant-master-data.sql) untuk melengkapi NIK, WhatsApp, email, tarif kontrak, dan deposit 13 tenant. Patch ini dapat dijalankan ulang tanpa menggunakan ID tetap dan tidak menghapus data.

Sebelum menjalankan, backup database. Jalankan dengan `ON_ERROR_STOP` agar satu konflik membatalkan seluruh transaksi:

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f sql/patch-13-tenant-master-data.sql
```

Patch hanya menyelaraskan email akun portal yang sudah terhubung. Ia tidak membuat akun portal baru atau mengubah password. Email kosong pada sumber dibiarkan apa adanya untuk menghindari penghapusan data yang belum terkonfirmasi.

Kolom tanggal masuk yang tersedia hanya berisi angka hari. Karena bulan dan tahun tidak diberikan, patch tidak membuat atau mengubah `checkInDate`; ia hanya memperbarui sewa/deposit apabila stay aktif di kamar yang sesuai sudah ada. Periksa hasil `MISSING_ACTIVE_STAY` atau `CHECK_DATE_NEEDS_REVIEW` dari query akhir, lalu lengkapi tanggal sebenarnya lewat menu Masa Sewa.

Patch memasukkan nomor NIK, bukan foto KTP. Foto KTP tetap perlu diunggah dari detail tenant bila diperlukan.
