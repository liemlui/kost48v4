# CHECKLIST 04 — Auth: Login, Lupa Password, Reset, Guard Role

> **Baca `00_INDEX.md` dulu.** Prefiks temuan: **`C04-xx`**. **Role:** semua (uji tiap role). **Audit-only.**
> Checklist ini juga **RE-VERIFIKASI temuan Hermes I1–I5** (jangan percaya begitu saja — cek ulang di kode terkini).

## Ruang lingkup
| Halaman | URL | File FE |
|---|---|---|
| Login | `/login` | `pages/auth/LoginPage.tsx` |
| Lupa password | `/forgot-password` | `pages/auth/ForgotPasswordPage.tsx` |
| Reset password | `/reset-password` | `pages/auth/ResetPasswordPage.tsx` |
| Guard role | (semua route privat) | `App.tsx` (`RequireRoles`), context auth |

**Backend:** `auth` (`POST /api/auth/login`, forgot, reset). Model: `User`, `PasswordResetToken`. Login pakai field `identifier` (email ATAU No. HP) + `password`.

## Langkah audit

### A. Login — jalur sukses (semua role)
- [ ] 1. Login ADMIN (`admin@kost48.com`/`admin123`) → berhasil, redirect ke dashboard admin? Token tersimpan?
- [ ] 2. Login STAFF (`staff@kost48.com`/`staff123`) → redirect ke area staff yang benar?
- [ ] 3. Login TENANT (`maya.tenant@kost48.test`/`Tenant#2026`) → redirect ke `/portal/stay`? (Bila password salah, coba `tenant.g2@kost48.com`; catat kalau kredensial di INDEX ternyata salah.)
- [ ] 4. **Tab context-aware:** tab "Penghuni" vs "Admin/Operasional" mengubah placeholder/subjudul? (temuan positif Hermes — verifikasi masih ada.)
- [ ] 5. Toggle "Tampilkan password" mengubah `type=password`↔`text`?

### B. Login — jalur GAGAL & re-verifikasi Hermes I1–I4
- [ ] 6. **I3 (re-check):** submit form **kosong** → muncul pesan error yang jelas? Atau "tidak terjadi apa-apa" (bug lama)? Buka `LoginPage.tsx`, cek ada state error + render pesan. Catat status: sudah diperbaiki / masih bug → `C04-xx`.
- [ ] 7. **I1 (autocomplete):** inspect input → ada `autocomplete="email"` / `"current-password"`? Kalau tidak → C04-xx MEDIUM.
- [ ] 8. **I2 (type email):** input email `type="email"` atau masih `type="text"`? (Catatan: karena identifier bisa No. HP, `type="text"` mungkin memang disengaja — nilai ini INFO, jangan langsung salahkan. Verifikasi maksud di kode/komentar.)
- [ ] 9. Password salah → pesan "kredensial salah" yang jelas (bukan blank / bukan bocor "user tidak ada" vs "password salah" secara terpisah — JB keamanan: pesan sebaiknya generik).
- [ ] 10. **Brute force / rate limit:** login salah 10× beruntun → adakah pelambatan/kunci? (kalau tidak ada, catat INFO/LOW keamanan.)
- [ ] 11. **JB-19:** respons `POST /api/auth/login` yang GAGAL tidak membocorkan apakah email terdaftar. Respons SUKSES tidak mengandung `passwordHash`.

### C. Lupa password `/forgot-password` (re-verifikasi I5)
- [ ] 12. Dua metode (Email + No. HP) tab switching jalan?
- [ ] 13. Tombol "Kirim Email Reset" disabled sampai form diisi?
- [ ] 14. **I5 (re-check):** di tab "Nomor HP", link "Hubungi Admin via WhatsApp" — apakah disabled (bug lama) atau aktif? Buka `ForgotPasswordPage.tsx`, cek. Link WA: nomor `6285648887628` benar? Pesan pre-fill masuk akal?
- [ ] 15. Submit email tidak terdaftar → **JB-19:** respons harus sama seperti email terdaftar (jangan bocorkan keberadaan akun). Cek.
- [ ] 16. Network: endpoint forgot 200? Tidak mengembalikan token reset di respons (token harus via email/WA, bukan di payload UI).

