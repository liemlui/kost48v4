'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { ConflictException, NotFoundException } = require('@nestjs/common');
const { MarketingAssetsService } = require('../../dist/modules/marketing/marketing-assets.service.js');

const TMP_UPLOAD = path.join(__dirname, '../../.test-marketing-assets');
const JPEG_BYTES = Buffer.from([
  0xff, 0xd8,
  0xff, 0xc0, 0x00, 0x11, 0x08, 0x00, 0x01, 0x00, 0x01, 0x03,
  0x01, 0x11, 0x00,
  0x02, 0x11, 0x00,
  0x03, 0x11, 0x00,
  0xff, 0xd9,
]);
const PNG_BYTES = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=',
  'base64',
);
const TRUNCATED_JPEG_BYTES = Buffer.from([0xff, 0xd8, 0xff, 0xc0, 0x00, 0x11]);
const HTML_BYTES = Buffer.from('<html>not an image</html>');

test.before(() => {
  if (!fs.existsSync(TMP_UPLOAD)) {
    fs.mkdirSync(TMP_UPLOAD, { recursive: true });
  }
});

test.after(() => {
  fs.rmSync(TMP_UPLOAD, { recursive: true, force: true });
});

function makeSvc() {
  const svc = new MarketingAssetsService();
  svc.getUploadDir = () => TMP_UPLOAD;
  return svc;
}

function makeFile(overrides = {}) {
  return {
    originalname: 'asset.jpg',
    mimetype: 'image/jpeg',
    buffer: JPEG_BYTES,
    size: JPEG_BYTES.length,
    ...overrides,
  };
}

test('marketing asset upload rejects spoofed HTML image', () => {
  const svc = makeSvc();
  assert.throws(
    () => svc.upload('hero-front', makeFile({ originalname: 'asset.png', mimetype: 'image/png', buffer: HTML_BYTES, size: HTML_BYTES.length })),
    (e) => e instanceof ConflictException,
  );
});

test('marketing asset upload stores extension from magic signature', () => {
  const svc = makeSvc();
  const result = svc.upload('hero-front', makeFile({ originalname: 'asset.webp', mimetype: 'image/webp', buffer: JPEG_BYTES, size: JPEG_BYTES.length }));

  assert.match(result.url, /\/uploads\/room-images\/marketing-assets\/hero-front-\d{13}-[a-f0-9]{16}\.jpg$/i);
  assert.ok(fs.readdirSync(TMP_UPLOAD).some((f) => /^hero-front-\d{13}-[a-f0-9]{16}\.jpg$/i.test(f)));
});

test('marketing asset upload rejects truncated JPEG header', () => {
  const svc = makeSvc();
  assert.throws(
    () => svc.upload('hero-front', makeFile({
      originalname: 'asset.jpg',
      mimetype: 'image/jpeg',
      buffer: TRUNCATED_JPEG_BYTES,
      size: TRUNCATED_JPEG_BYTES.length,
    })),
    (e) => e instanceof ConflictException,
  );
});

test('marketing asset upload replaces previous file for same slot', () => {
  const svc = makeSvc();

  svc.upload('profile', makeFile({ originalname: 'profile.jpg', mimetype: 'image/jpeg', buffer: JPEG_BYTES, size: JPEG_BYTES.length }));
  svc.upload('profile', makeFile({ originalname: 'profile.png', mimetype: 'image/png', buffer: PNG_BYTES, size: PNG_BYTES.length }));

  const files = fs.readdirSync(TMP_UPLOAD).filter((f) => f.startsWith('profile-') || f.startsWith('profile.'));
  assert.strictEqual(files.length, 1);
  assert.match(files[0], /^profile-\d{13}-[a-f0-9]{16}\.png$/i);
});

test('marketing asset delete rejects unknown slot', () => {
  const svc = makeSvc();
  assert.throws(
    () => svc.delete('not-a-slot'),
    (e) => e instanceof NotFoundException,
  );
});
