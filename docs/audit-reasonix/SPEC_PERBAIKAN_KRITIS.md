# 🔴 SPEC PERBAIKAN — 6 Bug Kritis (Reasonix Audit)

> **Eksekutor:** AI apa pun, termasuk model lemah. **Baca file ini SAMPAI HABIS sebelum mengedit.**
> **Sumber:** `docs/audit-reasonix/01_FINANSIAL_PERHITUNGAN.md` — temuan C1 s/d C6
> **Aturan:** 1 task = 1 commit. Pesan commit Bahasa Indonesia. Build HARUS lulus tiap task.

---

## ⚠️ ATURAN WAJIB

1. **Dilarang:** tambah dependency npm · ubah `schema.prisma` · `git push` · sentuh DB produksi port 5432.
2. **Gate build tiap task:** `npx --prefix backend tsc --noEmit --project backend/tsconfig.json`
3. **Cari kode dengan Grep dulu** — nomor baris di spec ini bisa bergeser. Kalau kutipan SEBELUM tidak ketemu persis → STOP, laporkan.
4. Selesai 1 task → centang `[x]` di M10 § Fase AL + prepend 1 baris di M11.

---

## AL-FIX-1 🔴 DISCOUNT Line → Journal Tidak Terposting

### Konteks
Invoice dengan line `DISCOUNT` tidak punya journal entry karena `revenueCodeForInvoiceLine()` tidak mengenali tipe `DISCOUNT` → jatuh ke default `'4300'`. Amount DISCOUNT disimpan POSITIF di DB, tapi `postInvoiceIssuedTx` tidak menandainya sebagai negatif. Hasil: Σdebit ≠ Σkredit → `postBalancedJournalTx` reject silently.

### Langkah

**File:** `backend/src/modules/accounting/accounting-posting-helpers.ts`

1. Cari fungsi `revenueCodeForInvoiceLine` (Grep `revenueCodeForInvoiceLine`).
2. Di dalam switch/case atau if-else chain, **tambah case** untuk `DISCOUNT`:

   **SEBELUM** (cari pola yang ada, misal):
   ```typescript
   case 'SERVICE':
   case 'WIFI':
     return '4200';
   default:
     return '4300';
   ```
   
   **SESUDAH** (tambah sebelum default):
   ```typescript
   case 'DISCOUNT':
     return '4010'; // Contra-revenue — Sales Discount
   case 'SERVICE':
   case 'WIFI':
     return '4200';
   default:
     return '4300';
   ```

**File:** `backend/src/modules/accounting/accounting-posting.service.ts`

3. Cari fungsi `postInvoiceIssuedTx`. Cari baris yang mengecek `isDiscountOrNegative`:
   ```typescript
   const isDiscountOrNegative = amount < 0;
   ```
   
4. **Tambah kondisi** — akun contra-revenue (4010) juga harus diperlakukan seperti diskon (debit, bukan credit):

   **SEBELUM:**
   ```typescript
   const isDiscountOrNegative = amount < 0;
   ```
   
   **SESUDAH:**
   ```typescript
   const isDiscountOrNegative = amount < 0 || coaCode === '4010';
   ```

5. **Verifikasi** — cari di fungsi yang sama, pastikan line DISCOUNT diposting sebagai DEBIT (bukan credit). Kalau ada logika terbalik, sesuaikan.

### Gate
- `npx --prefix backend tsc --noEmit --project backend/tsconfig.json` → HARUS 0 error
- Unit test: `cd backend; npm run test:unit` → tidak regression
- **Manual:** Buat invoice dengan line DISCOUNT via API, cek journal entry terposting + Trial Balance tetap balanced.

---

## AL-FIX-2 🔴 Overdue Aging — Gross → Net

### Konteks
`reports.service.ts` method `overdueAging()` pakai `totalAmountRupiah` penuh, tidak mengurangi pembayaran yang sudah dilakukan. Invoice PARTIAL tetap dihitung 100%.

### Langkah

**File:** `backend/src/modules/reports/reports.service.ts`

