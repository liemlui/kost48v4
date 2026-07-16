import { INestApplication, Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { PrismaClient } from '../generated/prisma';
import { SerializedPgClient } from './serialized-pg-client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
      throw new Error('DATABASE_URL wajib diisi untuk koneksi Prisma.');
    }

    const pool = new Pool({
      connectionString,
      max: 5,
      Client: SerializedPgClient,
    });
    const adapter = new PrismaPg(pool, { disposeExternalPool: true });

    const isProduction = process.env.NODE_ENV === 'production';
    super({ adapter, log: isProduction ? [] : ['query', 'info', 'warn', 'error'] });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  async enableShutdownHooks(app: INestApplication) {
    process.on('beforeExit', async () => {
      await app.close();
    });
  }
}
