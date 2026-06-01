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
  RoomStatus,
  StayStatus,
} from '../../common/enums/app.enums';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import { buildMeta, buildPagination } from '../../common/utils/pagination';
import { serializePrismaResult } from '../../common/utils/serialization';
import { PrismaService } from '../../prisma/prisma.service';
import { startOfDay, endOfDay, parseDateOnly } from '../../common/utils/date.util';
import { isBookingSchemaReady, isBookingSchemaDriftError } from './booking-schema.helper';
import { CancelTenantBookingDto } from './dto/cancel-tenant-booking.dto';
import { CreateTenantBookingDto } from './dto/create-tenant-booking.dto';
import { ApproveBookingDto } from './dto/approve-booking.dto';
import { RejectBookingDto } from './dto/reject-booking.dto';
import { TenantBookingsQueryDto } from './dto/tenant-bookings-query.dto';
import { AppNotificationService } from '../notifications/app-notification.service';
import { AccountingPostingService } from '../accounting/accounting-posting.service';
import {
  type RoomPricingSnapshot,
  type BookingRow,
  type ApprovalBookingSnapshot,
  lockApprovalBookingTx,
  mapBookingRow,
  findBookingByIdTx,
  resolveRentFromSnapshot,
  mapPricingTermToUnit,
  addCalendarMonthsClamped,
  calculatePeriodEndFromBooking,
  calculateDueDateFromBooking,
  calculateBookingExpiry,
  resolveTenantPortalUser,
} from './tenant-bookings-helpers';

