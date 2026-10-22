# Indeks operations — daftar berkas & kapan dibaca

> **Blok baca** · Jenis: **indeks folder** · Status: **aktif (dihasilkan otomatis)** · Untuk siapa: agen/owner yang mencari berkas di folder ini
> · Baca kalau: mencari berkas di `docs/operations/` tanpa membuka semuanya. · **Jangan** dibaca kalau: sudah tahu berkas tujuannya.

Isi tabel diturunkan langsung dari setiap berkas (judul + "baca kalau"), jadi tidak ada daftar yang bisa menyimpang. Dibuat ulang dengan `node scripts/buat-indeks-folder.mjs --segarkan`.

| Berkas | Judul | Ukuran | Kapan dibaca |
|---|---|---:|---|
| [default-dev.md](default-dev.md) | Default, Seed & Data Master | 58.7 KB | — |
| [iot.md](iot.md) | IoT — Runbook KWH & Water Meter | 42.3 KB | butuh prosedur Tuya KWH atau spesifikasi water meter ESP32-C3. |
| [produksi.md](produksi.md) | Produksi & Operasional Harian (Shared Hosting) | 73.3 KB | akan membuat dump produksi, memasang jadwal harian, atau menguji restore. · **Jangan** dibaca kalau: mencari aturan bisn |
