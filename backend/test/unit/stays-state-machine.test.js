'use strict';
/**
 * Unit test: Stay state machine — helpers & guards
 * Cakupan: stays-service-helpers.ts (isMeterInvoice, invoiceRemainingRupiah,
 *   computeMeterDepositSettlement, computeInvoiceDepositSettlement)
 *   + stays.helpers.ts (normalizeStayForResponse, startOfDay, addDays,
 *   calculatePeriodEnd, maxDate)
 *
 * Prasyarat build: npm run build (mengisi dist/).
 */
const test = require('node:test');
const assert = require('node:assert');
const { ForbiddenException } = require('@nestjs/common');
const HELPERS = require('../../dist/modules/stays/stays-service-helpers.js');
const STAY_HELPERS = require('../../dist/modules/stays/stays.helpers.js');

// ════════════════════════════════════════════════════════════════════════════
// 1. isMeterInvoice
// ════════════════════════════════════════════════════════════════════════════

test('SS-T01: isMeterInvoice — semua baris ELECTRICITY → true', () => {
  const invoice = {
    lines: [
      { lineType: 'ELECTRICITY' },
      { lineType: 'ELECTRICITY' },
    ],
  };
  assert.strictEqual(HELPERS.isMeterInvoice(invoice), true);
});

test('SS-T02: isMeterInvoice — campuran ELECTRICITY + WATER → true', () => {
  const invoice = {
    lines: [
      { lineType: 'ELECTRICITY' },
      { lineType: 'WATER' },
    ],
  };
  assert.strictEqual(HELPERS.isMeterInvoice(invoice), true);
});

test('SS-T03: isMeterInvoice — ada baris RENT → false', () => {
  const invoice = {
    lines: [
      { lineType: 'ELECTRICITY' },
      { lineType: 'RENT' },
    ],
  };
  assert.strictEqual(HELPERS.isMeterInvoice(invoice), false);
});

test('SS-T04: isMeterInvoice — lines kosong → false', () => {
  const invoice = { lines: [] };
  assert.strictEqual(HELPERS.isMeterInvoice(invoice), false);
});

test('SS-T05: isMeterInvoice — lines null/undefined → false', () => {
  assert.strictEqual(HELPERS.isMeterInvoice({ lines: null }), false);
  assert.strictEqual(HELPERS.isMeterInvoice({}), false);
});

// ════════════════════════════════════════════════════════════════════════════
// 2. invoiceRemainingRupiah
// ════════════════════════════════════════════════════════════════════════════

test('SS-T06: invoiceRemainingRupiah — total 1jt, bayar 0 → 1jt', () => {
  const invoice = { totalAmountRupiah: 1000000, payments: [] };
  assert.strictEqual(HELPERS.invoiceRemainingRupiah(invoice), 1000000);
});

test('SS-T07: invoiceRemainingRupiah — total 1jt, bayar 600rb → 400rb', () => {
  const invoice = { totalAmountRupiah: 1000000, payments: [{ amountRupiah: 600000 }] };
  assert.strictEqual(HELPERS.invoiceRemainingRupiah(invoice), 400000);
});

test('SS-T08: invoiceRemainingRupiah — total 1jt, bayar 1,2jt → 0 (clamp)', () => {
  const invoice = { totalAmountRupiah: 1000000, payments: [{ amountRupiah: 800000 }, { amountRupiah: 400000 }] };
  assert.strictEqual(HELPERS.invoiceRemainingRupiah(invoice), 0);
});

test('SS-T09: invoiceRemainingRupiah — total null → 0', () => {
  const invoice = { totalAmountRupiah: null, payments: [] };
  assert.strictEqual(HELPERS.invoiceRemainingRupiah(invoice), 0);
});

test('SS-T10: invoiceRemainingRupiah — payment null amount → diabaikan', () => {
  const invoice = { totalAmountRupiah: 500000, payments: [{ amountRupiah: null }, { amountRupiah: 200000 }] };
  assert.strictEqual(HELPERS.invoiceRemainingRupiah(invoice), 300000);
});

// ════════════════════════════════════════════════════════════════════════════
// 3. computeMeterDepositSettlement (M5.3 settlement math)
// ════════════════════════════════════════════════════════════════════════════

