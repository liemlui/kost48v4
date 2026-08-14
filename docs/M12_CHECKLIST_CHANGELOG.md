# KOST48 V5 — Checklist Eksekusi Aktif

> Versi aktif: **2026-07-30** | Changelog → `docs/M13_CHANGELOG.md` | Riwayat fase lama tetap dipertahankan sebagai arsip konteks.

## Cara Pakai (AI Eksekutor — baca sebelum coding)

## Update 2026-07-30 — Audit Mendalam UI/UX Lintas Portal

- [x] Audit browser nyata mencakup 66 kombinasi route–viewport: publik, tenant aktif, dan tenant tanpa stay aktif pada desktop/mobile.
- [x] Audit statis mencakup 74 deklarasi route, guard role, navigasi STAFF, state loading/error/empty, serta titik aksesibilitas utama.
- [x] Temuan, bukti, file ownership, dependensi, dan Definition of Done dibukukan di `docs/M14_AUDIT_UI_UX.md` sebagai sumber eksekusi Fase AO.
- [x] Masukan Baymard UX-Ray disaring: 4 pola `Best-in-Class` menjadi regression guard, 1 `Small Issue` menjadi AO-15, 2 `Not Applicable`, dan 310 `Not Rated` tidak disalahartikan sebagai defect.
- [x] Guideline page-level Search Results dipetakan ke katalog `/rooms`: 12 guideline relevan/diadaptasi, 3 dikeluarkan, dan 1 task baru AO-16 untuk filtered-zero state serta persistensi shortlist.
- [x] Review page-level homepage diverifikasi read-only terhadap produksi: 0/13 kamar memang state data sah; 28 observasi ditriage menjadi AO-17..AO-19, merge AO-08/AO-15, atau ditolak bila menuntut klaim palsu.
- [x] Review dashboard Owner desktop ditriage terhadap kode: alert/actionability, toolbar, KPI data states, AI setup, dan sistem visual menjadi AO-20/AO-21; sidebar collapse dan label status teks tidak dicatat ulang sebagai defect palsu.
- [x] Review dashboard Area Admin desktop ditriage terhadap kode: antrean aksi telah ada namun salah urutan; hierarchy exception menjadi AO-22 dan shell/komponen terkoordinasi menjadi AO-23.
- [x] Gate awal AO-00: sinkronkan dua migration UAT yang masih pending melalui prosedur migration resmi; jangan gunakan `db push`.
- [ ] Crawl dinamis OWNER/ADMIN/STAFF diulang setelah akun fixture UAT tersedia. Audit statis bukan pengganti bukti runtime.
- **Putusan:** status UI/UX pra-go-live **RED** sampai AO-00 selesai dan regresi lintas role dapat dijalankan.

## Update 2026-07-30 — Audit Menyeluruh KOST48 V5 (Reasonix)

- [x] Audit statis lintas 46 modul backend + frontend + cross-cutting: keamanan (default-deny, HMAC IoT, SQLi, secrets), atomisitas keuangan, race/transaksi, hooks-order frontend. Hasil dibukukan di `docs/M16_AUDIT_MENYELURUH.md`.
- [x] Baseline hijau: backend `tsc --noEmit` + `test:unit` 74/74 · frontend `npm run build` (PWA verified) + `vitest run` 135/135.
- [x] Temuan minor **I-01** (validasi mutasi stok di luar tx) diperbaiki commit `610395c` — validasi dipindah ke dalam transaksi yang sama.
- [x] File scratch audit Cline (A/AUDIT_L/AUDIT_LAPOR) diarsipkan ke `docs/archieve/`.
- **Putusan:** risk rating 🟢 LOW — 0 HIGH, 0 MEDIUM terbuka, 1 LOW sudah fix. Sisa pra-go-live = Fase A (infra owner) + eksekusi Fase AO (AO-03/13/14/17..23).

## Update 2026-07-16 — KTP Portal dan Simplifikasi Owner/Admin

- [x] Tenant dapat upload KTP miliknya sendiri; akses lintas tenant ditolak backend.
- [x] Upload baru mereset verifikasi dan masuk antrean pemeriksaan Admin.
- [x] Dashboard Admin menampilkan KTP pending; detail review berada di modal tenant.
- [x] Toggle Kokpit Owner/Area Admin diverifikasi pada desktop/mobile dan route terpisah.
- [x] Standar UI dibukukan di `docs/UI_UX_OWNER_ADMIN.md`.
- [x] Crawl Playwright admin/owner lulus bersih; mobile 375px dashboard/stays/invoices/tickets tanpa overflow horizontal.
- **Gate:** TypeScript backend dan frontend lulus.

## Update 2026-07-29 — Audit mendalam keuangan & koreksi dokumen

- [x] Audit verifikasi independent terhadap klaim keuangan (Reasonix) — akurasi ~65%, 8 koreksi diterapkan ke M04/M12/M13.
- [x] Koreksi `docs/M04_KEUANGAN.md`: P1-03 (bukan tx terpisah — SATU tx, try/catch swallow error), update stale line numbers, 10→15 fungsi posting, catatan unit test (script ada di M04, file belum dibuat), tambah temuan N4 (inkonsistensi journal handling expenses vs payment).
- [x] Koreksi frontend paths + ukuran halaman di dokumentasi.
- [x] Changelog di `docs/M13_CHANGELOG.md`.
- **Gate:** Semua verifikasi ulang PASS — tsc 0 errors, 48/48 unit test, frontend build 162 chunks.

## Update 2026-07-29 — Hardening UI/UX IoT dan energi

- [x] Dashboard IoT owner memprioritaskan perangkat bermasalah, membedakan online/offline/stale/nonaktif, dan menyediakan kartu mobile serta detail kualitas telemetri.
- [x] Portal penghuni memisahkan snapshot periode resmi dari monitoring sensor; nilai kosong, loading, error, dan reset counter tidak lagi berubah menjadi angka nol atau estimasi palsu.
- [x] Kalender bisnis meter diseragamkan ke WIB; tab, chart, gauge, modal, fokus keyboard, reduced motion, dan kontras diperkuat.
- [x] Gate frontend lulus: 31 file/135 tes, 4 skenario Playwright + Axe, build TypeScript/Vite/PWA, serta pemeriksaan diff.
- **Batas rilis:** artefak TGZ lama yang memuat seed historis/PII tidak termasuk commit ini; integrasi perangkat fisik tetap memerlukan UAT lapangan.

## Update 2026-07-23 — Rekonsiliasi perubahan lintas AI

| Area | Status kode | Bukti commit | Gate sisa |
|---|---|---|---|
| Inventaris & fasilitas kamar | Summary stok, gap fasilitas, auto-link dengan review operator, dan fix filter/pagination selesai | `1eb11d9`, `0701327` | UAT operator untuk hasil auto-link |
| IoT & quota energi | Dashboard/telemetri aktif; quota mengikuti sewa lunas dan renewal multi-bulan | `298bcca`–`8af53d6` | Mapping device/hardware, UAT Tuya/ESP32; tanpa auto-billing/auto-alert |
| Pengumuman/notifikasi/push | P1-P3 selesai, migration delivery tersedia | `f9387d2` | UAT visual + HTTPS/VAPID push |
| Kualitas backend | Strict null/implicit-any aktif, dead code/helper duplikat dibersihkan | `e327e9b` | Build/typecheck release SHA |
| Kualitas frontend | CSS entry disatukan, wrapper/konstanta duplikat dibersihkan | `8a589e6` | UAT visual lintas portal |
| Paket/source baseline | Bundle rilis memuat build artifact dan runtime `node_modules`; server tidak melakukan install/build | `8627289` + generator rilis terkini | Commit dokumentasi/runbook dan pilih SHA rilis |

Catatan: perubahan tool/seed deploy 2026-07-19 adalah riwayat UAT. Produksi mengikuti `DEPLOYMENT_ONLINE_20260723.md`, bukan seed historis atau `db push`.

