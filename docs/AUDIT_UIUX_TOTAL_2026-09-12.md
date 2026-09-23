# Audit UI/UX Total KOST48 — 12 September 2026

> **Jenis bukti:** audit **dinamis** (browser nyata) + **statis** (source) pada instance lokal.
> **Aplikasi yang diaudit:** build produksi `frontend/dist` (versi 1.3.0) disajikan lewat server statis audit, dengan `VITE_API_BASE_URL=/api` dan proxy same-origin ke backend NestJS :3000 — meniru topologi produksi.
> **Database:** UAT lokal `kost48_v3_pro` (port 5433). **Bukan produksi.**
> **Artefak bukti:** [`docs/audit-assets/2026-09-12_uiux_total/`](audit-assets/2026-09-12_uiux_total/) (`crawl-summary.json`, `axe-violations.json`).
> **Perbaikan:** dikerjakan pada sesi yang sama — lihat [§0 Hasil perbaikan](audit/audit-uiux-total-2026-09-12.md#0-hasil-perbaikan--12-september-2026-sore).
> Dokumen ini adalah **pintu masuk tematik**; isi rinci sudah dipindah ke lokasi kanonik di bawah. Status PASS/selesai pada audit lama hanya berlaku pada lingkup/waktu yang disebut, bukan bukti deployment atau runtime terbaru. Judul sumber pra-konsolidasi adalah riwayat; jangan membuat ulang file lama atau mengulang checklist selesai.

## Isi & lokasi kanonik

| Topik | Lokasi kanonik | Catatan |
|---|---|---|
| Laporan lengkap audit UI/UX total 12 Sep 2026: ringkasan eksekutif, metode/cakupan/batas bukti, rekonsiliasi AO, temuan T-01..T-09, rekomendasi urutan kerja, yang tidak terbukti, status empat lapis | [audit/audit-uiux-total-2026-09-12.md](audit/audit-uiux-total-2026-09-12.md) | Dipindah utuh apa adanya (B6, 23 Sep 2026) |
| Hasil perbaikan §0/§0b/§0c (sore 12 Sep dan sesi lanjutan 13 Sep) | [audit/audit-uiux-total-2026-09-12.md](audit/audit-uiux-total-2026-09-12.md#0-hasil-perbaikan--12-september-2026-sore) | Ikut di file kanonik; 0 pelanggaran Axe pada permukaan yang diaudit ulang |
| Ringkasan §0 dan status perbaikan T-06/T-08 | [audit-uiux-ulang-2026-09-12.md](audit/audit-uiux-ulang-2026-09-12.md) | Dipindah dari M14 (B4) |
| Temuan AO-00..AO-23 (30 Jul 2026) | [audit-uiux-lintas-portal-2026-07.md](audit/audit-uiux-lintas-portal-2026-07.md) | Bukti bertanggal |
| Status & antrean eksekusi Fase AO | [status-ao-lintas-portal.md](audit/status-ao-lintas-portal.md) | Status aktif, bukan riwayat |
| Artefak bukti mentah | `audit-assets/2026-09-12_uiux_total/` | Tidak dipindah |
| Antrean & gate | [STATUS.md](STATUS.md) | Kanonik |

- Lokasi kanonik isi rinci ada di tabel atas; file ini hanya pintu masuk agar tautan lama tetap resolve.
- Blok provenance di atas dipertahankan utuh dari sumber; satu baris pemisah `---` yang menggantung setelahnya dibuang.
