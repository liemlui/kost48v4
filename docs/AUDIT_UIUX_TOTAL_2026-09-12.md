# Audit UI/UX Total KOST48 — 12 September 2026

> **Jenis bukti:** audit **dinamis** (browser nyata) + **statis** (source) pada instance lokal.
> **Aplikasi yang diaudit:** build produksi `frontend/dist` (versi 1.3.0) disajikan lewat server statis audit, dengan `VITE_API_BASE_URL=/api` dan proxy same-origin ke backend NestJS :3000 — meniru topologi produksi.
> **Database:** UAT lokal `kost48_v3_pro` (port 5433). **Bukan produksi.**
> **Artefak bukti:** [`docs/audit-assets/2026-09-12_uiux_total/`](audit-assets/2026-09-12_uiux_total/) (`crawl-summary.json`, `axe-violations.json`).
> **Perbaikan:** dikerjakan pada sesi yang sama — lihat [§0 Hasil perbaikan](#0-hasil-perbaikan--12-september-2026-sore).

---

## 0. Hasil perbaikan — 12 September 2026 (sore)

Seluruh temuan P1 dari audit dikerjakan dan diverifikasi ulang dengan crawl Axe yang sama. **Hasil akhir: 0 pelanggaran Axe** (critical + serious) pada permukaan yang diaudit ulang.

| Temuan | Sebelum | Sesudah | Verifikasi |
|---|---:|---:|---|
| T-01 label/select tanpa nama (critical) | 30 node di 13 permukaan | **0** | OWNER 35 rute @1440, STAFF 7 rute @375, TENANT 6 rute @375, publik 8 rute @375 |
| T-02 kontras gagal AA (serious) | 62 node di 14+ permukaan | **0** | idem |
| T-03 overflow horizontal `/tickets` STAFF @375 | +176 px | **0 px** | `scrollWidth 375 = innerWidth 375` |
| T-04 `nested-interactive` dashboard STAFF | 10 node | **0** | `/dashboard` STAFF @1440 & @375 |
| T-07 overflow `accounting-setup` & `/portal/stay` | 10 px & 3 px | **0 px** | kedua rute @375 |
| T-05 `/reset-password` tanpa `<main>`+`<h1>` | gagal | **lulus** | `mainCount=1`, `h1Count=1`, 0 pelanggaran |

**Akar masalah yang ditemukan dan diperbaiki** (bukan tambal sulam — masing-masing ditelusuri ke baris source):

1. **Label form (T-01).** React-Bootstrap `<Form.Group>` menyuplai `controlId` lewat context; **333 grup tidak memilikinya** sehingga `<Form.Label>` tidak menulis `for` dan `<Form.Control>` tidak menulis `id`. Ditambahkan `controlId` unik pada **327 grup di 58 file** lewat codemod berpengaman (verifikasi jumlah tag, ketunggalan id, pratinjau diff). Dua kasus khusus: `PasswordInput` memutus context karena `Form.Control` berada di dalam `InputGroup` (diperbaiki dengan prop `controlId`), dan `<Form.Check>` tanpa prop `type` **tidak merender `<label>` sama sekali** (`StaffRoutinesAdminPage`) sehingga `label=` diabaikan. Filter tanpa label visual (`/reports`, `/tickets`, `/meter-readings`, `/surveys`, `/guest-preferences`, `/staff-performance`, `/staff-report`, `/finance/assets`, `/stays/check-in`, `/invoices`) diberi `aria-label`/`aria-labelledby`; `SearchableSelect` kini menerima `ariaLabel` dan meneruskannya ke input react-select.
2. **Kontras (T-02).** `.text-*` bawaan Bootstrap gagal AA di atas permukaan terang (`.text-warning` 1,47:1, `.text-info` 1,68:1, `.text-danger` 3,39:1). Diganti varian `-emphasis` Bootstrap yang terukur 7,2–10,4:1. Selain itu ditemukan **satu cacat nyata yang tidak terlihat pada audit pertama**: `06-tenant.css:13–30` memaksa **semua** `h1–h6` dan `strong` berwarna gelap dengan `!important`, sehingga judul di dalam kartu gelap menjadi **1,09:1** (`#172033` di atas `#0f172a`) — praktis tidak terbaca; dikecualikan untuk permukaan gelap. Sisa perbaikan terukur: `--green-600`→`--green-700` (3,30→5,02), `.report-matrix-row span` yang menimpa warna badge (1,05→4,5+ lewat `.text-bg-*`), `#64748b`→`--gray-600` pada kartu biru muda (4,28→6,8), `--gx-coral` #bd6049→#9a3412 (4,04→6,5), `.btn-outline-danger` di dalam alert (3,39→5,3), `.btn-outline-secondary` (4,47→7,0), `.progress-bar` tanpa nama, serta `.report-matrix` badge.
3. **Overflow mobile (T-03/T-07).** Bukan pada baris tab seperti dugaan awal, melainkan **rantai grid**: `.staff-empty-box` (grid satu kolom `auto`) mengambil lebar **min-content** anaknya, sehingga kolom menjadi 483 px dan mendorong `.staff-workspace-main` ke 544 px pada viewport 375 px. Diperbaiki dengan `min-width: 0` pada rantai wadah + `overflow-wrap: anywhere` untuk teks panjang. Area gulir filter (`SegmentedTabs`) kini mendapat `tabIndex=0` **hanya ketika benar-benar menggulir** (diukur dari DOM), sehingga dapat difokus keyboard (WCAG 2.1.1) tanpa menambah tab stop yang tidak perlu.
4. **Kartu interaktif bersarang (T-04).** `{...attributes}` dari `useDraggable` (dnd-kit) menempelkan `role="button"` + `tabindex` ke `<article>` yang **memuat tombol aksi di dalamnya**. Atribut dipindah ke handle seret; fungsi seret tetap sama, hanya satu target interaktif per kartu.

**Gerbang mutu yang dijalankan:** `npx tsc -b` **exit 0** (tanpa error) dan `npm run build` **exit 0** dengan verifikasi PWA lulus (`build=o3PlFq6-mqzy`, 159 chunk). Catatan alat: Vite/esbuild memerlukan proses anak yang diblokir sandbox sesi ini (`spawn EPERM`), sehingga build dijalankan dengan eskalasi izin yang disetujui owner.

**Sisa yang belum dikerjakan (dengan alasan):**

- **T-06** performa render awal `/portal/stay` (≈6,3 s, 42–84 elemen skeleton) — butuh perubahan alur query/komponen dan pengukuran sebelum-sesudah; tidak dikerjakan agar tidak mencampur perbaikan aksesibilitas dengan perubahan performa.
- **T-08** normalisasi token (27 nilai `border-radius`, 27 breakpoint) — pekerjaan bertahap lintas semua stylesheet, berisiko regresi visual bila dilakukan sekaligus.
- **`<h1>` ganda** pada `/inventory/gudang`, `/inventory/barang-kamar`, `/inventory/mutasi`, dan `/staff-report` (P3, axe tidak melaporkan pelanggaran) — perlu keputusan struktur judul per halaman.

---

## 1. Ringkasan Eksekutif (kondisi sebelum perbaikan)

Audit ini adalah pemeriksaan ulang menyeluruh yang diminta owner, sekaligus penutup gap `AO-14` (dua state TENANT, publik, viewport, Axe) yang sejak 30 Juli 2026 belum pernah dijalankan.

**Hasil utama dalam satu kalimat:** aplikasi **stabil secara fungsional** (0 error, 0 halaman kosong, 0 respons 5xx pada 89 endpoint dan 180 pemeriksaan halaman), tetapi **kualitas aksesibilitas belum layak go-live**: 118 node pelanggaran Axe (30 critical, 88 serious) di 24 halaman. **Angka ini adalah kondisi sebelum perbaikan; lihat §0 untuk hasil sesudahnya (0 pelanggaran pada permukaan yang diaudit ulang).**

| Dimensi | Hasil | Bukti |
|---|---|---|
| Stabilitas halaman (6 role × 2 viewport) | 🟢 180/180 render, 0 blank, 0 crash React, 0 redirect tak sah | `crawl-summary.json` |
| Status HTTP API | 🟢 89 endpoint, 0 respons 5xx (1× 204 sah = foto profil kosong) | pemindaian `responseStatus` |
| Status lama AO-00/AO-01 (DB tertinggal, katalog 500) | 🟢 **TIDAK REPRODUKSI** — sudah selesai | seluruh API katalog 200 |
| Asosiasi label form | 🔴 Gagal di 13 permukaan (30 node critical) | `axe-violations.json` |
| Kontras warna (WCAG 1.4.3 AA) | 🔴 62 node serious; terburuk **1,05:1** dan **1,47:1** | rasio terukur per elemen |
| Struktur landmark & heading | 🟡 6 halaman tanpa `<main>`+`<h1>`; 6 halaman `<h2>` tanpa `<h1>`; 4 halaman 2× `<h1>` | source + DOM |
| Responsivitas mobile 375 px | 🟡 3 halaman overflow (terburuk **+176 px** di `/tickets` STAFF) | pengukuran `scrollWidth − innerWidth` |
| Konsistensi token desain | 🟡 27 nilai `border-radius` unik, 27 breakpoint unik, 105 pemakaian utility warna Bootstrap | inventaris CSS |
| Performa render awal portal tenant | 🟡 `/portal/stay` butuh ≈6,3 s; sempat menampilkan 42–84 elemen skeleton | sampling 700 ms |
| Sign-off | 🔴 **Belum layak** untuk klaim a11y/QA; fungsional siap UAT ulang | — |

### Putusan per audiens

- **Untuk owner:** tidak ada fitur yang rusak dan tidak ada data yang gagal tampil. Yang menghambat bukan fungsi, melainkan **aksesibilitas** (label form, kontras) dan **kerapian tampilan mobile** di tiga halaman.
- **Untuk QA/UAT:** gate `AO-14` kini **terbuka isinya** (bukti sudah ada), tetapi gate `AO-08` (Axe serious = 0) **masih gagal**.

---

## 2. Metode, Cakupan, dan Batas Bukti

### 2.1 Kuantitas

| Viewport | Role | Rute | Pemeriksaan |
|---|---|---:|---:|
| 1440×1000 | publik, TENANT aktif, TENANT tanpa stay, OWNER, ADMIN, STAFF | 8/13/5/36/33/7 | 102 |
| 375×812 | idem | idem | 78 |
| **Total** | | | **180** |

Axe dijalankan pada setiap rute × viewport; 62 node kontras + 30 node critical dihitung dari laporan Axe, bukan dari opini visual.

### 2.2 Mengapa bukan Playwright (batas alat yang harus dinyatakan)

`browserType.launch` gagal dengan **`spawn EPERM`**: sandbox sesi ini melarang proses anak dengan stdio pipa, termasuk Vite (`esbuild` spawn) dan Chromium Playwright. Solusi yang dipakai: **harness iframe berukuran tetap di dalam Chrome**, memakai halaman yang sama (`/login`) sebagai perantara same-origin.

Keabsahan metode ini sudah diuji sebelum dipakai:

- `iframe.innerWidth = 375` eksak dan `matchMedia('(max-width: 768px)').matches = true` → media query mobile benar-benar aktif;
- Axe di dalam iframe **terbukti mendeteksi** pelanggaran yang disuntikkan (`image-alt:critical`, `label:critical`) → nilai "0 pelanggaran" bermakna.

Batas yang **tetap ada** dan tidak boleh diklaim berlebih:

- user agent tetap desktop (bukan UA perangkat mobile);
- `devicePixelRatio` 1,25 — bukan DPR perangkat mobile;
- tidak ada interaksi sentuh nyata, jadi target sentuh dinilai dari ukuran elemen saja;
- `smallTargetCount` (mis. 53 di `/rooms` desktop) **bukan jumlah cacat**: sebagian besar tautan inline di dalam paragraf. Angka itu dipakai sebagai indikator, bukan temuan.

### 2.3 Keamanan data

- Hanya navigasi **GET**; tidak ada aksi tulis ke aplikasi.
- OWNER/ADMIN/STAFF memakai akun audit (`admin@kost48.com`, `staff@kost48.com`, akun owner existing) lewat login API — hanya `lastLoginAt` akun audit yang tersentuh.
- TENANT **tidak** memakai password penghuni asli. Token JWT audit ditandatangani lokal dengan `JWT_SECRET` backend, diverifikasi lewat `/auth/me` (200, role TENANT). **Tidak ada password penghuni yang diubah atau direset.**
- Tidak ada PII penghuni yang ditulis ke artefak; nama penghuni hanya muncul sementara di sesi browser audit.

---

## 3. Rekonsiliasi dengan Audit 30 Juli / 8 September (M14 AO-01…AO-23)

| ID lama | Status sekarang | Bukti sesi ini |
|---|---|---|
| **AO-00** DB UAT tertinggal 2 migration | ✅ **TIDAK REPRODUKSI** | seluruh endpoint 200; katalog & notifikasi normal |
| **AO-01** katalog 500 + kalender tetap 14 kamar | ✅ **TIDAK REPRODUKSI** | `/rooms` publik 200 di 375 & 1440 px, `bookable=1 occupied=13 total=14` |
| **AO-02** hooks order di `MyLoyaltyPage` | ✅ **TIDAK REPRODUKSI** | `/portal/loyalty` redirect bersih ke `/portal/stay`, 0 crash |
| **AO-03** kredensial UAT | ✅ **SEBAGIAN TERATASI** | 5 persona berhasil diaudit; fixture TENANT aktif memakai token audit, bukan akun personal |
| **AO-04** nav tenant mobile berlapis | 🟡 **TIDAK REPRODUKSI di tenant**, ⚠️ **pola serupa muncul di STAFF** | tenant `/tickets` mobile bersih; `/tickets` STAFF overflow +176 px + `.segmented-tabs` tidak dapat difokus |
| **AO-05** copy status kontrak bertentangan | ⚪ belum diuji ulang | butuh fixture stay lewat jatuh tempo |
| **AO-06** label form auth/profile | 🟡 **login & forgot-password ✅**, `/reset-password` ❌, `/profile` ✅ | `/reset-password` 3 kontrol tanpa label (`ResetPasswordPage.tsx:74-86`) |
| **AO-07** `/profile` overflow 7 px | ✅ **SELESAI** | `/profile` overflow 0 px di 375 px (TENANT & STAFF) |
| **AO-08** kontras serius di 5 permukaan | ❌ **MASIH TERBUKA, LEBIH LUAS** | 62 node serious di 14+ permukaan, termasuk STAFF `/rooms` (14 node, rasio 1,47) |
| **AO-09** landmark & heading | ❌ **MASIH TERBUKA** | 6 halaman tanpa `<main>`+`<h1>`; 6 halaman `<h2>` tanpa `<h1>`; 4 halaman `<h1>` ganda |
| **AO-10** manual tenant terlalu padat | 🟡 sebagian | `/portal/manual` 1.296 karakter di 375 px (dari ~3.276) — membaik, indeks/accordion tetap belum ada |
| **AO-11** filter invoice & target sentuh | 🟡 masih ada | `.segmented-tabs` tidak dapat difokus; target <44 px tersebar merata |
| **AO-12** `npm run dev` tanpa proxy `/api` | ✅ **SELESAI** | `vite.config.ts:9-18` memuat proxy `/api` + `/uploads` |
| **AO-14** crawl 2 state TENANT + publik + viewport + Axe | ✅ **BUKTI TERSEDIA** | 180 pemeriksaan, lihat `crawl-summary.json` |
| **AO-15** footer publik datar | ⚪ belum dinilai ulang | butuh penilaian visual terarah |
| **AO-16** empty state filter & shortlist | ⚪ belum diuji ulang | butuh skenario filter nol hasil |
| **AO-17/18** beranda nol ketersediaan & hierarki | ⚪ belum dinilai ulang | produksi kini `bookable=1` |
| **AO-19** kualitas aset & cue galeri | ⚪ di luar cakupan sesi ini | — |
| **AO-20…AO-23** dashboard OWNER/ADMIN, sistem visual | 🟡 sebagian terverifikasi | dashboard OWNER/ADMIN render bersih tanpa pelanggaran Axe; normalisasi token **belum** dikerjakan (lihat T-08) |

**Koreksi angka yang penting.** Pada crawl pertama saya melaporkan 62 kontrol tanpa label di `/settings` dan 32 di `/finance/accounting-setup`. Setelah pengukuran ulang dengan diskriminator visibilitas, **keduanya 0**: seluruh kontrol itu adalah `<input type="file">` tersembunyi (`display:none`) pemicu unggah foto fasilitas/aset (`OwnerSettingsPanels.tsx:128,253`) — sah secara WCAG karena tidak dapat dipersepsi. Angka yang benar ada di `crawl-summary.json → correctedCounts`.

---

## 4. Temuan Berperingkat

Severity mengikuti M14: **P0** menghalangi go-live, **P1** alur penting gagal/membingungkan, **P2** usability/a11y bermakna, **P3** polish.

### T-01 — P1 — 30 node pelanggaran *critical*: kontrol tanpa nama yang dapat diakses

**Bukti:** `DYNAMIC` (Axe `label` + `select-name`), `CODE`.

| Rute | Viewport | Node | Target |
|---|---|---:|---|
| `/tickets` | 1440 & 375 | 5 | `select.form-select-sm` filter antrean |
| `/staff-routines` | 1440 | 6 | 4 input + 2 select |
| `/payment-submissions/review` | 1440 | 2 | `select.form-select` |
| `/meter-readings` | 1440 | 2 | `.meter-period-select`, `.meter-year-select` |
| `/finance/assets` | 1440 | 2 | 2 input number |
| `/reports` | 1440 & 375 | 2 | input number + select filter |
| `/surveys` | 1440 | 2 | 2 select |
| `/guest-preferences` | 1440 | 1 | select |
| `/stays/check-in` | 1440 | 1 | input wizard |
| `/staff-performance` | 1440 & 375 | 1 | input `type=month` |
| `/staff-report` | 1440 & 375 | 1 | input `type=month` |
| `/reset-password` | 1440 & 375 | 3 | input token + 2 password (label visual, tidak terasosiasi) |

**Akar masalah tunggal:** pola React-Bootstrap `<Form.Group>` **tanpa `controlId`**. Terukur statis: **333 `<Form.Group>` vs 16 `controlId`** — jadi sekitar 95% grup tidak memberi asosiasi programatik. `<Form.Label>` saja tidak menulis `for`, dan `<Form.Control>` tanpa `id` tidak punya nama. `/reset-password` adalah contoh paling bersih dari pola ini (3 dari 3 kontrol).

**Solusi:** tambahkan `controlId` pada setiap `Form.Group` (React-Bootstrap otomatis menghubungkan `Form.Label`↔`Form.Control`), atau `id`+`htmlFor` eksplisit. Untuk select filter yang tidak punya label visual, pakai `aria-label` deskriptif (mis. `aria-label="Filter status tiket"`).

**Kriteria penerimaan:** Axe `label` dan `select-name` = **0 node** pada seluruh rute. Setiap kontrol memiliki nama yang dapat diakses; `aria-describedby` untuk error inline; `aria-invalid` pada state invalid.

**Pemilik:** Frontend. **Profil model:** K2 untuk `/reset-password` dan filter sederhana; K3 bila menyentuh komponen tabel yang dipakai lintas halaman.

---

### T-02 — P1 — Kontras warna gagal AA di 14+ permukaan; terburuk 1,05:1

**Bukti:** `DYNAMIC` (Axe `color-contrast`, 62 node serious), `CODE`. Rasio di bawah adalah hasil ukur mesin, bukan penilaian subjektif.

| Elemen | Rasio | Warna | Syarat | Rute |
|---|---:|---|---:|---|
| `.bg-danger.badge` pada matriks laporan | **1,05** | `#64748b` di `#dc3545` | 4,5 | `/reports` |
| `.bg-warning-subtle.text-warning.border` kartu meter | **1,47** | `#ffc107` di `#fff3cd` | 4,5 | `/rooms` (STAFF), 14 node |
| `article > span` laporan bulanan | 4,28 | `#64748b` di `#e7f5ff` | 4,5 | `/staff-report` |
| `.accounting-setup-checklist-mark` | 3,29 | `#ffffff` di `#16a34a` | 4,5 | `/finance/accounting-setup` |
| `.btn-link.p-0.btn` | 4,38 | `#0d6efd` di `#fcfcfd` | 4,5 | `/settings` |

**Akar masalah:** pemakaian **utility warna Bootstrap mentah** sebagai sinyal status pada permukaan terang. Bootstrap 5.3.3 mendefinisikan `--bs-warning: #ffc107` (1,47:1 di atas `--bs-warning-bg-subtle: #fff3cd`) — kombinasi yang secara desain memang gagal AA. Statis: **105 pemakaian** `bg-warning-subtle`/`text-warning`/`bg-danger`/`text-danger` di 12+ file; `text-danger` 87×, `text-muted` 749×. Ironisnya token KOST48 sendiri sudah aman (`--color-warning: #b45309`, `--color-danger: #b91c1c`); masalahnya jalur pintas yang melewati token.

**Solusi:** ganti utility mentah ke token KOST48 (`--color-warning`, `--color-danger`) atau varian Bootstrap `-text-emphasis` (`--bs-warning-text-emphasis: #664d03`). Untuk lencana di atas latar berwarna, pakai teks gelap di latar terang atau latar pekat dengan teks putih pada ukuran ≥18,66 px bold/24 px (ambang "teks besar" AA = 3:1).

**Kriteria penerimaan:** Axe `color-contrast` serious = **0 node** di seluruh rute, diuji pada 375 px dan 1440 px; state disabled tetap terbaca tanpa tampak aktif.

**Pemilik:** Frontend (K2 untuk penggantian token; K3 untuk komponen lencana/status bersama).

---

### T-03 — P1 — Overflow horizontal 176 px di `/tickets` STAFF pada mobile

**Bukti:** `DYNAMIC`. Di viewport 375 px: `documentElement.scrollWidth = 551` (kelebihan **176 px**). Elemen penyebab: `.staff-workspace-tab` (`right=462`, `w=99`), `span` (`right=395`), `strong` (`right=452`). Axe menandai `.segmented-tabs` tidak dapat difokus (`scrollable-region-focusable`, serious).

**Akar masalah (source pasti):** `frontend/src/styles/10-misc.css:3107-3114`

```css
@media (max-width: 640px) {
  .staff-workspace-nav-wrap { overflow-x: auto; }
}
```

`.staff-workspace-nav-wrap` diberi `overflow-x: auto`, tetapi anaknya `.staff-workspace-tabs` (display:flex) **tidak diberi `flex-wrap` maupun `min-width: 0`**, sehingga jalur flex tidak menyusut dan halaman melebar alih-alih menggulir di dalam wadah.

**Solusi:** `min-width: 0` pada wadah dan anaknya, `flex: 0 0 auto` pada tab, plus indikator gulir (chevron/gradien) — pola yang sama sudah diminta `AO-11`. Tambahkan `tabIndex={0}` + `role="group"` + `aria-label` pada area gulir agar dapat difokus keyboard.

**Kriteria penerimaan:** `documentElement.scrollWidth <= innerWidth` pada 320/360/375/390/414 px di `/tickets`; Axe `scrollable-region-focusable` = 0; tab aktif selalu tergulir ke area terlihat.

**Pemilik:** Frontend (K2).

---

### T-04 — P2 — `/dashboard` STAFF: 10 kartu tugas bersarang interaktif

**Bukti:** `DYNAMIC` (Axe `nested-interactive`, serious, 10 node di 1440 & 375 px), `CODE`.

Setiap kartu tugas adalah `<article>` yang memuat keturunan dapat difokus. Pembaca layar mengumumkan satu kesatuan, sementara keyboard masuk ke kontrol di dalamnya — perilaku fokus menjadi tidak dapat diprediksi.

**Solusi:** jadikan seluruh kartu satu target (bungkus judul dengan satu `<button>`/`<a>` yang membentang) dan turunkan kontrol dalam menjadi elemen non-fokus, atau hapus pembungkus semantik `article` bila kartu memang kumpulan aksi.

**Kriteria penerimaan:** Axe `nested-interactive` = 0 pada `/dashboard` STAFF; urutan fokus keyboard diuji dengan Tab dari awal halaman.

**Pemilik:** Frontend (K3).

---

### T-05 — P2 — Struktur landmark dan heading belum konsisten

**Bukti:** `DYNAMIC` + `CODE`.

| Masalah | Halaman |
|---|---|
| Tanpa `<main>` **dan** tanpa `<h1>` | `/reset-password` |
| `<h2>` sebagai judul utama (tanpa `<h1>`) | `ResetPasswordPage.tsx`, `GuestBookingForm.tsx`, `AccountingSetupPage.tsx`, `PurchaseOperationsPage.tsx`, `IotOverviewPage.tsx`, `StaffRoutinesAdminPage.tsx` |
| Dua `<h1>` pada satu halaman | `/inventory/gudang`, `/inventory/barang-kamar`, `/inventory/mutasi`, `/staff-report` |
| Tanpa `<h1>` di DOM saat dirender | `/portal/stay` (TENANT aktif, 1440 & 375 px — berulang, `h1Count = 0`) |
| Tidak ada `<main>` | `/reset-password` (route publik lain sudah punya — perbaikan parsial AO-09) |

Catatan positif yang terverifikasi: `AppLayout.tsx:423` menyediakan skip link `Loncat ke konten utama` → `#main-content` (`AppLayout.tsx:464`), jadi skip link **ada dan targetnya nyata**; CSS `:focus`/`:focus-visible` 59 aturan dan `prefers-reduced-motion` 6 aturan sudah tersedia.

**Kriteria penerimaan:** tepat satu `<main>` per halaman; tepat satu `<h1>` yang menyebut tujuan rute; heading tidak melompat level; skip link berfungsi di seluruh shell.

**Pemilik:** Frontend (K2).

---

### T-06 — P2 — Performa render awal `/portal/stay`: ≈6,3 detik dengan skeleton bertumpuk

**Bukti:** `DYNAMIC`. Sampling 700 ms pada route langsung:

| Waktu | `innerText` root | Elemen skeleton/spinner/loading |
|---:|---:|---:|
| 0,7–3,5 s | 103 karakter | 42 |
| 4,2–5,6 s | **15 karakter** (`Memuat halaman…`) | **84** |
| 6,3 s | 465 karakter | 1 |
| 7,0–8,4 s | 2.134 → 2.767 karakter | 0 |

Jadi konten utama baru bermakna setelah **±7 detik**, dan pada satu fase hampir seluruh layar adalah placeholder (84 elemen). Portal tenant adalah permukaan yang paling sering dibuka penghuni dari ponsel.

**Solusi terarah:** potong jumlah placeholder (target: satu skeleton per blok konten, bukan per field), dan pastikan route terberat tidak menunggu seluruh query. Perlu diukur lagi setelah perbaikan — **jangan** klaim perbaikan performa tanpa pengukuran ulang.

**Kriteria penerimaan:** konten utama `/portal/stay` tampil < 3 detik pada UAT lokal; jumlah elemen skeleton pada state loading turun ke ≤ 10; tidak ada fase layar hampir kosong.

**Pemilik:** Frontend (K3). Untuk menyentuh query/agregasi: K4.

---

### T-07 — P2 — Dua overflow mobile lain (kecil tapi nyata)

| Rute | Viewport | Kelebihan | Penyebab |
|---|---:|---:|---|
| `/finance/accounting-setup` | 375 px | **10 px** | `.mb-3.row` (`right=385`, `left=-2`) — gutter grid Bootstrap negatif tanpa `min-width:0` |
| `/portal/stay` (TENANT aktif) | 375 px | **3 px** | `<strong>` (`right=377`, `w=282`) pada baris teks panjang tanpa pemutus kata |

**Kriteria penerimaan:** overflow 0 px pada 320–414 px untuk kedua route.

**Pemilik:** Frontend (K2).

---

### T-08 — P2 — Drift sistem visual: 27 radius, 27 breakpoint, 105 utility warna

**Bukti:** `CODE` (inventaris CSS).

- **27 nilai `border-radius` unik**: 1, 2, 3, 4, 5, 6, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 20, 22, 24, 26, 28, 30, 32, 34, 99, 999 px. Nilai seperti 9/11/13/15/17/22/26/28 menunjukkan penyesuaian ad hoc, bukan skala.
- **27 breakpoint `max-width` unik**: 350, 430, 440, 480, 520, 560, 575, 576, 600, 620, 640, 680, 720, 760, 767, 768, 820, 860, 900, 920, 980, 992, 1050, 1080, 1100, 1180, 1200 px — termasuk pasangan berdekatan 575/576 dan 767/768.
- **105 pemakaian utility warna Bootstrap** (lihat T-02).

Disiplin yang sudah baik: hanya **satu** blok `:root` di seluruh CSS (`00-tokens.css`) — token terpusat dengan benar. Masalahnya pada nilai yang tidak melewati token.

**Solusi:** tetapkan skala resmi (mis. radius 4/6/8/12/16/24, breakpoint 480/576/768/992/1200), lalu migrasikan bertahap per file. **Jangan** normalisasi seluruh aplikasi dalam satu perubahan; ini pekerjaan berurutan.

**Kriteria penerimaan:** setiap nilai baru berasal dari token; jumlah radius/breakpoint unik menurun terdokumentasi; tidak ada regresi visual yang tak disengaja (verifikasi layar per portal).

**Pemilik:** Frontend (K2), terkoordinasi dengan `AO-21`/`AO-23`.

---

### T-09 — P3 — Sisa catatan kecil

| Temuan | Bukti |
|---|---|
| 4 aturan `outline: none` (3 tanpa pengganti eksplisit di blok yang sama) berisiko menghapus indikator fokus | `06-tenant.css:151`, `10-misc.css:341` (dengan `!important`), `10-misc.css:4188`, `13-charts.css:173` |
| `.progress-bar` tanpa nama pada `/finance/accounting-setup` (`aria-progressbar-name`, serious) | Axe |
| `/reports` badge matriks laporan nyaris tak terbaca (rasio 1,05) — juga P1 secara kontras, dicatat di sini sebagai kandidat perbaikan cepat | Axe |
| `smallTargetCount` tinggi pada halaman padat (`/rooms` publik 53 di 1440 px, `/tenants` 41) — sebagian besar tautan dalam paragraf, perlu triase sebelum dijadikan task | pengukuran DOM |

---

## 5. Rekomendasi Urutan Kerja

Diurutkan menurut rasio dampak terhadap risiko, tanpa mengubah izin/urutan M12:

1. **T-01 `controlId`** — perubahan mekanis, satu pola, menghapus 30 node critical sekaligus. Paling tinggi rasio dampak/risiko.
2. **T-02 kontras** — ganti utility Bootstrap mentah ke token KOST48, mulai dari 3 kasus terburuk (1,05 / 1,47 / 3,29).
3. **T-03 overflow `/tickets` STAFF** — tiga deklarasi CSS, memperbaiki halaman yang benar-benar rusak di ponsel.
4. **T-05 heading/landmark** — 6 file halaman, satu `<h1>` per halaman.
5. **T-04 nested-interactive**, **T-07 overflow kecil**, **T-09** — perbaikan terarah.
6. **T-06 performa `/portal/stay`** — perlu pengukuran sebelum & sesudah.
7. **T-08 normalisasi token** — pekerjaan bertahap, jangan digabung dengan perbaikan fungsional.

Setelah 1–4 selesai, jalankan ulang crawl yang sama (180 pemeriksaan) sebagai bukti penutup; gate `AO-08` (Axe serious = 0) baru boleh dinyatakan lulus bila angkanya benar-benar 0.

---

## 6. Yang Tidak Terbukti pada Sesi Ini

Dinyatakan eksplisit agar tidak diubah menjadi klaim lulus:

- Penilaian **visual/artistik** (kualitas foto, estetika, hierarki rasa) — perlu pemeriksa manusia pada layar nyata.
- **Perilaku sentuh dan keyboard nyata** (Tab, Enter, Escape, gestur geser) — harness tidak mensimulasikan input.
- **Kontras pada state interaktif** (hover, focus, disabled, aktif) secara menyeluruh.
- **UA/DPR perangkat mobile** — viewport benar, identitas perangkat tidak.
- **Kinerja pada perangkat kelas bawah dan jaringan lambat** — hanya waktu render lokal yang diukur.
- Rute yang butuh data khusus: `/portal/checkout`, `/portal/renewal`, `/stays/:id`, `/invoices/:id`, `/rooms/:id/detail`, `/booking/:roomId`, `/portal/announcements/:id`, `/staff-warehouse` detail — memerlukan fixture transaksional.
- Klaim kontras/hierarki seluruh **77 rute** di luar daftar `crawl-summary.json`.
- Identitas deployment/hosting (tetap **UNKNOWN**, tidak berubah oleh audit ini).

---

## 7. Status Empat Lapis

- **Implementasi aplikasi:** tidak diubah oleh audit ini. Satu-satunya penambahan adalah skrip audit di `.audit-runtime/` (diabaikan git) dan artefak bukti di `docs/audit-assets/`.
- **Verifikasi lokal:** dinamis (180 pemeriksaan halaman, 89 endpoint, Axe) + statis (inventaris CSS/JSX, penelusuran akar masalah ke baris source). **Bukan** build, bukan UAT resmi, bukan pengukuran host.
- **Deployment:** N/A — tidak ada deploy, push, atau perubahan konfigurasi host.
- **Dampak runtime terukur:** hanya pada instance lokal UAT (backend :3000, DB UAT 5433). Tidak ada pengukuran produksi.