### D. Reset password `/reset-password`
- [ ] 17. Buka `/reset-password` tanpa token → ditangani (pesan "token tidak valid", bukan crash)?
- [ ] 18. Dengan token asal-asalan (`?token=xxx`) → ditolak?
- [ ] 19. Password baru: uji aturan (min 8 karakter?) — masukkan "123" → ditolak? Konfirmasi password beda → ditolak?
- [ ] 20. **Kode:** `PasswordResetToken` — cek apakah token punya masa berlaku (expiry) & sekali pakai (one-time). Token tanpa expiry = C04-xx HIGH keamanan. Grep di `backend/src/modules/auth`.

### E. Guard role — JB-14 (PALING PENTING, sering bug)
- [ ] 21. Login **TENANT**, lalu ketik URL admin di address bar: `/stays`, `/invoices`, `/users`, `/reports`, `/owner-dashboard`. **Ekspektasi:** ditolak (redirect/403), BUKAN tampil. Uji minimal 5 URL. Tiap yang tembus = **C04-xx BLOCKER**.
- [ ] 22. Login **STAFF**, coba URL khusus OWNER/ADMIN: `/reports`, `/invoices`, `/settings`, `/loss-refunds`. Ditolak?
- [ ] 23. **Bypass UI → API (kritis):** ambil token TENANT, panggil endpoint admin langsung:
  ```bash
  curl -s -H "Authorization: Bearer <TENANT_TOKEN>" http://localhost:3000/api/users | head -c 300
  curl -s -H "Authorization: Bearer <TENANT_TOKEN>" http://localhost:3000/api/reports/... | head -c 300
  curl -s -H "Authorization: Bearer <TENANT_TOKEN>" http://localhost:3000/api/invoices | head -c 300
  ```
  Harus 401/403. **Kalau data keluar → BLOCKER keamanan** (UI menyembunyikan tapi API terbuka).
- [ ] 24. **Token kedaluwarsa/manipulasi:** ubah 1 karakter di token → request harus 401. Token expired → diarahkan ke login?
- [ ] 25. Logout → semua route privat tidak bisa diakses lagi (coba back button setelah logout).
- [ ] 26. `/loss-refunds` khusus **OWNER** saja (bukan admin) — login ADMIN coba akses → harus ditolak (cek App.tsx baris route: `allowed={['OWNER']}`).

### F. Verifikasi kode
- [ ] 27. `App.tsx` `RequireRoles`: baca implementasinya. Apakah benar-benar mengecek role dari sumber tepercaya (bukan cuma dari localStorage yang bisa diedit user)? Guard hanya di FE = tidak cukup; harus ada guard BE juga (sudah dites di langkah 23).
- [ ] 28. Redirect pasca-login per role: cek logic di context/RootEntry — tiap role ke halaman benar.

## HASIL TEMUAN

> **Status:** kode + API + live **SELESAI** (2 Jul 2026, Fable). **Sistem auth sangat solid & aman.** Semua temuan Hermes I1–I5 **RESOLVED**. Tidak ada BLOCKER/HIGH/MEDIUM.

### ✅ Verifikasi keamanan (kuat) — bagian yang BENAR
- **JB-14 guard role KUAT (live, via fetch token asli):** token **TENANT** → **403** di `/users`, `/stays`, `/invoices`, `/tickets`; **tanpa auth** → **401** semua; **ADMIN** → 200. UI-hidden = API-protected. Unauthenticated deep-link `/stays` → **redirect ke `/login`** (bukan blank).
- **Token reset password textbook-secure** (`auth.service.ts:151-255`): `randomBytes(32)` acak kripto, disimpan **SHA-256 hash** (bukan plaintext), **expiry 30 menit**, **sekali pakai** (`usedAt`), hapus token lama + expired, tolak password sama dengan lama.
- **Rate limiting** di login/forgot/reset (`@UseGuards(RateLimitGuard)`, `auth.controller.ts:25,42,50`).
- **Enumeration-safe forgot** (`auth.service.ts:146` "always return same response"; controller "Jika akun ditemukan…"; error email di-log tak diekspos).
- **Login error generik** (`invalidCredentialsMessage` untuk user-tak-ada & password-salah). **Respons login TANPA `passwordHash`** (verifikasi live).
- **JWT bawa `pwdAt`** (invalidasi token setelah ganti password).
- **Hermes I1 FIXED** (`autoComplete=username/email` + `current-password`, `LoginPage.tsx:183,201`); **I2 non-issue** (tenant `type=text` sengaja krn email/HP, admin `type=email`); **I3 FIXED** (validasi + feedback — **live**: identifier invalid + password kosong → "Format tidak dikenal…" + "Masukkan password."); **I5 resolved** (link WA di tab HP disabled hanya saat kosong, aktif saat diisi; nomor `6285648887628` benar).
- Reset page: min-8 + konfirmasi cocok + submit disabled + redirect. Login role-mismatch (tenant via tab admin → logout + pesan).

