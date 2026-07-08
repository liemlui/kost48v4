# Audit Orphaned Endpoint — Fokus Admin/Owner + Inventory

**Tanggal:** 8 Juli 2026 · **Auditor:** Claude (sesi audit struktural, dipicu temuan bug KTP upload)

## Tujuan & Metodologi

Bug KTP sebelumnya (`POST /tenants/:id/ktp/upload` lengkap & aman di backend, tapi **tidak ada** UI yang pernah memanggilnya — `verifyKtp()` jadi selalu gagal) lolos dari audit visual/UI-walkthrough (Fable, Reasonix live-sweep) karena audit itu menilai *apakah halaman render tanpa error*, bukan *apakah setiap endpoint mutating punya jalur pemanggil di frontend*. Rendering halaman bisa 100% mulus sambil satu tombol krusial diam-diam tidak pernah mengirim request yang benar.

Metodologi audit ini berbeda: **cross-reference struktural** — (1) inventarisasi semua endpoint `@Post/@Patch/@Put/@Delete` di controller backend modul OWNER/ADMIN-sentris + Inventory, (2) grep tiap path ke `frontend/src/api/*.ts` untuk fungsi pemanggil resmi, (3) grep lagi apakah fungsi itu benar-benar di-*import & dipanggil* di `pages/**`/`components/**` (bukan cuma didefinisikan), (4) baca kode singkat untuk menyingkirkan false positive (mis. dibungkus generic-CRUD `resources.ts`/`SimpleCrudPage`, atau memang redundant-by-design). Tidak ada halaman yang benar-benar dijalankan di browser — audit ini murni statis/grep, sengaja hemat token per instruksi owner.

**Cakupan:** modul inventory (`inventory-items`, `inventory-movements`, `room-items`, `assets`), keuangan (`accounting`, `expenses`, `deposit-ledger`), AI owner (`owner-ai`, `market-analysis`), operasional (`renew-requests` admin, `rooms`, `staff-performance` admin, `staff-routines` admin, `staff-field-reports`, `announcements`, `wifi-sales`, `additional-services`, `users`, `tenants`, `settings`). Modul `reports` dan `finance` tidak punya endpoint mutating (semua `GET`) — dilewati. Endpoint publik/tenant-self-service dilewati sesuai instruksi.

**Sudah dicek di audit lama (tidak diulang di sini):** `docs/archieve/audit_fable/RINGKASAN_TEMUAN.md` (C01-C19, live-render + guard role JB-14 — semua endpoint admin/owner dikonfirmasi **guard**-nya benar dari sisi role, tapi TIDAK dicek apakah dipanggil UI), `docs/archieve/audit_reasonix/RINGKASAN_EKSEKUTIF.md` (82 temuan logika bisnis/perhitungan — beda kelas dari audit ini), `docs/archieve/audit_reasonix/11_DEAD_CODE.md` (ts-prune, laporan *unused export* generik dengan banyak false-positive re-export barrel — beberapa temuannya dikonfirmasi ulang di sini dengan konteks endpoint yang lebih tajam, ditandai di kolom Catatan).

## Tabel Temuan

