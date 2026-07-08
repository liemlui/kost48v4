# M18 — Celah Peningkatan (Review 9 Jul 2026)

> **Sumber:** Review otomatis commit `656eee9` (OCR KTP G5+) + audit luas codebase oleh Reasonix (DeepSeek V4 Pro).
> **Tujuan:** Task detail siap eksekusi model ringan (Flash) — tiap task = 1 commit, Bahasa Indonesia.
> **Build saat review:** Backend ✅ | Frontend ✅ (136 chunks, 1370+ test PASS)

---

## Format Eksekusi (AI Eksekutor)

1. Baca task → pahami file target → `read_file` → `edit_file`.
2. 1 task = 1 commit (Bahasa Indonesia).
3. Gate: `npm --prefix backend run build` · `npm --prefix frontend run build`.
4. Centang `[x]` + tambah 1 baris changelog di `docs/M13_CHANGELOG.md`.
5. JANGAN tambah npm dep baru. JANGAN `git push`. JANGAN sentuh file milik AI lain.

---

## 🔴 PRIORITAS P0 — Race Condition & Keamanan

### P0-01 — Fix race condition refresh token rotation

**File:** `backend/src/auth/auth.service.ts`
**Fungsi target:** `rotateRefreshToken()` atau method yang menangani refresh token (sekitar baris 139-163).

**Masalah:** Delete token lama → create token baru **tanpa Prisma `$transaction`**. Dua request concurrent dengan token sama bisa:
1. Keduanya lolos validasi (token belum dihapus saat dicek).
2. Keduanya delete token lama (delete kedua `.catch(() => {})` silent).
3. Keduanya create **dua token baru** → session ganda untuk 1 pengguna.

**Aksi:**
1. Bungkus operasi delete + create dalam `prisma.$transaction(async (tx) => { ... })`.
2. Gunakan `tx.refreshToken.delete(...)` dan `tx.refreshToken.create(...)` di dalam transaksi.
3. Selain delete, tambahkan `findUnique` di dalam transaksi untuk verifikasi token masih ada (single-use enforcement).
4. Jika token sudah tidak ada (dihapus request concurrent), lempar error yang jelas → client tahu token sudah dipakai.

**Verifikasi:** Backend build PASS.

---

## 🟡 PRIORITAS P1 — PDP & Integritas Data

### P1-01 — Mask NIK di tampilan UI KTP OCR

**File:** `frontend/src/components/ai/KtpOcrValidateCard.tsx`
**Lokasi:** Sekitar baris 241, lihat `<li>NIK OCR: <strong>{result.result.extracted.nik ?? '—'}</strong> (mask)</li>`

**Masalah:** NIK 16-digit ditampilkan penuh meskipun label `(mask)`. Fungsi `maskNik()` sudah ada di `backend/src/modules/owner-ai/owner-ai.helpers.ts` tetapi tidak dipanggil.

**Aksi:**
1. Cari fungsi `maskNik` di backend atau buat versi frontend sederhana: `nik.replace(/(\d{6})\d{7}(\d{3})/, '$1*******$2')`.
2. Panggil fungsi mask tersebut di `KtpOcrValidateCard.tsx` sebelum render NIK.
3. Pastikan NIK unmasked tetap tersimpan di state untuk dikirim ke backend (hanya TAMPILAN yang dimask).

**Verifikasi:** Frontend build PASS. Buka halaman verifikasi KTP → NIK tampil masked (contoh: `327301*******003`).

### P1-02 — Tambah UNIQUE constraint di `identityNumber` tenant

**File:** `backend/prisma/schema.prisma`
**Model:** `Tenant`

**Masalah:** `saveKtpData` cek `findFirst` untuk NIK duplikat, tapi tanpa constraint database. Dua request concurrent bisa insert NIK sama.

**Aksi:**
1. Tambahkan `@unique` pada field `identityNumber` di model `Tenant`:
   ```prisma
   identityNumber String? @unique @db.VarChar(30)
   ```
