# KOST48 V5 — Project Journal
**Versi:** 2026-05-22 V5.16-G Staff Repair Flow journal sync**

## 2026-05-22 — V5.16-G Staff Ticket List Hard Fix PASS

### Konteks

Setelah staff repair flow dipatch, ditemukan bug: staff report berhasil membuat ticket aktif dengan `assignedToId=3`, tetapi `GET /api/tickets?limit=20` sebagai staff sempat terlihat kosong.

Audit menunjukkan:
- Staff user benar: `id=3`, `role=STAFF`.
- Ticket baru benar: `OPEN`, `assignedToId=3`, `linkedRoomItemId=1`.
- Staff bisa `GET /api/tickets/:id` detail ticket.
- Masalah hanya list endpoint.

### Patch

V5.16-G memperbaiki `tickets.service.ts` supaya role STAFF punya branch query eksplisit:
- ticket assigned ke staff,
- atau ticket punya staffFieldReports yang dibuat oleh staff,
- default hanya `OPEN`, `IN_PROGRESS`, `DONE`.

### Verification

Manual UAT setelah patch:
- Staff membuat report room item 1.
- Admin melihat ticket baru:
  - `id=12`
  - `TIC-2026-0008`
  - `status=OPEN`
  - `assignedToId=3`
  - `roomId=1`
  - `linkedRoomItemId=1`
- Staff list menampilkan:
  - ticket #12 OPEN,
  - ticket #2 DONE,
  - ticket #1 OPEN.

Kesimpulan:

```text
V5.16-G Staff Ticket List Hard Fix = PASS secara manual UAT.
```

## 2026-05-21 — V5.16-D/E Staff Repair Flow Manual UAT

### Verified

- Staff report barang kamar:
  - applied temporary status `MAINTENANCE`,
  - `NEEDS_REPLACEMENT` stored for request replacement,
  - replacement request stored.
- Staff report gudang:
  - applied temporary status `PENDING_CHECK`,
  - `OUT_OF_STOCK` stored.
- Admin review:
  - `APPROVE` accepted,
  - report entered `IN_REPAIR`,
  - movement created,
  - stock decreased.
- `NEEDS_MORE_INFO` accepted.
- `REJECT` accepted.
- Ticket 7:
  - marked done,
  - closed with `finalInventoryItemStatus=OUT_OF_STOCK`.
- Ticket 6:
  - started,
  - marked done,
  - closed with `finalRoomItemStatus=GOOD`.
- Fresh linking:
  - ticket 9 had `linkedRoomItemId=1`,
  - ticket 8 had `linkedInventoryItemId=2`.

### Lesson

Some old ticket data can remain unlinked because it was created before V5.16-E. That is accepted as dev/UAT historical data. New reports after V5.16-E link correctly.

## 2026-05-21 — V5.16 Staff Repair Governance Direction

User identified a real business-flow problem:

```text
Tenant can report broken room item, but staff could also directly update item status to damaged.
This made staff look like final decision-maker.
```

Final decision:
- Staff reports/diagnoses only.
- Admin/owner confirms final item state.
- Inventory movement remains admin/owner.
- Staff UI must be simple and human-friendly.

## 2026-05-21 — V5.15 Direction Locked

V5.15 remains carry-forward after V5.16 staff flow stabilizes:
- Intelligent Command Center,
- rule-based assistant,
- assistant vs queue dedup,
- reports drill-down,
- smart chart switching,
- finance foundation,
- on-demand AI only.

## 2026-05-20 — V5.14 Command Center Direction Locked

User wanted the app to stop feeling like decorative dashboard/database viewer. Direction became:

```text
KOST48 Command Center
Asisten operasional kos yang mengubah data menjadi prioritas, rekomendasi, dan aksi.
```

V5.14 implemented frontend-first command center components:
- `AssistantPanel`
- `ActionQueueTable`
- `CompactMetrics`
- `BlockedReasonCard`
- `ReadinessChecklist`
- `LifecycleTimeline`
- `PeriodVisualizer`

## Historical Notes

- V5.12 full regression PASS and pushed earlier.
- V5.13 release readiness scripts/docs only.
- V5.14 Command Center frontend packages build PASS in patch environment.
- V5.15 docs/product direction synced.
- V5.16 staff flow became the active code stabilization track.
