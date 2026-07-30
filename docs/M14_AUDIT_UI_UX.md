# M14 — Audit Mendalam UI/UX Lintas Portal

> **Status audit:** SELESAI · **Status eksekusi:** ANTRIAN AKTIF
> **Tanggal:** 30 Juli 2026 · **Target:** pra-go-live KOST48 V5
> **Sumber keputusan:** `M02_KEPUTUSAN_OWNER.md` tetap lebih tinggi daripada dokumen ini.
> **Antrean ringkas:** `M12_CHECKLIST_CHANGELOG.md` Fase AO.

Dokumen ini adalah sumber kerja bersama untuk audit dan perbaikan UI/UX berikutnya. Temuan lama di `CLAUDE.md` dan arsip tidak dianggap valid sebelum dibuktikan ulang di sini.

---

## 1. Ringkasan Eksekutif

UI KOST48 sudah matang secara visual dan sebagian besar responsif, tetapi **UAT saat ini belum layak menjadi bukti kesiapan go-live**. Hambatan utama bukan kosmetik: database UAT tertinggal dua migration sehingga beberapa permukaan utama mengembalikan HTTP 500.

| Area | Hasil | Keputusan |
|---|---|---|
| Database UAT | 🔴 2 dari 23 migration belum diterapkan | Gate pertama sebelum audit ulang |
| Katalog publik | 🔴 Daftar kamar gagal, tetapi kalender tetap menunjukkan 14 kamar | State saling bertentangan |
| Notifikasi & pengumuman | 🔴 500 pada seluruh portal tenant | Disebabkan schema drift UAT |
| Tenant aktif | 🟡 Semua halaman merender, tetapi shell global selalu terkena 500 notifikasi/pengumuman | Audit visual sah; audit data belum bersih |
| Tenant tanpa stay aktif | 🟡 Empty state tersedia, tetapi onboarding global terlalu dominan | Perlu progressive disclosure |
| Loyalitas tenant | 🔴 Potensi ErrorBoundary karena conditional return di antara hooks | Perbaiki sebelum aktivasi fitur |
| Mobile | 🟡 Hanya `/profile` overflow global 7 px; beberapa kontrol/filter terlalu padat | Perbaikan terarah |
| Aksesibilitas | 🟡 Kontras serius di lima permukaan; label form tidak terasosiasi pada auth/profile | Target WCAG 2.1 AA |
| OWNER/ADMIN/STAFF | ⚪ Audit dinamis terblokir oleh drift kredensial UAT dan tidak adanya akun STAFF | Audit statis selesai; crawl nyata wajib diulang |

### Putusan release

**RED sampai AO-00 selesai.** Jangan menyimpulkan UI siap produksi dari screenshot atau build saja selama migration UAT belum sinkron dan crawl OWNER/ADMIN/STAFF belum dapat dijalankan.

---

## 2. Cakupan dan Bukti

### 2.1 Audit dinamis

Audit dijalankan pada aplikasi lokal yang benar-benar aktif dengan backend NestJS, frontend Vite, PostgreSQL UAT, Chrome, dan pemeriksaan Axe.

| Persona/state | Route | Viewport | Kombinasi |
|---|---:|---:|---:|
| Publik | 7 | desktop + mobile | 14 |
| Tenant tanpa stay aktif | 13 | desktop + mobile | 26 |
| Tenant dengan stay aktif | 13 | desktop + mobile | 26 |
| **Total** |  |  | **66** |

Viewport:

- Desktop: `1440 × 1000`.
- Mobile: `375 × 812`.

Route publik: `/`, `/rooms`, `/update-kamar`, `/panduan`, `/reviews`, `/login`, `/forgot-password`.

Route tenant: `/portal/stay`, `/portal/energy`, `/portal/bookings`, `/portal/invoices`, `/portal/tickets`, `/portal/loyalty`, `/portal/manual`, `/portal/checkout`, `/portal/renewal`, `/portal/wifi`, `/portal/announcements`, `/notifications`, `/profile`.

### 2.2 Audit statis

- 74 deklarasi route di `frontend/src/App.tsx` diperiksa.
- Pemetaan role dan menu di `frontend/src/config/navigation.ts` diperiksa.
- Guard STAFF untuk keuangan diverifikasi: invoice, finance, payment review, expense, WiFi sale, refund, dan reports ditolak.
- Komponen shell OWNER/ADMIN/STAFF/TENANT dan mobile bottom navigation diperiksa.
- Temuan dinamis ditelusuri ke file/simbol kode sebelum dimasukkan sebagai backlog.

