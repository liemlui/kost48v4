const test = require('node:test');
const assert = require('node:assert');
const H = require('../../dist/modules/owner-ai/owner-ai.helpers.js');

test('maskNik masks PDP data and rejects too-short input', () => {
  assert.strictEqual(H.maskNik('3578010101901234'), '************1234');
  assert.strictEqual(H.maskNik('123'), null);
  assert.strictEqual(H.maskNik('1234 5678 9012 3456'), '************3456');
  assert.strictEqual(H.maskNik(null), null);
  assert.strictEqual(H.maskNik(''), null);
  assert.strictEqual(H.maskNikInText('NIK 3578010101901234 valid'), 'NIK ************1234 valid');
  assert.strictEqual(H.maskNikInText('tanpa nik'), 'tanpa nik');
});

test('parseNikDemographics derives gender and birth date conservatively', () => {
  assert.deepStrictEqual(H.parseNikDemographics('3578010101900001'), {
    gender: 'MALE',
    birthDate: '1990-01-01',
  });
  assert.deepStrictEqual(H.parseNikDemographics('3578014101900001'), {
    gender: 'FEMALE',
    birthDate: '1990-01-01',
  });
  assert.deepStrictEqual(H.parseNikDemographics('123'), { birthDate: null, gender: null });
  assert.deepStrictEqual(H.parseNikDemographics('3578010113900001'), {
    birthDate: null,
    gender: 'MALE',
  });
});

test('extractNikFromOcr returns the first 16-digit NIK only', () => {
  assert.strictEqual(H.extractNikFromOcr('Nama A\nNIK 3578010101900001\nAlamat Surabaya'), '3578010101900001');
  assert.strictEqual(H.extractNikFromOcr('Tidak ada nomor identitas lengkap'), null);
});

test('decidePaymentReviewGuard enforces no-partial and accepts booking DP or settlement', () => {
  assert.deepStrictEqual(H.decidePaymentReviewGuard({ invoiceTotal: 100000, submitted: 100000 }), {
    violated: false,
    matchedRule: 'FULL',
  });
  assert.deepStrictEqual(H.decidePaymentReviewGuard({ invoiceTotal: 100000, submitted: 50000 }), {
    violated: true,
    matchedRule: 'NONE',
  });
  assert.deepStrictEqual(H.decidePaymentReviewGuard({ invoiceTotal: 0, submitted: 50000 }), {
    violated: false,
    matchedRule: 'NONE',
  });
  assert.deepStrictEqual(H.decidePaymentReviewGuard({
    invoiceTotal: 0,
    submitted: 300000,
    downPaymentRemaining: 300000,
    settlementAmount: 1200000,
  }), {
    violated: false,
    matchedRule: 'DP',
  });
  assert.deepStrictEqual(H.decidePaymentReviewGuard({
    invoiceTotal: 0,
    submitted: 1200000,
    downPaymentRemaining: 300000,
    settlementAmount: 1200000,
  }), {
    violated: false,
    matchedRule: 'SETTLEMENT',
  });
  assert.deepStrictEqual(H.decidePaymentReviewGuard({
    invoiceTotal: 0,
    submitted: 700000,
    downPaymentRemaining: 300000,
    settlementAmount: 1200000,
  }), {
    violated: true,
    matchedRule: 'NONE',
  });
});

test('normalizeExpenseOcrDraft clamps amount, enum values, confidence, and review notes', () => {
  const negative = H.normalizeExpenseOcrDraft({
    amountRupiah: -5000,
    category: 'NGAWUR',
    type: 'ANEH',
    confidence: 9,
  });
  assert.strictEqual(negative.amountRupiah, 0);
  assert.strictEqual(negative.category, 'OTHER');
  assert.strictEqual(negative.type, 'VARIABLE');
  assert.strictEqual(negative.confidence, 1);
  assert.ok(negative.needsReview.some((item) => item.includes('Nominal')));
  assert.ok(negative.needsReview.some((item) => item.includes('Kategori')));

  const large = H.normalizeExpenseOcrDraft({
    amountRupiah: 750000,
    category: 'MAINTENANCE',
    type: 'FIXED',
    expenseDate: '2026-06-20',
    confidence: 0.4,
  });
  assert.strictEqual(large.amountRupiah, 750000);
  assert.strictEqual(large.category, 'MAINTENANCE');
  assert.strictEqual(large.type, 'FIXED');
  assert.ok(large.needsReview.some((item) => item.includes('Rp500.000')));
});

test('short text/date/age helpers stay deterministic', () => {
  assert.strictEqual(H.cleanShortText('  Satu    dua   tiga  ', 8), 'Satu dua');
  assert.strictEqual(H.isDateOnly('2026-06-20'), true);
  assert.strictEqual(H.isDateOnly('20/06/2026'), false);
  assert.strictEqual(H.ageDays(new Date()), 0);
  assert.strictEqual(H.ageDays(null), 0);
});

test('operation draft normalizers fall back to safe defaults', () => {
  const ticket = H.normalizeTicketActionDraft({
    summary: '',
    recommendedAction: 'DELETE_DATA',
    priority: 'URGENT',
    riskFlags: ['cek', '', 'ulang'],
  });
  assert.strictEqual(ticket.recommendedAction, 'KEEP_OPEN');
  assert.strictEqual(ticket.priority, 'MEDIUM');
  assert.deepStrictEqual(ticket.riskFlags, ['cek', 'ulang']);

  const inventory = H.normalizeInventoryDraft({
    lowStockItems: [{ id: 'x', name: '', currentQty: 'bad', reason: '' }],
    purchaseSuggestions: [{ name: '', qty: -2, estimatedBudgetRupiah: 'bad', priority: 'URGENT' }],
    warnings: ['wajib cek'],
  });
  assert.strictEqual(inventory.lowStockItems[0].inventoryItemId, 0);
  assert.strictEqual(inventory.lowStockItems[0].name, 'Item stok');
  assert.strictEqual(inventory.purchaseSuggestions[0].qty, 0);
  assert.strictEqual(inventory.purchaseSuggestions[0].priority, 'MEDIUM');

  const fieldReport = H.normalizeFieldReportDraft({
    recommendedDecision: 'AUTO_APPROVE',
    priority: 'URGENT',
    suggestedMovement: { needed: true, movementType: 'DROP', reason: 'cek lagi' },
    riskFlags: ['foto kurang'],
  });
  assert.strictEqual(fieldReport.recommendedDecision, 'NEEDS_MORE_INFO');
  assert.strictEqual(fieldReport.priority, 'MEDIUM');
  assert.strictEqual(fieldReport.suggestedMovement.movementType, null);
  assert.deepStrictEqual(fieldReport.riskFlags, ['foto kurang']);
});
