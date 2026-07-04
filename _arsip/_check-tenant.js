const { PrismaClient } = require('./src/generated/prisma');
const c = new PrismaClient();
c.user.findMany({ where: { role: 'TENANT' }, take: 5, select: { id: true, email: true, fullName: true, role: true, tenantId: true } })
  .then(r => { console.log(JSON.stringify(r, null, 2)); return c.$disconnect(); })
  .catch(e => { console.error(e.message); return c.$disconnect(); });