### 2.3 Tingkat kepastian

| Label | Arti |
|---|---|
| `DYNAMIC` | Terlihat pada browser aktual dan dapat direproduksi |
| `CODE` | Dikonfirmasi langsung dari implementasi |
| `ENV` | Berasal dari keadaan UAT/deploy, bukan kesimpulan desain |
| `BLOCKED-UAT` | Belum dapat diuji dinamis karena akun/data/gate lingkungan |

### 2.4 Batas audit

- Browser terintegrasi tidak dapat dipakai karena kegagalan metadata sandbox; audit diteruskan dengan Chrome sistem dan dependency Playwright proyek.
- Error `ERR_NETWORK_ACCESS_DENIED` untuk resource eksternal dikeluarkan dari temuan produk.
- Posisi fixed bottom navigation pada screenshot full-page dapat muncul di tengah gambar; hal itu **bukan** bukti overlap. Kode sudah memberi `padding-bottom` 68 px.
- Tidak ada reset database, perubahan password, pembuatan akun, atau bypass autentikasi selama audit.
- Kredensial OWNER/ADMIN yang tercantum di docs tidak cocok dengan database UAT saat ini. Database juga tidak memiliki akun STAFF aktif. Karena itu audit dinamis ketiga role tersebut dinyatakan terbatas, bukan dipaksakan.

---

## 3. Metode Penilaian

Audit memakai gabungan:

1. Heuristik Nielsen: visibility, match with real world, control, consistency, error prevention, recognition, efficiency, minimalism, recovery, help.
2. WCAG 2.1 A/AA melalui Axe dan pemeriksaan manual label, landmark, heading, fokus, serta target sentuh.
3. Responsive review pada desktop dan mobile.
4. State review: normal, loading, empty, error, data aktif, dan data tanpa stay aktif.
5. Business-fit terhadap keputusan owner di M02.
6. Role-fit terhadap permission backend/frontend dan larangan STAFF mengakses keuangan.

Severity:

| Level | Makna |
|---|---|
| P0 | Menghalangi UAT/go-live atau membuat permukaan inti tidak dapat dipercaya |
| P1 | Alur penting gagal, crash, atau membingungkan keputusan pengguna |
| P2 | Usability/a11y bermakna tetapi ada jalan lanjut |
| P3 | Polish dengan dampak rendah |

---

## 4. Temuan Terverifikasi

### AO-00 — P0 — Database UAT tertinggal dua migration

**Bukti:** `ENV`, `DYNAMIC`.

`npx prisma migrate status` menemukan 23 migration dan dua belum diterapkan:

1. `20260723000000_announcement_notification_delivery`
2. `20260724090000_public_room_availability`

Dampak aktual:

- `GET /api/me/notifications` → 500.
- `GET /api/announcements/active` → 500.
- `GET /api/public/rooms?...` → 500.
- Query notifikasi gagal karena kolom `AppNotification.category` belum ada di database.
- Semua 26 kombinasi halaman tenant aktif terkena 500 dari shell global, walau konten utama halaman masih dapat merender.

**Bukan solusi:** menambahkan optional chaining atau menyembunyikan error frontend.

**Solusi:** terapkan migration yang sudah ada melalui prosedur UAT/deploy resmi. Tidak membuat migration baru dan tidak memakai `db push`.

**Acceptance criteria:**

- `npx prisma migrate status` menyatakan database up to date.
- Tiga endpoint di atas tidak menghasilkan 5xx.
- Notifikasi dan pengumuman menampilkan data atau empty state sah.
- Katalog dan kalender menggunakan schema yang sama.

**Owner:** DEVOPS/OWNER. AI tidak boleh menjalankan migration tanpa otorisasi eksplisit.

---

### AO-01 — P1 — Katalog publik menampilkan dua kebenaran yang bertentangan

**Bukti:** `DYNAMIC`, desktop dan mobile.

Saat endpoint daftar kamar 500:

- halaman menulis `0 kamar ditampilkan`;
- alert menulis `Gagal memuat katalog kamar`;
- pada halaman yang sama kalender ketersediaan tetap menunjukkan `14 kamar`, termasuk kamar kosong dan terisi.

