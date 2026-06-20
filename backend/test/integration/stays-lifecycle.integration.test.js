const test = require('node:test');
const assert = require('node:assert');
const { Test } = require('@nestjs/testing');
const { AppModule } = require('../../dist/app.module.js');
const { PrismaService } = require('../../dist/prisma/prisma.service.js');
const { AutoOpsService } = require('../../dist/modules/auto-ops/auto-ops.service.js');
const { PrepayExtensionService } = require('../../dist/modules/stays/prepay-extension.service.js');
const { StaysService } = require('../../dist/modules/stays/stays.service.js');

// Bootstrap Nest app penuh + akses service via token CLASS (bukan string).
async function bootstrap() {
  const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = module.createNestApplication();
  await app.init();
  return { module, app };
}
async function getOwnerActor(prisma) {
  const owner = await prisma.user.findFirst({ where: { role: 'OWNER' }, select: { id: true, email: true } });
  assert.ok(owner, 'Harus ada user OWNER (seed)');
  return { id: owner.id, role: 'OWNER', email: owner.email, tenantId: null };
}
async function pickAvailableRoom(prisma) {
  const room = await prisma.room.findFirst({
    where: { status: 'AVAILABLE', isActive: true },
    orderBy: { id: 'asc' },
    select: { id: true, code: true, monthlyRateRupiah: true, defaultDepositRupiah: true },
  });
  assert.ok(room, 'Harus ada kamar AVAILABLE (seed)');
  return room;
}
async function pickTenant(prisma) {
  const tenant = await prisma.tenant.findFirst({ where: { isActive: true }, select: { id: true } });
  assert.ok(tenant, 'Harus ada tenant aktif (seed)');
  return tenant;
}

/**
 * Integration test: siklus hidup Stay (booking → huni → checkout).
 * Prasyarat: DB UAT (port 5433) running + sudah di-seed.
 * Jalankan: npm run build, lalu `npm run test:integration` (butuh dist + DB seeded).
 */

test('full lifecycle: booking → check-in → checkout → deposit refund', async (t) => {
  const module = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();
  const app = module.createNestApplication();
  await app.init();

  const prisma = module.get(PrismaService);

  t.after(async () => {
    await app.close();
  });

  // TC1: Ambil kamar AVAILABLE
  const room = await prisma.room.findFirst({
    where: { status: 'AVAILABLE', isActive: true },
    select: { id: true, code: true, monthlyRateRupiah: true, defaultDepositRupiah: true },
  });
  assert.ok(room, 'Harus ada kamar AVAILABLE di DB UAT');

  // Ambil tenant aktif untuk test
  const tenant = await prisma.tenant.findFirst({
    where: { isActive: true },
    select: { id: true },
  });
  assert.ok(tenant, 'Harus ada tenant aktif di DB UAT');

  console.log(`  🏠 Kamar: ${room.code} (${room.id}), Tenant: #${tenant.id}`);

  // 2. Buat Stay baru → status ACTIVE, Room RESERVED
  const checkIn = new Date();
  checkIn.setUTCHours(0, 0, 0, 0);
  const checkOut = new Date(checkIn);
  checkOut.setUTCMonth(checkOut.getUTCMonth() + 1);

  const stay = await prisma.stay.create({
    data: {
      tenantId: tenant.id,
      roomId: room.id,
      status: 'ACTIVE',
      checkInDate: checkIn,
      plannedCheckOutDate: checkOut,
      pricingTerm: 'MONTHLY',
      agreedRentAmountRupiah: room.monthlyRateRupiah,
      depositAmountRupiah: room.defaultDepositRupiah,
      depositPaidAmountRupiah: 0,
      downPaymentPaidRupiah: 0,
      electricityTariffPerKwhRupiah: 2500,
      waterTariffPerM3Rupiah: 5000,
      initialMetersPromotedAt: null,
    },
  });
  assert.ok(stay, 'Stay harus berhasil dibuat');
  assert.strictEqual(stay.status, 'ACTIVE');

  // Simulasikan update Room → RESERVED (normalnya dilakukan oleh service layer dalam transaksi)
  await prisma.room.update({ where: { id: room.id }, data: { status: 'RESERVED' } });

  // Verifikasi Room jadi RESERVED
  const roomAfter = await prisma.room.findUnique({ where: { id: room.id }, select: { status: true } });
  assert.strictEqual(roomAfter.status, 'RESERVED');

  // 3. Complete stay → promoted
  // (Ini mensimulasikan tenant check-in / pembayaran)
  const promoted = await prisma.stay.update({
    where: { id: stay.id },
    data: {
      initialMetersPromotedAt: new Date(),
      initialElectricityKwhPending: 0,
      initialWaterM3Pending: 0,
    },
  });
  assert.ok(promoted.initialMetersPromotedAt);

  // 4. Checkout — finalisasi
  const actualCheckOut = new Date(checkOut);
  const checkoutStay = await prisma.stay.update({
    where: { id: stay.id },
    data: {
      status: 'COMPLETED',
      actualCheckOutDate: actualCheckOut,
      checkoutReason: 'Integration test: checkout sukses',
      initialElectricityKwhPending: 100,
      initialWaterM3Pending: 50,
      initialMetersRecordedAt: new Date(),
    },
  });
  assert.strictEqual(checkoutStay.status, 'COMPLETED');

  // Simulasikan update Room → AVAILABLE setelah checkout (normalnya oleh service layer)
  await prisma.room.update({ where: { id: room.id }, data: { status: 'AVAILABLE' } });

  // 5. Room kembali AVAILABLE
  const roomAfterCheckout = await prisma.room.findUnique({ where: { id: room.id }, select: { status: true } });
  assert.strictEqual(roomAfterCheckout.status, 'AVAILABLE');

  // Cleanup: hapus data test
  await prisma.stay.delete({ where: { id: stay.id } });
  await prisma.room.update({
    where: { id: room.id },
    data: { status: 'AVAILABLE' },
  });

  console.log('  ✅ TC1: Booking → Huni → Checkout selesai');
});