2. `npm --prefix backend run prisma:generate` untuk regenerasi client.
3. Di `tenants.service.ts`, tangkap error `P2002` (unique constraint violation) dan kembalikan pesan error yang jelas: "NIK sudah terdaftar di tenant lain."
4. Push DB dev: `npx prisma db push` (hati-hati — pastikan tidak ada NIK duplikat di DB dev dulu).

**Verifikasi:** Backend build PASS. Coba insert tenant dengan NIK sama → error jelas, bukan crash.

### P1-03 — Jangan overwrite field tenant yang sudah terisi di `saveKtpData`

**File:** `backend/src/modules/tenants/tenants.service.ts`
**Fungsi target:** `saveKtpData()` (sekitar baris 107-120)

**Masalah:** `saveKtpData` menulis `gender`, `birthDate`, `originCity`, dll **tanpa cek** apakah field sudah berisi. Admin re-save OCR data bisa menghapus edit manual tenant.

**Aksi:**
1. Cari fungsi `enrichTenantFromKtp()` di file yang sama (sekitar baris 145+) — fungsi ini sudah punya pola yang benar: **hanya isi field yang null/undefined**.
2. Ubah `saveKtpData()` mengikuti pola yang sama: untuk setiap field, gunakan `??` atau cek `existing[field] ?? newValue` sebelum update.
3. Atau: tambahkan parameter `overwrite: boolean` default `false`, dan hanya timpa jika `overwrite = true` (guna di masa depan jika diperlukan).

**Verifikasi:** Backend build PASS. Test: tenant sudah punya `birthDate` → panggil `saveKtpData` → `birthDate` tetap, tidak berubah.

---

## 🟡 PRIORITAS P2 — Robustness

### P2-01 — Fix silent error di `handleSaveKtpData` FE

**File:** `frontend/src/components/ai/KtpOcrValidateCard.tsx`
**Lokasi:** Sekitar baris 171-175, blok `catch { // ignore }`

**Masalah:** Semua error (network timeout, server 500, duplicate) ditelan tanpa feedback. User tidak tahu kalau save gagal.

**Aksi:**
1. Di dalam blok `catch`, tangkap `error` dan periksa:
   - Jika response status 409 (duplicate) → tampilkan toast "Data KTP sudah tersimpan sebelumnya" (info, bukan error).
   - Jika error lain → tampilkan toast error dengan pesan dari `getApiErrorMessage(error)` atau fallback "Gagal menyimpan data KTP. Coba lagi."
2. Import fungsi toast dari project (cari `useToast` atau `toast` di codebase).
3. Log error ke console untuk debugging: `console.error('[saveKtpData]', error)`.

**Verifikasi:** Frontend build PASS. Simulasi gagal → toast muncul, bukan silent.

### P2-02 — Tambah DTO validasi untuk endpoint `PATCH /tenants/:id/ktp-data`

**File:** 
- `backend/src/modules/tenants/dto/save-ktp-data.dto.ts` (FILE BARU)
- `backend/src/modules/tenants/tenants.controller.ts`

**Masalah:** Endpoint terima `@Body()` mentah tanpa validasi `class-validator`.

**Aksi:**
1. Buat file DTO baru:
   ```typescript
   import { IsOptional, IsString, IsDateString, IsIn } from 'class-validator';

   export class SaveKtpDataDto {
     @IsOptional() @IsString() nik?: string;
     @IsOptional() @IsString() namaLengkap?: string;
     @IsOptional() @IsString() @IsIn(['L', 'P']) gender?: string;
     @IsOptional() @IsDateString() birthDate?: string;
     @IsOptional() @IsString() birthPlace?: string;
     @IsOptional() @IsString() originCity?: string;
     @IsOptional() @IsString() province?: string;
     @IsOptional() @IsString() rawOcrText?: string;
   }
   ```
