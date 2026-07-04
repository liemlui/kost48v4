import { Prisma } from '../../generated/prisma';
import { ApprovalBookingSnapshot, BookingRow } from './tenant-bookings.types';
import { mapBookingRow } from './tenant-bookings.helpers';

export async function lockApprovalBookingTx(tx: Prisma.TransactionClient, stayId: number) {
  const rows = await tx.$queryRaw<ApprovalBookingSnapshot[]>(Prisma.sql`
    SELECT
      s.id AS "stayId", s."tenantId", s."roomId", s.status AS "stayStatus", s."pricingTerm",
      s."agreedRentAmountRupiah", s."checkInDate", s."plannedCheckOutDate", s."expiresAt", s."bookingSource",
      r.code AS "roomCode", r.status AS "roomStatus", r."isActive" AS "roomIsActive", t."isActive" AS "tenantIsActive"
    FROM "Stay" s
    INNER JOIN "Room" r ON r.id = s."roomId"
    INNER JOIN "Tenant" t ON t.id = s."tenantId"
    WHERE s.id = ${stayId}
    FOR UPDATE OF s, r
  `);
  return rows[0] ?? null;
}

export async function findBookingByIdTx(tx: Prisma.TransactionClient, bookingId: number, tenantId: number) {
  const rows = await tx.$queryRaw<BookingRow[]>(Prisma.sql`
    SELECT
      s.id, s."tenantId", s."roomId", s.status, s."pricingTerm", s."agreedRentAmountRupiah", s."checkInDate",
      s."plannedCheckOutDate", s."expiresAt", s."depositAmountRupiah", s."electricityTariffPerKwhRupiah",
      s."waterTariffPerM3Rupiah", s."bookingSource", s."stayPurpose", s.notes, s."createdById", s."createdAt", s."updatedAt",
      t."fullName" AS "tenantFullName", t.phone AS "tenantPhone", t.email AS "tenantEmail",
      r.code AS "roomCode", r.name AS "roomName", r.floor AS "roomFloor", r.status AS "roomStatus"
    FROM "Stay" s
    INNER JOIN "Tenant" t ON t.id = s."tenantId"
    INNER JOIN "Room" r ON r.id = s."roomId"
    WHERE s.id = ${bookingId} AND s."tenantId" = ${tenantId}
    LIMIT 1
  `);
  return rows[0] ? mapBookingRow(rows[0]) : null;
}
