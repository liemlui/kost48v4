# KOST48 Docs Update Package — 2026-04-27 Lifecycle Decision Patch

Paket ini memperbarui dokumen Markdown proyek sesuai keputusan terbaru setelah diskusi lifecycle meter/deposit/announcement.

## Keputusan baru yang masuk

- Untuk tenant booking flow, `MeterReading` final hanya dibuat saat payment approved dan room berubah `RESERVED -> OCCUPIED`.
- Approve booking tetap meminta admin mengisi meter awal, tetapi data disimpan sebagai pending meter snapshot di `Stay`.
- Booking cancel/expired sebelum `OCCUPIED` membersihkan pending snapshot, bukan menghapus histori meter operasional.
- Backoffice direct check-in tetap boleh langsung membuat `MeterReading` karena room langsung `OCCUPIED`.
- Deposit awal booking dan deposit pasca-checkout/refund tetap dipisah.
- Announcement audience `TENANT` jangka pendek hanya dikirim ke tenant dengan hunian aktif operasional.
- Tenant non-occupied yang membuka `/portal/announcements` harus diarahkan ke `/portal/bookings`.
- Stage-aware announcement audience dan metadata meter (`stayId`, `sourceType`, `isBaseline`) dicatat sebagai long-term improvement.
- WhatsApp/API provider, scheduler/cron, PWA push, SSE/websocket tetap deferred.

## Next ACT resmi

1. **4.3-G1 — Announcement Access Guard**
2. **4.3-G2 — Pending Meter Snapshot + Promote on Activation**
3. **4.3-G3 — Legacy Meter Audit/Cleanup**
4. **4.3-G4 — Optional Metadata + Stage-aware Audience**

## File yang diperbarui

- 00_GROUND_STATE.md
- 01_CONTRACTS.md
- 02_PLAN.md
- 03_DECISIONS_LOG.md
- 04_JOURNAL.md
- 05_V4_MASTER_PLAN.md
- CHECKLIST.md
- CURRENT_STATUS_2026-04-26.md
- FINAL_FRONTEND_FEATURES.md
- README_PROGRESS_UPDATE.md
- CHANGELOG.md
- CHANGELOG_BACKEND.md
- PACKAGE_README_2026-04-27.md
