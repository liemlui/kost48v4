'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { BadRequestException, NotFoundException, ForbiddenException } = require('@nestjs/common');
const { MeterReadingsService } = require('../../dist/modules/meter-readings/meter-readings.service.js');

const ADMIN = { id: 1, role: 'ADMIN', tenantId: null };
const STAFF = { id: 5, role: 'STAFF', tenantId: null };

function yyyyMmDd(offsetDays = -1) {
  const d = new Date(); d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

function makeSvc(prismaOverrides = {}) {
  const prisma = {
    $transaction: async (arg) => Array.isArray(arg) ? Promise.all(arg) : arg({}),
    meterReading: { findMany: async () => [], findFirst: async () => null, create: async (a) => ({ id: 50, ...a.data }), count: async () => 0 },
    room: { findUnique: async () => ({ id: 20, status: 'OCCUPIED', isActive: true }) },
    stay: { findFirst: async () => ({ id: 1, tenantId: 100, status: 'ACTIVE' }) },
    ...prismaOverrides,
  };
  const audit = { log: async () => undefined };
  const invoices = { createFromMeterReading: async () => ({ id: 200 }) };
  const settings = { getFloat: async () => 1500 };
  return new MeterReadingsService(prisma, audit, invoices, settings);
}

test('MR-sg-01: room not found', async () => {
  const svc = makeSvc({ room: { findUnique: async () => null } });
  await assert.rejects(() => svc.create({ utilityType: 'ELECTRICITY', readingValue: '1500', readingAt: yyyyMmDd() }, ADMIN), (e) => e instanceof NotFoundException);
});

test('MR-sg-02: negative reading value', async () => {
  const svc = makeSvc();
  await assert.rejects(() => svc.create({ utilityType: 'ELECTRICITY', readingValue: '-5', readingAt: yyyyMmDd() }, ADMIN), (e) => e instanceof BadRequestException);
});

test('MR-sc-01: admin can create reading', async () => {
  const svc = makeSvc();
  const r = await svc.create({ utilityType: 'ELECTRICITY', readingValue: '1500', readingAt: yyyyMmDd() }, ADMIN);
  assert.ok(r);
  assert.ok(r.id);
});

test('MR-sc-02: staff can create reading', async () => {
  const svc = makeSvc();
  const r = await svc.create({ utilityType: 'WATER', readingValue: '50', readingAt: yyyyMmDd() }, STAFF);
  assert.ok(r);
});
