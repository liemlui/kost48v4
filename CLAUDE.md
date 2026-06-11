# KOST48 Surabaya V5 — Panduan Sesi (jaga file ini <3 KB)

Sistem manajemen kost 48 kamar. Backend NestJS+Prisma+PostgreSQL (`backend/`), frontend React+Vite (`frontend/`). Bahasa kerja: Indonesia.

## Pintu masuk docs (urutan baca — JANGAN baca semua docs)
1. `docs/00_GROUND_STATE.md` — fakta sistem ringkas + konsep kunci (DP vs deposit, overstay lifecycle, 9 job auto-ops).
2. `docs/01_FLOW_MAP.md` — peta 12 flow bisnis ke `file:baris`. Pakai ini untuk menemukan kode, bukan eksplorasi folder.
3. `docs/CHECKLIST.md` — pekerjaan aktif. `docs/CHANGELOG.md` — entri V5.11.0+ saja (prepend-only; entri lama di arsip).
4. `docs/02_FOCUS_PLAN.md` — matriks fokus audit + rencana UAT + keputusan owner D1–D4.

Hanya 5 docs aktif di atas. JANGAN baca: `docs/archieve/*` (sejarah pra-audit: contracts/plan/decisions/journal/changelog lama), file `*_STALE.md`, `node_modules`.

## Konsep yang sering salah
- Tidak ada model `Booking` — satu `Stay` mewakili booking→huni→selesai (promoted = `initialMetersPromotedAt` terisi).
- **DP** (`downPayment*`, 30% sewa, hangus) ≠ **deposit jaminan** (`deposit*`, refundable, dari `Room.defaultDepositRupiah`).
- Tanpa denda keterlambatan (keputusan owner). Notifikasi in-app saja (menuju PWA push).
- Role enum: OWNER/ADMIN/STAFF/TENANT saja.

## Perintah
- Backend check: `cd backend; npx tsc --noEmit` · run: `npm run start:dev` (API `http://localhost:3000/api`)
- Frontend build: `cd frontend; npm run build` · dev: `npm run dev`
- DB UAT: postgres port 5433 `kost48_v3_pro`; produksi 5432 `kost48_v3`. Jangan mutasi DB produksi.

## Aturan kerja hemat token
- Cari kode via Grep berpola di `backend/src` / `frontend/src`; mulai dari `file:baris` di FLOW_MAP.
- Selesai rilis: update ringkas `00_GROUND_STATE.md` + prepend `CHANGELOG.md`; pindahkan item selesai dari CHECKLIST.
- Tulisan commit & docs berbahasa Indonesia; ikuti gaya entri CHANGELOG yang ada.
