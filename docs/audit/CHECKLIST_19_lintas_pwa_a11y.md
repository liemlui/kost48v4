# CHECKLIST 19 — Lintas Aplikasi: PWA + Aksesibilitas + Konsistensi + Responsive + 404 + Performa

> **Baca `00_INDEX.md` dulu.** Prefiks temuan: **`C19-xx`**. **Role:** semua. **Audit-only.**
> Checklist ini menangkap bug yang lintas-halaman (tidak spesifik satu fitur). Re-verifikasi Hermes **I8** (PWA prompt) & **I11** (sidebar/konsistensi).

## Ruang lingkup
Seluruh aplikasi. File kunci: `frontend/public/version.json`, `frontend/src/config/version.ts`, `scripts/stamp-pwa-build.mjs`, service worker, `components/layout/*` (AppLayout, TenantLayout), `components/common/PwaInstallPrompt.tsx`, `pages/NotFoundPage.tsx`.

## Langkah audit

### A. PWA
- [ ] 1. **I8 (re-check PWA prompt):** buka app, muncul prompt "Pasang/Nanti". Klik "Nanti" → pindah halaman → **muncul lagi?** (bug lama). Cek `PwaInstallPrompt.tsx`: apakah dismiss disimpan (localStorage 7 hari)? Status → `C19-xx LOW`.
- [ ] 2. **Version:** `frontend/src/config/version.ts` (`APP_VERSION`) === `frontend/public/version.json`? Kalau beda → update check PWA bisa salah. Bandingkan.
- [ ] 3. Service worker terdaftar? Update check jalan (versi baru → prompt reload)? Build ID (`stamp-pwa-build.mjs`) ter-stamp?
- [ ] 4. Offline: matikan network → app menampilkan halaman offline / cache, bukan layar putih mati?
- [ ] 5. Manifest: ikon, nama, theme-color ada? Install ke home screen bekerja (bila bisa diuji)?
- [ ] 6. Push subscription (`PushSubscription`) — izin notif diminta wajar (tidak spam saat load)?

### B. Konsistensi layout (I11 lanjutan)
- [ ] 7. **Sidebar/menu konsisten:** buka SEMUA halaman per role, pastikan sidebar/header/footer selalu ada & sama. Buat daftar halaman yang layout-nya beda/sidebar hilang. (Hermes tandai Pengumuman — verifikasi + cari lain.)
- [ ] 8. `AppLayout` (admin/owner) vs `TenantLayout` (tenant) dipakai konsisten? Ada halaman yang lupa dibungkus layout?
- [ ] 9. Warna, tombol, spacing, font konsisten antar-halaman? Komponen tombol/primary sama gaya?
- [ ] 10. Active menu highlight benar (menu yang sedang dibuka ter-highlight)?
- [ ] 11. **Owner view-mode toggle** (AppLayout) — owner bisa lihat sebagai admin? Toggle bekerja tanpa bug?

### C. Aksesibilitas (a11y) — re-check Hermes I1/I2
- [ ] 12. **Label form:** semua input punya `<label>` terasosiasi (for/id)? Cek beberapa form utama (login, booking, tiket, bayar).
- [ ] 13. **Autocomplete:** field auth & profil punya `autocomplete` benar (email/current-password/new-password)? (Hermes I1.)
- [ ] 14. **Keyboard nav:** bisa Tab ke semua kontrol? Fokus terlihat (focus ring)? Modal bisa ditutup dengan Esc & fokus terjebak di modal (focus trap)?
- [ ] 15. **Kontras warna:** teks abu di latar terang cukup kontras (WCAG AA)? Cek badge status, teks sekunder.
- [ ] 16. **Alt text:** gambar (foto kamar, ikon informatif) punya alt? Ikon dekoratif `aria-hidden`?
- [ ] 17. **Screen reader sanity:** heading hierarki masuk akal (satu h1 per halaman)? Tombol pakai `<button>` bukan `<div onClick>`?

### D. Responsive (mobile)
- [ ] 18. Set viewport ~375px (mobile). Telusuri halaman utama tiap role: landing, katalog, booking, login, portal stay/invoice/tiket, dashboard admin. Layout pecah? Tabel meluber? Tombol tertutup? Sidebar jadi hamburger?
- [ ] 19. Tablet ~768px: cek grid & chart tetap terbaca.
- [ ] 20. Elemen fixed (header/prompt PWA) tidak menutupi konten di layar kecil?

