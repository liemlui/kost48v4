# KOST48 V5 — Project Journal
**Versi:** 2026-05-19 V5.13 release readiness journal sync

## 2026-05-19 — V5.10-A Local Smoke Context

User reported smoke API success after local build/runtime work:

- public rooms OK,
- admin login OK,
- notifications OK,
- payment review queue OK.

This is runtime smoke evidence, not full UAT for all touched flows.

## 2026-05-19 — V5.10-B Renew Request Hardening

Renew request contract was hardened:

- backend approve DTO accepts planned checkout override,
- backend approve DTO accepts agreed rent override,
- backend approve DTO accepts review notes,
- tenant create DTO accepts optional requested checkout date,
- admin frontend payload type now matches backend,
- admin renew approval modal supports optional approval note,
- approval uses DB row lock on `RenewRequest`,
- stay extension + invoice issue + request approval execute in one DB transaction.

Intent:

```text
Prevent whitelist 400 caused by frontend sending plannedCheckOutDate.
Reduce double-approval/race risk.
Keep renew lifecycle execution in core monolith.
```

## 2026-05-19 — V5.10-C/D Boundary Hardening

Staff/finance-sensitive write boundaries were tightened:

- meter readings: STAFF read, OWNER/ADMIN write,
- expenses: STAFF read, OWNER/ADMIN write/delete,
- wifi sales: STAFF read, OWNER/ADMIN write/delete.

Payment approval, invoice mutation, invoice payment mutation remain OWNER/ADMIN core.

## 2026-05-19 — V5.10-E Docs Sync

The 7 active docs were rewritten/synced to:

- Stable Modular Monolith as active architecture,
- Multi-app as future roadmap only,
- V5.10 as current phase,
- V5.10-B/C/D boundaries and UAT checklist.

## Historical Notes

V5.8-A business guards remain active:

- renewal invoice is `ISSUED`,
- checkout final blocked by open invoice,
- DRAFT blocks checkout,
- no auto-create final utility invoice in complete.

V5.9 multi-app attempt remains rollback lesson:

- do not generate apps yet,
- do not mirror runtime aliases,
- do not split before monolith boundary gates pass.


## 2026-05-19 — V5.11 Checkout Filter + Regression Pack

### Konteks

Setelah V5.10-B/C/D/E/F smoke lokal berjalan aman, fase berikutnya difokuskan ke regression pack dan satu optimasi kecil yang sudah ditemukan pada audit frontend: `StayDetailPage` sebelumnya mengambil semua checkout requests dengan status tertentu, lalu memfilter di client untuk satu stay.

### Perubahan

1. Admin checkout request endpoint menerima optional `stayId` filter.
2. `StayDetailPage` memakai filter `stayId` untuk query pending/approved checkout request.
3. Ditambahkan dua script UAT PowerShell:
   - smoke umum,
   - staff boundary regression.

### Catatan

Tidak ada schema change, DB reset, multi-app shell, workspace migration, atau lifecycle write extraction.


## 2026-05-19 — V5.12 Renew + Checkout Full Business UAT Pack

V5.12 adds repeatable UAT scripts for the business-critical flows that must stay stable before any future extraction roadmap is reconsidered.

Added scripts:

```text
scripts/uat/KOST48_V512_RENEW_UAT.ps1
scripts/uat/KOST48_V512_CHECKOUT_GUARD_UAT.ps1
scripts/uat/KOST48_V512_PAYMENT_REGRESSION.ps1
scripts/uat/KOST48_V512_FULL_REGRESSION.ps1
```

The scripts create isolated UAT tenant/room/stay data and verify behavior through API calls only. No DB reset is performed.

Coverage:

- renew request creation and approval,
- renewal invoice `ISSUED`,
- double approval 409,
- checkout final blocked by open invoice,
- checkout final succeeds after invoice payment,
- room release to `AVAILABLE`,
- invoice payment partial/paid/overpay behavior.
## 2026-05-19 — V5.12 Full Regression PASS + Push

User local UAT reported:

- Renew full UAT PASS.
- Checkout guard UAT PASS.
- Payment regression PASS.
- Full regression pack PASS.
- Commit `e93c78a` pushed to `main`.

This establishes `e93c78a` as the current stable modular monolith baseline before V5.13 release readiness.

## 2026-05-19 — V5.13 Release Readiness Pack

V5.13 adds release/deploy support scripts and docs only:

- local release check,
- production-safe smoke,
- source-lite ZIP creator,
- docs baseline sync.

No feature code, schema, DB reset, or multi-app work is included.
