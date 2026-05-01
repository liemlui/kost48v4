import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma';
import {
  LeadSource,
  PricingTerm,
  RoomStatus,
  StayStatus,
  UserRole,
} from '../../common/enums/app.enums';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import { buildMeta, buildPagination } from '../../common/utils/pagination';
import { serializePrismaResult } from '../../common/utils/serialization';
import { PrismaService } from '../../prisma/prisma.service';
import { calculateRentByPricingTerm } from './pricing.helper';
import { startOfDay, endOfDay, parseDateOnly } from '../../common/utils/date.util';
import { isBookingSchemaReady, isBookingSchemaDriftError } from './booking-schema.helper';
import { CancelTenantBookingDto } from './dto/cancel-tenant-booking.dto';
import { CreateTenantBookingDto } from './dto/create-tenant-booking.dto';
import { ApproveBookingDto } from './dto/approve-booking.dto';
import { TenantBookingsQueryDto } from './dto/tenant-bookings-query.dto';
import { AppNotificationService } from '../notifications/app-notification.service';

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
  depositPaidAmountRupiah?: number | null;
  depositPaymentStatus?: string | null;
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
  invoiceCount?: number;
  latestInvoiceId?: number | null;
  latestInvoiceNumber?: string | null;
  latestInvoiceStatus?: string | null;
  invoiceTotalAmountRupiah?: number | null;
  invoicePaidAmountRupiah?: number | null;
  invoiceRemainingAmountRupiah?: number | null;
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

