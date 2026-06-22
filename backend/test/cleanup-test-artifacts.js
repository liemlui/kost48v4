'use strict';
/**
 * Hapus artefak test (kamar + stay + data terkait dengan code TEST-*)
 * yang tersisa di DB UAT dari integration test sebelumnya.
 * Run: node test/cleanup-test-artifacts.js
 *
 * Urutan hapus (sesuai RESTRICT FK):
 *   LoyaltyPoint (per invoice) → InvoicePayment (RESTRICT) → Invoice (CASCADE: InvoiceLine, PaymentSubmission)
 *   → TenantDepositLedgerEntry (RESTRICT on Stay) → Stay (CASCADE: CheckoutRequest, RenewRequest, RentRecognitionSchedule, RoomTransfer)
 */
const { Client } = require('pg');
const c = new Client({ connectionString: 'postgresql://postgres:123456@localhost:5433/kost48_v3_pro' });

c.connect().then(async () => {
  // Temukan semua kamar test
  const testRooms = await c.query(`SELECT id, code FROM "Room" WHERE code LIKE 'TEST-%'`);
  console.log(`Test rooms ditemukan: ${testRooms.rows.length}`);
  for (const r of testRooms.rows) console.log(`  Room #${r.id}: ${r.code}`);

  if (testRooms.rows.length === 0) {
    console.log('Tidak ada artefak test. DB sudah bersih.');
    await c.end(); return;
  }

  const roomIds = testRooms.rows.map(r => r.id);

  // Temukan semua stay terkait kamar test
  const testStays = await c.query(
    `SELECT id FROM "Stay" WHERE "roomId" = ANY($1::int[])`,
    [roomIds]
  );
  const stayIds = testStays.rows.map(s => s.id);
  console.log(`Test stays: ${stayIds.length}`);

  if (stayIds.length > 0) {
    // 1. Temukan semua invoice untuk stays ini
    const invRes = await c.query(`SELECT id FROM "Invoice" WHERE "stayId" = ANY($1::int[])`, [stayIds]);
    const invList = invRes.rows.map(r => r.id);
    console.log(`Invoice ditemukan: ${invList.length}`);

    if (invList.length > 0) {
      const invIdStrs = invList.map(String);
      // 1a. LoyaltyPoint per invoice (sourceType='INVOICE', sourceId=invoice.id.toString())
      const lp = await c.query(
        `DELETE FROM "LoyaltyPoint" WHERE "sourceType" = 'INVOICE' AND "sourceId" = ANY($1::text[])`,
        [invIdStrs]
      );
      console.log(`LoyaltyPoint dihapus: ${lp.rowCount}`);

      // 1b. InvoicePayment (RESTRICT on Invoice)
      const ip = await c.query(`DELETE FROM "InvoicePayment" WHERE "invoiceId" = ANY($1::int[])`, [invList]);
      console.log(`InvoicePayment dihapus: ${ip.rowCount}`);

      // 1c. Invoice (CASCADE: InvoiceLine, PaymentSubmission)
      const iv = await c.query(`DELETE FROM "Invoice" WHERE id = ANY($1::int[])`, [invList]);
      console.log(`Invoice dihapus: ${iv.rowCount} (InvoiceLine+PaymentSubmission auto-cascade)`);
    }

    // 2. TenantDepositLedgerEntry (RESTRICT on Stay)
    const dl = await c.query(`DELETE FROM "TenantDepositLedgerEntry" WHERE "stayId" = ANY($1::int[])`, [stayIds]);
    console.log(`TenantDepositLedgerEntry dihapus: ${dl.rowCount}`);

    // 3. AppNotification terkait stay (entityType='STAY', entityId=stayId.toString())
    const stayIdStrs = stayIds.map(String);
    const an = await c.query(
      `DELETE FROM "AppNotification" WHERE "entityType" = 'STAY' AND "entityId" = ANY($1::text[])`,
      [stayIdStrs]
    );
    console.log(`AppNotification dihapus: ${an.rowCount}`);

    // 4. Stay (CASCADE: CheckoutRequest, RenewRequest, RentRecognitionSchedule, RoomTransfer)
    const st = await c.query(`DELETE FROM "Stay" WHERE id = ANY($1::int[])`, [stayIds]);
    console.log(`Stay dihapus: ${st.rowCount} (cascade: CheckoutRequest, RenewRequest, dll)`);
  }

  // 5. Room (kamar test)
  const rm = await c.query(`DELETE FROM "Room" WHERE id = ANY($1::int[])`, [roomIds]);
  console.log(`Room dihapus: ${rm.rowCount}`);

  // Verifikasi akhir
  const leftover = await c.query(`SELECT count(*) n FROM "Room" WHERE code LIKE 'TEST-%'`);
  console.log(`\nSisa kamar TEST-*: ${leftover.rows[0].n} (harus 0)`);

  await c.end();
  console.log('\nDone. DB UAT bersih dari artefak test.');
}).catch(e => { console.error('ERROR:', e.message); c.end(); process.exit(1); });
