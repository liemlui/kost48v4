'use strict';

/**
 * Unit test: FacilityImagesService — upload, list, delete, exists
 *
 * Cakupan:
 *   - upload: valid slug/file, invalid slug, invalid mime
 *   - list: file listing, empty directory
 *   - delete: hapus existing, tidak ditemukan
 *   - exists: cek ada/tidak
 *
 * Catatan: test ini membuat direktori temp nyata dan membersihkannya.
 *
 * Prasyarat build: npm run build
 */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { NotFoundException, ConflictException } = require('@nestjs/common');
const { FacilityImagesService } = require('../../dist/modules/marketing/facility-images.service.js');

const TMP_UPLOAD = path.join(__dirname, '../../.test-facility-uploads');
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
const WEBP_BYTES = Buffer.from([
  0x52, 0x49, 0x46, 0x46, 0x16, 0x00, 0x00, 0x00,
  0x57, 0x45, 0x42, 0x50,
  0x56, 0x50, 0x38, 0x58,
  0x0a, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00,
  0x00, 0x00, 0x00,
]);
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
  const svc = new FacilityImagesService();
  // Override upload dir ke temp agar tidak mengotori uploads asli
  svc.getUploadDir = () => TMP_UPLOAD;
  return svc;
}

function makeFile(overrides = {}) {
  return {
    fieldname: 'file',
    originalname: 'test.jpg',
    encoding: '7bit',
    mimetype: 'image/jpeg',
    buffer: JPEG_BYTES,
    size: JPEG_BYTES.length,
    ...overrides,
  };
}

// ════════════════════════════════════════════════════════════════════════════
// upload
// ════════════════════════════════════════════════════════════════════════════

test('TC-FI01: upload berhasil — slug valid + file JPG', async () => {
  const svc = makeSvc();
  const result = await svc.upload('parkir-luas', makeFile());
  assert.ok(result.url);
  assert.ok(result.url.includes('parkir-luas'));
  // File benar-benar tersimpan
  const files = fs.readdirSync(TMP_UPLOAD);
  assert.ok(files.some((f) => /^parkir-luas-\d{13}-[a-f0-9]{16}\.jpg$/i.test(f)));
});

test('TC-FI02: upload — slug invalid (karakter terlarang)', async () => {
  const svc = makeSvc();
  await assert.rejects(
    () => svc.upload('Parkir Luas!', makeFile()),
    (e) => e instanceof ConflictException,
  );
});

test('TC-FI03: upload — slug kosong', async () => {
  const svc = makeSvc();
  await assert.rejects(
    () => svc.upload('', makeFile()),
    (e) => e instanceof ConflictException,
  );
});

test('TC-FI04: upload — mime tidak didukung', async () => {
  const svc = makeSvc();
  await assert.rejects(
    () => svc.upload('parkir', makeFile({ mimetype: 'image/gif', buffer: HTML_BYTES, size: HTML_BYTES.length })),
    (e) => e instanceof ConflictException,
  );
});

test('TC-FI05: upload — file WebP juga diterima', async () => {
  const svc = makeSvc();
  const result = await svc.upload('taman', makeFile({ originalname: 'foto.webp', mimetype: 'image/webp', buffer: WEBP_BYTES, size: WEBP_BYTES.length }));
  assert.ok(result.url.includes('taman'));
  // Overwrite dari test sebelumnya jika slug sama — tidak masalah
});

test('TC-FI06: upload — file PNG diterima', async () => {
  const svc = makeSvc();
  const result = await svc.upload('kamar-mandi', makeFile({ originalname: 'foto.png', mimetype: 'image/png', buffer: PNG_BYTES, size: PNG_BYTES.length }));
  assert.ok(result.url.includes('kamar-mandi'));
});

test('TC-FI06b: upload spoof HTML dengan mimetype image/png ditolak', async () => {
  const svc = makeSvc();
  await assert.rejects(
    () => svc.upload('spoof-html', makeFile({ originalname: 'bukti.png', mimetype: 'image/png', buffer: HTML_BYTES, size: HTML_BYTES.length })),
    (e) => e instanceof ConflictException,
  );
});

