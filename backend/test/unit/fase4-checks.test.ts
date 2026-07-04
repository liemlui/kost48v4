import test from 'node:test';
import assert from 'node:assert/strict';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateBackofficeTicketDto } from '../../src/modules/tickets/dto/ticket.dto';
import { normalizePushStatusCode } from '../../src/modules/push/push.service';

test('CreateBackofficeTicketDto requires category', async () => {
  const dto = plainToInstance(CreateBackofficeTicketDto, {
    title: 'AC tidak dingin',
    description: 'Kamar A AC kurang dingin',
  });

  const errors = await validate(dto);
  const categoryErrors = errors.filter((error) => error.property === 'category');

  assert.ok(categoryErrors.length > 0, 'kategori tiket backoffice should be required');
});

test('normalizePushStatusCode handles invalid or missing status codes safely', () => {
  assert.equal(normalizePushStatusCode({ statusCode: 404 }), 404);
  assert.equal(normalizePushStatusCode({ statusCode: '410' }), 410);
  assert.equal(normalizePushStatusCode({ statusCode: 'bad' }), undefined);
  assert.equal(normalizePushStatusCode(undefined), undefined);
});
