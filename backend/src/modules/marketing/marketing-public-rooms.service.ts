// FILE: marketing-public-rooms.service.ts — katalog kamar publik + filter ketersediaan + harga
import { BadRequestException, ForbiddenException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'node:crypto';
import { Prisma, PublicRoomAvailabilityStatus } from '../../generated/prisma';
import { PricingTerm, RoomStatus } from '../../common/enums/app.enums';
import { StaffRoutineAreaType, StaffRoutineFrequency, StaffRoutineStatus } from '../../generated/prisma';
import { buildMeta, buildPagination } from '../../common/utils/pagination';
import { serializePrismaResult } from '../../common/utils/serialization';
import { PrismaService } from '../../prisma/prisma.service';
import { isBookingSchemaReady } from '../tenant-bookings/booking-schema.helper';
import { calculateRentByPricingTerm } from '../tenant-bookings/pricing.helper';
import { PublicRoomsQueryDto } from './dto/public-rooms-query.dto';
import { computeFacilityGap, type FacilityGapInput } from '../rooms/room-facility-spec';
import { resolvePublicAvailabilityStatus } from './public-availability.helper';
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
  roomSize: true,
  images: true,
  notes: false,  // C01-03: jangan ekspos catatan internal ke publik
  dailyRateRupiah: true,
  weeklyRateRupiah: true,
  biWeeklyRateRupiah: true,
  monthlyRateRupiah: true,
  defaultDepositRupiah: true,
  allowBookingWhileCleaning: true,
  electricityTariffPerKwhRupiah: true,
  waterTariffPerM3Rupiah: true,
  publicAvailability: { select: { status: true } },
} satisfies Prisma.RoomSelect;

type PublicRoomRecord = Prisma.RoomGetPayload<{ select: typeof PUBLIC_ROOM_SELECT }>;

/**
 * Fakta kontrak yang boleh tampil di publik (whitelist S3, 23 Okt 2026).
 * HANYA tanggal + masa sewa + status pengajuan. Nama/telepon/NIK penghuni tidak
 * pernah masuk struktur ini (C01-02) — jangan menambah field PII di sini.
 */
export interface PublicStayFacts {
  checkInDate: string | null;
  plannedCheckOutDate: string | null;
  /** Sisa hari menuju akhir kontrak (0 = habis atau sudah lewat), dihitung di server. */
  remainingDays: number;
  /** Masa sewa stay aktif: DAILY…YEARLY (enum `PricingTerm`). */
  pricingTerm: string | null;
  hasPendingRenew: boolean;
  renewStatus: string | null;
  checkoutRequest: { status: 'PENDING' | 'APPROVED'; requestedCheckOutDate: string } | null;
  projectedAvailableDate: string | null;
  projectedAvailableReason: 'checkout-approved' | 'short-term' | null;
}

export interface PublicRoomSummary {
  bookable: number;
  occupied: number;
  maintenance: number;
  reserved: number;
  total: number;
}