test('TC-FI06d: upload header JPEG terpotong ditolak', async () => {
  const svc = makeSvc();
  await assert.rejects(
    () => svc.upload('truncated-jpeg', makeFile({
      originalname: 'bukti.jpg',
      mimetype: 'image/jpeg',
      buffer: TRUNCATED_JPEG_BYTES,
      size: TRUNCATED_JPEG_BYTES.length,
    })),
    (e) => e instanceof ConflictException,
  );
});

test('TC-FI06c: upload memakai ekstensi dari signature, bukan originalname', async () => {
  const svc = makeSvc();
  const result = await svc.upload('signature-ext', makeFile({ originalname: 'foto.webp', mimetype: 'image/webp', buffer: JPEG_BYTES, size: JPEG_BYTES.length }));
  assert.match(result.url, /\/signature-ext-\d{13}-[a-f0-9]{16}\.jpg$/i);
});

// ════════════════════════════════════════════════════════════════════════════
// list
// ════════════════════════════════════════════════════════════════════════════

test('TC-FI07: list mengembalikan semua file yang ada', async () => {
  const svc = makeSvc();
  // Upload beberapa file dulu
  await svc.upload('test-list-a', makeFile());
  await svc.upload('test-list-b', makeFile({ originalname: 'b.webp', mimetype: 'image/webp', buffer: WEBP_BYTES, size: WEBP_BYTES.length }));
  const entries = svc.list();
  const slugs = entries.map((e) => e.slug);
  assert.ok(slugs.includes('test-list-a'));
  assert.ok(slugs.includes('test-list-b'));
  entries.forEach((e) => {
    assert.ok(e.url.startsWith('/uploads/room-images/facilities/'));
  });
});

test('TC-FI08: list pada direktori kosong', async () => {
  // Buat svc dengan dir kosong baru
  const emptyDir = path.join(TMP_UPLOAD, 'empty');
  if (!fs.existsSync(emptyDir)) fs.mkdirSync(emptyDir, { recursive: true });
  const svc = makeSvc();
  svc.getUploadDir = () => emptyDir;
  const entries = svc.list();
  assert.deepStrictEqual(entries, []);
});

// ════════════════════════════════════════════════════════════════════════════
// delete
// ════════════════════════════════════════════════════════════════════════════

test('TC-FI09: delete slug yang tidak ada → NotFoundException', async () => {
  const svc = makeSvc();
  assert.throws(
    () => svc.delete('tidak-ada'),
    (e) => e instanceof NotFoundException,
  );
});

test('TC-FI10: delete berhasil menghapus file', async () => {
  const svc = makeSvc();
  await svc.upload('hapus-nanti', makeFile());
  assert.ok(fs.readdirSync(TMP_UPLOAD).some((f) => f.startsWith('hapus-nanti-')));
  svc.delete('hapus-nanti');
  assert.ok(!fs.readdirSync(TMP_UPLOAD).some((f) => f.startsWith('hapus-nanti-') || f.startsWith('hapus-nanti.')));
});

test('TC-FI11: delete menghapus semua ekstensi slug yang sama', async () => {
  const svc = makeSvc();
  await svc.upload('multi-ext', makeFile({ originalname: 'a.jpg', mimetype: 'image/jpeg' }));
  await svc.upload('multi-ext', makeFile({ originalname: 'a.webp', mimetype: 'image/webp', buffer: WEBP_BYTES, size: WEBP_BYTES.length }));
  svc.delete('multi-ext');
  assert.ok(!fs.readdirSync(TMP_UPLOAD).some((f) => f.startsWith('multi-ext-') || f.startsWith('multi-ext.')));
});

// ════════════════════════════════════════════════════════════════════════════
// exists
// ════════════════════════════════════════════════════════════════════════════

test('TC-FI12: exists — file ada → true', async () => {
  const svc = makeSvc();
  await svc.upload('ada-file', makeFile());
  assert.strictEqual(svc.exists('ada-file'), true);
});

test('TC-FI13: exists — file tidak ada → false', async () => {
  const svc = makeSvc();
  assert.strictEqual(svc.exists('tidak-ada'), false);
});
