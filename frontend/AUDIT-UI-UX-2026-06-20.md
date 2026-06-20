# Audit UI/UX — KOST48 Surabaya (Frontend)

**Tanggal:** 20 Juni 2026
**Cakupan:** Seluruh aplikasi (Publik/Guest, Tenant, Staff, Admin, Owner)
**Dimensi:** Aksesibilitas · Konsistensi visual & design system · Responsif/mobile · Usability & alur
**Fokus khusus:** Menyederhanakan area Admin & Owner + adopsi teknologi UI mutakhir
**Metode:** Audit statis kode + CSS (React 18 + TS + Vite + Bootstrap 5/react-bootstrap, react-router 6, react-query 5, Recharts). Tidak menjalankan aplikasi live (butuh backend), jadi temuan kontras warna ditandai sebagai "perlu verifikasi alat".

---

## 1. Ringkasan Eksekutif

Ini bukan frontend amatir. Fondasinya kuat: ada **design token tunggal**, komponen bersama yang aksesibel (StatCard, SegmentedTabs, SafeImage, Skeleton), skip-link, focus-visible global, PWA lengkap, code-splitting, serta state loading/error/empty yang ditangani. Masalah utamanya **bukan** "jelek", tapi **kepadatan informasi, redundansi, dan pola yang tidak konsisten diterapkan** — persis keluhanmu soal Admin & Owner: "fitur banyak tapi penataannya belum optimal".

**Skor per dimensi (subjektif, 1–5):**

| Dimensi | Skor | Inti masalah |
|---|---|---|
| Aksesibilitas | 3.5 / 5 | Fondasi bagus, tapi tabel dashboard buatan tangan tak konsisten keyboard; motion-reduction tipis |
| Konsistensi visual / design system | 2.5 / 5 | Token ada tapi kurang dipakai: 2.626 hex hardcode vs 560 `var()`; 733 `!important` |
| Responsif & mobile / PWA | 3.5 / 5 | PWA & tabel generik bagus; tabel dashboard buatan tangan kurang ramah HP; halaman terlalu panjang |
| Usability & alur | 3 / 5 | Redundansi data 5–6 widget per layar; 3 lapis navigasi; sebagian reload halaman penuh |

**5 prioritas teratas:**

1. **Kurangi redundansi di dashboard Admin & Owner.** Data yang sama tampil di 5–6 widget berbeda dalam satu layar (lihat §5).
2. **Adopsi token secara disiplin** — saat ini 2.626 warna hardcode vs 560 referensi token, dan **733 `!important`** di CSS.
3. **Hentikan navigasi reload-penuh** (`window.location.assign`) dan ganti `window.confirm` dengan modal bermerek.
4. **Tambahkan pola modern berbasis tanggal**: kalender operasional + papan to-do/kanban (domain ini sangat berbasis deadline, tapi semuanya disajikan sebagai tabel).
5. **Pindahkan agregasi berat ke backend** (dashboard menarik ratusan baris lalu menghitung di browser).

---

## 2. Yang Sudah Bagus (jangan dibongkar)

- **Design token tunggal** di `src/styles/00-tokens.css` dengan warna semantik (`--color-success`, `--color-danger`, dst).
- **Komponen bersama yang aksesibel:**
  - `common/SegmentedTabs.tsx` — `role="tablist"` penuh + navigasi panah/Home/End + `aria-selected`.
  - `common/SafeImage.tsx` — `alt` wajib, fallback rapi, dukungan keyboard, `loading="lazy"`.
  - `common/SkeletonLoader.tsx` — `role="status"`, `aria-busy`, label `visually-hidden` (anti layout-shift).
  - `common/StatCard.tsx` & `components/resources/ResourceTable.tsx` — baris/kartu klik punya `tabIndex`, `role`, `onKeyDown` (Enter/Space).
- **Shell & a11y dasar:** skip-to-content link + outline `:focus-visible` global (`src/styles/01-base.css`).
- **HTML head kelas produksi** (`index.html`): `lang="id"`, `viewport-fit=cover`, Open Graph/Twitter, **JSON-LD `LodgingBusiness`**, meta PWA Apple.
- **PWA lengkap:** manifest, `offline.html`, ikon (termasuk maskable), `theme-color`, script verifikasi PWA.
- **Performa rute:** `lazy()` + `Suspense` + sinkronisasi `document.title` per rute.
- **Navigasi sidebar sudah diringkas** (`config/navigation.ts`): Admin 6 item, Owner 7 item, dengan `activePaths` untuk menggabungkan banyak sub-rute.
- **Tabel generik `ResourceTable`** memakai `data-label` → menumpuk jadi kartu di HP (pola responsif yang benar).

