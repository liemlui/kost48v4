# M17 — Audit 360° P3–P8 (Ringkasan)

> **Audit:** 6–7 Jul 2026 | Auth, Ops, Auto-Ops, AI, Marketing, Cross | Detail → `docs/archieve/M17_AUDIT_360_P3_P8.md`

## Status: 🟢 96% SEHAT (setelah implementasi)

## Temuan & Eksekusi

| ID | Flow | Temuan | Prioritas | Status |
|----|------|--------|-----------|--------|
| **P3-01** | Auth | JWT 24 jam di localStorage — tanpa refresh token = XSS hijack risk | 🔴 CRITICAL | ✅ **IMPLEMENTED** — model RefreshToken, httpOnly cookie, `/auth/refresh`, auto-refresh interceptor 🧬 |
| **P3-02** | Auth | Rate limit in-memory (multi-instance = perlu Redis) | 🔵 LOW | ✅ DOCUMENTED — aman di single-instance |
| **P7-01** | Marketing | CTA booking belum reusable | 🟠 MEDIUM | ✅ **IMPLEMENTED** — `BookingCtaButton` shared component |
| **P8-01** | DB | FK index verifikasi | 🟠 MEDIUM | ✅ **VERIFIED** — 215 `@@index` di schema |
| **P8-02** | FE | Skeleton dimensi hardcoded | 🔵 LOW | ✅ DOCUMENTED — atom fleksibel via props |
| **P8-03** | FE | Chart empty state | 🔵 LOW | ✅ **IMPLEMENTED** — guard SmartChartPanel + HorizontalBarChart |
| **P8-04** | FE | 404 page | 🔵 LOW | ✅ PRE-EXISTING (Fase L) |
| **P8-05** | FE | Toast feedback | 🔵 LOW | ✅ PRE-EXISTING (Fase F+M) |

## Ringkasan per Flow

| Flow | Status | Highlights |
|------|--------|------------|
| **P3** Auth & Security | ✅ Solid | Enum-safe, suspend putus sesi, bcrypt, CSPRNG, global default-deny JWT, role guard, rate limit, PDP compliance |
| **P4** Staff Ops & Inventory | ✅ Solid | Ticket lifecycle, SLA escalation, round-robin, KPI, single-writer inventory trigger |
| **P5** Auto-Ops | ✅ Solid | Advisory lock mutex, 5 sweeper × banyak operasi, safety belt uang-masuk=STOP |
| **P6** AI Flow | ✅ Solid | Manual-only, OWNER/ADMIN, circuit breaker, fallback offline, configurable, audit trail |
| **P7** Marketing & Growth | ✅ Solid | SEO 100, JSON-LD, social proof, kalender, code splitting, loyalty idempotent |
| **P8** Cross-Dimension | ✅ Solid | 215 FK index, DTO validation, pagination, error handling, PWA |

## Rekomendasi Sisa
- P1-01/P1-02 (sudah terjadwal — flow uang)
- P1-03: Unify accounting transaction (🟠 MEDIUM)
- P3-02: Redis untuk multi-instance (🔵 LOW — masa depan)
