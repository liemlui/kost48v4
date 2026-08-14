# M16 — Audit Menyeluruh KOST48 V5

> **Status:** ✅ SELESAI · **Auditor:** Reasonix
> **Tanggal:** 30 Juli 2026 · **Cakupan:** lintas 46 modul backend + frontend + cross-cutting concern.
> **Sumber keputusan:** `M02_KEPUTUSAN_OWNER.md` tetap lebih tinggi daripada dokumen ini.
> **Hasil ringkas:** tidak ada temuan HIGH/kritis; 1 temuan minor (I-01) sudah diperbaiki pada commit `610395c`.

Dokumen ini merangkum audit statis menyeluruh terhadap kode KOST48 V5 (backend NestJS+Prisma 46 modul, frontend React+Vite). Audit sebelumnya yang sudah terliput di dokumen lain tidak diulang di sini — dokumen ini fokus pada hasil pengecekan ulang lintas scope dan temuan baru.

---

## 1. Ringkasan Eksekutif

| Area | Hasil | Keputusan |
|---|---|---|
| Build & typecheck | 🟢 backend `tsc --noEmit` clean · frontend `npm run build` 162 chunks + PWA verified | Lulus |
| Unit test backend | 🟢 74/74 pass (6 suite) | Lulus |
| Unit test frontend | 🟢 135/135 pass (31 file) | Lulus |
| Keamanan (authz/secrets/SQLi) | 🟢 solid — default-deny global, no secret hardcode, raw query terparameterisasi | Sehat |
| Atomisitas keuangan | 🟢 best-effort journal sudah BLOCKING (AN-03), WiFi sale + deposit ledger atomik | Sehat |
| Race condition | 🟡 1 minor (I-01) — sudah diperbaiki | Sehat |
| Frontend | 🟢 tidak ada anti-pattern hooks-order tersisa (AO-02 fixed) | Sehat |

### Putusan

Codebase **matang dan siap produksi** dari sisi kode inti. Sisa pekerjaan pra-go-live adalah infrastruktur owner (Fase A) dan eksekusi UI/UX Fase AO yang belum tuntas (AO-03/AO-13/AO-14/AO-17..AO-23) — keduanya bukan defect kode.

---

## 2. Cakupan & Metode

- **Baseline:** `tsc --noEmit` (backend), `npm run build` (frontend + stamp PWA), `npm run test:unit` (backend), `npx vitest run` (frontend).
- **Keamanan:** pemetaan guard global, audit `@Public()`, rate limit, verifikasi HMAC IoT, upload file, raw query/SQLi, hardcoded secrets.
- **Keuangan & atomisitas:** audit `.catch()` best-effort (33 titik), pattern journal posting, financial lock.
- **Race & transaksi:** lock `FOR UPDATE`, validasi di dalam/di luar `$transaction`.
- **Frontend:** urutan hooks, error handling, a11y.
- **Verifikasi nyata:** tiap kesimpulan ditelusuri ke file/simbol kode, bukan klaim dokumen.

Tingkat kepastian: `CODE` (dikonfirmasi dari implementasi), `VERIFY` (dijalankan via command build/test).

---

## 3. Temuan

### 3.1 Keamanan — 🟢 solid

