# KOST48 V3/V4 — Execution Plan
**Versi:** 2026-05-18 multi-app shared-db architecture planning  
**Fungsi:** Satu master plan aktif. Bagian terbaru ini mengalahkan rencana lama bila ada konflik.

---

## 0AA. Latest Execution Override — 2026-05-18 Architecture Migration Planning

### Status kerja arsitektur

```text
Architecture direction: Multi-App Shared-DB Architecture
Migration style: greenfield shell + brownfield logic extraction
Status: PLAN/AUDIT only
No rewrite total
No separate DB
No distributed transaction
No service-to-service HTTP in Phase 0/1
```

### Keputusan eksekusi

1. Jangan tulis ulang backend/frontend dari nol.
2. Buat app shell baru nanti, tetapi logic lama dipertahankan dan diekstrak bertahap.
3. Jangan mulai dari finance/payment approval, checkout final, atau renew execution.
4. Mulai dari audit workspace + dependency map.
5. Early win extraction: `marketing-api` lalu `staff-api`.
6. `owner-api` ditunda.

### Phase 0 — Architecture Audit wajib sebelum ACT

| Urutan | Task | Mode | Catatan |
|---:|---|---|---|
| 0 | Upload/check ZIP backend + frontend terbaru | PLAN | Jangan percaya docs saja; bandingkan code vs docs |
| 1 | Audit Nest workspace readiness | PLAN | Cek `package.json`, `nest-cli.json`, `tsconfig*`, `main.ts`, `app.module.ts` |
| 2 | Audit module dependencies | PLAN | Imports + service injections + Prisma read/write |
| 3 | Audit high-risk services | PLAN | CheckoutRequests, RenewRequests, PaymentSubmissions.approve |
| 4 | Audit frontend route split | PLAN | marketing/tenant/staff/backoffice/owner surfaces |
| 5 | Produce Phase 0 ACT plan | PLAN | Baru setelah ini boleh generate/move files |

### Safe extraction order

```text
Phase 0: workspace/libs audit
Phase 1: marketing-api
Phase 2: staff-api
Phase 3: tenant-api read/request flows
Phase 4: finance-api partial/read-review only
Phase 5: frontend split/shared packages
Phase 6: owner/reporting later
```

### Jangan lakukan sekarang

- Jangan `nest generate app` sebelum audit workspace.
- Jangan move file sebelum dependency map jelas.
- Jangan rewrite service dari nol.
- Jangan pindahkan payment approval ke finance-api sebelum audit mutasi Stay/Room/Meter/Deposit.
- Jangan pindahkan checkout/renew execution keluar dari core-api.
- Jangan buat separate DB.

---

## 0A. Latest Execution Override — 2026-05-11

### Status kerja aktif

```text
Tenant identity patch: CODE COMPLETE / BUILD PASS / API UAT PASS 157 PASS / 0 FAIL
Commit/push: harus dikonfirmasi dari git log sebelum batch baru
Batch B1 — Manual Check-in Business Automation: NEXT P0, belum dikerjakan
M2 Manual Check-in UX Reliability: PASS, tapi hanya UX fix
Urgency chip 4.3-D: status kode perlu dikonfirmasi, jangan klaim PASS tanpa browser UAT
```

### Urutan eksekusi paling aman

| Urutan | Task | Mode | Catatan |
|---:|---|---|---|
| 0 | Cek working tree | PowerShell | `git status --short; git log --oneline -8` |
| 1 | Commit + push identity patch | ACT/manual | Jika belum committed. Jangan mulai B1 saat working tree masih memuat patch identity. |
| 2 | Verify working tree clean | PowerShell | Pastikan tidak ada code modified selain docs yang memang sedang dikerjakan. |
| 3 | Cline PLAN audit Batch B1 | PLAN | Audit `StaysService.create()`, invoice creation, portal method, response ke `CheckInWizard`. |
| 4 | Review PLAN B1 | PLAN review | Pastikan scope sempit dan tidak membuka deposit/damage/renewal. |
| 5 | Owner decisions B1 dikunci | Owner confirmation | 9 keputusan B1 di section 6. |
| 6 | Cline ACT Batch B1 | ACT | Patch bounded: invoice ISSUED + portal auto-create idempotent + frontend result modal. |
| 7 | Build + UAT B1 | ACT/manual | Backend build, frontend build, UAT happy path + edge cases. |
| 8 | Batch B2 PLAN | PLAN | Invoice lifecycle + final utility audit. Jangan ACT sebelum audit. |
| 9 | Urgency chip 4.3-D status audit | PLAN/UAT | Jika kode ada, browser UAT; jika tidak ada, downgrade ke implementation PLAN. |