Ini lebih buruk daripada satu error tunggal karena calon tenant tidak tahu bagian mana yang benar.

![Katalog publik desktop dalam state terdegradasi](assets/m14-uiux-audit/public-rooms-desktop.png)

![Katalog publik mobile dalam state terdegradasi](assets/m14-uiux-audit/public-rooms-mobile.png)

**File utama:**

- `frontend/src/pages/rooms/PublicRoomsPage.tsx`
- komponen kalender/availability yang dipakai halaman tersebut
- `frontend/src/styles/11-public-pages.css`

**Acceptance criteria:**

- Bila katalog gagal tetapi kalender berhasil, tampilkan banner `Sebagian data tersedia` dan jangan menyatakan `0 kamar` sebagai fakta.
- Bila kedua sumber wajib konsisten, sembunyikan keduanya dalam satu error state dengan tombol coba lagi.
- Empty state hanya digunakan ketika request sukses dan `items.length === 0`.
- Desktop dan mobile memberi pesan yang sama.

---

### AO-02 — P1 — `MyLoyaltyPage` melanggar aturan urutan hooks

**Bukti:** `DYNAMIC`, `CODE`.

`frontend/src/pages/portal/MyLoyaltyPage.tsx` melakukan conditional `<Navigate>` setelah `configQuery`, tetapi sebelum hooks query/mutation lain. Jika config berubah dari loading menjadi loyalty-disabled, jumlah hooks antar-render berubah dan React dapat masuk ErrorBoundary.

Gejala tercatat sekali pada tenant tanpa stay aktif: halaman loyalitas berubah menjadi `Halaman belum dapat dimuat`. Pada run tenant aktif, config sudah ter-cache sehingga route langsung redirect; sifatnya intermiten.

**Root cause anchor:** `MyLoyaltyPage.tsx` sekitar conditional return `tenantLoyaltyEnabled` sebelum `loyaltyQuery`, `rewardsQuery`, dan hooks lainnya.

**Acceptance criteria:**

- Semua hooks selalu dipanggil dalam urutan yang sama.
- Query loyalty memakai `enabled` ketika fitur nonaktif, atau guard dipindah ke komponen wrapper/route.
- First visit, refresh, dan navigasi berulang saat loyalty disabled selalu redirect tanpa console React error.
- Tambahkan unit test untuk config loading → disabled dan loading → enabled.

---

### AO-03 — P1 — Kredensial dan data UAT tidak mendukung audit lintas role

**Bukti:** `ENV`, `BLOCKED-UAT`.

- Akun OWNER dan ADMIN di database UAT menggunakan identitas berbeda dari akun dev pada M01/M11/M08.
- Password dokumentasi tidak cocok dengan akun UAT tersebut.
- Tidak ada akun STAFF aktif di database UAT.
- Existing `admin-owner-crawl.spec.ts` gagal pada tahap login, sebelum crawl route.

Ini bukan alasan untuk mengubah password database secara diam-diam. Yang dibutuhkan adalah fixture UAT terkontrol atau kredensial audit yang diberikan owner.

**Acceptance criteria:**

- Ada lima akun audit eksplisit di lingkungan UAT non-produksi: OWNER, ADMIN, STAFF, TENANT dengan stay aktif, dan TENANT tanpa stay aktif.
- Password disimpan di env lokal/secret manager, bukan hard-code docs atau test.
- Crawl OWNER, ADMIN, dan STAFF dapat berjalan tanpa reset data produksi/UAT utama.
- M11 dan M08 membedakan `seed-dev` dari kredensial UAT aktual.

---

### AO-04 — P1 — Navigasi tenant mobile berlapis dan memakan area konten

**Bukti:** `DYNAMIC`, `CODE`.

Tenant occupied menampilkan:

- topbar akun;
- tujuh tab/chip menu utama;
- bottom navigation berisi tiga menu utama + `Lainnya`.

Pada lebar 375 px, pengguna melihat dua sistem navigasi yang mewakili tujuan sama. Halaman seperti energi, invoice, tiket, WiFi, notifikasi, dan profil baru mulai setelah area chrome yang besar.

Tenant tanpa stay aktif juga menerima `GettingStartedGuide` global pada hampir semua route, sehingga instruksi tiga langkah mengalahkan tujuan halaman yang sedang dibuka.

**File utama:**

