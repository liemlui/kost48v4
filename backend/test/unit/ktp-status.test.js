const test = require('node:test');
const assert = require('node:assert/strict');
const { TenantsService } = require('../../dist/modules/tenants/tenants.service.js');

function makeService(tenantRow) {
  let updated;
  const prisma = {
    tenant: {
      findUnique: async () => tenantRow,
      update: async ({ data }) => {
        updated = data;
        return { id: tenantRow.id, ...data };
      },
    },
  };
  const audit = { log: async () => undefined };
  const service = new TenantsService(prisma, audit, {}, {}, {});
  return { service, getUpdated: () => updated };
}

const actor = { id: 9, role: 'OWNER' };

test('S-09: upload KTP menandai PENDING', async () => {
  const { service, getUpdated } = makeService({ id: 1, ktpImageFileKey: null, profilePhotoFileKey: null });
  await service.setKtpImage(1, { fileKey: 'ktp.jpg', fileUrl: '/api/tenants/1/ktp/image', mimeType: 'image/jpeg' }, actor);
  assert.equal(getUpdated().ktpStatus, 'PENDING');
});

test('S-09: verifikasi KTP menandai VERIFIED', async () => {
  const { service, getUpdated } = makeService({ id: 1, ktpImageFileKey: 'ktp.jpg', ktpVerifiedAt: null });
  await service.verifyKtp(1, actor, { method: 'MANUAL' });
  assert.equal(getUpdated().ktpStatus, 'VERIFIED');
  assert.equal(getUpdated().ktpRejectedAt, null);
});

test('S-09: tolak KTP menandai REJECTED + alasan', async () => {
  const { service, getUpdated } = makeService({ id: 1, ktpImageFileKey: 'ktp.jpg', ktpVerifiedAt: null });
  await service.rejectKtp(1, actor, 'foto buram');
  assert.equal(getUpdated().ktpStatus, 'REJECTED');
  assert.equal(getUpdated().ktpRejectionReason, 'foto buram');
  assert.ok(getUpdated().ktpRejectedAt instanceof Date);
});
