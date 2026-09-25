// P1-04 (audit uang Jul 2026, diverifikasi ulang 25 Sep 2026): kunci idempotensi
// deposit masuk tidak boleh lagi jatuh ke `String(stayId)`.
//
// Kontrak yang dikunci:
//   1. Dua cabang ber-dokumen mempertahankan format lama apa adanya, supaya idempotensi
//      data historis tidak berubah saat kode diperbaiki.
//   2. Cabang tanpa dokumen sumber (mis. check-in manual) memakai kunci unik per kejadian
//      dan menulis log keras — bukan `stayId` yang bisa menelan deposit kedua.
//   3. Jalur skip (nominal tidak valid, stay hilang, entri duplikat) tidak lagi senyap.
const assert = require('node:assert/strict');
const test = require('node:test');

const { DepositLedgerService } = require('../../dist/modules/deposit-ledger/deposit-ledger.service.js');

const STAY_ID = 7;
const OCCURRED_AT = new Date('2026-09-25T03:00:00.000Z');

const makeStay = (overrides = {}) => ({
  id: STAY_ID,
  tenantId: 42,
  roomId: 3,
  depositPaidAmountRupiah: 0,
  depositDeductionRupiah: 0,
  depositRefundedRupiah: 0,
  depositStatus: 'PENDING',
  depositPaymentStatus: 'PENDING',
  ...overrides,
});

function makeTx({ stay = makeStay(), existing = null } = {}) {
  const events = [];
  return {
    events,
    stay: {
      findUnique: async (args) => {
        events.push({ op: 'stay.findUnique', args });
        return stay;
      },
    },
    tenantDepositLedgerEntry: {
      findFirst: async (args) => {
        events.push({ op: 'entry.findFirst', args });
        return existing;
      },
      create: async (args) => {
        events.push({ op: 'entry.create', args });
        return { id: 501, ...args.data };
      },
    },
  };
}

/** Service dengan logger tiruan supaya jalur "senyap" bisa diperiksa. */
function makeService(tx) {
  const service = new DepositLedgerService({});
  const warns = [];
  service.logger = {
    warn: (message) => warns.push(String(message)),
    error: () => {},
    log: () => {},
    debug: () => {},
    verbose: () => {},
  };
  return { service, warns, tx };
}

const createdEntry = (tx) => tx.events.find((event) => event.op === 'entry.create')?.args.data;

test('SRC-1 — dokumen lengkap: kunci memakai nomor submission dan invoice payment', async () => {
  const tx = makeTx();
  const { service, warns } = makeService(tx);

  const result = await service.recordDepositReceivedTx(tx, {
    stayId: STAY_ID,
    amountRupiah: 750_000,
    paymentSubmissionId: 12,
    invoicePaymentId: 99,
    occurredAt: OCCURRED_AT,
  });

  assert.equal(result.sourceId, 'PS_12_IP_99');
  const entry = createdEntry(tx);
  assert.equal(entry.sourceId, 'PS_12_IP_99');
  assert.equal(entry.amountRupiah, 750_000);
  assert.equal(entry.direction, 'INCREASE_LIABILITY');
  assert.equal(entry.paymentSubmissionId, 12);
  assert.equal(entry.invoicePaymentId, 99);
  assert.deepEqual(entry.occurredAt, OCCURRED_AT);
  assert.equal(warns.length, 0, 'jalur ber-dokumen tidak boleh menghasilkan peringatan');
});

test('SRC-2 — hanya submission id: format kunci lama dipertahankan (idempotensi historis)', async () => {
  const tx = makeTx();
  const { service } = makeService(tx);

  const result = await service.recordDepositReceivedTx(tx, {
    stayId: STAY_ID,
    amountRupiah: 500_000,
    paymentSubmissionId: 12,
    occurredAt: OCCURRED_AT,
  });

  assert.equal(result.sourceId, '12', 'harus tetap String(submissionId) seperti sebelum perbaikan');
});