### Jangan lakukan sekarang

- Jangan langsung ACT Batch B1 tanpa PLAN audit.
- Jangan CSS modularization ulang.
- Jangan Phase 4.4/4.5.
- Jangan production DB reset.
- Jangan auto-checkout setelah approve rencana keluar.
- Jangan buka deposit/damage/schema change di Batch B1.
- Jangan klaim urgency chip PASS tanpa browser UAT.
- Jangan buat file `.md` baru.

---

## 1. Prinsip Eksekusi

1. Satu flow utama per batch.
2. PLAN dan ACT dipisah.
3. ACT harus punya Definition of Done dan targeted UAT.
4. Build backend/frontend harus PASS sesuai area yang disentuh.
5. Jangan ulang UAT yang sudah PASS kecuali patch menyentuh flow terkait.
6. Jangan buat file `.md` baru untuk setiap patch kecil; update salah satu file aktif saja.
7. File helper UAT/debug harus dihapus sebelum selesai.
8. Semua command/test default memakai PowerShell.
9. Kalau terminal Cline bukan PowerShell, Cline harus STOP. Jangan adapt ke cmd/Git Bash/WSL.
10. API test wajib `Invoke-RestMethod`, bukan curl.

---

## 2. Status Fase Saat Ini

| Fase | Nama | Status |
|---|---|---|
| 0 | Fondasi & stabilitas awal | ✅ Selesai |
| 1 | Stabilization + cleanup | ✅ Selesai |
| 2 | UX & module integration | ✅ Selesai |
| 3 | Ticket tenant-only redesign | ✅ Selesai |
| 3.5 | Backend stabilization/API gap closure | ✅ Selesai |
| 4.0 | Booking mandiri + RESERVED | ✅ PASS |
| 4.1 | Admin approval booking | ✅ PASS |
| 4.2 | Payment submission + activation | ✅ CORE PASS |
| 4.3-A | Reminder preview | ✅ PASS |
| 4.3-B | Reminder mock send | ✅ PASS |
| 4.3-C | Notification Center MVP | ✅ COMPLETE |
| 4.3-G1 | Announcement access guard | ✅ PASS |
| 4.3-G2 | Pending meter snapshot + promotion | ✅ Fresh UAT PASS |
| M2 | Manual check-in UX reliability | ✅ PASS — `71ab386` |
| M3 | UI polish | ✅ PASS — `960f922` |
| M4 | Password visibility toggle | ✅ PASS |
| Staff inventory read-only | Frontend + backend guard | ✅ PASS — `70fcf4e` |
| Tenant identity + duplicate protection | Build + API UAT | ✅ PASS — commit/push perlu konfirmasi |
| Full checkout UAT | Rencana keluar → checkout final | ✅ PASS |
| Production handoff | Connection + runtime hardening | ✅ PASS |
| **Batch B1** | **Manual Check-in Business Automation** | 🔴 **NEXT P0 — belum dikerjakan** |
| Urgency chip 4.3-D | Kode status belum dikonfirmasi | 🟡 Perlu audit/UAT |
| Batch B2 | Invoice lifecycle + final utility audit | ⬜ Belum dibuka |
| Batch B4 | Deposit settlement model | ⬜ Belum dibuka |
| Batch B5 | Damage / penalty / room condition | ⬜ Belum dibuka |
| Phase 4.4 | Marketing display + flexible registration | ⬜ Belum dibuka |
| Phase 4.5 | Tenant self-service lanjutan | ⬜ Belum dibuka |

---

## 3. P0 Critical Gaps

### P0-1 — Manual check-in invoice masih DRAFT

**Current behavior:** `StaysService.create()` membuat invoice dengan status `DRAFT` pada direct/manual check-in.

**Business impact:**

```text
Tenant sudah menghuni tapi invoice belum resmi.
Tenant bisa tidak melihat tagihan dari portal.
Admin bisa lupa issue invoice.
Payment flow tertunda.
```

**Target Batch B1:** invoice awal langsung `ISSUED` saat manual check-in selesai.