| # | Modul | Endpoint | file:line backend | Status frontend | Severity | Catatan |
|---|-------|----------|--------------------|------------------|----------|---------|
| 1 | tenants (PDP) | `DELETE /tenants/:id/ktp` | `backend/src/modules/tenants/tenants.controller.ts:262` | **Orphan total** — tak ada fungsi di `api/tenants.ts`, tak ada tombol di UI manapun | **High** | Lihat analisis di bawah |
| 2 | accounting | `POST /accounting/accounts` (createAccount) | `backend/src/modules/accounting/accounting.controller.ts:122` | **Orphan total** — hanya `fetchAccounts()` (GET) dipakai di `AccountingSetupPage.tsx`; tak ada `createAccount()` di `api/accounting.ts` | **Medium** | Owner cuma bisa dapat COA dari `seedDefaultCoa()`, tak bisa tambah akun custom |
| 3 | accounting | `PATCH /accounting/accounts/:id` (updateAccount) | `accounting.controller.ts:128` | **Orphan total** — tak ada fungsi di `api/accounting.ts` | **Medium** | Tak bisa edit/nonaktifkan akun COA yang salah nama/tipe dari UI |
| 4 | accounting | `PATCH /accounting/cash-accounts/:id` (updateCashAccount) | `accounting.controller.ts:146` | **Orphan total** — hanya `createCashAccount()` dipakai, tak ada update | **Medium** | Cash account salah ketik/nomor rekening tak bisa dikoreksi tanpa DB manual |
| 5 | accounting | `PATCH /accounting/periods/:id` (updatePeriod, generic) | `accounting.controller.ts:177` | **Orphan total** — hanya varian `PATCH periods/:id/reopen` (`reopenAccountingPeriod`) yang dipakai | **Low** | Kemungkinan endpoint generic ini memang digantikan alur reopen khusus — cek owner sebelum hapus |
| 6 | assets | `PATCH /assets/:id` (update fixed asset) | `backend/src/modules/assets/assets.controller.ts:79` | **Orphan total** — tak ada `updateFixedAsset()` di `api/assets.ts`; `AssetRegisterPage.tsx` cuma punya modal Create + Alignment + Depreciation, **tak ada tombol Edit** di tabel aset | **Medium** | Setelah aset dibuat (cost, umur manfaat, `depreciationEnabled`, dll), admin **tidak bisa mengoreksi** kesalahan input tanpa akses DB — beda dari inventory-items/room-items yang PATCH-nya sudah terpakai via generic resources |
| 7 | owner-ai | `POST /owner-ai/faqs/generate-draft` | `backend/src/modules/owner-ai/owner-ai.controller.ts:121` | **Didefinisikan tapi tak dipakai** — `generateFaqDraft()` ada di `api/ai.ts:146`, 0 pemanggil di `pages/**`/`components/**` | **Medium** | (sudah tercatat di `11_DEAD_CODE.md` sebagai unused export generik — di sini dikonfirmasi ulang: bukan false-positive barrel, benar-benar tak ada tombol "Generate draft FAQ" di halaman FAQ manapun) |
| 8 | owner-ai | `POST /owner-ai/staff-field-reports/:id/review-draft` | `owner-ai.controller.ts:83` | **Didefinisikan tapi tak dipakai** — `reviewFieldReportWithAi()` ada di `api/ai.ts:297`, 0 pemanggil | **Medium** | Lihat analisis di bawah — pola G6 AI-draft yang "setengah dipasang" |
| 9 | deposit-ledger | `POST /deposit-ledger/backfill/dry-run` | `backend/src/modules/deposit-ledger/deposit-ledger.controller.ts:67` | **Didefinisikan tapi tak dipakai** — `runDepositLedgerBackfillDryRun()` ada di `api/depositLedger.ts:150`, 0 pemanggil | **Low** | Kemungkinan legacy — endpoint serupa `POST /accounting/auto-journal/deposit-backfill/dry-run` (`runDepositBackfillDryRun`) **sudah** terpakai di `AccountingSetupPage.tsx:451` dan tampaknya jadi pengganti fungsional |
| 10 | announcements | `POST /announcements/:id/publish` | `backend/src/modules/announcements/announcements.controller.ts:160` | **Didefinisikan di backend, tak dipakai frontend** — tak ada fungsi API/pemanggil sama sekali | **Low** | Diverifikasi BUKAN gap fungsional: `announcements.service.ts` method `update()` (baris 125-156) sudah mereplikasi efek `publish()` (set `publishedAt` + `notifyPublished()`) saat toggle checkbox `isPublished` lewat form CRUD generik (`config/resources/communications.ts`). Endpoint dedicated ini murni dead code |
| 11 | tenants | `GET /tenants/demographics/summary` | `backend/src/modules/tenants/tenants.controller.ts:~229` | **Didefinisikan tapi tak dipakai** — `getDemographicsSummary()` di `api/tenants.ts:122`, 0 pemanggil | **Low** | Bukan mutating (di luar fokus utama, dicatat untuk kelengkapan). Kemungkinan digantikan `GET /market-analysis/demographics` (`getCustomerDemographics()`) yang **aktif** dipakai di `MarketAnalysisPage.tsx` — cek dengan owner apakah `/tenants/demographics/summary` masih relevan (`docs-memory: owner-decision-ktp-demografi-2026-06-19` bahas demografi KTP teranonim) |

## Analisis Temuan Critical/High

### #1 — `DELETE /tenants/:id/ktp` tak punya jalur UI (High)

Endpoint ini mengimplementasikan **hak hapus data (right-to-erasure) UU PDP** untuk data KTP tenant: backend-nya lengkap — `OWNER`-only, menghapus `nik`/foto KTP dari DB, **dan** ikut menghapus file fisik KTP + foto profil turunan (`profile-photo` yang berasal dari `KTP_AUTO`) dari disk (`tenants.controller.ts:265-270`). Tapi tidak ada `deleteTenantKtp()` (atau nama serupa) di `frontend/src/api/tenants.ts`, dan tidak ada tombol "Hapus Data KTP" di halaman detail tenant manapun.

Skenario konkret: tenant keluar dan minta datanya dihapus sesuai UU PDP (hak yang sudah dijanjikan implisit lewat existensi endpoint ini), atau owner ingin membersihkan data KTP tenant lama untuk kepatuhan — **tidak ada cara melakukannya dari UI**, hanya lewat `curl`/Postman manual dengan token OWNER. Ini persis pola bug KTP upload sebelumnya: backend mengimplementasikan kontrak yang benar, tapi kontrak itu tak pernah "ditutup" dari sisi UI.

