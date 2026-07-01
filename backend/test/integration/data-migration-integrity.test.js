/**
 * Y-S — Data & Migration Integrity
 * ================================
 * Verifikasi integritas skema + data pada DB UAT (port 5433) memakai Prisma client:
 *  - Y-S1 Enum       → label enum di DB == nilai enum di kode (app.enums), tak ada orphan
 *  - Y-S2 Seed       → FK tidak yatim, unique tidak duplikat, tabel inti terisi
 *  - Y-S3 Migrasi    → setiap model Prisma punya tabel di DB (schema ↔ DB in-sync; aman re-apply)
 *  - Y-S4 Constraint → unique constraint ditegakkan (P2002), field wajib ditegakkan
 *
 * Prasyarat: DB UAT running + ter-seed. Jalankan via:
 *   node --test "test/integration/data-migration-integrity.test.js"
 */

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

// Muat DATABASE_URL dari .env sebelum instansiasi PrismaClient.
(function loadEnv() {
  if (process.env.DATABASE_URL) return;
  const txt = fs.readFileSync(path.join(__dirname, '../../.env'), 'utf8');
  const m = txt.match(/^DATABASE_URL=(.*)$/m);
  if (m) process.env.DATABASE_URL = m[1].replace(/^["']|["']$/g, '').trim();
})();

const { PrismaClient, Prisma } = require('../../dist/generated/prisma');
const { PrismaPg } = require('@prisma/adapter-pg');
const appEnums = require('../../dist/common/enums/app.enums.js');

let prisma;

before(async () => {
  // Prisma 7 pakai driver adapter pg (sama seperti PrismaService di app).
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL, max: 5 });
  prisma = new PrismaClient({ adapter });
  await prisma.$connect();
});

after(async () => {
  if (prisma) await prisma.$disconnect();
});