1. Cari method `overdueAging` (Grep `async overdueAging`).
2. Cari query `prisma.invoice.findMany` di dalam method tersebut. Tambah `include` atau `select` untuk payments:

   **SEBELUM:**
   ```typescript
   select: {
     id: true,
     dueDate: true,
     totalAmountRupiah: true,
     _count: { select: { payments: true } },
   },
   ```

   **SESUDAH:**
   ```typescript
   select: {
     id: true,
     dueDate: true,
     totalAmountRupiah: true,
     payments: { select: { amountRupiah: true } },
   },
   ```

3. Cari baris `const amount = Number(inv.totalAmountRupiah);` — ganti dengan:

   **SEBELUM:**
   ```typescript
   const amount = Number(inv.totalAmountRupiah);
   ```

   **SESUDAH:**
   ```typescript
   const paid = (inv as any).payments?.reduce((sum: number, p: any) => sum + Number(p.amountRupiah ?? 0), 0) ?? 0;
   const amount = Math.max(0, Number(inv.totalAmountRupiah) - paid);
   ```

### Gate
- Tsc ✅
- Verifikasi: panggil endpoint overdue aging, pastikan invoice PARTIAL dihitung dengan nilai sisa (bukan penuh).

---

## AL-FIX-3 🔴 Renewal Cross-Term — Re-multiply Sewa

### Konteks
Saat tenant renew dengan term BERBEDA (MONTHLY→YEARLY), `agreedRentAmountRupiah` monthly rate tidak dikalikan ulang. Sewa 12 bulan cuma dibayar 1 bulan.

### Langkah

**File:** `backend/src/modules/renew-requests/renew-requests.service.ts`

1. Cari method `approveRequest` (Grep `async approveRequest`).
2. Cari baris yang membuat `renewDto`:

   **SEBELUM:**
   ```typescript
   agreedRentAmountRupiah: currentStay?.agreedRentAmountRupiah ?? dto.agreedRentAmountRupiah,
   ```

3. **Tambah logika:** kalau `requestedTerm` berbeda dari `stay.pricingTerm`, re-multiply:

   **SESUDAH:**
   ```typescript
   agreedRentAmountRupiah: (() => {
     const currentRent = currentStay?.agreedRentAmountRupiah ?? dto.agreedRentAmountRupiah ?? 0;
     if (!request.requestedTerm || request.requestedTerm === currentStay?.pricingTerm) return currentRent;
     // AL-FIX-3: re-multiply kalau term berubah (MONTHLY→YEARLY dll)
     const { PRICING_MULTIPLIERS } = require('../../tenant-bookings/pricing.helper');
     const oldMult = PRICING_MULTIPLIERS[currentStay?.pricingTerm as keyof typeof PRICING_MULTIPLIERS] ?? 1;
     const newMult = PRICING_MULTIPLIERS[request.requestedTerm as keyof typeof PRICING_MULTIPLIERS] ?? 1;
     if (oldMult <= 0 || newMult <= 0) return currentRent;
     return Math.round((currentRent / oldMult) * newMult);
   })(),
   ```

   ⚠️ **CATATAN:** Kalau `PRICING_MULTIPLIERS` tidak di-export dari `pricing.helper.ts`, export dulu. Atau gunakan `calculateRentByPricingTerm` kalau ada fungsi yang lebih bersih.

4. **Alternatif lebih bersih** — cek apakah `pricing.helper.ts` punya fungsi `calculateRentByPricingTerm(monthlyRate, term)`:
   ```typescript
   agreedRentAmountRupiah: request.requestedTerm && request.requestedTerm !== currentStay?.pricingTerm
     ? calculateRentByPricingTerm(currentStay?.agreedRentAmountRupiah ?? 0, request.requestedTerm)
     : (currentStay?.agreedRentAmountRupiah ?? dto.agreedRentAmountRupiah),
   ```

### Gate
- Tsc ✅
- Unit test: `npm run test:unit` — tidak regression

---

## AL-FIX-4 🔴 Collection Rate — Samakan Jendela Waktu

### Konteks
`totalBilled` pakai `periodStart` (akrual), `totalPaid` pakai `paymentDate` (kas). Dua jendela berbeda → rate tidak akurat.

### Langkah

**File:** `backend/src/modules/finance/finance.service.ts`