### #6 — `PATCH /assets/:id` tak punya tombol Edit (Medium)

`AssetRegisterPage.tsx` (finance) mendukung: buat aset baru (`createFixedAsset`), preview/posting alignment ledger, dan preview/posting depresiasi bulanan — tapi tabel daftar aset (baris ~278-294) hanya punya satu aksi per baris: **"Review" alignment**. Tidak ada aksi "Edit". Jika admin salah input `acquisitionCostRupiah`, `usefulLifeMonths`, atau lupa mencentang `depreciationEnabled` saat membuat aset, satu-satunya jalan koreksi adalah membuat aset baru (duplikat) atau mengubah data langsung di database — beresiko drift antara Asset Register dan Ledger yang justru coba dicegah oleh fitur "Ledger Alignment" di halaman yang sama.

### #7 & #8 — Dua endpoint draft AI (G6/Fase G) tak tersambung (Medium)

Modul `owner-ai` fase G6 (AI operations & inventory draft) punya pola konsisten: tombol manual OWNER/ADMIN memicu draft AI → simpan sebagai `AiDraft` → manusia approve. Untuk `draftTicketAction()` dan `draftInventoryReorder()`, pola ini **terpasang penuh** (dipanggil dari `TicketsPage.tsx` dan `InventoryShellPage.tsx`). Tapi dua saudaranya dalam batch fitur yang sama — `generateFaqDraft()` (draft FAQ dari AI) dan `reviewFieldReportWithAi()` (draft review laporan lapangan staf) — didefinisikan lengkap dengan tipe TypeScript penuh di `api/ai.ts`, namun **tidak pernah diimpor** oleh komponen manapun. Kemungkinan besar ini fitur yang selesai dibangun di backend+client-function tapi terlewat saat memasang tombol UI-nya (pola yang sama seperti bug KTP, skala lebih kecil karena bukan blocker alur uang/keluar-masuk kamar, tapi tetap berarti investasi AI DeepSeek untuk 2 fitur ini sia-sia sampai dipasang).

## Ringkasan Angka & Rekomendasi

- **Endpoint mutating/upload OWNER-ADMIN-sentris diperiksa:** ~90 route (`POST`/`PATCH`/`PUT`/`DELETE`) di 19 modul controller.
- **Orphan/dead-wiring ditemukan:** 11 — 1 High, 6 Medium, 4 Low.
- **Terverifikasi OK (false positive disingkirkan):** mayoritas CRUD `inventory-items`/`inventory-movements`/`room-items`/`rooms`/`facilities`/`wifi-sales`/`expenses`/`additional-services`/`users`/`announcements` (base CRUD) ternyata terpasang lewat sistem generic-resource (`api/resources.ts` + `SimpleCrudPage`/`ResourceFormModal`) — bukan file `api/<modul>.ts` khusus, jadi grep path-langsung sempat false-negative sebelum ditelusuri ke `config/resources/*.ts`. `uploadRoomImage` yang ditandai "tidak dipakai" di `11_DEAD_CODE.md` juga dikonfirmasi **false positive** (dipakai via re-export barrel `api/rooms.ts` → `api/mediaUploads.ts`, ts-prune tak bisa lacak re-export).

**Urutan prioritas perbaikan yang disarankan:**
1. **#1 (High)** — pasang tombol "Hapus Data KTP (UU PDP)" di halaman detail tenant, khusus OWNER. Risiko kepatuhan legal, kecil effort (fungsi API + 1 tombol + modal konfirmasi).
2. **#6 (Medium)** — tambah `updateFixedAsset()` + tombol Edit di `AssetRegisterPage.tsx`. Risiko data aset drift dari ledger.
3. **#2-4 (Medium)** — tambah UI kelola COA/cash-account manual (create+edit akun) di `AccountingSetupPage.tsx`, atau dengan sadar dokumentasikan sebagai "sengaja seed-only" bila memang itu keputusan desain owner.
4. **#7-8 (Medium)** — pasang tombol "Generate Draft FAQ (AI)" di halaman FAQ admin dan "Review dengan AI" di `AdminStaffFieldReportQueue.tsx`, atau hapus fungsi+endpoint bila fitur ini memang dibatalkan owner.
5. **#5, #9, #10, #11 (Low)** — konfirmasi ke owner apakah endpoint ini sengaja ditinggalkan (redundant-by-design) lalu hapus sebagai bagian sprint bersih-bersih dead-code (`docs/archieve/audit_reasonix/11_DEAD_CODE.md` sudah merekomendasikan sprint serupa).

Tidak ada kode yang diubah dalam audit ini — murni laporan.
