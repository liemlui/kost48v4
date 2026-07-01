'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { BadRequestException } = require('@nestjs/common');
const { PaymentSubmissionsService } = require('../../dist/modules/payment-submissions/payment-submissions.service.js');

const TMP_PROOF_DIR = path.join(__dirname, '../../.test-payment-proofs');

test.before(() => {
  if (!fs.existsSync(TMP_PROOF_DIR)) {
    fs.mkdirSync(TMP_PROOF_DIR, { recursive: true });
  }
});

test.after(() => {
  fs.rmSync(TMP_PROOF_DIR, { recursive: true, force: true });
});

function makeSvc(prismaOverrides = {}) {
  const prisma = {
    $transaction: async (cb) => cb({ $queryRaw: async () => [{ id: 1 }] }),
    paymentSubmission: { findMany: async () => [], findFirst: async () => null },
    stay: { findUnique: async () => ({ id: 1 }) },
    user: { findUnique: async () => null, findFirst: async () => null },
  };
  for (const [key, value] of Object.entries(prismaOverrides)) {
    prisma[key] = typeof prisma[key] === 'object' && prisma[key] !== null
      ? { ...prisma[key], ...value }
      : value;
  }
  const notif = { create: async () => undefined };
  const posting = { postInvoicePaymentTx: async () => ({ posted: true }) };
  const deposit = { recordDepositReceived: async () => ({}) };
  const loyalty = { earnSafe: async () => undefined };
  return new PaymentSubmissionsService(prisma, notif, posting, deposit, loyalty);
}

test('PS-noop-01: service constructs without error', () => {
  const svc = makeSvc();
  assert.ok(svc);
});

test('PS-proof-01: rejects proof file already used by any submission', async () => {
  const fileKey = '7_reused.jpg';
  fs.writeFileSync(path.join(TMP_PROOF_DIR, fileKey), Buffer.from([0xff, 0xd8, 0xff]));

  const svc = makeSvc({
    paymentSubmission: {
      findFirst: async (query) => {
        assert.deepStrictEqual(query.where, { fileKey });
        return { id: 123 };
      },
    },
  });
  svc.PROOF_DIR = TMP_PROOF_DIR;

  await assert.rejects(
    () => svc.validateAndResolveProof(7, 'TRANSFER', fileKey),
    (e) => e instanceof BadRequestException && /sudah pernah dipakai/.test(e.message),
  );
});

test('PS-proof-02: proof fileKey is guarded by a transaction advisory lock', async () => {
  const svc = makeSvc();
  const calls = [];
  const tx = {
    $queryRaw: async (_strings, ...values) => {
      calls.push(values);
      return [{ ok: 1 }];
    },
  };

  await svc.lockProofFileKeyTx(tx, '7_reused.jpg');

  assert.strictEqual(calls.length, 1);
  assert.strictEqual(calls[0].length, 2);
  assert.ok(Number.isInteger(calls[0][0]));
  assert.ok(Number.isInteger(calls[0][1]));
});
