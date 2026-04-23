import { ConflictException, Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import { PricingTerm, RoomStatus, StayStatus } from '../../common/enums/app.enums';
import { buildMeta, buildPagination } from '../../common/utils/pagination';
import { serializePrismaResult } from '../../common/utils/serialization';
import { PrismaService } from '../../prisma/prisma.service';
import { PublicRoomsQueryDto } from './dto/public-rooms-query.dto';
import { TenantBookingsQueryDto } from './dto/tenant-bookings-query.dto';
import { BookingRow, BookingSchemaStatus } from './tenant-bookings.types';
import { buildPricingAvailabilityWhere, getAvailablePricingTerms, isBookingSchemaDriftError, mapBookingRow, resolveRent } from './tenant-bookings.helpers';
import { isBookingSchemaReady as checkBookingSchemaReady } from './tenant-bookings.queries';

@Injectable()
export class TenantBookingsQueryService {
  private bookingSchemaStatusCache: BookingSchemaStatus | null = null;

  constructor(private readonly prisma: PrismaService) {}

  async getPublicRooms(query: PublicRoomsQueryDto) {
    const { page, limit, skip, take } = buildPagination(query.page, query.limit);

    if (!(await this.isBookingSchemaReady())) {
      return {
        items: [],
        meta: buildMeta(page, limit, 0),
      };
    }

    const where: Prisma.RoomWhereInput = {
      AND: [
        { isActive: true },
        { status: RoomStatus.AVAILABLE as any },
        query.search
          ? {
              OR: [
                { code: { contains: query.search, mode: 'insensitive' } },
                { name: { contains: query.search, mode: 'insensitive' } },
              ],
            }
          : {},
        query.floor ? { floor: query.floor } : {},
        buildPricingAvailabilityWhere(query.pricingTerm),
      ],
    };

    const [items, totalItems] = await this.prisma.$transaction([
      this.prisma.room.findMany({
        where,
        skip,
        take,
        orderBy: [{ floor: 'asc' }, { code: 'asc' }],
      }),
      this.prisma.room.count({ where }),
    ]);

    const transformedItems = items.map((room) => ({
      id: room.id,
      code: room.code,
      name: room.name,
      floor: room.floor,
      status: room.status,
      notes: room.notes,
      pricing: {
        dailyRateRupiah: room.dailyRateRupiah,
        weeklyRateRupiah: room.weeklyRateRupiah,
        biWeeklyRateRupiah: room.biWeeklyRateRupiah,
        monthlyRateRupiah: room.monthlyRateRupiah,
      },
      defaultDepositRupiah: room.defaultDepositRupiah,
      electricityTariffPerKwhRupiah: room.electricityTariffPerKwhRupiah,
      waterTariffPerM3Rupiah: room.waterTariffPerM3Rupiah,
      highlightedPricingTerm: query.pricingTerm ?? PricingTerm.MONTHLY,
      highlightedRateRupiah: resolveRent(room, query.pricingTerm ?? PricingTerm.MONTHLY),
      availablePricingTerms: getAvailablePricingTerms(room),
    }));

    return {
      items: serializePrismaResult(transformedItems),
      meta: buildMeta(page, limit, totalItems),
    };
  }

  async findMine(user: CurrentUserPayload, query: TenantBookingsQueryDto) {
    const tenantId = user.tenantId;
    if (!tenantId) {
      throw new ConflictException('Akun tenant belum terhubung ke data tenant');
    }

    const { page, limit, skip, take } = buildPagination(query.page, query.limit);
    if (!(await this.isBookingSchemaReady())) {
      return {
        items: [],
        meta: buildMeta(page, limit, 0),
      };
    }

    const whereSearch = query.search?.trim() ? `%${query.search.trim()}%` : null;
    const searchFilter = whereSearch
      ? Prisma.sql`
          AND (
            r.code ILIKE ${whereSearch}
            OR COALESCE(r.name, '') ILIKE ${whereSearch}
          )
        `
      : Prisma.empty;

    try {
      const items = await this.prisma.$queryRaw<BookingRow[]>(Prisma.sql`
      SELECT
        s.id,
        s."tenantId",
        s."roomId",
        s.status,
        s."pricingTerm",
        s."agreedRentAmountRupiah",
        s."checkInDate",
        s."plannedCheckOutDate",
        s."expiresAt",
        s."depositAmountRupiah",
        s."electricityTariffPerKwhRupiah",
        s."waterTariffPerM3Rupiah",
        s."bookingSource",
        s."stayPurpose",
        s.notes,
        s."createdById",
        s."createdAt",
        s."updatedAt",
        t."fullName" AS "tenantFullName",
        t.phone AS "tenantPhone",
        t.email AS "tenantEmail",
        r.code AS "roomCode",
        r.name AS "roomName",
        r.floor AS "roomFloor",
        r.status AS "roomStatus",
        (
          SELECT COUNT(*)::int
          FROM "Invoice" i
          WHERE i."stayId" = s.id
        ) AS "invoiceCount",
        (
          SELECT i.id
          FROM "Invoice" i
          WHERE i."stayId" = s.id
          ORDER BY i.id DESC
          LIMIT 1
        ) AS "latestInvoiceId",
        (
          SELECT i."invoiceNumber"
          FROM "Invoice" i
          WHERE i."stayId" = s.id
          ORDER BY i.id DESC
          LIMIT 1
        ) AS "latestInvoiceNumber",
        (
          SELECT i.status
          FROM "Invoice" i
          WHERE i."stayId" = s.id
          ORDER BY i.id DESC
          LIMIT 1
        ) AS "latestInvoiceStatus"
      FROM "Stay" s
      INNER JOIN "Tenant" t ON t.id = s."tenantId"
      INNER JOIN "Room" r ON r.id = s."roomId"
      WHERE s."tenantId" = ${tenantId}
        AND s.status = CAST(${StayStatus.ACTIVE} AS "StayStatus")
        AND r.status = CAST(${RoomStatus.RESERVED} AS "RoomStatus")
      ${searchFilter}
      ORDER BY s."createdAt" DESC, s.id DESC
      LIMIT ${take}
      OFFSET ${skip}
    `);

    const countRows = await this.prisma.$queryRaw<Array<{ total: bigint | number }>>(Prisma.sql`
      SELECT COUNT(*)::bigint AS total
      FROM "Stay" s
      INNER JOIN "Room" r ON r.id = s."roomId"
      WHERE s."tenantId" = ${tenantId}
        AND s.status = CAST(${StayStatus.ACTIVE} AS "StayStatus")
        AND r.status = CAST(${RoomStatus.RESERVED} AS "RoomStatus")
      ${searchFilter}
    `);

      const totalItems = Number(countRows[0]?.total ?? 0);
      return {
        items: serializePrismaResult(items.map((item) => mapBookingRow(item))),
        meta: buildMeta(page, limit, totalItems),
      };
    } catch (error) {
      if (isBookingSchemaDriftError(error)) {
        return {
          items: [],
          meta: buildMeta(page, limit, 0),
        };
      }

      throw error;
    }
  }

  private async isBookingSchemaReady() {
    if (this.bookingSchemaStatusCache) {
      return this.bookingSchemaStatusCache.hasReservedRoomStatus && this.bookingSchemaStatusCache.hasStayExpiresAt;
    }

    const isReady = await checkBookingSchemaReady(this.prisma, this.bookingSchemaStatusCache);
    this.bookingSchemaStatusCache = {
      hasReservedRoomStatus: isReady,
      hasStayExpiresAt: isReady,
    };
    return isReady;
  }
}
