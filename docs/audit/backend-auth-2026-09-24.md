# Audit Ulang BE-002 — Backend Auth

- Status: audit statis selesai dengan temuan terbuka
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

## Tindak lanjut

- Perbaikan T6 perlu claim token atomik di dalam transaksi, misalnya conditional update `usedAt IS NULL` dengan jumlah baris tepat satu atau row lock, lalu test dua request konkuren.
- Perbaikan T7 perlu re-check/claim token yang menyertakan `revokedAt IS NULL` dalam transaksi rotasi dan test interleaving logout–refresh.
- Perubahan source auth adalah task terpisah; laporan ini tidak memberi izin implementasi atau deployment.

## Delta

- Implementasi lokal: tidak ada perubahan source, DB, schema, dependency, atau konfigurasi.
- Dokumentasi: laporan BE-002 dibuat dan indeks/status audit diselaraskan.
- Verifikasi lokal: inspeksi statis dan review diff docs; test/build tidak dijalankan.
- Deployment/dampak runtime: tidak dilakukan dan belum diukur.
