'use strict';
const { Client } = require('pg');
const c = new Client({ connectionString: 'postgresql://postgres:123456@localhost:5433/kost48_v3_pro' });
c.connect().then(async () => {
  const r = await c.query("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename");
  r.rows.forEach(x => console.log(x.tablename));
  c.end();
}).catch(e => { console.error(e.message); c.end(); });
