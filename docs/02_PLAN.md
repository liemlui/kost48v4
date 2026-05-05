# KOST48 V3/V4 — Execution Plan
**Versi:** 2026-05-04 production handoff  
**Fungsi:** Satu master plan aktif. Isi lama `05_V4_MASTER_PLAN.md` sudah digabung ke file ini agar dokumen tidak terlalu banyak.

---

## 1. Prinsip Eksekusi

1. Satu flow utama per batch.
2. PLAN dan ACT dipisah.
3. ACT harus punya Definition of Done dan targeted UAT.
4. Build backend/frontend harus PASS sesuai area yang disentuh.
5. Jangan ulang UAT yang sudah PASS kecuali patch menyentuh flow terkait.
6. Jangan buat file `.md` baru untuk setiap patch kecil; update salah satu file aktif saja.
7. File helper UAT/debug harus dihapus sebelum selesai.
8. Semua command/test default memakai PowerShell.

---

## 2. Status Fase Saat Ini

| Fase | Nama | Status |
|---|---|---|
| 0 | Fondasi & stabilitas awal | ✅ Selesai |
| 1 | Stabilization + cleanup | ✅ Selesai |
| 2 | UX & module integration | ✅ Selesai |
| 3 | Ticket tenant-only redesign | ✅ Selesai |
| 3.5 | Backend stabilization/API gap closure | ✅ Selesai |
| 4.0 | Booking mandiri + RESERVED | ✅ PASS |
| 4.1 | Admin approval booking | ✅ PASS |
| 4.2 | Payment submission + activation | ✅ CORE PASS |
| 4.3-A | Reminder preview | ✅ PASS |
| 4.3-B | Reminder mock send | ✅ PASS |
| 4.3-C | Notification Center MVP | ✅ COMPLETE |
| 4.3-G1 | Announcement access guard | ✅ PASS |
| 4.3-G2 | Pending meter snapshot + promotion | ✅ Fresh UAT PASS |
| Production deploy handoff | Frontend/backend production connection + runtime hardening | ✅ PASS |
| Cleanup maintenance | Remove unused files/config safely with Cline, then verify | 🟡 NEXT MAINTENANCE |
| 4.3-D | Tenant payment urgency header chip | 🟡 NEXT FEATURE |
| 4.4 | Marketing display + flexible registration | ⬜ Belum dibuka |
| 4.5 | Tenant self-service lanjutan | ⬜ Belum dibuka |

---


## 3. Immediate Maintenance — Cline Cleanup Unused Files/Config

### 3.1 Goal
Membersihkan file/config yang tidak dipakai setelah production deploy tanpa menyentuh flow bisnis yang sudah PASS.

### 3.2 Scope sempit
- Audit only first, then delete only obvious unused files.
- Jangan rewrite backend/frontend.
- Jangan ubah schema/database.
- Jangan menghapus source aktif untuk reminder, notification, booking, payment, stay, auth.
- Jangan menghapus generated Prisma kecuali ada keputusan eksplisit.
- Jangan buat file markdown baru.
- Setelah cleanup wajib `npm run build` backend/frontend sesuai area dan `git status --short`.

### 3.3 Kandidat yang boleh diaudit
- File temporary/helper lokal.
- Copy/backup file yang jelas bukan source aktif.
- Artefak deploy server seperti `.htaccess` bila tidak diperlukan di repo.
- Stale markdown di luar 7 active docs.
- Asset build lama yang tidak dipakai, tetapi jangan hapus source `frontend/src`.

### 3.4 Prompt singkat untuk Cline PLAN
```text
MODE: PLAN ONLY
Task: Audit unused files/config after KOST48 production handoff.
Do not modify files.
Find only obvious unused/temp/legacy files.
Do not touch schema, generated Prisma, auth, booking, payment, reminders, notifications, or production config unless clearly unused.
Return deletion candidates with reason, risk level, and verification commands.
Use Windows PowerShell commands.
```

---

## 4. Current Next ACT — Phase 4.3-D

### 3.1 Goal
Menampilkan urgency bisnis aktif untuk tenant di header, khususnya kewajiban bayar dan deadline. Ini berbeda dari notification read/unread.

### 3.2 Scope MVP
- Frontend-first.
- Tenant-only.
- Chip kecil di header/topbar dekat notification bell.
- Klik chip navigasi ke halaman sumber urgency.
- Tidak membuka backend baru kecuali data existing benar-benar tidak cukup.
- Tidak membuka real WhatsApp, scheduler, push, service worker, SSE, websocket.

### 3.3 Data kandidat
1. Tenant invoices: status `ISSUED`, `PARTIAL`, overdue/due soon.
2. Tenant bookings: `expiresAt`, payment waiting state.
3. Tenant current stay: `plannedCheckOutDate`/contract ending.

