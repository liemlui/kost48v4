import { Logger } from '@nestjs/common';
import { Prisma } from '../../generated/prisma';
import { RoomStatus } from '../../common/enums/app.enums';
import { PrismaService } from '../../prisma/prisma.service';

const logger = new Logger('BookingSchemaHelper');

interface BookingSchemaStatus {
  hasReservedRoomStatus: boolean;
  hasStayExpiresAt: boolean;
}

/**
 * Shared booking schema readiness check used by:
 * - TenantBookingsService
 * - PublicBookingsService
 * - PublicRoomsService (marketing)
 * AI-01a: wrapped $queryRaw in try-catch — bila query sistem (pg_type / information_schema)
 * gagal karena DB drift atau permission, return false (anggap belum siap) alih-alih 503.
 *
 * Cache modul-level (tindak lanjut verifikasi AI-01a — cache per-caller lama tidak pernah
 * persist karena wrapper `{ current }` dibuat baru tiap panggilan):
 * - READY di-cache permanen: schema tidak bisa "mundur" selama proses hidup.
 * - BELUM SIAP / query gagal TIDAK di-cache permanen — dicek ulang paling cepat tiap
 *   RECHECK_INTERVAL_MS, sehingga backend pulih sendiri begitu migrasi dijalankan /
 *   DB sehat kembali, tanpa restart, tapi DB yang sakit tidak dihujani query sistem.
 */
const RECHECK_INTERVAL_MS = 30_000;
let schemaReady = false;
let nextCheckAt = 0;

export async function isBookingSchemaReady(prisma: PrismaService): Promise<boolean> {
  if (schemaReady) return true;

  const now = Date.now();
  if (now < nextCheckAt) return false;

  try {
    const rows = await prisma.$queryRaw<BookingSchemaStatus[]>(Prisma.sql`
      SELECT
        EXISTS (
          SELECT 1
          FROM pg_type t
          INNER JOIN pg_enum e ON e.enumtypid = t.oid
          WHERE t.typname = 'RoomStatus'
            AND e.enumlabel = ${RoomStatus.RESERVED}
        ) AS "hasReservedRoomStatus",
        EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'Stay'
            AND column_name = 'expiresAt'
        ) AS "hasStayExpiresAt"
    `);

    const status = rows[0] ?? { hasReservedRoomStatus: false, hasStayExpiresAt: false };
    schemaReady = Boolean(status.hasReservedRoomStatus) && Boolean(status.hasStayExpiresAt);
    if (!schemaReady) nextCheckAt = now + RECHECK_INTERVAL_MS;
    return schemaReady;
  } catch (err: any) {
    logger.warn('Gagal cek kesiapan schema booking (query pg_type/information_schema), anggap belum siap agar endpoint tidak 503', err?.message ?? err);
    nextCheckAt = now + RECHECK_INTERVAL_MS;
    return false;
  }
}

export function isBookingSchemaDriftError(error: unknown): boolean {
  const message = String((error as any)?.message ?? '').toLowerCase();
  const code = String((error as any)?.code ?? (error as any)?.meta?.code ?? '').toUpperCase();

  return (
    code === 'P2010'
    || message.includes('expiresat')
    || message.includes('roomstatus')
    || message.includes('depositpaidamountrupiah')
    || message.includes('depositpaymentstatus')
    || message.includes('enum roomstatus')
    || message.includes('invalid input value for enum')
    || (message.includes('column') && message.includes('does not exist'))
    || (message.includes('type') && message.includes('does not exist'))
  );
}