test('SS-T11: computeMeterDepositSettlement — tagihan 0, deposit 500rb → applied=0, excess=500rb', () => {
  const result = HELPERS.computeMeterDepositSettlement({ meterDueRupiah: 0, depositHeldRupiah: 500000 });
  assert.strictEqual(result.applied, 0);
  assert.strictEqual(result.excess, 500000);
  assert.strictEqual(result.shortfall, 0);
});

test('SS-T12: computeMeterDepositSettlement — tagihan 200rb, deposit 500rb → applied=200rb, excess=300rb', () => {
  const result = HELPERS.computeMeterDepositSettlement({ meterDueRupiah: 200000, depositHeldRupiah: 500000 });
  assert.strictEqual(result.applied, 200000);
  assert.strictEqual(result.excess, 300000);
  assert.strictEqual(result.shortfall, 0);
});

test('SS-T13: computeMeterDepositSettlement — tagihan 800rb, deposit 500rb → applied=500rb, excess=0, shortfall=300rb', () => {
  const result = HELPERS.computeMeterDepositSettlement({ meterDueRupiah: 800000, depositHeldRupiah: 500000 });
  assert.strictEqual(result.applied, 500000);
  assert.strictEqual(result.excess, 0);
  assert.strictEqual(result.shortfall, 300000);
});

test('SS-T14: computeMeterDepositSettlement — keduanya 0 → semua 0', () => {
  const result = HELPERS.computeMeterDepositSettlement({ meterDueRupiah: 0, depositHeldRupiah: 0 });
  assert.strictEqual(result.applied, 0);
  assert.strictEqual(result.excess, 0);
  assert.strictEqual(result.shortfall, 0);
});

test('SS-T15: computeMeterDepositSettlement — nilai negatif di-clamp ke 0', () => {
  const result = HELPERS.computeMeterDepositSettlement({ meterDueRupiah: -100000, depositHeldRupiah: -50000 });
  assert.strictEqual(result.meterDue, 0);
  assert.strictEqual(result.depositHeld, 0);
  assert.strictEqual(result.applied, 0);
  assert.strictEqual(result.excess, 0);
  assert.strictEqual(result.shortfall, 0);
});

// ════════════════════════════════════════════════════════════════════════════
// 4. computeInvoiceDepositSettlement (wrapper)
// ════════════════════════════════════════════════════════════════════════════

test('SS-T16: computeInvoiceDepositSettlement — wrapper mapping field names', () => {
  const result = HELPERS.computeInvoiceDepositSettlement({ invoiceDueRupiah: 300000, depositHeldRupiah: 200000 });
  assert.strictEqual(result.invoiceDue, 300000);
  assert.strictEqual(result.depositHeld, 200000);
  assert.strictEqual(result.applied, 200000);
  assert.strictEqual(result.excess, 0);
  assert.strictEqual(result.shortfall, 100000);
});

// ════════════════════════════════════════════════════════════════════════════
// 5. normalizeStayForResponse
// ════════════════════════════════════════════════════════════════════════════

test('SS-T17: normalizeStayForResponse — stay CANCELLED dg cancelReason → tampilkan cancelReason', () => {
  const stay = { id: 1, status: 'CANCELLED', cancelReason: 'Mengundurkan diri' };
  const result = STAY_HELPERS.normalizeStayForResponse(stay);
  assert.strictEqual(result.cancelReason, 'Mengundurkan diri');
});

test('SS-T18: normalizeStayForResponse — stay CANCELLED tanpa cancelReason → pakai checkoutReason', () => {
  const stay = { id: 1, status: 'CANCELLED', checkoutReason: 'Pindah kost' };
  const result = STAY_HELPERS.normalizeStayForResponse(stay);
  assert.strictEqual(result.cancelReason, 'Pindah kost');
});

test('SS-T19: normalizeStayForResponse — stay ACTIVE → cancelReason tetap diisi (hanya fallback checkoutReason untuk CANCELLED)', () => {
  const stay = { id: 1, status: 'ACTIVE', cancelReason: 'Lama', checkoutReason: 'Pindah' };
  const result = STAY_HELPERS.normalizeStayForResponse(stay);
  assert.strictEqual(result.cancelReason, 'Lama');
});

test('SS-T20: normalizeStayForResponse — stay COMPLETED → cancelReason = null', () => {
  const stay = { id: 1, status: 'COMPLETED' };
  const result = STAY_HELPERS.normalizeStayForResponse(stay);
  assert.strictEqual(result.cancelReason, null);
});

