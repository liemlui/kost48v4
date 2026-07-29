import { INestApplication, Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { PrismaClient } from '../generated/prisma';
import { SerializedPgClient } from './serialized-pg-client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly runtimePool: Pool;

  constructor() {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
      throw new Error('DATABASE_URL wajib diisi untuk koneksi Prisma.');
    }

    const pool = new Pool({
      connectionString,
      max: 3,
      Client: SerializedPgClient,
    });
    const adapter = new PrismaPg(pool, { disposeExternalPool: true });

    const isProduction = process.env.NODE_ENV === 'production';
    super({ adapter, log: isProduction ? [] : ['query', 'info', 'warn', 'error'] });
    this.runtimePool = pool;
  }

  /**
   * Session-scoped PostgreSQL lock for work that also performs network I/O.
   * A dedicated pooled connection keeps the lock valid across Prisma queries
   * without holding an interactive database transaction open.
   */
  async withPostgresAdvisoryLock<T>(
    key: number,
    work: () => Promise<T>,
  ): Promise<{ acquired: true; value: T } | { acquired: false }> {
    const client = await this.runtimePool.connect();
    let acquired = false;
    try {
      const result = await client.query<{ acquired: boolean }>(
        'SELECT pg_try_advisory_lock($1::bigint) AS acquired',
        [key],
      );
      acquired = result.rows[0]?.acquired === true;
      if (!acquired) return { acquired: false };
      return { acquired: true, value: await work() };
    } finally {
      try {
        if (acquired) {
          await client.query('SELECT pg_advisory_unlock($1::bigint)', [key]);
        }
      } finally {
        // Never leak the dedicated connection when PostgreSQL rejects the
        // unlock query (for example during a network interruption).
        client.release();
      }
    }
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
