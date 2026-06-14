import { Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma';
import { PricingTerm, RoomStatus } from '../../common/enums/app.enums';
import { buildMeta, buildPagination } from '../../common/utils/pagination';
import { serializePrismaResult } from '../../common/utils/serialization';
import { PrismaService } from '../../prisma/prisma.service';
import { isBookingSchemaReady } from '../tenant-bookings/booking-schema.helper';
import { calculateRentByPricingTerm } from '../tenant-bookings/pricing.helper';
import { PublicRoomsQueryDto } from './dto/public-rooms-query.dto';
import {
  GENERIC_ROOM_MARKETING_IMAGES,
  ROOM_IMAGE_BASE_PATH,
  ROOM_MARKETING_IMAGE_FILES,
} from './marketing-room-images.config';

const PUBLIC_ROOM_SELECT = {
  id: true,
  code: true,
  name: true,
  floor: true,
  status: true,
  images: true,
  notes: true,
  dailyRateRupiah: true,
  weeklyRateRupiah: true,
  biWeeklyRateRupiah: true,
  monthlyRateRupiah: true,
  defaultDepositRupiah: true,
  allowBookingWhileCleaning: true,
  electricityTariffPerKwhRupiah: true,
  waterTariffPerM3Rupiah: true,
} satisfies Prisma.RoomSelect;

type PublicRoomRecord = Prisma.RoomGetPayload<{ select: typeof PUBLIC_ROOM_SELECT }>;


@Injectable()
export class MarketingPublicRoomsService {
  private bookingSchemaStatusCache: { hasReservedRoomStatus: boolean; hasStayExpiresAt: boolean } | null = null;

  constructor(private readonly prisma: PrismaService) {}

  async getPublicSocialProof() {
    const [reviews, reviewAggregate, activeStays] = await this.prisma.$transaction([
      this.prisma.staffReview.findMany({
        where: {
          status: 'VISIBLE' as any,
          rating: { gte: 4 },
        },
        select: {
          rating: true,
          comment: true,
          createdAt: true,
          tenant: { select: { fullName: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 6,
      }),
      this.prisma.staffReview.aggregate({
        where: {
          status: 'VISIBLE' as any,
          rating: { gte: 4 },
        },
        _avg: { rating: true },
        _count: { id: true },
      }),
      this.prisma.stay.findMany({
        where: {
          status: 'ACTIVE' as any,
          initialMetersPromotedAt: { not: null },
        },
        select: { tenantId: true },
      }),
    ]);

    const occupantCount = new Set(activeStays.map((stay) => stay.tenantId)).size;
    const averageRating = reviewAggregate._avg.rating
      ? Math.round(reviewAggregate._avg.rating * 10) / 10
      : 0;

    return {
      occupantCount,
      averageRating,
      reviewCount: reviewAggregate._count.id,
      reviews: reviews.map((review) => ({
        initials: this.toInitials(review.tenant.fullName),
        rating: review.rating,
        comment: review.comment?.trim().slice(0, 280) || null,
        createdAt: review.createdAt,
      })),
    };
  }

  async getPublicRooms(query: PublicRoomsQueryDto) {
    const { page, limit, skip, take } = buildPagination(query.page, query.limit);

    if (!(await isBookingSchemaReady(this.prisma, { current: this.bookingSchemaStatusCache }))) {
      return {
        items: [],
        meta: buildMeta(page, limit, 0),
      };
    }

    const where = this.buildPublicRoomWhere(query);

    const [items, totalItems] = await this.prisma.$transaction([
      this.prisma.room.findMany({
        where,
        select: PUBLIC_ROOM_SELECT,
        skip,
        take,
        orderBy: [{ floor: 'asc' }, { code: 'asc' }],
      }),
      this.prisma.room.count({ where }),
    ]);

    const facilitiesByRoomId = await this.getPublicFacilitiesByRoomId(items.map((room) => room.id));

    return {
      items: serializePrismaResult(items.map((room) => this.toPublicRoomDto(room, query.pricingTerm, facilitiesByRoomId.get(room.id) ?? []))),
      meta: buildMeta(page, limit, totalItems),
    };
  }

  private toInitials(fullName: string): string {
    const parts = fullName.trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return 'P';
    const selected = parts.length === 1 ? parts : [parts[0], parts[parts.length - 1]];
    return selected.map((part) => part.charAt(0).toUpperCase()).join('');
  }

  async getPublicRoomDetail(id: number) {
    if (!(await isBookingSchemaReady(this.prisma, { current: this.bookingSchemaStatusCache }))) {
      throw new ServiceUnavailableException(
        'Fitur booking belum aktif penuh karena database belum sinkron. Jalankan sinkronisasi schema terlebih dahulu.',
      );
    }

    const room = await this.prisma.room.findFirst({
      where: {
        id,
        isActive: true,
        status: {
          in: [
            RoomStatus.AVAILABLE as any,
            RoomStatus.RESERVED as any,
            RoomStatus.OCCUPIED as any,
            RoomStatus.MAINTENANCE as any,
          ],
        },
      },
      select: PUBLIC_ROOM_SELECT,
    });

    if (!room) {
      throw new NotFoundException('Kamar tidak ditemukan atau tidak tersedia untuk dilihat');
    }

    const facilitiesByRoomId = await this.getPublicFacilitiesByRoomId([room.id]);
    const highlightedPricingTerm = this.getAvailablePricingTerms(room)[0] ?? PricingTerm.MONTHLY;

    return serializePrismaResult(this.toPublicRoomDto(room, highlightedPricingTerm, facilitiesByRoomId.get(room.id) ?? []));
  }

  // ------------------------------------------------------------------
  // PRIVATE HELPERS
  // ------------------------------------------------------------------

  private buildPublicRoomWhere(query: PublicRoomsQueryDto): Prisma.RoomWhereInput {
    return {
      AND: [
        { isActive: true },
        {
          status: {
            in: [
              RoomStatus.AVAILABLE as any,
              RoomStatus.RESERVED as any,
              RoomStatus.OCCUPIED as any,
              RoomStatus.MAINTENANCE as any,
            ],
          },
        },
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
  }

  private async getPublicFacilitiesByRoomId(roomIds: number[]) {
    const publicFacilities =
      roomIds.length > 0
        ? await this.prisma.roomFacility.findMany({
            where: { roomId: { in: roomIds }, publicVisible: true },
            select: {
              id: true,
              roomId: true,
              name: true,
              quantity: true,
              category: true,
              condition: true,
              note: true,
            },
            orderBy: { id: 'asc' },
          })
        : [];

    const facilitiesByRoomId = new Map<number, typeof publicFacilities>();
    for (const facility of publicFacilities) {
      const list = facilitiesByRoomId.get(facility.roomId);
      if (list) {
        list.push(facility);
      } else {
        facilitiesByRoomId.set(facility.roomId, [facility]);
      }
    }

    return facilitiesByRoomId;
  }

  private toPublicRoomDto(room: PublicRoomRecord, pricingTerm?: PricingTerm, facilities: unknown[] = []) {
    const highlightedPricingTerm = pricingTerm ?? PricingTerm.MONTHLY;

    return {
      id: room.id,
      code: room.code,
      name: room.name,
      floor: room.floor,
      status: room.status,
      images: this.resolveRoomMarketingImages(room),
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
      highlightedPricingTerm,
      highlightedRateRupiah: this.resolveRent(room, highlightedPricingTerm),
      availablePricingTerms: this.getAvailablePricingTerms(room),
      isAvailable:
        room.status === RoomStatus.AVAILABLE ||
        room.status === RoomStatus.RESERVED ||
        (room.status === RoomStatus.MAINTENANCE && Boolean(room.allowBookingWhileCleaning)),
      canBook:
        room.status === RoomStatus.AVAILABLE ||
        room.status === RoomStatus.RESERVED ||
        (room.status === RoomStatus.MAINTENANCE && Boolean(room.allowBookingWhileCleaning)),
      availabilityNote:
        room.status === RoomStatus.RESERVED
          ? 'Sudah ada peminat, tetapi belum terkunci sebelum pembayaran valid disetujui.'
          : room.status === RoomStatus.MAINTENANCE && Boolean(room.allowBookingWhileCleaning)
            ? 'Bisa dipesan sekarang — kamar sedang dibersihkan staf dan siap dihuni setelah pembersihan selesai.'
            : room.status === RoomStatus.MAINTENANCE
              ? 'Kamar kosong, tetapi sedang dicek sebelum dibuka untuk booking.'
              : null,
      facilities,
    };
  }

  private resolveRoomMarketingImages(room: Pick<PublicRoomRecord, 'id' | 'code' | 'name' | 'images'>): string[] {
    const existingImages = this.normalizeExistingRoomImages(room.images);
    if (existingImages.length > 0) return existingImages;

    const codeCandidates = this.buildRoomImageCandidates(`${room.code ?? ''} ${room.name ?? ''}`);
    const matched = codeCandidates.filter((filename) => ROOM_MARKETING_IMAGE_FILES.has(filename));
    if (matched.length > 0) return matched.slice(0, 4).map((filename) => `${ROOM_IMAGE_BASE_PATH}/${filename}`);

    const offset = room.id % GENERIC_ROOM_MARKETING_IMAGES.length;
    const generic = [
      ...GENERIC_ROOM_MARKETING_IMAGES.slice(offset),
      ...GENERIC_ROOM_MARKETING_IMAGES.slice(0, offset),
    ];
    return generic.slice(0, 4).map((filename) => `${ROOM_IMAGE_BASE_PATH}/${filename}`);
  }

  private normalizeExistingRoomImages(images: unknown): string[] {
    if (!Array.isArray(images)) return [];
    return images
      .filter((image): image is string => typeof image === 'string')
      .map((image) => image.trim())
      .filter(Boolean);
  }

  private buildRoomImageCandidates(source: string): string[] {
    const normalized = source.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    const candidates = new Set<string>();
    const roomCodeMatches = normalized.matchAll(/\b([a-z])\s*0*(\d{1,3})\b/g);
    for (const match of roomCodeMatches) {
      const letter = match[1];
      const number = match[2];
      candidates.add(`kamar-${letter}-${number}.webp`);
      candidates.add(`kamar-${letter}.webp`);
    }

    const letterMatches = normalized.matchAll(/\b(?:kamar\s*)?([a-z])\b/g);
    for (const match of letterMatches) {
      candidates.add(`kamar-${match[1]}.webp`);
      for (let index = 1; index <= 3; index += 1) candidates.add(`kamar-${match[1]}-${index}.webp`);
    }

    return Array.from(candidates);
  }

  private buildPricingAvailabilityWhere(pricingTerm?: PricingTerm): Prisma.RoomWhereInput {
    if (pricingTerm) {
      return { monthlyRateRupiah: { gt: 0 } };
    }
    return {};
  }

  private getAvailablePricingTerms(room: Pick<PublicRoomRecord, 'monthlyRateRupiah'>): PricingTerm[] {
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

  private resolveRent(room: Pick<PublicRoomRecord, 'monthlyRateRupiah'>, pricingTerm: PricingTerm): number {
    const monthlyRate = Number(room.monthlyRateRupiah ?? 0);
    if (!monthlyRate || monthlyRate <= 0) return 0;
    return calculateRentByPricingTerm(monthlyRate, pricingTerm);
  }
}