---

### P0-2 — Portal user tidak auto-created saat manual check-in

**Current behavior:** `StaysService.create()` tidak otomatis membuat portal user. Admin harus manual dari menu tenant.

**Business impact:**

```text
Tenant baru via CheckInWizard tidak bisa login portal.
Tenant tidak bisa lihat current stay/invoice.
Tenant tidak bisa submit payment.
Tenant tidak bisa ajukan Pengajuan Keluar Kamar.
Admin harus kerja dua kali.
```

**Target Batch B1:** auto-create portal user jika tenant punya email, dengan kontrak idempotent.

---

### P0-3 — Temporary portal credential delivery belum ada

**Current behavior:** karena portal belum auto-created, belum ada mekanisme menampilkan temporary password hasil check-in.

**Target Batch B1:** response check-in mengembalikan temporary password sekali jika user baru dibuat. Frontend menampilkan modal hasil check-in dengan copy button dan warning.

---

### P0-4 — Portal auto-create perlu idempotency

**Target Batch B1:** 4 kondisi idempotent:

```text
MISSING_EMAIL: email kosong, check-in tetap sukses, portal belum aktif.
CREATED: email ada dan belum ada user, create portal user, return temp password sekali.
ALREADY_ACTIVE: user sudah ada untuk tenant yang sama, jangan error.
CONFLICT: email dipakai user/tenant lain, block dengan pesan jelas.
```

---

### P0-5 — Final meter → utility charge perlu audit

**Current uncertainty:** belum dipastikan apakah `StaysService.complete()` hanya mencatat meter akhir atau juga membuat final utility invoice line.

**Business risk:** jika hanya dicatat tanpa charge, tenant bisa checkout tanpa membayar utilitas terakhir.

**Target:** audit khusus sebelum Batch B2. Jangan assume sudah benar.

---

### P0-6 — Renewal invoice lifecycle perlu audit

**Current state:** invoice renewal saat ini diperlakukan sebagai `DRAFT` menurut kontrak lama.

**Target Batch B2:** audit apakah renewal approval harus langsung `ISSUED`, dan apakah form approval renewal sudah punya nominal confirmation.

---

## 4. P1 Important Gaps

```text
P1-1: Deposit settlement belum eksplisit di checkout final
P1-2: Deposit audit trail belum ada (DepositTransaction / DepositLog)
P1-3: Damage/penalty model belum ada
P1-4: RoomFacility.condition belum terhubung ke checkout/damage flow
P1-5: Room MAINTENANCE belum terhubung ke damage berat
P1-6: Tenant tanpa email perlu portal unavailable state yang jelas di UI
P1-7: Notification/urgency perlu diperluas setelah invoice/payment/deposit events
```

---

## 5. P2 Later Improvements

```text
P2: KTP upload
P2: damage photo upload
P2: email/cron reminder
P2: public marketing room detail polish (Phase 4.4)
P2: analytics/reporting
P2: DB unique constraint setelah data cleanup
P2: payment gateway
```

---

## 6. Owner Decisions Batch B1

Semua keputusan ini harus dikonfirmasi sebelum Cline ACT dimulai.

| # | Keputusan | Rekomendasi |
|---:|---|---|
| 1 | Invoice manual check-in langsung ISSUED | Ya |
| 2 | Auto-create portal user jika tenant punya email | Ya |
| 3 | Tenant tanpa email tetap bisa check-in, portal = belum aktif | Ya |
| 4 | Portal auto-create harus idempotent | Ya |
| 5 | Jika portal user sudah ada untuk tenant yang sama, jangan error | Ya |
| 6 | Jika email dipakai tenant/user lain, block conflict | Ya |
| 7 | Temp password ditampilkan sekali di modal hasil check-in | Ya |
| 8 | Modal memiliki tombol Salin Password + warning teks merah | Ya |
| 9 | Jika admin lupa copy, reset password manual dari Tenant Detail | Ya |

**Keputusan yang belum perlu dikunci sekarang (untuk B2+):**

```text
- Renewal invoice: auto-ISSUED atau DRAFT dengan window koreksi?
- Checkout + DRAFT invoice: hard block atau warning + opsi void/issue?
- Deposit model: DepositTransaction tabel atau simpler fields?
- Damage/penalty: sekarang atau later?
- Final meter utility charge: auto invoice line atau manual?
```

