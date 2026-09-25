# Audit Ulang BE-002 — Backend Auth

- Status: audit statis selesai dengan temuan terbuka; **addendum verifikasi 25 Sep 2026** mencatat T6/T7 tertutup secara statis + unit pada source `3f097ef0` (lihat § Addendum verifikasi di bawah)
- Tanggal: 24 September 2026
- Modul/ID: `BE-002` — `backend/src/auth`
- Level audit: K4; level pekerjaan dokumentasi: L
- Owner bisnis/teknis: belum ditetapkan
- Identitas bukti: commit `f63ea93e`; working tree awal hanya memiliki `PROMPT-IMPACT-01.md` untracked dan tidak disentuh
- Sumber: [PETA-KODE](../PETA-KODE.md), [audit FE-002](audit-checklist-total.md#catatan-hasil-dan-checkpoint), dan [template audit modul](../../AI_WORKFLOW_GUIDE.md#121-template-audit-modul)

## Tujuan, invariant, dan batas

Audit ulang ini memisahkan status backend auth dari audit halaman FE-002 tanggal 18 September 2026. Cakupan: login, refresh, logout, `/me`, lupa/reset/ganti password, cookie/token, aktivasi user, rate limit, schema token, dan dua unit regresi sesi. Di luar cakupan: UI auth, konfigurasi nyata produksi, pengiriman Brevo nyata, eksploitasi konkurensi pada PostgreSQL, dan UAT login.

Invariant yang diperiksa:

- user tidak aktif tidak boleh memperoleh atau memakai sesi;
- access token lama harus mati setelah perubahan password;
- refresh token mentah tidak disimpan di DB dan rotasi normal bersifat sekali pakai;
- logout mencabut hanya sesi pada cookie sesuai keputusan owner;
- reset token harus sekali pakai, dan perubahan password serta pencabutan seluruh refresh token harus atomik;
- role efektif berasal dari DB, bukan dipercaya terus dari claim token lama.

## Producer → kontrak → consumer

| Producer | Kontrak | Consumer / bukti |
|---|---|---|
| `AuthController` | `POST /auth/login`, `/refresh`, `/logout`, `/forgot-password`, `/reset-password`, `/change-password`; `GET /auth/me` | frontend auth/client; cookie `kost48_refresh_token` ber-path `/api/auth` |
| `AuthService` | access token 15 menit; refresh token acak 32 byte, hash SHA-256, TTL 7 hari; reset token 30 menit | `JwtStrategy`, tabel `RefreshToken` dan `PasswordResetToken` |
| `JwtStrategy` | verifikasi JWT, user aktif, `passwordChangedAt > pwdAt`, role terbaru dari DB | global `JwtAuthGuard` dan endpoint privat |
| middleware `main.ts` + `RateLimitGuard` | limiter global, auth ketat, refresh/logout 20 per menit | endpoint kredensial publik |

Schema mengunci `RefreshToken.token` dan `PasswordResetToken.token` sebagai unique. Hash source utama: `auth.controller.ts` `46D4EB8AB669`, `auth.service.ts` `FDE7F9EE86AA`, `jwt.strategy.ts` `94FA3ED1F639`, `schema.prisma` `469FED9C680B` (12 karakter awal SHA-256).

## Hasil audit ulang

### Kontrol yang masih berlaku

- Login memakai pesan kredensial seragam, `bcrypt.compare`, pemeriksaan user aktif, dan menulis `lastLoginAt`.
- Access token ditandatangani dengan `JWT_SECRET` wajib, TTL eksplisit 900 detik, serta claim `pwdAt`; strategy membaca ulang user dan role dari DB pada setiap request.
- Refresh token mentah hanya berada di cookie HTTP-only; DB menyimpan SHA-256. Rotasi menghapus token lama dan membuat token baru dalam satu transaksi.
- Reset dan ganti password mengubah hash/`passwordChangedAt` serta mencabut semua refresh token user dalam transaksi yang sama. Ini menutup T1 audit 18 September.
- Logout publik tetap per-sesi, idempoten untuk cookie kosong/tidak dikenal/sudah dicabut, lalu membersihkan cookie. Ini sesuai keputusan owner dan menutup T2 audit 18 September.
- Forgot-password memakai respons generik dan token acak 32 byte dengan TTL 30 menit. Kegagalan pengiriman email tidak membocorkan keberadaan akun.

### Temuan terbuka

> **Status 25 Sep 2026 (addendum):** T6 dan T7 di bawah ini **tertutup secara statis + unit** pada source `3f097ef0`; rincian dan bukti ada di § Addendum verifikasi. Temuan #3 dan #4 tetap terbuka. Teks temuan asli tidak diubah.

1. **TINGGI — BE-002-T6, single-use reset token belum atomik.** `resetPassword()` membaca `usedAt` sebelum transaksi. Di dalam transaksi, `UPDATE "PasswordResetToken" SET "usedAt" = NOW() WHERE token = ...` tidak mensyaratkan `"usedAt" IS NULL`, tidak mengunci baris, dan hasil update tidak diperiksa. Dua request paralel dapat sama-sama melewati pembacaan awal lalu mengganti password secara berurutan dengan token yang sama. Constraint unique pada `token` tidak mencegah race pemakaian. Test `auth-session-revocation.test.js` hanya membuktikan penolakan sekuensial ketika mock sejak awal mengembalikan `usedAt`, bukan dua transaksi konkuren.
2. **SEDANG — BE-002-T7, refresh dapat berlomba dengan logout.** Status `revokedAt` diperiksa sebelum transaksi refresh. Pemeriksaan ulang di dalam transaksi hanya memastikan baris masih ada, bukan memastikan `revokedAt` tetap `null`. Karena logout menandai baris sebagai revoked tanpa menghapusnya, refresh yang sudah membaca token sebelum logout masih berpotensi menghapus baris tersebut dan menerbitkan pasangan token baru. Belum ada test konkurensi atau bukti isolasi/locking DB yang menutup urutan ini.
3. **SEDANG — tidak ada regresi langsung untuk login, refresh, JWT strategy, forgot-password, dan rate limiting.** Dua file test yang ditemukan hanya berisi 10 test untuk pencabutan sesi saat perubahan password dan logout per-sesi. Karena keduanya mengimpor `backend/dist`, hasilnya juga bergantung pada build yang segar; audit ini tidak menjalankan build/test.
4. **RENDAH/operasional — keamanan cookie bergantung pada `NODE_ENV`.** Flag `secure` hanya aktif saat `NODE_ENV === 'production'`. Nilai efektif environment host tidak diperiksa pada audit statis ini; ini bukan klaim defect produksi.

Temuan lama T3–T5 dan T8–T16 dari FE-002 tidak dinilai ulang penuh di sini kecuali bersinggungan langsung dengan invariant di atas. Mereka tetap bukti historis, bukan dianggap tertutup oleh laporan ini.

## Verifikasi dan batas bukti

| Acceptance | Bukti sesi ini | Status |
|---|---|---|
| Kontrak route, token, cookie, aktivasi, dan perubahan password dipetakan | inspeksi source controller/service/strategy/module/DTO, limiter `main.ts`, dan schema | terpenuhi secara statis |
| T1/T2 tetap tertutup pada source sekarang | inspeksi transaksi + dua unit test yang ada | terpenuhi secara statis |
| Reset token aman dari dua request paralel | tidak ada conditional update/row lock/test konkurensi | **belum terpenuhi** |
| Refresh vs logout aman dari race | tidak ada re-check `revokedAt` di transaksi/test konkurensi | **belum terpenuhi** |
| Perilaku runtime/produksi | tidak menjalankan server, DB, Brevo, build, atau UAT | UNKNOWN |

Tidak ada test/build yang dijalankan: pekerjaan ini audit docs/read-only dan bukan task implementasi; unit yang ada menggunakan `dist`, sehingga menjalankannya tanpa build segar tidak memenuhi gate kesegaran. Bukti 92/92 dari 18 September tetap bukti historis untuk source saat itu, bukan PASS baru untuk commit sekarang.

> Catatan 25 Sep 2026: baris "belum terpenuhi" pada tabel di atas menggambarkan kondisi commit `f63ea93e`. Status source saat ini ada di § Addendum verifikasi di bawah.

## Tindak lanjut

- Perbaikan T6 perlu claim token atomik di dalam transaksi, misalnya conditional update `usedAt IS NULL` dengan jumlah baris tepat satu atau row lock, lalu test dua request konkuren.
- Perbaikan T7 perlu re-check/claim token yang menyertakan `revokedAt IS NULL` dalam transaksi rotasi dan test interleaving logout–refresh.
- Perubahan source auth adalah task terpisah; laporan ini tidak memberi izin implementasi atau deployment.

## Addendum verifikasi — 25 September 2026

- Baseline laporan ini: commit `f63ea93e`. Source saat verifikasi: `3f097ef0` (kemudian HEAD bergeser ke `cb98a33e` karena commit docs Z-19 oleh sesi lain — docs-only, berkas source yang diuji tidak berubah).
- Izin: owner (Act mode). Pekerjaan ini docs + verifikasi lokal: **0 perubahan source, schema, dependency, DB, atau server**.
- Working tree saat verifikasi **tidak bersih** karena pekerjaan dokumen task lain (audit Z-19, 25 Sep) yang tidak disentuh; set Z-19 itu lalu di-commit sesi lain sebagai `cb98a33e` (docs-only).

### Delta source sejak laporan

| Berkas | Hash 12 karakter awal saat laporan (`f63ea93e`) | Hash sekarang (`3f097ef0`) | Status |
|---|---|---|---|
| `backend/src/auth/auth.controller.ts` | `46d4eb8ab669` | `702dc50c701e` | **berubah** (commit `6c2b4029`) |
| `backend/src/auth/auth.service.ts` | `fde7f9ee86aa` | `bbb45fd76946` | **berubah** (commit `6c2b4029`) |
| `backend/src/auth/jwt.strategy.ts` | `94fa3ed1f639` | `94fa3ed1f639` | tidak berubah |
| `backend/prisma/schema.prisma` | `469fed9c680b` | `469fed9c680b` | tidak berubah |

### Perbaikan yang dinilai ulang

- **T6 — tertutup secara statis + unit.** `resetPassword()` meng-claim reset token di dalam transaksi memakai `UPDATE "PasswordResetToken" SET "usedAt" = NOW() WHERE token = ... AND "usedAt" IS NULL AND "expiresAt" >= NOW()`, lalu `if (claimed !== 1) throw ...`. Request yang kalah klaim tidak mengganti password dan tidak mencabut sesi.
- **T7 — tertutup secara statis + unit.** Rotasi refresh memakai `tx.refreshToken.deleteMany({ where: { id, revokedAt: null, expiresAt: { gte: new Date() } } })` lalu `if (claimed.count !== 1) throw ...`; logout mencabut lewat `updateMany({ where: { token, revokedAt: null } })`. Refresh yang kalah dari logout tidak menerbitkan pasangan token baru.

### Bukti eksekusi (izin owner, cwd `backend`)

| Command | Keluaran |
|---|---|
| `npm run build` | exit 0 — `clean` → `prisma generate` (v7.8.0) → `tsc -p tsconfig.build.json` → copy `src/generated` ke `dist/generated`; `dist` segar sebelum unit test |
| `node --test test/unit/auth-session-revocation.test.js test/unit/auth-logout-session.test.js` | exit 0 — **tests 12, pass 12, fail 0** (6 + 6 test, termasuk test bernama `T6` dan `T7`), durasi ±30,4 s |

### Batas bukti dan tindak lanjut tersisa

- Unit test memakai Prisma tiruan (klaim dijawab `0`/`1`), jadi yang terbukti adalah **guard kondisional + jalur loser**, **bukan** isolasi/locking dua transaksi Postgres nyata. Interleaving nyata tetap **UNKNOWN** sampai ada test konkurensi dengan DB (mis. UAT port 5433) — butuh izin terpisah.
- Temuan #3 (tidak ada regresi langsung login, refresh, JWT strategy, forgot-password, rate limiting) **ditutup 25 Sep 2026** — lihat § Regresi temuan #3 di bawah; temuan #4 (`secure` cookie bergantung `NODE_ENV`, nilai efektif host tidak diperiksa) tetap RENDAH/operasional.
- Runtime/UAT login, pengiriman Brevo nyata, dan deployment: tidak dijalankan dan tidak diukur.
- Angka 105/105 pada commit `6c2b4029` tetap indikator snapshot agregat, **bukan** bukti per-temuan; addendum ini memakai hasil test **bernama** per temuan.

## Regresi temuan #3 — 25 September 2026

Temuan #3 ("tidak ada regresi langsung untuk login, refresh, JWT strategy, forgot-password, dan rate limiting") ditutup dengan tiga berkas test baru di `backend/test/unit/`:

| Berkas | Cakupan | Jumlah test |
|---|---|---|
| `auth-login-refresh.test.js` | login (kredensial seragam, user nonaktif, claim `sub`/`role`/`pwdAt` + TTL 900 detik, hash refresh token, `lastLoginAt`, jalur nomor HP) dan refresh (kosong/tak dikenal/dicabut/kedaluwarsa, rotasi dengan klaim `revokedAt: null`, `pwdAt` dari DB, hash token baru) | 11 |
| `auth-jwt-forgot.test.js` | `JwtStrategy.validate` (user hilang/nonaktif, token terbit sebelum `passwordChangedAt`, role & tenant dari DB, tanpa kebocoran `passwordHash`) dan `forgotPassword` (respons generik, tanpa token untuk akun tak dikenal/nonaktif, hash SHA-256 + TTL 30 menit, kegagalan email tidak membocorkan status) | 12 |
| `rate-limit-guard.test.js` | `RateLimitGuard` (bucket `login` 10/5 menit, `forgotPassword` 3/10 menit, bucket eksplisit menang atas nama handler, identitas per user vs per IP, store statis bersama) dan `createRateLimiter` (429 + `Retry-After`, pemisahan bucket per IP/nama, pesan khusus) | 8 |

**Bukti eksekusi (izin owner, cwd `backend`):** `npm run build` exit 0, lalu `node --test` atas kelima berkas auth/rate-limit → **tests 43, pass 43, fail 0** (31 test baru + 12 test lama T1–T7), exit 0.

**Catatan proses:** percobaan pertama menjalankan build dan test secara **paralel** menyebabkan 1 berkas lama gagal *load* (`MODULE_NOT_FOUND` dari `dist` yang sedang di-`clean`); dijalankan berurutan hasilnya 43/43. Kegagalan itu **artefak urutan eksekusi**, bukan cacat kode.

**Tetap UNKNOWN:** perilaku runtime di host produksi, nilai efektif `NODE_ENV` (cookie `secure`), pengiriman Brevo nyata, dan konkurensi nyata pada PostgreSQL.

## Verifikasi DB nyata T6/T7 — 25 Sep 2026 (izin owner `AKSES-UAT-25SEP`)

Berkas baru: `backend/test/integration/auth-concurrency.test.js` — dijalankan hanya dengan `KOST48_UAT_CONCURRENCY_TEST=1`, menolak `NODE_ENV=production`, menolak `DATABASE_URL` yang bukan bertanda UAT (`:5433`), memakai fixture unik, dan menyapu sisa fixture di hook `after`. Bukti eksekusi: cwd `backend`, DB UAT `:5433` (host dan kredensial tidak dicetak).

| Uji | Hasil | Detail |
|---|---|---|
| **T7-DB** (refresh vs logout, 3 putaran, dua pool koneksi terpisah) | **LULUS** | logout tetap idempoten; setelah balapan token lama selalu mati; pemenang refresh menghapus baris lama dan menyisakan tepat satu token baru; pihak yang kalah tidak menerbitkan token |
| **T6-DB** (dua `resetPassword` paralel) | **GAGAL** | **kedua** request ditolak 401 pada langkah klaim (`claimed !== 1`) — bukan race yang bocor |

### Defect baru: BE-002-T6B — klaim/cek kedaluwarsa reset token bergantung zona waktu DB (TINGGI)

`resetPassword()` menjalankan `UPDATE "PasswordResetToken" SET "usedAt" = NOW() WHERE ... AND "expiresAt" >= NOW()`. Kolom `expiresAt` adalah `timestamp` tanpa zona yang diisi Prisma dalam **UTC**, sedangkan `NOW()` mengembalikan **timestamptz** yang dibaca dalam zona waktu sesi. Pada UAT (`TimeZone = Asia/Bangkok`, +7):

- `expiresAt` (UTC, +60 detik) vs `NOW()` → `ge_now = false` → klaim **0 baris** → 401.
- `expiresAt` vs `(NOW() AT TIME ZONE 'UTC')` → `ge_now_utc = true` → klaim **1 baris**.
- Probe langsung: `CLAIM_WITH_NOW=0`, `CLAIM_WITH_NOW_UTC=1`.

Konsekuensi: pada DB dengan zona waktu sesi ≠ UTC, **alur reset password tidak dapat diselesaikan** (selalu 401 "Token reset tidak valid, sudah digunakan, atau kedaluwarsa"), sementara langkah forgot-password tetap mengirim email — pengguna terjebak tanpa bisa mengubah password. Status T6 pada addendum di atas (**"tertutup secara statis + unit"**) **tidak berlaku pada runtime**: unit test memakai Prisma tiruan sehingga perbedaan tipe/zona waktu tidak tertangkap. Produksi belum diperiksa (UNKNOWN) — mekanisme ini lingkungan-dependent, jadi hasilnya bergantung zona waktu sesi DB produksi; UAT menunjukkan UTC+7.

### Temuan sekunder dari pola `NOW()` (belum diperbaiki)

1. `forgotPassword()` — `DELETE FROM "PasswordResetToken" WHERE "userId" = X OR "expiresAt" < NOW()`: dengan offset +7, token yang **belum** kedaluwarsa pun dianggap kedaluwarsa, sehingga satu permintaan forgot-password **menghapus token reset milik user lain**.
2. `reminder-preview.service.ts:98-99` — `s."expiresAt" > NOW()` dan `<= NOW() + INTERVAL`: jendela pengingat bergeser sebesar offset zona waktu DB.
3. Penulisan `NOW()` ke kolom `timestamp` (`passwordChangedAt`/`updatedAt` di `auth.service.ts:414-415`, `:454-455`; `createdAt`/`updatedAt` pada `INSERT` raw di `tenant-bookings.service.ts:152`, `public-bookings.service.ts:324-325`) menyimpan **waktu lokal**, bukan UTC — bercampur dengan baris yang ditulis Prisma.

### Batas bukti verifikasi ini

- Bukti runtime hanya pada **UAT**; produksi tidak diperiksa dan tidak disentuh. Fixture test dihapus (sapuan `after` melaporkan 1 sisa dibersihkan dari run yang gagal).
- Perbaikan defect adalah **task terpisah** dengan uji regresi; laporan ini tidak memberi izin implementasi. Test integrasi dipertahankan **merah** sebagai regresi sampai defect diperbaiki.

## Delta

- Implementasi lokal: tidak ada perubahan source, DB, schema, dependency, atau konfigurasi (berlaku untuk 24 Sep maupun addendum 25 Sep).
- Dokumentasi: laporan BE-002 dibuat dan indeks/status audit diselaraskan (24 Sep); addendum verifikasi 25 Sep ditambahkan tanpa menghapus temuan awal.
- Verifikasi lokal: **24 Sep** — inspeksi statis dan review diff docs, test/build tidak dijalankan. **25 Sep (addendum)** — `npm run build` exit 0 + 12/12 unit test lulus (lihat § Addendum verifikasi).
- Deployment/dampak runtime: tidak dilakukan dan belum diukur pada kedua tanggal.