- `frontend/src/components/tenant/TenantWorkspaceTabs.tsx`
- `frontend/src/components/tenant/GettingStartedGuide.tsx`
- `frontend/src/components/layout/MobileBottomNav.tsx`
- `frontend/src/config/navigation.ts`
- `frontend/src/styles/10-misc.css`

**Acceptance criteria:**

- Mobile memakai satu navigasi primer. Rekomendasi: bottom nav tetap primer; top tabs menjadi horizontal compact/`Lainnya`, atau disembunyikan pada ≤768 px.
- `GettingStartedGuide` lengkap hanya tampil pada `/portal/stay` atau `/portal/bookings`; route lain memakai banner ringkas yang dapat ditutup.
- Desktop tetap menyediakan tujuh tujuan tanpa kehilangan fitur.
- Active state, back behavior, dan deep link tetap benar.

---

### AO-05 — P1 — Status kontrak tenant menampilkan pesan semantik yang bertentangan

**Bukti:** `DYNAMIC`.

Pada tenant aktif yang masa sewanya sudah lewat empat hari, dashboard sekaligus menampilkan:

- `Lewat dari jadwal` / `100% terlewati`;
- periode berakhir 26 Juli 2026;
- badge `Masa Sewa Aktif`.

Secara data status dapat tetap `ACTIVE`, tetapi copy tenant tidak menjelaskan konsekuensinya: apakah sedang overstay, masa tenggang, wajib perpanjang, atau harus ajukan keluar.

**File utama:** `frontend/src/pages/portal/MyStayPage.tsx` dan helper label/progress stay.

**Acceptance criteria:**

- Gunakan label komposit seperti `Aktif — melewati jadwal` atau state bisnis khusus yang sudah disetujui backend.
- CTA berikutnya eksplisit: perpanjang, ajukan keluar, atau hubungi admin.
- Jangan menampilkan `aktif` sebagai sinyal hijau tunggal ketika tanggal sudah lewat.
- Test boundary: H-1, H, H+1, dan overstay beberapa hari.

---

### AO-06 — P1 — Label form auth/profile tidak terasosiasi secara programmatik

**Bukti:** `DYNAMIC`, `CODE`.

Scanner DOM menemukan:

- `/login`: 2 control tanpa hubungan label programmatik;
- `/forgot-password`: 1 control;
- `/profile`: 4 control pada kedua viewport.

Label terlihat secara visual, tetapi `Form.Group` tidak memakai `controlId`, `Form.Label` tidak memakai `htmlFor`, dan input/`PasswordInput` tidak menerima id yang cocok.

**File utama:**

- `frontend/src/pages/auth/LoginPage.tsx`
- `frontend/src/pages/auth/ForgotPasswordPage.tsx`
- `frontend/src/pages/profile/ProfilePage.tsx`
- `frontend/src/components/common/PasswordInput.tsx`

**Acceptance criteria:**

- Semua input/select/textarea memiliki accessible name yang berasal dari label terkait.
- Error inline terhubung dengan `aria-describedby`; invalid state memakai `aria-invalid`.
- Password visibility button memiliki nama yang berubah sesuai state.
- Axe tidak melaporkan pelanggaran form-label.

---

### AO-07 — P2 — Profile mobile overflow 7 px dan terlalu panjang

**Bukti:** `DYNAMIC`.

`/profile` adalah satu-satunya route dari 66 kombinasi yang memiliki overflow halaman global: `scrollWidth 382` pada viewport `375`.

Halaman juga memuat dalam satu aliran:

- informasi akun;
- ganti password;
- upload KTP;
- OCR KTP;
- tujuh field data penghuni;
- empat field tambahan opsional.

**File utama:** `frontend/src/pages/profile/ProfilePage.tsx` dan style profile/mobile terkait.

**Acceptance criteria:**

- `documentElement.scrollWidth <= innerWidth` pada 320, 360, 375, 390, dan 414 px.
- Pecah menjadi section/accordion: Akun, Keamanan, KTP, Data Wajib, Data Opsional.
- Ringkasan kelengkapan dan aksi utama selalu terlihat sebelum detail.
- Fokus dan error otomatis membuka section yang relevan.

---

### AO-08 — P2 — Kontras serius masih muncul pada lima permukaan

**Bukti:** `DYNAMIC` melalui Axe.

