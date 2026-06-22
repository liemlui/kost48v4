'use strict';
const { Client } = require('pg');
const c = new Client({ connectionString: 'postgresql://postgres:123456@localhost:5433/kost48_v3_pro' });
c.connect().then(async () => {
  const tables = ['AppNotification', 'PaymentSubmission', 'CheckoutRequest', 'RenewRequest', 'RentRecognitionSchedule'];
  for (const t of tables) {
    const r = await c.query(`SELECT column_name FROM information_schema.columns WHERE table_name=$1 AND table_schema='public' ORDER BY ordinal_position`, [t]);
    console.log(`\n${t}: ${r.rows.map(x => x.column_name).join(', ')}`);
  }
  c.end();
}).catch(e => { console.error(e.message); c.end(); });
