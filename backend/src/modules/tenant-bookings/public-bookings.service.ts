import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma';
import * as bcrypt from 'bcryptjs';
import { randomInt } from 'crypto';
import { LeadSource, PricingTerm, RoomStatus, StayStatus, UserRole } from '../../common/enums/app.enums';
import { serializePrismaResult } from '../../common/utils/serialization';
import { normalizePhone } from '../../common/utils/phone.util';
import { PrismaService } from '../../prisma/prisma.service';
import { calculateRentByPricingTerm } from './pricing.helper';
import { CreatePublicBookingDto } from './dto/create-public-booking.dto';

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

interface BookingSchemaStatus {
  hasReservedRoomStatus: boolean;
  hasStayExpiresAt: boolean;
}

const BOOKING_SELECT = Prisma.sql`
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
  COALESCE(s."depositPaidAmountRupiah", 0) AS "depositPaidAmountRupiah",
  s."depositPaymentStatus",
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
`;

@Injectable()
export class PublicBookingsService {
  private bookingSchemaStatusCache: BookingSchemaStatus | null = null;

  constructor(private readonly prisma: PrismaService) {}

  // ---------------------------------------------------------------------------
  // PUBLIC: createPublicBooking
  // ---------------------------------------------------------------------------

  async createPublicBooking(dto: CreatePublicBookingDto) {
    if (!(await this.isBookingSchemaReady())) {
      throw new ServiceUnavailableException(
        'Fitur booking belum aktif penuh karena database belum sinkron. Jalankan sinkronisasi schema terlebih dahulu.',
      );
    }

    const normalizedPhone = normalizePhone(dto.phone);
    const normalizedEmail = dto.email.trim().toLowerCase();
    const trimmedFullName = dto.fullName.trim();

    if (dto.website && dto.website.trim().length > 0) {
      throw new BadRequestException('Permintaan tidak valid. Silakan coba lagi.');
    }

    const checkInDate = this.parseDateOnly(dto.checkInDate, 'Tanggal check-in tidak valid');
    const plannedCheckOutDate = dto.plannedCheckOutDate
      ? this.parseDateOnly(dto.plannedCheckOutDate, 'Tanggal rencana checkout tidak valid')
      : null;

    if (plannedCheckOutDate && plannedCheckOutDate < checkInDate) {
      throw new BadRequestException('Tanggal rencana checkout tidak boleh sebelum check-in');
    }

    const now = new Date();
    const today = this.startOfDay(now);
    if (checkInDate < today) {
      throw new BadRequestException('Tanggal check-in tidak boleh di masa lalu');
    }

    const isSameDayCheckIn = checkInDate.getTime() === today.getTime();
    const minimumBookingWindowMs = 3 * 60 * 60 * 1000;
    if (isSameDayCheckIn && (this.endOfDay(checkInDate).getTime() - now.getTime()) < minimumBookingWindowMs) {
      throw new BadRequestException(
        'Booking untuk hari ini sudah ditutup karena jam operasional sudah berakhir. Silakan pilih tanggal check-in mulai besok. Jam operasional booking hari ini: 08.00–21.00 WIB.',
      );
    }

    const temporaryPassword = `Kost48${randomInt(10000, 99999)}`;
    const passwordHash = await bcrypt.hash(temporaryPassword, 10);

    try {
      const result = await this.prisma.$transaction(async (tx) => {
        await tx.$queryRawUnsafe(`SELECT id FROM "Room" WHERE id = $1 FOR UPDATE`, dto.roomId);

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
          throw new NotFoundException('Kamar tidak ditemukan.');
        }
        if (!room.isActive) {
          throw new ConflictException('Kamar ini sudah tidak tersedia untuk booking.');
        }
        if (room.status !== RoomStatus.AVAILABLE) {
          throw new ConflictException('Kamar ini sudah tidak tersedia untuk booking.');
        }

        const existingRoomStay = await tx.stay.findFirst({
          where: {
            roomId: dto.roomId,
            status: StayStatus.ACTIVE as any,
          },
          select: { id: true },
        });
        if (existingRoomStay) {
          throw new ConflictException('Kamar ini sudah tidak tersedia untuk booking.');
        }

        const existingTenantWithActiveBooking = await tx.tenant.findFirst({
          where: {
            OR: [
              { phone: normalizedPhone },
              normalizedEmail ? { email: normalizedEmail } : {},
            ].filter(Boolean),
            stays: {
              some: {
                status: StayStatus.ACTIVE as any,
                room: {
                  status: { in: [RoomStatus.RESERVED as any, RoomStatus.OCCUPIED as any] },
                },
              },
            },
          },
          select: { id: true, phone: true },
        });

        if (existingTenantWithActiveBooking) {
          throw new ConflictException(
            'Nomor telepon atau email ini masih memiliki booking atau hunian aktif. Silakan login ke portal atau hubungi admin.',
          );
        }

        let tenant = await tx.tenant.findFirst({
          where: {
            OR: [
              { phone: normalizedPhone },
              ...(normalizedEmail ? [{ email: normalizedEmail }] : []),
            ],
          },
          include: { user: { select: { id: true, isActive: true } } },
        });

        let isNewTenant = false;
        if (!tenant) {
          isNewTenant = true;
          tenant = await tx.tenant.create({
            data: {
              fullName: trimmedFullName,
              phone: normalizedPhone,
              email: normalizedEmail || null,
              identityNumber: dto.identityNumber?.trim() || null,
              emergencyContactName: dto.emergencyContactName?.trim() || null,
              emergencyContactPhone: dto.emergencyContactPhone?.trim() || null,
              notes: dto.notes?.trim() || null,
            },
            include: { user: { select: { id: true, isActive: true } } },
          });
        }

        let portalUser = tenant.user ?? null;
        let isNewUser = false;

        if (!portalUser) {
          isNewUser = true;
          portalUser = await tx.user.create({
            data: {
              fullName: trimmedFullName,
              email: normalizedEmail,
              passwordHash,
              role: UserRole.TENANT as any,
              tenantId: tenant.id,
              isActive: true,
            },
            select: { id: true, isActive: true },
          });
        }

        const agreedRentAmountRupiah = this.resolveRent(room, dto.pricingTerm);
        if (!agreedRentAmountRupiah || agreedRentAmountRupiah <= 0) {
          throw new ConflictException('Tarif kamar untuk term ini belum tersedia');
        }

        const expiresAt = new Date(now.getTime() + 48 * 60 * 60 * 1000);
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
            ${tenant.id},
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
            ${null},
            ${portalUser.id},
            NOW(),
            NOW()
          )
          RETURNING id
        `);

        const bookingId = insertedRows[0]?.id;
        if (!bookingId) {
          throw new ConflictException('Booking gagal dibuat');
        }

        const booking = await this.findBookingByIdTx(tx, bookingId, tenant.id);
        if (!booking) {
          throw new NotFoundException('Booking yang baru dibuat tidak ditemukan');
        }

        await tx.auditLog.create({
          data: {
            actorUserId: portalUser.id,
            action: 'CREATE_PUBLIC_BOOKING',
            entityType: 'Stay',
            entityId: String(booking.id),
            newData: booking as any,
            meta: {
              source: 'PUBLIC_BOOKING',
              roomId: dto.roomId,
              pricingTerm: dto.pricingTerm,
              expiresAt,
              isNewTenant,
              isNewUser,
            } as any,
          },
        });

        return {
          booking: {
            stayId: booking.id,
            roomId: booking.roomId,
            roomCode: booking.room?.code ?? room.code,
            status: booking.status,
            expiresAt: booking.expiresAt,
            checkInDate: booking.checkInDate,
            pricingTerm: booking.pricingTerm,
          },
          portalAccess: {
            email: normalizedEmail,
            temporaryPassword: isNewUser ? temporaryPassword : undefined,
            isNewUser,
            instructions: isNewUser
              ? 'Akun portal telah dibuat. Silakan login menggunakan email dan password sementara di atas.'
              : 'Silakan login menggunakan akun portal yang sudah pernah dibuat.',
          },
          message: isNewUser
            ? 'Booking berhasil dibuat. Silakan login ke portal untuk memantau status booking Anda.'
            : 'Booking berhasil dibuat. Silakan login menggunakan akun portal yang sudah pernah dibuat.',
        };
      });

      return serializePrismaResult(result);
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
        throw new ConflictException('Booking bentrok dengan data aktif lain');
      }

      if (this.isBookingSchemaDriftError(error)) {
        throw new ServiceUnavailableException(
          'Fitur booking belum aktif penuh karena database belum sinkron. Jalankan sinkronisasi schema terlebih dahulu.',
        );
      }

      throw error;
    }
  }

  // ---------------------------------------------------------------------------
  // PRIVATE HELPERS
  // ---------------------------------------------------------------------------

  private async isBookingSchemaReady(): Promise<boolean> {
    if (this.bookingSchemaStatusCache) {
      return this.bookingSchemaStatusCache.hasReservedRoomStatus && this.bookingSchemaStatusCache.hasStayExpiresAt;
    }

    try {
      const hasReserved = await this.prisma.$queryRawUnsafe<Array<{ enumlabel: string }>>(
        `SELECT enumlabel FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'RoomStatus') AND enumlabel = 'RESERVED'`,
      );
      const hasExpiresAt = await this.prisma.$queryRawUnsafe<Array<{ column_name: string }>>(
        `SELECT column_name FROM information_schema.columns WHERE table_name = 'Stay' AND column_name = 'expiresAt'`,
      );

      this.bookingSchemaStatusCache = {
        hasReservedRoomStatus: hasReserved.length > 0,
        hasStayExpiresAt: hasExpiresAt.length > 0,
      };

      return this.bookingSchemaStatusCache.hasReservedRoomStatus && this.bookingSchemaStatusCache.hasStayExpiresAt;
    } catch {
      this.bookingSchemaStatusCache = { hasReservedRoomStatus: false, hasStayExpiresAt: false };
      return false;
    }
  }

  private isBookingSchemaDriftError(error: any): boolean {
    const message = error?.message ?? '';
    return (
      message.includes('relation') && message.includes('does not exist')
      || message.includes('column') && message.includes('does not exist')
      || message.includes('type') && message.includes('does not exist')
      || message.includes('invalid input value for enum')
      || message.includes('expiresat')
      || message.includes('roomstatus')
      || message.includes('depositpaidamountrupiah')
      || message.includes('depositpaymentstatus')
      || message.includes('enum roomstatus')
    );
  }

  private async findBookingByIdTx(
    tx: Prisma.TransactionClient,
    stayId: number,
    tenantId: number,
  ) {
    const rows = await tx.$queryRaw<BookingRow[]>(Prisma.sql`
      SELECT
        ${BOOKING_SELECT}
      FROM "Stay" s
      JOIN "Tenant" t ON t.id = s."tenantId"
      JOIN "Room" r ON r.id = s."roomId"
      WHERE s.id = ${stayId} AND s."tenantId" = ${tenantId}
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

  private startOfDay(date: Date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  private endOfDay(date: Date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
  }

  private addDays(date: Date, days: number) {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return this.startOfDay(next);
  }

  private parseDateOnly(value: string, message: string) {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException(message);
    }
    return this.startOfDay(parsed);
  }
}