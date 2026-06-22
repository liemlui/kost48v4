'use strict';
/**
 * Unit test: AnnouncementsService — logika bisnis & kontrol akses
 * Cakupan: validateWindow, findOne (akses TENANT), publish, create/update notifikasi.
 * Prasyarat: npm run build
 */
const test = require('node:test');
const assert = require('node:assert');
const { AnnouncementsService } = require('../../dist/modules/announcements/announcements.service.js');

const OWNER = { id: 1, role: 'OWNER', tenantId: null };
const ADMIN = { id: 2, role: 'ADMIN', tenantId: null };
// Tenant dengan stay OCCUPIED (penuh akses operasional)
const TENANT_OCCUPIED = { id: 10, role: 'TENANT', tenantId: 7 };
// Tenant yang tidak sedang menghuni (hanya lihat ALL)
const TENANT_NO_STAY = { id: 11, role: 'TENANT', tenantId: 8 };

const NOOP_AUDIT = { log: async () => undefined };
const NOOP_NOTIF = { create: async () => undefined, createOnce: async () => undefined };

function makeAnnouncement(overrides = {}) {
  return {
    id: 1,
    title: 'Pemberitahuan Air Mati',
    content: 'Air akan mati 2 jam mulai pukul 10.00.',
    audience: 'ALL',
    isPublished: true,
    isPinned: false,
    publishedAt: new Date('2026-06-20T08:00:00Z'),
    startsAt: null,
    expiresAt: null,
    createdAt: new Date('2026-06-19T10:00:00Z'),
    imageUrl: null,
    imageFileKey: null,
    createdById: 1,
    ...overrides,
  };
}

/**
 * Buat AnnouncementsService dengan mock Prisma.
 * hasOccupiedStay: kontrol apakah tenant punya stay OCCUPIED.
 */
function makeService({
  announcement = null,
  hasOccupiedStay = false,
  notifSpy = null,
} = {}) {
  const prisma = {
    announcement: {
      findUnique: async () => announcement,
      findFirst: async () => null,
      create: async (args) => ({ id: 1, ...args.data }),
      update: async ({ data }) => ({ ...announcement, ...data }),
      findMany: async () => [],
      count: async () => 0,
    },
    stay: {
      findFirst: async () => hasOccupiedStay ? { id: 10 } : null,
    },
    user: {
      findMany: async () => [],
    },
    appNotification: {
      findFirst: async () => null,
    },
    $transaction: async (items) => {
      if (Array.isArray(items)) return Promise.all(items);
      return items;
    },
  };
  const notification = notifSpy ?? NOOP_NOTIF;
  return new AnnouncementsService(prisma, NOOP_AUDIT, notification);
}

// ════════════════════════════════════════════════════════════════════════════
// 1. validateWindow — batas waktu tayang
// ════════════════════════════════════════════════════════════════════════════

test('TC-AN01: startsAt di masa lalu → ConflictException', async () => {
  const svc = makeService({ announcement: null });
  // Panggil create dengan startsAt kemarin
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  await assert.rejects(
    () => svc.create({ title: 'Test', content: 'Isi', audience: 'ALL', isPublished: false, startsAt: yesterday.toISOString() }, OWNER),
    /Tanggal mulai tayang tidak boleh di masa lalu/,
  );
});

test('TC-AN02: expiresAt ≤ startsAt → ConflictException', async () => {
  const svc = makeService({ announcement: null });
  const future = new Date();
  future.setDate(future.getDate() + 5);
  const alsoFuture = new Date(future);
  alsoFuture.setDate(alsoFuture.getDate() - 1); // expiresAt < startsAt
  await assert.rejects(
    () => svc.create({
      title: 'Test',
      content: 'Isi',
      audience: 'ALL',
      isPublished: false,
      startsAt: future.toISOString(),
      expiresAt: alsoFuture.toISOString(),
    }, OWNER),
    /Tanggal berakhir harus setelah tanggal mulai tayang/,
  );
});