---

## 7. Batch Roadmap Detail

### Batch B0 — Identity patch commit/push

**Goal:** pastikan patch identity yang sudah API PASS masuk git sebelum batch bisnis baru.

**Checklist:**

```text
- git status --short
- git log --oneline -5
- jika identity files masih modified: commit + push
```

---

### Batch B1 — Manual Check-in Business Automation

**Priority:** P0

**Scope:**

```text
Backend:
- audit StaysService.create() — invoice issue logic
- patch StaysService.create() — invoice langsung ISSUED
- patch StaysService.create() — auto-create portal user (idempotent)
- response mengembalikan portal result + temp password jika baru dibuat

Frontend:
- CheckInWizard success modal menampilkan:
  - stay created
  - invoice issued
  - portal status (CREATED / ALREADY_ACTIVE / MISSING_EMAIL)
  - temp password sekali + copy button jika CREATED
```

**Likely files:**

```text
backend/src/modules/stays/stays.service.ts
backend/src/modules/stays/stays.controller.ts (jika response DTO berubah)
backend/src/modules/tenants/tenants.service.ts
backend/src/modules/tenants/dto/create-portal-access.dto.ts (jika perlu)
frontend/src/pages/stays/CheckInWizard.tsx
frontend/src/types/index.ts
frontend/src/api/stays.ts
```

**Forbidden:**

```text
deposit, damage, renewal, final utility charge, schema change,
public booking rewrite, KTP upload, urgency chip, docs update kecuali diminta
```

**Pre-ACT:** Cline PLAN audit dulu. Audit `StaysService.create()` dan portal method existing sebelum patch.

**UAT B1 — Happy path:**

```text
1. Admin manual check-in tenant baru dengan email
   → stay ACTIVE, room OCCUPIED, invoice ISSUED
   → modal tampilkan portalEmail + temp password
   → tombol Salin Password berfungsi
   → tenant login portal dengan temp password berhasil
   → tenant melihat current stay
   → tenant melihat invoice ISSUED
```

**UAT B1 — Edge cases:**

```text
2. Manual check-in tenant tanpa email
   → check-in berhasil
   → modal tampilkan "Portal belum aktif — email tidak tersedia"
   → tidak ada error

3. Manual check-in tenant existing yang sudah punya portal user
   → check-in berhasil
   → modal tampilkan "Portal sudah aktif"
   → tidak ada error, tidak ada duplikat user

4. Manual check-in dengan email yang sudah dipakai tenant/user lain
   → check-in gagal dengan pesan konflik yang jelas
   → room tidak berubah status
```

---

### Batch B2 — Invoice Lifecycle + Final Utility Audit

**Priority:** P0/P1

**Pre-ACT audit wajib:**

```text
- Audit StaysService.complete(): apakah meter akhir menghasilkan invoice line?
- Audit RenewalsService.approve(): apakah invoice renewal DRAFT atau ISSUED?
- Audit form approval renewal: apakah sudah punya field nominal?
- Audit invoice period coverage setelah renewal
```

**Scope setelah audit:**

```text
- patch final utility charge jika belum ada invoice line dari meter akhir
- keputusan renewal invoice DRAFT vs ISSUED
- patch form approval renewal jika perlu nominal input
- checkout final handling untuk DRAFT invoice (policy perlu dikunci dulu)
- invoice period coverage audit
```

Tidak bisa ACT sebelum audit dan owner decisions dikunci.

---

### Batch B3 — Urgency Chip Final Verification

**Scope:**

```text
Konfirmasi status kode urgency chip 4.3-D:
- jika kode sudah ada: browser UAT final
- jika kode belum ada: downgrade ke implementation PLAN
```

**UAT target jika kode sudah ada:**

```text
- Tenant dengan invoice overdue melihat chip
- Tenant dengan booking deadline melihat chip
- Chip hilang setelah invoice paid/booking resolved
- Admin/OWNER/STAFF tidak melihat chip ini
```

---

### Batch B4 — Deposit Settlement Model

**Priority:** P1

**Scope:**

```text
DepositTransaction / DepositLog model (schema change)
Deposit settlement di Checkout Final form:
  - refund penuh
  - refund sebagian
  - forfeit
  - pending transfer
  - reason/admin notes
```

Butuh schema plan dulu. Jangan mix dengan B1.

---

