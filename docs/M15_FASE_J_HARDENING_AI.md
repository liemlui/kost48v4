# M15 — FASE J: Hardening Pasca-Fase-G (Jaring Pengaman AI Pra-Go-Live)

> **Status:** baru (2026-06-20). **Pintu masuk eksekusi:** baca file ini PENUH sebelum coding, lalu centang di `docs/M10_CHECKLIST_CHANGELOG.md` bagian Fase J.
> **Ditulis untuk AI eksekutor lemah:** tiap task punya anchor ter-grep, langkah bernomor sangat eksplisit, gate, dan larangan. JANGAN improvisasi di luar langkah.

## 0. Kenapa Fase J ada (latar belakang temuan)

Fase G (AI Owner/Admin, modul `backend/src/modules/owner-ai/`, 15 file) **selesai 19–20 Jun 2026 tetapi NOL test**, padahal isinya paling dekat ke **uang** (no-partial pembayaran) dan **PDP/legal** (masking NIK KTP). Audit kode 2026-06-20 menemukan:

1. **Tidak ada test untuk fungsi pengaman deterministik** di `owner-ai.service.ts` — padahal repo punya pola `*.helper.test.js` (lihat `backend/test/unit/financial-ratios.helper.test.js`). Protokol M10 §3b mewajibkan `node --test` hijau untuk task uang; Fase G melewatkannya.
2. **Fungsi pengaman murni terkubur sebagai `private` di service yang butuh Prisma** → sulit dites. Harus diekstrak ke helper murni dulu.
3. **DIVERGENSI guard no-partial:** guard domain `payment-submissions.service.ts` → `approveSubmission()` (baris ±567–587) sadar **DP booking** (menerima DP-persis ATAU pelunasan penuh). Tapi guard AI di `owner-ai.service.ts` → `reviewPaymentSubmission()` (baris ±1147–1160) hanya cek `invoiceTotal > 0 && submitted !== invoiceTotal` → **salah merekomendasikan REJECT untuk DP booking yang sah**. Aman dari sisi uang (over-reject, tak pernah over-approve) tetapi memberi rekomendasi salah.
4. **Frontend AI** belum punya pengaman error-boundary/role eksplisit terverifikasi.
5. **Audit keamanan/PDP menyeluruh** untuk 12 endpoint AI belum pernah dibukukan.

**Tujuan Fase J:** mengunci jaminan PDP + uang dengan test, meluruskan divergensi, dan membukukan audit — **sebelum** go-live (F1-12). **Tidak menambah fitur AI baru.**

## 1. Konteks & Larangan Global (baca tiap task)

- **Sistem BELUM publish.** DB UAT postgres **5433** `kost48_v3_pro` (JANGAN prod 5432). Reseed: `node scripts/seed-dev-reset.js` lalu `node scripts/seed-dev-via-api.js`.
- **1 task = 1 commit** Bahasa Indonesia (`refactor:`/`test:`/`fix:`/`ui:`/`docs:`). Centang `[x]` di M10 Fase J + prepend 1 baris di `docs/M11_CHANGELOG.md`.
- **JANGAN:** tambah dependency npm · ubah `schema.prisma`/`sql/` · `git push` (kecuali diminta) · sentuh file milik AI lain (cek `git status` dulu).
- **JANGAN ubah perilaku jalur uang** kecuali task secara eksplisit memintanya (hanya J2). J0 adalah refactor **tanpa perubahan perilaku**.
- **Gate uang (WAJIB J0/J1/J2):** `cd backend; npx tsc --noEmit` = 0 → `cd backend; npm run build` → `cd backend; npm run test:unit` SEMUA hijau. Lihat juga `docs/M04_KEUANGAN.md`.
- **PENTING soal test:** test di repo ini meng-`require` hasil **kompilasi** di `dist/`, BUKAN `.ts`. Contoh nyata: `require('../../dist/modules/accounting/financial-ratios.helper.js')`. Maka **WAJIB `npm run build` dulu** sebelum `npm run test:unit`, dan helper baru harus berada di `backend/src/...` agar ikut ter-compile ke `backend/dist/...`.

