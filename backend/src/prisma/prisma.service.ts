import { INestApplication, Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor() {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
      throw new Error('DATABASE_URL wajib diisi untuk koneksi Prisma.');
    }

    const adapter = new PrismaPg({
      connectionString,
      max: 5,
    });

    const isProduction = process.env.NODE_ENV === 'production';
    super({ adapter, log: isProduction ? [] : ['query', 'info', 'warn', 'error'] });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async enableShutdownHooks(app: INestApplication) {
    process.on('beforeExit', async () => {
      await app.close();
    });
  }
}