test('SS-T21: normalizeStayForResponse — spread properti tambahan tetap dipertahankan', () => {
  const stay = { id: 1, status: 'ACTIVE', room: { code: 'A-01' } };
  const result = STAY_HELPERS.normalizeStayForResponse(stay);
  assert.strictEqual(result.id, 1);
  assert.deepStrictEqual(result.room, { code: 'A-01' });
});

// ════════════════════════════════════════════════════════════════════════════
// 6. startOfDay
// ════════════════════════════════════════════════════════════════════════════

test('SS-T22: startOfDay — tanggal dengan jam → UTC midnight', () => {
  const input = new Date('2026-06-15T14:30:45.123Z');
  const result = STAY_HELPERS.startOfDay(input);
  assert.strictEqual(result.getUTCFullYear(), 2026);
  assert.strictEqual(result.getUTCMonth(), 5); // June = 5
  assert.strictEqual(result.getUTCDate(), 15);
  assert.strictEqual(result.getUTCHours(), 0);
  assert.strictEqual(result.getUTCMinutes(), 0);
  assert.strictEqual(result.getUTCSeconds(), 0);
  assert.strictEqual(result.getUTCMilliseconds(), 0);
});

test('SS-T23: startOfDay — input sudah midnight → tetap midnight', () => {
  const input = new Date('2026-06-15T00:00:00.000Z');
  const result = STAY_HELPERS.startOfDay(input);
  assert.strictEqual(result.getTime(), input.getTime());
});

// ════════════════════════════════════════════════════════════════════════════
// 7. addDays
// ════════════════════════════════════════════════════════════════════════════

test('SS-T24: addDays — +7 hari', () => {
  const input = new Date('2026-06-15T00:00:00.000Z');
  const result = STAY_HELPERS.addDays(input, 7);
  assert.strictEqual(result.getUTCFullYear(), 2026);
  assert.strictEqual(result.getUTCMonth(), 5);
  assert.strictEqual(result.getUTCDate(), 22);
});

test('SS-T25: addDays — melewati bulan', () => {
  const input = new Date('2026-06-28T00:00:00.000Z');
  const result = STAY_HELPERS.addDays(input, 7);
  assert.strictEqual(result.getUTCFullYear(), 2026);
  assert.strictEqual(result.getUTCMonth(), 6); // July = 6
  assert.strictEqual(result.getUTCDate(), 5);
});

test('SS-T26: addDays — 0 hari → sama', () => {
  const input = new Date('2026-06-15T00:00:00.000Z');
  const result = STAY_HELPERS.addDays(input, 0);
  assert.strictEqual(result.getTime(), input.getTime());
});

// ════════════════════════════════════════════════════════════════════════════
// 8. maxDate
// ════════════════════════════════════════════════════════════════════════════

test('SS-T27: maxDate — a > b → a', () => {
  const a = new Date('2026-07-01T00:00:00.000Z');
  const b = new Date('2026-06-01T00:00:00.000Z');
  assert.strictEqual(STAY_HELPERS.maxDate(a, b), a);
});

test('SS-T28: maxDate — b > a → b', () => {
  const a = new Date('2026-06-01T00:00:00.000Z');
  const b = new Date('2026-07-01T00:00:00.000Z');
  assert.strictEqual(STAY_HELPERS.maxDate(a, b), b);
});

test('SS-T29: maxDate — a === b → a', () => {
  const a = new Date('2026-06-15T00:00:00.000Z');
  const b = new Date('2026-06-15T00:00:00.000Z');
  assert.strictEqual(STAY_HELPERS.maxDate(a, b), a);
});

// ════════════════════════════════════════════════════════════════════════════
// 9. calculatePeriodEnd (6 pricing terms)
// ════════════════════════════════════════════════════════════════════════════

test('SS-T30: calculatePeriodEnd — DAILY → +1 hari', () => {
  const checkIn = new Date('2026-06-15T00:00:00.000Z');
  const result = STAY_HELPERS.calculatePeriodEnd(checkIn, 'DAILY');
  assert.strictEqual(result.getUTCDate(), 16);
});

test('SS-T31: calculatePeriodEnd — WEEKLY → +7 hari', () => {
  const checkIn = new Date('2026-06-15T00:00:00.000Z');
  const result = STAY_HELPERS.calculatePeriodEnd(checkIn, 'WEEKLY');
  assert.strictEqual(result.getUTCDate(), 22);
});