test('TC-AN03: startsAt sama dengan expiresAt → ConflictException', async () => {
  const svc = makeService({ announcement: null });
  const future = new Date();
  future.setDate(future.getDate() + 3);
  const sameDate = new Date(future);
  await assert.rejects(
    () => svc.create({
      title: 'Test',
      content: 'Isi',
      audience: 'ALL',
      isPublished: false,
      startsAt: future.toISOString(),
      expiresAt: sameDate.toISOString(), // sama = ≤ startsAt → invalid
    }, OWNER),
    /Tanggal berakhir harus setelah tanggal mulai tayang/,
  );
});

// ════════════════════════════════════════════════════════════════════════════
// 2. findOne() — kontrol akses TENANT
// ════════════════════════════════════════════════════════════════════════════

test('TC-AN04: Tenant tidak dapat melihat pengumuman belum dipublikasi', async () => {
  const svc = makeService({ announcement: makeAnnouncement({ isPublished: false }) });
  await assert.rejects(
    () => svc.findOne(1, TENANT_OCCUPIED),
    /Tidak berhak melihat announcement ini/,
  );
});

test('TC-AN05: Tenant tidak dapat melihat pengumuman untuk audience STAFF_ONLY', async () => {
  // audience bukan TENANT atau ALL
  const svc = makeService({ announcement: makeAnnouncement({ isPublished: true, audience: 'STAFF_ONLY' }) });
  await assert.rejects(
    () => svc.findOne(1, TENANT_OCCUPIED),
    /Tidak berhak melihat announcement ini/,
  );
});

test('TC-AN06: Tenant tidak dapat melihat pengumuman yang belum tayang (startsAt masa depan)', async () => {
  const futureStart = new Date();
  futureStart.setDate(futureStart.getDate() + 5);
  const ann = makeAnnouncement({ isPublished: true, audience: 'ALL', startsAt: futureStart });
  const svc = makeService({ announcement: ann });
  await assert.rejects(
    () => svc.findOne(1, TENANT_OCCUPIED),
    /Tidak berhak melihat announcement ini/,
  );
});

test('TC-AN07: Tenant tidak dapat melihat pengumuman yang sudah kadaluarsa', async () => {
  const pastExpiry = new Date();
  pastExpiry.setDate(pastExpiry.getDate() - 1);
  const ann = makeAnnouncement({ isPublished: true, audience: 'ALL', expiresAt: pastExpiry });
  const svc = makeService({ announcement: ann });
  await assert.rejects(
    () => svc.findOne(1, TENANT_OCCUPIED),
    /Tidak berhak melihat announcement ini/,
  );
});

test('TC-AN08: Pengumuman audience TENANT hanya untuk tenant dengan stay OCCUPIED', async () => {
  const ann = makeAnnouncement({ isPublished: true, audience: 'TENANT' });
  const svc = makeService({ announcement: ann, hasOccupiedStay: false }); // tidak huni
  await assert.rejects(
    () => svc.findOne(1, TENANT_NO_STAY),
    /hanya tersedia untuk tenant yang sedang menghuni/,
  );
});

test('TC-AN09: Tenant dengan stay OCCUPIED dapat melihat pengumuman audience TENANT', async () => {
  const ann = makeAnnouncement({ isPublished: true, audience: 'TENANT' });
  const svc = makeService({ announcement: ann, hasOccupiedStay: true });
  const result = await svc.findOne(1, TENANT_OCCUPIED);
  assert.strictEqual(result.id, 1);
});

test('TC-AN10: OWNER/ADMIN dapat melihat semua pengumuman termasuk belum dipublikasi', async () => {
  const ann = makeAnnouncement({ isPublished: false });
  const svc = makeService({ announcement: ann });
  const result = await svc.findOne(1, OWNER);
  assert.strictEqual(result.id, 1);
});

// ════════════════════════════════════════════════════════════════════════════
// 3. publish() — guard duplikasi
// ════════════════════════════════════════════════════════════════════════════

test('TC-AN11: publish() pada pengumuman yang sudah dipublikasi → ConflictException', async () => {
  const ann = makeAnnouncement({ isPublished: true });
  const prisma = {
    announcement: { findUnique: async () => ann },
  };
  const svc = new AnnouncementsService(prisma, NOOP_AUDIT, NOOP_NOTIF);
  await assert.rejects(
    () => svc.publish(1, OWNER),
    /Announcement sudah dipublikasikan/,
  );
});