---

## 3. Temuan: Aksesibilitas (a11y)

**A1 — [Sedang] Baris tabel klik di dashboard buatan tangan tidak aksesibel keyboard.**
Pola benar sudah ada di `ResourceTable.tsx` (baris 344–356: `tabIndex/role/onKeyDown`) dan `StatCard.tsx`, tapi **tidak diterapkan** di tabel command-center buatan tangan. Di `pages/dashboard/AdminWorkspaces.tsx`, `<tr className="clickable-row" onClick=...>` (baris 97, 186, 253, 316, 411, 421) tidak punya `tabIndex/role/onKeyDown` → pengguna keyboard tak bisa membuka baris. Ada di **10 file** total.
*Rekomendasi:* ekstrak satu komponen `<ClickableRow>` (atau hook) dan pakai di semua tabel, atau jadikan sel pertama `<button>`.

**A2 — [Sedang] Dukungan `prefers-reduced-motion` sangat tipis.**
Hanya **2 kemunculan** di seluruh 26.575 baris CSS, padahal banyak animasi `transform` hover (mis. `.sidebar-link:hover { transform: translateX(4px) }`) dan transisi. Pengguna sensitif gerak tidak terlindungi.
*Rekomendasi:* bungkus animasi non-esensial dalam `@media (prefers-reduced-motion: reduce) { … }` global.

**A3 — [Rendah] `role="button"` pada `<tr>` menghapus semantik baris tabel.**
Pragmatik, tapi secara teknis membuat baris kehilangan peran "row" di accessibility tree (`ResourceTable.tsx` baris 349).
*Rekomendasi:* gunakan baris biasa + tombol aksi eksplisit, atau pola "grid" yang benar.

**A4 — [Rendah] Toast: timeout 3,5 dtk & `role="alert"` untuk semua varian.**
`common/ToastProvider.tsx` auto-dismiss 3,5 dtk tanpa pause-on-hover; semua varian (termasuk *success*) memakai `role="alert"` (asertif). Sukses sebaiknya `role="status"`/`aria-live="polite"`; durasi pendek mudah terlewat AT/pembaca lambat.

