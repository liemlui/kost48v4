'use strict';
const { Client } = require('pg');
const c = new Client({ connectionString: 'postgresql://postgres:123456@localhost:5433/kost48_v3_pro' });
c.connect().then(async () => {
  const r = await c.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name='LoyaltyPoint' AND table_schema='public' ORDER BY ordinal_position");
  console.log('LoyaltyPoint columns:');
  r.rows.forEach(x => console.log(`  ${x.column_name}: ${x.data_type}`));
  c.end();
}).catch(e => { console.error(e.message); c.end(); });