Observasi serious `color-contrast` muncul pada:

- katalog `/rooms`;
- wizard `/update-kamar`;
- `/notifications`;
- `/profile`;
- ErrorBoundary loyalitas pada run tenant tanpa stay aktif.

Run aktif mengulang temuan notifications/profile pada desktop dan mobile. Jangan menghitung observasi berulang sebagai issue baru.

**Acceptance criteria:**

- Axe serious/critical = 0 pada route di atas.
- Teks normal minimal 4.5:1; teks besar minimal 3:1.
- State disabled tetap terbaca tanpa tampak seperti aksi aktif.
- Verifikasi light theme desktop/mobile.

---

### AO-09 — P2 — Landmark dan heading belum konsisten

**Bukti:** `DYNAMIC`, `CODE`.

Public pages tanpa elemen `<main>` pada audit:

- `/`;
- `/panduan`;
- `/reviews`;
- `/login`;
- `/forgot-password`.

Dashboard `/portal/stay` tidak memiliki `<h1>`; title visual memakai struktur non-H1. Redirect `/portal/bookings` dan loyalty-disabled menuju halaman yang sama sehingga mewarisi masalah.

**Acceptance criteria:**

- Tepat satu `<main>` per halaman/shell.
- Tepat satu H1 yang menjelaskan tujuan route aktual.
- Skip link menuju main tersedia pada seluruh shell, termasuk public dan tenant.
- Heading tidak lompat level untuk sekadar styling.

---

### AO-10 — P2 — Manual tenant terlalu padat untuk layar kecil

**Bukti:** `DYNAMIC`.

`/portal/manual` merender sekitar 3.276 karakter pada mobile dalam satu aliran panjang. Kategori aturan terlihat sebagai card bertumpuk tetapi tidak cukup membantu pencarian cepat ketika tenant butuh jawaban operasional.

**Acceptance criteria:**

- Tambah indeks kategori atau accordion yang dapat dibuka per topik.
- Sediakan pencarian lokal sederhana bila tidak menambah dependency.
- Emergency/help/WhatsApp tetap mudah ditemukan.
- Deep link/anchor per kategori dapat dibagikan admin.

---

### AO-11 — P2 — Filter invoice dan target sentuh kurang memiliki affordance mobile

**Bukti:** `DYNAMIC` dan heuristic target-size.

- Filter status invoice berada dalam area horizontal; pilihan di kanan tampak terpotong tanpa petunjuk bahwa baris dapat digeser.
- Heuristic `<44 px` menemukan kandidat pada seluruh route, terutama link teks, tombol `size="sm"`, chip, dan back link 40 px. Angka mentah bukan jumlah defect karena sebagian elemen inline bukan target mandiri.

**Acceptance criteria:**

- Target aksi primer dan standalone minimal 44 × 44 CSS px.
- Filter horizontal mempunyai gradient/chevron/scroll-snap atau wrap yang jelas.
- Tab aktif selalu digulirkan ke area terlihat.
- Keyboard dan screen reader dapat membaca nama + state filter.

---

### AO-12 — P2 — `npm run dev` tidak terhubung ke backend tanpa env tambahan

**Bukti:** `ENV`, `CODE`.

`frontend/vite.config.ts` tidak mendefinisikan proxy `/api`. File `.env.example` memiliki `VITE_API_BASE_URL`, tetapi `npm run dev` biasa tidak otomatis menggunakannya. Gejala awal adalah login selalu gagal walau kredensial tenant benar.

**Acceptance criteria:** pilih satu kontrak dan dokumentasikan:

1. tambahkan proxy dev `/api` → `http://localhost:3000`; atau
2. sediakan `.env.development` aman tanpa secret dengan `VITE_API_BASE_URL=http://localhost:3000/api`.

Command pada AGENTS/CLAUDE harus berhasil tanpa langkah tersembunyi.

---

## 5. Hal yang Sudah Baik

