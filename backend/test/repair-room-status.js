'use strict';
/**
 * Repair DB UAT: sinkronkan status kamar dengan stay aktif.
 * Kamar tanpa Stay ACTIVE/RESERVED → AVAILABLE.
 * Run: node test/repair-room-status.js
 */
const { Client } = require('pg');
const c = new Client({ connectionString: 'postgresql://postgres:123456@localhost:5433/kost48_v3_pro' });

c.connect().then(async () => {
  // Kamar yang punya stay ACTIVE (sudah check-in / meter promoted) → OCCUPIED
  const setOccupied = await c.query(`
    UPDATE "Room" r SET status = 'OCCUPIED'
    FROM "Stay" s
    WHERE s."roomId" = r.id
      AND s.status = 'ACTIVE'
      AND s."initialMetersPromotedAt" IS NOT NULL
      AND r."isActive" = true
  `);
  console.log('Set OCCUPIED (ACTIVE + promoted):', setOccupied.rowCount);

  // Kamar yang punya stay ACTIVE tapi belum promoted → RESERVED (booking tahap bayar)
  const setReserved = await c.query(`
    UPDATE "Room" r SET status = 'RESERVED'
    FROM "Stay" s
    WHERE s."roomId" = r.id
      AND s.status = 'ACTIVE'
      AND s."initialMetersPromotedAt" IS NULL
      AND r."isActive" = true
      AND r.status != 'OCCUPIED'
  `);
  console.log('Set RESERVED (ACTIVE + booking):', setReserved.rowCount);

  // Semua kamar aktif yang TIDAK punya stay ACTIVE → AVAILABLE
  const setAvailable = await c.query(`
    UPDATE "Room" SET status = 'AVAILABLE'
    WHERE "isActive" = true
      AND id NOT IN (
        SELECT DISTINCT "roomId" FROM "Stay" WHERE status = 'ACTIVE'
      )
  `);
  console.log('Set AVAILABLE (tanpa stay aktif):', setAvailable.rowCount);

  // Ringkasan
  const summary = await c.query(`
    SELECT status, count(*) as n FROM "Room" WHERE "isActive" = true GROUP BY status ORDER BY status
  `);
  console.log('\nRingkasan status kamar setelah repair:');
  for (const row of summary.rows) console.log(`  ${row.status}: ${row.n}`);

  // Hapus stay "hantu" test (stay ACTIVE tanpa tenant yang punya email test / yang dibuat oleh test)
  const ghostCheck = await c.query(`
    SELECT s.id, r.status as room_status, s."tenantId", s."initialMetersPromotedAt" IS NOT NULL as promoted
    FROM "Stay" s
    JOIN "Room" r ON r.id = s."roomId"
    WHERE s.status = 'ACTIVE'
    LIMIT 25
  `);
  console.log('\nSample stay ACTIVE (max 25):');
  for (const row of ghostCheck.rows) {
    console.log(`  Stay #${row.id} tenant:${row.tenantId} promoted:${row.promoted} room-status:${row.room_status}`);
  }

  await c.end();
  console.log('\nDone.');
}).catch(e => { console.error('ERROR:', e.message); c.end(); process.exit(1); });