2. Di controller (`tenants.controller.ts`), ganti `@Body() body: any` dengan `@Body() dto: SaveKtpDataDto`.
3. Pastikan `ValidationPipe` global aktif (sudah ada di `main.ts`).

**Verifikasi:** Backend build PASS. Kirim `birthDate: "bukan-tanggal"` → error 400 validasi.

---

## 🟡 PRIORITAS P2 — Test Coverage

### P2-03 — Unit test untuk `parseKtpText()` (FE)

**File:** `frontend/src/utils/ktpOcr.ts`
**Test file baru:** `frontend/src/test/utils/ktpOcr.test.ts`

**Fungsi yang perlu ditest:**
1. `parseKtpText()` — input teks OCR mentah, output `{ nik, nama, ... }`.
2. Fungsi ekstraktor individual: `extractNik()`, `extractNama()`, `extractTtl()`, `extractAlamat()`, `extractProvinsi()`.

**Test minimal (3-5 case):**
- KTP standar (NIK 16 digit, nama jelas, alamat lengkap).
- KTP dengan karakter corrupt (O → 0, l → 1).
- KTP dengan baris pecah / whitespace tidak rapi.
- Input kosong → return null/undefined untuk tiap field.
- NIK dengan format tidak valid (kurang dari 16 digit).

**Verifikasi:** `npm --prefix frontend run test -- --run` atau `npx vitest run`.

### P2-04 — Unit test untuk `parseNikDemographics()` (BE)

**File:** `backend/src/modules/owner-ai/owner-ai.helpers.ts`
**Test file baru:** `backend/test/unit/ocr-helpers.test.js`

**Fungsi yang perlu ditest:**
1. `parseNikDemographics()` — dari NIK 16 digit → `{ gender, birthDate, originCity }`.
2. `cleanOcrText()` — normalisasi whitespace, koreksi O→0, l→1, gabung baris pecah.
3. `maskNik()` — dari NIK 16 digit → format `327301*******003`.
4. `extractNameFromOcr()` — ekstrak nama dari teks OCR.
5. `isDeterministicResultSolid()` — cek apakah NIK+nama cocok tanpa butuh AI.

**Test minimal (3-5 case per fungsi):**
- NIK laki-laki (digit ke-7 = 1) → gender `L`.
- NIK perempuan (digit ke-7 = 2) → gender `P`.
- NIK Surabaya (2 digit awal `3578`) → originCity `Surabaya`.
- Teks OCR dengan banyak whitespace → `cleanOcrText` bersihkan.
- Teks OCR dengan karakter `O` → dikoreksi jadi `0`.
- `isDeterministicResultSolid` → true saat NIK+nama cocok.

**Verifikasi:** `node --test "test/unit/ocr-helpers.test.js"`.

### P2-05 — Unit test untuk `preprocessImage()` (FE)

**File:** `frontend/src/utils/ocrPreprocess.ts`
**Test file baru:** `frontend/src/test/utils/ocrPreprocess.test.ts`

**Fungsi target:** `preprocessImage()`.

**Test minimal (2-3 case):**
- Input canvas kecil → tidak crash, return base64 string.
- Input canvas besar → resize terjadi, dimensi ≤ maxWidth/maxHeight.

**Verifikasi:** `npx vitest run src/test/utils/ocrPreprocess.test.ts`.

---

## 🔵 PRIORITAS P3 — Observability

### P3-01 — Tambah logging di silent catches

**File + lokasi:**

| File | Baris (sekitar) | Pola |
|------|-----------------|------|
| `backend/src/auth/auth.service.ts` | 119, 124 | `.catch(() => {})` |
| `backend/src/modules/payment-submissions/payment-submissions.service.ts` | 1020, 1022, 1509 | `.catch(() => {})` |
| `backend/src/modules/auto-ops/auto-ops.service.ts` | 140 | `.catch(() => undefined)` |
| `frontend/src/context/AuthContext.tsx` | 62 | `.catch(() => { // silent })` |

