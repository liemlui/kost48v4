// S6 — pemisahan calon penghuni vs penghuni di sisi API.
// Dua janji yang diuji di sini:
//  1. TENANT yang belum punya baris Tenant / belum punya stay ACTIVE mendapat 404 pada
//     `GET /stays/me/current` — bukan 409/500, karena FE memperlakukan 404 sebagai
//     "belum ada sewa" (tahap `browsing`).
//  2. `GET /tenant/bookings/my` untuk TENANT seperti itu mengembalikan daftar KOSONG (bukan
//     galat) dan tidak menjalankan kueri stay sama sekali — jadi tidak ada peluang
//     membocorkan stay milik tenant lain.
// Isolasi tenant saat ada data tetap diuji: kueri wajib dibatasi `tenantId` pemanggil.
const assert = require('node:assert/strict');
const test = require('node:test');
const { NotFoundException } = require('@nestjs/common');

const { StaysQueryService } = require('../../dist/modules/stays/stays-query.service.js');
const { TenantBookingsService } = require('../../dist/modules/tenant-bookings/tenant-bookings.service.js');

function tenantUser(tenantId) {
  return { id: 11, sub: 11, role: 'TENANT', email: 'tenant@kost48.test', tenantId };
}

function sqlText(sql) {
  const strings = Array.isArray(sql?.strings) ? sql.strings.join(' ') : String(sql);
  return strings.replace(/\s+/g, ' ');
}

test('S6-STAY-1 — TENANT tanpa baris Tenant: 404 pada /stays/me/current, tanpa kueri stay', async () => {
  let queried = 0;
  const prisma = {
    stay: {
      findFirst: async () => {
        queried += 1;
        return null;
      },
    },
  };
  const service = new StaysQueryService(prisma);

  await assert.rejects(
    () => service.findCurrentForTenant(tenantUser(null)),
    (err) => {
      assert.ok(err instanceof NotFoundException, 'harus NotFoundException (404)');
      assert.equal(err.getStatus(), 404);
      return true;
    },
  );
  assert.equal(queried, 0, 'tanpa tenantId tidak boleh ada kueri stay');
});

test('S6-STAY-2 — TENANT dengan tenantId tetapi tanpa stay ACTIVE: 404 dan kueri dibatasi tenantId', async () => {
  const captured = [];
  const prisma = {
    stay: {
      findFirst: async (args) => {
        captured.push(args);
        return null;
      },
    },
  };
  const service = new StaysQueryService(prisma);

  await assert.rejects(
    () => service.findCurrentForTenant(tenantUser(3)),
    (err) => err instanceof NotFoundException && err.getStatus() === 404,
  );
  assert.equal(captured.length, 1);
  assert.equal(captured[0].where.tenantId, 3, 'kueri stay wajib dibatasi tenantId pemanggil');
  assert.equal(captured[0].where.status, 'ACTIVE');
});

test('S6-STAY-3 — stay tenant lain tidak pernah ikut: filter tenantId selalu dari token, bukan input', async () => {
  const captured = [];
  const prisma = {
    stay: {
      findFirst: async (args) => {
        captured.push(args);
        return null;
      },
    },
  };
  const service = new StaysQueryService(prisma);

  // Pemanggil hanya membawa identitas dari token; tidak ada parameter tenantId yang bisa
  // dipalsukan lewat query string di service ini.
  await assert.rejects(() => service.findCurrentForTenant(tenantUser(9)));
  assert.equal(captured[0].where.tenantId, 9);
  assert.equal(Object.keys(captured[0].where).sort().join(','), 'status,tenantId');
});

test('S6-BOOK-1 — TENANT tanpa baris Tenant: /tenant/bookings/my → daftar kosong, 0 kueri', async () => {
  let rawQueries = 0;
  const prisma = {
    $queryRaw: async () => {
      rawQueries += 1;
      return [];
    },
  };
  const service = new TenantBookingsService(prisma, {}, {});

  const result = await service.findMine(tenantUser(null), {});
  assert.deepEqual(result.items, []);
  assert.equal(result.meta.totalItems, 0);
  assert.equal(rawQueries, 0, 'tanpa tenantId tidak boleh ada kueri stay');
});

test('S6-BOOK-2 — TENANT tanpa booking: daftar kosong dan kueri tetap dibatasi tenantId', async () => {
  const calls = [];
  const prisma = {
    $queryRaw: async (sql) => {
      const text = sqlText(sql);
      calls.push({ text, values: Array.isArray(sql?.values) ? sql.values : [] });
      if (text.includes('information_schema')) {
        // Probe skema booking (isBookingSchemaReady) → anggap skema siap.
        return [{ hasReservedRoomStatus: true, hasStayExpiresAt: true }];
      }
      if (text.includes('COUNT(*)::bigint')) return [{ total: 0 }];
      return [];
    },
  };
  const service = new TenantBookingsService(prisma, {}, {});

  const result = await service.findMine(tenantUser(3), {});
  assert.deepEqual(result.items, []);
  assert.equal(result.meta.totalItems, 0);

  const itemsQuery = calls.find((call) => call.text.includes('FROM "Stay" s') && !call.text.includes('COUNT(*)::bigint'));
  assert.ok(itemsQuery, 'kueri daftar booking harus dijalankan');
  assert.ok(itemsQuery.text.includes('s."tenantId" ='), 'kueri wajib memfilter tenantId');
  assert.ok(itemsQuery.values.includes(3), 'nilai tenantId pemanggil wajib ikut sebagai parameter');
  assert.ok(itemsQuery.values.includes('ACTIVE'), 'hanya stay ACTIVE yang masuk daftar');
});

test('S6-BOOK-3 — parameter halaman tetap dihormati untuk daftar kosong', async () => {
  const prisma = { $queryRaw: async () => [] };
  const service = new TenantBookingsService(prisma, {}, {});

  const result = await service.findMine(tenantUser(null), { page: 2, limit: 5 });
  assert.deepEqual(result.items, []);
  assert.equal(result.meta.page, 2);
  assert.equal(result.meta.limit, 5);
  assert.equal(result.meta.totalItems, 0);
});
