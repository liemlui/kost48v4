# Audit Ulang UI/UX 12 September 2026 — Bukti Dinamis (180 Pemeriksaan Halaman)

> Dipindah apa adanya dari `docs/M14_AUDIT_UI_UX.md` §0 (Tahap 3 batch B4, 23 Sep 2026) pada DOC-GOV-20260922.
> Sifat: **bukti bertanggal** (12 September 2026), bukan status aktif.
> Laporan lengkap dan artefak tetap di [AUDIT_UIUX_TOTAL_2026-09-12.md](audit-uiux-total-2026-09-12.md) dan `docs/audit-assets/2026-09-12_uiux_total/`. Temuan AO-00..AO-23: [audit-uiux-lintas-portal-2026-07.md](audit-uiux-lintas-portal-2026-07.md).

## 0. Audit ulang 12 September 2026 — bukti dinamis baru (180 pemeriksaan halaman)

Audit menyeluruh diminta owner dan dijalankan pada instance lokal (frontend `dist` versi 1.3.0 + backend NestJS :3000 + DB UAT 5433). **Laporan lengkap: [AUDIT_UIUX_TOTAL_2026-09-12.md](audit-uiux-total-2026-09-12.md)**; artefak: [`audit-assets/2026-09-12_uiux_total/`](../audit-assets/2026-09-12_uiux_total/).

**Status gate:** stabilitas ✅, **gerbang aksesibilitas (AO-08) kini LULUS** setelah perbaikan sore hari yang sama: **0 pelanggaran Axe critical/serious** pada permukaan yang diaudit ulang. **T-06 (performa `/portal/stay`) juga selesai** pada sesi lanjutan. Sign-off penuh AO-14 masih menunggu item di bawah tabel.

| Dimensi | Sebelum perbaikan | Setelah perbaikan | Keterangan |
|---|---|---|---|
| Halaman dirender | 🟢 180/180 | 🟢 | 6 role × 2 viewport; 0 blank, 0 crash React, 0 redirect tak sah |
| API | 🟢 89 endpoint, 0× 5xx | 🟢 | 1× 204 sah (foto profil kosong) |
| AO-00 / AO-01 (DB tertinggal, katalog 500) | 🟢 tidak reproduksi | 🟢 | katalog & notifikasi normal |
| Axe critical | 🔴 30 node | 🟢 **0** | label form & select filter tanpa nama (T-01) |
| Axe serious | 🔴 88 node | 🟢 **0** | kontras T-02 dsb. |
| Overflow mobile 375 px | 🟡 3 halaman (+176 px terburuk) | 🟢 **0 px** | `/tickets` STAFF, `/finance/accounting-setup`, `/portal/stay` |
| Landmark/heading | 🟡 6+ halaman | 🟢 **`h1Count = 1`** | `/reset-password`, `/portal/stay`, dan 4 halaman ber-`<h1>` ganda sudah diperbaiki (§0c) |
| Drift token radius | 🟡 27 nilai unik | 🟢 **12 nilai unik** | skala resmi terdokumentasi di `00-tokens.css`; breakpoint sengaja tidak diubah — [§0c](audit-uiux-total-2026-09-12.md#0c-hasil-perbaikan-t-08--normalisasi-token--struktur-judul) |
| Performa awal `/portal/stay` | 🔴 23 request (7 duplikat), konten 1500 ms, 84 skeleton | 🟢 **17 request (0 duplikat), konten 900 ms, 46 skeleton** | T-06, lihat [§0b](audit-uiux-total-2026-09-12.md#0b-hasil-perbaikan-t-06--performa-render-awal-portalstay) |
| AO-14 (dua state TENANT, publik, viewport, Axe) | 🟢 bukti tersedia | 🟢 | sisa: viewport 320 px, rute ber-fixture, AO-18/19/20/21/23 |

Dua koreksi terhadap catatan lama yang harus dipakai mulai sekarang:

1. **AO-06 tidak lagi boleh dianggap selesai sepenuhnya:** `/login`, `/forgot-password`, dan `/profile` lulus (0 kontrol tanpa label), tetapi `/reset-password` masih memiliki 3 kontrol tanpa label terasosiasi (`ResetPasswordPage.tsx:74-86`).
2. **AO-08 dan AO-09 dibuka kembali** dengan bukti terukur (kontras dan heading), bukan berdasarkan penilaian visual.

Batas metode yang harus disertakan bila hasil ini dikutip: harness iframe berukuran tetap dipakai karena Playwright `spawn EPERM` di sandbox; user agent tetap desktop dan DPR 1,25, sehingga perilaku sentuh nyata serta identitas perangkat mobile **belum terbukti**. Rute ber-fixture (`/booking/:roomId`, `/invoices/:id`, `/stays/:id`, detail pengumuman) dan viewport 320 px belum tercakup.

---
