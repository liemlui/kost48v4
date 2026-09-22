# KOST48 — Checklist Go-Live cPanel (Lembar Kerja Owner)

> Dibuat **12 September 2026**; **dieksekusi 13 September 2026** ke shared hosting cPanel (Node.js App/Passenger + PostgreSQL).
> Runbook kanonik tetap [M08](M08_DEPLOY_GO_LIVE.md); spesifikasi efisiensi hosting [efisiensi-hosting.md](operations/efisiensi-hosting.md); urutan task [M12](M12_CHECKLIST_CHANGELOG.md).
> **Jangan tulis secret (password DB, JWT, token cron, PIN) ke dokumen ini atau ke chat.** Isi langsung di cPanel/`.env` server.
> **Status 17 Sep 2026: paket 12 Sep SUDAH LIVE di produksi** (lihat §E), dan `client/` sudah diperbarui dua kali sesudahnya — 16 Sep (`3c0qJfgImyvj`, perbaikan homepage mobile) dan **17 Sep (`BZ-Vpsd9eLX1`, target sentuh tablet 768 px + CLS mobile + target sentuh perangkat sentuh ≥1024 px)**. Sisa pekerjaan owner ada di §F.
>
> **Catatan sinkronisasi 16 Sep 2026:** §B/§C di bawah adalah lembar persiapan pra-deploy; status tiap butir sudah ditandai menurut bukti §E + [M20](M20_PRODUKSI_KOST48.md). Butir yang belum tuntas tetap ditandai, bukan dihapus.
## Section dipindah ke operations

Isi lengkap A–J: [operations/go-live-cpanel.md](operations/go-live-cpanel.md)
