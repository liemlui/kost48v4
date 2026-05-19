# KOST48 V5 — Decisions Log
**Versi:** 2026-05-18 V5.7/V5.8 audit sync  
**Fungsi:** Arsip keputusan freeze. Tambahkan keputusan baru di bawah; jangan buat file decision baru.

---

---

## 2026-05-18 — V5.8-A Overlay Patch Decisions

| # | Keputusan | Dampak |
|---:|---|---|
| 219 | V5.8-A boleh dieksekusi sebagai bounded YOLO ACT karena user override dari PLAN ONLY | Patch tetap dibatasi ke business correctness dan docs/scripts; workspace migration tetap tidak disentuh. |
| 220 | KB-1 diterapkan di `StaysService.renewStay()` | Renewal invoice staging `DRAFT` hanya sementara sampai line dibuat; transaction mengembalikan invoice `ISSUED`. |
| 221 | KB-2 guard ditempatkan di dalam `$transaction()` `StaysService.complete()` | Mengurangi risiko race antara cek invoice dan update checkout. |
| 222 | Definisi open invoice diseragamkan ke `status NOT IN [PAID, CANCELLED]` | Diterapkan untuk checkout final, deposit processing, dan query open invoice count. |
| 223 | `CheckoutRequestsModule` dead import dibersihkan | Tidak mengubah behavior request approval/rejection; hanya mengurangi coupling. |
| 224 | V5.8-A belum PASS sampai build/UAT lokal selesai | Sandbox tidak menjalankan backend dengan DB Windows user. |

## 2026-05-18 — V5.7-B Targeted Audit Decisions

| # | Keputusan | Dampak |
|---:|---|---|
| 193 | V5.7-B targeted audit diterima sebagai baseline keputusan | UNKNOWN utama dari audit awal sudah tertutup untuk Checkout/Renew/Payment/Stays/Public/MyInvoicesPage. |
| 194 | Backend workspace verdict = `NEEDS MANUAL MIGRATION` | `nest-cli.json`, `AppModule`, path aliases, apps/libs tidak boleh diubah tanpa plan terpisah. |
| 195 | V5.7 tidak boleh menyentuh `nest-cli.json`, `app.module.ts`, `tsconfig`, `apps/`, atau `libs/` | V5.7 hanya audit/rules/readiness, bukan workspace migration. |
| 196 | Branch aktif dianggap `main/origin/main` sesuai bukti terminal terbaru | Jangan ubah rules/docs ke `master` kecuali git lokal membuktikan sebaliknya. |
| 197 | `PaymentSubmissionsService.approveSubmission()` confirmed core-only | Menggunakan `$transaction` + SQL lock dan mutasi PaymentSubmission, InvoicePayment, Invoice, Stay, Room, MeterReading, deposit fields, AuditLog. |
| 198 | `TenantBookingsService.approveBooking()` confirmed core-only | Membuat invoice `ISSUED`, menyimpan pending meter snapshot, dan menetapkan nilai kontrak. |
| 199 | `RenewRequestsService.approveRequest()` confirmed core-only | Service inject `StaysService` dan memanggil `staysService.renewStay()`. |
| 200 | `CheckoutRequestsModule` memiliki dead import `StaysModule` | Cleanup candidate V5.8-A; bukan blocker dan bukan behavior change. |
| 201 | `StaysService.create()` sudah menjalankan B1 automation | Manual check-in invoice `ISSUED`, portal user auto-create, meter readings dalam transaction. |
| 202 | `StaysService.complete()` confirmed memakai `$transaction` tetapi tidak membuat final utility invoice | Tidak ada transaction hotfix; business guard open invoice tetap diperlukan. |
| 203 | `StaysService.renewStay()` confirmed membuat invoice renewal `DRAFT` | Harus diubah sesuai KB-1. |
| 204 | `MyInvoicesPage.tsx` adalah valid tenant portal candidate jika ada dan build PASS | Jangan commit jika frontend build gagal; commit terpisah dari rules. |

---

## 2026-05-18 — Locked Business Decisions for V5.8

| # | Keputusan | Dampak |
|---:|---|---|
| 205 | KB-1: Renewal invoice harus auto-`ISSUED` saat admin approve renew request | Renewal invoice tidak boleh tetap `DRAFT` setelah approval; tenant harus bisa melihat/membayar. |
| 206 | KB-2: Checkout final harus block jika ada open invoice | `StaysService.complete()` harus menolak checkout jika invoice status bukan `PAID`/`CANCELLED`. |
| 207 | KB-2 tidak memakai auto-create final utility invoice | Admin wajib settle/issue/cancel/pay invoice manual sebelum checkout; `complete()` tidak membuat invoice baru. |
| 208 | `DRAFT` invoice termasuk open invoice untuk checkout guard | DRAFT harus diselesaikan/dibatalkan sebelum checkout final. |
| 209 | KB-1 dan KB-2 adalah P0 correctness sebelum tenant-api extraction | V5.10 tidak boleh dimulai sebelum renewal/checkout invoice behavior stabil. |

---

## 2026-05-18 — V5 Roadmap Decisions

