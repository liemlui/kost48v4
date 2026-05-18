# KOST48 V5 — Ground State
**Versi:** 2026-05-18 V5.7/V5.8 architecture audit sync  
**Status:** Source of truth utama untuk membuka sesi baru. Baca file ini dulu sebelum `01_CONTRACTS.md`, `02_PLAN.md`, dan `CHECKLIST.md`.

---

---

## 0A. V5.8-A Overlay Patch Prepared — Belum PASS

Status package ini:

```text
V5.8-A Backend Guard overlay prepared in ChatGPT sandbox.
Local Windows build/UAT masih wajib sebelum status boleh disebut PASS.
```

Perubahan source yang disiapkan:

1. `CheckoutRequestsModule` tidak lagi import dead `StaysModule`.
2. `StaysService.renewStay()` tetap membuat invoice renewal sebagai `DRAFT` hanya sementara untuk insert line, lalu langsung update menjadi `ISSUED` + `issuedAt`.
3. `StaysService.complete()` sekarang mengecek invoice open di dalam `$transaction()` sebelum melepas kamar. Status selain `PAID`/`CANCELLED` memblokir checkout final.
4. `StaysService.processDeposit()` ikut memakai definisi open invoice yang sama sebelum deposit diproses.
5. `StaysQueryService` menghitung open invoice dengan definisi `status NOT IN [PAID, CANCELLED]`, bukan hanya `ISSUED/PARTIAL`.

Yang sengaja tidak disentuh:

- `nest-cli.json`, `app.module.ts`, `tsconfig`, `apps/`, `libs/`;
- `schema.prisma` dan SQL migration;
- `PaymentSubmissionsService.approveSubmission()`;
- `TenantBookingsService.approveBooking()`;
- frontend split;
- marketing/staff/tenant/finance app shell.

Next setelah merge lokal:

1. Run backend build.
2. Run smoke/UAT script.
3. Baru lanjut V5.8-B marketing-api shell PLAN/ACT jika V5.8-A hasil lokal OK.

## 0. Current Command Center State — Wajib Dibaca

KOST48 sekarang berada pada track:

```text
KOST48 V5 — Multi-App Shared-DB Architecture
Mode default: PLAN ONLY
Environment: Windows + VS Code + PowerShell
Project root:
C:\Users\lieml\Desktop\Big Personal Web App\kost48surabaya-v3\kost48_full_frontend_backend_upgrade_bundle\final_bundle
```

Stack tetap:

- Backend: NestJS + Prisma + PostgreSQL
- Frontend: React + Vite + TypeScript + React-Bootstrap + TanStack Query
- Auth: JWT Bearer
- API lokal: `http://localhost:3000/api`
- Frontend lokal: `http://localhost:5173`
- DB dev/UAT: `localhost:5433 / kost48_v3_pro / postgres`
- Monorepo: `/backend`, `/frontend`, `/docs`

Aturan dasar tetap:

1. Jangan rewrite total.
2. Jangan patch sebelum paham file asli.
3. PLAN dan ACT tidak boleh dicampur.
4. Semua command harus PowerShell.
5. API test wajib `Invoke-RestMethod`, bukan `curl`.
6. Jangan klaim PASS tanpa build + UAT/manual verification.
7. Jangan reset DB kecuali user eksplisit minta.
8. Jangan buat file `.md` baru kecuali user minta.
9. Jangan kerja di luar project root.
10. Jangan generate app/move module sebelum gated plan selesai.

---

## 1. Start-of-Session Command

Selalu mulai sesi dengan:

```powershell
Set-Location "C:\Users\lieml\Desktop\Big Personal Web App\kost48surabaya-v3\kost48_full_frontend_backend_upgrade_bundle\final_bundle"; git status --short; git log --oneline -5
```

Interpretasi:

```text
Jika clean:
  lanjut PLAN sesuai fase aktif.

Jika ada modified/untracked:
  jangan mulai patch besar.
  identifikasi dulu apakah itu rules/docs/frontend code yang sengaja diubah.
```

Catatan branch:

```text
Bukti terminal terakhir menunjukkan branch aktif: main / origin/main.
Jangan ubah wording ke master kecuali git log/status lokal menunjukkan sebaliknya.
```