@Injectable()
export class TenantBookingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly appNotification: AppNotificationService,
  ) {}

  // -------------------------------------------------------------------------
  // CREATE BOOKING (tenant portal)
  // -------------------------------------------------------------------------

  async createBooking(dto: CreateTenantBookingDto, user: CurrentUserPayload) {
    if (!(await isBookingSchemaReady(this.prisma, { current: null }))) {
      throw new ServiceUnavailableException(
        'Fitur booking belum aktif penuh karena database belum sinkron. Jalankan sinkronisasi schema terlebih dahulu.',
      );
    }

    const tenantId = user.tenantId;
    if (!tenantId) {
      throw new ConflictException('Akun tenant belum terhubung ke data tenant');
    }

    const checkInDate = parseDateOnly(dto.checkInDate, 'checkInDate tidak valid');
    const plannedCheckOutDate = dto.plannedCheckOutDate
      ? parseDateOnly(dto.plannedCheckOutDate, 'plannedCheckOutDate tidak valid')
      : null;

    if (plannedCheckOutDate && plannedCheckOutDate < checkInDate) {
      throw new BadRequestException('Tanggal rencana checkout tidak boleh sebelum check-in');
    }

    const now = new Date();
    const today = startOfDay(now);
    if (checkInDate < today) {
      throw new BadRequestException('Tanggal check-in tidak boleh di masa lalu');
    }

    const isSameDayCheckIn = checkInDate.getTime() === today.getTime();
    const minimumBookingWindowMs = 3 * 60 * 60 * 1000;
    if (isSameDayCheckIn && (endOfDay(checkInDate).getTime() - now.getTime()) < minimumBookingWindowMs) {
      throw new BadRequestException(
        'Booking untuk hari ini sudah ditutup karena jam operasional sudah berakhir. Silakan pilih tanggal check-in mulai besok. Jam operasional booking hari ini: 08.00–21.00 WIB.',
      );
    }

    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant || !tenant.isActive) {
      throw new NotFoundException('Tenant tidak ditemukan atau sudah nonaktif');
    }

    try {
      const createdBooking = await this.prisma.$transaction(async (tx) => {
        await tx.$queryRawUnsafe(`SELECT id FROM "Tenant" WHERE id = $1 FOR UPDATE`, tenantId);

        const existingActiveStay = await tx.stay.findFirst({
          where: {
            tenantId,
            status: StayStatus.ACTIVE as any,
          },
          select: { id: true },
        });
        if (existingActiveStay) {
          throw new ConflictException('Tenant masih memiliki stay aktif');
        }

        const lockedRooms = await tx.$queryRaw<RoomPricingSnapshot[]>(Prisma.sql`
          SELECT
            id, code, name, floor, status, "isActive",
            "dailyRateRupiah", "weeklyRateRupiah", "biWeeklyRateRupiah",
            "monthlyRateRupiah", "defaultDepositRupiah",
            "electricityTariffPerKwhRupiah", "waterTariffPerM3Rupiah", notes
          FROM "Room"
          WHERE id = ${dto.roomId}
          FOR UPDATE
        `);

        const room = lockedRooms[0];
        if (!room) throw new NotFoundException('Kamar tidak ditemukan');
        if (!room.isActive) throw new ConflictException('Kamar tidak aktif untuk pemesanan');
        if (room.status !== RoomStatus.AVAILABLE) throw new ConflictException('Kamar tidak tersedia untuk dipesan');

        const existingRoomStay = await tx.stay.findFirst({
          where: { roomId: dto.roomId, status: StayStatus.ACTIVE as any },
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
          SET "status" = CAST(${RoomStatus.RESERVED} AS "RoomStatus"), "updatedAt" = NOW()
          WHERE id = ${dto.roomId}
        `);

        const insertedRows = await tx.$queryRaw<Array<{ id: number }>>(Prisma.sql`
          INSERT INTO "Stay" (
            "tenantId", "roomId", status, "pricingTerm", "agreedRentAmountRupiah",
            "checkInDate", "plannedCheckOutDate", "expiresAt", "depositAmountRupiah",
            "electricityTariffPerKwhRupiah", "waterTariffPerM3Rupiah",
            "bookingSource", "stayPurpose", notes, "createdById", "createdAt", "updatedAt"
          ) VALUES (
            ${tenantId}, ${dto.roomId},
            CAST(${StayStatus.ACTIVE} AS "StayStatus"),
            CAST(${dto.pricingTerm} AS "PricingTerm"),
            ${agreedRentAmountRupiah}, ${checkInDate}, ${plannedCheckOutDate}, ${expiresAt},
            ${room.defaultDepositRupiah ?? 0},
            ${room.electricityTariffPerKwhRupiah ?? 0}, ${room.waterTariffPerM3Rupiah ?? 0},
            CAST(${LeadSource.WEBSITE} AS "LeadSource"), ${stayPurposeSql}, ${dto.notes ?? null},
            ${user.id}, NOW(), NOW()
          )
          RETURNING id
        `);

        const bookingId = insertedRows[0]?.id;
        if (!bookingId) throw new ConflictException('Booking gagal dibuat');

        const booking = await this.findBookingByIdTx(tx, bookingId, tenantId);
        if (!booking) throw new NotFoundException('Booking yang baru dibuat tidak ditemukan');

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
      if (
        error instanceof BadRequestException ||
        error instanceof ConflictException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }

      const databaseCode = error?.code ?? error?.meta?.code;
      if (databaseCode === '23505') {
        throw new ConflictException('Booking bentrok dengan stay aktif lain');
      }

      if (isBookingSchemaDriftError(error)) {
        throw new ServiceUnavailableException(
          'Fitur booking belum aktif penuh karena database belum sinkron. Jalankan sinkronisasi schema terlebih dahulu.',
        );
      }

      throw error;
    }
  }

  // -------------------------------------------------------------------------
  // APPROVE BOOKING (admin)
  // -------------------------------------------------------------------------

  async approveBooking(stayId: number, dto: ApproveBookingDto, actor: CurrentUserPayload) {
    const initialElectricity = new Prisma.Decimal(dto.initialElectricityKwh);
    const initialWater = new Prisma.Decimal(dto.initialWaterM3);

    if (initialElectricity.lt(0) || initialWater.lt(0)) {
      throw new BadRequestException('Nilai meter tidak boleh negatif');
    }
    if (dto.agreedRentAmountRupiah <= 0) {
      throw new BadRequestException('Tarif sewa disepakati harus lebih besar dari 0');
    }
    if (dto.depositAmountRupiah < 0) {
      throw new BadRequestException('Deposit tidak boleh negatif');
    }

    try {
      const approved = await this.prisma.$transaction(async (tx) => {
        const booking = await this.lockApprovalBookingTx(tx, stayId);
        if (!booking) throw new NotFoundException('Booking tidak ditemukan');

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
          throw new ConflictException(
            'Booking ini bukan booking mandiri tenant yang dapat disetujui lewat flow ini',
          );
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

        const baselineDate = startOfDay(new Date(booking.checkInDate));

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
        const invoiceNumber = `INV-${stayId}-A-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

        const invoice = await tx.invoice.create({
          data: {
            invoiceNumber,
            stayId,
            status: 'DRAFT' as any,
            periodStart: new Date(booking.checkInDate),
            periodEnd,
            dueDate,
            issuedAt: null,
            notes: 'Invoice awal hasil approval booking admin',
            createdById: actor.id,
          },
        });

        await tx.invoiceLine.createMany({
          data: [
            {
              invoiceId: invoice.id,
              lineType: 'RENT' as any,
              description: `Sewa kamar ${booking.roomCode} - ${booking.pricingTerm}`,
              qty: 1,
              unit: this.mapPricingTermToUnit(booking.pricingTerm),
              unitPriceRupiah: dto.agreedRentAmountRupiah,
              lineAmountRupiah: dto.agreedRentAmountRupiah,
              sortOrder: 0,
            },
          ],
        });

        await tx.invoice.update({
          where: { id: invoice.id },
          data: {
            status: 'ISSUED' as any,
            issuedAt: new Date(),
          },
        });

        await tx.stay.update({
          where: { id: updatedStay.id },
          data: {
            initialElectricityKwhPending: initialElectricity,
            initialWaterM3Pending: initialWater,
            initialMetersRecordedAt: baselineDate,
            initialMetersRecordedById: actor.id,
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
              initialElectricityKwhPending: new Prisma.Decimal(initialElectricity),
              initialWaterM3Pending: new Prisma.Decimal(initialWater),
            } as any,
            meta: {
              stayId,
              roomId: booking.roomId,
              tenantId: booking.tenantId,
              invoiceId: invoice.id,
              pendingBaselineReadingAt: baselineDate,
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
            meta: { source: 'BOOKING_APPROVAL', stayId } as any,
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
            status: 'ISSUED' as any,
            periodStart: invoice.periodStart,
            periodEnd: invoice.periodEnd,
            dueDate: invoice.dueDate,
          },
          pendingBaselineMeters: {
            electricityKwh: Number(initialElectricity),
            waterM3: Number(initialWater),
            readingAt: baselineDate,
          },
        };
      });

      const tenantUserId = await this.resolveTenantPortalUser(approved.stay.tenantId);
      await this.notifyBookingApproved(tenantUserId, approved.stay.id);

      return serializePrismaResult(approved);
    } catch (error: any) {
      if (
        error instanceof BadRequestException ||
        error instanceof ConflictException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }

if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException('Invoice atau pembacaan meter bentrok dengan data yang sudah ada');
        }
      }

      const databaseCode = error?.code ?? error?.meta?.code;
      if (databaseCode === '23505') {
        throw new ConflictException('Approval booking bentrok dengan data aktif lain');
      }

      throw error;
    }
  }

  // -------------------------------------------------------------------------
  // FIND MY BOOKINGS (tenant portal)
  // -------------------------------------------------------------------------

  // -------------------------------------------------------------------------
  // CANCEL PENDING BOOKING (tenant portal)
  // -------------------------------------------------------------------------

  async cancelPendingBooking(
    stayId: number,
    user: CurrentUserPayload,
    dto: CancelTenantBookingDto,
  ) {
    const tenantId = user.tenantId;
    if (!tenantId) {
      throw new ConflictException('Akun tenant belum terhubung ke data tenant');
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        const rows = await tx.$queryRaw<Array<{
          stayId: number;
          tenantId: number;
          roomId: number;
          stayStatus: string;
          expiresAt: Date | null;
          roomStatus: string;
        }>>(Prisma.sql`
          SELECT
            s.id AS "stayId",
            s."tenantId",
            s."roomId",
            s.status AS "stayStatus",
            s."expiresAt",
            r.status AS "roomStatus"
          FROM "Stay" s
          INNER JOIN "Room" r ON r.id = s."roomId"
          WHERE s.id = ${stayId}
          FOR UPDATE OF s, r
        `);

        const row = rows[0];
        if (!row) {
          throw new NotFoundException('Booking tidak ditemukan.');
        }

        if (row.tenantId !== tenantId) {
          throw new ForbiddenException(
            'Anda tidak dapat membatalkan booking milik tenant lain.',
          );
        }

        if (row.stayStatus !== StayStatus.ACTIVE) {
          if (row.stayStatus === StayStatus.CANCELLED) {
            throw new ConflictException('Booking sudah dibatalkan.');
          }
          if (row.stayStatus === StayStatus.COMPLETED) {
            throw new ConflictException(
              'Booking sudah selesai dan tidak dapat dibatalkan.',
            );
          }
          throw new ConflictException(
            'Booking sudah disetujui dan tidak dapat dibatalkan dari halaman ini.',
          );
        }

        if (row.roomStatus !== RoomStatus.RESERVED) {
          throw new ConflictException(
            'Booking sudah menjadi hunian aktif. Gunakan proses checkout.',
          );
        }

        if (row.expiresAt && new Date(row.expiresAt) < new Date()) {
          throw new ConflictException(
            'Booking sudah kedaluwarsa dan tidak dapat dibatalkan.',
          );
        }

        const existingInvoice = await tx.invoice.findFirst({
          where: { stayId },
          select: { id: true },
        });
        if (existingInvoice) {
          throw new ConflictException(
            'Booking sudah memiliki pembayaran atau tagihan. Hubungi admin untuk pembatalan.',
          );
        }

        const existingSubmission = await tx.paymentSubmission.findFirst({
          where: { stayId },
          select: { id: true },
        });
        if (existingSubmission) {
          throw new ConflictException(
            'Booking sudah memiliki pembayaran atau tagihan. Hubungi admin untuk pembatalan.',
          );
        }

        const cancelReason =
          dto.cancelReason?.trim() ||
          'Dibatalkan oleh tenant sebelum review admin';

        await tx.$executeRaw(Prisma.sql`
          UPDATE "Room"
          SET "status" = CAST(${RoomStatus.AVAILABLE} AS "RoomStatus"), "updatedAt" = NOW()
          WHERE id = ${row.roomId}
        `);

        await tx.$executeRaw(Prisma.sql`
          UPDATE "Stay"
          SET
            "status" = CAST(${StayStatus.CANCELLED} AS "StayStatus"),
            "cancelReason" = ${cancelReason},
            "updatedAt" = NOW()
          WHERE id = ${stayId}
        `);

        await tx.auditLog.create({
          data: {
            actorUserId: user.id,
            action: 'TENANT_CANCEL_BOOKING',
            entityType: 'Stay',
            entityId: String(stayId),
            oldData: {
              stayStatus: row.stayStatus,
              roomStatus: row.roomStatus,
            } as any,
            newData: {
              stayStatus: StayStatus.CANCELLED,
              roomStatus: RoomStatus.AVAILABLE,
              cancelReason,
            } as any,
            meta: {
              tenantId,
              roomId: row.roomId,
              cancelledBy: 'TENANT',
            } as any,
          },
        });

        return serializePrismaResult({
          id: stayId,
          status: StayStatus.CANCELLED,
          cancelReason,
        });
      });
    } catch (error: any) {
      if (
        error instanceof BadRequestException ||
        error instanceof ConflictException ||
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
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

    if (!(await isBookingSchemaReady(this.prisma, { current: null }))) {
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
          s.id, s."tenantId", s."roomId", s.status, s."pricingTerm",
          s."agreedRentAmountRupiah", s."checkInDate", s."plannedCheckOutDate",
          s."expiresAt", s."depositAmountRupiah",
          COALESCE(s."depositPaidAmountRupiah", 0) AS "depositPaidAmountRupiah",
          COALESCE(CAST(s."depositPaymentStatus" AS text), 'UNPAID') AS "depositPaymentStatus",
          s."electricityTariffPerKwhRupiah", s."waterTariffPerM3Rupiah",
          s."bookingSource", s."stayPurpose", s.notes,
          s."createdById", s."createdAt", s."updatedAt",
          t."fullName" AS "tenantFullName",
          t.phone AS "tenantPhone",
          t.email AS "tenantEmail",
          r.code AS "roomCode",
          r.name AS "roomName",
          r.floor AS "roomFloor",
          r.status AS "roomStatus",
          (SELECT COUNT(*)::int FROM "Invoice" i WHERE i."stayId" = s.id) AS "invoiceCount",
          (SELECT i.id FROM "Invoice" i WHERE i."stayId" = s.id ORDER BY i.id DESC LIMIT 1) AS "latestInvoiceId",
          (SELECT i."invoiceNumber" FROM "Invoice" i WHERE i."stayId" = s.id ORDER BY i.id DESC LIMIT 1) AS "latestInvoiceNumber",
          (SELECT i.status FROM "Invoice" i WHERE i."stayId" = s.id ORDER BY i.id DESC LIMIT 1) AS "latestInvoiceStatus",
          (SELECT i."totalAmountRupiah" FROM "Invoice" i WHERE i."stayId" = s.id ORDER BY i.id DESC LIMIT 1) AS "invoiceTotalAmountRupiah",
          (SELECT COALESCE(SUM(ip."amountRupiah")::int, 0)
           FROM "InvoicePayment" ip
           WHERE ip."invoiceId" = (
             SELECT i.id FROM "Invoice" i WHERE i."stayId" = s.id ORDER BY i.id DESC LIMIT 1
           )) AS "invoicePaidAmountRupiah",
          (SELECT GREATEST(i."totalAmountRupiah" - COALESCE(
             (SELECT SUM(ip."amountRupiah")::int FROM "InvoicePayment" ip WHERE ip."invoiceId" = i.id), 0), 0)
           FROM "Invoice" i WHERE i."stayId" = s.id ORDER BY i.id DESC LIMIT 1
          ) AS "invoiceRemainingAmountRupiah"
        FROM "Stay" s
        INNER JOIN "Tenant" t ON t.id = s."tenantId"
        INNER JOIN "Room" r ON r.id = s."roomId"
        WHERE s."tenantId" = ${tenantId}
          AND s.status = CAST(${StayStatus.ACTIVE} AS "StayStatus")
          AND r.status = CAST(${RoomStatus.RESERVED} AS "RoomStatus")
        ${searchFilter}
        ORDER BY s."createdAt" DESC, s.id DESC
        LIMIT ${take} OFFSET ${skip}
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
        items: serializePrismaResult(items.map((item) => this.mapBookingRow(item))),
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

  // =========================================================================
  // PRIVATE HELPERS
  // =========================================================================

  private async lockApprovalBookingTx(tx: Prisma.TransactionClient, stayId: number) {
    const rows = await tx.$queryRaw<ApprovalBookingSnapshot[]>(Prisma.sql`
      SELECT
        s.id AS "stayId", s."tenantId", s."roomId", s.status AS "stayStatus",
        s."pricingTerm", s."agreedRentAmountRupiah", s."checkInDate",
        s."plannedCheckOutDate", s."expiresAt", s."bookingSource",
        r.code AS "roomCode", r.status AS "roomStatus", r."isActive" AS "roomIsActive",
        t."isActive" AS "tenantIsActive"
      FROM "Stay" s
      INNER JOIN "Room" r ON r.id = s."roomId"
      INNER JOIN "Tenant" t ON t.id = s."tenantId"
      WHERE s.id = ${stayId}
      FOR UPDATE OF s, r
    `);
    return rows[0] ?? null;
  }

  private async findBookingByIdTx(
    tx: Prisma.TransactionClient,
    bookingId: number,
    tenantId: number,
  ) {
    const rows = await tx.$queryRaw<BookingRow[]>(Prisma.sql`
      SELECT
        s.id, s."tenantId", s."roomId", s.status, s."pricingTerm",
        s."agreedRentAmountRupiah", s."checkInDate", s."plannedCheckOutDate",
        s."expiresAt", s."depositAmountRupiah",
        COALESCE(s."depositPaidAmountRupiah", 0) AS "depositPaidAmountRupiah",
        COALESCE(CAST(s."depositPaymentStatus" AS text), 'UNPAID') AS "depositPaymentStatus",
        s."electricityTariffPerKwhRupiah", s."waterTariffPerM3Rupiah",
        s."bookingSource", s."stayPurpose", s.notes,
        s."createdById", s."createdAt", s."updatedAt",
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
      WHERE s.id = ${bookingId} AND s."tenantId" = ${tenantId}
      LIMIT 1
    `);
    if (rows.length === 0) return null;
    return this.mapBookingRow(rows[0]);
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
      depositPaidAmountRupiah: row.depositPaidAmountRupiah ?? 0,
      depositPaymentStatus: row.depositPaymentStatus ?? 'UNPAID',
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
      invoiceCount: Number(row.invoiceCount ?? 0),
      latestInvoiceId: row.latestInvoiceId ?? null,
      latestInvoiceNumber: row.latestInvoiceNumber ?? null,
      latestInvoiceStatus: row.latestInvoiceStatus ?? null,
      invoiceTotalAmountRupiah: row.invoiceTotalAmountRupiah ?? null,
      invoicePaidAmountRupiah: row.invoicePaidAmountRupiah ?? null,
      invoiceRemainingAmountRupiah: row.invoiceRemainingAmountRupiah ?? null,
    };
  }

  private resolveRent(room: RoomPricingSnapshot, pricingTerm: PricingTerm): number {
    const monthlyRate = Number(room.monthlyRateRupiah ?? 0);
    if (!monthlyRate || monthlyRate <= 0) return 0;
    return calculateRentByPricingTerm(monthlyRate, pricingTerm);
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

  private calculatePeriodEnd(
    checkInDate: Date,
    pricingTerm: string,
    plannedCheckOutDate?: Date,
  ): Date {
    if (plannedCheckOutDate) return plannedCheckOutDate;

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

  private calculateBookingExpiry(_checkInDate: Date): Date {
    const now = new Date();
    return new Date(now.getTime() + 3 * 60 * 60 * 1000);
  }

  private async resolveTenantPortalUser(tenantId: number): Promise<number | null> {
    const user = await this.prisma.user.findFirst({
      where: { role: UserRole.TENANT, tenantId, isActive: true },
      select: { id: true },
    });
    return user?.id ?? null;
  }

  private async notifyBookingApproved(recipientUserId: number | null, stayId: number) {
    if (!recipientUserId) return;

    try {
      const title = 'Booking disetujui';
      const entityTypeVal = 'BOOKING';
      const entityIdVal = String(stayId);

      const existing = await this.prisma.appNotification.findFirst({
        where: {
          recipientUserId,
          entityType: entityTypeVal,
          entityId: entityIdVal,
          title,
        },
        select: { id: true },
      });

      if (existing) return;

      await this.appNotification.create({
        recipientUserId,
        title,
        body: 'Booking Anda telah disetujui. Silakan lakukan pembayaran awal.',
        linkTo: '/portal/bookings',
        entityType: entityTypeVal,
        entityId: entityIdVal,
      });
    } catch {
      // Never throw — notification is non-critical side effect
    }
  }
}