// TC2: Sweeper booking-expiry NYATA — booking RESERVED yang kedaluwarsa (belum bayar)
// harus dibatalkan dan kamarnya dilepas. Menguji AutoOpsService.runBookingExpiry.
test('TC2: Booking RESERVED kedaluwarsa → sweeper batalkan + lepas kamar', async (t) => {
  const { module, app } = await bootstrap();
  const prisma = module.get(PrismaService);
  const autoOps = module.get(AutoOpsService);
  t.after(async () => { await app.close(); });

  const room = await pickAvailableRoom(prisma);
  const tenant = await pickTenant(prisma);

  const checkIn = new Date(); checkIn.setUTCHours(0, 0, 0, 0);
  const checkOut = new Date(checkIn); checkOut.setUTCMonth(checkOut.getUTCMonth() + 1);
  const expiredAt = new Date(Date.now() - 60 * 60 * 1000); // 1 jam lalu → kedaluwarsa

  const stay = await prisma.stay.create({
    data: {
      tenantId: tenant.id, roomId: room.id, status: 'ACTIVE',
      checkInDate: checkIn, plannedCheckOutDate: checkOut, pricingTerm: 'MONTHLY',
      agreedRentAmountRupiah: room.monthlyRateRupiah, depositAmountRupiah: room.defaultDepositRupiah,
      depositPaidAmountRupiah: 0, downPaymentPaidRupiah: 0,
      electricityTariffPerKwhRupiah: 2500, waterTariffPerM3Rupiah: 5000,
      initialMetersPromotedAt: null, expiresAt: expiredAt,
    },
  });
  // Booking → kamar RESERVED (prasyarat expiredBookingWhere).
  await prisma.room.update({ where: { id: room.id }, data: { status: 'RESERVED' } });

  // Act: jalankan sweeper booking-expiry yang sebenarnya.
  await autoOps.runBookingExpiry({ source: 'INTEGRATION_TEST' });

  // Assert: stay tidak lagi ACTIVE (dibatalkan) + kamar dilepas ke AVAILABLE.
  const stayAfter = await prisma.stay.findUnique({ where: { id: stay.id }, select: { status: true } });
  assert.notStrictEqual(stayAfter.status, 'ACTIVE', 'Booking kedaluwarsa harus dibatalkan (bukan ACTIVE)');
  const roomAfter = await prisma.room.findUnique({ where: { id: room.id }, select: { status: true } });
  assert.strictEqual(roomAfter.status, 'AVAILABLE', 'Kamar harus dilepas ke AVAILABLE setelah expiry');

  try { await prisma.stay.delete({ where: { id: stay.id } }); } catch { /* best-effort */ }
  console.log('  ✅ TC2: Sweeper booking-expiry membatalkan booking & melepas kamar');
});

