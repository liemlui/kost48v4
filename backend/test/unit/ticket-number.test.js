const test = require('node:test');
const assert = require('node:assert');
const { generateTicketNumberTx } = require('../../dist/common/utils/ticket-number.util.js');

test('ticket number generator locks the transaction and skips occupied sequence', async () => {
  let lockCalls = 0;
  const db = {
    // Lock pakai $executeRaw (pg_advisory_xact_lock → void); mock harus sediakan ini.
    $executeRaw: async () => {
      lockCalls += 1;
      return 0;
    },
    ticket: {
      count: async () => 2,
      findUnique: async ({ where }) => (
        where.ticketNumber.endsWith('0003') ? { id: 3 } : null
      ),
    },
  };

  const number = await generateTicketNumberTx(db);
  assert.strictEqual(lockCalls, 1);
  assert.match(number, /^TIC-\d{4}-0004$/);
});
