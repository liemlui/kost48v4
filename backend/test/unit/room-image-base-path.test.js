const test = require('node:test');
const assert = require('node:assert/strict');
const { ROOM_IMAGE_BASE_PATH } = require('../../dist/modules/marketing/marketing-room-images.config.js');

test('URL gambar kamar publik memakai aset statis /room-images, bukan /api/uploads', () => {
  assert.equal(ROOM_IMAGE_BASE_PATH, '/room-images');
});
