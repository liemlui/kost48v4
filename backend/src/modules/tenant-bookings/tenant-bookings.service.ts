import { BadRequestException, ConflictException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { Prisma } from '../../generated/prisma';
import { LeadSource, PricingTerm, RoomStatus, StayStatus } from '../../common/enums/app.enums';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import { buildMeta, buildPagination } from '../../common/utils/pagination';
import { serializePrismaResult } from '../../common/utils/serialization';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTenantBookingDto } from './dto/create-tenant-booking.dto';
import { ApproveBookingDto } from './dto/approve-booking.dto';
import { PublicRoomsQueryDto } from './dto/public-rooms-query.dto';
import { TenantBookingsQueryDto } from './dto/tenant-bookings-query.dto';

interface RoomPricingSnapshot {
  id: number;
  code: string;
  name: string | null;
  floor: string | null;
  status: string;
  isActive: boolean;
  dailyRateRupiah: number | null;
  weeklyRateRupiah: number | null;
  biWeeklyRateRupiah: number | null;
  monthlyRateRupiah: number;
  defaultDepositRupiah: number;
  electricityTariffPerKwhRupiah: number;
  waterTariffPerM3Rupiah: number;
  notes: string | null;
}

interface BookingRow {
  id: number;
  tenantId: number;
  roomId: number;
  status: string;
  pricingTerm: string;
  agreedRentAmountRupiah: number;
  checkInDate: Date;
  plannedCheckOutDate: Date | null;
  expiresAt: Date | null;
  depositAmountRupiah: number;
  electricityTariffPerKwhRupiah: number;
  waterTariffPerM3Rupiah: number;
  bookingSource: string | null;
  stayPurpose: string | null;
  notes: string | null;
  createdById: number | null;
  createdAt: Date;
  updatedAt: Date;
  tenantFullName: string;
  tenantPhone: string;
  tenantEmail: string | null;
  roomCode: string;
  roomName: string | null;
  roomFloor: string | null;
  roomStatus: string;
}

interface ApprovalBookingSnapshot {
  stayId: number;
  tenantId: number;
  roomId: number;
  stayStatus: string;
  pricingTerm: string;
  agreedRentAmountRupiah: number;
  checkInDate: Date;
  plannedCheckOutDate: Date | null;
  expiresAt: Date | null;
  bookingSource: string | null;
  roomCode: string;
  roomStatus: string;
  roomIsActive: boolean;
  tenantIsActive: boolean;
}

interface BookingSchemaStatus {
  hasReservedRoomStatus: boolean;
  hasStayExpiresAt: boolean;
}