@Injectable()
export class MarketingPublicRoomsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  // ═══════════════════════════════════════════════════════════
  //  SECTION: Public Room Listings & Social Proof
  // ═══════════════════════════════════════════════════════════

  async getPublicSocialProof() {
    // DEFENSIVE: ExternalReview table mungkin belum ada di DB produksi (migrasi 20260624100000).
    // Fallback graceful: coba full query dulu; jika gagal, retry hanya StaffReview.
    try {
      return await this.getPublicSocialProofInternal(true);
    } catch (_err: any) {
      // Kemungkinan tabel ExternalReview belum ada — retry tanpa external review.
      try {
        return await this.getPublicSocialProofInternal(false);
      } catch (_err2: any) {
        // Query dasar pun gagal (DB connection issue dsb.) — kembalikan kosong.
        return { occupantCount: 0, averageRating: 0, reviewCount: 0, reviews: [] };
      }
    }
  }

  /** Implementasi social proof — dengan atau tanpa ExternalReview. */
  private async getPublicSocialProofInternal(includeExternal: boolean) {
    if (includeExternal) {
      // Full query: StaffReview + ExternalReview dalam satu transaksi.
      const [staffReviews, staffAggregate, activeStays, externalReviews, externalAggregate] =
        await this.prisma.$transaction([
          this.prisma.staffReview.findMany({
            where: { status: 'VISIBLE' as any },
            select: {
              rating: true,
              comment: true,
              createdAt: true,
              tenant: { select: { fullName: true } },
            },
            orderBy: { createdAt: 'desc' },
            take: 12,
          }),
          this.prisma.staffReview.aggregate({
            where: { status: 'VISIBLE' as any },
            _avg: { rating: true },
            _count: { id: true },
          }),
          this.prisma.stay.findMany({
            where: { status: 'ACTIVE' as any, initialMetersPromotedAt: { not: null } },
            select: { tenantId: true },
          }),
          this.prisma.externalReview.findMany({
            where: { isVisible: true },
            select: { rating: true, comment: true, authorName: true, source: true, reviewedAt: true },
            orderBy: { reviewedAt: 'desc' },
            take: 20,
          }),
          this.prisma.externalReview.aggregate({
            where: { isVisible: true },
            _avg: { rating: true },
            _count: { id: true },
          }),
        ]);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return this.buildSocialProofResponse(staffReviews as any, staffAggregate, activeStays as any, externalReviews as any, externalAggregate);
    }

    // Fallback: hanya StaffReview (ExternalReview table belum ada).
    const [staffReviews, staffAggregate, activeStays] = await this.prisma.$transaction([
      this.prisma.staffReview.findMany({
        where: { status: 'VISIBLE' as any },
        select: {
          rating: true,
          comment: true,
          createdAt: true,
          tenant: { select: { fullName: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 12,
      }),
      this.prisma.staffReview.aggregate({
        where: { status: 'VISIBLE' as any },
        _avg: { rating: true },
        _count: { id: true },
      }),
      this.prisma.stay.findMany({
        where: { status: 'ACTIVE' as any, initialMetersPromotedAt: { not: null } },
        select: { tenantId: true },
      }),
    ]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return this.buildSocialProofResponse(staffReviews as any, staffAggregate, activeStays as any, [], { _avg: { rating: null }, _count: { id: 0 } });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private buildSocialProofResponse(
    staffReviews: any[],
    staffAggregate: { _avg: { rating: number | null }; _count: { id: number } },
    activeStays: any[],
    externalReviews: any[],
    externalAggregate: { _avg: { rating: number | null }; _count: { id: number } },
  ) {
    const occupantCount = new Set(activeStays.map((stay: any) => stay.tenantId)).size;

    const totalCount = staffAggregate._count.id + externalAggregate._count.id;
    const weightedAvg = totalCount > 0
      ? ((staffAggregate._avg.rating ?? 0) * staffAggregate._count.id +
         (externalAggregate._avg.rating ?? 0) * externalAggregate._count.id) / totalCount
      : 0;
    const averageRating = weightedAvg > 0 ? Math.round(weightedAvg * 10) / 10 : 0;

    const staffMapped = staffReviews.map((r: any) => ({
      initials: this.toInitials(r.tenant.fullName),
      displayName: null as string | null,
      source: null as string | null,
      rating: r.rating,
      comment: r.comment?.trim().slice(0, 280) || null,
      createdAt: r.createdAt,
    }));

    const externalMapped = externalReviews.map((r: any) => ({
      initials: this.toInitials(r.authorName),
      displayName: r.authorName,
      source: r.source,
      rating: r.rating,
      comment: r.comment?.trim().slice(0, 280) || null,
      createdAt: r.reviewedAt,
    }));

    const allReviews = [...externalMapped, ...staffMapped]
      .sort((a: any, b: any) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 20);

    return {
      occupantCount,
      averageRating,
      reviewCount: totalCount,
      reviews: allReviews,
    };
  }

  async getPublicRoomSummary(): Promise<PublicRoomSummary> {
    try {
      const rooms = await this.prisma.room.findMany({
        where: {
          isActive: true,
          monthlyRateRupiah: { gt: 0 },
          status: {
            in: [
              RoomStatus.AVAILABLE as any,
              RoomStatus.RESERVED as any,
              RoomStatus.OCCUPIED as any,
              RoomStatus.MAINTENANCE as any,
            ],
          },
        },
        select: {
          status: true,
          publicAvailability: { select: { status: true } },
        },
      });

      let available = 0;
      let occupied = 0;
      let maintenance = 0;
      let reserved = 0;

      for (const room of rooms) {
        const publicStatus = resolvePublicAvailabilityStatus(room);
        if (publicStatus === PublicRoomAvailabilityStatus.HIDDEN) continue;
        if (publicStatus === PublicRoomAvailabilityStatus.AVAILABLE) {
          available += 1;
          continue;
        }
        // Pada mode katalog manual, semua status non-tersedia ditampilkan
        // konsisten sebagai "Penuh"; status operasional asli tidak diekspos.
        occupied += 1;
      }

      return {
        bookable: available,
        occupied,
        maintenance,
        reserved,
        total: available + occupied,
      };
    } catch (_err: any) {
      // DEFENSIVE: jika groupBy/count gagal (schema drift, enum mismatch), kembalikan nol.
      return { bookable: 0, occupied: 0, maintenance: 0, reserved: 0, total: 0 };
    }
  }

  /**
   * Pengaturan katalog ringan untuk owner. PIN hanya hidup di environment
   * server dan tidak pernah dikirim ke browser atau database.
   */
  async getPublicAvailabilitySetup(ownerPin: string | undefined) {
    this.assertAvailabilityOwnerPin(ownerPin);
    const rooms = await this.prisma.room.findMany({
      where: { isActive: true },
      select: {
        id: true,
        code: true,
        name: true,
        floor: true,
        status: true,
        publicAvailability: { select: { status: true } },
      },
      orderBy: [{ floor: 'asc' }, { code: 'asc' }],
    });

    return {
      onlineBookingEnabled: this.isPublicOnlineBookingEnabled(),
      rooms: rooms.map((room) => ({
        id: room.id,
        code: room.code,
        name: room.name,
        floor: room.floor,
        publicStatus: resolvePublicAvailabilityStatus(room),
      })),
    };
  }

  async updatePublicAvailabilitySetup(
    ownerPin: string | undefined,
    entries: Array<{ roomId: number; status: PublicRoomAvailabilityStatus }>,
  ) {
    this.assertAvailabilityOwnerPin(ownerPin);
    if (!entries.length) throw new BadRequestException('Pilih minimal satu status kamar untuk disimpan.');
    if (entries.length > 100) throw new BadRequestException('Terlalu banyak kamar dalam satu penyimpanan.');

    const uniqueEntries = new Map<number, PublicRoomAvailabilityStatus>();
    for (const entry of entries) {
      if (!Number.isInteger(entry.roomId) || entry.roomId <= 0) {
        throw new BadRequestException('ID kamar tidak valid.');
      }
      if (uniqueEntries.has(entry.roomId)) {
        throw new BadRequestException('Setiap kamar hanya boleh diatur satu kali.');
      }
      uniqueEntries.set(entry.roomId, entry.status);
    }

    const roomIds = [...uniqueEntries.keys()];
    const existingRooms = await this.prisma.room.findMany({
      where: { id: { in: roomIds }, isActive: true },
      select: { id: true },
    });
    if (existingRooms.length !== roomIds.length) {
      throw new BadRequestException('Ada kamar yang tidak aktif atau tidak ditemukan. Muat ulang wizard lalu coba lagi.');
    }

    await this.prisma.$transaction(
      roomIds.map((roomId) => this.prisma.publicRoomAvailability.upsert({
        where: { roomId },
        create: { roomId, status: uniqueEntries.get(roomId)! },
        update: { status: uniqueEntries.get(roomId)! },
      })),
    );

    return this.getPublicAvailabilitySetup(ownerPin);
  }

  async getPublicRooms(query: PublicRoomsQueryDto) {
    const { page, limit, skip, take } = buildPagination(query.page, query.limit);

    if (!(await isBookingSchemaReady(this.prisma))) {
      return {
        items: [],
        meta: buildMeta(page, limit, 0),
      };
    }

    const where = this.buildPublicRoomWhere(query);

    // Sembunyikan kamar dengan gap fasilitas↔inventaris (mis. AC kurang) dari katalog publik.
    const gapRoomIds = await this.getRoomIdsWithFacilityGap();
    if (gapRoomIds.length) {
      (where.AND as Prisma.RoomWhereInput[]).push({ id: { notIn: gapRoomIds } });
    }

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
    const stayFactsByRoomId = await this.getPublicStayFactsByRoomId(items.map((room) => room.id));

    return {
      items: serializePrismaResult(items.map((room) => this.toPublicRoomDto(room, query.pricingTerm, facilitiesByRoomId.get(room.id) ?? [], stayFactsByRoomId.get(room.id)))),
      meta: buildMeta(page, limit, totalItems),
    };
  }

  // PUB-CALENDAR-CHECKOUT/RENEW: fakta kontrak publik per kamar — dipakai katalog
  // (chip peluang kosong) dan sekaligus menyimpan proyeksi tanggal kamar "Akan
  // Kosong" untuk kamar terisi yang (a) ada checkout-request APPROVED, atau (b)
  // stay-nya jangka pendek (harian/mingguan/2-mingguan) yang sering tidak
  // diperpanjang. Keputusan owner 2026-06-18.
  //
  // S3 (23 Okt 2026): isi fungsi ini adalah WHITELIST publik — tanggal, masa sewa,
  // dan status pengajuan. Nama/telepon/NIK penghuni tidak pernah di-select di sini.
  private async getPublicStayFactsByRoomId(roomIds: number[]): Promise<Map<number, PublicStayFacts>> {
    const facts = new Map<number, PublicStayFacts>();
    if (!roomIds.length) return facts;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = this.localYMD(today);

    const stays = await this.prisma.stay.findMany({
      where: { roomId: { in: roomIds }, status: 'ACTIVE' as any },
      select: {
        id: true,
        roomId: true,
        pricingTerm: true,
        checkInDate: true,
        plannedCheckOutDate: true,
      },
      orderBy: { checkInDate: 'desc' },
    });
    if (!stays.length) return facts;

    const stayIds = stays.map((s) => s.id);
    const [checkoutRows, renewRows] = await Promise.all([
      this.prisma.checkoutRequest.findMany({
        where: { stayId: { in: stayIds }, status: { in: ['PENDING', 'APPROVED'] as any } },
        select: { stayId: true, status: true, requestedCheckOutDate: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.renewRequest.findMany({
        where: { stayId: { in: stayIds }, status: { in: ['PENDING', 'APPROVED'] } },
        select: { stayId: true, status: true },
      }),
    ]);

    // APPROVED menang atas PENDING; di antara status yang sama, yang terbaru menang.
    const checkoutByStayId = new Map<
      number,
      { status: 'PENDING' | 'APPROVED'; requestedCheckOutDate: Date }
    >();
    for (const row of checkoutRows) {
      const existing = checkoutByStayId.get(row.stayId);
      if (existing?.status === 'APPROVED' && row.status !== 'APPROVED') continue;
      checkoutByStayId.set(row.stayId, {
        status: row.status as 'PENDING' | 'APPROVED',
        requestedCheckOutDate: row.requestedCheckOutDate,
      });
    }
    const renewByStayId = new Map<number, string>();
    for (const row of renewRows) renewByStayId.set(row.stayId, row.status);

    // Satu stay per kamar: yang mencakup hari ini; kalau tidak ada, kontrak terjauh
    // (stay yang masih ACTIVE walau kontraknya sudah lewat).
    const byRoomId = new Map<number, typeof stays>();
    for (const stay of stays) {
      const list = byRoomId.get(stay.roomId);
      if (list) list.push(stay);
      else byRoomId.set(stay.roomId, [stay]);
    }

    const SHORT_TERMS = ['DAILY', 'WEEKLY', 'BIWEEKLY'];
    for (const [roomId, roomStays] of byRoomId) {
      const covering = roomStays.find((stay) => {
        const start = new Date(stay.checkInDate);
        const end = stay.plannedCheckOutDate ? new Date(stay.plannedCheckOutDate) : null;
        return start <= today && (!end || end > today);
      });
      const stay = covering
        ?? [...roomStays].sort(
          (a, b) => (b.plannedCheckOutDate?.getTime() ?? 0) - (a.plannedCheckOutDate?.getTime() ?? 0),
        )[0];

      const checkInDate = this.localYMD(new Date(stay.checkInDate));
      const plannedCheckOutDate = stay.plannedCheckOutDate
        ? this.localYMD(new Date(stay.plannedCheckOutDate))
        : null;
      const remainingDays = plannedCheckOutDate
        ? Math.max(
          0,
          Math.round((new Date(`${plannedCheckOutDate}T00:00:00`).getTime() - today.getTime()) / 86_400_000),
        )
        : 0;

      const checkout = checkoutByStayId.get(stay.id);
      const renewStatus = renewByStayId.get(stay.id) ?? null;

      // PUB-CALENDAR-CHECKOUT: hanya tanggal yang belum lewat yang diproyeksikan.
      let projectedAvailableDate: string | null = null;
      let projectedAvailableReason: 'checkout-approved' | 'short-term' | null = null;
      if (checkout?.status === 'APPROVED') {
        projectedAvailableDate = this.localYMD(new Date(checkout.requestedCheckOutDate));
        projectedAvailableReason = 'checkout-approved';
      } else if (SHORT_TERMS.includes(String(stay.pricingTerm)) && plannedCheckOutDate) {
        projectedAvailableDate = plannedCheckOutDate;
        projectedAvailableReason = 'short-term';
      }
      if (projectedAvailableDate && projectedAvailableDate < todayStr) {
        projectedAvailableDate = null;
        projectedAvailableReason = null;
      }

      facts.set(roomId, {
        checkInDate,
        plannedCheckOutDate,
        remainingDays,
        pricingTerm: stay.pricingTerm ? String(stay.pricingTerm) : null,
        hasPendingRenew: renewStatus !== null,
        renewStatus,
        checkoutRequest: checkout
          ? {
            status: checkout.status,
            requestedCheckOutDate: this.localYMD(new Date(checkout.requestedCheckOutDate)),
          }
          : null,
        projectedAvailableDate,
        projectedAvailableReason,
      });
    }
    return facts;
  }

  // ═══════════════════════════════════════════════════════════
  //  SECTION: Availability & Detail Methods
  // ═══════════════════════════════════════════════════════════

  /** localYMD: format Date lokal → "YYYY-MM-DD" (sama seperti frontend) */
  private localYMD(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
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

    const fromStr = this.localYMD(fromDate);
    const toStr = this.localYMD(toDate);

    // Bangun array tanggal — pakai localYMD agar key konsisten dgn frontend.
    const dates: string[] = [];
    const cursor = new Date(fromDate);
    while (cursor <= toDate) {
      dates.push(this.localYMD(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }

    // Ambil semua kamar aktif — dengan info pricing + kategori.
    const rooms = await this.prisma.room.findMany({
      where: { isActive: true },
      select: {
        id: true,
        code: true,
        name: true,
        floor: true,
        status: true,
        category: true,
        roomType: true,
        hasAc: true,
        monthlyRateRupiah: true,
      },
      orderBy: [{ floor: 'asc' }, { code: 'asc' }],
    });

    // Ambil stay ACTIVE — termasuk yg kontraknya sudah lewat (masih ACTIVE / overstay).
    const stays = await this.prisma.stay.findMany({
      where: {
        status: 'ACTIVE',
        checkInDate: { lt: toDate },
        // TIDAK filter plannedCheckOutDate — stay yg lewat kontrak tetap perlu
        // untuk nunjukkin status HUNI (overstay) atau PERPANJANG (jika ada renew).
      },
      select: {
        id: true,
        roomId: true,
        status: true,
        pricingTerm: true,
        checkInDate: true,
        plannedCheckOutDate: true,
        initialMetersPromotedAt: true,
        downPaymentPaidRupiah: true,
        downPaymentPaidAt: true,
        downPaymentAmountRupiah: true,
        room: {
          select: { status: true },
        },
        // C01-02: tenant.fullName sengaja TIDAK di-select — endpoint publik, PII dilarang.
      },
    });

    // Ambil renew request PENDING / APPROVED untuk stay aktif.
    const activeStayIds = stays.map((s) => s.id);
    const renewRequests = activeStayIds.length > 0
      ? await this.prisma.renewRequest.findMany({
          where: {
            stayId: { in: activeStayIds },
            status: { in: ['PENDING', 'APPROVED'] },
          },
          select: {
            stayId: true,
            status: true,
            requestedCheckOutDate: true,
          },
        })
      : [];
    const renewByStayId = new Map<number, typeof renewRequests[0]>();
    for (const rr of renewRequests) {
      renewByStayId.set(rr.stayId, rr);
    }

    // Ambil pengajuan keluar (`CheckoutRequest`) PENDING / APPROVED untuk stay aktif.
    // Hanya DIBACA — alur approval tetap milik modul checkout-requests.
    // `requestedCheckOutDate` non-nullable di schema (`DateTime @db.Date`), jadi
    // tidak ada jalur "NULL → turunkan ke akhir kontrak".
    const checkoutRequests = activeStayIds.length > 0
      ? await this.prisma.checkoutRequest.findMany({
          where: {
            stayId: { in: activeStayIds },
            status: { in: ['PENDING', 'APPROVED'] },
          },
          select: {
            stayId: true,
            status: true,
            requestedCheckOutDate: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        })
      : [];
    // APPROVED menang atas PENDING; di antara status yang sama, yang terbaru menang.
    const checkoutByStayId = new Map<
      number,
      { status: 'PENDING' | 'APPROVED'; requestedCheckOutDate: Date }
    >();
    for (const cr of checkoutRequests) {
      const existing = checkoutByStayId.get(cr.stayId);
      if (existing?.status === 'APPROVED' && cr.status !== 'APPROVED') continue;
      checkoutByStayId.set(cr.stayId, {
        status: cr.status as 'PENDING' | 'APPROVED',
        requestedCheckOutDate: cr.requestedCheckOutDate,
      });
    }

    // Group stays by roomId.
    const staysByRoomId = new Map<number, typeof stays>();
    for (const stay of stays) {
      const list = staysByRoomId.get(stay.roomId);
      if (list) list.push(stay);
      else staysByRoomId.set(stay.roomId, [stay]);
    }

    // Helper: hitung sisa hari dari hari ini sampai target date.
    const todayNorm = new Date(today);
    const diffDays = (d: Date): number =>
      Math.max(0, Math.round((d.getTime() - todayNorm.getTime()) / 86_400_000));

    // Untuk tiap kamar + tanggal, tentukan status + data kaya.
    const roomDays: Array<{
      id: number;
      code: string;
      name: string | null;
      floor: string | null;
      status: string;
      category: string;
      roomType: string;
      hasAc: boolean;
      monthlyRateRupiah: number;
      currentTenantName: string | null;
      checkInDate: string | null;
      plannedCheckOutDate: string | null;
      /** Masa sewa stay aktif (enum `PricingTerm`); null = tidak ada stay. */
      pricingTerm: string | null;
      remainingDays: number;
      hasPendingRenew: boolean;
      renewStatus: string | null;
      /** Pengajuan keluar yang sedang berjalan — tanpa PII, hanya tanggal + status. */
      checkoutRequest: { status: 'PENDING' | 'APPROVED'; requestedCheckOutDate: string } | null;
      dpTenantName: string | null;
      dpCheckInDate: string | null;
      days: Record<string, string>;
    }> = [];

    for (const room of rooms) {
      const roomStays = staysByRoomId.get(room.id) ?? [];
      const days: Record<string, string> = {};

      // Cari stay yang mencakup hari INI untuk summary
      const todayObj = new Date(today);
      const todayStay = roomStays.find((stay) => {
        const start = new Date(stay.checkInDate);
        const end = stay.plannedCheckOutDate
          ? new Date(stay.plannedCheckOutDate)
          : null;
        return start <= todayObj && (!end || end > todayObj);
      });

      let checkInDate: string | null = null;
      let plannedCheckOutDate: string | null = null;
      /** Masa sewa stay yang dipakai baris ini (enum `PricingTerm`) — S3, tanpa PII. */
      let pricingTerm: string | null = null;
      let remainingDays = 0;
      let hasPendingRenew = false;
      let renewStatus: string | null = null;
      let dpCheckInDate: string | null = null;
      // Stay yang datanya dipakai baris kamar ini — dipakai untuk mengambil CheckoutRequest.
      let referencedStayId: number | null = todayStay?.id ?? null;

      if (todayStay) {
        const isOccupied =
          todayStay.initialMetersPromotedAt !== null ||
          todayStay.room.status === 'OCCUPIED';

        if (isOccupied) {
          checkInDate = todayStay.checkInDate
            ? this.localYMD(todayStay.checkInDate)
            : null;
          plannedCheckOutDate = todayStay.plannedCheckOutDate
            ? this.localYMD(todayStay.plannedCheckOutDate)
            : null;
          pricingTerm = todayStay.pricingTerm ? String(todayStay.pricingTerm) : null;
          if (plannedCheckOutDate) {
            remainingDays = diffDays(new Date(plannedCheckOutDate + 'T00:00:00'));
          }
          // Cek renew request
          const rr = todayStay.id ? renewByStayId.get(todayStay.id) : undefined;
          if (rr) {
            hasPendingRenew = true;
            renewStatus = rr.status;
          }
        } else {
          // DP booking — downPaymentPaidRupiah > 0 && belum occupied
          dpCheckInDate = todayStay.checkInDate
            ? this.localYMD(todayStay.checkInDate)
            : null;
        }
      } else if (roomStays.length > 0) {
        // Kontrak sudah lewat, tapi stay masih ACTIVE — ambil stay terbaru
        const sortedStays = [...roomStays].sort((a, b) => {
          const aEnd = a.plannedCheckOutDate?.getTime() ?? 0;
          const bEnd = b.plannedCheckOutDate?.getTime() ?? 0;
          return bEnd - aEnd;
        });
        const latestStay = sortedStays[0];
        referencedStayId = latestStay.id ?? null;
        checkInDate = latestStay.checkInDate
          ? this.localYMD(latestStay.checkInDate)
          : null;
        plannedCheckOutDate = latestStay.plannedCheckOutDate
          ? this.localYMD(latestStay.plannedCheckOutDate)
          : null;
        pricingTerm = latestStay.pricingTerm ? String(latestStay.pricingTerm) : null;
        remainingDays = 0; // kontrak sudah lewat
        const rr = latestStay.id ? renewByStayId.get(latestStay.id) : undefined;
        if (rr) {
          hasPendingRenew = true;
          renewStatus = rr.status;
        }
      }

      // Bangun per-day status — dengan PERPANJANG setelah kontrak habis
      for (const dateStr of dates) {
        const dateObj = new Date(dateStr + 'T00:00:00');

        const coveringStay = roomStays.find((stay) => {
          const stayStart = new Date(stay.checkInDate);
          const stayEnd = stay.plannedCheckOutDate
            ? new Date(stay.plannedCheckOutDate)
            : null;
          return stayStart <= dateObj && (!stayEnd || stayEnd > dateObj);
        });

        if (coveringStay) {
          const isOccupied =
            coveringStay.initialMetersPromotedAt !== null ||
            coveringStay.room.status === 'OCCUPIED';
          days[dateStr] = isOccupied ? 'HUNI' : 'BOOKING_DP';
        } else {
          // Tidak tercakup stay — cek apakah ada stay aktif yg kontraknya sudah lewat
          // (tenant belum check-out, stay masih ACTIVE, kamar tetap terisi)
          const pastContract = roomStays.some((stay) => {
            if (!stay.plannedCheckOutDate) return false;
            const stayEnd = new Date(stay.plannedCheckOutDate);
            return dateObj >= stayEnd;
          });

          if (pastContract) {
            // Setelah kontrak habis: masih terisi (HUNI), atau PERPANJANG jika ada renewal
            const inRenewPeriod = roomStays.some((stay) => {
              if (!stay.plannedCheckOutDate) return false;
              const rr = stay.id ? renewByStayId.get(stay.id) : undefined;
              if (!rr) return false;
              const stayEnd = new Date(stay.plannedCheckOutDate);
              return dateObj >= stayEnd;
            });
            days[dateStr] = inRenewPeriod ? 'PERPANJANG' : 'HUNI';
          } else if (room.status === 'MAINTENANCE') {
            days[dateStr] = 'MAINTENANCE';
          } else {
            days[dateStr] = 'KOSONG';
          }
        }
      }

      const checkoutInfo = referencedStayId != null ? checkoutByStayId.get(referencedStayId) : undefined;

      roomDays.push({
        id: room.id,
        code: room.code,
        name: room.name,
        floor: room.floor,
        status: room.status,
        category: room.category ?? 'STANDARD',
        roomType: room.roomType ?? 'REGULAR',
        hasAc: room.hasAc ?? false,
        monthlyRateRupiah: room.monthlyRateRupiah ?? 0,
        currentTenantName: null,  // C01-02: jangan bocorkan PII ke publik
        checkInDate,
        plannedCheckOutDate,
        pricingTerm,
        remainingDays,
        hasPendingRenew,
        renewStatus,
        checkoutRequest: checkoutInfo
          ? {
              status: checkoutInfo.status,
              requestedCheckOutDate: this.localYMD(checkoutInfo.requestedCheckOutDate),
            }
          : null,
        dpTenantName: null,  // C01-02: jangan bocorkan PII ke publik
        dpCheckInDate,
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
    if (!(await isBookingSchemaReady(this.prisma))) {
      throw new ServiceUnavailableException(
        'Fitur booking belum aktif penuh karena database belum sinkron. Jalankan sinkronisasi schema terlebih dahulu.',
      );
    }

    const room = await this.prisma.room.findFirst({
      where: {
        AND: [
          {
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
          this.buildPublicVisibilityWhere(),
        ],
      },
      select: PUBLIC_ROOM_SELECT,
    });

    if (!room) {
      throw new NotFoundException('Kamar tidak ditemukan atau tidak tersedia untuk dilihat');
    }

    // Kamar dengan gap fasilitas↔inventaris (mis. AC kurang) tidak dibuka ke publik.
    if ((await this.getRoomIdsWithFacilityGap([room.id])).includes(room.id)) {
      throw new NotFoundException('Kamar tidak ditemukan atau tidak tersedia untuk dilihat');
    }

    const facilitiesByRoomId = await this.getPublicFacilitiesByRoomId([room.id]);
    const stayFactsByRoomId = await this.getPublicStayFactsByRoomId([room.id]);
    const highlightedPricingTerm = this.getAvailablePricingTerms(room)[0] ?? PricingTerm.MONTHLY;

    return serializePrismaResult(this.toPublicRoomDto(room, highlightedPricingTerm, facilitiesByRoomId.get(room.id) ?? [], stayFactsByRoomId.get(room.id)));
  }

  // ------------------------------------------------------------------
  // PRIVATE HELPERS
  // ------------------------------------------------------------------

  /** roomId yang punya gap fasilitas↔inventaris belum terpenuhi (disembunyikan dari katalog). */
  private async getRoomIdsWithFacilityGap(roomIds?: number[]): Promise<number[]> {
    const rooms = await this.prisma.room.findMany({
      where: roomIds && roomIds.length ? { id: { in: roomIds } } : { isActive: true },
      select: {
        id: true,
        category: true,
        roomType: true,
        roomSize: true,
        hasAc: true,
        roomItems: { select: { id: true, status: true, item: { select: { name: true } } } },
        facilities: { select: { inventoryItemId: true } },
      },
    });
    return rooms
      .filter((room) => {
        const hasInventorySignal =
          room.roomItems.length > 0 ||
          room.facilities.some((facility) => typeof facility.inventoryItemId === 'number');
        if (!hasInventorySignal) return false;
        return computeFacilityGap(room as unknown as FacilityGapInput).hasGap;
      })
      .map((room) => room.id);
  }

  private buildPublicRoomWhere(query: PublicRoomsQueryDto): Prisma.RoomWhereInput {
    const conditions: Prisma.RoomWhereInput[] = [
      { isActive: true },
      this.buildPublicVisibilityWhere(),
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

  private buildPublicVisibilityWhere(): Prisma.RoomWhereInput {
    return {
      OR: [
        { publicAvailability: { is: null } },
        { publicAvailability: { is: { status: { not: PublicRoomAvailabilityStatus.HIDDEN } } } },
      ],
    };
  }


  private isPublicOnlineBookingEnabled() {
    return ['true', '1', 'yes', 'on'].includes(
      String(this.configService.get<string>('PUBLIC_ONLINE_BOOKING_ENABLED') ?? 'false').trim().toLowerCase(),
    );
  }

  private assertAvailabilityOwnerPin(ownerPin: string | undefined) {
    const expected = String(this.configService.get<string>('AVAILABILITY_OWNER_PIN') ?? '').trim();
    const provided = String(ownerPin ?? '').trim();
    if (expected.length < 6) {
      throw new ServiceUnavailableException(
        'Wizard ketersediaan belum dikonfigurasi. Isi AVAILABILITY_OWNER_PIN di Environment Variables atau .env application root, lalu Restart Application.',
      );
    }
    const expectedBytes = Buffer.from(expected);
    const providedBytes = Buffer.from(provided);
    if (expectedBytes.length !== providedBytes.length || !timingSafeEqual(expectedBytes, providedBytes)) {
      throw new ForbiddenException('PIN owner tidak valid.');
    }
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
    stayFacts?: PublicStayFacts,
  ) {
    const highlightedPricingTerm = pricingTerm ?? PricingTerm.MONTHLY;
    const publicStatus = resolvePublicAvailabilityStatus(room);
    const isPubliclyAvailable = publicStatus === PublicRoomAvailabilityStatus.AVAILABLE;
    const onlineBookingEnabled = this.isPublicOnlineBookingEnabled();

    return {
      id: room.id,
      code: room.code,
      name: room.name,
      floor: room.floor,
      // Jangan mengekspos status operasional untuk tampilan katalog. Status
      // tersebut tetap dipakai secara internal untuk stay dan billing.
      status: isPubliclyAvailable ? RoomStatus.AVAILABLE : RoomStatus.OCCUPIED,
      publicAvailabilityStatus: publicStatus,
      category: room.category,
      roomType: room.roomType,
      roomSize: room.roomSize,
      // PUB-CALENDAR-CHECKOUT: tanggal proyeksi kamar kosong (null bila tak relevan).
      projectedAvailableDate: stayFacts?.projectedAvailableDate ?? null,
      projectedAvailableReason: stayFacts?.projectedAvailableReason ?? null,
      // S3 (23 Okt 2026): fakta kontrak publik — WHITELIST tanggal + masa sewa saja.
      // Nama/telepon/NIK penghuni tidak boleh masuk sini; kalau butuh field baru,
      // pastikan lolos aturan tanpa-PII di §8.10 dan KONTRAK.
      checkInDate: stayFacts?.checkInDate ?? null,
      plannedCheckOutDate: stayFacts?.plannedCheckOutDate ?? null,
      remainingDays: stayFacts?.remainingDays ?? 0,
      hasPendingRenew: stayFacts?.hasPendingRenew ?? false,
      renewStatus: stayFacts?.renewStatus ?? null,
      /** Masa sewa stay aktif (bukan `highlightedPricingTerm` milik katalog). */
      pricingTerm: stayFacts?.pricingTerm ?? null,
      checkoutRequest: stayFacts?.checkoutRequest ?? null,
      images: this.resolveRoomMarketingImages(room),
      notes: null,  // C01-03: catatan internal tidak untuk publik
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
      isAvailable: isPubliclyAvailable,
      // canBook artinya booking online; ketersediaan katalog ada di isAvailable.
      canBook: isPubliclyAvailable && onlineBookingEnabled,
      onlineBookingEnabled,
      availabilityNote:
        isPubliclyAvailable
          ? (onlineBookingEnabled
            ? 'Kamar tersedia untuk booking online.'
            : 'Kamar tersedia. Hubungi admin via WhatsApp untuk booking.')
          : publicStatus === PublicRoomAvailabilityStatus.FULL
            ? 'Kamar sedang penuh. Hubungi admin via WhatsApp untuk pilihan lain.'
            : room.status === RoomStatus.RESERVED
              ? 'Kamar sudah dikunci untuk tenant lain. Pilih kamar lain atau hubungi admin.'
          : room.status === RoomStatus.MAINTENANCE && Boolean(room.allowBookingWhileCleaning)
              ? 'Bisa dipesan sekarang — kamar sedang dibersihkan staf dan siap dihuni setelah pembersihan selesai.'
            : room.status === RoomStatus.MAINTENANCE
              ? 'Kamar kosong, tetapi sedang dicek sebelum dibuka untuk booking.'
              : null,
      facilities,
    };
  }

  // ═══════════════════════════════════════════════════════════
  //  SECTION: Image Helpers & Pricing
  // ═══════════════════════════════════════════════════════════

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
