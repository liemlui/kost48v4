const assert = require('node:assert/strict');
const test = require('node:test');

const {
  SerializedPgClient,
} = require('../../dist/prisma/serialized-pg-client.js');

class TestSerializedPgClient extends SerializedPgClient {
  constructor(execute) {
    super();
    this.execute = execute;
  }

  executeQuery(config, values, callback) {
    return this.execute(config, values, callback);
  }
}

test('menjalankan promise query satu per satu sesuai urutan masuk', async () => {
  const events = [];
  let activeQueries = 0;
  let maximumActiveQueries = 0;
  const client = new TestSerializedPgClient(
    (config) =>
      new Promise((resolve) => {
        activeQueries += 1;
        maximumActiveQueries = Math.max(maximumActiveQueries, activeQueries);
        events.push(`start:${config.text}`);
        setImmediate(() => {
          events.push(`end:${config.text}`);
          activeQueries -= 1;
          resolve({ rows: [{ value: config.text }] });
        });
      }),
  );

  const first = client.query({ text: 'first' });
  const second = client.query({ text: 'second' });
  const [firstResult, secondResult] = await Promise.all([first, second]);

  assert.equal(maximumActiveQueries, 1);
  assert.deepEqual(events, [
    'start:first',
    'end:first',
    'start:second',
    'end:second',
  ]);
  assert.equal(firstResult.rows[0].value, 'first');
  assert.equal(secondResult.rows[0].value, 'second');
});

test('tetap menserialkan overload callback yang dipakai Pool', async () => {
  const events = [];
  const client = new TestSerializedPgClient((config, _values, callback) => {
    events.push(`start:${config}`);
    setImmediate(() => {
      events.push(`end:${config}`);
      callback(null, { rows: [{ value: config }] });
    });
  });

  const result = await Promise.all(
    ['first', 'second'].map(
      (query) =>
        new Promise((resolve, reject) => {
          client.query(query, (error, response) => {
            if (error) reject(error);
            else resolve(response.rows[0].value);
          });
        }),
    ),
  );

  assert.deepEqual(result, ['first', 'second']);
  assert.deepEqual(events, [
    'start:first',
    'end:first',
    'start:second',
    'end:second',
  ]);
});

test('query berikutnya tetap berjalan setelah promise query gagal', async () => {
  const events = [];
  const client = new TestSerializedPgClient((config) => {
    events.push(config.text);
    if (config.text === 'fail') return Promise.reject(new Error('query gagal'));
    return Promise.resolve({ rows: [{ value: 'ok' }] });
  });

  const failed = client.query({ text: 'fail' });
  const recovered = client.query({ text: 'recover' });

  await assert.rejects(failed, /query gagal/);
  assert.equal((await recovered).rows[0].value, 'ok');
  assert.deepEqual(events, ['fail', 'recover']);
});
