# KOST48 V5 — Ground State
**Versi:** 2026-05-22 V5.16-G Staff Repair Flow Stable + V5.15 Intelligent Command Center Carry-Forward  
**Status:** Source of truth utama untuk sesi berikutnya.

## 0. Current State

```text
Active architecture: Stable Modular Monolith
Current verified implementation track: V5.16-G Staff Repair Flow
Carry-forward product track: V5.15 Intelligent Command Center + Finance Foundation
Default mode: PLAN ONLY, kecuali user eksplisit minta ACT / YOLO / patch
Multi-app: ROADMAP ONLY, bukan implementasi aktif
```

Environment tetap:

- Windows + VS Code + PowerShell
- Backend: NestJS + Prisma + PostgreSQL
- Frontend: React + Vite + TypeScript + React-Bootstrap + TanStack Query
- Auth: JWT Bearer
- API lokal: `http://localhost:3000/api`
- Frontend lokal: `http://localhost:5173`
- Project root:

```text
C:\Users\lieml\Desktop\Big Personal Web App\kost48surabaya-v3\kost48_full_frontend_backend_upgrade_bundle\final_bundle
```

## 0.1 Product Direction Locked

Arah produk tetap:

```text
KOST48 Command Center
Asisten operasional kos yang mengubah data menjadi prioritas, rekomendasi, dan aksi.
```

Aplikasi tidak boleh terasa seperti database viewer atau dashboard dekoratif. KOST48 harus menjadi pusat kendali operasional kos:

- Owner: bisnis sehat atau tidak, uang masuk kurang di mana, risiko apa yang perlu diputuskan?
- Admin: apa yang harus dikerjakan hari ini, mana yang urgent, flow mana yang macet?
- Staff: tugas fisik/tiket/meter/inventaris mana yang perlu ditangani?
- Tenant: status sewa saya apa, apa yang harus saya bayar, apa yang sedang diproses?
- Public: kamar mana yang tersedia dan bagaimana cara booking?

## 0.2 V5.16 Staff Repair Flow — Verified State

V5.16 menutup masalah flow staff/tenant/admin untuk barang kamar dan gudang.

Keputusan final:

```text
Staff = lapor kondisi / diagnosis lapangan / kerjakan tugas / upload bukti.
Admin/Owner = konfirmasi status final barang, review laporan, close/cancel ticket, dan mutasi stok resmi.
```

Source of truth bisnis:

```text
Ticket = process controller
StaffFieldReport = laporan kondisi lapangan / diagnosis staff
RoomItem.status = display/final state barang kamar setelah keputusan admin/owner
InventoryItem.status = display/final state barang gudang setelah keputusan admin/owner
InventoryMovement = kebenaran stok/fisik barang resmi
```

Verified UAT manual:

- Staff report barang kamar membuat ticket dengan `assignedToId=3`, `roomId=1`, `linkedRoomItemId=1`.
- Staff report gudang bisa link `linkedInventoryItemId`.
- Staff list `/api/tickets?limit=20` sekarang menampilkan pekerjaan aktif assigned ke staff.
- Staff detail ticket assigned dapat dibuka.
- Ticket lifecycle berhasil:
  - `OPEN → IN_PROGRESS → DONE → CLOSED`
  - `OPEN → CANCELLED`
- Ticket 6 manual UAT: `CLOSED`, `finalRoomItemStatus=GOOD`.
- Ticket 7 manual UAT: `CLOSED`, `finalInventoryItemStatus=OUT_OF_STOCK`.
- Fresh linking UAT:
  - Ticket 8/9/10/11/12 membuktikan linking baru berjalan untuk ticket baru.
  - Ticket 12 terlihat di staff list setelah V5.16-G.

Important:
- Ticket lama sebelum V5.16-E bisa tetap `linkedRoomItemId` kosong; itu data historis dev/UAT lama, bukan bug baru.
- Future UAT tidak dibuat sebagai file script kecuali user minta. Tulis UAT commands langsung di chat.

## 0.3 V5.16 Patch Timeline

### V5.16-A — Staff Repair Governance
- Staff status update diubah menjadi laporan kondisi, bukan final decision.
- Wording frontend berubah dari “Update Status” menjadi “Laporkan Kondisi”.
- Tidak ada schema change.

