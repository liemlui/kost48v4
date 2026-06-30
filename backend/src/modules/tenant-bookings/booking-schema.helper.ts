import { Prisma } from '../../generated/prisma';
import { RoomStatus } from '../../common/enums/app.enums';
import { PrismaService } from '../../prisma/prisma.service';

interface BookingSchemaStatus {
  hasReservedRoomStatus: boolean;
  hasStayExpiresAt: boolean;
}

/**
 * Shared booking schema readiness check used by:
 * - TenantBookingsService
 * - PublicBookingsService
 * - PublicRoomsService
 */
export async function isBookingSchemaReady(
  prisma: PrismaService,
  cache: { current: BookingSchemaStatus | null },
): Promise<boolean> {
  if (cache.current) {
    return cache.current.hasReservedRoomStatus && cache.current.hasStayExpiresAt;
  }

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
  cache.current = {
    hasReservedRoomStatus: Boolean(status.hasReservedRoomStatus),
    hasStayExpiresAt: Boolean(status.hasStayExpiresAt),
  };

  return cache.current.hasReservedRoomStatus && cache.current.hasStayExpiresAt;
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