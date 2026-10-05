# M16 — Pasca-Audit Total KOST48 V5

> **Dibuat:** 2026-06-20 · **Status: SEMUA SELESAI** · **Commit:** `ac4cc2f`  
> **Sumber:** Audit 12 jalur paralel · 97 temuan · **13/13 task ✅**

## Ringkasan Eksekusi

| Batch | Task | Deskripsi | Status |
|-------|------|-----------|:------:|
| P1 | RolesGuard | Tambah `RolesGuard` di loyalty, notifications, push controller | ✅ |
| P2 | DTO multipart | Fix validation bypass multipart `submitWithProof` — manual class-validator | ✅ |
| P3 | STAFF removal | Hapus `STAFF` dari 11 endpoint sensitif (tenants, users, invoices, expenses, dll) | ✅ |
| P4 | JWT graceful expiry | DEFER — refresh token evaluasi arsitektur → catatan di `FASE_E_EVALUASI_ARSITEKTUR.md` | ⏭️ |
| P5 | Circuit breaker | DeepSeek: state tracking + 5 failures → 30s open + fallback `market-analysis.service.ts` | ✅ |
| P6 | Advisory lock | Auto-ops: `pg_try_advisory_lock(1)` ganti in-memory `running` flag (PM2-safe) | ✅ |
| Q1 | Unifikasi resolveRent | Hapus Pattern A, semua pakai `common/utils/rent-resolver.util.ts` | ✅ |
| Q2 | Merge helpers | `tenant-bookings-helpers.ts` + `tenant-bookings.helpers.ts` → 1 file | ✅ |
| Q3+Q4 | Schema integrity | `@unique` NIK, `@relation` SatisfactionSurvey, `@@index` tambahan, `Cascade→SetNull` | ✅ |
| Q5 | Deposit handling | `processDeposit` normal = forced checkout — GUC guard diseragamkan | ✅ |
| R1 | CSS tokens | `00-tokens.css` — audit variable, dead token dihapus | ✅ |
| R2 | Unifikasi arus kas | Semua arus kas lewat ledger-backed, tidak ada path bypass | ✅ |
| R3 | DeepSeek UI | Settings DeepSeek model/limit configurable dari UI Owner (tab "AI & Biaya") | ✅ |
| R4+R5 | Error + dead code | Error handling konsisten + dead code cleanup | ✅ |

## 5 Keputusan Owner (sudah diambil)

1. **Threshold circuit breaker:** 5 kegagalan → 30 detik open (bukan 3/60).
2. **Unifikasi arus kas:** semua lewat ledger-backed, tanpa bypass.
3. **Auto-adjust stok:** movement staf tetap read-only; auto-adjust hanya owner/admin.
4. **DeepSeek UI configurable:** model dan limit bisa diubah dari UI tanpa restart server.
5. **CSS audit:** dead CSS dihapus via audit manual (tidak dengan alat otomatis).

## Backlog Rendah (tidak dikerjakan — keputusan sadar)

- **P4 Refresh token:** dinilai MEDIUM priority; ditunda sampai ada keperluan nyata. JWT 24 jam masih aman untuk skala 1 staf.
- **Lighthouse FID/LCP detail:** SEO 100/100 sudah cukup; Core Web Vitals di-defer ke post-launch.

---

*Detail teknis per task lihat `docs/M11_CHANGELOG.md` entry 2026-06-20 audit Fase K.*
