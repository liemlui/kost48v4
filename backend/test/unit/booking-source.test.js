const test = require('node:test');
const assert = require('node:assert');
const {
  isReviewableBookingSource,
  REVIEWABLE_BOOKING_SOURCES,
} = require('../../dist/modules/tenant-bookings/booking-source.helper.js');

// FE-003 T2 (18 Sep 2026): approve/reject booking hanya menerima LeadSource.WEBSITE,
// padahal booking portal tenant disimpan sebagai LeadSource.PORTAL → selalu 409.
test('FE-003 T2 — booking mandiri tenant (WEBSITE + PORTAL) dapat direview admin', () => {
  assert.strictEqual(isReviewableBookingSource('WEBSITE'), true);
  assert.strictEqual(isReviewableBookingSource('PORTAL'), true);
});

test('FE-003 T2 — sumber booking lain tetap di luar flow review booking', () => {
  for (const source of [
    'WALK_IN',
    'REFERRAL',
    'GOOGLE_MAPS',
    'INSTAGRAM',
    'TIKTOK',
    'WHATSAPP',
    'FACEBOOK',
    'OTA',
    'OTHER',
  ]) {
    assert.strictEqual(isReviewableBookingSource(source), false, `${source} tidak boleh di-review`);
  }
});

test('FE-003 T2 — nilai kosong/null bukan booking mandiri', () => {
  assert.strictEqual(isReviewableBookingSource(null), false);
  assert.strictEqual(isReviewableBookingSource(undefined), false);
  assert.strictEqual(isReviewableBookingSource(''), false);
});

test('FE-003 T2 — daftar sumber review = WEBSITE + PORTAL saja', () => {
  assert.deepStrictEqual([...REVIEWABLE_BOOKING_SOURCES], ['WEBSITE', 'PORTAL']);
});
