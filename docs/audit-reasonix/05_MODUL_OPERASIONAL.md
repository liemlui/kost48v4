# 05 — MODUL OPERASIONAL: Inventory, Ticketing, AC, Staff (15 temuan)

---

## INVENTORY

### ✅ Stock Tak-Negatif (Double Guard)
`inventory-movements.service.ts:99-100`: `ensureInventoryQtySyncedTx` tolak `expectedQty < 0`
`inventory-movements.service.ts:140-141`: `validateMovement` tolak movement yang kurangi di bawah 0

### 🟡 `ADJUSTMENT` Enum — Tidak Usable
**File:** `backend/src/modules/inventory/inventory-movements.service.ts:137`

```typescript
throw new ConflictException('movementType tidak didukung');
```
Enum `ADJUSTMENT` ada di `app.enums.ts` tapi selalu ditolak. Tidak bisa write-off stok rusak.

### ✅ Room Item — Tidak Bisa Dibuat Langsung
`room-items.service.ts:102-103`: tolak direct create → harus lewat stock movement.

### ✅ Item-to-Room — Satu Item Bisa di Banyak Room
Model `RoomItem` dengan `(itemId, roomId)` — multiple rows per item dimungkinkan.

---

## TICKETING

### ✅ Lifecycle Guard Ketat
| Transisi | Dari | Ke | Validasi |
|----------|------|----|----------|
| start | OPEN | IN_PROGRESS | ✅ hanya dari OPEN |
| markDone | IN_PROGRESS | DONE | ✅ (vendor: OPEN→DONE) |
| close(CLOSE) | DONE | CLOSED | ✅ hanya dari DONE |
| close(CANCEL) | OPEN | CANCELLED | ✅ hanya dari OPEN |

### 🟠 H8: `CreatePortalTicketDto` — Category Tanpa Validasi
**File:** `backend/src/modules/tickets/dto/ticket.dto.ts:89-91`

```typescript
@IsOptional()
@IsString()
category?: string;  // BISA ARBITRARY STRING!
```
Tidak seperti `CreateBackofficeTicketDto` yang pakai `@IsIn(BACKOFFICE_TICKET_CATEGORIES)`. Bisa inject string sampah.

### 🟡 Category Optional DTO vs Required Service
**File:** `ticket.dto.ts:74-77` vs `tickets.service.ts:348-350`

DTO: `@IsOptional() category?` — Service: `if (!dto.category) throw ConflictException`. Validasi misaligned.

### 🟡 Tidak Ada Reopen (IN_PROGRESS → OPEN)
Tidak bisa undo assignment. By design tapi bisa menyulitkan.

### 🟡 `BARANG_HILANG` & `AC_CLEANING` — Di Luar Enum
`TicketCategory` enum tidak mencakup `BARANG_HILANG` (dipakai `room-items.service.ts:211`) dan `AC_CLEANING` (dipakai `maintenance-sweep.service.ts`). Tersimpan sebagai raw string.

### ✅ X-01 Fix: Ticket Internal Tersembunyi
`TENANT_HIDDEN_TICKET_CATEGORIES` di `app.enums.ts:39` + guard di `findMine`, `findOne`, `canAccessImage`. Maya cuma lihat 1 tiket miliknya.

### ✅ Photo Upload — Bekerja
DTO terima image metadata. `POST tickets/upload-image` untuk file. `markDone()`/`close()` terima resolution images.

### ✅ Tip — P2P, Idempotent
`acknowledgeTip()` + `confirmTip()` — guard double-tip.

### 🟡 Tidak Ada Workload Check Assignment
`assign()` tidak cek workload staf. By design ("dorman saat staf < 2").

---

## AC MAINTENANCE

### ✅ Hybrid Scheduling Benar
`ac-cleaning.helper.ts:59-69`: due = (never cleaned) OR (interval exceeded) OR (kWh threshold exceeded).

### ✅ kWh Estimation — Tanpa NaN
Default 400W, 8h. Formula: `Math.max(0, wattage) * Math.max(0, hours) / 1000`.

### 🟡 CLOSED Ticket → Duplikasi
`maintenance-sweep.service.ts:101-103`: cek `status IN ['OPEN','IN_PROGRESS','DONE']`. Kalau CLOSED/CANCELLED → buat baru. Normalnya tidak terjadi (close reset `acLastCleanedAt`), tapi kalau admin close manual bisa duplikat.

### 🟡 N+1 Query per Room
Loop room → `ticket.findFirst()` per room. Seharusnya satu query `WHERE roomId IN (...)`.

---

## STAFF ROUTINES & KPI

### ✅ HARIAN/MINGGUAN/BULANAN Benar
`staff-routines.service.ts:30-34`: DAILY always, WEEKLY match dayOfWeek, MONTHLY match dayOfMonth.

### ✅ Photo Evidence Enforced
`staff-routines.service.ts:253-255`: `requiresPhoto && status === DONE && !photoUrl` → tolak.

### ✅ KPI NaN-Safe
`rawScore = 100 + netKpi` → `Math.max(0, Math.min(100, rawScore))`. `avg()` return null. `safePercent()` guard division-by-zero.

### 🟡 `monthRange()` WIB Offset Salah
**File:** `backend/src/modules/staff-performance/staff-performance.service.ts:23-25`

`Date.UTC(year, mon0, 1) - 7 * 60 * 60 * 1000` bukan "WIB midnight". Hari pertama/terakhir bulan bisa partially excluded.

### ✅ N+1 Query: Staff Assignment
**File:** `backend/src/common/utils/staff-assignment.util.ts:57-68`

Loop staf → `ticket.count()` per staf. Seharusnya `groupBy`.

### ✅ "Risiko 84" — Rule-Based
Flag audit: tiket DONE/CLOSED tanpa `resolutionImageUrl`. Bukan AI. ✅ JB-08 compliant.