## 2. Peta file (exist vs new)

| Target | Status | Catatan |
|--------|--------|---------|
| `backend/src/modules/owner-ai/owner-ai.helpers.ts` | ✨ BUAT BARU (J0) | Kumpulan fungsi MURNI (tanpa Prisma/env/DeepSeek). |
| `backend/src/modules/owner-ai/owner-ai.service.ts` | ✏️ EDIT (J0, J2) | Import helper + delegasi. J2 ubah guard payment. |
| `backend/test/unit/owner-ai-safety.test.js` | ✨ BUAT BARU (J1) | Test helper murni. `require('../../dist/modules/owner-ai/owner-ai.helpers.js')`. |
| `backend/test/integration/owner-ai-payment-review.integration.test.js` | ✨ BUAT BARU (J2, opsional bila perlu DB) | Selaraskan guard AI vs domain. |
| `frontend/src/components/ai/AiAssistButton.tsx` | ✏️ EDIT (J3) | Error non-blocking + gating. Jaga backward-compat. |
| `frontend/src/components/ai/AiResultPanel.tsx` | ✏️ EDIT (J3) | Tampilkan warnings/fallback dengan jelas. |
| `frontend/src/components/ai/AiApprovalDrawer.tsx` | ✏️ EDIT (J3) | Verifikasi tombol approve panggil endpoint domain, bukan AI. |
| `docs/M09_AUDIT.md` | ✏️ EDIT (J4) | Bukukan hasil audit PDP/keamanan AI. |
| `backend/prisma/schema.prisma` | 🧬 JANGAN SENTUH | Fase J additive-NOL: tidak ada schema. |
| `backend/src/modules/owner-ai/owner-ai.controller.ts` | 🔒 READ-ONLY | Referensi role guard saja. JANGAN ubah route. |
| `backend/src/modules/ai/` (rule-based lama) | 🔒 READ-ONLY | Bukan DeepSeek. JANGAN diutak-atik. |

## 3. Anchor terverifikasi (2026-06-20)

**`backend/src/modules/owner-ai/owner-ai.service.ts`** — fungsi `private` MURNI yang akan diekstrak (J0). Nomor baris indikatif:
- `maskNik(nik)` (±488) — PDP: `*`×(len−4) + 4 digit terakhir; `<4` digit → `null`.
- `extractNikFromOcr(ocrText)` (±495) — ambil `\d{16}` pertama.
- `parseNikDemographics(nik)` (±505) — DDMMYY dari NIK; `day>40`→FEMALE (lalu `day-=40`); heuristik abad pakai tahun sekarang.
- `normalizeName(name)` (±522) — UPPERCASE, buang non-huruf.
- `cleanShortText(value, maxLength)` (±449), `isDateOnly(value)` (±453), `extractLikelyVendor` (±457), `extractLikelyDate` (±465), `extractLikelyAmount` (±477).
- `normalizeExpenseOcrDraft(input)` (±392) — clamp `amountRupiah≥0`, kategori divalidasi vs `EXPENSE_CATEGORY_VALUES`, tipe vs `EXPENSE_TYPE_VALUES`, `confidence` di-clamp 0..1.
- `normalizeTicketActionDraft` (±1006), `normalizeInventoryDraft` (±1018), `normalizeFieldReportDraft` (±1042), `inventoryItemSnapshot` (±901), `toStringArray` (±1061), `ageDays` (±1066).
- Konstanta set: `EXPENSE_CATEGORY_VALUES`, `EXPENSE_TYPE_VALUES`, `TICKET_ACTION_VALUES`, `PRIORITY_VALUES`, `FIELD_DECISION_VALUES` (±30–34).
- Guard no-partial AI: di `reviewPaymentSubmission()` (±1136), blok `if (invoiceTotal > 0 && submitted !== invoiceTotal)` (±1150).
- PDP guard tolak gambar: `draftExpenseFromOcr` (±316 `/data:image|base64,|;base64/i`), `validateKtpOcr` (±540 `/data:image\//i` + base64 panjang).