- 66 kombinasi route–viewport tidak menghasilkan halaman root kosong.
- Hanya profile memiliki overflow halaman global; public landing, katalog, energi, invoice, tiket, WiFi, dan manual tetap muat pada 375 px.
- Empty state tenant tanpa stay aktif jelas dan menyediakan CTA ke katalog.
- Error state katalog/notifikasi memberi pesan manusiawi dan tombol tindak lanjut.
- Halaman energi membedakan monitoring sensor dari dasar tagihan.
- Ticket mobile memiliki CTA jelas, daftar perbaikan gratis, dan empty state yang informatif.
- Role guard STAFF untuk keuangan sesuai keputusan owner; tidak ada link invoice di navigasi STAFF.
- Top-level route OWNER/ADMIN/TENANT/STAFF dipisahkan dengan `RequireRoles` dan pesan denied khusus role.
- Public landing memiliki hierarki dan CTA yang konsisten pada desktop/mobile.

---

## 6. Matriks Status per Role

| Role | Audit visual nyata | Audit route/permission | Status |
|---|---|---|---|
| PUBLIC | 7 route × 2 viewport | Ya | Selesai, terdegradasi migration |
| TENANT tanpa stay | 13 route × 2 viewport | Ya | Selesai |
| TENANT aktif | 13 route × 2 viewport | Ya | Selesai, shell terkena 500 |
| STAFF | Belum | Ya | `BLOCKED-UAT` — akun tidak ada |
| ADMIN | Login gagal dengan kredensial docs | Ya | `BLOCKED-UAT` |
| OWNER | Login gagal dengan kredensial docs | Ya | `BLOCKED-UAT` |

---

## 7. Antrean Eksekusi Kolaboratif

### 7.1 Status task

Gunakan status berikut di tabel:

- `OPEN`
- `CLAIMED:<nama-agent>`
- `IN_PROGRESS:<nama-agent>`
- `REVIEW`
- `DONE:<commit>`
- `BLOCKED:<alasan>`

| Task | Prioritas | Status | Ownership file utama | Gate |
|---|---|---|---|---|
| AO-00 Sinkronkan dua migration UAT | P0 | `BLOCKED:otorisasi owner/devops` | `backend/prisma/migrations/*` hanya deploy, tanpa edit | migrate status + 3 endpoint |
| AO-01 State terdegradasi katalog publik | P1 | `OPEN` | `PublicRoomsPage.tsx`, komponen availability, `11-public-pages.css` | desktop/mobile + API failure mock |
| AO-02 Perbaiki hook-order loyalitas | P1 | `OPEN` | `MyLoyaltyPage.tsx`, test loyalty | unit test loading→disabled/enabled |
| AO-03 Fixture/kredensial audit lintas role | P1 | `BLOCKED:owner pilih mekanisme akun UAT` | docs/env/test only | crawl 3 role login |
| AO-04 Ramping navigasi tenant mobile | P1 | `OPEN` | `TenantWorkspaceTabs.tsx`, `GettingStartedGuide.tsx`, `MobileBottomNav.tsx`, `navigation.ts` | 320–414 px + deep link |
| AO-05 Semantik kontrak overstay | P1 | `OPEN` | `MyStayPage.tsx`, helper/test stay | H-1/H/H+1/overstay |
| AO-06 Label auth/profile | P1 | `OPEN` | auth pages, `ProfilePage.tsx`, `PasswordInput.tsx` | Axe + keyboard |
| AO-07 Profile overflow + disclosure | P2 | `OPEN` | `ProfilePage.tsx`, style profile | 5 viewport mobile |
| AO-08 Kontras lintas surface | P2 | `OPEN` | CSS sesuai route; klaim per file | Axe 0 serious/critical |
| AO-09 Landmark/H1 | P2 | `OPEN` | public shell, auth shell, tenant stay | semantic smoke test |
| AO-10 Manual tenant scanability | P2 | `OPEN` | `MyManualPage.tsx`, style manual | mobile visual + keyboard |
| AO-11 Filter/tap target mobile | P2 | `OPEN` | invoice + shared mobile controls | 44 px + active-visible |
| AO-12 Kontrak API dev | P2 | `OPEN` | `vite.config.ts` atau `.env.development`, docs command | login dev tanpa langkah tersembunyi |
| AO-13 Crawl OWNER/ADMIN/STAFF | P0 gate | `BLOCKED:AO-00+AO-03` | `frontend/e2e/admin-owner-crawl.spec.ts` + staff crawl | 0 crash/5xx/blank/guard salah |
| AO-14 Re-audit final 5 role | P0 gate | `BLOCKED:AO-01..AO-13` | QA only | seluruh Definition of Done |

### 7.2 Gelombang kerja

**Wave 0 — wajib lebih dulu**

