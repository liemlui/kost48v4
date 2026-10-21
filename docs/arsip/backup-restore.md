> **ARSIP BEKU** · dipindah dari `docs/operations/` ke `docs/arsip/` pada 2026-10-21 (DOCS-GEN2 D4b). Isi dipindah ke berkas aktif operations — lihat ledger D4b; **jangan dibaca rutin**.

# Backup & Restore Produksi — runbook

> **Blok baca** · Jenis: **runbook operasi** · Status: **aktif — dieksekusi 20 Okt 2026; run terjadwal pertama belum terlihat** · Untuk siapa: owner/operator yang menjalankan backup
> · Baca kalau: akan membuat dump produksi, memasang jadwal harian, atau menguji restore. · **Jangan** dibaca kalau: mencari aturan bisnis (itu [ATURAN](../ATURAN.md)).

## 1. Keputusan & tujuan

Keputusan owner **P24 (19 Okt 2026)**: *"Ya dump sekarang dan lakukan rekomendasi kamu."* Rekomendasi yang disetujui: **dump sekarang + jadwal harian + retensi 14 hari + satu uji restore** ke database terpisah.

Alasannya terukur: dump terakhir **13 Sep 2026**; data 18 Okt (11 tagihan, 11 pembayaran, 23 jurnal) tidak tercakup backup mana pun yang terlihat, dan belum ada bukti restore.

## 2. Yang sudah ada

- Skrip dump: [backup.sh](../../scripts/remote/backup.sh) — membaca `DATABASE_URL` dari `~/kost48-prod/.env`, menulis `~/backups/db-<nama>-<ts>.sql.gz` + arsip app, lalu menguji `gzip -t`. **Tidak** mencetak sandi.
- Folder `~/backups` di server. Sejak 20 Okt 2026: cron harian + retensi 14 hari terpasang, uji restore lulus, dan catatan bukti ada di §7. Skrip dipakai dengan URL utuh (tidak lagi mengurai nama DB dari URL).

## 3. Langkah A — dump sekarang

Jalankan dari mesin yang punya akses SSH ke server produksi (bukan dari aplikasi):

```bash
ssh <user>@<host>
cd ~/kost48-prod
bash scripts/remote/backup.sh
```

Yang harus terlihat di keluaran: `OK -> /home/<user>/backups/db-<nama>-<ts>.sql.gz (<ukuran>)`, `gzip -t OK`, dan jumlah baris `COPY` > 0. Catat nama berkas + ukuran + waktu. **Jangan** menyalin isi dump atau kredensial ke chat.

## 4. Langkah B — jadwal harian + retensi 14 hari

Pasang cron milik user aplikasi (bukan root), jam 02.00 WIB server:

```cron
0 2 * * * /bin/bash /home/<user>/kost48-prod/scripts/remote/backup.sh >> /home/<user>/backups/backup.log 2>&1
```

Retensi (hapus dump dan arsip app lebih tua dari 14 hari; hanya dua pola itu):

```cron
30 2 * * * find /home/<user>/backups -maxdepth 1 \( -name 'db-*.sql.gz' -o -name 'app-kost48-prod-*.tar.gz' \) -mtime +14 -delete
```

Arsip app ikut masuk retensi karena skrip membuat salinan app setiap run (±50 MB); tanpa ini folder tumbuh tanpa batas.

Bukti yang dicatat: `crontab -l` memuat dua baris di atas; `tail backup.log` menunjukkan run pertama sukses; `ls -lh ~/backups` menunjukkan berkas baru.

## 5. Langkah C — uji restore ke database terpisah

**Jangan** restore ke database produksi. Gunakan DB uji sementara:

```bash
DB=kost48_restore_test_$(date +%Y%m%d)
createdb "$DB"
gunzip -c ~/backups/db-<nama>-<ts>.sql.gz | psql -d "$DB"
psql -d "$DB" -At -F' | ' -c 'select '\''Stay'\'', count(*) from "Stay" union all select '\''Invoice'\'', count(*) from "Invoice" union all select '\''InvoicePayment'\'', count(*) from "InvoicePayment" union all select '\''JournalEntry'\'', count(*) from "JournalEntry" union all select '\''Tenant'\'', count(*) from "Tenant";'
dropdb "$DB"
```

**Lulus bila** jumlah `Stay`, `Invoice`, `InvoicePayment`, `JournalEntry`, dan `Tenant` sama dengan produksi saat dump diambil; `psql` tidak melaporkan error; DB uji dihapus setelahnya.

**Catatan 20 Okt 2026 (terbukti di server):** akun DB bukan pemilik extension `plpgsql`, sehingga restore penuh berhenti di `COMMENT ON EXTENSION plpgsql`. Saring dua baris itu sebelum restore:

```bash
gunzip -c ~/backups/db-<nama>-<ts>.sql.gz \
  | grep -vE '^(CREATE EXTENSION IF NOT EXISTS plpgsql|COMMENT ON EXTENSION plpgsql)' \
  | psql "$DBURL_TEST" -q -v ON_ERROR_STOP=1
```

Hasil uji: 62 tabel dibuat, lima hitungan cocok dengan produksi, DB uji dihapus.

## 6. Bukti yang wajib dicatat

1. Nama berkas dump + ukuran + waktu + hasil `gzip -t`.
2. Baris cron (tanpa kredensial) + log run pertama.
3. Hasil hitung 5 tabel di DB uji + pernyataan DB uji sudah dihapus.
4. Pernyataan eksplisit: **restore diuji**, bukan hanya "dump dibuat".

Bukti ditulis di [bukti-2026-10](../arsip/bukti-2026-10.md) (bagian baru) — bukan di berkas ini.

## 7. Status eksekusi

- **19 Okt 2026:** belum dijalankan — shell sesi agen gagal start (`0xC0000142`).
- **20 Okt 2026 06:31 WIB:** dump dibuat (40 KB, `gzip -t` OK, 62 blok `COPY`); cron dua baris terpasang; probe cron terbukti menulis 3× dalam 3 menit; restore ke DB uji berhasil (62 tabel; Stay 11, Invoice 11, InvoicePayment 11, JournalEntry 23, Tenant 13); DB uji dihapus.
- Retensi 14 hari juga menghapus arsip app (`app-kost48-prod-*.tar.gz`), karena skrip membuatnya setiap run.
- Run terjadwal pertama (21 Okt 02.00 WIB) belum terlihat saat catatan ini ditulis.
- Runbook ini **tidak** memberi izin mengubah data produksi; restore hanya ke DB terpisah.