### Batch B5 — Damage / Penalty / Inventory Condition

**Priority:** P1

**Scope:**

```text
Damage note + penalty amount
Optional linked RoomFacility
RoomFacility.condition update
Room MAINTENANCE option
```

Hanya setelah deposit design jelas (Batch B4).

---

### Batch B6 — Public / Marketing Polish (Phase 4.4)

**Priority:** P2

**Scope:**

```text
Public room detail endpoint dan page
Room gallery/images
Flexible registration (email atau phone)
Guest onboarding yang lebih halus
SEO-friendly URL
```

Jangan treat sebagai P0. Baseline booking sudah PASS.

---

## 8. Cline PLAN Prompt — Batch B1

```text
MODE: PLAN ONLY

Project root:
C:\Users\lieml\Desktop\Big Personal Web App\kost48surabaya-v3\kost48_full_frontend_backend_upgrade_bundle\final_bundle

PowerShell only. If terminal is not PowerShell, STOP.

Task: Batch B1 — Manual Check-in Business Automation

Context:
- M2 Manual Check-in UX Reliability sudah PASS (commit 71ab386).
- M2 yang PASS adalah UX fix: modal close, tombol Kembali, tenant select refresh.
- M2 TIDAK mencakup invoice auto-ISSUED atau portal auto-create.
- StaysService.create() saat ini belum auto-ISSUE invoice dan belum auto-create portal. Audit dulu.

Allowed files to read:
- backend/src/modules/stays/stays.service.ts
- backend/src/modules/stays/stays.controller.ts
- backend/src/modules/stays/dto/**
- backend/src/modules/tenants/tenants.service.ts
- backend/src/modules/tenants/dto/create-portal-access.dto.ts
- backend/src/modules/users/**
- frontend/src/pages/stays/CheckInWizard.tsx
- frontend/src/api/stays.ts
- frontend/src/types/index.ts

Forbidden:
- code changes
- docs changes
- DB reset
- DB mutation
- schema change
- deposit/damage/renewal/final utility/urgency chip
- production access

Audit tasks:
1. Read StaysService.create() — periksa invoice creation saat ini DRAFT atau ISSUED.
2. Read TenantsService — apakah ada method untuk create portal user, reset password, dan duplicate email handling.
3. Read CheckInWizard.tsx — bagaimana response check-in ditampilkan saat ini.
4. Read stays API/types — apakah response DTO sudah punya portal result field.
5. Propose exact minimal ACT files, response shape, and UAT checklist.

Stop condition:
No code changes. Stop after PLAN report.

Return:
- exact current behavior
- file list and functions to patch
- idempotent portal auto-create contract
- response DTO plan
- UAT checklist
- forbidden scope
```

---

## 8A. Cline PLAN Prompt — Phase 0 Architecture Audit

```text
MODE: PLAN ONLY

Project: KOST48 Surabaya V3/V4 — Multi-App Shared-DB Architecture Phase 0 Audit
Project root:
C:\Users\lieml\Desktop\Big Personal Web App\kost48surabaya-v3\kost48_full_frontend_backend_upgrade_bundle\final_bundle

PowerShell only. If terminal is not PowerShell, STOP.

Goal:
Audit whether the existing NestJS backend and React frontend can be migrated safely into Multi-App Shared-DB Architecture using greenfield shell apps + brownfield module extraction.

Architecture decision:
- Do not rewrite from scratch.
- Shared PostgreSQL remains.
- Shared PrismaService remains.
- Target apps: core-api, tenant-api, staff-api, finance-api, marketing-api; owner-api later.
- Phase 0 is audit only. No code changes.

Allowed files/folders to read:
- backend/package.json
- backend/nest-cli.json
- backend/tsconfig*.json
- backend/src/main.ts
- backend/src/app.module.ts
- backend/src/prisma/**
- backend/src/common/**
- backend/src/auth/**
- backend/src/audit-log/**
- backend/src/modules/**/*
- backend/prisma/schema.prisma
- frontend/src/**/*
- frontend/package.json

Forbidden:
- No code changes
- No file moves
- No file creation
- No docs changes
- No DB reset/mutation/migration
- No npm install
- No service rewrite
- No HTTP service-to-service implementation

Audit tasks:
1. Check Nest workspace readiness.
2. Map shared libs: prisma, common, auth, audit-log, notification helper, contracts/types.
3. Map all direct module imports and service injections.
4. Specifically confirm CheckoutRequests, RenewRequests, PaymentSubmissions approval dependencies/mutations.
5. Map every backend module to core-api, tenant-api, staff-api, finance-api, marketing-api, shared lib, or keep-in-core.
6. Map frontend routes/pages into marketing, tenant, staff, backoffice/finance, owner surfaces.
7. Propose safest extraction order and high-risk flows.
8. Produce exact Phase 0 ACT plan and build commands.

Stop condition:
Stop after PLAN report. Do not edit files.

Final report:
1. Workspace readiness: READY / NOT READY / NEEDS MANUAL MIGRATION
2. Current cross-module dependency map
3. CheckoutRequest ownership finding
4. RenewRequest ownership finding
5. PaymentSubmission approval mutation finding
6. Proposed service/module ownership table
7. Frontend split map
8. Safe extraction order
9. High-risk flows
10. Exact Phase 0 ACT plan
11. Commands, PowerShell only
```

