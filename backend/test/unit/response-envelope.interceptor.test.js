const assert = require('node:assert/strict');
const test = require('node:test');
const { StreamableFile } = require('@nestjs/common');
const { lastValueFrom, of } = require('rxjs');

const {
  ResponseEnvelopeInterceptor,
} = require('../../dist/common/interceptors/response-envelope.interceptor.js');
const {
  AllExceptionsFilter,
} = require('../../dist/common/filters/all-exceptions.filter.js');

function createHttpContext(statusCode = 200) {
  return {
    switchToHttp() {
      return {
        getRequest: () => ({ requestId: 'request-123' }),
        getResponse: () => ({ statusCode }),
      };
    },
  };
}

test('membungkus respons JSON biasa dengan envelope', async () => {
  const interceptor = new ResponseEnvelopeInterceptor();
  const result = await lastValueFrom(
    interceptor.intercept(createHttpContext(), {
      handle: () => of({ message: 'Data tersedia', data: { id: 48 } }),
    }),
  );

  assert.equal(result.success, true);
  assert.equal(result.message, 'Data tersedia');
  assert.deepEqual(result.data, { id: 48 });
  assert.equal(result.requestId, 'request-123');
  assert.match(result.timestamp, /^\d{4}-\d{2}-\d{2}T/);
});

test('meneruskan StreamableFile tanpa membungkusnya', async () => {
  const interceptor = new ResponseEnvelopeInterceptor();
  const streamableFile = new StreamableFile(Buffer.from('avatar'));
  const result = await lastValueFrom(
    interceptor.intercept(createHttpContext(), {
      handle: () => of(streamableFile),
    }),
  );

  assert.equal(result, streamableFile);
});

test('tidak membuat body untuk status 204', async () => {
  const interceptor = new ResponseEnvelopeInterceptor();
  const result = await lastValueFrom(
    interceptor.intercept(createHttpContext(204), {
      handle: () => of(undefined),
    }),
  );

  assert.equal(result, undefined);
});

test('exception filter tidak mengirim respons kedua saat header sudah terkirim', () => {
  const response = {
    headersSent: true,
    status: () => {
      throw new Error('status() tidak boleh dipanggil setelah headersSent');
    },
  };
  const host = {
    switchToHttp: () => ({
      getResponse: () => response,
      getRequest: () => ({
        url: '/api/tenants/1/profile-photo/image',
        method: 'GET',
        requestId: 'request-204',
      }),
    }),
  };

  assert.doesNotThrow(() => new AllExceptionsFilter().catch(new Error('late error'), host));
});
