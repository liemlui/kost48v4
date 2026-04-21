const bcrypt = require('bcryptjs');

async function hashPassword() {
  const saltRounds = 10;
  const hash = await bcrypt.hash('Admin123!', saltRounds);
  console.log('Hash:', hash);
}

hashPassword().catch(console.error);