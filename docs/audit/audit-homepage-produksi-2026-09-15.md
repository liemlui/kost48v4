# Audit Halaman Utama Produksi — 15 Sep 2026 (Mobile-First)

> Dipindah apa adanya dari `docs/M14_AUDIT_UI_UX.md` (Tahap 3 batch B4, 23 Sep 2026) pada DOC-GOV-20260922.
> Sifat: **bukti bertanggal** — audit produksi 15 Sep 2026 dan hasil sesudah deploy 16–17 Sep 2026; bukan status aktif.
> Ringkasan milestone: [history/changelog/2026-09.md](../history/changelog/2026-09.md).

## Audit halaman utama produksi — 15 Sep 2026 (mobile-first)

**Sumber permintaan:** owner ("audit UI/UX halaman utama `https://kost48surabaya.com/`, buat mobile-first, laptop juga aman").

**Metode:** audit **read-only** ke produksi dengan Playwright + `@axe-core/playwright` (tag WCAG 2.0/2.1 A+AA). Viewport: 320×568, 360×640, 375×667, 375×812, 414×896, 768×1024, 1280×800, 1440×900. Pengukuran: overflow horizontal, target sentuh, ukuran teks, bobot/atribut gambar, tabrakan elemen `fixed`, struktur heading/landmark, LCP & CLS, error console/HTTP. Tidak ada klik yang mengubah data (hanya membuka accordion FAQ); produksi tidak diubah.

**Kondisi produksi saat diaudit:** 13 kamar, **semuanya `FULL`** (`GET /api/public/rooms`) — halaman berada pada state "tidak ada kamar kosong", jadi yang dinilai adalah empty-state (AO-17), bukan state normal.

### Hasil yang sudah baik (produksi)

| Aspek | Hasil |
|---|---|
| Overflow horizontal | 0 px pada 8 viewport |
| Axe WCAG 2.1 A/AA | 0 pelanggaran (5 viewport terukur; 414 px gagal dimuat sekali lalu diukur ulang pada build lokal) |
| Struktur | satu `<h1>`, `main`/`header`/`footer` ada, 0 `<img>` tanpa atribut `alt` |
| Kontak | 5 tautan `wa.me` dengan pesan terisi otomatis; tanpa `href="#"` |
| Runtime | 0 error console, 0 respons ≥400, TTFB 84–311 ms |
| Desktop 1280/1440 | Tanpa elemen terpotong, nav lengkap, CTA di lipatan |

### Temuan dan perbaikan