### V5.16-B — Staff Field Report + Admin Confirmation Queue
- Tambah `StaffFieldReport` dan enum terkait.
- Tambah admin review/report queue.
- Ticket close dapat membawa `finalRoomItemStatus`, `finalInventoryItemStatus`, `finalAdminNote`.

### V5.16-C — Stabilization
- Validasi field report diperketat.
- Admin review movement hanya untuk `APPROVE`.
- Staff report wajib catatan/foto.
- UAT script sempat dibuat lalu diputuskan tidak diteruskan sebagai file.

### V5.16-D — Select Contract
- Frontend select dipisah: barang kamar vs gudang.
- Admin decision dan final status select dirapikan.
- Manual UAT select contract PASS.

### V5.16-E — Ticket Linking + UAT Safe Package
- Fresh staff report mengisi `linkedRoomItemId` / `linkedInventoryItemId`.
- Tidak membuat file UAT script lagi.

### V5.16-F — UX Final Polish
- Copy status staff/admin lebih manusiawi.
- Staff work queue lebih bersih dari jargon teknis.
- Belum final PASS karena staff list masih perlu hard fix.

### V5.16-G — Staff Ticket List Hard Fix
- `GET /api/tickets` untuk STAFF dipaksa menampilkan ticket aktif:
  - assigned ke staff,
  - atau punya `staffFieldReports.reportedByStaffId`.
- Default staff list hanya `OPEN`, `IN_PROGRESS`, `DONE`.
- Manual UAT membuktikan ticket aktif #12 muncul di staff list.

## 1. Hard Rules

1. Jangan rewrite total.
2. Jangan patch sebelum inspect file asli ZIP/code terbaru.
3. Jangan campur PLAN dan ACT.
4. Semua command harus PowerShell.
5. API test wajib `Invoke-RestMethod`, bukan curl.
6. Jangan reset DB kecuali user eksplisit minta.
7. Jangan klaim PASS tanpa build + runtime + UAT/manual verification.
8. Jangan kerja di luar project root.
9. Jangan buat `.md` baru kecuali user minta.
10. Jangan buka multi-app/workspace migration tanpa bounded plan baru.
11. Jangan tambah dependency chart/UI library tanpa PLAN dan approval.
12. No dark mode.
13. No production DB mutation.
14. No service-to-service HTTP.
15. No autonomous AI mutation.
16. UAT command ditulis di chat, jangan buat file script UAT kecuali user eksplisit minta.

## 2. Stable Modular Monolith Remains Active

Tetap:

```text
No apps/ generation.
No runtime alias mirror hack.
No core-api/tenant-api/staff-api/finance-api/marketing-api shell now.
No service-to-service HTTP now.
No workspace migration now.
```

Backend/schema boleh dibuka hanya bila bounded, additive, dan migration-safe.

## 3. Locked Business Guards

Jangan hilangkan:

1. Renewal invoice harus `ISSUED` setelah admin approve.
2. Checkout final block jika ada open invoice.
3. Open invoice = status bukan `PAID` dan bukan `CANCELLED`.
4. `DRAFT` ikut block checkout.
5. `complete()` tidak auto-create final utility invoice.
6. Payment approval yang mutate invoice/stay/room/meter/deposit tetap core monolith.
7. Renew approval/execution tetap core monolith.
8. Room occupancy/status writes tetap core monolith.
9. Admin approve checkout request tidak sama dengan final checkout.
10. Tenant hanya create/view request/submission, tidak menjalankan lifecycle final.
11. Staff tidak membuat mutasi finance/lifecycle sensitif.
12. InventoryMovement resmi tetap OWNER/ADMIN.

## 4. Next Recommended Focus

Setelah V5.16-G, next terbaik:

```text
PLAN dulu: Staff/Admin UI final smoke + Git release readiness
```

Sebelum lanjut fitur baru:
- Run backend build.
- Run frontend build.
- Run manual smoke ringkas.
- Commit/push to GitHub.
- Baru lanjut V5.15 Intelligent Command Center backlog:
  - dashboard dedup,
  - tier 0 intelligence hooks,
  - reports drill-down,
  - finance readiness.
