const test = require('node:test');
const assert = require('node:assert');
const { generateTicketNumberTx } = require('../../dist/common/utils/ticket-number.util.js');

test('ticket number generator locks the transaction and skips occupied sequence', async () => {
  let lockCalls = 0;
  const db = {
    $queryRaw: async () => {
      lockCalls += 1;
      return [];
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