**`backend/src/modules/payment-submissions/payment-submissions.service.ts`** — acuan kebenaran no-partial (J2): `approveSubmission()` (±501); `downPaymentRemainingGate`/`isDownPaymentAmount`/`settlementAmountGate` (±567–587); pesan `"Nominal pembayaran harus tepat: ... Tidak ada pembayaran sebagian (no-partial)."` (±583); invoice-only `submission.amountRupiah !== invoiceRemaining` (±587).

**Frontend AI** — `frontend/src/components/ai/`: `AiAssistButton.tsx`, `AiResultPanel.tsx`, `AiApprovalDrawer.tsx`, `AiCostBadge.tsx`, `AiSourceSnapshot.tsx`, `KtpOcrValidateCard.tsx`. API: `frontend/src/api/ai.ts` (status+endpoint owner-ai dibungkus DI SINI; **tidak ada** `ownerAi.ts` terpisah), `frontend/src/api/aiDrafts.ts`.

**Endpoint AI (controller, 12):** `GET status`, `POST brief`, `POST finance/analyze`, `POST expenses/receipt-draft`, `POST tenants/:id/ktp-ocr-validate`, `POST tickets/:id/action-draft`, `POST inventory/reorder-draft`, `POST staff-field-reports/:id/review-draft`, `POST payment-submissions/:id/review-draft`, `GET usage`, `POST test-connection`, `POST faqs/generate-draft`. Role: `status` + 6 draft = OWNER/ADMIN; `brief`/`finance`/`usage`/`test-connection`/`faqs` = OWNER only.

**Pola test acuan:** `backend/test/unit/financial-ratios.helper.test.js` (`node:test` + `node:assert`, `require` dari `dist`). Script: `npm run test:unit` = `node --test "test/**/*.test.js"`.

---

## J0 — Ekstrak guard murni `owner-ai` → `owner-ai.helpers.ts` (refactor tanpa ubah perilaku) [ ]

**Tujuan:** memindahkan fungsi MURNI (tak butuh Prisma/env/DeepSeek) keluar dari service agar bisa dites unit. Perilaku output HARUS identik.

**Langkah detail:**
1. Buat `backend/src/modules/owner-ai/owner-ai.helpers.ts`.
2. Pindahkan konstanta set ke helper dan `export` masing-masing: `EXPENSE_CATEGORY_VALUES`, `EXPENSE_TYPE_VALUES`, `TICKET_ACTION_VALUES`, `PRIORITY_VALUES`, `FIELD_DECISION_VALUES`. (Import `ExpenseCategory`/`ExpenseType` dari `../../common/enums/app.enums` di helper.)
3. Pindahkan & `export` fungsi MURNI berikut PERSIS apa adanya (ubah `private`→`export function`, ganti pemanggilan internal `this.x(...)`→`x(...)`): `maskNik`, `extractNikFromOcr`, `parseNikDemographics`, `normalizeName`, `cleanShortText`, `isDateOnly`, `extractLikelyVendor`, `extractLikelyDate`, `extractLikelyAmount`, `toStringArray`, `ageDays`, `inventoryItemSnapshot`, `normalizeExpenseOcrDraft`, `normalizeTicketActionDraft`, `normalizeInventoryDraft`, `normalizeFieldReportDraft`. Pertahankan tipe `ExpenseOcrDraft` (pindah/`export` ke helper).
4. Tambahkan SATU fungsi murni baru untuk guard pembayaran (mengunci perilaku SAAT INI, belum diluruskan): `export function decidePaymentReviewGuard(invoiceTotal: number, submitted: number): { violated: boolean }` → `{ violated: invoiceTotal > 0 && submitted !== invoiceTotal }`. (Pelurusan DP ada di J2.)
5. Di `owner-ai.service.ts`: hapus definisi fungsi yang sudah dipindah, ganti `import` dari `./owner-ai.helpers`, dan ubah seluruh pemanggilan `this.maskNik(...)` dst → fungsi helper. Method yang TETAP di service (butuh Prisma/env/DeepSeek) JANGAN dipindah: `getStatus`, `checkRateLimit`, `getDailyRemaining`, `getMax*`, `getUsageStats`, `recentAiAudit`, `getUsageOverview`, `testConnection`, `buildBriefSnapshot`, `generateBrief`, `briefFallback`, `draftExpenseFromOcr`, `validateKtpOcr`, `ktpFallback`, `draftTicketAction`, `draftReorder`, `reviewFieldReport`, `buildTicketOpsSnapshot`, `buildFinanceSnapshot`, `analyzeFinance`, `financeFallback`, `reviewPaymentSubmission`, `paymentFallback`, `generateFaqDraft`, dan semua `*Fallback`.
6. Di `reviewPaymentSubmission`, ganti kondisi `if (invoiceTotal > 0 && submitted !== invoiceTotal)` → `if (decidePaymentReviewGuard(invoiceTotal, submitted).violated)` (perilaku tetap sama).