**Aksi:**
1. Untuk backend: ganti `.catch(() => {})` dengan `.catch((e) => logger.warn('Deskripsi operasi gagal', { error: e?.message ?? e }))`.
   - Cari pola `logger` yang sudah ada di file tersebut (biasanya `private readonly logger = new Logger(XxxService.name)`).
   - Jika belum ada logger, tambahkan di constructor.
2. Untuk frontend: ganti `// silent` dengan `console.warn('[Auth] Logout fetch failed:', e)`.

**Verifikasi:** Build backend + frontend PASS. Tidak mengubah perilaku, hanya menambah log.

---

## 🔵 PRIORITAS P3 — Error Boundary

### P3-02 — Tambah error boundary per fitur kritis

**File baru:** `frontend/src/components/common/FeatureErrorBoundary.tsx`
**Halaman target (prioritas):**
- `frontend/src/pages/tickets/TicketsPage.tsx` (1,333 baris)
- `frontend/src/pages/settings/OwnerSettingsPage.tsx` (1,173 baris)
- `frontend/src/pages/portal/MyStayPage.tsx` (905 baris)

**Aksi:**
1. Buat `FeatureErrorBoundary.tsx` — komponen class-based yang:
   - Menangkap error di `componentDidCatch` / `getDerivedStateFromError`.
   - Menampilkan fallback UI: "⚠️ Terjadi kesalahan di bagian ini. [Muat Ulang]" dengan tombol.
   - Props: `fallback?: ReactNode`, `onError?: (error: Error) => void`.
2. Bungkus masing-masing halaman target dengan `<FeatureErrorBoundary>`.
   - Cukup wrap di level return JSX terluar halaman tersebut.
   - Contoh: `<FeatureErrorBoundary><TicketsPage /></FeatureErrorBoundary>` — atau wrap di komponen halaman langsung.
3. Jangan ganti `PwaRouteBoundary` yang sudah ada di root.

**Verifikasi:** Frontend build PASS. Test: lempar error di render → hanya section itu yang fallback, bukan seluruh app.

---

## 📊 Status Ringkas

| ID | Prioritas | Judul | Status |
|----|-----------|-------|--------|
| P0-01 | 🔴 P0 | Race condition refresh token | [x] |
| P1-01 | 🟡 P1 | Mask NIK di UI KTP OCR | [x] |
| P1-02 | 🟡 P1 | Unique constraint \`identityNumber\` | [x] |
| P1-03 | 🟡 P1 | \`saveKtpData\` jangan overwrite field existing | [x] |
| P2-01 | 🟡 P2 | Fix silent error \`handleSaveKtpData\` FE | [x] |
| P2-02 | 🟡 P2 | DTO validasi \`PATCH /tenants/:id/ktp-data\` | [x] |
| P2-03 | 🟡 P2 | Unit test \`parseKtpText()\` FE | [x] |
| P2-04 | 🟡 P2 | Unit test \`parseNikDemographics()\` BE | [x] |
| P2-05 | 🟡 P2 | Unit test \`preprocessImage()\` FE | [x] |
| P3-01 | 🔵 P3 | Logging di silent catches | [x] |
| P3-02 | 🔵 P3 | Error boundary per fitur kritis | [x] |

## 🚦 Urutan Eksekusi yang Disarankan

```
P0-01 → P1-01 → P1-02 → P1-03 → P2-01 → P2-02 → P2-03 → P2-04 → P2-05 → P3-01 → P3-02
```

Setiap task independen dan bisa dikerjakan paralel oleh executor berbeda KECUALI:
- P1-02 dan P1-03 sama-sama sentuh `tenants.service.ts` — kerjakan berurutan.
- P2-03, P2-04, P2-05 hanya bikin file test baru — tidak mengubah kode produksi, bisa paralel.

---

## 📝 Template Changelog

Setelah selesai, tambahkan 1 baris di `docs/M13_CHANGELOG.md`:

```
### <tgl> 2026
- **M18-<ID>** — <judul task>. File: <file utama yang diubah>.
```