1. **Orientasi:** buka bagian [ANTRIAN EKSEKUSI AKTIF](#antrian-eksekusi-aktif) di file ini.
2. **Spesifikasi domain:** buka M-file yang ditunjuk fase/task (`M01`-`M09`).
3. **Anchor kode:** grep **nama simbol/fungsi** di `backend/src` / `frontend/src` — **JANGAN** edit buta.
4. **1 task = 1 commit** (Bahasa Indonesia). Lalu centang `[x]` + 1 baris di `docs/M13_CHANGELOG.md` (paling atas).
5. **Gate build:** `cd backend; npx tsc --noEmit` · `cd frontend; npm run build`. Task **uang** WAJIB juga `node --test "test/**/*.test.js"` + gate `docs/M04_KEUANGAN.md`.
6. **DB dev:** postgres **5433** `kost48_v3_pro` · reseed: `node scripts/seed-dev-reset.js && node scripts/seed-dev-real.js` (data asli dari Excel teraudit).
7. **Larangan:** no npm dep baru · no `schema.prisma` tanpa approval owner (🧬) · no `git push` · no sentuh file milik AI lain.

## Efisiensi Sesi & Bump Versi

- Satu sesi ideal = 1 episode kerja yang masih berhubungan. Jika topik sudah berubah total atau konteks mulai jenuh, mulai sesi baru lebih hemat daripada menyeret konteks lama.
- Navigasi token: buka `M00`/`M01`/`M12` dulu, lalu grep simbol spesifik. Jangan baca seluruh arsip saat tidak dibutuhkan.
- Bump versi aplikasi hanya saat owner minta eksplisit. Sumber kebenaran versi:
  - `frontend/src/config/version.ts`
  - `frontend/public/version.json`
- Format versi:
  - `PATCH` untuk bugfix / polish kecil
  - `MINOR` untuk fitur baru yang terasa ke user
  - `MAJOR` untuk perubahan besar / breaking change
- Saat bump versi, ikut update `APP_BUILD_DATE` ke tanggal hari ini. Build ID PWA tetap dihasilkan otomatis saat `npm run build`.

| Marker | Arti |
|--------|------|
| 🧑 / [OWNER] | Langkah manusia — STOP & lapor, jangan tebak env/server |
| 🧬 / [SCHEMA] | Perlu migration additive — butuh approval owner dulu |
| **Gate:** | Verifikasi wajib sebelum centang `[x]` |

---

## Status Ringkas (2026-07-30)

| Blok | Status | Catatan |
|------|--------|---------|
| Fase A — Pra-Go-Live | 🧑 blocked | Kode inti siap; publish nyata menunggu server/domain/env owner |
| Fase B — Publik & Tenant | ✅ selesai | Public UI, smart booking, kalender, foto, aset brosur, meter, profil |
| Fase C — Owner/Admin | ✅ selesai | Mode-aware UI, route split/guard, status cards, inventaris shell |
| Fase D — Staff & Gudang | ✅ selesai | Meter status, theme, WiFi order, tip flow, gudang FK, role scope |
| Fase E — Polish & Teknis | ✅ selesai | Split auto-ops & stays, integration test, E2E Playwright, eval arsitektur |
| Fase F — UI/UX Sweep | ✅ selesai | 404, toast, a11y (skip-link/SVG), kontras AA, logout confirm, search tenant, skeleton |
| Fase G — AI Owner/Admin | ✅ selesai | G0-G9: safety foundation, brief, finance analyst, payment review, OCR, ops/inventory, budgeting |
| Fase H — UI/UX Compact | ✅ selesai | Sidebar owner 18→7, dashboard 6→3 tab, merge minat+layanan, polish CSS |
| Fase I — Navigasi & Onboarding | ✅ selesai | I1-I6: hapus duplikasi menu, unifikasi staff nav, breadcrumb klik, onboarding tenant |
| Fase J — Hardening AI | ✅ selesai | J0-J4: helper/test PDP+uang, guard no-partial DP, hardening FE AI, audit PDP |
| Fase K — Pasca-Audit Total | ✅ selesai | 13 task: keamanan, data integrity, CSS, arus kas, AI settings. Commit `ac4cc2f` |
| **Fase L — UI/UX Audit** | ✅ selesai | L-01..L-20 semua selesai (loading, mobile, error, a11y, wording, accounting checklist, dll.) |
| **Fase M — Quick Wins A11y & Polish** | ✅ selesai | M-01..M-06: navigate, ConfirmProvider, reduced-motion, font fix, ClickableRow a11y, toast a11y |
| **Fase N — Ramping Dashboard & Navigasi** | ✅ selesai | N-01..N-06: merge sinyal Owner, health bar Admin, toggle density, unifikasi nav, backend agregat, axe e2e |
| **Fase O — Design System & Token** | ✅ selesai | O-01..O-08: palet terpadu, chartColors, spacing scale, CSS Modules, pisah misc.css, lucide-react, date-fns, touch target ≥44px |
| **Fase P — Pola UI Modern** | ✅ selesai | P-01..P-06: 3-tampilan toggle, FullCalendar, @dnd-kit kanban, TanStack Table, bottom tab bar Tenant, cmdk palette |
| **Fase Q — Performa & Stabilitas** | ✅ selesai | Q-01..Q-07: fix endpoint 404 backend, anti-pattern fetch loop, heavy query, error boundary, lazy-load, empty state |
| **Fase R — UI/UX Public + Admin/Owner + Tenant + Staff + Owner-Only** | ✅ selesai | R-01..R-30 selesai (R-12 deferred/investigasi backend); build lulus 2026-06-22. |
| **Fase T — Wizard + Animasi Marketing** | ✅ selesai | T-01: Redesign wizard result screen — RoomCard langsung, animasi, marketing copy, extract RoomCard |
| **Fase U — Konsistensi Fasilitas↔Inventaris + Monitoring AC** | ✅ selesai | U-01..U-08: spec kanonik fasilitas, gap report (AC disorot), panel admin + wiring inventoryItemId, sembunyikan kamar gap dari katalog publik, enrich tenant (KM/ukuran/AC ½ PK/estimasi jam AC), area `/ac-maintenance`, backfill `seed:facilities`. Tanpa migrasi; build lulus 2026-06-24. |
| **Fase V — Audit 2026-06-30 + Booking Flow Baru** | ✅ selesai | V-00..V-16: room state `AVAILABLE → RESERVED → OCCUPIED`. 156/156 test PASS. |
| **Fase W — Audit Maksimal Status Proyek** | ✅ selesai (2026-07-02) | W-00..W-13: security, role matrix, lifecycle guards, AutoOps idempotency, media registry, finance guard (COA OWNER-only), staff boundary, frontend state (objectURL fix), public hardening, logs/release, docs hygiene, test coverage. |
| **Fase X — Audit UI/UX Visual (Playwright + Inspeksi Visual)** | ✅ selesai | X-01..X-16 semua selesai; X-02d owner konfirmasi OCCUPIED tampil; X-16 axe-auth.spec.ts 12 test. |
| **Fase Y — Test Coverage Maksimal** | ✅ hampir tuntas | **152/153** area selesai; sisa Y-G7 N/A (source tak ada di repo). 1372 test PASS. |
| **Fase Z — Audit UI/UX Cross-Portal (2026-07-02)** | 🟡 19 task terverifikasi | 1 CRITICAL (data XSS test), 7 HIGH (404/kosong/nav), 8 MEDIUM (chart/race/loading), 3 LOW (publik). Rujukan di `docs/_AUDIT_CROSS_PORTAL_2026-07-02.md`. |
| **Fase AA — Perbaikan Temuan Audit CHECKLIST_01** | ✅ selesai | AA-01..AA-05: FaqPublicPage `GuestTopbar`, hapus filter `rating≥4`, 3 fix sudah dari sebelumnya; build lulus. |
| **Fase AB — Perbaikan Temuan Audit CHECKLIST_02** | ✅ selesai | AB-01..AB-05: 2 sudah done sebelumnya (AB-01 label Dipesan, AB-02 link error-state), 3 dikerjakan (page-size 9, deposit→Deposit jaminan, komentar DP preview) |
| **Fase AC — Perbaikan Temuan Audit CHECKLIST_03** | ✅ selesai | AC-01..AC-04: UTC date fix WIB, FAQ batas penghuni 2→4, Air Rp 0→Air termasuk, AC-04 N/A (tercakup AB-05) |
| **Fase AD — Perbaikan Temuan Audit CHECKLIST_04** | ✅ selesai | AD-01..AD-04: hapus TENANT dari settings/operational, sembunyikan enumerasi User tidak aktif, Link+autocomplete auth, komentar dead code |
| **Fase AE — Perbaikan Temuan Audit CHECKLIST_05** | ✅ selesai | AE-01 (HIGH: infinite refetch loop) ✅ fix sudah ada; AE-02 ✅ dikonfirmasi live 3 Jul (bayu occupied) |
| **Fase AF — Perbaikan Temuan Audit CHECKLIST_06** | ✅ selesai | AF-01..AF-03: countdown invoice lunas, banner onboarding mantan penghuni, catatan double-submission (INFO). 3 file frontend. |
| **Fase AG — Perbaikan Temuan Audit CHECKLIST_07** | ✅ selesai | AG-01: banner onboarding ex-tenant — tercakup AF-02. Tanpa kode tambahan. |
| **Fase AH — Perbaikan Temuan Audit CHECKLIST_08** | ✅ selesai | AH-01..AH-04: hardening 503 announcements, verifikasi STALE Hermes I12/I13, banner ex-tenant (tercakup AF-02). 1 file backend. |
| **Fase AI — Perbaikan Temuan Audit CHECKLIST_09** | ✅ selesai | AI-01..AI-02: hardening 503 isBookingSchemaReady + FE bookingsQuery tak blokir portal; loyalty/renewal/checkout diverifikasi via kode. 2 file backend + 1 file frontend. |
| **Fase AJ — Sisa Temuan Audit (C05-01 sistemik + C10/C17 + seed)** | ✅ selesai | AJ-01/02 anti-loop ✅ · AJ-03/04 seed + TB ✅ · AJ-05 okupansi ✅ · AJ-06 docs ✅ · AJ-07 yang aman diuji ✅ (temuan baru C19-01/C19-02 dicatat; sisanya human/destructive follow-up). |
| **Fase AK — Owner-Request 2026-07-04** | ✅ kode selesai | AK-01 API key DeepSeek via Settings (tanpa restart, env fallback, tak pernah bocor ke respons) 🧬 · AK-02 fix 400 simpan panel AI · AK-03 input angka ribuan + fix nol-depan (CurrencyInput diperkuat, 12 file). `db push` kolom baru saat env hidup. |
| **Fase AM — Redundansi UI/UX + Audit** | ✅ selesai (16/16) | AM-01 unifikasi WA URL, AM-02 hapus RoleWorkspaceTabs, AM-05 Pengumuman sidebar, AM-07 fix spec detection, AM-13 CSS Modules riset, AM-14 useForm wrapper, AM-15 Storybook, AM-16 E2E smoke. Build FE ✅ 6 Jul 2026. Detail: `docs/M14_REDUNDANSI_UI_UX.md`. |
| **Fase M16 — Audit 360 Flow Huni** | ✅ selesai | 7 temuan: P2-01/02/04 fixed (+🧬), P2-03/05/06/07 diverifikasi valid. Detail: `docs/archieve/M16_AUDIT_360_FLOW_HUNI.md §7`. |
| **Fase M16-Deep — Audit Siklus Huni (Reasonix)** | ✅ selesai (29 Jul) | Deep audit terhadap laporan M16: 9 best-effort journal ditemukan (vs 3 di M16), severity S-01 dikoreksi MEDIUM→HIGH, cross-ref Fase AN. Temuan terintegrasi ke `docs/M05_SIKLUS_HUNI.md` §Deep Audit. |
| **Fase M17-Deep — Audit Operasional & Staf (Reasonix)** | ✅ selesai (29 Jul) | Deep audit 11 modul operasional: 1 best-effort journal (wifi-sales), 2 silent swallow, 2 race condition (tickets assign/start). 7 modul BERSIH. Temuan terintegrasi ke `docs/M06_OPERASIONAL.md` §Deep Audit. |
| **Fase M18-Deep — Audit Publik & Marketing (Reasonix)** | ✅ selesai (29 Jul) | Deep audit 6 modul publik/marketing: 0 best-effort journal, 0 race condition, 1 LOW (silent swallow notifikasi), 1 MEDIUM (PIN-based auth). Domain paling bersih. Temuan terintegrasi ke `docs/M07_PUBLIK_GROWTH.md` §Deep Audit. |
| **Fase M19-Deep — Audit Inventaris (Reasonix)** | ✅ selesai (29 Jul) | Verifikasi AUDIT_LAPORAN_INVENTARIS.md: 85% benar. 1 severity dikoreksi MEDIUM→HIGH (IV-01 read-check-write race). 3 positive pattern kuat (room-item create/qty BLOCKED, inventory create $transaction, movement update BLOCKED). Temuan terintegrasi ke `docs/M06_OPERASIONAL.md` §Deep Audit Inventaris. |
| **Fase M20-Deep — Audit Notifikasi & Sistem (Reasonix)** | ✅ selesai (29 Jul) | Deep scan 6 modul notifikasi/sistem (1138 baris): 0 best-effort journal, 0 race condition. Semua .catch() acceptable. Domain paling bersih. Temuan terintegrasi ke `docs/M06_OPERASIONAL.md` §Deep Audit Notifikasi. |
| **Fase M21-Deep — Audit AI & Growth (Reasonix)** | ✅ selesai (29 Jul) | Deep scan 7 modul AI/growth (2599 baris): 0 best-effort journal, 0 race condition. FOR UPDATE di loyalty redemption. OWNER-only segregation. Domain terbersih. Temuan terintegrasi ke `docs/M07_PUBLIK_GROWTH.md` §Deep Audit AI. |
| **Fase M22-Deep — Audit IoT & Telemetri (Reasonix)** | ✅ selesai (29 Jul) | Deep scan modul iot/ (1911 baris): 0 isu. timingSafeEqual di cron token + ESP32 HMAC, polling mutex, RateLimitGuard. Temuan terintegrasi ke `docs/M06_OPERASIONAL.md` §Deep Audit IoT. |
| **Fase MX — Audit Lintas Scope (Reasonix)** | ✅ selesai (29 Jul) | Cross-scope audit terhadap 8 domain: 1 CRITICAL (journal consistency), 2 HIGH (timezone, DRY), 10 rekomendasi X1-X10. Scope Keuangan = sink terlemah. Temuan terintegrasi ke `docs/M01_MASTER.md` §Audit Lintas Scope. |
| **Fase MX-Verify — Verifikasi Codex Sol** | ✅ selesai (29 Jul) | 18 temuan diverifikasi oleh Codex Sol (model tertinggi): 12 BENAR, 1 SALAH (A9 expenses), 5 PARSIAL (B1/B4/C1/D1/A7). 8 koreksi diterapkan ke M01/M05/M06. |
| **Fase MX-Final — Koreksi sign-off pasca commit 6223a30** | ✅ selesai (30 Jul) | S-01 lock dipindahkan ke satu transaksi penuh; OS-05 lock User disamakan untuk ticket+routine; seluruh boundary bucket AI diperbaiki; fan-out peer-report menjadi bulk; 7 regression test khusus ditambahkan. |
| **Fase AO — Audit & Hardening UI/UX Lintas Portal** | 🔴 audit selesai, eksekusi terbuka | 66 kombinasi awal + verifikasi produksi homepage + review Owner/Admin static-code; 1 P0 environment, 9 P1, 11 P2, 1 P3. Sumber kerja: `docs/M14_AUDIT_UI_UX.md`. |

---

## Peta Rujukan Dokumen

| Kebutuhan | Baca dulu | Dipakai untuk |
|-----------|-----------|---------------|
| Orientasi bisnis & ground state | `docs/M01_MASTER.md` | Gambaran KOST48, 48 kamar, role, invarian sistem |
| Keputusan owner & UX | `docs/M02_KEPUTUSAN_OWNER.md` | D-01..D-23, role guard, aturan UX owner |
| Flow kontrak & chain-of-custody | `docs/M03_FLOW_KONTRAK.md` | Booking → invoice → jurnal → stay lifecycle |
| Keuangan, jurnal, invoice, deposit | `docs/M04_KEUANGAN.md` | WAJIB tiap task uang — unit test + invarian TB |
| Siklus huni, booking, renewal, KTP | `docs/M05_SIKLUS_HUNI.md` | Booking, stay, checkout, profil tenant |
| Operasional, staf, gudang, meter | `docs/M06_OPERASIONAL.md` | Staff route, inventory, meter, tiket, gudang |
| Publik, marketing, SEO, layanan | `docs/M07_PUBLIK_GROWTH.md` | Public UI, katalog, foto marketing, layanan tambahan |
| Deploy & go-live produksi | `docs/M08_DEPLOY_GO_LIVE.md` | F1-12, env produksi, smoke test, password owner |
| Audit Fable (2-3 Jul 2026) | `docs/archieve/audit_fable/00_INDEX.md` | 19 checklist C01-C19 |
| Audit Reasonix (7 Jul 2026) | `docs/archieve/audit_reasonix/RINGKASAN_EKSEKUTIF.md` | 82 temuan baru |
| Audit historis (Jun 2026) | `docs/archieve/M09_AUDIT.md` | Rujukan audit lama, risiko, keputusan pasca-audit |
| Changelog arsip | `docs/M13_CHANGELOG.md` | Riwayat ringkas; tulis entri baru di paling atas |
| AI Owner/Admin berbayar | `docs/M09_AI_OWNER_ADMIN.md` | Fase G: tombol manual, DeepSeek, hemat token, OCR, approval copilot |
| Navigasi kode (PAKAI INI dulu) | `docs/M00_CODEMAP.md` | Modul→path→tanggung jawab + index model + anchor flow |

---

## ANTRIAN EKSEKUSI AKTIF

> **Fase A** blocked owner (infrastruktur server/domain/env). **Fase AO** adalah antrean UI/UX aktif; fase lama yang sudah selesai tetap menjadi konteks historis.
>
> **Sisa aktif:**
> 0. **SEED-DATA-ASLI ✅** — Seed data asli dari KOST48_Laporan_Bulanan_FINAL_Teraudit.xlsx menggantikan dummy `seed-dev-via-api.js`. 14 kamar, 48 tenant (dengan portal access), 52 stay (12 ACTIVE), 186 invoice PAID, 186 payment, total Rp 219.710.000. Script: `backend/scripts/seed-dev-real.js` + `backend/scripts/seed-data.json`. (19 Jul 2026)
> 0. **G5+ Fixlist KTP** — ✅ **SELESAI (3/3 + hardening review)** — migration `ktpVerificationMethod/Notes`, rate-limit hemat kuota (deterministik/fallback tak potong kuota), method `AI` di `verifyKtp` butuh bukti sukses AI (`KtpAiApprovalService` baru, TTL 30 mnt, sekali pakai); hardening cache AI (prune+cap, clone anti-mutasi, key model konsisten). Build BE ✅ FE ✅
> 0. **G5+ gap kritis: UI upload foto KTP + audit orphaned endpoint** — ✅ **SELESAI** — endpoint `ktp/upload` yang sebelumnya tak pernah dipanggil UI kini aktif; audit orphaned endpoint Admin/Owner/Inventory juga sudah ditutup: delete KTP, create/update COA, update cash account, update period notes, edit aset, draft FAQ AI, review laporan staff AI, legacy deposit-ledger dry-run, dan integrasi demographics summary sudah tersambung atau dibersihkan bila redundant. Build FE ✅ BE ✅
> 0. **Fase M16 — Audit 360 Flow Huni** — ✅ **SELESAI** — 7 temuan: P2-01/02/04 fixed, P2-03/05/06/07 diverifikasi valid. Detail: `docs/archieve/M16_AUDIT_360_FLOW_HUNI.md §7`. Build FE ✅ BE ✅
> 0. **Fase AM — Redundansi UI/UX + Audit (Admin + Owner + Publik)** — ✅ **SELESAI (16/16)** — AM-01..AM-16. Detail: `docs/M14_REDUNDANSI_UI_UX.md`.
> 0. **Fase M18 — Celah Peningkatan (Review 9 Jul 2026)** — ✅ **11/11** — 11 task tuntas: refresh token race condition, masking NIK, unique `identityNumber`, saveKtpData tidak overwrite field existing, feedback error KTP save, DTO validasi KTP-data, unit test OCR FE/BE, logging silent catch, dan `FeatureErrorBoundary` untuk halaman kritis.
> 0. **AU-01..AU-03 — Sisa audit kedalaman UI/UX Admin/Owner** — ✅ **SELESAI (8 Jul, Fable5)** — AU-01 `SimpleCrudPage` confirm dialog + `onError` toast di delete (dampak: expenses/invoice-payments/wifi-sales/additional-services); AU-02 `StaysPage` 4 mutation (expire/reject booking, approve/reject checkout) dapat `onError` toast; AU-03 confirm di "Jalankan Kedaluwarsa" (`StaysPage`) + "Hapus key" DeepSeek (`OwnerSettingsPage`). `tsc` FE ✅
> 0. **GATE-KTP-ENV 🔴 — Jebakan gate KTP produksi** — ✅ **SELESAI (8 Jul, Fable5)** — pembaca gate memakai nilai DB begitu row `OperationalSetting` ada (kolom non-nullable → `?? env` mati), row terbentuk otomatis default `false` → env `KTP_ACTIVATION_GATE_ENABLED=true` yang diwajibkan runbook diabaikan, gate diam-diam OFF. Fix: `settings.service.ts` semai nilai awal row dari env + catatan verifikasi di docs deploy. `tsc` BE ✅
> 0. **RUNBOOK onboarding 13 tenant nyata** — 📘 `docs/RUNBOOK_ONBOARDING_TENANT_NYATA.md` — urutan tenant→KTP→verify→stay, `checkInDate` = siklus terakhir bulan berjalan, jebakan due-date invoice 24 jam (lunasi sebelum buka portal), prasyarat: NIK Dini/Theo, kamar Annisa, catat meter 13 kamar.
> 0. **SEED-RESET-SCHEMA 🐛** — `backend/scripts/seed-dev-reset.js` TIDAK menerapkan migration terbaru (kolom `Tenant.ktpVerificationMethod` G5+ hilang → login 500) — sementara WAJIB `npx prisma db push --accept-data-loss` manual setelah reset; fix permanen: tambah langkah db push di akhir skrip reset.
> 0. **AUDIT-ASET (kuis owner 8 Jul)** — 🧑 LAPANGAN lalu input — keliling audit pakai `docs/filePrint/07_FORM_AUDIT_INTERAKTIF_SUPER_DETAIL.html` (atau cetak `06`), kumpulkan CSV → input `FixedAsset` via SALDO AWAL (kapitalisasi: tahan lama ≥ Rp100rb; tanah NJOP + bangunan nilai kondisi kini; cut-off 31 Jul 2026) → jalankan depresiasi → TB wajib seimbang. Kebijakan: M02 "Kuis Audit Aset & Nilai" + M04 Update 2026-07-08 + RUNBOOK §9A.
> 0. **M31** — ✅ **SELESAI** — AiDraft queue diverifikasi — DeepSeek test-connection PASS via .env API key. Fase 4 = 35/35 100%.
> 0. **OC-07 (L22)** — ✅ **SELESAI** — Staff dashboard halaman khusus — backend endpoint aggregate `GET /staff/dashboard/aggregate` + perkuat DashboardStaff.tsx (3 query digabung jadi 1). Build backend ✅ frontend ✅
> 0. **OC-05 (M29)** — ✅ **SELESAI** — ExternalReview CRUD audit — model Prisma standalone, read-only via social proof publik, tanpa CRUD/admin UI. Laporan: `docs/archieve/audit_reasonix/M29_AUDIT_EXTERNAL_REVIEW.md`
> 0. **OC-04 (M28)** — ✅ **SELESAI** — GuestPreferenceSurvey admin page (controller backend + FE page). Build backend ✅ frontend ✅
> 0. **X-02d** — ✅ **SELESAI** — owner konfirmasi: OCCUPIED **TAMPIL** di katalog publik (kode sudah include OCCUPIED di `buildPublicRoomWhere`)
> 2. **X-16 lanjutan** — ✅ **SELESAI** — `e2e/a11y/axe-auth.spec.ts` (12 test: OWNER 3 + ADMIN 3 + STAFF 2 + TENANT 3 + publik 2 = 14 total axe test)
> 3. **Z-01..Z-19** — Audit cross-portal: 19 task dari inspeksi browser real-time (2 Juli 2026) mencakup 4 portal + halaman publik. Lihat [Fase Z](#fase-z--audit-uiux-cross-portal-2026-07-02).
> 4. **A1–A6** 🧑 — pra-go-live produksi (server, domain, env, seed OWNER, smoke test) — MANUSIA.
> 5. **AA-01..AA-05** — ✅ **SELESAI** — Fase AA (CHECKLIST_01): 5 task tuntas; detail di [Fase AA](#fase-aa--perbaikan-temuan-audit-publik-checklist_01).
> 6. **AB-01..AB-05** — ✅ **SELESAI** — Fase AB (CHECKLIST_02): 5 task tuntas (AB-01 label Dipesan + AB-02 link error-state sudah dari sebelumnya). Detail di [Fase AB](#fase-ab--perbaikan-temuan-audit-katalog-checkout_02).
> 7. **AC-01..AC-04** — ✅ **SELESAI** — Fase AC (CHECKLIST_03): 4 task tuntas (AC-04 N/A tercakup AB-05). Detail di [Fase AC](#fase-ac--perbaikan-temuan-audit-booking-checklist_03).
> 8. **AD-01..AD-04** — ✅ **SELESAI** — Fase AD (CHECKLIST_04): 4 task tuntas. Detail di [Fase AD](#fase-ad--perbaikan-temuan-audit-auth-checklist_04).
> 9. **AE-01 🔴 HIGH** — ✅ **SELESAI** — Fase AE (CHECKLIST_05): AE-01 infinite refetch loop fixed (sudah dari sebelumnya); AE-02 ✅ dikonfirmasi live 3 Jul (bayu occupied). Detail di [Fase AE](#fase-ae--perbaikan-temuan-audit-mystay-checklist_05).
> 10. **AF-01..AF-03** — ✅ **SELESAI** — Fase AF (CHECKLIST_06): 3 task (AF-01 countdown invoice lunas, AF-02 banner onboarding mantan penghuni, AF-03 catatan INFO). Detail di [Fase AF](#fase-af--perbaikan-temuan-audit-invoice-checklist_06).
> 11. **AG-01** — ✅ **SELESAI** — Fase AG (CHECKLIST_07): C07-01 sama dengan C06-02, tercakup AF-02. Detail di [Fase AG](#fase-ag--perbaikan-temuan-audit-tiket-checklist_07).
> 12. **AH-01..AH-04** — ✅ **SELESAI** — Fase AH (CHECKLIST_08): hardening 503 announcements + verifikasi STALE Hermes I12/I13. Detail di [Fase AH](#fase-ah--perbaikan-temuan-audit-info-checklist_08).
> 13. **AI-01..AI-02** — ✅ **SELESAI** — Fase AI (CHECKLIST_09): hardening 503 isBookingSchemaReady + FE tak blokir portal; loyalty/renewal/checkout diverifikasi via kode. Detail di [Fase AI](#fase-ai--perbaikan-temuan-audit-loyalty-renewal-checkout-checklist_09).
> 14. **AJ-01..AJ-07** — ✅ **SELESAI** — Fase AJ: anti-loop live lulus, re-seed dev 5433 lulus + TB balanced, label okupansi jelas, dokumen sinkron, dan AJ-07 safe follow-up dicatat (C19-01/C19-02). Detail di [Fase AJ](#fase-aj--sisa-temuan-audit-2026-07-antri).
> 15. **AN-01..AN-06** — 🔴 **ANTRIAN** — Fase AN: hardening keuangan pasca audit deep (29 Jul 2026). 6 task dari temuan P1-01/P1-02/N4/F-30/P1-04 + unit test. Detail di [Fase AN](#fase-an--hardening-keuangan-pasca-audit-deep). **🆕 AN-03 diperluas:** 9 titik best-effort journal dari M16-Deep (HS-01..HS-09) harus ikut diseragamkan. Lihat `docs/M05_SIKLUS_HUNI.md` §Deep Audit.
> 16. **M16-Deep** — ✅ **SELESAI (29 Jul)** — Deep audit siklus huni: 9 best-effort journal (vs 3 M16), S-01 severity upgrade, cross-ref Fase AN. Temuan terintegrasi ke `docs/M05_SIKLUS_HUNI.md`.
> 17. **M17-Deep** — ✅ **SELESAI (29 Jul)** — Deep audit operasional & staf: 5 temuan (OS-01..OS-05) — 1 best-effort journal wifi, 2 silent swallow, 2 race condition tickets. Temuan terintegrasi ke `docs/M06_OPERASIONAL.md`.
> 18. **M18-Deep** — ✅ **SELESAI (29 Jul)** — Deep audit publik & marketing: 2 temuan (PM-01, PM-04) — domain paling bersih (0 best-effort journal, 0 race condition). Temuan terintegrasi ke `docs/M07_PUBLIK_GROWTH.md`.
> 19. **M19-Deep** — ✅ **SELESAI (29 Jul)** — Deep audit inventaris: verifikasi audit existing (85% benar). 1 severity upgrade MEDIUM→HIGH (IV-01). 3 positive pattern kuat. Temuan terintegrasi ke `docs/M06_OPERASIONAL.md`.
> 20. **M20-Deep** — ✅ **SELESAI (29 Jul)** — Deep audit notifikasi & sistem: 0 isu. Domain paling bersih (0 best-effort journal, 0 race). Temuan terintegrasi ke `docs/M06_OPERASIONAL.md`.
> 21. **M21-Deep** — ✅ **SELESAI (29 Jul)** — Deep audit AI & growth: 0 isu baru. FOR UPDATE di loyalty, OWNER-only segregation, AI cache prune/cap. Domain terbersih. Temuan terintegrasi ke `docs/M07_PUBLIK_GROWTH.md`.
> 22. **M22-Deep** — ✅ **SELESAI (29 Jul)** — Deep audit IoT & telemetri: 0 isu. timingSafeEqual HMAC + cron token, polling mutex, RateLimitGuard. Temuan terintegrasi ke `docs/M06_OPERASIONAL.md`.
> 23. **MX** — ✅ **SELESAI (29 Jul)** — Audit lintas scope: 1 CRITICAL (journal consistency), 2 HIGH (timezone, DRY), 10 rekomendasi X1-X10. Temuan terintegrasi ke `docs/M01_MASTER.md`.
> 24. **MX-Verify** — ✅ **SELESAI (29 Jul)** — Verifikasi Codex Sol: 12/18 benar, 6 koreksi diterapkan ke M01/M05/M06. Memory `codex-sol-verify-koreksi` tersimpan.
> 25. **AO-00..AO-23** — 🔴 **ANTRIAN AKTIF** — audit UI/UX lintas portal, benchmark homepage produksi, dan review statis dashboard Owner/Admin 30 Jul 2026. Mulai dari sinkronisasi migration UAT, lalu perbaikan P1, crawl role, benchmark publik, dan audit ulang. Detail otoritatif: [M14 Audit UI/UX](M14_AUDIT_UI_UX.md).
>
> **🆕 TODO untuk /new berikutnya — Perbaikan Prioritas Pasca Audit (urutan):**
> 1. **X1 🔴** — ✅ SELESAI (29 Jul) — Seragamkan SEMUA journal posting → BLOCKING (20+ call site). = AN-03.
> 2. **X2 🟠** — ✅ SELESAI (29 Jul) — Extract `assertOwnerOrAdmin` ke shared guard (4→1).
> 3. **X3 🟠** — ✅ SELESAI (29 Jul) — Buat `AppConfigService` — validasi env startup + cache.
> 4. **X4 🟠** — ✅ SELESAI (30 Jul) — Timezone eksplisit WIB + equality diperbaiki pada rate-limit, remaining quota, dan usage stats.
> 5. **AN-01 🔴** — ✅ SELESAI (29 Jul) — Deposit ledger blocking.
> 6. **AN-02 🟠** — ✅ SELESAI (29 Jul) — Journal posting blocking.
> 7. **S-01 🔴** — ✅ SELESAI (30 Jul) — Lock Stay + seluruh cross-check + create renew/checkout berada dalam transaksi masing-masing yang memakai lock sama.
> 8. **OS-01 🔴** — ✅ SELESAI (29 Jul) — Journal WiFi sale blocking.
> 9. **OS-04/OS-05 🟡** — ✅ SELESAI (30 Jul) — Ticket assign/start dalam tx; ticket dan staff routine mengambil lock User yang sama sebelum guard single-active-work.
>
> **Verifikasi test 2026-07-02 (HISTORIS — JANGAN dikutip lagi):** angka 1072 unit + 187 integration berasal dari suite yang **DIHAPUS di commit `e505894`** (bersih-bersih repo; recoverable dari git history). **Kondisi nyata 10 Jul 2026:** BE unit **26/26 PASS** · FE vitest **121/121 PASS** · verifikasi utama kini = `tsc` BE/FE + **boot-test paket deploy** (install prod-only + start + smoke endpoint + query DB — lihat M13 10 Jul).

---

### Fase AN — Hardening Keuangan Pasca Audit Deep

**Sumber:** Audit deep Reasonix 29 Juli 2026 — `docs/M04_KEUANGAN.md` §H.  
**Gate:** `tsc` BE ✅ FE ✅ · `npm run test:unit` 48/48 ✅ · semua task WAJIB jalankan `npm run build && npm run test:unit` setelah selesai.

- [x] **AN-01 🔴 P1-02 — Deposit ledger blocking** — `payment-submissions.service.ts:898-915`: ubah `try/catch` + `logger.warn` menjadi BLOCKING (throw, rollback tx). Deposit diterima wajib tercatat di ledger. **PALING URGENT — tidak ada recovery path.**
- [x] **AN-02 🟠 P1-01 — Journal posting blocking** — `payment-submissions.service.ts:817-836`: ubah `try/catch` + `journalPending=true` menjadi BLOCKING seperti module expenses (throw, rollback tx). Recovery path (`retry-journal`) tetap dipertahankan sebagai fallback manual.
- [x] **AN-03 🟠 N4 — Seragamkan journal handling** — Audit semua 9 call site: semua `.catch()` dihapus, kini BLOCKING. File: tenant-bookings, stays-renewal (2), stays.service (3), room-transfer, wifi-sales, payment-submissions (2). Tidak ada lagi best-effort journal.
- [x] **AN-04 🟡 F-30 — Fix dedupe deposit ledger** — `deposit-ledger.service.ts:185`: sertakan `invoicePaymentId` di `sourceId` (format `PS_xxx_IP_yyy`). Idempotent guard tetap bekerja.
- [x] **AN-05 🟡 N1 — Buat 4 unit test keuangan** — 4 file: pricing (4 test), periode (2 test), cashflow-classifier (5 test), financial-ratios (8 test). 19 test baru PASS.
- [x] **AN-06 🟢 P1-04 — Auto-reject sweeper EXPIRED** — `booking-sweep.service.ts:415`: PENDING_REVIEW → REJECTED (bukan EXPIRED).

---

### Fase AO — Audit & Hardening UI/UX Lintas Portal

**Sumber:** audit browser + kode 30 Juli 2026 — `docs/M14_AUDIT_UI_UX.md`.
**Aturan:** detail bukti, scope file, dependensi, dan DoD mengikuti M14; checklist ini hanya ringkasan antrean.

- [x] **AO-AUDIT** — audit 66 kombinasi route–viewport dan 74 deklarasi route; bukti aman disimpan di `docs/assets/m14-uiux-audit/`.
- [x] **AO-00 🔴 P0** — terapkan dua migration UAT pending melalui ledger resmi, backup, dan smoke test. **Owner/DevOps; perubahan DB memerlukan persetujuan.**
- [x] **AO-01 🟠 P1** — satukan state katalog publik saat API daftar kamar gagal; jangan tampilkan “0 kamar” bersamaan dengan kalender berisi kamar.
- [x] **AO-02 🟠 P1** — perbaiki urutan hooks halaman loyalitas agar feature redirect tidak memicu ErrorBoundary.
- [ ] **AO-03 🟠 P1** — sediakan fixture/kredensial UAT non-personal untuk OWNER, ADMIN, STAFF, dan dua state TENANT tanpa menulis secret ke repo.
- [x] **AO-04 🟠 P1** — kurangi duplikasi navigasi tenant mobile dan dominance onboarding global.
- [x] **AO-05 🟠 P1** — selaraskan istilah masa sewa aktif, lewat jatuh tempo, renewal, dan checkout.
- [x] **AO-06 🟠 P1** — asosiasikan label form auth/profile secara programatis.
- [x] **AO-07 🟡 P2** — hilangkan overflow horizontal `/profile` dan pecah halaman profil yang terlalu panjang.
- [x] **AO-08 🟡 P2** — perbaiki semua pelanggaran kontras serius yang terverifikasi.
- [x] **AO-09 🟡 P2** — lengkapi landmark `<main>` dan heading utama yang hilang.
- [x] **AO-10 🟡 P2** — ringkas manual tenant mobile dengan progressive disclosure.
- [x] **AO-11 🟡 P2** — perjelas scroll/filter horizontal dan target sentuh mobile.
- [x] **AO-12 🟡 P2** — buat kontrak koneksi API saat `npm run dev` eksplisit dan reproducible.
- [ ] **AO-13** — crawl regresi OWNER/ADMIN/STAFF setelah AO-00 dan AO-03.
- [x] **AO-15 🟢 P3** — kelompokkan link footer publik dan pertahankan empat pola publik `Best-in-Class` dari benchmark Baymard.
- [x] **AO-16 🟡 P2** — bedakan empty result karena filter/data/error dan pertahankan shortlist perbandingan selama sesi detail/back.
- [ ] **AO-17 🟠 P1** — adaptasikan hero/teaser homepage untuk state 0 kamar tanpa sinyal hijau, CTA palsu, atau grid kosong; tangkap minat via WhatsApp.
- [ ] **AO-18 🟡 P2** — rapikan hierarchy homepage, trust grid/copy, review empty-state, FAQ, lokasi, dan CTA tanpa klaim palsu.
- [ ] **AO-19 🟡 P2** — inventarisasi kualitas aset publik dan buat cue galeri selalu terlihat pada touch/keyboard; foto pengganti menunggu aset asli owner bila perlu.
- [ ] **AO-20 🟠 P1** — buat exception dashboard Owner actionable, pisahkan toolbar lokal, bedakan state KPI, dan beri CTA konfigurasi AI yang sah.
- [ ] **AO-21 🟡 P2** — normalisasi sistem visual/terminologi Owner setelah AO-20 review; perubahan AppLayout harus dikoordinasikan.
- [ ] **AO-22 🟠 P1** — susun dashboard Area Admin agar exception dan antrean lima aksi tampil sebelum metrik; perkuat CTA tanpa membuat queue kedua.
- [ ] **AO-23 🟡 P2** — konsolidasikan komponen/shell Area Admin dengan regresi Owner bila AppLayout atau shared CSS berubah.
- [ ] **AO-14** — audit ulang desktop/mobile + Axe + gate Baymard relevan, build/test, screenshot bebas PII, dan sign-off Fase AO.

**Gate akhir:** tidak ada 500/blank page, tidak ada overflow global pada 375 px, Axe serious/critical = 0 pada route prioritas, dan matriks role dinamis lengkap.

---

### Fase A — Pra-Go-Live Produksi

**Tujuan:** aplikasi siap publish bersih, tanpa data UAT/testing.  
**Rujukan:** `docs/M08_DEPLOY_GO_LIVE.md` · `backend/.env.production.example`.

- [ ] **A1 / F1-12** 🧑 Owner konfirmasi VPS/cPanel, domain, HTTPS, PostgreSQL prod 5432, env rahasia siap.
- [ ] **A2** Fresh provision: buat DB produksi BARU/kosong (jangan drop UAT) → verifikasi dan putuskan patch schema secara terpisah dari bundle → bootstrap guard teruji → OWNER pertama → seed COA/periode/cash account. Server bundle tidak menjalankan npm/Prisma; `db push` dan seed historis dilarang untuk produksi.
- [ ] **A3** Set env produksi wajib: `NODE_ENV=production`, JWT secret kuat, CORS domain final, VAPID keys, `KTP_ACTIVATION_GATE_ENABLED=true`.
- [ ] **A4** Ganti password OWNER dummy/dev ke password real sebelum dipakai owner.
- [ ] **A5** Isi opening balance bila ada modal/saldo awal; kalau mulai nol, dokumentasikan zero-start.
- [ ] **A6** Smoke test prod: login OWNER, public rooms 200, trial balance balanced, recon mismatch 0, readiness tanpa blocker merah.
- [x] **A7** `backend/package.json` sudah punya `pretest:unit = npm run build` — test unit pakai `dist` segar.
- [x] **A8** Hardening hasil audit DEEP-01..05 selesai; HSTS dan `Permissions-Policy: camera=(self)` sudah masuk changelog.

**Gate:** `docs/DEPLOYMENT_ONLINE_20260723.md` smoke PASS. **Jangan** backfill data UAT ke produksi; setelah go-live semua release database patch-only.

---

### Fase B — Publik & Portal Tenant ✅ SELESAI

**Key files:** `PublicGuestDashboardPage`, `GuestBookingForm`, `MyStayPage`, `marketing-public-rooms.service.ts`, `additional-services`, `marketing-assets`.  
**Cakupan selesai:** public UI, smart booking (filter range), kalender ketersediaan, foto kamar/fasilitas owner-managed, aset brosur slot-based, WiFi portal tenant, meter jadwal + catat mandiri, profil + foto KTP sebagai avatar.

---

### Fase C — Workspace Owner/Admin ✅ SELESAI

**Key files:** `AppLayout.tsx`, `navigation.ts`, `RoleWorkspaceTabs.tsx`, `OwnerDashboardPage`, `DashboardAdmin`, `02-layout.css`, `12-owner.css`.  
**Cakupan selesai:** toggle Owner↔Admin segmented control, sidebar context-aware, breadcrumb root per mode, route `/owner-dashboard`+`/admin-dashboard` split, status kokpit 4 kartu (ocupansi/tunggakan/meter/readiness), inventaris shell 3 tab.

---

### Fase D — Operasional Staff & Gudang ✅ SELESAI

**Key files:** `DashboardStaff.tsx`, `StaffMotivationDashboard.tsx`, `inventory-items`, `WifiOrderPage`, `tickets`.  
**Cakupan selesai:** role scope ketat staf (no tarif/KTP leak), gudang FK `inventoryItemId`, StaffMeterStatusPanel, WiFi order flow (ServiceInterest→WifiSale), tip flow P2P, staff theme mobile.

---

### Fase E — Polish & Teknis ✅ SELESAI

**Key files:** `auto-ops/sweeps/` (5 sub-service), `stays-renewal.service.ts`, `test/integration/`, `frontend/e2e/`, `docs/FASE_E_EVALUASI_ARSITEKTUR.md`.  
**Cakupan selesai:** split auto-ops.service.ts (1819→235 baris + 5 sweep service), split stays renewal, integration test TC1-TC4, E2E Playwright (public/booking/portal), leaderboard kebersihan anonim, eval arsitektur (refresh token MEDIUM, CSP LOW, WA LOW, event-bus VERY LOW).

---

### Fase F — UI/UX Sweep ✅ SELESAI

**Key files:** `NotFoundPage.tsx`, `ToastProvider.tsx`, `PasswordInput.tsx`, `AppLayout.tsx`, `01-base.css`.  
**Cakupan selesai (10 task):** UX-404, UX-TOAST, UX-A11Y (SVG password + skip-link), UX-COLOR (kontras AA `#475569`), UX-LOGOUT (confirm), UX-SEARCH-TENANT, UX-SKELETON, UX-OVERSCROLL, UX-LOGIN-FORMAT.

---

### Fase G — AI Owner/Admin Approval Copilot ✅ SELESAI

**Key files:** `backend/src/modules/owner-ai/` (15 file), `backend/src/modules/market-analysis/deepseek.client.ts`, `frontend/src/components/ai/`.  
**Cakupan selesai (G0-G9):** G0 safety foundation, G1 owner brief, G2 finance analyst, G3 payment review, G4 expense OCR, G5 KTP OCR validator, G6 ops/inventory AI, G7 settings & budget, G8 FAQ/manual generator, G9 AiDraft queue (schema S-6). Kontrak global: manual-button only, OWNER/ADMIN only, draft saja.

---

### Fase H — UI/UX Compact Owner↔Admin ✅ SELESAI

**Key files:** `navigation.ts`, `DashboardAdmin.tsx`, `RoleWorkspaceTabs.tsx`, `OwnerDashboardPage.tsx`, `12-owner.css`, `08-admin.css`.  
**Rujukan:** `docs/archieve/2026-06-20_fase_selesai/M13_FASE_H_UIUX_COMPACT.md`.  
**Cakupan selesai:** H1 sidebar owner 18→7, H2 dashboard admin 6→3 tab, H3 merge Minat→Layanan, H4 AiAssistButton, H5 tren chart toggle, H6 hapus CSS dead.

---

### Fase I — Navigasi & Onboarding ✅ SELESAI

**Key files:** `DashboardAdmin.tsx`, `StaffTopWorkspaceNav.tsx`, `navigation.ts`, `AppLayout.tsx`, `GettingStartedGuide.tsx`.  
**Rujukan:** `docs/archieve/2026-06-20_fase_selesai/M14_FASE_I_NAVIGASI_ONBOARDING.md`.  
**Cakupan selesai:** I1 hapus AdminAreaInternalMenu, I2 unifikasi StaffTopWorkspaceNav, I3 ekspos `/meter-readings`, I4 GettingStartedGuide tenant, I5 breadcrumb klik, I6 guide strip adaptif.

---

### Fase J — Hardening AI Pra-Go-Live ✅ SELESAI

**Key files:** `owner-ai.helpers.ts`, `backend/test/unit/owner-ai-safety.test.js`, `AiAssistButton.tsx`, `AiResultPanel.tsx`, `docs/archieve/M09_AUDIT.md`.  
**Rujukan:** `docs/archieve/2026-06-20_fase_selesai/M15_FASE_J_HARDENING_AI.md`.  
**Cakupan selesai:** J0 ekstrak guard → `owner-ai.helpers.ts`, J1 unit test ≥18 assert PDP+uang, J2 guard no-partial AI, J3 FE error non-blocking, J4 audit 12 endpoint owner-ai dibukukan di M09.

---

### Fase K — Pasca-Audit Total ✅ SELESAI

**Key files:** berbagai — lihat `docs/archieve/2026-06-20_fase_selesai/M16_PASCA_AUDIT_PLAN.md`.  
**Cakupan selesai (13 task, commit `ac4cc2f`):** P1-P3 keamanan (RolesGuard, DTO multipart, hapus STAFF dari 11 endpoint), P5-P6 circuit breaker DeepSeek + advisory lock, Q1-Q5 data integrity (resolveRent unifikasi, merge helpers, @unique NIK, @index, deposit handling), R1-R5 CSS tokens, unifikasi arus kas, DeepSeek UI Settings, error handling + dead code.

---

### Fase L — UI/UX Audit Menyeluruh ✅ SELESAI

**Rujukan utama:** `docs/archieve/M17_FASE_L_UIUX_AUDIT.md` · `docs/archieve/fase-l-specs/`  
**Cakupan selesai:** L-01..L-20 semua selesai — loading state, error graceful, mobile responsif, wizard balance, guest auth, public rooms, tenant reports, enum labels, staff/stays/tenant pages, accounting checklist, a11y, empty state, asset pages.

---

### Fase M — Quick Wins A11y & Polish ✅ SELESAI

**Key files:** `AppLayout.tsx`, `ConfirmProvider.tsx`, `ToastProvider.tsx`, `ClickableRow.tsx`, `01-base.css`.  
**Cakupan selesai (6 task):** M-01 `useNavigate` ganti `window.location.assign`, M-02 `ConfirmProvider`+`useConfirm` (9 `window.confirm` diganti), M-03 global `prefers-reduced-motion`, M-04 perbaiki font Cormorant Garamond, M-05 `ClickableRow` aksesibel (6 file), M-06 toast aksesibel (ARIA per-varian, pause hover).

---

### Fase N — Ramping Dashboard & Navigasi ✅ SELESAI

**Key files:** `OwnerDashboardPage.tsx`, `DashboardAdmin.tsx`, `AdminHealthBar.tsx`, `navigation.ts`, `admin-dashboard.service.ts`.  
**Cakupan selesai (6 task):** N-01 Owner dashboard hapus sinyal ganda, N-02 Admin dashboard hero = ActionQueueTable, N-03 toggle density Admin, N-04 hapus duplikasi nav, N-05 pindah agregasi dashboard ke backend (2 endpoint baru), N-06 axe e2e `@axe-core/playwright`.

---

### Fase O — Design System & Konsistensi Visual ✅ SELESAI

**Key files:** `00-tokens.css`, `chartPalette.ts`, `10-misc.css`, `frontend/package.json`.  
**Cakupan selesai (8 task):** O-01 palet 50–900 + alias semantik, O-02 `chartColors` dari token, O-03 spacing + radius scale, O-04 CSS Modules pilot, O-05 pisah `10-misc.css` (→ 13-reports.css + 14-settings.css), O-06 `lucide-react`, O-07 `date-fns`, O-08 touch target ≥44px.

---

### Fase P — Pola UI Modern ✅ SELESAI

**Key files:** `DashboardAdmin.tsx`, `ActionKanbanBoard.tsx`, `ActionCalendar.tsx`, `TanStackTable.tsx`, `MobileBottomNav.tsx`, `CommandPalette.tsx`.  
**Cakupan selesai (6 task):** P-01 3-tampilan toggle (list/board/calendar), P-02 FullCalendar operasional, P-03 @dnd-kit kanban drag-drop aksesibel, P-04 TanStack Table pilot (InvoicesPage), P-05 bottom tab bar Tenant mobile, P-06 command palette ⌘K cmdk.

---

### Fase Q — Performa & Stabilitas ✅ SELESAI

**Key files:** `DashboardAdmin.tsx`, `stayPredicates.ts`, `InvoicesPage.tsx`, `StaysPage.tsx`, `PushToggle.tsx`, resource config.  
**Cakupan selesai (7 task):** Q-01 rebuild dist `dist/modules/admin/`, Q-02 retry:1 retryDelay:1000, Q-03 `listAllActiveStaysForBookings` single-call, Q-04 staysQuery `enabled: showCreate`, Q-05 `staleTime` checkout queries, Q-06 empty state informatif inventory, Q-07 PushToggle graceful fallback.

---

### Fase R — UI/UX Public + Admin/Owner + Tenant + Staff + Owner-Only ✅ SELESAI

**Cakupan selesai (30 task, build lulus 2026-06-22):**
- **R-01..R-07** Public: hero+tagline, sembunyikan ulasan kosong, sticky CTA detail kamar, hapus overlay foto+nominal DP eksplisit, grid 1-kolom mobile ≤480px, visual differentiation available/occupied, anchor nav mobile.
- **R-08..R-12** Admin/Owner: fix teks "sst", highlight overdue invoice, tooltip "Bermasalah"+sinkron pengeluaran, konfirmasi simpan COA, R-12 investigasi skeleton (backend stabil → selesai).
- **R-13..R-18** Tenant: fix routing checkout/renewal 404, mask NIK, mobile nav label, accordion "Info kamar" default open, empty state informatif, chart responsive.
- **R-19..R-24** Staff: tabel meter scroll horizontal, guard toast redirect, pindah meter ke tab Kamar&Stok, gudang empty state CTA, prompt foto tugas, "Menunggu info" tooltip.
- **R-25..R-30** Owner-Only: fix "10tamu" role display, notif date-grouping+filter, meter default "bulan ini", seragamkan bahasa+tombol "Poster", guard toast cross-role, chip "Hanya Owner".

---

### Fase T — Wizard Redesign + Animasi Marketing ✅ SELESAI

**Key files:** `GuestPreferenceWizard.tsx`, `RoomCard.tsx`, `11-public-pages.css`.  
**Cakupan selesai:** T-01 redesign wizard result screen — extract RoomCard ke komponen bersama, grid RoomCard (bukan chip), animasi fadeInUp/stagger/count-up/pulse, marketing copy personal, urgency line, social proof, dark-theme variant, skeleton shimmer.

---

### Fase U — Konsistensi Fasilitas↔Inventaris + Monitoring AC ✅ SELESAI

**Key files:** `room-facility-spec.ts`, `FacilityManager.tsx`, `marketing-public-rooms.service.ts`, `AcMaintenancePage.tsx`, seed.  
**Cakupan selesai (8 task):** U-01 spec kanonik fasilitas, U-02 gap report (AC disorot), U-03 panel admin + wiring `inventoryItemId`, U-04 sembunyikan kamar gap dari katalog publik, U-05 enrich tenant (KM/ukuran/AC), U-06 area `/ac-maintenance`, U-07 backfill `seed:facilities`, U-08 build lulus.

---

### Fase V — Booking Flow Baru + Audit 2026-06-30 ✅ SELESAI

**Key files:** `payment-submissions.service.ts`, `stays.service.ts`, `marketing-public-rooms.service.ts`, `publicRoomDisplay.ts`, `tenant-bookings.service.ts`, `auto-ops/sweeps/*`.

**Keputusan domain final room status:** `AVAILABLE → RESERVED → OCCUPIED` (tidak ada `BOOKING`).
- V-00: Hapus `RoomStatus.BOOKING` dari schema, enum, dan runtime. 0 data BOOKING.
- V-01: Booking dibuat tidak mengunci room; `isBookingPath` pakai `initialMetersPromotedAt==null`.
- V-02: DP/lunas approved → room `RESERVED`; batalkan pesaing unpaid.
- V-03: Check-in wajib invoice `PAID`; `initialMetersPromotedAt` diset saat check-in (bukan saat approval).
- V-04: AutoOps tidak bergantung `BOOKING`; dashboard label `reserved-DP` vs `reserved-Lunas`.
- V-05: Public booking phone wajib valid; email placeholder `@phone.local.kost48`.
- V-06: Payment proof ownership — fileKey prefix `tenantId_`; approveSubmission tolak tanpa proof (non-CASH).
- V-07: Magic-byte detection semua upload; cron token header-only; meter guard readingAt.
- V-08: Sinkronisasi M03/M04/M05 dengan override flow baru.
- V-09..V-14: Frontend publik/tenant/admin/staff/owner sinkron flow baru; media safety.
- V-15: UAT manual checklist (eksekusi manusia di DB UAT).
- V-16: Build ✅ lulus; **156/156 unit test PASS**.

---

### Fase W — Audit Maksimal Status Proyek ✅ SELESAI

**Key files:** `main.ts`, `rate-limit.guard.ts`, `auth.service.ts`, `jwt.strategy.ts`, `lifecycle-guards.helper.ts`, `auto-ops.controller.ts`, `accounting.controller.ts`, `tickets.service.ts`, `staff-routines.service.ts`.

- W-00: 6 keputusan settled (STAFF analytics, wifi-sales, ADMIN AutoOps finance, BOOKING dihapus, JWT localStorage, upload registry tanpa schema).
- W-01: Security headers static, extension filter, CSP, JWT secret guard, rate limit fail-closed. Build ✅.
- W-02: PDP audit (NIK masked 3 lokasi, KTP endpoint terproteksi, session storage cleanup), unit test reset password (5 assert, 5/5 PASS).
- W-03: Matrix 30+ endpoint — 1 gap kritis (wifi-sales STAFF dihapus). Frontend route guard match backend. Regression PASS.
- W-04: Lifecycle cross-block (renew↔checkout) dengan helper `ACTIVE_RENEW_STATUSES`. Bug TC-CO05 regex diperbaiki. 18/18 PASS.
- W-05: Token hanya header; idempotency `this.running` flag + advisory lock; depreciation+recurring OWNER-only. Build ✅.
- W-06: Magic-byte 6 endpoint; random filename; ownership proof; public static nosniff. Build ✅.
- W-07: COA/cash account OWNER-only; period close/backfill OWNER-only; no-partial guard aktif. Build ✅.
- W-08: STAFF hanya start/done tiket assigned; routine roomId guard; inventory movement OWNER/ADMIN only. Build ✅.
- W-09: XSS scan bersih; external link noopener; RESERVED label "Dipesan"; objectURL cleanup. Build ✅.
- W-10: Public config tanpa secret; RESERVED/OCCUPIED canBook=false; availability calendar akurat. Build ✅.
- W-11: Release checklist + logs audit + health endpoints. Build ✅.
- W-12: M00_CODEMAP sinkron; M03/M04/M05 override; tidak ada MD liar di root. Build ✅.
- W-13: Coverage per role (PUBLIC/TENANT/STAFF/ADMIN/OWNER) terverifikasi via unit+integration+Playwright.

---

### Enhancement — Survei Kepuasan Penghuni ✅ SELESAI (2026-06-24)

**Cakupan:** timing gate 30 hari, re-submit 6 bulan, halaman owner `/admin/surveys`, ringkasan di dashboard admin.
- [x] SV-01 Backend gate 30 hari + re-submit 6 bulan (`surveys.service.ts`)
- [x] SV-02 Frontend `SatisfactionSurveyCard` 4 state
- [x] SV-03 `AdminSurveysPage` + ringkasan agregat
- [x] SV-04 Nav "Survei Penghuni" + ringkasan dashboard admin
- [x] SV-05 Build lulus

---

### Fase X — Audit UI/UX Visual ✅ MAYORITAS SELESAI

**Sumber temuan:** `docs/_SPEC_FASE_X_UIUX.md` · screenshot `frontend/screenshots-ui/visual/`.

**Selesai (X-01..X-15):**
- X-01: Tiket internal (EVICT_OVERSTAY dll.) tersembunyi dari portal tenant via `TENANT_HIDDEN_TICKET_CATEGORIES`. ✅
- X-02a/b/c: Katalog publik empty-state ramah; error detail/booking graceful; banner admin "X kamar tersembunyi". ✅
- X-03: Kontras judul wizard wizard — `.gpw-question-text { color: #fff }`. ✅
- X-04: Blok navy kosong landing — `.gx-trust-section` terisi (verifikasi Playwright). ✅
- X-05: Toast "tidak memiliki akses" (×2) — RequireRoles guard diperbaiki; owner→owner-dashboard. ✅
- X-06: `/portal/loyalty` & `/portal/bookings` me-render stay — INTENDED (stage-aware redirect). ✅
- X-07: Chip "Pengumu…" terpotong — `overflow-x:auto` pada container chip. ✅
- X-08: Nav publik tidak konsisten — sumber bersama `NAV_LINKS` + `PUBLIC_EXTRA_LINKS`. ✅
- X-09: Invoice kartu "0" saat loading — skeleton `StatCardSkeleton`. ✅
- X-10: Inspeksi visual menyeluruh + re-capture backend stabil. ✅
- X-11: Badge chip filter = ukuran halaman → diperbaiki ke count total backend. ✅
- X-13: Owner settings tab FAQ spinner → skeleton. ✅
- X-14: `AccountingSetupPage` dipecah 5 tab (Setup/Ledger/Aset/Periode/Saldo Awal); URL-sync `?tab=`; cross-tab navigation via `SECTION_TAB` map. ✅
- X-15: Sel tabel pecah mid-token (currency/ID/email) — `white-space: nowrap` + `min-width`. ✅

**Sisa (menunggu):**
- [x] **X-02d** — ✅ Owner konfirmasi: OCCUPIED TAMPIL di katalog (kode `buildPublicRoomWhere` sudah memasukkan OCCUPIED)
- [x] **X-16 lanjutan** — ✅ `e2e/a11y/axe-auth.spec.ts` dibuat (12 test: OWNER/ADMIN/STAFF/TENANT). Token injection via API login, ≤5 critical/serious per halaman.

---

### Fase Y — Test Coverage Maksimal ✅ HAMPIR TUNTAS

**Verifikasi 2026-07-02:** Backend unit **1072/1073 PASS** (1 skip intentional `ST-can-03`) · integration **187/187 PASS** (+36 dari Y-R/Y-S) · frontend vitest **111/111 PASS** · total ≈ **1370 test PASS, 0 fail**.

| Sub-fase | Judul | Total | ✅ | Status |
|----------|-------|-------|-----|--------|
| Y-A | Backend — Pure Helpers & Utils | 16 | 16 | ✅ |
| Y-B | Backend — State Machines & Guards | 9 | 9 | ✅ |
| Y-C | Backend — Service Logic (core huni) | 16 | 16 | ✅ |
| Y-D | Backend — Accounting Engine | 10 | 10 | ✅ |
| Y-E | Backend — AutoOps / Sweep Services | 7 | 7 | ✅ |
| Y-F | Backend — Staff & Operations | 10 | 10 | ✅ |
| Y-G | Backend — Public, Marketing & AI | 10 | 9 | ✅ (Y-G7 N/A: source tak ada) |
| Y-H | Backend — Loyalty & Gamification | 4 | 4 | ✅ |
| Y-I | Backend — Notifications & Push | 3 | 3 | ✅ |
| Y-J | Backend — Integration Tests | 14 | 14 | ✅ |
| Y-K | Backend — API Contract Tests (90 test) | 7 | 7 | ✅ |
| Y-L | Backend — Role & Authorization Matrix | 5 | 5 | ✅ |
| Y-M | Frontend — Utility & Helper Functions | 5 | 5 | ✅ (44 test) |
| Y-N | Frontend — Custom Hooks | 4 | 4 | ✅ (18 test) |
| Y-O | Frontend — Reusable Components | 8 | 8 | ✅ (31 test) |
| Y-P | Frontend — Page Integration Tests | 6 | 6 | ✅ (18 test) |
| Y-Q | Frontend — E2E Playwright Extend | 8 | 8 | ✅ (3 spek baru authored + collected) |
| Y-R | Security & Edge Cases | 7 | 7 | ✅ (24 test) |
| Y-S | Data & Migration Integrity | 4 | 4 | ✅ (12 test) |
| **TOTAL** | | **153** | **152** | **1 N/A** |

**Infra frontend:** vitest 2 + RTL + jsdom dibangun dari nol; `npm run build` FE tetap hijau (test di-exclude dari `tsc -b` via `tsconfig.json`).

**Y-G7** (AI context builder): `ai-context-builder.service.ts` tidak ada di repo — dilewati permanen.

---

### Fase Z — Audit UI/UX Cross-Portal (2026-07-02)

**Metode:** Inspeksi browser real-time via `browser_navigate` + `browser_snapshot` + `browser_console` — bukan spekulasi. Login sebagai tenant (Maya/Kamar A), staff (staff@kost48.com), dan admin (admin@kost48.com). Halaman publik `/` tanpa login. Owner dashboard tidak bisa diakses (redirect→login via browser tool) — dishare dengan admin dashboard via toggle segmented control.  
**Rujukan detail:** `docs/_AUDIT_CROSS_PORTAL_2026-07-02.md` (laporan lengkap dengan screenshot & kode fix).  
**Verifikasi awal:** Autocomplete login + novalidate + type=email sudah fixed dari changelog 2026-07-16 ✅. Tidak diulang di sini.

**Urutan prioritas:** Z-01 (critical data) > Z-02..Z-07 (halaman rusak/kosong) > Z-08..Z-16 (medium) > Z-17..Z-18 (publik).

#### 🔴 CRITICAL — Data Test/Artifact

- [x] **Z-01** 🔴 **Hapus "Uji XSS Y-R2" dari seed data** — muncul di 3 tempat: (a) dashboard staff → daftar kerja + prioritas terdekat, (b) dashboard admin → antrean aksi table (row "Tiket baru"). **Verifikasi:** `grep -r "XSS Y-R2" backend/src/ frontend/src/ scripts/` + `SELECT id, title FROM tickets WHERE title ILIKE '%xss%'`. 🔴 **4 tiket XSS** (id: 119, 123, 131, 139) berhasil dihapus dari DB. Seed scripts tidak mengandung "XSS" — data berasal dari integration test. ✅ Build lulus FE+BE. **Gate:** reseed aman — tidak ada XSS di seed scripts.

#### 🔴 HIGH — Halaman Tenant Rusak/Kosong

- [x] **Z-02** 🔴 **Fix 404: `/portal/guide` + `/portal/guides`** — ✅ **SUDAH FIX.** App.tsx:325 redirect `/portal/guide` → `/portal/manual`. `MyManualPage.tsx` ada dengan konten penuh (panduan + FAQ + WhatsApp). Gate lulus: route + konten sudah ada.

- [x] **Z-03** 🔴 **Isi halaman `/portal/announcements`** — ✅ **SUDAH ADA.** `MyAnnouncementsPage.tsx` fetch `/announcements/active` + render kartu pengumuman dengan loading/error/empty state lengkap. Empty state: "Belum ada pengumuman aktif". Kode siap — hanya butuh data seed untuk tampilkan konten.

- [x] **Z-04** 🔴 **Isi halaman `/portal/wifi`** — ✅ **SUDAH ADA.** `WifiOrderPage.tsx` fetch `AdditionalService` filtered wifi → render kartu paket + tombol "Pesan Sekarang" + WhatsApp fallback. Kode siap — hanya butuh seed data `AdditionalService` untuk tampilkan paket WiFi.

- [x] **Z-05** 🔴 **Fix tombol "Batal" di modal laporan** — ✅ **FIX TERAPAN.** `onHide` modal + tombol "Batal" kini panggil `setFormState(initialForm)` dan `setError('')` selain `setShowCreate(false)`. `frontend/src/pages/portal/MyTicketsPage.tsx:339,389`. Build FE lulus.

- [x] **Z-06** 🔴 **Implementasi navigasi sidebar staff** — ✅ **KODE LENGKAP.** Semua 5 link sidebar staff (`/dashboard`, `/tickets`, `/rooms`, `/staff-warehouse`, `/staff-report`) adalah React Router `<NavLink>` yang menavigasi ke route valid. `DashboardPage.tsx` render `DashboardStaff` untuk STAFF. Route `/rooms` publik → `RoomsRouteEntry` render `StaffRoomsPage` untuk STAFF. Design single-page vs multi-page adalah preferensi arsitektur, bukan bug.

- [x] **Z-07** 🔴 **Hapus "Kamar Z1 (Contoh Tersedia)"** — ✅ **Room Z1 (id=14) + 3 RoomFacility + 1 ticket ("Cuci AC — Z1") berhasil dihapus dari DB dev port 5433.** Verifikasi: `SELECT * FROM rooms WHERE code = 'Z1'` → 0 rows.

#### 🟡 MEDIUM — Chart, Race Condition, Loading

- [x] **Z-08** 🟡 **Fix chart width/height = -1 warnings** — muncul 8× di staff dashboard, 2× di tenant dashboard, + di halaman admin. **Verifikasi:** `browser_console` → warnings "The width(-1) and height(-1) of chart should be greater than 0". Root cause: chart di-render sebelum container punya ukuran (hidden tab/race). **Fix:** conditional render chart hanya saat container width > 0 (via `ResizeObserver` + state `ready`). Pakai skeleton saat loading. **Gate:** 0 chart warnings di console.

- [x] **Z-09** 🟡 **Fix race condition data cards staff** — "METER BELUM DICATAT" & "KINERJA BULAN INI" berganti antara "…"/"--" dan "21"/"100" saat refresh. **Verifikasi:** refresh dashboard staff 2-3× → angka berubah. **Fix:** skeleton loading state + `useQuery.isLoading` gate sebelum render nilai. **Gate:** nilai konsisten tidak berubah antar refresh.

- [x] **Z-10** 🟡 **Fix tombol "Laporan Lapangan" staff** — state `expanded=false` tapi tidak bisa diklik untuk expand. **Verifikasi:** klik tombol "+ Laporan Lapangan" di dashboard staff → tidak expand. **Fix:** tambah `useState` toggle + render form textarea + upload foto saat expanded. **Gate:** klik tombol expand/collapse form.

- [x] **Z-11** 🟡 **Loading state tanpa fallback di `/rooms` admin** — "Memuat halaman…" muncul tanpa spinner atau skeleton. **Verifikasi:** `browser_navigate → /rooms` → loading text polos. **Fix:** tambah `Spinner` component + teks "Memuat data kamar…" saat loading. **Gate:** spinner terlihat saat loading.

- [x] **Z-12** 🟡 **Loyalitas & Reward semua tabel kosong** — "Belum ada penukaran", "Belum ada laporan", "Belum ada reward" di `/loyalty`. Perlu seed data reward + pastikan empty state informatif (CTA: "Tambah Reward" untuk admin). **Gate:** halaman menampilkan empty state dengan CTA, bukan tabel kosong mentah.

- [x] **Z-13** 🟡 **Hapus "LOYALTY_POINT_RUPIAH_VALUE" dari UI** — technical env variable exposed ke user di halaman `/loyalty`. **Fix:** ganti ke teks "1 poin ≈ Rp100. Nilai dapat disesuaikan oleh owner." **Gate:** tidak ada reference ke env variable di UI.

- [x] **Z-14** 🟡 **Tooltip untuk tombol disabled di tenant dashboard** — "Perpanjang" & "Ajukan Keluar" disabled tanpa penjelasan kenapa. **Fix:** tambah `title="..."` attribute. **Gate:** hover tombol disabled → muncul tooltip.

- [x] **Z-15** 🟡 **Konsistensi sidebar layout di tenant** — sidebar hilang di `/portal/announcements`. **Fix:** gunakan `TenantLayout` yang sama di semua halaman tenant. **Gate:** semua halaman `/portal/*` memiliki sidebar.

- [x] **Z-16** 🟡 **PWA install prompt dismiss persistence** — dialog "Pasang / Nanti" muncul di setiap halaman di ketiga portal. **Fix:** simpan timestamp dismiss ke `localStorage`, jangan tampilkan lagi selama 7 hari. **Gate:** setelah dismiss, prompt tidak muncul lagi di sesi yang sama.

#### 🟢 LOW — Publik & Cross-Portal

- [x] **Z-17** 🟢 **Fix stat counter 0/0/0 di landing page** — "0 kamar tersedia / 0 terisi / 0 total kamar" membingungkan pengunjung. Admin dashboard menunjukkan 22 kamar total (12 terisi). **Verifikasi:** `browser_navigate → /` → lihat section "KETERSEDIAAN KAMAR". Kemungkinan root cause: API `/api/public/rooms-stats` tidak merespon atau semua kamar disembunyikan dari katalog. **Fix:** pastikan endpoint mengembalikan total real (22) + tampilkan "12 terisi / 1 tersedia / 22 total" atau empty state informatif. **Gate:** landing page menampilkan stat kamar yang akurat.

- [x] **Z-18** 🟢 **Landing page: "Belum ada kamar yang tersedia"** — empty state sudah informatif tapi tidak ada CTA untuk cek kapan ketersediaan berubah. **Fix:** tambah CTA "Dapatkan notifikasi saat kamar kosong" atau link ke WhatsApp admin. **Gate:** empty state memiliki CTA yang jelas.

- [ ] **Z-19** 🟢 **Owner dashboard tidak teraudit penuh** — tidak bisa login sebagai OWNER via browser tool (redirect loop). Dashboard owner dishare dengan admin via toggle segmented control "Penghuni & Uang" / "Operasional". **Verifikasi manual 🧑:** login OWNER → periksa halaman accounting (`/owner-dashboard`), settings, COA, dan AI section. **Gate:** owner konfirmasi tidak ada issue blocking.

**Gate akhir Fase Z:** `npm run build` FE + backend hijau. Tidak ada regression di test suite (≈1370 test).

---

### Fase AA — Perbaikan Temuan Audit Publik (CHECKLIST_01) ✅ SELESAI

> **Sumber:** `docs/archieve/audit_fable/CHECKLIST_01_publik_landing.md` · **5 task, 2 sudah done sebelumnya, 3 dikerjakan.**

| Task | Temuan | Severity | Status | File |
|---|---|---|---|---|
| AA-01 | C01-02: Bocor nama penghuni di availability-calendar | 🔴 HIGH | ✅ sudah done (null-kan BE+FE) | `marketing-public-rooms.service.ts`, `RichAvailabilityCalendar.tsx` |
| AA-02 | C01-03: `Room.notes` internal terekspos | 🟡 MEDIUM | ✅ sudah done (`notes: false`) | `marketing-public-rooms.service.ts` |
| AA-03 | C01-01: `freeKwh` dinamis tidak tampil di FAQ landing | 🟡 MEDIUM | ✅ fix: ganti key FAQ + regex replace | `PublicGuestDashboardPage.tsx` |
| AA-04 | C01-05: Header/footer tidak konsisten 3 halaman publik | 🟢 LOW | ✅ unifikasi ke `GuestTopbar`+`GuestFooter` | `FaqPublicPage.tsx`, `ReviewsPublicPage.tsx` |
| AA-05 | C01-04/06/07: Rating filter ≥4, tarif hardcoded, survei skip | 🟢 LOW | ✅ hapus rating filter; AA-03 cover tarif; skip tahan survei | `marketing-public-rooms.service.ts` |

**Gate:** Backend `tsc --noEmit` ✅ · Frontend `npm run build` ✅

---

### Fase AB — Perbaikan Temuan Audit Katalog (CHECKLIST_02) ✅ SELESAI

> **Sumber:** `docs/archieve/audit_fable/CHECKLIST_02_publik_katalog_kamar.md` · **5 task, 2 sudah done sebelumnya, 3 dikerjakan.**

| Task | Temuan | Severity | Status | File |
|---|---|---|---|---|
| AB-01 | C02-01: RESERVED label "Kosong" menyesatkan | 🟡 MEDIUM | ✅ sudah done (`label: "Dipesan"`) | `publicRoomDisplay.ts` |
| AB-02 | C02-02: Link mati `/katalog` + WA palsu di error-state | 🟡 MEDIUM | ✅ sudah done (`/rooms`+WA asli) | `PublicRoomDetailPage.tsx` |
| AB-03 | C02-03: `ROOMS_PER_PAGE=3`, komentar bilang 12 | 🟢 LOW | ✅ 3→9, komentar disinkronkan | `PublicRoomsPage.tsx` |
| AB-04 | C02-04: "Dana titipan" & "Deposit jaminan" campur | 🟢 LOW | ✅ unifikasi → "Deposit jaminan" | `PublicRoomDetailPage.tsx` |
| AB-05 | C02-05: DP preview pakai raw monthly | 🟢 LOW | ✅ tambah komentar penjelas | `PublicRoomDetailPage.tsx` |

**Gate:** Frontend `npm run build` ✅

---

### Fase AC — Perbaikan Temuan Audit Booking (CHECKLIST_03) ✅ SELESAI

> **Sumber:** `docs/archieve/audit_fable/CHECKLIST_03_publik_booking.md` · **4 task (semua LOW/INFO).**

| Task | Temuan | Severity | Status | File |
|---|---|---|---|---|
| AC-01 | C03-01: Default `checkInDate` UTC (off-by-one WIB) | 🟢 LOW | ✅ IIFE lokal WIB | `guestBookingUtils.ts` |
| AC-02 | C03-02: FAQ "Maks 2 orang" vs sistem "2 gratis, maks 4" | 🟢 LOW | ✅ teks disamakan | `publicGuestShared.tsx` |
| AC-03 | C03-03: "Air Rp 0/m³" janggal | 🟢 LOW | ✅ conditional → "Air termasuk" | `publicRoomDisplay.ts` |
| AC-04 | C03-04: DP preview raw monthly (sama C02-05) | 🟢 INFO | ✅ N/A — tercakup AB-05 | — |

**Gate:** Frontend `npm run build` ✅

---

### Fase AD — Perbaikan Temuan Audit Auth (CHECKLIST_04) ✅ SELESAI

> **Sumber:** `docs/archieve/audit_fable/CHECKLIST_04_auth.md` · **4 task (semua LOW/INFO).**

| Task | Temuan | Severity | Status | File |
|---|---|---|---|---|
| AD-01 | C04-01: `/settings/operational` bocor ke TENANT | 🟢 LOW | ✅ hapus `TENANT` dari `@Roles` | `settings.controller.ts` |
| AD-02 | C04-02: "User tidak aktif" bisa dibedakan | 🟢 LOW | ✅ pindah cek `isActive` setelah password | `auth.service.ts` |
| AD-03 | C04-03: `<a href>` full reload + missing autocomplete | 🟢 LOW | ✅ `<Link>` + `autoComplete="email"` | `LoginPage.tsx`, `ForgotPasswordPage.tsx` |
| AD-04 | C04-04: Dead code `resetTokenPreview` | 🟢 INFO | ✅ tambah komentar dev-only | `ForgotPasswordPage.tsx` |

**Gate:** Backend `tsc --noEmit` ✅ · Frontend `npm run build` ✅

---

### Fase AE — Perbaikan Temuan Audit MyStay (CHECKLIST_05) ✅ SELESAI

> **Sumber:** `docs/archieve/audit_fable/CHECKLIST_05_tenant_mystay.md` · **2 task.**

| Task | Temuan | Severity | Status | File |
|---|---|---|---|---|
| AE-01 | C05-01: Infinite refetch loop `stays/me/current` | 🔴 HIGH | ✅ sudah done (404→null, `staleTime` 60s) | `useTenantPortalStage.ts` |
| AE-02 | Verifikasi dashboard "occupied" | 🟡 PENDING | ✅ selesai — dikonfirmasi LIVE 3 Jul via bayu.tenant occupied (CHECKLIST_05 § "OCCUPIED DASHBOARD": no-loop, I6 resolved, JB-17 benar, dana titipan benar) | — |

**Gate:** AE-01 fix loop ✅ · Build frontend ✅ · AE-02 ✅ (verifikasi live 2026-07-03, ditutup 2026-07-04).

---

### Fase AF — Perbaikan Temuan Audit Invoice (CHECKLIST_06) ✅ SELESAI

> **Sumber:** `docs/archieve/audit_fable/CHECKLIST_06_tenant_invoice_bayar.md` · **3 temuan (2 LOW + 1 INFO).**

| Task | Temuan | Severity | Status | File |
|---|---|---|---|---|
| AF-01 | C06-01: Invoice LUNAS masih menampilkan countdown jatuh tempo | 🟢 LOW | ✅ sembunyikan `relativeLabel` + ubah helper metric saat `isPaid` | `TenantInvoiceDetailPage.tsx` |
| AF-02 | C06-02: Banner "3 langkah menuju kamar" muncul untuk mantan penghuni | 🟢 LOW | ✅ tambah `hasStayHistory` di hook + bedakan konten `GettingStartedGuide` | `useTenantPortalStage.ts`, `GettingStartedGuide.tsx`, `TenantWorkspaceTabs.tsx`, `AppLayout.tsx` |
| AF-03 | C06-03: Dua submission PENDING untuk invoice sama — belum teruji | 🟢 INFO | ✅ catatan: guard anti-double kuat (consumed-fileKey + sudah lunas). Tanpa kode. | — |

**Detail AF-01:** Di `TenantInvoiceDetailPage.tsx`, metric tile "Jatuh Tempo" menampilkan `dueMeta.relativeLabel` (countdown "Sisa 2 jam 14 menit") meski invoice sudah Lunas. Fix: (1) baris ~353 tambah guard `!isPaid` pada div `relativeLabel`, (2) baris ~172 metric `due.helper` ganti jadi "Tagihan sudah lunas" saat `isPaid`, status jadi `SUCCESS`.

**Detail AF-02:** `GettingStartedGuide` menampilkan "3 langkah menuju kamar Anda" untuk SEMUA tenant dengan `stage === 'browsing'`, termasuk mantan penghuni yang punya riwayat tapi tak ada stay aktif. Fix: (1) `useTenantPortalStage` tambah `hasStayHistory` (true bila `bookingsQuery.data?.items` punya item walau non-actionable), (2) `GettingStartedGuide` terima prop `hasStayHistory`, bila ex-tenant (`browsing` + `hasStayHistory`) tampilkan "Kamu pernah menghuni KOST48" + langkah ringkas (katalog + riwayat tagihan). Props di-thread melalui `AppLayout` → `TenantWorkspaceTabs` → `GettingStartedGuide`.

**Gate:** Backend tidak terdampak (frontend-only) ✅ · Frontend `npm run build` ✅ (PWA verified).

---

### Fase AG — Perbaikan Temuan Audit Tiket (CHECKLIST_07) ✅ SELESAI

> **Sumber:** `docs/archieve/audit_fable/CHECKLIST_07_tenant_tiket.md` · **1 temuan (LOW).**

| Task | Temuan | Severity | Status | File |
|---|---|---|---|---|
| AG-01 | C07-01: Banner onboarding "3 langkah menuju kamar" untuk mantan penghuni | 🟢 LOW | ✅ sama dengan C06-02, tercakup oleh AF-02 | — |

**Detail:** C07-01 identik dengan C06-02 — banner `GettingStartedGuide` muncul di SEMUA halaman portal tenant (termasuk `/portal/tickets`) untuk mantan penghuni tanpa stay aktif. Fix AF-02 (menambah `hasStayHistory` + konten berbeda) menyelesaikan C07-01 secara otomatis karena `GettingStartedGuide` adalah komponen bersama di `TenantWorkspaceTabs`. Tidak ada kode tambahan.

**Gate:** Tercakup AF-02 ✅.

---

### Fase AH — Perbaikan Temuan Audit Info (CHECKLIST_08) ✅ SELESAI

> **Sumber:** `docs/archieve/audit_fable/CHECKLIST_08_tenant_info.md` · **4 temuan (1 MEDIUM + 2 INFO + 1 LOW).**

| Task | Temuan | Severity | Status | File |
|---|---|---|---|---|
| AH-01 | C08-01: `/api/announcements/active` 503 → Pengumuman stuck "Memuat halaman…" | 🟠 MEDIUM | ✅ bungkus `hasTenantOccupiedStay` try-catch; fallback `false` + log warning | `announcements.service.ts` |
| AH-02 | C08-02: Hermes I12 Panduan 404 = STALE | 🟢 INFO | ✅ redirect `/portal/guide`→`/portal/manual` berfungsi. Tanpa kode. | — |
| AH-03 | C08-03: Hermes I13 WiFi kosong = STALE | 🟢 INFO | ✅ empty-state OK. Tanpa kode. | — |
| AH-04 | C08-04: Banner onboarding ex-tenant (berulang) | 🟢 LOW | ✅ sama dengan C06-02, tercakup AF-02 | — |

**Detail AH-01:** `announcements.service.ts` `findActive` memanggil `hasTenantOccupiedStay` → query `stay.findFirst` filter `RoomStatus.OCCUPIED`. Bila DB UAT drift / enum tidak sinkron, query mentah gagal → 503 tanpa pesan. Fix: (1) bungkus pemanggilan `hasTenantOccupiedStay` di `findActive` dengan `.catch()` → fallback `false` + log warning, (2) bungkus body `hasTenantOccupiedStay` dengan try-catch → return `false` + log warning. Endpoint kini balas 200 `[]` alih-alih 503 saat DB bermasalah.

**Gate:** Backend `npm run build` ✅ · Frontend tidak terdampak.

---

### Fase AI — Perbaikan Temuan Audit Loyalty+Renewal+Checkout (CHECKLIST_09) ✅ SELESAI

> **Sumber:** `docs/archieve/audit_fable/CHECKLIST_09_tenant_loyalty_renew_checkout.md` · **2 temuan (1 HIGH + catatan).**

| Task | Temuan | Severity | Status | File |
|---|---|---|---|---|
| AI-01a | C09-01: 503 sistemik `/tenant/bookings/my` — `isBookingSchemaReady` query mentah gagal | 🔴 HIGH | ✅ bungkus `$queryRaw` try-catch; return `false` + log warning | `booking-schema.helper.ts` |
| AI-01b | C09-01 dampak FE: `useTenantPortalStage` `isStageLoading` stuck karena `bookingsQuery` gagal | 🔴 HIGH | ✅ `isStageLoading` hanya tunggu `stayQuery`; `bookingsQuery` tak blokir render | `useTenantPortalStage.ts` |
| AI-02 | Loyalty OK, JB-01 renewal deposit OK, JB-10 checkout liability OK | 🟢 INFO | ✅ diverifikasi via kode. Tanpa perubahan. | — |

**Detail AI-01a:** `booking-schema.helper.ts` `isBookingSchemaReady` menjalankan `$queryRaw` ke `pg_type` + `information_schema.columns`. Bila query gagal (DB drift/permission), exception tidak tertangkap → 503. Fix: bungkus `$queryRaw` try-catch; return `false` (anggap belum siap) + cache status fallback. Semua caller (`findMine`, `createBooking`, `getPublicRooms`) kini mendapat graceful degradation alih-alih 503.

**Detail AI-01b:** `useTenantPortalStage.ts` sebelumnya menunggu `stayQuery.isLoading || bookingsQuery.isLoading` untuk `isStageLoading`. Bila `bookingsQuery` gagal (503), portal tenant stuck "Memuat portal…". Fix: `isStageLoading` kini hanya `stayQuery.isLoading` — bookingsQuery bersifat supplementary. Stage tetap bisa ditentukan dari stayQuery saja.

**Gate:** Backend `npm run build` ✅ · Frontend `npm run build` ✅ (PWA verified).

---

### Fase AJ — Sisa Temuan Audit 2026-07 ✅ SELESAI

> **Sumber:** `docs/archieve/audit_fable/RINGKASAN_TEMUAN.md` (konsolidasi C01–C19) + `CHECKLIST_05/10/17` — temuan yang BELUM tertutup Fase AA–AI.
> **Spec eksekutor (WAJIB dibaca sampai habis sebelum coding, dibuat untuk AI lemah):** `docs/_SPEC_FASE_AJ_SISA_AUDIT.md` — berisi langkah per file, kutipan kode SEBELUM/SESUDAH, dan kriteria lulus.
> **Urutan:** AJ-01 → AJ-02 → AJ-03 → AJ-04 → AJ-05 → AJ-06 → AJ-07. **1 task = 1 commit.**

| Task | Temuan | Severity | Status | File |
|---|---|---|---|---|
| [x] AJ-01 | C05-01 sistemik: 404 `/stays/me/current` masih di-throw sebagai error di 3 observer FE tersisa → potensi refetch loop / meracuni cache bersama `['portal-stage','stay']` (AE-01 baru menutup `stayQuery` di hook) | 🔴 HIGH (efektif BLOCKER) | ✅ 2026-07-04 — dikerjakan eksekutor paralel sesuai spec, diverifikasi (diff + build) | `MyStayPage.tsx`, `MyBookingsPage.tsx`, `components/tenant/TenantBookingGate.tsx` |
| [x] AJ-02 | Verifikasi LIVE anti-loop: login Maya/tenant tanpa stay buka `/portal/stay` + `/portal/bookings` + `/portal/invoices` → request settle (≤3 dalam 30 dtk), empty-state tampil, backend sehat | 🔴 gate fase | ✅ 2026-07-04 — Playwright: `/portal/stay` 2 request/30 dtk + empty-state; `/portal/bookings` 2; `/portal/invoices` 2; backend 200. E2E `aj02-no-loop.spec.ts` PASS (total 6 request seluruh uji) | `frontend/e2e/aj02-no-loop.spec.ts` + verifikasi manual |
| [x] AJ-03 | C10-02: seed menyisipkan kamar OCCUPIED dengan invoice sewa awal BELUM lunas (Bayu/I, Sari/F2) — melanggar rule Fase V "check-in wajib lunas"; skenario menunggak dipindah ke invoice bulan ke-2 + deposit selalu terkumpul | 🟢 LOW | ✅ kode 2026-07-04 (sewa awal selalu lunas; tunggakan → invoice bulan ke-2 via `create-with-lines-and-issue`; Sari invoice ke-2 open penuh sesuai D-02 no-partial; `depositCollected=true`) — bukti eksekusi = AJ-04 | `backend/scripts/seed-dev-via-api.js` |
| [x] AJ-04 | Data seed menua (basis TODAY 24 Jun → 10 kamar tersapu MAINTENANCE): re-seed `seed:dev:reset` + `seed:dev:api` di DB 5433, verifikasi 13 OCCUPIED + TB `isBalanced:true` | 🟢 LOW | ✅ 2026-07-04 — `db push` dev sudah sync; reset+seed lulus. 13/13 kamar OCCUPIED; Bayu/I & Sari/F2 invoice pertama PAID, invoice kedua ISSUED; TB balanced debit=kredit Rp47.490.000. Meter seed juga bersih: 2 bertagihan + 3 gratis. | DB dev 5433 |
| [x] AJ-05 | C17-01: okupansi owner "100%" vs admin "3/13 terisi" — denominator beda (kamar siap-sewa vs semua kamar fisik); perjelas label + detail, rumus TIDAK diubah | 🟢 LOW | ✅ 2026-07-04 — owner: "Okupansi kamar siap-sewa" + detail; admin: "Okupansi semua kamar" + helper kamar fisik | `OwnerDashboardPage.tsx`, `useBusinessHealthScore.ts` |
| [x] AJ-06 | Sinkron dokumen audit: status basi di `RINGKASAN_TEMUAN.md` (C01-02/C02-01/C02-02 sudah fix AA/AB; C05-01 setelah AJ-01) + `00_INDEX.md` baris 05. (AE-02 sudah ditutup 2026-07-04, bukan bagian task ini lagi) | 🟢 DOCS | ✅ 2026-07-04 | `docs/archieve/audit_fable/*` |
| [x] AJ-07 | 🧑 Verifikasi live lanjutan (RINGKASAN §SISA LIVE): approve DP→check-in e2e, mutasi (meter/renew/checkout/stok/WiFi), responsive 375/768 tenant+admin, screenshot ulang, Z-19 konfirmasi owner | 🟢 INFO | ✅ 2026-07-04 — yang aman diuji: responsive tenant/admin 375/768 + meter seed. Temuan baru dicatat audit-only: C19-01 tenant `/portal/stay` request `/settings/operational` 403 console; C19-02 admin `/dashboard` overflow 375px. Sisa destructive/human: DP→check-in butuh kamar AVAILABLE (AJ-04 semua OCCUPIED), checkout/renew/WiFi full flow tidak dimutasi agar baseline seed tetap stabil. | `CHECKLIST_19_lintas_pwa_a11y.md`, `RINGKASAN_TEMUAN.md` |

**Gate akhir fase:** FE build ✅ · BE `tsc --noEmit` ✅ · AJ-02 live ✅ · AJ-04 TB balanced ✅ · backend unit 1072/1073 PASS (1 skip intentional) ✅ · backend integration PASS ✅ · frontend vitest 111/111 PASS ✅. DB dev di-reseed ulang setelah integration dan diverifikasi 13 OCCUPIED + TB balanced.

---

### Fase AK — Owner-Request 2026-07-04 (API key di Settings + Input Angka Ribuan)

> **Sumber:** permintaan langsung owner 2026-07-04. 🧬 kolom `deepseekApiKey` di `OperationalSetting` = additive, disetujui owner via permintaan ini.

| Task | Isi | Status | File kunci |
|---|---|---|---|
| [x] AK-01 | **API key DeepSeek via Settings UI** (bukan .env): kolom 🧬 `OperationalSetting.deepseekApiKey` + runtime setter `setDeepseekApiKey` (aktif tanpa restart, env = fallback) + load saat boot + respons API TIDAK pernah memuat key (hanya `deepseekApiKeySet/Source` + preview `••••1234` khusus OWNER) + input password di panel AI & Biaya + tombol "Hapus key" + semua teks petunjuk .env diganti | ✅ kode; `prisma db push` ke DB saat env hidup | `schema.prisma`, `deepseek.client.ts`, `settings.service.ts`, `settings.controller.ts`, `operational-setting.dto.ts`, `owner-ai.service.ts`, `market-analysis.service.ts`, `api/settings.ts`, `OwnerSettingsPage.tsx`, `MarketAnalysisPage.tsx` |
| [x] AK-02 | **Fix bug laten 400 simpan panel AI**: PUT `/settings/operational` dikirimi `{...db}` (ikut `id`/`updatedAt`) padahal pipe global `forbidNonWhitelisted` → SELALU 400. Fix: helper `pickOperationalPayload` (whitelist field DTO) | ✅ | `api/settings.ts`, `OwnerSettingsPage.tsx` |
| [x] AK-03 | **Input angka tampil ribuan `xxx.xxx.xxx` + fix bug nol-depan** ("0 tak bisa dihapus → 02000000"): perkuat `CurrencyInput` (focus-guard sync + strip nol depan + prop size/isInvalid/dll) lalu sapu form uang/angka besar — 12 file: modal bayar/renew/checkout/invoice, wizard check-in (sewa+deposit), detail invoice, aset, saldo awal, cash account, loyalty, settings owner (9 field) | ✅ build FE lulus | `CurrencyInput.tsx` + 12 file form |

**Catatan cakupan AK-03:** `type="number"` yang tersisa = sumbu chart recharts, filter tahun/bulan, qty kecil ber-state string, dan meteran desimal (`step 0.001`) — sengaja tidak diubah (tidak kena bug & tak butuh pemisah ribuan). Form CRUD generik (`ResourceFormModal` — kamar/expenses/layanan) sudah memakai `CurrencyInput` sejak lama dan ikut terkuat.

---

### Fase M17 — Perbaikan Temuan Audit 360° P3-P8 ✅ SELESAI (2026-07-09)

> **Sumber:** `docs/M17_AUDIT_360_P3_P8.md` — 1 CRITICAL, 1 MEDIUM, 4 LOW.
> **Eksekutor:** Reasonix Code (DeepSeek V4 Pro)

| ID | Temuan | Severitas | Status | Detail |
|----|--------|-----------|--------|--------|
| P3-01 | Refresh token + httpOnly cookie | 🔴 CRITICAL | ✅ FIXED | 🧬 Model `RefreshToken` di schema; backend `/auth/refresh` + `/auth/logout`; frontend interceptor auto-refresh 401 + logout revoke. Token access 15 menit, refresh 7 hari (httpOnly cookie, XSS-safe). |
| P7-01 | CTA booking tidak reusable | 🟠 MEDIUM | ✅ FIXED | BookingCtaButton komponen shared — dipakai di RoomCard + RoomPreviewCard. 1 file baru + 2 file update. |
| P8-01 | Verifikasi FK index | 🟠 MEDIUM | ✅ VERIFIED | 215 `@@index` di schema; semua FK utama terindeks. Query DB live untuk konfirmasi. |
| P8-02 | Skeleton dimensi hardcoded | 🔵 LOW | ✅ DOCUMENTED | Atom `SkeletonBlock` fleksibel via props; komposit pakai nilai tetap = pola normal. |
| P8-03 | Chart empty state | 🔵 LOW | ✅ FIXED | Guard `points.length === 0` di Bar + Table mode SmartChartPanel + HorizontalBarChart. |
| P3-02 | Rate limit in-memory | 🔵 LOW | ✅ DOCUMENTED | Single-instance safe; perlu Redis jika multi-instance. |
| P8-04 | No 404 page | 🔵 LOW | ✅ PRE-EXISTING | Resolved Fase L. |
| P8-05 | No toast feedback | 🔵 LOW | ✅ PRE-EXISTING | Resolved Fase F + M. |

**File berubah:**
- 🧬 `backend/prisma/schema.prisma` — model RefreshToken + relasi ke User
- `backend/src/auth/auth.service.ts` — login + refresh + revoke methods
- `backend/src/auth/auth.controller.ts` — endpoint refresh/logout + cookie helpers
- `backend/src/main.ts` — rate limit refresh/logout
- `frontend/src/api/client.ts` — 401 interceptor auto-refresh + refresh queue
- `frontend/src/context/AuthContext.tsx` — logout revoke
- `frontend/src/components/rooms/BookingCtaButton.tsx` — baru
- `frontend/src/components/rooms/RoomCard.tsx` — ganti CTA dengan BookingCtaButton
- `frontend/src/pages/public/publicGuestShared.tsx` — ganti WA CTA dengan BookingCtaButton
- `frontend/src/components/charts/SmartChartPanel.tsx` — empty state guard bar+table
- `frontend/src/components/charts/HorizontalBarChart.tsx` — empty state guard
- `docs/M17_AUDIT_360_P3_P8.md` — status eksekusi

**Gate:** `npx tsc --noEmit` backend ✅ (1 pre-existing error auto-ops) · `npm run build` FE ✅ · Schema siap `db push` saat env hidup.

### Fase M16 — Perbaikan Temuan Audit 360° Flow Huni ✅ SELESAI (2026-07-06)

> **Sumber:** `docs/M16_AUDIT_360_FLOW_HUNI.md` — 7 temuan (2 HIGH, 4 MEDIUM, 1 LOW).
> **Eksekutor:** Reasonix Code (DeepSeek V4 Pro)

| ID | Temuan | Severitas | Status | Detail |
|----|--------|-----------|--------|--------|
| P2-01 | BookingSource hardcode `WEBSITE` di portal tenant | 🔴 HIGH | ✅ FIXED | Tambah `PORTAL` ke enum LeadSource (🧬) + ganti `tenant-bookings.service.ts:150` → `LeadSource.PORTAL` |
| P2-02 | Tidak ada guard checkout ≤ plannedCheckOutDate | 🔴 HIGH | ✅ FIXED | Guard di `checkout-requests.service.ts:createRequest` — tolak jika melebihi kontrak |
| P2-03 | `LeadSource.WEBSITE` untuk public booking | 🟠 MEDIUM | ✅ VALID | Publik = website sudah benar; `leadSourceDetail` opsional untuk enhancement nanti |
| P2-04 | `approveRequest` — updateMany tanpa lock stay | 🟠 MEDIUM | ✅ FIXED | Tambah `FOR UPDATE` lock pada Stay sebelum updateMany |
| P2-05 | Damage charge invoice setelah COMPLETED | 🟠 MEDIUM | ✅ VALID | Desain intentional — tidak blokir checkout, auto-settle via processDeposit |
| P2-06 | Deposit cover meter guard | 🟠 MEDIUM | ✅ VALID | Guard F1-8 defense-in-depth |
| P2-07 | Link hardcode `/stays?status=BOOKINGS` | 🔵 LOW | ✅ VALID | Route masih valid di StaysPage.tsx |

**File berubah:**
- 🧬 `backend/prisma/schema.prisma` — PORTAL added to LeadSource enum (db push)
- `backend/src/common/enums/app.enums.ts` — PORTAL added
- `backend/src/modules/tenant-bookings/tenant-bookings.service.ts` — WEBSITE → PORTAL
- `backend/src/modules/checkout-requests/checkout-requests.service.ts` — guard P2-02 + FOR UPDATE P2-04
- `frontend/src/pages/stays/check-in-wizard/constants.ts` — bookingSourceOptions + PORTAL
- `frontend/src/pages/stays/check-in-wizard/checkInWizardUtils.tsx` — bookingSourceOptions + PORTAL
- `docs/M16_AUDIT_360_FLOW_HUNI.md` — Section 7 status eksekusi

**Gate:** `npx -p typescript tsc -p backend/tsconfig.json --noEmit` ✅ · `npm run build` FE ✅ · `npx prisma db push` ✅ · `npx prisma generate` ✅

---

### Fase AL — Audit Reasonix Code 2026-07-07 ✅ SELESAI (audit) + Refactor Kecil

> **Sumber:** `docs/archieve/audit_reasonix/` — 82 temuan baru. **Auditor:** Reasonix Code (DeepSeek V4 Pro) via 5 batch sub-agent v4-flash. **Fokus:** logika bisnis, akurasi perhitungan, finansial, laporan, UI/UX. Lihat `docs/archieve/audit_reasonix/00_index.md` + `RINGKASAN_EKSEKUTIF.md`.

| # | Status | Area | Keterangan |
|---|--------|------|------------|
| [x] AL-REF-1 | ✅ | **Unifikasi `dateOnly()`** — 1 shared utility `backend/src/common/utils/date-only.ts`, update 5 caller (accounting.service, accounting-posting-helpers, accounting-period-close, accounting-readiness, rent-recognition) | Build tsc ✅ |
| [x] AL-REF-2 | ✅ | **`@ApiProperty` di DTO** — invoice.dto.ts (6 DTO, 25 field), stay.dto.ts (9 DTO, 42 field), room-transfer.dto.ts (2 DTO, 15 field) | Build tsc ✅ |
| [ ] AL-REF-3 | ⏸️ TUNDA | **Split stays.service.ts** — terlalu berisiko (1400 baris), ganti dengan section markers di file besar sebagai navigasi AI | Nanti |
| [x] AL-DOC-1 | ✅ | **Update M02** — 4 keputusan baru (DISCOUNT line, renewal cross-term, collection rate basis, WiFi voucher) | `docs/M02_KEPUTUSAN_OWNER.md` |
| [x] AL-DOC-2 | ✅ | **Update M12 + M13** — tambah Fase AL, prepend changelog | File ini + `docs/M13_CHANGELOG.md` |
| [x] AL-DOC-3 | ✅ | **Update audit docs** — 00_INDEX + RINGKASAN + supersede Hermes + M00_CODEMAP | `docs/archieve/audit_fable/` |
| [x] AL-DOC-4 | ✅ | **10 file audit-reasonix** — 82 temuan lengkap dengan file:line | `docs/archieve/audit_reasonix/` |
| [x] AL-OC-05 | ✅ | **M29 ExternalReview CRUD audit** — audit selesai, laporan di `M29_AUDIT_EXTERNAL_REVIEW.md` | `docs/archieve/audit_reasonix/` |

#### 🔴 ANTRIAN PERBAIKAN BUG (6 kritis — belum dieksekusi)

| Task | Bug | File | Estimasi |
|------|-----|------|----------|
| [x] AL-FIX-1 | DISCOUNT line → journal tidak terposting | `accounting-posting-helpers.ts:70-76` | 1-2 jam |
| [x] AL-FIX-2 | Overdue aging gross→net (partial payment) | `reports.service.ts:117` | 30 menit |
| [x] AL-FIX-3 | Renewal cross-term undercharge | `renew-requests.service.ts:267` | 1 jam |
| [x] AL-FIX-4 | Collection rate period mismatch | `finance.service.ts:77-86` | 1 jam |
| [x] AL-FIX-5 | Journal pending tanpa retry | `payment-submissions.service.ts:794` | 2 jam |
| [x] AL-FIX-6 | `@IsNumberString` vs JSON number di CreateStayDto | `stay.dto.ts:58-63` | 30 menit |

#### 🟠 BACKLOG (15 tinggi + 35 menengah + 26 rendah)

Detail lengkap: `docs/archieve/audit_reasonix/RINGKASAN_EKSEKUTIF.md`. Prioritas: H1-H15 dulu, lalu M1-M35, terakhir L1-L26.

#### 🆕 MINI PROJECT — WiFi Voucher System (AL-04)

Owner konfirmasi: voucher system, non-tenant bisa beli. Paket: sebulan 50k, 2 minggu 40k, seminggu 20k, sehari 5k. Spec terpisah.

**Gate akhir Fase AL (audit):** Build backend ✅ · Build frontend (tdk perlu — hanya DTO) · 10 file audit-reasonix lengkap (di `docs/archieve/audit_reasonix/`).
