# Laporan Duplikasi Isi (konsolidasi dokumentasi)

Tanggal: 23 September 2026. Status: catatan temuan; keputusan owner yang menyertainya dicatat per item (lihat D-01).
Tujuan: mencatat dugaan duplikasi isi yang ditemukan saat batch konsolidasi. Isi kembar **tidak dihapus dan tidak diringkas tanpa keputusan owner** (aturan handoff owner 23 Sep); penentuan aturan mana yang kanonik adalah wewenang owner.

## Ditemukan pada batch B1 (M06 → `domain/operasional.md`, 23 Sep 2026)

### D-01 — Aturan quota energi listrik (tiga salinan) — **SELESAI DEDUP 23 Sep 2026**

| Lokasi | Kutipan ringkas | Status |
|---|---|---|
| `docs/domain/operasional.md` § Bagian 6 IoT Monitoring (dari M06 L548) | "Aturan kanonik quota listrik ada di keuangan.md § Quota Utilitas … tidak diulang di sini" | Dipindah dari M06, lalu kalimat berulangnya diganti **rujukan** ke kanonik (23 Sep 2026) |
| `docs/domain/keuangan.md` § Quota Utilitas Berbasis Periode Sewa Lunas (L37–43) | "Dasar quota listrik gratis bukan lagi selalu satu bulan kalender… perpanjangan tiga bulan menerima tiga kali `freeElectricityKwhPerMonth`… Invoice DP renewal sengaja dikecualikan… `IotTelemetry` tidak menjadi jurnal atau invoice." | **KANONIK** (ditandai eksplisit 23 Sep 2026) |
| `docs/history/changelog/2026-07.md` entri `Update 2026-07-23 — kontrak quota utilitas` | "entri ini menandai tanggal kontrak; teks aturan tidak diulang" | Riwayat bertanggal; teks berulang diganti **rujukan** ke kanonik (23 Sep 2026) |

**KEPUTUSAN OWNER 23 Sep 2026:** `domain/keuangan.md` § Quota Utilitas = kanonik; dua salinan lain menjadi rujukan.
**Eksekusi:** kalimat aturan yang berulang pada dua salinan diganti penunjuk ke kanonik. Kalimat yang **tidak** berulang tetap dipertahankan apa adanya (contoh: "Catat meter/renewal tetap jalur bisnis yang menerbitkan invoice, bukan polling Tuya" di `domain/operasional.md`, dan klausa `MeterReading` di `changelog/2026-07.md`). **Tidak ada aturan yang berubah** — hanya pengulangan yang dihapus, dan seluruh isi yang dihapus terbukti ada di kanonik (`keuangan.md` L39–42).

## Aturan pakai laporan ini

- Temuan di sini **tidak** mengubah isi aturan, tidak menetapkan mana yang benar, dan tidak menutup gate apa pun.
- Bila owner memutuskan, catat keputusan di [M02](../M02_KEPUTUSAN_OWNER.md), lalu eksekusi dedup pada batch konsolidasi berikutnya dan perbarui baris di atas sebagai bukti.
