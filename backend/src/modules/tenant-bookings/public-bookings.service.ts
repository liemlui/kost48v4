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
import { roundRupiah } from '../../common/business/money.helper';
import { ReferralService } from '../loyalty/referral.service';
import { AUTO_OPS_DEADLINES, hoursFromNow } from '../../common/business/auto-ops.constants';
import { serializePrismaResult } from '../../common/utils/serialization';
import { normalizePhone } from '../../common/utils/phone.util';
import { PrismaService } from '../../prisma/prisma.service';
import { calculateRentByPricingTerm, calculateOccupantSurcharge, ROOM_MAX_FREE_OCCUPANTS, ROOM_MAX_OCCUPANTS } from './pricing.helper';
import { startOfDay, endOfDay, addDays, parseDateOnly } from '../../common/utils/date.util';
import { isBookingSchemaReady, isBookingSchemaDriftError } from './booking-schema.helper';
import { CreatePublicBookingDto } from './dto/create-public-booking.dto';
import { CreatePublicSurveyDto } from './dto/create-public-survey.dto';

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
  allowBookingWhileCleaning?: boolean | null;
  roomSize: string | null;
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
  downPaymentAmountRupiah?: number | null;
  downPaymentPaidRupiah?: number | null;
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
  COALESCE(s."downPaymentAmountRupiah", 0) AS "downPaymentAmountRupiah",
  COALESCE(s."downPaymentPaidRupiah", 0) AS "downPaymentPaidRupiah",
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
  constructor(
    private readonly prisma: PrismaService,
    private readonly referral: ReferralService,
  ) {}

  // ═══════════════════════════════════════════════════════════
  //  SECTION: Public Booking — Create & Survey
  // ═══════════════════════════════════════════════════════════

  async createPublicBooking(dto: CreatePublicBookingDto) {
    if (!(await isBookingSchemaReady(this.prisma))) {
      throw new ServiceUnavailableException(
        'Fitur booking belum aktif penuh karena database belum sinkron. Jalankan sinkronisasi schema terlebih dahulu.',
      );
    }

    // PUB-BOOKING-FORM: phone XOR email — minimal salah satu wajib.
    if (!dto.phone?.trim() && !dto.email?.trim()) {
      throw new BadRequestException('Minimal isi nomor telepon atau email.');
    }

    const normalizedPhone = normalizePhone(dto.phone ?? '');
    if (!normalizedPhone) {
      throw new BadRequestException('Nomor telepon tidak valid. Gunakan nomor Indonesia minimal 8 digit.');
    }
    const normalizedEmail = (dto.email?.trim() ?? '').toLowerCase();
    const trimmedFullName = dto.fullName.trim();

    if (dto.website && dto.website.trim().length > 0) {
      throw new BadRequestException('Permintaan tidak valid. Silakan coba lagi.');
    }

    const checkInDate = parseDateOnly(dto.checkInDate, 'Tanggal check-in tidak valid');
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
    // Audit M-18: cutoff same-day mengikuti jam Jakarta (pk 21.00 WIB),
    // konsisten dengan jalur booking portal.
    const jakartaHour = (now.getUTCHours() + 7) % 24;
    if (isSameDayCheckIn && jakartaHour >= 21) {
      throw new BadRequestException(
        'Booking untuk hari ini sudah ditutup karena jam operasional sudah berakhir (pk 21.00 WIB). Silakan pilih tanggal check-in mulai besok.',
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
            "allowBookingWhileCleaning",
            "roomSize",
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
        const bookableWhileCleaning =
          room.status === RoomStatus.MAINTENANCE && Boolean(room.allowBookingWhileCleaning);
        if (
          room.status !== RoomStatus.AVAILABLE &&
          !bookableWhileCleaning
        ) {
          throw new ConflictException('Kamar belum bisa dipesan karena sudah aktif ditempati atau sedang tidak tersedia.');
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

        const existingTenantWithActiveBooking = await tx.tenant.findFirst({
          where: {
            OR: [
              ...(normalizedPhone ? [{ phone: normalizedPhone }] : []),
              ...(normalizedEmail ? [{ email: normalizedEmail }] : []),
            ],
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
              ...(normalizedPhone ? [{ phone: normalizedPhone }] : []),
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

          // F4-13: tautkan referral bila teman memasukkan kode (di dalam tx pembuatan tenant).
          if (dto.referralCode) {
            await this.referral.linkReferralTx(tx, { referralCode: dto.referralCode, referredTenantId: tenant.id });
          }
        }

        let portalUser = tenant.user ?? null;
        let isNewUser = false;

        if (!portalUser) {
          isNewUser = true;
          portalUser = await tx.user.create({
            data: {
              fullName: trimmedFullName,
              email: normalizedEmail || `tenant-${tenant.id}@phone.local.kost48`,
              passwordHash,
              role: UserRole.TENANT as any,
              tenantId: tenant.id,
              isActive: true,
            },
            select: { id: true, isActive: true },
          });
        }

        const baseRent = this.resolveRent(room, dto.pricingTerm);
        if (!baseRent || baseRent <= 0) {
          throw new ConflictException('Tarif kamar untuk term ini belum tersedia');
        }
        const occupantCount = Math.max(1, Number(dto.occupantCount ?? 1));
        const roomSizeKey = String(room.roomSize ?? '').toUpperCase();
        const hardCap = ROOM_MAX_OCCUPANTS[roomSizeKey] ?? (ROOM_MAX_FREE_OCCUPANTS[roomSizeKey] ?? 2) + 2;
        if (occupantCount > hardCap) {
          throw new BadRequestException(
            `Jumlah penghuni melebihi batas maksimal untuk kamar ${roomSizeKey === 'LARGE' ? 'besar' : 'standar'} (maks ${hardCap} orang).`,
          );
        }
        const occupantSurcharge = calculateOccupantSurcharge(baseRent, room.roomSize, occupantCount);
        const agreedRentAmountRupiah = baseRent + occupantSurcharge;

        // Deposit jaminan dasar dari kamar + tambahan hewan bila ada.
        const hasPet = Boolean(dto.hasPet);
        const opSetting = await tx.operationalSetting.findUnique({ where: { id: 1 } });
        const petDepositRupiah = hasPet ? (opSetting?.petDepositRupiah ?? 100000) : 0;
        const depositAmountRupiah = (room.defaultDepositRupiah ?? 0) + petDepositRupiah;

        // DP = 30% sewa (default), atau 100% bila tenant pilih LUNAS.
        const isFullPayment = dto.paymentChoice === 'FULL';
        const downPaymentAmountRupiah = isFullPayment
          ? agreedRentAmountRupiah
          : roundRupiah((agreedRentAmountRupiah * 30) / 100);

        const expiresAt = hoursFromNow(AUTO_OPS_DEADLINES.BOOKING_REVIEW_DEADLINE_HOURS, now);
        const stayPurposeSql = dto.stayPurpose
          ? Prisma.sql`CAST(${dto.stayPurpose} AS "StayPurpose")`
          : Prisma.sql`NULL`;

        // Room status left as-is — baru berubah saat DP/LUNAS dibayar (BOOKING/RESERVED).
        // Tidak ada UPDATE Room di sini.

        const insertedRows = await tx.$queryRaw<Array<{ id: number }>>(Prisma.sql`
          INSERT INTO "Stay" (
            "tenantId",
            "roomId",
            status,
            "pricingTerm",
            "agreedRentAmountRupiah",
            "occupantCount",
            "hasPet",
            "checkInDate",
            "plannedCheckOutDate",
            "expiresAt",
            "depositAmountRupiah",
            "downPaymentAmountRupiah",
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
            ${occupantCount},
            ${hasPet},
            ${checkInDate},
            ${plannedCheckOutDate},
            ${expiresAt},
            ${depositAmountRupiah},
            ${downPaymentAmountRupiah},
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
              paymentChoice: dto.paymentChoice ?? 'DP',
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
          payment: {
            paymentChoice: dto.paymentChoice ?? 'DP',
            agreedRentAmountRupiah,
            downPaymentAmountRupiah,
            depositAmountRupiah,
            depositBreakdown: {
              roomDepositRupiah: room.defaultDepositRupiah ?? 0,
              petDepositRupiah,
            },
            hasPet,
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

      if (isBookingSchemaDriftError(error)) {
        throw new ServiceUnavailableException(
          'Fitur booking belum aktif penuh karena database belum sinkron. Jalankan sinkronisasi schema terlebih dahulu.',
        );
      }

      throw error;
    }
  }

  // ---------------------------------------------------------------------------
  // PUBLIC: saveGuestSurvey
  // ---------------------------------------------------------------------------

  async saveGuestSurvey(dto: CreatePublicSurveyDto, userAgent: string, referrer: string) {
    const survey = await this.prisma.guestPreferenceSurvey.create({
      data: {
        bathroom:             dto.bathroom  ?? null,
        cooling:              dto.cooling   ?? null,
        roomSize:             dto.roomSize  ?? null,
        roomType:             dto.roomType  ?? null,
        priorities:           dto.priorities ?? null,
        estimatedPriceRupiah: dto.estimatedPriceRupiah ?? null,
        skipped:              dto.skipped ?? false,
        sessionId:            dto.sessionId ?? null,
        userAgent:            userAgent || null,
        referrer:             referrer || null,
      },
    });
    return { id: survey.id };
  }

  // ---------------------------------------------------------------------------
  // PRIVATE HELPERS
  // ---------------------------------------------------------------------------

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

}