@Injectable()
export class TenantBookingsService {
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
        this.buildPricingAvailabilityWhere(query.pricingTerm),
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
      highlightedRateRupiah: this.resolveRent(room, query.pricingTerm ?? PricingTerm.MONTHLY),
      availablePricingTerms: this.getAvailablePricingTerms(room),
    }));

    return {
      items: serializePrismaResult(transformedItems),
      meta: buildMeta(page, limit, totalItems),
    };
  }

  async createBooking(dto: CreateTenantBookingDto, user: CurrentUserPayload) {
    if (!(await this.isBookingSchemaReady())) {
      throw new ServiceUnavailableException(
        'Fitur booking belum aktif penuh karena database belum sinkron. Jalankan sinkronisasi schema terlebih dahulu.',
      );
    }

    const tenantId = user.tenantId;
    if (!tenantId) {
      throw new ConflictException('Akun tenant belum terhubung ke data tenant');
    }

    const checkInDate = this.parseDateOnly(dto.checkInDate, 'checkInDate tidak valid');
    const plannedCheckOutDate = dto.plannedCheckOutDate
      ? this.parseDateOnly(dto.plannedCheckOutDate, 'plannedCheckOutDate tidak valid')
      : null;

    if (plannedCheckOutDate && plannedCheckOutDate < checkInDate) {
      throw new BadRequestException('Tanggal rencana checkout tidak boleh sebelum check-in');
    }

    const today = this.startOfDay(new Date());
    if (checkInDate < today) {
      throw new BadRequestException('Tanggal check-in tidak boleh di masa lalu');
    }

    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant || !tenant.isActive) {
      throw new NotFoundException('Tenant tidak ditemukan atau sudah nonaktif');
    }

    const existingActiveStay = await this.prisma.stay.findFirst({
      where: {
        tenantId,
        status: StayStatus.ACTIVE as any,
      },
      select: { id: true },
    });
    if (existingActiveStay) {
      throw new ConflictException('Tenant masih memiliki stay aktif');
    }

    try {
      const createdBooking = await this.prisma.$transaction(async (tx) => {
        const lockedRooms = await tx.$queryRaw<RoomPricingSnapshot[]>(Prisma.sql`
          SELECT
            id,
            code,
            name,
            floor,
            status,
            "isActive",
            "dailyRateRupiah",
            "weeklyRateRupiah",
            "biWeeklyRateRupiah",
            "monthlyRateRupiah",
            "defaultDepositRupiah",
            "electricityTariffPerKwhRupiah",
            "waterTariffPerM3Rupiah",
            notes
          FROM "Room"
          WHERE id = ${dto.roomId}
          FOR UPDATE
        `);

        const room = lockedRooms[0];
        if (!room) {
          throw new NotFoundException('Kamar tidak ditemukan');
        }
        if (!room.isActive) {
          throw new ConflictException('Kamar tidak aktif untuk pemesanan');
        }
        if (room.status !== RoomStatus.AVAILABLE) {
          throw new ConflictException('Kamar tidak tersedia untuk dipesan');
        }

        const existingRoomStay = await tx.stay.findFirst({
          where: {
            roomId: dto.roomId,
            status: StayStatus.ACTIVE as any,
          },
          select: { id: true },
        });
        if (existingRoomStay) {
          throw new ConflictException('Kamar sudah memiliki booking atau stay aktif lain');
        }

        const agreedRentAmountRupiah = this.resolveRent(room, dto.pricingTerm);
        if (!agreedRentAmountRupiah || agreedRentAmountRupiah <= 0) {
          throw new ConflictException('Tarif kamar untuk term ini belum tersedia');
        }

        const expiresAt = this.calculateBookingExpiry(checkInDate);
        const stayPurposeSql = dto.stayPurpose
          ? Prisma.sql`CAST(${dto.stayPurpose} AS "StayPurpose")`
          : Prisma.sql`NULL`;

        await tx.$executeRaw(Prisma.sql`
          UPDATE "Room"
          SET "status" = CAST(${RoomStatus.RESERVED} AS "RoomStatus"),
              "updatedAt" = NOW()
          WHERE id = ${dto.roomId}
        `);

        const insertedRows = await tx.$queryRaw<Array<{ id: number }>>(Prisma.sql`
          INSERT INTO "Stay" (
            "tenantId",
            "roomId",
            status,
            "pricingTerm",
            "agreedRentAmountRupiah",
            "checkInDate",
            "plannedCheckOutDate",
            "expiresAt",
            "depositAmountRupiah",
            "electricityTariffPerKwhRupiah",
            "waterTariffPerM3Rupiah",
            "bookingSource",
            "stayPurpose",
            notes,
            "createdById",
            "createdAt",
            "updatedAt"
          ) VALUES (
            ${tenantId},
            ${dto.roomId},
            CAST(${StayStatus.ACTIVE} AS "StayStatus"),
            CAST(${dto.pricingTerm} AS "PricingTerm"),
            ${agreedRentAmountRupiah},
            ${checkInDate},
            ${plannedCheckOutDate},
            ${expiresAt},
            ${room.defaultDepositRupiah ?? 0},
            ${room.electricityTariffPerKwhRupiah ?? 0},
            ${room.waterTariffPerM3Rupiah ?? 0},
            CAST(${LeadSource.WEBSITE} AS "LeadSource"),
            ${stayPurposeSql},
            ${dto.notes ?? null},
            ${user.id},
            NOW(),
            NOW()
          )
          RETURNING id
        `);

        const bookingId = insertedRows[0]?.id;
        if (!bookingId) {
          throw new ConflictException('Booking gagal dibuat');
        }

        const booking = await this.findBookingByIdTx(tx, bookingId, tenantId);
        if (!booking) {
          throw new NotFoundException('Booking yang baru dibuat tidak ditemukan');
        }

        await tx.auditLog.create({
          data: {
            actorUserId: user.id,
            action: 'CREATE_BOOKING',
            entityType: 'Stay',
            entityId: String(booking.id),
            newData: booking as any,
            meta: {
              source: 'TENANT_PORTAL',
              roomId: dto.roomId,
              pricingTerm: dto.pricingTerm,
              expiresAt,
            } as any,
          },
        });

        return booking;
      });

      return serializePrismaResult(createdBooking);
    } catch (error: any) {
      if (error instanceof BadRequestException || error instanceof ConflictException || error instanceof NotFoundException) {
        throw error;
      }

      const databaseCode = error?.code ?? error?.meta?.code;
      if (databaseCode === '23505') {
        throw new ConflictException('Booking bentrok dengan stay aktif lain');
      }

      if (this.isBookingSchemaDriftError(error)) {
        throw new ServiceUnavailableException(
          'Fitur booking belum aktif penuh karena database belum sinkron. Jalankan sinkronisasi schema terlebih dahulu.',
        );
      }

      throw error;
    }
  }

  async approveBooking(stayId: number, dto: ApproveBookingDto, actor: CurrentUserPayload) {
    const initialElectricity = new Prisma.Decimal(dto.initialElectricityKwh);
    const initialWater = new Prisma.Decimal(dto.initialWaterM3);

    if (initialElectricity.lt(0) || initialWater.lt(0)) {
      throw new BadRequestException('Nilai meter tidak boleh negatif');
    }

    if (dto.agreedRentAmountRupiah < 0) {
      throw new BadRequestException('Tarif sewa disepakati tidak boleh negatif');
    }

    if (dto.depositAmountRupiah < 0) {
      throw new BadRequestException('Deposit tidak boleh negatif');
    }

    try {
      const approved = await this.prisma.$transaction(async (tx) => {
        const booking = await this.lockApprovalBookingTx(tx, stayId);
        if (!booking) {
          throw new NotFoundException('Booking tidak ditemukan');
        }

        if (booking.stayStatus !== StayStatus.ACTIVE) {
          throw new ConflictException('Booking tidak lagi aktif dan tidak dapat disetujui');
        }

        if (booking.roomStatus !== RoomStatus.RESERVED) {
          throw new ConflictException('Booking bukan booking reserved yang menunggu approval');
        }

        if (!booking.roomIsActive) {
          throw new ConflictException('Kamar tidak aktif untuk approval booking');
        }

        if (!booking.tenantIsActive) {
          throw new ConflictException('Tenant tidak aktif untuk approval booking');
        }

        if (booking.bookingSource !== LeadSource.WEBSITE) {
          throw new ConflictException('Booking ini bukan booking mandiri tenant yang dapat disetujui lewat flow ini');
        }

        if (booking.expiresAt && booking.expiresAt < new Date()) {
          throw new ConflictException('Booking sudah kedaluwarsa dan tidak dapat disetujui');
        }

        const conflictingTenantStay = await tx.stay.findFirst({
          where: {
            tenantId: booking.tenantId,
            status: StayStatus.ACTIVE as any,
            NOT: { id: stayId },
          },
          select: { id: true },
        });
        if (conflictingTenantStay) {
          throw new ConflictException('Tenant masih memiliki stay aktif lain');
        }

        const conflictingRoomStay = await tx.stay.findFirst({
          where: {
            roomId: booking.roomId,
            status: StayStatus.ACTIVE as any,
            NOT: { id: stayId },
          },
          select: { id: true },
        });
        if (conflictingRoomStay) {
          throw new ConflictException('Kamar masih memiliki stay aktif lain');
        }

        const existingInvoice = await tx.invoice.findFirst({
          where: { stayId },
          select: { id: true },
        });
        if (existingInvoice) {
          throw new ConflictException('Booking ini sudah memiliki invoice awal');
        }

        const baselineDate = this.startOfDay(new Date(booking.checkInDate));

        const existingElectricityReading = await tx.meterReading.findFirst({
          where: {
            roomId: booking.roomId,
            utilityType: 'ELECTRICITY' as any,
            readingAt: baselineDate,
          },
          select: { id: true },
        });
        if (existingElectricityReading) {
          throw new ConflictException('Meter awal listrik pada tanggal check-in sudah pernah tercatat untuk kamar ini');
        }

        const existingWaterReading = await tx.meterReading.findFirst({
          where: {
            roomId: booking.roomId,
            utilityType: 'WATER' as any,
            readingAt: baselineDate,
          },
          select: { id: true },
        });
        if (existingWaterReading) {
          throw new ConflictException('Meter awal air pada tanggal check-in sudah pernah tercatat untuk kamar ini');
        }

        const updatedStay = await tx.stay.update({
          where: { id: stayId },
          data: {
            agreedRentAmountRupiah: dto.agreedRentAmountRupiah,
            depositAmountRupiah: dto.depositAmountRupiah,
          },
        });

        const periodEnd = this.calculatePeriodEnd(
          new Date(booking.checkInDate),
          booking.pricingTerm,
          booking.plannedCheckOutDate ? new Date(booking.plannedCheckOutDate) : undefined,
        );
        const dueDate = this.calculateDueDate(periodEnd);
        const invoiceNumber = `INV-${stayId}-A-${Date.now()}`;

        const invoice = await tx.invoice.create({
          data: {
            invoiceNumber,
            stayId,
            status: 'DRAFT' as any,
            periodStart: new Date(booking.checkInDate),
            periodEnd,
            dueDate,
            notes: 'Invoice awal hasil approval booking admin',
            createdById: actor.id,
          },
        });

        await tx.invoiceLine.create({
          data: {
            invoiceId: invoice.id,
            lineType: 'RENT' as any,
            description: `Sewa kamar ${booking.roomCode} - ${booking.pricingTerm}`,
            qty: 1,
            unit: this.mapPricingTermToUnit(booking.pricingTerm),
            unitPriceRupiah: dto.agreedRentAmountRupiah,
            lineAmountRupiah: dto.agreedRentAmountRupiah,
            sortOrder: 0,
          },
        });

        const electricityMeter = await tx.meterReading.create({
          data: {
            roomId: booking.roomId,
            utilityType: 'ELECTRICITY' as any,
            readingAt: baselineDate,
            readingValue: initialElectricity,
            recordedById: actor.id,
            note: 'Meter awal saat approval booking admin',
          },
        });

        const waterMeter = await tx.meterReading.create({
          data: {
            roomId: booking.roomId,
            utilityType: 'WATER' as any,
            readingAt: baselineDate,
            readingValue: initialWater,
            recordedById: actor.id,
            note: 'Meter awal saat approval booking admin',
          },
        });

        await tx.auditLog.create({
          data: {
            actorUserId: actor.id,
            action: 'APPROVE_BOOKING',
            entityType: 'Stay',
            entityId: String(updatedStay.id),
            oldData: {
              agreedRentAmountRupiah: booking.agreedRentAmountRupiah ?? null,
              depositAmountRupiah: null,
              roomStatus: booking.roomStatus,
            } as any,
            newData: {
              agreedRentAmountRupiah: updatedStay.agreedRentAmountRupiah,
              depositAmountRupiah: updatedStay.depositAmountRupiah,
              roomStatus: booking.roomStatus,
            } as any,
            meta: {
              stayId,
              roomId: booking.roomId,
              tenantId: booking.tenantId,
              invoiceId: invoice.id,
              baselineReadingAt: baselineDate,
            } as any,
          },
        });

        await tx.auditLog.create({
          data: {
            actorUserId: actor.id,
            action: 'CREATE',
            entityType: 'Invoice',
            entityId: String(invoice.id),
            newData: invoice as any,
            meta: {
              source: 'BOOKING_APPROVAL',
              stayId,
            } as any,
          },
        });

        return {
          stay: {
            id: updatedStay.id,
            tenantId: updatedStay.tenantId,
            roomId: updatedStay.roomId,
            status: updatedStay.status,
            pricingTerm: updatedStay.pricingTerm,
            agreedRentAmountRupiah: updatedStay.agreedRentAmountRupiah,
            depositAmountRupiah: updatedStay.depositAmountRupiah,
            checkInDate: updatedStay.checkInDate,
            plannedCheckOutDate: updatedStay.plannedCheckOutDate,
            expiresAt: booking.expiresAt,
          },
          invoice: {
            id: invoice.id,
            invoiceNumber: invoice.invoiceNumber,
            status: invoice.status,
            periodStart: invoice.periodStart,
            periodEnd: invoice.periodEnd,
            dueDate: invoice.dueDate,
          },
          baselineMeters: {
            electricityId: electricityMeter.id,
            waterId: waterMeter.id,
            readingAt: baselineDate,
          },
        };
      });

      return serializePrismaResult(approved);
    } catch (error: any) {
      if (error instanceof BadRequestException || error instanceof ConflictException || error instanceof NotFoundException) {
        throw error;
      }

      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException('Invoice atau pembacaan meter bentrok dengan data yang sudah ada');
        }
      }

      const databaseCode = error?.code ?? error?.meta?.code;
      if (databaseCode === '23505') {
        throw new ConflictException('Approval booking bentrok dengan data aktif lain');
      }

      if (error?.message?.includes('tidak boleh lebih rendah')) {
        throw new ConflictException('Pembacaan meter tidak boleh lebih rendah dari sebelumnya');
      }

      throw error;
    }
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

    const whereSearch = query.search ? `%${query.search.trim()}%` : null;

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
        r.status AS "roomStatus"
      FROM "Stay" s
      INNER JOIN "Tenant" t ON t.id = s."tenantId"
      INNER JOIN "Room" r ON r.id = s."roomId"
      WHERE s."tenantId" = ${tenantId}
        AND s.status = CAST(${StayStatus.ACTIVE} AS "StayStatus")
        AND r.status = CAST(${RoomStatus.RESERVED} AS "RoomStatus")
        AND (
          ${whereSearch} IS NULL
          OR r.code ILIKE ${whereSearch}
          OR COALESCE(r.name, '') ILIKE ${whereSearch}
        )
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
        AND (
          ${whereSearch} IS NULL
          OR r.code ILIKE ${whereSearch}
          OR COALESCE(r.name, '') ILIKE ${whereSearch}
        )
    `);

      const totalItems = Number(countRows[0]?.total ?? 0);
      return {
        items: serializePrismaResult(items.map((item) => this.mapBookingRow(item))),
        meta: buildMeta(page, limit, totalItems),
      };
    } catch (error) {
      if (this.isBookingSchemaDriftError(error)) {
        return {
          items: [],
          meta: buildMeta(page, limit, 0),
        };
      }

      throw error;
    }
  }

  private async lockApprovalBookingTx(tx: Prisma.TransactionClient, stayId: number) {
    const rows = await tx.$queryRaw<ApprovalBookingSnapshot[]>(Prisma.sql`
      SELECT
        s.id AS "stayId",
        s."tenantId",
        s."roomId",
        s.status AS "stayStatus",
        s."pricingTerm",
        s."agreedRentAmountRupiah",
        s."checkInDate",
        s."plannedCheckOutDate",
        s."expiresAt",
        s."bookingSource",
        r.code AS "roomCode",
        r.status AS "roomStatus",
        r."isActive" AS "roomIsActive",
        t."isActive" AS "tenantIsActive"
      FROM "Stay" s
      INNER JOIN "Room" r ON r.id = s."roomId"
      INNER JOIN "Tenant" t ON t.id = s."tenantId"
      WHERE s.id = ${stayId}
      FOR UPDATE OF s, r
    `);

    return rows[0] ?? null;
  }

  private async findBookingByIdTx(tx: Prisma.TransactionClient, bookingId: number, tenantId: number) {
    const rows = await tx.$queryRaw<BookingRow[]>(Prisma.sql`
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
        r.status AS "roomStatus"
      FROM "Stay" s
      INNER JOIN "Tenant" t ON t.id = s."tenantId"
      INNER JOIN "Room" r ON r.id = s."roomId"
      WHERE s.id = ${bookingId}
        AND s."tenantId" = ${tenantId}
      LIMIT 1
    `);

    return rows[0] ? this.mapBookingRow(rows[0]) : null;
  }

  private async isBookingSchemaReady() {
    if (this.bookingSchemaStatusCache) {
      return this.bookingSchemaStatusCache.hasReservedRoomStatus && this.bookingSchemaStatusCache.hasStayExpiresAt;
    }

    const rows = await this.prisma.$queryRaw<BookingSchemaStatus[]>(Prisma.sql`
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
    this.bookingSchemaStatusCache = {
      hasReservedRoomStatus: Boolean(status.hasReservedRoomStatus),
      hasStayExpiresAt: Boolean(status.hasStayExpiresAt),
    };

    return this.bookingSchemaStatusCache.hasReservedRoomStatus && this.bookingSchemaStatusCache.hasStayExpiresAt;
  }

  private isBookingSchemaDriftError(error: unknown) {
    const message = String((error as any)?.message ?? '').toLowerCase();
    const code = String((error as any)?.code ?? (error as any)?.meta?.code ?? '').toUpperCase();

    return (
      code === 'P2010'
      || message.includes('expiresat')
      || message.includes('roomstatus')
      || message.includes('enum roomstatus')
      || message.includes('invalid input value for enum')
      || message.includes('column') && message.includes('does not exist')
      || message.includes('type') && message.includes('does not exist')
    );
  }

  private mapBookingRow(row: BookingRow) {
    return {
      id: row.id,
      tenantId: row.tenantId,
      roomId: row.roomId,
      status: row.status,
      pricingTerm: row.pricingTerm,
      agreedRentAmountRupiah: row.agreedRentAmountRupiah,
      checkInDate: row.checkInDate,
      plannedCheckOutDate: row.plannedCheckOutDate,
      expiresAt: row.expiresAt,
      depositAmountRupiah: row.depositAmountRupiah,
      electricityTariffPerKwhRupiah: row.electricityTariffPerKwhRupiah,
      waterTariffPerM3Rupiah: row.waterTariffPerM3Rupiah,
      bookingSource: row.bookingSource,
      stayPurpose: row.stayPurpose,
      notes: row.notes,
      createdById: row.createdById,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      tenant: {
        id: row.tenantId,
        fullName: row.tenantFullName,
        phone: row.tenantPhone,
        email: row.tenantEmail,
      },
      room: {
        id: row.roomId,
        code: row.roomCode,
        name: row.roomName,
        floor: row.roomFloor,
        status: row.roomStatus,
      },
    };
  }

  private buildPricingAvailabilityWhere(pricingTerm?: PricingTerm): Prisma.RoomWhereInput {
    switch (pricingTerm) {
      case PricingTerm.DAILY:
        return { dailyRateRupiah: { gt: 0 } };
      case PricingTerm.WEEKLY:
        return { weeklyRateRupiah: { gt: 0 } };
      case PricingTerm.BIWEEKLY:
        return { biWeeklyRateRupiah: { gt: 0 } };
      case PricingTerm.MONTHLY:
      case PricingTerm.SMESTERLY:
      case PricingTerm.YEARLY:
        return { monthlyRateRupiah: { gt: 0 } };
      default:
        return {};
    }
  }

  private getAvailablePricingTerms(room: RoomPricingSnapshot | Prisma.RoomGetPayload<{}>) {
    const terms: PricingTerm[] = [];
    if ((room as any).dailyRateRupiah && (room as any).dailyRateRupiah > 0) terms.push(PricingTerm.DAILY);
    if ((room as any).weeklyRateRupiah && (room as any).weeklyRateRupiah > 0) terms.push(PricingTerm.WEEKLY);
    if ((room as any).biWeeklyRateRupiah && (room as any).biWeeklyRateRupiah > 0) terms.push(PricingTerm.BIWEEKLY);
    if ((room as any).monthlyRateRupiah && (room as any).monthlyRateRupiah > 0) {
      terms.push(PricingTerm.MONTHLY, PricingTerm.SMESTERLY, PricingTerm.YEARLY);
    }
    return terms;
  }

  private resolveRent(room: RoomPricingSnapshot | Prisma.RoomGetPayload<{}>, pricingTerm: PricingTerm): number {
    if (pricingTerm === PricingTerm.DAILY) return Number((room as any).dailyRateRupiah ?? 0);
    if (pricingTerm === PricingTerm.WEEKLY) return Number((room as any).weeklyRateRupiah ?? 0);
    if (pricingTerm === PricingTerm.BIWEEKLY) return Number((room as any).biWeeklyRateRupiah ?? 0);
    return Number((room as any).monthlyRateRupiah ?? 0);
  }

  private mapPricingTermToUnit(pricingTerm: string): string {
    switch (pricingTerm) {
      case PricingTerm.DAILY:
        return 'hari';
      case PricingTerm.WEEKLY:
        return 'minggu';
      case PricingTerm.BIWEEKLY:
        return '2 minggu';
      case PricingTerm.MONTHLY:
        return 'bulan';
      case PricingTerm.SMESTERLY:
        return 'semester';
      case PricingTerm.YEARLY:
        return 'tahun';
      default:
        return 'bulan';
    }
  }

  private calculatePeriodEnd(checkInDate: Date, pricingTerm: string, plannedCheckOutDate?: Date): Date {
    if (plannedCheckOutDate) {
      return plannedCheckOutDate;
    }

    const result = new Date(checkInDate);

    switch (pricingTerm) {
      case PricingTerm.DAILY:
        result.setDate(result.getDate() + 1);
        break;
      case PricingTerm.WEEKLY:
        result.setDate(result.getDate() + 7);
        break;
      case PricingTerm.BIWEEKLY:
        result.setDate(result.getDate() + 14);
        break;
      case PricingTerm.MONTHLY:
        result.setMonth(result.getMonth() + 1);
        break;
      case PricingTerm.SMESTERLY:
        result.setMonth(result.getMonth() + 6);
        break;
      case PricingTerm.YEARLY:
        result.setFullYear(result.getFullYear() + 1);
        break;
      default:
        result.setMonth(result.getMonth() + 1);
    }

    return result;
  }

  private calculateDueDate(periodEnd: Date): Date {
    const dueDate = new Date(periodEnd);
    dueDate.setDate(dueDate.getDate() + 3);
    return dueDate;
  }

  private calculateBookingExpiry(checkInDate: Date) {
    const today = this.startOfDay(new Date());
    const hMinusTen = this.addDays(checkInDate, -10);
    const hMinusOne = this.addDays(checkInDate, -1);

    if (hMinusTen > today) return hMinusTen;
    if (hMinusOne > today) return hMinusOne;
    return today;
  }

  private addDays(date: Date, days: number) {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return this.startOfDay(next);
  }

  private startOfDay(date: Date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  private parseDateOnly(value: string, message: string) {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException(message);
    }
    return this.startOfDay(parsed);
  }
}
