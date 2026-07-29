# KOST48 Surabaya V5 — Reasonix Agent Guide

> **Baca `CLAUDE.md` untuk panduan lengkap.** File ini = tambahan spesifik Reasonix (memory, session, skills).

## Project
Sistem manajemen kost 48 kamar. Backend NestJS+Prisma+PostgreSQL (`backend/`), frontend React+Vite+TanStack Query (`frontend/`). Bahasa kerja: Indonesia. Role: OWNER/ADMIN/STAFF/TENANT.

**Status:** Fase B–AM selesai. Hanya Fase A (Pra-Go-Live) yang menunggu owner — server/domain/env. Aplikasi siap produksi.

## Commands (verified)
```bash
# Backend
cd backend && npx tsc --noEmit     # typecheck
cd backend && npm run start:dev     # dev server (port 3000)
cd backend && npm run build         # production build
cd backend && npm run test:unit     # unit tests (26 tests)

# Frontend
cd frontend && npm run dev          # dev server (port 5174)
cd frontend && npm run build        # production build (tsc + vite + PWA stamp)
cd frontend && npx vitest run       # unit tests (121 tests)

# Deploy
npm run bundle:deploy:fast          # bundle deploy package
npm run make-deploy:fast            # full deploy artifact
```

## Architecture
- **46 NestJS modules** di `backend/src/modules/` — core: `stays`, `invoices`, `tenants`, `rooms`, `finance`, `accounting`, `auto-ops`, `iot`
- **Prisma** — 62 model / 74 enum, DB UAT port 5433 `kost48_v3_pro`, produksi 5432 `kost48_v3`
- **Frontend pages** — `frontend/src/pages/` per portal: `auth/`, `portal/` (tenant), `dashboard/` (admin), `owner/`, `public/`, `staff/`
- **Docs:** 15 file aktif (M00-M13 + M15_IOT) — lihat `project-master-stats` memory
- **CLAUDE.md §Konsep yang sering salah** — WAJIB baca sebelum coding (tidak ada model Booking, DP ≠ deposit, dll.)

## Docs Navigation (hemat token)
1. `CLAUDE.md` — panduan sesi + aturan kerja
2. `docs/M01_MASTER.md` — blueprint + ground state
3. `docs/M02_KEPUTUSAN_OWNER.md` — 84 keputusan owner (SUMBER KEBENARAN)
4. `docs/M12_CHECKLIST_CHANGELOG.md` — ANTRIAN EKSEKUSI + status fase
5. `docs/M00_CODEMAP.md` — peta modul→path (pakai ini sebelum grep)
6. Domain: **M04** keuangan · **M05** siklus huni · **M06** operasional · **M07** publik · **M08** deploy · **M15** IoT
7. `docs/M13_CHANGELOG.md` — changelog + release notes

## Reasonix Memory System
- 7 memory tersimpan: `project-master-stats`, `project-goals-checklist`, `docmap-135-files`, `common-pitfalls`, `iot-water-kwh-spec`, `staff-no-invoice-access`, `staff-portal-new-session-prompt`, `staff-portal-uiux-audit`
- Gunakan `memory` tool untuk mencari sebelum bertindak
- Simpan fakta baru dengan `remember` bila relevan lintas sesi

## Session Management
- `/new` bila topik berubah total atau >20 turn
- Sesi optimal: 5-15 turn, 1-3 task terkait
- Jangan `/new` untuk tugas sepele (1-3 turn)
- Prefer `explore` / `research` subagent untuk wide-net codebase investigation

## Notes
- Jangan baca `docs/archieve/*`, `reference/*`, `backend/src/generated/*` (token bomb)
- Commit & docs berbahasa Indonesia
- 1 task = 1 commit, centang M12 + 1 baris di M13
- No npm dep baru tanpa approval owner
- No `git push` tanpa izin