| # | Keputusan | Dampak |
|---:|---|---|
| 210 | V5.8 dimulai dengan PLAN only | Tidak ada ACT sebelum Cline plan direview. |
| 211 | V5.8-A kandidat pertama adalah cleanup + KB-1 + KB-2 | Small backend patch dulu, bukan workspace migration besar. |
| 212 | Marketing-api extraction tetap target early win, tetapi setelah V5.8 PLAN | Public module read-only, tetapi app shell/workspace tetap perlu plan. |
| 213 | Workspace migration dipisah dari KB-1/KB-2 | Jangan campur `nest-cli.json` migration dengan business correctness patch. |
| 214 | Staff-api setelah marketing-api | Read-only staff surfaces lebih aman setelah public extraction path terbukti. |
| 215 | Tenant-api read/request flows setelah KB-1/KB-2 stabil | Agar renew/checkout lifecycle boundary tidak ambigu. |
| 216 | Finance-api hanya read/review dulu | Payment approval tetap core sampai command boundary didesain. |
| 217 | Frontend split ditunda ke V5.12 | API clients dan App.tsx masih mixed; jangan pecah terlalu awal. |
| 218 | Owner-api tetap deferred | Mencegah terbentuknya mini-monolith kedua. |

---

## 2026-05-18 — Multi-App Shared-DB Architecture Decisions

| # | Keputusan | Dampak |
|---:|---|---|
| 181 | Arah arsitektur baru adalah Multi-App Shared-DB Architecture | Mengganti keputusan lama “tidak memakai microservices” menjadi “tidak memakai pure microservices/separate DB dulu”. |
| 182 | Strategi migrasi adalah greenfield shell + brownfield logic extraction | App shell baru boleh dibuat nanti, tetapi business logic existing tidak ditulis ulang dari nol. |
| 183 | Shared PostgreSQL tetap dipakai pada fase awal | Menghindari distributed transaction dan menjaga trigger/constraint DB existing tetap berguna. |
| 184 | PrismaService menjadi shared library | Semua app memakai akses DB yang konsisten selama shared DB. |
| 185 | `core-api` owns Stay lifecycle writes | Checkout final, renew execution, room occupancy, booking approval, dan meter promotion tetap core dulu. |
| 186 | `tenant-api` hanya boleh create/view request/submission tenant | Tidak boleh complete checkout, renew stay, atau mutate room/stay lifecycle. |
| 187 | CheckoutRequest admin approval/finalization tetap `core-api` | Karena dapat menyentuh Stay, Room, invoice guard, deposit/final meter future. |
| 188 | RenewRequest admin approval/execution tetap `core-api` | Karena extend stay dan invoice renewal adalah lifecycle write. |
| 189 | Payment approval yang mutate Stay/Room/Meter/Deposit tetap `core-api` sampai audit boundary | Finance-api boleh mulai dari review/read surface, bukan lifecycle mutation. |
| 190 | `marketing-api` dan `staff-api` menjadi kandidat early extraction | Risiko lebih rendah dan cocok untuk validasi setup multi-app. |
| 191 | `owner-api` ditunda | Menghindari terbentuknya mini-monolith kedua yang menarik semua domain. |
| 192 | Phase 0 Architecture Audit wajib sebelum `nest generate app` atau file move | Cek workspace readiness, dependency map, mutation boundary, dan frontend route split dulu. |

---

## Open Decisions — Future Batches

| Topik | Opsi | Status |
|---|---|---|
| Deposit model | DepositTransaction / DepositLog vs simpler fields | Belum dikunci; future B4 |
| Damage/penalty | Sekarang atau later | Deferred; setelah deposit clear |
| Final utility invoice | Auto invoice later atau tetap manual | KB-2 sekarang memilih manual settlement before checkout; auto invoice deferred |
| Form approval renewal | Nominal field tambahan atau reuse current | Perlu V5.8/V5.10 audit UI |
| Marketing app shell port | 3001/3002/etc | Ditentukan di V5.8 PLAN |
| Workspace migration timing | V5.8-C atau later | Menunggu V5.8 PLAN |

---

## Historical Decisions Kept Active

1. `schema.prisma` adalah bentuk data utama.
2. `bootstrap.sql` adalah pagar integritas DB.
3. Vertical slice strategy tetap dipakai.
4. Windows PowerShell sebagai default command.
5. Tenant tidak menulis langsung ke `InvoicePayment`; tenant memakai `PaymentSubmission`.
6. Admin tetap memegang approval final.
7. Payment submission harus idempotent/race-safe.
8. Initial booking payment = combined rent + deposit.
9. Room `RESERVED -> OCCUPIED` hanya setelah rent + deposit paid.
10. `Announcement` ≠ `AppNotification`.
11. Finance reminder butuh persistent urgency chip.

---

## Documentation Hygiene Rule

Jangan buat file baru seperti:

- `CURRENT_STATUS_YYYY-MM-DD.md`
- `PATCH_SUMMARY_*.md`
- `PACKAGE_README_*.md`
- `README_PROGRESS_UPDATE.md`
- changelog frontend/backend terpisah

Kecuali user eksplisit minta. Update cukup ke 7 active docs.

---

## 2026-05-18 — V5.9-A Multi-App Shell Decisions

| # | Keputusan | Dampak |
|---:|---|---|
| 219 | App shell baru ditempatkan di `backend/src/apps/*`, bukan root `apps/*` | Menjaga build lama tetap menghasilkan `dist/main.js` dan meminimalkan risiko start:prod pecah. |
| 220 | Shared bootstrap dibuat untuk core/marketing/staff/finance | Setup global Nest konsisten tanpa rewrite total. |
| 221 | `marketing-api` boleh langsung read-only shell | Public rooms tetap read-only dan tidak membawa auth/lifecycle modules. |
| 222 | `staff-api` hanya read-only pada V5.9-A | Tidak expose POST/PATCH/DELETE inventory/room/ticket mutation. |
| 223 | `finance-api` hanya read-only/review pada V5.9-A | Tidak expose payment approval/reject/expiry command route. |
| 224 | Core `AppModule` belum dipecah | V5.9-A valid sebagai shell foundation, bukan full monolith split. |
| 225 | Tenant-api tetap deferred | Request/write tenant perlu bounded audit berikutnya agar tidak menarik lifecycle coupling. |