| # | Temuan (produksi) | Perbaikan (lokal) | Bukti |
|---|---|---|---|
| P1-1 | Tiga jawaban FAQ menampilkan kode mentah `{formatRupiah(...)}` — terlihat di mobile **dan** desktop | `${formatRupiah(...)}` pada `PublicGuestDashboardPage.tsx` (akar: template literal tanpa `$`) | Live: `wifiPrice`, `electricityTariff`, `petDeposit`; sesudah: 0 placeholder bocor di 7 viewport |
| P1-2 | Bar CTA 80 px menutupi CTA hero: 320×568 **kedua** CTA, 360×640 & 375×667 CTA sekunder | Bar hanya dirender setelah hero lewat (ambang: dasar hero < 55% viewport) | Geometri: 320 bar 476–556 px vs CTA 479–526 & 538–586 |
| P1-3 | Tombol "Cek Kamar" terpotong 8 px di 320 px; brand "KOST48 Suraba…" | Padding topbar .6–.75 rem di ≤420 px; ghost "Masuk Portal" disembunyikan ≤420 px (tetap ada di footer); `min-width:0` | `ctaClip` 320: +8 → 0 px; brand tidak lagi ter-ellipsis |
| P1-4 | Copy bar "0 kamar tersedia" berlawanan hero "Semua kamar sedang terisi" | Bar berbunyi "Semua kamar terisi · Kabari saya" dan menuju WhatsApp saat `bookable = 0` | Teks + `href` wa.me terverifikasi di tengah halaman |
| P2-1 | `brosur-depan` 548 KB + `brosur-belakang` 507 KB untuk kotak 327×245 px = 89% bobot halaman; 6/6 `<img>` tanpa `width`/`height` | Thumb WebP 800 px (89 KB / 72 KB / 78 KB) + atribut `width`/`height`; lightbox tetap berkas penuh agar brosur layak dibagikan | Bobot halaman 1.134 KB → 282 KB |
| P2-2 | 24 dari 49 target sentuh < 44 px (shortcut nav 30,8 px; tautan footer 24,5 px; chip filter 38 px) | Blok CSS mobile: min-height 44 px untuk shortcut, footer, brand, CTA topbar, `[role="tab"]`, tombol WhatsApp | Target <44 px: 24 → **0** (mobile) |
| P2-3 | Scroll-top beririsan ±20 px dengan bar CTA; container toast 32 px di belakang bar | `bottom: 6.5rem` untuk scroll-top; toast dinaikkan via `body:has(.gx-mobile-booking)`; footer diberi ruang bawah | Terverifikasi pada 320/375/414 |
| P2-4 | Delapan pertanyaan FAQ dirender `<h2>` (sejajar judul section) + label kategori menempel | `Accordion.Header as="h3"`; ukuran huruf tetap 14,4 px | Sebelum: 8 pertanyaan itu terhitung sebagai `<h2>`; sesudah (build lokal): `h2` = 9, `h3` = 20 |
| P2-5 | Teks 10,2–12,8 px mendominasi (label 10,72 px, footer 10,88 px, nav 12,8 px) | Blok CSS mobile menaikkan label/shortcut/footer/caption ke ≥12–13 px | Minimum teks mobile 12 px (label uppercase), body ≥13 px |
| P2-6 | 10/10 `<section>` tanpa label | `aria-label` pada 11 section | `sectionsNoLabel` 10 → 0 |

### Verifikasi

- **Lokal (bukan deployment/UAT):** `tsc -b` + `npm run build` + verifikasi PWA lulus, build `LUqZkqdOXLq8`.
- **Audit build lokal** (`dist` disajikan statis; respons API produksi dipakai sebagai fixture agar state = 13 kamar `FULL`) pada 320×568, 375×667, 375×812, 414×896, 768, 1280, 1440: overflow 0 px, **Axe 0 pelanggaran**, placeholder bocor 0, target <44 px 0 (mobile), CTA hero tidak tertutup bar, bar WhatsApp saat kamar penuh.
- **Desktop dijaga:** pada 1280/1440 bar `display:none` (h=0), jumlah target <44 px tetap 25, tinggi halaman setara produksi; seluruh aturan baru dibatasi `@media (max-width: 767.98px)` / `420px`.

### Hasil sesudah deploy (produksi, 16 Sep 2026 WIB)

Deploy `client/` dijalankan lewat `scripts/remote/deploy-client-safe.sh` (backup → folder baru → verifikasi entry → tukar folder → uji HTTPS; tanpa restart, tanpa DB). Tiga siklus: `LUqZkqdOXLq8` (audit + Fase 1&2) → `WhBmlAjYXZiB` (label bar CTA yang membungkus dua baris di 320 px) → **`3c0qJfgImyvj`** (nama brand ter-ellipsis karena `max-width: 128px` bawaan vs teks 129 px).

| Metrik (produksi) | Sebelum | Sesudah deploy |
|---|---|---|
| FAQ bocor `{formatRupiah(...)}` | 3 jawaban | **0** |
| Target sentuh <44 px (mobile) | 24 / 49 | **0 / 49** |
| Brand header | "KOST48 Suraba…" (320 & 375) | **utuh** |
| CTA topbar terpotong | +8 px @320 | **0** |
| Bar CTA saat kamar penuh | "0 kamar tersedia" → `/rooms` | "Semua kamar terisi · 💬 Kabari" → WhatsApp |
| Bar menutupi CTA hero | ya (320×568; 360/375×640–667) | **tidak** |
| Bobot halaman | 1.134 KB | **248 KB** |
| Axe WCAG 2.1 AA | 0 | **0** (tidak ada regresi) |
| Target <44 px desktop (1440) | 25 | 25 (tidak berubah) |
| Aset `client/` di server | 758 file | 165 file |