test('SRC-3 — invoice payment tanpa submission id: format kunci lama juga dipertahankan', async () => {
  const tx = makeTx();
  const { service } = makeService(tx);

  const result = await service.recordDepositReceivedTx(tx, {
    stayId: STAY_ID,
    amountRupiah: 300_000,
    invoicePaymentId: 99,
    occurredAt: OCCURRED_AT,
  });

  assert.equal(result.sourceId, `PS_${STAY_ID}_IP_99`);
});

test('SRC-4 — tanpa dokumen sumber: kunci unik per kejadian + log keras (bukan stayId)', async () => {
  const tx = makeTx();
  const { service, warns } = makeService(tx);

  const result = await service.recordDepositReceivedTx(tx, {
    stayId: STAY_ID,
    amountRupiah: 400_000,
    occurredAt: OCCURRED_AT,
    metadata: { source: 'MANUAL_CHECKIN' },
  });

  assert.notEqual(result.sourceId, String(STAY_ID), 'fallback ke stayId harus dihentikan');
  assert.equal(result.sourceId, `MANUAL_${STAY_ID}_${OCCURRED_AT.getTime()}_400000`);
  assert.equal(warns.length, 1);
  assert.match(warns[0], /tanpa dokumen sumber/);
});

test('SRC-5 — dua deposit manual berbeda pada stay yang sama tidak memakai kunci yang sama', async () => {
  const first = makeService(makeTx());
  const second = makeService(makeTx());

  const a = await first.service.recordDepositReceivedTx(first.tx, {
    stayId: STAY_ID,
    amountRupiah: 400_000,
    occurredAt: OCCURRED_AT,
  });
  const b = await second.service.recordDepositReceivedTx(second.tx, {
    stayId: STAY_ID,
    amountRupiah: 250_000,
    occurredAt: new Date(OCCURRED_AT.getTime() + 3_600_000),
  });

  assert.notEqual(a.sourceId, b.sourceId, 'deposit kedua tidak boleh tertelan dedupe');
});

test('SRC-6 — entri duplikat dilewati tetapi dicatat di log (tidak senyap)', async () => {
  const tx = makeTx({ existing: { id: 55 } });
  const { service, warns } = makeService(tx);

  const result = await service.recordDepositReceivedTx(tx, {
    stayId: STAY_ID,
    amountRupiah: 400_000,
    paymentSubmissionId: 12,
    occurredAt: OCCURRED_AT,
  });

  assert.equal(result, null);
  assert.equal(createdEntry(tx), undefined, 'tidak boleh membuat entri kedua');
  const lookup = tx.events.find((event) => event.op === 'entry.findFirst').args.where;
  assert.equal(lookup.stayId, STAY_ID);
  assert.equal(lookup.sourceId, '12');
  assert.equal(lookup.sourceType, 'PAYMENT_SUBMISSION');
  assert.match(warns[0], /duplikat/);
});

test('SRC-7 — nominal tidak valid: dilewati dengan log, tanpa menyentuh DB', async () => {
  const tx = makeTx();
  const { service, warns } = makeService(tx);

  const result = await service.recordDepositReceivedTx(tx, {
    stayId: STAY_ID,
    amountRupiah: 0,
    paymentSubmissionId: 12,
  });

  assert.equal(result, null);
  assert.equal(tx.events.length, 0, 'tidak ada operasi DB untuk nominal tidak valid');
  assert.match(warns[0], /nominal tidak valid/);
});

test('SRC-8 — stay tidak ditemukan: dilewati dengan log, tanpa membuat entri', async () => {
  const tx = makeTx({ stay: null });
  const { service, warns } = makeService(tx);

  const result = await service.recordDepositReceivedTx(tx, {
    stayId: STAY_ID,
    amountRupiah: 100_000,
    paymentSubmissionId: 12,
  });

  assert.equal(result, null);
  assert.equal(createdEntry(tx), undefined);
  assert.match(warns[0], /stay 7 tidak ditemukan/);
});
