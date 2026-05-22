# KOST48 V5 — Active Checklist
**Versi:** 2026-05-22 V5.16-G Staff Repair + Release Readiness checklist**

## A. Start Hygiene

- [ ] Run:
  ```powershell
  Set-Location "C:\Users\lieml\Desktop\Big Personal Web App\kost48surabaya-v3\kost48_full_frontend_backend_upgrade_bundle\final_bundle"; git status --short; git log --oneline -5
  ```
- [ ] Confirm working tree state.
- [ ] Confirm branch.
- [ ] PowerShell only.
- [ ] API tests use `Invoke-RestMethod`.
- [ ] No DB reset unless user explicitly asks.
- [ ] No new `.md` docs unless user asks.
- [ ] No multi-app/workspace migration.
- [ ] No new dependency without PLAN/approval.
- [ ] Do not claim PASS without build + verification.
- [ ] No dark mode.
- [ ] No production mutation.
- [ ] No UAT script file unless user explicitly asks.

## B. V5.16 Staff Repair Verification

- [x] Staff report barang kamar uses “Laporkan Kondisi” mental model.
- [x] Staff does not decide final item status.
- [x] Admin/owner controls final item status.
- [x] InventoryMovement remains admin/owner.
- [x] `StaffFieldReport` exists.
- [x] Admin review queue exists.
- [x] Admin review supports APPROVE / REJECT / NEEDS_MORE_INFO.
- [x] Staff report room item fills fresh `linkedRoomItemId`.
- [x] Staff report inventory item fills fresh `linkedInventoryItemId`.
- [x] Ticket lifecycle manual UAT passed for ticket 6/7.
- [x] Fresh linking manual UAT passed for ticket 8/9.
- [x] Staff active list manual UAT passed after V5.16-G with ticket 12.
- [x] Ticket close body uses `action`, not `reason`.
- [x] UAT commands kept in chat, not files.

## C. Build / Release Gate Before Git Push

Backend:

- [ ] Run:
  ```powershell
  Set-Location "C:\Users\lieml\Desktop\Big Personal Web App\kost48surabaya-v3\kost48_full_frontend_backend_upgrade_bundle\final_bundle\backend"; npx prisma generate; npm run build:local
  ```
- [ ] Backend build PASS.

Frontend:

- [ ] Run:
  ```powershell
  Set-Location "C:\Users\lieml\Desktop\Big Personal Web App\kost48surabaya-v3\kost48_full_frontend_backend_upgrade_bundle\final_bundle\frontend"; npm run build
  ```
- [ ] Frontend build PASS.

Smoke:

- [ ] Public rooms:
  ```powershell
  Invoke-RestMethod -Method Get -Uri "http://localhost:3000/api/public/rooms"
  ```
- [ ] Login once:
  ```powershell
  $adminLogin = Invoke-RestMethod -Method Post -Uri "http://localhost:3000/api/auth/login" -ContentType "application/json" -Body '{"identifier":"admin@kost48.com","password":"admin123"}'; $adminToken=$adminLogin.data.accessToken; $staffLogin = Invoke-RestMethod -Method Post -Uri "http://localhost:3000/api/auth/login" -ContentType "application/json" -Body '{"identifier":"staff@kost48.com","password":"staff123"}'; $staffToken=$staffLogin.data.accessToken
  ```
- [ ] Staff report creates active ticket:
  ```powershell
  Invoke-RestMethod -Method Patch -Uri "http://localhost:3000/api/room-items/1/staff-status" -Headers @{Authorization="Bearer $staffToken"} -ContentType "application/json" -Body '{"status":"MAINTENANCE","note":"Final smoke: staff list should show assigned active ticket.","requestsReplacement":false}'
  ```
- [ ] Staff list shows ticket:
  ```powershell
  $res = Invoke-RestMethod -Method Get -Uri "http://localhost:3000/api/tickets?limit=20" -Headers @{Authorization="Bearer $staffToken"}; "COUNT=$($res.data.items.Count)"; $res.data.items | Select-Object id,ticketNumber,title,status,assignedToId,roomId,linkedRoomItemId | Format-Table
  ```
- [ ] Cleanup smoke ticket:
  ```powershell
  $tickets = Invoke-RestMethod -Method Get -Uri "http://localhost:3000/api/tickets?limit=20" -Headers @{Authorization="Bearer $adminToken"}; $latest = $tickets.data.items | Where-Object { $_.title -like "*Lampu*" -and $_.status -eq "OPEN" } | Sort-Object id -Descending | Select-Object -First 1; Invoke-RestMethod -Method Post -Uri "http://localhost:3000/api/tickets/$($latest.id)/close" -Headers @{Authorization="Bearer $adminToken"} -ContentType "application/json" -Body '{"action":"CANCEL"}'
  ```

## D. Git Push Checklist

- [ ] Run `git status --short`.
- [ ] Confirm no unwanted generated/heavy files.
- [ ] Confirm no `.env`, `node_modules`, `dist`, generated Prisma heavy artifacts committed unless intentionally tracked.
- [ ] Review diff:
  ```powershell
  git diff --stat; git diff -- docs/00_GROUND_STATE.md docs/01_CONTRACTS.md docs/02_PLAN.md docs/CHECKLIST.md docs/03_DECISIONS_LOG.md docs/04_JOURNAL.md docs/CHANGELOG.md
  ```
- [ ] Commit:
  ```powershell
  git add backend frontend docs; git commit -m "feat(staff): stabilize repair workflow and staff ticket visibility"
  ```
- [ ] Push:
  ```powershell
  git push origin main
  ```

## E. Carry-Forward V5.15 Backlog

- [ ] Dashboard dedup + sidebar simplification.
- [ ] Tier 0 rule intelligence hooks.
- [ ] Reports drill-down.
- [ ] Smart chart system.
- [ ] Finance readiness.
- [ ] AI on-demand only after Tier 0.

## F. Deferred

- [ ] Multi-app shell.
- [ ] Workspace migration.
- [ ] Service-to-service HTTP.
- [ ] WebSocket/realtime.
- [ ] Payment gateway.
- [ ] Autonomous AI approval.
- [ ] Production DB mutation.
- [ ] Dark mode.
