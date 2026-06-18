import { Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma';
import { PricingTerm, RoomStatus } from '../../common/enums/app.enums';
import { StaffRoutineAreaType, StaffRoutineFrequency, StaffRoutineStatus } from '../../generated/prisma';
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
  category: true,
  roomType: true,
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
        take: 12, // PUB-REVIEWS-FILTER: pool utk sort Terbaru/Rating Tertinggi (FE tampil maks 10).
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
    const projectedByRoomId = await this.getProjectedAvailabilityByRoomId(items.map((room) => room.id));

    return {
      items: serializePrismaResult(items.map((room) => this.toPublicRoomDto(room, query.pricingTerm, facilitiesByRoomId.get(room.id) ?? [], projectedByRoomId.get(room.id)))),
      meta: buildMeta(page, limit, totalItems),
    };
  }

  // PUB-CALENDAR-CHECKOUT/RENEW: proyeksi tanggal kamar "Akan Kosong" untuk kamar
  // terisi yang (a) ada checkout-request APPROVED, atau (b) stay-nya jangka pendek
  // (harian/mingguan/2-mingguan) yang sering tidak diperpanjang. Keputusan owner 2026-06-18.
  private async getProjectedAvailabilityByRoomId(
    roomIds: number[],
  ): Promise<Map<number, { date: string; reason: 'checkout-approved' | 'short-term' }>> {
    const map = new Map<number, { date: string; reason: 'checkout-approved' | 'short-term' }>();
    if (!roomIds.length) return map;
    const todayStr = new Date().toISOString().slice(0, 10);

    const stays = await this.prisma.stay.findMany({
      where: { roomId: { in: roomIds }, status: 'ACTIVE' as any },
      select: { id: true, roomId: true, pricingTerm: true, plannedCheckOutDate: true },
    });
    const stayIds = stays.map((s) => s.id);
    const approved = stayIds.length
      ? await this.prisma.checkoutRequest.findMany({
          where: { stayId: { in: stayIds }, status: 'APPROVED' as any },
          select: { stayId: true, requestedCheckOutDate: true },
          orderBy: { requestedCheckOutDate: 'asc' },
        })
      : [];
    const approvedByStayId = new Map<number, Date>();
    for (const c of approved) if (!approvedByStayId.has(c.stayId)) approvedByStayId.set(c.stayId, c.requestedCheckOutDate);

    const SHORT_TERMS = ['DAILY', 'WEEKLY', 'BIWEEKLY'];
    for (const stay of stays) {
      const checkout = approvedByStayId.get(stay.id);
      let date: Date | null = null;
      let reason: 'checkout-approved' | 'short-term' | null = null;
      if (checkout) {
        date = checkout;
        reason = 'checkout-approved';
      } else if (SHORT_TERMS.includes(String(stay.pricingTerm)) && stay.plannedCheckOutDate) {
        date = stay.plannedCheckOutDate;
        reason = 'short-term';
      }
      if (date && reason) {
        const dateStr = date.toISOString().slice(0, 10);
        if (dateStr >= todayStr) map.set(stay.roomId, { date: dateStr, reason });
      }
    }
    return map;
  }

  /** PUB-CALENDAR: grid ketersediaan per kamar per tanggal untuk rentang [from, to]. */
  async getAvailabilityCalendar(query: { from?: string; to?: string }) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const fromDate = query.from ? new Date(query.from + 'T00:00:00') : new Date(today);
    const rawTo = query.to ? new Date(query.to + 'T00:00:00') : new Date(fromDate);
    if (!query.to) rawTo.setDate(rawTo.getDate() + 13); // default 2 minggu

    // Clamp maks 62 hari biar tidak overload.
    const MAX_SPAN_DAYS = 62;
    let toDate = rawTo;
    const spanDays = Math.round((toDate.getTime() - fromDate.getTime()) / 86_400_000);
    if (spanDays > MAX_SPAN_DAYS) {
      toDate = new Date(fromDate);
      toDate.setDate(toDate.getDate() + MAX_SPAN_DAYS);
    }
    if (spanDays < 0) {
      toDate = new Date(fromDate);
    }

    const fromStr = fromDate.toISOString().slice(0, 10);
    const toStr = toDate.toISOString().slice(0, 10);

    // Bangun array tanggal.
    const dates: string[] = [];
    const cursor = new Date(fromDate);
    while (cursor <= toDate) {
      dates.push(cursor.toISOString().slice(0, 10));
      cursor.setDate(cursor.getDate() + 1);
    }

    // Ambil semua kamar aktif.
    const rooms = await this.prisma.room.findMany({
      where: { isActive: true },
      select: { id: true, code: true, name: true, floor: true, status: true },
      orderBy: [{ floor: 'asc' }, { code: 'asc' }],
    });

    // Ambil stay ACTIVE yang overlap dengan rentang.
    const stays = await this.prisma.stay.findMany({
      where: {
        status: 'ACTIVE',
        checkInDate: { lt: toDate }, // stay dimulai sebelum akhir rentang
        OR: [
          { plannedCheckOutDate: null },
          { plannedCheckOutDate: { gt: fromDate } }, // stay berakhir setelah awal rentang
        ],
      },
      select: {
        id: true,
        roomId: true,
        status: true,
        checkInDate: true,
        plannedCheckOutDate: true,
        initialMetersPromotedAt: true,
        downPaymentPaidRupiah: true,
        room: {
          select: { status: true },
        },
      },
    });

    // Group stays by roomId.
    const staysByRoomId = new Map<number, typeof stays>();
    for (const stay of stays) {
      const list = staysByRoomId.get(stay.roomId);
      if (list) list.push(stay);
      else staysByRoomId.set(stay.roomId, [stay]);
    }

    // Untuk tiap kamar + tanggal, tentukan status.
    const roomDays: Array<{
      id: number;
      code: string;
      name: string | null;
      floor: string | null;
      status: string;
      days: Record<string, string>;
    }> = [];

    for (const room of rooms) {
      const roomStays = staysByRoomId.get(room.id) ?? [];
      const days: Record<string, string> = {};

      for (const dateStr of dates) {
        const dateObj = new Date(dateStr + 'T00:00:00');
        const nextDate = new Date(dateObj);
        nextDate.setDate(nextDate.getDate() + 1);

        // Cari stay yang mencakup tanggal ini.
        const coveringStay = roomStays.find((stay) => {
          const stayStart = new Date(stay.checkInDate);
          const stayEnd = stay.plannedCheckOutDate
            ? new Date(stay.plannedCheckOutDate)
            : null;
          // stay mencakup date jika stayStart <= date < stayEnd (atau stayEnd null)
          return stayStart <= dateObj && (!stayEnd || stayEnd > dateObj);
        });

        if (coveringStay) {
          // Ada stay aktif — bedakan HUNI vs BOOKING_DP
          const isOccupied =
            coveringStay.initialMetersPromotedAt !== null ||
            coveringStay.room.status === 'OCCUPIED';
          days[dateStr] = isOccupied ? 'HUNI' : 'BOOKING_DP';
        } else if (room.status === 'MAINTENANCE') {
          days[dateStr] = 'MAINTENANCE';
        } else {
          days[dateStr] = 'KOSONG';
        }
      }

      roomDays.push({
        id: room.id,
        code: room.code,
        name: room.name,
        floor: room.floor,
        status: room.status,
        days,
      });
    }

    return {
      from: fromStr,
      to: toStr,
      dates,
      rooms: roomDays,
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
    const projectedByRoomId = await this.getProjectedAvailabilityByRoomId([room.id]);
    const highlightedPricingTerm = this.getAvailablePricingTerms(room)[0] ?? PricingTerm.MONTHLY;

    return serializePrismaResult(this.toPublicRoomDto(room, highlightedPricingTerm, facilitiesByRoomId.get(room.id) ?? [], projectedByRoomId.get(room.id)));
  }

  // ------------------------------------------------------------------
  // PRIVATE HELPERS
  // ------------------------------------------------------------------

  private buildPublicRoomWhere(query: PublicRoomsQueryDto): Prisma.RoomWhereInput {
    const conditions: Prisma.RoomWhereInput[] = [
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
    ];

    // PUB-SMART-BOOKING: filter kamar yang available di seluruh rentang [checkIn, checkIn+durationDays).
    if (query.checkIn && query.durationDays) {
      const checkInDate = new Date(query.checkIn);
      const endDate = new Date(checkInDate.getTime() + query.durationDays * 86_400_000);

      conditions.push({
        stays: {
          none: {
            status: 'ACTIVE',
            checkInDate: { lt: endDate },
            OR: [
              { plannedCheckOutDate: null },
              { plannedCheckOutDate: { gt: checkInDate } },
            ],
          },
        },
      });
    }

    return { AND: conditions };
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

  private toPublicRoomDto(
    room: PublicRoomRecord,
    pricingTerm?: PricingTerm,
    facilities: unknown[] = [],
    projected?: { date: string; reason: 'checkout-approved' | 'short-term' },
  ) {
    const highlightedPricingTerm = pricingTerm ?? PricingTerm.MONTHLY;

    return {
      id: room.id,
      code: room.code,
      name: room.name,
      floor: room.floor,
      status: room.status,
      category: room.category,
      roomType: room.roomType,
      // PUB-CALENDAR-CHECKOUT: tanggal proyeksi kamar kosong (null bila tak relevan).
      projectedAvailableDate: projected?.date ?? null,
      projectedAvailableReason: projected?.reason ?? null,
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

  /** TEN-GAMIF: ranking kebersihan depan kamar bulanan — berdasarkan StaffRoutineCompletion area CLEANING. */
  async getCleanlinessRanking(month?: number, year?: number) {
    const now = new Date();
    const targetMonth = month ?? now.getMonth() + 1; // 1-based
    const targetYear = year ?? now.getFullYear();

    const monthStart = new Date(targetYear, targetMonth - 1, 1);
    const monthEnd = new Date(targetYear, targetMonth, 0, 23, 59, 59, 999);

    // Ambil semua template CLEANING.
    const cleaningTemplates = await this.prisma.staffRoutineTemplate.findMany({
      where: { areaType: StaffRoutineAreaType.CLEANING, isActive: true },
      select: { id: true },
    });
    const templateIds = cleaningTemplates.map((t) => t.id);
    if (templateIds.length === 0) return { month: targetMonth, year: targetYear, ranking: [] };

    const countExpected = (template: { frequency: StaffRoutineFrequency; dayOfWeek: number | null; dayOfMonth: number | null }) => {
      let expected = 0;
      for (const date = new Date(monthStart); date <= monthEnd; date.setDate(date.getDate() + 1)) {
        if (template.frequency === StaffRoutineFrequency.DAILY) expected += 1;
        if (template.frequency === StaffRoutineFrequency.WEEKLY && (template.dayOfWeek == null || template.dayOfWeek === date.getDay())) expected += 1;
        if (template.frequency === StaffRoutineFrequency.MONTHLY && (template.dayOfMonth == null || template.dayOfMonth === date.getDate())) expected += 1;
      }
      return expected;
    };

    // Assignment aktif adalah denominator ranking; kamar yang belum dikerjakan tetap muncul.
    const assignments = await this.prisma.staffRoutineAssignment.findMany({
      where: {
        templateId: { in: templateIds },
        roomId: { not: null },
        isActive: true,
      },
      select: {
        roomId: true,
        template: { select: { frequency: true, dayOfWeek: true, dayOfMonth: true } },
      },
    });
    const statsByRoomId = new Map<number, { expectedCount: number; doneCount: number }>();
    for (const assignment of assignments) {
      if (!assignment.roomId) continue;
      const current = statsByRoomId.get(assignment.roomId) ?? { expectedCount: 0, doneCount: 0 };
      current.expectedCount += countExpected(assignment.template);
      statsByRoomId.set(assignment.roomId, current);
    }

    const completions = await this.prisma.staffRoutineCompletion.groupBy({
      by: ['roomId'],
      where: {
        templateId: { in: templateIds },
        roomId: { not: null },
        dueDate: { gte: monthStart, lte: monthEnd },
        status: StaffRoutineStatus.DONE,
      },
      _count: { id: true },
    });
    for (const completion of completions) {
      if (!completion.roomId) continue;
      const current = statsByRoomId.get(completion.roomId) ?? { expectedCount: 0, doneCount: 0 };
      current.doneCount = completion._count.id;
      statsByRoomId.set(completion.roomId, current);
    }

    const roomIds = [...statsByRoomId.keys()];
    if (roomIds.length === 0) return { month: targetMonth, year: targetYear, ranking: [] };

    const rooms = await this.prisma.room.findMany({
      where: { id: { in: roomIds } },
      select: { id: true, code: true, name: true, floor: true },
    });
    const roomMap = new Map(rooms.map((r) => [r.id, r]));

    const ranked = roomIds
      .map((roomId) => {
        const stats = statsByRoomId.get(roomId) ?? { expectedCount: 0, doneCount: 0 };
        const expectedCount = stats.expectedCount > 0 ? stats.expectedCount : stats.doneCount;
        const score = expectedCount > 0 ? Math.round((stats.doneCount / expectedCount) * 100) : 0;
        return {
          roomId,
          code: roomMap.get(roomId)?.code ?? `#${roomId}`,
          name: roomMap.get(roomId)?.name ?? null,
          score,
          doneCount: stats.doneCount,
          expectedCount,
        };
      })
      .sort((a, b) => b.score - a.score || b.doneCount - a.doneCount || a.code.localeCompare(b.code));

    return { month: targetMonth, year: targetYear, ranking: ranked };
  }

  private resolveRent(room: Pick<PublicRoomRecord, 'monthlyRateRupiah'>, pricingTerm: PricingTerm): number {
    const monthlyRate = Number(room.monthlyRateRupiah ?? 0);
    if (!monthlyRate || monthlyRate <= 0) return 0;
    return calculateRentByPricingTerm(monthlyRate, pricingTerm);
  }
}