### 3.4 Prioritas chip
| Priority | Kondisi | Label |
|---:|---|---|
| 1 | Invoice overdue | `Terlambat X hari` |
| 2 | Booking payment deadline | `Bayar sebelum X jam` |
| 3 | Invoice due soon | `Tagihan H-X` / `Jatuh tempo hari ini` |
| 4 | Stay/contract ending soon | `Kontrak H-X` |

### 3.5 Acceptance criteria
- Chip tidak muncul bila tidak ada urgency.
- Chip tetap muncul walau AppNotification sudah read.
- Chip hilang saat invoice paid / booking resolved / stay resolved.
- Tenant-only; admin/owner/staff tidak mendapat chip ini pada batch awal.
- Klik chip menuju `/portal/invoices`, `/portal/bookings`, atau `/portal/stay`.
- Build frontend PASS.

### 3.6 Prompt singkat untuk Cline PLAN
```text
MODE: PLAN ONLY
Task: Phase 4.3-D Tenant Payment Urgency Header Chip.
Read current frontend header/layout, tenant invoice/bookings/stay API hooks, and notification bell placement.
Do not modify files.
Plan frontend-first implementation with smallest file scope.
Do not open WhatsApp/scheduler/push/SSE/websocket.
Return file list, data sources, priority calculation, and UAT checklist.
```

---

## 5. Completed UAT Gates — Do Not Repeat Unless Touched

### Gate 1 / UAT 4.0 PASS
- Public `/rooms` works for guest.
- Admin `/rooms` remains backoffice.
- Tenant booking succeeds.
- `/portal/bookings` displays `checkInDate` and `expiresAt` correctly.
- Broken image fallback works.
- Booking reserved not mixed with operational stay.
- CheckInWizard not blocked by reserved booking incorrectly.

### Gate 2 / UAT 4.1 PASS
- Admin approve booking succeeds.
- Modal closes after success.
- Invoice initial created.
- Initial meter captured according to current lifecycle.
- Room remains `RESERVED` before payment.
- Tenant sees `Menunggu Pembayaran`.

### UAT 4.2 Core PASS
- Happy path: tenant upload proof, admin approve, invoice/payment/deposit sync, room `RESERVED -> OCCUPIED`.
- Reject path: reject with reason, tenant sees reason and can resubmit.
- Wrong amount path: backend rejects non-exact amount.
- Double approve prevention: no duplicate payment.
- Expiry core: expired booking returns room to available and expires pending submission if relevant.

### Phase 4.3-G2 Fresh UAT PASS
- Approve booking creates pending snapshot only.
- Payment approval promotes snapshot to 2 MeterReadings.
- Expire reserved clears snapshot.
- Expire occupied rejected 409.
- Legacy cleanup skipped because DB dev reset clean before live.

---

## 6. Backlog Roadmap

### 5.1 Phase 4.4 — Marketing Display & Flexible Registration
Scope:
- Public room detail `GET /public/rooms/:id`.
- Room gallery/images.
- Public room detail page.
- Register via email or phone.
- Phone normalization and uniqueness.
- Tenant account soft delete/deactivate.

Do not start until 4.3-D is stable unless explicitly instructed.

### 5.2 Phase 4.5 — Tenant Self-Service
Scope:
- Tenant renew request.
- Admin approve/reject renew request.
- Forgot password.
- Reset password token/OTP.
- Account enumeration-safe responses.

### 5.3 Deferred External Automation
- Real WhatsApp provider.
- Scheduler/cron reminder.
- PWA/browser push.
- SSE/websocket live notification stream.
- Stage-aware announcement audience advanced model.
- Meter metadata enrichment (`stayId`, `sourceType`, `isBaseline`) unless a real blocker appears.

---

## 7. Suggested ACT Template

```text
MODE: ACT
Project: KOST48 Surabaya V3/V4
Task: [one exact task]

Constraints:
- One vertical slice only.
- Do not modify docs unless explicitly requested.
- Do not create unnecessary markdown files.
- Use Windows PowerShell commands in final verification.
- Remove temporary helper files before finishing.
- Build must pass.

Allowed files:
- [list exact files after PLAN]

Definition of Done:
- [clear pass criteria]

Final report:
- Files changed
- Build result
- UAT/verification result
- Git status note
```

---

## 8. Documentation Hygiene Policy

### Active docs only
Keep active docs limited to:
- `00_GROUND_STATE.md`
- `01_CONTRACTS.md`
- `02_PLAN.md`
- `CHECKLIST.md`
- `03_DECISIONS_LOG.md`
- `04_JOURNAL.md`
- `CHANGELOG.md`
- pricing policy doc if needed as business reference

### Do not recreate
Do not recreate:
- dated current status docs,
- package readme docs,
- patch summary docs,
- separate frontend/backend changelog unless explicitly requested,
- pasted markdown files.

Use `CHANGELOG.md` for patch summaries and `04_JOURNAL.md` for chronological evidence.
