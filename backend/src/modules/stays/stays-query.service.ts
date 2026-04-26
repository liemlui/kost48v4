import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from 'src/generated/prisma';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import { RoomStatus, StayStatus, InvoiceStatus, UtilityType } from '../../common/enums/app.enums';
import { buildMeta, buildPagination } from '../../common/utils/pagination';
import { serializePrismaResult } from '../../common/utils/serialization';
import { PrismaService } from '../../prisma/prisma.service';
import { StaysQueryDto } from './dto/stays-query.dto';
import { buildUtilitySuggestion, mapPricingTermToUnit, normalizeStayForResponse } from './stays.helpers';

@Injectable()
export class StaysQueryService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: StaysQueryDto) {
    const { page, limit, skip, take } = buildPagination(query.page, query.limit);
    const where: Prisma.StayWhereInput = {
      AND: [
        query.tenantId ? { tenantId: Number(query.tenantId) } : undefined,
        query.roomId ? { roomId: Number(query.roomId) } : undefined,
        query.status ? { status: query.status } : undefined,
        query.bookingSource ? { bookingSource: query.bookingSource } : undefined,
        query.checkInDateFrom || query.checkInDateTo
          ? {
              checkInDate: {
                gte: query.checkInDateFrom ? new Date(query.checkInDateFrom) : undefined,
                lte: query.checkInDateTo ? new Date(query.checkInDateTo) : undefined,
              },
            }
          : undefined,
        query.depositStatus ? { depositStatus: query.depositStatus } : undefined,
      ].filter(Boolean),
    };

    const [items, totalItems] = await this.prisma.$transaction([
      this.prisma.stay.findMany({
        where,
        skip,
        take,
        include: {
          tenant: true,
          room: true,
          _count: {
            select: {
              invoices: {
                where: { status: { in: [InvoiceStatus.ISSUED, InvoiceStatus.PARTIAL] } },
              },
            },
          },
          invoices: {
            orderBy: { id: 'desc' },
            take: 1,
            select: {
              id: true,
              invoiceNumber: true,
              status: true,
            },
          },
        },
        orderBy: { id: 'desc' },
      }),
      this.prisma.stay.count({ where }),
    ]);

    const itemsWithOpenInvoiceCount = items.map((stay) =>
      normalizeStayForResponse({
        ...stay,
        openInvoiceCount: stay._count?.invoices ?? 0,
        invoiceCount: stay._count?.invoices ?? 0,
        latestInvoiceId: stay.invoices[0]?.id ?? null,
        latestInvoiceNumber: stay.invoices[0]?.invoiceNumber ?? null,
        latestInvoiceStatus: stay.invoices[0]?.status ?? null,
      }),
    );

    return { items: serializePrismaResult(itemsWithOpenInvoiceCount), meta: buildMeta(page, limit, totalItems) };
  }

  async findCurrentForTenant(user: CurrentUserPayload) {
    const stay = await this.prisma.stay.findFirst({
      where: { tenantId: user.tenantId ?? -1, status: StayStatus.ACTIVE },
      include: { room: true },
    });

    if (!stay) throw new NotFoundException('Stay aktif tidak ditemukan');
    return normalizeStayForResponse(stay);
  }

  async findOne(id: number, user: CurrentUserPayload) {
    const stay = await this.prisma.stay.findUnique({
      where: { id },
      include: {
        tenant: true,
        room: true,
        _count: {
          select: {
            invoices: {
              where: { status: { in: [InvoiceStatus.ISSUED, InvoiceStatus.PARTIAL] } },
            },
          },
        },
        invoices: {
          orderBy: { id: 'desc' },
          take: 1,
          select: {
            id: true,
            invoiceNumber: true,
            status: true,
          },
        },
      },
    });

    if (!stay) throw new NotFoundException('Stay tidak ditemukan');
    if (user.role === 'TENANT' && user.tenantId !== stay.tenantId) throw new NotFoundException('Stay tidak ditemukan');

    return serializePrismaResult(
      normalizeStayForResponse({
        ...stay,
        openInvoiceCount: stay._count?.invoices ?? 0,
        invoiceCount: stay._count?.invoices ?? 0,
        latestInvoiceId: stay.invoices[0]?.id ?? null,
        latestInvoiceNumber: stay.invoices[0]?.invoiceNumber ?? null,
        latestInvoiceStatus: stay.invoices[0]?.status ?? null,
      }),
    );
  }

  async getInvoiceSuggestion(id: number, user: CurrentUserPayload) {
    const stay = await this.prisma.stay.findUnique({
      where: { id },
      include: {
        room: true,
        tenant: true,
      },
    });

    if (!stay) {
      throw new NotFoundException('Stay tidak ditemukan');
    }

    if (user.role === 'TENANT' && user.tenantId !== stay.tenantId) {
      throw new NotFoundException('Stay tidak ditemukan');
    }

    const [latestElectricityReadings, latestWaterReadings] = await Promise.all([
      this.prisma.meterReading.findMany({
        where: { roomId: stay.roomId, utilityType: UtilityType.ELECTRICITY },
        orderBy: { readingAt: 'desc' },
        take: 2,
      }),
      this.prisma.meterReading.findMany({
        where: { roomId: stay.roomId, utilityType: UtilityType.WATER },
        orderBy: { readingAt: 'desc' },
        take: 2,
      }),
    ]);

    const suggestions: Array<Record<string, unknown>> = [
      {
        lineType: 'RENT',
        utilityType: null,
        description: `Sewa kamar ${stay.room.code}`,
        qty: '1.00',
        unit: mapPricingTermToUnit(stay.pricingTerm),
        unitPriceRupiah: stay.agreedRentAmountRupiah,
        lineAmountRupiah: stay.agreedRentAmountRupiah,
        sortOrder: 0,
        source: 'STAY_RENT',
      },
    ];

    const electricitySuggestion = buildUtilitySuggestion({
      lineType: 'ELECTRICITY',
      description: `Tagihan listrik kamar ${stay.room.code}`,
      unit: 'kWh',
      unitPriceRupiah: stay.electricityTariffPerKwhRupiah,
      latestReadings: latestElectricityReadings,
      source: 'METER_READING',
      sortOrder: 10,
    });
    if (electricitySuggestion) {
      suggestions.push(electricitySuggestion);
    }

    const waterSuggestion = buildUtilitySuggestion({
      lineType: 'WATER',
      description: `Tagihan air kamar ${stay.room.code}`,
      unit: 'm3',
      unitPriceRupiah: stay.waterTariffPerM3Rupiah,
      latestReadings: latestWaterReadings,
      source: 'METER_READING',
      sortOrder: 20,
    });
    if (waterSuggestion) {
      suggestions.push(waterSuggestion);
    }

    return serializePrismaResult(suggestions);
  }
}