Rollback tersedia: `~/kost48-prod/client-old-20260916-053947` (build pra-perbaikan `G2vp1MdZhTRz`), `-055824`, `-061054`, plus tarball `~/backups/client-20260916-*.tar.gz`.

### Sisa (belum selesai)

1. ~~Deploy `client/` ke produksi~~ — **SELESAI 16 Sep 2026 WIB** (`3c0qJfgImyvj` aktif; verifikasi produksi: overflow 0, Axe 0, target <44 px mobile 0). Catatan proses: SSH sempat tidak terjangkau 15 Sep (semua port SSH timeout, hanya 443 terbuka) lalu normal setelah owner membuka akses.
2. ~~**CLS mobile 0,15–0,44**~~ — **SELESAI & TAYANG 17 Sep 2026 WIB** (build `BZ-Vpsd9eLX1`). Pengukuran ulang dengan observer `layout-shift` membuktikan penyebab dominan **bukan** skeleton katalog: pada build produksi `3c0qJfgImyvj` di 375 px (CLS 0,4235) dua entri terbesar berasal dari `DIV.gx-hero-body` yang bertambah tinggi 518 → 543 → 568 px saat teks hero diketik (±25 px/baris), disusul badge harga yang baru muncul setelah tarif tiba. **Perbaikan:** blok CSS **M22** — `.gx-hero-sub` & `.gx-hero-price-badge-sub` memakai `display: grid` dengan salinan "ruang-terpesan" (`visibility: hidden`) di sel yang sama, plus `gx-hero-price-slot` yang selalu terisi (placeholder senyap sebelum tarif ada); `aria-label` pada `<p>` diganti salinan `visually-hidden` (Axe `aria-prohibited-attr` serious). **Hasil lokal (build `mx3kLXWOYkTg`/`BZ-Vpsd9eLX1`):** CLS 375 px **0,4235 → 0,0069**; 320 px 0,0240; 414 px 0,0038; 768 px 0,0170; 1280 px 0,0071; Axe 0 violations. **Verifikasi produksi sesudah deploy:** CLS **0,0081** (1280×720, data nyata, badge 42 px, reserve = live = 54 px), overflow 0 px, CSSOM live memuat selektor M22. Sisa: pergeseran beberapa piksel dari pergantian webfont. Bukti: `.audit-runtime/out/cls-mobile-verification.md`.
3. ~~**Tablet 768 px:** 18 target <44 px karena ambang CSS mobile berhenti di 767,98 px~~ — **SELESAI & TAYANG 17 Sep 2026 WIB** (build `BZ-Vpsd9eLX1`): blok **M21b** `@media (min-width: 768px) and (max-width: 1023.98px)` **hanya** memperluas target sentuh; `.gx-topbar .gx-btn-ghost` juga masuk blok mobile M21 (celah 421–767 px). **Celah 1024–1279 px ditutup** oleh blok **M21c** `@media (min-width: 1024px) and (pointer: coarse)`. **Verifikasi lokal** (harness iframe identik + kriteria `measure.js`): 768 px **18 → 0 dari 18 target audit**, semua 44 px, overflow 0 px; 320/375/414 tidak berubah; **1024/1280/1440 tidak berubah**. Verifikasi produksi: CSSOM live memuat media M21b (5 aturan) dan M21c (6 aturan). **Sisa:** perilaku `(pointer: coarse)` pada perangkat sentuh nyata belum dapat dibuktikan (harness lokal = pointer halus); pengukuran produksi 768 px tertahan WAF (iframe lintas-origin ditolak).
4. **Halaman lain belum diaudit** dengan metode yang sama (katalog `/rooms`, `/panduan`, `/reviews`, `/faq`).

> Catatan batas: audit ini tidak mengubah data produksi, tidak men-deploy, dan tidak mengukur dampak runtime di host. Angka produksi diambil 15 Sep 2026 (WIB) dan dapat berubah bila status kamar atau aset owner berubah.
