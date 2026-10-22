const test = require('node:test');
const assert = require('node:assert/strict');
const { AppNotificationService } = require('../../dist/modules/notifications/app-notification.service.js');
const {
  KtpReminderSweepService,
  ktpReminderWave,
  isKtpComplete,
  daysSinceCheckIn,
} = require('../../dist/modules/auto-ops/sweeps/ktp-reminder-sweep.service.js');

// ── Helper murni ────────────────────────────────────────────────────────────
test('W-TNT-003: pengingat KTP jatuh tempo tiap 7 hari, bukan tiap hari', () => {
  assert.equal(ktpReminderWave(0), null);
  assert.equal(ktpReminderWave(6), null);
  assert.equal(ktpReminderWave(7), 1);
  assert.equal(ktpReminderWave(13), 1);
  assert.equal(ktpReminderWave(14), 2);
  assert.equal(ktpReminderWave(21), 3);
});

test('W-TNT-003: KTP dianggap selesai saat VERIFIED (termasuk data legacy ktpVerifiedAt)', () => {
  assert.equal(isKtpComplete({ ktpStatus: 'VERIFIED', ktpVerifiedAt: null }), true);
  assert.equal(isKtpComplete({ ktpStatus: null, ktpVerifiedAt: new Date('2026-10-01') }), true);
  assert.equal(isKtpComplete({ ktpStatus: 'PENDING', ktpVerifiedAt: null }), false);
  assert.equal(isKtpComplete({ ktpStatus: null, ktpVerifiedAt: null }), false);
  assert.equal(isKtpComplete(null), false);
});

test('W-TNT-003: selisih hari dihitung dari tanggal check-in WIB', () => {
  const today = new Date(Date.UTC(2026, 9, 22));
  assert.equal(daysSinceCheckIn(new Date(Date.UTC(2026, 9, 15)), today), 7);
  assert.equal(daysSinceCheckIn(new Date('2026-10-15T18:30:00.000Z'), today), 7);
});

// ── Sweeper dengan prisma tiruan (dedupe memakai AppNotificationService asli) ─
function makeHarness({ stays, tenantUsers = [], staff = [] }) {
  const rows = [];
  const same = (row, filter) =>
    row.recipientUserId === filter.recipientUserId &&
    row.title === filter.title &&
    row.entityType === (filter.entityType ?? null) &&
    row.entityId === (filter.entityId ?? null);

  const prisma = {
    stay: { findMany: async () => stays },
    user: {
      findFirst: async ({ where }) => tenantUsers.find((u) => u.tenantId === where.tenantId) ?? null,
      findMany: async () => staff,
    },
    appNotification: {
      findFirst: async ({ where }) => rows.find((row) => same(row, where)) ?? null,
      findMany: async ({ where }) => rows.filter((row) => where.OR.some((filter) => same(row, filter))),
      create: async ({ data }) => {
        const row = { id: rows.length + 1, ...data };
        rows.push(row);
        return row;
      },
      createMany: async ({ data }) => {
        for (const entry of data) rows.push({ id: rows.length + 1, ...entry });
        return { count: data.length };
      },
    },
  };

  const notifications = new AppNotificationService(prisma);
  const sweep = new KtpReminderSweepService(prisma, notifications);
  return { sweep, rows, prisma };
}

const now = new Date('2026-10-22T03:00:00.000Z'); // 22 Okt 2026 10:00 WIB

function activeStay({ id = 1, checkInDate = new Date(Date.UTC(2026, 9, 14)), ktpStatus = 'PENDING' } = {}) {
  return {
    id,
    tenantId: 10,
    checkInDate,
    room: { code: 'A1', name: 'Kamar A1' },
    tenant: { id: 10, ktpStatus, ktpVerifiedAt: null, isActive: true },
  };
}

test('W-TNT-003: hari ke-8 → pengingat penghuni + eskalasi OWNER/ADMIN sekali', async () => {
  const { sweep, rows } = makeHarness({
    stays: [activeStay()],
    tenantUsers: [{ id: 77, tenantId: 10 }],
    staff: [{ id: 1 }, { id: 2 }],
  });

  const first = await sweep.runKtpReminders({ now, source: 'TEST' });
  assert.equal(first.remindersSent, 1);
  assert.equal(first.escalationsSent, 2);
  assert.equal(rows.length, 3);
  const tenantNote = rows.find((row) => row.recipientUserId === 77);
  assert.match(tenantNote.title, /minggu ke-1/);
  // Pesan tanpa NIK/foto/alamat — hanya kode kamar + jumlah hari.
  assert.equal(/NIK|foto KTP:|alamat/i.test(tenantNote.body), false);
  assert.match(tenantNote.body, /A1/);

  // Sweeper berjalan lagi di hari yang sama → tidak ada pengingat ganda.
  const second = await sweep.runKtpReminders({ now, source: 'TEST' });
  assert.equal(second.remindersSent, 0);
  assert.equal(second.escalationsSent, 0);
  assert.equal(rows.length, 3);
});

test('W-TNT-003: gelombang minggu ke-2 mengirim pengingat baru', async () => {
  const { sweep, rows } = makeHarness({
    stays: [activeStay()],
    tenantUsers: [{ id: 77, tenantId: 10 }],
    staff: [{ id: 1 }],
  });
  await sweep.runKtpReminders({ now, source: 'TEST' });
  const nextWeek = new Date('2026-10-29T03:00:00.000Z');
  const result = await sweep.runKtpReminders({ now: nextWeek, source: 'TEST' });
  assert.equal(result.remindersSent, 1);
  assert.match(rows[rows.length - 1].title, /minggu ke-2/);
});

test('W-TNT-003: pengingat berhenti saat KTP terverifikasi', async () => {
  const verifiedByStatus = activeStay();
  verifiedByStatus.tenant.ktpStatus = 'VERIFIED';
  const verifiedByDate = activeStay({ id: 2 });
  verifiedByDate.tenant.ktpVerifiedAt = new Date('2026-10-20T00:00:00.000Z');

  const { sweep, rows } = makeHarness({
    stays: [verifiedByStatus, verifiedByDate],
    tenantUsers: [{ id: 77, tenantId: 10 }],
    staff: [{ id: 1 }],
  });

  const result = await sweep.runKtpReminders({ now, source: 'TEST' });
  assert.equal(result.remindersSent, 0);
  assert.equal(result.escalationsSent, 0);
  assert.equal(rows.length, 0);
});

test('W-TNT-003: sebelum 7 hari belum ada pengingat', async () => {
  const { sweep, rows } = makeHarness({
    stays: [activeStay({ checkInDate: new Date(Date.UTC(2026, 9, 20)) })],
    tenantUsers: [{ id: 77, tenantId: 10 }],
    staff: [{ id: 1 }],
  });
  const result = await sweep.runKtpReminders({ now, source: 'TEST' });
  assert.equal(result.remindersSent, 0);
  assert.equal(result.escalationsSent, 0);
  assert.equal(rows.length, 0);
});
