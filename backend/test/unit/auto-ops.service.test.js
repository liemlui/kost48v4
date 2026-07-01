'use strict';

/**
 * Unit test: AutoOpsService — all sweep delegations + mutex + runAll
 *
 * Cakupan: Y-E1..Y-E6
 */
const test = require('node:test');
const assert = require('node:assert');
const { AutoOpsService } = require('../../dist/modules/auto-ops/auto-ops.service.js');

function makeSvc(overrides = {}) {
  const defaultBookingResult = { expiredStayIds: [], heldForPaymentReview: 0 };
  const defaultStayResult = { releasedRoomIds: [] };

  const bookingSweep = {
    runBookingExpiry: async () => defaultBookingResult,
    runDownPaymentForfeit: async () => defaultBookingResult,
    expiredBookingWhere: () => ({}),
    ...overrides.bookingSweep,
  };

  const staySweep = {
    runRoomReleaseAtNoon: async () => defaultStayResult,
    runOverstayForcedCheckout: async () => ({}),
    runOverstayEnforcement: async () => ({}),
    runPostCheckoutAutoCancel: async () => ({}),
    runRoomHealer: async () => defaultStayResult,
    ...overrides.staySweep,
  };

  const renewalSweep = {
    runRenewalPriorityExpiry: async () => ({}),
    runRenewalSettlementForfeit: async () => ({}),
    ...overrides.renewalSweep,
  };

  const accountingSweep = {
    runRentRecognition: async () => ({}),
    runRecurringExpenseDrafts: async () => ({}),
    runAutomaticDepreciation: async () => ({}),
    runAutoJournalReconciliation: async () => ({}),
    runAccountingAutoClose: async () => ({}),
    runNotificationPruning: async () => ({}),
    ...overrides.accountingSweep,
  };

  const maintenanceSweep = {
    runContractEndReminders: async () => ({}),
    runTicketSlaEscalation: async () => ({}),
    runBelongingsAbandonment: async () => ({}),
    runAcCleaningSchedule: async () => ({}),
    runReferralRewards: async () => ({}),
    runPushDispatch: async () => ({}),
    ...overrides.maintenanceSweep,
  };

  const prisma = {
    $queryRawUnsafe: async () => [],
    booking: { count: async () => 0 },
    stay: { count: async () => 0 },
    room: { count: async () => 48 },
    ticket: { count: async () => 0 },
    renewalRequest: { count: async () => 0 },
  };

  const accountingPeriodClose = {
    autoCloseMonthly: async () => ({ periodKeysClosed: [] }),
    autoClosePolicy: async () => ({ basis: 'MONTHLY_AUTO_CLOSE', autoCloseEnabled: true, autoCloseDay: 5 }),
    readiness: async () => ({ ready: false, block: true }),
  };

  const svc = new AutoOpsService(prisma, accountingPeriodClose, bookingSweep, staySweep, renewalSweep, accountingSweep, maintenanceSweep);
  svc.withAdvisoryLock = async (fn) => fn();
  return svc;
}

// ─── Y-E1: BookingSweep ─────────────────────────────────────────────────
test('AE-bs-01: runBookingExpiry delegates', async () => {
  const svc = makeSvc({ bookingSweep: { runBookingExpiry: async () => ({ expiredStayIds: [1, 2], heldForPaymentReview: 1 }) } });
  const result = await svc.runBookingExpiry();
  assert.equal(result.expiredStayIds.length, 2);
});

test('AE-bs-02: runDownPaymentForfeit delegates', async () => {
  const svc = makeSvc({ bookingSweep: { runDownPaymentForfeit: async () => ({ forfeited: 1 }) } });
  const result = await svc.runDownPaymentForfeit();
  assert.equal(result.forfeited, 1);
});

// ─── Y-E2: StaySweep ────────────────────────────────────────────────────
test('AE-ss-01: runOverstayForcedCheckout delegates', async () => {
  const svc = makeSvc({ staySweep: { runOverstayForcedCheckout: async () => ({ forcedCheckouts: 1 }) } });
  const result = await svc.runOverstayForcedCheckout();
  assert.equal(result.forcedCheckouts, 1);
});

test('AE-ss-02: runPostCheckoutAutoCancel delegates', async () => {
  const svc = makeSvc({ staySweep: { runPostCheckoutAutoCancel: async () => ({ cancelled: 2 }) } });
  const result = await svc.runPostCheckoutAutoCancel();
  assert.equal(result.cancelled, 2);
});

test('AE-ss-03: runRoomReleaseAtNoon delegates', async () => {
  const svc = makeSvc({ staySweep: { runRoomReleaseAtNoon: async () => ({ releasedRoomIds: [1] }) } });
  const result = await svc.runRoomReleaseAtNoon();
  assert.ok(Array.isArray(result.releasedRoomIds));
});

test('AE-ss-04: runRoomHealer delegates', async () => {
  const svc = makeSvc({ staySweep: { runRoomHealer: async () => ({ releasedRoomIds: [] }) } });
  const result = await svc.runRoomHealer();
  assert.ok(Array.isArray(result.releasedRoomIds));
});

