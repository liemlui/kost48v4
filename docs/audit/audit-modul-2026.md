# Audit Modul: frontend-auth

- Status: diperiksa sebagian
- Tanggal: 2026-09-20
- Owner bisnis: belum ditetapkan
- Owner teknis: belum ditetapkan
- Sumber: [AI_WORKFLOW_GUIDE §12.1](../../AI_WORKFLOW_GUIDE.md#121-template-audit-modul)
- Identitas bukti: commit d5d04cb + working tree bersih
- Cakupan identitas: baseline saat recon; penulisan dokumen ini menambah working tree sesudahnya.
- Batas baca: test login lengkap, LoginPage 60 baris pertama, api/auth.ts 40 baris pertama, core.ts melalui rg.

## Tujuan dan invariant

Modul `frontend-auth` dalam manifest wrapper mencakup test halaman login yang sudah ada.
Halaman menyediakan mode TENANT dan BACKOFFICE; label dan bantuan tiap mode terlihat pada
`frontend/src/pages/auth/LoginPage.tsx:14–60`. Audit ini terbatas pada login, bukan seluruh fitur autentikasi.

Invariant sesi aktif: ketika `loading` bernilai false dan `user` tersedia, halaman mengembalikan
`Navigate` menuju `state.from.pathname` atau `getDefaultRoute(user.role)`, dengan `replace`.
Bukti: `LoginPage.tsx:24–60`; test sesi OWNER membuktikan rute `/owner-dashboard` dan tombol Masuk tidak tampil.
Tujuan redirect setelah submit login sukses sama, tetapi implementasi lengkapnya UNKNOWN — belum diperiksa.

Invariant input: submit kosong tidak memanggil login; kredensial backoffice diteruskan ke fungsi login.
Bukti terbatas pada test dengan AuthContext mock, bukan autentikasi server.
`normalizeLoginError` pada `LoginPage.tsx:18–22` menggabungkan array pesan, menerima string tidak kosong,
dan menyediakan pesan cadangan; pemakaian fungsi pada alur submit UNKNOWN — belum diperiksa.

## File dan kontrak

| Path | Simbol | Tanggung jawab / batas bukti |
|---|---|---|
| `frontend/src/pages/auth/LoginPage.tsx` | `LoginPage`, `LoginMode`, `normalizeLoginError` | UI dua mode, state form, redirect sesi aktif; hanya baris 1–60 dibaca. |
| `frontend/src/api/auth.ts` | `login`, `me`, `changePassword`, `forgotPassword` | Endpoint auth dan pembukaan `response.data.data`; hanya baris 1–40 dibaca. |
| `frontend/src/types/core.ts` | `AuthUser` | Identitas, role, tenantId nullable, isActive, dan field opsional; bukti pencarian rg. |
| `frontend/src/context/AuthContext` (path import) | `useAuth` | Menyediakan login/logout/user/loading bagi LoginPage; implementasi UNKNOWN — belum diperiksa. |
| `frontend/src/test/pages/loginPage.test.tsx` | `renderPage`, `LocationProbe`, 5 blok `it` | Menguji komponen dengan MemoryRouter dan AuthContext mock; file dibaca lengkap. |

`api/auth.ts:4–10` memakai `ApiEnvelope<{ accessToken: string; user: AuthUser }>` untuk login
dan `ApiEnvelope<AuthUser>` untuk profil. Bentuk respons login memakai envelope generik; lihat `api/auth.ts`.
Pencarian `AuthResponse` di `core.ts` tidak menemukan simbol; definisi `ApiEnvelope` belum diperiksa.
Producer → kontrak → consumer: respons HTTP → tipe generik pada `client.post/get` → fungsi API;
hubungan fungsi API dengan AuthContext dan kontrak backend UNKNOWN — belum diperiksa.

## Dependensi

- Masuk terverifikasi: test mengimpor LoginPage dan merendernya dalam MemoryRouter (`loginPage.test.tsx`).
- Pemanggil aplikasi: hubungan router `App.tsx`, `RequireRoles`, dan `ProtectedRoute` UNKNOWN — belum diperiksa.
- Keluar dari halaman: `useAuth`, router, `getDefaultRoute`, komponen UI, dan konten resmi (import LoginPage baris 1–12).
- Keluar dari API: HTTP client, `POST /auth/login`, `GET /auth/me`; terlihat pada `api/auth.ts:1–10`.
- Dampak perubahan: perubahan role, payload login, atau redirect memerlukan pemeriksaan context/router/backend; konsumen lengkap belum dipetakan.

## Verifikasi relevan

| Acceptance | File test | Cwd + command yang pernah dijalankan | Prasyarat | Bukti |
|---|---|---|---|---|
| Heading dan tombol Masuk tampil | `frontend/src/test/pages/loginPage.test.tsx` | root: `node scripts/verify-module.mjs test frontend-auth` | Vitest lokal, setup frontend, AuthContext mock | 2026-09-20, suite 5 test, exit 0; assertion render ada. |
| Sesi OWNER menuju /owner-dashboard tanpa tombol Masuk | file yang sama | command yang sama | MemoryRouter, user mock OWNER | Hasil suite yang sama; assertion rute dan tombol ada. |
| Submit kosong menampilkan validasi, login tidak dipanggil | file yang sama | command yang sama | AuthContext mock | Hasil suite yang sama; kedua assertion ada. |
| Tab Admin mengubah label identifier | file yang sama | command yang sama | userEvent, render komponen | Hasil suite yang sama; assertion label ada. |
| Kredensial backoffice diteruskan ke login | file yang sama | command yang sama | mockLogin mengembalikan OWNER | Hasil suite yang sama; assertion dua argumen ada. |

- Alias root yang tersedia: `npm run test:module -- frontend-auth`; tabel memakai command aktual dari Fase 3 tooling.
- Bukti test tersebut: reporter JSON Vitest, 5 test, exit 0, durasi wrapper 62,125 detik; bukan lima eksekusi terpisah.
- Percobaan awal exit 1 akibat akses direktori ditolak sandbox; pengulangan dengan eskalasi menghasilkan bukti di atas.
- Build: tidak diperlukan untuk penulisan audit; target manifest tidak tersedia (`buildTarget: null`, mode build exit 3).
- Hook tersembunyi: wrapper memanggil Node/Vitest langsung, tanpa lifecycle npm; isi setup/plugin Vitest UNKNOWN — belum diperiksa.
- Kesegaran artefak: test menunjuk source `.tsx`, bukan dist; baseline d5d04cb bersih saat recon, source tidak diubah dalam Fase 2 ini.
- Invalidasi bukti: perubahan source terkait, test, context, konfigurasi/setup Vitest, atau dependency memerlukan penilaian ulang; bukan PASS otomatis.
- Gap: login sukses end-to-end, error server, loading, role selain OWNER, refresh sesi, dan redirect state.from belum dibuktikan oleh lima test ini.
- Gap wrapper: dependency lokal hilang dan jumlah test nol belum diuji pada Fase 3 tooling.

## Risiko dan eskalasi

- Level task umum: L untuk perubahan kontrak autentikasi lintas halaman/context/API; pekerjaan saat ini hanya pencatatan dokumentasi.
- Risiko: mock context dapat menyembunyikan kegagalan sesi/token; batas buktinya terlihat pada `vi.mock` dalam test login.
- Pemicu perluasan: perubahan payload, role, penyimpanan sesi, atau redirect memerlukan audit producer → kontrak → consumer dan test terkait.
- Temuan terbuka: alur submit setelah baris 60, implementasi AuthContext, caller router, dan kontrak backend UNKNOWN — belum diperiksa.
- Temuan terbuka: tidak ada bukti baru mengenai keamanan autentikasi, tampilan browser, atau kesiapan produksi dari audit parsial ini.

## Delta terakhir

- Implementasi lokal: dokumen audit dibuat; source bisnis, test, wrapper, dan package.json tidak diubah pada Fase 2 ini.
- Verifikasi lokal: inspeksi isi dokumentasi; test baru tidak dijalankan sesuai batas owner, memakai bukti 5 test/exit 0 di atas.
- Verifikasi keberadaan dokumen: root, `node scripts/verify-module.mjs audit frontend-auth` dan `npm.cmd run audit:module -- frontend-auth` → exit 0, doc ada (2026-09-20); `npm` biasa terhalang kebijakan PowerShell.
- Deployment: tidak dilakukan pada task dokumentasi ini.
- Dampak runtime: belum diukur; audit dokumen dan test mock bukan bukti runtime produksi.

---

**Digabung dari docs/audit/audit-menyeluruh-2026-07.md** (DOCS-CLEANUP-1, 2026-09-24) - isi blok disalin utuh.

# Audit Menyeluruh Kode KOST48 V5 (30 Juli 2026) — Bukti Bertanggal

> Dipindah apa adanya dari `docs/M16_AUDIT_MENYELURUH.md` §1–§5 (Tahap 3 batch B4, 23 Sep 2026) pada DOC-GOV-20260922.
> Sifat: **bukti bertanggal** — audit kode statis 46 modul backend + frontend (Reasonix, 30 Juli 2026). Angka test/build adalah hasil Juli, bukan sesi September, dan bukan sign-off host/UAT/Fase A.
> Temuan tata dokumen 8 September 2026: [audit-dokumentasi-2026-09.md](audit-2026-09.md).

## 1. Ringkasan Eksekutif (audit kode 30 Juli 2026)

> Snapshot bertanggal. Angka test/build di tabel adalah hasil Juli, bukan sesi 8 September. Klaim “siap produksi” di bawah = **kesiapan kode inti pada hari audit**, bukan sign-off host/UAT/Fase A.

| Area | Hasil | Keputusan |
|---|---|---|
| Build & typecheck | 🟢 backend `tsc --noEmit` clean · frontend `npm run build` 162 chunks + PWA verified | Lulus (30 Jul) |
| Unit test backend | 🟢 74/74 pass (6 suite) | Lulus (30 Jul) |
| Unit test frontend | 🟢 135/135 pass (31 file) | Lulus (30 Jul) |
| Keamanan (authz/secrets/SQLi) | 🟢 solid — default-deny global, no secret hardcode, raw query terparameterisasi | Sehat |
| Atomisitas keuangan | 🟢 best-effort journal sudah BLOCKING (AN-03), WiFi sale + deposit ledger atomik | Sehat |
| Race condition | 🟡 1 minor (I-01) — sudah diperbaiki | Sehat |
| Frontend | 🟢 tidak ada anti-pattern hooks-order tersisa (AO-02 fixed) | Sehat |

### Putusan (30 Juli, dikualifikasi 8 Sep)

Codebase **matang dari sisi kode inti pada audit Juli**. Pra-go-live tetap: infrastruktur (Fase A), identitas host (EF-00/02), crawl/sign-off AO (AO-03/13/14 dan sisa parsial AO-18/19/20 + AO-21/23). AO-17 dan AO-22 sudah ditutup di checklist M12; jangan mengulang.

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

- **Fase A (Pra-Go-Live):** blocked owner — server/domain/env; identitas DB produksi tidak diasumsikan dari UAT.
- **Fase EF:** EF-00/02 menunggu data host; EF-01/03/05 implementasi lokal; kelayakan 512 MB belum PASS. Detail: `docs/operations/efisiensi-hosting.md`.
- **Fase AO sisa (selaras M12 8 Sep):** AO-03 (alat/fixture lalu provisioning), AO-13 (crawl tiga role), AO-14 (sign-off), AO-18/19/20 **parsial**, AO-21, AO-23. AO-17 dan AO-22 sudah selesai. Detail: `docs/M14_AUDIT_UI_UX.md`.
- **AL / Z-19:** H1–H15 dilaporkan selesai 7 Jul; verifikasi manual Owner untuk Z-19 belum punya bukti spesifik.

---

## 5. Kesimpulan

- **Risk rating kode (30 Jul): 🟢 LOW** — 0 HIGH, 0 MEDIUM terbuka, 1 LOW (sudah fix).
- **Kesiapan rilis (8 Sep):** kode inti Juli ≠ bukti host, ≠ crawl UAT, ≠ rotasi kredensial OWNER. Jangan mengutip §1 sebagai sign-off produksi.