// ─────────────────────────────────────────────────────────────────────────────
// Y-S1 — Enum: label DB == nilai kode
// ─────────────────────────────────────────────────────────────────────────────
describe('Y-S1 — Prisma enum: label DB cocok dgn skema & kode', () => {
  let pgEnum;

  before(async () => {
    const pgRows = await prisma.$queryRawUnsafe(
      `SELECT t.typname AS name, e.enumlabel AS label
         FROM pg_type t JOIN pg_enum e ON e.enumtypid = t.oid
        ORDER BY t.typname, e.enumsortorder`,
    );
    pgEnum = new Map();
    for (const r of pgRows) {
      if (!pgEnum.has(r.name)) pgEnum.set(r.name, new Set());
      pgEnum.get(r.name).add(r.label);
    }
  });

  it('label DB === enum Prisma generated (schema ↔ DB in-sync, tak ada orphan)', () => {
    assert.ok(pgEnum.size > 0, 'DB harus punya tipe enum');
    let compared = 0;
    for (const [name, dbValues] of pgEnum) {
      const genObj = Prisma[name] ?? require('../../dist/generated/prisma')[name];
      if (!genObj || typeof genObj !== 'object') continue;
      const genValues = new Set(Object.values(genObj).filter((v) => typeof v === 'string'));
      if (genValues.size === 0) continue;
      compared += 1;
      assert.deepStrictEqual(
        [...dbValues].sort(),
        [...genValues].sort(),
        `Enum ${name}: label DB tidak identik dgn enum Prisma generated`,
      );
    }
    assert.ok(compared >= 20, `harus membandingkan >=20 enum, hanya ${compared}`);
  });

  it('setiap nilai enum app.enums valid di DB (hand-mirror tak punya nilai asing)', () => {
    let compared = 0;
    for (const [name, obj] of Object.entries(appEnums)) {
      if (!pgEnum.has(name)) continue; // set/array/objek non-enum → dilewati
      const codeValues = new Set(Object.values(obj).filter((v) => typeof v === 'string'));
      if (codeValues.size === 0) continue;
      const dbValues = pgEnum.get(name);
      compared += 1;
      for (const v of codeValues) {
        assert.ok(dbValues.has(v), `Enum ${name}: nilai kode "${v}" tidak ada di DB (${[...dbValues].join(',')})`);
      }
    }
    assert.ok(compared >= 10, `harus membandingkan >=10 enum, hanya ${compared}`);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Y-S2 — Seed integrity: FK yatim, unique duplikat, tabel inti terisi
// ─────────────────────────────────────────────────────────────────────────────
describe('Y-S2 — Seed data integrity', () => {
  const orphanChecks = [
    ['Stay.roomId → Room', `SELECT COUNT(*)::int AS n FROM "Stay" s LEFT JOIN "Room" r ON s."roomId" = r.id WHERE r.id IS NULL`],
    ['Stay.tenantId → Tenant', `SELECT COUNT(*)::int AS n FROM "Stay" s LEFT JOIN "Tenant" t ON s."tenantId" = t.id WHERE t.id IS NULL`],
    ['Invoice.stayId → Stay', `SELECT COUNT(*)::int AS n FROM "Invoice" i LEFT JOIN "Stay" s ON i."stayId" = s.id WHERE s.id IS NULL`],
  ];
  for (const [label, sql] of orphanChecks) {
    it(`FK tidak yatim: ${label}`, async () => {
      const rows = await prisma.$queryRawUnsafe(sql);
      assert.strictEqual(rows[0].n, 0, `${label}: ada ${rows[0].n} baris yatim`);
    });
  }

  const uniqueChecks = [
    ['User.email', `SELECT COUNT(*)::int AS n FROM (SELECT email FROM "User" WHERE email IS NOT NULL GROUP BY email HAVING COUNT(*) > 1) d`],
    ['Invoice.invoiceNumber', `SELECT COUNT(*)::int AS n FROM (SELECT "invoiceNumber" FROM "Invoice" GROUP BY "invoiceNumber" HAVING COUNT(*) > 1) d`],
    ['Room.code', `SELECT COUNT(*)::int AS n FROM (SELECT code FROM "Room" GROUP BY code HAVING COUNT(*) > 1) d`],
  ];
  for (const [label, sql] of uniqueChecks) {
    it(`tidak ada duplikat unique: ${label}`, async () => {
      const rows = await prisma.$queryRawUnsafe(sql);
      assert.strictEqual(rows[0].n, 0, `${label}: ada ${rows[0].n} nilai duplikat`);
    });
  }

  it('tabel inti terisi (seed ter-load)', async () => {
    const [users, rooms] = await Promise.all([prisma.user.count(), prisma.room.count()]);
    assert.ok(users > 0, 'User kosong');
    assert.ok(rooms > 0, 'Room kosong');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Y-S3 — Migration/schema ↔ DB in-sync
// ─────────────────────────────────────────────────────────────────────────────
describe('Y-S3 — Setiap model Prisma punya tabel di DB (no drift)', () => {
  it('semua model DMMF ter-mapping ke tabel yg ada', async () => {
    const models = Prisma.dmmf.datamodel.models;
    assert.ok(models.length > 20, `model harus banyak, hanya ${models.length}`);
    const missing = [];
    for (const m of models) {
      const table = m.dbName || m.name;
      // cast ::text — driver pg tidak bisa deserialize tipe native `regclass`.
      const rows = await prisma.$queryRawUnsafe(`SELECT to_regclass($1)::text AS reg`, `"${table}"`);
      if (rows[0].reg === null) missing.push(table);
    }
    assert.deepStrictEqual(missing, [], `tabel hilang utk model: ${missing.join(', ')}`);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Y-S4 — Constraint enforcement
// ─────────────────────────────────────────────────────────────────────────────
describe('Y-S4 — Database constraint ditegakkan', () => {
  it('unique constraint: duplikat User.email ditolak P2002 (tidak persist)', async () => {
    const existing = await prisma.user.findFirst({ select: { email: true } });
    assert.ok(existing?.email, 'butuh minimal 1 user untuk uji duplikat');
    const before = await prisma.user.count();

    await assert.rejects(
      () => prisma.user.create({
        data: { fullName: 'Y-S4 Dup', email: existing.email, passwordHash: 'x', role: 'ADMIN' },
      }),
      (err) => {
        assert.ok(err instanceof Prisma.PrismaClientKnownRequestError, `bukan KnownRequestError: ${err}`);
        assert.strictEqual(err.code, 'P2002', `kode error harus P2002, got ${err.code}`);
        return true;
      },
    );

    const after = await prisma.user.count();
    assert.strictEqual(after, before, 'insert gagal tidak boleh menambah baris');
  });

  it('required field: create tanpa field wajib → ditolak (validation)', async () => {
    await assert.rejects(
      () => prisma.room.create({ data: {} }),
      (err) => err instanceof Prisma.PrismaClientValidationError || err?.code === 'P2011' || err?.code === 'P2012',
    );
  });
});
