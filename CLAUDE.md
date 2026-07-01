# KOST48 Surabaya V5 — Panduan Sesi (jaga file ini <3 KB)

Sistem manajemen kost 48 kamar. Backend NestJS+Prisma+PostgreSQL (`backend/`), frontend React+Vite (`frontend/`). Bahasa kerja: Indonesia.

## Pintu masuk docs (M-file — JANGAN baca semua)
1. **`docs/M01_MASTER.md`** — blueprint + ground state + router AI (arsip `_PETA_AI` di `docs/archieve/`).
2. **`docs/M02_KEPUTUSAN_OWNER.md`** — 84 keputusan owner (SUMBER KEBENARAN sebelum ubah flow).
3. **`docs/M10_CHECKLIST_CHANGELOG.md`** — **CHECKLIST AKTIF + antrian eksekusi AI** (baca ANTRIAN, jangan ulang fase selesai). Changelog historis → `docs/M11_CHANGELOG.md`.
4. **`docs/CODEMAP.md`** — peta modul→path→tanggung jawab + index model + anchor flow. Pakai INI dulu untuk navigasi kode (hemat token), baru Grep simbol.
5. Domain: **M04** keuangan · **M05** siklus huni · **M06** operasional · **M07** publik/marketing · **M08** deploy · **M09** audit · **M12** AI Owner/Admin.
6. Gate uang: **`docs/M04_KEUANGAN.md`** (verifikasi TB) — WAJIB tiap task finance.

Detail forensik 97 temuan & rencana lama sudah DIBUBARKAN ke dossier; arsip di `docs/archieve/_DEPRECATED_*`. **JANGAN baca** (token bomb): `docs/archieve/*`, `*_STALE.md`, `node_modules`, `reference/*` (buku.md 2.2MB + PDF 5.7MB), `backend/src/generated/*` (Prisma generated, regen via `prisma generate`).

## Konsep yang sering salah
- Tidak ada model `Booking` — satu `Stay` mewakili booking→huni→selesai (promoted = `initialMetersPromotedAt` terisi).
- **DP** (`downPayment*`, 30% sewa, hangus) ≠ **deposit jaminan** (`deposit*`, refundable, dari `Room.defaultDepositRupiah`, SELALU tetap).
- Tanpa denda keterlambatan. Notifikasi in-app (menuju PWA push). Role: OWNER/ADMIN/STAFF/TENANT.
- AI/DeepSeek berbayar = **manual button only**, OWNER/ADMIN saja, AI membuat draft/rekomendasi; manusia tetap approve. Detail Fase G: `docs/M12_AI_OWNER_ADMIN.md`.
- **Lokasi: Jl. Hikmah V No. 48, Surabaya Barat (Pakuwon/PTC)** — bukan Ngagel (koreksi D-01).
- **Belum publish (DB = data testing); 1 staf; tenant = pengawas kualitas staf; bayar tunai+transfer.** (lihat `M02_KEPUTUSAN_OWNER`)

## Perintah
- Backend check: `cd backend; npx tsc --noEmit` · run: `npm run start:dev` (API `http://localhost:3000/api`)
- Frontend build: `cd frontend; npm run build` · dev: `npm run dev`
- DB UAT: postgres port 5433 `kost48_v3_pro`; produksi 5432 `kost48_v3`. Jangan mutasi DB produksi.

## Aturan kerja hemat token
- Navigasi kode: `docs/CODEMAP.md` dulu → lalu Grep simbol di `backend/src` / `frontend/src`. Spesifikasi task → `M10` ANTRIAN + M-file domain.
- Selesai task: centang `M10` + prepend 1 baris changelog di `docs/M11_CHANGELOG.md`. **Syarat tambahan:** test terkait PASS, kode diverifikasi nyata (bukan hanya klaim dokumen).
- Tulisan commit & docs berbahasa Indonesia; ikuti gaya entri CHANGELOG yang ada.

## Aturan efisiensi sesi (cache & /new)
- **Prefix system prompt + CLAUDE.md + tool definitions di-cache DeepSeek.** Turn 2+ dalam sesi yang sama = cache HIT (hemat ~80% prefix). Tiap `/new` = cache MISS (prefix ~8K token diproses ulang).
- **Sesi optimal: 5-15 turn.** Di atas ~20 turn, akumulasi konteks percakapan mulai boros dan memperlambat respons.
- **AI WAJIB rekomendasikan `/new`** bila: (a) topik berubah total (mis. keuangan→UI), (b) sudah >20 turn, (c) user mulai koreksi berulang tanda konteks jenuh. Format rekomendasi: "💡 Sesi sudah 18 turn dan topik berubah dari X ke Y. Pertimbangkan `/new` untuk reset cache + konteks bersih."
- **Jangan `/new` untuk tugas sepele** (1-3 turn, edit kecil) — cache MISS lebih mahal daripada melanjutkan.
- **Pola ideal:** satu sesi = satu "episode" (1-3 task terkait). Pagi: `/new`→orientasi+eksekusi, siang: `/new`→lanjut, sore: `/new`→review+tutup.

## Konvensi Versi (WAJIB diikuti AI)
- File tunggal: `frontend/src/config/version.ts` — konstanta `APP_VERSION`, `APP_PHASE`, `APP_BUILD_DATE`.
- Juga update `frontend/public/version.json` dengan nilai yang sama (dipakai PWA update check).
- Format: `MAJOR.MINOR.PATCH` — contoh `1.0.0` → `1.1.0` (fitur baru) → `1.1.1` (bugfix).
- **PATCH** (+0.0.1): perbaikan bug, tweak tampilan, teks, performa minor.
- **MINOR** (+0.1.0): fitur baru yang dirasakan pengguna (modul baru, flow baru, halaman baru).
- **MAJOR** (+1.0.0): perubahan besar / redesign / breaking change (jarang).
- AI **HANYA** naikkan versi saat owner **eksplisit minta** ("bump versi", "naikkan versi", "update versi").
- Setelah bump: update `APP_BUILD_DATE` ke tanggal hari ini (format `YYYY-MM-DD`), update `APP_PHASE` bila relevan.
- PWA: setiap build ulang (`npm run build`) otomatis dapat `BUILD_ID` baru via `stamp-pwa-build.mjs` — tidak perlu aksi manual; versi di footer terpisah dari build ID internal.

## Peta scope pengembangan
- **`docs/PETA_SCOPE.md`** — pemetaan tugas berdasarkan ROLE (OWNER/ADMIN/STAFF/TENANT/PUBLIC) dan FLOW BISNIS (booking→huni→bayar→checkout→akuntansi). Pakai ini untuk langsung lompat ke file yang tepat saat mengerjakan fitur untuk role atau flow tertentu.