---

## 9. Suggested ACT Template

```text
MODE: ACT
Project: KOST48 Surabaya V3/V4
Task: [one exact task]

Constraints:
- One vertical slice only.
- Do not modify docs unless explicitly requested.
- Do not create unnecessary markdown files.
- Use Windows PowerShell commands in final verification.
- Remove temporary helper files before finishing.
- Build must pass.

Allowed files:
- [list exact files after PLAN]

Definition of Done:
- [clear pass criteria]

Final report:
- Files changed
- Build result
- UAT/verification result
- Git status note
```

---

## 10. Completed UAT Gates — Do Not Repeat Unless Touched

### Gate 1 / UAT 4.0 PASS
- Public `/rooms` works for guest.
- Admin `/rooms` remains backoffice.
- Tenant booking succeeds.
- `/portal/bookings` displays `checkInDate` and `expiresAt` correctly.
- Reserved booking separated from operational stay.

### Gate 2 / UAT 4.1 PASS
- Admin approve booking succeeds.
- Approval modal closes after success.
- Initial invoice created/synced.
- Room remains `RESERVED` before payment.
- Tenant sees `Menunggu Pembayaran`.

### UAT 4.2 Core PASS
- Happy path payment submission.
- Reject path.
- Wrong amount path.
- Double approve prevention.
- Expiry core.
- Combined rent + deposit exact amount.

### Phase 4.3-G2 Fresh UAT PASS
- Approve booking creates pending snapshot only.
- Payment approval promotes snapshot to 2 MeterReadings.
- Expire reserved clears snapshot.
- Expire occupied rejected 409.

### M2 UX Reliability PASS
- Modal close correct.
- Tombol X tidak meninggalkan backdrop.
- Tombol Kembali ke `/stays`.
- Tenant select refresh setelah inline creation.

### Staff Inventory Read-only PASS
- STAFF view-only.
- OWNER/ADMIN mutate.
- Backend guard enforced, bukan hanya hide button.

### Full Checkout UAT PASS
- Tenant request → admin approve rencana → tenant tetap menghuni → admin Checkout Final → stay completed, room available.

---

## 11. Later Roadmap

### Phase 4.4 — Marketing Display & Flexible Registration

- Public room detail endpoint dan page.
- Room gallery/images.
- Register via email atau phone.
- Phone normalization dan uniqueness.
- Tenant account soft delete/deactivate.

Jangan mulai sebelum Batch B1-B2 stabil.

### Phase 4.5 — Tenant Self-Service

- Tenant renew request.
- Admin approve/reject renew request.
- Forgot password.
- Reset password token/OTP.
- Account enumeration-safe response.

### Deferred External Automation

- Real WhatsApp provider.
- Scheduler/cron reminder.
- PWA/browser push.
- SSE/websocket live notification stream.
- Stage-aware announcement audience advanced model.
- Meter metadata enrichment.

---

## 12. Documentation Hygiene Policy

Active docs hanya:

- `00_GROUND_STATE.md`
- `01_CONTRACTS.md`
- `02_PLAN.md`
- `CHECKLIST.md`
- `03_DECISIONS_LOG.md`
- `04_JOURNAL.md`
- `CHANGELOG.md`

Jangan recreate:

- dated current status docs,
- package readme docs,
- patch summary docs,
- separate frontend/backend changelog,
- pasted markdown files.

