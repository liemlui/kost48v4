# KOST48 V5 — Master Execution Plan
**Versi:** 2026-06-13 — pasca Konsolidasi Docs V3. **Sumber historis:** `archieve/02_PLAN.md` (3,061 baris, V5.10.0). File ini adalah distilled plan yang mencakup **fase aktif dan rekomendasi verifikasi**. Detail per-domain ada di dossier `10`-`19`.

<!-- KOST48_DOCS_SYNC_20260613_PLAN_CONSOLIDATED -->

## 1. Current Phase — V5.7 Workspace & Shared Foundation Prep

### Status
- **Fase:** PLAN/AUDIT
- **Goal:** Audit apakah backend NestJS dan frontend React dapat dimigrasi ke Multi-App Shared-DB Architecture
- **Output:** Laporan readiness + rekomendasi extraction order
- **Tidak ada code changes tanpa explicit ACT V5.7 approval**

### V5.7 Audit Scope
- Backend: `package.json`, `nest-cli.json`, `tsconfig.json`, `main.ts`, `app.module.ts`, prisma, common, auth, audit-log, modules/*
- Frontend: `package.json`, api/*, types/*, auth/*, hooks/*, layouts/*, config/*, components/*, pages/*, App.tsx
- Docs: cross-reference root vs archieve (COMPLETED — 13 Juni 2026)

### V5.7 Target Apps
| App | Kepemilikan | Prioritas |
|-----|------------|-----------|
| **core-api** | Stay lifecycle, Room occupancy, Booking approval, Checkout final, Renew execution, Payment approval, Meter promotion | Phase 0 (existing) |
| **tenant-api** | Tenant booking/create, payment/create, checkout request/create, renew request/create, invoice/stay read | Later |
| **staff-api** | Tickets, room view, inventory read, maintenance | V5.9 |
| **finance-api** | Invoices read, payment review read, finance reports, expenses/deposit | Later |
| **marketing-api** | Public rooms, room detail, gallery | V5.8 |
| **owner-api** | Deferred | Later |

---

## 2. Completed Phases

### V5.1–V5.6 (Applied & Committed)
- V5.1: Shared boundary hardening
- V5.2: Checkout/invoice/tenant hardening
- V5.3: Marketing-api preparation
- V5.4: Staff-api preparation
- V5.5: Tenant-api preparation
- V5.6: Finance-api preparation

### Audit V3 (SELESAI)
- 97 temuan + 84 keputusan owner + 4 desain fitur
- Semua dibubarkan ke dossier domain `10`-`19`
- Detail forensik diarsip di `docs/archieve/_DEPRECATED_AUDIT_*`

---

## 3. Next Phases (Priority Order)

### 🔴 PRIORITAS 1 — V5.7 Workspace & Shared Foundation Prep
**Status:** PLAN/AUDIT (audit done, menunggu ACT approval)

**Jika approved untuk ACT:**
1. Verify workspace readiness (nest-cli.json, tsconfig paths, package.json scripts)
2. Map shared foundation candidates (prisma, common, auth, audit-log)
3. Map all backend modules (controllers, services, imports, Prisma models)
4. Confirm high-risk service boundaries
5. Map frontend route/surface split per target app
6. Recommend safe extraction order
7. Produce readiness guide or minimal patch

**Build gates:**
```powershell
# Backend build
Set-Location backend; npm run build

# Frontend build
Set-Location frontend; npm run build
```

**Verification gates:**
```powershell
# Public rooms smoke
Invoke-RestMethod -Method Get -Uri "http://localhost:3000/api/public/rooms"

# Admin login + payment review queue
$login = Invoke-RestMethod -Method Post -Uri "http://localhost:3000/api/auth/login" -ContentType "application/json" -Body '{"identifier":"admin@kost48.com","password":"admin123"}'; $token=$login.data.accessToken; Invoke-RestMethod -Method Get -Uri "http://localhost:3000/api/payment-submissions/review-queue" -Headers @{Authorization="Bearer $token"}

# Deposit reconciliation
Invoke-RestMethod -Method Get -Uri "http://localhost:3000/api/deposit-ledger/reconciliation-lite" -Headers @{Authorization="Bearer $token"}

# Accounting readiness
Invoke-RestMethod -Method Get -Uri "http://localhost:3000/api/accounting/readiness" -Headers @{Authorization="Bearer $token"}

# Staff mutation block expected 403
$staffLogin = Invoke-RestMethod -Method Post -Uri "http://localhost:3000/api/auth/login" -ContentType "application/json" -Body '{"identifier":"staff@kost48.com","password":"staff123"}'; $staffToken=$staffLogin.data.accessToken; try { Invoke-RestMethod -Method Post -Uri "http://localhost:3000/api/inventory-movements" -Headers @{Authorization="Bearer $staffToken"} -ContentType "application/json" -Body '{"roomId":1,"inventoryItemId":1,"quantity":1}' } catch { $_.Exception.Response.StatusCode.value__ }
```

---

### 🟠 PRIORITAS 2 — V5.8 Marketing-api Preparation
**Status:** PLAN (candidate after V5.7)

**Scope:**
- Public rooms read-only extraction
- Room detail public endpoint
- Gallery/public profile check
- Read-only first, no mutation

**Pre-extraction checks:**
- Confirm public endpoints are read-only
- Confirm no Stay/Room mutation in public module
- Confirm no dependency on admin-only services

---

### 🟠 PRIORITAS 3 — V5.9 Staff-api Preparation
**Status:** PLAN (candidate after V5.8)

**Scope:**
- Tickets module extraction
- Room view read-only
- Inventory read-only
- Maintenance/task future

**Pre-extraction checks:**
- Confirm staff cannot mutate inventory (403 gate)
- Confirm staff cannot mutate Stay lifecycle
- Confirm staff cannot mutate Room occupancy

---

### 🟡 DEFERRED — Tenant-api, Finance-api, Owner-api
- **Tenant-api:** Read/request surfaces only. Must not execute lifecycle finalization.
- **Finance-api:** Read/review partial. Payment approval stays in core-api.
- **Owner-api:** Deferred. Do not create early.

---

## 4. Verification Gates (All Phases)

### Pre-Phase Gate (setiap phase)
```powershell
# Git status
Set-Location "C:\Users\lieml\Desktop\Big Personal Web App\kost48surabaya-v3\kost48_full_frontend_backend_upgrade_bundle\final_bundle"; git status --short; git log --oneline -5
```

### Build Gate
```powershell
# Backend
Set-Location backend; npm run build

# Frontend
Set-Location frontend; npm run build
```

### Runtime Smoke Gate (backend must be running)
```powershell
# Public rooms
Invoke-RestMethod -Method Get -Uri "http://localhost:3000/api/public/rooms"

# Admin login
$login = Invoke-RestMethod -Method Post -Uri "http://localhost:3000/api/auth/login" -ContentType "application/json" -Body '{"identifier":"admin@kost48.com","password":"admin123"}'; $token=$login.data.accessToken

# Deposit reconciliation
Invoke-RestMethod -Method Get -Uri "http://localhost:3000/api/deposit-ledger/reconciliation-lite" -Headers @{Authorization="Bearer $token"}

# Accounting readiness
Invoke-RestMethod -Method Get -Uri "http://localhost:3000/api/accounting/readiness" -Headers @{Authorization="Bearer $token"}
```

### UAT Gate (manual browser, per phase)
- Owner: dashboard, reports, stays, rooms, finance
- Admin: payment review, booking approve, checkout, renew, tickets, inventory
- Staff: tickets, room view, inventory read, work queue
- Tenant: portal, my stay, invoices, booking, payment, checkout/renew requests
- Public: room catalog, room detail, booking form

---

## 5. HIGH-RISK FLOWS — PROHIBITED FROM EXTRACTION (PHASE 0)

| Flow | Must Stay In | Reason |
|------|-------------|--------|
| `PaymentSubmissionsService.approveSubmission()` | core-api | Mutasi Stay/Room/Invoice/Deposit |
| `StaysService.create()` | core-api | Stay lifecycle creation |
| `StaysService.complete()` | core-api | Checkout final |
| `StaysService.renewStay()` | core-api | Renew execution |
| `TenantBookingsService.approveBooking()` | core-api | Booking approval |
| `StaysService.cancel()` | core-api | Stay cancellation |
| Deposit settlement | core-api | HELD → REFUNDED/FORFEIT |
| Room status writes | core-api | OCCUPIED/AVAILABLE/MAINTENANCE/RESERVED |
| Meter promotion | core-api | initialMetersPromotedAt |

---

## 6. Known Batch Dependencies (DEFERRED)

### B2 — Invoice Lifecycle + Final Utility Audit
- **Status:** DEFERRED (not V5.7 priority)
- **Trigger:** User explicitly asks
- **Audit questions:**
  - Does `StaysService.complete()` only record final meter, or also create final utility invoice line?
  - Does renewal approval create DRAFT or ISSUED invoice?
  - Does renewal approval form have nominal confirmation field?
  - What should happen if checkout final has DRAFT invoice?
  - Does invoice period coverage remain correct after renewal?

### B3 — Urgency Chip Final Verification
- **Status:** DEFERRED
- **Audit target:** Check if urgency chip code exists, perform browser UAT
- **UAT scope:** Tenant overdue invoice, booking deadline, due soon invoice, contract ending

### B4 — Deposit Settlement Model
- **Status:** DEFERRED (future batch)
- **Scope:** DepositTransaction/DepositLog, schema change likely required

### B5 — Damage/Penalty/Inventory Condition
- **Status:** DEFERRED (future batch)

### B6 — Public/Marketing Polish
- **Status:** DEFERRED (later P2, unless part of marketing-api extraction)

---

## 7. Build & Deploy Reference

### Local Development
```powershell
# Backend
Set-Location backend; npm run start:dev

# Frontend
Set-Location frontend; npm run dev
```

### Production Build
```powershell
# Backend
Set-Location backend; npm run build

# Frontend
Set-Location frontend; npm run build
```

### Database
- UAT: `localhost:5433`, `kost48_v3_pro`, user `postgres`
- Production: `localhost:5432`, `kost48_v3`
- **DEPLOY = FRESH** (drop DB → seed COA → opening balance)

---

## 8. Refleksi & Aturan Eksekusi

### Yang Sudah Selesai (COMPLETE)
- ✅ Audit V1 (53 temuan, 24 FIX)
- ✅ Audit V3 (97 temuan, 84 keputusan) — dibubarkan ke dossier domain
- ✅ UAT runtime PASS (siklus DP→pelunasan, overstay, renew, deposit mismatch=0, trial balance seimbang)
- ✅ PWA & deploy runbook tersedia
- ✅ Docs konsolidasi V3 (root docs) + cross-reference archieve COMPLETE (2026-06-13)

### Yang Harus Dihindari
- ❌ Jangan mulai B2/B3/B4/B5/B6 tanpa explicit user request
- ❌ Jangan extract high-risk flows dari core-api sebelum command boundary audited
- ❌ Jangan buat owner-api terlalu awal
- ❌ Jangan claim PASS tanpa verifikasi runtime
- ❌ Jangan commit generated Prisma
- ❌ Jangan reset DB tanpa explicit user request

---

**Sumber historis lengkap:** `docs/archieve/02_PLAN.md` (3,061 baris, V5.10.0)