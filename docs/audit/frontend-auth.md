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
