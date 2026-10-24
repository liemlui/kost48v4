// FILE: public-bookings.service.ts — booking tamu publik (non-tenant): cari kamar + submit
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma';
import { LeadSource, PricingTerm, RoomStatus, StayStatus } from '../../common/enums/app.enums';
import { roundRupiah } from '../../common/business/money.helper';
import { ReferralService } from '../loyalty/referral.service';
import { AUTO_OPS_DEADLINES, hoursFromNow } from '../../common/business/auto-ops.constants';
import { serializePrismaResult } from '../../common/utils/serialization';
import { normalizePhone } from '../../common/utils/phone.util';
import { PrismaService } from '../../prisma/prisma.service';
import { calculateRentByPricingTerm } from './pricing.helper';
import { calculateBookingCharges } from './booking-charges.helper';
import { startOfDay, endOfDay, addDays, parseDateOnly } from '../../common/utils/date.util';
import { isBookingSchemaReady, isBookingSchemaDriftError } from './booking-schema.helper';
import { findBookingByIdTx, buildBookingReferenceCode, assertNoOverlappingStayTx, withSerializationRetry } from './tenant-bookings.helpers';
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
    const onlineBookingEnabled = ['true', '1', 'yes', 'on'].includes(
      String(process.env.PUBLIC_ONLINE_BOOKING_ENABLED ?? 'false').trim().toLowerCase(),
    );
    if (!onlineBookingEnabled) {
      throw new ServiceUnavailableException(
        'Booking online sedang dinonaktifkan. Silakan hubungi admin KOST48 melalui WhatsApp untuk cek dan reservasi kamar.',
      );
    }

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

    // S7 (P36 a): pengajuan tamu TIDAK membuat akun. Akun wajib saat membayar DP,
    // jadi tidak ada password sementara yang dibuat/dikembalikan di titik ini.
    // Tamu mengingat kode pengajuan (diturunkan dari Stay.id) untuk klaim/admin.

    try {
      const result = await withSerializationRetry(() => this.prisma.$transaction(async (tx) => {
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

        // S7: tahan double-book — cek irisan rentang tanggal untuk kamar ini.
        await assertNoOverlappingStayTx(tx, {
          roomId: dto.roomId,
          checkInDate,
          plannedCheckOutDate,
        });

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

        // S7 (P36 a): TIDAK ada `tx.user.create` di sini. Akun hanya lahir lewat
        // pendaftaran/klaim di titik DP, sehingga "akun wajib saat membayar DP"
        // berlaku: sebelum akun terklaim, tidak ada pemilik yang bisa membayar.
        const hasPortalAccount = Boolean(tenant.user);

        const baseRent = this.resolveRent(room, dto.pricingTerm);
        if (!baseRent || baseRent <= 0) {
          throw new ConflictException('Tarif kamar untuk term ini belum tersedia');
        }
        const opSetting = await tx.operationalSetting.findUnique({ where: { id: 1 } });
        const charges = calculateBookingCharges({
          baseRentRupiah: baseRent,
          roomSize: room.roomSize,
          occupantCount: dto.occupantCount,
          hasPet: dto.hasPet,
          petDepositRupiah: opSetting?.petDepositRupiah,
          defaultDepositRupiah: room.defaultDepositRupiah,
        });
        const occupantCount = charges.occupantCount;
        const agreedRentAmountRupiah = charges.agreedRentAmountRupiah;
        const hasPet = Boolean(dto.hasPet);
        const petDepositRupiah = charges.petDepositRupiah;
        const depositAmountRupiah = charges.depositAmountRupiah;

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
            ${null},
            NOW(),
            NOW()
          )
          RETURNING id
        `);

        const bookingId = insertedRows[0]?.id;
        if (!bookingId) {
          throw new ConflictException('Booking gagal dibuat');
        }

        const referenceCode = buildBookingReferenceCode(bookingId);

        const booking = await findBookingByIdTx(tx, bookingId, tenant.id);
        if (!booking) {
          throw new NotFoundException('Booking yang baru dibuat tidak ditemukan');
        }

        await tx.auditLog.create({
          data: {
            // S7: pengajuan tamu tanpa akun — tidak ada aktor User yang sah.
            actorUserId: null,
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
              referenceCode,
              requiresAccountForDownPayment: true,
            } as any,
          },
        });

        return {
          booking: {
            stayId: booking.id,
            referenceCode,
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
          // S7 (P36 a): TIDAK ada kredensial di respons. Kunci `portalAccess` dipertahankan
          // supaya pemanggil lama tidak pecah, tetapi isinya kini instruksi klaim.
          portalAccess: {
            email: normalizedEmail,
            requiresAccount: true,
            claimRequired: !hasPortalAccount,
            referenceCode,
            instructions: hasPortalAccount
              ? 'Kamu sudah punya akun portal. Masuk dengan akun itu untuk memantau pengajuan dan membayar DP.'
              : 'Akun wajib saat membayar DP. Daftar/masuk memakai email atau nomor HP yang sama dengan pengajuan ini, lalu klaim pengajuan memakai kode di atas.',
          },
          message: hasPortalAccount
            ? 'Pengajuan diterima. Masuk ke portal untuk memantau status dan membayar DP.'
            : 'Pengajuan diterima. Simpan kode pengajuan ini; akun dibuat/diklaim saat kamu membayar DP.',
        };
      }));

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

  // (findBookingByIdTx dan mapBookingRow dihapus — gunakan versi shared dari tenant-bookings.helpers.ts)

  private resolveRent(room: RoomPricingSnapshot, pricingTerm: PricingTerm): number {
    const monthlyRate = Number(room.monthlyRateRupiah ?? 0);
    if (!monthlyRate || monthlyRate <= 0) return 0;
    return calculateRentByPricingTerm(monthlyRate, pricingTerm);
  }

}
