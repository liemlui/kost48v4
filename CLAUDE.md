# KOST48 Surabaya V5 — Panduan Sesi (jaga file ini <3 KB)

Sistem manajemen kost 48 kamar. Backend NestJS+Prisma+PostgreSQL (`backend/`), frontend React+Vite (`frontend/`). Bahasa kerja: Indonesia.

## Pintu masuk docs (M-file — JANGAN baca semua)
1. **`docs/M01_MASTER.md`** — blueprint + ground state + router AI (arsip `_PETA_AI` di `docs/archieve/`).
2. **`docs/M02_KEPUTUSAN_OWNER.md`** — 84 keputusan owner (SUMBER KEBENARAN sebelum ubah flow).
3. **`docs/M10_CHECKLIST_CHANGELOG.md`** — **CHECKLIST AKTIF + antrian eksekusi AI** (baca ANTRIAN, jangan ulang fase selesai). Changelog historis → `docs/M11_CHANGELOG.md`.
4. **`docs/CODEMAP.md`** — peta modul→path→tanggung jawab + index model + anchor flow. Pakai INI dulu untuk navigasi kode (hemat token), baru Grep simbol.
5. Domain: **M04** keuangan · **M05** siklus huni · **M06** operasional · **M07** publik/marketing · **M08** deploy · **M09** audit.
6. Gate uang: **`docs/M04_KEUANGAN.md`** (verifikasi TB) — WAJIB tiap task finance.

Detail forensik 97 temuan & rencana lama sudah DIBUBARKAN ke dossier; arsip di `docs/archieve/_DEPRECATED_*`. **JANGAN baca** (token bomb): `docs/archieve/*`, `*_STALE.md`, `node_modules`, `reference/*` (buku.md 2.2MB + PDF 5.7MB), `backend/src/generated/*` (Prisma generated, regen via `prisma generate`).

## Konsep yang sering salah
- Tidak ada model `Booking` — satu `Stay` mewakili booking→huni→selesai (promoted = `initialMetersPromotedAt` terisi).
- **DP** (`downPayment*`, 30% sewa, hangus) ≠ **deposit jaminan** (`deposit*`, refundable, dari `Room.defaultDepositRupiah`, SELALU tetap).
- Tanpa denda keterlambatan. Notifikasi in-app (menuju PWA push). Role: OWNER/ADMIN/STAFF/TENANT.
- **Lokasi: Jl. Hikmah V No. 48, Surabaya Barat (Pakuwon/PTC)** — bukan Ngagel (koreksi D-01).
- **Belum publish (DB = data testing); 1 staf; tenant = pengawas kualitas staf; bayar tunai+transfer.** (lihat `M02_KEPUTUSAN_OWNER`)

## Perintah
- Backend check: `cd backend; npx tsc --noEmit` · run: `npm run start:dev` (API `http://localhost:3000/api`)
- Frontend build: `cd frontend; npm run build` · dev: `npm run dev`
- DB UAT: postgres port 5433 `kost48_v3_pro`; produksi 5432 `kost48_v3`. Jangan mutasi DB produksi.

## Aturan kerja hemat token
- Navigasi kode: `docs/CODEMAP.md` dulu → lalu Grep simbol di `backend/src` / `frontend/src`. Spesifikasi task → `M10` ANTRIAN + M-file domain.
- Selesai task: centang `M10` + prepend 1 baris changelog di `docs/M11_CHANGELOG.md`.
- Tulisan commit & docs berbahasa Indonesia; ikuti gaya entri CHANGELOG yang ada.