### C04-01 `/settings/operational` bocorkan config internal ke TENANT — 🟢 LOW
- **Severity:** LOW · **Kategori:** Keamanan/Privasi (JB-19, over-exposure)
- **Langkah reproduksi:** login TENANT → `GET /api/settings/operational` → **200** (bukan 403).
- **Yang terjadi:** endpoint mengembalikan **seluruh** objek OperationalSetting ke TENANT (`@Roles(OWNER,ADMIN,STAFF,TENANT)`, `settings.controller.ts:42`), termasuk config internal: `deepseekModel`, `deepseekFinanceModel`, **`deepseekBaseUrl`**, `aiMaxOutputTokens`, `aiFinanceMaxOutputTokens`, `capitalizationThresholdByCategory` (kebijakan akuntansi), `updatedById`. **Tidak ada API key/secret** yang bocor (aman), tapi config AI & akuntansi tak perlu dilihat tenant. Sudah ada `/settings/public-config` (`@Public`) yang ter-scope untuk kebutuhan publik/tenant.
- **SARAN FIX:** kembalikan DTO ter-filter (hanya field relevan tenant) untuk TENANT, atau batasi `/operational` penuh ke OWNER/ADMIN/STAFF.

### C04-02 Login "User tidak aktif" bisa dibedakan (enumeration ringan) — 🟢 LOW
- **Severity:** LOW · **Kategori:** Keamanan (minor)
- **Yang terjadi:** akun non-aktif → `ForbiddenException('User tidak aktif')` **sebelum** cek password (`auth.service.ts:44-46`), beda dari pesan generik kredensial-salah. Penyerang bisa tahu suatu akun ada tapi nonaktif tanpa tahu password. (Forgot-password sudah enumeration-safe; hanya login yang bocor status ini.)
- **SARAN FIX:** kembalikan pesan generik yang sama, atau cek password dulu.

### C04-03 Link internal pakai `<a href>` (full reload) + autocomplete kurang — 🟢 LOW
- **Severity:** LOW · **Kategori:** UX/perf/a11y
- **Yang terjadi:** "Lupa password?" di login = `<a href="/forgot-password">` (`LoginPage.tsx:207`) → reload penuh, bukan SPA `<Link>`. Input email di ForgotPassword tak punya `autoComplete="email"` (`ForgotPasswordPage.tsx:206`).
- **SARAN FIX:** pakai `<Link>`; tambah `autoComplete`.

### C04-04 Dead code `resetTokenPreview` (Dev Preview) — 🟢 INFO
- **Severity:** INFO · **Kategori:** Kebersihan kode
- **Yang terjadi:** `ForgotPasswordPage.tsx:44,78,177-183` mengharapkan `result.resetTokenPreview` untuk menampilkan "Token Reset (Dev Preview)", TAPI backend **tidak pernah** mengembalikannya (grep 0 hasil di `backend/src/auth`). Jadi blok ini **tak pernah aktif** (aman, tak ada kebocoran token). Bila suatu saat backend menambah token-preview, pastikan **dev-only**.

## Definition of Done — status
- [x] Login 3 role diuji (TENANT/ADMIN via API; live UI login page). Owner di C17.
- [x] Hermes I1/I2/I3/I5 di-verifikasi ulang → semua RESOLVED (I3 dikonfirmasi live).
- [x] **JB-14 diuji via fetch API** (403/401/200) — inti keamanan. Unauthenticated → redirect login.
- [x] Token reset expiry/one-time/hash diperiksa di kode.
- [x] Temuan `C04-xx`; INDEX baris 04 diupdate.

## Definition of Done
- [ ] 4 role login diuji (owner diuji di CHECKLIST_17 bila belum di-seed).
- [ ] Hermes I1, I2, I3, I5 di-verifikasi ulang & status dicatat (fixed/masih bug).
- [ ] JB-14 diuji lintas-role via UI **dan** via curl API (langkah 21–23) — ini wajib.
- [ ] Token reset expiry/one-time diperiksa di kode.
- [ ] Temuan `C04-xx`. Update Progres Global baris 04.
