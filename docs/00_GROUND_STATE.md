# KOST48 V5 — Ground State
**Versi:** 2026-05-19 V5.9 rollback + V5.8-A guard baseline
**Status:** Source of truth utama untuk membuka sesi baru. Baca file ini dulu sebelum `01_CONTRACTS.md`, `02_PLAN.md`, dan `CHECKLIST.md`.

---

---

## 0A. Current Baseline — V5.8-A Guard Line Defenses Applied, V5.9 Shell Rolled Back

Status saat ini:

```text
V5.8-A Backend Guard line defenses sudah applied di source dan terverifikasi utuh.
V5.9 multi-app shell (apps/bootstrap/health/scripts multi-start) sudah dirollback.
Backend kembali ke struktur core monolith bersih dengan guard KB-1 dan KB-2 intact.
Build/UAT belum dijalankan — status PASS belum diklaim.
```

Perubahan source V5.8-A yang masih utuh:

1. `CheckoutRequestsModule` tidak import dead `StaysModule`.
2. `StaysService.renewStay()` membuat invoice renewal `DRAFT` untuk insert line, lalu langsung `ISSUED` + `issuedAt`.
3. `StaysService.complete()` mengecek semua invoice open (`NOT IN [PAID, CANCELLED]`) di dalam `$transaction()` sebelum melepas kamar.
4. `StaysService.processDeposit()` memakai guard open invoice yang sama.
5. `StaysQueryService` menghitung open invoice dengan definisi `NOT IN [PAID, CANCELLED]`.

Yang sudah dirollback (V5.9):

- `backend/src/apps/` (marketing-api, staff-api, finance-api shell).
- `backend/src/common/bootstrap/kost48-bootstrap.ts` (belum dicek — jika masih ada, abaikan).
- `backend/src/modules/health/`.
- Import `HealthModule` dari `app.module.ts`.
- `backend/src/main.ts` sudah kembali ke bootstrap core `NestFactory.create(AppModule)`.
- Skrip multi-app di `package.json` dihapus.

Yang tetap tidak disentuh:

- `nest-cli.json`, `tsconfig.json`, `tsconfig.build.json`.
- `schema.prisma` dan SQL migration.
- `PaymentSubmissionsService.approveSubmission()`.
- `TenantBookingsService.approveBooking()`.
- Semua module lifecycle, booking, renew, checkout, meter, room.
- Frontend split.

Next steps:

1. Jalankan backend build.
2. Jalankan smoke/UAT untuk V5.8-A guards.
3. Baru lanjut ke V5.8-B marketing-api shell PLAN/ACT setelah hasil lokal OK.

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

---

## 9. V5.9-A Current Patch State — Multi-App Read-Only Shell

V5.9-A introduces a safe multi-app shell foundation while keeping the existing core monolith intact.

```text
core-api: existing backend/src/main.ts, port 3000
marketing-api: backend/src/apps/marketing-api, port 3001
staff-api: backend/src/apps/staff-api, port 3002
finance-api: backend/src/apps/finance-api, port 3003
```

Important implementation choice:

```text
New app shells live under backend/src/apps/* so TypeScript build still preserves dist/main.js for the existing core start:prod path.
```

V5.9-A does not mean full extraction is complete. It is a source-level shell foundation and read-only vertical split candidate.

Still core-only:

- payment approval/reject/expiry command,
- booking approval,
- renew approval/execution,
- checkout final,
- room occupancy/status writes,
- meter promotion,
- deposit settlement.