- AO-00 migration UAT, hanya setelah otorisasi owner/devops.
- AO-03 mekanisme akun audit.
- AO-12 kontrak API dev dapat dikerjakan paralel karena file terpisah.

**Wave 1 — dapat paralel setelah AO-00**

- Agent Public: AO-01 + bagian public AO-08/AO-09.
- Agent Tenant Shell: AO-04; jangan menyentuh `MyStayPage`/`ProfilePage`.
- Agent Tenant Logic: AO-02 + AO-05; jangan menyentuh shell/CSS global.
- Agent A11y Form: AO-06 + AO-07; jangan menyentuh navigation.

**Wave 2 — integrasi**

- AO-10 dan AO-11 setelah shell mobile stabil.
- AO-13 crawl role.
- AO-14 audit final dan penutupan checklist.

### 7.3 Aturan anti-konflik antar-AI

1. Klaim task di tabel sebelum edit.
2. Satu task = satu commit berbahasa Indonesia.
3. Jangan menyentuh file milik task lain yang `CLAIMED`/`IN_PROGRESS`.
4. Jika membutuhkan file shared yang sudah diklaim, kirim catatan dependency; jangan edit paralel.
5. Jangan menyalin klaim audit lama tanpa reproduksi.
6. Jangan menambah dependency npm tanpa approval owner.
7. Jangan menjalankan migration, reseed, reset password, atau `db push` tanpa otorisasi.
8. Setelah commit: update status di M14, centang M12, dan prepend satu baris M13.
9. Simpan screenshot hanya jika tidak memuat PII tenant.
10. Jangan menyentuh file untracked milik agent lain (`A`, `AUDIT_L`, `AUDIT_LAPOR`, `.claude/`).

---

## 8. Definition of Done Fase AO

- [ ] Database UAT up to date; tidak ada pending migration.
- [ ] Endpoint katalog, notifikasi, dan pengumuman bebas 5xx.
- [ ] Katalog tidak lagi menampilkan `0 kamar` bersamaan dengan kalender 14 kamar.
- [ ] Loyalitas enabled/disabled tidak memicu React ErrorBoundary.
- [ ] Crawl OWNER, ADMIN, STAFF, TENANT, dan PUBLIC selesai.
- [ ] 0 blank page, 0 page crash, 0 unexpected redirect-login.
- [ ] 0 Axe serious/critical pada route audit.
- [ ] 0 overflow halaman pada 320–1440 px; scroller lokal harus punya affordance.
- [ ] Semua form memiliki label programmatik dan error association.
- [ ] Tepat satu main dan satu H1 bermakna per route/shell.
- [ ] Navigasi tenant mobile tidak diduplikasi sebagai dua menu primer.
- [ ] Status kontrak lewat tanggal memiliki copy + CTA yang tidak kontradiktif.
- [ ] `npm run build` frontend lulus.
- [ ] `npx vitest run` lulus.
- [ ] Backend `npx tsc --noEmit` lulus jika ada perubahan backend/deploy.
- [ ] Screenshot before/after bebas PII dilampirkan pada commit/review.

---

## 9. Perintah Verifikasi

```powershell
# Status migration — read-only
cd backend
npx prisma migrate status

# Gate frontend
cd ../frontend
npm run build
npx vitest run

# Dev frontend harus terhubung ke API tanpa langkah tersembunyi setelah AO-12
npm run dev -- --host 127.0.0.1 --port 5174

# Crawl existing OWNER/ADMIN setelah fixture UAT tersedia
$env:E2E_BASE='http://127.0.0.1:5174'
npx playwright test e2e/admin-owner-crawl.spec.ts --workers=1
```

Kredensial audit tidak boleh ditulis ke dokumen ini. Gunakan env lokal atau secret manager.

---

## 10. Handoff untuk Agent Berikutnya

Mulai dari urutan berikut:

1. Baca M14 bagian AO-00 dan cek `npx prisma migrate status`.
2. Jika migration masih pending, jangan melakukan audit visual final.
3. Klaim satu task `OPEN` yang file ownership-nya tidak bertabrakan.
4. Reproduksi temuan sebelum edit.
5. Implementasi + test + screenshot bebas PII.
6. Commit task, lalu update M14/M12/M13.

Audit dinyatakan selesai hanya saat Definition of Done terpenuhi, bukan saat semua halaman terlihat “bagus” pada satu screenshot.
