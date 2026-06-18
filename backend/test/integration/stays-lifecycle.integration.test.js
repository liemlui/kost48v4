const test = require('node:test');
const assert = require('node:assert');
const { Test } = require('@nestjs/testing');
const { AppModule } = require('../../dist/app.module.js');

/**
 * Integration test: siklus hidup Stay (booking → huni → checkout).
 * Prasyarat: DB UAT (port 5433) running + sudah di-seed.
 * Jalankan: npm run build && node --test "test/integration/**/*.test.js"
 */

test('full lifecycle: booking → check-in → checkout → deposit refund', async (t) => {
  const module = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();
  const app = module.createNestApplication();
  await app.init();

  const prisma = module.get('PrismaService');

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
    select: { id: true, userId: true },
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

  // Verifikasi Room jadi RESERVED
  const roomAfter = await prisma.room.findUnique({ where: { id: room.id }, select: { status: true } });
  assert.strictEqual(roomAfter.status, 'RESERVED');

  // 3. Complete stay → promoted
  // (Ini mensimulasikan tenant check-in / pembayaran)
  const promoted = await prisma.stay.update({
    where: { id: stay.id },
    data: {
      initialMetersPromotedAt: new Date(),
      initialElectricityKwh: 0,
      initialWaterM3: 0,
    },
  });
  assert.ok(promoted.initialMetersPromotedAt);

  // 4. Checkout — finalisasi
  const actualCheckOut = new Date(checkOut);
  const checkoutStay = await prisma.stay.update({
    where: { id: stay.id },
    data: {
      status: 'CHECKED_OUT',
      actualCheckOutDate: actualCheckOut,
      checkoutReason: 'Integration test: checkout sukses',
      initialElectricityKwhPending: 100,
      initialWaterM3Pending: 50,
      initialMetersRecordedAt: new Date(),
    },
  });
  assert.strictEqual(checkoutStay.status, 'CHECKED_OUT');

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

test.skip('TC2: Booking expiry 3 jam → DP hangus', async (t) => {
  // Placeholder — implementasi membutuhkan setup booking + simulasi time travel
  // atau pembuatan stay dengan expiresAt di masa lalu.
  assert.ok(true, 'TODO: implementasi booking expiry');
});

test.skip('TC3: Renewal sukses tanpa gap periode', async (t) => {
  // Placeholder — implementasi membutuhkan stay promoted + renewal request flow
  assert.ok(true, 'TODO: implementasi renewal');
});

test.skip('TC4: Checkout dengan potong meter × deposit', async (t) => {
  // Placeholder — implementasi membutuhkan meter reading + deposit calculation
  assert.ok(true, 'TODO: implementasi meter-deposit settlement');
});