@Injectable()
export class TenantBookingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly appNotification: AppNotificationService,
    private readonly accountingPosting: AccountingPostingService,
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
      ? parseDateOnly(dto.plannedCheckOutDate, 'Tanggal renew/keluar tidak valid')
      : null;

    if (plannedCheckOutDate && plannedCheckOutDate <= checkInDate) {
      throw new BadRequestException('Tanggal renew/keluar harus setelah check-in');
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
        if (![RoomStatus.AVAILABLE, RoomStatus.RESERVED].includes(room.status as RoomStatus)) {
          throw new ConflictException('Kamar belum bisa dipesan karena sudah aktif ditempati atau sedang tidak tersedia');
        }

        const existingPaidOrOccupiedStay = await tx.stay.findFirst({
          where: {
            roomId: dto.roomId,
            status: StayStatus.ACTIVE as any,
            OR: [
              { initialMetersPromotedAt: { not: null } },
              { room: { status: RoomStatus.OCCUPIED as any } },
            ],
          },
          select: { id: true },
        });
        if (existingPaidOrOccupiedStay) {
          throw new ConflictException('Kamar sedang ditempati. Pemesanan baru belum dibuka sampai kamar siap huni.');
        }

        const agreedRentAmountRupiah = resolveRentFromSnapshot(room, dto.pricingTerm);
        if (!agreedRentAmountRupiah || agreedRentAmountRupiah <= 0) {
          throw new ConflictException('Tarif kamar untuk term ini belum tersedia');
        }

        const expiresAt = calculateBookingExpiry(checkInDate);
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

        const booking = await findBookingByIdTx(tx, bookingId, tenantId);
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
        const booking = await lockApprovalBookingTx(tx, stayId);
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
            OR: [
              { initialMetersPromotedAt: { not: null } },
              { room: { status: RoomStatus.OCCUPIED as any } },
            ],
          },
          select: { id: true },
        });
        if (conflictingRoomStay) {
          throw new ConflictException('Kamar sudah aktif ditempati. Tenant baru belum boleh bayar sampai kamar siap huni.');
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

        const periodEnd = calculatePeriodEndFromBooking(
          new Date(booking.checkInDate),
          booking.pricingTerm,
          booking.plannedCheckOutDate ? new Date(booking.plannedCheckOutDate) : undefined,
        );
        const dueDate = calculateDueDateFromBooking(periodEnd);
        const invoiceNumber = `INV-${stayId}-A-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

        const invoice = await tx.invoice.create({
          data: {
            invoiceNumber,
            stayId,
            status: 'DRAFT' as any,
            periodStart: baselineDate,
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
              unit: mapPricingTermToUnit(booking.pricingTerm),
              unitPriceRupiah: dto.agreedRentAmountRupiah,
              lineAmountRupiah: dto.agreedRentAmountRupiah,
              sortOrder: 0,
            },
          ],
        });

        const issuedInvoice = await tx.invoice.update({
          where: { id: invoice.id },
          data: {
            totalAmountRupiah: dto.agreedRentAmountRupiah,
            status: 'ISSUED' as any,
            issuedAt: new Date(),
          },
        });
        await this.accountingPosting.postInvoiceIssuedTx(tx, issuedInvoice.id, actor.id).catch(() => undefined);

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
            newData: issuedInvoice as any,
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
            id: issuedInvoice.id,
            invoiceNumber: issuedInvoice.invoiceNumber,
            status: issuedInvoice.status,
            periodStart: issuedInvoice.periodStart,
            periodEnd: issuedInvoice.periodEnd,
            dueDate: issuedInvoice.dueDate,
          },
          pendingBaselineMeters: {
            electricityKwh: Number(initialElectricity),
            waterM3: Number(initialWater),
            readingAt: baselineDate,
          },
        };
      });

      const tenantUserId = await resolveTenantPortalUser(this.prisma, approved.stay.tenantId);
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
  // REJECT BOOKING (admin)
  // -------------------------------------------------------------------------

  async rejectBooking(stayId: number, dto: RejectBookingDto, actor: CurrentUserPayload) {
    const reviewNotes = dto.reviewNotes?.trim();
    if (!reviewNotes || reviewNotes.length < 8) {
      throw new BadRequestException('Alasan penolakan booking wajib diisi minimal 8 karakter');
    }

    try {
      const rejected = await this.prisma.$transaction(async (tx) => {
        const rows = await tx.$queryRaw<Array<{
          stayId: number;
          tenantId: number;
          roomId: number;
          stayStatus: string;
          expiresAt: Date | null;
          bookingSource: string | null;
          roomStatus: string;
          tenantIsActive: boolean;
        }>>(Prisma.sql`
          SELECT
            s.id AS "stayId",
            s."tenantId",
            s."roomId",
            s.status AS "stayStatus",
            s."expiresAt",
            s."bookingSource",
            r.status AS "roomStatus",
            t."isActive" AS "tenantIsActive"
          FROM "Stay" s
          INNER JOIN "Room" r ON r.id = s."roomId"
          INNER JOIN "Tenant" t ON t.id = s."tenantId"
          WHERE s.id = ${stayId}
          FOR UPDATE OF s, r
        `);

        const row = rows[0];
        if (!row) throw new NotFoundException('Booking tidak ditemukan');

        if (row.stayStatus !== StayStatus.ACTIVE) {
          if (row.stayStatus === StayStatus.CANCELLED) {
            throw new ConflictException('Booking sudah dibatalkan');
          }
          throw new ConflictException('Booking tidak lagi aktif dan tidak dapat ditolak lewat flow ini');
        }

        if (row.roomStatus !== RoomStatus.RESERVED) {
          throw new ConflictException('Booking sudah masuk flow hunian/pembayaran. Gunakan flow lifecycle yang sesuai.');
        }

        if (row.bookingSource !== LeadSource.WEBSITE) {
          throw new ConflictException('Hanya booking website yang dapat ditolak lewat review booking');
        }

        const existingInvoice = await tx.invoice.findFirst({
          where: { stayId },
          select: { id: true, status: true },
        });
        if (existingInvoice) {
          throw new ConflictException('Booking sudah memiliki tagihan awal. Gunakan flow pembatalan tagihan/stay yang sesuai.');
        }

        const existingSubmission = await tx.paymentSubmission.findFirst({
          where: { stayId },
          select: { id: true, status: true },
        });
        if (existingSubmission) {
          throw new ConflictException('Booking sudah memiliki bukti pembayaran. Review pembayaran harus diselesaikan dari flow pembayaran.');
        }

        const otherActiveReservedBooking = await tx.stay.findFirst({
          where: {
            roomId: row.roomId,
            status: StayStatus.ACTIVE as any,
            NOT: { id: stayId },
            room: { status: RoomStatus.RESERVED as any },
          },
          select: { id: true },
        });
        const nextRoomStatus = otherActiveReservedBooking
          ? RoomStatus.RESERVED
          : RoomStatus.AVAILABLE;

        await tx.$executeRaw(Prisma.sql`
          UPDATE "Room"
          SET "status" = CAST(${nextRoomStatus} AS "RoomStatus"), "updatedAt" = NOW()
          WHERE id = ${row.roomId}
        `);

        await tx.$executeRaw(Prisma.sql`
          UPDATE "Stay"
          SET
            "status" = CAST(${StayStatus.CANCELLED} AS "StayStatus"),
            "cancelReason" = ${reviewNotes},
            "updatedAt" = NOW()
          WHERE id = ${stayId}
        `);

        await tx.auditLog.create({
          data: {
            actorUserId: actor.id,
            action: 'REJECT_BOOKING',
            entityType: 'Stay',
            entityId: String(stayId),
            oldData: {
              stayStatus: row.stayStatus,
              roomStatus: row.roomStatus,
            } as any,
            newData: {
              stayStatus: StayStatus.CANCELLED,
              roomStatus: nextRoomStatus,
              cancelReason: reviewNotes,
            } as any,
            meta: {
              tenantId: row.tenantId,
              roomId: row.roomId,
              rejectedBy: actor.role,
              source: 'ADMIN_BOOKING_REVIEW',
            } as any,
          },
        });

        return {
          id: stayId,
          status: StayStatus.CANCELLED,
          cancelReason: reviewNotes,
          roomStatusAfterSync: nextRoomStatus,
          tenantId: row.tenantId,
        };
      });

      const tenantUserId = await resolveTenantPortalUser(this.prisma, rejected.tenantId);
      await this.notifyBookingRejected(tenantUserId, rejected.id, rejected.cancelReason);

      return serializePrismaResult(rejected);
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
        throw new ConflictException('Penolakan booking bentrok dengan data aktif lain');
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

        const otherActiveReservedBooking = await tx.stay.findFirst({
          where: {
            roomId: row.roomId,
            status: StayStatus.ACTIVE as any,
            NOT: { id: stayId },
            room: { status: RoomStatus.RESERVED as any },
          },
          select: { id: true },
        });
        const nextRoomStatus = otherActiveReservedBooking
          ? RoomStatus.RESERVED
          : RoomStatus.AVAILABLE;

        await tx.$executeRaw(Prisma.sql`
          UPDATE "Room"
          SET "status" = CAST(${nextRoomStatus} AS "RoomStatus"), "updatedAt" = NOW()
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
          s."bookingSource", s."stayPurpose", s.notes, s."cancelReason",
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
          (SELECT COALESCE(NULLIF(i."totalAmountRupiah", 0), (
             SELECT COALESCE(SUM(il."lineAmountRupiah")::int, 0) FROM "InvoiceLine" il WHERE il."invoiceId" = i.id
           ))
           FROM "Invoice" i WHERE i."stayId" = s.id ORDER BY i.id DESC LIMIT 1) AS "invoiceTotalAmountRupiah",
          (SELECT COALESCE(SUM(ip."amountRupiah")::int, 0)
           FROM "InvoicePayment" ip
           WHERE ip."invoiceId" = (
             SELECT i.id FROM "Invoice" i WHERE i."stayId" = s.id ORDER BY i.id DESC LIMIT 1
           )) AS "invoicePaidAmountRupiah",
          (SELECT GREATEST(
             COALESCE(NULLIF(i."totalAmountRupiah", 0), (
               SELECT COALESCE(SUM(il."lineAmountRupiah")::int, 0) FROM "InvoiceLine" il WHERE il."invoiceId" = i.id
             )) - COALESCE(
             (SELECT SUM(ip."amountRupiah")::int FROM "InvoicePayment" ip WHERE ip."invoiceId" = i.id), 0), 0)
           FROM "Invoice" i WHERE i."stayId" = s.id ORDER BY i.id DESC LIMIT 1
          ) AS "invoiceRemainingAmountRupiah"
        FROM "Stay" s
        INNER JOIN "Tenant" t ON t.id = s."tenantId"
        INNER JOIN "Room" r ON r.id = s."roomId"
        WHERE s."tenantId" = ${tenantId}
          AND (
            (s.status = CAST(${StayStatus.ACTIVE} AS "StayStatus") AND r.status = CAST(${RoomStatus.RESERVED} AS "RoomStatus"))
            OR (s.status = CAST(${StayStatus.CANCELLED} AS "StayStatus") AND s."bookingSource" = CAST(${LeadSource.WEBSITE} AS "LeadSource"))
          )
        ${searchFilter}
        ORDER BY s."updatedAt" DESC, s."createdAt" DESC, s.id DESC
        LIMIT ${take} OFFSET ${skip}
      `);

      const countRows = await this.prisma.$queryRaw<Array<{ total: bigint | number }>>(Prisma.sql`
        SELECT COUNT(*)::bigint AS total
        FROM "Stay" s
        INNER JOIN "Room" r ON r.id = s."roomId"
        WHERE s."tenantId" = ${tenantId}
          AND (
            (s.status = CAST(${StayStatus.ACTIVE} AS "StayStatus") AND r.status = CAST(${RoomStatus.RESERVED} AS "RoomStatus"))
            OR (s.status = CAST(${StayStatus.CANCELLED} AS "StayStatus") AND s."bookingSource" = CAST(${LeadSource.WEBSITE} AS "LeadSource"))
          )
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

  private async notifyBookingRejected(
    recipientUserId: number | null,
    stayId: number,
    reason: string,
  ) {
    if (!recipientUserId) return;

    try {
      const title = 'Booking ditolak';
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
        body: `Booking Anda belum dapat disetujui. Alasan: ${reason}`,
        linkTo: '/portal/bookings',
        entityType: entityTypeVal,
        entityId: entityIdVal,
      });
    } catch {
      // Never throw — notification is non-critical side effect
    }
  }

}