**A5 — [Perlu verifikasi alat] Kontras & ukuran kecil.**
Beberapa elemen kecil berisiko: badge inline `fontSize: '0.7em'` (`ResourceTable.tsx` baris 123), teks `--text-muted` (#475569) di atas permukaan semi-transparan, panah baris `›`. Kontras tidak bisa dipastikan tanpa render.
*Rekomendasi:* tambahkan **`@axe-core/playwright`** ke e2e Playwright yang sudah ada agar kontras/label tervalidasi di CI.

**A6 — [Rendah] Ikon emoji sebagai ikon UI.**
Konsisten dibungkus `aria-hidden` (baik), tapi emoji render beda antar OS dan kurang tajam. Pertimbangkan set ikon SVG (mis. `lucide-react`) untuk tampilan profesional yang konsisten.

---

## 4. Temuan: Konsistensi Visual & Design System

**V1 — [Tinggi] Token kurang diadopsi.**
Di folder `src/styles`: **2.626** warna hex hardcode vs hanya **560** pemakaian `var(--…)`, dengan **241 warna unik** — jauh dari palet yang koheren. Warna chart & status juga di-hardcode di TSX (mis. `OwnerDashboardPage.tsx`: `#2563eb`, `#f97316`, `#16a34a`, `#7c3aed`; `changeLabel` `#15803d/#dc2626/#64748b` baris 104–108, 196–215). Aset `chartPalette` ada tapi tak dipakai di sini.
*Rekomendasi:* satukan ke token; buat util `chartColors` dari token; lint anti-hex.

**V2 — [Tinggi] Token duplikat & terfragmentasi.**
Warna biru yang sama didefinisikan ≥3 kali: `--primary`, `--k48-primary`, `--ops-blue-600` semuanya `#2563eb` (`00-tokens.css`). Ada palet paralel (`app`, `k48`, `k48-staff`, `ops`). Tidak ada **skala spacing** (hanya `--density-*` yang ditambah belakangan) dan skala radius parsial.
*Rekomendasi:* satu palet ber-skala (50–900) + alias semantik; tambah skala spacing (`--space-1..8`).

**V3 — [Tinggi] Skala & kesehatan CSS.**
**26.575 baris** CSS di 14 file; **733 `!important`** (tenant 164, misc 130, staff 113); file `10-misc.css` 104 KB; 165 `@media`. Banyak `!important` = perang spesifisitas, override rapuh, sulit ditema-ulang.
*Rekomendasi:* migrasi bertahap ke **CSS Modules** atau **Tailwind** untuk membunuh `!important`; pisah `10-misc.css`.

**V4 — [Sedang] Font dideklarasikan tapi tidak dimuat.**
`--font-data` menunjuk `'DM Mono'`/`'DM Sans'` yang tidak di-`@import`; `@import` di `01-base.css` baris 2 menulis **`'Cormorant Garant'`** (kemungkinan salah ketik dari `Cormorant Garamond`) → font itu diam-diam gagal dimuat dan fallback.
*Rekomendasi:* perbaiki nama font; muat hanya font yang benar-benar dipakai (hemat bandwidth).

**V5 — [Sedang] Tema per-peran menambah luas permukaan.**
Staff (krem/hijau), Tenant (biru), Ops (biru) — sengaja, tapi membuat komponen tampak beda per peran dan menambah risiko inkonsistensi & duplikasi CSS.

**V6 — [Rendah] Inline style terkonsentrasi di halaman cetak/laporan.**
230 kemunculan `style={{` di 60 file, mayoritas di `InvoicePrintLayout.tsx` (69 — wajar untuk cetak) & halaman laporan keuangan (ProfitLoss/BalanceSheet ~12). Bukan sistemik, tapi rapikan halaman laporan.

---

## 5. Temuan: Responsif & Mobile / PWA

**R1 — [Baik] PWA & strategi responsif inti solid.** Manifest, offline, ikon maskable, `viewport-fit=cover`, offcanvas sidebar di `< xl`, mode Owner compact/full default compact di `≤ 834px`, dan `ResourceTable` menumpuk jadi kartu via `data-label`.

**R2 — [Sedang] Strategi tabel mobile tidak konsisten.**
Tabel dashboard buatan tangan (`AdminWorkspaces.tsx`) memakai `Table responsive` (scroll horizontal) **tanpa** pola `data-label` seperti `ResourceTable`. Di HP, tabel 6–7 kolom yang padat jadi harus digeser ke samping — lebih sulit dibanding pola kartu yang dipakai di tempat lain.
*Rekomendasi:* samakan ke pola kartu `data-label` (atau ganti dengan TanStack Table + layout kartu di breakpoint kecil).

**R3 — [Sedang] Halaman Admin/Owner sangat panjang di HP.**
Overview menumpuk banyak section (lihat §6) → maraton scroll vertikal. Mode density ada untuk Owner tapi **tidak** untuk Admin.
*Rekomendasi:* tambah toggle "Ringkas/Lengkap" untuk Admin; sembunyikan widget sekunder di balik disclosure.

**R4 — [Rendah] Tab navigasi atas bisa overflow.**
Tenant & Staff memakai tab horizontal. Di layar sempit dengan banyak tab, ini bisa terpotong/menggeser. Untuk portal Tenant yang paling sering dipakai di HP, **bottom tab bar** lebih ramah jempol.

**R5 — [Rendah] Touch target kecil.** Chip "compact", badge `0.7em`, dan panah baris berisiko < 44px. Perlu audit ukuran sentuh.

---

## 6. Temuan: Usability & Alur (+ Fokus Admin/Owner)

**U1 — [Tinggi · inti permintaanmu] Redundansi & kepadatan informasi.**
Di **Admin overview** (`DashboardAdmin.tsx` baris 434–485), data operasional yang sama muncul di **5–6 widget paralel** dalam satu layar:
`AssistantInsightLine` → `AdminOperationsCommandQueue` (hero + `AdminContinuityStrip` lanes + `AssistantPanel` "Daily Assistant" + `AdminHealthChips` + guardrails) → `AdminTodayStatusStrip` → `ActionQueueTable` → `AutoOpsControlPanel`.
Di **Owner** (`OwnerDashboardPage.tsx`), "signals" tampil **tiga kali** (`OwnerActionStrip`, `AssistantPanel`, panel "Butuh perhatian"), plus **dua panel AI terpisah** yang fungsinya tumpang tindih: "Analisis AI" (baris ~536) dan "Ringkasan Bisnis AI" (baris ~589).
*Dampak:* beban kognitif tinggi; pengguna bingung harus bertindak dari mana. *Rekomendasi:* lihat blueprint §7.

**U2 — [Sedang] Tiga lapis navigasi yang tumpang tindih (Admin/Owner).**
Sidebar (6–7 item) → `RoleWorkspaceTabs` "Menu area" (3 tab) → filter dalam-halaman (`EntityBadgeFilterBar`/`SegmentedTabs`). Tab area menavigasi ke rute yang **juga** tujuan sidebar (mis. `/stays`), sehingga relasi "di mana saya / cara kembali" jadi kabur.
*Rekomendasi:* pilih satu sumber kebenaran navigasi; jadikan area-tabs murni filter in-page (tanpa ganti rute) atau hapus salah satu lapis.

**U3 — [Sedang] Navigasi reload-halaman-penuh.**
`window.location.assign()` dipakai di 2 tempat (`DashboardAdmin.tsx` baris 162 health chips; `AdminWorkspaces.tsx` baris 97 baris staff) → reload penuh: kedip putih, kehilangan state, fetch ulang.
*Rekomendasi:* ganti dengan `navigate()` react-router.

**U4 — [Sedang] Dialog `window.confirm` bawaan browser.**
9 kemunculan di 6 file (mis. logout `AppLayout.tsx` baris 213; `OwnerSettingsPage.tsx` 4×). Tidak bermerek, tak bisa di-style, dan memblok thread — kontras dengan modal aplikasi yang sudah rapi.
*Rekomendasi:* satu komponen `<ConfirmDialog>` reusable.

**U5 — [Sedang] Agregasi berat di sisi klien.**
Admin overview menarik rooms 500 + invoices 500 + stays 300 + tickets 150 + inventory 150 + beberapa query lain, lalu menghitung SLA/antrean di browser (`DashboardAdmin.tsx` baris 312–407). Owner `computeMeterDue` menarik 200 stays + 1000 readings lalu menghitung di klien (`OwnerDashboardPage.tsx` baris 69–83).
*Dampak:* first paint lambat, boros memori/baterai di HP. *Rekomendasi:* endpoint agregat di backend (ringkasan sudah terhitung).

**U6 — [Rendah] Paginasi hanya prev/next** (`PaginationControls.tsx`) — tanpa nomor halaman/lompat. Cukup untuk data kecil, lemah untuk data besar.

**U7 — [Peluang · inti permintaanmu] Belum ada kalender/timeline atau papan to-do sejati.**
Domain ini sangat berbasis tanggal & SLA (siklus meter, jatuh tempo, check-in/out, perpanjangan, deadline review) tapi **semua** disajikan sebagai tabel + chip. Ini peluang terbesar untuk modernisasi (lihat §7–§8).

---

## 7. Blueprint: Menyederhanakan Admin & Owner

Prinsip: **satu model kerja, beberapa cara melihat.** Daripada 6 widget bespoke, definisikan satu tipe data `WorkItem` (sudah ~ada sebagai `ActionQueueItem`) dan render dalam **3 tampilan yang bisa diganti**:

```
[ Hari Ini (List) ]   [ Papan (Board) ]   [ Kalender ]      ← satu toggle tampilan
─────────────────────────────────────────────────────────
Ringkasan kesehatan (1 baris chip ringkas, bisa diciutkan)
─────────────────────────────────────────────────────────
Konten tampilan terpilih (list / kanban / kalender)
```

**Owner — "Kokpit" yang diramping:**
- Baris atas: **4 KPI tile** (Pendapatan, Laba, Okupansi, Kas) — sudah ada.
- **Satu** daftar "Butuh perhatian hari ini" (gabungkan 3 representasi signals jadi satu).
- **Satu** entri AI on-demand (gabungkan 2 panel AI jadi satu tombol "Brief AI" yang membuka drawer).
- Tren chart tetap di mode "Lengkap".
- Sisanya pindah ke disclosure "Detail".

**Admin — "Command Center" yang diramping:**
- Hero tunggal = **antrean kerja** (`ActionQueueTable`) sebagai sumber kebenaran.
- Turunkan lanes + health-chips + status-strip menjadi **satu health bar ringkas** yang bisa diciutkan.
- Tambah **toggle Hari Ini / Papan / Kalender** memakai data antrean yang sama.
- Tambah toggle density "Ringkas/Lengkap" (seperti Owner).

**Contoh "to-do/kanban modern"** untuk tiket & antrean keputusan:
`Baru → Dikerjakan → Menunggu cek admin → Selesai`, kartu bisa di-drag antar kolom (drag-drop aksesibel via `@dnd-kit`), badge SLA berwarna di tiap kartu.

**Contoh "kalender modern":** kalender bulanan menandai jatuh tempo tagihan, deadline review booking/perpanjangan/checkout, dan siklus meter — klik tanggal → daftar item hari itu. Ini langsung menjawab kebutuhanmu ("daftar kalender") dan mengurangi tabel.

---

## 8. Rekomendasi Teknologi Mutakhir

Saat ini **belum ada** library tanggal, kalender, maupun tabel (cek `package.json`: hanya Recharts untuk visual; tanggal dihitung manual). Adopsi bertahap & lazy-load yang berat:

| Kebutuhan | Library yang disarankan | Kenapa |
|---|---|---|
| Kalender operasional | **FullCalendar (React)** atau **Schedule-X** / **react-big-calendar** | Tampilan bulan/minggu/agenda untuk deadline & siklus meter; matang & teruji |
| Timeline/Gantt masa sewa | **vis-timeline** atau **frappe-gantt** | Visual rentang check-in→out, perpanjangan |
| Papan to-do / kanban | **@dnd-kit** | Drag-drop modern & **aksesibel** (keyboard) untuk tiket & antrean |
| Tabel data canggih | **TanStack Table** (+ **TanStack Virtual**) | Sort/filter/resize + virtualisasi; ganti banyak tabel buatan tangan, konsisten |
| Utilitas tanggal | **date-fns** (tree-shakable) atau **Day.js** | Stop hitung tanggal manual; ringan |
| Command palette ⌘K | **cmdk** | Lompat cepat antar 30+ rute (lengkapi `GlobalSearch` yang sudah ada) |
| Ikon konsisten | **lucide-react** | Ganti emoji UI → tampilan tajam & seragam |
| Animasi sadar-motion | **Framer Motion** | Transisi bertujuan, hormati `prefers-reduced-motion` |
| Token & anti-`!important` | **Tailwind** (bertahap) atau **CSS Modules** + **Style Dictionary** | Bunuh 733 `!important`, satukan token |
| QA aksesibilitas | **@axe-core/playwright** | Validasi kontras/label otomatis di CI (Playwright sudah terpasang) |

> Catatan: kalender & tabel canggih menambah bobot bundle — muat hanya di rute yang butuh (`lazy()` seperti yang sudah kamu lakukan).

---

## 9. Rencana Aksi Berprioritas

**P0 — Dampak tinggi, usaha rendah (quick wins):**
1. Ganti 2 `window.location.assign` → `navigate()` (U3).
2. Ganti `window.confirm` → satu `<ConfirmDialog>` (U4).
3. Tambah blok global `@media (prefers-reduced-motion: reduce)` (A2).
4. Perbaiki nama font (`Cormorant Garant`→`Garamond`; muat/hapus DM Mono/Sans) (V4).
5. Ekstrak `<ClickableRow>` aksesibel & pakai di tabel dashboard (A1).

**P1 — Dampak tinggi, usaha sedang:**
6. Ramping Owner & Admin overview: hapus representasi data ganda; satukan panel AI (U1, §7).
7. Tambah toggle density untuk Admin + sembunyikan widget sekunder di disclosure (R3).
8. Pindahkan agregasi dashboard ke endpoint backend (U5).
9. Satukan token + skala spacing; mulai util warna chart dari token (V1, V2).
10. Tambah `@axe-core/playwright` ke e2e (A5).

**P2 — Strategis (penataan ulang):**
11. Terapkan model "1 data, 3 tampilan" (List/Board/Kalender) dengan `@dnd-kit` + FullCalendar (§7, U7).
12. Ganti tabel buatan tangan dengan TanStack Table (R2, U6).
13. Migrasi CSS bertahap ke CSS Modules/Tailwind untuk menurunkan `!important` & 26k baris (V3).
14. Pertimbangkan bottom tab bar untuk portal Tenant di HP (R4).

---

## 10. Catatan Metodologi & Batasan

- Audit berbasis pembacaan kode & CSS, bukan render live (butuh backend API). Angka kuantitatif (LOC, `!important`, hex vs token, dll) dihitung dari `src/styles` dan `src` via pencarian pola.
- Temuan **kontras warna** dan **ukuran sentuh** tidak bisa dipastikan tanpa render → ditandai "perlu verifikasi alat" dan paling baik divalidasi dengan axe + pengujian perangkat nyata.
- Referensi file/baris menunjuk kondisi per 20 Juni 2026; nomor baris bisa bergeser setelah edit.

### Lampiran — Bukti kuantitatif kunci
- TS/TSX: **326 file**, **75 halaman**, **131 komponen**, ~**82k** baris.
- CSS: **26.575** baris / 14 file; **733** `!important`; **165** `@media`; **2.626** hex vs **560** `var()`; **241** warna unik; `prefers-reduced-motion`: **2**.
- `window.location.assign`: 2 · `window.confirm`: 9 · `clickable-row`: 10 file · `style={{`: 230 (60 file).
- Dependensi tanggal/kalender/tabel: **tidak ada** (hanya Recharts).