test('SS-T32: calculatePeriodEnd — BIWEEKLY → +14 hari', () => {
  const checkIn = new Date('2026-06-15T00:00:00.000Z');
  const result = STAY_HELPERS.calculatePeriodEnd(checkIn, 'BIWEEKLY');
  assert.strictEqual(result.getUTCDate(), 29);
});

test('SS-T33: calculatePeriodEnd — MONTHLY → +1 bulan (clamped)', () => {
  const checkIn = new Date('2026-01-31T00:00:00.000Z');
  const result = STAY_HELPERS.calculatePeriodEnd(checkIn, 'MONTHLY');
  // 31 Jan + 1 bulan → 28 Feb (clamped)
  assert.strictEqual(result.getUTCFullYear(), 2026);
  assert.strictEqual(result.getUTCMonth(), 1); // Feb = 1
  assert.strictEqual(result.getUTCDate(), 28);
});

test('SS-T34: calculatePeriodEnd — SMESTERLY → +6 bulan', () => {
  const checkIn = new Date('2026-01-15T00:00:00.000Z');
  const result = STAY_HELPERS.calculatePeriodEnd(checkIn, 'SMESTERLY');
  assert.strictEqual(result.getUTCMonth(), 6); // July = 6
  assert.strictEqual(result.getUTCDate(), 15);
});

test('SS-T35: calculatePeriodEnd — YEARLY → +12 bulan', () => {
  const checkIn = new Date('2026-01-15T00:00:00.000Z');
  const result = STAY_HELPERS.calculatePeriodEnd(checkIn, 'YEARLY');
  assert.strictEqual(result.getUTCFullYear(), 2027);
  assert.strictEqual(result.getUTCMonth(), 0); // January = 0
  assert.strictEqual(result.getUTCDate(), 15);
});

test('SS-T36: calculatePeriodEnd — dengan plannedCheckOutDate → override term', () => {
  const checkIn = new Date('2026-06-15T00:00:00.000Z');
  const planned = new Date('2026-09-01T00:00:00.000Z');
  const result = STAY_HELPERS.calculatePeriodEnd(checkIn, 'MONTHLY', planned);
  assert.strictEqual(result.getUTCMonth(), 8); // September = 8
  assert.strictEqual(result.getUTCDate(), 1);
});

test('SS-T37: calculatePeriodEnd — MONTHLY 31 Jan + 1 bulan → 28 Feb (tahun non-kabisat)', () => {
  const checkIn = new Date('2025-01-31T00:00:00.000Z');
  const result = STAY_HELPERS.calculatePeriodEnd(checkIn, 'MONTHLY');
  assert.strictEqual(result.getUTCMonth(), 1); // Feb = 1
  assert.strictEqual(result.getUTCDate(), 28);
});

// ════════════════════════════════════════════════════════════════════════════
// 10. assertCoreLifecycleActor — guard role
// ════════════════════════════════════════════════════════════════════════════

test('SS-T38: assertCoreLifecycleActor — OWNER boleh', () => {
  const actor = { id: 1, role: 'OWNER', tenantId: null };
  assert.doesNotThrow(() => HELPERS.assertCoreLifecycleActor(actor, 'Test'));
});

test('SS-T39: assertCoreLifecycleActor — ADMIN boleh', () => {
  const actor = { id: 2, role: 'ADMIN', tenantId: null };
  assert.doesNotThrow(() => HELPERS.assertCoreLifecycleActor(actor, 'Test'));
});

test('SS-T40: assertCoreLifecycleActor — STAFF ditolak', () => {
  const actor = { id: 3, role: 'STAFF', tenantId: null };
  assert.throws(
    () => HELPERS.assertCoreLifecycleActor(actor, 'Membatalkan'),
    (err) => err instanceof ForbiddenException && err.message.includes('hanya boleh dilakukan oleh owner/admin'),
  );
});

test('SS-T41: assertCoreLifecycleActor — TENANT ditolak', () => {
  const actor = { id: 10, role: 'TENANT', tenantId: 7 };
  assert.throws(
    () => HELPERS.assertCoreLifecycleActor(actor, 'Force checkout'),
    (err) => err instanceof ForbiddenException,
  );
});
