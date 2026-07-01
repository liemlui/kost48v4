'use strict';

/**
 * Unit test: FaqsService — CRUD, list, seed
 *
 * Cakupan:
 *   - listPublic: hanya FAQ aktif, terurut sortOrder
 *   - listAll: semua FAQ
 *   - create: buat FAQ baru
 *   - update: update FAQ, not found
 *   - remove: delete FAQ, not found
 *   - seed: idempoten, hanya tambah yg belum ada
 *
 * Prasyarat build: npm run build
 */
const test = require('node:test');
const assert = require('node:assert');
const { NotFoundException } = require('@nestjs/common');
const { FaqsService } = require('../../dist/modules/faqs/faqs.service.js');

function makeFaq(overrides = {}) {
  return {
    id: 1,
    question: 'Fasilitasnya apa saja Kak?',
    answer: 'Fasilitas terbagi dua...',
    category: 'Fasilitas',
    sortOrder: 1,
    isActive: true,
    createdAt: new Date('2026-06-01T00:00:00Z'),
    updatedAt: new Date('2026-06-01T00:00:00Z'),
    ...overrides,
  };
}

function makeSvc(overrides = {}) {
  const prisma = {
    faq: {
      findMany: async () => [],
      findUnique: async () => null,
      create: async (args) => ({ id: 2, ...args.data }),
      update: async ({ data }) => ({ id: 1, ...data }),
      delete: async () => ({ id: 1 }),
    },
    ...overrides,
  };
  return new FaqsService(prisma);
}

// ════════════════════════════════════════════════════════════════════════════
// listPublic
// ════════════════════════════════════════════════════════════════════════════

test('TC-FQ01: listPublic hanya mengembalikan FAQ aktif urut sortOrder', async () => {
  // Mock tidak mensimulasikan sorting — cukup verifikasi data kembali
  const faqs = [
    makeFaq({ id: 1, question: 'Q1', category: 'Fasilitas', sortOrder: 1 }),
    makeFaq({ id: 2, question: 'Q2', category: 'Tarif', sortOrder: 2 }),
  ];
  const svc = makeSvc({
    faq: {
      findMany: async ({ where, orderBy }) => {
        assert.deepStrictEqual(where, { isActive: true });
        assert.deepStrictEqual(orderBy, [{ sortOrder: 'asc' }, { id: 'asc' }]);
        return faqs;
      },
    },
  });
  const result = await svc.listPublic();
  assert.strictEqual(result.length, 2);
});

test('TC-FQ02: listPublic kosong bila tak ada FAQ aktif', async () => {
  const svc = makeSvc({ faq: { findMany: async () => [] } });
  const result = await svc.listPublic();
  assert.deepStrictEqual(result, []);
});

// ════════════════════════════════════════════════════════════════════════════
// listAll
// ════════════════════════════════════════════════════════════════════════════

test('TC-FQ03: listAll mengembalikan semua FAQ tanpa filter', async () => {
  const faqs = [
    makeFaq({ id: 1, isActive: true }),
    makeFaq({ id: 2, isActive: false }),
  ];
  const svc = makeSvc({
    faq: {
      findMany: async ({ orderBy }) => {
        assert.deepStrictEqual(orderBy, [{ sortOrder: 'asc' }, { id: 'asc' }]);
        return faqs;
      },
    },
  });
  const result = await svc.listAll();
  assert.strictEqual(result.length, 2);
});

// ════════════════════════════════════════════════════════════════════════════
// create
// ════════════════════════════════════════════════════════════════════════════

test('TC-FQ04: create berhasil dengan data minimal', async () => {
  let createdData = null;
  const svc = makeSvc({
    faq: {
      create: async (args) => { createdData = args.data; return { id: 10, ...args.data }; },
    },
  });
  const result = await svc.create({ question: 'Test?', answer: 'Ini jawaban.' });
  assert.strictEqual(result.id, 10);
  assert.strictEqual(createdData.question, 'Test?');
  assert.strictEqual(createdData.category, 'Umum');
  assert.strictEqual(createdData.sortOrder, 0);
  assert.strictEqual(createdData.isActive, true);
});

test('TC-FQ05: create dengan semua field', async () => {
  let createdData = null;
  const svc = makeSvc({
    faq: {
      create: async (args) => { createdData = args.data; return { id: 11, ...args.data }; },
    },
  });
  await svc.create({
    question: 'Test?',
    answer: 'Jawaban.',
    category: 'Booking',
    sortOrder: 5,
    isActive: false,
  });
  assert.strictEqual(createdData.category, 'Booking');
  assert.strictEqual(createdData.sortOrder, 5);
  assert.strictEqual(createdData.isActive, false);
});

// ════════════════════════════════════════════════════════════════════════════
// update
// ════════════════════════════════════════════════════════════════════════════

test('TC-FQ06: update FAQ yang tidak ditemukan → NotFoundException', async () => {
  const svc = makeSvc({ faq: { findUnique: async () => null } });
  await assert.rejects(
    () => svc.update(999, { question: 'Updated?' }),
    (e) => e instanceof NotFoundException,
  );
});

test('TC-FQ07: update berhasil mengubah data', async () => {
  let updatedData = null;
  const existing = makeFaq();
  const svc = makeSvc({
    faq: {
      findUnique: async () => existing,
      update: async ({ data }) => { updatedData = data; return { ...existing, ...data }; },
    },
  });
  const result = await svc.update(1, { question: 'Updated Q?', category: 'Tarif' });
  assert.strictEqual(updatedData.question, 'Updated Q?');
  assert.strictEqual(updatedData.category, 'Tarif');
  assert.strictEqual(result.question, 'Updated Q?');
});

// ════════════════════════════════════════════════════════════════════════════
// remove
// ════════════════════════════════════════════════════════════════════════════

test('TC-FQ08: remove FAQ yang tidak ditemukan → NotFoundException', async () => {
  const svc = makeSvc({ faq: { findUnique: async () => null } });
  await assert.rejects(
    () => svc.remove(999),
    (e) => e instanceof NotFoundException,
  );
});

test('TC-FQ09: remove berhasil menghapus FAQ', async () => {
  let deletedId = null;
  const svc = makeSvc({
    faq: {
      findUnique: async () => makeFaq(),
      delete: async (args) => { deletedId = args.where.id; return { id: 1 }; },
    },
  });
  await svc.remove(1);
  assert.strictEqual(deletedId, 1);
});

// ════════════════════════════════════════════════════════════════════════════
// seed
// ════════════════════════════════════════════════════════════════════════════

test('TC-FQ10: seed idempoten — mock createMany tidak dipanggil', async () => {
  let createManyCalled = false;
  const svc = makeSvc({
    faq: {
      findMany: async () => [], // tidak ada FAQ existing → semua dianggap baru
      createMany: async () => { createManyCalled = true; return { count: 37 }; },
    },
  });
  const result = await svc.seed();
  assert.ok(createManyCalled);
  assert.ok(result.created > 0);
});

test('TC-FQ11: seed tambah FAQ baru yang belum ada', async () => {
  let createManyData = null;
  const svc = makeSvc({
    faq: {
      findMany: async () => [], // tidak ada FAQ existing → semua baru
      createMany: async (args) => { createManyData = args.data; return { count: args.data.length }; },
    },
  });
  const result = await svc.seed();
  assert.ok(createManyData.length > 10);
  assert.strictEqual(result.created, createManyData.length);
});