**Gate:** `cd backend; npx tsc --noEmit` = 0 → `cd backend; npm run build` → `cd backend; npm run test:unit` (regresi existing tetap hijau). Diff service: hanya pemindahan + import, TANPA perubahan logika.

**JANGAN:** memindahkan apa pun yang memakai `this.prisma`, `process.env`, atau `deepseekChat`/`deepseekConfigured`. JANGAN mengubah signature endpoint/controller.

---

## J1 — Unit test jaring pengaman `owner-ai-safety.test.js` [ ]

**Tujuan:** mengunci jaminan PDP + sanitasi + clamp output AI dengan test deterministik.

**Langkah detail:**
1. Buat `backend/test/unit/owner-ai-safety.test.js` (CommonJS, pola `financial-ratios.helper.test.js`). Baris atas: `const test = require('node:test'); const assert = require('node:assert'); const H = require('../../dist/modules/owner-ai/owner-ai.helpers.js');`
2. **PDP `maskNik`:** `16 digit → '************1234'` (12 bintang + 4 digit); input `'123'` (<4) → `null`; input dengan spasi/strip `'1234 5678 9012 3456'` → tetap mask 4 digit terakhir; `null`/`''` → `null`.
3. **`parseNikDemographics`:** NIK laki contoh `3578010101900001` → `{ gender:'MALE', birthDate:'1990-01-01' }`; NIK perempuan (DD+40) `3578014101900001` → `{ gender:'FEMALE', birthDate:'1990-01-01' }`; panjang ≠16 → `{ birthDate:null, gender:null }`; tanggal mustahil (mis. bulan 13) → `birthDate:null`. (Pilih digit PPKK bebas; yang diuji posisi 7–12.)
4. **`extractNikFromOcr`:** teks dengan "NIK 3578010101900001 ..." → `'3578010101900001'`; teks tanpa 16-digit → `null`.
5. **`decidePaymentReviewGuard` (uang):** `(100000, 100000)` → `violated:false`; `(100000, 50000)` → `violated:true`; `(0, 50000)` → `violated:false` (invoice 0 = invoice-only di-skip di sini).
6. **`normalizeExpenseOcrDraft` (uang/validasi):** `amountRupiah:-5000` → hasil `0` + ada `needsReview` soal nominal; `category:'NGAWUR'` → `OTHER` + needsReview; `confidence:9` → di-clamp `1`; `amountRupiah:750000` → ada catatan ">Rp500.000".
7. **`cleanShortText`:** rangkum spasi ganda jadi satu, potong ke `maxLength`. **`isDateOnly`:** `'2026-06-20'`→true, `'20/06/2026'`→false. **`ageDays`:** tanggal hari ini → 0; `null` → 0.
8. **`normalizeTicketActionDraft`/`normalizeInventoryDraft`/`normalizeFieldReportDraft`:** nilai enum tak dikenal jatuh ke default aman (`KEEP_OPEN`/`MEDIUM`/`NEEDS_MORE_INFO`); array dibatasi.

