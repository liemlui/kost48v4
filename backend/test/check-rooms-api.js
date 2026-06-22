'use strict';
const http = require('http');

function req(method, path, body, headers) {
  return new Promise((resolve, reject) => {
    const opts = { hostname: 'localhost', port: 3000, path, method, headers: { 'Content-Type': 'application/json', ...headers } };
    const r = http.request(opts, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(d) }));
    });
    r.on('error', reject);
    if (body) r.write(JSON.stringify(body));
    r.end();
  });
}

(async () => {
  const login = await req('POST', '/api/auth/login', { identifier: 'owner@kost48.com', password: 'Owner#2026' }, {});
  const token = login.body.data?.accessToken ?? login.body.accessToken;
  console.log('Token OK:', !!token);

  const rooms = await req('GET', '/api/rooms?limit=2', null, { Authorization: `Bearer ${token}` });
  console.log('Status:', rooms.status);
  console.log('Keys:', Object.keys(rooms.body));
  const items = rooms.body.data ?? rooms.body.items ?? rooms.body.rooms ?? rooms.body;
  console.log('Items type:', Array.isArray(items) ? `array[${items.length}]` : typeof items);
  console.log('data keys:', Object.keys(rooms.body.data ?? {}));
  const arr = rooms.body.data?.items ?? rooms.body.data?.rooms ?? rooms.body.data ?? [];
  console.log('arr type:', Array.isArray(arr) ? `array[${arr.length}]` : typeof arr);
  if (Array.isArray(arr) && arr.length > 0) console.log('First id:', arr[0].id);
})().catch(console.error);
