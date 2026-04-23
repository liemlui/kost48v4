import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditLogService } from '../../audit-log/audit-log.service';
import { buildMeta, buildPagination } from '../../common/utils/pagination';
import { PrismaService } from '../../prisma/prisma.service';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import { CreateRoomDto, UpdateRoomDto } from './dto/room.dto';
import { RoomsQueryDto } from './dto/rooms-query.dto';

@Injectable()
export class RoomsService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditLogService) {}

  async findAll(query: RoomsQueryDto) {
    const { page, limit, skip, take } = buildPagination(query.page, query.limit);
    const where: any = {
      AND: [
        query.search
          ? {
              OR: [
                { code: { contains: query.search, mode: 'insensitive' } },
                { name: { contains: query.search, mode: 'insensitive' } },
              ],
            }
          : {},
        query.status ? { status: query.status } : {},
        typeof query.isActive === 'string' ? { isActive: query.isActive === 'true' } : {},
        query.floor ? { floor: query.floor } : {},
      ],
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
              where: { status: { in: ['ISSUED', 'PARTIAL'] as any } },
              select: { id: true },
            },
          },
        },
      },
    });

    if (!item) throw new NotFoundException('Kamar tidak ditemukan');

    const [latestElectricityReadings, latestWaterReadings] = await Promise.all([
      this.prisma.meterReading.findMany({
        where: { roomId: id, utilityType: 'ELECTRICITY' as any },
        orderBy: { readingAt: 'desc' },
        take: 2,
      }),
      this.prisma.meterReading.findMany({
        where: { roomId: id, utilityType: 'WATER' as any },
        orderBy: { readingAt: 'desc' },
        take: 2,
      }),
    ]);

    const activeStay = item.stays[0] ?? null;

    return {
      ...item,
      images: (item as any).images ?? [],
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

    const pricingTerms = this.getAvailablePricingTerms(room as any);

    return {
      id: room.id,
      code: room.code,
      name: room.name,
      floor: room.floor,
      status: room.status,
      isAvailable: room.status === 'AVAILABLE',
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
      availablePricingTerms: pricingTerms,
      highlightedPricingTerm: pricingTerms[0] ?? 'MONTHLY',
      highlightedRateRupiah: this.resolveRent(room as any, (pricingTerms[0] ?? 'MONTHLY') as any),
    };
  }

  async create(dto: CreateRoomDto, actor: CurrentUserPayload) {
    const exists = await this.prisma.room.findUnique({ where: { code: dto.code } });
    if (exists) throw new ConflictException('Kode kamar sudah digunakan');

    const createData = {
      ...dto,
      status: 'AVAILABLE',
    };

    const created = await this.prisma.room.create({ data: createData as any });
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

    const updated = await this.prisma.room.update({
      where: { id },
      data: dto as any,
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



  private getAvailablePricingTerms(room: any) {
    const terms: string[] = [];
    if (room.dailyRateRupiah && room.dailyRateRupiah > 0) terms.push('DAILY');
    if (room.weeklyRateRupiah && room.weeklyRateRupiah > 0) terms.push('WEEKLY');
    if (room.biWeeklyRateRupiah && room.biWeeklyRateRupiah > 0) terms.push('BIWEEKLY');
    if (room.monthlyRateRupiah && room.monthlyRateRupiah > 0) terms.push('MONTHLY');
    return terms;
  }

  private resolveRent(room: any, pricingTerm: string) {
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

  private buildMeterSummary(readings: Array<{ id: number; readingAt: Date; readingValue: any }>) {
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
