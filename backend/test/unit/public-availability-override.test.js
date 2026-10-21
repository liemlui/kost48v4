// AL-FIX-7 (19 Okt 2026): overlay `/okupansi` hanya boleh MENURUNKAN ketersediaan.
// Sebelum perbaikan, override AVAILABLE menang atas Room.status sehingga kamar yang
// masih dihuni bisa tampil "Tersedia" di katalog publik.
const assert = require('node:assert/strict');
const test = require('node:test');

const {
  resolvePublicAvailabilityStatus,
  clearPublicAvailabilityOverrideTx,
} = require('../../dist/modules/marketing/public-availability.helper.js');

const AVAILABLE = 'AVAILABLE';
const FULL = 'FULL';
const HIDDEN = 'HIDDEN';

test('ALFIX7-1 — kamar OCCUPIED + override AVAILABLE tetap FULL (tidak diiklankan kosong)', () => {
  const result = resolvePublicAvailabilityStatus({
    status: 'OCCUPIED',
    publicAvailability: { status: AVAILABLE },
  });
  assert.equal(result, FULL, 'override AVAILABLE tidak boleh menang atas status operasional');
});

test('ALFIX7-2 — kamar AVAILABLE + override AVAILABLE tetap AVAILABLE', () => {
  const result = resolvePublicAvailabilityStatus({
    status: 'AVAILABLE',
    publicAvailability: { status: AVAILABLE },
  });
  assert.equal(result, AVAILABLE);
});

test('ALFIX7-3 — override FULL/HIDDEN selalu dihormati (arah menurunkan)', () => {
  assert.equal(
    resolvePublicAvailabilityStatus({ status: 'AVAILABLE', publicAvailability: { status: FULL } }),
    FULL,
  );
  assert.equal(
    resolvePublicAvailabilityStatus({ status: 'AVAILABLE', publicAvailability: { status: HIDDEN } }),
    HIDDEN,
  );
});

test('ALFIX7-4 — tanpa override, status diturunkan dari Room.status', () => {
  assert.equal(resolvePublicAvailabilityStatus({ status: 'AVAILABLE', publicAvailability: null }), AVAILABLE);
  assert.equal(resolvePublicAvailabilityStatus({ status: 'OCCUPIED' }), FULL);
  assert.equal(resolvePublicAvailabilityStatus({ status: 'MAINTENANCE' }), FULL);
  assert.equal(resolvePublicAvailabilityStatus({ status: 'RESERVED' }), FULL);
});

test('ALFIX7-5 — check-in menghapus overlay kamar yang bersangkutan', async () => {
  const calls = [];
  const tx = {
    publicRoomAvailability: {
      deleteMany: async (args) => {
        calls.push(args);
        return { count: 1 };
      },
    },
  };
  await clearPublicAvailabilityOverrideTx(tx, 7);
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0], { where: { roomId: 7 } });
});