| # | Area | Bukti | Status |
|---|---|---|---|
| S-01 | Default-deny global | `app.module.ts` memakai `APP_GUARD` `JwtAuthGuard` + `RolesGuard`; semua endpoint butuh JWT kecuali `@Public()` | ✅ |
| S-02 | `@Public()` hanya endpoint disengaja | login/refresh/logout/reset, katalog publik, FAQ, IoT ingest, booking publik, cron token | ✅ |
| S-03 | Rate limit | auth 15 menit `failClosed`, refresh/logout 20/mnt, cron + availability PIN ketat | ✅ |
| S-04 | IoT device ingest | water-ingest pakai HMAC signature + rawBody + nonce; cron pakai `timingSafeEqual` token header | ✅ |
| S-05 | Upload file | `ParseFilePipe` + `FileTypeValidator` (jpg/png/webp) + `MaxFileSizeValidator` (2–3 MB) | ✅ |
| S-06 | SQL injection | seluruh `$queryRaw`/`$queryRawUnsafe` terparameterisasi atau escaped (`accounting-schema.guard` escape `""`); tidak ada interpolasi user input mentah | ✅ |
| S-07 | Hardcoded secrets | 0 ditemukan di `backend/src` & `frontend/src` | ✅ |
| S-08 | Production guard | `JWT_SECRET` ≥32 char + `CORS_ORIGIN` wajib, app menolak start bila lemah | ✅ |
| S-09 | Security headers | CSP, HSTS (prod), `X-Frame-Options: DENY`, `nosniff`, `Permissions-Policy` | ✅ |

### 3.2 Keuangan & atomisitas — 🟢 sudah diperbaiki

- **AN-03 terverifikasi:** seluruh `.catch()` pada posting journal sudah dihapus → BLOCKING (throw, rollback tx). Contoh nyata `wifi-sales.service.ts` memakai `postWifiSaleTx(tx, …)` di dalam `$transaction`.
- **Deposit ledger blocking** (`payment-submissions.service.ts`): deposit diterima wajib tercatat di ledger, tanpa recovery path.
- **Financial lock WiFi sale** (`assertWifiSaleJournalAllowsChange`): data terjurnal tidak boleh diubah/dihapus senyap.
- **33 titik `.catch()` tersisa** = pattern side-effect/notification yang BENAR untuk best-effort (notifikasi, cleanup KTP, advisory unlock, deepseek text). Tidak ada yang menyangkut integritas finansial.

### 3.3 Race & transaksi — 🟡 1 minor (sudah fix)

| ID | Temuan | Severity | Status |
|---|---|---|---|
| I-01 | `validateMovement` (inventory-movements) membaca `qtyOnHand` di luar `$transaction` — TOCTOU pada pesan error saja | LOW | ✅ diperbaiki commit `610395c` — validasi dipindah ke dalam tx memakai baris yang sudah `FOR UPDATE` |
| O-02 | `assertNoActiveWork` (staff-routines) dulunya di luar tx | LOW | ✅ sudah fix — kini dipanggil di dalam `$transaction` dengan `tx` sebagai client |

Catatan: invariant `stok tidak boleh negatif` selalu dijaga `ensureInventoryQtySyncedTx` di dalam tx, sehingga I-01 tidak pernah menjadi bug integritas data — hanya pesan error yang bisa basi.

### 3.4 Frontend — 🟢 sehat

- AO-02 (urutan hooks `MyLoyaltyPage`) sudah diperbaiki di commit `567e9f2`.
- Tidak ada anti-pattern top-level `return` sebelum hooks tersisa; semua early-return yang dicek berada di dalam callback/handler.
- Error handling via TanStack Query konsisten.

---

## 4. Bukan Defect (terdokumentasi terpisah)

- **Fase A (Pra-Go-Live):** blocked owner — server/domain/env.
- **Fase AO sisa:** `AO-03` (fixture/kredensial UAT non-personal), `AO-13` (crawl regresi OWNER/ADMIN/STAFF), `AO-14` (re-audit final), `AO-17..AO-23` (eksekusi UI/UX dashboard publik/Owner/Admin). Detail: `docs/M14_AUDIT_UI_UX.md`. `AO-03`/`AO-13` memerlukan kredensial/data UAT dari owner.

---

## 5. Kesimpulan

- **Risk rating: 🟢 LOW** — 0 HIGH, 0 MEDIUM terbuka, 1 LOW (sudah fix).
- Kode inti siap produksi; bukti release menunggu gate infrastruktur (Fase A) dan crawl UAT (AO-03/AO-13/AO-14).
