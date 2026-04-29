import { Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma';
import { PricingTerm, RoomStatus } from '../../common/enums/app.enums';
import { buildMeta, buildPagination } from '../../common/utils/pagination';
import { serializePrismaResult } from '../../common/utils/serialization';
import { PrismaService } from '../../prisma/prisma.service';
import { calculateRentByPricingTerm } from './pricing.helper';
import { isBookingSchemaReady } from './booking-schema.helper';
import { PublicRoomsQueryDto } from './dto/public-rooms-query.dto';

@Injectable()
export class PublicRoomsService {
  private bookingSchemaStatusCache: { hasReservedRoomStatus: boolean; hasStayExpiresAt: boolean } | null = null;

  constructor(private readonly prisma: PrismaService) {}

  async getPublicRooms(query: PublicRoomsQueryDto) {
    const { page, limit, skip, take } = buildPagination(query.page, query.limit);

    if (!(await isBookingSchemaReady(this.prisma, { current: this.bookingSchemaStatusCache }))) {
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
      images: (room as any).images ?? [],
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

  async getPublicRoomDetail(id: number) {
    if (!(await isBookingSchemaReady(this.prisma, { current: this.bookingSchemaStatusCache }))) {
      throw new ServiceUnavailableException(
        'Fitur booking belum aktif penuh karena database belum sinkron. Jalankan sinkronisasi schema terlebih dahulu.',
      );
    }

    const room = await this.prisma.room.findUnique({ where: { id } });
    if (!room || !room.isActive) {
      throw new NotFoundException('Kamar tidak ditemukan atau tidak aktif');
    }

    const availablePricingTerms = this.getAvailablePricingTerms(room as any);
    const highlightedPricingTerm = availablePricingTerms[0] ?? PricingTerm.MONTHLY;

    return serializePrismaResult({
      id: room.id,
      code: room.code,
      name: room.name,
      floor: room.floor,
      status: room.status,
      notes: room.notes,
      images: (room as any).images ?? [],
      pricing: {
        dailyRateRupiah: room.dailyRateRupiah,
        weeklyRateRupiah: room.weeklyRateRupiah,
        biWeeklyRateRupiah: room.biWeeklyRateRupiah,
        monthlyRateRupiah: room.monthlyRateRupiah,
      },
      defaultDepositRupiah: room.defaultDepositRupiah,
      electricityTariffPerKwhRupiah: room.electricityTariffPerKwhRupiah,
      waterTariffPerM3Rupiah: room.waterTariffPerM3Rupiah,
      highlightedPricingTerm,
      highlightedRateRupiah: this.resolveRent(room as any, highlightedPricingTerm),
      availablePricingTerms,
      isAvailable: room.status === RoomStatus.AVAILABLE,
    });
  }

  // ------------------------------------------------------------------
  // PRIVATE HELPERS
  // ------------------------------------------------------------------

  private buildPricingAvailabilityWhere(pricingTerm?: PricingTerm): Prisma.RoomWhereInput {
    if (pricingTerm) {
      return { monthlyRateRupiah: { gt: 0 } };
    }
    return {};
  }

  private getAvailablePricingTerms(room: any): PricingTerm[] {
    const monthlyRate = Number(room.monthlyRateRupiah ?? 0);
    if (monthlyRate <= 0) return [];

    return [
      PricingTerm.DAILY,
      PricingTerm.WEEKLY,
      PricingTerm.BIWEEKLY,
      PricingTerm.MONTHLY,
      PricingTerm.SMESTERLY,
      PricingTerm.YEARLY,
    ];
  }

  private resolveRent(room: any, pricingTerm: PricingTerm): number {
    const monthlyRate = Number(room.monthlyRateRupiah ?? 0);
    if (!monthlyRate || monthlyRate <= 0) return 0;
    return calculateRentByPricingTerm(monthlyRate, pricingTerm);
  }
}