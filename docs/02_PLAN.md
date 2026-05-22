# KOST48 V5 — Execution Plan
**Versi:** 2026-05-22 V5.16-G Staff Repair Stable + Release Readiness**

## 0. Current Execution Override

```text
Current verified phase: V5.16-G Staff Repair Flow Stable
Carry-forward phase: V5.15 Intelligent Command Center + Finance Foundation
Default mode: PLAN ONLY unless user explicitly says ACT / YOLO / patch
Architecture: Stable Modular Monolith
Multi-app: roadmap only
```

## 1. Current Verified State

V5.16 Staff Repair Flow is the latest active implementation track.

Verified manual UAT:
- Staff report barang kamar creates ticket.
- Fresh ticket has:
  - `assignedToId=3`
  - `roomId=1`
  - `linkedRoomItemId=1`
- Staff list now shows active assigned tickets after V5.16-G.
- Ticket detail visibility for staff works.
- Ticket lifecycle works:
  - start,
  - mark done,
  - close,
  - cancel.
- Admin can set final item status.
- Inventory report linking works for fresh ticket.

## 2. Immediate Next Priority

Before any new feature:

```text
Build + Smoke + Git Commit/Push
```

Run:

```powershell
Set-Location "C:\Users\lieml\Desktop\Big Personal Web App\kost48surabaya-v3\kost48_full_frontend_backend_upgrade_bundle\final_bundle"; git status --short; git log --oneline -5
```

Then:

```powershell
Set-Location "C:\Users\lieml\Desktop\Big Personal Web App\kost48surabaya-v3\kost48_full_frontend_backend_upgrade_bundle\final_bundle\backend"; npx prisma generate; npm run build:local
```

```powershell
Set-Location "C:\Users\lieml\Desktop\Big Personal Web App\kost48surabaya-v3\kost48_full_frontend_backend_upgrade_bundle\final_bundle\frontend"; npm run build
```

## 3. Minimal Manual Smoke After Build

Do not create UAT script file unless user asks. Run commands directly in chat/terminal.

Login once:

```powershell
$adminLogin = Invoke-RestMethod -Method Post -Uri "http://localhost:3000/api/auth/login" -ContentType "application/json" -Body '{"identifier":"admin@kost48.com","password":"admin123"}'; $adminToken=$adminLogin.data.accessToken; $staffLogin = Invoke-RestMethod -Method Post -Uri "http://localhost:3000/api/auth/login" -ContentType "application/json" -Body '{"identifier":"staff@kost48.com","password":"staff123"}'; $staffToken=$staffLogin.data.accessToken
```

Create staff report:

```powershell
Invoke-RestMethod -Method Patch -Uri "http://localhost:3000/api/room-items/1/staff-status" -Headers @{Authorization="Bearer $staffToken"} -ContentType "application/json" -Body '{"status":"MAINTENANCE","note":"Smoke V5.16-G: staff list should show assigned active ticket.","requestsReplacement":false}'
```

Check staff active list:

```powershell
$res = Invoke-RestMethod -Method Get -Uri "http://localhost:3000/api/tickets?limit=20" -Headers @{Authorization="Bearer $staffToken"}; "COUNT=$($res.data.items.Count)"; $res.data.items | Select-Object id,ticketNumber,title,status,assignedToId,roomId,linkedRoomItemId | Format-Table
```

Expected:
- new `OPEN` ticket appears,
- `assignedToId=3`,
- `linkedRoomItemId=1`.

Cleanup:

```powershell
$tickets = Invoke-RestMethod -Method Get -Uri "http://localhost:3000/api/tickets?limit=20" -Headers @{Authorization="Bearer $adminToken"}; $latest = $tickets.data.items | Where-Object { $_.title -like "*Lampu*" -and $_.status -eq "OPEN" } | Sort-Object id -Descending | Select-Object -First 1; Invoke-RestMethod -Method Post -Uri "http://localhost:3000/api/tickets/$($latest.id)/close" -Headers @{Authorization="Bearer $adminToken"} -ContentType "application/json" -Body '{"action":"CANCEL"}'
```

## 4. V5.16 Final Polish Backlog

Only after build/smoke/push:

### 4.1 Staff active queue UI final pass
- Show `OPEN`, `IN_PROGRESS`, `DONE` clearly.
- Hide CLOSED/CANCELLED from active staff list unless on report/recap page.
- Keep wording staff-friendly.

### 4.2 Admin review queue final pass
- “Laporan Baru”
- “Permintaan Barang”
- “Selesai Perlu Cek”
- “Keputusan Barang”

### 4.3 Cleanup historical dev data
Optional only:
- Cancel old UAT OPEN tickets if not needed.
- Do not DB reset unless user explicitly requests.

## 5. Carry-Forward V5.15 Plan

After staff flow is stable and pushed, continue V5.15:

1. Dashboard dedup + sidebar simplification.
2. Tier 0 rule intelligence hooks:
   - `useBusinessHealthScore`
   - `useTenantRiskProfile`
   - `useCashflowForecast`
   - `useOperationalStressIndex`
   - `useMeterAnomalyDetector`
3. Reports drill-down.
4. Smart chart system.
5. Finance readiness.
6. On-demand AI only after Tier 0.

## 6. Definition of Done

No further patch can be called PASS unless:
1. Source files inspected.
2. Backend build PASS if backend touched.
3. Frontend build PASS if frontend touched.
4. Manual smoke / UAT command actually run.
5. No unrelated file changes.
6. No file-based UAT scripts created unless user explicitly requests.
7. No DB reset.
8. No production mutation.
9. ZIP final generated if requested.
10. Git commit/push done if release task requested.
