/// <reference types="node" />

import 'dotenv/config';
import { defineConfig } from 'prisma/config';

const databaseUrl = process.env['DATABASE_URL'];

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required for Prisma.');
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: databaseUrl,
    // Opsional: dipakai oleh `prisma migrate diff --from-migrations` / `migrate dev`
    // untuk shadow DB. Aman bila kosong (hanya perlu saat operasi migrasi lokal).
    shadowDatabaseUrl: process.env['SHADOW_DATABASE_URL'],
  },
});