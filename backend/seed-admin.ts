import { PrismaClient } from './src/generated/prisma';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const password = 'admin123'; // Ganti jika ingin password lain
  const hash = await bcrypt.hash(password, 10);
  
  const user = await prisma.user.upsert({
    where: { email: 'admin@kost48.com' },
    update: {
      passwordHash: hash,
      fullName: 'Admin Utama'
    },
    create: {
      fullName: 'Admin Utama',
      email: 'admin@kost48.com',
      passwordHash: hash,
      role: 'OWNER',
      isActive: true,
    },
  });
  
  console.log('✅ User siap. ID:', user.id);
  console.log('📧 Email: admin@kost48.com');
  console.log('🔑 Password:', password);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());