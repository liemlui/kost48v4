import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from 'src/generated/prisma';
import { AuditLogService } from '../../audit-log/audit-log.service';
import { buildMeta, buildPagination } from '../../common/utils/pagination';
import { PrismaService } from '../../prisma/prisma.service';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import { CreateRoomDto, UpdateRoomDto } from './dto/room.dto';
import { CreateRoomFacilityDto, UpdateRoomFacilityDto } from './dto/room-facility.dto';
import { RoomsQueryDto } from './dto/rooms-query.dto';
import { InvoiceStatus, PricingTerm, RoomStatus, UtilityType } from '../../common/enums/app.enums';

@Injectable()
export class RoomsService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditLogService) {}

  async findAll(query: RoomsQueryDto) {
    const { page, limit, skip, take } = buildPagination(query.page, query.limit);
    const where: Prisma.RoomWhereInput = {
      AND: [
        query.search
          ? {
              OR: [
                { code: { contains: query.search, mode: Prisma.QueryMode.insensitive } },
                { name: { contains: query.search, mode: Prisma.QueryMode.insensitive } },
              ],
            }
          : undefined,
        query.status ? { status: query.status } : undefined,
        typeof query.isActive === 'string' ? { isActive: query.isActive === 'true' } : undefined,
        query.floor ? { floor: query.floor } : undefined,
      ].filter(Boolean),
    };

    const [items, totalItems] = await this.prisma.$transaction([
      this.prisma.room.findMany({
        where,
        skip,
        take,
        orderBy: { id: 'asc' },
        include: {
          stays: {
            where: { status: 'ACTIVE' },
            take: 1,
            orderBy: { id: 'desc' },
            include: {
              tenant: {
                select: {
                  id: true,
                  fullName: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.room.count({ where }),
    ]);

    const transformedItems = items.map((room) => {
      const activeStay = room.stays[0] || null;
      return {
        ...room,
        activeStayId: activeStay?.id || null,
        currentStay: activeStay
          ? {
              id: activeStay.id,
              tenant: activeStay.tenant,
            }
          : null,
        stays: undefined,
      };
    });

    return { items: transformedItems, meta: buildMeta(page, limit, totalItems) };
  }

  async findOne(id: number) {
    const item = await this.prisma.room.findUnique({
      where: { id },
      include: {
        roomItems: {
          include: {
            item: true,
          },
          orderBy: { id: 'asc' },
        },
        facilities: {
          orderBy: { id: 'asc' },
        },
        stays: {
          where: { status: 'ACTIVE' },
          take: 1,
          orderBy: { id: 'desc' },
          include: {
            tenant: {
              select: {
                id: true,
                fullName: true,
                phone: true,
                email: true,
              },
            },
            invoices: {
              where: { status: { in: [InvoiceStatus.ISSUED, InvoiceStatus.PARTIAL] } },
              select: { id: true },
            },
          },
        },
      },
    });

    if (!item) throw new NotFoundException('Kamar tidak ditemukan');

    const [latestElectricityReadings, latestWaterReadings] = await Promise.all([
      this.prisma.meterReading.findMany({
        where: { roomId: id, utilityType: UtilityType.ELECTRICITY },
        orderBy: { readingAt: 'desc' },
        take: 2,
      }),
      this.prisma.meterReading.findMany({
        where: { roomId: id, utilityType: UtilityType.WATER },
        orderBy: { readingAt: 'desc' },
        take: 2,
      }),
    ]);

    const activeStay = item.stays[0] ?? null;

    return {
      ...item,
      images: (item.images as unknown as Array<Record<string, unknown>>) ?? [],
      currentStay: activeStay
        ? {
            id: activeStay.id,
            tenant: activeStay.tenant,
            checkInDate: activeStay.checkInDate,
            plannedCheckOutDate: activeStay.plannedCheckOutDate,
            pricingTerm: activeStay.pricingTerm,
            agreedRentAmountRupiah: activeStay.agreedRentAmountRupiah,
            openInvoiceCount: activeStay.invoices.length,
          }
        : null,
      roomItems: item.roomItems.map((roomItem) => ({
        ...roomItem,
        inventoryItem: roomItem.item,
        item: undefined,
      })),
      meterSummary: {
        electricity: this.buildMeterSummary(latestElectricityReadings),
        water: this.buildMeterSummary(latestWaterReadings),
      },
      stays: undefined,
    };
  }



  async findPublicOne(id: number) {
    const room = await this.prisma.room.findUnique({
      where: { id },
    });

    if (!room) throw new NotFoundException('Kamar tidak ditemukan');
    if (!room.isActive) throw new NotFoundException('Kamar tidak tersedia');

    const pricingTerms = this.getAvailablePricingTerms(room);

    const publicFacilities = await this.prisma.roomFacility.findMany({
      where: { roomId: id, publicVisible: true },
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
    });

    return {
      id: room.id,
      code: room.code,
      name: room.name,
      floor: room.floor,
      status: room.status,
      isAvailable: room.status === 'AVAILABLE',
      notes: room.notes,
      images: (room.images as unknown as Array<Record<string, unknown>>) ?? [],
      pricing: {
        dailyRateRupiah: room.dailyRateRupiah,
        weeklyRateRupiah: room.weeklyRateRupiah,
        biWeeklyRateRupiah: room.biWeeklyRateRupiah,
        monthlyRateRupiah: room.monthlyRateRupiah,
      },
      defaultDepositRupiah: room.defaultDepositRupiah,
      electricityTariffPerKwhRupiah: room.electricityTariffPerKwhRupiah,
      waterTariffPerM3Rupiah: room.waterTariffPerM3Rupiah,
      availablePricingTerms: pricingTerms,
      highlightedPricingTerm: pricingTerms[0] ?? 'MONTHLY',
      highlightedRateRupiah: this.resolveRent(room, (pricingTerms[0] ?? 'MONTHLY') as PricingTerm),
      facilities: publicFacilities,
    };
  }

  async create(dto: CreateRoomDto, actor: CurrentUserPayload) {
    const exists = await this.prisma.room.findUnique({ where: { code: dto.code } });
    if (exists) throw new ConflictException('Kode kamar sudah digunakan');

    const createData: Prisma.RoomCreateInput = {
      ...dto,
      status: 'AVAILABLE',
    };

    const created = await this.prisma.room.create({ data: createData });
    await this.audit.log({
      actorUserId: actor.id,
      action: 'CREATE',
      entityType: 'Room',
      entityId: String(created.id),
      newData: created,
    });
    return created;
  }

  async update(id: number, dto: UpdateRoomDto, actor: CurrentUserPayload) {
    const existing = await this.prisma.room.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Kamar tidak ditemukan');

    if (dto.code && dto.code !== existing.code) {
      const exists = await this.prisma.room.findUnique({ where: { code: dto.code } });
      if (exists) throw new ConflictException('Kode kamar sudah digunakan');
    }

    const isTryingToDeactivate = dto.isActive === false;
    if (isTryingToDeactivate) {
      const activeStay = await this.prisma.stay.findFirst({
        where: {
          roomId: id,
          status: 'ACTIVE',
        },
      });
      if (activeStay) {
        throw new ConflictException(
          'Kamar ini sedang ditempati tenant aktif. Selesaikan atau batalkan stay terlebih dahulu sebelum menonaktifkan kamar.',
        );
      }
    }

    const nextMonthly = dto.monthlyRateRupiah ?? existing.monthlyRateRupiah;
    const nextActive = dto.isActive ?? existing.isActive;
    if (nextActive && nextMonthly <= 0) {
      throw new ConflictException('Kamar aktif wajib memiliki monthlyRateRupiah > 0');
    }

    const updateData: Prisma.RoomUpdateInput = {
      ...dto,
    };

    const updated = await this.prisma.room.update({
      where: { id },
      data: updateData,
    });

    await this.audit.log({
      actorUserId: actor.id,
      action: 'UPDATE',
      entityType: 'Room',
      entityId: String(updated.id),
      oldData: existing,
      newData: updated,
    });

    return updated;
  }

  async findFacilities(roomId: number) {
    const room = await this.prisma.room.findUnique({ where: { id: roomId } });
    if (!room) throw new NotFoundException('Kamar tidak ditemukan');

    return this.prisma.roomFacility.findMany({
      where: { roomId },
      orderBy: { id: 'asc' },
    });
  }

  async createFacility(roomId: number, dto: CreateRoomFacilityDto, actor: CurrentUserPayload) {
    const room = await this.prisma.room.findUnique({ where: { id: roomId } });
    if (!room) throw new NotFoundException('Kamar tidak ditemukan');

    const name = dto.name?.trim();
    if (!name) throw new ConflictException('Nama fasilitas wajib diisi.');

    const quantity = dto.quantity ?? 1;
    if (quantity < 1) throw new ConflictException('Jumlah fasilitas minimal 1.');

    const facility = await this.prisma.roomFacility.create({
      data: {
        roomId,
        name,
        quantity,
        category: dto.category?.trim() || null,
        publicVisible: dto.publicVisible ?? true,
        condition: dto.condition?.trim() || null,
        note: dto.note?.trim() || null,
      },
    });

    await this.audit.log({
      actorUserId: actor.id,
      action: 'CREATE',
      entityType: 'RoomFacility',
      entityId: String(facility.id),
      newData: facility,
    });

    return facility;
  }

  async updateFacility(roomId: number, facilityId: number, dto: UpdateRoomFacilityDto, actor: CurrentUserPayload) {
    const room = await this.prisma.room.findUnique({ where: { id: roomId } });
    if (!room) throw new NotFoundException('Kamar tidak ditemukan');

    const existing = await this.prisma.roomFacility.findUnique({ where: { id: facilityId } });
    if (!existing || existing.roomId !== roomId) throw new NotFoundException('Fasilitas kamar tidak ditemukan.');

    if (dto.name !== undefined) {
      const name = dto.name?.trim();
      if (!name) throw new ConflictException('Nama fasilitas wajib diisi.');
      dto.name = name;
    }
    if (dto.quantity !== undefined && dto.quantity < 1) {
      throw new ConflictException('Jumlah fasilitas minimal 1.');
    }

    const updateData: Prisma.RoomFacilityUpdateInput = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.quantity !== undefined) updateData.quantity = dto.quantity;
    if (dto.category !== undefined) updateData.category = dto.category?.trim() || null;
    if (dto.publicVisible !== undefined) updateData.publicVisible = dto.publicVisible;
    if (dto.condition !== undefined) updateData.condition = dto.condition?.trim() || null;
    if (dto.note !== undefined) updateData.note = dto.note?.trim() || null;

    const updated = await this.prisma.roomFacility.update({
      where: { id: facilityId },
      data: updateData,
    });

    await this.audit.log({
      actorUserId: actor.id,
      action: 'UPDATE',
      entityType: 'RoomFacility',
      entityId: String(updated.id),
      oldData: existing,
      newData: updated,
    });

    return updated;
  }

  async deleteFacility(roomId: number, facilityId: number, actor: CurrentUserPayload) {
    const room = await this.prisma.room.findUnique({ where: { id: roomId } });
    if (!room) throw new NotFoundException('Kamar tidak ditemukan');

    const existing = await this.prisma.roomFacility.findUnique({ where: { id: facilityId } });
    if (!existing || existing.roomId !== roomId) throw new NotFoundException('Fasilitas kamar tidak ditemukan.');

    await this.prisma.roomFacility.delete({ where: { id: facilityId } });

    await this.audit.log({
      actorUserId: actor.id,
      action: 'DELETE',
      entityType: 'RoomFacility',
      entityId: String(facilityId),
      oldData: existing,
    });
  }

  private getAvailablePricingTerms(room: {
    dailyRateRupiah: number | null;
    weeklyRateRupiah: number | null;
    biWeeklyRateRupiah: number | null;
    monthlyRateRupiah: number | null;
  }) {
    const terms: string[] = [];
    if (room.dailyRateRupiah && room.dailyRateRupiah > 0) terms.push('DAILY');
    if (room.weeklyRateRupiah && room.weeklyRateRupiah > 0) terms.push('WEEKLY');
    if (room.biWeeklyRateRupiah && room.biWeeklyRateRupiah > 0) terms.push('BIWEEKLY');
    if (room.monthlyRateRupiah && room.monthlyRateRupiah > 0) terms.push('MONTHLY');
    return terms;
  }

  private resolveRent(
    room: {
      dailyRateRupiah: number | null;
      weeklyRateRupiah: number | null;
      biWeeklyRateRupiah: number | null;
      monthlyRateRupiah: number | null;
    },
    pricingTerm: string,
  ) {
    switch (pricingTerm) {
      case 'DAILY':
        return room.dailyRateRupiah ?? room.monthlyRateRupiah ?? 0;
      case 'WEEKLY':
        return room.weeklyRateRupiah ?? room.monthlyRateRupiah ?? 0;
      case 'BIWEEKLY':
        return room.biWeeklyRateRupiah ?? room.monthlyRateRupiah ?? 0;
      case 'MONTHLY':
      default:
        return room.monthlyRateRupiah ?? 0;
    }
  }

  private buildMeterSummary(readings: Array<{ id: number; readingAt: Date; readingValue: Prisma.Decimal }>) {
    const latest = readings[0] ?? null;
    const previous = readings[1] ?? null;

    return {
      latestReading: latest,
      previousReading: previous,
      usageSincePrevious:
        latest && previous ? Number(latest.readingValue.toString()) - Number(previous.readingValue.toString()) : null,
    };
  }
}
