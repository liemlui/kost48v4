'use strict';
const { Client } = require('pg');
const c = new Client({ connectionString: 'postgresql://postgres:123456@localhost:5433/kost48_v3_pro' });
c.connect().then(async () => {
  const tables = ['Invoice', 'InvoicePayment'];
  for (const t of tables) {
    const r = await c.query(`
      SELECT tc.table_name, kcu.column_name, rc.delete_rule
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
      JOIN information_schema.referential_constraints rc ON tc.constraint_name = rc.constraint_name AND tc.table_schema = rc.constraint_schema
      JOIN information_schema.key_column_usage ccu ON rc.unique_constraint_name = ccu.constraint_name AND rc.unique_constraint_schema = ccu.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY' AND ccu.table_name = $1 AND tc.table_schema = 'public'
      ORDER BY tc.table_name
    `, [t]);
    console.log(`Tabel yang referensi ${t}:`);
    r.rows.forEach(x => console.log(`  ${x.table_name}.${x.column_name} (ON DELETE ${x.delete_rule})`));
    if (r.rows.length === 0) console.log('  (tidak ada)');
  }
  c.end();
}).catch(e => { console.error(e.message); c.end(); });
