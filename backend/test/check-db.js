const { Client } = require('pg');
const c = new Client({ connectionString: 'postgresql://postgres:123456@localhost:5433/kost48_v3_pro' });
c.connect()
  .then(async () => {
    const r1 = await c.query("SELECT status, count(*) n FROM \"Room\" GROUP BY status ORDER BY status");
    console.log('Semua room status:');
    for (const row of r1.rows) console.log(`  ${row.status}: ${row.n}`);

    const r2 = await c.query("SELECT count(*) n FROM \"Room\" WHERE \"isActive\"=true");
    console.log('Room isActive=true:', r2.rows[0].n);

    const r3 = await c.query("SELECT count(*) n FROM \"Room\" WHERE \"isActive\"=false");
    console.log('Room isActive=false:', r3.rows[0].n);

    const r4 = await c.query("SELECT count(*) n FROM \"Stay\" WHERE status='ACTIVE'");
    console.log('Stay ACTIVE:', r4.rows[0].n);

    const r5 = await c.query("SELECT status, count(*) n FROM \"Stay\" GROUP BY status ORDER BY status");
    console.log('Semua stay status:');
    for (const row of r5.rows) console.log(`  ${row.status}: ${row.n}`);

    const r6 = await c.query(`
      SELECT r.id, r.status, r."isActive", s.id as stay_id
      FROM "Room" r
      LEFT JOIN "Stay" s ON s."roomId" = r.id AND s.status = 'ACTIVE'
      WHERE r."isActive" = true
      LIMIT 30
    `);
    console.log('\nKamar aktif + stay ACTIVE:');
    for (const row of r6.rows) console.log(`  Room #${row.id} status:${row.status} stay:${row.stay_id ?? 'none'}`);

    c.end();
  })
  .catch(e => { console.log('DB FAIL:', e.message); c.end(); process.exit(1); });
