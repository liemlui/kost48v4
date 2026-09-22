# Laporan Duplikasi Isi (konsolidasi dokumentasi)

Tanggal: 23 September 2026. Status: catatan temuan — **bukan keputusan aturan**.
Tujuan: mencatat dugaan duplikasi isi yang ditemukan saat batch konsolidasi. Isi kembar **tidak dihapus dan tidak diringkas** (aturan handoff owner 23 Sep); penentuan aturan mana yang kanonik adalah wewenang owner.

## Ditemukan pada batch B1 (M06 → `domain/operasional.md`, 23 Sep 2026)

### D-01 — Aturan quota energi listrik (tiga salinan yang bersinggungan)

| Lokasi | Kutipan ringkas | Status |
|---|---|---|
| `docs/domain/operasional.md` § Bagian 6 IoT Monitoring (dari M06 L548) | "quota gratis listrik mengikuti periode sewa awal/perpanjangan yang sudah lunas. Perpanjangan tiga bulan memperoleh tiga kali quota bulanan; pembayaran DP renewal sendiri tidak mereset quota." | Dipindah apa adanya dari M06 — tidak diubah |
| `docs/domain/keuangan.md` § Quota Utilitas Berbasis Periode Sewa Lunas (L37–41) | "Dasar quota listrik gratis bukan lagi selalu satu bulan kalender… perpanjangan tiga bulan menerima tiga kali `freeElectricityKwhPerMonth`… Invoice DP renewal sengaja dikecualikan." | Kanonik sejak S2.b1 |
| `docs/history/changelog/2026-07.md` entri `Update 2026-07-23 — kontrak quota utilitas` | Salinan ringkas aturan yang sama sebagai entri riwayat | Riwayat bertanggal |

Kesamaan isi: ketiganya menyatakan quota listrik gratis mengikuti periode sewa yang sudah lunas, berkelipatan jumlah bulan, dan DP renewal tidak mereset quota.
Rekomendasi (belum dieksekusi): bila owner memutuskan `domain/keuangan.md` sebagai kanonik, dua salinan lain dapat diubah menjadi rujukan. **Jangan dihapus tanpa keputusan owner**, karena kalimat di `domain/operasional.md` berada di dalam blok spesifikasi IoT yang belum ditinjau ulang (IoT ditunda).

## Aturan pakai laporan ini

- Temuan di sini **tidak** mengubah isi aturan, tidak menetapkan mana yang benar, dan tidak menutup gate apa pun.
- Bila owner memutuskan, catat keputusan di [M02](../M02_KEPUTUSAN_OWNER.md), lalu eksekusi dedup pada batch konsolidasi berikutnya dan perbarui baris di atas sebagai bukti.