1. Cari method `businessHealth` atau yang menghitung collection rate. Cari query `totalPaid`.
2. Ubah query `totalPaid` dari basis `paymentDate` menjadi basis `invoice.periodStart`:

   **SEBELUM** (cari pola `paymentDate` di query payment aggregate):
   ```typescript
   // Query payment: WHERE paymentDate BETWEEN start AND end
   ```
   
   **SESUDAH** (ganti ke join invoice):
   ```typescript
   // Query payment: WHERE invoice.periodStart BETWEEN start AND end
   // JOIN InvoicePayment → Invoice → filter periodStart
   ```
   
   ⚠️ **Ini perubahan query yang signifikan** — perlu rewrite query aggregate. Kalau terlalu kompleks, alternatif: ganti label dari "Collection Rate" menjadi "Penerimaan vs Tagihan Bulan Ini" agar tidak menyesatkan.

3. **File:** `backend/src/modules/reports/reports.service.ts` — cari `financialRatios`, lakukan perubahan yang sama.

### Gate
- Tsc ✅
- Unit test finance: pastikan tidak regression

---

## AL-FIX-5 🔴 Journal Pending — Tambah Retry Mechanism

### Konteks
Di `payment-submissions.service.ts`, kalau journal posting gagal, `catch` block swallow error + set `journalPending=true`. Tidak ada retry otomatis.

### Langkah

**File:** `backend/src/modules/payment-submissions/payment-submissions.service.ts`

1. Cari baris `catch (err) { journalPending = true; }` (Grep `journalPending = true`).
2. **Tambah AuditLog** sebelum swallow:

   **SEBELUM:**
   ```typescript
   } catch (err) {
     journalPending = true;
   }
   ```

   **SESUDAH:**
   ```typescript
   } catch (err) {
     journalPending = true;
     this.logger.error(`[AL-FIX-5] Journal posting gagal untuk payment submission #${submissionId}: ${String(err)}`);
     // TODO: retry mechanism — untuk sekarang, admin bisa trigger manual backfill via POST /accounting/backfill
   }
   ```

3. **Verifikasi** — pastikan `this.logger` ada (import Logger dari `@nestjs/common`). Kalau belum ada, tambah `private readonly logger = new Logger(PaymentSubmissionsService.name);`.

### Gate
- Tsc ✅

---

## AL-FIX-6 🔴 `@IsNumberString` vs JSON Number di CreateStayDto

### Konteks
`CreateStayDto.initialElectricityKwh` pakai `@IsNumberString` → tolak JSON number asli. Client harus kirim string `"1500"`, bukan `1500`. Ini membingungkan dan tidak standar.

### Langkah

**File:** `backend/src/modules/stays/dto/stay.dto.ts`

1. Cari `initialElectricityKwh` dan `initialWaterM3`.
2. Ganti validasi:

   **SEBELUM:**
   ```typescript
   @IsNotEmpty({ message: 'Meter awal listrik harus diisi' })
   @IsNumberString({}, { message: 'Meter awal listrik harus berupa angka' })
   initialElectricityKwh!: string;
   ```

   **SESUDAH:**
   ```typescript
   @IsNotEmpty({ message: 'Meter awal listrik harus diisi' })
   @Type(() => Number)
   @IsNumber({}, { message: 'Meter awal listrik harus berupa angka' })
   initialElectricityKwh!: number;
   ```

3. Lakukan hal yang sama untuk `initialWaterM3`.
4. **Cek service** — `StaysService.create()` pakai `new Prisma.Decimal(dto.initialElectricityKwh)`. Kalau nilai sekarang `number`, `Prisma.Decimal` tetap bisa menerima number. **Tidak perlu ubah service.**
5. Lakukan hal yang sama untuk `RenewStayDto` (`electricityReadingValue`, `waterReadingValue`).

### Gate
- Tsc ✅
- Test: buat request dengan JSON number `{"initialElectricityKwh": 1500}` → harus 201, bukan 400.

---

## GATE AKHIR

1. Semua 6 task tercentang `[x]` di M10 § Fase AL.
2. `cd backend; npm run test:unit` — tidak regression.
3. Trial Balance `isBalanced: true` setelah test.
4. Build FE + BE lulus.
