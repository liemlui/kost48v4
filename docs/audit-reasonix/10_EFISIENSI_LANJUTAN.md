# 10 — EFISIENSI TOKEN LANJUTAN (FASE 6) — Spec Eksekusi untuk AI Lemah

> **Dibuat:** 4 Juli 2026 (pasca Fase 1 E1-E5 selesai, skor 35→~71).
> **Tujuan Fase 6:** skor ~71 → **~85** + diet dokumen (docs = porsi besar token orientasi tiap sesi).
> **Semua baseline di bawah DIUKUR ULANG 4 Jul 2026** — bukan angka lama dari `09_EFISIENSI_TOKEN.md`.

---

## BASELINE & TARGET (diukur 4 Jul 2026)

| # | Metrik | Baseline | Target | Task |
|---|--------|----------|--------|------|
| 1 | File FE pakai `toLocaleDateString`/`toLocaleTimeString` | **40 file** | ≤ 5 (sisanya format kustom) | E7 |
| 2 | File FE pakai `.toLocaleString(` (campur angka/tanggal) | 21 file | info saja — angka non-uang BOLEH tetap | E7 |
| 3 | `frontend/src/types/index.ts` | **848 baris**, 1 file, TANPA section markers | pecah per domain + re-export | E8 |
| 4 | File >400 baris tanpa header tujuan | **69 file** | 0 | E9 |
| 5 | `as any` backend (non-generated) | **672** | < 400 | E10 |
| 6 | `: any` backend (non-generated) | 252 | < 200 | E10 |
| 7 | File FE dengan >5 `style={{` | **16 file** | ≤ 8 (print layout dikecualikan) | E11 |
| 8 | `docs/M11_CHANGELOG.md` | **1.468 baris** | ≤ 200 (sisa diarsip) | E13 |
| 9 | `docs/audit-reasonix/00_INDEX.md` | ~230 baris | ≤ 140 (fase selesai dirangkas) | E13 |

**Cara ukur ulang:** setelah E6 selesai → `node scripts/token-efficiency-report.mjs` (satu perintah, semua metrik keluar).

---

## ⛔ ATURAN WAJIB UNTUK AI EKSEKUTOR (baca sebelum sentuh kode)

1. **Gate tiap task** (tidak boleh dilewati):
   - Backend disentuh → `cd backend; npx tsc --noEmit` harus PASS.
   - Frontend disentuh → `cd frontend; npm run build` harus PASS.
2. **1 task = 1 commit.** Pesan commit bahasa Indonesia, sebut ID task (mis. `feat(efisiensi): E7 unifikasi format tanggal FE`).
3. **DILARANG memecah file monolit stateful** (risiko regresi, keputusan owner):
   `TicketsPage.tsx` · `StaysPage.tsx` · `AccountingSetupPage.tsx` · `MyStayPage.tsx` (komponen `ActiveStayContent`) · `payment-submissions.service.ts` · `stays.service.ts` · `auto-ops.service.ts` · semua `accounting/*.service.ts`. Section markers di file-file itu SUDAH cukup.
4. **DILARANG mengubah perilaku runtime.** Fase 6 = komentar, format, tipe, pemindahan file type-only, dokumen. Kalau suatu langkah memaksa ubah logika → STOP, tulis di kolom Catatan `00_INDEX.md`.
5. **DILARANG menghapus kode/file** tanpa persetujuan owner (E12 = laporan saja).
6. **DILARANG menyentuh** `backend/src/generated/*` (hasil `prisma generate`) dan `frontend/src/styles/11-public-pages.bak.css`.
7. Kalau task tidak selesai/ragu → centang JANGAN dipaksa; isi kolom Catatan dengan alasan.

---

## E6 — Script Pengukur Otomatis (1 jam, risiko nol)

**Tujuan:** satu perintah untuk mengukur semua metrik Fase 6, dipakai sebagai gate objektif sebelum/sesudah tiap task.

**Langkah:**
1. Buat file `scripts/token-efficiency-report.mjs` (folder `scripts/` sudah ada di root) — copy-paste persis:

```js
#!/usr/bin/env node
// FILE: token-efficiency-report.mjs — ukur metrik efisiensi token AI (Fase 6 audit-reasonix)
// Pakai: node scripts/token-efficiency-report.mjs  (jalankan dari root repo)
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const SKIP = /generated|node_modules|\.bak\./;
const walk = (dir, out = []) => {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (SKIP.test(p)) continue;
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(name)) out.push(p);
  }
  return out;
};
const count = (src, re) => (src.match(re) || []).length;

const stats = {};
const big = [], noHeader = [], inlineStyle = [], dateRaw = [], toLocaleAll = [];
for (const [key, root] of [['backend', 'backend/src'], ['frontend', 'frontend/src']]) {
  const s = (stats[key] = { files: 0, lines: 0, anyColon: 0, anyCast: 0 });
  for (const f of walk(root)) {
    const src = readFileSync(f, 'utf8');
    const lines = src.split('\n').length;
    s.files++; s.lines += lines;
    s.anyColon += count(src, /: any\b/g);
    s.anyCast += count(src, /as any\b/g);
    if (lines > 500) big.push([lines, f]);
    if (lines > 400 && !/^(\/\/|\/\*).*—/.test(src.split('\n')[0])) noHeader.push(f);
    if (key === 'frontend') {
      if (/\.toLocale(Date|Time)String\(/.test(src)) dateRaw.push(f);
      if (/\.toLocaleString\(/.test(src)) toLocaleAll.push(f);
      const n = count(src, /style=\{\{/g);
      if (n > 5) inlineStyle.push([n, f]);
    }
  }
}

console.log('=== TOKEN EFFICIENCY REPORT ===');
for (const [key, s] of Object.entries(stats)) {
  console.log(`${key}: ${s.files} file / ${s.lines} baris · ": any"=${s.anyColon} · "as any"=${s.anyCast}`);
}
console.log(`\n[E9] File >400 baris tanpa header tujuan: ${noHeader.length}`);
noHeader.slice(0, 15).forEach((f) => console.log(`  ${f}`));
console.log(`\n[E7] File FE toLocaleDateString/TimeString: ${dateRaw.length}`);
dateRaw.slice(0, 25).forEach((f) => console.log(`  ${f}`));
console.log(`[E7-info] File FE .toLocaleString( (angka non-uang boleh): ${toLocaleAll.length}`);
console.log(`\n[E11] File FE inline style >5: ${inlineStyle.length}`);
inlineStyle.sort((a, b) => b[0] - a[0]).forEach(([n, f]) => console.log(`  ${n}x  ${f}`));
console.log(`\n[info] File >500 baris: ${big.length} (JANGAN dipecah — cukup section markers)`);
big.sort((a, b) => b[0] - a[0]).slice(0, 10).forEach(([n, f]) => console.log(`  ${n}  ${f}`));
```

2. Tambah npm script di `package.json` root (kalau ada) ATAU cukup dokumentasikan perintah `node scripts/token-efficiency-report.mjs`.

**Gate:** script jalan dari root repo tanpa error dan angkanya ±sama dengan tabel BASELINE di atas.

---

## E7 — Unifikasi Format Tanggal FE (2 jam)

**Tujuan:** 40 file FE memformat tanggal mentah dengan `toLocaleDateString`/`toLocaleTimeString`. Util shared SUDAH ADA di `frontend/src/utils/dateTime.ts` — tinggal dipakai.

**Cari targetnya:**
```bash
grep -rn "toLocaleDateString\|toLocaleTimeString" frontend/src --include="*.tsx" --include="*.ts" | grep -v "utils/dateTime"
```

**Tabel penggantian (resep):**

| Pola lama | Ganti dengan | Import dari `utils/dateTime` |
|-----------|--------------|------------------------------|
| `x.toLocaleDateString('id-ID', {...})` / `new Date(x).toLocaleDateString(...)` | `formatDateOnly(x)` | `formatDateOnly` |
| `x.toLocaleString('id-ID')` di mana `x` adalah **Date/tanggal** | `formatDateTimeWib(x)` | `formatDateTimeWib` |
| `x.toLocaleTimeString(...)` | `formatClockWib(x)` | `formatClockWib` |
| `angka.toLocaleString('id-ID')` untuk **angka non-uang** (kWh, jumlah, persen) | **BIARKAN** — di luar scope | — |
| Format kustom yang util tidak bisa (mis. `weekday: 'long'`) | **BIARKAN** + catat di Catatan | — |

**Contoh SEBELUM/SESUDAH:**
```tsx
// ❌ SEBELUM
<span>{new Date(inv.dueDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
// ✅ SESUDAH
import { formatDateOnly } from '../../utils/dateTime'; // sesuaikan kedalaman path
<span>{formatDateOnly(inv.dueDate)}</span>
```

Catatan: `formatDateOnly`/`formatDateTimeWib` sudah aman terhadap `null`/invalid (pakai `parseDateTimeSafe`) — guard `isNaN` manual di sekitarnya boleh disederhanakan HANYA kalau yakin, kalau ragu biarkan.

**Kerjakan bertahap:** 10 file per batch → build → commit. Jangan 40 file sekaligus.

**Gate:** `cd frontend; npm run build` PASS · `node scripts/token-efficiency-report.mjs` → `[E7]` ≤ 5.

---

## E8 — Pecah `frontend/src/types/index.ts` per Domain (2 jam)

**Tujuan:** 848 baris type dalam 1 file (tanpa section markers!). Dipecah per domain sehingga AI yang butuh type invoice tidak ikut membaca type ticket. **Type-only = nol risiko runtime.**

**Langkah:**
1. Baca `frontend/src/types/index.ts`, kelompokkan interface/type/enum per domain. Perkiraan domain: `auth`, `room`, `stay`, `invoice`, `payment`, `ticket`, `notification`, `meter`, `misc` — sesuaikan dengan isi nyata.
2. Buat file `frontend/src/types/<domain>.ts`, **pindahkan blok apa adanya** (jangan edit isi type).
3. Isi `frontend/src/types/index.ts` diganti hanya baris re-export:
   ```ts
   // FILE: types/index.ts — barrel re-export type per domain (path import lama tetap valid)
   export * from './auth';
   export * from './room';
   // ... dst
   ```
4. **JANGAN ubah satu pun file lain** — semua import `from '../types'` tetap jalan.
5. Kalau ada nama bentrok antar domain (duplicate export) → tsc akan menolak; pindahkan type bentrok ke satu file yang paling relevan.

**JANGAN** lakukan hal yang sama ke `frontend/src/api/accounting-types.ts` (810 baris tapi satu domain — sudah benar).

**Gate:** `cd frontend; npx tsc --noEmit` PASS · `npm run build` PASS.

---

## E9 — Header Tujuan 1 Baris di File >400 Baris (1,5 jam, risiko nol)

**Tujuan:** 69 file >400 baris. AI yang membuka file langsung tahu tujuan file dari baris pertama tanpa scroll — melengkapi `CODEMAP.md` (level modul) dan section markers E1 (level fungsi).

**Cari targetnya:** jalankan `node scripts/token-efficiency-report.mjs` → daftar `[E9]`.

**Format (baris PERTAMA file, sebelum import):**
```ts
// FILE: payment-submissions.service.ts — verifikasi bukti bayar tenant → posting jurnal + update invoice (JALUR UANG)
```
Aturan isi: 1 kalimat bahasa Indonesia, sebut tanggung jawab utama; tambah `(JALUR UANG)` untuk modul finance/accounting/invoice/payment. Wajib pakai karakter `—` (em-dash) karena script E6 mendeteksi header dari pola itu.

**Gate:** `node scripts/token-efficiency-report.mjs` → `[E9]` = 0 · tsc backend + build FE PASS (komentar tidak mungkin gagal, tapi tetap jalankan).

---

## E10 — Kurangi `as any` Backend: 672 → <400 (4 jam)

**Tujuan:** `as any` mematikan type-checking → AI harus baca lebih banyak konteks untuk paham bentuk data. Modul akuntansi sudah dibersihkan (E4); sisanya tersebar.

**Prioritaskan file terburuk:**
```bash
grep -rc "as any" backend/src --include="*.ts" | grep -v generated | awk -F: '$2>5' | sort -t: -k2 -rn
```

**Resep per pola (dari pengalaman E4):**

| Pola | Ganti dengan |
|------|--------------|
| `(this.prisma as any).namaModel.` | `this.prisma.namaModel.` — Prisma client sudah typed. Kalau model "tidak ada", jalankan `cd backend; npx prisma generate` dulu |
| `catch (e: any)` → `e.message` | `catch (e)` + `e instanceof Error ? e.message : String(e)` |
| `as any` untuk objek JSON dinamis | `as Record<string, unknown>` + guard runtime (pola M10 Fase 4) |
| `(req as any).user` | Ikuti tipe yang dipakai controller lain (cari `AuthenticatedRequest` / decorator `@CurrentUser` yang sudah ada) |
| `as any` yang tidak jelas | **BIARKAN** + lanjut — target <400, bukan 0 |

**Scope guard:** modul **jalur uang** (`payment-submissions`, `accounting/*`, `invoices`, `invoice-payments`, `deposit-ledger`, `finance`) hanya boleh pola baris 1 tabel (mekanis prisma) — pola lain di modul itu DILARANG untuk AI lemah.

**Kerjakan per modul → tsc → commit.**

**Gate:** `cd backend; npx tsc --noEmit` PASS · report `"as any"` backend < 400.

---

## E11 — Inline Style Batch 2 (2 jam)

**Tujuan:** sisa 16 file dengan >5 `style={{` (E3 sudah menggarap batch terburuk). Target ≤ 8 file.

**Cari targetnya:** `node scripts/token-efficiency-report.mjs` → daftar `[E11]`.

**Aturan:**
- **KECUALIKAN** `InvoicePrintLayout.tsx` dan komponen print lain — inline style di layout cetak memang disengaja.
- Pindahkan ke file CSS per area yang SUDAH ADA di `frontend/src/styles/` (`05-staff.css`, `06-tenant.css`, `08-admin.css`, `09-finance.css`, dst) — ikuti pola class hasil E3.
- Style yang nilainya **dinamis** (dihitung dari props/state, mis. `width: \`${pct}%\``) BIARKAN inline — hanya style statis yang dipindah.

**Gate:** `cd frontend; npm run build` PASS · report `[E11]` ≤ 8 · spot-check visual 2 halaman yang diubah.

---

## E12 — Laporan Dead-Code — REPORT ONLY (1 jam)

**Tujuan:** temukan export/file yang tidak terpakai. **DILARANG MENGHAPUS APA PUN** — hasil hanya ditulis jadi laporan untuk keputusan owner.

**Langkah:**
1. Jalankan (boleh gagal salah satu, pakai yang jalan):
   ```bash
   cd frontend; npx ts-prune -p tsconfig.json 2>&1 | head -100
   cd backend;  npx ts-prune -p tsconfig.json 2>&1 | head -100
   ```
2. Tulis hasil ke `docs/audit-reasonix/11_DEAD_CODE.md` dengan header:
   > **REPORT ONLY — jangan hapus tanpa persetujuan owner.** ts-prune banyak false positive: re-export barrel, class NestJS yang di-DI via module, komponen yang dipakai router dinamis.
3. Kelompokkan: (a) kandidat kuat (util/helper tidak diimport siapa pun), (b) ragu (module/DI/router), (c) false positive jelas.

**Gate:** file laporan ada; TIDAK ada file kode yang berubah (`git status` hanya menunjukkan file .md baru).

---

## E13 — Diet Dokumen (2 jam)

**Tujuan:** dokumen yang dibaca AI tiap sesi harus ramping; detail historis → arsip. Prinsip yang sama dengan pemisahan M10/M11 (2026-06-19).

**E13a — Rangkas `00_INDEX.md` (fase 100% selesai):**
1. Pindahkan tabel detail FASE 1 (E1-E5), FASE 2 (C1-C6), FASE 3 (H1-H15) **apa adanya** ke file baru `docs/archieve/AUDIT_REASONIX_DETAIL_FASE1-3.md`.
2. Di `00_INDEX.md`, ganti masing-masing dengan 1 baris:
   `### FASE 1 — ✅ SELESAI 100% (5/5, 7 Jul) — detail: docs/archieve/AUDIT_REASONIX_DETAIL_FASE1-3.md`
3. Fase 4/5 JANGAN dirangkas dulu (masih ada task terbuka).

**E13b — Arsip `docs/M11_CHANGELOG.md`:**
1. Pertahankan header + entri terbaru sampai ±200 baris (potong di batas entri utuh, jangan potong tengah entri).
2. Sisanya pindah ke `docs/archieve/M11_CHANGELOG_ARSIP_S1_2026.md`.
3. Tambah 1 baris di bawah header M11: `> Entri lama (≤ 2026-06-xx) diarsip ke docs/archieve/M11_CHANGELOG_ARSIP_S1_2026.md`.

**E13c — Arsip file temuan 01-08 (BERSYARAT — cek dulu):**
- HANYA boleh setelah SEMUA temuan terbuka selesai (saat spec ini ditulis: M28, M29, M31, L22; M24/L19 tampak selesai per changelog 4 Jul — verifikasi dulu di kode).
- Kalau syarat belum terpenuhi → SKIP, tulis di Catatan `00_INDEX.md`.

**Gate:** tidak ada link putus — `grep -rn "AUDIT_REASONIX_DETAIL\|M11_CHANGELOG_ARSIP" docs/` menemukan target yang benar-benar ada · `docs/M11_CHANGELOG.md` ≤ 200 baris · `00_INDEX.md` ≤ 140 baris.

---

## URUTAN PENGERJAAN & ESTIMASI

| Urutan | Task | Estimasi | Risiko | Perkiraan skor |
|:---:|------|----------|--------|:---:|
| 1 | E6 script ukur | 1 jam | nol | +0 (alat) |
| 2 | E7 tanggal | 2 jam | rendah | +4 |
| 3 | E8 split types | 2 jam | rendah | +3 |
| 4 | E9 header file | 1,5 jam | nol | +2 |
| 5 | E11 inline style | 2 jam | rendah | +2 |
| 6 | E10 as any | 4 jam | sedang | +3 |
| 7 | E12 dead-code report | 1 jam | nol | +0 (input owner) |
| 8 | E13 diet dokumen | 2 jam | rendah | (hemat docs, di luar skor kode) |
| | **TOTAL** | **±15,5 jam** | | **~71 → ~85** |

Selesai per task → centang tabel FASE 6 di `00_INDEX.md` + prepend 1 baris di `docs/M11_CHANGELOG.md`.