**Gate:** `cd backend; npm run build && npm run test:unit` → semua test (lama + baru) hijau. Target: tambahan ≥ ±18 assert.

**JANGAN:** test memanggil Prisma/HTTP/DeepSeek. Murni fungsi. JANGAN ubah file `*test*` milik fase lain.

---

## J2 — Luruskan guard no-partial AI agar selaras domain (DP booking) [ ]

**Tujuan:** menghentikan rekomendasi REJECT salah untuk **DP booking yang sah**, tanpa pernah melonggarkan no-partial.

**Acuan kebenaran:** `payment-submissions.service.ts` → `approveSubmission()` (±567–587): pembayaran SAH bila **(a)** invoice-only: `amount === invoiceRemaining`, ATAU **(b)** booking: `amount === downPaymentRemaining` (DP-persis) ATAU `amount === settlementAmount` (pelunasan penuh).

**Langkah detail:**
1. Di `owner-ai.helpers.ts`, ganti/lengkapi `decidePaymentReviewGuard` menjadi sadar-DP:
   `export function decidePaymentReviewGuard(opts: { invoiceTotal: number; submitted: number; downPaymentRemaining?: number; settlementAmount?: number }): { violated: boolean; matchedRule: 'FULL' | 'DP' | 'SETTLEMENT' | 'NONE' }` — SAH (violated:false) bila `submitted === invoiceTotal` (FULL) atau `submitted === downPaymentRemaining` (DP) atau `submitted === settlementAmount` (SETTLEMENT); selain itu `violated:true, matchedRule:'NONE'`. Nilai 0/undefined diabaikan sebagai kandidat.
2. Di `reviewPaymentSubmission()`: ambil data yang sudah ada di query (`submission.invoice.totalAmountRupiah`, `submission.stay.agreedRentAmountRupiah`, dan field DP bila tersedia di `stay`). Hitung `downPaymentRemaining`/`settlementAmount` dengan rumus yang SAMA seperti `approveSubmission` (salin, jangan reimplementasi beda). Panggil guard baru. Bila `violated` → tetap return `recommendation:'REJECT'`, `riskFlags:['NO_PARTIAL_VIOLATION']` seperti sekarang.
3. Bila perlu field tambahan dari `stay` (mis. `downPaymentAmountRupiah`, `downPaymentPaidRupiah`), tambah ke `select` di `findUnique` `reviewPaymentSubmission`. JANGAN ubah tabel.
4. Tambah test: di `owner-ai-safety.test.js` (atau integration bila butuh data nyata) — DP-persis → tidak violated; pelunasan → tidak violated; nominal antara → violated.

**Gate (UANG):** `cd backend; npx tsc --noEmit` = 0 → `npm run build` → `npm run test:unit` hijau. WAJIB juga baca `docs/M04_KEUANGAN.md` gate. UAT: di UI review pembayaran, DP booking 30% TIDAK lagi disarankan REJECT; nominal kurang/lebih TETAP REJECT.

**JANGAN:** mengubah endpoint domain `approveSubmission`/`payment-submissions` (read-only di sini). AI tetap rekomendasi saja; keputusan final lewat tombol domain existing.

---

## J3 — Hardening frontend AI (non-blocking error + role/configured gating) [ ]

**Tujuan:** memastikan kegagalan AI tidak pernah memblok UI dan tombol AI hanya muncul untuk OWNER/ADMIN saat `configured`.

**Langkah detail:**
1. `AiAssistButton.tsx`: pastikan state error ditangkap dan ditampilkan non-blocking (pesan + tombol coba lagi), bukan throw yang mematahkan halaman. Loading/disabled saat request berjalan.
2. Verifikasi gating: tombol/komponen AI hanya render bila status `configured === true` DAN role ∈ {OWNER, ADMIN} (cek konsumen `getOwnerAiStatus()` di `DashboardAdmin.tsx`, `OwnerDashboardPage.tsx`, `KtpOcrValidateCard.tsx`). Jika ada tempat yang belum gating → tambahkan.
3. `AiResultPanel.tsx`: tampilkan `mode` (DEEPSEEK vs RULE_FALLBACK), `fallback`, dan `warnings` dengan jelas agar user tahu hasil rule-fallback bukan AI.
4. `AiApprovalDrawer.tsx`: verifikasi tombol approve/simpan memanggil endpoint DOMAIN (mis. `payment-submissions`, `expenses`), BUKAN endpoint AI. Bila tidak, ini temuan — catat & perbaiki.