---

## 2. Latest Architecture Decision — Multi-App Shared-DB

Arah arsitektur baru:

```text
Bukan rewrite dari nol.
Bukan pure microservices.
Bukan separate DB dulu.
Shared PostgreSQL tetap dipakai.
PrismaService tetap shared.
Strategi: greenfield shell + brownfield logic extraction.
Tidak ada distributed transaction.
Tidak ada service-to-service HTTP pada Phase 0/1 kecuali diputuskan eksplisit.
```

Target backend apps/process:

| App | Ownership utama | Status |
|---|---|---|
| `core-api` | Stay lifecycle, Room occupancy/status writes, manual check-in, booking approval, checkout final, renew execution, meter promotion, lifecycle-mutating payment approval | Guardian utama |
| `tenant-api` | tenant booking create/my, payment proof create/my, checkout request create/view, renew request create/view, tenant invoice/stay read-only, notifications read | Later, read/request only |
| `staff-api` | tickets, room view, inventory read-only, maintenance/task future | Early extraction candidate setelah marketing |
| `finance-api` | invoice read/list/detail, payment review queue read, finance reports, expenses/wifi read | Partial read/review only; approval tetap core |
| `marketing-api` | public rooms, public room detail, gallery/public profile/landing | Early read-only candidate |
| `owner-api` | owner dashboard/reporting aggregator | Deferred, jangan dibuat terlalu awal |

Boundary rules:

1. `core-api` owns all writes to `Stay` lifecycle.
2. `core-api` owns `Room.status` / occupancy writes.
3. `tenant-api` boleh create request/submission dan read own data, tetapi tidak boleh execute finalization.
4. `finance-api` boleh read/review, tetapi payment approval yang mutate Stay/Room/Meter/Deposit tetap core.
5. `marketing-api` harus read-only/public dulu.
6. `owner-api` ditunda agar tidak menjadi mini-monolith kedua.

---

## 3. V5.1–V5.7 Audit Status

### 3.1 Commit baseline yang diketahui

Latest known commits dari audit/terminal:

```text
6c86556 prepare v5 shared boundary hardening
4265896 prepare v5 shared boundary hardening
d1a7181 automate manual check-in invoice and portal access
424ad3b harden cline project rules
e0d1454 update business lifecycle blueprint
```

V5.1–V5.6 sudah diterapkan menurut audit conversation:

- V5.1: manual check-in hardening, P2002/conflict mapping, success navigation.
- V5.2: email portal normalization/case-insensitive conflict lookup.
- V5.3: marketing/public rooms read-only boundary; public rooms moved to Marketing/Public module route owner.
- V5.4: staff read-only guard hardening for inventory/room-items surfaces.
- V5.5: tenant read/request boundary hardening; tenant non-occupied restrictions.
- V5.6: finance read/review boundary; staff finance read-only; payment approval not moved.

Jangan ulang klaim PASS tanpa build/UAT baru. Treat sebagai historical baseline dari commit/audit.

### 3.2 V5.7-A / rules state

`.clinerules` dan `.clineignore` telah diarahkan ke V5 workflow:

- Cline = local repo auditor / bounded coding agent.
- ChatGPT = command center.
- V5.7 = workspace/shared foundation audit, not behavior patch.
- Overlay patch format dipakai, tidak ada `APPLY_*.ps1`.
- Active docs hanya 7 file.
- PowerShell-only / Invoke-RestMethod-only.

Tetap verifikasi dengan `git status --short` apakah rules sudah committed.

### 3.3 V5.7-B targeted audit — accepted findings

Hasil targeted audit yang diterima:

| Area | Finding | Decision |
|---|---|---|
| Backend workspace | `nest-cli.json` masih single-project monolith; `AppModule` masih aggregator | `NEEDS MANUAL MIGRATION` |
| Public/Marketing | Public module read-only; membaca Room/Announcement; tidak lifecycle write | Candidate aman untuk `marketing-api` PLAN |
| CheckoutRequests | `CheckoutRequestsModule` import `StaysModule`, tetapi service tidak inject `StaysService` | Dead import cleanup candidate |
| RenewRequests | `RenewRequestsService` inject `StaysService`; `approveRequest()` memanggil `staysService.renewStay()` | approve/execution wajib core-api |
| PaymentSubmissions | `approveSubmission()` memakai `$transaction` + raw SQL lock, mutate PaymentSubmission/InvoicePayment/Invoice/Stay/Room/MeterReading/AuditLog/deposit | approval tetap core-api |
| TenantBookings | `approveBooking()` memakai `$transaction`, membuat invoice `ISSUED`, pending meter snapshot, audit | approval tetap core-api |
| StaysService.create | `$transaction`; creates Stay, Room OCCUPIED, invoice DRAFT→ISSUED, InvoiceLine, MeterReading x2, portal user | B1 done in code |
| StaysService.complete | `$transaction`; Stay COMPLETED, Room AVAILABLE; tidak membuat final utility invoice line | business guard needed |
| StaysService.renewStay | `$transaction`; extends stay, creates renewal invoice `DRAFT` | must change to ISSUED by KB-1 |
| MyInvoicesPage | Valid tenant portal candidate if present and build passes | commit separately after build |

---

## 4. Locked Business Decisions After Audit

### KB-1 — Renewal invoice

```text
Invoice renewal = auto-ISSUED saat approveRequest().
Tidak boleh tetap DRAFT setelah admin approve renew.
```

Implikasi:

- `RenewRequestsService.approveRequest()` / `StaysService.renewStay()` perlu patch.
- Pilih implementasi paling rendah risiko setelah PLAN V5.8.
- Target behavior: saat renew request approved, tenant langsung memiliki invoice renewal `ISSUED` yang tenant-facing dan bisa dibayar.

### KB-2 — Checkout final with open invoices

```text
StaysService.complete() harus block jika ada open invoice.
Admin wajib settlement manual dulu.
Tidak ada auto-create final utility invoice di complete().
```

Open invoice policy:

```text
Open invoice = invoice status bukan PAID dan bukan CANCELLED.
DRAFT harus ikut block sampai ada keputusan/aksi admin.
```

Implikasi:

- `complete()` tidak auto-create final utility invoice.
- Admin harus memastikan semua tagihan yang relevan sudah issue/paid/cancelled sebelum checkout final.
- Error harus Bahasa Indonesia dan menampilkan invoice ID/nomor yang harus diselesaikan.

---

## 5. Current Next Work

### Next immediate step

```text
V5.8 PLAN ONLY — Marketing-api extraction + KB-1/KB-2 patch planning.
```

V5.8 PLAN boleh dimulai jika:

1. `git status --short` clean, atau hanya perubahan yang sengaja sedang dibahas.
2. `.clinerules/.clineignore` sudah resolved/committed.
3. `MyInvoicesPage.tsx` sudah resolved:
   - jika valid dan frontend build PASS → commit terpisah;
   - jika invalid/duplicate → jangan commit.
4. Public/marketing module read-only sudah diterima dari audit.
5. High-risk boundaries documented:
   - payment approval core;
   - renew approval core;
   - booking approval core;
   - room writes core;
   - meter promotion core.

### V5.8 likely split

```text
V5.8-A: small backend cleanup + KB-1 + KB-2 PLAN/ACT
  - remove dead StaysModule import from CheckoutRequestsModule
  - renewal invoice auto-ISSUED
  - complete() open invoice guard
  - backend build + targeted UAT

V5.8-B: marketing-api extraction PLAN
  - no app generation until exact workspace migration plan accepted

V5.8-C: workspace/shared skeleton PLAN
  - nest-cli/tsconfig/apps/libs only after bounded plan
```

Jangan campur workspace migration besar dengan KB-1/KB-2 dalam satu ACT.

---

## 6. What Must NOT Be Extracted Yet

