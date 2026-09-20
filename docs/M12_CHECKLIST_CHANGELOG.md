# KOST48 V5 — Checklist Eksekusi Aktif

> Versi aktif: **2026-09-20** | Changelog → `docs/M13_CHANGELOG.md` | Temuan tata dokumen → [M16 §0](M16_AUDIT_MENYELURUH.md#0-audit-dokumentasi-dan-urutan-kerja--8-september-2026) | Ledger fase lama tetap di bawah.

## Cara Pakai (AI Eksekutor — baca sebelum coding)

Protokol tetap untuk AI mana pun. Kerjakan urut; jangan lompat.

1. **Orientasi (5 menit):** `CLAUDE.md` → file ini (antrean di bawah) → `docs/M01_MASTER.md`. Task EF: `docs/M19_EFISIENSI_HOSTING_512MB.md` §9. Task AO: `docs/M14_AUDIT_UI_UX.md`.
2. **Cek repo:** `git status --short` lalu `git log --oneline -5`. `M`/`??` = kerja yang BELUM di-commit — jangan di-reset, di-stash, atau ditimpa.
3. **Pilih SATU task `[ ]`** dari [Antrean Prioritas Aktif](#antrean-prioritas-aktif) yang tidak BLOCKED. Selesaikan tuntas sebelum task berikutnya. **Jangan mengulang `[x]`.**
4. **Anchor kode:** [M00](M00_CODEMAP.md) → [peta audit per cabang](audit-map/README.md) → satu leaf/simbol, lalu grep source terkait. Hindari memuat seluruh peta ke konteks. Satu task = satu commit terarah **hanya bila owner mengizinkan commit**.
5. **Larangan tanpa izin terpisah:** apps/libs/worker/app Nest baru; npm dependency; bump versi; mutasi DB; restart/deploy/cron/canary; reset/stash; push. Jangan membuat data test untuk eksplorasi.
6. **Selesai task:** `[x]` + tanggal di file ini, entri `docs/M13_CHANGELOG.md`. Empat status: **implementasi lokal**, **verifikasi lokal** (sebut tsc/build/test/UAT), **deployment**, **dampak terukur**. Docs-only = konsistensi/link/diff, tanpa build. Task uang: `npm run test:unit` backend + gate M04.
7. **DB:** UAT postgres **5433** `kost48_v3_pro`. Reset/reseed = mutasi, bukan orientasi. Identitas DB produksi = M19, bukan asumsi.

| Marker | Arti |
|--------|------|
| 🧑 / [OWNER] | Butuh data/keputusan owner; lanjutkan kerja independen yang sudah diizinkan |
| 🧬 / [SCHEMA] | Migration additive — approval owner dulu |
| **Gate:** | Verifikasi wajib sebelum `[x]` |

> Aturan operasional umum kini di [AGENTS.md](../AGENTS.md); M12 tetap mengatur antrean, urutan, dan gate tugas.
> Dashboard: [AI_MASTER.md](../AI_MASTER.md); exception gate uang tetap memakai full test+build melalui `pretest:unit` dan gate M04.
## Daftar Isi

1. [Antrean prioritas aktif](#antrean-prioritas-aktif) — satu-satunya urutan eksekusi
2. [Status kerja aktif](#status-kerja-aktif)
3. [Peta rujukan dokumen](#peta-rujukan-dokumen)
4. [Efisiensi sesi & versi](#efisiensi-sesi--bump-versi)
5. [Ledger historis](#ledger-historis-checkbox-fase) — riwayat + checkbox fase
6. [Riwayat fase](#riwayat-fase-bukan-antrean--jangan-dikerjakan-ulang)

<a id="antrean-prioritas-aktif"></a>
<a id="antrian-eksekusi-aktif"></a>

### 🎯 Antrean Prioritas Aktif (2026-09-20)

| # | Task | Status | Prasyarat untuk mulai |
|---|------|--------|----------------------|
| 1 | Onboarding 13 hunian + verifikasi KTP | 🧑 **Owner manual** | Data owner: bulan masuk, meter kWh, deposit |
| 2 | Opening balance produksi | 🧑 **Owner manual** | Angka kas + bank per cutover |
| 3 | Cron AutoOps di cPanel | 🧑 **Owner manual** | Login cPanel, `AUTO_OPS_CRON_TOKEN` ada |
| 4 | Ganti password OWNER + PIN owner | 🧑 **Owner manual** | Login OWNER, cPanel env |
| 5 | Audit modul 2 (register di manifest dulu) | 🤖 **AI** | Wrapper `verify-module.mjs` siap |
| 6 | Deploy commit lokal ke produksi | 🤖🧑 **AI + Owner** | Akses server, `npm run make-deploy` |
| 7 | Uji 2 jalur wrapper (`verify-module.mjs`) | 🤖 **AI** | File test kosong / rename node_modules |
| 8 | Tata ulang penomoran (Opsi C — pindah 4 file `docs/` ke subfolder: GO_LIVE, CHECKLIST_AUDIT, AUDIT_UIUX, FORM_GO_LIVE) | 🤖 **AI** | Sesi fresh, ~30 menit |

**Sisa lama (referensi — belum selesai):** direkonstruksi dari git (`e96d032`); baris lama #1 sudah tercakup item 1–4 di atas.

1. EF-00 sisa — identitas artefak + pengukuran runtime
2. Sisa Fase AO — AO-13 crawl + AO-14 sign-off
3. EF-02 — baseline workload host
4. EF-07 → EF-04/06/08 — env/kontrak/lifecycle
5. AL — rekonsiliasi H1-H15, Z-19 verifikasi manual
6. EF-09 + Fase MA — worker CLI + batas modul (ditunda)

> Aturan prioritas: kerjakan task teratas yang prasyaratnya terpenuhi dan lingkupnya sudah diizinkan. Bila teratas BLOCKED, lanjutkan pekerjaan independen yang sudah diizinkan. Tabel ini tidak memberi izin baru.

## Status Kerja Aktif

- [x] **FIX-AUDIT-FE-003 (T1 — form booking tamu hanya lolos bila telepon DAN email diisi) — 18 Sep 2026:** payload booking publik tidak lagi dikirim dengan field opsional bernilai `""`. Penyusunan payload dipindah ke fungsi murni `buildBookingPayload()` di `frontend/src/pages/bookings/guestBookingUtils.ts` (email hanya disertakan bila berisi; honeypot `website` tetap `""`), aturan klien disamakan dengan kontrak backend — **telepon wajib, email opsional** — dan label `GuestBookingForm.tsx` diperbaiki ("Telepon *" / "Email (opsional)"). Dasar bukti: `CreatePublicBookingDto.phone` wajib + `public-bookings.service.ts:73–80` menolak nomor kosong, sedangkan `@IsOptional() @IsEmail()` **tidak** melewati `""`. **Implementasi lokal:** selesai. **Verifikasi lokal:** `npx tsc -b` exit 0 · `vitest` target `guestBookingValidation` + `guestBookingPayload` **15/15 lulus** · suite FE penuh **34 file/161 test lulus** (exit 0) · `npm run build` exit 0 (build `FBxovSZhHngz`, PWA verify passed) · skrip `.audit-runtime/audit-fe003-dto-check.mjs` (payload nyata vs `class-validator` backend) 8 kasus + 2 kontrol → **SEMUA EKSPEKTASI TERPENUHI** (exit 0). **Deployment:** belum (produksi client `BZ-Vpsd9eLX1` 17 Sep). **Dampak terukur:** belum; kanal booking publik produksi masih OFF (`PUBLIC_ONLINE_BOOKING_ENABLED=false`).
- [x] **FIX-AUDIT-FE-003 (T2 — booking portal TENANT tak dapat di-approve/ditolak) — 18 Sep 2026:** predikat review disatukan lewat helper baru `backend/src/modules/tenant-bookings/booking-source.helper.ts` (`isReviewableBookingSource` = `WEBSITE` ∪ `PORTAL`) dan dipakai di `approveBooking` (`tenant-bookings.service.ts:250`), `rejectBooking` (`:529`), serta riwayat booking tenant `findMine` (`:863`, fragmen dipakai ulang di `:914` dan `:927`). Booking yang dibuat tenant dari portal (`LeadSource.PORTAL`) tidak lagi buntu 409, dan stay batal ber-sumber portal kembali tampil di daftar "booking saya". Tanpa perubahan schema, uang/DP/deposit, jurnal, atau status Room. **Implementasi lokal:** selesai. **Verifikasi lokal:** `npx tsc --noEmit --incremental false` exit 0 · `npm run build` exit 0 · `npm run test:unit` **96/96 lulus** termasuk unit baru `backend/test/unit/booking-source.test.js`. **Deployment/dampak runtime:** belum; UAT approve booking portal nyata di DB 5433 memerlukan izin tersendiri. Sisa temuan FE-003 (6 SEDANG + 3 advisory, sebagian milik BE-047/BE-017) tetap terbuka.
- [x] **AUDIT-FE-003 (bookings pages, K4) — 18 Sep 2026:** unit ketiga rangkaian **halaman** — `frontend/src/pages/bookings` (**6 file: `BookingPage.tsx` 412 baris, `GuestBookingForm.tsx` 630, `GuestBookingPage.tsx` 230, `GuestBookingRoomSummary.tsx` 150, `GuestBookingSuccess.tsx` 176, `guestBookingUtils.ts` 137 — total 1.735**) beserta kontrak backend `tenant-bookings` (public/tenant/admin booking), `marketing-public-rooms.service.ts`, dan `payment-policy.helper.ts`. **Perkakas:** `.audit-runtime/audit-fe003-bookings.mjs` (inventaris rute/endpoint/uang/PII/honeypot/zona waktu/kode mati/a11y/cakupan test) + `.audit-runtime/audit-fe003-dto-check.mjs` (**menjalankan payload nyata halaman terhadap `class-validator` milik backend**, bukan sekadar membaca DTO); audit kontrak backend oleh **2 subagent terpisah** (auditor = subagent, reviewer = sesi ini). **Read-only:** tanpa perubahan kode; snapshot working tree `6022ce9` bersih untuk kedua direktori. **Kontrak terpenuhi:** rute `/booking/:roomId` publik tanpa guard + terdaftar `isPublicNavigation` (`public/sw.js:140`), `/portal/booking/:roomId` `RequireRoles(['TENANT'])` + `TenantBookingRouteGuard`, `/portal/bookings` TENANT; **uang DP 30% identik FE↔BE** — `Math.round((baseRent+surcharge)×0,30)` (`GuestBookingForm.tsx:158–165`) ≡ `roundRupiah(agreedRent×30/100)` dengan `agreedRent = baseRent + surcharge` (`public-bookings.service.ts:248–273`), tabel multiplier/pembulatan/surcharge/batas D-24 **sama persis** (`utils/pricing.ts` ↔ `pricing.helper.ts`), deposit jaminan + hewan di luar DP pada kedua sisi dan nominal layar = nominal sah D-02 (`payment-policy.helper.ts:93–108`); backend publik ber-rate-limit 5/10 mnt/IP + `$transaction`/`FOR UPDATE` + Room tidak diubah saat booking (D-11) + audit log tanpa NIK; OCR KTP tetap lokal (AI-PDP). **Temuan 2 TINGGI:** (T1) **form tamu hanya berhasil bila telepon DAN email diisi** meski UI/validasi klien menulis "minimal salah satu" — payload mengirim `""` untuk field kosong (`GuestBookingPage.tsx:84–92`) sedangkan `@IsOptional()` tidak melewati `""` dan `phone` wajib ber-`@Matches` (`create-public-booking.dto.ts:18–26`); dibuktikan dengan menjalankan `class-validator`: phone-only → 400 "email must be an email", email-only → 400 "Format nomor telepon tidak valid", dan `disableErrorMessages` di produksi (`main.ts:92`) menyembunyikan sebabnya. (T2) **booking portal tenant tidak dapat di-approve/reject admin** — `createBooking` menulis `LeadSource.PORTAL` (`tenant-bookings.service.ts:150`, hasil P2-01 6 Jul 2026 di M12:938) sedangkan approve **dan** reject mewajibkan `WEBSITE` (`:247`, `:525`) dan antrean admin menyaring `WEBSITE` (`stayPredicates.ts:14–23`, `dashboardShared.tsx:167–184`) → booking tak pernah masuk antrean, tanpa invoice, disapu CANCELLED 3 jam, riwayatnya hilang dari `/tenant/bookings/my` (`:899,912`). **8 temuan SEDANG sisi FE** (tautan `/katalog` mati dan berakhir di `/login`; `todayString()` UTC + cutoff 21:00 WIB tak disurfacekan; honeypot mati di jalur UI; kebijakan duplikasi portal≠publik; cabang `RESERVED`/`MAINTENANCE` mati + kamar maintenance berlabel "Penuh/Terisi"; NIK penuh di ringkasan + input file KTP tidak dapat difokus keyboard; `limit:500` dipotong backend ke 100; `expiresAt` tampil tanggal saja padahal batas 3 jam) + **6 temuan SEDANG kontrak backend** (NIK duplikat/P2002, race duplikasi Tenant, enumerasi PII + akun otomatis tanpa verifikasi, NIK tak divalidasi backend, filter `pricingTerm` hanya di klien, `plannedCheckOutDate` tak terikat term) + **10 advisory** (7 FE + 3 kontrak) + **4 temuan lintas unit**; satu kandidat temuan (nominal LUNAS FE vs nilai tersimpan) **gugur** setelah verifikasi ulang `payment-policy.helper.ts` dan komposisi invoice approve. Hasil lengkap: [CHECKLIST_AUDIT_TOTAL tabel hasil](CHECKLIST_AUDIT_TOTAL.md#catatan-hasil-dan-checkpoint). **Cakupan audit total: Frontend 17/67** (3 halaman + 11 shared + 3 static). **Belum terbukti runtime:** tidak ada tangkapan layar e2e untuk `/booking/:roomId`, jalur 400 T1, dan env produksi (`PUBLIC_ONLINE_BOOKING_ENABLED`, `BOOKING_REVIEW_DEADLINE_HOURS`) belum diperiksa. **Tindak lanjut yang diusulkan (belum dikerjakan):** (i) FIX T1 — DTO `email` menerima `""` **atau** FE berhenti mengirim string kosong; (ii) FIX T2 — samakan predikat/guard review dengan `PORTAL` **atau** kembalikan sumber booking portal ke `WEBSITE`; keduanya menyentuh uang/akses sehingga menunggu keputusan owner sebelum implementasi. Unit berikutnya menurut urutan checklist adalah **FE-004 dashboard (K3)**.

- [x] **FIX-AUDIT-FE-002 (lupa password) — 18 Sep 2026:** menghapus kontrak dan UI `resetTokenPreview` yang tidak pernah dikembalikan backend. Pesan sukses kini netral: tidak lagi menyatakan email pasti terkirim, tetapi menjelaskan instruksi hanya dikirim bila akun/email aktif. Ditambah regresi yang memastikan preview tidak dirender. **Verifikasi:** `npx.cmd vitest run src/test/pages/forgotPasswordPage.test.tsx src/test/pages/loginPage.test.tsx` → **2 file, 6/6 lulus**. Warning `controlId` React Bootstrap dan future flag React Router tidak menggagalkan suite. **Deployment/dampak runtime:** belum dilakukan/diukur.

- [x] **FIX-AUDIT-FE-002 (redirect sesi aktif) — 18 Sep 2026:** menutup temuan halaman login: pengguna dengan sesi yang sudah tervalidasi tidak lagi melihat form `/login`, tetapi langsung diarahkan ke `state.from` yang disediakan `ProtectedRoute` atau rute default berdasarkan role. Ditambah regresi OWNER → `/owner-dashboard`; kondisi `loading` tetap menahan redirect hingga autentikasi selesai. **Implementasi lokal:** selesai. **Verifikasi:** Vitest target dipanggil tetapi runner hanya mengembalikan banner tanpa ringkasan; belum diklaim lulus. **Deployment/dampak runtime:** belum dilakukan/diukur.

- [x] **FIX-AUDIT-FE-002 (pencabutan sesi T1/T2) — 18 Sep 2026:** menutup **dua temuan TINGGI** audit FE-002 pada `backend/src/auth`. **T1:** `resetPassword` & `changePassword` dulu hanya `UPDATE "User"` (+ tandai token reset terpakai) sehingga refresh token tetap bisa menukar access token baru sampai **7 hari** meski password sudah diganti (`pwdAt` hanya mematikan access token). Kini penggantian hash **dan** `revokeRefreshTokens(userId)` berjalan dalam **satu `$transaction`** → pencabutan atomik, tanpa celah antara "password berubah" dan "token lama mati". `revokeRefreshTokens` menerima klien transaksi opsional (`Pick<Prisma.TransactionClient,'refreshToken'>`) sehingga jalur logout tidak berubah. **T2:** cabang "revoke ALL" di route logout dihapus karena **kode mati** (route `@Public()` ⇒ `req.user` tak pernah terisi) dan membuat perilaku logout tampak bisa global; **keputusan owner: Keluar tetap per-sesi**, jadi perilaku pengguna tidak berubah — hanya kodenya kini jujur, dengan komentar alasan `@Public()` + arahan endpoint terpisah bila kelak butuh "keluar dari semua perangkat". **Implementasi lokal:** selesai (`auth.service.ts`, `auth.controller.ts`, 2 berkas test baru). **Verifikasi:** `npx tsc --noEmit --incremental false` exit 0; `npm run build` exit 0; `node --test "test/unit/**/*.test.js"` → **92/92 lulus, 0 gagal** (6 suite), termasuk **10 regresi baru** — `auth-session-revocation.test.js` (T1a–T1e) & `auth-logout-session.test.js` (T2a–T2e). **Deployment/dampak runtime:** belum di-deploy, belum ada UAT; efek setelah deploy = sesi lain milik user yang sama terputus saat ia mengganti/reset password (perilaku keamanan yang diinginkan). Sisa temuan FE-002 (T3–T16 + temuan FE lain) tetap terbuka.

- [x] **FIX-AUDIT-FE-002 (reset password) — 18 Sep 2026:** menutup temuan UI auth dari audit FE-002: token reset kini input `password` dengan `autocomplete="off"`, kedua password memakai `autocomplete="new-password"`, token kosong ditolak sebelum API dipanggil, dan timer redirect sukses dibersihkan saat halaman unmount. Tombol submit juga terkunci setelah sukses agar token sekali-pakai tidak dikirim ulang. Ditambah `resetPasswordPage.test.tsx` (masking/autocomplete + token kosong). **Implementasi lokal:** selesai. **Verifikasi:** `git diff --check` lulus; Vitest target dijalankan tetapi runner tidak mengembalikan ringkasan pada sesi ini, jadi belum diklaim lulus. **Deployment/dampak runtime:** belum dilakukan/diukur.

- [x] **REVIEW-AI-AKTIF-001 (review perubahan aktif) — 18 Sep 2026:** review defensif terhadap perubahan aktif lain. `/cek` dan `/okupansi` diverifikasi sebagai halaman publik yang memang diminta owner; akses dan tautannya dipertahankan. Review juga memeriksa perubahan reset-password (pencabutan refresh token atomik) dan paket deploy (penghapusan seed historis/PII): tidak ditemukan kerusakan kontrak; migration `20260818` ada di bootstrap. **Verifikasi:** typecheck frontend dan backend selesai tanpa diagnostik; `git diff --check` lulus. **Deployment/dampak runtime:** belum dilakukan/diukur.

- [x] **FIX-AUDIT-FE-057 (sesi antar-tab & cache) — 18 Sep 2026:** tindak lanjut mendalam FE-057. `AuthProvider` mendengarkan perubahan `kost48_access_token` di tab lain: cache user, pesan booking tenant, dan query cache dibersihkan; logout tab lain segera mengosongkan state tab ini, sedangkan token baru masuk kembali ke alur hidrasi `/auth/me`. Cache user kini memvalidasi seluruh field kontrak `AuthUser`, bukan hanya empat field awal, sebelum dipakai sebagai cache sementara. Regresi logout lintas-tab ditambah. **Implementasi lokal:** selesai. **Verifikasi:** `git diff --check` lulus; suite auth dijalankan ulang tetapi runner tidak mengembalikan ringkasan hasil pada sesi ini, sehingga tidak diklaim lulus ulang. **Deployment/dampak runtime:** belum dilakukan/diukur.

- [x] **AUDIT-FE-002 (auth pages, K4) — 18 Sep 2026:** unit kedua rangkaian **halaman** — `frontend/src/pages/auth` (**3 file: `LoginPage.tsx` 238 baris, `ForgotPasswordPage.tsx` 292, `ResetPasswordPage.tsx` 101**) + `PasswordInput`, `api/auth.ts`, `client.ts`, `AuthContext`, rute/PWA-SW, dan **kontrak backend `backend/src/auth`** (service 564 baris, `jwt.strategy.ts`, 5 DTO, `rate-limit.guard.ts`, `main.ts`). **Bukan pengulangan FE-057** (unit itu context/sesi; di sini halaman auth + kontrak token end-to-end). **Kontrak terpenuhi:** 3 rute auth publik tanpa guard + eager import, 3/3 terdaftar `isPublicNavigation` (`public/sw.js:133–141`); `ProtectedRoute.tsx:18` satu-satunya pengirim `state.from` → bukan open redirect; pesan login seragam (`auth.service.ts:39,47,52`); bcrypt cost 10; access token 900 s + `pwdAt` mematikan token lama (`jwt.strategy.ts:26–31`); refresh token SHA-256 + rotasi transaksional single-use (`:125–174`); rate limit berlapis; token reset SHA-256 + 30 menit + sekali pakai; bundle produksi `/api` **relatif** sehingga cookie `sameSite:'strict'` + `path /api/auth` sah pada artefak yang disajikan; E2E login UI dipakai crawl 6 role. **Temuan 2 TINGGI:** (T1) **reset & change password tidak mencabut refresh token** — `auth.service.ts:381–395`/`:423–429` hanya `UPDATE "User"`; satu-satunya pemanggil `revokeRefreshTokens` = `auth.controller.ts:61` → token curian tetap dapat menukar access token sampai **7 hari** pasca reset (`pwdAt` hanya mematikan access token). (T2) **jalur "revoke ALL" mati** — logout `@Public()` + `@CurrentUser() user?` (`auth.controller.ts:54–61`) dan guard publik tidak menetapkan `req.user` → cabang `if (user)` tak pernah benar, `revokeRefreshTokens(userId)` (`:195–198`) tak pernah jalan ⇒ tidak ada global logout. **Sedang:** `isActive` login dead code (`:449,486`); timing enumerasi (bcrypt hanya bila user ada); forgot-password `success:true` walau Brevo kosong (`:506`→`:331`) padahal UI menulis "Email terkirim!"; TOCTOU single-use token reset (`:357`,`:390–394`); re-check refresh tanpa `revokedAt` (`:127–133`); `refresh` tanpa `RateLimitGuard`; bucket limit dari **nama method** (`rate-limit.guard.ts:87`); limiter in-memory (Passenger bisa 2 proses). **Rendah:** `secure` cookie dari `NODE_ENV`; **drift kontrak** `resetTokenPreview/expiresAt/channel/destination/userId` tak pernah dikembalikan service (0 kemunculan `resetTokenPreview` di `backend/src`) → blok "Dev Preview" (`ForgotPasswordPage.tsx:43,176–183`) kode mati; `JWT_EXPIRES_IN` tak berpengaruh; `RefreshToken` menumpuk tiap login; login nomor HP hanya TENANT. **Temuan FE:** `ResetPasswordPage` 0 `autoComplete`; token kosong tidak dicegah di klien; `/reset-password` tanpa `login-experience-v518d`; login hanya cek password kosong (DTO ≥6); **`/login` tak mengalihkan pengguna yang sudah login**; `VITE_API_BASE_URL` absolut hanya tidak berefek karena `.env.production.local` "jangan commit"; test lemah (hanya `loginPage.test.tsx` 4 test tanpa `token`/`user`; 2 halaman lain 0 test; E2E hanya tab Admin). Hasil lengkap: [CHECKLIST_AUDIT_TOTAL](CHECKLIST_AUDIT_TOTAL.md#catatan-hasil-dan-checkpoint) baris FE-002; entri [M13](M13_CHANGELOG.md). **Cakupan: Frontend 16/67.** Unit berikutnya: **FE-003 bookings (K4)**. *Catatan konkurensi:* audit memotret tree `cbca06f`; `AuthContext.tsx` (05:33) & `client.ts` (05:37) berubah oleh sesi paralel perbaikan FE-057 **setelah** pembacaan saya, sedangkan 3 halaman auth tidak tersentuh.

- [x] **FIX-AUDIT-FE-054 (batas retry refresh) — 18 Sep 2026:** menutup temuan `_retry` yang sebelumnya hanya ditulis tetapi tidak dibaca pada interceptor Axios. Request terlindungi kini hanya boleh menjalankan refresh sekali; request yang ikut antrean refresh juga ditandai retry. Jika respons retry tetap 401, sesi dibersihkan dan klien menolak dengan `AUTH_EXPIRED`, sehingga tidak ada siklus refresh berulang. **Implementasi lokal:** selesai. **Verifikasi:** `git diff --check` lulus; regresi auth terkait tetap `vitest` 6/6 lulus. **Deployment/dampak runtime:** belum dilakukan/diukur.

- [x] **FIX-AUDIT-FE-057 (auth session) — 18 Sep 2026:** menutup tiga temuan bug nyata FE-057 tanpa perubahan skema/deploy: key pesan booking tenant kini `kost48:portal-bookings:success-message`, jadi dibersihkan saat login/logout; `resetAuthFailureState()` dipanggil sebelum login dan saat logout agar kegagalan refresh token lama tidak memblokir login baru; kegagalan hidrasi `GET /auth/me` kini membersihkan token+cache+state sehingga `ProtectedRoute` tidak meneruskan token tanpa `user` ke `RequireRoles` (layar kosong). Regresi ditambah di `useAuth.test.tsx` untuk cache gagal dan key booking. **Implementasi lokal:** selesai. **Verifikasi:** `git diff --check` lulus; `npx.cmd vitest run src/test/hooks/useAuth.test.tsx` → **6/6 lulus** (443 ms). Test mempertahankan stderr historis jsdom untuk `fetch('/api/auth/logout')` relatif dan ekspektasi error hook di luar provider; keduanya tidak menggagalkan test. `tsc` belum diklaim lulus karena proses sebelumnya tidak selesai dalam 2 menit. **Deployment/dampak runtime:** belum dilakukan/diukur. Temuan FE-057 lain tetap backlog.

- [x] **AUDIT-FE-001 (lanjutan) (admin pages, K3) — 17 Sep 2026:** **verifikasi tambahan** atas unit FE-001 yang sudah selesai di atas (bukan audit baru, bukan pengulangan; cakupan tetap 15/67). **Ditambahkan:** **bukti visual** 6 berkas crawl 8 Sep 1280×720 (`frontend/e2e-out/{ADMIN,OWNER}_{staff-performance,surveys,guest-preferences}.png`, dibaca dengan input gambar) → halaman render utuh di kedua role, leaderboard dorman & empty chart sesuai `active = ranked.length >= 2`; **probe test** `npx vitest run src/test/pages/adminSurveysPage.test.tsx` → **3/3 lulus** (507 ms; 0 test untuk 2 halaman lain); kontrak akses diperkuat — **6/6** route API yang dipanggil halaman ber-`@Roles(OWNER, ADMIN)` selaras `RequireRoles` FE, `POST /surveys`+`/surveys/mine` tetap TENANT. **11 temuan tambahan:** (a) saat `isError`, `AdminSurveysPage.tsx:179` & `GuestPreferencesPage.tsx:198–200` menampilkan alert "Gagal memuat…" **bersamaan** dengan empty state (ditambah "0 survei terkumpul" di `:146`); `AdminStaffPerformancePage:310` sudah benar; (b) `month` tanpa validasi format (DTO hanya `@IsString()`) → gagal regex **jatuh diam-diam ke bulan berjalan**; (c) `formatDateKey` memakai getter **lokal** atas instant WIB → di server UTC `period.from` −1 hari dan `period.to` 31 Agu (rentang terbaca terbalik); klaim M06 "K-5/F2-14 selesai" hanya mencakup batas **query**, bukan label; (d) `period.from/to` + `summary.good`/`tenantReviewCount` tidak pernah dirender sehingga (c) tersembunyi; (e) `monthly` + `leaderboard` (→ `getAdminMonthly`) + `audit-suggestions` (`includeEvidence=true`) membangun ulang ringkasan **seluruh** staff — 1 `user.findUnique` + `$transaction` **6 `findMany`** tanpa `take` per staff → 3× pengulangan + pola N+1 (belum diukur; ranah EF-02); (f) `surveys.service.ts:115,28` `take: 200` dilabeli "**Total** Survei" tanpa pagination di tabel; (g) statistik preferensi = full table scan (`guest-preferences.service.ts:73–82`, bukan `groupBy`); (h) uang ad-hoc di luar util bersama `` `Rp ${(x/1000).toFixed(0)}rb` `` → Rp 1.150.000 tampil "Rp 1150rb"; (i) `{summary.recommendRate ?? '—'}%` → "**—%**" (terlihat pada bukti visual ADMIN & OWNER), `'—' ★` ×5, dan 7 kartu `flex-fill e3-minw-140` membungkus "Harga Sepadan" ke baris kedua di 1280 px; (j) test lama **selalu** mem-`mockResolvedValue(null)` `getSurveySummary` (baris 20/27/36) sehingga `SummaryPanel` tak pernah diuji dengan data — celah yang menjelaskan (i); (k) label "Total Survei" identik lintas `/surveys` & `/guest-preferences`. Hasil lengkap: [CHECKLIST_AUDIT_TOTAL](CHECKLIST_AUDIT_TOTAL.md#catatan-hasil-dan-checkpoint) baris lanjutan FE-001; entri [M13](M13_CHANGELOG.md). **Unit berikutnya menurut urutan checklist: FE-002 auth (K4)** — FE-001 tidak diulang.

- [x] **AUDIT-FE-001 (admin pages, K3) — 17 Sep 2026:** unit pertama rangkaian **halaman** selesai — `frontend/src/pages/admin` (**3 file: `AdminStaffPerformancePage.tsx` 335 baris, `AdminSurveysPage.tsx` 211, `GuestPreferencesPage.tsx` 269**) beserta komponen `StaffAuditModal`/`AdminSmartAuditPanel` dan kontrak akses. **Kontrak terpenuhi:** rute FE `RequireRoles OWNER,ADMIN` (`App.tsx:300–302`) selaras guard backend `@Roles(OWNER, ADMIN)` (semua GET admin-staff-performance, survei+summary, guest-preferences+stats; `POST /surveys` & `/surveys/mine` = TENANT); ketiga halaman punya state loading (`TableSkeleton`), error (`Alert`), empty (`EmptyState`) dibungkus `FeatureErrorBoundary`; modal audit reset form saat dibuka + spinner/disabled saat pending + alert error; semua `Form.Select`/input bulan ber-`aria-label`. **Temuan (advisory):** (a) empty state `AdminSurveysPage` tidak membedakan data kosong vs hasil filter kosong (pesan "Belum ada survei" muncul saat filter rating 0 padahal data ada); (b) `StaffAuditModal` hanya invalidate `['admin-staff-performance']` — leaderboard & asisten audit (staleTime 60 s) bisa menampilkan skor lama ≤60 s setelah audit disimpan; (c) `sessionId` penuh terekspos via atribut `title` di `GuestPreferencesPage` (teks terpotong 10 karakter; halaman OWNER/ADMIN saja); (d) `#` lokal idx+1 bukan nomor global di AdminSurveysPage — kosmetik; (e) bulan default `currentMonth()` memakai kalender perangkat — konsisten temuan zona waktu FE-064. Hasil lengkap: [CHECKLIST_AUDIT_TOTAL tabel hasil](CHECKLIST_AUDIT_TOTAL.md#catatan-hasil-dan-checkpoint). **Cakupan audit total: Frontend 15/67** (1 halaman + 11 shared + 3 static). Dan **rangkaian halaman (FE-001…FE-027) dimulai.** Unit berikutnya menurut urutan checklist: **FE-002 auth (K4)**.

- [x] **AUDIT-FE-064 (utils, K3) — 17 Sep 2026:** unit **terakhir** rangkaian shared FE selesai — `frontend/src/utils` (**38 file, 3.680 baris**). **Kontrak terpenuhi:** **38/38 util punya pemakai (0 util mati)** dan **0 duplikasi nama fungsi ekspor**; sentralisasi inti nyata — `formatCurrency` dipakai **57 berkas**, `dateTime` **45**, `getApiErrorMessage` **30**; `dateTime.ts` memakai `Asia/Jakarta` eksplisit + label WIB untuk seluruh formatter tampilan; 7 dari 38 util dirujuk test. **Temuan:** (a) **tiga strategi zona waktu bercampur** — tampilan WIB eksplisit (7 berkas), **aritmetika kalender perangkat** (`differenceInCalendarDays` ×5 di `dateTime.ts` untuk "H-n") dan offset perangkat manual (3 berkas); **`EnergyPage.tsx` mencampur `timeZone: 'UTC'` (baris 70,72) dengan `Asia/Jakarta`+"WIB" (115,254,380) di satu halaman** → label tanggal bisa beda satu hari di perangkat non-WIB/tengah malam; (b) **42 berkas memformat sendiri di luar utils** (`CurrencyInput.tsx:49` punya `Intl.NumberFormat` kedua, 4 komponen chart, 2 `toLocaleDateString` EnergyPage); (c) **penambalan teks FAQ lewat `replace('Rp 2.500/kWh', formatRupiah(...))` ×3** di `PublicGuestDashboardPage.tsx` → gagal **tanpa error** bila salinan FAQ berubah (FE-058: 4 sumber FAQ) dan peka bentuk spasi (NBSP dari ICU `id-ID`); (d) doc `formatCompactRupiah` menyatakan "0 → '-'" tetapi kode mengembalikan `'Rp 0'`; (e) `formatRupiah` menerima `string` + `parseFloat` → "1.500.000" menjadi "Rp 2" (risiko kontrak, tidak ada pemanggil terverifikasi); (f) **31 util tanpa test**, termasuk `invoiceTotals` (19 pemakai), `publicRoomDisplay` (12), `tenantCopy` (11), `statusLabels` (8), `bookingExpiry` (8) — ranah QA-008. Hasil lengkap: [CHECKLIST_AUDIT_TOTAL tabel hasil](CHECKLIST_AUDIT_TOTAL.md#catatan-hasil-dan-checkpoint). **Cakupan audit total: Frontend 14/67** (11 shared + 3 static). **Seluruh rangkaian shared FE (FE-054…FE-064) selesai diperiksa.** Unit berikutnya menurut urutan checklist: **FE-001 admin (K3)** — halaman/komponen, bukan lagi shared.

- [x] **AUDIT-FE-063 (types, K2) — 17 Sep 2026:** unit audit cakupan berikutnya selesai — `frontend/src/types` (**`core.ts` 895 baris, 80 ekspor** + `index.ts` re-export). **Kontrak terpenuhi:** `ApiEnvelope` (`success,message,data,requestId,timestamp`) **cocok** dengan `response-envelope.interceptor.ts:21–25` (41 controller memakai bentuk `{message,data}` yang dibungkus interceptor); **paritas union FE ↔ enum Prisma 15/15 sama persis**; **0 `any`/`0 `unknown`** di `core.ts` (kontras dengan 15 `any` di `src/api` — FE-054); `strict: true` aktif; field FE tanpa padanan Prisma sebagian besar enrichment service (bukan drift). **Temuan:** (a) **16 union tipe berakhiran `| string`** (`InvoiceStatus`, `StayStatus`, `DepositStatus`, `PricingTerm`, `PaymentMethod`, `PaymentSubmissionStatus`, `InventoryItemStatus`, `ReportedCondition`, `StaffFieldReportStatus`, `AdminDecision`, `RoomCategory/Type/Size`, `InvoiceLineType`, `MeterUtilityType`, `CheckoutRequestStatus`) → tipe domain **kolaps jadi `string`** dan type-safety hilang, padahal 15 di antaranya sudah sama persis dengan enum Prisma sehingga suffix itu tidak perlu; (b) **`WifiSale.tenantId` & `stayId` field fiktif** — tidak ada di model Prisma `WifiSale` dan modul `backend/src/modules/wifi-sales` **0 rujukan** → selalu `undefined` di UI; (c) **nullability ambigu**: **255 field** memakai `?: T | null` (dari 579), hanya 3 field wajib-tapi-nullable, dan `exactOptionalPropertyTypes` tidak aktif → "tidak dikirim" vs "null" tak terbedakan; (d) **`ApiErrorResponse` mati** (0 pemakai) walau isinya sudah cocok dengan `all-exceptions.filter.ts`; (e) **616 deklarasi tipe lokal di luar `types/`** dan 3 nama bertabrakan dengan ekspor core (`MeterRow`, `RoomItem`, `PaymentAmountTone`). Hasil lengkap: [CHECKLIST_AUDIT_TOTAL tabel hasil](CHECKLIST_AUDIT_TOTAL.md#catatan-hasil-dan-checkpoint). **Cakupan audit total: Frontend 13/67.** Unit berikutnya: **FE-064 utils (K3)**.

- [x] **AUDIT-FE-062 (styles, K2) — 17 Sep 2026:** unit audit cakupan berikutnya selesai — `frontend/src/styles` (**18 sheet, 31.517 baris** + `admin-area.ts`). **Kontrak terpenuhi:** 18/18 sheet diimpor `styles.css` urut 00→17; **225 token** didefinisikan (185 dipakai, 3.396 pemakaian `var()`), palet di `00-tokens.css`; 2.599 kelas CSS unik, 4.563 selektor unik; **33 aturan `:focus-visible`**; kontras: bukti terakhir crawl Axe 12 Sep 2026 ([AUDIT_UIUX_TOTAL_2026-09-12](AUDIT_UIUX_TOTAL_2026-09-12.md), 0 critical/serious + 1 sisa node `/profile` §0) — TERPENUHI untuk permukaan itu, tidak diukur ulang di sini. **Temuan:** (a) **5 deklarasi invalid** karena custom property tanpa definisi & tanpa setter — `--staff-progress` (`05-staff.css:413`, `.staff-donut`, **tanpa fallback**) → cincin donut tidak tergambar, `--p` (`14-reports.css:139,206`), `--a`+`--b` (`04-operations.css:2042`); aman: `--routine-progress` (diset `StaffRoutineChecklist.tsx:114`), `--staff-score` (fallback `0%`), `--ring-color` (5 definisi); (b) **55 token tidak dipakai** = 9 permukaan override Bootstrap (sah, dikonsumsi CSS Bootstrap — **bukan** temuan) + 46 milik sendiri, **45 di antaranya tidak muncul di kode mana pun**; (c) **383 selektor lintas sheet** (`.stat-card` di 6 sheet, `.detail-hero` di 5, `.app-topbar`/`.content-card`/`.glass-card`/`.metric-card`/`.table-card` di 4) + **516 duplikasi dalam sheet yang sama** → urutan impor jadi kontrak implisit; (d) **869 `!important`** (06-tenant 181, 11-public-pages 140, 10-misc 134, 05-staff 123); (e) **responsivitas tanpa skala tunggal**: 40 kondisi media berbeda, `max-width: 768px` (44×, inklusif) vs `767.98px` (22×) vs `767px` (1×) + puluhan lebar ad-hoc 350–1180; (f) **1 `outline: none` tanpa pengganti** di `10-misc.css:4247` (`.cmd-palette-input`) → input Command Palette tanpa indikator fokus; (g) **802 hex + 1.619 `rgb()/hsl()` literal di luar `00-tokens.css`**; (h) **117 kelas JSX tanpa definisi CSS** (advisory). Hasil lengkap: [CHECKLIST_AUDIT_TOTAL tabel hasil](CHECKLIST_AUDIT_TOTAL.md#catatan-hasil-dan-checkpoint). **Cakupan audit total: Frontend 12/67.** Unit berikutnya: **FE-063 types (K2)**.

- [x] **AUDIT-FE-061 (root, K4) — 17 Sep 2026:** unit audit cakupan berikutnya selesai — entry React & peta route (**4 file: `App.tsx` 352 baris, `main.tsx` 33, `styles.css` 26, `vite-env.d.ts` 1**). **Kontrak terpenuhi:** **18/18** modul CSS diimpor `styles.css` urut naik 00→17 (0 impor tanpa file, 0 file tanpa impor) dan `bootstrap.min.css` diimpor **sebelum** CSS aplikasi (urutan override benar); **72 `<Route>`** dengan **56 pemakaian `RequireRoles`** (51 sebaris + 5 multiline) dan guard berlapis `ProtectedRoute` (token+loading) → `AppLayout` → `RequireRoles`; 7 rute tanpa `RequireRoles` diverifikasi **wajar** (3 anak `/inventory/*` di bawah `RequireRoles` induk, 3 redirect lama, 1 redirect `/portal/guide`); `/settings` OWNER+ADMIN memang disengaja karena bagian owner-only dijaga `isOwner` (`OwnerSettingsPanels.tsx:1063,1200,1220`); `PwaRouteBoundary` = error boundary kelas dengan `key={location.pathname}` (rute yang gagal pulih saat navigasi) dan `FeatureErrorBoundary` dipakai **20 berkas**; `installResponsiveTableLabels()` idempoten (marker global + rAF + MutationObserver app-lifetime). **Temuan:** (a) **`ImportMetaEnv` tidak dideklarasikan** — 2 variabel env dipakai tanpa tipe sehingga typo jatuh diam-diam ke fallback (`|| '/api'`, `?? '6285648887628'`); digabung FE-058 berarti typo env = nomor WhatsApp salah tanpa error; (b) **catch-all `path="*"` di dalam `ProtectedRoute` tetapi di luar `AppLayout`** (`App.tsx:344`) → anonim ke URL tak dikenal dibuang ke `/login`, dan pengguna login melihat 404 **tanpa shell**; (c) `/portal/guide` tanpa `RequireRoles` → OWNER/ADMIN/STAFF mengalami redirect 2-hop + toast; (d) **`styles/admin-area.ts`** (`import './08-admin.css'`) diimpor **7 halaman** padahal CSS-nya sudah global → 7 impor mati; (e) dua strategi CSS (18 global sheet + satu CSS module `AdminHealthBar.module.css`) — ranah FE-062; (f) `console.warn` di `PwaRouteBoundary.componentDidCatch` tanpa guard `import.meta.env.DEV` (gaya rumah sudah ada di `usePushNotifications`); (g) **tidak ada scroll-to-top terpusat** saat ganti rute (hanya per halaman); (h) **3 halaman auth eager** (Login/Forgot/Reset) + `TenantBookingGate` di antara **61** halaman lazy, padahal komentar F2-11 menyatakan tujuan merampingkan bundle utama; (i) `installResponsiveTableLabels` hanya mengisi `data-label` bila belum ada (label bisa basi) dan memindai seluruh tabel subtree `#root` per batch mutasi; (j) `RootEntry` tanpa `isLoading` = rujukan silang ke FE-059(c), bukan temuan baru. Hasil lengkap: [CHECKLIST_AUDIT_TOTAL tabel hasil](CHECKLIST_AUDIT_TOTAL.md#catatan-hasil-dan-checkpoint). **Cakupan audit total: Frontend 11/67.** Unit berikutnya: **FE-062 styles (K2)**.

- [x] **AUDIT-FE-060 (lib, K3) — 17 Sep 2026:** unit audit cakupan berikutnya selesai — `frontend/src/lib` (**1 file: `queryClient.ts`, 15 baris**). **Kontrak terpenuhi:** **1 instance `QueryClient`** di seluruh aplikasi (tidak ada instance kedua di luar test) → satu cache; dipakai `main.tsx` sebagai provider terluar dan `AuthContext` yang memanggil `queryClient.clear()` pada login **dan** logout (tidak ada data pengguna sebelumnya tersisa — penting untuk perangkat bersama); default global `staleTime` 5 menit, `refetchOnWindowFocus: false`, `retry` = `false` untuk status < 500 dan maksimum 1 retry untuk 5xx/network; `gcTime` tidak diset dan tidak ada default `mutations` (retry mutasi 0). **Temuan (advisory):** (a) **dua rezim cache** — default global `refetchOnWindowFocus: false` tetapi **14 berkas** meng-override ke `true` (portal + dashboard/owner + PaymentReview/RenewRequests) dan 2 berkas ke `false`, tanpa satu tempat dokumentasi (relevan biaya request di hosting 512 MB); (b) **`staleTime` tersebar dalam 11 nilai berbeda** (15 s…30 menit) tanpa konstanta bersama; (c) `retry` di-override di **28 berkas** dan `throwOnError` **0 pemakaian** → tidak ada umpan balik error terpusat (v5 memang tidak punya `onError` global; dibutuhkan subscriber `QueryCache`/`MutationCache` yang belum ada); (d) **57 dari 133 blok `useMutation` tanpa `onError`**; pada sampel 20 berkas, 16 masih punya jalur umpan-balik dan 4 tidak (`hooks/useInvoices`, `useMeterReadings`, `usePayments`, `useStay`), sementara pemanggil umumnya hanya merender `isPending` (`InvoiceDetailPage.tsx:387`, `StayDetailPage.tsx:455`) → kegagalan mutasi berpotensi tidak terlihat; verifikasi per halaman ada di ranah FE-005/006/026. Hasil lengkap: [CHECKLIST_AUDIT_TOTAL tabel hasil](CHECKLIST_AUDIT_TOTAL.md#catatan-hasil-dan-checkpoint). **Cakupan audit total: Frontend 10/67.** Unit berikutnya: **FE-061 root (K4)**.

- [x] **AUDIT-FE-059 (hooks, K3) — 17 Sep 2026:** unit audit cakupan berikutnya selesai — `frontend/src/hooks` (**22 file, 1.632 baris**) dengan fokus query/mutation, lifecycle, hook-order, loading/error, dan cleanup. **Kontrak lifecycle terpenuhi:** `useAuthenticatedMediaUrl` bersih (AbortController + `URL.revokeObjectURL` di cleanup + hasil dijaga `loadedFor === resolved` + 204/blob kosong → `failed`) — kontras positif dengan temuan FE-054 "0 AbortSignal di lapisan api"; `useContainerWidth` (ResizeObserver + `observer.disconnect()`), `useDocumentTitle` (judul dipulihkan saat unmount), `useStaffPhotoUpload` (input di-reset di `finally`), `useNotifications` (key infinite/list selaras dengan `useNotificationsInfinite`, optimistic + rollback + invalidasi), `useInvoices`/`usePayments`/`useMeterReadings` (invalidasi presisi, `enabled` dijaga, key `['invoice', id]` prefix-menutup `['invoice', id, 'payments']`) terbaca benar. **Temuan:** (a) **deduplikasi portal T-06 belum tuntas** — `/stays/me/current` hidup di **2 key** (`['portal-stage','stay',{userId,tenantId}]` di `TenantBookingGate.tsx:51` + `MyBookingsPage.tsx:91` vs kanonik `['portal-stay','current']` di `useTenantPortalStage`/`usePaymentUrgency`) dan `/payment-submissions/my` di **3 key** (`['payment-submissions','mine',{…}]`, `['portal-payment-submissions']` di `TenantInvoiceDetailPage.tsx:130`, dan kanonik `['portal-payments','my']`); karena `PaymentUrgencyChip` (via `usePaymentUrgency`) terpasang app-wide di `AppLayout`, halaman portal tertentu memicu request ganda untuk endpoint yang sama; (b) **15 pemanggilan invalidasi mati pada 9 key** — `['payment-urgency']` (3), `['dashboard-owner']` (3), `['invoice-payments']` (2), `['tenant-meter-history']` (2), `['auto-ops-status']` (1; key nyata `['dashboard-admin','auto-ops-status']`), `['analytics']` (1), `['expenses']` (1), `['resources','tenants']`+`['resources','rooms']` (2) — tidak ada definisi query mana pun untuk key tersebut; (c) **`RootEntry` mengabaikan `isLoading`** (`App.tsx:197–202`) — sebelum query settle `stage` = `'browsing'` sehingga TENANT dengan stay aktif yang membuka `/` langsung diarahkan ke `/rooms` dan tidak ada redirect ulang sesudah data siap, padahal `isLoading` disediakan hook dan dipakai `RequireRoles`; (d) **`usePushNotifications`**: `refresh()` menyimpulkan `'enabled'` hanya dari `pushManager.getSubscription()` (device) tanpa verifikasi server → bila `subscribePush` gagal setelah langganan browser terbentuk, langganan itu yatim, UI bisa menampilkan "aktif" padahal server tidak punya catatan, tanpa cleanup/retry; (e) **`usePaymentUrgency`** menangani 404 secara inline hanya untuk `response.status` (baris 116) padahal file punya helper `isNotFoundError` 3-bentuk, dan gate error bersifat all-or-nothing (hanya null bila keempat query error) → kegagalan sebagian membuat P1/P3 dilewati **tanpa sinyal**; (f) **`useStay.invalidate` = 19 `await invalidateQueries` berurutan tanpa `Promise.all`** (satu-satunya di folder hooks) → aksi stay menunggu 19 rangkaian selesai; (g) **5 hook tanpa pemakai mana pun (310 baris)**: `useBusinessHealthScore` (127), `useMeterAnomalyDetector` (92), `useCashflowForecast` (52), `useTenantRiskProfile` (28), `useGenericForm` (11); `useContainerWidth` **bukan** mati (dipakai `ChartResponsiveWrapper` intra-folder); (h) `ChartResponsiveWrapper.tsx` adalah komponen React ber-PascalCase di dalam `src/hooks/` (menyimpang dari konvensi `use*.ts`); (i) `useClientPagination` menampilkan satu render halaman kosong sebelum efek clamp berjalan, dan `resetDeps` diserahkan pemanggil (13 pemakai) sehingga panjangnya harus tetap; (j) 2 `any` baru di hook (`useInvoices.addLineMutation` payload, `useStaffPhotoUpload` error) dan 2 `console.warn` yang **sudah** dijaga `import.meta.env.DEV` (higiene baik). Hasil lengkap: [CHECKLIST_AUDIT_TOTAL tabel hasil](CHECKLIST_AUDIT_TOTAL.md#catatan-hasil-dan-checkpoint). **Cakupan audit total: Frontend 9/67.** Unit berikutnya: **FE-060 lib (K3)**.

- [x] **AUDIT-FE-058 (data, K3) — 17 Sep 2026:** unit audit cakupan berikutnya selesai — `frontend/src/data` (**2 file: `kost48Assets.ts` 93 baris, `officialKost48Content.ts` 194 baris**) dengan fokus sumber data statis, relevansi nilai bisnis, dan privasi. **Kontrak aset terpenuhi:** 86/86 nama di whitelist `ROOM_IMAGE_FILES` ada di `frontend/public/room-images` dan unik, 5 gambar generik ⊂ whitelist, seluruh path literal (`/room-images/brosur-depan|belakang|spanduk-…`) ada, 0 referensi menggantung; 11 dari 13 kamar nyata (seed) mendapat 4–10 foto spesifik; 0 PII di kedua file (0 email, 0 nomor 08xx, 0 NIK); nilai bersumber sistem cocok dengan default backend — Rp 2.500/kWh, Rp 20.000/galon, Rp 50.000 WiFi bulanan, Rp 100.000 deposit hewan; alamat = M02 D-01; nomor WhatsApp = default backend. **Temuan:** (a) **empat sumber FAQ yang berbeda** — kanonik `backend/src/modules/faqs/faqs.service.ts DEFAULT_FAQS` = **37** item, `backend/scripts/seed-faqs.ts` = 18 item **usang** (galon Rp 15.000, tidak terhubung script/package.json mana pun), `frontend/src/data/officialKost48Content.ts` = 18 item, `frontend/src/pages/public/publicGuestShared.tsx` = 12 item; **15/18** pertanyaan FE tidak ada di kanonik dan **33/37** pertanyaan kanonik tidak muncul di sumber FE mana pun → `FaqPublicPage` (API) dan `Kost48OfficialInfoCard` (statis, dipakai `PublicRoomDetailPage`) menjawab hal berbeda di aplikasi yang sama; (b) **kontradiksi nilai yang terlihat pengguna** — tarif bawah Rp 800.000 (FE) vs Rp 850.000 (kanonik; M11 tarif publik terendah 850.000) sehingga FE menjanjikan harga lebih murah daripada tarif publik; TV "dapat ditambahkan Rp 50.000/bulan" (FE, sejalan M11) vs "tidak menyediakan TV" (kanonik); penghuni tambahan "sesuai ketentuan" (FE, tanpa angka) vs "20% dari tarif kamar per kepala" (kanonik = `extraOccupantFeePercent: 20`); jatah 30 kWh hanya di kanonik; (c) **nomor WhatsApp tidak mengikuti setting owner** meski komentar menyatakan "owner-settable via Settings" — `ADMIN_WA_BASE` = `import.meta.env.VITE_PUBLIC_ADMIN_WHATSAPP ?? '6285648887628'` (build-time) dan dipakai **8 berkas** publik, sementara `GET /settings/public-config` menyediakan `adminWhatsappNumber` dan FE sudah punya `fetchPublicConfig` (8 pemakai) tetapi field itu **0 pembaca runtime**; (d) **kamar F1/F2 tanpa foto lokal** — whitelist tidak memuat huruf `f` sehingga galeri F1/F2 = 0 gambar spesifik dan jatuh ke rotasi generik (foto kamar G/H/I/L) pada kartu/detail publik kamar mezzanine; (e) ekspor mati: `getKost48LogoUrl`, `getWhatsappUrl` (duplikat `officialKost48Location.whatsappUrl`), tipe `Kost48OfficialHighlight`/`Kost48OfficialFaq`; (f) **29 nama aset** `/room-images` tidak dirujuk literal di source FE mana pun maupun `sw.js` (cross-check FE-066 yang melaporkan 30 dengan metode berbeda). Hasil lengkap: [CHECKLIST_AUDIT_TOTAL tabel hasil](CHECKLIST_AUDIT_TOTAL.md#catatan-hasil-dan-checkpoint). **Cakupan audit total: Frontend 8/67.** Unit berikutnya: **FE-059 hooks (K3)**.

- [x] **AUDIT-FE-057 (context, K4) — 17 Sep 2026:** unit audit cakupan berikutnya selesai — `frontend/src/context` (**2 file: `AuthContext.tsx` 127 baris, `BreadcrumbContext.tsx` 28 baris**) dengan fokus kontrak sesi/state global, lifecycle provider, dan stale state. **Kontrak dasar terpenuhi:** `useAuth` melempar di luar provider, urutan provider `QueryClientProvider → AuthProvider → ToastProvider → ConfirmProvider` benar, guard berlapis (`ProtectedRoute` menunggu `loading` lalu memeriksa `token`; 56 `RequireRoles` memakai `user`) dan tidak merender anak saat `user` null. **Temuan:** (a) **kunci pembersihan sesi tenant salah** — `TENANT_SESSION_KEYS = ['portal-bookings-success-message']` sedangkan kunci nyata `kost48:portal-bookings:success-message` (`BookingPage.tsx:160` tulis; `MyBookingsPage.tsx:51,73,130,215,258`) → `clearTenantSessionStorage()` yang dipanggil saat login **dan** logout tidak membersihkan apa pun; pesan sukses pemesanan dapat muncul kembali untuk pengguna lain di tab yang sama hingga ditutup (copy generik, tanpa PII → dampak terbatas, kontrak lifecycle cacat); (b) **`authPermanentlyFailed` tidak pernah di-reset saat login/logout** (hanya pada refresh sukses `client.ts:112`) sementara `clearAuthAndRedirect` men-set flag **sebelum** early-return ketika `currentPath === '/login'` (`client.ts:20–26`) → memuat `/login` dengan token kedaluwarsa di localStorage membuat `POST /auth/login` (lewat `client`) ditolak `AUTH_EXPIRED`; pengguna tidak dapat masuk sampai reload manual; (c) **sumber kebenaran token terbelah** — `client.ts:111` menulis token hasil refresh hanya ke localStorage, state `token` AuthContext tidak pernah diperbarui (konsumennya kini hanya `ProtectedRoute` untuk uji truthiness), dan literal kunci `kost48_access_token`/`kost48_last_authenticated_user` diduplikasi di 2 modul; (d) **cache sesi bertahan saat `me()` gagal non-401/403** (`AuthContext.tsx:67–74`) → di tab baru (sessionStorage kosong, token ada) `user` null + `token` truthy → `ProtectedRoute` meloloskan, `RequireRoles` mengembalikan `null` → **halaman kosong tanpa pesan/retry**, dan `refreshMe` yang tersedia **0 pemakai**; (e) 0 listener `storage` → logout di satu tab tidak menyegarkan tab lain; (f) `readCachedUser` memvalidasi 4/12 field (`tenantId`, `isActive`, `lastLoginAt`, 5 field `tip*` dipercaya apa adanya) dan cache tidak berversi skema; (g) `setBreadcrumbLabel` **0 penulis** → breadcrumb detail selalu literal `'Detail'` (`AppLayout.tsx:143`) dan kontrak context-nya tidak melempar di luar provider (berbeda dari `useAuth`); (h) logout best-effort: `fetch` mentah tanpa await/timeout + `console.warn` produksi, `logout(): void`; (i) test `useAuth.test.tsx` hanya 4 kasus (tanpa token, login, logout, luar provider) — **tidak ada** kasus `me()` gagal, hidrasi cache, atau `refreshMe`. Hasil lengkap: [CHECKLIST_AUDIT_TOTAL tabel hasil](CHECKLIST_AUDIT_TOTAL.md#catatan-hasil-dan-checkpoint). **Cakupan audit total: Frontend 7/67.** Unit berikutnya: **FE-058 data (K3)**.

- [x] **AUDIT-FE-056 (constants, K2) — 17 Sep 2026:** unit audit cakupan berikutnya selesai — `frontend/src/constants` (**1 file, 133 baris, 14 ekspor**) dibandingkan terhadap enum Prisma + DTO/route backend. **Kontrak nilai bersama terpenuhi:** seluruh `backendStatus` opsi berada di dalam enum yang divalidasi DTO (`RoomItemStatus` / `InventoryItemStatus`) dan di dalam himpunan yang diizinkan untuk STAFF; `adminDecisionOptions` = `AdminDecision` (3/3); `roomItemFinalStatusOptions` = `RoomItemStatus` (4/4); `inventoryItemFinalStatusOptions` ⊂ `InventoryItemStatus` (5/7 — tanpa LOW_STOCK/OUT_OF_STOCK, konsisten dengan aturan "stok dihitung otomatis"); `fieldReportStatusLabels` 7/7 `StaffFieldReportStatus` dan `ticketStatusLabels` 5/5 `TicketStatus`; `inventoryMovementTypeOptions` ⊂ `InventoryMovementType` (2/5 — ADJUSTMENT memang ditolak backend). **Temuan:** (a) **jalur "Sudah kembali baik" pasti 403** — aturan bersama menawarkan `GOOD` untuk barang kamar, sedangkan `STAFF_ALLOWED_ROOM_ITEM_STATUSES` backend = {DAMAGED, MAINTENANCE, MISSING} dan modal ini hanya dapat dibuka STAFF (`RoomDetailPage:321` bergerbang `isStaff`, `/staff-warehouse` `RequireRoles(['STAFF'])`) → staff yang selesai memperbaiki barang tidak dapat melaporkannya kembali baik; (b) `roomConditionOptions` **mati** (0 pemakai) sementara logika hidupnya dideklarasikan ulang inline di `StaffInventoryStatusModal.getRoomReportChoice` (6 pilihan, label berbeda, **tanpa** GOOD); (c) nilai FE-only `COUNT_MISMATCH`/`RESTOCK_REQUEST` tidak ada di enum `ReportedCondition` dan keduanya runtuh ke `PENDING_CHECK` → niat "jumlah tidak sesuai"/"minta restock" hanya bertahan di catatan bebas, dan tiket otomatis selalu `BARANG_RUSAK` karena kategori `STOK_HABIS` hanya tercapai bila status LOW_STOCK/OUT_OF_STOCK yang justru tidak pernah dikirim FE; (d) **2 sistem label paralel** untuk enum yang sama — 17 rendering berbeda antara `constants/staffRepairOptions` dan `utils/statusLabels` (mis. `TicketStatus.OPEN` = "Belum mulai" vs "Baru", `DONE` = "Selesai, menunggu cek admin" vs "Selesai"), ditambah label `OUT`/`ASSIGN_TO_ROOM` yang berbeda antara constants dan `config/resources`+`components/resources`; (e) tabrakan nama tipe `SelectOption` (constants vs `components/common/SearchableSelect`); (f) `getStaffRepairLabel`/`getOptionLabel` mengabaikan parameter `fallback` untuk nilai tak dikenal (berbeda dari `getTicketStatusLabel`). Hasil lengkap: [CHECKLIST_AUDIT_TOTAL tabel hasil](CHECKLIST_AUDIT_TOTAL.md#catatan-hasil-dan-checkpoint). **Cakupan audit total: Frontend 6/67.** Unit berikutnya: **FE-057 context (K4)**.

- [x] **AUDIT-FE-054 (api, K4) — 17 Sep 2026:** unit audit cakupan berikutnya selesai — `frontend/src/api` (49 file, 5.134 baris, 74 endpoint unik) vs 346 route backend → **0 drift** endpoint (3 kandidat awal ternyata konstanta `${BASE}`, diverifikasi ke controller). Diperiksa: kontrak klien (baseURL env, timeout 15 s, interceptor Bearer/`X-Owner-View-Mode`, guard offline, anti-flood 401, single-flight refresh), higiene (0 `console.log`, 0 URL absolut, 0 token di query), dan invalidasi (133 `useMutation` / 341 `invalidateQueries`; hanya 4 mutasi tanpa invalidasi). **Temuan:** `_retry` ditulis tetapi tidak pernah dibaca (tanpa batas retry refresh), **0 AbortSignal** di lapisan api, 15 `any` di batas kontrak, 2 advisory invalidasi. Hasil lengkap: [CHECKLIST_AUDIT_TOTAL tabel hasil](CHECKLIST_AUDIT_TOTAL.md#catatan-hasil-dan-checkpoint). **Cakupan audit total: Frontend 5/67.** Unit berikutnya: **FE-056 constants (K2)**.

- [x] **AUDIT-FE-055 (config, K3) — 17 Sep 2026:** lanjutan unit cakupan — `frontend/src/config` (7 file). **77 route** (termasuk nested + redirect lama) dan **30/30 target navigasi menunjuk route nyata (0 menggantung)**; 67 pola judul dengan **0 judul mati** (3 kandidat awal = artefak parser karena child route relatif — `/inventory/*` memang nested; `/gudang`·`/barang-kamar`·`/mutasi` adalah key tab, bukan route). Kontrak versi: `version.ts` = `public/version.json` (`1.3.0` / `Portal Ringkas` / `2026-08-20`), dan `dist/version.json` distamp buildId PWA saat build. **Temuan advisory:** 8 route nyata tanpa entri judul (`/portal/energy`, `/portal/checkout`, `/portal/renewal`, `/portal/guide`, `/update-kamar`, `/availability-setup`, `/additional-services`, `/service-interests`) → `document.title` jatuh ke judul marketing default; ranah copy/label AO-14/AO-21. Hasil: [CHECKLIST_AUDIT_TOTAL tabel hasil](CHECKLIST_AUDIT_TOTAL.md#catatan-hasil-dan-checkpoint).

- [x] **DEPLOY `client/` — 17 Sep 2026 WIB:** tiga perbaikan frontend hari ini tayang bersamaan (target sentuh tablet 768 px, CLS mobile, target sentuh perangkat sentuh ≥1024 px) sebagai build **`BZ-Vpsd9eLX1`**. Prosedur `scripts/remote/deploy-client-safe.sh`: backup (`client-20260917-121631.tar.gz`, versi lama `3c0qJfgImyvj`) → ekstrak ke `client-new` → verifikasi entry dari `index.html` (`assets/index-CD1lX4UE.js`) → tukar folder → uji HTTPS (`/` 200, `/rooms` 200, `/cek` 200). Checksum arsip cocok di server (`CF1C08F6…B796`, 14.991.955 byte). **Tanpa restart, tanpa menyentuh backend/DB/`.env`/`uploads`.** Verifikasi produksi: `version.json` = `BZ-Vpsd9eLX1`; CSSOM live memuat media `(min-width: 768px) and (max-width: 1023.98px)`, `(min-width: 1024px) and (pointer: coarse)`, dan selektor M22 (`.gx-hero-sub-reserve`, `.gx-hero-price-slot`); CLS produksi terukur **0,0081** (viewport 1280×720, data nyata 13 kamar terisi, badge harga tampil 42 px, reserve = live = 54 px), overflow 0 px. Rollback: `client-old-20260917-121631`.

- [x] **SINKRON-GO-LIVE — 16 Sep 2026:** rekonsiliasi checkbox Fase A dengan bukti deployment nyata 13 Sep, atas permintaan owner. **Ditutup:** A2 (fresh provision: DB baru `kost48s1_prod26`, OWNER, COA 38, periode OPEN, 2 CashAccount) dan A3 (env produksi + gate KTP terbukti `ktpVerificationGateEnabled: true`). **Dibiarkan terbuka dengan catatan bukti:** A1 (sisa versi/port PostgreSQL ke IDwebhost) dan A6 (belum ada bukti trial balance/recon/readiness; readiness 75/100). [GO_LIVE_CPANEL_CHECKLIST](GO_LIVE_CPANEL_CHECKLIST.md) §B/§C/§F disinkronkan — §F.4 yang menyebut "periode OPEN dan CashAccount masih 0" diperbaiki karena keduanya sudah dibuat 13 Sep. Verifikasi docs-only: konsistensi silang M12 ↔ GO_LIVE ↔ M20, tanpa build/DB/server.

- [x] **MODEL-AUDIT — 8 Sep 2026:** [checklist audit total](CHECKLIST_AUDIT_TOTAL.md#pemilihan-model-dan-reasoning) dilengkapi profil model/reasoning pada seluruh 135 subaudit: OpenAI, DeepSeek V4 Pro dan V4 Flash; mencakup audit, pelaksana perbaikan, reviewer, eskalasi Astra/Pro Max serta batas bukti visual/runtime. Rekomendasi disusun menurut risiko proyek dengan sumber kemampuan resmi, bukan benchmark. ID/centang dan prioritas/izin tetap; verifikasi docs-only: kelengkapan profil, konsistensi, tautan dan diff.

- [x] **CHECKLIST-CAKUPAN — 8 Sep 2026:** [satu file checklist audit total](CHECKLIST_AUDIT_TOTAL.md) dibuat atas permintaan owner, berisi 135 kotak centang dengan ID, fokus pemeriksaan, tautan peta dan tabel hasil/checkpoint. Kotak awal kosong berarti cakupan belum direkonsiliasi pada file baru; bukan perintah mengulang audit yang sudah selesai. M12 tetap mengatur urutan task/perbaikan, M02 izin; centang cakupan berarti selesai diperiksa dan hasilnya dapat masih berupa temuan. Verifikasi docs-only: jumlah/keunikan/cakupan, tautan dan diff.

- [x] **PETA-AUDIT — 8 Sep 2026:** [lampiran peta M00](audit-map/README.md) dibuat atas persetujuan owner: indeks aplikasi → kelompok → file → simbol/percabangan, model/enum/field serta alur lintas domain dan format checkpoint. Generator lokal mencatat 1.067 file dalam cakupan (839 AST, 227 metadata, 1 schema), 135 kelompok, 9.367 simbol dan 20.901 titik branch sintaks; 46 modul backend dan 26 grup halaman tercakup. Angka adalah inventaris, bukan test coverage atau audit PASS. Audit perilaku dilanjutkan per task yang sudah ada; peta tidak mengubah izin/prioritas. Verifikasi: parser dan pemeriksaan konsistensi/link/diff; tanpa menjalankan aplikasi/DB.

- [x] **AUDIT-HOME-MOBILE — 15 Sep 2026:** audit UI/UX halaman utama produksi (`kost48surabaya.com`) read-only dengan Playwright + Axe pada 8 viewport, lalu perbaikan Fase 1/P1 (FAQ bocor `{formatRupiah(...)}`, bar CTA menutupi CTA hero di layar pendek, topbar terpotong, copy "0 kamar tersedia") dan Fase 2/P2 (thumb WebP 800 px + `width`/`height`, target sentuh ≥44 px, FAQ `<h3>`, teks terkecil, `aria-label` section). Verifikasi lokal: build `LUqZkqdOXLq8` + audit `dist` ber-fixture produksi → overflow 0, Axe 0, target <44 px 24→0, bobot 1.134→282 KB, desktop tidak berubah. **Belum di-deploy.** Detail: [M14](M14_AUDIT_UI_UX.md#audit-halaman-utama-produksi--15-sep-2026-mobile-first), [M13 15 Sep](M13_CHANGELOG.md).

| Blok | Status 13 Sep | Sumber |
|------|----------------|--------|
| Fase EF | Prioritas; EF-01/03/05 lokal, paket 12 Sep (`cbca06f`) terverifikasi di server; EF-00 sebagian terisi, EF-02 belum terukur penuh | M19 §9, checkbox Fase EF di bawah |
| Fase AO | Sisa AO-03/13/14/18–21/23; AO-06/08/09 + T-01..T-08 selesai 12 Sep | M14, checkbox Fase AO |
| Fase A | Go-live dijalankan 13 Sep; sisa owner: onboarding hunian/KTP, opening balance, cron, rotasi secret/PIN | M08, [M20 §11](M20_PRODUKSI_KOST48.md) |
| Fase MA | Ditunda — tanpa apps/libs/worker | M02 |
| Produksi | **Paket 12 Sep LIVE sejak 13 Sep 2026** di `kost48surabaya.com` (build tersaji `G2vp1MdZhTRz`, DB baru `kost48s1_prod26`, 13 kamar, 13 tenant + 12 akun portal, OWNER + COA 38 akun, periode OPEN + 2 CashAccount). Sisa owner: rotasi secret + PIN, opening balance, cron AutoOps, onboarding hunian | M19 §9 + [M20](M20_PRODUKSI_KOST48.md) + [checklist cPanel](GO_LIVE_CPANEL_CHECKLIST.md) §E–§F |
| Audit docs 8 Sep | Temuan D-01..D-11 dibukukan | [M16 §0](M16_AUDIT_MENYELURUH.md#0-audit-dokumentasi-dan-urutan-kerja--8-september-2026) |

## Peta Rujukan Dokumen

Baca sesuai kebutuhan; arsip `docs/archieve/*` hanya untuk forensik.

Lampiran navigasi M00: [peta struktur audit bertahap](audit-map/README.md), [alur lintas domain](audit-map/ALUR_LINTAS_DOMAIN.md), dan [cara audit/checkpoint](audit-map/CARA_AUDIT.md). Pilih satu pertanyaan dan satu leaf source; peta tidak menambah antrean, mengulang task selesai, atau mengubah izin yang sudah tercatat di M02.

Checklist cakupan manual owner: [CHECKLIST_AUDIT_TOTAL.md](CHECKLIST_AUDIT_TOTAL.md) — 135 subkelompok, hasil dan checkpoint dalam satu file; prioritas eksekusi tetap mengikuti antrean M12.

| # | File | Dipakai untuk |
|---|------|----------------|
| M00 | `docs/M00_CODEMAP.md` | Modul → path sebelum grep |
| M01 | `docs/M01_MASTER.md` | Ground state, invarian, identitas bisnis |
| M02 | `docs/M02_KEPUTUSAN_OWNER.md` | Keputusan owner (menang jika konflik) |
| M03 | `docs/M03_FLOW_KONTRAK.md` | Booking → invoice → jurnal → stay |
| M04 | `docs/M04_KEUANGAN.md` | Wajib tiap task uang |
| M05 | `docs/M05_SIKLUS_HUNI.md` | Stay, renewal, checkout, KTP |
| M06 | `docs/M06_OPERASIONAL.md` | Staf, tiket, gudang, Auto-Ops |
| M07 | `docs/M07_PUBLIK_GROWTH.md` | Katalog, SEO, loyalty publik |
| M08 | `docs/M08_DEPLOY_GO_LIVE.md` | Runbook deploy / go-live |
| M09 | `docs/M09_AI_OWNER_ADMIN.md` | AI manual OWNER/ADMIN |
| M10 | `docs/M10_PETA_SCOPE.md` | Scope per role/flow |
| M11 | `docs/M11_DEFAULT_DATA.md` | Seed/default DEV, bukan password produksi |
| M12 | file ini | Satu checklist + urutan |
| M13 | `docs/M13_CHANGELOG.md` | Riwayat bertanggal (tulis di atas) |
| M14 | `docs/M14_AUDIT_UI_UX.md` | Fase AO + lampiran portal Juli |
| M15 | `docs/M15_IOT.md` | IoT Tuya/ESP32 |
| M16 | `docs/M16_AUDIT_MENYELURUH.md` | §0 docs 8 Sep + audit kode 30 Jul |
| M17 | `docs/M17_PORTAL_FLOW_RINGKAS.md` | Prinsip portal ringkas |
| M18 | `docs/M18_ATURAN_HARGA_KAMAR.md` | Multiplier harga |
| M19 | `docs/M19_EFISIENSI_HOSTING_512MB.md` | Fase EF + tabel host |
| M20 | `docs/M20_PRODUKSI_KOST48.md` | **Produksi & operasional harian**: identitas deployment, urutan env, redeploy, backup/rollback, jebakan terbukti, sisa pekerjaan owner |
| FORM | `docs/FORM_ISI_DATA_GO_LIVE.md` | Formulir go-live kanonik |

Audit historis (bukan antrean): `docs/archieve/audit_fable/00_INDEX.md`, `docs/archieve/audit_reasonix/RINGKASAN_EKSEKUTIF.md`.

## Update 2026-09-15 — Audit homepage mobile-first: perbaikan P1/P2 lokal (belum deploy)

- [x] **AUDIT-HOME-MOBILE — 15 Sep 2026:** audit halaman utama **produksi** secara read-only (Playwright + axe-core WCAG 2.1 A/AA; 320×568, 360×640, 375×667, 375×812, 414×896, 768, 1280, 1440) saat kondisi nyata **13 kamar semua `FULL`**. Temuan P1: tiga jawaban FAQ menampilkan kode mentah `{formatRupiah(...)}` (mobile + desktop); bar CTA 80 px menutupi CTA hero di 320×568 (keduanya) dan 360/375×640–667 (sekunder); tombol "Cek Kamar" terpotong 8 px di 320 px dan brand ter-ellipsis; copy bar "0 kamar tersedia" berlawanan dengan hero "Semua kamar sedang terisi". Temuan P2: brosur 548+507 KB untuk kotak 327×245 px (89% bobot halaman), 24/49 target sentuh <44 px, scroll-top beririsan dengan bar, toast di belakang bar, FAQ `<h2>`, teks 10,2–12,8 px, 10/10 section tanpa label. **Perbaikan lokal:** interpolasi `${formatRupiah(...)}`, bar muncul setelah hero lewat + "Semua kamar terisi · Kabari saya" (WhatsApp) saat `bookable=0`, thumb WebP 800 px + `width`/`height`, blok CSS mobile `M21`, FAQ `as="h3"`, 11 section `aria-label`. **Verifikasi lokal:** `tsc -b` + build + PWA lulus (build `LUqZkqdOXLq8`), audit `dist` ber-fixture respons produksi di 7 viewport → overflow 0 px, Axe 0 pelanggaran, placeholder bocor 0, target <44 px 24→0 (mobile), CTA hero tidak tertutup, bobot 1.134→282 KB, desktop 1280/1440 tidak berubah. Rincian: [M14](M14_AUDIT_UI_UX.md#audit-halaman-utama-produksi--15-sep-2026-mobile-first) + [M13 15 Sep](M13_CHANGELOG.md).
- [x] **Deploy `client/` — DIJALANKAN 16 Sep 2026 WIB:** tiga siklus deploy (`LUqZkqdOXLq8` → `WhBmlAjYXZiB` → **`3c0qJfgImyvj` aktif**) memakai `scripts/remote/deploy-client-safe.sh` (backup → ekstrak ke folder baru → verifikasi entry dari `index.html` → tukar folder utuh → uji HTTPS), **tanpa restart** dan tanpa menyentuh backend/DB/`.env`/`uploads`. Verifikasi produksi (browser): `/`, `/rooms`, `/cek` → 200; audit 6 viewport → overflow 0 px, **Axe 0 pelanggaran**; FAQ bocor 0; target <44 px mobile 24/49 → **0/49**; brand & CTA topbar utuh di 320/360/375; bar CTA "Semua kamar terisi · Kabari" → WhatsApp saat kamar penuh; halaman 1.134 → **248 KB**; desktop 1280/1440 tidak berubah. Rollback: `client-old-20260916-053947` (pra-perbaikan `G2vp1MdZhTRz`), `-055824`, `-061054` + `~/backups/client-20260916-*.tar.gz`. Detail: [M13 16 Sep](M13_CHANGELOG.md).
- [x] **CLS mobile — SELESAI lokal 17 Sep 2026 (belum di-deploy):** akar masalah diukur ulang dengan observer `layout-shift` pada build produksi `3c0qJfgImyvj` (375 px, CLS **0,4235**, 83 entri): penyebab dominan = `DIV.gx-hero-body` bertambah tinggi **±25 px setiap baris teks hero selesai diketik** (518 → 543 → 568 px; hero memusatkan isinya sehingga badge & CTA terdorong turun), disusul badge harga yang baru muncul setelah tarif tiba — bukan skeleton katalog. **Perbaikan:** blok CSS **M22** (`display: grid` satu sel + salinan ruang-terpesan `visibility: hidden`, tanpa tinggi piksel hardcoded) + badge harga selalu menempati ruang lewat placeholder senyap di `PublicGuestDashboardPage.tsx`. **Verifikasi lokal:** build kanonik **`mx3kLXWOYkTg`** (PWA verification passed) → CLS **375 px 0,4235 → 0,0069 (−98%)**, 320 px 0,0240, 414 px 0,0038, 768 px 0,0170, 1280 px 0,0071 (semua ≤ 0,024; ambang baik = 0,1); tinggi hero stabil antar sampel; overflow 0 px; target `gx-*` <44 px tetap 0 di 320–768 px; **Axe 0 violations** (satu pelanggaran `aria-prohibited-attr` serious yang muncul saat restrukturisasi dibersihkan dengan salinan `visually-hidden`). Bukti: `.audit-runtime/out/cls-mobile-verification.md`. **Sisa:** pergeseran beberapa piksel dari pergantian webfont (Inter/Cormorant) belum ditangani. **Tayang 17 Sep 2026 WIB** (`BZ-Vpsd9eLX1`); verifikasi produksi sesudah deploy: **CLS 0,0081** pada 1280×720 dengan data nyata (13 kamar terisi), badge harga tampil 42 px, `reserve` = `live` = 54 px, overflow 0 px.
- [x] **Tablet 768 px — SELESAI lokal 17 Sep 2026 (belum di-deploy):** 18 target sentuh <44 px karena ambang CSS mobile berhenti di 767,98 px. **Perbaikan:** blok baru **M21b** `@media (min-width: 768px) and (max-width: 1023.98px)` di `frontend/src/styles/11-public-pages.css` — hanya target sentuh (brand, `.gx-btn-ghost`/`.gx-btn-solid` topbar, `.gx-btn-whatsapp`, `[role="tab"]`, tautan footer, footer version); tipografi/layout tidak diubah. `.gx-topbar .gx-btn-ghost` juga masuk daftar mobile M21 (celah 421–767 px; sebelumnya hanya `.gx-btn-solid`). **Verifikasi lokal:** `tsc -b` + `npm run build` kanonik lulus (PWA `cH5s-qv8bSB5`, PWA verification passed); harness iframe dengan kriteria `measure.js` yang sama → **768 px: 18 → 0 dari 18 target audit** (semuanya 44 px; overflow 0 px; topbar tetap 66 px), 1023 px sama, **1024/1280/1440 tidak berubah**, 320/375/414 tidak berubah; aturan tampak sekali di CSS hasil build. Bukti: `.audit-runtime/out/tablet-768-verification.md`. **Tayang 17 Sep 2026 WIB** sebagai bagian build **`BZ-Vpsd9eLX1`** (deploy `client/` tanpa restart; verifikasi produksi: CSSOM live memuat media `(min-width: 768px) and (max-width: 1023.98px)`). **Celah 1024–1279 px (iPad landscape) ditutup** dengan blok **M21c** `@media (min-width: 1024px) and (pointer: coarse)` — hanya perangkat sentuh, dan desktop bertetikus 1024/1280/1440 terbukti tidak berubah. **Sisa:** perilaku `(pointer: coarse)` pada perangkat sentuh nyata belum terbukti (harness lokal berjalan sebagai pointer halus).

## Update 2026-09-13 — PRODUKSI LIVE + halaman operasional owner

- [x] **DEPLOY-PRODUKSI — 13 Sep 2026:** paket 12 Sep **dipasang di shared hosting** `kost48surabaya.com` (build `B70lrG6Auual`, kemudian `MhA2UHkaDbmU`). Database produksi baru (13 kamar, 38 COA, periode OPEN, Kas/Bank), OWNER + 13 tenant + 12 akun portal. Bukti smoke test HTTPS lengkap dan identitas deployment ada di **[M20 §2–§3](M20_PRODUKSI_KOST48.md)**. Tiga temuan operasional terekam: urutan env **cPanel > `.htaccess` > `.env`**, database dari phpPgAdmin tidak terdaftar cPanel (gagal `pg_hba`), dan `uapi NodeJS` tidak tersedia.
- [x] **HALAMAN-OWNER — 13 Sep 2026:** `/cek` (checklist go-live, statis, tanpa data pribadi) dan `/okupansi` (ubah ketersediaan kamar dengan PIN owner, simpan sekali tekan, aman dari tabrakan) diterbitkan ke produksi; `/update-kamar` tetap ada. Uji end-to-end: simpan status → 200 dan katalog publik ikut berubah, PIN salah 403.
- [ ] **Lanjutan onboarding (menunggu data owner):** bulan masuk, 13 angka meter kWh, saldo kas/bank, deposit per penghuni → lalu hunian + verifikasi KTP + tagihan pertama. Detail data yang sudah disiapkan: [M20 §11–§12](M20_PRODUKSI_KOST48.md).

## Update 2026-09-12 — Persiapan deploy shared hosting (paket + verifikasi lokal)

- [x] **DEPLOY-PAKET — 12 Sep 2026:** paket `kost48-deploy-bundled.tgz` dibangun ulang dari source `cbca06f` (paket lama 6 Sep tidak memuat perbaikan a11y/performa 12 Sep). SHA-256 `BC9176F2897B6FB444FD9A0156C90944D0D289EF8E66932217B2944DB69EEDFD`, 40,8 MB, 10.500 entri, build PWA `B70lrG6Auual`. **Temuan diperbaiki:** `sql/seed.sql` + `sql/seed_ORIGINAL.sql` (data historis/PII) tidak lagi ikut paket; `make-deploy.mjs` menghapus dan memverifikasinya saat packaging. **Verifikasi lokal (bukan deployment/host/UAT):** DB uji sementara terpisah → bootstrap 63 tabel, seed 13 kamar, boot 5,8 s, `/` 200 + `no-store`, `/api/public/rooms` 200, `/api/stays` 401, `/api/tidak-ada` 404, aset hilang 404, `seed-owner.js` lulus, login OWNER 201, cron token salah 403 / benar 200 / GET 404; DB uji dihapus setelahnya. DB UAT/produksi tidak disentuh. **Terbuka:** jalur DB produksi (fresh vs patch), domain, secret baru, dan identitas deployment EF-00; bootstrap membuat `_prisma_migrations` tanpa entri ledger (0 baris). Detail + checklist: [GO_LIVE_CPANEL_CHECKLIST](GO_LIVE_CPANEL_CHECKLIST.md).


## Update 2026-09-11 — Audit K2 FE-065 icons (Checklist Audit Total)

- [x] **FE-065 icons (K2) — 11 Sep 2026:** audit statis `frontend/public/icons` selesai — 16 file/308.998 B, dimensi 13 PNG cocok dengan 10 deklarasi manifest, `favicon.ico` 6 entri valid, 4 referensi `index.html` + 5 CORE_ASSETS `sw.js` + `icon`/`badge` push semua ada, maskable di dalam safe zone (62,1%), paritas bundle 16/16, 0 referensi menggantung. **Terbuka:** 2 file brand divergen tanpa referensi di `/icons/` (keputusan owner), duplikasi `apple-touch-icon`=`icon-180`, komposisi ikon "any" bottom-anchored, serta pemeriksaan visual yang butuh model/manusia berinput gambar. Detail: [M13 2026-09-11](M13_CHANGELOG.md); hasil dicatat di [CHECKLIST_AUDIT_TOTAL](CHECKLIST_AUDIT_TOTAL.md#catatan-hasil-dan-checkpoint). Unit berikutnya: FE-054 api (K4). Cakupan audit total: Frontend 3/67.

## Update 2026-09-08 — Tata ulang docs + audit urutan kerja

- [x] **DOC-TATA:** M12 ditata: satu protokol, dual anchor antrean, status aktif terpisah dari ledger, peta M00–M19. Temuan di [M16 §0](M16_AUDIT_MENYELURUH.md#0-audit-dokumentasi-dan-urutan-kerja--8-september-2026).
- [x] **AUDIT-ANTREAN** (pagi): dua urutan prioritas disatukan; AL/AO-00 riwayat selesai; AO-18/19/20 parsial tetap terbuka.
- [x] **AUDIT-AO-ALAT** (pagi): gap alat crawl/provisioning di [M14 §3 AO-03](M14_AUDIT_UI_UX.md#ao-03--p1--kredensial-dan-data-uat-tidak-mendukung-audit-lintas-role).
- [x] **AO-03 — tindak lanjut alat (sore 8 Sep):** perbaikan alat terimplementasi; provisioning + crawl UAT dieksekusi 8 Sep — OWNER/ADMIN/STAFF dibuat/terverifikasi, TENANT no-stay dummy #55, TENANT aktif didefer; crawl OWNER 36/36, ADMIN 32/32, STAFF 7/7 (0 kritis, hanya warning console `controlId`). Detail di M13.
- [x] **EF-07-UNIT:** `backend/test/unit/env-ops-flags.test.js` (8 test, mock tanpa DB) — `npm run test:unit` 82/82 PASS · `npx tsc --noEmit --incremental false` ✅. Precedence env>DB AutoOps dan default IoT poll OFF tervalidasi runtime.
- [ ] **AO-13/14 — bukti eksekusi:** tiga crawl tanpa skip; dua state TENANT; viewport/Axe; screenshot/trace belum otomatis bebas PII.
- Entri sesi 6–7 Sep dan rincian izin: `docs/M13_CHANGELOG.md` (jangan diduplikasi lagi di puncak file ini).

## Efisiensi Sesi & Bump Versi

- Satu sesi ideal = 1 episode kerja yang masih berhubungan. Topik berganti total → sesi baru.
- Navigasi token: M00/M01/M12 dulu, lalu grep simbol. Jangan baca seluruh arsip.
- Bump versi hanya atas permintaan eksplisit owner. Sumber: `frontend/src/config/version.ts`, `frontend/public/version.json`.
  - `PATCH` bugfix/polish · `MINOR` fitur terasa user · `MAJOR` breaking
- Saat bump, update `APP_BUILD_DATE`. Build ID PWA dihasilkan saat `npm run build`.

## Riwayat Fase (bukan antrean — jangan dikerjakan ulang)

| Blok | Status | Catatan |
|------|--------|---------|
| Fase A — Pra-Go-Live | 🧑 lanjutan owner | Kode inti siap; **sudah dipublikasikan 13 Sep 2026** (M20 §2–§3); sisa onboarding data owner (M20 §11) |
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
| **Fase Y — Test Coverage Maksimal** | ✅ selesai (historis) | 153 area; Y-G7 N/A (source tak ada). Angka tes pada hari penutupan, bukan sesi sekarang. |
| **Fase Z — Audit UI/UX Cross-Portal (2026-07-02)** | ✅ selesai (historis) | 19 task dieksekusi Juli; sisa bukti verifikasi manual Owner = Z-19/H15 (lihat rekonsiliasi AL). Rujukan arsip: `docs/archieve/_previous_cycles/_AUDIT_CROSS_PORTAL_2026-07-02.md`. |
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
| **Fase AL — Audit Reasonix Code** | ✅ selesai 7 Jul (historis) | C1–C6 + H1–H15 dilaporkan selesai; jangan ulang backlog awal. H15/Z-19 masih butuh bukti verifikasi manual spesifik. |
| **Fase AK — Owner-Request 2026-07-04** | ✅ kode selesai | AK-01 API key DeepSeek via Settings (tanpa restart, env fallback, tak pernah bocor ke respons) 🧬 · AK-02 fix 400 simpan panel AI · AK-03 input angka ribuan + fix nol-depan (CurrencyInput diperkuat, 12 file). `db push` kolom baru saat env hidup. |
| **Fase AM — Redundansi UI/UX + Audit** | ✅ selesai (16/16) | AM-01 unifikasi WA URL, AM-02 hapus RoleWorkspaceTabs, AM-05 Pengumuman sidebar, AM-07 fix spec detection, AM-13 CSS Modules riset, AM-14 useForm wrapper, AM-15 Storybook, AM-16 E2E smoke. Build FE ✅ 6 Jul 2026. Detail: `docs/M12_CHECKLIST_CHANGELOG.md (Fase AM, riwayat)`. |
| **Fase M16 — Audit 360 Flow Huni** | ✅ selesai | 7 temuan: P2-01/02/04 fixed (+🧬), P2-03/05/06/07 diverifikasi valid. Detail: `docs/archieve/_previous_cycles/M16_AUDIT_360_FLOW_HUNI.md §7`. |
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
| **Fase EF — Efisiensi Shared Hosting 512 MB** | PRIORITAS; menunggu data hosting | Audit lokal selesai, EF-01/03/05 tersedia lokal; EF-00/02 menunggu identitas deployment dan pengukuran. M19 = spesifikasi. |
| **Fase MA — Batas Modul & Kesiapan Ekstraksi** | DITUNDA | Satu proses API dipertahankan; tidak ada izin apps/libs, ekstraksi atau worker baru. |

---

## Ledger Historis (checkbox fase)

**Bukan urutan eksekusi.** Urutan kerja hanya [Antrean Prioritas Aktif](#antrean-prioritas-aktif) (anchor `#antrian-eksekusi-aktif` menunjuk ke tabel itu). Fase EF tetap diprioritaskan; Fase MA tetap ditunda.

Daftar berikut adalah ledger lintas fase bertanggal, berisi hasil selesai dan backlog. Urutan nomor lama bukan urutan eksekusi baru. Konflik status diselesaikan dari hasil penutupan yang lebih baru; jangan menjalankan ulang task berstatus selesai.

> **Ledger lintas fase (riwayat dan backlog):**
> 0. **STAFF-PORTAL-RINGKAS** — ✅ **SELESAI (20 Agu 2026)** — live check 8 route staff; perbaiki 403 `/users` di TicketsPage mode STAFF, hapus kartu kinerja duplikat di dashboard (detail tetap di `/staff-report`). FE vitest 133/133 ✅, build ✅.
> 0. **TENANT-PORTAL-RINGKAS** — ✅ **SELESAI (20 Agu 2026)** — portal tenant dirapikan: nav Utama/Lainnya (3 aksi inti duluan, fitur lanjutan tetap ada), tab duplikat "Kamar & Riwayat" dihapus, lalu tab "Listrik & Air" juga dihapus dari MyStayPage (detail cukup di `/portal/energy`; tombol refresh sensor dipindah ke sana). FE vitest 133/133 ✅, build ✅.
> 0. **M17 Portal Flow Ringkas** — ✅ **SELESAI (20 Agu 2026)** — Iterasi 1–4 tuntas: DashboardAdmin = daftar tugas 0–5, CTA terfilter, OwnerDashboard ringkas, E2E booking→bayar→perpanjangan→checkout di UAT, cleanup widget lama. Detail: `docs/M17_PORTAL_FLOW_RINGKAS.md`.
> 0. **SEED-DATA-ASLI ✅** — Seed data asli dari KOST48_Laporan_Bulanan_FINAL_Teraudit.xlsx menggantikan dummy `seed-dev-via-api.js`. 14 kamar, 48 tenant (dengan portal access), 52 stay (12 ACTIVE), 186 invoice PAID, 186 payment, total Rp 219.710.000. Script: `backend/scripts/seed-dev-real.js` + `backend/scripts/seed-data.json`. (19 Jul 2026)
> 0. **G5+ Fixlist KTP** — ✅ **SELESAI (3/3 + hardening review)** — migration `ktpVerificationMethod/Notes`, rate-limit hemat kuota (deterministik/fallback tak potong kuota), method `AI` di `verifyKtp` butuh bukti sukses AI (`KtpAiApprovalService` baru, TTL 30 mnt, sekali pakai); hardening cache AI (prune+cap, clone anti-mutasi, key model konsisten). Build BE ✅ FE ✅
> 0. **G5+ gap kritis: UI upload foto KTP + audit orphaned endpoint** — ✅ **SELESAI** — endpoint `ktp/upload` yang sebelumnya tak pernah dipanggil UI kini aktif; audit orphaned endpoint Admin/Owner/Inventory juga sudah ditutup: delete KTP, create/update COA, update cash account, update period notes, edit aset, draft FAQ AI, review laporan staff AI, legacy deposit-ledger dry-run, dan integrasi demographics summary sudah tersambung atau dibersihkan bila redundant. Build FE ✅ BE ✅
> 0. **Fase M16 — Audit 360 Flow Huni** — ✅ **SELESAI** — 7 temuan: P2-01/02/04 fixed, P2-03/05/06/07 diverifikasi valid. Detail: `docs/archieve/_previous_cycles/M16_AUDIT_360_FLOW_HUNI.md §7`. Build FE ✅ BE ✅
> 0. **Fase AM — Redundansi UI/UX + Audit (Admin + Owner + Publik)** — ✅ **SELESAI (16/16)** — AM-01..AM-16. Detail: `docs/M12_CHECKLIST_CHANGELOG.md (Fase AM, riwayat)`.
> 0. **Fase M18 — Celah Peningkatan (Review 9 Jul 2026)** — ✅ **11/11** — 11 task tuntas: refresh token race condition, masking NIK, unique `identityNumber`, saveKtpData tidak overwrite field existing, feedback error KTP save, DTO validasi KTP-data, unit test OCR FE/BE, logging silent catch, dan `FeatureErrorBoundary` untuk halaman kritis.
> 0. **AU-01..AU-03 — Sisa audit kedalaman UI/UX Admin/Owner** — ✅ **SELESAI (8 Jul, Fable5)** — AU-01 `SimpleCrudPage` confirm dialog + `onError` toast di delete (dampak: expenses/invoice-payments/wifi-sales/additional-services); AU-02 `StaysPage` 4 mutation (expire/reject booking, approve/reject checkout) dapat `onError` toast; AU-03 confirm di "Jalankan Kedaluwarsa" (`StaysPage`) + "Hapus key" DeepSeek (`OwnerSettingsPage`). `tsc` FE ✅
> 0. **GATE-KTP-ENV 🔴 — Jebakan gate KTP produksi** — ✅ **SELESAI (8 Jul, Fable5)** — pembaca gate memakai nilai DB begitu row `OperationalSetting` ada (kolom non-nullable → `?? env` mati), row terbentuk otomatis default `false` → env `KTP_ACTIVATION_GATE_ENABLED=true` yang diwajibkan runbook diabaikan, gate diam-diam OFF. Fix: `settings.service.ts` semai nilai awal row dari env + catatan verifikasi di docs deploy. `tsc` BE ✅
> 0. **RUNBOOK onboarding 13 tenant nyata** — 📘 `docs/FORM_ISI_DATA_GO_LIVE.md` — urutan tenant→KTP→verify→stay, `checkInDate` = siklus terakhir bulan berjalan, jebakan due-date invoice 24 jam (lunasi sebelum buka portal), prasyarat: NIK Dini/Theo, kamar Annisa, catat meter 13 kamar.
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
> 5. **AA-01..AA-05** — ✅ **SELESAI** — Fase AA (CHECKLIST_01): 5 task tuntas; detail di [Fase AA](#fase-aa--perbaikan-temuan-audit-publik-checklist_01--selesai).
> 6. **AB-01..AB-05** — ✅ **SELESAI** — Fase AB (CHECKLIST_02): 5 task tuntas (AB-01 label Dipesan + AB-02 link error-state sudah dari sebelumnya). Detail di [Fase AB](#fase-ab--perbaikan-temuan-audit-katalog-checklist_02--selesai).
> 7. **AC-01..AC-04** — ✅ **SELESAI** — Fase AC (CHECKLIST_03): 4 task tuntas (AC-04 N/A tercakup AB-05). Detail di [Fase AC](#fase-ac--perbaikan-temuan-audit-booking-checklist_03--selesai).
> 8. **AD-01..AD-04** — ✅ **SELESAI** — Fase AD (CHECKLIST_04): 4 task tuntas. Detail di [Fase AD](#fase-ad--perbaikan-temuan-audit-auth-checklist_04--selesai).
> 9. **AE-01 🔴 HIGH** — ✅ **SELESAI** — Fase AE (CHECKLIST_05): AE-01 infinite refetch loop fixed (sudah dari sebelumnya); AE-02 ✅ dikonfirmasi live 3 Jul (bayu occupied). Detail di [Fase AE](#fase-ae--perbaikan-temuan-audit-mystay-checklist_05--selesai).
> 10. **AF-01..AF-03** — ✅ **SELESAI** — Fase AF (CHECKLIST_06): 3 task (AF-01 countdown invoice lunas, AF-02 banner onboarding mantan penghuni, AF-03 catatan INFO). Detail di [Fase AF](#fase-af--perbaikan-temuan-audit-invoice-checklist_06--selesai).
> 11. **AG-01** — ✅ **SELESAI** — Fase AG (CHECKLIST_07): C07-01 sama dengan C06-02, tercakup AF-02. Detail di [Fase AG](#fase-ag--perbaikan-temuan-audit-tiket-checklist_07--selesai).
> 12. **AH-01..AH-04** — ✅ **SELESAI** — Fase AH (CHECKLIST_08): hardening 503 announcements + verifikasi STALE Hermes I12/I13. Detail di [Fase AH](#fase-ah--perbaikan-temuan-audit-info-checklist_08--selesai).
> 13. **AI-01..AI-02** — ✅ **SELESAI** — Fase AI (CHECKLIST_09): hardening 503 isBookingSchemaReady + FE tak blokir portal; loyalty/renewal/checkout diverifikasi via kode. Detail di [Fase AI](#fase-ai--perbaikan-temuan-audit-loyaltyrenewalcheckout-checklist_09--selesai).
> 14. **AJ-01..AJ-07** — ✅ **SELESAI** — Fase AJ: anti-loop live lulus, re-seed dev 5433 lulus + TB balanced, label okupansi jelas, dokumen sinkron, dan AJ-07 safe follow-up dicatat (C19-01/C19-02). Detail di [Fase AJ](#fase-aj--sisa-temuan-audit-2026-07--selesai).
> 15. **AN-01..AN-06** — ✅ **SELESAI pada penutupan Juli** — keenam task sudah dicentang pada [Fase AN](#fase-an--hardening-keuangan-pasca-audit-deep), termasuk penyeragaman journal handling AN-03. Status ANTRIAN lama dicabut; jangan implementasikan ulang dari temuan audit sebelum perbaikan.
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
> 26. **BYPASS-TENANT (by-pass tenant gagap teknologi)** — ✅ **SELESAI** — halaman baru `/stays/assist` "Bantu Penghuni" (OWNER/ADMIN) menyelesaikan 3 aksi dalam satu layar tanpa lompat menu: pilih masa sewa aktif → catat meter otomatis (Tuya) → catat pembayaran tunai & tutup tagihan. Memanfaatkan endpoint yang sudah ada (`recordMeterCycle` auto, `createPayment`, `issueInvoice`). Build frontend ✅ (PWA verified). Sisa #2 (de-emphasize nav) & #3 (audit tenant awam) tetap terbuka untuk sesi berikutnya.
> 27. **DE-EMPHASIZE-NAV (buang fitur rumit)** — ✅ **SELESAI** — item rumit (survei/reward/AI/loyalty/poin) dipindah dari nav utama ke section "Lainnya" di admin/owner/tenant; route & halaman TIDAK dihapus. Fokus nav ke alur inti (check-in–checkout, bayar, operasional). `tsc` FE ✅. Sisa #3 (audit UI/UX tenant awam — perbesar tombol inti "Bayar"/"Catat Meter"/"Lapor Masalah") tetap terbuka.
> 28. **TENANT-AWAM-UI (audit tenant awam)** — ✅ **SELESAI (bagian tombol inti)** — hub aksi tenant kini punya 3 tombol inti besar & biru di baris atas: **Bayar Tagihan** + **Catat Meter** + **Lapor Masalah** (sebelumnya "Bayar"/"Lapor Masalah" belum jadi tombol). "Bayar Tagihan" mengarah ke invoice paling mendesak. Aksi lanjutan (Perpanjang/Keluar/Hubungi Admin) tetap di baris kedua. Grid 3 kolom. `tsc` FE ✅.
> 29. **TENANT-AWAM-BAYAR-LAPOR** — ✅ **SELESAI** — MyInvoicesPage kini punya CTA utama "💳 Bayar Tagihan Kamu" + tombol besar "Bayar Sekarang" (arah ke invoice paling mendesak), label baris disederhanakan; MyTicketsPage tombol "Buat Laporan Baru" diperbesar + label kategori "Air / keran bocor". `tsc` FE ✅.
> 30. **TENANT-AWAM-AUDIT-LANJUT** — ✅ **SELESAI** — modal bayar+upload bukti diringkas (form inti: jumlah+metode+bukti; field opsional dilipat ke "Info tambahan (opsional)"), label kategori laporan disederhanakan & disinkronkan (Perabot kamar / Masuk-keluar kamar / Tagihan-Pembayaran / Air-keran bocor), jargon MyInvoicesPage diluruskan. Test stale `navigation.test.ts` (OWNER kini 2 grup nav) diperbaiki. `tsc` FE ✅ + `vitest run` ✅.
>
> 31. **EF-00..EF-09** — prioritas Fase EF; status kanonik pada bagian Fase EF di bawah. EF-01/03/05 tersedia lokal, identitas host sebagian terisi 13 Sep (M20 §2), worker EF-09 ditunda.
>
> **Penutupan historis Juli — task berikut sudah selesai, jangan diulang:**
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
**Hasil penutupan Juli:** `tsc` BE ✅ FE ✅ · `npm run test:unit` 48/48 ✅ pada saat itu. Semua task di bawah selesai; angka ini bukan hasil pengujian sesi sekarang. Perubahan uang berikutnya mengikuti gate M04, bukan mengulang implementasi ini.

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
- [x] **AO-00 🔴 P0** — dua migration UAT diterapkan 30 Juli 2026 menurut M13. Jangan menjalankan ulang migration historis. Sebelum crawl baru, verifikasi status ledger target UAT secara read-only; migration baru yang ternyata pending memerlukan lingkup tersendiri. **8 Sep:** `settings_tuya_vapid` terdeteksi pending (kolom sudah ada) → di-`resolve --applied` dengan persetujuan owner; status kini "up to date".
- [x] **AO-01 🟠 P1** — satukan state katalog publik saat API daftar kamar gagal; jangan tampilkan “0 kamar” bersamaan dengan kalender berisi kamar.
- [x] **AO-02 🟠 P1** — perbaiki urutan hooks halaman loyalitas agar feature redirect tidak memicu ErrorBoundary.
- [ ] **AO-03 🟠 P1** — lima persona audit UAT non-personal dengan role/relasi/state yang terverifikasi. Mekanisme tersedia di `74068aa`. **Progres:** gap alat audit 8 Sep ditangani lewat perbaikan alat, lalu provisioning + crawl OWNER/ADMIN/STAFF dieksekusi 8 Sep (OWNER 36/36, ADMIN 32/32, STAFF 7/7); 12 Sep lima persona diaudit memakai token audit, bukan akun personal ([AUDIT_UIUX_TOTAL §3](AUDIT_UIUX_TOTAL_2026-09-12.md)). **Sisa:** persona TENANT aktif (didefer 8 Sep) dan verifikasi ledger/DoD — bukan lagi soal izin akun/portal.
- [x] **AO-04 🟠 P1** — kurangi duplikasi navigasi tenant mobile dan dominance onboarding global.
- [x] **AO-05 🟠 P1** — selaraskan istilah masa sewa aktif, lewat jatuh tempo, renewal, dan checkout.
- [x] **AO-06 🟠 P1 — SELESAI (12 Sep sore):** seluruh kontrol lulus pengukuran. `/reset-password` (3 kontrol) diperbaiki dengan `controlId`; `PasswordInput` kini meneruskan `controlId` ke input di dalam `InputGroup` (context react-bootstrap terputus oleh InputGroup); `<Form.Check>` tanpa `type` di `/staff-routines` diberi `aria-label` karena label tidak dirender. Verifikasi: Axe `label`/`select-name` = **0 node** di 35 rute OWNER, 7 rute STAFF, 6 rute TENANT, dan 8 rute publik.
- [x] **AO-07 🟡 P2** — hilangkan overflow horizontal `/profile` dan pecah halaman profil yang terlalu panjang. (Terverifikasi ulang 12 Sep: overflow 0 px di 375 px untuk TENANT dan STAFF.)
- [x] **AO-08 🟡 P2 — SELESAI (12 Sep sore):** 62 node `color-contrast` serious → **0**. Perbaikan: varian `-emphasis` Bootstrap menggantikan `.text-warning/.text-info/.text-danger` (1,47–3,39:1 → 7,2–10,4:1); cacat **judul kartu gelap 1,09:1** diperbaiki (aturan global `h1–h6, strong` ber-`!important` di `06-tenant.css:13–30` dikecualikan untuk permukaan gelap); `--green-700` pada checklist (3,30→5,02); `.report-matrix-row span` tidak lagi menimpa warna badge (1,05→lulus lewat `.text-bg-*`); `#64748b`→`--gray-600` pada kartu biru muda; `--gx-coral` digelapkan (4,04→6,5); `.progress-bar` diberi nama. Rincian: **§0** [AUDIT_UIUX_TOTAL_2026-09-12](AUDIT_UIUX_TOTAL_2026-09-12.md).
- [x] **AO-09 🟡 P2 — SELESAI (12 Sep, termasuk sisa P3):** `/reset-password` kini memiliki `<main>` + `<h1>` (0 pelanggaran Axe pada 375 px); `/portal/stay` TENANT memiliki `<h1>`. Sisa P3 `<h1>` ganda pada `/inventory/gudang`, `/inventory/barang-kamar`, `/inventory/mutasi`, dan `/staff-report` **sudah diperbaiki** di commit `9c211a0`: `PageHeader` menerima `as?: 'h1'|'h2'`, `SimpleCrudPage` memakai `as="h2"` di dalam shell inventaris, dan blok print `/staff-report` ditandai `aria-hidden`. Bukti: [AUDIT §0c](AUDIT_UIUX_TOTAL_2026-09-12.md#0c-hasil-perbaikan-t-08--normalisasi-token--struktur-judul) dan `frontend/src/components/common/PageHeader.tsx`.
- [x] **AO-10 🟡 P2** — ringkas manual tenant mobile dengan progressive disclosure.
- [x] **AO-11 🟡 P2** — perjelas scroll/filter horizontal dan target sentuh mobile.
- [x] **AO-12 🟡 P2** — buat kontrak koneksi API saat `npm run dev` eksplisit dan reproducible.
- [ ] **AO-13** — crawl OWNER/ADMIN/STAFF setelah ledger UAT dan AO-03 terverifikasi. Tiga role harus benar-benar dieksekusi, 0 skip; verifikasi role, route tujuan, konten halaman, dan seluruh temuan. Exit 0 pada skrip saat ini belum cukup membuktikan gate lulus (M14 audit 8 Sep).
- [x] **AO-15 🟢 P3** — kelompokkan link footer publik dan pertahankan empat pola publik `Best-in-Class` dari benchmark Baymard.
- [x] **AO-16 🟡 P2** — bedakan empty result karena filter/data/error dan pertahankan shortlist perbandingan selama sesi detail/back.
- [x] **AO-17 🟠 P1** — adaptasikan hero/teaser homepage untuk state 0 kamar tanpa sinyal hijau, CTA palsu, atau grid kosong; tangkap minat via WhatsApp.
- [ ] **AO-18 🟡 P2 — PARSIAL:** trust 3+2, ikon semantik dan FAQ sentence case sudah selesai; sisa polish copy/validasi hierarchy homepage diselesaikan sebelum sign-off AO-14. Bagian selesai tidak diulang.
- [ ] **AO-19 🟡 P2 — PARSIAL (inventaris aset SELESAI 17 Sep 2026; sisa butuh keputusan owner):** cue galeri touch/focus selesai 15 Sep dan **inventaris kualitas aset publik kini selesai** — 135 berkas/13,54 MB, **0 yatim**, hanya **3 thumbnail** (0 untuk 116 foto kamar), **17 berkas >300 KB = 71% bobot** (set `kamar-j*`+`kamar-m*` 15 berkas = 8,6 MB = 62%), dan tidak ada varian ukuran pada jalur `resolveKost48MarketingImageUrl()` sehingga kartu katalog ±272–360 px memuat berkas sampai 4096 px / 1 MB. Bukti: [M14 AO-19](M14_AUDIT_UI_UX.md#ao-19--p2--audit-kualitas-aset-publik-dan-interaction-cue-galeri), `.audit-runtime/out/public-assets-inventory.{md,json}`. **Sisa (keputusan owner, tanpa itu checkbox tetap terbuka):** sumber/hak pakai foto pengganti, keseragaman aspek (set J persegi vs M 16:9), dan izin optimasi aset (thumb 800 px untuk 22 foto berat + batas sisi panjang ±2400 px). Re-encode **tidak** dikerjakan dan tidak menambah dependency.
- [ ] **AO-20 🟠 P1 — sisa lokal diimplementasi 13 Sep; UAT masih BLOCKED:** CTA alert, grouping toolbar, CTA AI, dan pilihan mode Owner yang idempotent sudah selesai sebelum sesi ini (tidak diulang). **Sisa pembedaan state KPI + label aksi selesai lokal:** modul pur `ownerDashboardState.ts` (stale 2,5× interval TanStack; silent zero valid untuk Pendapatan; deteksi periode tanpa aktivitas yang dapat dibuktikan dari agregat — tanpa ubah kontrak API), note state per-KPI `⚠ Data tertunda`, banner info `Belum ada aktivitas dicatat...`, `aria-label` pembaca layar pada baris sinyal, tone amber saat data stale. **Verifikasi lokal:** `npx tsc -b` exit 0 · `npx vitest run` 147/147 (14 test baru) · `npm run build` exit 0 (PWA `_7OTEvBbqfHK`). **UAT desktop OWNER 1440 px + visual regression besar belum bisa dilakukan** — sign-off AO-14 tetap menunggu sesi persona/autentikasi; checkbox dibiarkan `[ ]`.
- [ ] **AO-21 🟡 P2** — normalisasi sistem visual/terminologi Owner setelah AO-20 review; perubahan AppLayout harus dikoordinasikan.
- [x] **AO-22 🟠 P1** — susun dashboard Area Admin agar exception dan antrean lima aksi tampil sebelum metrik; perkuat CTA tanpa membuat queue kedua.
- [ ] **AO-23 🟡 P2** — konsolidasikan komponen/shell Area Admin dengan regresi Owner bila AppLayout atau shared CSS berubah.
- [ ] **AO-14** — audit final setelah AO-01..13 dan AO-15..23 memenuhi DoD: publik, OWNER/ADMIN/STAFF dan dua state TENANT nyata, viewport 320–1440 px, Axe/gate Baymard, build/test relevan, screenshot/trace aman. Crawl AO-13 saja tidak menutup dependensi maupun sign-off Fase AO. **Progres 12 Sep:** bukti crawl 180 pemeriksaan (6 role × 2 viewport) + Axe tersedia di [AUDIT_UIUX_TOTAL_2026-09-12](AUDIT_UIUX_TOTAL_2026-09-12.md); **gate Axe kini LULUS** setelah perbaikan sore (0 pelanggaran critical/serious pada permukaan yang diaudit ulang), `tsc -b` dan `npm run build` exit 0. Sisa sebelum sign-off: viewport 320 px, rute ber-fixture (`/booking/:roomId`, `/invoices/:id`, `/stays/:id`, detail pengumuman), AO-18/19/20 parsial, AO-21/23 (normalisasi token), serta T-06 performa `/portal/stay`.

**Temuan 12 Sep → status perbaikan:** T-01 label form ✅ selesai · T-02 kontras ✅ selesai · T-03 overflow `/tickets` STAFF ✅ selesai · T-04 nested-interactive ✅ selesai · T-05 heading/landmark ✅ selesai (termasuk `<h1>` ganda) · **T-06 performa `/portal/stay` ✅ selesai** (23 → 17 request, 0 duplikat, konten 1500 → 900 ms) · T-07 overflow kecil ✅ selesai · **T-08 normalisasi token ✅ selesai untuk radius & judul** (27 → 12 nilai radius, skala terdokumentasi di `00-tokens.css`; breakpoint sengaja tidak diubah dengan alasan tercatat). Rincian perbaikan: [§0](AUDIT_UIUX_TOTAL_2026-09-12.md#0-hasil-perbaikan--12-september-2026-sore), [§0b](AUDIT_UIUX_TOTAL_2026-09-12.md#0b-hasil-perbaikan-t-06--performa-render-awal-portalstay), [§0c](AUDIT_UIUX_TOTAL_2026-09-12.md#0c-hasil-perbaikan-t-08--normalisasi-token--struktur-judul). Seluruh temuan P1/P2/P3 audit 12 Sep kini tertutup atau beralasan terdokumentasi.

**Gate akhir:** tidak ada 500/blank page, tidak ada overflow global pada 375 px, Axe serious/critical = 0 pada route prioritas, dan matriks role dinamis lengkap.

---

### Fase EF — Efisiensi Shared Hosting 512 MB

**Prioritas aktif.** Spesifikasi/DoD: [M19](M19_EFISIENSI_HOSTING_512MB.md). Keputusan: M02 §Keputusan arah aplikasi. Checkbox selesai di bawah hanya menyatakan lingkup implementasi lokal yang disebut; deployment dan dampak server masih UNKNOWN. Bukti audit/typecheck berasal dari laporan Cline yang diterima owner; build EF-05 dari riwayat M13, tidak diulang saat sinkronisasi docs.

- [ ] **EF-00 P0 — Baseline deployment:** konfigurasi panel dan limit/snapshot resource diterima 7 Sep 2026. **13 Sep 2026 (izin owner):** identitas deployment terisi sebagian — SSH `api.kost48surabaya.com:4422` / server `batikan.idweb.host`, application root `/home/kost48s1/kost48-prod`, document root `/home/kost48s1/public_html`, Node 22.23.2 (venv), startup `dist/main.js`, satu proses Passenger saat idle, urutan env **panel > `.htaccess` > `.env`**, DB produksi `kost48s1_prod26`, paket 12 Sep terverifikasi checksum di server ([M20 §2](M20_PRODUKSI_KOST48.md)). Sisa UNKNOWN: SHA tunggal artefak yang berjalan, jam deploy presisi, perilaku runtime EF-01/03/05, serta fault/interval pengukuran. M19 §9.1–9.3 sudah disinkronkan — jangan isi ulang dari asumsi.
- [x] **EF-01 P1 — Implementasi telemetri lokal opsional:** service + interceptor terpasang di working tree; default OFF, timer unref/cleanup. Audit statis + typecheck dilaporkan lulus. Aktivasi, privasi label request saat runtime, dan hasil log host belum diverifikasi; jangan klaim seluruh log bebas PII tanpa memeriksa fallback path.
- [ ] **EF-02 P0 — Baseline workload:** snapshot host 7 Sep tersedia di M19 §9, tetapi interval/workload/peak/fault belum terukur. **13 Sep (bukti awal, bukan baseline):** satu instance Passenger saat idle, RSS ≈200 MB/proses, `/api/public/rooms` ≈0,3 s, dan dua proses sempat hidup bersamaan setelah restart ([M20 §10](M20_PRODUKSI_KOST48.md)). Uji aktif membutuhkan izin server; tanpa cron IoT baru. Catat skenario, rentang waktu, jenis angka (sesaat/rata-rata/puncak), resource/fault dan artefak yang diuji.
- [x] **EF-03 P0 — Implementasi Prisma singleton lokal:** reports.module memakai PrismaModule global; provider PrismaService hanya di prisma.module pada audit statis. Typecheck dilaporkan lulus. Jumlah pool/koneksi runtime bergantung pada konteks/proses aktual; host UNKNOWN.
- [ ] **EF-04 P2 — Profil paket static:** peta aset/routing lokal selesai; implementasi profil belum dilakukan. **13 Sep:** deploy `client/` saja terbukti berlaku **tanpa restart** ([M20 §6](M20_PRODUKSI_KOST48.md)), memperkuat pemisahan profil static. Kandidat publik: build SPA dan gambar kamar publik. Upload privat tidak masuk dokroot/CDN publik. DoD: paket dan kedua profil diverifikasi setelah implementasi diizinkan.
- [x] **EF-05 P2 — Implementasi packaging kanonik lokal:** bundle-deploy delegasi ke make-deploy; README ganda dan contoh cron IoT dihapus. Riwayat M13 mencatat make-deploy/bundle fast lulus (9.639 file saat pengujian itu). Artefak server/pemakaian generator ini UNKNOWN.
- [ ] **EF-06 P2 — Kontrak routing/canary:** matriks dirancang di M19 §3.4; kemampuan host, canary dan rollback belum diuji. **13 Sep (sebagian terbukti di host):** deploy paket + klien, deploy `client/` tanpa restart, restart `kill -TERM` + revive Passenger, rollback kode dari `~/backups/`, dan rollback DB lewat pengalihan `DATABASE_URL` env **sudah dijalankan** ([M20 §6, §9](M20_PRODUKSI_KOST48.md)); canary/bucket routing belum diuji. Uji aktif hanya dengan izin; tanpa perubahan DB.
- [ ] **EF-07 P1 — Konfigurasi efektif env/DB:** pemetaan statis selesai. Override AutoOps ada lokal; uji false melawan DB true belum dilakukan. **13 Sep:** kasus itu nyata di produksi — row `OperationalSetting.autoOpsEnabled` masih `true` sehingga `AUTO_OPS_ENABLED=false` wajib diset di env cPanel, dan env panel terbukti menang atas `.htaccess`/`.env` ([M20 §2, §8](M20_PRODUKSI_KOST48.md)); uji formal flag false vs DB true tetap belum. Bedakan flag AI dan key DB/env; jangan hapus key. IoT on-demand, tanpa cron Tuya. Inbox/pengumuman harus tetap bekerja.
- [ ] **EF-08 P2 — Lifecycle/peak:** stop/start, shutdown pool/timer dan idempotensi belum diuji runtime. **13 Sep (bukti lifecycle):** restart `kill -TERM` + revive Passenger dijalankan saat deploy, dan **dua proses Passenger sempat hidup bersamaan** (RSS ±170–200 MB masing-masing) — overlap nyata, bukan asumsi ([M20 §10](M20_PRODUKSI_KOST48.md)); shutdown pool/timer dan idempotensi tetap belum diuji. Rencanakan pengujian terarah; jangan jalankan server/UAT atau ubah hooks tanpa lingkup terkait.
- [ ] **EF-09 P3 — Gate worker CLI (DITUNDA):** bukan izin membuat worker. Hanya dibahas jika pengukuran AutoOps yang dibatasi membuktikan kebutuhan, dengan budget overlap API+worker dan persetujuan desain.

**Gate EF:** bukti deployment EF-00 + pengukuran EF-02 untuk artefak yang diketahui, verifikasi lokal EF-01/03/05 yang relevan, konfigurasi/lifecycle aman, serta tanpa regresi `/api`/auth/upload bila profil deploy diubah. Angka disk/heap/RSS/PMEM tidak dicampur; tidak ada klaim 512 MB cukup sebelum bukti host.

### Fase MA — Batas Modul & Kesiapan Ekstraksi

- [x] Audit arsitektur lama diterima sebagai bahan perencanaan; penamaan diselaraskan dari V5.7/V5.8/V5.9 arsitektur.
- [ ] **Implementasi DITUNDA:** tanpa apps/libs, app Nest baru, ekstraksi shared service, worker atau pemisahan proses. Bukan PASS kesiapan migrasi. Lanjut hanya setelah keputusan owner berikutnya; Fase EF didahulukan.

---

### Fase A — Pra-Go-Live Produksi

**Tujuan:** aplikasi siap publish bersih, tanpa data UAT/testing.  
**Rujukan:** `docs/M08_DEPLOY_GO_LIVE.md` · `backend/.env.production.example`.

- [ ] **A1 / F1-12** 🧑 Owner lengkapi identitas hosting/deployment, domain/HTTPS, host/nama/port PostgreSQL produksi dan kesiapan env rahasia. Ikuti bukti parsial M19; port/nama DB produksi tidak diasumsikan dari UAT atau default. **Status 16 Sep 2026 (sinkronisasi docs, tanpa pengukuran baru):** sebagian besar terpenuhi dari deployment nyata — identitas deployment, domain/HTTPS, nama DB produksi, dan urutan env ada di [M20 §2](M20_PRODUKSI_KOST48.md). **Sisa yang membuat checkbox ini tetap terbuka:** versi/port PostgreSQL (socket lokal) masih pertanyaan untuk IDwebhost ([M20 §11](M20_PRODUKSI_KOST48.md) butir 8) dan kesiapan rotasi secret (A4).
- [x] **A2 — SELESAI 13 Sep 2026, bukti diverifikasi 16 Sep:** fresh provision dijalankan: DB produksi **baru** `kost48s1_prod26` (DB uji lama `kost48s1_kost48_prod` dipertahankan utuh, tidak di-drop), bootstrap skema, OWNER pertama, lalu seed COA 38 akun + 1 periode `OPEN` + 2 CashAccount. `db push`/seed historis tidak dipakai untuk produksi; patch skema tetap dipisahkan dari bundle karena `_prisma_migrations` tidak ada. Bukti: [GO_LIVE §E](GO_LIVE_CPANEL_CHECKLIST.md), [M20 §2–§3](M20_PRODUKSI_KOST48.md).
- [x] **A3 — SELESAI 13 Sep 2026, bukti diverifikasi 16 Sep:** env produksi terpasang — `NODE_ENV=production`, `JWT_SECRET` acak ≥32 karakter (app menolak start bila lemah), CORS/domain final `kost48surabaya.com`, `NODE_OPTIONS=--max-old-space-size=192` lewat env cPanel, dan gate KTP aktif terbukti (`ktpVerificationGateEnabled: true` pada smoke test produksi). VAPID sengaja tidak diaktifkan (push opsional; tanpa env push NONAKTIF, inbox in-app tetap jalan). **Catatan batas:** nilai `JWT_SECRET`/password DB masih terbaca di `public_html/.htaccess`, sehingga rotasinya tetap tugas **A4** — bukan penutupan A3.
- [ ] **A4** Konfirmasi rotasi password OWNER yang pernah terekspos (M13 7 Sep), serta penggantian kredensial dummy/dev sebelum penggunaan produksi. Pembersihan teks repo SEC-CLEAN selesai; bukti rotasi belum tersedia. Jangan catat nilai password di dokumen.
- [ ] **A5** Isi opening balance bila ada modal/saldo awal; kalau mulai nol, dokumentasikan zero-start.
- [ ] **A6** Smoke test prod: login OWNER, public rooms 200, trial balance balanced, recon mismatch 0, readiness tanpa blocker merah. **Status 16 Sep 2026 — sebagian terbukti, checkbox sengaja dibiarkan terbuka:** login OWNER, `/api/public/rooms` 200 (13 kamar), `/api/stays` tanpa token 401, deep link SPA, header cache, dan gate KTP sudah diuji lewat HTTPS ([GO_LIVE §E](GO_LIVE_CPANEL_CHECKLIST.md)). **Belum ada bukti** untuk trial balance `isBalanced=true`, recon mismatch 0, dan readiness tanpa blocker merah — readiness masih 75/100 dengan `formalStatementReady=false` karena opening balance belum diisi ([M20 §3](M20_PRODUKSI_KOST48.md)).
- [x] **A7** `backend/package.json` sudah punya `pretest:unit = npm run build` — test unit pakai `dist` segar.
- [x] **A8** Hardening hasil audit DEEP-01..05 selesai; HSTS dan `Permissions-Policy: camera=(self)` sudah masuk changelog.

**Gate:** `docs/M08_DEPLOY_GO_LIVE.md` smoke PASS. **Jangan** backfill data UAT ke produksi; setelah go-live semua release database patch-only.

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

**Key files:** `auto-ops/sweeps/` (5 sub-service), `stays-renewal.service.ts`, `test/integration/`, `frontend/e2e/`, `docs/archieve/2026-06-20_fase_selesai/FASE_E_EVALUASI_ARSITEKTUR.md`.  
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

**Key files:** `owner-ai.helpers.ts`, `backend/test/unit/owner-ai-safety.test.js`, `AiAssistButton.tsx`, `AiResultPanel.tsx`, `docs/archieve/_previous_cycles/M09_AUDIT.md`.  
**Rujukan:** `docs/archieve/2026-06-20_fase_selesai/M15_FASE_J_HARDENING_AI.md`.  
**Cakupan selesai:** J0 ekstrak guard → `owner-ai.helpers.ts`, J1 unit test ≥18 assert PDP+uang, J2 guard no-partial AI, J3 FE error non-blocking, J4 audit 12 endpoint owner-ai dibukukan di M09.

---

### Fase K — Pasca-Audit Total ✅ SELESAI

**Key files:** berbagai — lihat `docs/archieve/2026-06-20_fase_selesai/M16_PASCA_AUDIT_PLAN.md`.  
**Cakupan selesai (13 task, commit `ac4cc2f`):** P1-P3 keamanan (RolesGuard, DTO multipart, hapus STAFF dari 11 endpoint), P5-P6 circuit breaker DeepSeek + advisory lock, Q1-Q5 data integrity (resolveRent unifikasi, merge helpers, @unique NIK, @index, deposit handling), R1-R5 CSS tokens, unifikasi arus kas, DeepSeek UI Settings, error handling + dead code.

---

### Fase L — UI/UX Audit Menyeluruh ✅ SELESAI

**Rujukan utama:** `docs/archieve/2026-06-20_fase_selesai/M17_FASE_L_UIUX_AUDIT.md` · `docs/archieve/fase-l-specs/`  
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

**Sumber temuan:** `docs/archieve/_previous_cycles/_SPEC_FASE_X_UIUX.md` · screenshot `frontend/screenshots-ui/visual/`.

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
**Rujukan detail:** `docs/archieve/_previous_cycles/_AUDIT_CROSS_PORTAL_2026-07-02.md` (laporan lengkap dengan screenshot & kode fix).  
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
> **Spec eksekutor (WAJIB dibaca sampai habis sebelum coding, dibuat untuk AI lemah):** `docs/archieve/_previous_cycles/_SPEC_FASE_AJ_SISA_AUDIT.md` — berisi langkah per file, kutipan kode SEBELUM/SESUDAH, dan kriteria lulus.
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

> **Sumber:** `docs/archieve/_previous_cycles/M17_AUDIT_360_P3_P8.md` — 1 CRITICAL, 1 MEDIUM, 4 LOW.
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
- `docs/archieve/_previous_cycles/M17_AUDIT_360_P3_P8.md` — status eksekusi

**Gate:** `npx tsc --noEmit` backend ✅ (1 pre-existing error auto-ops) · `npm run build` FE ✅ · Schema siap `db push` saat env hidup.

### Fase M16 — Perbaikan Temuan Audit 360° Flow Huni ✅ SELESAI (2026-07-06)

> **Sumber:** `docs/archieve/_previous_cycles/M16_AUDIT_360_FLOW_HUNI.md` — 7 temuan (2 HIGH, 4 MEDIUM, 1 LOW).
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
- `docs/archieve/_previous_cycles/M16_AUDIT_360_FLOW_HUNI.md` — Section 7 status eksekusi

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
| [x] AL-OC-05 | ✅ | **M29 ExternalReview CRUD audit** — audit selesai, laporan di `docs/archieve/audit_reasonix/M29_AUDIT_EXTERNAL_REVIEW.md` | `docs/archieve/audit_reasonix/` |

#### Perbaikan bug kritis — selesai menurut riwayat 7 Juli 2026

| Task | Bug | File | Estimasi |
|------|-----|------|----------|
| [x] AL-FIX-1 | DISCOUNT line → journal tidak terposting | `accounting-posting-helpers.ts:70-76` | 1-2 jam |
| [x] AL-FIX-2 | Overdue aging gross→net (partial payment) | `reports.service.ts:117` | 30 menit |
| [x] AL-FIX-3 | Renewal cross-term undercharge | `renew-requests.service.ts:267` | 1 jam |
| [x] AL-FIX-4 | Collection rate period mismatch | `finance.service.ts:77-86` | 1 jam |
| [x] AL-FIX-5 | Journal pending tanpa retry | `payment-submissions.service.ts:794` | 2 jam |
| [x] AL-FIX-6 | `@IsNumberString` vs JSON number di CreateStayDto | `stay.dto.ts:58-63` | 30 menit |

#### Rekonsiliasi backlog AL (8 September 2026)

M13 pada 7 Juli mencatat C1–C6 dan H1–H15 selesai; jumlah temuan audit awal bukan jumlah backlog terbuka sekarang. H1–H14 tidak dijalankan ulang tanpa regresi baru. H15 merujuk verifikasi manual dashboard Owner Z-19 (catatan 4 Juli) yang masih `[ ]` pada ledger Fase Z; bukti penutupan spesifik belum tersedia, sehingga verifikasi tersebut tetap terbuka dan dapat dikoordinasikan dengan AO-13/14.

Sisa temuan menengah/rendah atau refactor hanya dipilih setelah dicocokkan dengan penutupan terbaru di M12/M13 dan diprioritaskan owner. Dossier `docs/archieve/audit_reasonix/RINGKASAN_EKSEKUTIF.md` adalah sumber audit historis, bukan izin implementasi seluruh daftar.

#### 🆕 MINI PROJECT — WiFi Voucher System (AL-04)

Owner konfirmasi: voucher system, non-tenant bisa beli. Paket: sebulan 50k, 2 minggu 40k, seminggu 20k, sehari 5k. Spec terpisah.

**Gate akhir Fase AL (audit):** Build backend ✅ · Build frontend (tdk perlu — hanya DTO) · 10 file audit-reasonix lengkap (di `docs/archieve/audit_reasonix/`).
