# DOSSIER 15 — STAF, TIKET & KPI
**Domain:** manajemen tiket operasional, work queue staf, staff performance KPI, round-robin assignment. **Flow 11.**
**Status:** 🟡 Tiket/KPI parsial — STAFF close dibatasi ke CHECKOUT_INSPECTION, prompt review tenant aktif, dan **workflow verifikasi review (≤2 → PENDING_VERIFICATION → owner verify, KPI hanya hitung VISIBLE) SUDAH** (F2-18, 2026-06-14). Sisa utama: SLA/KPI per kategori (F3-19).
**File inti:** `tickets.service.ts` (assign/close/auto-create), `tickets.controller.ts`, KPI data dari `reviews` + `tickets`.

---
## 1. Aturan bisnis
- **Tiket lifecycle aktual:** OPEN → IN_PROGRESS → DONE → CLOSED, dengan CANCELLED dari kondisi yang diizinkan.
- **Kategori:** CHECKOUT_INSPECTION, EVICT_OVERSTAY, BARANG_PINDAH, AUDIT_INVENTARIS, PEMERIKSAAN, MAINTENANCE, KEBERSIHAN, KUNCI, INVENTARIS, KERUSAKAN.
- **Auto-created:** CHECKOUT_INSPECTION (setelah final checkout), EVICT_OVERSTAY (H-day overstay).
- **Staff boleh close** tiket CHECKOUT_INSPECTION → room MAINTENANCE → AVAILABLE (guard keselamatan tetap).
- **Room readiness gate:** tidak AVAILABLE jika: active stay lain, room ≠ MAINTENANCE, kondisi tidak aman.
- **Round-robin assignment:** DEFERRED (hanya 1 staf).

## 2. Peta kode
| Aksi | Lokasi |
|---|---|
| Ticket CRUD + assign/close | `tickets.service.ts` |
| Auto-create CHECKOUT_INSPECTION | `stays.service.ts:605-654` (dedupe) |
| Staff work queue | `tickets.controller.ts` GET endpoint |
| KPI calculation (resolved rate, avg time) | `tickets.service.ts` / frontend dashboard |
| Staff review (tenant rating) | `reviews` module |

## 3. Temuan audit
| ID | Sev | Dampak bisnis | Lokasi | Fix/Task |
|---|---|---|---|---|
| K-1 | ✅ RESOLVED (F3-19, 2026-06-14) | Waktu penyelesaian KPI dihitung dari `assignedAt` (bukan `createdAt`) via `avgResolutionHours` di staff summary — idle antrean tak menghukum staf. | `staff-performance.service.ts` | **F3-19** |
| K-2 | ✅ RESOLVED (F3-19, 2026-06-14) | SLA per kategori (`Ticket.dueAt`, `ticket-sla.ts`) + eskalasi `runTicketSlaEscalation` (L0→1 admin, L1→2 owner). | `tickets.service.ts`, `auto-ops.service.ts` | **F3-19** |
| K-3 | 🟡 BACKEND DONE / FE polish (F3-19) | Backend ekspos `ticketsDoneByCategory` + `slaOnTime/slaBreached`; tampilan breakdown di dashboard FE = polish lanjutan. | `staff-performance.service.ts` (+FE) | **F3-19** |
| K-4 | 🟡 P3 | Review tenant ≤2⭐ wajib kategori komplain — verified OK (V5.10.0). | `TenantStaffReviewPrompt` | pertahankan |
| K-5 | 🟡 P3 | **MonthRange menggunakan UTC/server time, bukan WIB** sehingga laporan bulanan bisa bergeser hari. | `staff-performance.service.ts`/rutinitas | **F2-14** |
| K-6 | 🟡 P3 | Ticket BARANG_PINDAH closed → penerima notif salah. | `tickets.service.ts` notif | **F3-1** |
| K-7 | 🟡 P3 | Admin alert rating < 3 → auto panel merah — verified OK (V5.10.0). | Frontend | pertahankan |
| K-8 | 🟡 P3 | Ticket-closed BARANG_PINDAH notification penerima salah (cross-ref K-6). | `tickets.service.ts` | **F3-1** |

## 4. Task
- **F2-9 · FASE 2:** hilangkan double-count ticketsDone; dasar hitung = `resolvedAt` dalam bulan.
- **F2-14 · FASE 2:** monthRange WIB timezone fix. (K-5)
- **F2-18 · FASE 2:** model tenant-pengawas dan staff boleh close inspeksi dengan guard keselamatan.
- **F3-1 · FASE 3:** fix notification recipient untuk ticket BARANG_PINDAH. (K-6/K-8)
- **F3-19 · FASE 3 (SELESAI backend 2026-06-14):** `Ticket.assignedAt/dueAt/escalationLevel/escalatedAt`. SLA per kategori (`ticket-sla.ts`, 24j/3h/7h) di-set saat assign pertama (`assign`/`start`); KPI resolved-time dari `assignedAt` + `slaOnTime/slaBreached/avgResolutionHours/ticketsDoneByCategory`; eskalasi sweeper `runTicketSlaEscalation` (L0→1 admin, L1→2 owner, dedupe per level) + endpoint `POST /auto-ops/run/ticket-sla`. tsc 0 · unit 26/26. (Tampilan FE = polish.)
- **F3-20 · FASE 3 (SELESAI 2026-06-14):** tiket tenant ber-assignee STAFF memicu notifikasi ajakan review pada DONE dan CLOSED. Dedupe memakai recipient+title+entity; deep-link membuka `/portal/tickets`, tempat `TenantStaffReviewPrompt` mengambil tiket eligible.
- **F2-10/F3-5 · DITUNDA:** round-robin dan leaderboard antar-staf selama staf hanya satu.

## 5. Invarian & UAT
- **Invarian:** tiket inspeksi dedupe per stay/room; staff close hanya CHECKOUT_INSPECTION; room tidak AVAILABLE tanpa close safe.
- **UAT:** (1) final checkout → tiket inspeksi muncul; (2) staff close inspeksi → room AVAILABLE; (3) KPI dashboard filter category bekerja; (4) monthRange WIB benar (pasca F2-14).

**Lintas-dossier:** tiket inspeksi → dossier 12 (checkout); staff report inventory → dossier 14; review tenant → dossier 17.
