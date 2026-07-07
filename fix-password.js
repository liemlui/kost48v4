const bcrypt = require('bcryptjs');
const { Client } = require('pg');
const DB = 'postgresql://kost48s1_lurin:Lurin1234%25@localhost:5432/kost48s1_kost48_v3';
const EMAIL = 'liem.lui@gmail.com';
const PASSWORD = 'Lurin1234%';

(async () => {
  const hash = await bcrypt.hash(PASSWORD, 10);
  console.log('Hash:', hash);

  const client = new Client({ connectionString: DB });
  await client.connect();

  // Cek user
  const exist = await client.query('SELECT id FROM "User" WHERE email = $1', [EMAIL]);
  if (exist.rows.length > 0) {
    await client.query('UPDATE "User" SET "passwordHash" = $1 WHERE email = $2', [hash, EMAIL]);
    console.log('✅ Password updated');
  } else {
    await client.query(
      'INSERT INTO "User" ("fullName", email, "passwordHash", role, "isActive", "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, true, NOW(), NOW())',
      ['Liem Lui', EMAIL, hash, 'OWNER']
    );
    console.log('✅ User created');
  }

  await client.end();
  console.log('Coba login sekarang');
})().catch(e => { console.error('❌', e.message); process.exit(1); });
