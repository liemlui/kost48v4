# KOST48 V5 — M13 Changelog

## 2026-09-22 (docs) — DOC-GOV-20260922 Tahap 1: indeks dokumentasi + penyelarasan workflow

- **Keputusan owner:** rancangan [DOC-GOV-20260922](plans/DOC-GOV-20260922.md) Tahap 1 disetujui; scope dokumentasi lokal, tanpa commit dan tanpa menyentuh source, DB, atau server.
- **Implementasi lokal:** `docs/README.md` dibuat sebagai indeks berbasis kebutuhan (mulai task, domain, operasional, audit, riwayat) — menutup rujukan `docs/README.md` yang sebelumnya menembus file belum ada di `AGENTS.md` §3/§4. Diselaraskan: AGENTS §3 (fungsi indeks), GUIDE (status Tahap 1, tautan status task AGENTS §7 dan indeks), QUICKREF (tautan indeks), AI_MASTER (status task, baris peta file, catatan §7, log keputusan), M12 (task prompt aktif, kesiapan antrean #8, entri status kerja), dan entri M13 ini.
- **Verifikasi lokal:** `git diff --check` exit 0 · pemeriksa tautan relatif atas 16 dokumen: **289 tautan, 0 rusak** (sebelum Tahap 1: 236 tautan, 2 rusak) · fragment dalam set: 44 diperiksa, 0 gagal resolve · rujukan masuk ber-fragment ke dokumen yang berubah diperiksa ulang dan tetap utuh · hitungan M12: `[ ]` 23→23, `[x]` 100→101, gate/perintah 6→6. Tanpa build/test/lint/typecheck/server (docs-only).
- **Deployment:** tidak dilakukan. **Dampak runtime:** tidak diukur; source aplikasi, config permission, DB, dan secret tidak disentuh. Tahap 2–4 serta keputusan commit dan nasib artefak untracked masih menunggu owner.

## 2026-09-22 (arah produk) — Penyederhanaan OWNER/ADMIN dan landasan IB

- **Keputusan owner:** prioritas penyederhanaan aplikasi, fokus operasional penghuni/keuangan, pengguna utama OWNER/ADMIN, dashboard mudah dipahami, dan dampak keputusan bisnis/uang jelas. Pengembangan IoT ditunda. Owner mengklarifikasi IB sebagai IB Diploma Business Management Theory untuk landasan bisnis kost.
- **Implementasi lokal:** keputusan dicatat di M02; arah produk diselaraskan pada AGENTS, pintu masuk M00/M01 dan antrean M12. Rancangan DOC-GOV-20260922 dilengkapi enam flow utama, usulan matriks dampak keputusan, dan pemetaan awal teori IB → keputusan/data/aplikasi/evaluasi. FLOW-CORE-01 tetap DRAFT; migrasi XL belum disetujui.
- **Pemeriksaan domain:** pembacaan terarah M03/M04/M05/M14 menemukan narasi historis pelunasan/check-in yang perlu dibedakan dari override aktif, serta pentingnya membedakan DP/deposit, kas/piutang dan checkout/kesiapan kamar. Ini temuan dokumentasi, bukan bug runtime atau audit kode baru.
- **Verifikasi:** inspeksi isi/diff; pemeriksaan seluruh tautan baru/berubah dan rancangan saat ini: 33 referensi lokal, termasuk 12 fragment, 0 kegagalan (exit 0); `git diff --check` exit 0. Gate uang, keputusan nominal, source, DB, dan server tidak diubah. Test/build tidak dijalankan karena docs-only. Sumber IB resmi dan batas akses PDF dicatat pada rancangan.
- **Deployment/dampak runtime:** tidak dilakukan/tidak diukur. Perubahan UX, penyederhanaan seluruh docs, serta validasi implementasi teori bisnis masih pekerjaan berikutnya.

## 2026-09-22 (docs) — Koreksi arahan AI dan rancangan penataan menyeluruh

- **Permintaan owner:** alur manajemen pengembangan AI yang aman, penataan total dokumentasi, dan penyelesaian temuan audit docs sebelumnya.
- **Implementasi lokal:** AI_MASTER diselaraskan dengan konsolidasi Stage 1–5 selesai; status wrapper/audit diperbaiki di QUICKREF dan indeks audit; GUIDE menandai roadmap lama sebagai usulan historis. M12 merujuk prosedur AGENTS, membaca sesuai kebutuhan, dan memisahkan kesiapan task dari penanggung jawab tanpa mengubah gate bisnis.
- **Batas tooling terdokumentasi:** mode build wrapper belum membangun apa pun (exit 3); mode audit hanya memeriksa keberadaan path, bukan kesegaran/PASS perilaku. Tidak menjalankan wrapper atau test ulang.
- **Rancangan:** [DOC-GOV-20260922](plans/DOC-GOV-20260922.md), status DRAFT. Workflow, batas keselamatan, mapping seri M00–M20/empat file non-M, migrasi anchor/riwayat, serta acceptance sudah ditulis. Migrasi XL dan perubahan aturan kanonik menunggu persetujuan rencana sesuai AGENTS §5.
- **Verifikasi lokal:** inspeksi diff/isi; pemeriksaan tautan baru/berubah dan rancangan: 19 referensi lokal, termasuk 4 fragment anchor, 0 kegagalan (exit 0); `git diff --check` exit 0. Tanpa build/test/lint/typecheck/server. Source aplikasi, config permission, DB, secret, commit/push tidak disentuh.
- **Deployment:** tidak dilakukan. **Dampak runtime:** tidak diukur. Temuan M12 terlalu besar belum ditutup; pengurangan ukuran masuk tahap migrasi setelah approval.

## 2026-09-20 (ops) — Rotasi secret produksi + cleanup disk

> Sumber bukti operasional: laporan owner, 20 Sep 2026 malam; tidak diperiksa ulang ke server pada pembaruan dokumentasi ini.

- **Rotasi:** password DB user `kost48s1_lurin` (via cPanel)
  dan `JWT_SECRET` produksi. `.env` produksi diupdate; nilai
  disimpan di password manager, tidak dicatat di repo.
- **Higiene `.htaccess`:** baris `SetEnv DATABASE_URL` +
  `SetEnv JWT_SECRET` dihapus dari `public_html/.htaccess`;
  verifikasi `grep -c` = 0. Env app kini bersumber dari
  `.env` + (opsional) cPanel env, tanpa kedua SetEnv tersebut.
- **Cleanup PII:** `sql/seed.sql` (854 KB) dan
  `sql/seed_ORIGINAL.sql` (618 KB) dihapus; file password tenant
  awal (`~/TENANT-PASSWORD-AWAL-BACA-LALU-HAPUS.txt`) dihapus.
- **Cleanup disk:** `~/kost48v3` (191 MB), `~/kost48surabaya`
  (24 MB), 5 tgz staging lama (~98 MB), 3 folder `client-old-*`
  di app root. App root 257 → 129 MB; home dir ~1.1 GB → ~660 MB.
  `~/backups` dan `~/lui` dipertahankan.
- **Bukti:** API produksi HTTPS 200 dengan 13 kamar;
  `/version.json` = build `BZ-Vpsd9eLX1`; `.env` produksi lolos
  verifikasi via `psql` (`rooms = 13`).
- **Deployment:** rotasi dan cleanup dijalankan langsung di
  server (SSH; rotasi password DB via cPanel) dengan izin owner;
  tanpa perubahan source.
- **Dampak runtime:** sesi user aktif terputus setelah
  JWT_SECRET dirotasi; user perlu login ulang.

## 2026-09-20 (audit) — Audit modul pertama: frontend-auth

- **Baru:** `docs/audit/frontend-auth.md` (86 baris) sesuai template
  AI_WORKFLOW_GUIDE §12.1. Modul pertama yang didaftarkan di
  `scripts/verify-module.mjs`.
- **Status:** diperiksa sebagian. Bukti: 5 test di
  `frontend/src/test/pages/loginPage.test.tsx`, exit 0.
  Bukti dari sesi tooling sebelumnya, bukan eksekusi baru.
- **Cakupan:** kontrak file, dependensi masuk/keluar, 5 acceptance
  dengan bukti, dan gap eksplisit (login e2e, error server, loading,
  role selain OWNER, refresh sesi, redirect state.from).
- **Verifikasi wrapper:** `npm run audit:module -- frontend-auth`
  exit 0 dan melaporkan doc ada; di Windows dijalankan melalui `npm.cmd`
  karena `npm.ps1` terhalang kebijakan PowerShell. Command langsung
  `node scripts/verify-module.mjs audit frontend-auth` juga exit 0, doc ada.
- **AI_MASTER:** §4 status auth frontend → "diperiksa sebagian,
  2026-09-20"; §8 entri keputusan audit modul pertama.

## 2026-09-20 (tooling) — verify-module.mjs + 3 script root

- **Baru:** `scripts/verify-module.mjs` (128 baris) — wrapper manifest
  internal, mode `test`/`build`/`audit`, executable + array argumen tanpa
  shell. Manifest awal: 1 modul (`frontend-auth`) → `loginPage.test.tsx`.
- **`package.json` root:** tambah `test:module`, `build:module`,
  `audit:module` masing-masing memanggil mode wrapper terkait.
- **Kontrak error:** exit 2 argumen/mode/ID salah, exit 3 build target
  belum tersedia (`buildTarget: null`), exit 4 dependency lokal hilang.
  Jumlah test diambil dari reporter JSON Vitest (bukan stdout).
- **Verifikasi:** 6 skenario lulus — `test frontend-auth` exit 0 dengan
  5 test; 3 skenario argumen salah exit 2; `build frontend-auth` exit 3
  dengan pesan; `audit frontend-auth` exit 0 lapor audit doc belum ada.
- **Batasan:** jalur dependency hilang dan jumlah test nol belum diuji;
  audit doc `docs/audit/frontend-auth.md` belum dibuat. Tooling lanjutan
  (module 2+) menunggu modul terdaftar.

## 2026-09-20 (governance) — Konsolidasi AI Stage 1–5 selesai

- **Hasil:** AGENTS.md menjadi aturan kanonik agent; CLAUDE/Cline/Copilot menjadi pointer; AI_MASTER menjadi dashboard; QUICKREF menjadi cheatsheet; GUIDE menjadi pointer + lampiran roadmap/template; indeks docs/audit dibuat.
- **Permission dan gate:** tujuh entri allow penghapusan/Prisma/psql dihapus dari reasonix.toml; tanpa deny baru, build/test/install tetap. Gate uang dan pretest:unit tidak berubah; allow generik masih membatasi efektivitas pengetatan.
- **Bukti dan batas:** verifikasi lokal melalui inspeksi diff, tautan, dan keutuhan konten lama; tanpa build/test/lint/typecheck/install/server. Source bisnis/WIP tidak diubah; deployment tidak dilakukan dan efektivitas runtime permission belum diuji.

## 2026-09-18 (fix) — FE-003 T1 & T2: form booking tamu tidak lagi menuntut email; booking portal tidak lagi buntu di review admin

> **Snapshot:** patch diterapkan pada working tree `8e78ecc` (tree tidak bersih lintas sesi). Berkas cakupan audit FE-003 **tidak** berubah antara audit dan patch: sha256-12 `guestBookingUtils` `B454D55ADB00`, `GuestBookingPage` `744F984BC925`, `GuestBookingForm` `053B7E7A2AB9` — identik dengan entri audit FE-003 di bawah. Audit statis `.audit-runtime/audit-fe003-bookings.mjs` tidak dijalankan ulang (tidak ada perubahan relevan pada berkas yang diukur sejak audit).

- **Lingkup perbaikan (2 temuan TINGGI, keputusan owner: opsi T1-A + T2-A):**
  - **T1 (frontend, form tamu publik):** `GuestBookingPage.handleSubmit` dulu selalu mengirim `phone`/`email` hasil `trim()` — termasuk `""` — sedangkan `CreatePublicBookingDto.email` memakai `@IsOptional() @IsEmail()` yang **hanya** melewati `null`/`undefined` sehingga `""` ditolak 400, dan `phone` memang wajib (`@Matches` + `public-bookings.service.ts:73–80` menolak nomor kosong). Perbaikan: penyusunan payload dipindah ke fungsi murni **`buildBookingPayload()`** di `frontend/src/pages/bookings/guestBookingUtils.ts` (email hanya disertakan bila berisi setelah trim; honeypot `website` tetap `""`; field opsional lain tetap bersyarat), aturan klien `validateStep1` disamakan dengan kontrak backend (**telepon wajib, email opsional bila diisi harus valid**), tipe `CreatePublicBookingPayload.email` menjadi opsional (`frontend/src/types/core.ts`), dan label `GuestBookingForm.tsx` diperbaiki menjadi "Telepon *" dan "Email (opsional)".
  - **T2 (backend, booking portal):** `approveBooking` dan `rejectBooking` hanya menerima `LeadSource.WEBSITE`, sedangkan booking yang dibuat TENANT dari portal disimpan `LeadSource.PORTAL` (`tenant-bookings.service.ts:150`) → booking muncul di antrean admin (`/stays?status=BOOKINGS`) tetapi selalu gagal 409 tanpa jalur alternatif (invoice awal hanya dibuat oleh `approveBooking`). Perbaikan: helper baru `backend/src/modules/tenant-bookings/booking-source.helper.ts` dengan `REVIEWABLE_BOOKING_SOURCES` + `isReviewableBookingSource()` (`WEBSITE` ∪ `PORTAL`), dipakai di `approveBooking` (`:250`), `rejectBooking` (`:529`), dan filter riwayat `findMine` (`:863`, fragmen dipakai ulang di `:914` dan `:927`) agar stay batal ber-sumber portal kembali tampil di "booking saya".
- **Batas yang tidak disentuh:** tanpa perubahan schema/migration, tanpa dependency baru, tanpa perubahan uang (DP 30%, deposit jaminan/hewan), invoice, jurnal, status `Room`, atau gate KTP; bukan perubahan alur bisnis booking.
- **Verifikasi lokal:** `npx tsc --noEmit --incremental false` (backend) **exit 0** · `npm run build` (backend) **exit 0** · `npm run test:unit` (backend) **96/96 lulus, 0 gagal** termasuk unit baru `backend/test/unit/booking-source.test.js` (WEBSITE/PORTAL dapat direview; WALK_IN/OTA/dll. tidak; `null`/`undefined`/`""` bukan booking mandiri) · `npx tsc -b` (frontend) **exit 0** · `vitest run src/test/unit/guestBookingValidation.test.ts src/test/unit/guestBookingPayload.test.ts` **2 file, 15/15 lulus** · `vitest run` (suite penuh) **34 file, 161 test lulus, exit 0** · `npm run build` (frontend) **exit 0**, build PWA `FBxovSZhHngz`, `PWA verification passed` · bukti kontrak deterministik `.audit-runtime/audit-fe003-dto-check.mjs` (memakai `class-validator` milik `backend/node_modules`, payload mencerminkan `buildBookingPayload`) → 8 kasus + 2 kontrol, **SEMUA EKSPEKTASI TERPENUHI**, exit 0 (`- hanya telepon: email kosong tidak dikirim → LOLOS`; `- hanya email: telepon wajib di backend → DITOLAK phone: Format nomor telepon tidak valid`; `- email format salah → DITOLAK`). Output tersimpan di `.audit-runtime/audit-fe003-dto-check.out.txt`.
- **Empat status:** **implementasi lokal** selesai (4 berkas frontend, 2 berkas backend + 1 helper baru, 2 berkas test + 1 berkas test baru); **verifikasi lokal** = typecheck/build/unit/audit kontrak seperti di atas (belum UAT DB); **deployment** belum dijalankan — produksi masih memakai paket backend 12 Sep + client `BZ-Vpsd9eLX1` (17 Sep); **dampak terukur** belum ada dan tidak dapat diklaim dari verifikasi lokal (T1 nol dampak selama `PUBLIC_ONLINE_BOOKING_ENABLED=false`, T2 berlaku saat TENANT memakai booking portal; perilaku SQL `findMine` serta approve/reject booking nyata **belum dijalankan terhadap DB** — fragmen `Prisma.sql` mengikuti pola `${searchFilter}` yang sudah dipakai query yang sama).
- **Sisa terbuka:** 6 temuan SEDANG + 3 advisory FE-003 (sebagian milik BE-047/BE-017, mis. `identityNumber @unique` tanpa penanganan P2002, prefill tarif SMESTERLY/YEARLY di `ApproveBookingModal`, first-paid-wins), serta UAT approve/reject booking portal nyata di DB 5433 yang memerlukan izin tersendiri. Cakupan audit total tidak berubah (**Frontend 17/67**); unit berikutnya tetap **FE-004 dashboard (K3)**.

## 2026-09-18 (audit) — FE-003 `frontend/src/pages/bookings` (K4) selesai diperiksa — 2 temuan tinggi (form tamu & booking portal tak dapat di-approve)

> **Snapshot:** audit memotret working tree **`6022ce9`** dengan **0 perubahan belum-commit** di `frontend/src/pages/bookings` dan `backend/src/modules/tenant-bookings` (mtime berkas cakupan: `GuestBookingSuccess.tsx`/`GuestBookingRoomSummary.tsx` 4 Jul, `guestBookingUtils.ts` 16 Jul, `GuestBookingPage.tsx` 24 Jul, `BookingPage.tsx`/`GuestBookingForm.tsx` 12 Sep 2026). Selama sesi ini berjalan, **sesi paralel menyunting `M12`/`M13`** untuk temuan FE-002 (lupa password, redirect sesi aktif) dan `frontend/src/pages/auth`; unit FE-003 **tidak bersinggungan** dengan berkas-berkas itu sehingga temuan di bawah merujuk keadaan `6022ce9`. sha256-12 berkas cakupan: `3FA2B5A36E4F` BookingPage, `053B7E7A2AB9` GuestBookingForm, `744F984BC925` GuestBookingPage, `6D081D7D998B` GuestBookingRoomSummary, `2DBD36254724` GuestBookingSuccess, `B454D55ADB00` guestBookingUtils.

- **Lingkup:** unit ketiga rangkaian **halaman** sesudah FE-001/FE-002 — `frontend/src/pages/bookings` (**6 file, 1.735 baris**) beserta kontrak yang memasoknya: `api/bookings.ts`, `api/settings.ts` (`fetchPublicConfig`), `utils/pricing.ts`, `utils/publicRoomDisplay.ts`, `utils/ktpOcr.ts` + `utils/ocrPreprocess.ts`, `config/constants.ts` (`DP_RATIO`), rute & guard `App.tsx` (`/booking/:roomId`, `/portal/booking/:roomId`, `/portal/bookings`), `public/sw.js`, `components/tenant/TenantBookingGate.tsx`, dan kontrak backend `backend/src/modules/tenant-bookings` (public/tenant/admin controller, `public-bookings.service.ts` 453 baris, `tenant-bookings.service.ts` 1.065, `helpers/queries/types`, 8 DTO, `pricing.helper.ts`) + `marketing-public-rooms.service.ts` + `payment-policy.helper.ts`. **Read-only:** tanpa perubahan kode, schema, DB, atau dependency.
- **Perkakas:** `.audit-runtime/audit-fe003-bookings.mjs` (inventaris deterministik: rute vs guard, endpoint & fungsi API yang dipakai, rumus uang, honeypot, PII, zona waktu, kode mati, state loading/error/empty, a11y, OCR, cakupan test) dan `.audit-runtime/audit-fe003-dto-check.mjs` (**menjalankan payload yang benar-benar dibangun `GuestBookingPage.handleSubmit` terhadap `class-validator` milik `backend/node_modules`**, replika persis `CreatePublicBookingDto`, sehingga klaim validasi tidak bergantung pembacaan dekorator). Audit kontrak backend dijalankan **2 subagent terpisah** (public booking; tenant/admin booking) — auditor = agen lokal + subagent, reviewer = sesi ini.
- **Hasil — kontrak terpenuhi:** **akses** `/booking/:roomId` publik tanpa guard dan terdaftar `isPublicNavigation` (`public/sw.js:140`), `/portal/booking/:roomId` = `RequireRoles(['TENANT'])` + `TenantBookingRouteGuard` yang menahan booking kedua, `/portal/bookings` = TENANT, dan CTA memilih rute per role (`RoomCard.tsx:140`, `BookingCtaButton.tsx:50`); **uang DP 30% identik FE↔BE** — `dpAmount = Math.round((baseRent + occupantSurcharge) × 0,30)` (`GuestBookingForm.tsx:158–165`) ≡ `roundRupiah((agreedRent × 30)/100)` dengan `agreedRent = baseRent + occupantSurcharge` (`public-bookings.service.ts:248–273`), **tanpa drift**; tabel multiplier (0,13/0,5/0,75/1/5,7/11), pembulatan ke 5.000, surcharge +20%/kepala, dan batas D-24 (2/4 STANDARD, 4/6 LARGE) **sama persis** antara `utils/pricing.ts:2–64` dan `pricing.helper.ts:16–82`; deposit jaminan + deposit hewan berada **di luar** DP pada kedua sisi, dan nominal yang dijanjikan layar sama dengan nominal sah D-02 karena gate pembayaran hanya menerima "DP tepat" atau "pelunasan penuh" (= sisa invoice + sisa deposit, `payment-policy.helper.ts:93–108`) sementara invoice hasil approve hanya berisi satu baris RENT (`tenant-bookings.service.ts:325–361`); **backend publik** `@Public()` + rate limit 5/10 menit/IP, `$transaction` + `SELECT … FOR UPDATE` pada Room (Room **tidak** diubah saat booking sehingga multi-RESERVED D-11 tetap sah), `auditLog` tanpa NIK, respons tanpa NIK/catatan/kontak darurat, password sementara hanya untuk user baru + bcrypt cost 10 (`public-bookings.service.ts:113–118,159–196,240–391`); **AI-PDP** terjaga — OCR KTP (`preprocessImage` + `tesseract.js`) tidak mengirim gambar ke mana pun (0 `fetch`/`FormData` di dua util OCR), halaman hanya mengirim teks NIK; **state & lifecycle FE** loading/error/empty/sukses ada di kedua halaman, tombol submit terkunci saat pending, navigasi sukses memakai `replace`, invalidasi cache `public-rooms`+`tenant-bookings`+`portal-stage`+`stays` (`BookingPage.tsx:154–166`), dan pesan sukses `kost48:portal-bookings:success-message` kini selaras dengan pembaca `MyBookingsPage` (hasil perbaikan FE-057); **higiene** 0 `console.*`, 0 `dangerouslySetInnerHTML`, 0 NIK/password yang ditulis ke `localStorage`/`sessionStorage`.
- **Temuan TINGGI (2):** **(T1) form booking tamu hanya berhasil bila telepon DAN email diisi.** `validateStep1` dan label UI menyatakan "minimal salah satu" (`guestBookingUtils.ts:110–117`), tetapi payload selalu menyertakan `phone`/`email` hasil `trim()` sehingga salah satunya bisa `""` (`GuestBookingPage.tsx:84–92`), sedangkan `CreatePublicBookingDto` mewajibkan `phone` ber-`@Matches(/^[\d\s\+\-\(\)]{6,20}$/)` dan memvalidasi `email` dengan `@IsOptional() @IsEmail()` (`create-public-booking.dto.ts:18–26`). `@IsOptional()` hanya melewati `null`/`undefined` — **bukan string kosong** — dan `ValidationPipe` tidak memakai `skipMissingProperties` (`main.ts:92`). Diuji deterministik dengan `class-validator` backend: **phone-only → 400 "email must be an email"**, **email-only → 400 "Format nomor telepon tidak valid"**, keduanya terisi → **LOLOS**. Karena produksi memakai `disableErrorMessages: isProduction`, tamu hanya melihat pesan generik dan tidak tahu field mana yang salah; jalur "telepon saja" dan "email saja" yang ditawarkan UI **tidak dapat dipakai**. **(T2) booking yang dibuat halaman portal tenant tidak dapat di-approve maupun di-reject admin.** `createBooking` menulis `bookingSource = LeadSource.PORTAL` (`tenant-bookings.service.ts:150` — perubahan P2-01 6 Jul 2026 yang tercatat di `M12:938`), sedangkan jalur approve **dan** reject mewajibkan `WEBSITE` (`:247`, `:525`); antrean admin pun hanya memuat booking `WEBSITE` (`stayPredicates.ts:14–23`, `dashboardShared.tsx:167–184`, dikonsumsi `StaysPage.tsx:417,422,1068–1071` dan `ApproveBookingModal` hanya dipakai dari sana). Akibatnya booking dari `/portal/booking/:roomId` **tak pernah masuk antrean**, ditolak 409 bila admin memaksa, tidak pernah mendapat invoice, lalu disapu menjadi `CANCELLED` oleh sweep kedaluwarsa 3 jam (`booking-sweep.service.ts:334–348` **tidak** memfilter sumber) — dan setelah itu riwayatnya hilang dari `/tenant/bookings/my` karena daftar hanya memuat `CANCELLED` ber-sumber `WEBSITE` (`:899`, `:912`). Ini regresi dari P2-01: sumber booking dipindahkan ke `PORTAL` tanpa menyinkronkan predikat antrean/guard review.
- **Temuan SEDANG sisi FE (8):** (a) **tautan `/katalog` tidak ada rutenya** — `GuestBookingPage.tsx:120` menautkan `/katalog` (0 kemunculan di seluruh `frontend/src`) sedangkan katalog sebenarnya `/rooms`; catch-all `path="*"` berada **di dalam** `ProtectedRoute` (`App.tsx:231,344`) sehingga tamu anonim yang mengekliknya berakhir di `/login`. (b) **tanggal UTC di jalur portal + cutoff 21:00 WIB yang tak terlihat** — `BookingPage.todayString()` memakai `new Date().toISOString().slice(0,10)` (`:36–38`) untuk nilai default **dan** `min` tanggal check-in, padahal form tamu sudah memakai kalender perangkat dengan komentar AC-01 (`guestBookingUtils.ts:25–26`); antara 00:00–07:00 WIB default/min menjadi **kemarin** dan ditolak backend "Tanggal check-in tidak boleh di masa lalu" (`public-bookings.service.ts:99–101`), sementara cutoff hari-sama **21:00 WIB** (`:106–111`) tidak pernah disurfacekan di UI sehingga tamu baru mengetahuinya setelah menyelesaikan wizard 4 langkah. (c) **honeypot tidak berfungsi pada jalur UI** — server memeriksa `website` (`public-bookings.service.ts:84–86`) tetapi payload selalu `website: ''` (`GuestBookingPage.tsx:91`) meski field tersembunyi mengisi `form.website` (`GuestBookingForm.tsx:172–181`) → bot yang mengisi honeypot tetap lolos, dan yang tersisa hanya rate limit per IP. (d) **kebijakan duplikasi berbeda antar dua halaman yang diaudit** — portal menolak tenant yang masih punya stay ACTIVE (`tenant-bookings.service.ts:67–76`) sedangkan jalur publik hanya menolak bila kamar berstatus RESERVED/OCCUPIED (`public-bookings.service.ts:174–196`), sehingga TENANT dapat menumpuk booking lewat halaman publik `/booking/:roomId` yang tidak dijaga `TenantBookingGate`. (e) **kode mati & kontradiksi label ketersediaan** — DTO publik menormalkan `status` menjadi hanya AVAILABLE/OCCUPIED (`marketing-public-rooms.service.ts:902`) sehingga cabang `RESERVED`/`MAINTENANCE` pada `getPublicRoomAvailabilityDisplay` (`publicRoomDisplay.ts:165–187`) dan `isChecking` (`GuestBookingPage.tsx:155`) tak pernah benar; kamar MAINTENANCE tampil berlabel **"Penuh / Terisi"** padahal `availabilityNote` backend menulis "Kamar kosong, tetapi sedang dicek sebelum dibuka untuk booking" — dan `availabilityNote`/`projectedAvailableDate` **tidak pernah dirender** di halaman booking (padahal dipakai di katalog publik). (f) **PII & aksesibilitas** — NIK dirender penuh pada ringkasan wizard (`GuestBookingForm.tsx:491`) dan tetap berada di DOM, serta input berkas KTP memakai atribut `hidden` (`:258–261`) sehingga **tidak dapat difokus dengan keyboard** (hanya bisa diklik) dan tidak ada `aria-live` untuk pesan hasil pemindaian. (g) **`listPublicRooms({ limit: 500 })` untuk mencari 1 kamar** (`BookingPage.tsx:125`) padahal `buildPagination` memotong `limit` ke 100 (`common/utils/pagination.ts:3`) → pola rapuh bila katalog melewati 100 kamar sekaligus satu permintaan berat pada setiap deep-link tanpa `location.state`. (h) **`expiresAt` ditampilkan sebagai tanggal saja** (`formatDate` → `formatDateOnly`, `GuestBookingSuccess.tsx:63–67`) padahal batasnya 3 jam, dan teks "kedaluwarsa dalam 3 jam" di UI **hardcode** sementara nilai efektifnya berasal dari env/`OperationalSetting` (`AUTO_OPS_DEADLINES.BOOKING_REVIEW_DEADLINE_HOURS`).
- **Advisory sisi FE (7):** 14 warna hex inline di JSX (konsisten temuan FE-062), prop `selectedRate` **mati** di `GuestBookingForm` (`_sr`) dan `portalAccess.instructions` dari backend tidak dirender; `<a href="/rooms">` memicu reload penuh alih-alih `<Link>`; kedua halaman **tanpa `FeatureErrorBoundary`** lokal (kontras 20 berkas lain; hanya `PwaRouteBoundary` global); **0 test komponen** untuk 5 dari 6 berkas (hanya `guestBookingUtils` yang punya 2 test, dan keduanya peka zona waktu mesin — `formatDate('2026-01-15')` gagal di perangkat barat UTC); klaim OCR **"offline"** tidak akurat karena `tesseract.js` dimuat tanpa `workerPath`/`corePath`/`langPath` (aset engine/bahasa diambil dari CDN) dan `ocrPreprocess.ts:124` tidak me-`revokeObjectURL` (kontras `ProfilePage.tsx:105` yang sudah melakukannya); rate limit publik **process-local** (`rate-limit.guard.ts:22–35`) sementara M20 §10 mencatat Passenger pernah menjalankan 2 proses; `PUBLIC_ONLINE_BOOKING_ENABLED` default `false` (`marketing-public-rooms.service.ts:832–836`) sehingga tanpa env halaman tamu selalu "Booking online sementara ditutup" sementara jalur portal tetap terbuka — status env produksi belum diperiksa.
- **Temuan kontrak backend — SEDANG (6) & ADVISORY (3)** (dari kedua subagent, direview ulang di sesi ini; sebagian menjadi backlog BE-047, bukan cakupan berkas FE-003): (i) **`identityNumber @unique` tanpa penanganan duplikat NIK** — Prisma P2002 ditelan menjadi 409 generik "Booking bentrok dengan data aktif lain" (`schema.prisma:647`; `public-bookings.service.ts:198–222,404–407`); subagent menilai TINGGI, **diturunkan ke SEDANG** di sini karena jalur hanya tercapai bila NIK sama datang dengan telepon+email yang tidak cocok dengan tenant lama. (ii) **Race duplikasi Tenant** — `phone` tanpa unique (`schema.prisma:645`) + pola cek-lalu-buat (`public-bookings.service.ts:174–222`) → dua request paralel bertelepon sama dapat membuat 2 baris Tenant/2 akun portal, dan booking email-saja menyimpan `phone: ''`. (iii) **Enumerasi PII + akun otomatis tanpa verifikasi** — respons 409 "Nomor telepon atau email ini masih memiliki booking atau hunian aktif" (`:192–196`) dapat dipakai memastikan sebuah email/telepon terdaftar, sementara akun portal dibuat langsung `isActive: true` tanpa verifikasi email/OTP (`:235–245,380–390`). (iv) **NIK tidak divalidasi format di backend** (`create-public-booking.dto.ts:28–31` hanya `@IsString() @MaxLength(50)`) padahal FE menuntut tepat 16 digit (`guestBookingUtils.ts:118–122`). (v) **Filter `pricingTerm` per kamar hanya di klien** — `getAvailablePricingTerms` selalu mengembalikan 6 term (`marketing-public-rooms.service.ts:1001–1013`) dan `resolveRent` menerima semuanya (`public-bookings.service.ts:248–251`) sedangkan `getAvailablePricingTerms`/`buildPricingAvailabilityWhere` di `tenant-bookings.helpers.ts:50–82` adalah kode mati → pemanggil API dapat memesan SMESTERLY 5,7×/YEARLY 11× untuk kamar yang tidak menawarkannya. (vi) **`plannedCheckOutDate` tidak terikat term/durasi** — backend hanya memeriksa urutan tanggal (`public-bookings.service.ts:89–95`) sementara FE menghitungnya dari preset durasi (`guestBookingUtils.ts:76–103`). (vii) **Entropi password sementara ≈16,5 bit** (`Kost48` + 5 digit acak, `:113`) — ditahan rate limit login 10/15 menit, tetapi lemah untuk akun yang dibuat otomatis tanpa verifikasi. (viii) **Pesan/HTTP menyesatkan** — `POST /tenant/bookings/:id/cancel` dengan id tidak valid membalas **200** `data:null` (`tenant-bookings.controller.ts:47–53`), dan error 23505 menyebut bentrokan stay padahal `Stay` hanya ber-`@@index` double-booking (`schema.prisma:914–924`). (ix) **Honeypot dapat dilewati payload non-string** (`dto:56–59` + `service.ts:84`) — pelengkap temuan honeypot sisi UI.
- **Kandidat temuan yang gugur setelah verifikasi ulang:** usulan subagent "nominal LUNAS di FE ≠ nilai yang disimpan backend" **tidak dilaporkan sebagai temuan**. Setelah `payment-policy.helper.ts:93–108` (gate hanya menerima "DP tepat" atau "pelunasan penuh" = sisa invoice + sisa deposit) dan komposisi invoice hasil approve (`tenant-bookings.service.ts:325–361`, satu baris RENT) dibaca, nominal LUNAS yang ditampilkan FE (`agreedRent + depositAmount`) **sama dengan** nominal "pelunasan penuh" yang diterima sistem. Dicatat di sini agar audit berikutnya tidak mengangkatnya kembali sebagai temuan baru.
- **Temuan lintas unit (bukan cakupan FE-003, dicatat sebagai masukan):** prefill tarif `components/stays/ApproveBookingModal.tsx:39–41` memakai SMESTERLY 5,5× dan YEARLY 10× dari tarif bulanan (kanonik 5,7×/11×) → ranah FE-051/FE-026; D-24 (batas penghuni + surcharge) dan deposit hewan tidak ada pada DTO/jalur portal (`create-tenant-booking.dto.ts`) → ranah BE-047; first-paid-wins membatalkan stay pesaing tanpa membatalkan invoice/jurnalnya (`payment-submissions.service.ts:897–921`) → ranah BE-017/BE-024; `?search=` pada `/tenant/bookings/my` merusak query hitung dan mengembalikan daftar kosong (`tenant-bookings.service.ts:906–928`, sudah tercatat `M13:1322`).
- **Empat status:** **implementasi aplikasi tidak berubah** oleh sesi ini (audit read-only); **verifikasi** = analisis statis deterministik (2 skrip, salah satunya mengeksekusi `class-validator` backend) + pembacaan penuh 6 berkas halaman + audit kontrak backend oleh 2 subagent + pemeriksaan silang `payment-policy.helper.ts`/`booking-sweep.service.ts`; **deployment** tidak relevan; **belum terbukti runtime** — tidak ada tangkapan layar e2e untuk `/booking/:roomId` (AO-13 masih mencantumkan rute ini sebagai ber-fixture), jalur 400 T1 belum di-UAT, tampilan booking `PORTAL` di antrean admin belum diuji, dan nilai env produksi (`PUBLIC_ONLINE_BOOKING_ENABLED`, `BOOKING_REVIEW_DEADLINE_HOURS`) belum dibaca.
- **Cakupan:** [CHECKLIST_AUDIT_TOTAL](CHECKLIST_AUDIT_TOTAL.md) FE-003 ditandai selesai + baris tabel hasil; tabel ringkasan diperbarui (**Frontend 17/67 = 3 halaman + 11 shared + 3 static**; total 17/135). Tindak lanjut yang diusulkan — **belum dikerjakan** dan menunggu keputusan owner karena menyentuh uang/akses: (i) FIX T1 (DTO `email` menerima string kosong **atau** FE berhenti mengirim field kosong) dan (ii) FIX T2 (predikat/guard review disamakan dengan `PORTAL` **atau** sumber booking portal dikembalikan ke `WEBSITE`). Unit berikutnya menurut urutan checklist adalah **FE-004 dashboard (K3)**.

## 2026-09-18 — Perbaikan T1 & T2 temuan audit FE-002/BE-002 (pencabutan sesi saat ganti password)

- **Lingkup:** dua temuan **TINGGI** dari audit FE-002 (`backend/src/auth`). **Implementasi lokal:** `auth.service.ts` + `auth.controller.ts` + 2 berkas test baru. Tanpa perubahan schema, tanpa migration, tanpa dependency baru.
- **T1 — ganti/reset password kini mencabut seluruh refresh token.** `resetPassword` dan `changePassword` sebelumnya hanya `UPDATE "User"` (+ menandai token reset terpakai), sehingga refresh token tetap dapat menukar access token baru sampai 7 hari meski korban sudah mengganti password (`pwdAt` hanya mematikan access token). Keduanya sekarang menjalankan penggantian hash **dan** `revokeRefreshTokens(userId)` di dalam **satu `$transaction`**, sehingga pencabutan atomik: tidak ada celah di mana password sudah berubah tetapi token lama masih sah. `revokeRefreshTokens` menerima parameter klien transaksi opsional (`Pick<Prisma.TransactionClient,'refreshToken'>`), jadi jalur logout yang lama tidak berubah perilakunya.
- **T2 — cabang "revoke ALL" yang mati dihapus, bukan dibiarkan menyesatkan.** Route logout bersifat `@Public()` agar logout tetap berhasil saat access token kedaluwarsa; konsekuensinya `req.user` tak pernah terisi sehingga cabang `if (user) → revokeRefreshTokens(userId)` adalah kode mati dan membuat perilaku logout tampak bisa global. **Keputusan owner 18 Sep 2026: tombol Keluar tetap per-sesi (lokal).** Cabang itu dihapus dan diganti komentar yang menjelaskan alasan `@Public()` serta arahan bila kelak "keluar dari semua perangkat" dibutuhkan (endpoint terpisah bergerbang `JwtAuthGuard`), bukan mengandalkan route ini. Perilaku pengguna **tidak berubah** — yang berubah hanya kejujuran kode terhadap perilaku nyata.
- **Verifikasi lokal:** `npx tsc --noEmit --incremental false` → exit 0 tanpa diagnostik; `npm run build` → exit 0; `node --test "test/unit/**/*.test.js"` → **92/92 lulus, 0 gagal** (6 suite). **10 regresi baru:** `test/unit/auth-session-revocation.test.js` (T1a–T1e: pencabutan di dalam transaksi untuk reset & change, jalur gagal tidak menulis apa pun, token sekali pakai, pencarian hash SHA-256) dan `test/unit/auth-logout-session.test.js` (T2a–T2e: logout mencabut **hanya** sesi pada cookie, tanpa cookie tetap sukses, idempoten, token tak dikenal aman, pencarian hash). Enam di antaranya memakai `bcryptjs` sungguhan dengan hash asli karena `AuthService` memanggil modul bcrypt langsung (tidak bisa disuntik lewat constructor).
- **Deployment & dampak runtime:** **belum di-deploy, belum ada UAT.** Efek yang diharapkan setelah deploy: sesi lain milik user yang sama akan terputus ketika ia mengganti/reset password (perilaku keamanan yang diinginkan), dan logout tidak berubah. Butuh verifikasi runtime tersendiri sebelum dianggap selesai di produksi.
- **Sisa temuan FE-002 tetap terbuka:** T3–T16 (antara lain `isActive` dead code, TOCTOU token reset, `refresh` tanpa rate-limit guard, bucket limit dari nama method, drift `resetTokenPreview`) dan temuan FE (login hanya cek password kosong, `/login` tanpa pengalihan pengguna yang sudah login, `VITE_API_BASE_URL` absolut yang bergantung `.env.production.local`, cakupan test). Tiga temuan FE pada `ResetPasswordPage` sudah ditutup sesi paralel. Temuan T1/T2 pada `CHECKLIST_AUDIT_TOTAL` ditandai **ditutup**.
- **Koreksi pencatatan (verifikasi kelengkapan checklist):** saat menjawab "temuan yang belum dikerjakan sudah masuk checklist?", ditemukan **5 temuan belum tercatat** di kolom temuan baris FE-002 meski sudah ada di entri ini — **T4** (side-channel waktu enumerasi), **T7** (re-check refresh tanpa `revokedAt`), **T11** (`secure` cookie dari `NODE_ENV`), **T15** (login nomor HP hanya TENANT), **T16** (`clearRefreshCookie` tanpa `secure`/`sameSite`). Kelimanya sudah **dilengkapi**, sehingga daftar checklist kini memuat **16 temuan backend + 7 temuan FE (23/23 penanda hadir)**. Sekaligus **3 temuan FE ditandai SELESAI** karena sudah diperbaiki di source dan diverifikasi ulang ke berkas: `ResetPasswordPage` kini `type="password"` + `autoComplete="off"` (baris 87–88), guard token kosong sebelum request (baris 29), `autoComplete="new-password"` pada kedua password (97, 102), timer redirect dibersihkan (21), submit terkunci setelah sukses (105).

## 2026-09-18 (audit) — FE-002 `frontend/src/pages/auth` (K4) selesai diperiksa — 2 temuan tinggi pada pencabutan sesi

> **Snapshot & konkurensi:** audit ini memotret working tree `cbca06f` **sebelum** sesi paralel menerapkan perbaikan FE-057. Ketiga halaman auth **tidak tersentuh** (`LoginPage.tsx` 30 Jul, `ForgotPasswordPage.tsx` 30 Jul, `ResetPasswordPage.tsx` 12 Sep); `AuthContext.tsx` (18 Sep 05:33) dan `api/client.ts` (18 Sep 05:37) **berubah setelah** pembacaan awal saya, sehingga butir temuan yang menyentuh dua berkas itu (jalur sudah-login & `resetAuthFailureState`) merujuk keadaan pra-perbaikan dan tidak boleh dianggap regresi patch FE-057. Seluruh temuan backend berasal dari `backend/src/auth` yang tidak berubah.

- **Lingkup:** unit kedua rangkaian **halaman** sesudah FE-001 — `frontend/src/pages/auth` (**3 file: `LoginPage.tsx` 238 baris, `ForgotPasswordPage.tsx` 292, `ResetPasswordPage.tsx` 101**) + `PasswordInput.tsx`, `api/auth.ts`, `client.ts`, `AuthContext.tsx`, rute & PWA/SW, serta **kontrak backend `backend/src/auth`** (service 564 baris, `jwt.strategy.ts`, 5 DTO, `rate-limit.guard.ts`, `main.ts`, `schema.prisma`). **Read-only:** tanpa perubahan kode.
- **Perkakas:** `.audit-runtime/audit-fe002-auth.mjs` (warisan sesi terputus 18 Sep — inventaris, rute vs guard, `isPublicNavigation`, kontrak API, higiene input, state/timer, cakupan test) dan `.audit-runtime/audit-fe002-verify.mjs` (verifikasi lanjutan: kode mati `resetTokenPreview`, `autoComplete`, kelas visual, validasi klien vs DTO, jalur sudah-login, `pwdAt`/pencabutan, rute SW, cakupan test). Audit kontrak backend dijalankan **subagent terpisah** (auditor-pelaksana = subagent, reviewer = sesi ini).
- **Hasil — kontrak terpenuhi:** 3 rute auth **publik tanpa guard** dan **eager import** (shell auth mandiri), 3/3 terdaftar `isPublicNavigation` (`public/sw.js:133–141`); `ProtectedRoute.tsx:18` satu-satunya pengirim `state.from` → tujuan pasca-login selalu pathname internal (bukan open redirect); pesan login seragam anti-enumerasi (`auth.service.ts:39,47,52`); bcrypt cost 10 tanpa jalur plaintext; access token TTL 900 s + `pwdAt` sehingga **access token lama mati** setelah ganti/reset password (`jwt.strategy.ts:26–31`); refresh token 32 byte acak, disimpan SHA-256, rotasi + single-use dalam transaksi (`:125–174`); rate limit berlapis (login 10/5 mnt, forgot 3/10 mnt, reset 5/10 mnt + middleware Express 10/15 mnt `failClosed`); token reset SHA-256 + kedaluwarsa 30 menit + sekali pakai; DTO `newPassword` ≥8 selaras cek klien; bundle produksi memakai `/api` **relatif** sehingga `sameSite:'strict'` + `path /api/auth` aman pada artefak yang disajikan; E2E login nyata lewat UI dipakai crawl 6 role (`e2e/audit-users.ts:69–77`).
- **Temuan (2 tinggi, 5 sedang, 13 rendah):** **[TINGGI]** (T1) **reset & change password tidak mencabut refresh token** — `auth.service.ts:381–395`/`:423–429` hanya `UPDATE "User"`; satu-satunya pemanggil `revokeRefreshTokens` adalah `auth.controller.ts:61`, sehingga refresh token yang dicuri tetap dapat menukar access token baru sampai **7 hari** meski korban sudah reset password (`pwdAt` hanya mematikan access token — perlindungan separuh). (T2) **jalur "revoke ALL" mati** — route logout `@Public()` + `@CurrentUser() user?` (`auth.controller.ts:54–61`) sedangkan guard publik tidak menetapkan `req.user` di seluruh `backend/src`, sehingga cabang `if (user)` tak pernah benar dan `revokeRefreshTokens(userId)` (`:195–198`) tak pernah dieksekusi ⇒ **tidak ada global logout**; logout hanya mencabut 1 token. **[SEDANG]** (T3) cek `isActive` di login dead code karena query sudah menyaring `isActive: true` (`:449,486`) → user nonaktif menerima 401 "password salah", bukan 403, dan komentar AD-02 menyesatkan. (T4) side-channel waktu enumerasi (bcrypt hanya jalan bila user ada). (T5) forgot-password menjawab `success:true` walau Brevo tak dikonfigurasi (`:506` → `:331`) sementara UI menulis **"Email terkirim!"** (`ForgotPasswordPage.tsx:171`). (T6) single-use token reset TOCTOU (cek `usedAt` di luar transaksi `:357`, `UPDATE` tanpa `used_at IS NULL` `:390–394`). (T7) re-check dalam transaksi refresh tidak memeriksa `revokedAt` (`:127–133`). (T8) `POST /auth/refresh` tanpa `RateLimitGuard`. (T9) bucket rate limit diambil dari **nama method** (`rate-limit.guard.ts:87`) → rename `login()` menghapus limit tanpa error. (T10) limiter in-memory per proses sedangkan Passenger dapat 2 proses (M20 §10) → limit berlipat, counter hilang saat restart. **[RENDAH]** (T11) `secure` cookie dari `NODE_ENV`, bukan HTTPS; (T12) **drift kontrak** `api/auth.ts:37,42` menunggu `resetTokenPreview/expiresAt/channel/destination/userId` yang tak pernah dikembalikan service (**0 kemunculan `resetTokenPreview` di `backend/src`**) → blok "Token Reset (Dev Preview)" (`ForgotPasswordPage.tsx:43,176–183`) **kode mati**; (T13) `JWT_EXPIRES_IN` (default 86400) tak berpengaruh; (T14) tiap login menumpuk baris `RefreshToken` tanpa batas; (T15) login via nomor HP hanya TENANT; (T16) `clearRefreshCookie` tanpa `secure`/`sameSite` (bukan bug, inkonsistensi).
- **Temuan khusus frontend:** (a) **`ResetPasswordPage` 0 `autoComplete`** (dua input password tanpa `new-password`) sedangkan `LoginPage` `current-password` dan `ForgotPasswordPage` `email`; (b) tombol simpan reset **tidak dicegah saat token kosong** (`disabled={submitting}` saja) → token kosong dikirim dan baru ditolak server; (c) `/reset-password` memakai `login-shell` **tanpa** `login-experience-v518d` + tanpa `Kost48DecorGallery`/konten `login-aside` → tampil berbeda dari dua halaman auth lain; (d) login hanya memeriksa password **kosong** sementara DTO menuntut ≥6 → pesan validasi tidak konsisten dengan jalur kustom berbahasa Indonesia; (e) **`/login` tidak mengalihkan pengguna yang sudah login** (tak membaca `token`/`user`) → sesi aktif dapat diganti tanpa peringatan (relevan perangkat bersama kos); (f) `VITE_API_BASE_URL` absolut di `.env.production` hanya tidak berefek karena `.env.production.local` (bertanda "jangan commit") menimpanya saat build — jika file itu hilang, auth berpindah origin dan perilaku cookie `strict` berubah; (g) **cakupan test lemah** — `loginPage.test.tsx` (4 test) mem-`vi.mock` AuthContext tanpa `token`/`user` sehingga jalur sudah-login dan `logout()` pada tab salah **tidak teruji**; `ForgotPasswordPage` & `ResetPasswordPage` **0 test** unit; E2E hanya "login page renders" dan helper login memakai **tab Admin saja** (tab Penghuni tak pernah diuji).
- **Empat status:** implementasi aplikasi **tidak berubah** oleh sesi ini; verifikasi = analisis statis deterministik (2 skrip) + audit kontrak backend oleh subagent + pemeriksaan berkas build `frontend/dist/assets/index-CD1lX4UE.js` (sesuai `dist/index.html:66`, meta `kost48-build` = `BZ-Vpsd9eLX1`); deployment tidak relevan; **belum terbukti runtime** — eksploitasi konkurensi (T6/T7), timing enumerasi (T4), jumlah proses Passenger (T10), dan env produksi (T11/T5: `NODE_ENV`, Brevo) belum diuji.
- **Cakupan:** [CHECKLIST_AUDIT_TOTAL](CHECKLIST_AUDIT_TOTAL.md) FE-002 ditandai selesai + baris tabel hasil; tabel ringkasan diperbarui (**Frontend 16/67 = 2 halaman + 11 shared + 3 static**). T1/T2 menyentuh auth/sesi (ranah BE-002) — dicatat sebagai masukan lintas unit, bukan duplikasi audit. Unit berikutnya menurut urutan checklist adalah **FE-003 bookings (K4)**. Sisa 119 unit belum diperiksa.

## 2026-09-18 — Perbaikan temuan audit FE-057 (sesi autentikasi)

- **FE-002 lupa password:** tipe API dan UI `resetTokenPreview` yang mati dihapus; pesan sukses tidak lagi menjamin email telah terkirim dan tetap enumeration-safe. Regresi baru memastikan preview tidak tampil. `vitest` dua file auth **6/6 lulus**; warning React Bootstrap/React Router non-fatal. Belum ada deployment/UAT runtime.

- **FE-002 login:** sesi yang sudah tervalidasi kini langsung menavigasi dari `/login` ke route asal `ProtectedRoute` atau default role; regresi OWNER → `/owner-dashboard` ditambahkan. Tidak ada redirect saat autentikasi masih `loading`. Vitest target dipanggil tetapi runner hanya mengembalikan banner tanpa ringkasan, jadi belum diklaim lulus; belum ada deployment/UAT runtime.

- **FE-002 reset password:** token reset tidak lagi tampil sebagai teks biasa (`type="password"`, `autocomplete="off"`); input password memakai `autocomplete="new-password"`; token kosong gagal lokal sebelum request; redirect sukses memiliki cleanup timer dan submit dikunci setelah sukses. Regresi baru mencakup masking/autocomplete dan validasi token kosong. `git diff --check` lulus. Vitest target dipanggil tetapi runner tidak mengembalikan ringkasan, sehingga belum diklaim lulus; belum ada deployment/UAT runtime.

- **Review perubahan aktif lain:** `/cek` dan `/okupansi` dikonfirmasi sebagai halaman publik yang memang diminta owner; guard dan penghapusan tautan yang sempat diterapkan dibatalkan. Perubahan lain yang diperiksa: pencabutan refresh token atomik pada reset/ganti password serta penghapusan seed historis/PII dari paket deploy; kontraknya konsisten dan migration `20260818` tersedia di bootstrap. Typecheck frontend/backend selesai tanpa diagnostik; `git diff --check` lulus. Tidak ada deployment atau UAT runtime.

- **Tindak lanjut mendalam:** event `storage` untuk `kost48_access_token` kini menyinkronkan perubahan sesi dari tab lain: cache user, pesan booking, dan React Query cache dibersihkan; token baru memicu hidrasi ulang, logout mengosongkan state lokal. Validasi cache user diperluas ke semua field `AuthUser`; data cache parsial/rusak tidak dipakai. Regresi logout lintas-tab ditambahkan. Runner Vitest dipanggil ulang tetapi tidak mengembalikan ringkasan hasil pada sesi ini, jadi tidak diklaim lulus ulang.

- **Tambahan FE-054:** interceptor Axios sekarang membaca penanda `_retry`: hanya satu refresh per request, request yang menunggu refresh ikut ditandai, dan 401 setelah retry membersihkan sesi serta ditolak sebagai `AUTH_EXPIRED`. Ini menutup potensi siklus refresh berulang. Tidak ada deployment atau pengukuran runtime.

- **Implementasi lokal:** `AuthContext` sekarang menghapus token, cache user, dan state bila hidrasi `/auth/me` gagal sehingga route terlindungi tidak mungkin meloloskan token tanpa profil user ke `RequireRoles`. Key pesan booking tenant diperbaiki menjadi `kost48:portal-bookings:success-message` dan dibersihkan pada login/logout. `client` menyediakan `resetAuthFailureState()` yang dipanggil sebelum login serta saat logout; percobaan login baru tidak lagi terblokir flag global setelah refresh token lama gagal.
- **Regresi:** `frontend/src/test/hooks/useAuth.test.tsx` mencakup kegagalan hidrasi beserta pembersihan cache dan key booking pada login/logout. `git diff --check` lulus.
- **Verifikasi & batas:** `npx.cmd vitest run src/test/hooks/useAuth.test.tsx` → **6/6 lulus** (443 ms); stderr jsdom untuk `fetch('/api/auth/logout')` relatif dan error hook di luar provider adalah perilaku test lama yang tidak menggagalkan suite. `npx.cmd tsc -b` sebelumnya tidak mengeluarkan hasil selama dua menit dan dihentikan, jadi belum diklaim lulus. Tidak ada deployment atau pengukuran runtime. Sisa temuan FE-057 di luar lingkup patch ini tetap terbuka.

## 2026-09-17 (audit) — FE-001 `frontend/src/pages/admin` **verifikasi lanjutan** (K3): bukti visual + probe test + 11 temuan tambahan

- **Lingkup:** **bukan audit baru** — melengkapi unit FE-001 yang sudah selesai lebih awal hari ini (entri di bawah). Sumber: tiga halaman `frontend/src/pages/admin`, kontrak service BE yang memasoknya (`staff-performance.service.ts` + DTO, `surveys.service.ts`, `guest-preferences.service.ts`), serta berkas test halaman. **Read-only:** tanpa perubahan kode.
- **Perkakas:** `.audit-runtime/audit-fe001-admin.mjs` (inventaris file, kunci query & konsumennya, state loading/error/empty per halaman, mode pagination, daftar yang di-`map`, kebijakan refetch, formatter ad-hoc, pembentukan bulan di klien, pemakai fungsi API, cakupan test, ekstraksi `@Roles` controller, batas `take`/agregasi service BE) + pemeriksaan **bukti visual** dengan input gambar + probe `vitest`.
- **Hasil — kontrak terverifikasi:** rute `App.tsx` untuk `/staff-performance`, `/surveys`, `/guest-preferences` **3/3** ber-`RequireRoles(['OWNER','ADMIN'])` dan **selaras** dengan `@Roles(OWNER, ADMIN)` pada **6/6** route API yang dipanggil ketiga halaman; `POST /surveys` & `/surveys/mine` tetap TENANT-only (`SatisfactionSurveyCard`) → **0 kebocoran lintas role**; 3/3 halaman memakai `FeatureErrorBoundary` + `PageHeader`; `formatDateOnly` (util WIB bersama) dipakai 2/3 halaman — tidak ada pemformatan tanggal ad-hoc; `EmptyState.tsx:22` sudah `aria-hidden="true"` untuk emoji ikon.
- **Bukti visual (baru, penyelesaian persyaratan §“Pemeriksaan visual dan runtime”):** 6 berkas crawl **2026-09-08** 1280×720 — `frontend/e2e-out/{ADMIN,OWNER}_{staff-performance,surveys,guest-preferences}.png` — dibaca dengan input gambar: halaman render utuh di **kedua** role; `/staff-performance` menampilkan kartu 1 staff, pesan dorman leaderboard ("aktif saat jumlah staf ≥ 2"), dan empty chart "Belum ada audit" sesuai `active = ranked.length >= 2`; `/surveys` & `/guest-preferences` menampilkan panel ringkasan + empty state normal. **Batas:** snapshot 9 hari lebih tua dari working tree (belum memuat codemod `controlId` 12 Sep) dan hanya viewport desktop.
- **Bukti test (baru):** `npx vitest run src/test/pages/adminSurveysPage.test.tsx` → **3/3 lulus** (507 ms; durasi total 97 s). Tetap **0 test** untuk `AdminStaffPerformancePage` & `GuestPreferencesPage`.
- **Temuan tambahan (11, di luar 6 temuan entri sebelumnya):** (a) **kontradiksi state saat query gagal** — gerbang empty state `AdminSurveysPage.tsx:179` (`!filtered.length && !listQuery.isLoading`) & `GuestPreferencesPage.tsx:198–200` hanya memakai `isLoading`, sehingga saat `isError` pengguna melihat alert "Gagal memuat…" **bersamaan** dengan "Belum ada survei/data", ditambah `PageHeader` "0 survei terkumpul" (`:146`); `AdminStaffPerformancePage:310` sudah benar; (b) **`month` tanpa validasi format** — DTO hanya `@IsString()`, nilai gagal regex **jatuh diam-diam ke bulan berjalan** (`staff-performance.service.ts:17`) → label bulan ≠ data yang dirender; (c) **`formatDateKey` memakai getter lokal atas instant WIB** → pada server UTC (produksi cPanel) `period.from` bergeser −1 hari dan `period.to` menjadi 31 Agu sehingga rentang **terbalik**; klaim M06 "K-5/F2-14 selesai" hanya mencakup batas **query**, bukan **label**; (d) **`period.from/to` dihitung backend tetapi tidak pernah dirender** — justru menyembunyikan (c); `summary.good`/`tenantReviewCount` juga tidak dipakai; (e) **tiga jalur komputasi berat per pemuatan** — `monthly`, `leaderboard` (memanggil `getAdminMonthly`), dan `audit-suggestions` (`includeEvidence=true`) masing-masing membangun ulang ringkasan **seluruh** staff; `buildSummaryForStaff` = 1 `user.findUnique` + `$transaction` **6 `findMany`** tanpa `take` (satu ber-`include` template/room/tenant) → 3× pengulangan + pola N+1; belum diukur runtime (ranah EF-02); (f) **batas 200 baris tak terlihat** — `surveys.service.ts:115` & `:28` dua-duanya `take: 200`, tetapi kartu melabeli `count` sebagai "**Total** Survei" dan tabel `/surveys` tanpa pagination → pada >200 survei angka itu sampel; (g) **statistik preferensi = full table scan** (`guest-preferences.service.ts:73–82`, bukan `groupBy`); (h) **uang ad-hoc di luar util bersama** — `GuestPreferencesPage.tsx:75,230` `` `Rp ${(x/1000).toFixed(0)}rb` `` → Rp 1.150.000 tampil "**Rp 1150rb**" (FE-064 mencatat 42 berkas sejenis); (i) **sufiks default tak konsisten** — `AdminSurveysPage.tsx:40` `{summary.recommendRate ?? '—'}%` → "**—%**" (terlihat pada bukti visual ADMIN & OWNER), baris 34/46/52/58/64 `'—' ★`, dan 7 kartu `flex-fill e3-minw-140` membungkus "Harga Sepadan" ke baris kedua pada 1280 px; (j) **celah test penjelas (i)** — satu-satunya test halaman ini **selalu** `mockResolvedValue(null)` untuk `getSurveySummary` (baris 20/27/36) sehingga `SummaryPanel` tidak pernah diuji dengan data; (k) label kartu "Total Survei" **identik** antara `/surveys` dan `/guest-preferences` sedangkan `data.totalPages` backend bisa `0` (aman karena paginator bergerbang `> 1`).
- **Empat status:** implementasi aplikasi **tidak berubah**; verifikasi = analisis statis deterministik + **bukti visual** (input gambar, snapshot 8 Sep) + **probe test lokal 3/3 lulus** atas working tree `cbca06f` (dist `BZ-Vpsd9eLX1`; hash `657EC3D3…`, `072EC9C0…`, `070B3806…`); deployment tidak relevan; **belum terbukti runtime** — tabrakan empty+error, perilaku >200 survei, dan label rentang di server non-WIB belum diuji dengan API/DB nyata.
- **Cakupan:** baris **lanjutan FE-001** pada [CHECKLIST_AUDIT_TOTAL tabel hasil](CHECKLIST_AUDIT_TOTAL.md#catatan-hasil-dan-checkpoint); jumlah **Frontend tetap 15/67** (tidak ada unit baru). **Unit berikutnya menurut urutan checklist tetap FE-002 auth (K4)** — FE-001 **tidak** diulang. Sisa 120 unit belum diperiksa.

## 2026-09-17 (audit) — FE-001 `frontend/src/pages/admin` (K3) selesai diperiksa — rangkaian halaman dimulai

- **Lingkup:** unit pertama kategori **halaman** sesudah FE-064 — `frontend/src/pages/admin` (**3 file: `AdminStaffPerformancePage.tsx` 335 baris, `AdminSurveysPage.tsx` 211, `GuestPreferencesPage.tsx` 269**) + komponen `StaffAuditModal` (91) & `AdminSmartAuditPanel` (84), API `staffPerformance`/`guestPreferences`/`surveys`, serta kontrak akses FE (`App.tsx:300–302`) dan BE (`admin-staff-performance`, `guest-preferences`, `surveys` controller). **Read-only:** tanpa perubahan kode.
- **Hasil — kontrak terpenuhi:** akses **dua lapisan sama persis** — `RequireRoles OWNER,ADMIN` (FE) ↔ `@Roles(OWNER, ADMIN)` (BE) untuk seluruh rute/endpoint baca; `POST /surveys` & `/surveys/mine` tetap TENANT-only (gate 30 hari/6 bulan SV-01) sehingga halaman admin tidak membuka endpoint tenant; ketiga halaman membungkus konten dengan `FeatureErrorBoundary`, memakai `TableSkeleton` saat loading, `Alert` saat error, `EmptyState` saat kosong; `StaffAuditModal` reset form tiap dibuka + spinner/disabled saat pending + alert error saat gagal; `navigate('/tickets')` dipakai CTA "Tiket →" (bukan kode mati).
- **Temuan (advisory):** (a) **empty state tidak membedakan filter vs data kosong** — `AdminSurveysPage.tsx:179–182` menampilkan "Belum ada survei" juga saat filter rating tidak cocok padahal dataset ada; (b) **invalidate parsial** — `StaffAuditModal.tsx:40` hanya `invalidateQueries(['admin-staff-performance'])`; `admin-staff-leaderboard` & `admin-staff-audit-suggestions` (staleTime 60 s) tidak ikut invalidate, skor pasca-audit bisa terlihat lama ≤60 s; (c) **sessionId penuh di DOM** — `GuestPreferencesPage.tsx:258–261` teks terpotong 10 karakter tetapi atribut `title` membawa nilai penuh (halaman OWNER/ADMIN saja; advisory); `userAgent`/`referrer` dikirim API namun tidak dirender; (d) `#` lokal (idx+1) bukan nomor global di `AdminSurveysPage` — kosmetik; (e) bulan default `currentMonth()` memakai kalender perangkat — konsisten temuan zona waktu FE-064; (f) skeleton ganda di `GuestPreferencesPage` (di luar + di dalam Card) — redundan minor.
- **Empat status:** implementasi aplikasi **tidak berubah**; verifikasi = analisis statis deterministik atas working tree (HEAD `cbca06f`); deployment tidak relevan; tanpa klaim runtime.
- **Cakupan:** [CHECKLIST_AUDIT_TOTAL](CHECKLIST_AUDIT_TOTAL.md) FE-001 ditandai selesai + baris tabel hasil; tabel ringkasan diperbarui (**Frontend 15/67 selesai diperiksa = 1 halaman + 11 shared + 3 static**). **Rangkaian halaman (FE-001…FE-027) dimulai**; unit berikutnya menurut urutan checklist adalah **FE-002 auth (K4)**. Sisa 121 unit belum diperiksa.

## 2026-09-17 (audit) — FE-064 `frontend/src/utils` (K3) selesai diperiksa — rangkaian shared FE tuntas

- **Lingkup:** unit terakhir rangkaian **Frontend bersama (shared)** sesudah FE-063 — `frontend/src/utils` (**38 file, 3.680 baris**): format uang/tanggal, normalisasi, edge case, helper tampilan. **Read-only:** tanpa perubahan kode.
- **Perkakas:** `.audit-runtime/audit-fe064-utils.mjs` (pemakai per util, duplikasi nama ekspor, formatter ad-hoc di luar utils, manipulasi string hasil format, strategi zona waktu, cakupan test).
- **Hasil — kontrak terpenuhi:** **38/38 util punya pemakai — 0 util mati** (`depositSettlementCopy` dipakai `ProcessDepositModal.tsx:14`) dan **0 duplikasi nama fungsi ekspor** antar util; sentralisasi inti bekerja: `formatCurrency` **57 berkas**, `dateTime` **45**, `getApiErrorMessage` **30**; `dateTime.ts` memakai `Asia/Jakarta` eksplisit + label WIB untuk seluruh formatter tampilan; 7 dari 38 util dirujuk test (`dateTime`, `formatCurrency`, `ktpOcr`, `meterUsage`, `ocrPreprocess`, `pricing`, `whatsapp`).
- **Temuan:** (a) **tiga strategi zona waktu bercampur** — WIB eksplisit (7 berkas), **aritmetika kalender perangkat** (`differenceInCalendarDays` ×5 pada `daysFromToday`/`getLeaseProgress`), dan offset perangkat manual (3 berkas); **`EnergyPage.tsx` mencampur `timeZone: 'UTC'` (70,72) dengan `Asia/Jakarta`+"WIB" (115,254,380) pada halaman yang sama** → label tanggal dapat berbeda satu hari di perangkat non-WIB / sekitar tengah malam WIB; (b) **42 berkas memformat sendiri di luar utils** (`CurrencyInput.tsx:49` formatter uang kedua, 4 chart, 2 `toLocaleDateString` EnergyPage); (c) **penambalan FAQ lewat `answer.replace('Rp 2.500/kWh', formatRupiah(...))` ×3** di `PublicGuestDashboardPage.tsx` → gagal **tanpa error** bila salinan FAQ berubah (FE-058 mencatat 4 sumber FAQ) dan peka bentuk spasi (NBSP dari ICU `id-ID`); (d) doc vs kode `formatCompactRupiah` untuk nilai 0; (e) `formatRupiah` menerima `string` + `parseFloat` → "1.500.000" menjadi "Rp 2" (risiko kontrak, belum ada pemanggil terverifikasi); (f) **31 util tanpa test**, termasuk `invoiceTotals` (19 pemakai), `publicRoomDisplay` (12), `tenantCopy` (11), `statusLabels` (8), `bookingExpiry` (8) — ranah QA-008.
- **Empat status:** implementasi aplikasi **tidak berubah**; verifikasi = analisis statis deterministik atas working tree (dist `BZ-Vpsd9eLX1`); deployment tidak relevan; tanpa klaim runtime — perilaku tanggal pada perangkat non-WIB dan di sekitar tengah malam WIB **belum terbukti** tanpa UAT.
- **Cakupan:** [CHECKLIST_AUDIT_TOTAL](CHECKLIST_AUDIT_TOTAL.md) FE-064 ditandai selesai + baris tabel hasil; tabel ringkasan diperbarui (**Frontend 14/67 selesai diperiksa = 11 shared + 3 static**). **Rangkaian shared FE (FE-054…FE-064) selesai seluruhnya**; unit berikutnya menurut urutan checklist adalah halaman (FE-001 admin, K3). Sisa 121 unit belum diperiksa.

## 2026-09-17 (audit) — FE-063 `frontend/src/types` (K2) selesai diperiksa

- **Lingkup:** unit audit cakupan lanjutan sesudah FE-062 — kontrak tipe FE terhadap payload API dan nullability (**`core.ts` 895 baris, 80 ekspor** + `index.ts`). **Read-only:** tanpa perubahan kode.
- **Perkakas:** `.audit-runtime/audit-fe063-types.mjs` (pemakai per ekspor, duplikasi nama, nullability, paritas union↔enum Prisma, field model inti, envelope) dan `audit-fe063-refine.mjs` (union yang kolaps, klasifikasi tipe, field wajib-nullable).
- **Hasil — kontrak terpenuhi:** `ApiEnvelope` cocok dengan `response-envelope.interceptor.ts:21–25` (41 controller memakai `{message,data}` yang dibungkus interceptor); **paritas union FE ↔ enum Prisma 15/15 sama persis**; **0 `any` dan 0 `unknown`** di `core.ts`; `strict: true` aktif di `frontend/tsconfig.json`; field FE yang tidak punya padanan Prisma sebagian besar **enrichment service** (`Room.isAvailable/canBook/currentStay/facilityCheck`, `Stay.invoiceCount/latestInvoice*`, `Invoice.paidAmountRupiah/accounting`, `MeterReading.usage*`) — bukan drift.
- **Temuan:** (a) **16 union berakhiran `| string`** → tipe domain kolaps menjadi `string` (type-safety hilang) padahal 15 di antaranya sudah identik dengan enum Prisma; (b) **`WifiSale.tenantId`/`stayId` field fiktif** (tidak ada di model Prisma `WifiSale`, 0 rujukan di modul wifi-sales) → selalu `undefined` di UI; (c) **nullability ambigu**: 255 dari 579 field memakai `?: T | null`, hanya 3 field wajib-tapi-nullable, `exactOptionalPropertyTypes` tidak aktif; (d) **`ApiErrorResponse` mati** (0 pemakai) walau isinya cocok dengan filter error backend; (e) **616 deklarasi tipe lokal di luar `types/`** dan 3 nama bertabrakan dengan ekspor core (`MeterRow`, `RoomItem`, `PaymentAmountTone`).
- **Empat status:** implementasi aplikasi **tidak berubah**; verifikasi = analisis statis deterministik atas working tree (dist `BZ-Vpsd9eLX1`); deployment tidak relevan; tanpa klaim runtime — dampak field fiktif (b) pada layar **belum terbukti** tanpa respons API nyata/UAT. Catatan: perbaikan (a)/(c) murni tingkat tipe (tanpa efek runtime) sehingga aman diperiksa dengan `npx tsc -b`, sedangkan (b) menyentuh kontrak data.
- **Cakupan:** [CHECKLIST_AUDIT_TOTAL](CHECKLIST_AUDIT_TOTAL.md) FE-063 ditandai selesai + baris tabel hasil; tabel ringkasan diperbarui (**Frontend 13/67 selesai diperiksa**); unit berikutnya **FE-064 utils (K3)** — unit terakhir dari rangkaian shared FE. Sisa 122 unit belum diperiksa.

## 2026-09-17 (audit) — FE-062 `frontend/src/styles` (K2) selesai diperiksa

- **Lingkup:** unit audit cakupan lanjutan sesudah FE-061 — **18 sheet CSS, 31.517 baris** (+ `admin-area.ts`): token, kontras, responsivitas, fokus, konsistensi lintas portal. **Read-only:** tanpa perubahan kode.
- **Perkakas:** `.audit-runtime/audit-fe062-styles.mjs` (token, selektor, `!important`, breakpoint, fokus, kelas), `audit-fe062-vars.mjs` (klasifikasi custom property dinamis), `audit-fe062-tokens.mjs` (pemisahan token Bootstrap vs milik sendiri).
- **Hasil — kontrak terpenuhi:** 18/18 sheet diimpor `styles.css` urut 00→17; **225 token** didefinisikan (185 dipakai, 3.396 pemakaian `var()`); 2.599 kelas CSS unik dan 4.563 selektor unik; **33 aturan `:focus-visible`** (pola fokus modern sudah dipakai); kontras mengacu bukti terakhir crawl Axe 12 Sep 2026 (0 critical/serious, 1 sisa node `/profile`) — **tidak** diukur ulang pada audit statis ini.
- **Temuan:** (a) **5 deklarasi CSS invalid** karena custom property tanpa definisi **dan** tanpa setter (`--staff-progress` di `.staff-donut` tanpa fallback → cincin donut tidak tergambar; `--p` ×2; `--a`+`--b`), sementara `--routine-progress`/`--staff-score`/`--ring-color` diverifikasi aman; (b) **55 token tidak dipakai** — 9 di antaranya adalah permukaan override Bootstrap yang sah, **45 token milik sendiri tidak muncul di kode mana pun**; (c) **383 selektor didefinisikan di ≥2 sheet** dan **516 duplikasi dalam sheet yang sama** → urutan impor menjadi kontrak implisit; (d) **869 `!important`**; (e) **responsivitas tanpa skala tunggal**: 40 kondisi media, konvensi `768px` (inklusif) bercampur `767.98px` (eksklusif) + puluhan lebar ad-hoc; (f) **1 `outline: none` tanpa pengganti** pada `.cmd-palette-input` (input Command Palette tanpa indikator fokus); (g) **802 hex + 1.619 `rgb()/hsl()` literal di luar file token**; (h) **117 kelas JSX tanpa definisi CSS** (advisory).
- **Empat status:** implementasi aplikasi **tidak berubah**; verifikasi = pengukuran statis deterministik atas working tree (dist `BZ-Vpsd9eLX1`); deployment tidak relevan; **tanpa klaim kontras/tampilan** — kontras dan efek visual perbaikan (c)–(g) **belum terbukti** dan wajib UAT/visual, bukan typecheck.
- **Cakupan:** [CHECKLIST_AUDIT_TOTAL](CHECKLIST_AUDIT_TOTAL.md) FE-062 ditandai selesai + baris tabel hasil; tabel ringkasan diperbarui (**Frontend 12/67 selesai diperiksa**); unit berikutnya **FE-063 types (K2)**. Sisa 123 unit belum diperiksa.

## 2026-09-17 (audit) — FE-061 `frontend/src` root (K4) selesai diperiksa

- **Lingkup:** unit audit cakupan lanjutan sesudah FE-060 — entry React, peta route + guard role, stylesheet entry, env, dan batas PWA (**4 file: `App.tsx` 352 baris, `main.tsx` 33, `styles.css` 26, `vite-env.d.ts` 1**). **Read-only:** tanpa perubahan kode.
- **Perkakas:** `.audit-runtime/audit-fe061-root.mjs` — stylesheet entry vs disk, lazy/eager import, inventaris 72 `<Route>` + peran `RequireRoles`, cakupan copy penolakan, tipe env, dan batas PWA/error boundary.
- **Hasil — kontrak terpenuhi:** **18/18** modul CSS diimpor `styles.css` dengan urutan naik 00→17 (0 impor tanpa file, 0 file tanpa impor) dan Bootstrap diimpor **sebelum** CSS aplikasi; **72 `<Route>`** dengan **56 pemakaian `RequireRoles`** cocok dengan hitungan FE-059; guard berlapis `ProtectedRoute` → `AppLayout` → `RequireRoles`; 7 rute tanpa `RequireRoles` diverifikasi wajar (anak `/inventory/*` di bawah guard induk, 3 redirect lama, 1 redirect `/portal/guide`); `/settings` untuk ADMIN disengaja karena panel owner-only dijaga `isOwner` (`OwnerSettingsPanels.tsx:1063,1200,1220`); `PwaRouteBoundary` = error boundary kelas dengan `key={location.pathname}` dan `FeatureErrorBoundary` dipakai 20 berkas; `installResponsiveTableLabels()` idempoten.
- **Temuan:** (a) **`ImportMetaEnv` tidak dideklarasikan** → 2 variabel env dipakai tanpa tipe, typo jatuh diam-diam ke fallback; (b) **catch-all `path="*"` di dalam `ProtectedRoute` tetapi di luar `AppLayout`** → anonim ke URL tak dikenal dibuang ke `/login` dan pengguna login melihat 404 tanpa shell aplikasi; (c) `/portal/guide` tanpa guard role → redirect 2-hop + toast untuk OWNER/ADMIN/STAFF; (d) **`styles/admin-area.ts`** diimpor 7 halaman padahal `08-admin.css` sudah global → 7 impor mati; (e) dua strategi CSS (18 global sheet + 1 CSS module) — ranah FE-062; (f) `console.warn` tanpa guard DEV di `PwaRouteBoundary`; (g) tidak ada scroll-to-top terpusat saat ganti rute; (h) 3 halaman auth eager di antara 61 halaman lazy; (i) `installResponsiveTableLabels` bisa meninggalkan `data-label` basi dan memindai seluruh tabel tiap batch mutasi.
- **Empat status:** implementasi aplikasi **tidak berubah**; verifikasi = analisis statis deterministik atas working tree (dist `BZ-Vpsd9eLX1`); deployment tidak relevan; tanpa klaim runtime — perilaku 404 tanpa shell, scroll antar-rute, dan pembagian chunk eager **belum terbukti** tanpa UAT/browser.
- **Cakupan:** [CHECKLIST_AUDIT_TOTAL](CHECKLIST_AUDIT_TOTAL.md) FE-061 ditandai selesai + baris tabel hasil; tabel ringkasan diperbarui (**Frontend 11/67 selesai diperiksa**); unit berikutnya **FE-062 styles (K2)**. Sisa 124 unit belum diperiksa.

## 2026-09-17 (audit) — FE-060 `frontend/src/lib` (K3) selesai diperiksa

- **Lingkup:** unit audit cakupan lanjutan sesudah FE-059 — `frontend/src/lib/queryClient.ts` (15 baris). **Read-only:** tanpa perubahan kode.
- **Perkakas:** `.audit-runtime/audit-fe060-lib.mjs` (instance QueryClient, panggilan cache, override `refetchOnWindowFocus`/`staleTime`/`retry`, dan cakupan `onError` pada 133 blok `useMutation`).
- **Hasil — kontrak terpenuhi:** **1 instance `QueryClient`** di seluruh aplikasi (tidak ada instance kedua di luar test), dipasang sebagai provider terluar di `main.tsx`; `AuthContext` memanggil `queryClient.clear()` pada login **dan** logout sehingga tidak ada data pengguna sebelumnya yang tersisa (penting untuk perangkat bersama); default `staleTime` 5 menit, `refetchOnWindowFocus: false`, `retry` menolak retry untuk status < 500 dan membatasi 5xx/network ke satu retry; retry mutasi default 0.
- **Temuan (advisory):** (a) **dua rezim cache** — **14 berkas** meng-override `refetchOnWindowFocus` ke `true` (portal, dashboard/owner, PaymentReview, RenewRequests) walau default global `false`, dan hanya 2 berkas ke `false`, tanpa dokumentasi terpusat; (b) **11 nilai `staleTime` berbeda** tanpa konstanta bersama; (c) `retry` di-override di **28 berkas**, `throwOnError` **0 pemakaian**, dan tidak ada subscriber `QueryCache`/`MutationCache` → tidak ada jalur umpan balik error terpusat; (d) **57 dari 133 blok `useMutation` tanpa `onError`**; sampel 20 berkas: 16 masih punya jalur umpan-balik, 4 tidak (`hooks/useInvoices`, `useMeterReadings`, `usePayments`, `useStay`), sedangkan pemanggil umumnya hanya merender `isPending` → kegagalan mutasi berpotensi tidak terlihat (verifikasi per halaman: FE-005/006/026).
- **Empat status:** implementasi aplikasi **tidak berubah**; verifikasi = analisis statis deterministik atas working tree (dist `BZ-Vpsd9eLX1`); deployment tidak relevan; dampak request/refetch nyata **belum terbukti** tanpa pengukuran runtime.
- **Cakupan:** [CHECKLIST_AUDIT_TOTAL](CHECKLIST_AUDIT_TOTAL.md) FE-060 ditandai selesai + baris tabel hasil; tabel ringkasan diperbarui (**Frontend 10/67 selesai diperiksa**); unit berikutnya **FE-061 root (K4)**. Sisa 125 unit belum diperiksa.

## 2026-09-17 (audit) — FE-059 `frontend/src/hooks` (K3) selesai diperiksa

- **Lingkup:** unit audit cakupan lanjutan sesudah FE-058 — **22 file, 1.632 baris**; fokus query/mutation, lifecycle, hook-order, loading/error, dan cleanup. **Read-only:** tanpa perubahan kode.
- **Perkakas:** `.audit-runtime/audit-fe059-hooks.mjs` (inventaris hook + pemakai, effect tanpa cleanup, `any`/`console`, kunci query, invalidasi tanpa definisi, duplikasi endpoint lintas key) + pembacaan penuh 15 hook berisiko.
- **Hasil — kontrak lifecycle terpenuhi:** `useAuthenticatedMediaUrl` bersih (AbortController + `revokeObjectURL` + penjaga `loadedFor === resolved` + 204 → `failed`) — kontras positif dengan temuan FE-054 "0 AbortSignal di lapisan api"; `useContainerWidth` (ResizeObserver + `disconnect()`); `useDocumentTitle` (restore saat unmount); `useStaffPhotoUpload` (reset input di `finally`); `useNotifications`/`useNotificationsInfinite` (key list/infinite selaras, optimistic + rollback + invalidasi); `useInvoices`/`usePayments`/`useMeterReadings` (invalidasi presisi, `enabled` dijaga, prefix `['invoice', id]` menutup `['invoice', id, 'payments']`); `useAvailabilityShortcut` → `/update-kamar` memang bergerbang PIN owner.
- **Temuan:** (a) **deduplikasi portal T-06 belum tuntas** — `/stays/me/current` di **2 key** dan `/payment-submissions/my` di **3 key** (`TenantBookingGate.tsx:51`, `MyBookingsPage.tsx:91`, `TenantInvoiceDetailPage.tsx:130` vs kanonik `api/portalQueryKeys.ts`) → cache terpecah; karena `PaymentUrgencyChip` terpasang app-wide, halaman portal tertentu memicu request ganda untuk endpoint yang sama; (b) **15 invalidasi mati pada 9 key** (antara lain `['payment-urgency']` ×3, `['dashboard-owner']` ×3, `['invoice-payments']` ×2, `['auto-ops-status']` dengan prefix salah); (c) **`RootEntry` mengabaikan `isLoading`** → TENANT dengan stay aktif yang membuka `/` diarahkan ke `/rooms` sebelum query settle dan tidak dikoreksi sesudahnya; (d) **`usePushNotifications`** menganggap "enabled" dari sisi device saja → langganan browser yatim bila simpan ke server gagal, tanpa cleanup/retry; (e) **`usePaymentUrgency`** menangani 404 inline (hanya `response.status`) padahal ada helper 3-bentuk, dan gate error all-or-nothing melewati P1/P3 tanpa sinyal; (f) **`useStay.invalidate` = 19 `await` berurutan tanpa `Promise.all`**; (g) **5 hook tanpa pemakai (310 baris)**: `useBusinessHealthScore`, `useMeterAnomalyDetector`, `useCashflowForecast`, `useTenantRiskProfile`, `useGenericForm` (`useContainerWidth` tetap dipakai intra-folder); (h) `ChartResponsiveWrapper.tsx` (komponen PascalCase) ada di dalam `src/hooks/`; (i) `useClientPagination` menampilkan satu render halaman kosong sebelum clamp; (j) penandaan-ulang notifikasi dapat menurunkan `unreadCount` sementara; (k) 2 `any` di batas hook.
- **Empat status:** implementasi aplikasi **tidak berubah**; verifikasi = analisis statis deterministik atas working tree (dist `BZ-Vpsd9eLX1`); deployment tidak relevan; tanpa klaim runtime — jumlah request nyata, redirect TENANT di `/`, dan perilaku langganan push **belum terbukti** tanpa UAT/browser.
- **Cakupan:** [CHECKLIST_AUDIT_TOTAL](CHECKLIST_AUDIT_TOTAL.md) FE-059 ditandai selesai + baris tabel hasil; tabel ringkasan diperbarui (**Frontend 9/67 selesai diperiksa**); unit berikutnya **FE-060 lib (K3)**. Sisa 126 unit belum diperiksa.

## 2026-09-17 (audit) — FE-058 `frontend/src/data` (K3) selesai diperiksa

- **Lingkup:** unit audit cakupan lanjutan sesudah FE-057; fokus sumber data statis, relevansi nilai bisnis terhadap konstanta kanonik, dan privasi. **Read-only:** tanpa perubahan kode.
- **Perkakas:** `.audit-runtime/audit-fe058-data.mjs` — whitelist aset vs disk, ekstraksi nilai Rupiah konten vs `getOperationalDefaults()` backend, perbandingan empat sumber FAQ, jejak `adminWhatsappNumber`, pemindaian pola PII, dan reimplementasi `getKost48RoomGallery` atas 13 kamar seed + kasus batas.
- **Hasil — kontrak aset & privasi terpenuhi:** **86/86** nama whitelist ada di disk dan unik; 5 gambar generik ⊂ whitelist; 4/4 path literal `/room-images/*` ada; **0 referensi menggantung**; 11 dari 13 kamar nyata mendapat 4–10 foto spesifik; **0 PII** di kedua file (0 email, 0 nomor 08xx, 0 NIK); nilai bersumber sistem cocok dengan default backend (Rp 2.500/kWh, Rp 20.000/galon, Rp 50.000 WiFi bulanan, Rp 100.000 deposit hewan, nomor WA) dan alamat = M02 D-01.
- **Temuan:** (a) **empat sumber FAQ berbeda** (kanonik 37 item · `backend/scripts/seed-faqs.ts` 18 item usang dengan galon Rp 15.000 · FE `data/officialKost48Content.ts` 18 item · `pages/public/publicGuestShared.tsx` 12 item) — **15/18** pertanyaan FE tidak ada di kanonik dan **33/37** pertanyaan kanonik tidak muncul di sumber FE mana pun, sehingga `/panduan` (API) dan kartu info resmi di `PublicRoomDetailPage` (statis) menjawab berbeda; (b) **kontradiksi nilai yang terbaca pengguna** — tarif bawah Rp 800.000 (FE) vs **Rp 850.000** (kanonik dan M11 tarif publik terendah), TV tersedia (FE, sejalan M11) vs "tidak menyediakan TV" (kanonik), penghuni tambahan tanpa angka (FE) vs 20% tarif kamar (kanonik = `extraOccupantFeePercent`), jatah 30 kWh hanya di kanonik; (c) **nomor WhatsApp build-time, bukan setting owner** meski komentar menyatakan "owner-settable" — dipakai 8 berkas publik sementara `adminWhatsappNumber` dari `/settings/public-config` **0 pembaca runtime**; (d) **F1/F2 tanpa foto lokal** (whitelist tidak memuat huruf `f`) → kamar mezzanine tampil dengan rotasi generik foto kamar lain; (e) ekspor mati `getKost48LogoUrl`, `getWhatsappUrl`, 2 tipe; (f) **29 nama aset** `/room-images` tidak dirujuk literal di source FE/`sw.js` (cross-check FE-066 yang melaporkan 30 dengan metode berbeda).
- **Empat status:** implementasi aplikasi **tidak berubah**; verifikasi = analisis statis deterministik atas working tree (dist `BZ-Vpsd9eLX1`); deployment tidak relevan; tanpa klaim runtime — halaman/komponen mana yang benar-benar dilihat pengguna (dan apakah `/panduan` memakai API atau fallback statis) **belum terbukti** tanpa UAT/browser.
- **Cakupan:** [CHECKLIST_AUDIT_TOTAL](CHECKLIST_AUDIT_TOTAL.md) FE-058 ditandai selesai + baris tabel hasil; tabel ringkasan diperbarui (**Frontend 8/67 selesai diperiksa**); unit berikutnya **FE-059 hooks (K3)**. Sisa 127 unit belum diperiksa.

## 2026-09-17 (audit) — FE-057 `frontend/src/context` (K4) selesai diperiksa

- **Lingkup:** unit audit cakupan lanjutan sesudah FE-056; fokus kontrak sesi/state global, lifecycle provider, guard, dan stale state. **Read-only:** tanpa perubahan kode.
- **Perkakas:** `.audit-runtime/audit-fe057-context.mjs` — inventaris ekspor + pemakai (442 file FE dipindai), validasi cache user vs tipe `AuthUser`, penulis/pembaca kunci storage, siklus hidup `authPermanentlyFailed`, kontrak mati, urutan provider, dan jalur gagal init.
- **Hasil — kontrak dasar terpenuhi:** `useAuth` melempar di luar provider; urutan provider `QueryClientProvider → AuthProvider → ToastProvider → ConfirmProvider` benar (AuthProvider di dalam query client sehingga `queryClient.clear()` sah); guard berlapis (`ProtectedRoute` menunggu `loading` lalu memeriksa `token`; **56** pemakaian `RequireRoles` memakai `user` dan mengembalikan `null` bila `user` null) → tidak ada render prematur untuk role salah.
- **Temuan:** (a) **kunci pembersihan sesi tenant tidak cocok** — `TENANT_SESSION_KEYS = ['portal-bookings-success-message']` vs kunci nyata `kost48:portal-bookings:success-message` (`BookingPage.tsx:160`; `MyBookingsPage.tsx:51,73,130,215,258`) → `clearTenantSessionStorage()` pada login **dan** logout tidak membersihkan apa pun (copy generik tanpa PII, tetapi kontrak lifecycle cacat); (b) **`authPermanentlyFailed` tidak pernah di-reset saat login/logout** dan `clearAuthAndRedirect` men-set flag sebelum early-return di `/login` → memuat `/login` dengan token kedaluwarsa membuat `POST /auth/login` ditolak `AUTH_EXPIRED` sampai reload manual; (c) **sumber kebenaran token terbelah** — refresh menulis localStorage tanpa memperbarui state `token` AuthContext, literal kunci diduplikasi di 2 modul; (d) **stale/blank state** saat `me()` gagal non-401/403 → di tab baru `user` null + `token` truthy → `RequireRoles` mengembalikan `null` (halaman kosong tanpa pesan/retry), sementara `refreshMe` **0 pemakai**; (e) tanpa sinkronisasi lintas tab (**0 listener `storage`**); (f) `readCachedUser` memvalidasi 4/12 field dan tanpa versi skema cache; (g) `setBreadcrumbLabel` **0 penulis** → breadcrumb detail selalu literal `'Detail'`; (h) logout best-effort (`fetch` mentah tanpa await/timeout, `console.warn` produksi); (i) test `useAuth.test.tsx` hanya 4 kasus — tidak ada kasus `me()` gagal, hidrasi cache, atau `refreshMe`.
- **Empat status:** implementasi aplikasi **tidak berubah**; verifikasi = analisis statis deterministik atas working tree (dist `BZ-Vpsd9eLX1`); deployment tidak relevan; tanpa klaim runtime — login-loop (b), halaman kosong (d), dan sinkronisasi lintas tab (e) **belum terbukti** tanpa UAT/browser.
- **Cakupan:** [CHECKLIST_AUDIT_TOTAL](CHECKLIST_AUDIT_TOTAL.md) FE-057 ditandai selesai + baris tabel hasil; tabel ringkasan diperbarui (**Frontend 7/67 selesai diperiksa**); unit berikutnya **FE-058 data (K3)**. Sisa 128 unit belum diperiksa.

## 2026-09-17 (audit) — FE-056 `frontend/src/constants` (K2) selesai diperiksa

- **Lingkup:** unit audit cakupan lanjutan sesudah FE-055. **Read-only:** tanpa perubahan kode.
- **Perkakas:** `.audit-runtime/audit-fe056-constants.mjs` — inventaris 14 ekspor + pemakainya (442 file FE dipindai), ekstraksi opsi (`value`/`label`/`backendStatus`) dan peta label, lalu pembandingan terhadap enum `backend/prisma/schema.prisma` (7 enum) serta DTO/service backend.
- **Hasil — kontrak nilai bersama terpenuhi:** seluruh `backendStatus` berada di dalam enum yang divalidasi DTO (`RoomItemStatus`, `InventoryItemStatus`) **dan** di dalam himpunan yang diizinkan untuk STAFF (`room-items.service.ts:11–15`, `inventory-items.service.ts:13–20`) → 0 nilai di luar enum, 0 di luar izin role · `adminDecisionOptions` = `AdminDecision` 3/3 · `roomItemFinalStatusOptions` = `RoomItemStatus` 4/4 · `inventoryItemFinalStatusOptions` ⊂ `InventoryItemStatus` 5/7 (LOW_STOCK/OUT_OF_STOCK tidak manual — konsisten dengan aturan "dihitung otomatis") · `fieldReportStatusLabels` 7/7 · `ticketStatusLabels` 5/5 · `inventoryMovementTypeOptions` ⊂ `InventoryMovementType` 2/5 dan ADJUSTMENT memang ditolak backend (pengecualian sah) · 0 tumbukan kunci antar peta label.
- **Temuan:** (a) **jalur "Sudah kembali baik" dijamin 403** — aturan bersama menawarkan `GOOD` untuk barang kamar, sementara izin STAFF backend = {DAMAGED, MAINTENANCE, MISSING} dan target room-item modal ini hanya dapat dibuka STAFF (`RoomDetailPage.tsx:321` bergerbang `isStaff`; `/staff-warehouse` `RequireRoles(['STAFF'])`) → staff yang selesai memperbaiki barang tidak dapat melaporkannya kembali baik; (b) `roomConditionOptions` **ekspor mati** (0 pemakai) sementara aturan hidupnya dideklarasikan ulang inline di `StaffInventoryStatusModal.getRoomReportChoice` (6 pilihan, label berbeda, tanpa GOOD); (c) `COUNT_MISMATCH`/`RESTOCK_REQUEST` adalah nilai FE-only (tidak ada di enum `ReportedCondition`) dan keduanya runtuh ke `PENDING_CHECK` → niat "jumlah tidak sesuai"/"minta restock" hanya bertahan di catatan bebas dan tiket otomatis selalu `BARANG_RUSAK` (kategori `STOK_HABIS` tidak terjangkau dari alur staff); (d) **dua sistem label paralel** — 17 rendering berbeda untuk nilai enum yang sama antara `constants/staffRepairOptions` dan `utils/statusLabels`, dengan pemakai terbelah (`TicketsPage`/`StatusBadge` vs `StaffUnifiedWorkQueue`/`getTicketStatusLabel`), plus label `OUT`/`ASSIGN_TO_ROOM` yang berbeda dari `config/resources`+`components/resources`/`pages/resources`; (e) tabrakan nama tipe `SelectOption` (constants vs `SearchableSelect`); (f) `getStaffRepairLabel`/`getOptionLabel` mengabaikan `fallback` untuk nilai non-kosong tak dikenal dan tanpa normalisasi huruf besar, berbeda dari `getTicketStatusLabel`.
- **Empat status:** implementasi aplikasi **tidak berubah**; verifikasi = analisis statis deterministik atas working tree (dist `BZ-Vpsd9eLX1`); deployment tidak relevan; tanpa klaim runtime — jalur 403 dan rendering label per layar **belum terbukti** di UAT/browser.
- **Cakupan:** [CHECKLIST_AUDIT_TOTAL](CHECKLIST_AUDIT_TOTAL.md) FE-056 ditandai selesai + baris tabel hasil; tabel ringkasan direkonsiliasi (**Frontend 6/67 selesai diperiksa**, 6/6 berisi temuan); unit berikutnya **FE-057 context (K4)**. Sisa 129 unit belum diperiksa.

## 2026-09-17 (audit) — FE-055 `frontend/src/config` (K3) selesai diperiksa

- **Lingkup:** unit audit cakupan lanjutan sesudah FE-054. **Read-only:** tanpa perubahan kode.
- **Perkakas:** `.audit-runtime/audit-fe055-config.mjs` — membandingkan route `App.tsx`, pola judul `routeTitles.ts`, target `navigation.ts`, dan kontrak versi (`version.ts` ↔ `public/version.json` ↔ `dist/version.json`).
- **Hasil:** 77 route (termasuk nested + redirect lama) · **30/30 target navigasi menunjuk route nyata — 0 menggantung** · 67 pola judul · **0 judul mati**: tiga kandidat awal (`/inventory/gudang`, `/inventory/barang-kamar`, `/inventory/mutasi`) ternyata **artefak parser** karena child route bersifat relatif (`App.tsx:306–310`), dan `/gudang`·`/barang-kamar`·`/mutasi` adalah key tab, bukan route · kontrak versi **paritas ✓** (`1.3.0` / `Portal Ringkas` / `2026-08-20`) dan `dist/version.json` distamp buildId PWA (`BZ-Vpsd9eLX1`) saat build.
- **Temuan advisory:** 8 route nyata tanpa entri judul → `document.title` jatuh ke judul marketing default: `/portal/energy`, `/portal/checkout`, `/portal/renewal`, `/portal/guide`, `/update-kamar`, `/availability-setup`, `/additional-services`, `/service-interests`. Tindak lanjut = tambah pola judul atau dokumentasikan alasan; ranah copy/label AO-14/AO-21, bukan bug fungsional.
- **Empat status:** implementasi aplikasi **tidak berubah**; verifikasi = analisis statis deterministik (working tree, dist `BZ-Vpsd9eLX1`); deployment tidak relevan; tanpa klaim runtime (`document.title` per route belum diuji di browser/UAT).
- **Cakupan:** [CHECKLIST_AUDIT_TOTAL](CHECKLIST_AUDIT_TOTAL.md) FE-055 ditandai selesai + baris tabel hasil; **cakupan audit total Frontend 5/67**; unit berikutnya **FE-056 constants (K2)**. Dua unit (FE-054, FE-055) selesai hari ini; sisa 130 unit belum diperiksa dan tidak dapat diselesaikan dalam satu sesi.

## 2026-09-17 WIB — DEPLOYMENT: perbaikan tablet 768 px, CLS mobile, dan target sentuh ≥1024 px tayang (`BZ-Vpsd9eLX1`)

- **Lingkup:** permintaan owner "lanjutkan hingga habis" — memasang tiga perbaikan frontend hari ini ke produksi. **Deploy `client/` saja:** tanpa restart, tanpa menyentuh backend/DB/`.env`/`uploads`.
- **Artefak:** build kanonik `BZ-Vpsd9eLX1` (PWA verification passed, 162 chunk, initial JS gzip 146 KiB / CSS 131 KiB) → arsip `client-update-20260917-121547.tgz` **14.991.955 byte**, SHA-256 `CF1C08F6E9B59E9BDC7ADF8C610FB2A8D8426A9BACB5E4E5B39D0EE8E1E1B796`; checksum **cocok** di server.
- **Prosedur:** `scripts/remote/deploy-client-safe.sh` (dikirim lewat SSH stdin) — backup `client-20260917-121631.tar.gz` (versi lama `3c0qJfgImyvj`) → ekstrak ke `client-new` (165 aset) → verifikasi entry dari `index.html` (`assets/index-CD1lX4UE.js` ada) → tukar folder utuh → uji HTTPS: `/` 200, `/rooms` 200, `/cek` 200; `version.json` server = lokal disk = `BZ-Vpsd9eLX1`.
- **Verifikasi produksi (bukan sekadar 200):** diukur dari luar memakai browser sungguhan — `version.json` build baru; **CSSOM live** memuat `(max-width: 767.98px)` 100 aturan, `(min-width: 768px) and (max-width: 1023.98px)` 5 aturan, `(min-width: 1024px) and (pointer: coarse)` 6 aturan, serta selektor M22 (`.gx-hero-sub-reserve`, `.gx-hero-price-badge-sub-reserve`, `.gx-hero-price-slot`); **CLS produksi 0,0081** pada 1280×720 dengan data nyata (13 kamar terisi) — badge harga tampil 42 px, `gx-hero-sub-reserve` = `gx-hero-sub-live` = 54 px (mekanisme ruang-terpesan bekerja di produksi), overflow 0 px.
- **Rollback tersedia:** `~/kost48-prod/client-old-20260917-121631` + `~/backups/client-20260917-121631.tar.gz`; perintah `mv ~/kost48-prod/client-old-20260917-121631 ~/kost48-prod/client`.
- **Catatan operasional:** skrip dikirim dengan akhir baris CRLF → bash mencatat `$'\r': command not found` di baris terakhir; **tidak** memengaruhi hasil (semua langkah selesai dan `version.json` server cocok). Sesi berikutnya sebaiknya mengirim skrip dengan LF.
- **Empat status:** implementasi frontend berubah (2 file) · verifikasi = build kanonik + pengukuran lokal + **verifikasi produksi sesudah deploy** · deployment **DIJALANKAN** 17 Sep 2026 WIB · dampak terukur: CLS produksi 0,0081 (12–15 Sep masih 0,238–0,4235) dan target sentuh tablet 18 → 0 (dibuktikan lokal pada build yang sama; pengukuran produksi 768 px belum dapat dilakukan karena WAF memblokir iframe lintas-origin).
- **Belum terbukti:** perilaku `(pointer: coarse)` pada perangkat sentuh nyata (harness lokal = pointer halus) dan sisa pergeseran beberapa piksel dari pergantian webfont.

## 2026-09-17 (audit) — FE-054 `frontend/src/api` (K4) selesai diperiksa

- **Lingkup:** unit audit cakupan berikutnya menurut M12 (FE-054: kontrak endpoint, payload/response, auth, error, invalidasi). **Read-only:** tanpa perubahan kode.
- **Perkakas baru:** `.audit-runtime/audit-fe054-api.mjs` (inventaris endpoint FE→BE, higiene log/URL/token/`any`, sinyal auth) dan `.audit-runtime/audit-fe054-invalidation.mjs` (invalidasi TanStack lintas `frontend/src`). Keluaran: `.audit-runtime/out/audit-fe054.json`.
- **Hasil:** 49 file / 5.134 baris · **74 endpoint unik FE vs 346 route BE → 0 drift** (3 kandidat awal ternyata konstanta `${BASE}`: `/ancillary-revenue/streams`, `/faqs/:id` PATCH+DELETE, diverifikasi ke controller) · klien: baseURL dari env, timeout 15 s, Bearer dari localStorage, `X-Owner-View-Mode`, guard offline untuk non-GET, anti-flood 401, single-flight refresh + antrean, normalisasi pesan timeout/network · higiene: 0 `console.log`, 0 URL absolut, 0 token di query · invalidasi: 133 `useMutation`, 341 `invalidateQueries`, 1 `refetchQueries`, hanya 4 file bermutasi tanpa invalidasi (2 benar menurut desain, 2 advisory).
- **Temuan:** (a) `client.ts:100` menulis `originalRequest._retry` tetapi **tidak pernah membacanya** → tidak ada batas retry sesudah refresh berhasil (single-flight hanya membatasi paralel); (b) **0 AbortSignal** di seluruh lapisan api dan `queryFn` tidak meneruskan `signal` → request tidak batal saat unmount/navigasi (relevan untuk anggaran 512 MB); (c) 15 `any` di batas kontrak (`accounting-types.ts` 13, `bookings.ts` 2); (d) 2 advisory invalidasi (`AiResultPanel` draft AI; `GuestBookingPage` ketersediaan publik — dampak rendah karena booking online produksi dimatikan).
- **Empat status:** implementasi aplikasi **tidak berubah**; verifikasi = analisis statis deterministik atas working tree (dist `BZ-Vpsd9eLX1`); deployment tidak relevan; tidak ada klaim runtime. Perilaku 401/refresh nyata, pembatalan request, dan dampak EF dari (b) **belum terbukti** (butuh UAT).
- **Catatan cakupan:** hasil dicatat di [CHECKLIST_AUDIT_TOTAL](CHECKLIST_AUDIT_TOTAL.md) (FE-054 ditandai selesai + baris tabel hasil); **cakupan audit total kini Frontend 4/67**; unit berikutnya **FE-055 config (K3)**.

## 2026-09-17 (lanjutan) — CLS mobile: 0,4235 → 0,0069 pada 375 px (implementasi + verifikasi lokal, belum deploy)

- **Lingkup:** permintaan owner "kerjakan" atas sisa item M12 "CLS mobile" (temuan audit homepage 15 Sep). **Frontend saja**; tanpa DB, tanpa server, tanpa deploy, tanpa dependency baru.
- **Diagnosis diukur lebih dulu (bukan menebak):** observer `layout-shift` dijalankan pada build yang **sedang tayang** (`3c0qJfgImyvj`) di 375×667 → CLS **0,4235**, 83 entri; dua entri terbesar (`0,2045` t=2185 ms dan `0,1928` t=3167 ms) berasal dari **`DIV.gx-hero-body` yang bertambah tinggi 518 → 543 → 568 px** saat teks hero selesai diketik (±25 px per baris; hero memusatkan isinya sehingga badge & CTA terdorong turun). Sumber kedua: badge harga yang hanya dirender setelah tarif tiba. Catatan M14 sebelumnya menyebut `gx-avail-section`/skeleton katalog — **itu bukan penyebab dominan** pada pengukuran ini.
- **Perbaikan (2 file):**
  - `frontend/src/pages/public/PublicGuestDashboardPage.tsx` — teks hero memakai salinan teks penuh `gx-hero-sub-reserve` + teks ketik `gx-hero-sub-live`; badge harga selalu dirender dalam `gx-hero-price-slot` (sebelum tarif tiba: placeholder `is-placeholder` tak terlihat dengan bentuk sama); teks state badge memakai `gx-hero-price-badge-sub-reserve` (varian terpanjang) + `...-live`.
  - `frontend/src/styles/11-public-pages.css` — blok **M22**: `display: grid` + `grid-area: 1 / 1` sehingga salinan ruang-terpesan dan teks nyata menempati sel yang sama (tinggi dikunci salinan, **tanpa angka piksel hardcoded**), `visibility: hidden` untuk salinan, `.gx-hero-price-slot` flex-center, `.is-placeholder` tak terlihat.
- **Temuan tambahan saat verifikasi (Axe):** build antara memunculkan **`aria-prohibited-attr` (serious)** pada `.gx-hero-sub` karena `<p aria-label>` — atribut itu sudah ada sebelumnya, tetapi restrukturisasi anak paragraf membuatnya terdeteksi. Karena gate proyek menuntut 0 serious/critical, `aria-label` dihapus dan diganti salinan `visually-hidden` (teks penuh tetap terbaca pembaca layar). Build final: **Axe 0 violations, 27 passes**.
- **Verifikasi lokal:** `npx tsc -b` (bagian build) lulus · `npm run build` kanonik lulus → **build `mx3kLXWOYkTg`**, PWA verification passed · harness iframe + kriteria ukur yang sama dengan sesi sebelumnya.
- **Hasil terukur (build final):** CLS **375 px 0,4235 → 0,0069 (−98%)** · 320 px **0,0240** · 414 px **0,0038** · 768 px **0,0170** · 1280 px **0,0071** (semua ≤ 0,024; ambang "baik" 0,1) · tinggi hero stabil antar sampel · **overflow horizontal 0 px** di semua viewport · target sentuh `gx-*` <44 px tetap **0** di 320–768 px (perbaikan tablet tidak rusak) · 1280 px tetap seperti baseline desktop (11 target `gx-*`, memang tidak diubah).
- **Batas bukti:** backend tidak dijalankan sehingga halaman berada pada state error (badge yang tampak adalah placeholder senyap) — angka absolut produksi bisa berbeda, yang dibandingkan adalah sebelum vs sesudah pada harness yang sama; sisa pergeseran beberapa piksel berasal dari pergantian webfont Inter/Cormorant dan **belum** ditangani; 2 target kecil artefak state error (`a` "Coba buka katalog langsung", `button` "Perbarui") bukan bagian dari 18 target audit 768 px.
- **Empat status:** implementasi frontend berubah (2 file) · verifikasi = build kanonik + pengukuran lokal (bukan UAT/produksi) · deployment **TIDAK** dijalankan · dampak runtime **belum ada** — produksi masih `3c0qJfgImyvj`. Bukti: `.audit-runtime/out/cls-mobile-verification.md` + tangkapan `.audit-runtime/out/cls-375-design-capture/`.

## 2026-09-17 (lanjutan) — AO-19: inventaris kualitas aset publik selesai (read-only)

- **Lingkup:** permintaan owner "kerjakan item yang tidak butuh keputusan saya" — sisa AO-19 (P2) yang masih terbuka setelah cue galeri: **inventaris kualitas aset publik**. **Read-only**: tidak ada aset yang diubah/di-re-encode, tidak ada dependency baru, tidak ada perubahan aplikasi, DB, atau server.
- **Perkakas:** baru `.audit-runtime/inventory-public-assets.mjs` — menelusuri `frontend/public`, membaca dimensi gambar langsung dari header berkas (PNG/WebP VP8/VP8L/VP8X/JPEG/GIF/ICO/SVG, tanpa library), menghitung bobot, memetakan pasangan `-thumb`, dan menghitung rujukan setiap nama berkas pada korpus teks repo (frontend/backend/scripts/docs, tanpa `node_modules`/`dist`/`archieve`). Keluaran: `.audit-runtime/out/public-assets-inventory.json` + ringkasan `.md`.
- **Temuan pokok:** 135 berkas gambar publik = **13,54 MB** (`room-images/` 119 berkas 13.567 KB, `icons/` 16 berkas 302 KB) · **0 berkas yatim** · **17 berkas >300 KB = 9.843 KB = 71% seluruh bobot** · set `kamar-j*` (7 berkas, 4.650 KB; `kamar-j.webp` 4096×4096 **1.021 KB**) + `kamar-m*` (8 berkas, 3.959 KB) = **8,6 MB = 62% bobot** sedangkan set `kamar-a*`+`kamar-b*` (17 berkas, 720×720) hanya 339 KB · dimensi berat: 13 berkas 4000×2250, 6 berkas 4096×4096, 3 berkas 3264×1840.
- **Akar sebab (bukan sekadar angka):** hanya **3 thumbnail** di repo (brosur depan/belakang + spanduk, hasil 15 Sep) dan **0 untuk 116 foto kamar**; jalur render `resolveKost48MarketingImageUrl()` (`frontend/src/data/kost48Assets.ts`) memetakan `Room.images` ke berkas lokal apa adanya, dipakai `RoomCard.tsx`, `PublicRoomDetailPage.tsx`, `BookingPage.tsx`, `GuestBookingRoomSummary.tsx`, `publicGuestShared.tsx`, dan `PublicGuestDashboardPage.tsx` → kartu ±272–360 px memuat berkas sampai 4096 px/1 MB.
- **Risiko pemeliharaan yang dicatat:** `ROOM_IMAGE_FILES` (frontend, 86 nama) vs `ROOM_MARKETING_IMAGE_FILES` (backend, 82 nama) — backend subset ketat (selisih 4 entri non-kamar); dua daftar manual sehingga penggantian nama berkas berpotensi 404 tanpa peringatan. **Tidak** diubah pada sesi ini (butuh keputusan desain).
- **Empat status:** implementasi aplikasi **tidak berubah** (hanya skrip audit di direktori scratch yang gitignored); verifikasi = perhitungan deterministik atas berkas repo; deployment **tidak**; dampak runtime tidak diklaim (tidak ada pengukuran bobot halaman baru — angka 1.134 → 248 KB tetap dari audit 15–16 Sep).
- **Terbuka (butuh owner):** sumber/hak pakai foto pengganti, keseragaman aspek (set J persegi vs M 16:9), dan izin optimasi (thumb 800 px untuk 22 foto berat + batas sisi panjang ±2400 px). Tanpa itu AO-19 tetap PARSIAL.

## 2026-09-17 — Target sentuh tablet 768 px: 18 → 0 (implementasi + verifikasi lokal, belum deploy)

- **Lingkup:** permintaan owner "kerjakan item yang tidak butuh keputusan saya" — item M12 "Tablet 768 px" (temuan audit homepage 15 Sep: 18 target <44 px pada 768 px karena blok CSS mobile berhenti di 767,98 px). **Frontend/CSS saja**; tanpa DB, tanpa server, tanpa deploy, tanpa dependency baru.
- **Perubahan (1 file):** `frontend/src/styles/11-public-pages.css` — blok baru **M21b** `@media (min-width: 768px) and (max-width: 1023.98px)` yang **hanya** memperluas target sentuh: `.gx-shortcut-link`, `.gx-footer-nav-group nav a`, `.gx-footer-version`, `.gx-brand`, `.gx-topbar .gx-btn-solid`, `.gx-topbar .gx-btn-ghost`, `.gx-btn.gx-btn-whatsapp`, `.gx-page [role="tab"]`. Tipografi, padding topbar, dan ukuran layout lain **tidak** diubah sehingga ≥1024 px tidak tersentuh. **Temuan tambahan saat mengerjakan:** `.gx-topbar .gx-btn-ghost` ("Masuk Portal") tidak pernah masuk aturan mobile (hanya `.gx-btn-solid`) dan baru disembunyikan di ≤420 px → celah nyata pada 421–767 px; kelas itu ditambahkan ke daftar `min-height: 44px` blok M21.
- **Verifikasi lokal:** `npx tsc -b` (bagian dari build) lulus · `npm run build` kanonik lulus (vite + stamp + verify PWA) → **build `cH5s-qv8bSB5`**, PWA verification passed · pengukuran harness iframe berukuran tetap dengan kriteria identik `.audit-runtime/out/measure.js` (elemen terlihat dengan `width < 44 || height < 44`), `frontend/dist` disajikan `.audit-runtime/serve-static.mjs`.
- **Hasil terukur (768×1024):** **18 → 0 dari 18 target audit** — `.gx-brand` 176×44, `.gx-btn-ghost` 134×44, `.gx-btn-solid` 124×44, footer version 44×44, 10 tautan footer 44 px, 3 tab `[role=tab]` 44 px; overflow horizontal 0 px; topbar tetap 66 px. **Batas blok dihormati:** 1023 px ikut diperbaiki, **1024/1280/1440 tidak berubah** (25 target desktop tetap 25), 320/375/414 tidak berubah. Aturan muncul sekali di CSS hasil build (`assets/index-qc8vb9dX.css`).
- **Batas bukti yang dicatat jujur:** (a) harness memakai iframe karena Playwright `spawn EPERM` di sandbox; (b) backend tidak dijalankan sehingga halaman tampil state error dan memunculkan 2 target kecil artefak (`a` "Coba buka katalog langsung" 203×18, `button.btn-primary.btn-sm` "Perbarui" 81×30) yang **tidak ada** di audit produksi — angka absolut karena itu tidak dibandingkan dengan produksi, yang dibandingkan adalah himpunan 18 elemen audit yang sama sebelum vs sesudah; (c) **1024–1279 px (iPad landscape) masih <44 px** dan sebaiknya ditutup dengan `(pointer: coarse)`/`(hover: none)`, belum bisa dibuktikan tanpa emulasi sentuh.
- **Empat status:** implementasi frontend berubah (1 file CSS) · verifikasi = build kanonik + pengukuran lokal (bukan UAT/produksi) · deployment **TIDAK** dijalankan · dampak runtime **belum ada** — produksi masih menyajikan build `3c0qJfgImyvj`. Bukti: `.audit-runtime/out/tablet-768-verification.md` + tangkapan `.audit-runtime/out/tablet-768-design-capture/`.
- **Catatan izin:** `npm run build` pertama gagal `spawn EPERM` (esbuild memuat `vite.config.ts`; batas sandbox yang sudah terdokumentasi di M20 §6). Build kanonik dijalankan ulang dengan izin lebih luas **sekali** agar artefak tetap kanonik (termasuk PWA), bukan build alternatif tanpa PWA.

## 2026-09-16 (sinkronisasi docs) — Checkbox Fase A direkonsiliasi dengan bukti produksi + §F.4 GO_LIVE yang usang diperbaiki

- **Lingkup:** permintaan owner "sinkronkan" atas temuan sesi ini: beberapa checkbox Fase A masih `[ ]` padahal langkahnya sudah dieksekusi 13 Sep, dan `GO_LIVE_CPANEL_CHECKLIST` §F.4 masih menyebut fondasi akuntansi kosong. **Docs-only:** tanpa build, tanpa DB, tanpa server, tanpa deploy.
- **Ditutup dengan bukti:** **A2** (fresh provision: DB baru `kost48s1_prod26`, DB uji lama dipertahankan, OWNER pertama, COA 38 akun, periode `OPEN`, 2 CashAccount — [GO_LIVE §E](GO_LIVE_CPANEL_CHECKLIST.md), [M20 §2–§3](M20_PRODUKSI_KOST48.md)) dan **A3** (env produksi: `NODE_ENV=production`, `JWT_SECRET` acak ≥32, CORS domain final, `NODE_OPTIONS` via env cPanel, gate KTP terbukti `ktpVerificationGateEnabled: true` pada smoke test).
- **Sengaja DIBIARKAN terbuka** meski dilaporkan owner sebagai "sudah jalan": **A1** (sisa versi/port PostgreSQL ke IDwebhost + kesiapan rotasi secret) dan **A6** (baru sebagian terbukti: login/rooms/401/deep link/cache/gate KTP; **belum ada bukti** trial balance `isBalanced=true`, recon mismatch 0, readiness tanpa blocker — readiness 75/100 `formalStatementReady=false`). Alasan: menutup checkbox tanpa bukti akan mengulang masalah yang justru sedang diperbaiki.
- **GO_LIVE_CPANEL_CHECKLIST:** header status → 16 Sep; **§B** diubah dari "menunggu owner" menjadi status keputusan (jalur A dijalankan, domain final `kost48surabaya.com`, EF-00 sebagian, secret ada tapi belum dirotasi, izin server diberikan); **§C** butir terverifikasi ditandai `[x]`, satu butir (`uploads/` dari server lama) tetap `[ ]`; **§F.4 diperbaiki** — periode `OPEN` + 2 CashAccount sudah dibuat 13 Sep, sisa sebenarnya = opening balance/zero-start.
- **Empat status:** implementasi aplikasi **tidak berubah**; verifikasi = konsistensi silang M12 ↔ GO_LIVE ↔ M20 + diff; deployment **tidak dijalankan**; dampak runtime tidak ada klaim baru (semua angka mengutip bukti 13–16 Sep).
- **Batas:** A6 hanya bisa ditutup setelah opening balance/transaksi pertama ada, jadi tetap bergantung data owner (M20 §11).

## 2026-09-16 WIB — DEPLOYMENT: perbaikan homepage mobile-first tayang di produksi

- **Lingkup:** lanjutan permintaan owner 15 Sep (audit homepage mobile-first + perbaikan Fase 1&2). Setelah owner mengaktifkan akses SSH, `client/` di-deploy ke produksi. **Tanpa restart, tanpa menyentuh backend/DB/`.env`/`uploads`.**
- **Akses:** SSH sempat tidak terjangkau 15 Sep (semua port SSH timeout; hanya 443 terbuka). Setelah akses dibuka owner, `api.kost48surabaya.com:4422` normal (server `batikan.idweb.host`, user `kost48s1`).
- **Tiga siklus deploy**, tiap siklus memakai `scripts/remote/deploy-client-safe.sh` (backup → ekstrak ke folder baru → verifikasi entry dari `index.html` → tukar folder utuh → uji HTTPS):
  1. **`LUqZkqdOXLq8`** — audit + perbaikan Fase 1&2. Arsip 14.991.773 B, SHA-256 `EEBED404…E51F`, checksum cocok di server.
  2. **`WhBmlAjYXZiB`** — label bar CTA membungkus dua baris di 320 px (emoji baris 1, teks baris 2) → label "Kabari saya" → "Kabari", `flex-shrink: 0` + `white-space: nowrap`, teks kuat diberi `ellipsis`.
  3. **`3c0qJfgImyvj` (aktif)** — nama brand ter-ellipsis "KOST48 Suraba…" karena `max-width: 128px` bawaan sedangkan teks butuh 129 px → `max-width: none` khusus mobile. SHA-256 arsip `ab49daaf…d6dfc`, entry `assets/index-Dchr5PEh.js`.
- **Verifikasi sesudah deploy (produksi, browser sungguhan):** `version.json` = `3c0qJfgImyvj`; `/`, `/rooms`, `/cek` → 200; audit 6 viewport (320/375/414/768/1280/1440) → **overflow horizontal 0 px, Axe 0 pelanggaran**; FAQ bocor `{formatRupiah(...)}` = **0**; target <44 px mobile **24/49 → 0/49**; brand utuh di 320/360/375; CTA topbar tidak terpotong lagi (320: +8 px → 0); bar CTA hanya muncul setelah hero lewat dan berbunyi "Semua kamar terisi · 💬 Kabari" → WhatsApp saat kamar penuh; bobot halaman **1.134 KB → 248 KB** (thumb galeri 78/87/70 KB); 0 error console. **Desktop 1280/1440 tidak berubah** (target <44 px tetap 25, tinggi halaman setara).
- **Aset klien di server:** 165 file (folder diganti utuh; sebelumnya 758 file karena chunk lama menumpuk).
- **Rollback tersedia:** `~/kost48-prod/client-old-20260916-053947` (build `G2vp1MdZhTRz`, kondisi pra-perbaikan), `-055824` (`LUqZkqdOXLq8`), `-061054` (`WhBmlAjYXZiB`); tarball `~/backups/client-20260916-*.tar.gz`. Perintah: `mv ~/kost48-prod/client-old-<ts> ~/kost48-prod/client`.
- **Empat status:** implementasi frontend berubah; verifikasi = build + audit lokal + **audit produksi sesudah deploy**; deployment **dijalankan** 16 Sep 2026 WIB (05:39–06:11); dampak terukur: bobot halaman turun 886 KB (−78%) dan tidak ada regresi aksesibilitas.
- **Catatan tanggal:** tindakan workstation bertanggal 15 Sep; server (WIB) mencatat 16 Sep 2026 — selisih zona/clock ±12 jam.
- **Terbuka:** CLS mobile 0,15–0,44 (pre-existing), tablet 768 px 18 target <44 px, halaman publik lain belum diaudit, serta pembersihan opsional `client-old-*` dan arsip staging lama (kuota file akun 43.629/75.000).

## 2026-09-15 — Audit homepage produksi (mobile-first) + perbaikan Fase 1 & 2

- **Lingkup:** permintaan owner — audit UI/UX halaman utama `https://kost48surabaya.com/` dengan prioritas mobile sambil memastikan desktop tetap aman. Audit produksi **read-only** (Playwright + axe-core WCAG 2.1 A/AA pada 320×568, 360×640, 375×667, 375×812, 414×896, 768, 1280, 1440), lalu perbaikan kode/CSS frontend, lalu verifikasi lokal.
- **Kondisi produksi saat diaudit:** 13 kamar, **semua `FULL`** (`/api/public/rooms`) — halaman utama sedang dalam state "tidak ada kamar kosong", sehingga yang diuji adalah empty-state, bukan state normal.
- **Temuan P1 (produksi, sebelum perbaikan):**
  1. **FAQ membocorkan kode** — tiga jawaban menampilkan `{formatRupiah(...)}` apa adanya di mobile **dan** desktop (`PublicGuestDashboardPage.tsx:322,324,326` memakai template literal tanpa `$`).
  2. **Bar CTA bawah (80 px) menutupi CTA hero** di layar pendek: 320×568 menutupi **kedua** CTA hero, 360×640 & 375×667 menutupi CTA sekunder. Saat semua kamar terisi, justru aksi WhatsApp yang tertutup.
  3. **Topbar mobile terpotong** — tombol "Cek Kamar" melewati tepi 8 px di 320 px; nama brand ter-ellipsis "KOST48 Suraba…" di 320 & 375.
  4. **Copy kontradiktif** — hero "Semua kamar sedang terisi" vs bar "0 kamar tersedia".
- **Temuan P2:** brosur 548 KB + 507 KB untuk tampilan 327×245 px (89% dari total 1,13 MB halaman) dan 6/6 `<img>` tanpa atribut `width`/`height`; 24 dari 49 target sentuh < 44 px; tombol scroll-top beririsan ±20 px dengan bar CTA; container toast (32 px) berada di belakang bar; 8 pertanyaan FAQ dirender `<h2>` (sejajar judul section); teks 10,2–12,8 px mendominasi; 10/10 `<section>` tanpa label.
- **Perbaikan (implementasi lokal):** interpolasi `${formatRupiah(...)}`; bar CTA hanya muncul setelah hero lewat dan berbunyi "Semua kamar terisi · Kabari saya" (tautan WhatsApp) saat `bookable = 0`; thumb WebP 800 px + atribut `width`/`height` untuk grid galeri (lightbox tetap memakai berkas penuh agar brosur tetap layak dibagikan); blok CSS mobile `M21` (target ≥44 px, teks terkecil ≥12–13 px, ruang bawah footer, toast & scroll-top naik di atas bar); FAQ `as="h3"`; 11 `<section>` diberi `aria-label`.
- **Verifikasi lokal (bukan deployment/UAT):** `tsc -b` + `npm run build` + verifikasi PWA lulus (build `LUqZkqdOXLq8`); audit build lokal (`dist` disajikan statis + fixture respons API produksi) di 7 viewport: **overflow horizontal 0 px**, **Axe 0 pelanggaran**, placeholder bocor **0**, target <44 px **24 → 0** di mobile, CTA hero tidak tertutup bar, bar = WhatsApp saat kamar penuh; bobot halaman **1.134 KB → 282 KB**; desktop 1280/1440 tidak berubah (bar `display:none`, jumlah target <44 px tetap 25, tinggi halaman setara).
- **Empat status:** implementasi frontend berubah (1 halaman, 1 komponen bersama, 1 CSS, 3 aset gambar baru); verifikasi = build + audit lokal ber-fixture; **deployment belum dijalankan** — produksi masih memuat build `G2vp1MdZhTRz`; dampak runtime di host belum terukur.
- **Percobaan deploy 15 Sep — TERHAMBAT (bukan kegagalan kode):** owner menyetujui deploy `client/`. Artefak siap: `deploy/client-update.tgz` **14.991.773 byte (14,3 MB)**, SHA-256 `EEBED40412FC5B48E5EA04C87D79B64D52031576E5ACB288E25F18899C5EE51F`, 311 entri, `index.html` di root arsip, entry `assets/index-Cbphl0Jc.js` terverifikasi ada di dalam arsip, `version.json` buildId `LUqZkqdOXLq8`. Namun **SSH produksi tidak dapat dijangkau** dari workstation: `api.kost48surabaya.com` (203.161.184.69) timeout pada port 4422, 22, 222, 2222, 2022, 2200, 8022, 65002, dan 21 — hanya 443 (HTTPS) yang terbuka, sedangkan egress SSH umum tidak diblokir (github.com:22 tembus). Dugaan: firewall/IP allowlist host atau port SSH berubah. IP publik workstation saat percobaan: `182.8.68.57`. **Belum ada byte yang diunggah; produksi tidak berubah.**
- **Perkakas baru:** `scripts/remote/deploy-client-safe.sh` — backup `client/`, ekstrak ke `client-new`, verifikasi entry dari `index.html`, tukar folder utuh (`client-old-<ts>` disimpan untuk rollback), lalu uji HTTPS; menghindari masalah chunk lama tertinggal (M20 §6.1).
- **Dua temuan operasional saat percobaan deploy:** (a) HTTPS produksi kini di balik **challenge anti-bot** — `curl`/`fetch` polos dari luar menerima halaman "One moment, please…", bukan aset; verifikasi dari luar harus lewat browser (M20 §10.10). (b) **SSH tidak terjangkau** dari IP workstation ini (M20 §10.11). Verifikasi independen: produksi masih menyajikan `version.json` buildId **`G2vp1MdZhTRz`** dengan entry `assets/index-PVaGf4YB.js` (dicek lewat browser) → **tidak ada perubahan yang tayang**.
- **Terbuka:** deploy menunggu akses SSH (owner: cek firewall/IP allowlist atau port SSH di cPanel/support) **atau** unggah manual `deploy/client-update.tgz` lewat File Manager cPanel; **CLS mobile 0,15–0,44 bersifat pre-existing** dengan sumber teridentifikasi (hero price badge & CTA saat data ketersediaan tiba, lalu section ketersediaan) dan belum diperbaiki; tablet 768 px masih 18 target <44 px karena ambang CSS mobile berhenti di 767,98 px.

## 2026-09-13 (malam, sesi AO-20) — Implementasi sisa AO-20: beda state KPI (stale/silent-zero/no-data) + label aksi sinyal

- **Lingkup:** permintaan owner "kerjakan yang bisa kamu buat saja" — selesa sisa [AO-20](M14_AUDIT_UI_UX.md) lokal (frontend only; tanpa UAT/server/DB/mutasi).
- **Alasan:** M12 menandai AO-20 [ ] PARSIAL (sisa pembedaan state KPI + label aksi); bagian selesai tidak diulang.
- **Diubah:** baru `frontend/src/pages/dashboard/ownerDashboardState.ts` (stale 2,5× interval; silent zero Pendapatan; periode tanpa aktivitas terbukti dari agregat — tanpa ubah kontrak API); `OwnerDashboardPage.tsx` (state/stateNote KPI + banner info no-data + catatan silent zero + aria-label sinyal + tone amber saat stale); `12-owner.css` (`.owner-kpi-state`, `.owner-kpi-state-stale`, `.owner-refresh-stale`); baru `frontend/src/test/unit/ownerDashboardState.test.ts` (14 test).
- **Empat status:** implementasi lokal dilakukan · verifikasi lokal `npx tsc -b --force` exit 0 · `npx vitest run` 31 file/147 PASS · `npm run build` exit 0 (PWA `_7OTEvBbqfHK`) · deployment TIDAK · dampak terukur UNKNOWN (UAT OWNER 1440 px BLOCKED).
- **Catatan jujur:** kendala PowerShell (index negatif menghapus `}`, Where-Object memfilter baris kosong) → diperbaiki regenerasi dari blob HEAD; file UTF-8 tanpa BOM (mojibake log = cp1252).
- **Terbuka:** UAT AO-20 + AO-14, AO-13/21/23, EF-02, sisa go-live (M20 §11).


## 2026-09-13 (sinkronisasi docs) — Antrean M12, M19 §9, dan panduan diselaraskan dengan produksi live

- **Lingkup:** permintaan owner — verifikasi plan antrean yang mengutip M12 lalu sinkronkan dokumen. **Docs-only:** tanpa menjalankan server/build/DB, tanpa perubahan kode, tanpa deploy ulang.
- **Alasan:** [Antrean Prioritas Aktif](M12_CHECKLIST_CHANGELOG.md#antrean-prioritas-aktif) masih bertanggal 2026-09-08 dan memuat status pra-deploy, sehingga bertentangan dengan fakta 13 Sep yang sudah tercatat di file yang sama — baris #2 masih "Gate Axe masih gagal" dan menyisakan AO-08/AO-09/T-01, padahal ketiganya selesai 12 Sep.
- **Yang diperbaiki:**
  - M12: antrean → 7 baris bertanggal 2026-09-13 dengan sisa go-live owner di urutan pertama; blok Status Kerja Aktif (Fase EF/AO/A/M + baris Produksi: sisa "periode OPEN + CashAccount" dihapus karena keduanya sudah dibuat 13 Sep); baris riwayat Fase A yang masih menyebut "menunggu server/domain/env owner"; AO-03 (izin akun bukan lagi penghambat); AO-09 (empat `<h1>` ganda selesai di `9c211a0`); EF-00/02/04/06/07/08 diberi bukti 13 Sep **tanpa menutup checkbox**; versi aktif → 2026-09-13.
  - M19: header + tabel lapisan bukti + §9.1, §9.2, §9.3, §9.4 disinkronkan dari [M20 §2–§10](M20_PRODUKSI_KOST48.md) dan M13 13 Sep; nilai yang benar-benar belum diukur tetap **UNKNOWN** (fault, interval/peak, CPU/IO 13 Sep, flag AI/VAPID/telemetri).
  - `AGENTS.md`/`CLAUDE.md`: M20 masuk daftar sumber kebenaran, seri dokumen → **M00–M20**, status EF-00/EF-02/Fase A diperbarui, tanggal arah aktif → 13 Sep 2026.
  - [AUDIT_UIUX_TOTAL_2026-09-12 §3](AUDIT_UIUX_TOTAL_2026-09-12.md): catatan bahwa tabel rekonsiliasi itu snapshot sesi pertama dan sudah usang untuk AO-06/08/09 + T-06/T-08.
- **Bukti yang dipakai (tanpa pengukuran baru):** M13 2026-09-13 (identitas deployment, checksum paket, smoke test), M13 2026-09-12 (isi paket `cbca06f`), M20 §1–§12, commit `9c211a0` (`PageHeader as`, `SimpleCrudPage as="h2"`, print `/staff-report` `aria-hidden`) dan `4e67c13`.
- **Empat status:** implementasi aplikasi **tidak berubah**; verifikasi = konsistensi antar dokumen, tautan, dan diff (tanpa build); deployment **tidak dijalankan** pada sesi ini; tidak ada klaim dampak runtime baru — seluruh angka mengutip bukti bertanggal 12–13 Sep.
- **Tidak diubah:** checkbox `[ ]` Fase AO/EF tetap terbuka; angka snapshot 7 Sep dipertahankan dengan label sumber; tidak ada klaim bahwa 512 MB cukup.
- **Terbuka:** sisa AO-13/14 (viewport 320 px + rute ber-fixture), pengukuran EF-02 (interval/peak/fault), verifikasi runtime EF-01/03/05 pada artefak server, dan onboarding owner (M20 §11).

## 2026-09-13 (lanjutan) — Onboarding 13 penghuni + halaman operasional `/cek` & `/okupansi` + dokumentasi M20

- **Lingkup:** lanjutan sesi deployment hari yang sama atas permintaan owner: memasukkan data 13 penghuni nyata dari spreadsheet owner, lalu membuat dua halaman operasional (`/cek`, `/okupansi`), lalu menuliskan seluruh pengetahuan sesi ke dokumen (`M20`). Owner menghentikan sementara bagian hunian/tagihan untuk menyiapkan data.
- **Data penghuni yang dimasukkan (13 tenant + 12 akun portal):** memakai skrip yang sudah ada di repo, `backend/scripts/seed-prod-tenants.js` (idempoten via NIK), dijalankan terhadap API produksi. Nama/NIK/HP berasal dari data kanonik repo, **cocok dengan spreadsheet owner**. GUNAWAN (F1) tanpa akun portal (akan keluar). Password awal akun portal dibuat di server, disimpan pada berkas mode 600, **tidak pernah masuk chat**. Verifikasi DB: 13 `Tenant`, 12 `User` role TENANT, total 13 `User` (1 OWNER + 12).
- **Temuan penting tarif:** spreadsheet owner mencocoki **tarif kontrak** kanonik di `seed-prod.js` (kolom `tarif`), bukan tarif katalog `Room.monthlyRateRupiah`. Sebelas dari tiga belas kamar berbeda (mis. B 1,7 jt katalog vs 1,5 jt disepakati; M 1,4 jt vs 1,2 jt). Sesuai M18, tarif katalog **tidak diubah**; angka sewa disepakati dipakai lewat `Stay.agreedRentAmountRupiah` saat check-in (`stays.service.js`: `dto.agreedRentAmountRupiah ?? calculateRentByPricingTerm`). Tabel pembanding dicatat di [M20 §12](M20_PRODUKSI_KOST48.md).
- **Fondasi akuntansi dilengkapi:** `POST /api/accounting/periods` membuat periode **2026-09 OPEN**; dua `CashAccount` dibuat (Kas Tunai → COA 1000, default; Bank Utama → COA 1010), saldo awal 0. Kesiapan akuntansi naik **13 → 75**, gate OK: `coa.seeded`, `coa.coverage`, `cashAccount.exists`, `period.exists`, `postingPeriod.open`, `journal.balanced`; tersisa `openingBalance.posted` (butuh angka saldo nyata) dan `journal.exists` (terisi saat transaksi pertama).
- **Halaman baru:** `/cek` — checklist go-live statis (6 bagian, ringkasan status, tanpa API dan tanpa PII) dan `/okupansi` — ubah ketersediaan kamar dari HP: satu daftar 13 kamar, tiga tombol besar per kamar (Kosong/Terisi/Disembunyikan), simpan sekali tekan, mengambil status terbaru sebelum menyimpan agar tidak menimpa perubahan lain, plus tombol Muat ulang dan Kunci. Keduanya memakai kontrak yang sudah ada (`GET`/`PUT /api/public/availability/setup` + header `X-Availability-Pin`); `/update-kamar` (wizard lengkap) tetap tersedia.
- **Verifikasi halaman:** tiga kali build frontend hari itu (`MhA2UHkaDbmU` → `Mqb2SpEkSw55` → **`G2vp1MdZhTRz`** yang tersaji sekarang; 162 chunk) → `client/` dikirim ke server (backup `client-*` sebelumnya) → `/cek` dan `/okupansi` HTTP 200, chunk `CekPage-*`/`OkupansiPage-*` tersaji; render diperiksa lewat browser (judul, ringkasan 11 selesai/2 sebagian/10 belum/4 keputusan, 13 kartu kamar); uji simpan: kamar M `FULL → AVAILABLE` (200) dan **katalog publik ikut berubah**, lalu dikembalikan ke `FULL`; PIN salah → 403. **Tidak ada restart** karena hanya `client/` yang berubah.
- **Kesalahan & koreksi yang dicatat jujur:** pembersihan aset "usang" pertama salah menghapus chunk yang masih dirujuk entry (grep gagal karena beberapa nama file sekaligus), membuat halaman berisiko gagal memuat; `client/` dipulihkan dari backup terakhir `client-*`, dan pembersihan berikutnya dibuat konservatif (hanya menghapus nama yang benar-benar tidak dirujuk entry). Enam chunk lama (~32 KB) sengaja dibiarkan tak terpakai. Prosedur yang benar (ekstrak hanya `client`, verifikasi dari file entry, bukan dari `index.html`) kini didokumentasikan di [M20 §6.1](M20_PRODUKSI_KOST48.md).
- **Dokumentasi:** dibuat **[M20 — Produksi & Operasional Harian](M20_PRODUKSI_KOST48.md)** berisi ringkasan cepat, identitas deployment, urutan prioritas env, daftar isi produksi, variabel environment, operasional harian, prosedur redeploy (termasuk deploy `client/` saja), batasan skema/migrasi, AutoOps & cron, backup/rollback, daftar jebakan terbukti, sisa pekerjaan owner berurutan, data owner yang belum dimasukkan, dan daftar perkakas sesi. M20 didaftarkan di indeks M01 §2 dan M12 §Peta Rujukan.
- **Empat status:** implementasi aplikasi berubah (2 halaman baru + route/routeTitles, koreksi teks checklist) — **bukan** perubahan domain bisnis; verifikasi = build + deployment nyata + uji HTTP/render/simpan pada produksi; deployment **dijalankan** 13 Sep 2026; dampak runtime terukur: build ID PWA berganti (`B70lrG6Auual` → `MhA2UHkaDbmU` → `Mqb2SpEkSw55`), katalog publik merespons perubahan status kamar. **Temuan tambahan:** proses Passenger **menumpuk** (2 proses hidup bersamaan, masing-masing RSS ±170–200 MB) — bukti awal untuk pertanyaan overlap restart di M19 §9.2.
- **Terbuka:** hunian/stay, verifikasi KTP, meter listrik awal, opening balance, tagihan pertama, cron AutoOps, rotasi secret + PIN, ganti password sementara, pembersihan aplikasi lama, dan pertanyaan versi PostgreSQL ke hosting.

## 2026-09-13 — DEPLOYMENT PRODUKSI: paket 12 Sep live di cPanel (DB baru `kost48s1_prod26`)

- **Lingkup:** permintaan owner "bantu deploy ke server shared hosting", dilanjutkan izin eksplisit untuk mengeksekusi (termasuk restart aplikasi) dan keputusan owner bahwa 13 akun di DB produksi lama masih data uji sehingga boleh digantikan database baru yang bersih. Lembar kerja + bukti: [GO_LIVE_CPANEL_CHECKLIST](GO_LIVE_CPANEL_CHECKLIST.md) §E–§G.
- **Identitas deployment (sebagian menutup EF-00 §9.1 M19):** SSH `api.kost48surabaya.com:4422` user `kost48s1` (server `batikan.idweb.host`, IDwebhost); application root `/home/kost48s1/kost48-prod`; Passenger startup `dist/main.js`; Node `22.23.2`; domain `https://kost48surabaya.com`; PostgreSQL **9.6.22** (EOL, dicatat sebagai risiko); DB produksi baru `kost48s1_prod26`; DB lama `kost48s1_kost48_prod` dipertahankan utuh.
- **Eksekusi:** upload paket 12 Sep (40,8 MB, checksum SHA-256 **cocok** di server) → backup `pg_dump` (31 KB) + arsip app lama (32 MB) + `.htaccess` + `node-selector.json` → bootstrap schema DB baru (62 tabel) + seed 13 kamar → extract paket ke app root tanpa menimpa `.env`/`uploads`/`tmp` → arahkan env app ke DB baru → restart → seed OWNER pertama → COA 38 akun.
- **Tiga temuan operasional (terbukti, bukan asumsi):**
  1. **Urutan prioritas env: env cPanel Node.js App (`~/.cl.selector/node-selector.json`) > `.htaccess` > `.env`.** Mengubah `.env` dan `.htaccess` **tidak cukup**; DB baru hanya aktif setelah env var di konfigurasi app cPanel diubah. Dibuktikan dengan penanda nama kamar di kedua DB + pembacaan `/proc/<pid>/environ` proses berjalan.
  2. **`uapi NodeJS` tidak terpasang di server ini** (`Cpanel/API/NodeJS.pm` hilang) → tidak ada API resmi untuk env var app.
  3. **Database yang dibuat lewat phpPgAdmin tidak terdaftar di cPanel** → tidak mendapat aturan `pg_hba`, login selalu gagal `no pg_hba.conf entry`. Harus dibuat lewat cPanel → PostgreSQL Databases, lalu user di-assign.
- **Bukti live (HTTPS, 13 Sep):** `/version.json` = `B70lrG6Auual` (naik dari `1BavS58Sb96-`) · `/` 200 · `/login` & `/portal/stay` deep link 200 SPA · aset hilang 404 · `Cache-Control` `no-store` pada `version.json`/`sw.js`/`index.html` · `/api/public/rooms` 200 dengan **13 kamar** · `/api/stays` tanpa token 401 · `/api/tidak-ada` 404 · login OWNER sukses · `/api/auth/me`, `/api/stays`, `/api/tenants`, `/api/invoices` 200 · gate KTP `ktpVerificationGateEnabled: true` · proses Passenger **1 instance** (sebelumnya 2).
- **Perubahan kode di repo:** `scripts/make-deploy.mjs` (keluarkan `sql/seed.sql` + `seed_ORIGINAL.sql` dari paket, verifikasi arsip) + `scripts/ssh-kost48*.ps1` dan `scripts/remote/*.sh` (perkakas deploy/verifikasi, tanpa kredensial).
- **Terbuka untuk owner:** rotasi `JWT_SECRET` + password DB dan hapus secret dari `public_html/.htaccess` (nilai terekspos di sesi ini), ganti PIN `123456`, ganti password OWNER sementara, lengkapi periode OPEN + CashAccount + opening balance (readiness `formalStatementReady=false`), cron AutoOps, onboarding penghuni, pembersihan direktori/arsip lama, dan pertanyaan versi PostgreSQL ke host.
- **Empat status:** implementasi aplikasi tidak diubah; **verifikasi = deployment nyata + smoke test produksi lewat HTTPS**; deployment **SUDAH dijalankan** 13 Sep 2026; dampak runtime terukur pada host (1 instance Passenger, RSS ≈ 200 MB, respons `/api/public/rooms` ~0,3 s) — pengukuran PMEM/fault EF-02 masih terbuka.

## 2026-09-12 (malam, deploy) — Paket deploy shared hosting dibangun ulang + verifikasi lokal

- **Lingkup:** permintaan owner "siapkan untuk deploy ke shared hosting". Target dikonfirmasi owner: cPanel **Node.js App (Passenger) + PostgreSQL + SSH**; database produksi **sudah ada dan berisi data uji/coba-coba**; lingkup sesi disetujui = bangun ulang paket + uji boot lokal + checklist langkah server (tanpa izin deploy). Lembar kerja: [GO_LIVE_CPANEL_CHECKLIST.md](GO_LIVE_CPANEL_CHECKLIST.md).
- **Alasan paket dibangun ulang:** `deploy/` dan `kost48-deploy-bundled.tgz` berasal dari **6 Sep 2026**, sedangkan source sudah memuat pekerjaan 12 Sep (a11y 327 `controlId` di 58 file, performa `/portal/stay` 23→17 request, normalisasi token radius, struktur judul). Paket lama akan men-deploy kode yang tidak lagi sama dengan source.
- **Hasil build (commit `cbca06f`):** `kost48-deploy-bundled.tgz` **42.749.795 byte (40,8 MB), 10.500 entri**, SHA-256 `BC9176F2897B6FB444FD9A0156C90944D0D289EF8E66932217B2944DB69EEDFD`; folder `deploy/` 9.636 file / 93,4 MB; versi aplikasi tetap 1.3.0; build PWA `B70lrG6Auual` (159 chunk, initial JS 145 KiB gzip, CSS 131 KiB gzip, verifikasi PWA lulus); frontend dibangun dengan `VITE_API_BASE_URL=/api` (combined 1 origin). Paket memuat 46 modul backend, 24 migration, 153 paket runtime, 162 aset klien, dan telemetri EF-01 (`dist/common/telemetry/*`, default OFF).
- **Temuan yang diperbaiki (kebocoran data di paket):** arsip lama **memuat `sql/seed.sql` (854 KB) dan `sql/seed_ORIGINAL.sql` (618 KB)** yang berisi data historis/PII dan dilarang M08 di produksi. `scripts/make-deploy.mjs` kini menghapus keduanya saat packaging **dan** menggagalkan arsip bila keduanya muncul. README-DEPLOY di paket juga diperbaiki: menyebut tiga migration yang dipasang bootstrap (termasuk `20260818000000_settings_tuya_vapid`) dan menegaskan `seed.sql` tidak ikut paket. **Arsip final terverifikasi tidak memuat `sql/seed.sql`, `seed_ORIGINAL.sql`, `.env`, atau `uploads/`.**
- **Verifikasi lokal pada DB uji sementara terpisah** (`kost48_pkg_verify`, dibuat lalu dihapus; DB UAT `kost48_v3_pro` dan DB produksi **tidak disentuh**):
  - `sql/bootstrap-production-schema.sql` pada DB kosong → **63 tabel** di schema `public`; `sql/seed-production-rooms.sql` → **13 kamar** + 13 `PublicRoomAvailability`.
  - Boot `node dist/main.js` dari `deploy/` → **listen 5,8 s**, RSS ≈ 155 MB (lokal, bukan angka host).
  - `GET /` 200 `text/html` `no-store` · `GET /api/public/rooms` 200 JSON · `GET /api/stays` tanpa token 401 · `GET /version.json` 200 (`buildId` cocok) · `GET /login` 200 HTML SPA · `GET /api/tidak-ada` 404 JSON · `GET /assets/hilang.js` 404.
  - `node scripts/seed-owner.js` → OWNER pertama dibuat; `POST /api/auth/login` → 201 + token; `GET /api/auth/me`, `/api/accounting/readiness`, `/api/stays` dengan Bearer → 200.
  - `POST /api/auto-ops/cron` token salah → **403**, token benar → **200**, `GET` pada endpoint itu → 404.
- **Belum dibuktikan / tetap terbuka:** ini **bukan deployment, bukan UAT host, bukan pengukuran 512 MB**. Jalur DB produksi (fresh bootstrap vs patch DB lama berisi data uji) belum diputus owner; domain, secret produksi baru, dan identitas deployment EF-00 (§9 M19) belum tersedia. Bootstrap membuat tabel `_prisma_migrations` **tanpa entri ledger (0 baris)** sehingga `migrate deploy` berikutnya tidak sinkron — perlu keputusan proses patch sebelum release skema berikutnya.
- **Verifikasi:** build produksi frontend + backend dari source (`npm run make-deploy`; esbuild/vite memerlukan eskalasi izin sandbox `spawn EPERM` seperti sesi 12 Sep), verifikasi isi arsip oleh generator, bootstrap + seed + boot + smoke endpoint + seed OWNER pada DB uji sementara, lalu pembersihan DB uji. Nol deployment, nol push, nol commit, nol mutasi DB UAT/produksi.
- **Empat status:** implementasi aplikasi tidak diubah (hanya `scripts/make-deploy.mjs` + docs); verifikasi = build + uji paket lokal pada DB uji terpisah; **deployment N/A**; dampak runtime terukur hanya pada instance lokal.

## 2026-09-12 (malam, lanjutan) — T-08: normalisasi radius (27 → 12 nilai) + struktur judul

- **Lingkup:** menutup sisa temuan T-08 (drift sistem visual) dan temuan `<h1>` ganda. Laporan: [AUDIT_UIUX_TOTAL_2026-09-12 §0c](AUDIT_UIUX_TOTAL_2026-09-12.md#0c-hasil-perbaikan-t-08--normalisasi-token--struktur-judul).
- **Radius:** 27 → **12 nilai unik**; 107 deklarasi di 14 file disesuaikan ke level terdekat. Skala resmi ditetapkan **dari frekuensi pemakaian nyata** (4/6/8/10/12/14/16/18/20/24/28/999), bukan dikarang, sehingga level dominan (14px 81×, 16px 95×, 18px 115×) tidak berubah. Pergeseran terbesar hanya 22→20 (37×); sisanya 1–2px, dengan satu kasus 34→28. Skala didokumentasikan di `00-tokens.css`.
- **Breakpoint sengaja TIDAK diubah:** 31 nilai `max-width` unik, tetapi yang tampak berdekatan adalah keluarga batas Bootstrap yang disengaja (`575.98/576`, `767.98/768`, `991.98/992`, `1199.98/1200`, dipadukan `min-width: 769/992/1200`). Menggeser titik putus per-fitur berisiko regresi tata letak nyata tanpa manfaat terukur → dicatat sebagai hutang teknis yang disengaja.
- **`<h1>` ganda diselesaikan:** (a) `/inventory/gudang|barang-kamar|mutasi` punya dua `<h1>` karena `InventoryShellPage` dan `SimpleCrudPage` masing-masing merender `PageHeader` → `PageHeader` kini menerima `as?: 'h1'|'h2'` dan `SimpleCrudPage` memakai `as="h2"` di dalam shell (`hideAreaMenu`); tidak ada perubahan visual karena CSS sudah menggayai `.page-header h1` dan `.page-header h2` identik. (b) `/staff-report` memiliki `<h1>` di dalam blok `.print-only` yang tersembunyi secara visual tetapi tetap ada di accessibility tree → blok print ditandai `aria-hidden="true"`.
- **Verifikasi:** `npx tsc -b` **exit 0** · `npx vitest run` **133/133 PASS (30 file)** · `npm run build` **exit 0** (verifikasi PWA lulus) · crawl Axe ulang OWNER 10 rute @1440 + STAFF/publik 9 rute @375: **0 pelanggaran, 0 overflow, `h1Count = 1`**. Catatan alat: Vitest/Vite memerlukan proses anak yang diblokir sandbox (`spawn EPERM`) → dijalankan dengan eskalasi izin yang disetujui owner.
- **Batas bukti yang dinyatakan:** perubahan radius bersifat visual dan tidak dapat dibuktikan oleh crawl Axe/DOM. Jaminan yang tersedia: pergeseran ≤2px pada 106 dari 107 deklarasi, jumlah deklarasi & `var()` tidak berubah (dijaga pengaman codemod), typecheck + 133 unit test + build lulus. **Pemeriksaan visual manusia belum dilakukan.**
- **Empat status:** implementasi aplikasi diubah (14 stylesheet, `PageHeader`, `SimpleCrudPage`, halaman laporan staff); verifikasi = statis + typecheck + unit test + build + crawl Axe lokal; deployment N/A; dampak runtime terukur hanya pada instance UAT lokal.

## 2026-09-12 (malam) — T-06: performa render awal `/portal/stay` (23 → 17 request, 0 duplikat)

- **Lingkup:** menutup temuan T-06 dari audit UI/UX hari yang sama. Laporan: [AUDIT_UIUX_TOTAL_2026-09-12 §0b](AUDIT_UIUX_TOTAL_2026-09-12.md#0b-hasil-perbaikan-t-06--performa-render-awal-portalstay).
- **Akar masalah:** bukan kecepatan server (API 100–750 ms), melainkan **lima tempat menarik data yang sama dengan query key berbeda** sehingga TanStack Query tidak dapat melakukan deduplikasi. Dibuat sumber tunggal key baru `frontend/src/api/portalQueryKeys.ts`; `/stays/me/current` (3×), `/invoices/my` (2×), `/payment-submissions/my` (2×), `/tenant/bookings/my` (2× dengan limit 20 vs 50), dan `/announcements/active` (2×) kini berbagi cache.
- **Hasil terukur (build produksi, 3 pengukuran berurutan, stabil):** request API 23 → **17**, endpoint unik 16 → **17 (0 duplikat)**, konten bermakna 1500 → **900 ms**, halaman lengkap 1800 → **1200–1500 ms**, elemen skeleton maksimum 84 → **46**, request terlama 928 → **≤ 745 ms**.
- **Bug laten ditemukan sekaligus diperbaiki:** `getMeterWindow` (`myStayShared.tsx`) menghasilkan rentang tanggal **terbalik** (`from=2026-08-13&to=2026-07-28`) untuk stay yang akhir kontraknya di masa depan, karena batas atas tidak dijepit ke hari ini sementara batas bawah dijepit ke hari ini−30. Kini batas atas = `min(plannedCheckOutDate, hari ini)` dan rentang tidak mungkin terbalik. **Dampak di UAT belum terbukti** (belum ada catatan meter: `/api/meter-readings` = 0 item) sehingga dicatat sebagai bug laten.
- **Perbaikan pendukung:** `PageLoadingSkeleton` dirampingkan dari 47 blok menjadi 20 blok dengan `min-height: 60vh` (tidak ada layout shift) dan shimmer dimatikan saat `prefers-reduced-motion`; `/portal/stay` kini memiliki `<h1>` pada cabang stay aktif (sebelumnya judul hanya ada di cabang non-aktif); overflow 3 px pada 375 px diperbaiki di `.tenant-dossier-tarif-row > strong` (`flex: 0 0 auto` → `flex: 0 1 auto` + `min-width: 0` + pemutus kata).
- **Verifikasi:** `npx tsc -b` **exit 0** · `npx vitest run` **133/133 PASS (30 file)** · `npm run build` **exit 0** (verifikasi PWA lulus) · crawl Axe ulang 8 rute TENANT @375 px: **0 pelanggaran, 0 overflow, `<h1>` ada di semua rute**. Catatan alat: Vitest dan Vite memerlukan proses anak yang diblokir sandbox (`spawn EPERM`), sehingga dijalankan dengan eskalasi izin yang disetujui owner.
- **Empat status:** implementasi aplikasi diubah (hook, komponen, CSS, key query bersama); verifikasi = typecheck + unit test + build + pengukuran performa & crawl Axe lokal (bukan UAT resmi/host); deployment N/A; dampak runtime terukur hanya pada instance UAT lokal.

## 2026-09-12 (sore) — Perbaikan UI/UX: gate Axe critical/serious 118 node → 0

- **Lingkup:** perbaikan temuan P1/P2 dari audit pagi hari yang sama (T-01…T-05, T-07). Laporan + rincian akar masalah: [AUDIT_UIUX_TOTAL_2026-09-12 §0](AUDIT_UIUX_TOTAL_2026-09-12.md#0-hasil-perbaikan--12-september-2026-sore).
- **Hasil terverifikasi (crawl Axe ulang pada build baru):** **0 node critical/serious** pada OWNER 35 rute @1440, STAFF 7 rute @1440 & @375, TENANT aktif 6 rute @375, publik 8 rute @375. Overflow horizontal **0 px** (sebelumnya +176 px di `/tickets` STAFF), `nested-interactive` **0** (sebelumnya 10), `/reset-password` kini `<main>`+`<h1>`.
- **Perbaikan kode:** `controlId` ditambahkan pada **327 `<Form.Group>` di 58 file** lewat codemod berpengaman (menyelesaikan asosiasi `Form.Label`↔`Form.Control` secara sistemik, bukan per halaman); `PasswordInput` meneruskan `controlId` ke input di dalam `InputGroup`; `<Form.Check>` tanpa `type` diberi `aria-label` (label tidak dirender oleh react-bootstrap dalam bentuk itu); `SearchableSelect` menerima `ariaLabel`; filter tanpa label visual di 10+ halaman diberi `aria-label`/`aria-labelledby`.
- **Cacat aksesibilitas nyata yang baru terungkap:** `06-tenant.css:13–30` memaksa semua `h1–h6` dan `strong` berwarna gelap dengan `!important`, sehingga judul di dalam kartu gelap menjadi **1,09:1** (#172033 di atas #0f172a) — praktis tidak terbaca. Diperbaiki dengan pengecualian untuk permukaan gelap; sekaligus memperbaiki teks `strong` yang dipaksa putih di dalam banner terang (1,02:1).
- **Kontras:** `.text-warning/.text-info/.text-danger` Bootstrap (1,47–3,39:1) diganti varian `-emphasis` (7,2–10,4:1); `--green-600`→`--green-700` (3,30→5,02); `.report-matrix-row span` tidak lagi menimpa `.badge` (1,05:1 → lulus via `text-bg-*`); `#64748b`→`--gray-600` pada kartu biru muda (4,28→6,8); `--gx-coral` #bd6049→#9a3412 (4,04→6,5); `.btn-outline-secondary` (4,47→7,0); `.btn-outline-danger` di dalam alert (3,39→5,3); `.progress-bar` diberi nama via `role="progressbar"`.
- **Overflow mobile:** akar sebenarnya bukan baris tab melainkan rantai grid — `.staff-empty-box` (grid kolom `auto`) mengambil lebar min-content anaknya (483 px) dan mendorong `.staff-workspace-main` ke 544 px pada viewport 375 px. Diperbaiki dengan `min-width: 0` pada rantai wadah + `overflow-wrap: anywhere`.
- **Kartu interaktif bersarang:** `{...attributes}` dari `useDraggable` (dnd-kit) memasang `role="button"` + `tabindex` pada `<article>` yang memuat tombol aksi; atribut dipindah ke handle seret tanpa mengubah fungsi seret.
- **Verifikasi:** `npx tsc -b` **exit 0** · `npm run build` **exit 0** dengan verifikasi PWA lulus (`build=o3PlFq6-mqzy`, 159 chunk) · crawl Axe ulang seperti di atas. Catatan alat: Vite/esbuild memerlukan proses anak yang diblokir sandbox sesi ini (`spawn EPERM`), sehingga build dijalankan dengan eskalasi izin yang disetujui owner — bukan kegagalan konfigurasi proyek.
- **Belum dikerjakan (bukan kelalaian, dicatat eksplisit):** T-06 performa render awal `/portal/stay` (≈6,3 s) dan T-08 normalisasi token (27 radius, 27 breakpoint) — keduanya berisiko regresi bila digabung dengan perbaikan aksesibilitas; `<h1>` ganda di 4 halaman inventaris/laporan (P3, tanpa pelanggaran Axe).
- **Empat status:** implementasi aplikasi diubah (58 file `controlId`, komponen aksesibilitas, CSS); verifikasi = typecheck + build + crawl Axe lokal (bukan UAT resmi/host); deployment N/A; dampak runtime terukur pada instance UAT lokal saja.

## 2026-09-12 — Audit UI/UX Total (dinamis + statis) — 180 pemeriksaan halaman, 6 role, 2 viewport

- **Lingkup & permintaan owner:** audit UI/UX menyeluruh, sekaligus menutup gap `AO-14` (dua state TENANT, publik, viewport, Axe) yang belum pernah dijalankan sejak 30 Juli. Izin owner diberikan untuk menyalakan PostgreSQL UAT 5433 `kost48_v3_pro`, backend `:3000`, dan frontend lokal; deployment/produksi tidak disentuh. Laporan: [AUDIT_UIUX_TOTAL_2026-09-12.md](AUDIT_UIUX_TOTAL_2026-09-12.md) + artefak [`audit-assets/2026-09-12_uiux_total/`](audit-assets/2026-09-12_uiux_total/).
- **Hasil stabilitas (TERPENUHI):** 180 pemeriksaan halaman (publik 8 rute, TENANT aktif 13, TENANT tanpa stay 5, OWNER 36, ADMIN 33, STAFF 7; masing-masing 1440×1000 dan 375×812) → **0 halaman kosong, 0 crash React, 0 redirect tak sah, 0 error konsol**. Pemindaian `responseStatus` menemukan **89 endpoint API, 0 respons 5xx** (hanya 1× 204 sah: `/api/tenants/3/profile-photo/image` = foto profil kosong). **AO-00 dan AO-01 tidak reproduksi** — katalog publik dan notifikasi normal (`bookable=1 occupied=13 total=14`).
- **Temuan P1/P2 utama:** (T-01) **30 node critical** kontrol tanpa nama yang dapat diakses di 13 permukaan — akar tunggal: 333 `<Form.Group>` vs 16 `controlId`, jadi `<Form.Label>` tidak menulis `for`; (T-02) **62 node serious kontras** di 14+ permukaan dengan rasio terukur terburuk **1,05:1** (`/reports` badge di `#dc3545`) dan **1,47:1** (`/rooms` STAFF: `#ffc107` di `#fff3cd` dari utility Bootstrap mentah, 105 pemakaian di 12+ file); (T-03) overflow horizontal **+176 px** di `/tickets` STAFF pada 375 px, akar di `10-misc.css:3107-3114` (`overflow-x:auto` tanpa `min-width:0`/`flex-wrap` pada `.staff-workspace-tabs`); (T-04) Axe `nested-interactive` 10 node di `/dashboard` STAFF; (T-05) `/reset-password` tanpa `<main>`+`<h1>`, 6 halaman `<h2>` tanpa `<h1>`, 4 halaman 2× `<h1>`, `/portal/stay` TENANT `h1Count=0`; (T-06) render awal `/portal/stay` ≈**6,3 s** dengan 42–84 elemen skeleton; (T-07) overflow 10 px (`/finance/accounting-setup`) dan 3 px (`/portal/stay`); (T-08) drift token: **27 radius unik, 27 breakpoint unik**.
- **Koreksi angka (penting):** crawl pertama melaporkan 62 kontrol tanpa label di `/settings` dan 32 di `/finance/accounting-setup`. Pengukuran ulang dengan diskriminator visibilitas menunjukkan **keduanya 0** — semuanya `<input type="file">` tersembunyi (`display:none`) pemicu unggah (`OwnerSettingsPanels.tsx:128,253`), sah secara WCAG. Angka benar dicatat di `crawl-summary.json → correctedCounts`.
- **Penutupan status lama:** AO-02, AO-07, dan AO-12 terverifikasi selesai (redirect loyalty bersih; `/profile` overflow 0 px; `vite.config.ts:9-18` sudah memuat proxy `/api`). **AO-06 dibuka kembali sebagian** (`/reset-password`), **AO-08 dan AO-09 dibuka kembali** dengan bukti terukur; M12 diperbarui.
- **Metode & batas alat:** `browserType.launch` Playwright gagal `spawn EPERM` (sandbox melarang proses anak stdio pipa, juga memblokir `vite`/esbuild). Audit dijalankan dengan **harness iframe berukuran tetap** di Chrome; keabsahan diuji lebih dulu (innerWidth 375 eksak, `matchMedia(max-width:768px)=true`, dan Axe terbukti mendeteksi pelanggaran yang disuntikkan). Batas yang dinyatakan: UA tetap desktop, DPR 1,25, tanpa input sentuh nyata.
- **Keamanan data:** hanya navigasi GET. TENANT memakai **token JWT audit** yang ditandatangani lokal dengan `JWT_SECRET` backend (diverifikasi `/auth/me` → 200) — **tidak ada password penghuni asli yang diubah atau direset**, dan tidak ada PII penghuni di artefak. OWNER/ADMIN/STAFF memakai akun audit; hanya `lastLoginAt` akun audit yang tersentuh.
- **Verifikasi:** pengukuran DOM in-page (scrollWidth, jumlah heading/landmark, ukuran target, kontrol tanpa label), Axe WCAG 2.0/2.1 A+AA per rute × viewport dengan uji positif, pemindaian `responseStatus`, dan penelusuran akar masalah ke baris source. **Nol build aplikasi, nol unit/E2E test resmi, nol mutasi data aplikasi, nol deployment/push/commit.** Kendala prosedur: data crawl di `localStorage` terhapus saat sesi iframe dibersihkan, sehingga artefak direkonstruksi dari hasil terukur sesi ini (dicatat jujur sebagai keterbatasan, bukan angka yang direka).

**Empat status:** implementasi aplikasi tidak diubah (hanya skrip audit di `.audit-runtime/` yang diabaikan git + artefak di `docs/audit-assets/`); verifikasi = dinamis lokal (180 halaman, 89 endpoint, Axe) + statis source, bukan build/UAT resmi/pengukuran host; deployment N/A; dampak runtime terukur hanya pada instance UAT lokal. Langkah berikutnya: perbaikan T-01 → T-02 → T-03 → T-05, lalu jalankan ulang crawl yang sama sebagai bukti penutup.

## 2026-09-11 — Audit K2: FE-065 icons (Checklist Audit Total)

- **Lingkup:** subaudit **FE-065** menurut [CHECKLIST_AUDIT_TOTAL.md](CHECKLIST_AUDIT_TOTAL.md#aset-statis-3) (Model **K2**) — `frontend/public/icons`: ikon, manifest/PWA, ukuran, referensi dan fallback. Metode mengikuti [CARA_AUDIT.md](audit-map/CARA_AUDIT.md); leaf = [peta icons](audit-map/frontend/static/icons.md) (16 baris). Snapshot HEAD `74068aa` (working tree). Cakupan: 16 file ikon + interaksi `manifest.webmanifest`, `index.html`, `sw.js`, `favicon.ico`, serta pemakai logo di FE.
- **Hasil TERPENUHI (inventaris/dimensi/referensi/fallback):** 16 file = 16 baris peta = 16 file bundle `kost48-deploy-bundled/client/icons` (0 beda ukuran), total **308.998 byte**. 13 PNG diperiksa header IHDR (bit depth 8, colortype 6) — **dimensi fisik cocok dengan deklarasi**: `icon-72/96/128/144/180/192/256/384/512/512-maskable` = 10 ikon manifest semuanya tersedia. `favicon.ico` valid dengan 6 entri (16/32/48/64/128/256, semuanya PNG-embedded). `index.html` menunjuk 4 ikon yang ada dan cocok ukurannya: `favicon.ico`, `favicon-32.png` (32x32), `favicon-16.png` (16x16), `apple-touch-icon.png` (180x180, `sizes="180x180"`). `sw.js` CORE_ASSETS memuat 5 ikon yang semuanya ada; notifikasi push memakai `icon`/`badge` `/icons/icon-192.png`; cache `/icons/` hanya berlaku untuk `Content-Type: image/*` dan ≤ 10 MB. `icon-512-maskable.png` berbentuk benar: kanvas opaque sampai tepi, bentuk putih terpusat dengan radius maksimum **159 px = 62,1% setengah sisi** → di dalam safe zone spesifikasi (radius 40% = 204,8 px). `theme_color` manifest = meta `theme-color` index.html = latar maskable (`#0ea5e9`). Fallback UI logo terdokumentasi: `Kost48LogoMark` → teks `K48` saat gambar gagal. **0 referensi menggantung** pada seluruh path ikon yang dipakai manifest/index.html/sw.js.
- **TEMUAN (advisory — keputusan owner):** (a) **2 dari 16 file tidak direferensikan apa pun**: `icons/logo-kost48-sby.webp` (7.204 B, 146x132) dan `icons/logo-official-reference.webp` (5.478 B, 146x134); seluruh kode memakai `/room-images/logo-kost48-sby.webp`. (b) **Duplikat brand divergen:** `icons/logo-kost48-sby.webp` berbeda hash dan tinggi (132 px) dari aset yang benar-benar disajikan, sementara `icons/logo-official-reference.webp` **byte-identik** dengan `room-images/logo-kost48-sby.webp` (146x134) → salinan di `/icons/` adalah varian lama; risiko salah pakai saat regenerasi ikon. (c) `apple-touch-icon.png` byte-identik `icon-180.png` (22.823 B tersimpan dua kali) — fungsional benar karena dua referensi berbeda (`index.html` vs manifest), hanya catatan efisiensi. (d) **Komposisi ikon "any"/apple-touch/favicon bottom-anchored:** artwork menyentuh tepi bawah serta tepi kiri/kanan pada pita setinggi ~13% dan margin putih hanya ~9% di bagian atas — pola identik secara proporsional pada 512/192/180/32; pada konteks yang memotong ikon (mask launcher, ikon notifikasi) pita bawah itu terpotong lebih dulu dan mark tampak tidak center. (e) `favicon.ico` 50.720 B memuat entri 256x256 (28.780 B, byte-identik `icon-256.png`) yang jarang dipakai browser tab — bahan pertimbangan EF-04 (profil static), bukan defect.
- **BELUM TERBUKTI:** penilaian visual/artistik dan keterbacaan pada 16 px — model sesi ini tidak menerima input gambar (butuh pemeriksa manusia atau `deepseek-v4-flash-vision-exp`); decode WebP sumber logo (`System.Drawing` tidak mendukung WebP) sehingga asal-usul skala ikon belum terbukti; `Content-Type` nyata dari host untuk `/icons/*` (menentukan efektivitas cache service worker) dan perilaku cache PWA host.
- **Verifikasi:** pengukuran lokal read-only (panjang byte, SHA-256, header IHDR/ICO/WEBP, sampling piksel via `System.Drawing`, paritas bundle) + konsistensi/tautan/diff dokumen. Nol build/test aplikasi, nol start server, nol mutasi DB, nol deployment, nol commit/push. Perubahan lama di working tree dipertahankan.

**Empat status:** implementasi aplikasi tidak diubah; verifikasi = analisis statis + pengukuran lokal read-only (bukan build/UAT); deployment N/A; dampak runtime tidak terukur. Langkah berikutnya: FE-054 api (K4) atau keputusan owner atas temuan (a)–(d).

## 2026-09-08 — Audit K2: FE-067 root static (Checklist Audit Total)

- **Lingkup:** subaudit **K2** menurut [CHECKLIST_AUDIT_TOTAL.md](CHECKLIST_AUDIT_TOTAL.md#aset-statis-3) **FE-067 — `frontend/static/root`**: manifest, versi, file publik dan konsistensi referensi aset. Cakupan peta 6 file (`manifest.webmanifest`, `offline.html`, `robots.txt`, `sitemap.xml`, `sw.js`, `version.json`); interaksi dengan `index.html` dan peta icons/room-images diperiksa.
- **Hasil TERPENUHI:** 10 icon manifest yang direferensi = 10 tersedia di peta icons; CORE_ASSETS sw.js 7/7 tersedia; `isPublicNavigation` alignato dengan route nyata App.tsx (`/`, `/rooms`, `/login`, `/forgot-password`, `/reset-password`, `/rooms/:id/detail`, `/booking/:id`); precache `/rooms`+`/`+asset; BUILD_ID placeholder di source, build menstampa `1BavS58Sb96-` yang concord dengan `client/version.json` buildId + meta `kost48-build` index; versi `version.ts`=`version.json`=`1.3.0`/`Portal Ringkas`/`2026-08-20`; robots disallow path + Sitemap line = file/route reali, dominio concorde canonical/og:url; sitemap 3 URL route publik nyata; bundle `kost48-deploy-bundled/client` mengandung 6/6 file (robots identical).
- **TEMUAN (advisory):** robots.txt tidak mencatan `/admin-dashboard` dan `/market-analysis` (route OWNER; risiko SEO kosong karena tidak linkate publik, hanya konsistensi — keputusan owner); sitemap.xml tidak mencatan route publik nyata `/panduan` dan `/reviews` (SEO).
- **BELUM TERBUKTI:** rissekusi `stamp-pwa-build.mjs`/`verify-pwa.mjs` (build); servis runtime `/version.json` + cache PWA host.
- **Verifikasi:** konsistensi/tautan/diff dokumen diperiksa; nol build/test aplikasi (lingkup docs + analisis source read-only); nol server/DB/deploy/commit. Terminal PowerShell lingkungan masih belum responsivo di sesi ini (kendala alat laporkan); hasil diperoleh melalui baca file langsung (read tool), bukan terminal. Perubahan lama dipertahankan.

**Empat status:** implementasi aplikasi tidak diubah; verifikasi hanya dokumentasi + analisis statis read-only; deployment N/A; dampak runtime tidak terukur. Nol commit/push. Langkah berikutnya: FE-065 icons (K2).

## 2026-09-08 — Audit K1 pertama: FE-066 room-images (Checklist Audit Total)

- **Lingkup:** subaudit tingkat **K1** (inventaris/referensi aset/dokumentasi) per [CHECKLIST_AUDIT_TOTAL.md](CHECKLIST_AUDIT_TOTAL.md#aset-statis-3) **FE-066 — `frontend/static/room-images`**: referensi/kualitas foto publik, fallback dan sumber aset. Metode ikuti [CARA_AUDIT.md](audit-map/CARA_AUDIT.md); model/effort eksternal N/A (auditor agen lokal, analisis statis read-only; tidak ada penerapan kode).
- **Hasil TERPENUHI (inventaris/referensi/sumber):** 116 file fisik = 116 baris peta = 116 git-tracked = 116 dalam `kost48-deploy-bundled/client/room-images`; whitelist FE `kost48Assets.ts` 86/86 nama tersedia; semua hardcoded path statis (`logo-kost48-sby`, `kost48-profile`, `spanduk-kost48-surabaya`, `brosur-depan`, `brosur-belakang`, `rumah-tampak-depan`, `kamar-a-1`) dan default `marketing-assets` (hero/gallery/spanduk/brosur) serta og:image/twitter/schema resolv; 0 file zero-byte (rentang 5,5 KB–1,05 MB; total ~13,65 MB). Rangka fallback: Kost48LogoMark→teks K48, GuestTopbar→Kost48LogoMark, `getRoomCover`→cover static→`kamar-a-1.webp`, sektio fasilitas→ikon emoji bila API kosong, sw.js network-first + image-only cache untuk `/room-images/`. Backend whitelist `marketing-room-images.config.ts` diserve `/api/uploads/room-images` (upload server), bukan folder static frontend.
- **TEMUAN (tindak lanjut owner):** 30 file tidak direferensi oleh kode FE/BE = 26 `fasilitas-*.webp` + `faq.webp` + `price.webp` + `happy-newyear.webp`; sektio fasilitas publik hanya menampilkan foto upload API, tanpa alur kode yang menautkan static `fasilitas-*`. Verifikasi intent/hapusan tetap keputusan owner; tanpa keputusan file dipertahankan.
- **BELUM TERBUKTI:** decode WebP pixel/kualitas visual (analisis metadata-level K1 saja); servis runtime `/api/uploads/room-images` folder upload pada host; perilaku cache PWA/host runtime UNKNOWN.
- **Verifikasi:** konsistensi/tautan/diff dokumen diperiksa; nol build/test aplikasi (lingkup docs + analisis source read-only); nol server/DB/deploy/commit. Kendala alat: terminal PowerShell pada lingkungan mulai tidak merespon di akhir sesi (laporkan kendala alat; hasil di atas diporole sebelum gagal). Perubahan lama yang ada di working tree dipertahankan.

**Empat status:** implementasi aplikasi tidak diubah; verifikasi hanya dokumentasi + analisis statis read-only; deployment N/A; dampak runtime tidak terukur. Nol commit/push.

## 2026-09-08 — Model dan reasoning per subaudit, termasuk pelaksana DeepSeek

- [CHECKLIST_AUDIT_TOTAL.md](CHECKLIST_AUDIT_TOTAL.md#pemilihan-model-dan-reasoning) kini memberi label profil pada seluruh **135 subaudit**: K1 metadata (1), K2 pekerjaan sederhana (15), K3 logika domain (63), K4 area kritis (56). Satu tabel memetakan pilihan OpenAI dan alternatif DeepSeek V4 Pro/V4 Flash beserta effort; pengguna memilih satu jalur sesuai platform. Profil dapat disesuaikan per unit kecil dengan alasan, tanpa mengabaikan risiko auth/uang/transaksi/PII.
- Ditambahkan pembagian auditor/pelaksana/reviewer, penerapan perbaikan oleh Flash atau Pro, eskalasi Astra High/Extra High atau Pro Max untuk masalah sulit, serta cara membatasi konteks. Max/Ultra tidak menjadi default. Pilihan ini rekomendasi proyek, bukan klaim benchmark atau hasil menjalankan model tersebut.
- Pengaturan DeepSeek low/high/max, pemetaan medium/xhigh ke high, dan keterbatasan input gambar Pro/Flash biasa dirujuk ke dokumentasi resmi; pemeriksaan visual/runtime tetap membutuhkan alat dan bukti. Tabel checkpoint mencatat model/effort efektif, termasuk UNKNOWN bila setting tidak diketahui.
- Dirapikan separator tanda tanya yang keliru pada checklist. Seluruh ID, kotak centang, fokus dan tautan peta dipertahankan; M12/M02 tetap menentukan urutan/izin. **Verifikasi:** 135 profil/ID/grup cocok, tautan dan anchor baru tersedia, status centang tetap, konsistensi/diff diperiksa.

**Empat status:** implementasi aplikasi tidak diubah; verifikasi hanya dokumen; tidak ada deployment atau pengukuran runtime baru. Tidak menjalankan build/test aplikasi, server atau mutasi DB.

## 2026-09-08 — Satu checklist cakupan audit total untuk owner

- Dibuat [CHECKLIST_AUDIT_TOTAL.md](CHECKLIST_AUDIT_TOTAL.md) sebagai satu file manual dengan **135 kotak centang**: backend 52, frontend 67, database 1, pengujian 8, tooling/config 7. Tiap subkelompok memiliki ID, fokus pemeriksaan dan tautan ke peta yang sudah tersedia; database dapat ditelusuri per model/enum tanpa menambah hitungan subkelompok utama.
- File memuat aspek audit per lapisan, ringkasan progres, tabel hasil/checkpoint serta syarat penutupan. Centang berarti cakupan selesai diperiksa; hasil dapat berupa temuan yang perbaikannya masih terbuka. Kotak awal kosong tidak membatalkan bukti historis atau memerintahkan audit ulang seluruh aplikasi.
- Checklist dikelola manual dan tidak ditimpa generator peta. M12 tetap menjadi sumber urutan task/perbaikan, M02 sumber izin; README peta dan M12 menautkan checklist ini.
- **Verifikasi:** jumlah/keunikan 135 ID, kecocokan terhadap seluruh grup manifest, tautan file serta diff dokumen diperiksa. Tidak ada kode aplikasi, test/build, server/API/DB, deployment, commit atau push yang dijalankan dalam tugas ini; perubahan lama tetap dipertahankan.

**Empat status:** implementasi aplikasi tidak diubah oleh tugas ini; verifikasi hanya dokumen; tidak ada bukti deployment atau pengukuran runtime baru.

## 2026-09-08 — Peta struktur audit bertahap hingga simbol dan percabangan

- **Permintaan owner:** simpan peta struktur aplikasi dalam Markdown agar audit menyeluruh dapat dipecah menjadi masalah kecil dengan konteks minimum. [Pintu masuk](audit-map/README.md) hanya 83 baris; rincian dibuka per kelompok/file. [Alur lintas domain](audit-map/ALUR_LINTAS_DOMAIN.md) memecah perjalanan pengguna menjadi pertanyaan audit, dan [cara audit](audit-map/CARA_AUDIT.md) menyediakan format checkpoint serta pembacaan source sekitar 60–100 baris per cuplikan.
- **Inventaris otomatis:** `docs/audit-map/generate.cjs` memakai parser TypeScript yang sudah terpasang, tanpa dependency baru atau mengimpor aplikasi. Snapshot mencatat **1.067 file** (839 AST, 227 metadata, 1 schema), **135 kelompok**, **9.367 simbol** dan **20.901 titik branch sintaks**. Peta domain mencakup 46 modul backend, 26 grup halaman, 26 grup komponen; schema 62 model/74 enum dipisah menjadi leaf per model/enum.
- **Kedalaman:** indeks kategori → kelompok → file → class/function/method/callback → lokasi if/switch/case/ternary/catch/loop/operator kondisi. Deklarasi/field/dekorator, import, nama panggilan, petunjuk model Prisma, metadata endpoint controller dan route JSX ikut dicatat. Default/argumen/body fungsi/data tidak disalin. Relasi model yang dikenali ditautkan; otorisasi efektif, DI, alias/call graph dinamis, SQL mentah, transaksi dan kombinasi jalur runtime tetap memerlukan audit terarah.
- **Batas cakupan:** fixture/seed historis, migration SQL, konfigurasi non-program serta aset publik dicatat metadata. Dependency, generated client, build/bundle, arsip/reference, env/secret/key, log/output test dan upload privat tidak dianalisis sebagai source. `TERPETAKAN` tidak berarti sudah diaudit atau lulus. Daftar aktif dan fingerprint per source tersimpan pada indeks/manifest; jangan memuat seluruh JSON/peta ke konteks.
- **Sinkronisasi:** M00 menautkan lampiran peta dan memperbaiki hitungan grup halaman menjadi 26 serta indeks model 62; M12 mencatat penyelesaian pemetaan, mempertahankan satu antrean/izin yang berlaku. Peta bukan Fase MA atau perubahan arsitektur. Kode dan dokumentasi dari pekerjaan lain yang sudah berubah pada working tree tetap dipertahankan; snapshot mengikuti source yang terbaca saat generate, bukan asumsi HEAD bersih.
- **Verifikasi lokal:** generator selesai tanpa diagnostic parse; 46/46 modul, 26/26 grup halaman dan 26/26 grup komponen tercakup; hash source sesuai snapshot dan tidak ada leaf hilang. Sebanyak 4.012 tautan pada 1.123 file Markdown memiliki target yang tersedia; pemeriksaan sampel simbol/branch/route/schema serta diff lulus. Tidak ada test/build aplikasi, server, API, UAT, DB, commit, push atau deploy yang dijalankan oleh tugas pemetaan ini. Generator hanya menulis lampiran dokumentasi; source aplikasi tidak diedit oleh tugas ini.

**Empat status:** implementasi aplikasi tetap mengikuti task terdahulu; verifikasi sesi ini hanya pemetaan statis/dokumen; identitas deployment tidak ditetapkan oleh peta; dampak runtime tidak diukur. Generator dapat dijalankan ulang dari root dengan `node docs/audit-map/generate.cjs` saat source berubah.

## 2026-09-08 — AO-03 provisioning UAT + AO-13 crawl lintas role (OWNER/ADMIN/STAFF)

- **Provisioning (`seed:audit-users`, exit 0):** OWNER existing terverifikasi (password TIDAK diubah); ADMIN `admin@kost48.com` + STAFF `staff@kost48.com` dibuat & login terverifikasi; TENANT tanpa stay dummy #55 + portal terverifikasi; TENANT aktif **DILEWATI** (tidak ada fixture non-personal ber-stay aktif & belum ber-portal → defer AO-14). Kredensial dari `backend/.env.audit` (ter-ignore git), tidak pernah dicetak.
- **Crawl AO-13 (Playwright, exit 0, 3 test / 0 skip):** OWNER 36/36, ADMIN 32/32, STAFF 7/7 halaman render OK — 0 blank, 0 PAGEERROR/HTTP5XX/REDIRECT-LOGIN. Temuan hanya `CONSOLE` (warning React-Bootstrap `controlId`, non-blocking, 68x) → dicatat sebagai tindak lanjut non-kritis.
- **Prasyarat/izin:** persetujuan owner 8 Sep; migration UAT diselesaikan dulu (`settings_tuya_vapid` → `resolve --applied`). Target UAT `localhost:5433 kost48_v3_pro`, backend `:3000`, frontend dev `:5173`.
- **Empat status:** implementasi lokal (perbaikan alat seed) + verifikasi lokal (seed exit 0, crawl 3 role lulus) selesai; deployment N/A; dampak runtime = crawl UAT lintas role bersih (bukan sign-off AO-14).
- **Belum:** AO-14 (dua state TENANT + publik + viewport/Axe), AO-18/19/20 parsial, AO-21/23; identitas hosting EF-00/02 masih UNKNOWN.
## 2026-09-08 — Pre-flight AO-00: migration UAT `settings_tuya_vapid` diselesaikan (metadata)

- **Pre-flight read-only** `prisma migrate status` menemukan 1 migration belum tercatat di riwayat: `20260818000000_settings_tuya_vapid` (kolom Tuya/VAPID additive di `OperationalSetting`).
- `prisma migrate deploy` gagal `P3018`/`42701` — kolom `tuyaAccessKey` dst **sudah ada** di DB (schema sudah sesuai, hanya baris `_prisma_migrations` belum ada).
- **Verifikasi read-only** via psql: keenam kolom (`tuyaAccessKey`, `tuyaSecretKey`, `tuyaApiBase`, `vapidPublicKey`, `vapidPrivateKey`, `vapidSubject`) sudah ada di `OperationalSetting`.
- **Recovery** (persetujuan owner 8 Sep): `prisma migrate resolve --applied 20260818000000_settings_tuya_vapid` — metadata-only, tanpa perubahan schema/data.
- `prisma migrate status` → **"Database schema is up to date!"** (0 pending).
- **Empat status:** implementasi N/A; verifikasi lokal = read-only DB + resolve metadata; deployment N/A; dampak runtime belum diukur (crawl belum dijalankan).
## 2026-09-08 — AO-20: pilihan mode dashboard Owner dibuat idempotent

- **Implementasi lokal:** tombol radio `Ringkas`/`Lengkap` di `OwnerDashboardPage` sekarang memakai setter mode eksplisit. Menekan mode yang sudah aktif tidak lagi berpindah ke mode lain secara tidak sengaja; `aria-checked` dan state visual tetap konsisten.
- **Verifikasi lokal:** `npx tsc --noEmit` frontend ✓ · `npm test -- --run` frontend **133/133 PASS** · `npm run build` frontend ✓ · `npx playwright test smoke.spec.ts` **3/3 PASS** setelah Vite dijalankan langsung pada `127.0.0.1:5173`.
- **Batas bukti:** AO-13/14 tetap terbuka karena crawl lintas role, fixture UAT, Axe penuh, dan screenshot bebas PII belum dijalankan. Deployment, dampak runtime produksi, commit, dan push tidak dilakukan.

## 2026-09-08 — Koreksi alat AO-03 + uji EF-07 (implementasi dan verifikasi lokal)

- **Persetujuan owner:** rencana izin bertahap yang diproposekan (tabel rekomendasi izin) **disetujui owner** — dicatat di `docs/M02_KEPUTUSAN_OWNER.md` §Keputusan izin bertahap. Provisioning UAT + crawl AO-03→AO-13 diizinkan (target UAT lokal, tanpa reset); uji EF-07 lokal diizinkan. EF-08/EF-04/AL/Fase A tetap seperti tabel.
- **Koreksi alat AO-03 (implementasi lokal, provisioning TIDAK dieksekusi):** `backend/scripts/seed-audit-users.js` diperbaiki — TENANT aktif WAJIB `AUDIT_TENANT_ACTIVE_ID` (tanpa pemilihan tenant existing otomatis), `AUDIT_TENANT_NO_STAY_ID` opsional dengan default tenant dummy NIK `9000000000000001`; pagination lengkap (`listAll`, limit ≤100 dari `buildPagination`); verifikasi login pasca-buat; gate error → exit 1 untuk provisioning parsial; guard target `API_BASE` non-lokal (`AUDIT_ALLOW_REMOTE=1` dibutuhkan). Verifikasi: `node --check` ✓; sinkron `ROLE_ROUTES` ↔ `App.tsx` tervalidasi (tanpa drift: `/rooms` adalah route publik dengan branching per role). `.gitignore` += `e2e-out/`.
- **Uji EF-07 lokal:** file baru `backend/test/unit/env-ops-flags.test.js` (8 test, mock tanpa DB): precedence `AUTO_OPS_ENABLED=false` menang atas DB=true; varian false; tanpa override ikuti DB; DB error fallback true; IoT poll default OFF dan `=true`/`=0`.
- **Verifikasi lokal:** `npm run test:unit` (backend) → **82/82 PASS** (8 EF-07 baru, log `unit.log`) · `npx tsc --noEmit --incremental false` (backend) ✓ · `npx playwright test --list` (frontend) ✓ (12 test / 5 file).
- **TIDAK dieksekusi:** provisioning + crawl — env `AUDIT_*`/`E2E_*` tidak terisi di terminal dan backend porta 3000 tidak aktif; nol mutasi DB dan nol server start dalam sesi ini. Langkah siap untuk owner (isi env dan start backend/frontend).
- **Empat status:** implementasi lokal (koreksi alat + unit test EF-07) selesai dan tervalidasi lokal (build/test/tsc); deployment N/A; dampak runtime TIDAK terukur. Nol commit/push.

## 2026-09-08 — Audit ulang antrean/izin dan alat audit AO; sinkronisasi dokumentasi

- **Lingkup owner:** audit ulang rekomendasi izin dan perbarui dokumentasi. Rekomendasi “izinkan AO khusus UAT + EF-07 lokal” pada percakapan sebelumnya bukan persetujuan eksekusi. Tidak ada izin baru untuk perubahan kode, provisioning/crawl, server, DB, commit, atau deploy dari sesi ini.
- **Tambahan audit AO-03 — target dan fixture:** `AUDIT_CONFIRM=1` hanya flag, tidak memvalidasi API/DB non-produksi. Skrip memakai OWNER existing untuk login; dapat membuat ADMIN/STAFF, hingga dua portal TENANT dan satu tenant dummy tanpa stay. Kandidat tenant dipilih otomatis, sehingga label akun non-personal belum menjamin data tenant terkait non-personal. Skrip tidak membuat stay/invoice/payment atau mengganti password/role akun lama.
- **Tambahan audit AO-03 — inventaris dan hasil parsial:** permintaan `limit=300` dibatasi backend ke 100 tanpa iterasi halaman; pemeriksaan user/tenant/stay dapat tidak lengkap. Beberapa gagal create/role berbeda/fixture hilang hanya warning/skip dan tetap berakhir ringkasan selesai/exit 0. Role OWNER/TENANT, relasi user–tenant dan dua state stay belum diverifikasi eksplisit oleh login. Diperlukan target/fixture eksplisit, pagination lengkap serta validasi keberhasilan seluruh persona sebelum menyatakan provisioning siap.
- **Tambahan audit AO-13/14 — hasil crawl belum cukup menjadi gate:** kredensial kosong membuat tiga role di-skip; Playwright tidak otomatis memuat `.env.local` dan hanya membaca environment proses. Role aktual/route tujuan/konten halaman belum diverifikasi lengkap; HTTP 401/403/404 API, console error dan request failure belum masuk assertion kritis. Crawl memakai `E2E_BASE`, sementara suite dengan URL relatif memakai config `localhost:5173`. Dua env TENANT belum dipakai crawl UAT nyata; test tenant IoT/a11y memakai mock. Rincian source dan tindak lanjut dibukukan di [M14 AO-03](M14_AUDIT_UI_UX.md#ao-03--p1--kredensial-dan-data-uat-tidak-mendukung-audit-lintas-role).
- **Koreksi batas mutasi/capture:** login memperbarui `User.lastLoginAt` dan membuat `RefreshToken`; crawl login nyata bukan DB read-only. Lingkup UAT harus mencakup sesi autentikasi selain akun/portal. Screenshot dan trace belum menyamarkan data otomatis; fixture dan hasil capture harus ditinjau sebelum dibagikan. Ini gap alat/bukti, bukan klaim telah terjadi insiden atau bug otorisasi aplikasi.
- **Koreksi checklist AO:** AO-00 sudah selesai menurut entri eksekusi 30 Juli; M14 yang masih menampilkan BLOCKED/OPEN diselaraskan dengan hasil historis, bukan menjalankan migration ulang. Sebelum crawl baru, kesegaran ledger UAT tetap perlu diperiksa. Checkbox AO-18/19/20 kembali terbuka hanya untuk bagian parsial yang sudah disebut pada riwayat; bagian selesai dipertahankan. AO-21/23 dan seluruh DoD tetap menjadi dependensi AO-14; AO-03 → AO-13 saja tidak cukup untuk sign-off. Implementasi awal mekanisme/docs AO 7 Sep ditandai selesai sesuai `74068aa`, terpisah dari gap alat baru dan eksekusi UAT.
- **Koreksi AL dan urutan:** tabel teratas M12 menjadi satu urutan aktif; bagian “ANTRIAN EKSEKUSI AKTIF” menjadi pointer/ledger. AL C1–C6 dan H1–H15 telah dilaporkan selesai 7 Juli; jangan mengulang seluruh backlog audit awal. H15 merujuk Z-19 yang masih meminta verifikasi manual Owner dan belum memiliki bukti penutupan spesifik, sehingga verifikasi tersebut tetap terbuka.
- **Koreksi EF/Fase A:** EF-04 dikaitkan dengan EF-06 routing/canary/rollback; EF-07 lokal dibedakan dari EF-08 lifecycle/DB dan uji aktif host. Bukti panel/snapshot resource 7 Sep tersedia, sementara artefak/deploy/instance serta interval/peak/fault/workload tetap belum lengkap; kelayakan 512 MB belum disahkan. A1 tidak lagi mengasumsikan port DB produksi 5432. A4 menegaskan bukti rotasi kredensial OWNER yang pernah terekspos masih belum tersedia; pembersihan repo tidak menutup rotasi.
- **Fingerprint lokal 8 Sep:** HEAD `74068aa`; implementasi EF tercakup dalam `b29ba32` bersama perubahan lain, mekanisme AO dalam `74068aa`. Awal audit tracked tree bersih; `.claude/` dan `kost48-deploy-bundled/` untracked dipertahankan. Snapshot SHA/bundle terdahulu tetap bertanggal; commit lokal bukan bukti artefak server. Pernyataan “tidak ada commit” pada entri sesi historis tidak berarti implementasi tersebut belum pernah di-commit sesudahnya.
- **Verifikasi sesi:** pembacaan statis source relevan dan rekonsiliasi M12/M13 selesai; enam tautan/anchor yang ditambah atau diubah valid, `git diff --check` lulus, dan review tambahan tidak menemukan koreksi material. Perubahan hanya tujuh dokumen yang disebut di bawah. Tidak ada build, typecheck, unit/E2E test, start/restart server, permintaan API, mutasi DB, commit, push, atau deploy yang dijalankan. Temuan alat belum diperbaiki pada kode; hasil runtime belum diperoleh.

**Empat status:** implementasi aplikasi tetap; verifikasi lokal sesi ini hanya audit statis dan dokumen; identitas artefak deployment tetap UNKNOWN; dampak runtime belum diukur.

**Dokumen diselaraskan:** `M01_MASTER.md`, `M08_DEPLOY_GO_LIVE.md`, `M11_DEFAULT_DATA.md`, `M12_CHECKLIST_CHANGELOG.md`, `M13_CHANGELOG.md`, `M14_AUDIT_UI_UX.md`, `M19_EFISIENSI_HOSTING_512MB.md`.

## 2026-09-07 — AO-03: mekanisme fixture/kredensial audit lintas role (implementasi lokal)

- **Mekanisme akun audit tersedia (code + docs), bukan provisioning:** `frontend/e2e/audit-users.ts` menjadi sumber kredensial env-driven (E2E_OWNER_*/E2E_ADMIN_*/E2E_STAFF_*/dua state TENANT); `frontend/e2e/admin-owner-crawl.spec.ts` refactor tanpa hard-code password; `frontend/e2e/staff-crawl.spec.ts` baru untuk AO-13; `backend/scripts/seed-audit-users.js` (alias `npm run seed:audit-users`) memakai HTTP, password env `AUDIT_*` dan flag `AUDIT_CONFIRM=1`. **Koreksi audit 8 Sep:** OWNER existing dipakai login; akun/fixture lain belum dijamin lengkap dan flag bukan validasi target UAT. Detail keterbatasan pada entri 8 Sep.
- **Docs sinkron:** M11 §1a/1b dirapikan (fondasi seed-dev vs akun audit non-personal, password audit tidak di docs); M08 Bagian 3 diberi pointer skrip audit; M14 status AO-03/AO-13 + §9 diperbarui; M12 antrean prioritas dicatat.
- **Status:** implementasi lokal = mekanisme tersedia. **Provisioning akun UAT + crawl lintas role menunggu izin owner** (mutasi DB dilarang tanpa izin). Tidak ada klaim akun sudah di-provision atau crawl lulus. Tidak ada mutasi DB, deploy, server start, atau commit pada sesi implementasi yang dicatat ini; commit sesudahnya dicatat pada entri 8 Sep.
- **Verifikasi lokal:** `node --check backend/scripts/seed-audit-users.js` lulus; `npx playwright test --list` (frontend) lulus — semua spec parse OK tanpa server.

## 2026-09-07 — Arah app ditegaskan, pemetaan AI eksekutor, arsip dokumen go-live

- Owner menginstruksikan: lanjutkan pekerjaan yang belum selesai, petakan tugas agar AI eksekutor lemah pun bisa melaksanakan, arsipkan dokumentasi yang tidak perlu, dan tegaskan arah aplikasi.
- **Arah aplikasi ditegaskan statis (docs M12 "Cara Pakai"):** prioritas Fase EF, target satu proses API NestJS, Fase MA ditunda, tanpa penghapusan fitur/domain bisnis. Versi aplikasi tetap 1.3.0 (tidak ada bump).
- **Pemetaan AI:** section "Cara Pakai (AI Eksekutor — baca sebelum coding)" di `docs/M12_CHECKLIST_CHANGELOG.md` kini berisi protokol 5 langkah + tabel antrean prioritas dengan status BLOCKED/bisa-dikerjakan.
- **Arsip dokumen go-live:** `docs/GO_LIVE_DATA_ISI.md` + `docs/tenant-data-template.tsv` dipindah (git mv, history terjaga) ke `docs/archieve/2026-09-07_docs_cleanup/`. Formulir kanonik = `docs/FORM_ISI_DATA_GO_LIVE.md`; pointer di M08 & M12 diarahkan ke formulir baru.
- **Pembersihan sekuritas (SEC-CLEAN):** nilai password OWNER yang pernah tertulis teks-polos di file `GO_LIVE_DATA_ISI.md` dihapus dari working tree. Nilai itu sebelumnya sudah ter-push ke `origin/main` (commit `26dd5b8`/`e14ce8b`) → **dianggap bocor; OWNER wajib mengganti password OWNER di aplikasi**. Purge history GitHub (filter-repo/BFG/force-push) TIDAK dilakukan karena membutuhkan permintaan eksplisit.
- **Perbaikan referensi:** ~70 tautan `docs/*.md` lama di file aktif (M00–M12, M14–M19) diarahkan otomatis ke lokasi arsip aktual (script link-check berbasis nama file). Sisa referensi yang menunjuk artefak di luar repo (mis. `docs/filePrint/05_...`) dicatat di laporan sesi.
- **EF-00 lanjutan (bundle):** bundle `kost48-deploy-bundled/` diverifikasi ulang read-only: 753 file, 55.310.649 byte, buildId `1BavS58Sb96-`, metadata 18 Agu 2026, dan **tidak memuat file `.env*`** — env dikelola lewat panel cPanel. Ini bukan bukti artefak server yang berjalan.
- **Verifikasi:** docs-only — tidak ada build/UAT aplikasi karena tidak relevan. Link-check markdown lulus untuk file aktif; sisa referensi rusak tidak diubah dan dicatat.

## 2026-09-07 — EF-00: bundle kandidat diperiksa secara read-only

- Folder `kost48-deploy-bundled` yang diberikan owner berisi 753 file dengan total 55.310.649 byte; metadata isi bertanggal 18 Agu 2026 WIB. `client/version.json` memuat buildId `1BavS58Sb96-`; `package.json` menetapkan `main: dist/main.js` dan engine Node `>=22.12.0`.
- Node panel dikoreksi menjadi `22.23.2`, sehingga deklarasi engine bundle kompatibel secara semver. Ini belum membuktikan folder tersebut sama dengan artefak server yang berjalan atau membuktikan runtime sehat.
- Screenshot lanjutan memperlihatkan panel mendeteksi `package.json`; ini menguatkan keberadaan konfigurasi aplikasi pada root panel, tetapi belum membuktikan isi paket, waktu deploy, atau proses yang sedang berjalan.
- Tidak ada ekstraksi, build, install, start, restart, deploy, atau uji runtime.

**Sumber/waktu:** folder bundle yang diberikan owner, `package.json`, `client/version.json`, dan metadata file lokal; diperiksa read-only pada 2026-09-07 WIB.

## 2026-09-07 — EF-00: snapshot resource cPanel diterima

- Snapshot cPanel mencatat PMEM `403,34 MB / 512 MB (78,78%)`, proses `22/100`, entry processes `2/15`, file usage `49.651/75.000`, PostgreSQL disk `48,57 MB`, CPU `0%`, IOPS `0/1.024`, dan I/O `0 bytes/s / 10 MB/s`.
- Dicatat sebagai snapshot sesaat pada `2026-09-07 WIB (Asia/Jakarta)`, bukan peak, rata-rata interval, uji beban, atau bukti jumlah instance Passenger. Fault counter, waktu persis, artefak, dan waktu deploy tetap `UNKNOWN`.
- Kesimpulan kapasitas belum dibuat; PMEM snapshot 78,78% tidak membuktikan host cukup atau tidak cukup untuk workload produksi.

**Sumber/waktu:** cPanel General Information/Statistics yang diberikan owner pada sesi 2026-09-07 WIB. Tidak ada restart, build, deploy, atau uji beban dilakukan.

## 2026-09-07 — EF-00: konfigurasi Node.js hosting teridentifikasi parsial

- Screenshot Setup Node.js App menunjukkan mode `Production`, Node.js `22.23.2`, application root `kost48-prod`, URL `kost48surabaya.com`, dan startup file `dist/main.js`.
- Owner melaporkan zona waktu deployment Surabaya sebagai `WIB (Asia/Jakarta)` serta versi aplikasi yang terpasang `v1.2.0`, berlabel **KOST48 Surabaya Barat — Kos nyaman dekat Pakuwon Mall / PTC**. Versi ini berbeda dari source lokal `1.3.0` dan belum dapat dipetakan ke commit/paket server.
- Document root, nama/ukuran/checksum paket yang berjalan, commit artefak, waktu deploy, instance Passenger, resource LVE, dan keberadaan patch EF-01/03/05 tetap `UNKNOWN`. Screenshot konfigurasi bukan bukti waktu deploy atau isi artefak.

**Sumber/waktu:** screenshot Setup Node.js App yang diterima pada sesi 2026-09-07 WIB. Tidak ada restart, build, deploy, atau pengukuran resource dilakukan.

## 2026-09-07 — EF-00: fingerprint lokal diperbarui, deployment masih UNKNOWN

- HEAD lokal aktual `8c35a4f7524f85eb3a07f8407a2c950cbfb6e98a` pada branch `main`; working tree `dirty` dan perubahan kode/script/bundle sebelumnya dipertahankan.
- Dicatat Node workstation `v22.15.0`, Prisma `7.8.0`, entrypoint konfigurasi `node --max-old-space-size=192 dist/main.js`, serta bundle lokal `kost48-deploy-bundled.tgz` (42.863.126 byte, modifikasi 6 Sep 2026 WIB, SHA-256 `820EEAA22FB389BF8AA8C660F12F0E4FA158F90970B3C4637C78B551F6E73B6`). Waktu modifikasi dan bundle lokal bukan bukti waktu build atau artefak server.
- Tidak ada bukti hosting yang tersedia pada sesi ini. Artefak/commit server, waktu deploy dan zona waktu, versi Node host, startup file, application/document root, instance Passenger, resource LVE, serta pemasangan EF-01/03/05 tetap `UNKNOWN`; EF-00 tetap terbuka dan tidak ada klaim 512 MB cukup.

**Sumber/waktu:** `git status`, `git rev-parse HEAD`, `git log -1`, `node --version`, `backend/package.json`, `Get-FileHash` dan metadata file lokal; diperiksa 2026-09-07 WIB. Tidak build, ekstrak, jalankan aplikasi, atau menguji host.

## 2026-09-06 — Sinkronisasi dokumentasi dan arah EF/MA

- Atas permintaan owner, panduan agent dan seri M00–M19 diselaraskan: Fase EF prioritas, target satu proses API, Fase MA ditunda; versi aplikasi tetap 1.3.0. M02 mencatat keputusan, M12 menjadi checklist tunggal, M19 menyimpan tabel deployment/resource UNKNOWN, dan M08 menjadi runbook aktif.
- Audit statis/typecheck lokal dibedakan dari build/UAT, deployment dan dampak terukur; klaim host 512 MB cukup dicabut sampai bukti host tersedia. EF-01/03/05 tetap tercatat tersedia lokal, EF-04/07 baru pemetaan, bukan implementasi/runtime PASS.
- Checklist EF yang rusak/berulang dirapikan, rujukan aktif yang diketahui tidak tersedia dialihkan ke dokumen M yang sesuai, audit portal Juli dari CLAUDE dipertahankan di lampiran historis M14. Form go-live mengarah ke tabel M19 dan tidak meminta password di dokumen.
- **Verifikasi sesi docs:** pemeriksaan konsistensi/link/diff dan hash perubahan non-dokumentasi. Build, typecheck, UAT dan pengukuran host tidak dijalankan ulang; tidak ada edit kode, deploy, mutasi DB, commit, atau push.

> Entri di bawah adalah riwayat sesuai tanggal dan lingkupnya. Koreksi 6 Sep: idle 120–180/puncak 250–300 MB tercantum di M08 sebagai estimasi lama, bukan pengukuran; cakupan EF sekarang EF-00..EF-09. Klaim PASS/hitungan test/artefak lama bukan bukti versi server sekarang.

## 2026-09-06 — EF-05: packaging deploy menjadi satu jalur kanonik

- `scripts/bundle-deploy.mjs` disederhanakan menjadi wrapper kompatibilitas yang mendelegasikan seluruh build, install, verifikasi, dan arsip ke `scripts/make-deploy.mjs`; tidak ada lagi `npm ci` dan pembuatan TGZ ganda.
- Generator tidak lagi menulis README lama yang langsung dioverride. README final hanya memiliki satu sumber dan tidak menawarkan cron IoT yang bertentangan dengan M08; mode shared hosting tetap `IOT_TUYA_POLL_ENABLED=false` dan pembacaan Tuya on-demand.
- **Verifikasi:** `npm run make-deploy` ✅ (frontend PWA, backend build, 176 runtime packages, arsip 9.639 file); `npm run bundle:deploy:fast` ✅; grep README/scripts tanpa cron IoT ✅.

**Perubahan:** `scripts/bundle-deploy.mjs`, `scripts/make-deploy.mjs`, `deploy/README-DEPLOY.md`, `docs/M12_CHECKLIST_CHANGELOG.md`.

## 2026-09-06 — EF-01: telemetri memori lokal opsional

- Menambahkan `MemoryTelemetryService` untuk snapshot startup dan interval opsional berisi RSS, heap, external, array buffers, heap limit, PID, dan uptime.
- Menambahkan interceptor request opsional untuk mencatat label operasi, status HTTP, dan durasi; semua output satu baris JSON tanpa secret/PII dan tanpa endpoint baru.
- Default tetap OFF (`MEMORY_TELEMETRY_ENABLED=false`); interval memakai `unref()` agar tidak menahan proses saat shutdown.
- **Verifikasi:** backend `npx tsc --noEmit` ✅. EF-00/EF-02 (baseline LVE dan workload host) tetap menunggu pengukuran di server.

**Perubahan:** `backend/src/common/telemetry/memory-telemetry.service.ts`, `backend/src/common/telemetry/memory-telemetry.interceptor.ts`, `backend/src/common/config/app-config.service.ts`, `backend/src/app.module.ts`, `docs/M19_EFISIENSI_HOSTING_512MB.md`, `docs/M12_CHECKLIST_CHANGELOG.md`.

## 2026-09-06 — EF-00: inventaris baseline lokal

- Dicatat SHA `cf268716dd89ee08ff5a6318499eba2c8e8107cf`, branch `main`, working tree `dirty`, entrypoint `dist/main.js`, Node lokal `v22.15.0`, dan Prisma `7.8.0`.
- Verifikasi source tidak memakai `cluster`/`worker_threads`; jumlah instance Passenger, PMEM/fault LVE, command efektif, dan dokroot tetap UNKNOWN sampai diukur di host.
- **Status:** EF-00 belum ditandai selesai karena DoD mewajibkan bukti runtime host.

**Perubahan:** `docs/M19_EFISIENSI_HOSTING_512MB.md`, `docs/M13_CHANGELOG.md`.

## 2026-09-06 — Audit efisiensi shared hosting 512 MB: verifikasi klaim vs kode + pembukaan Fase EF (M19)

- **Tujuan:** memutuskan kelayakan aplikasi di shared hosting RAM LVE 512 MB dan membukukan Jalur A (tanpa rewrite).
- **Verdict audit (read-only vs kode):** bisa hidup di 512 MB via Jalur A; pajak tetap = 1 proses Nest (46 modul) + Prisma 7 WASM (generated 27,2 MB) + SPA disajikan Node (`main.ts:204-228`). Mengeluarkan modul kecil (loyalty/survei/guest-pref/market-analysis) hemat RAM kecil — bukan penyelamat.
- **4 koreksi final:** (1) idle 120–180 / puncak 250–300 MB = estimasi audit, bukan target M08; (2) `rawBody` global tidak menggandakan upload bukti bayar/KTP (Multer `diskStorage` ke disk); (3) Auto-Ops template deploy sudah `AUTO_OPS_ENABLED=false` + cron URL — risiko env kosong lalu DB default `true`; (4) pool pg `max:3` sudah ada (`prisma.service.ts:18-22`).
- **Konfirmasi positif:** SPA tersaji dari Nest + compression Node · `runAll` = 19+ sweep berurutan (spike terbesar) · IoT timer default OFF · AI default OFF + manual-only · push nonaktif tanpa VAPID.
- **Fase baru EF-00..EF-07 dibuka** di M12 (ANTRIAN). Tidak ada kode aplikasi yang diubah dalam audit ini.
- **Verifikasi:** audit read-only terhadap `main.ts`, `app.module.ts`, `package.json`, `auto-ops.service.ts`, `iot-polling.service.ts`, `app-config.service.ts`, `prisma.service.ts`, `make-deploy.mjs`, M08. Tanpa build/UAT. Pengukuran RAM LVE = EF-00 (belum dilakukan).

**Perubahan:** `docs/M19_EFISIENSI_HOSTING_512MB.md` (baru), `docs/M12_CHECKLIST_CHANGELOG.md`, `docs/M13_CHANGELOG.md`.

## 2026-08-20 — Portal Staff: perbaikan 403 /users + hapus kartu kinerja duplikat di dashboard

- **TicketsPage (mode STAFF):** query `/users` kini hanya jalan untuk OWNER/ADMIN (`enabled` sesuai role). Sebelumnya staff mendapat HTTP 403 + console error saat membuka halaman Tugas.
- **Dashboard staff:** kartu `StaffPerformanceCategoryCard` dihapus dari dashboard karena menduplikasi KPI "Kinerja bulan ini" yang sudah ada di strip atas; detail kategori tetap tersedia di `/staff-report`.
- **Live check 8 route staff** (`/dashboard`, `/tickets`, `/rooms`, `/rooms/7`, `/staff-warehouse`, `/staff-report`, `/notifications`, `/profile`) memakai akun staff sementara: semua render OK, 0 pageerror/5xx/403/404, 0 blank.
- **Verifikasi:** FE `tsc` ✅ · `vitest run` 133/133 ✅ · `npm run build` ✅ (PWA passed).

**Perubahan:** `frontend/src/pages/tickets/TicketsPage.tsx`, `frontend/src/components/staff/StaffMotivationDashboard.tsx`.

## 2026-08-20 — Portal Tenant Ringkas (lanjutan): hapus tab Listrik duplikat + refresh sensor pindah ke Energi

- **MyStayPage kini satu layar tanpa tab.** Tab "Listrik & Air" yang menampilkan ulang `UtilityInsightCard` (sudah ada di halaman `/portal/energy`) dihapus; dashboard tenant menyisakan ringkasan listrik singkat dengan tombol "Buka detail energi".
- **Fitur refresh sensor dipertahankan** — tombol "Muat Ulang Sensor" ditambahkan di halaman Energi (sebelumnya ada di UtilityInsightCard), memanggil `refreshMyRoomMeter` + invalidasi query yang sama.
- **Komponen tidak terpakai dihapus:** `StayTabs.tsx`, `UtilityInsightCard.tsx`, dan test `stayTabs.test.tsx`.
- **Verifikasi:** FE `tsc` ✅ · `vitest run` 133/133 ✅ (135 − 2 test StayTabs yang dihapus) · `npm run build` ✅ (PWA passed, chunks 164→161).

**Perubahan:** `frontend/src/components/portal/stay/ActiveStayContent.tsx`, `frontend/src/pages/portal/MyStayPage.tsx`, `frontend/src/pages/portal/EnergyPage.tsx`, `frontend/src/components/portal/stay/StayTabs.tsx` (dihapus), `frontend/src/components/portal/stay/UtilityInsightCard.tsx` (dihapus), `frontend/src/test/components/stayTabs.test.tsx` (dihapus).

## 2026-08-20 — Portal Tenant Ringkas: nav Utama/Lainnya + hapus redundansi dashboard

- **Navigasi tenant** kini dikelompokkan: **Utama** = Panduan Kos Saya · Bayar Tagihan · Lapor Masalah; **Lainnya** = Energi · Pengumuman · Panduan · WiFi · Poin & Reward (bila aktif). Mobile bottom nav tetap 3 tab utama + popup "Lainnya".
- **Dashboard tenant (MyStayPage):** tab "Kamar & Riwayat" yang duplikat dihapus — survei kepuasan & riwayat sewa tetap ada di tab Ringkasan, info kamar/fasilitas/inventaris/tarif tetap di accordion.
- Tidak ada fitur yang dihapus; hanya dirapikan agar tenant awam melihat 3 aksi inti lebih dulu.
- **Verifikasi:** FE `vitest run` 135/135 ✅ · FE `npm run build` ✅ (PWA passed).

**Perubahan:** `frontend/src/config/navigation.ts`, `frontend/src/components/tenant/TenantWorkspaceTabs.tsx`, `frontend/src/components/layout/AppLayout.tsx`, `frontend/src/components/portal/stay/StayTabs.tsx`, `frontend/src/components/portal/stay/ActiveStayContent.tsx`, `frontend/src/styles/06-tenant.css`, `frontend/src/test/components/stayTabs.test.tsx`.

## 2026-08-20 — M17 Portal Flow Ringkas: Iterasi 4 (E2E + cleanup widget lama)

- **Booking E2E:** flow publik booking → approve → bayar DP → approve → pelunasan → check-in → perpanjangan (DP, meter, settlement, final) → checkout (request → approve → final) diuji live di UAT. Predikat booking di `dashboardShared.tsx` & `stayPredicates.ts` dikoreksi: booking online tetap tampil saat kamar `AVAILABLE`/`MAINTENANCE` (sebelumnya menuntut `RESERVED`, sehingga booking baru tak muncul di antrean).
- **Perpanjangan:** CTA kartu tugas kini dinamis mengikuti state renew — `DP_SECURED` → Catat Meter (`/renew-requests?status=DP_SECURED`), `AWAITING_DP` → Konfirmasi DP, `PENDING_DECISION` → Lihat. Label filter `DP_SECURED` di halaman renew disesuaikan jadi "Perlu Meter / Pelunasan".
- **Backend:** `createRenewUtilityCheckpointLineTx` tidak lagi membuat `InvoiceLine` qty=0 saat pemakaian tertutup jatah gratis (melanggar `invoice_line_non_negative_chk`); meter tetap dicatat, line dilewati.
- **Cleanup:** section "Visual Dashboard" di `DashboardAdmin` dihapus; komponen lama `GaugeChart`, `ActivityRing`, `SnippetCard`, `ComplicationGrid`, `RatingDisplay` dihapus dari repo.
- **Verifikasi:** FE `vitest run` 135/135 ✅ · BE `test:unit` 74/74 ✅ · build FE ✅ (PWA passed) · build BE ✅ · Playwright: dashboard menampilkan lane "Review booking" dan CTA membuka `/stays?status=BOOKINGS` dengan row "Setujui".

**Perubahan:** `frontend/src/pages/dashboard/DashboardAdmin.tsx`, `frontend/src/pages/dashboard/dashboardShared.tsx`, `frontend/src/pages/stays/stayPredicates.ts`, `frontend/src/pages/stays/StaysPage.tsx`, `frontend/src/pages/renew-requests/RenewRequestsAdminPage.tsx`, `backend/src/modules/stays/stays-service.helpers.ts`, `docs/M17_PORTAL_FLOW_RINGKAS.md`.

## 2026-08-18 — Settings: kredensial Tuya & VAPID pindah ke Owner Settings (env minimal)

- **OperationalSetting** + migration `20260818000000_settings_tuya_vapid`: kolom `tuyaAccessKey/SecretKey/ApiBase` + `vapidPublicKey/PrivateKey/Subject` (owner-settable; secret tak pernah dikirim ke client).
- **tuya-client** & **push.service**: baca kredensial DB dulu, env fallback; refresh runtime saat owner update (tanpa restart).
- **UI Owner → Pengaturan**: section baru "Tuya IoT Cloud" + "Web Push (VAPID)" (pola sama dengan Brevo).
- **`.env` minimal**: hanya 9 key esensial. DeepSeek/Brevo/Tuya/VAPID diisi via UI Owner.

**Perubahan:** `backend/prisma/schema.prisma`, migration baru, `tuya-client.service.ts`, `push.service.ts`, `settings.*`, `OwnerSettingsPanels.tsx`, `api/settings.ts`, `make-deploy.mjs`, `.env.production.example`, `bootstrap-production-schema.sql`.

## 2026-08-18 — Go-live: lengkapi data tenant (email + koreksi F1/I)

- **Email 4 tenant** yang tadinya kosong kini terisi di `seed-prod.js` + `tenant-data-template.tsv`: Yofi (G) `jtt1234511@gmail.com`, Lovandra (J) `lovandra.fachri103@gmail.com`, Destarika (L) `desterikahasan@gmail.com`, Gabriel (M) `gabrielexcelly1908@gmail.com`.
- **Kamar F1:** tenant diganti dari Yufita Hieng (NIK 6405025701970003, F, tgl 26) → **GUNAWAN** (NIK 1505062511740001, M, tgl 27). Email GUNAWAN masih kosong.
- **Kamar I:** nama tampil diubah `Agus Settiyo Budi` → **Theo Wijaya** (NIK tetap 3571021308860003, atas nama Agus Settiyo Budi).
- **Status email:** 12/13 tenant sudah ber-email; sisa 1 (GUNAWAN, F1).

**Perubahan:** `backend/scripts/seed-prod.js`, `docs/tenant-data-template.tsv`, `docs/GO_LIVE_DATA_ISI.md`, `docs/FORM_ISI_DATA_GO_LIVE.md`, `docs/M11_DEFAULT_DATA.md`.

## 2026-08-18 — CSS: definisikan 27 token yang dipakai tapi tak pernah didefinisikan

- **00-tokens.css:** 27 custom property yang dirujuk `var(--token)` di 05-staff/06-tenant/04-operations/10-misc/11-public-pages tapi tidak pernah didefinisikan — style diam-diam fallback/rusak tanpa error (mis. `.staff-badge-danger` background kosong). Nilai diambil dari history `styles.css` (commit 6479352^, theme staf hijau) + infer pola fallback existing.
- **Yang ditambahkan:** `--k48-info/-soft`, `--k48-radius-card`, `--k48-shadow-card/-hover`, `--k48-staff-danger-strong/-soft`, `--k48-staff-warning/-soft`, `--k48-staff-success/-soft`, `--k48-staff-info/-soft`, `--k48-staff-border`, `--k48-staff-shadow-card/-float`, `--k48-staff-radius-card`, `--ops-blue/-ink/-muted/-glow/-text`, `--pub-radius-card`, `--density-body`, `--text-base`, `--bg-subtle`, `--ff-mono`.
- **Verifikasi:** build FE ✅ (`built in 42.53s`, PWA passed) · `vitest run` 135/135 ✅.

**Perubahan:** `frontend/src/styles/00-tokens.css`.

## 2026-08-17 — Optimasi deploy shared hosting: Prisma tanpa engine binary + AutoOps interval mati di produksi

- **Prisma:** `binaryTargets` dihapus dari `schema.prisma`. Runtime sudah memakai driver adapter (`@prisma/adapter-pg` → query compiler WASM), sehingga binary engine (`query_engine-windows.dll.node` 21 MB, `query_engine_bg.wasm` 2.3 MB, `query_engine_bg.js`) tidak lagi digenerate/dipakai. Hasil: `dist` 58 MB → 35 MB, `src/generated/prisma` 41 MB → 19 MB (hemat ±23 MB per deploy).
- **Auto-Ops:** `.env.production.example` diselaraskan dengan `deploy/.env.example` — shared hosting/Passenger wajib `AUTO_OPS_ENABLED=false` + `AUTO_OPS_CRON_TOKEN` (cPanel Cron panggil `POST /api/auto-ops/cron`), karena `setInterval` in-process tak andal saat proses di-idle.
- **Verifikasi:** backend `tsc --noEmit` ✅ · `test:unit` 74/74 ✅ · build sukses.

**Perubahan:** `backend/prisma/schema.prisma`, `backend/.env.production.example`.

## 2026-07-30 — Tenant awam: modal bayar ringkas + label kategori & jargon disederhanakan

- **TenantInvoiceDetailPage:** modal "Bayar & Kirim Bukti" kini hanya menampilkan form inti (Jumlah Dibayar pre-filled + Metode Pembayaran + Bukti pembayaran). Field opsional (Nama Pengirim, Bank Pengirim, Nomor Referensi, Catatan) dilipat ke toggle "Info tambahan (opsional)".
- **Label kategori laporan:** disinkronkan antara form buat laporan & badge tampil — "Air / Plumbing" → "Air / keran bocor", "Furniture" → "Perabot kamar", "Bantuan Masuk Kamar / Keluar" → "Masuk / keluar kamar", "Tagihan / Admin" → "Tagihan / Pembayaran".
- **MyInvoicesPage:** jargon disederhanakan — "Tingkat Pelunasan" → "Progres Pembayaran", "Tagihan per Status" → "Status Tagihan", "Status dan aksi..." → "Lihat status dan cara bayar di tabel".
- **Test:** `navigation.test.ts` diperbarui (OWNER kini 2 grup nav setelah perubahan "Lainnya"). `tsc` FE ✅ + `vitest run` ✅.

**Perubahan:** `TenantInvoiceDetailPage.tsx`, `MyInvoicesPage.tsx`, `MyTicketsPage.tsx`, `utils/tenantCopy.ts`, `styles/10-misc.css`, `test/unit/navigation.test.ts`.

## 2026-07-30 — Tenant awam: CTA "Bayar Sekarang" + lapor lebih jelas

- **MyInvoicesPage:** banner CTA utama "💳 Bayar Tagihan Kamu" dengan tombol besar **"Bayar Sekarang"** yang mengarah ke invoice paling mendesak (overdue → jatuh tempo terdekat). Label tombol baris disederhanakan "Bayar & Kirim Bukti" → "Bayar Sekarang".
- **MyTicketsPage:** tombol "Buat Laporan Baru" diperbesar (`size="lg"`); label kategori "Air / Plumbing" → "Air / keran bocor" (kurangi jargon Inggris).

**Perubahan:** `MyInvoicesPage.tsx`, `MyTicketsPage.tsx`.

## 2026-07-30 — Tenant awam: 3 tombol inti besar di hub aksi

- Hub aksi tenant (Panduan Kos Saya) kini punya 3 tombol inti besar & berwarna di baris atas: **Bayar Tagihan**, **Catat Meter**, **Lapor Masalah** (sebelumnya "Bayar" & "Lapor Masalah" tidak ada sebagai tombol — hanya di fact-chip/guide).
- "Bayar Tagihan" mengarah ke invoice paling mendesak (overdue/utama), atau daftar tagihan bila tak ada.
- Aksi lanjutan (Perpanjang · Ajukan Keluar · Hubungi Admin) tetap ada di baris kedua yang ringkas.
- Grid 3 kolom + varian `.primary` (biru, sentuh lebih besar) untuk memudahkan tenant gagap teknologi.

**Perubahan:** `StayQuickActions.tsx`, `ActiveStayContent.tsx`, `styles/10-misc.css`.

## 2026-07-30 — De-emphasize fitur rumit (section nav "Lainnya")

- Item "rumit" dipindah dari nav utama ke section **"Lainnya"**: admin (`Survei Penghuni`, `Reward`), owner (`Analisa Pasar (AI)`, `Loyalitas & Reward`), tenant (`Poin & Reward` saat loyalty aktif).
- Nav utama fokus ke alur inti (huni/check-in–checkout, keuangan/bayar, operasional). Route & halaman **tidak dihapus** — tetap reachable dari "Lainnya".
- `referral`/`kanban` bukan item nav terpisah (berada di dalam halaman loyalty/tiket), jadi tidak ada yang terpotong.

**Perubahan:** `config/navigation.ts` (1 file).

## 2026-07-30 — By-pass tenant gagap teknologi: halaman "Bantu Penghuni"

- Halaman baru `/stays/assist` (OWNER/ADMIN) menyelesaikan 3 aksi dalam **satu layar** tanpa lompat 3 menu: (1) pilih masa sewa aktif, (2) catat meter listrik **otomatis** (`recordMeterCycle` + `autoElectricity=true` → baca counter Tuya & terbitkan tagihan `MTR-`), (3) catat pembayaran **tunai** sebesar sisa tagihan sehingga tagihan langsung LUNAS (tutup tagihan). Tagihan `DRAFT` punya tombol "Terbitkan" dulu.
- Entry point: item nav "🤝 Bantu Penghuni" (Area Admin + OWNER mode admin) + sub-nav di `/stays`.
- Memanfaatkan endpoint & komponen yang sudah ada (`recordMeterCycle`, `createPayment`, `issueInvoice`, `useInvoices`) — tanpa endpoint/backend baru.

**Perubahan:** `AssistTenantPage.tsx` (baru), `App.tsx`, `config/navigation.ts`, `config/routeTitles.ts`, `pages/stays/StaysPage.tsx`. Build frontend ✅ (PWA verified).

## 2026-07-30 — IoT on-demand kumulatif tanpa cron + auto-read meter

- **Arah baru:** kWh meter Tuya dibaca **on-demand** (kumulatif `add_ele`), bukan polling cron. Cron `iot/tuya/cron` dihapus dari runbook; `IOT_TUYA_POLL_ENABLED=false` wajib.
- **Auto-read:** `POST /meter-readings/cycle` kini menerima `autoElectricity=true` + `electricityReadingValue` opsional — backend baca counter Tuya kumulatif on-demand (`IotService.readRoomElectricityCumulative`), lalu hitung selisih vs titik acuan (`MeterReading`) terakhir dan terbitkan invoice listrik (`MTR-`) dengan jatah gratis 30 kWh. Tenant tak perlu mengetik angka meter manual.
- Titik acuan tetap maju secara atomik bersama penerbitan invoice (anti double-billing via `alreadyBilledElectricityKwh`).
- Arah masa depan: ESP32 water-flow & polling pindah ke Raspberry Pi; app ini cukup membaca dari Pi.

**Perubahan:** `iot.service.ts`, `meter-readings.service.ts`, `record-meter-cycle.dto.ts`, `meter-readings.module.ts` + dokumentasi M08/M15.

## 2026-07-30 — Eksekusi Fase AO lanjutan (AO-17..AO-20, AO-22)

- **AO-17:** homepage publik state jujur — hero/stats bedakan loading/error/penuh/kosong (tanpa "0 kamar" hijau), CTA lead-capture WhatsApp saat penuh, teaser katalog jadi waitlist saat 0 bookable, hapus quote hero berulang.
- **AO-18:** trust grid 4+1 → 3+2; mark 01–05 → ikon semantik `aria-hidden`; tag FAQ sentence case.
- **AO-19:** cue galeri `Lihat` selalu terlihat pada focus-visible & perangkat touch (sebelumnya hover-only).
- **AO-20:** strip kondisi dapat CTA "Buka prioritas"; toolbar Owner dikelompokkan (Scope data/Tampilan/Status sistem, gap 16px); state AI belum dikonfigurasi dapat manfaat faktual + CTA `/settings?tab=ai`.
- **AO-22:** `ActionQueueTable` 5 prioritas Admin dipindah sebelum `Metrik Cepat` (hierarchy banner → warning → antrean → KPI).
- **Build:** frontend `tsc -b && vite build` ✅ (162 chunks, PWA verified).

**Catatan:** AO-18/19/20 bersifat parsial — inventaris aset (AO-19), pembedaan state KPI + label aksi prioritas (AO-20), dan polish copy homepage (AO-18) menunggu re-audit AO-14. AO-21/AO-23/AO-03/AO-13/AO-14 tetap terbuka (butuh koordinasi AppLayout + fixture/kredensial UAT + verifikasi visual).

## 2026-07-30 — Audit menyeluruh + fix I-01

- Audit statis lintas scope (keamanan, atomisitas keuangan, race/transaksi, hooks-order frontend) selesai; hasil dibukukan di `docs/M16_AUDIT_MENYELURUH.md`. Risk 🟢 LOW, tanpa temuan HIGH/kritis.
- **I-01:** validasi mutasi stok (`inventory-movements`) dipindah ke dalam transaksi yang sama agar pembacaan stok memakai baris yang sudah `FOR UPDATE`; menghilangkan TOCTOU pada pesan error.
- Baseline: backend `test:unit` 74/74 · frontend `vitest run` 135/135 · build FE PWA verified.
- File scratch audit Cline diarsipkan ke `docs/archieve/`.

**Perubahan:** `inventory-movements.service.ts` (1 file backend) + dokumentasi M12/M13/M16.

## 2026-07-30 — Triage audit dashboard Area Admin desktop

- Review eksternal Admin dipetakan ke `DashboardAdmin.tsx`, queue/alert component, dan shell shared; skor otomatis tidak dijadikan metrik release tanpa audit dinamis ADMIN/OWNER.
- Dibuka AO-22 P1 untuk hierarchy exception dan queue-first action; dibuka AO-23 P2 untuk normalisasi komponen/shell desktop yang harus dikoordinasikan dengan AO-21.
- Koreksi audit mentah: `ActionQueueTable` dengan deadline/CTA sudah ada, tetapi muncul setelah metrik; health chip sudah memiliki ikon + teks; sidebar sudah collapse. Perubahan berfokus pada urutan dan pattern yang belum redundant.
- Kontras tetap merge AO-08; lokasi/assignee/owner/due date tidak dibuat tanpa kontrak data dan semua interaksi hover/focus/keyboard menunggu UAT.

**Perubahan:** dokumentasi dan antrean kolaboratif saja; tidak ada kode aplikasi, schema, dependency, atau data yang diubah.

## 2026-07-30 — AO-08/AO-15/AO-16: Kontras WCAG, Footer Group, Empty State + Shortlist

- **AO-08 🟡 P2:** Perbaiki 13 pelanggaran kontras WCAG AA — token publik diperkuat (`--pub-text-soft` #475569→#334155, `--pub-text-muted` #64748b→#475569, `--pub-text-dim` #94a3b8→#64748b); 8× hardcoded `#94a3b8`→`#64748b`; `#cbd5e1`→`#64748b` (placeholder kamar); `#4ade80`→`#15803d` (harga wizard). File: `00-tokens.css`, `11-public-pages.css`.
- **AO-15 🟢 P3:** Footer publik dikelompokkan semantik: 3 grup (`Cari Kamar`, `Bantuan`, `Kontak & Akun`) dengan heading `<h3>` dan `<nav aria-label>`. File: `publicGuestShared.tsx`, `11-public-pages.css`.
- **AO-16 🟡 P2:** Empty state katalog dibedakan: filter aktif → "Tidak ada kamar yang cocok" + tombol reset; tanpa filter → "Belum ada kamar tersedia". Shortlist perbandingan dipersist ke `sessionStorage` (bertahan navigasi detail/back). File: `PublicRoomsPage.tsx`.

## 2026-07-30 — Triage audit dashboard Owner desktop

- Masukan audit eksternal dashboard Owner disaring ke bukti `CODE`; skor otomatisnya tidak dijadikan metrik release karena audit OWNER dinamis masih menunggu fixture UAT.
- Dibuka AO-20 P1 untuk alert/actionability, pengelompokan toolbar, state data KPI, dan CTA setup AI; dibuka AO-21 P2 untuk sistem visual, penamaan workspace, serta density shell terkoordinasi.
- Tidak semua rekomendasi diterima mentah: sidebar collapse 260→60 px sudah tersedia, status utama mempunyai label teks dan bukan color-only murni, sementara owner/due/risk tidak akan dibuat tanpa kontrak API.
- Kontras Owner digabungkan ke AO-08 dan harus diukur pada surface nyata; validasi hover/focus/keyboard ditunda ke crawl OWNER/AO-14.

**Perubahan:** dokumentasi dan antrean kolaboratif saja; tidak ada kode aplikasi, schema, dependency, atau data yang diubah.

## 2026-07-30 — Verifikasi page-level homepage produksi

- Audit read-only produksi mengonfirmasi API sehat dengan 0 kamar bookable, 13 occupied, total 13; hero nol kamar adalah state bisnis nyata, bukan error jaringan.
- Bukti DOM/visual: tujuh blok hero, overlay gelap tanpa CSS blur, trust grid 4+1, cue galeri opacity 0 sampai hover, FAQ uppercase, copy empty-review berulang, dan 11 link footer dalam satu grup.
- Dibuka AO-17 P1 untuk hero/teaser state nol, AO-18 P2 untuk hierarki/trust homepage, dan AO-19 P2 untuk audit aset/cue galeri.
- Kontras digabung ke AO-08 dan struktur footer ke AO-15. Google Maps info-window dikeluarkan karena dikendalikan pihak ketiga.
- Rekomendasi seal palsu, menyebut properti “exclusive/new” saat ulasan kosong, serta klaim respons `24/7` ditolak. Trust copy hanya boleh memakai fakta owner, termasuk CCTV area bersama yang tercatat di M02.
- Dua screenshot viewport produksi bebas PII ditambahkan ke `docs/assets/m14-uiux-audit/`.

**Perubahan:** dokumentasi + bukti screenshot publik; tidak ada kode aplikasi, dependency, schema, atau data yang diubah.

## 2026-07-30 — Eksekusi Fase AO: perbaikan UI/UX lintas portal

- **AO-00:** 2 migration UAT pending (`announcement_notification_delivery` + `public_room_availability`) diterapkan via `prisma migrate deploy` — DB UAT up-to-date, 500 error di notifikasi/pengumuman/katalog teratasi.
- **AO-01:** `PublicRoomsPage` — count bar kini menampilkan pesan error alih-alih "0 kamar" saat API gagal, tidak bertentangan dengan kalender ketersediaan.
- **AO-02:** `MyLoyaltyPage` — guard redirect `loyaltyDisabled` dipindah setelah semua hooks; query loyalty pakai `enabled` agar urutan hooks selalu konsisten, mencegah ErrorBoundary.
- **AO-04:** `GettingStartedGuide` — dibatasi hanya di `/portal/stay` dan `/portal/bookings` via `useLocation`, tidak lagi mendominasi semua route tenant.
- **AO-05:** `ActiveStayContent` — timeline "Masa sewa" kini menampilkan "Lewat jadwal" (tone: blocked) saat overdue, bukan "Aktif" yang membingungkan tenant.
- **AO-06:** `LoginPage`, `ForgotPasswordPage`, `ProfilePage` — `Form.Group` mendapat `controlId`, input mendapat `id`, error punya `id` + `role="alert"` untuk asosiasi label programatik.
- **AO-07:** `ProfilePage` — overflow-x hidden di `.tenant-profile-onboarding-card` + `max-width: 100%` di `.profile-field-control` untuk mencegah overflow 7px di mobile.
- **AO-09:** `PublicGuestDashboardPage`, `FaqPublicPage`, `ReviewsPublicPage`, `LoginPage`, `ForgotPasswordPage` — tambah `<main id="main-content">` / ubah `<section>` ke `<main>`.
- **AO-10:** `MyManualPage` — `TabContent` diubah dari Card bertumpuk menjadi `Accordion` (progressive disclosure) untuk mobile.
- **AO-11:** Filter invoice mobile — tambah overflow gradient mask, `min-height: 44px`, `flex-shrink: 0`, scrollbar disembunyikan, sentuhan lebih mudah.
- **AO-12:** `vite.config.ts` — tambah proxy `/api` + `/uploads` ke `http://localhost:3000` agar `npm run dev` langsung terhubung backend.
- **Build:** backend `tsc --noEmit` ✅ · frontend `tsc -b && vite build` ✅ (162 chunks, PWA verified).

## 2026-07-30 — Integrasi guideline page-level katalog publik

- Dua puluh guideline Search Results Page dipetakan ke `/rooms`; KOST48 tidak memiliki sitewide text search sehingga istilah e-commerce tidak diterapkan secara literal.
- Lima guideline assessed tidak diberi label pass/fail karena nilai assessment tidak tersedia pada masukan owner.
- Thumbnail, harga, struktur card, jumlah hasil, atribut mobile, sorting, filter, dan pagination terdeteksi di kode lalu dijadikan gate dinamis AO-14 setelah migration pulih.
- Rating per kamar, typo query, combine variations, dan featured promo mobile dikeluarkan atau diadaptasi karena tidak sesuai model data/tujuan katalog kost.
- Dibuka AO-16 P2: empty state filter saat ini salah menyimpulkan semua kamar penuh dan shortlist perbandingan belum bertahan saat detail/back.

**Perubahan:** dokumentasi saja; tidak ada kode aplikasi, dependency, schema, atau data UAT yang diubah.

## 2026-07-30 — Integrasi masukan Baymard UX-Ray ke Fase AO

- Export UX-Ray owner disaring berdasarkan tingkat kepastian: hanya 5/317 guideline auto-rated, 2 `Not Applicable`, dan 310 `Not Rated`; item yang tidak dinilai tidak dicatat sebagai defect.
- Empat sinyal `Best-in-Class`—guided browsing, kategori navigasi, visibilitas akun, dan hierarki homepage—ditambahkan ke M14 sebagai regression guard.
- Satu `Small Issue` organisasi link footer dikonfirmasi melalui kode dan dibuka sebagai AO-15 P3.
- Guideline relevan yang belum dinilai dijadikan gate AO-14: transparansi biaya, status kamar, filter/back-state, galeri, ulasan, serta CTA/input booking.
- Guideline generik cart, shipping, kartu kredit, dan gifting dikeluarkan karena industry UX-Ray belum dipilih dan tidak sesuai model bisnis kost.

**Perubahan:** dokumentasi saja; tidak ada kode aplikasi, dependency, schema, atau data UAT yang diubah.

## 2026-07-30 — Audit mendalam UI/UX lintas portal (Fase AO)

- Audit browser nyata mencakup **66 kombinasi route–viewport**: 7 route publik, 13 route tenant tanpa stay aktif, dan 13 route tenant aktif pada desktop/mobile.
- Audit statis memeriksa **74 deklarasi route**, role guard, navigasi STAFF, state loading/error/empty, dan titik aksesibilitas utama.
- Dibuat `docs/M14_AUDIT_UI_UX.md` sebagai sumber kerja kolaboratif AO-00..AO-15; M00, M01, dan M12 disinkronkan.
- Gate P0: database UAT memiliki dua migration pending. Dampak teramati berupa 500 katalog publik, notifikasi, dan pengumuman serta state publik yang saling bertentangan.
- Temuan utama lain: urutan hook halaman loyalitas, duplikasi shell tenant mobile, semantik stay lewat periode, asosiasi label auth/profile, overflow profil 7 px, kontras, landmark, dan kepadatan manual/filter mobile.
- Crawl OWNER/ADMIN/STAFF belum diklaim lulus karena akun fixture UAT belum tersedia. Tidak ada kredensial atau bukti berisi PII yang dimasukkan ke repository.

**Perubahan:** dokumentasi dan dua screenshot publik bebas PII saja; belum ada perubahan kode aplikasi atau schema.

## 2026-07-30 — Finalisasi hardening pasca verifikasi commit 6223a30

- **S-01 benar-benar atomik:** `renew-requests.service.ts:createRequest()` sekarang menjalankan lock Stay, validasi ownership/status, cross-check checkout/invoice/renew, dan `renewRequest.create()` dalam satu interactive transaction. Lock tidak lagi dilepas sebelum check–create selesai.
- **OS-05 lintas ticket–routine:** `staff-routines.service.ts:start()` mengambil `FOR UPDATE` pada row User yang sama dengan `tickets.service.ts:start()`, lalu memeriksa dan menulis pekerjaan aktif dalam transaksi tersebut.
- **X4 seluruh boundary WIB:** bucket dengan `resetAt === dayStart` kini dikeluarkan dari remaining quota dan usage stats, bukan hanya di-reset oleh `checkRateLimit()`.
- **N+1 peer report selesai:** tambah `AppNotificationService.createManyOnce()`; fan-out admin/owner memakai satu lookup duplikat + satu `createMany`, bukan N pemanggilan `createOnce()`.
- **Accounting docs sinkron:** boundary runtime menjelaskan journal operasional BLOCKING dan `skipSilent()` hanya untuk kasus benign/idempoten/adjustment opsional.
- **Regression coverage:** tambah 7 test khusus untuk transaksi S-01, lock OS-05, dua boundary X4, bulk notification, strict journal, dan atomisitas WiFi.

**Gate:** backend build ✅ · `tsc --noEmit` ✅ · 74/74 unit test PASS ✅ · frontend build 162 chunks + PWA verification ✅.

## 2026-07-29b — Koreksi pasca-audit: race condition, journal BLOCKING, atomisitas WiFi

- **S-01 🔴 Race renew vs checkout:** `renew-requests.service.ts` — `findUnique` diganti `$queryRawUnsafe SELECT ... FOR UPDATE` pada Stay. Renew & checkout kini sama-sama mengunci row Stay sehingga hanya satu yang menang.
- **OS-05 🔴 Guard single-active ticket:** `tickets.service.ts:start()` — tambah `SELECT ... FOR UPDATE` pada row User staf sebelum cek tiket aktif. Dua transaksi paralel pada tiket berbeda tidak bisa lagi sama-sama lolos.
- **Journal BLOCKING sejati:** `accounting-posting.service.ts` — `skip()` sekarang throw `InternalServerErrorException` (bukan return silent). `postBalancedJournalTx` throw untuk semua precondition error (unbalanced, no period, period closed, line < 2). Case idempoten (journal sudah ada) tetap return soft. ADJUSTMENT/DEPRECIATION tetap pakai `skipSilent()`.
- **Expenses BLOCKING:** `expenses.service.ts` — hapus `.catch()` di `postExpense`. Journal expense gagal → throw.
- **OS-01 Atomisitas WiFi:** `wifi-sales.service.ts` — `wifiSale.create` + `postWifiSaleTx` dibungkus `$transaction`. Jika jurnal gagal, sale ikut rollback.
- **X4 Fix resetAt equality:** `owner-ai.service.ts` — `b.resetAt < dayStart` → `b.resetAt <= dayStart`. Bucket rate-limit kini reset tepat saat hari baru.
- **N+1 peer report:** `loyalty/peer-report.service.ts` — loop `for` sequential diganti `Promise.all`.
- **Cleanup:** trailing whitespace + backup file sed dihapus.

**Gate:** tsc 0 errors ✅ · 67/67 test PASS ✅ · FE build 162 chunks PWA ✅

## 2026-07-29 — Hardening keuangan + lintas scope pasca audit deep (Fase AN + TODO MX)

- **AN-01 🔴 Deposit ledger blocking:** `payment-submissions.service.ts` — 2 try/catch (deposit ledger + liability journal) dihapus. Jika ledger/jurnal gagal, approval payment submission sekarang throw → seluruh transaksi rollback. Sebelumnya: best-effort (logger.warn, approval tetap lanjut).
- **AN-02 🟠 Journal posting blocking:** `payment-submissions.service.ts` — try/catch + `journalPending=true` dihapus. Journal posting gagal → throw, transaksi batal. Variabel `journalPending` dihapus. Method `retryJournalPosting` dipertahankan untuk legacy data.
- **AN-03 🟠 Seragamkan 9 call site journal → BLOCKING:** `.catch()` dihapus dari 6 file: `tenant-bookings.service.ts`, `stays-renewal.service.ts` (2 titik), `stays.service.ts` (3 titik: check-in deposit, invoice awal, damage invoice), `room-transfer.service.ts`. Semua journal posting kini BLOCKING — tidak ada lagi silent data loss.
- **AN-04 🟡 Fix dedupe deposit ledger:** `deposit-ledger.service.ts` — `sourceId` kini menyertakan `invoicePaymentId` (format `PS_xxx_IP_yyy`) agar setoran jaminan ke-2 tidak kena dedupe false positive.
- **AN-05 🟡 4 unit test keuangan:** `pricing.test.js` (4 test), `periode.test.js` (2 test), `cashflow-classifier.test.js` (5 test), `financial-ratios.helper.test.js` (8 test). Semua 19 test baru PASS. Total backend: 67/67 PASS.
- **AN-06 🟢 Auto-reject sweeper:** `booking-sweep.service.ts` — payment submission PENDING_REVIEW → REJECTED (sebelumnya: EXPIRED).
- **X1 (=AN-03):** Semua journal posting best-effort diseragamkan → BLOCKING.
- **X2 🟠 Extract assertOwnerOrAdmin:** 4 private method duplikat → 1 shared function di `common/guards/owner-admin.guard.ts`. 13 titik pemanggilan di-refactor.
- **X3 🟠 AppConfigService:** Service terpusat untuk SEMUA env var (11 section, 80+ var). Validasi startup (production wajib DATABASE_URL, warning untuk missing keys). Caching: tiap env var dibaca sekali. Wiring: `main.ts` (CORS, rate limit). `@Global()` module — siap injection di semua module.
- **X4 🟠 Fix timezone owner-ai:** 3 lokasi `new Date().setHours(0,0,0,0)` → `startOfJakartaBusinessDay(new Date()).getTime()`. Rate limit & usage stats kini WIB-aware.
- **S-01 🔴 Cross-block renew/checkout:** `stays-renewal.service.ts` + `checkout-requests.service.ts` — keduanya kini `FOR UPDATE` lock Stay + cross-check status opposite operation. Renew tolak jika checkout PENDING/APPROVED; checkout tolak jika renew PENDING/DP_SECURED.
- **OS-01 🔴 WiFi journal blocking:** `wifi-sales.service.ts` — `.catch()` dihapus. Journal WiFi gagal → throw.
- **OS-04/05 🟡 Ticket assign/start race condition:** `tickets.service.ts` — method `assign` dan `start` dibungkus `$transaction` + optimistic lock (`updateMany` dengan WHERE condition pada `assignedToId` + `status`). ConflictException jika data berubah sejak read.

**File berubah (backend):** 16 file + 5 file baru.
**Gate:** `tsc --noEmit` BE ✅ (0 errors) · `npm run test:unit` 67/67 PASS ✅ · `npm run build` FE ✅ (162 chunks, PWA verified).

## 2026-07-29 — Deep audit siklus huni + integrasi ke M05

- **Deep audit terhadap laporan M16 (Reasonix):** verifikasi line-number claims di 7 file backend + `grep` seluruh `.catch()` di `backend/src`. Akurasi M16: 85% — 3 best-effort journal tercatat, 6 hilang.
- **Temuan kunci:** 9 titik best-effort journal di siklus huni (HS-01 s/d HS-09), termasuk 2 CRITICAL di `payment-submissions.service.ts:898-916` (deposit ledger + liability journal — tumpang tindih dengan Fase AN). S-01 (cross-block race condition) severity dikoreksi MEDIUM → HIGH.
- **Risk rating dikoreksi:** MODERATE (3 HIGH) → HIGH (1 CRITICAL, 8 HIGH).
- **Cross-reference ke Fase AN:** HS-07 = AN-01 (deposit ledger blocking), HS-08 = AN-02 (deposit liability journal). HS-01 s/d HS-06 + HS-09 tambahan murni siklus huni.
- **Dokumen diperbarui:** `docs/M05_SIKLUS_HUNI.md` (section Deep Audit baru, 50+ baris), `docs/M12_CHECKLIST_CHANGELOG.md` (Fase M16-Deep). File standalone `AUDIT_LAPORAN_SIKLUS_HUNI.md` dihapus (bukan MXX).

## 2026-07-29 — Verifikasi Codex Sol + koreksi M01/M05/M06

- **18 temuan deep audit diverifikasi oleh Codex Sol (model tertinggi):** 12 BENAR (67%), 1 SALAH (A9 — expenses BUKAN kontrol positif, create() juga best-effort), 5 PARSIAL (B1/B4/C1/D1/A7).
- **Koreksi diterapkan:** (1) Root cause journal — tidak ada modul 100% blocking. (2) C1 timezone — `setHours()` pakai TZ lokal, bukan selalu UTC. (3) B1 cross-block — `renewRequest.createRequest()` TIDAK pakai $transaction sama sekali. (4) B4/IV-01 severity downgrade HIGH→MEDIUM — FOR UPDATE sudah mencegah ghost-stok. (5) A7 terminologi — record WifiSale, bukan invoice. (6) D1 — duplikasi semantik, bukan byte-identik. (7) A9 — expenses.create() juga best-effort, pola blocking hanya di confirmExpense().
- **Dokumen dikoreksi:** `docs/M01_MASTER.md` (5 edit), `docs/M05_SIKLUS_HUNI.md` (1 edit), `docs/M06_OPERASIONAL.md` (2 edit), `docs/M12_CHECKLIST_CHANGELOG.md` (MX-Verify).

## 2026-07-29 — Audit lintas scope + integrasi ke M01

- **Cross-scope audit 8 domain (Reasonix):** identifikasi interaksi antar scope, inkonsistensi, peluang shared module, dan efisiensi kode.
- **1 CRITICAL:** Journal posting best-effort di 7 scope → semua mengirim data ke keuangan via `.catch()`, hanya expenses yang benar (BLOCKING).
- **2 HIGH:** (1) Timezone inconsistency — `owner-ai.service.ts` pakai UTC midnight (bug WIB), `staff-performance` pakai raw offset. (2) DRY violations — `assertOwnerOrAdmin` 4 duplikat, 20+ boilerplate pagination.
- **10 rekomendasi X1-X10:** prioritas X1-X4 harus sebelum go-live. X1 (journal blocking) = paling kritis.
- **Temuan arsitektural:** Scope Keuangan adalah **sink** — semua scope mengirim data ke sana. Harus jadi scope paling ketat, bukan paling longgar.
- **Dokumen diperbarui:** `docs/M01_MASTER.md` (section Audit Lintas Scope ~150 baris), `docs/M12_CHECKLIST_CHANGELOG.md` (Fase MX).

## 2026-07-29 — Deep audit IoT & telemetri + integrasi ke M06

- **Deep scan modul iot/ (Reasonix):** 10 file, 1911 baris — Tuya client, ESP32 water ingest, polling, device credentials.
- **Temuan: 0 isu.** 0 best-effort journal, 0 race condition. Semua auth benar: HMAC timingSafeEqual untuk ESP32, cron token timingSafeEqual, polling mutex, RateLimitGuard di endpoint publik.
- **4 positive patterns:** cron token anti-timing, ESP32 HMAC anti-forgery, polling mutex anti-double-poll, RateLimitGuard anti-DDoS.
- **Dokumen diperbarui:** `docs/M06_OPERASIONAL.md` (section Deep Audit IoT), `docs/M12_CHECKLIST_CHANGELOG.md` (Fase M22-Deep).

## 2026-07-29 — Deep audit AI & growth + integrasi ke M07

- **Deep scan 7 modul AI/growth (Reasonix):** owner-ai, ai, market-analysis, loyalty, analytics, ancillary-revenue — 2599 baris.
- **Temuan: 0 isu baru.** 0 best-effort journal, 0 race condition. Positive patterns: loyalty redemption FOR UPDATE lock (anti-overselling), owner-ai OWNER-only segregation, AI cache prune/cap.
- **Domain terbersih** dari semua 7 domain yang diaudit.
- **Dokumen diperbarui:** `docs/M07_PUBLIK_GROWTH.md` (section Deep Audit AI), `docs/M12_CHECKLIST_CHANGELOG.md` (Fase M21-Deep).

## 2026-07-29 — Deep audit notifikasi & sistem + integrasi ke M06

- **Deep scan 6 modul notifikasi/sistem (Reasonix):** notifications, push, announcements, settings, users, auth — 1138 baris.
- **Temuan: 0 isu.** 0 best-effort journal, 0 race condition. Semua `.catch()` acceptable (push subscription housekeeping, email reset enumeration-safe, notifyPublished). Positive pattern: auth refresh token rotation P0-01 dalam `$transaction`.
- **Domain paling bersih** dari semua domain — bersama publik/marketing.
- **Dokumen diperbarui:** `docs/M06_OPERASIONAL.md` (section Deep Audit Notifikasi), `docs/M12_CHECKLIST_CHANGELOG.md` (Fase M20-Deep).

## 2026-07-29 — Deep audit inventaris + integrasi ke M06

- **Verifikasi AUDIT_LAPORAN_INVENTARIS.md (Reasonix):** audit existing 85% benar — line counts akurat, staff access verified, 0 .catch() terkonfirmasi.
- **Koreksi:** IV-01 (I-01 di audit existing) severity MEDIUM→HIGH. `validateMovement()` di luar `$transaction` = read-check-write race. Bisa ghost-stok jika 2 admin drain stok bersamaan. Pola sama dengan S-01 (M05) dan OS-04 (M06).
- **3 positive pattern kuat:** room-item create/qty DIBLOKIR (paksa lewat mutasi stok), inventory create SATU `$transaction` (stok awal + movement + sync), movement update DIBLOKIR (harus buat koreksi).
- **Dokumen diperbarui:** `docs/M06_OPERASIONAL.md` (section Deep Audit Inventaris), `docs/M12_CHECKLIST_CHANGELOG.md` (Fase M19-Deep). File standalone `AUDIT_LAPORAN_INVENTARIS.md` dihapus (bukan MXX).

## 2026-07-29 — Deep audit publik & marketing + integrasi ke M07

- **Deep audit 6 modul publik/marketing (Reasonix):** `grep` `.catch()` + `@Public` + auth bypass + data leak di marketing, faqs, surveys, guest-preferences, loyalty/peer-report, market-analysis (17 file, 1834 baris).
- **Temuan:** 2 isu — PM-01 silent swallow notifikasi peer-report (LOW), PM-04 PIN-based auth wizard ketersediaan (MEDIUM). 0 best-effort journal, 0 race condition, 0 auth bypass, 0 data leak.
- **Domain paling bersih** dari 4 domain yang diaudit — 6 modul backend BERSIH, auth guard verifikasi benar, data leak prevention aktif (`notes:false`), `timingSafeEqual` untuk PIN.
- **Dokumen diperbarui:** `docs/M07_PUBLIK_GROWTH.md` (section Deep Audit baru), `docs/M12_CHECKLIST_CHANGELOG.md` (Fase M18-Deep).

## 2026-07-29 — Deep audit operasional & staf + integrasi ke M06

- **Deep audit 11 modul operasional (Reasonix):** `grep` seluruh `.catch()` + `$transaction` + read-check-write pattern di tickets, wifi-sales, additional-services, staff-field-reports, staff-routines, staff-dashboard, staff-performance, tenant-staff-reviews, announcements, dan 6 auto-ops sweeps (total 5782 baris).
- **Temuan:** 5 isu baru — OS-01 best-effort journal WiFi sale (HIGH), OS-02 silent swallow tiket (MEDIUM), OS-03 silent swallow announcements (MEDIUM), OS-04 race condition ticket assign (MEDIUM), OS-05 race condition ticket start (MEDIUM). 7 modul BERSIH tanpa isu.
- **Auto-ops 6 sweeps diverifikasi:** semua `.catch()` adalah notifikasi best-effort yang sesuai pola M06 §Dossier 16. Tidak ada best-effort journal di sweeps.
- **Cross-reference:** OS-01 setara HS-01..HS-03 (best-effort journal) → harus dikoordinasikan dengan AN-03. OS-04/OS-05 setara S-01 (read-check-write tanpa lock).
- **Dokumen diperbarui:** `docs/M06_OPERASIONAL.md` (section Deep Audit baru), `docs/M12_CHECKLIST_CHANGELOG.md` (Fase M17-Deep).

## 2026-07-29 — Audit mendalam keuangan & akuntansi + koreksi dokumen

- **Audit verifikasi independent** terhadap `AUDIT_LAPORAN_KEUANGAN.md` (Reasonix): akurasi ~65%. Temuan: 3 klaim P0 diverifikasi (P1-01/P1-02 confirmed, P1-03 DIKOREKSI — bukan tx terpisah, tapi SATU tx dengan try/catch swallow error). 4 unit test diklaim ada tapi BELUM dibuat (pricing, periode, cashflow-classifier, financial-ratios). PaymentSubmissionPage.tsx diklaim ada tapi TIDAK PERNAH ADA (fungsi di-embed). 6 klaim ukuran halaman + 3 path frontend dikoreksi.
- **Temuan baru (N4):** inkonsistensi journal handling — expenses pakai BLOCKING, payment-submissions pakai BEST-EFFORT. Recovery path P1-01 (`retry-journal` endpoint + sweeper) sudah ada tapi tidak disebut audit sebelumnya. P1-02 (deposit ledger) lebih risk karena TANPA recovery path.
- **Dokumen dikoreksi:** `docs/M04_KEUANGAN.md` (update stale line numbers: postBalancedJournalTx 1110-1216→1342-1448, recalculateInvoiceTotal 423-442→461-480, 10→15 fungsi posting, catatan unit test belum dibuat, tambah temuan N4).
- **Verifikasi runtime:** tsc 0 errors, backend build ✅, 48/48 unit test PASS, frontend build ✅ (162 chunks, PWA stamped).

## 2026-07-29 — Hardening UI/UX IoT owner dan penghuni

- Dashboard owner menjadi command center berbasis perhatian: status operasional, kesegaran data, kualitas GOOD/SUSPECT/REJECTED, reset counter, filter provider, detail siklus, form terkunci saat submit, dan layout mobile.
- Portal penghuni memakai snapshot periode resmi sebagai sumber utama pemakaian/tarif/estimasi; monitoring sensor dipisahkan, sedangkan loading/error/tidak cukup catatan listrik-air ditampilkan secara jujur tanpa fallback angka nol.
- Normalisasi tanggal meter mengikuti WIB, tab dan pemilih rentang mendukung keyboard, chart/gauge mobile serta kontras/fokus/reduced-motion diperbaiki.
- Verifikasi: 31 file/135 tes frontend lulus, 4/4 Playwright + Axe lulus, dan build TypeScript/Vite/PWA berhasil. TGZ stale berisi seed historis/PII sengaja tidak dimasukkan.

## 2026-07-23 — Rekonsiliasi perubahan implementasi lintas AI

> Entri ini mengonsolidasikan perubahan kode yang masuk setelah baseline changelog 2026-07-16. Ini mencakup perubahan oleh seluruh AI/kontributor pada jalur rilis, bukan hanya perubahan dokumentasi sesi ini. Baseline `main` yang diaudit: `8627289`.

| Area rilis | Commit kode yang direkonsiliasi | Keadaan produk yang berlaku | Batas/gate penting |
|---|---|---|---|
| UI/UX lintas portal | `a1f1d4e`, `d3fb612`, `7174d8b`, `aee7868`, `5e36ec1`, `2c228e1` | Komponen visual bersama, dashboard, skeleton/error state, dan perbaikan owner/admin sudah masuk. | Tetap perlu UAT visual pada viewport/role nyata. |
| IoT, dashboard, dan quota energi | `298bcca`, `d790c4b`, `763a5dc`, `3779432`, `01c6b38`, `d7be459`, `8af53d6` | Telemetri Tuya/ESP32, dashboard/detail/timeline, dan quota berbasis periode sewa lunas tersedia. | Mapping hardware, credential, dan UAT perangkat masih wajib; tidak ada auto-billing/auto-alert. |
| Inventaris dan fasilitas kamar | `1eb11d9`, `0701327` | KPI stok, gap fasilitas, auto-link yang dapat ditinjau, filter status, dan pagination akurat tersedia. | Operator memeriksa hasil auto-link; trigger stok tetap single writer. |
| Pengumuman, notifikasi, dan push | `f9387d2` | P1-P3: pagination/detail, kategori persisted, dispatch terjadwal, gambar, Bell, dan outbox push. | UAT HTTPS/VAPID serta pengumuman terjadwal sebelum go-live. |
| Hardening backend | `e327e9b` | Strict null/implicit-any aktif; renewal, booking helper, DTO dashboard, dan error handling dibersihkan tanpa mengubah kontrak bisnis. | Build/typecheck dari SHA rilis wajib lulus. |
| Konsolidasi frontend | `8a589e6` | Wrapper kompresi/ekspor duplikat dihapus, konstanta bisnis dibagi, dan CSS masuk satu entrypoint. | UAT visual lintas portal; budget CSS 135 KB gzip. |
| Artefak dan tooling UAT/deploy historis | Seri `ab21d3b`–`a0cb232`, lalu `8627289` | Seed data teraudit, perbaikan kompatibilitas tool/redeploy, dan artefak bundle pernah diperbarui. Bundle aktif kembali memuat runtime `node_modules`, sehingga server tidak menjalankan install/build. | Tidak menjadi izin memakai seed historis, `schema.sql`, atau `db push` di produksi; patch database diputuskan terpisah dari bundle. |

- Keputusan bisnis yang lahir dari integrasi ini dicatat di `M02_KEPUTUSAN_OWNER.md` D-26 s.d. D-31.
- Peta modul/file aktif diperbarui di `M00_CODEMAP.md`; status tugas/gate aktif ada di `M12_CHECKLIST_CHANGELOG.md`.

## 2026-07-23 -- Release documentation: announcement/notification and online deployment

- P1-P3 audit Pengumuman vs Notifikasi dicatat sebagai selesai: kategori notifikasi persisted, announcement dispatch terjadwal idempoten, gambar CRUD, Bell/push UAT, serta build backend/frontend lulus.
- Keputusan go-live dipertegas: buat database produksi baru/kosong tanpa menghapus database UAT atau memigrasikan data testing; sesudah go-live gunakan patch migration saja. Runbook aktif: `DEPLOYMENT_ONLINE_20260723.md`.
- Gate yang belum tertutup didokumentasikan: bootstrap guard DB bersih, bug pencarian tenant booking, dan UAT visual lintas portal.
- M06/M10/M11/M14/M15 ikut diselaraskan: implementasi IoT tidak lagi ditandai belum dibuat, dan data master lapangan tidak lagi diperlakukan sebagai seed produksi.

## 2026-07-23 -- Perbaikan audit inventaris (pagination, filter status, koreksi dok)
- **Fix pagination lowStockOnly:** meta `totalItems` kini dihitung setelah filter client-side (`effectiveTotal`), bukan unfiltered count — mencegah pagination menyesatkan saat filter "Stok Menipis" aktif.
- **Filter status server-side:** backend `InventoryItemsQueryDto` + service WHERE kini mendukung `?status=DAMAGED` (dikirim ke Prisma) — siap untuk frontend filter server-side ke depan.
- **Koreksi dok M06:** referensi trigger dari `bootstrap.sql:558-622` → `seed.sql:534-625` (lokasi function `apply_inventory_qty_delta` + trigger `inventory_movement_sync_qty_trg` yang sebenarnya).
- **Verifikasi audit:** trigger DB single-writer TERKONFIRMASI aktif dan menangani semua INSERT/UPDATE/DELETE `InventoryMovement` termasuk dari `adminReview`. False positive audit sebelumnya ("adminReview tidak sync qtyOnHand") dibantah — trigger menanganinya.

## 2026-07-19 -- Seed data asli dari laporan teraudit

- Seed `seed-dev-real.js` menggantikan `seed-dev-via-api.js` (data dummy). Data bersumber dari `Scan/KOST48_Laporan_Bulanan_FINAL_Teraudit.xlsx`.
- Output: 14 kamar (13 OCCUPIED + F3), 48 tenant + user portal (password `Kost48#2026`), 52 stay (12 ACTIVE), 186 invoice PAID, 186 payment, total Rp 219.710.000.
- Tenant aktif (Juli 2026): Shinta (A), Dini (B), Miko (C), Ade (D), Yufita (F1), Patrick (F2), Yofi (G), Welly (H), Lovandra (J), Meliana (K), Destarika (L), Gabriel (M). Theo (I) tidak ACTIVE karena last payment April 2026.
- InvoiceLine: RENT + ELECTRICITY + WIFI sesuai kwitansi asli. Semua payment method CASH.
- OperationalSetting singleton terisi (listrik Rp2.500/kWh, WiFi Rp50.000, pet deposit Rp100.000).
- File: `backend/scripts/seed-dev-real.js`, `backend/scripts/seed-data.json`. Prasyarat: `seed-dev-reset.js` dulu.

## 2026-07-18 -- Modernisasi UI/UX Owner Portal (batch 1: 7 halaman)

- Owner portal kini setara Admin/Tenant/Staff: **FeatureErrorBoundary** di 7 halaman owner (OwnerDashboard, Reports, MarketAnalysis, LossRefunds, LoyaltyAdmin, ServiceInterests, IotOverview), **StatusBadge** ganti raw Badge (17+ tempat), **TableSkeleton** ganti Spinner (3 halaman), **EmptyState** ganti inline (5 tempat), error handling secondary queries (LoyaltyAdmin).
- Build FE ✅ (16.47s) BE ✅

## 2026-07-18 -- Modernisasi UI/UX Owner Portal (batch 2: 33 celah audit mendalam)

- **CRITICAL (5):** FeatureErrorBoundary di AccountingSetupPage (55KB, 20+ query), AssetRegisterPage, SimpleCrudPage, AncillaryRevenuePage + mutation onError di AssetRegisterPage (5 mutation).
- **HIGH (8):** Badge→StatusBadge di AccountingSetupPage (4), AssetRegisterPage (6), AncillaryRevenuePage (1); Spinner→TableSkeleton di AccountingSetupPage, AssetRegisterPage (2), AncillaryRevenuePage; dead code STATUS_VARIANT dihapus dari LoyaltyAdminPage.
- **MEDIUM (12):** `useDocumentTitle` ditambahkan ke 9 halaman (OwnerDashboard, Reports, MarketAnalysis, LoyaltyAdmin, IotOverview, LossRefunds, AccountingSetup, AssetRegister, AncillaryRevenue); bug `formatRupiahLocal` di AccountingSetupPage diperbaiki.
- **LOW (8):** EmptyState fallback di AssetRegisterPage + AccountingSetupPage.
- Build FE ✅ (15.26s) PWA `ezxWxjYZ12Xj`

## 2026-07-18 -- Modernisasi UI/UX Admin Portal (9 gap)

- Admin portal kini setara Tenant & Staff: **FeatureErrorBoundary** di 3 halaman admin (AdminStaffPerformancePage, AdminSurveysPage, GuestPreferencesPage), **StatusBadge** ganti raw Badge, **PaginationControls** ganti raw Pagination, barrel file **admin-area.ts**, **TableSkeleton** ganti Spinner, **StatCard animasi** di dashboard staff performance, error handling secondary queries (leaderboard/summary/stats), **EmptyState** ganti staff-empty-box inline.
- CSS tokens: `08-admin.css` direfactor — 87 hardcoded hex colors diganti `var(--*)` dari `00-tokens.css` (gray/blue scale).
- Build FE ✅ BE ✅

## 2026-07-17 -- Audit Total IoT + Deploy Readiness + Fix Blocker

- Audit total IoT: kWh Tuya backend+frontend lengkap (HMAC-SHA256, 13 device, polling+cron, dashboard KPI), water flow ESP32 firmware compiled+backend ingest siap (hardware menunggu fisik).
- Fix 3 blocker deploy: (1) salin modul IoT + bootstrap script ke paket deploy, (2) tambah 8 variabel Tuya/IoT ke `deploy/.env.example`, (3) hapus `TUYA_PROJECT_CODE` dari docs (tidak dikonsumsi kode Tuya client).
- Optimasi memori: pool connection Prisma 5→3 (hemat ~4-6MB).
- Verifikasi build: backend `tsc --noEmit` ✅ · frontend `npm run build` ✅ (141 chunks, PWA).

## 2026-07-16 -- Fase 7 Playwright Crawl dan Fix Overflow Mobile Dashboard

- Crawl Playwright admin/owner lulus bersih di server lokal: OWNER 35/35 route render OK, ADMIN 31/31 route render OK, 0 blank, 0 temuan, 0 console/pageerror/request gagal.
- Mobile dashboard 375px sempat overflow 439px; diperbaiki lewat clamp CSS di `frontend/src/styles/08-admin.css` sehingga dashboard/stays/invoices/tickets tetap pas lebar viewport, bottom nav muncul, dan screenshot mobile tersimpan di `frontend/e2e-out/phase7-mobile-admin-*.png`.

> Arsip changelog ringkas, dipisah dari M12 pada 2026-06-19 untuk hemat token AI (M12 = checklist aktif saja). **Entri changelog BARU ditulis DI SINI (paling atas)**, bukan di M12. Format: 1 header tanggal + 1-2 poin outcome per entri.
> Entri lama (≤ 2026-07-16) diarsip ke docs/archieve/M13_CHANGELOG_ARSIP_S1_2026.md.

## 2026-07-16 — KTP Portal dan UI Owner/Admin Bertahap

- Tenant dapat upload/ganti KTP sendiri dengan guard kepemilikan; Admin mendapat antrean KTP pending dan detail review terpadu.
- Standar UI dibukukan: **ringkas saat dilihat, lengkap saat dibuka**. Toggle Owner/Admin mengganti konteks, bukan kewenangan OWNER. Gate TypeScript backend/frontend lulus.

### 10 Jul 2026 (entri terbaru)
- **Crawl E2E UI/UX Admin+Owner (Playwright) — 66 halaman LULUS bersih** — suite baru `frontend/e2e/admin-owner-crawl.spec.ts`: login nyata via UI terhadap **server combined paket deploy** (production-like, port 3100, DB UAT ter-seed 13 kamar), kunjungi OWNER 35 route + ADMIN 31 route; deteksi pageerror / console.error / HTTP≥500 / 4xx API / request gagal / halaman blank + screenshot per halaman (`frontend/e2e-out/`). Hasil akhir: **OWNER 35/35 & ADMIN 31/31 render OK, 0 temuan** setelah 1 fix: ADMIN membuka /settings memicu 403 `GET /owner-ai/usage` (endpoint memang OWNER-only, G7) → `OwnerSettingsPage` AiSettingsPanel kini fetch usage hanya bila OWNER + tampil catatan "hanya OWNER" untuk ADMIN. Catatan infra: vite dev tak punya proxy `/api` (e2e memakai `E2E_BASE` → combined 3100); suite a11y `axe-auth.spec.ts` yang tercatat di M12 ikut terhapus di `e505894`.

### 10 Jul 2026 — awal hari
- **KRITIS pre-live: paket deploy GAGAL BOOT — `@nestjs/swagger` hilang** — ketahuan lewat "cek total sebelum live": simulasi cPanel lokal (`cpanel:install` prod-only + start `dist/main.js`) → MODULE_NOT_FOUND `@nestjs/swagger` (tercatat devDependency padahal di-require runtime oleh controller terkompilasi) → app pasti mati saat start di server. Fix `backend/package.json`: swagger pindah ke dependencies; `express` & `multer` (di-require langsung, sebelumnya cuma transitif) jadi dependency eksplisit (multer disamakan overrides `2.2.0`); paket deploy diregenerasi. **Boot test LULUS:** SPA `/` 200 · `/api` 404-JSON filter · guard 401 · `/api/public/rooms` 200 = query DB nyata (Prisma WASM + pg vs UAT 5433) · guard JWT_SECRET produksi terbukti menolak secret lemah.
- **Temuan cek total: suite test besar sudah TIDAK ADA** — commit `e505894` (bersih-bersih repo) menghapus seluruh `test/integration` (187 test) + mayoritas unit; angka "≈1370 test PASS" yang berulang di M12 = basi. Kondisi nyata kini: BE unit **26/26 PASS**, FE vitest **121/121 PASS** (1 error teardown environment ocrPreprocess, exit 0). Suite lama recoverable dari git history bila mau dipulihkan.

### 8 Jul 2026
- **Audit inventaris & kebijakan aset (kuis owner)** — keputusan final: cut-off 31 Jul 2026; kapitalisasi = barang tahan lama ≥ Rp100rb (revisi dari Rp500rb — kipas/lemari plastik masuk aset, bohlam/sprei = beban); umur default pajak (elektronik 48 bln · furniture 48-96 · utilitas 96 · bangunan 240); tanah+bangunan masuk buku via NJOP + SALDO AWAL (bangunan dinilai kondisi kini, susut fresh — renovasi 2011-kini tidak dirunut); **F3/F4 FINAL TIDAK ADA** (blok F = F1+F2, 13 kamar); rekening campur dipilah per cut-off; tanpa hutang. Paket form lapangan `docs/filePrint/05-07` (checklist master terisi + form cetak berwarna + form INTERAKTIF per kamar: tap kondisi/autosave/ringkasan otomatis/CSV). Kode disinkronkan: warning kapitalisasi owner-ai (helpers+service+prompt) & insight expense besar `accounting-reports` → ambang Rp100rb (tanpa dampak jurnal/TB). Docs sinkron: M02/M04/M09/M11/M12/RUNBOOK audit+onboarding. `tsc` BE ✅.
- **KRITIS go-live: gate KTP diam-diam OFF di produksi (GATE-KTP-ENV)** — pembaca gate (`stays.service.ts`, `tenant-bookings.service.ts`) memakai nilai DB `ktpVerificationGateEnabled` begitu row `OperationalSetting` ada (kolom non-nullable → fallback `?? env` tak pernah jatuh), sedangkan row terbentuk otomatis default `false` pada akses pertama — env `KTP_ACTIVATION_GATE_ENABLED=true` yang diwajibkan runbook deploy jadi konfigurasi mati. Fix: `settings.service.ts getOperational()` semai nilai awal row dari env; docs deploy (PANDUAN §5 + `.env.example` make-deploy) ditambah catatan "env = nilai awal, selanjutnya UI Settings → Operasional" + langkah verifikasi gate. `tsc` BE ✅.
- **AU-01..AU-03 selesai (fix UX Admin/Owner)** — `SimpleCrudPage.tsx` delete kini confirm dialog + `onError` toast (sebelumnya langsung eksekusi & gagal bisu — dampak expenses/invoice-payments/wifi-sales/additional-services); `StaysPage.tsx` 4 mutation booking/checkout dapat `onError` toast + confirm di "Jalankan Kedaluwarsa"; `OwnerSettingsPage.tsx` "Hapus key" DeepSeek pakai confirm. Re-verifikasi 7/7 sampel klaim audit lama masih valid (tanpa regresi). `tsc` FE ✅.
- **Runbook onboarding 13 tenant nyata** — `docs/RUNBOOK_ONBOARDING_TENANT_NYATA.md`: urutan tenant→upload KTP→verifikasi→stay walk-in, `checkInDate` = tanggal siklus terakhir bulan berjalan (keputusan owner: tahun berjalan), jebakan due-date invoice 24 jam (`calculateDueDate` = now+24h — lunasi hari itu juga SEBELUM buka akses portal), prasyarat NIK Dini/Theo + kamar Annisa + catat meter listrik 13 kamar, catatan akuntansi deposit lama.
- **Docs cleanup level `docs/`** — file kerja sementara `AI_WEAK_FIXLIST_KTP_G5_REVIEW.md`, `AI_AUDIT_ORPHANED_ENDPOINTS_ADMIN_OWNER.md`, dan `M18_CELAH_PENINGKATAN.md` diserap ke M-file utama (`M12`/`M13`) lalu dibersihkan dari root `docs/`. Audit kedalaman UI/UX Admin/Owner juga dipadatkan jadi antrian aktif `AU-01..AU-03` di `M12`.
- **Docs hygiene root repo** — panduan sesi dari `CLAUDE.md` dipindah ke dossier utama (`M01` pintu masuk docs + `M12` efisiensi sesi/konvensi versi), lalu file root dibersihkan agar repo tidak punya dokumen kerja liar di luar folder `docs/`.
- **G5+ gap kritis: UI upload foto KTP tidak pernah ada** — ditemukan saat persiapan onboarding tenant nyata (audit manual, bukan Fable5): backend `POST /tenants/:id/ktp/upload` sudah lengkap sejak F3-17, tapi TIDAK ADA UI manapun yang memanggilnya (semua komponen KTP cuma OCR lokal, tidak pernah kirim file foto) — akibatnya `verifyKtp()` SELALU gagal 409 "Tenant belum mengunggah foto KTP", jadi dengan `KTP_ACTIVATION_GATE_ENABLED=true` tidak ada tenant yang bisa diaktifkan. Fix: `KtpOcrValidateCard.tsx` sekarang fetch state tenant sendiri (`GET /tenants/:id`, sebelumnya caller tak pernah kirim prop verifikasi), tambah tombol "Simpan Foto KTP ke Berkas Tenant" yang benar-benar upload file asli, badge status foto, dan tombol Verifikasi Manual di-disable sebelum foto tersimpan. File baru: `getTenant`/`uploadTenantKtpImage` di `frontend/src/api/tenants.ts`, field KTP ditambah ke tipe `Tenant` (`frontend/src/types/core.ts`). Verifikasi: `tsc --noEmit` FE ✅. Menyusul: audit sistematis orphaned-endpoint Admin/Owner+Inventory (`docs/AI_AUDIT_ORPHANED_ENDPOINTS_ADMIN_OWNER.md`, sedang berjalan).
- **G5+ Fixlist KTP + review Fable5 (xhigh, 2 putaran)** — 3 fix spec tuntas: migration `20260708000000_add_ktp_verification_metadata` (schema disinkron `@db.VarChar(50)`), rate-limit AI hanya terpotong saat DeepSeek benar dipanggil, method `AI` di `verifyKtp` kini wajib bukti sukses AI via `KtpAiApprovalService` baru (TTL 30 mnt, sekali pakai — jalur sukses AI tak lagi 400). Hardening cache AI: prune+cap 200 entry, `structuredClone` anti-mutasi (mask NIK aman di cache-hit), cache key pakai model request (bukan echo server), dedup in-flight (double-click tak lagi 2x panggilan berbayar). Fix `stableHash()` — replacer array lama membuang key nested secara rekursif (canonicalize + sort tiap level). Fix cold-start: `maxTokens`/`dailyRemaining` tak lagi pakai default hardcoded sebelum config DB pernah ke-await. File: `backend/src/modules/tenants/*`, `backend/src/modules/owner-ai/*`, `backend/prisma/*`. Verifikasi: `tsc --noEmit` ✅, unit test 26/26 PASS, FE build ✅, backend boot DI sukses.

### 10 Jul 2026
- **M18-P3-02** — Error boundary per fitur kritis: `FeatureErrorBoundary.tsx` + wrap 3 halaman (TicketsPage, OwnerSettingsPage, MyStayPage). File: `frontend/src/components/common/FeatureErrorBoundary.tsx`.
- **M18-P3-01** — Logging di silent catches: 7 lokasi (auth, payment-submissions, auto-ops, AuthContext). File: 4 file backend + 1 file frontend.
- **M18-P2-05** — Unit test `preprocessImage()` FE. File: `frontend/src/test/utils/ocrPreprocess.test.ts`.
- **M18-P2-04** — Unit test `parseNikDemographics()` BE (6 suite, 19 test). File: `backend/test/unit/ocr-helpers.test.js`.
- **M18-P2-03** — Unit test `parseKtpText()` FE (7 test). File: `frontend/src/test/utils/ktpOcr.test.ts`.
- **M18-P2-02** — DTO validasi `PATCH /tenants/:id/ktp-data` — `SaveKtpDataDto` dengan class-validator. File: `backend/src/modules/tenants/dto/save-ktp-data.dto.ts`.
- **M18-P2-01** — Fix silent error `handleSaveKtpData` FE: toast feedback + console.error. File: `frontend/src/components/ai/KtpOcrValidateCard.tsx`.
- **M18-P1-03** — `saveKtpData` jangan overwrite field existing: tambah `!tenant.X` guard di tiap field. File: `backend/src/modules/tenants/tenants.service.ts`.
- **M18-P1-02** — Unique constraint `identityNumber` + tangkap error P2002 di `saveKtpData`. File: `backend/src/modules/tenants/tenants.service.ts`.
- **M18-P1-01** — Mask NIK di UI KTP OCR: tambah fungsi `maskNik()` frontend + panggil di render NIK. File: `frontend/src/components/ai/KtpOcrValidateCard.tsx`.
- **M18-P0-01** — Fix race condition refresh token rotation: bungkus delete+create dalam `prisma.$transaction` dengan single-use enforcement (`findUnique` di dalam transaksi). File: `backend/src/auth/auth.service.ts`.
- **M18** — Dokumen celah peningkatan dari review Reasonix (11 task, sisanya P1-P3). File: `docs/M18_CELAH_PENINGKATAN.md`.

### 9 Jul 2026 (malam)
- **G5+** — Perkuat OCR Verifikasi KTP + fallback manual + bank data tenant:
  - **Algoritma OCR bertingkat** (`owner-ai.helpers.ts`): `cleanOcrText()` normalisasi whitespace + koreksi O→0/l→1 + gabung baris pecah; `extractNameFromOcr/Address/BirthPlace/Province` multi-strategi; `isDeterministicResultSolid` skip AI bila NIK+nama sudah cocok (hemat token).
  - **Pipeline validasi** (`owner-ai.service.ts`): pre-clean → deterministik solid (skip AI) → DeepSeek → fallback enriched. `ktpFallback()` sekarang membawa data enriched (nama/alamat/TTL/provinsi deterministik).
  - **Verifikasi manual** (`tenants.service.ts`): `verifyKtp()` diperluas terima `method` (AI/AI_FAILED_MANUAL/MANUAL) + `notes`; ADMIN bisa verifikasi (sebelumnya OWNER-only).
  - **Bank data KTP** (`tenants.service.ts`): `enrichTenantFromKtp()` auto-isi field kosong dari data OCR; `saveKtpData()` simpan hasil ekstraksi ke tenant; `getDemographicsSummary()` ringkasan demografi untuk marketing (OWNER-only).
  - **Schema** (`schema.prisma`): field `ktpVerificationMethod` + `ktpVerificationNotes` di model Tenant (additive, 🧬).
  - **Endpoint baru** (`tenants.controller.ts`): `PATCH :id/ktp-data`, `GET demographics/summary`.
  - **UI verifikasi manual** (`KtpOcrValidateCard.tsx`): tombol "Verifikasi Manual" dengan modal (pilih metode + catatan); tombol "Simpan Data KTP ke Profil"; badge status "Terverifikasi ✅" / "Belum ⚠️"; auto-detect metode verifikasi dari hasil AI.
  - **API frontend** (`tenants.ts`): `verifyTenantKtp()`, `saveTenantKtpData()`, `getDemographicsSummary()`.
  - Build: backend tsc ✅, frontend 136 chunks ✅.

### 9 Jul 2026
- **M17** — Implementasi audit P3-P8: 🔴 P3-01 refresh token (🧬 model RefreshToken + endpoint `/auth/refresh` + httpOnly cookie + FE auto-refresh interceptor); 🟠 P7-01 BookingCtaButton shared component; 🟠 P8-01 FK index verified (215 `@@index`); 🔵 P8-03 chart empty state guard. Semua LOW (P3-02/P8-02/P8-04/P8-05) didokumentasikan/diverifikasi selesai. File: `backend/prisma/schema.prisma`, `backend/src/auth/*`, `frontend/src/api/client.ts`, `frontend/src/context/AuthContext.tsx`, `frontend/src/components/rooms/BookingCtaButton.tsx`, `frontend/src/components/charts/SmartChartPanel.tsx`, `frontend/src/components/charts/HorizontalBarChart.tsx`, `docs/M17_AUDIT_360_P3_P8.md`.

### 8 Jul 2026
- **M16** — Perbaikan temuan Audit 360° Flow Huni: P2-01 LeadSource PORTAL (🧬 schema + kode), P2-02 guard checkout ≤ plannedCheckOutDate, P2-04 FOR UPDATE lock Stay di approveRequest. 3 temuan lain diverifikasi valid (P2-03/05/06/07). File: `backend/src/modules/checkout-requests/checkout-requests.service.ts`, `backend/prisma/schema.prisma`, `backend/src/common/enums/app.enums.ts`, `backend/src/modules/tenant-bookings/tenant-bookings.service.ts`, `frontend/src/pages/stays/check-in-wizard/{constants,checkInWizardUtils}.tsx`, `docs/M16_AUDIT_360_FLOW_HUNI.md`.
- **M15** — Unifikasi basis revenue dashboard owner: KPI `totalRevenue` + tren jadi **KAS murni** (`InvoicePayment.paymentDate` + `WifiSale.saleDate`), bukan campur akrual (Invoice.periodStart) + kas. `netProfit` tetap akrual (invoice-based) untuk membedakan dari `netCashFlow`. File: `backend/src/modules/finance/finance.service.ts` (2 blok: KPI section ~20 line + trend loop ~10 line).

### 6 Jul 2026
- **M14 SELESAI (16/16 100%)** — Redundansi UI/UX + audit: AM-01 unifikasi 12 WA URL builder → 1 `utils/whatsapp.ts`, AM-02 hapus RoleWorkspaceTabs dari AppLayout, AM-05 tambah Pengumuman ke sidebar admin (navigation.ts), AM-07 fix RoomComparePanel spec detection (regex→shared utility). AM-13 riset CSS Modules (Vite native support, 1/200+ file). AM-14 buat `useGenericForm` hook. AM-15 setup Storybook (3 story pilot: StatusBadge, EmptyState, StatCard). AM-16 setup Playwright E2E (3 smoke test: public + login). AM-10 dokumentasi lengkap. Build FE ✅
- **AM-01** — Unifikasi WhatsApp URL builder: `utils/whatsapp.ts` (buildAdminWaUrl, buildRoomWaUrl, buildAvailabilityWaUrl) gantikan 6 fungsi duplikat + 6 raw wa.me/ inline di 13 file.
- **AM-02** — Hapus RoleWorkspaceTabs dari AppLayout (render + import). AM-04 N/A (sudah dihapus total).
- **AM-05** — Tambah "Pengumuman" (📣) ke sidebar admin antara Perawatan AC dan Loyalitas & Reward.
- **AM-07** — Fix RoomComparePanel spec detection: hapus 4 fungsi regex (getBathroomLabel/getCoolingLabel/getSizeLabel/allRoomText/normalizeText), ganti dengan getPublicRoomBathroomLabel/getPublicRoomCoolingLabel dari utility shared.
  Build FE ✅

### 4 Jul 2026
- **audit(M14):** Audit UI/UX komprehensif — validasi 8 kategori (struktur, design system, routing, data fetching, styling, error states, form, aksesibilitas). Hasil: 7/8 KUAT (⭐5), 1/8 CUKUP (⭐4). 23 shared components verified, 13 ARIA pattern, 100% React Query, 16-file CSS cascade. 4 task baru dibuat dari temuan: AM-13 (CSS Modules bertahap), AM-14 (useForm wrapper shared), AM-15 (Storybook), AM-16 (E2E smoke test). Total Fase AM: 16 task (7 selesai, 9 tersisa).

### 6 Jul 2026
- **AM-06** — RoomCard pakai FacilityList (ganti amenity inline `<span>`→`<FacilityList compact maxItems={3} />`).
- **AM-08** — Buat RoomPriceTable komponen reusable, dipakai di RoomCard (ganti `<table>` inline).
- **AM-09** — Buat RoomSpecChips komponen reusable, dipakai di RoomCard (ganti `<div> 4 spec` inline).
- **AM-10** — Dokumentasi: centang checklist M14, update M12 antrian, entri changelog.
- **AM-11** — Hapus tombol "Buka laporan" duplikat di OwnerDashboardPage (sidebar sudah ada).
- **AM-12** — Hapus tombol "Lengkapi setup akuntansi" duplikat di FinancialRatiosPage (sidebar sudah ada).
  Build FE ✅

### 4 Jul 2026
- **DEPLOY-512MB** — Paket deploy cPanel jadi PREBUILT penuh (RAM host 512MB): `make-deploy` kini build backend di lokal (dist/ + Prisma client WASM ikut paket, binary `*.node` dibuang, tanpa `src/`), script baru `cpanel:install` (= `npm ci --omit=dev`, gantikan `cpanel:setup` build-di-server), `cpanel:migrate` pakai `--skip-generate`, `seed-owner.js` resolve client dari dist/. Paket = 686 file / 19,5 MB tgz. Runbook M08 §D diperbarui (NODE_OPTIONS=192, bootstrap addendum sudah konsolidasi). Verifikasi: boot produksi TANPA `.node` → `GET /api/public/rooms` 200 ✅
### 4 Jul 2026
- **E11** — Inline style batch 2 selesai: report turun ke 6 file `style={{` >5 (di bawah batas 8) lewat utilitas CSS di `frontend/src/styles/06-tenant.css` dan rapikan beberapa halaman publik/laporan. Build frontend ✅
### 4 Jul 2026
- **E12** — Laporan dead-code: ts-prune FE 414 + BE 873 item. Report-only → `docs/archieve/audit_reasonix/11_DEAD_CODE.md`. 0 kode berubah.
- **E13** — Diet dokumen: rangkas 00_index (230→137) + arsip M11 (1508→206) + arsip 01-08 ke arsip. F6 = 6/8 (75%)
- **F6 E9** � Header tujuan 1 baris (`// FILE: x � tujuan`) di 69 file >400 baris backend+frontend. Script ukur `[E9] = 0`. tsc BE ? build FE ?

### 2026-07-04 — E8 pecah shared types FE selesai
- E8: `frontend/src/types/index.ts` dijadikan barrel export, isi shared types dipindah ke `frontend/src/types/core.ts`
- Gate PASS: `cd frontend && npm run build`

### 2026-07-04 — E7 unifikasi format tanggal FE selesai
- E7: semua `toLocaleDateString/TimeString` FE target Fase 6 sudah diganti ke `formatDateOnly` / `formatDateTimeWib` atau `Intl.DateTimeFormat` yang disengaja
- Gate PASS: `node scripts/token-efficiency-report.mjs` → `[E7] File FE toLocaleDateString/TimeString: 0` dan `cd frontend && npm run build` PASS

### 2026-07-04 — Fase 4 tuntas 35/35 100% — M31 DeepSeek verified
- M31: DeepSeek test-connection via `.env` API key ✅ PASS (model deepseek-v4-flash, 1.2s, 18 token)
- Fase 4 = 35/35 100% (M26/M27 SKIP, M31 fix)
- Progres global: Fase 1-5 semua 100%, Fase 6 = 1/8 (12%)

### 2026-07-04 — OC-07 Staff dashboard halaman khusus
- OC-07 (L22): Backend module `StaffDashboard` (`GET /staff/dashboard/aggregate`) — endpoint aggregate untuk data staff (rooms, tickets, inventory, routineSummary, meterPending). Frontend: API client `staffDashboard.ts`, DashboardStaff.tsx kini pakai 1 query aggregate (tambah dari 5 query terpisah). Build backend ✅ frontend ✅
- 00_index.md: L22 dicentang [x], tabel OC L22 → ✅ SELESAI

### 2026-07-04 — OC-05 ExternalReview CRUD audit
- OC-05 (M29): Audit modul ExternalReview — model Prisma standalone, hanya read-only via social proof publik, tanpa CRUD endpoint/admin UI. Temuan: 1 critical (no admin CRUD), 1 high (no admin UI), 2 medium, 2 low. Laporan: `docs/archieve/audit_reasonix/M29_AUDIT_EXTERNAL_REVIEW.md`

### 2026-07-04 — OC-04 GuestPreferenceSurvey admin page
- OC-04 (M28): Backend module `guest-preferences` (`GET /guest-preferences` + `/guest-preferences/stats`) + FE `GuestPreferencesPage` — stat panel, preferensi breakdown, tabel paginated. Build backend ✅ frontend ✅

### 2026-07-04 — E6 token-efficiency-report script selesai
- E6: `scripts/token-efficiency-report.mjs` ditambahkan + `npm run token-efficiency-report` di root `package.json`
- Gate awal PASS: backend 337 file / 44.843 baris, frontend 386 file / 64.319 baris, baseline Fase 6 terbaca normal

### 2026-07-04 — Plan Fase 6 Efisiensi Token Lanjutan (audit-reasonix)
- Baru: `docs/archieve/audit_reasonix/10_EFISIENSI_LANJUTAN.md` — spec 8 task E6-E13 untuk AI lemah (script pengukur, unifikasi tanggal FE, split types/index.ts, header file, `as any` backend, inline style batch 2, dead-code report-only, diet dokumen) + checklist FASE 6 di `00_INDEX.md` (baseline diukur ulang: 40 file tanggal mentah, 672 `as any` BE, 69 file >400 baris tanpa header, M11 1.468 baris)

### 2026-07-04 — OC-01 AncillaryRevenue API+FE + sinkronisasi dokumentasi + keputusan owner
- OC-01: Backend module `AncillaryRevenue` (`GET /ancillary-revenue/streams`) + FE `AncillaryRevenuePage` dinamis (dari statis)
- M02_KEPUTUSAN_OWNER.md: 7 keputusan baru (OC-01 s/d OC-07) untuk item 🧑
- 00_index.md: Fase 4=32/35 (91%), Fase 5=25/26 (96%) — M24/L19 fixed, M26/M27 skip, M31 tunda
- BE tsc ✅ · FE build ✅

### 2026-07-04 — L1 @ApiOperation + sinkronisasi dokumentasi
- L1: @ApiOperation ditambahkan ke ~55 controller backend (>200 endpoint) — summary/docs API lengkap
- tsc --noEmit: ✅ LULUS 0 error
- 00_index.md: L1 dicentang [x], progress Fase 5=22/26 (85%)
- RINGKASAN_EKSEKUTIF.md: H14 status fixed, tabel M/L selaras 00_index

### 2026-07-04 — Dokumentasi: 00_index.md jadi kanonik + antrian sesi berikutnya
- 00_index.md: tanggal diperbaiki (7→4 Jul), struktur dokumen rapi, tambah "Antrian Sesi Berikutnya"
- Semua progress: Fase 4=83%, Fase 5=81%
- RINGKASAN_EKSEKUTIF.md: tanggal diperbaiki
- ⚠️ RINGKASAN masih perlu sinkronisasi penomoran dgn 00_index (dijadwalkan sesi depan)

### 2026-07-04 — Fase 4: 13 temuan menengah (83% tuntas)
- M4: Survey summary dibatasi 200 rows (pagination)
- M8: deepseek.client.ts — semua throw new Error → HTTP exceptions (503/400/502/504)
- M10: accounting-readiness — dynamic model access dengan return type any + eslint-disable
- M14/M15/M16: finance.service.ts — komentar klarifikasi score≠signal, WiFi accrual vs cash, deposit liability
- M30: MarketAnalysis — findAll filter 90 hari (cutoff createdAt)
- M17/M19/M21/M23/M25/M32-M35: via Fase 5 overlap

### 2026-07-07 — L7: isNaN guard `new Date()` di 13 file FE
- 13 file frontend: InvoicesPage · StayDetailPage · FinanceTab · NotificationsPage · AdminSurveysPage · NotificationBell · StaffMeterStatusPanel · MeterReadingsPage · MyStayPage — semua isNaN(Date) guard ditambahkan di date display/sort/overdue check
- Build FE: ✅ lulus (tsc + vite + PWA stamp)

### 2026-07-07 — Fase 5 Audit Reasonix: 16 temuan rendah (77% selesai)
- Seed scripts: `addMonths` overflow guard, `ymd()` WIB fix, dynamic year, `require(dist)` graceful error
- FE: SkeletonLoader key, MyInvoicesPage countdown PAID guard, console.warn DEV guard (4 file)
- BE: AC_CLEANING CLOSED dedup guard, Renew enum comment sinkronisasi
- Dokumentasi: L15/L16/L20/L21/L23 diverifikasi "by design / already fixed"

**2026-07-07 — Fase 2+3 TUNTAS 100% ✅ + Fase 4 partial (7/35)**
- C1-C6 ✅ Semua 6 bug kritis: DISCOUNT journal (4010 contra-revenue), overdue net, renewal cross-term, collection rate period, journal retry, DTO number. `accounting-posting-helpers.ts`, `reports.service.ts`, `renew-requests.service.ts`, `finance.service.ts`, `payment-submissions.service.ts`, `stay.dto.ts`.
- H1-H15 ✅ Semua 15 temuan tinggi (H3/H6/H7 final): sweeper auto-reject PENDING_REVIEW, balance sheet currentProfit guard, cashflow cashBeginning koreksi otomatis. `booking-sweep.service.ts`, `accounting-reports.service.ts`.
- M2/M3/M6/M7/M11/M12/M20 ✅ Fase 4 partial: N+1 staff-assignment & maintenance-sweep, pagination renew, reviewNotes optional, push NaN guard, reminder stack trace, SimpleCrudPage skeleton. 8 file.
- Verifikasi: tsc backend ✅ · build FE ✅.

**2026-07-04 — Fase 3 Temuan Tinggi TUNTAS ✅ (kecuali H3/H6/H7 untuk model pro)**
- H1 ✅ `updateLine()` — conditional spread agar undefined tidak meng-null-kan field DB. `invoices.service.ts`.
- H2 ✅ `CreatePortalTicketDto` — tambah validasi `@IsIn(PORTAL_TICKET_CATEGORIES)`. `ticket.dto.ts` + `app.enums.ts`.
- H4 ✅ DP forfeit — hanya invoice SEWA (RENT) yang PAID memblokir forfeit. `booking-sweep.service.ts`.
- H5 ✅ Checkout `complete()` — tambah FOR UPDATE row lock cegah race condition. `stays.service.ts`.
- H8 ✅ `decideByTenant()` TIDAK — bungkus dalam `$transaction`. `renew-requests.service.ts`.
- H9 ✅ `approveRequest()` — pindahkan status check ke dalam transaksi + FOR UPDATE. `checkout-requests.service.ts`.
- H10 ✅ `businessHealth()` — tambah WiFi revenue query + `totalRevenueRupiah` di metrics. `finance.service.ts`.
- H11 ✅ Seed `ymd()` — ganti `toISOString()` (UTC) → `toLocaleDateString('en-CA')` (WIB). 2 seed files.
- H12 ✅ Duplicate invoice guard — cek `stayId + periodStart + periodEnd` sebelum create. `invoices.service.ts`.
- H13 ✅ C19-01 — tenant component ganti `fetchOperationalSettings` → `fetchPublicConfig`. `UtilityInsightCard.tsx` + `MeterCycleModal.tsx`.
- H14 ✅ C19-02 — tambah breakpoint 480px untuk admin dashboard. `08-admin.css`.
- H15 🧑 Z-19 owner dashboard — task verifikasi manual (kode sudah ada).

<!-- duplikat Fase 2 dihapus 2026-07-07 -->

**2026-07-07 — Fase 1 Audit Reasonix TUNTAS ✅ (E2+E4+E5 lanjutan)**
- E2 ✅ Unifikasi `toLocaleString` → `formatRupiah`: 7 file FE (CacClvDashboard, InvoicePrintLayout, AssetRegisterPage, ExpenseReceiptUpload, RichAvailabilityCalendar, publicGuestShared, StepReviewConfirm). Local helper diganti import `formatRupiah`/`formatRupiahWithoutSymbol` dari `formatCurrency.ts`. Build FE ✅
- E4 ✅ `any`→typed `accounting-reports.service.ts`: 32× `(this.prisma as any)` dihapus. Build backend tsc ✅
- E5a ✅ Split `create()` stays.service.ts: extract `resolvePortalUserForCheckIn` private method (591→543 baris). Build backend ✅
- E5b ✅ Split `createBooking()` tenant-bookings.service.ts: extract `validateBookingPreconditions` private method (193→151 baris). Build backend ✅
- **Fase 1 100% selesai.** Skor efisiensi token naik dari 35 → estimasi 55-60.

**2026-07-07 — E3+E4+E5 Fase 1 Audit Reasonix**
- E3 ✅ Inline→CSS class: 3 laporan + FAQ + AdminSurveys + KanbanBoard + ProfilePage + CSS utilities 14 class. Perbaiki 12 broken imports E2 + 2 async section marker bug. Build FE ✅
- E4 ✅ `any`→typed: `accounting-posting` (6 `as any` dibuang), `period-close` (3 `as any` dibuang). Build backend ✅
- E5 ✅ Split `createSubmission` (195→80 baris, 2 helper). Progress: 60% Fase 1.

### 2026-07-07 — Audit Reasonix Code ✅ 82 temuan + 2 refactor kecil

- **Refactor:** unifikasi `dateOnly()` — 5 implementasi di module akuntansi kini pakai 1 shared utility `backend/src/common/utils/date-only.ts`. `@ApiProperty` ditambahkan ke 17 DTO (invoice, stays, room-transfer). Build backend tsc ✅.
- **Audit:** 82 temuan baru (6 kritis, 15 tinggi, 35 menengah, 26 rendah) — bug finansial, logika bisnis, laporan, UI/UX, code quality. Semua di `docs/archieve/audit_reasonix/` (10 file). 4 keputusan owner baru di M02.
- **MD update:** M02 + M12 + M13 + audit/00_INDEX + audit/RINGKASAN + supersede Hermes + M00_CODEMAP.

### 2026-07-04 — Fase AJ selesai ✅ anti-loop live + re-seed dev + audit follow-up C19

- **AJ-02/AJ-04 lulus live:** `/portal/stay` tenant tanpa stay settle 2 request/30 dtk + empty-state, `/portal/bookings` 2, `/portal/invoices` 2, backend 200; `aj02-no-loop.spec.ts` PASS. DB dev 5433 di-reset+seed ulang: 13/13 kamar OCCUPIED, Bayu/I & Sari/F2 invoice pertama PAID dan invoice kedua ISSUED, Trial Balance balanced Rp47.490.000 = Rp47.490.000. Seed meter juga bersih (2 bertagihan, 3 gratis); setelah integration suite, DB di-reseed ulang dan diverifikasi lagi.
- **Kode/docs:** guard meter date-only diperbaiki agar catat meter pada tanggal check-in tidak ditolak oleh jam `initialMetersPromotedAt`; spec AJ diberi errata D-02 no-partial (Sari tidak dibuat bayar sebagian invoice-only/manual). FE build ✅ (PWA verified), BE `tsc --noEmit` ✅, `node --check seed-dev-via-api.js` ✅, backend unit 1072/1073 PASS (1 skip intentional) ✅, backend integration PASS ✅, frontend vitest 111/111 PASS ✅.
- **AJ-07 safe follow-up:** responsive tenant/admin 375/768 diuji. Temuan baru audit-only dicatat: C19-01 tenant `/portal/stay` request `/settings/operational` 403 console; C19-02 admin `/dashboard` overflow 375px (`scrollWidth=434`). Sisa destructive/human flow (DP→check-in, checkout/renew/WiFi full flow) tidak dimutasi agar baseline seed stabil.

### 2026-07-04 — Tindak lanjut verifikasi AA-AI ✅ cache schema-check self-healing + PII hygiene kalender + tutup AE-02

- **`booking-schema.helper.ts`:** cache modul-level baru — hasil READY di-cache permanen; BELUM SIAP / query gagal dicek ulang paling cepat tiap 30 detik (self-healing tanpa restart). Sebelumnya wrapper `{ current }` dibuat baru tiap panggilan sehingga cache tidak pernah persist, dan satu kegagalan bisa di-cache permanen. Duplikat `isBookingSchemaReady` **tanpa try-catch** di `tenant-bookings.queries.ts` dihapus; `TenantBookingsQueryService` delegasi ke helper bersama (menutup vektor 503 yang terlewat AI-01a). Callers (tenant-bookings, public-bookings, marketing) disederhanakan.
- **`marketing-public-rooms.service.ts`:** komputasi mati nama tenant di availability-calendar dihapus + `tenant.fullName` tidak lagi di-SELECT dari DB (defense-in-depth C01-02).
- **Test basi TC-MP10 diperbaiki:** assert `currentTenantName === null` sesuai C01-02 (test dibuat 2 Jul sebelum fix PII 3 Jul → gagal senyap sejak commit `e20f461`). Unit backend **1072/1073 PASS, 0 fail** (1 skip intentional) · `tsc --noEmit` ✅.
- **M10:** AE-02 ditutup (bukti live 3 Jul, bayu occupied); task AJ-06 diringkas.

### 2026-07-04 — Fase AJ 📋 dibuat — antrian sisa temuan audit (C05-01 sistemik, C10-02 seed, C17-01 okupansi)

- Fase AJ (AJ-01..AJ-07) ditambahkan ke M10 dari konsolidasi `docs/archieve/audit_fable/RINGKASAN_TEMUAN.md` + CHECKLIST_05/10/17: fix sistemik loop 404 `/stays/me/current` (3 file FE tersisa — AE-01 baru menutup hook), verifikasi live anti-loop, seed occupied wajib lunas sewa awal, re-seed data menua, penyamaan label okupansi owner/admin, sinkron status dokumen audit, dan daftar verifikasi live lanjutan 🧑. Spec eksekutor AI lemah (langkah per file + kode SEBELUM/SESUDAH + gate): `docs/_SPEC_FASE_AJ_SISA_AUDIT.md`.

- **Fase AH (CHECKLIST_08 — Info):** AH-01 hardening `announcements.service.ts` `findActive` — bungkus `hasTenantOccupiedStay` try-catch agar DB drift tidak menyebabkan 503; fallback `false` + log warning. AH-02..AH-04: verifikasi STALE Hermes I12/I13 (Panduan & WiFi OK), banner ex-tenant tercakup AF-02.
- **Fase AI (CHECKLIST_09 — Loyalty+Renewal+Checkout):** AI-01a hardening `booking-schema.helper.ts` `isBookingSchemaReady` — bungkus `$queryRaw` try-catch agar query `pg_type`/`information_schema` gagal tidak menyebabkan 503 sistemik; return `false` + cache fallback. Ini menyembuhkan 503 di `/tenant/bookings/my` yang berdampak ke `/portal/bookings`, `/portal/stay` loop, `/portal/renewal`, `/portal/checkout`. AI-01b perbaiki FE `useTenantPortalStage` — `isStageLoading` hanya tunggu `stayQuery` (bookingsQuery tak blokir render portal). AI-02: loyalty/renewal/checkout diverifikasi via kode (JB-01 deposit OK, JB-10 liability OK).
- **Build:** backend `npm run build` ✅ · frontend `npm run build` ✅ (PWA verified).

### 2026-07-02 — Fase AF-AG ✅ Perbaikan temuan audit CHECKLIST_06 + 07 (Invoice + Tiket)

- **Fase AF (CHECKLIST_06 — Invoice):** AF-01 sembunyikan countdown jatuh tempo bila invoice sudah Lunas (`TenantInvoiceDetailPage.tsx`: guard `!isPaid` pada `relativeLabel` + metric helper "Tagihan sudah lunas"), AF-02 bedakan banner onboarding ex-tenant vs new: tambah `hasStayHistory` di `useTenantPortalStage` → `GettingStartedGuide` tampilkan "Kamu pernah menghuni KOST48" + langkah ringkas (katalog + riwayat tagihan) untuk mantan penghuni, AF-03 catatan INFO (guard double-submission kuat via consumed-fileKey + sudah lunas — tanpa kode).
- **Fase AG (CHECKLIST_07 — Tiket):** AG-01 C07-01 banner onboarding ex-tenant — identik dengan C06-02, tercakup AF-02. Tanpa kode tambahan.
- **Build:** frontend `npm run build` ✅ (PWA verified). Backend tidak terdampak.

### 2026-07-02 — Fase AB-AD ✅ Perbaikan 13 temuan audit (CHECKLIST_02..04) + AE polish

- **Fase AB (CHECKLIST_02 — Katalog):** AB-01 label RESERVED "Dipesan" (✅ sudah done sebelumnya), AB-02 link error-state `/katalog→/rooms` + WA asli (✅ sudah done), AB-03 `ROOMS_PER_PAGE` 3→9 + perbaiki komentar, AB-04 unifikasi istilah "Dana titipan"→"Deposit jaminan" di detail publik, AB-05 tambah komentar DP preview pakai monthly.
- **Fase AC (CHECKLIST_03 — Booking):** AC-01 fix default `checkInDate` UTC→WIB (hindari off-by-one dini hari), AC-02 perbaiki FAQ batas penghuni "Maks 2 orang"→"2 gratis, maks 4", AC-03 sembunyikan "Air Rp 0/m³"→"Air termasuk" bila tarif=0, AC-04 N/A (tercakup AB-05).
- **Fase AD (CHECKLIST_04 — Auth):** AD-01 hapus TENANT dari `@Roles GET /settings/operational` (tenant pakai `/public-config`), AD-02 pindahkan cek `isActive` setelah verifikasi password (hindari enumerasi akun nonaktif), AD-03 ganti `<a href>`→`<Link>` di "Lupa password" + tambah `autoComplete="email"` di ForgotPassword, AD-04 tambah komentar `resetTokenPreview` dev-only.
- **Fase AE (CHECKLIST_05 — MyStay):** AE-01 infinite refetch loop (✅ fix sudah ada: `useTenantPortalStage.ts` tangkap 404→null), AE-02 verifikasi occupied-view ⏳ deferred (perlu tenant OCCUPIED).
- **Build:** backend `npm run build` ✅ · frontend `npm run build` ✅ (PWA verified).

### 2026-07-02 — AE-01 ✅ Fix infinite refetch loop tenant MyStay

- **AE-01 / C05-01 🔴 HIGH** — `useTenantPortalStage.ts`: tangkap 404 `/stays/me/current` sebagai hasil valid (`return null`) agar `staleTime` 60s bekerja dan `refetchOnMount` tidak memicu loop tak terbatas. Sebelumnya: tenant tanpa stay OCCUPIED (mantan penghuni) membuka `/portal/stay` → 404 error → query selalu "stale" → tiap remount refetch → skeleton mount/unmount → ~150 req/detik → tab crash. Sekarang: 404 → null (sukses) → staleTime cegah refetch → empty-state "Kamu belum memiliki masa sewa aktif" tampil. Build lulus ✅.

### 2026-07-02 — Fase Z: Z-17..Z-18 ✅ 2 task LOW publik selesai

- **Z-17 ✅** Stat counter publik: sync displayStats segera saat data rooms terload (tidak hanya saat scroll visibility). Cegah 0/0/0 di landing page.
- **Z-18 ✅** Empty state kamar publik: tambah CTA WhatsApp di samping link Cek Ketersediaan.

### 2026-07-02 — Fase Z: Z-11..Z-16 ✅ 6 task MEDIUM selesai

- **Z-11 ✅** RoomsRouteEntry sudah pakai PageLoadingSkeleton dengan label "Memuat kamar…".
- **Z-12 ✅** Empty state loyalty: tambah teks informatif + CTA untuk admin di katalog reward.
- **Z-13 ✅** Ganti env variable LOYALTY_POINT_RUPIAH_VALUE → teks ramah "1 poin ≈ RpN. Nilai dapat disesuaikan oleh owner."
- **Z-14 ✅** Tombol disabled "Perpanjang" & "Ajukan Keluar" sudah punya title attribute.
- **Z-15 ✅** Semua tenant route pakai AppLayout yang sama (TenantWorkspaceTabs). Tidak ada sidebar untuk TENANT.
- **Z-16 ✅** PwaStatus.tsx sudah implementasi localStorage 7-hari cooldown.

### 2026-07-02 — Fase Z: Z-08..Z-10 ✅ 3 task MEDIUM selesai

- **Z-08 ✅** ChartResponsiveWrapper (ResizeObserver) + diterapkan ke SmartChartPanel, DonutGauge, HorizontalBarChart. Cegah Recharts width=-1 warning via conditional render.
- **Z-09 ✅** StatCard.loading prop + skeleton animation. StaffMotivationDashboard cards stabil dengan isLoading gate.
- **Z-10 ✅** Ganti Dropdown Bootstrap → button group langsung + modal. Setiap tombol buka modal report yang sesuai.

### 2026-07-02 — Fase Z: Z-02..Z-07 ✅ 6 task HIGH selesai

- **Z-02 ✅** `/portal/guide` redirect ke `/portal/manual` — MyManualPage sudah ada sejak fase sebelumnya.
- **Z-03 ✅** MyAnnouncementsPage lengkap (fetch + render + 3 state). Hanya butuh seed data.
- **Z-04 ✅** WifiOrderPage lengkap (filter + card + fallback WhatsApp). Hanya butuh seed data.
- **Z-05 ✅** Batal modal tiket reset form (`setFormState(initialForm)` + `setError('')`) via `onHide` & tombol.
- **Z-06 ✅** STAFF sidebar: 5 link → 5 route valid dengan `<NavLink>`. Semua route terverifikasi ada.
- **Z-07 ✅** Room Z1 (id=14) + 3 RoomFacility + 1 ticket dihapus dari DB dev.

### 2026-07-02 — Fase Z: Z-01 ✅ 4 tiket XSS dihapus dari DB

- **Z-01 ✅** Hapus "Uji XSS Y-R2" dari DB dev (4 tiket: id 119, 123, 131, 139). Seed scripts bersih — data berasal dari integration test yang bocor. Build lulus BE+FE.

### 2026-07-02 — Audit UI/UX Cross-Portal (Fase Z dibuka)
- **19 task terverifikasi** dari inspeksi browser real-time di 4 portal (tenant/staff/admin/owner) + halaman publik `/` — 1 CRITICAL, 7 HIGH, 8 MEDIUM, 3 LOW. Detail di `docs/M12_CHECKLIST_CHANGELOG.md` → Fase Z.
- **Cakupan lengkap:** 17 halaman tenant (8), 1 halaman staff, 8 halaman admin, 1 halaman publik, + owner (manual 🧑). 0 JS errors di semua halaman.
- **Temuan kritis:** "Uji XSS Y-R2" muncul di seed data staff & admin — perlu dihapus dari DB + script seed.
- **3 halaman tenant rusak:** `/portal/guide` (404), `/portal/announcements` (kosong), `/portal/wifi` (kosong). **1 bug modal:** "Batal" tidak menutup dialog laporan.
- **Staff:** sidebar 5 link no-op, chart warnings 8×, race condition data cards, tombol "Laporan Lapangan" tidak expand.
- **Admin:** "Kamar Z1 (Contoh Tersedia)" di seed, Loyalitas kosong, env var exposed ke UI.
- **Publik:** stat counter 0/0/0 di landing page, empty state kamar tanpa CTA.
- **Verifikasi positif:** autocomplete login + novalidate sudah fixed di changelog 2026-07-16 ✅ (tidak diulang). No JS errors di seluruh portal.
- Laporan audit lengkap + screenshot: `docs/_AUDIT_CROSS_PORTAL_2026-07-02.md`. Arsip per-portal: `docs/archieve/LAPORAN-AUDIT-UIUX-KOST48-*.md`.

### 2026-07-16 — Audit Login: autocomplete, type=email, validasi, WhatsApp link
- **Issue #1:** Tambah `autoComplete="email"` (BACKOFFICE) / `autoComplete="username"` (TENANT) di input identifier + `autoComplete="current-password"` di input password — browser bisa menawarkan password manager / auto-fill.
- **Issue #2:** Input email BACKOFFICE pakai `type="email"` (sebelumnya `type="text"`) — keyboard mobile tampilkan @ dan .com shortcut; input TENANT tetap `type="text"` karena bisa email atau nomor HP.
- **Issue #3:** Hapus `noValidate` dari form + tambah `required` — browser validation aktif; custom inline error tetap jalan.
- **Issue #4:** Link "Lupa password?" dari `<Link>` (SPA) diganti `<a href="/forgot-password">` — right-click open in new tab berfungsi.
- **Issue #5:** Tombol "Hubungi Admin via WhatsApp" di tab Nomor HP — aktif selama ada input (tidak butuh nomor valid penuh), plus hint format nomor HP.



---

## Release 2026-07-23 — Pengumuman, Notifikasi, dan Konsolidasi Kode


#### Status release

P1, P2, dan P3 untuk audit Pengumuman vs Notifikasi sudah diimplementasikan di `main`.

- P1: infinite list pengumuman tidak lagi membekukan halaman pertama di cache; detail dibuka dari API; validasi edit tanggal tidak menolak `startsAt` lama yang tidak diubah.
- P2: kategori notifikasi disimpan sebagai data, pengumuman terjadwal benar-benar didispatch ketika aktif, dan CRUD pengumuman mendukung gambar.
- P3: Bell menampilkan indikator kategori dan Web Push memakai outbox dari notifikasi in-app.
- Verifikasi statis terakhir: backend `npm run build` dan frontend `npm run build` lulus, termasuk verifikasi PWA.

Status ini bukan pengganti UAT manusia. Sebelum go-live, jalankan checklist di bawah (UAT Push Notification Production).

#### Cakupan release lintas AI

Dokumen ini mencatat release yang dipersiapkan dari seluruh perubahan kode terkait, bukan hanya P1-P3. Baseline source `main` yang diaudit adalah `8627289`; dokumentasi dan penyesuaian paket deploy pada worktree harus ikut di-commit ke SHA rilis sebelum diunggah.

| Area | Commit utama | Dampak rilis |
|---|---|---|
| Inventaris/fasilitas | `1eb11d9`, `0701327` | Ringkasan stok, gap fasilitas, auto-link yang ditinjau operator, serta filter/pagination yang benar. |
| IoT dan utilitas | `298bcca`–`8af53d6` | Telemetri/dashboard/timeline tersedia; quota listrik mengikuti periode sewa lunas dan telemetry tidak menerbitkan invoice. |
| Pengumuman/notifikasi | `f9387d2` | P1-P3 yang diringkas pada dokumen ini. |
| Hardening backend | `e327e9b` | Strict type checking, helper error baku, dan konsolidasi jalur renewal/booking. |
| Frontend/CSS | `8a589e6` | Konstanta bersama dan satu entry CSS; perlu UAT visual. |
| Artefak baseline | `8627289` | Bundled artifact/session tracking diperbarui; artefak produksi harus diregenerasi dari SHA final. |

Riwayat perubahan lebih rinci dan jejak commit lintas AI: `docs/M13_CHANGELOG.md`.

#### Perilaku yang menjadi kontrak bisnis

| Area | Keputusan aktif | Konsekuensi operasional |
|---|---|---|
| Audiens pengumuman `TENANT` | Hanya tenant aktif dengan `Stay ACTIVE` dan kamar `OCCUPIED`. | Tenant yang baru booking tidak menerima pengumuman tenant. |
| Audiens `ALL` | Semua pengguna aktif. | Dipakai untuk informasi yang relevan lintas peran. |
| Pengumuman terjadwal | Tidak ada notifikasi sebelum `startsAt`. AutoOps mengirim saat pengumuman sudah aktif dan belum `dispatchedAt`. | Ketepatan waktu mengikuti frekuensi AutoOps/cron, bukan janji real-time per detik. |
| Masa berlaku | Pengumuman yang sudah kedaluwarsa tidak didispatch. | Hindari inbox berisi informasi usang. |
| Kategori notifikasi | `FINANCE`, `OPERATIONS`, atau `SYSTEM` tersimpan di database. | UI tidak boleh lagi menyimpulkan kategori hanya dari `entityType`. |
| Fallback kategori | Event pembayaran/akuntansi = `FINANCE`; pengumuman, stay, tiket, kamar, dan booking = `OPERATIONS`; lainnya = `SYSTEM`. | Call-site dengan konteks khusus wajib mengirim kategori eksplisit. |
| Penghapusan pengumuman | OWNER/ADMIN melakukan hard delete; notifikasi terkait dan file gambar dihapus setelah transaksi database sukses. AuditLog tetap mencatat aksi. | Hapus bersifat tidak dapat dipulihkan dari UI; gunakan unpublish bila hanya ingin menghentikan tayang. |
| Push | Notifikasi in-app adalah sumber kebenaran. Push adalah best-effort dan opt-in browser. | Push gagal, VAPID belum ada, atau perangkat tidak tersubscribe tidak boleh menghilangkan notifikasi in-app. |

#### Implementasi teknis yang relevan

- Migration `20260723000000_announcement_notification_delivery` menambah enum `NotificationCategory`, `Announcement.dispatchedAt`, kolom kategori, indeks, dan backfill kategori data lama.
- `AnnouncementSweepService` dipanggil oleh `AutoOpsService.runAll()` dan dapat diuji manual melalui `POST /api/auto-ops/run/announcement-dispatch` oleh OWNER/ADMIN.
- Endpoint cron eksternal adalah `POST /api/auto-ops/cron` dengan header `X-Cron-Token`; token query tidak didukung.
- `POST /api/auto-ops/run/push-dispatch` memproses outbox push manual untuk UAT. Cron biasa juga menjalankan dispatch announcement dan push.
- Gambar pengumuman dibatasi 2 MB, diperiksa signature JPG/PNG/WebP, dan dibaca melalui endpoint terproteksi.

#### UAT minimum sebelum rilis

1. Buat pengumuman langsung untuk audiens TENANT dan ALL; cek penerima sesuai aturan di atas dan link membuka detail yang benar.
2. Buat pengumuman publish dengan `startsAt` beberapa menit ke depan; pastikan belum ada notifikasi. Setelah waktu lewat, jalankan endpoint dispatch manual atau tunggu cron lalu cek `dispatchedAt` dan deduplikasi penerima.
3. Ubah pengumuman aktif yang memiliki `startsAt` lampau tanpa mengubah tanggal tersebut; pembaruan harus berhasil. Ubah tanggal baru ke masa lampau; harus ditolak.
4. Upload, ganti, hapus gambar pengumuman; pastikan gambar lama tidak tetap dapat diakses setelah penghapusan pengumuman.
5. Uji Bell pada tiap kategori dan jalankan UAT push lengkap melalui `docs/UAT_PUSH_NOTIFICATIONS.md` di HTTPS.

#### Risiko/go-live gate yang masih terbuka

- Perlu UAT visual lintas portal setelah refactor CSS global yang masuk pada release terakhir.
- Endpoint pencarian `/tenant/bookings/my?search=...` memiliki temuan SQL terpisah: query hitung memakai alias kamar tanpa join. Perbaiki atau nonaktifkan pencarian tersebut sebelum go-live.
- Jalur bootstrap database harus diverifikasi pada database kosong. Jangan menjalankan `sql/seed.sql` yang berisi data historis/PII sebagai cara memasang schema atau pagar database produksi.

#### Rujukan

- Keputusan owner: `docs/M02_KEPUTUSAN_OWNER.md` D-26 s.d. D-31.
- Deployment: `docs/DEPLOYMENT_ONLINE_20260723.md`.

---

##### UAT Push Notification Produksi

#### Tujuan

Memverifikasi alur end-to-end Web Push KOST48 tanpa membocorkan secret VAPID atau mengganggu akun penghuni nyata.

#### Prasyarat

- Frontend berjalan melalui HTTPS dan service worker aktif.
- Backend memiliki `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, dan `VAPID_SUBJECT` yang valid. Jangan salin nilainya ke ticket, chat, atau screenshot.
- AutoOps aktif: proses always-on menjalankan interval, atau cPanel cron memanggil `POST /api/auto-ops/cron` dengan header `X-Cron-Token` secara berkala.
- Gunakan akun uji OWNER/ADMIN/TENANT dan perangkat/browser uji. Jangan mengirim data pribadi melalui notifikasi uji.

#### Prosedur

1. Login sebagai akun uji, buka `/notifications`, dan pastikan kartu push ditampilkan.
2. Tekan **Aktifkan**, setujui permission browser, lalu muat ulang halaman. Kartu harus berubah menjadi aktif.
3. Dengan token akun yang sama, panggil `GET /api/push/vapid-public-key`. Respons harus menyatakan `enabled: true`; jangan menyimpan nilai `publicKey` pada laporan UAT.
4. Buat satu notifikasi yang aman di lingkungan UAT, atau pakai event uji yang sudah tersedia. Pastikan notifikasi muncul di halaman dan Bell.
5. Jalankan AutoOps biasa atau trigger OWNER/ADMIN `POST /api/auto-ops/run/push-dispatch`.
6. Pastikan perangkat menerima push dengan judul, isi, dan aksi navigasi yang sesuai. Ketuk push dan pastikan aplikasi membuka `linkTo` yang benar.
7. Ulangi langkah 5. Notifikasi yang sama tidak boleh dikirim ulang setelah statusnya `SENT`.
8. Matikan push melalui kartu notifikasi dan pastikan subscription perangkat tidak lagi menerima push baru.
9. Buat pengumuman terjadwal untuk akun uji dengan `startsAt` beberapa menit di masa depan. Pastikan inbox/push belum ada sebelum waktunya; sesudah aktif jalankan `POST /api/auto-ops/run/announcement-dispatch`, lalu dispatch push. Catat bahwa pengumuman hanya diproses sekali (`dispatchedAt` terisi) dan link membuka detail yang benar.

#### Bukti yang Dicatat

- Waktu pengujian, environment, role akun uji, dan browser/perangkat.
- Hasil `enabled` endpoint VAPID (boolean saja).
- Hasil dispatch: `processed`, `sent`, `failed`, `noDevice`, dan `deactivated`.
- Screenshot permission browser dan push yang diterima, tanpa token, endpoint subscription, atau data personal.
- Hasil klik push menuju halaman tujuan.
- Untuk pengumuman terjadwal: `startsAt`, waktu dispatch, hasil dispatch announcement, dan bukti tidak ada kiriman sebelum waktu aktif.

#### Troubleshooting

| Gejala | Pemeriksaan |
|---|---|
| Kartu menyatakan push belum aktif | Pastikan VAPID env terpasang lalu restart backend; cek endpoint public key. |
| Tombol aktif gagal | Pastikan HTTPS, service worker terdaftar, dan browser tidak memblokir permission. |
| Subscription ada tetapi tidak ada push | Pastikan AutoOps/cron berjalan dan `PUSH_DISPATCH_ENABLED` bukan `false`; trigger endpoint dispatch manual untuk diagnosis. |
| `failed` bertambah | Periksa log backend. Status 404/410 menonaktifkan subscription usang; pengguna perlu mengaktifkan ulang. |
| Push diterima dua kali | Catat ID notifikasi, status push, dan waktu dispatch; ini regresi idempotensi yang harus diperbaiki sebelum go-live. |

#### Kriteria Lulus

- Push dapat diaktifkan dan dimatikan pada perangkat uji.
- Satu notifikasi `PENDING` terkirim sekali, menjadi `SENT`, dan membuka tujuan yang benar.
- Notifikasi in-app tetap tersedia bila VAPID tidak dikonfigurasi atau perangkat tidak memiliki subscription.
- Tidak ada secret, token, endpoint subscription, atau data penghuni pada bukti UAT.
