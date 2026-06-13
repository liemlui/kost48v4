# KOST48 Surabaya V5 — Panduan Sesi (jaga file ini <3 KB)

Sistem manajemen kost 48 kamar. Backend NestJS+Prisma+PostgreSQL (`backend/`), frontend React+Vite (`frontend/`). Bahasa kerja: Indonesia.

## Pintu masuk docs (struktur domain-dossier — JANGAN baca semua)
1. `docs/00_BLUEPRINT.md` — **peta tunggal: model bisnis + indeks dossier + peta eksekusi (fase) + auto-ops engine + matrix teori**. BACA INI DULU. (Router file + anchor `file:baris` TERVERIFIKASI: `docs/_PETA_AI.md`.)
2. Inti lintas-domain: `01_GROUND_STATE` (fakta) · `02_FLOW_MAP` (peta kode `file:baris`) · `03_KEPUTUSAN_OWNER` (**84 keputusan, SUMBER KEBENARAN** — baca sebelum ubah flow) · `04_DEPLOY_AND_PWA` · **`05_VERIFIKASI_KEUANGAN` (WAJIB dijalankan tiap task uang/akuntansi)**.
3. **Dossier domain (10-19) — buka SESUAI area kerja, tiap dossier MANDIRI** (aturan+peta kode+temuan+task+desain+UAT): `10_PEMBAYARAN_INVOICE` · `11_BOOKING_RENEWAL` · `12_CHECKOUT_DEPOSIT_OVERSTAY` · `13_AKUNTANSI_LAPORAN` · `14_INVENTARIS` · `15_STAF_TIKET_KPI` · `16_NOTIFIKASI_PENGUMUMAN` · `17_PUBLIK_MARKETING_UIUX` · `18_AUTH_FONDASI_ONBOARDING` · `19_GAMIFIKASI_LOYALITAS`.
4. `06_CONTRACTS` (aturan bisnis) · `07_PLAN` (rencana fase) · `08_CHECKLIST` (pekerjaan aktif) · `09_TRACEABILITY` (mapping audit) · `CHANGELOG.md` (V5.11.0+, prepend-only).

Detail forensik 97 temuan & rencana lama sudah DIBUBARKAN ke dossier; arsip di `docs/archieve/_DEPRECATED_*`. JANGAN baca `docs/archieve/*`, `*_STALE.md`, `node_modules`.

## Konsep yang sering salah
- Tidak ada model `Booking` — satu `Stay` mewakili booking→huni→selesai (promoted = `initialMetersPromotedAt` terisi).
- **DP** (`downPayment*`, 30% sewa, hangus) ≠ **deposit jaminan** (`deposit*`, refundable, dari `Room.defaultDepositRupiah`, SELALU tetap).
- Tanpa denda keterlambatan. Notifikasi in-app (menuju PWA push). Role: OWNER/ADMIN/STAFF/TENANT.
- **Lokasi: Jl. Hikmah V No. 48, Surabaya Barat (Pakuwon/PTC)** — bukan Ngagel (koreksi D-01).
- **Belum publish (DB = data testing); 1 staf; tenant = pengawas kualitas staf; bayar tunai+transfer.** (lihat 03_KEPUTUSAN_OWNER)

## Perintah
- Backend check: `cd backend; npx tsc --noEmit` · run: `npm run start:dev` (API `http://localhost:3000/api`)
- Frontend build: `cd frontend; npm run build` · dev: `npm run dev`
- DB UAT: postgres port 5433 `kost48_v3_pro`; produksi 5432 `kost48_v3`. Jangan mutasi DB produksi.

## Aturan kerja hemat token
- Cari kode via Grep berpola di `backend/src` / `frontend/src`; mulai dari anchor TERVERIFIKASI di `docs/_PETA_AI.md §2` / dossier 10-19 (baris di `02_FLOW_MAP` indikatif — grep nama metode bila ragu).
- Selesai rilis: update ringkas `01_GROUND_STATE.md` + prepend `CHANGELOG.md`; pindahkan item selesai dari `08_CHECKLIST.md`.
- Tulisan commit & docs berbahasa Indonesia; ikuti gaya entri CHANGELOG yang ada.