test('TC-AN12: publish() berhasil — isPublished=false → true + publishedAt terisi', async () => {
  const ann = makeAnnouncement({ isPublished: false, publishedAt: null });
  let updatedData = null;
  const prisma = {
    announcement: {
      findUnique: async () => ann,
      update: async ({ data }) => { updatedData = data; return { ...ann, ...data }; },
      findMany: async () => [],
      findFirst: async () => null,
    },
    stay: { findFirst: async () => null },
    user: { findMany: async () => [] },
    appNotification: { findFirst: async () => null },
  };
  const svc = new AnnouncementsService(prisma, NOOP_AUDIT, NOOP_NOTIF);
  const result = await svc.publish(1, OWNER);
  assert.strictEqual(updatedData?.isPublished, true);
  assert.ok(updatedData?.publishedAt, 'publishedAt harus terisi saat publish');
});

// ════════════════════════════════════════════════════════════════════════════
// 4. create() — notifikasi saat dipublikasikan langsung
// ════════════════════════════════════════════════════════════════════════════

test('TC-AN13: create() dengan isPublished=false — notifikasi TIDAK dikirim', async () => {
  let notifCount = 0;
  const svc = makeService({
    announcement: makeAnnouncement({ isPublished: false }),
    notifSpy: { create: async () => { notifCount++; }, createOnce: async () => {} },
  });
  await svc.create({ title: 'Draft', content: 'Isi', audience: 'ALL', isPublished: false }, OWNER);
  assert.strictEqual(notifCount, 0, 'Tidak ada notifikasi untuk draft (belum publish)');
});

test('TC-AN14: create() dengan startsAt masa depan — notifikasi ditahan meski isPublished=true', async () => {
  let notifCount = 0;
  const futureStart = new Date();
  futureStart.setDate(futureStart.getDate() + 7);

  const svc = makeService({
    announcement: makeAnnouncement({ isPublished: true, startsAt: futureStart }),
    notifSpy: { create: async () => { notifCount++; }, createOnce: async () => {} },
  });
  // startsAt di masa depan → notifyPublished akan noop (komentar: N-02)
  await svc.create({
    title: 'Libur Lebaran',
    content: 'Kos tutup 3 hari.',
    audience: 'ALL',
    isPublished: true,
    startsAt: futureStart.toISOString(),
  }, OWNER);
  // notifyPublished dipanggil async dengan .catch() — beri waktu micro-task settle
  await new Promise((r) => setImmediate(r));
  assert.strictEqual(notifCount, 0, 'Notifikasi tidak dikirim untuk pengumuman yang belum tayang');
});

// ════════════════════════════════════════════════════════════════════════════
// 5. update() — transisi draft → published
// ════════════════════════════════════════════════════════════════════════════

test('TC-AN15: update() mengubah isPublished false → true → publishedAt terisi', async () => {
  const ann = makeAnnouncement({ isPublished: false, publishedAt: null });
  let updatedData = null;
  const prisma = {
    announcement: {
      findUnique: async () => ann,
      update: async ({ data }) => { updatedData = data; return { ...ann, ...data }; },
      findMany: async () => [],
      findFirst: async () => null,
    },
    stay: { findFirst: async () => null },
    user: { findMany: async () => [] },
    appNotification: { findFirst: async () => null },
  };
  const svc = new AnnouncementsService(prisma, NOOP_AUDIT, NOOP_NOTIF);
  await svc.update(1, { isPublished: true }, OWNER);
  assert.ok(updatedData?.publishedAt, 'publishedAt harus terisi saat transisi publish');
});

test('TC-AN16: update() tanpa mengubah isPublished — publishedAt tidak diubah', async () => {
  const existing = makeAnnouncement({ isPublished: true, publishedAt: new Date('2026-06-10T00:00:00Z') });
  let updatedData = null;
  const prisma = {
    announcement: {
      findUnique: async () => existing,
      update: async ({ data }) => { updatedData = data; return { ...existing, ...data }; },
    },
  };
  const svc = new AnnouncementsService(prisma, NOOP_AUDIT, NOOP_NOTIF);
  await svc.update(1, { content: 'Konten diperbarui.' }, OWNER);
  assert.strictEqual(updatedData?.publishedAt, undefined, 'publishedAt tidak boleh berubah saat bukan transisi');
});
