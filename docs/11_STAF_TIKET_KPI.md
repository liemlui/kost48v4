# DOSSIER 15 — STAF, TIKET & KPI
**Domain:** manajemen tiket operasional, work queue staf, staff performance KPI, round-robin assignment. **Flow 11.**
**Status:** 🟢 Tiket sehat (CHECKOUT_INSPECTION gate, EVICT_OVERSTAY auto). 🟡 KPI: formula terverifikasi, monthRange TZ unresolved.
**File inti:** `tickets.service.ts` (assign/close/auto-create), `tickets.controller.ts`, KPI data dari `reviews` + `tickets`.

---
## 1. Aturan bisnis
- **Tiket lifecycle:** OPEN → IN_PROGRESS → RESOLVED / CLOSED.
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
| K-1 | 🟠 P2 | Ticket resolved time dihitung dari `createdAt` bukan `assignedAt` — idle time in queue masuk KPI staf → unfair. | `tickets.service.ts` | **F3-3**: gunakan assignedAt |
| K-2 | 🟡 P3 | SLA monitoring belum ada — tidak ada alert/escalation untuk ticket overdue. | — | **F3-4** |
| K-3 | 🟡 P3 | Staff performance dashboard mencampur SEMUA kategori tiket — CHECKOUT_INSPECTION (auto) vs MAINTENANCE (manual) tidak bisa dibandingkan. | Frontend KPI dashboard | **F3-5**: filter by category |
| K-4 | 🟡 P3 | Review tenant ≤2⭐ wajib kategori komplain — verified OK (V5.10.0). | `TenantStaffReviewPrompt` | pertahankan |
| K-5 | 🟡 P3 | **MonthRange menggunakan UTC/server time, bukan WIB** — laporan bulanan staf bisa salah hari (off-by-1 untuk jam 00:00-06:59 WIB). Contoh: tiket closed 30 Juni 23:30 WIB = 1 Juli 04:30 UTC → masuk laporan Juli, bukan Juni. | `tickets.service.ts` monthRange filter | **F2-14**: konversi ke WIB (Asia/Jakarta) untuk monthRange |
| K-6 | 🟡 P3 | Ticket BARANG_PINDAH closed → penerima notif salah (tenant, bukan staff yang melapor). | `tickets.service.ts` notif | **F3-2**: fix recipient |
| K-7 | 🟡 P3 | Admin alert rating < 3 → auto panel merah — verified OK (V5.10.0). | Frontend | pertahankan |
| K-8 | 🟡 P3 | Ticket-closed BARANG_PINDAH notification penerima salah (cross-ref K-6). | `tickets.service.ts` | **F3-2**: fix recipient |

## 4. Task
- **F3-3 · FASE 3:** KPI resolved time dari `assignedAt`, bukan `createdAt`. (K-1)
- **F3-4 · FASE 3:** SLA monitoring + escalation. (K-2)
- **F3-5 · FASE 3:** KPI filter by ticket category. (K-3)
- **F2-14 · FASE 2:** monthRange WIB timezone fix. (K-5)
- **F3-2 · FASE 3:** fix notification recipient untuk ticket BARANG_PINDAH. (K-6/K-8)

## 5. Invarian & UAT
- **Invarian:** tiket inspeksi dedupe per stay/room; staff close hanya CHECKOUT_INSPECTION; room tidak AVAILABLE tanpa close safe.
- **UAT:** (1) final checkout → tiket inspeksi muncul; (2) staff close inspeksi → room AVAILABLE; (3) KPI dashboard filter category bekerja; (4) monthRange WIB benar (pasca F2-14).

**Lintas-dossier:** tiket inspeksi → dossier 12 (checkout); staff report inventory → dossier 14; review tenant → dossier 17.