| Komponen | Alasan |
|---|---|
| `PaymentSubmissionsService.approveSubmission()` | Mutasi multi-model: PaymentSubmission, InvoicePayment, Invoice, Stay, Room, MeterReading, deposit fields, AuditLog; harus atomic core |
| `TenantBookingsService.approveBooking()` | Menentukan kontrak awal, invoice, deposit, pending meter snapshot |
| `StaysService.create()` | Direct operational lifecycle create + room occupancy + invoice + portal + meter |
| `StaysService.complete()` | Checkout final lifecycle; akan ditambah open invoice guard |
| `StaysService.renewStay()` | Renew execution + invoice generation; akan diubah ke ISSUED |
| Renew admin approval/execution | Inject `StaysService`; wajib core |
| Checkout admin approve/reject | Admin lifecycle decision; keep core walau saat ini hanya update request |
| Room status writes | Core-api only |
| Meter promotion | Core-api only karena terikat payment activation |
| Deposit settlement | Belum punya model audit trail matang |
| Damage/penalty schema | Belum dibuka |
| `owner-api` | Deferred agar tidak menjadi mini-monolith kedua |

---

## 7. Active Source of Truth Hierarchy

| Prioritas | File aktif | Fungsi |
|---:|---|---|
| 1 | `backend/prisma/schema.prisma` | Bentuk data utama |
| 2 | `backend/sql/bootstrap.sql` + addendum | Pagar integritas DB |
| 3 | `docs/00_GROUND_STATE.md` | Status proyek, keputusan aktif, arah next |
| 4 | `docs/01_CONTRACTS.md` | Kontrak bisnis/API/ownership |
| 5 | `docs/02_PLAN.md` | Master execution plan |
| 6 | `docs/CHECKLIST.md` | Checklist phase/UAT/gates |
| 7 | `docs/03_DECISIONS_LOG.md` | Keputusan freeze |
| 8 | `docs/04_JOURNAL.md` | Kronologi audit/hasil kerja |
| 9 | `docs/CHANGELOG.md` | Ringkasan patch/docs/source |

No new markdown docs by default.

---

## 8. PowerShell Verification Snippets

Git:

```powershell
Set-Location "C:\Users\lieml\Desktop\Big Personal Web App\kost48surabaya-v3\kost48_full_frontend_backend_upgrade_bundle\final_bundle"; git status --short; git log --oneline -5
```

Backend build:

```powershell
Set-Location "C:\Users\lieml\Desktop\Big Personal Web App\kost48surabaya-v3\kost48_full_frontend_backend_upgrade_bundle\final_bundle\backend"; npm run build
```

Frontend build:

```powershell
Set-Location "C:\Users\lieml\Desktop\Big Personal Web App\kost48surabaya-v3\kost48_full_frontend_backend_upgrade_bundle\final_bundle\frontend"; npm run build
```

Admin login:

```powershell
$login = Invoke-RestMethod -Method Post -Uri "http://localhost:3000/api/auth/login" -ContentType "application/json" -Body '{"identifier":"admin@kost48.com","password":"admin123"}'; $token=$login.data.accessToken; $token
```

Public rooms smoke:

```powershell
Invoke-RestMethod -Method Get -Uri "http://localhost:3000/api/public/rooms"
```

Protected notification:

```powershell
$login = Invoke-RestMethod -Method Post -Uri "http://localhost:3000/api/auth/login" -ContentType "application/json" -Body '{"identifier":"admin@kost48.com","password":"admin123"}'; $token=$login.data.accessToken; Invoke-RestMethod -Method Get -Uri "http://localhost:3000/api/me/notifications" -Headers @{Authorization="Bearer $token"}
```

Payment review queue:

```powershell
$login = Invoke-RestMethod -Method Post -Uri "http://localhost:3000/api/auth/login" -ContentType "application/json" -Body '{"identifier":"admin@kost48.com","password":"admin123"}'; $token=$login.data.accessToken; Invoke-RestMethod -Method Get -Uri "http://localhost:3000/api/payment-submissions/review-queue" -Headers @{Authorization="Bearer $token"}
```

Staff read-only smoke:

```powershell
$login = Invoke-RestMethod -Method Post -Uri "http://localhost:3000/api/auth/login" -ContentType "application/json" -Body '{"identifier":"staff@kost48.com","password":"staff123"}'; $token=$login.data.accessToken; Invoke-RestMethod -Method Get -Uri "http://localhost:3000/api/inventory-items" -Headers @{Authorization="Bearer $token"}
```
