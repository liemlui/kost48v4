const test = require('node:test');
const assert = require('node:assert/strict');
const { StaySweepService } = require('../../dist/modules/auto-ops/sweeps/stay-sweep.service.js');

test('S-10: forced checkout dilewati bila checkout request sudah APPROVED', async () => {
  let invoiceQueried = false;
  let requestedStatus;
  const prisma = {
    checkoutRequest: {
      findFirst: async (args) => {
        requestedStatus = args?.where?.status;
        return { id: 7 };
      },
    },
    invoice: {
      findMany: async () => {
        invoiceQueried = true;
        return [];
      },
    },
  };
  const service = new StaySweepService(prisma, {}, {}, {}, {});

  let result;
  try {
    result = await service.forceCheckoutOverstay(1, {}, new Date('2026-10-20T00:00:00Z'));
  } catch {
    // Mutan tanpa guard bisa melempar karena dependensi tiruan tidak lengkap;
    // assertion di bawah tetap harus menangkap perilaku yang salah.
  }

  assert.equal(result, false, 'harus berhenti sebelum forced checkout');
  assert.equal(invoiceQueried, false, 'tidak boleh memeriksa invoice setelah checkout in progress');
  assert.equal(requestedStatus, 'APPROVED');
});
