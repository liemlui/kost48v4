# KOST48 V5 — Project Journal
**Versi:** 2026-05-18 V5.7/V5.8 audit sync  
**Fungsi:** Arsip kronologis milestone dan hasil UAT. Tidak menggantikan `00_GROUND_STATE.md`.

---

---

## 2026-05-18 — V5.8-A Backend Guard Overlay Prepared

### Scope

Patch overlay disiapkan langsung dari ZIP backend/frontend/docs terbaru. Fokus tetap business correctness sebelum extraction.

### Source changes

1. `backend/src/modules/checkout-requests/checkout-requests.module.ts`
   - remove dead `StaysModule` import dari module imports.

2. `backend/src/modules/stays/stays.service.ts`
   - renewal invoice sekarang dibuat `DRAFT` sementara, line dibuat, lalu invoice langsung `ISSUED` + `issuedAt` dalam transaction yang sama.
   - checkout final sekarang memblokir semua invoice dengan status selain `PAID`/`CANCELLED`; error menampilkan invoice reference dan status.
   - deposit processing memakai definisi open invoice yang sama.

3. `backend/src/modules/stays/stays-query.service.ts`
   - open invoice count memakai definisi KB-2 (`notIn [PAID, CANCELLED]`).

### Not verified

Backend build dan UAT belum dijalankan di environment Windows project root. Tidak boleh klaim PASS sebelum user menjalankan verification commands.

### Deferred

Marketing-api shell, workspace migration, staff-api, tenant-api, finance-api, dan frontend split tetap deferred sampai V5.8-A lokal OK.

## 2026-05-18 — V5.7-B Targeted Verification Audit Accepted

### Konteks

Setelah V5.1–V5.6 shared boundary hardening, dilakukan audit besar untuk menilai kesiapan migrasi ke **Multi-App Shared-DB Architecture**. Audit awal berguna sebagai peta besar, tetapi masih menyisakan `UNKNOWN` pada high-risk flows. Targeted audit V5.7-B dilakukan untuk menutup UNKNOWN sebelum V5.8.

### Hasil utama

```text
Workspace verdict: NEEDS MANUAL MIGRATION
V5.7 ACT scope: no workspace restructure
Next: V5.8 PLAN only
```

Temuan penting:

1. `nest-cli.json` masih single-project monolith.
2. `app.module.ts` masih module aggregator.
3. Public/marketing module read-only dan cocok sebagai early extraction candidate.
4. `CheckoutRequestsModule` masih import `StaysModule`, tetapi service tidak inject `StaysService` — dead import cleanup candidate.
5. `RenewRequestsService` confirmed inject `StaysService`, dan `approveRequest()` menjalankan renewal melalui `staysService.renewStay()`.
6. `PaymentSubmissionsService.approveSubmission()` confirmed memakai `prisma.$transaction` dan SQL lock `FOR UPDATE`.
7. `TenantBookingsService.approveBooking()` confirmed memakai `$transaction`, membuat invoice `ISSUED`, dan menyimpan pending meter snapshot.
8. `StaysService.create()` confirmed sudah menjalankan manual check-in automation: invoice `ISSUED`, portal user auto-create, meter reading.
9. `StaysService.complete()` confirmed memakai `$transaction`, tetapi tidak membuat final utility invoice.
10. `StaysService.renewStay()` confirmed membuat renewal invoice `DRAFT`.
11. `MyInvoicesPage.tsx` adalah valid tenant portal candidate jika build frontend PASS dan file dicommit terpisah.

### Koreksi terhadap audit awal

Audit awal sempat menyebut kemungkinan `complete()`/`cancel()` tidak transactional. V5.7-B mengoreksi itu:

```text
StaysService.complete() dan cancel() sudah memakai prisma.$transaction().
Tidak ada P0 transaction hotfix untuk complete/cancel saat ini.
```

Yang tersisa sebagai P0 correctness:

```text
KB-1: Renewal invoice DRAFT → ISSUED saat approve request.
KB-2: Checkout final block jika ada open invoice.
```

---

## 2026-05-18 — V5.8 Business Decisions Locked

### KB-1 — Renewal invoice auto-ISSUED

Keputusan:

```text
Renewal invoice harus menjadi ISSUED saat admin approve renew request.
```

Alasan:

- Booking approval sudah membuat invoice `ISSUED`.
- Renewal approval adalah komitmen bisnis yang harus tenant-facing.
- Jika invoice renewal tetap `DRAFT`, tenant bisa tidak melihat tagihan renew.

### KB-2 — Checkout final open invoice guard

Keputusan:

```text
StaysService.complete() harus block checkout final jika ada invoice open.
Tidak ada auto-create final utility invoice di complete().
```

Open invoice:

```text
status NOT IN [PAID, CANCELLED]
DRAFT ikut block checkout.
```

Alasan:

- Checkout final berarti tenant benar-benar keluar dan room dilepas.
- Tidak boleh ada invoice belum diselesaikan saat room kembali AVAILABLE.
- Admin wajib settle manual dulu.

---

## 2026-05-18 — Cline Rules V5 Update

`.clinerules` dan `.clineignore` diperbarui untuk V5 workflow:

- Project label menjadi KOST48 V5.
- ChatGPT menjadi command center.
- Cline dibatasi sebagai local repo auditor / bounded coding agent.
- PowerShell-only diperketat.
- V5 architecture direction ditambahkan.
- High-risk flows dikunci.
- Current priority diubah dari B1 ke V5.7/V5.8.
- Overlay patch format ditetapkan.
- `.clineignore` source-of-truth comments diarahkan ke 7 active docs dan backend/frontend config.

Catatan:

```text
Branch aktif dari bukti terminal terbaru adalah main/origin/main.
Jangan ubah wording ke master kecuali git lokal membuktikan sebaliknya.
```

---

## 2026-05-18 — V5.8 Next Plan

V5.8 tidak langsung ACT. V5.8 harus dimulai dengan PLAN Cline yang membaca file berikut:

```text
backend/src/modules/public/public.controller.ts
backend/src/modules/public/public.service.ts
backend/src/modules/public/public.module.ts
backend/src/modules/checkout-requests/checkout-requests.module.ts
backend/src/modules/renew-requests/renew-requests.service.ts
backend/src/modules/stays/stays.service.ts
backend/src/app.module.ts
backend/nest-cli.json
backend/tsconfig.json
frontend/src/App.tsx
frontend/src/pages/rooms/RoomsRouteEntry.tsx
frontend/src/pages/rooms/PublicRoomDetailPage.tsx
frontend/src/api/public.ts
```

V5.8 PLAN must produce:

1. Public module verification.
2. Checkout dead import cleanup plan.
3. KB-1 patch plan.
4. KB-2 patch plan.
5. Marketing-api extraction plan.
6. Recommended ACT order.

Likely split after PLAN:

```text
V5.8-A: dead import cleanup + KB-1 + KB-2
V5.8-B: marketing-api extraction plan/shell
V5.8-C: workspace/shared skeleton plan
```

---

## 2026-05-18 — Multi-App Shared-DB Architecture Planning

### Konteks

Setelah audit awal, ditemukan bahwa coupling backend lebih rendah dari yang terlihat. Banyak modul terutama bergantung pada `PrismaService` dan `AuditLogService`, tetapi high-risk lifecycle flows tetap terpusat pada `StaysService`, `TenantBookingsService`, `PaymentSubmissionsService`, dan `RenewRequestsService`.

### Keputusan arah

Arah baru adalah **Multi-App Shared-DB Architecture**:

```text
- bukan rewrite total
- bukan pure microservices
- bukan separate DB dulu
- shared PostgreSQL tetap dipakai
- PrismaService menjadi shared lib nanti
- migration style: greenfield shell + brownfield logic extraction
```

### Koreksi boundary penting

1. `PaymentSubmission.approveSubmission()` mutasi banyak model dan harus tetap core.
2. `RenewRequestsService.approveRequest()` inject `StaysService`, sehingga admin approve/execution tidak boleh keluar dari core.
3. `CheckoutRequestsService` tenant create/view safe untuk tenant-api later, tetapi admin processing tetap core.
4. `owner-api` ditunda karena berpotensi menjadi mini-monolith kedua.

---

## Historical Journal Notes

### 2026-05-11 — Business Lifecycle Audit & Blueprint

Dulu ditemukan gap manual check-in: invoice awal masih `DRAFT` dan portal belum auto-created. Gap ini sekarang sudah diimplementasikan menurut audit V5.7-B melalui commit `d1a7181` dan hardening V5.1–V5.2.

### 2026-05-09 — Local Stabilization, UX Flow, and DB Reset Context

Full checkout UAT baseline pernah PASS:

1. Tenant mengajukan Pengajuan Keluar Kamar.
2. Admin Setujui Rencana.
3. Tenant tetap menghuni.
4. Admin Checkout Final.
5. Stay completed, room available.

Setelah KB-2 nanti, checkout final perlu UAT ulang karena guard open invoice akan berubah.

### 2026-04-28 — Phase 4.3-G2 Fresh UAT PASS

Pending meter snapshot flow PASS:

- Approve booking creates pending snapshot only.
- Payment approval promotes snapshot to 2 `MeterReading` rows.
- Expire reserved clears snapshot.
- Expire occupied rejected 409.

### 2026-05-04 — Production Connection PASS

Production handoff pernah PASS:

- `app.kost48surabaya.com` connected to `api.kost48surabaya.com/api`.
- Admin login production PASS.
- Protected notification endpoint PASS.
- Reminder preview endpoint PASS.

Hotfix langsung ke production `dist` tetap emergency-only.
