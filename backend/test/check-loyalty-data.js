'use strict';
const { Client } = require('pg');
const c = new Client({ connectionString: 'postgresql://postgres:123456@localhost:5433/kost48_v3_pro' });
c.connect().then(async () => {
  // Cek data LoyaltyPoint yang terkait dengan stay TEST-*
  const rooms = await c.query(`SELECT id, code FROM "Room" WHERE code LIKE 'TEST-%'`);
  console.log('Test rooms:', rooms.rows);

  const stays = await c.query(`SELECT id FROM "Stay" WHERE "roomId" = ANY($1::int[])`, [rooms.rows.map(r => r.id)]);
  console.log('Test stays:', stays.rows);

  const lp = await c.query(`SELECT * FROM "LoyaltyPoint" WHERE "sourceId" = ANY($1::text[])`, [stays.rows.map(s => s.id.toString())]);
  console.log('LoyaltyPoint terkait test stays:', lp.rows.length, 'rows');
  lp.rows.slice(0, 5).forEach(r => console.log(' ', JSON.stringify(r)));

  // Juga cek dengan sourceType
  const lpAll = await c.query(`SELECT DISTINCT "sourceType" FROM "LoyaltyPoint" LIMIT 10`);
  console.log('sourceTypes di LoyaltyPoint:', lpAll.rows);
  c.end();
}).catch(e => { console.error(e.message); c.end(); });
