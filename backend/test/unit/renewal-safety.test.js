const test = require('node:test');
const assert = require('node:assert');
const { RenewRequestsService } = require('../../dist/modules/renew-requests/renew-requests.service.js');
const { PaymentSubmissionsService } = require('../../dist/modules/payment-submissions/payment-submissions.service.js');
const { StaysService } = require('../../dist/modules/stays/stays.service.js');

const actor = { id: 9, role: 'OWNER' };

test('renewal cannot be finalized while settlement invoice is unpaid', async () => {
  let finalizeCalls = 0;
  const tx = {
    $queryRaw: async () => [{ id: 12 }],
    renewRequest: {
      findUnique: async () => ({
        id: 12,
        stayId: 4,
        status: 'DP_SECURED',
        requestedTerm: 'MONTHLY',
        requestedCheckOutDate: new Date('2026-08-01T00:00:00.000Z'),
        downPaymentAmountRupiah: 300000,
        settlementInvoiceId: 44,
        settlementDueDate: new Date('2026-07-20T00:00:00.000Z'),
      }),
    },
    stay: {
      findUnique: async () => ({ agreedRentAmountRupiah: 1000000 }),
    },
    invoice: {
      findUnique: async () => ({ id: 44, status: 'ISSUED', paidAt: null }),
    },
  };
  const prisma = { $transaction: async (callback) => callback(tx) };
  const stays = {
    finalizePreparedRenewalInTransaction: async () => {
      finalizeCalls += 1;
    },
  };
  const service = new RenewRequestsService(prisma, stays, {}, {});

  await assert.rejects(
    () => service.approveRequest(12, {}, actor),
    /Invoice pelunasan belum PAID/,
  );
  assert.strictEqual(finalizeCalls, 0);
});

test('rejecting renewal awaiting DP cancels its unpaid invoice', async () => {
  let cancelledInvoiceId = null;
  const request = {
    id: 13,
    stayId: 5,
    status: 'AWAITING_DP',
    downPaymentInvoiceId: 55,
  };
  const tx = {
    $queryRaw: async () => [{ id: 13 }],
    renewRequest: {
      findUnique: async () => request,
      update: async ({ data }) => ({ ...request, ...data }),
    },
  };
  const prisma = {
    $transaction: async (callback) => callback(tx),
    stay: {
      findUnique: async () => ({
        tenant: { fullName: 'Tenant', user: { id: 21 } },
        room: { code: 'A1', name: 'Kamar A1' },
      }),
    },
  };
  const stays = {
    cancelUnpaidRenewalInvoiceInTransaction: async (_tx, invoiceId) => {
      cancelledInvoiceId = invoiceId;
    },
  };
  const audit = { log: async () => undefined };
  const notification = { create: async () => undefined };
  const service = new RenewRequestsService(prisma, stays, audit, notification);

  const result = await service.rejectRequest(
    13,
    { reviewNotes: 'Kamar dipakai kebutuhan operasional.' },
    actor,
  );

  assert.strictEqual(cancelledInvoiceId, 55);
  assert.strictEqual(result.status, 'REJECTED');
});

test('renewal payment after its deadline is rejected', async () => {
  const prisma = {
    renewRequest: {
      findFirst: async () => ({
        downPaymentInvoiceId: 66,
        settlementInvoiceId: null,
        downPaymentDueDate: new Date('2026-06-10T00:00:00.000Z'),
        settlementDueDate: null,
      }),
    },
  };
  const service = new PaymentSubmissionsService(prisma, {}, {}, {});

  await assert.rejects(
    () => service.assertRenewalPaymentWithinDeadline(
      prisma,
      66,
      new Date('2026-06-11T00:00:00.000Z'),
    ),
    /melewati hari-H prioritas/,
  );
});

test('loss refund cannot be completed without transfer proof', async () => {
  let updateCalls = 0;
  const prisma = {
    stay: {
      findUnique: async () => ({
        id: 7,
        lossRefundStatus: 'PENDING',
        lossRefundAmountRupiah: 450000,
      }),
      update: async () => {
        updateCalls += 1;
      },
    },
  };
  const service = new StaysService(prisma, {}, {}, {});

  await assert.rejects(
    () => service.processLossRefund(7, {}, actor),
    /Bukti transfer balik wajib/,
  );
  assert.strictEqual(updateCalls, 0);
});