### E. 404 & error boundary
- [ ] 21. Buka URL ngawur (`/xxxyyy`) → `NotFoundPage` tampil ramah dengan link kembali, bukan blank?
- [ ] 22. Error boundary: paksa error (mis. matikan backend saat halaman butuh data) → UI menampilkan pesan error, bukan layar putih total. Uji di 2-3 halaman.
- [ ] 23. **JB-18 global:** telusuri cepat cari "undefined", "NaN", "Invalid Date", "[object Object]" muncul di UI mana pun.

### F. Console & Network health global (JB-19 global)
- [ ] 24. Buka tiap halaman utama, kumpulkan SEMUA console error/warning ke satu daftar (halaman → pesan). Ini menangkap bug yang tidak terlihat di UI.
- [ ] 25. **Network audit:** cari request yang: (a) gagal 4xx/5xx diam-diam, (b) berulang berlebihan (N+1/polling boros), (c) memuat payload besar tak perlu, (d) **membocorkan data sensitif** (passwordHash, token, data user lain) — cek beberapa payload acak lintas halaman.
- [ ] 26. **Performa kasar:** halaman berat (dashboard, reports, stays) — waktu muat wajar? Ada bundle/asset sangat besar? (Lighthouse bila tersedia → catat skor Performance & Accessibility.)

### G. Verifikasi kode
- [ ] 27. `PwaInstallPrompt.tsx`: dismiss persistence. `version.ts` vs `version.json`: sinkron.
- [ ] 28. `AppLayout`/`TenantLayout`: pastikan tiap route dibungkus layout yang benar (silang-cek dengan daftar route App.tsx).

## HASIL TEMUAN

> **Status:** **kode SELESAI**; **live (responsive/console-global/error-boundary) TERTUNDA** (backend down).

### ✅ Verifikasi kode — BENAR
- **PWA I8 (Hermes) RESOLVED:** komponen sebenarnya `components/pwa/PwaStatus.tsx` (bukan `PwaInstallPrompt.tsx`). "Nanti" → `localStorage.setItem('kost48_pwa_install_dismissed', Date.now())` (`:173`); saat mount, `daysSince < 7 → jangan tampilkan` (**cooldown 7 hari**, `:31-36`). Prompt **tak muncul lagi** 7 hari. ✅
- **Version sinkron:** `version.ts` (`APP_VERSION='1.0.0'`, phase 'Rilis Publik Perdana', build '2026-06-24') **cocok** `version.json` (version/phase/buildDate sama + buildId). ✅ Update-check PWA tak akan salah.
- **Update flow:** `PwaStatus` set `sessionStorage` flag pasca-update (`:156`) + tampilkan banner (`:46`).

### Temuan lintas (dari checklist lain — dikonsolidasi di sini)
- **C01-05 (LOW) konsistensi header publik:** 4 gaya berbeda (landing `gx-topbar`+footer / `/rooms` topbar / `/panduan` FaqTopbar / `/reviews` tanpa topbar+footer). Live-confirmed C01/C02.
- **C06-02/C07-01/C08-04 (LOW) berulang:** banner onboarding "3 langkah menuju kamar" muncul di SEMUA halaman portal untuk tenant tanpa stay aktif (stage 'browsing'). Perbaiki sekali di layout portal.
- **JB-18 global:** rekalkulasi angka aman di semua halaman yang diuji live (tak ada NaN/undefined) — pola guard `x>0 ? … : 0` konsisten di FE.

### AJ-07 live follow-up (4 Jul 2026)

#### C19-01 Tenant portal memanggil endpoint owner/admin settings dan menghasilkan console error 403
- **Severity:** MEDIUM
- **Halaman/URL:** `/portal/stay`
- **Role:** TENANT (`maya.tenant@kost48.test`)
- **Langkah reproduksi:**
  1. Login tenant.
  2. Buka `/portal/stay` pada viewport 375px atau 768px.
  3. Amati console/network.
- **Yang diharapkan (expected):** halaman tenant tidak memanggil endpoint admin/owner-only; jika butuh konfigurasi publik, gunakan endpoint public-config atau handle 403 tanpa console error.
- **Yang terjadi (actual):** UI render, tetapi browser mencatat `GET /api/settings/operational` -> 403 dan console error "Failed to load resource".
- **Bukti:** Playwright AJ-07c 2026-07-04: pageError 0, overflow false, HTTP 403 unik `"/api/settings/operational"` pada viewport 375px dan 768px.
- **SARAN FIX:** audit pemanggil settings di jalur tenant; ganti ke `/settings/public-config` atau gate query berdasarkan role.