**Gate:** `cd frontend; npm run build` PASS. UAT: matikan `DEEPSEEK_API_KEY` (atau simulasikan error) → klik tombol AI → muncul pesan non-blocking, halaman tetap jalan; login STAFF/TENANT → tombol AI tidak muncul.

**JANGAN:** memanggil AI otomatis saat page load / React Query auto-fetch / hover. Manual-button-only (Kontrak Global Fase G #1).

---

## J4 — Audit keamanan & PDP menyeluruh modul AI (bukukan ke M09) [ ]

**Tujuan:** memverifikasi & membukukan kepatuhan 12 endpoint AI terhadap Kontrak Global Fase G (PDP, role, audit, no direct mutation).

**Langkah detail (checklist per endpoint):**
1. **Role guard:** tiap route punya `@Roles(...)` benar (status+6 draft = OWNER/ADMIN; brief/finance/usage/test-connection/faqs = OWNER). Konfirmasi di `owner-ai.controller.ts`.
2. **No secret bocor:** tidak ada response/log yang memuat `DEEPSEEK_API_KEY`, JWT, password. Cek `getStatus`, `testConnection`, `getUsageOverview`.
3. **PDP NIK/foto:** `validateKtpOcr` menolak gambar/base64 (±540) dan me-mask NIK di prompt + hasil (±556, ±591); `draftExpenseFromOcr` menolak base64 (±316). Konfirmasi tak ada jalur yang mengirim file gambar ke DeepSeek.
4. **Snapshot ramping:** snapshot prompt tidak men-dump tabel/tenant lengkap/email/HP. Tinjau `buildBriefSnapshot`, `buildFinanceSnapshot`, `buildTicketOpsSnapshot`, snapshot reorder/field-report.
5. **No direct mutation:** tak ada endpoint AI yang menulis `Invoice/JournalEntry/Expense/InventoryMovement/Tenant/Room/Stay/Ticket/PaymentSubmission`. Konfirmasi semua method hanya `findUnique/findMany/aggregate/count/$queryRaw` (read).
6. **Audit `meta.ai`:** verifikasi jejak `AuditLog.meta.ai` terisi saat manusia memakai rekomendasi AI untuk aksi final (lihat `recentAiAudit` + Kontrak Global #8).
7. Tulis hasil (LULUS/temuan + perbaikan) sebagai sub-bagian baru di `docs/M09_AUDIT.md`.

**Gate:** audit selesai + dibukukan di M09. Bila ditemukan kebocoran/role salah → buat fix + commit terpisah lalu rujuk di sini.

**JANGAN:** mengubah kode bila tidak ada temuan; J4 utamanya verifikasi + dokumentasi.

---

## UAT Global Fase J (wajib sebelum centang semua `[x]`)

- [ ] `cd backend; npm run build && npm run test:unit` SEMUA hijau (termasuk `owner-ai-safety.test.js` baru).
- [ ] `owner-ai.service.ts` tidak lagi memuat definisi fungsi murni (sudah di helper); `npx tsc --noEmit` = 0.
- [ ] Guard no-partial AI: DP booking sah tidak di-REJECT; nominal salah tetap REJECT.
- [ ] `cd frontend; npm run build` PASS; tombol AI non-blocking saat error; tak muncul untuk STAFF/TENANT.
- [ ] Audit PDP/keamanan AI dibukukan di `docs/M09_AUDIT.md`.
- [ ] Tidak ada perubahan `schema.prisma` / `sql/`.
