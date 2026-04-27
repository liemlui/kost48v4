# PATCH SUMMARY — 2026-04-27 Lifecycle Decision Freeze

## Scope

Dokumentasi ini memasukkan keputusan lifecycle terbaru terkait:

1. Announcement access untuk tenant booking vs occupied.
2. Timing pembuatan meter awal final.
3. Pending meter snapshot pada flow tenant booking.
4. Pemisahan deposit booking vs deposit pasca-checkout.
5. Urutan ACT berikutnya 4.3-G1 sampai 4.3-G4.

## Keputusan inti

- `MeterReading` final untuk tenant booking dibuat saat payment approved / room `OCCUPIED`.
- Approve booking menyimpan pending meter snapshot di `Stay`.
- Cancel/expired sebelum occupied membersihkan snapshot.
- Checkout occupied stay tidak menghapus histori.
- Announcement `TENANT` jangka pendek hanya untuk occupied tenants.
- Tenant non-occupied redirect dari `/portal/announcements` ke `/portal/bookings`.
- Stage-aware audience dan meter metadata dipindah ke long-term improvement.

## File diperbarui

- docs/00_GROUND_STATE.md
- docs/01_CONTRACTS.md
- docs/02_PLAN.md
- docs/03_DECISIONS_LOG.md
- docs/04_JOURNAL.md
- docs/05_V4_MASTER_PLAN.md
- docs/CHECKLIST.md
- docs/CURRENT_STATUS_2026-04-26.md
- docs/FINAL_FRONTEND_FEATURES.md
- docs/README_PROGRESS_UPDATE.md
- docs/CHANGELOG.md
- docs/CHANGELOG_BACKEND.md
- docs/PACKAGE_README_2026-04-27.md

## Next ACT

1. 4.3-G1 Announcement Access Guard.
2. 4.3-G2 Pending Meter Snapshot.
3. 4.3-G3 Legacy Meter Audit/Cleanup.
4. 4.3-G4 Optional metadata and stage-aware audience.
