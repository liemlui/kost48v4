# KOST48 V5 — Decisions Log
**Versi:** 2026-05-22 V5.16-G Staff Repair Flow decision sync**

## 2026-05-22 — V5.16 Staff Repair Decisions

| # | Keputusan | Dampak |
|---:|---|---|
| 281 | Staff tidak lagi dianggap sebagai pengambil keputusan final barang | Staff hanya melapor/diagnosis/kerjakan; admin/owner final confirmation. |
| 282 | `Ticket` menjadi process controller untuk staff repair flow | Ticket mengontrol OPEN/IN_PROGRESS/DONE/CLOSED/CANCELLED. |
| 283 | `StaffFieldReport` menjadi laporan kondisi lapangan | Staff diagnosis dan permintaan barang dicatat terstruktur. |
| 284 | `RoomItem.status` adalah display/final state setelah admin confirm | Staff tidak langsung memutuskan status akhir barang kamar. |
| 285 | `InventoryItem.status` adalah display/final state setelah admin confirm | Staff tidak langsung memutuskan status akhir barang gudang. |
| 286 | `InventoryMovement` tetap kebenaran stok resmi dan hanya admin/owner | Staff tidak membuat movement resmi. |
| 287 | `PATCH /room-items/:id/staff-status` menjadi report flow | Endpoint membuat/link ticket dan field report, bukan final mutation. |
| 288 | `PATCH /inventory-items/:id/staff-status` menjadi report flow | Endpoint membuat/link ticket dan field report untuk gudang. |
| 289 | Wording staff UI diganti dari “Update Status” ke “Laporkan Kondisi” | Menghindari staff merasa bisa mengubah keputusan final. |
| 290 | `StaffFieldReport` schema additive diizinkan | Perubahan aman tanpa DB reset dan tidak merusak data lama. |
| 291 | Admin review report dapat `APPROVE`, `REJECT`, `NEEDS_MORE_INFO` | Keputusan admin menjadi eksplisit. |
| 292 | Admin close ticket bisa membawa final item status | Final state dicatat saat closure, bukan saat staff report. |
| 293 | Close ticket body memakai `action: CLOSE/CANCEL`, bukan `reason` | Mengikuti DTO runtime yang menolak property reason. |
| 294 | `CLOSE` hanya valid dari `DONE` | Lifecycle guard dipertahankan; OPEN tidak boleh langsung close. |
| 295 | `CANCEL` hanya valid dari `OPEN` | Ticket UAT/laporan salah bisa dibatalkan sebelum pekerjaan dimulai. |
| 296 | Staff hanya boleh satu pekerjaan aktif IN_PROGRESS | Active work lock dipertahankan. |
| 297 | Staff list default hanya menampilkan active work | `OPEN`, `IN_PROGRESS`, `DONE` tampil; `CLOSED/CANCELLED` masuk laporan/rekap. |
| 298 | Staff list visibility diperbaiki di V5.16-G | Staff melihat ticket assigned ke dirinya atau report dibuat olehnya. |
| 299 | UAT script file tidak dibuat lagi secara default | User minta UAT ditulis di chat, bukan file `scripts/uat`. |
| 300 | Manual UAT V5.16-D/E/G dianggap PASS untuk flow utama | Staff report, linking, movement, lifecycle, dan staff active list terbukti. |

## 2026-05-21 — V5.15 Intelligent Command Center + Finance Foundation Decisions

| # | Keputusan | Dampak |
|---:|---|---|
| 256 | V5.15 direction dikunci sebagai `Intelligent Command Center + Finance Foundation` | Fokus naik dari UI command center ke rule intelligence, dedup UX, chart/report drill-down, dan finance foundation. |
| 257 | `AssistantPanel` dan `ActionQueueTable` tidak boleh menduplikasi pesan yang sama | Assistant menjadi diagnosis/impact; queue menjadi daftar pekerjaan konkret. |
| 258 | Dedup memakai kombinasi `ruleId + entityType + entityId + actionRoute` | Mengurangi alert spam dan membuat dashboard lebih matang. |
| 259 | Sidebar tidak harus menampilkan Reports sebagai menu utama jika dashboard sudah punya drill-down | Navigasi lebih ringan; reports menjadi detail workspace dari dashboard/finance cockpit. |
| 260 | `usePaymentUrgency.ts` menjadi pola resmi zero-cost intelligence | Pola hook deterministic dipakai untuk domain lain sebelum LLM. |
| 261 | Tier 0 intelligence hooks diprioritaskan sebelum AI/LLM | Biaya nol, deterministic, auditable, dan bisa langsung terasa cerdas. |
| 262 | Tier 0 candidate hooks: `useBusinessHealthScore`, `useTenantRiskProfile`, `useCashflowForecast`, `useOperationalStressIndex`, `useMeterAnomalyDetector` | Dashboard dan portal bisa terasa lebih AI-like tanpa backend baru. |
| 263 | `SmartCopyEngine` dibuat sebagai template engine kondisional, bukan LLM | Copy role-specific dan tenant-friendly bisa konsisten tanpa biaya. |
| 264 | AI/LLM hanya boleh on-demand lewat klik eksplisit | Tidak ada AI call saat page load; user yang tidak klik = zero cost. |
| 265 | Semua `/api/ai/*` wajib memakai cache dan rate limit | Melindungi biaya dan mencegah spam klik. |
| 266 | Prompt AI harus pendek dan output JSON kecil | Biaya dan latency ditekan; hasil mudah dipakai UI. |
| 268 | Math/rule first, AI later | Jika bisa dihitung dengan if/else atau formula, tidak boleh memakai LLM. |
| 273 | Balance sheet harus dipersiapkan sebelum formal accounting ratios dibuka | Current ratio, quick ratio, D/E, ROCE tidak boleh fake. |
| 274 | Deposit held wajib diperlakukan sebagai liability, bukan revenue | Finance report tidak boleh salah membaca deposit sebagai pendapatan bersih. |
| 276 | Formal ratios tetap locked sampai cash/bank, liability, equity, dan capital employed reliable | UI harus menjelaskan data apa yang belum tersedia. |
| 280 | AI tidak boleh melakukan autonomous mutation | AI hanya memberi saran/ekstraksi; admin/user tetap eksekutor aksi. |

## Active Business Decisions

1. `core` monolith owns all Stay lifecycle writes.
2. Room status/occupancy writes remain core.
3. Tenant can create/view requests/submissions only.
4. Renew approval/execution remains core.
5. Checkout final remains core and is blocked by open invoice.
6. Payment approval remains core.
7. Marketing/public is read-only.
8. Staff is operational/read-heavy plus bounded field reporting.
9. Owner-api deferred.
10. Multi-app only after monolith gates pass.
11. Assistant is rule-based by default.
12. AI/LLM is on-demand only.
13. Finance ratios require balance-sheet-grade data.
14. Backend/schema work is allowed only through bounded PLAN/ACT and migration-safe flow.
15. PowerShell only for commands.
16. Invoke-RestMethod only for API tests.