#### C19-02 Admin dashboard overflow horizontal pada viewport 375px
- **Severity:** MEDIUM
- **Halaman/URL:** `/dashboard`
- **Role:** ADMIN (`admin@kost48.com`)
- **Langkah reproduksi:**
  1. Login admin.
  2. Set viewport 375x900.
  3. Buka `/dashboard`.
- **Yang diharapkan (expected):** tidak ada horizontal page overflow; kartu/panel stack penuh dalam viewport mobile.
- **Yang terjadi (actual):** `documentElement.scrollWidth=434` saat `window.innerWidth=375`.
- **Bukti:** elemen berulang melebar sampai `right=434`, termasuk `.admin-command-head`, `.assistant-insight-line`, `.action-queue-card`, `.assistant-panel`, dan beberapa bar/panel admin.
- **SARAN FIX:** cek CSS kontainer dashboard admin di mobile; kemungkinan ada `width/min-width` 423px atau gutter negatif yang perlu dibuat `max-width:100%`/`min-width:0`.

### ✅ LIVE CONFIRMED responsive 390px (owner, 3 Jul)
- **Window di-resize ke 390×844** → `/owner-dashboard` render dgn **sidebar collapse ke hamburger `☰`** (nav mobile). KPI cards (Pendapatan/Laba/Okupansi/Kas) stack vertikal, tanpa overflow horizontal terlihat di teks. Layout mobile berfungsi. *(Catatan: screenshot 390px timeout krn renderer beku dari BE degraded — dikonfirmasi via page-text + `☰`.)*
- **Bonus honesty-gate:** dashboard mobile tampilkan "**Akuntansi belum siap — 1 gate tersisa — skor 88%**" → sistem **jujur** melaporkan akuntansi belum 100% siap (bukan pura-pura balanced). Selaras C13 (balance-sheet draft-not-ready). **Positif.**

### Live TERTUNDA (butuh BE hidup)
- Responsive **375px & 768px lengkap tiap role**: tenant/admin diuji via AJ-07c (lihat C19-01/C19-02); owner 390px sudah ✓ — hamburger. Sisa: role/staf/publik device-mode manual; konsolidasi console-error global; error-boundary (matikan BE → pesan ramah); `NotFoundPage` (sudah dikonfirmasi ada, C02 `/rooms/abc/detail` → EmptyState); a11y keyboard/kontras/screen-reader; offline PWA.
- **Build/test health:** `cd frontend && npm run build` lulus 2026-07-04 (PWA verified); backend `npx tsc --noEmit` lulus; backend unit 1072/1073 PASS (1 skip), backend integration PASS, frontend vitest 111/111 PASS.

## Definition of Done — status
- [x] PWA I8 (dismiss 7-hari) + version sync diverifikasi kode.
- [x] Temuan konsistensi (C01-05, onboarding berulang) dikonsolidasi.
- [~] Responsive tenant/admin 375/768 diuji; C19-01/C19-02 tercatat. Console-global penuh + error-boundary + a11y masih tertunda.
- [x] Temuan `C19-xx`; INDEX baris 19 diupdate.

## Definition of Done
- [ ] PWA: version.ts=version.json, prompt dismiss persistence (I8), offline & update check dicek.
- [ ] Konsistensi layout seluruh halaman ditelusuri; daftar halaman anomali dibuat.
- [ ] A11y (label, autocomplete, keyboard, kontras, alt) diperiksa di form utama.
- [ ] Responsive mobile+tablet ditelusuri untuk halaman utama tiap role.
- [ ] 404 + error boundary + JB-18 global diuji.
- [ ] Daftar konsolidasi console errors + temuan Network sensitif dibuat.
- [ ] Temuan `C19-xx`. Update Progres Global baris 19.
```
```
> **CATATAN AKHIR untuk auditor:** setelah semua 19 checklist selesai, rekap seluruh temuan (`C01-xx`..`C19-xx`) ke satu file ringkasan `docs/audit/RINGKASAN_TEMUAN.md` dikelompokkan per severity, supaya owner bisa membuat antrian perbaikan (fix dilakukan terpisah, bukan di sesi audit).
