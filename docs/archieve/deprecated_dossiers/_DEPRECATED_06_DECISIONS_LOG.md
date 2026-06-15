# KOST48 V5 — Decisions Log
**Versi:** 2026-06-13 — ekstrak dari `archieve/03_DECISIONS_LOG.md` (1319 baris, era V5.8.6–V5.10.0).
**Tujuan:** Catatan keputusan teknis/bisnis historis untuk konteks pengembangan Multi-App Shared-DB.

<!-- KOST48_DOCS_SYNC_20260612_DECISIONS_LOG -->

---

## 1. Keputusan Owner — 2026-06-11 (D1–D4)

| # | Keputusan | Dampak |
|---|-----------|--------|
| D1 | **Tanpa denda keterlambatan** | Kebijakan: forced checkout H+1, DP hangus, renewal diblokir bila tunggakan. Copy reminder bersih dari kata "denda". |
| D2 | **Notifikasi in-app saja dulu**; ke depan PWA push | Tidak ada integrasi WA/email. PWA push (VAPID) direncanakan Phase 3. |
| D3 | **Prioritas: UAT end-to-end + rekonsiliasi data** | UAT runtime PASS 2026-06-12. |
| D4 | **Rapikan docs** hemat token | Docs dipadatkan 5-11 file. |

---

## 2. Keputusan Teknis — V5.10.0 (2026-06-02)

| # | Keputusan | Dampak |
|---|-----------|--------|
| 643 | Recharts sebagai satu-satunya chart library (`^3.8.1`) | Zero new dependency — semua chart client-side dari data yang sudah ada. |
| 644 | Semua chart dihitung client-side | Zero extra API call. |
| 645 | DonutGauge + HorizontalBarChart reusable components | Tidak ada duplikasi boilerplate Recharts. |
| 646 | Chart panel kondisional (hanya jika data > 0) | Tidak ada chart kosong/loading state — UX bersih. |
| 647 | Kategori komplain: `[Kategori] teks` di `comment` field | Backend tidak perlu schema change. |
| 648 | Rating ≤ 2 wajib kategori, rating ≥ 4 opsional pujian | Komplain terstruktur tanpa memaksa user rating netral. |
| 649 | Panel alert admin dari data yang sudah ada | Admin dapat signal tanpa query endpoint baru. |
| 650 | Modal "Buat Tiket Pekerjaan" pakai `POST /tickets` existing | Tidak perlu endpoint baru. |
| 651 | Detail movement dikodekan ke `description` | Tidak perlu tabel `ticket_movement` baru. |
| 652 | `TicketCategory` enum ditambah: BARANG_PINDAH, AUDIT_INVENTARIS, PEMERIKSAAN | Kategori divalidasi DTO. |
| 653 | `src/styles.css` dipecah 13 modul di `src/styles/` | Tidak perlu load 538 KB sekaligus. |
| 654 | `main.css` tetap entry point dengan `@import` | `main.tsx` tidak berubah. |
| 655 | Split di clean boundary (blank line / comment start) | Mencegah `Unclosed comment` di postcss. |
| 656 | CSS split verified di production build | Dev server mungkin toleran. |

---

## 3. Room Readiness Flow — V5.9.8-A (2026-05-31)

| # | Keputusan | Dampak |
|---|-----------|--------|
| 629 | Final checkout ≠ kamar siap dipasarkan | Kamar masuk gate operasional dulu. |
| 630 | `MAINTENANCE` = room-readiness gate (no schema change) | Kamar setelah checkout: "Perlu dicek". |
| 631 | Checkout final → auto-buat ticket `CHECKOUT_INSPECTION` | Staff dapat pekerjaan cek kamar. |
| 632 | Dedupe tiket inspeksi per stay/room | Retry/double flow tidak gandakan antrean. |
| 633 | Admin close tiket → room AVAILABLE hanya jika aman | Guard: active stay, status maintenance, kondisi akhir. |
| 634 | Kamar MAINTENANCE tidak bookable, label "Sedang dicek" | Transparansi tanpa booking sebelum siap. |
| 635 | Filter "Sedang Dicek" di katalog publik | Kamar baru keluar bisa dilihat sebagai minat. |
| 636 | Staff UX: "Cek kamar keluar" | Fokus: kebersihan, kunci, barang, inventaris, kerusakan, foto. |
| 637 | Staff UI tanpa copy developer/internal permission | Istilah lifecycle/official movement tidak dipakai. |
| 638 | Main list/table → max 10 rows + pagination | Long-scroll dikurangi. |
| 639 | Client-side fallback pagination bila server meta absen | Tidak ada pemotongan diam-diam tanpa akses halaman. |

---

## 4. DP 30% Model — V5.12.0 (A18)

| Keputusan | Detail |
|-----------|--------|
| Booking mandiri wajib DP 30% | 30% × `agreedRentAmountRupiah` (sesuai pricingTerm) |
| DP ≠ Deposit jaminan | DP hangus bila gagal lunas, deposit refundable |
| DP mengunci kamar (RESERVED) | Pesaing batal setelah DP approved |
| Pelunasan sebelum H-day | Masuk flow renewal |
| Gagal bayar H+1 | DP hangus, kamar lepas, tenant rebooking |
| `downPayment*` field terpisah dari `deposit*` | Backend + frontend A18 redesign penuh |

---

## 5. Konvensi Build & Deploy

| Keputusan | Detail |
|-----------|--------|
| Path relatif: `final_bundle` | Semua perintah dari root repo |
| Backend build: `npm run build` (nest) | Setelah patch: `npx tsc --noEmit` = 0 error |
| Frontend build: `npm run build` (vite) | Setelah patch: `npx tsc --noEmit` = 0 error |
| PWA verify: `npm run pwa:verify` | Manifest, ikon, SW, build ID, cache contract |
| Commit: satu per task | Pesan commit sesuai format: `fix:` / `feat:` / `perf:` / `ui:` / `ops:` / `test:` |
| JANGAN push tanpa approval | `git push` hanya oleh owner/atas perintah eksplisit |

---

*Dokumen ini ringkasan keputusan. Untuk kronologi detail, lihat `07_JOURNAL.md`. Untuk rencana kerja, lihat `02_WORK_PLAN.md`.*