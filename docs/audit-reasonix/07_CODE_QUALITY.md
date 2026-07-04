# 07 — CODE QUALITY & ERROR HANDLING (22 temuan)

---

## 🟠 Error Handling: `Error` Biasa, Bukan `HttpException` (5+ file)

| File | Line | Issue |
|------|------|-------|
| `deepseek.client.ts` | 67,75,96,108 | `throw new Error(...)` — semua 500, termasuk missing API key (seharusnya 400) |
| `auth.service.ts` | 259 | `throw new Error(\`Brevo API error ${response.status}: ${body}\`)` — leak response body |
| `room-code.helper.ts` | 29,33 | `throw new Error(\`Floor must be between 1 and 26...\`)` — seharusnya BadRequestException |
| `push.service.ts` | 146-153 | `Number(error?.statusCode)` → NaN, subscription tidak pernah deactivated |

**Fix:** Ganti semua `throw new Error(...)` dengan `HttpException` yang sesuai.

---

## 🟡 N+1 Queries (3 lokasi)

| File | Line | Issue |
|------|------|-------|
| `staff-assignment.util.ts` | 57-68 | Loop staf → `ticket.count()` per staf |
| `maintenance-sweep.service.ts` | 68-75 | Loop room → `ticket.findFirst()` per room |
| `surveys.service.ts` | 35-57 | `findMany()` tanpa pagination/limit — load semua row |

**Fix:** `groupBy` untuk staff assignment, single query `WHERE roomId IN (...)` untuk maintenance, pagination untuk surveys.

---

## 🟡 `expenses.service.ts` — `where: any`

**File:** `backend/src/modules/expenses/expenses.service.ts:28`

```typescript
const where: any = { AND: [...] };
```
Typo `desciption` bukannya `description` → compile fine, query salah.

---

## 🟡 `accounting-readiness.service.ts` — Stringly-Typed Model

**File:** `backend/src/modules/accounting/accounting-readiness.service.ts:61-63`

```typescript
return (this.prisma as any)[modelName];
```
Typo di `modelName` → `undefined.count()` → crash.

---

## 🟡 `push.service.ts` — NaN dari `Number(undefined)`

**File:** `backend/src/modules/push/push.service.ts:146-153`

```typescript
const status = Number(error?.statusCode);  // NaN kalau error network
if (status === 404 || status === 410) { ... }  // tidak pernah true
```

---

## 🟡 `reminder-mock.service.ts` — `String(error)` Hilang Stack Trace

**File:** `backend/src/modules/notifications/reminder-mock.service.ts:74`

```typescript
meta: { error: String(error) },
```
Stack trace hilang untuk debugging.

---

## 🟡 `staff-performance.service.ts` — `monthRange()` WIB Offset Salah

**File:** `backend/src/modules/staff-performance/staff-performance.service.ts:23-25`

```typescript
const start = new Date(Date.UTC(year, mon0, 1) - 7 * 60 * 60 * 1000);
```
`Date.UTC(...) - 7 jam` bukan "WIB midnight". Hari pertama/terakhir bisa partially excluded.

---

## 🟡 `dateOnly()` — 4 Implementasi Berbeda (DUPLICATE)

1. `accounting.service.ts:20-24` — `setUTCHours(0,0,0,0)`
2. `accounting-posting-helpers.ts:7-11` — WIB-aware (+7h)
3. `accounting-period-close.service.ts:43-46` — `setUTCHours(0,0,0,0)`
4. `accounting-readiness.service.ts:37-41` — `Date.UTC(parsed.getUTCFullYear(), ...)`

**Fix:** Buat satu `dateOnlyWib()` di `common/utils/`.

---

## 🟢 Seed Issues (4 temuan)

| # | File | Issue |
|---|------|-------|
| L12 | `seed-dev-via-api.js:26` | `ymd()` pakai `toISOString()` — UTC, bisa salah di WIB pagi |
| L13 | `seed-dev-reset.js:70` | Hardcode `Y = 2026` — expired setelah Des 2026 |
| L14 | `seed-dev-reset.js:64` | `require('../dist/...')` — crash kalau belum build |
| L15 | `seed-dev-via-api.js:28` | `addMonths` pakai `setMonth()` — 31 Jan + 1 = 3 Mar |

---

## 🟢 `parseInt` / `Number()` pada Query Params — NaN Silent

**File:** Multiple controllers yang parse query params

`parseInt(page as string, 10)` tanpa fallback → NaN → query aneh. Beberapa endpoint sudah pakai `Number(page) || 1`, tapi tidak konsisten.

---

## 🟢 `InvoicePaymentsService` — TOCTOU Journal Check

**File:** `backend/src/modules/invoice-payments/invoice-payments.service.ts:43-47`

```typescript
const journal = await this.findActivePaymentJournal(id, tx);
this.assertNoActivePaymentJournal(id, journal);
```
Dalam transaksi tapi tanpa lock di journal entry. P2002 handler menangkap, tapi pola kurang bersih.

---

## 🟢 `UpdateInvoiceDto` / `UpdateInvoiceLineDto` — Semua Field Optional Tanpa Partial

Tidak pakai `PartialType()` dari NestJS — definisi ulang manual. Rentan drift kalau Create DTO berubah.

---

## 🟢 Delete Endpoint Tanpa Konfirmasi Cascade

Beberapa endpoint delete (`DELETE /invoices/:id`, `DELETE /tickets/:id`) tidak mengecek apakah ada data terkait (payments, journal entries) sebelum delete. Bergantung pada Prisma cascade atau foreign key constraint.

---

## 🟢 `CreateBackofficeTicketDto` — `category` Optional di DTO tapi Required di Service

**File:** `ticket.dto.ts:74-77` vs `tickets.service.ts:348-350`

DTO: `@IsOptional() category?`  
Service: `if (actor.role === 'STAFF' && !dto.category) throw new ConflictException(...)`

Validasi misaligned — DTO izinkan, service tolak.

---

## 🟢 Swagger: Nol `@ApiOperation` di Semua Endpoint (~40+ endpoint)

Semua controller hanya punya `@ApiTags` dan `@ApiBearerAuth` — tidak ada operation-level docs.

---

## 🟢 DTO Tanpa `@ApiProperty` (3 file)

| File | Jumlah DTO |
|------|-----------|
| `invoices/dto/invoice.dto.ts` | 6 DTO, 0 @ApiProperty |
| `stays/dto/stay.dto.ts` | 9 DTO, 0 @ApiProperty |
| `stays/dto/room-transfer.dto.ts` | 2 DTO, 0 @ApiProperty |

---

## 🟢 Dead Code / Commented Out

Tidak ditemukan blok besar commented-out code. Tapi beberapa file punya komentar `// TODO` atau `// FIXME` tanpa ticket tracking.

---

## 🟢 `as any` Cast

| File | Issue |
|------|-------|
| `meter-readings.service.ts:294` | `lines: lines as any` — bypass type safety |
| `tickets.service.ts` | `(t as any).createdAt` — beberapa tempat |
| `accounting-readiness.service.ts:61` | `(this.prisma as any)[modelName]` |

---