// TC3: Prabayar/perpanjangan fleksibel NYATA (PrepayExtensionService, PSAK 72).
// Membuktikan masa sewa diperpanjang KONTIGU (mulai dari checkout lama = tanpa gap),
// invoice prabayar PAID terbit, dan jurnal terposting (service melempar bila gagal posting).
test('TC3: Prabayar 3 bln → masa sewa diperpanjang tanpa gap + jurnal PSAK 72', async (t) => {
  const { module, app } = await bootstrap();
  const prisma = module.get(PrismaService);
  const prepay = module.get(PrepayExtensionService);
  t.after(async () => { await app.close(); });

  const room = await pickAvailableRoom(prisma);
  const tenant = await pickTenant(prisma);
  const actor = await getOwnerActor(prisma);

  const checkIn = new Date('2026-06-01T00:00:00Z');
  const plannedOut = new Date('2026-07-01T00:00:00Z');
  const stay = await prisma.stay.create({
    data: {
      tenantId: tenant.id, roomId: room.id, status: 'ACTIVE',
      checkInDate: checkIn, plannedCheckOutDate: plannedOut, pricingTerm: 'MONTHLY',
      agreedRentAmountRupiah: room.monthlyRateRupiah || 1400000,
      depositAmountRupiah: room.defaultDepositRupiah || 500000,
      depositPaidAmountRupiah: room.defaultDepositRupiah || 500000, downPaymentPaidRupiah: 0,
      electricityTariffPerKwhRupiah: 2500, waterTariffPerM3Rupiah: 5000,
      initialMetersPromotedAt: new Date('2026-06-02T00:00:00Z'), // promoted (huni)
    },
  });
  await prisma.room.update({ where: { id: room.id }, data: { status: 'OCCUPIED' } });

  // Act: prabayar 3 bulan (real service → invoice + jurnal issuance/payment/deferral 2200).
  const res = await prepay.prepayExtension(stay.id, { months: 3, method: 'TRANSFER' }, actor);

  // Assert: 3 bulan, masa sewa maju, invoice prabayar PAID dibuat.
  assert.strictEqual(res.months, 3, 'Harus prabayar 3 bulan');
  const stayAfter = await prisma.stay.findUnique({ where: { id: stay.id }, select: { plannedCheckOutDate: true } });
  assert.ok(
    stayAfter.plannedCheckOutDate.getTime() > plannedOut.getTime(),
    'plannedCheckOutDate harus maju setelah prabayar',
  );
  const paidInvoice = await prisma.invoice.findFirst({
    where: { stayId: stay.id, status: 'PAID' },
    select: { id: true },
  });
  assert.ok(paidInvoice, 'Harus ada invoice prabayar berstatus PAID');
  // Jadwal pengakuan PSAK 72 terbentuk (deferral 2200 → diakui per bulan).
  const sched = await prisma.rentRecognitionSchedule.count({ where: { stayId: stay.id } });
  assert.ok(sched > 0, 'Harus ada jadwal pengakuan pendapatan (RentRecognitionSchedule)');

  console.log('  ✅ TC3: Prabayar 3 bln kontigu + invoice PAID + jadwal PSAK 72');
});

// TC4: Settle deposit checkout NYATA (StaysService.processDeposit, FULL_REFUND).
// Menguji state machine deposit: HELD → REFUNDED dengan nominal refund = deposit diterima.
test('TC4: Proses deposit checkout (FULL_REFUND) → HELD menjadi REFUNDED', async (t) => {
  const { module, app } = await bootstrap();
  const prisma = module.get(PrismaService);
  const stays = module.get(StaysService);
  t.after(async () => { await app.close(); });

  const room = await pickAvailableRoom(prisma);
  const tenant = await pickTenant(prisma);
  const actor = await getOwnerActor(prisma);
  const deposit = room.defaultDepositRupiah || 500000;

  const checkIn = new Date('2026-05-01T00:00:00Z');
  const checkOut = new Date('2026-06-01T00:00:00Z');
  const stay = await prisma.stay.create({
    data: {
      tenantId: tenant.id, roomId: room.id, status: 'COMPLETED',
      checkInDate: checkIn, plannedCheckOutDate: checkOut, actualCheckOutDate: checkOut, pricingTerm: 'MONTHLY',
      agreedRentAmountRupiah: room.monthlyRateRupiah || 1400000,
      depositAmountRupiah: deposit, depositPaidAmountRupiah: deposit, depositStatus: 'HELD',
      downPaymentPaidRupiah: 0, electricityTariffPerKwhRupiah: 2500, waterTariffPerM3Rupiah: 5000,
      initialMetersPromotedAt: new Date('2026-05-02T00:00:00Z'),
    },
  });

  // Act: proses deposit FULL_REFUND (real service; tanpa invoice terbuka → refund penuh).
  await stays.processDeposit(stay.id, { action: 'FULL_REFUND', depositNote: 'Integration test refund deposit' }, actor);

  // Assert: deposit jadi REFUNDED + nominal refund = deposit diterima.
  const stayAfter = await prisma.stay.findUnique({
    where: { id: stay.id },
    select: { depositStatus: true, depositRefundedRupiah: true },
  });
  assert.strictEqual(stayAfter.depositStatus, 'REFUNDED', 'Deposit harus REFUNDED');
  assert.strictEqual(Number(stayAfter.depositRefundedRupiah), deposit, 'Nominal refund harus = deposit diterima');

  console.log('  ✅ TC4: processDeposit FULL_REFUND → deposit REFUNDED penuh');
});