test('AE-ss-05: runOverstayEnforcement delegates', async () => {
  const svc = makeSvc({ staySweep: { runOverstayEnforcement: async () => ({ enforced: 0 }) } });
  const result = await svc.runOverstayEnforcement();
  assert.equal(result.enforced, 0);
});

// ─── Y-E3: RenewalSweep ─────────────────────────────────────────────────
test('AE-rs-01: runRenewalPriorityExpiry delegates', async () => {
  const svc = makeSvc({ renewalSweep: { runRenewalPriorityExpiry: async () => ({ expired: 0 }) } });
  const result = await svc.runRenewalPriorityExpiry();
  assert.equal(result.expired, 0);
});

test('AE-rs-02: runRenewalSettlementForfeit delegates', async () => {
  const svc = makeSvc({ renewalSweep: { runRenewalSettlementForfeit: async () => ({ forfeited: 0 }) } });
  const result = await svc.runRenewalSettlementForfeit();
  assert.equal(result.forfeited, 0);
});

// ─── Y-E4: AccountingSweep ──────────────────────────────────────────────
test('AE-as-01: runRentRecognition delegates', async () => {
  const svc = makeSvc({ accountingSweep: { runRentRecognition: async () => ({ schedulesCreated: 5 }) } });
  const result = await svc.runRentRecognition();
  assert.equal(result.schedulesCreated, 5);
});

test('AE-as-02: runRecurringExpenseDrafts delegates', async () => {
  const svc = makeSvc({ accountingSweep: { runRecurringExpenseDrafts: async () => ({ draftsCreated: 2 }) } });
  const result = await svc.runRecurringExpenseDrafts();
  assert.equal(result.draftsCreated, 2);
});

test('AE-as-03: runAutomaticDepreciation delegates', async () => {
  const svc = makeSvc({ accountingSweep: { runAutomaticDepreciation: async () => ({ runsPosted: 1 }) } });
  const result = await svc.runAutomaticDepreciation();
  assert.equal(result.runsPosted, 1);
});

test('AE-as-04: runAutoJournalReconciliation delegates', async () => {
  const svc = makeSvc({ accountingSweep: { runAutoJournalReconciliation: async () => ({ reconciled: 0 }) } });
  const result = await svc.runAutoJournalReconciliation();
  assert.equal(result.reconciled, 0);
});

test('AE-as-05: runAccountingAutoClose delegates', async () => {
  const svc = makeSvc({ accountingSweep: { runAccountingAutoClose: async () => ({ periodKeysClosed: ['2026-06'] }) } });
  const result = await svc.runAccountingAutoClose();
  assert.ok(Array.isArray(result.periodKeysClosed));
});

// ─── Y-E5: MaintenanceSweep ─────────────────────────────────────────────
test('AE-ms-01: runContractEndReminders delegates', async () => {
  const svc = makeSvc({ maintenanceSweep: { runContractEndReminders: async () => ({ reminded: 0 }) } });
  const result = await svc.runContractEndReminders();
  assert.equal(result.reminded, 0);
});

test('AE-ms-02: runTicketSlaEscalation delegates', async () => {
  const svc = makeSvc({ maintenanceSweep: { runTicketSlaEscalation: async () => ({ escalated: 0 }) } });
  const result = await svc.runTicketSlaEscalation();
  assert.equal(result.escalated, 0);
});

test('AE-ms-03: runBelongingsAbandonment delegates', async () => {
  const svc = makeSvc({ maintenanceSweep: { runBelongingsAbandonment: async () => ({ abandoned: 0 }) } });
  const result = await svc.runBelongingsAbandonment();
  assert.equal(result.abandoned, 0);
});

test('AE-ms-04: runAcCleaningSchedule delegates', async () => {
  const svc = makeSvc({ maintenanceSweep: { runAcCleaningSchedule: async () => ({ due: 3 }) } });
  const result = await svc.runAcCleaningSchedule();
  assert.equal(result.due, 3);
});

test('AE-ms-05: runReferralRewards delegates', async () => {
  const svc = makeSvc({ maintenanceSweep: { runReferralRewards: async () => ({ rewarded: 0 }) } });
  const result = await svc.runReferralRewards();
  assert.equal(result.rewarded, 0);
});

test('AE-ms-06: runNotificationPruning delegates', async () => {
  const svc = makeSvc({ accountingSweep: { runNotificationPruning: async () => ({ pruned: 5 }) } });
  const result = await svc.runNotificationPruning();
  assert.equal(result.pruned, 5);
});

test('AE-ms-07: runPushDispatch delegates', async () => {
  const svc = makeSvc({ maintenanceSweep: { runPushDispatch: async () => ({ dispatched: 2 }) } });
  const result = await svc.runPushDispatch();
  assert.equal(result.dispatched, 2);
});

// ─── Y-E6: Mutex + Orchestration ────────────────────────────────────────
test('AE-mu-01: status returns state info', async () => {
  const svc = makeSvc({ bookingSweep: { expiredBookingWhere: () => ({}) } });
  const result = await svc.status();
  assert.ok(result);
});

test('AE-mu-02: runAll returns aggregated result', async () => {
  const svc = makeSvc();
  const result = await svc.runAll();
  assert.ok(result);
  assert.ok('expiredBookings' in result);
  assert.ok('releasedRooms' in result);
});
