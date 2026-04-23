import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { AuditLogService } from '../../audit-log/audit-log.service';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import { RoomStatus } from '../../common/enums/app.enums';
import { buildMeta, buildPagination } from '../../common/utils/pagination';
import { serializePrismaResult } from '../../common/utils/serialization';
import { PrismaService } from '../../prisma/prisma.service';
import { CancelStayDto, CompleteStayDto, CreateStayDto, ProcessDepositDto, RenewStayDto, UpdateStayDto } from './dto/stay.dto';
import { StaysQueryDto } from './dto/stays-query.dto';
import { Prisma } from 'src/generated/prisma';

@Injectable()
export class StaysService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditLogService) {}

  async findAll(query: StaysQueryDto) {
    const { page, limit, skip, take } = buildPagination(query.page, query.limit);
    const where: any = {
      AND: [
        query.tenantId ? { tenantId: Number(query.tenantId) } : {},
        query.roomId ? { roomId: Number(query.roomId) } : {},
        query.status ? { status: query.status } : {},
        query.bookingSource ? { bookingSource: query.bookingSource as any } : {},
        query.checkInDateFrom || query.checkInDateTo
          ? {
              checkInDate: {
                gte: query.checkInDateFrom ? new Date(query.checkInDateFrom) : undefined,
                lte: query.checkInDateTo ? new Date(query.checkInDateTo) : undefined,
              },
            }
          : {},
        query.depositStatus ? { depositStatus: query.depositStatus } : {},
      ],
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
                where: { status: { in: ['ISSUED', 'PARTIAL'] as any } },
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
      this.normalizeStayForResponse({
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
      where: { tenantId: user.tenantId ?? -1, status: 'ACTIVE' as any },
      include: { room: true },
    });

    if (!stay) throw new NotFoundException('Stay aktif tidak ditemukan');
    return this.normalizeStayForResponse(stay);
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
              where: { status: { in: ['ISSUED', 'PARTIAL'] as any } },
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
      this.normalizeStayForResponse({
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
        where: { roomId: stay.roomId, utilityType: 'ELECTRICITY' as any },
        orderBy: { readingAt: 'desc' },
        take: 2,
      }),
      this.prisma.meterReading.findMany({
        where: { roomId: stay.roomId, utilityType: 'WATER' as any },
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
        unit: this.mapPricingTermToUnit(stay.pricingTerm),
        unitPriceRupiah: stay.agreedRentAmountRupiah,
        lineAmountRupiah: stay.agreedRentAmountRupiah,
        sortOrder: 0,
        source: 'STAY_RENT',
      },
    ];

    const electricitySuggestion = this.buildUtilitySuggestion({
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

    const waterSuggestion = this.buildUtilitySuggestion({
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

  async update(id: number, dto: UpdateStayDto, actor: CurrentUserPayload) {
    const existing = await this.prisma.stay.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Stay tidak ditemukan');
    if (existing.status !== 'ACTIVE') {
      throw new ConflictException('Stay tidak aktif, tidak bisa diperbarui');
    }

    const nextPlannedCheckOutDate = dto.plannedCheckOutDate ? new Date(dto.plannedCheckOutDate) : existing.plannedCheckOutDate;
    if (nextPlannedCheckOutDate && nextPlannedCheckOutDate < existing.checkInDate) {
      throw new ConflictException('Tanggal rencana checkout tidak boleh sebelum check-in');
    }

    const updated = await this.prisma.stay.update({
      where: { id },
      data: {
        notes: dto.notes ?? existing.notes,
        bookingSourceDetail: dto.bookingSourceDetail ?? existing.bookingSourceDetail,
        plannedCheckOutDate: dto.plannedCheckOutDate ? new Date(dto.plannedCheckOutDate) : undefined,
      },
    });

    await this.audit.log({ actorUserId: actor.id, action: 'UPDATE', entityType: 'Stay', entityId: String(updated.id), oldData: existing, newData: updated });
    return updated;
  }

  async create(dto: CreateStayDto, actor: CurrentUserPayload) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: dto.tenantId } });
    if (!tenant) throw new NotFoundException('Tenant tidak ditemukan');

    const room = await this.prisma.room.findUnique({ where: { id: dto.roomId } });
    if (!room) throw new NotFoundException('Kamar tidak ditemukan');

    const existingTenantStay = await this.prisma.stay.findFirst({
      where: { tenantId: dto.tenantId, status: 'ACTIVE' as any },
    });
    if (existingTenantStay) {
      throw new ConflictException('Tenant masih memiliki stay aktif');
    }

    if (room.status === RoomStatus.OCCUPIED as any || room.status === RoomStatus.RESERVED as any) {
      throw new ConflictException('Kamar sudah ditempati stay aktif lain atau sedang dipesan');
    }

    const existingRoomStay = await this.prisma.stay.findFirst({
      where: { roomId: dto.roomId, status: 'ACTIVE' as any },
    });
    if (existingRoomStay) {
      throw new ConflictException('Kamar sudah ditempati stay aktif lain');
    }

    if (dto.plannedCheckOutDate && new Date(dto.plannedCheckOutDate) < new Date(dto.checkInDate)) {
      throw new ConflictException('Tanggal tidak konsisten');
    }

    const agreed = dto.agreedRentAmountRupiah || this.resolveRent(room, dto.pricingTerm);
    const deposit = dto.depositAmountRupiah ?? room.defaultDepositRupiah;
    const electricity = dto.electricityTariffPerKwhRupiah ?? room.electricityTariffPerKwhRupiah;
    const water = dto.waterTariffPerM3Rupiah ?? room.waterTariffPerM3Rupiah;

    const initialElectricity = new Prisma.Decimal(dto.initialElectricityKwh);
    const initialWater = new Prisma.Decimal(dto.initialWaterM3);
    if (initialElectricity.lt(0) || initialWater.lt(0)) {
      throw new BadRequestException('Nilai meter tidak boleh negatif');
    }

    try {
      const created = await this.prisma.$transaction(async (tx) => {
        const stay = await tx.stay.create({
          data: {
            tenantId: dto.tenantId,
            roomId: dto.roomId,
            status: 'ACTIVE' as any,
            pricingTerm: dto.pricingTerm as any,
            agreedRentAmountRupiah: agreed,
            checkInDate: new Date(dto.checkInDate),
            plannedCheckOutDate: dto.plannedCheckOutDate ? new Date(dto.plannedCheckOutDate) : undefined,
            depositAmountRupiah: deposit,
            electricityTariffPerKwhRupiah: electricity,
            waterTariffPerM3Rupiah: water,
            bookingSource: dto.bookingSource as any,
            bookingSourceDetail: dto.bookingSourceDetail,
            stayPurpose: dto.stayPurpose as any,
            notes: dto.notes,
            createdById: actor.id,
          },
        });

        await tx.room.update({
          where: { id: dto.roomId },
          data: { status: 'OCCUPIED' as any },
        });

        const invoiceNumber = `INV-${stay.id}-${Date.now().toString().slice(-6)}`;
        const checkInDate = new Date(dto.checkInDate);
        const plannedCheckOutDate = dto.plannedCheckOutDate ? new Date(dto.plannedCheckOutDate) : undefined;
        const periodEnd = this.calculatePeriodEnd(checkInDate, dto.pricingTerm, plannedCheckOutDate);
        const dueDate = this.calculateDueDate(periodEnd);

        const invoice = await tx.invoice.create({
          data: {
            invoiceNumber,
            stayId: stay.id,
            status: 'DRAFT' as any,
            periodStart: checkInDate,
            periodEnd,
            dueDate,
            createdById: actor.id,
          },
        });

        const unit = this.mapPricingTermToUnit(dto.pricingTerm);
        await tx.invoiceLine.create({
          data: {
            invoiceId: invoice.id,
            lineType: 'RENT' as any,
            description: `Sewa kamar ${room.code} - ${dto.pricingTerm}`,
            qty: 1,
            unit,
            unitPriceRupiah: agreed,
            lineAmountRupiah: agreed,
            sortOrder: 0,
          },
        });

        const baselineDate = new Date(dto.checkInDate);
        baselineDate.setHours(0, 0, 0, 0);

        const existingElectricityReading = await tx.meterReading.findFirst({
          where: {
            roomId: dto.roomId,
            utilityType: 'ELECTRICITY',
            readingAt: baselineDate,
          },
        });
        if (existingElectricityReading) {
          throw new BadRequestException(
            `Meter awal listrik pada tanggal check-in ${baselineDate.toLocaleDateString('id-ID')} sudah pernah tercatat untuk kamar ini.`,
          );
        }

        const existingWaterReading = await tx.meterReading.findFirst({
          where: {
            roomId: dto.roomId,
            utilityType: 'WATER',
            readingAt: baselineDate,
          },
        });
        if (existingWaterReading) {
          throw new BadRequestException(
            `Meter awal air pada tanggal check-in ${baselineDate.toLocaleDateString('id-ID')} sudah pernah tercatat untuk kamar ini.`,
          );
        }

        await tx.meterReading.create({
          data: {
            roomId: dto.roomId,
            utilityType: 'ELECTRICITY',
            readingAt: baselineDate,
            readingValue: initialElectricity,
            recordedById: actor.id,
            note: 'Meter awal saat check-in',
          },
        });

        await tx.meterReading.create({
          data: {
            roomId: dto.roomId,
            utilityType: 'WATER',
            readingAt: baselineDate,
            readingValue: initialWater,
            recordedById: actor.id,
            note: 'Meter awal saat check-in',
          },
        });

        return { stay, invoice };
      });

      await this.audit.log({ actorUserId: actor.id, action: 'CREATE', entityType: 'Stay', entityId: String(created.stay.id), newData: created.stay });
      await this.audit.log({ actorUserId: actor.id, action: 'CREATE', entityType: 'Invoice', entityId: String(created.invoice.id), newData: created.invoice });
      return created;
    } catch (error: any) {
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException('Pembacaan meter untuk tanggal tersebut sudah ada');
        }
        throw new ConflictException(`Constraint database gagal: ${error.message}`);
      }

      if (error?.message?.includes('monotonic') || error?.message?.includes('tidak boleh lebih rendah')) {
        throw new ConflictException('Pembacaan meter tidak boleh lebih rendah dari sebelumnya');
      }

      throw error;
    }
  }

  async complete(id: number, dto: CompleteStayDto, actor: CurrentUserPayload) {
    const existing = await this.prisma.stay.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Stay tidak ditemukan');
    if (existing.status !== 'ACTIVE') throw new ConflictException('Stay bukan status ACTIVE');

    const updated = await this.prisma.$transaction(async (tx) => {
      const stay = await tx.stay.update({
        where: { id },
        data: {
          status: 'COMPLETED' as any,
          actualCheckOutDate: new Date(dto.actualCheckOutDate),
          checkoutReason: dto.checkoutReason,
          notes: dto.notes ?? existing.notes,
        },
      });

      const otherActive = await tx.stay.count({ where: { roomId: existing.roomId, status: 'ACTIVE' as any, id: { not: id } } });
      if (otherActive === 0) {
        await tx.room.update({ where: { id: existing.roomId }, data: { status: 'AVAILABLE' as any } });
      }

      return stay;
    });

    await this.audit.log({ actorUserId: actor.id, action: 'COMPLETE', entityType: 'Stay', entityId: String(updated.id), oldData: existing, newData: updated });
    return this.normalizeStayForResponse({ ...updated, roomStatusAfterSync: 'AVAILABLE' });
  }

  async cancel(id: number, dto: CancelStayDto, actor: CurrentUserPayload) {
    const existing = await this.prisma.stay.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Stay tidak ditemukan');
    if (existing.status !== 'ACTIVE') throw new ConflictException('Stay bukan status ACTIVE');

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw(Prisma.sql`
        UPDATE "Stay"
        SET
          status = CAST(${'CANCELLED'} AS "StayStatus"),
          "cancelReason" = ${dto.cancelReason},
          notes = ${dto.notes ?? existing.notes},
          "updatedAt" = NOW()
        WHERE id = ${id}
      `);

      const stay = await tx.stay.findUnique({ where: { id } });
      if (!stay) {
        throw new NotFoundException('Stay tidak ditemukan setelah pembatalan');
      }

      const otherActive = await tx.stay.count({ where: { roomId: existing.roomId, status: 'ACTIVE' as any, id: { not: id } } });
      if (otherActive === 0) {
        await tx.room.update({ where: { id: existing.roomId }, data: { status: 'AVAILABLE' as any } });
      }

      return {
        ...stay,
        cancelReason: dto.cancelReason,
      };
    });

    await this.audit.log({ actorUserId: actor.id, action: 'CANCEL', entityType: 'Stay', entityId: String(updated.id), oldData: existing, newData: updated });
    return this.normalizeStayForResponse({ ...updated, roomStatusAfterSync: 'AVAILABLE' });
  }

  async processDeposit(id: number, dto: ProcessDepositDto, actor: CurrentUserPayload) {
    const stay = await this.prisma.stay.findUnique({ where: { id } });
    if (!stay) throw new NotFoundException('Stay tidak ditemukan');
    if (!['COMPLETED', 'CANCELLED'].includes(stay.status)) throw new ConflictException('Deposit belum boleh diproses');
    if (stay.depositStatus !== 'HELD') throw new ConflictException('Deposit sudah diproses sebelumnya');

    const openInvoices = await this.prisma.invoice.count({ where: { stayId: id, status: { in: ['ISSUED', 'PARTIAL'] as any } } });
    if (openInvoices > 0) throw new ConflictException('Deposit tidak dapat diproses karena masih ada tagihan terbuka');

    let depositStatus: any = stay.depositStatus;
    let deduction = dto.depositDeductionRupiah ?? 0;
    let refunded = dto.depositRefundedRupiah ?? 0;

    if (dto.action === 'FULL_REFUND') {
      deduction = 0;
      refunded = stay.depositAmountRupiah;
      depositStatus = 'REFUNDED';
    } else if (dto.action === 'FORFEIT') {
      deduction = stay.depositAmountRupiah;
      refunded = 0;
      depositStatus = 'FORFEITED';
    } else {
      depositStatus = 'PARTIALLY_REFUNDED';
    }

    if (deduction + refunded > stay.depositAmountRupiah) {
      throw new ConflictException('Nilai deposit tidak konsisten');
    }

    const updated = await this.prisma.stay.update({
      where: { id },
      data: {
        depositStatus,
        depositDeductionRupiah: deduction,
        depositRefundedRupiah: refunded,
        depositRefundedAt: refunded > 0 ? new Date() : null,
        depositNote: dto.depositNote,
      },
    });

    await this.audit.log({ actorUserId: actor.id, action: 'PROCESS_DEPOSIT', entityType: 'Stay', entityId: String(updated.id), oldData: stay, newData: updated });
    return updated;
  }

  async renewStay(id: number, dto: RenewStayDto, actor: CurrentUserPayload) {
    const stay = await this.prisma.stay.findUnique({ where: { id } });
    if (!stay) throw new NotFoundException('Stay tidak ditemukan');
    if (stay.status !== 'ACTIVE') throw new ConflictException('Stay tidak aktif, tidak dapat diperpanjang');

    const today = this.startOfDay(new Date());
    const currentPlannedCheckOut = stay.plannedCheckOutDate ? this.startOfDay(stay.plannedCheckOutDate) : null;
    const logicalPeriodStart = currentPlannedCheckOut ? this.maxDate(this.addDays(currentPlannedCheckOut, 1), today) : today;

    const newPlannedCheckOut = dto.plannedCheckOutDate
      ? this.startOfDay(new Date(dto.plannedCheckOutDate))
      : this.calculatePeriodEnd(logicalPeriodStart, stay.pricingTerm);

    if (Number.isNaN(newPlannedCheckOut.getTime())) {
      throw new BadRequestException('Tanggal perpanjangan tidak valid');
    }

    if (newPlannedCheckOut <= logicalPeriodStart) {
      throw new ConflictException('Tanggal perpanjangan harus setelah awal periode renewal yang baru');
    }

    const rentAmount = dto.agreedRentAmountRupiah ?? stay.agreedRentAmountRupiah;

    try {
      const result = await this.prisma.$transaction(async (tx) => {
        const updatedStay = await tx.stay.update({
          where: { id },
          data: { plannedCheckOutDate: newPlannedCheckOut },
        });

        const invoiceNumber = `INV-${stay.id}-R-${Date.now().toString().slice(-6)}`;
        const periodStart = logicalPeriodStart;
        const periodEnd = newPlannedCheckOut;
        const dueDate = this.calculateDueDate(periodEnd);

        const invoice = await tx.invoice.create({
          data: {
            invoiceNumber,
            stayId: stay.id,
            status: 'DRAFT' as any,
            periodStart,
            periodEnd,
            dueDate,
            createdById: actor.id,
          },
        });

        const unit = this.mapPricingTermToUnit(stay.pricingTerm);
        await tx.invoiceLine.create({
          data: {
            invoiceId: invoice.id,
            lineType: 'RENT' as any,
            description: `Perpanjangan ${stay.pricingTerm}`,
            qty: 1,
            unit,
            unitPriceRupiah: rentAmount,
            lineAmountRupiah: rentAmount,
            sortOrder: 0,
          },
        });

        return { stay: updatedStay, invoice };
      });

      await this.audit.log({
        actorUserId: actor.id,
        action: 'RENEW',
        entityType: 'Stay',
        entityId: String(result.stay.id),
        oldData: stay,
        newData: result.stay,
      });
      await this.audit.log({
        actorUserId: actor.id,
        action: 'CREATE',
        entityType: 'Invoice',
        entityId: String(result.invoice.id),
        newData: result.invoice,
      });

      return result;
    } catch (error: any) {
      if (error instanceof PrismaClientKnownRequestError) {
        throw new ConflictException(`Constraint database gagal: ${error.message}`);
      }
      throw error;
    }
  }


  private normalizeStayForResponse<T extends Record<string, any>>(stay: T): T & { cancelReason: string | null } {
    return {
      ...stay,
      cancelReason:
        stay.status === 'CANCELLED'
          ? ((stay as any).cancelReason ?? (stay as any).checkoutReason ?? null)
          : ((stay as any).cancelReason ?? null),
    };
  }

  private buildUtilitySuggestion(input: {
    lineType: 'ELECTRICITY' | 'WATER';
    description: string;
    unit: string;
    unitPriceRupiah: number;
    latestReadings: Array<{ readingValue: Prisma.Decimal; readingAt: Date }>;
    source: string;
    sortOrder: number;
  }) {
    if (input.unitPriceRupiah <= 0 || input.latestReadings.length < 2) {
      return null;
    }

    const [latest, previous] = input.latestReadings;
    const usage = latest.readingValue.minus(previous.readingValue);
    if (usage.lte(0)) {
      return null;
    }

    const usageNumber = usage.toNumber();
    const lineAmountRupiah = Math.round(usageNumber * input.unitPriceRupiah);

    return {
      lineType: input.lineType,
      utilityType: input.lineType,
      description: input.description,
      qty: usage.toFixed(3),
      unit: input.unit,
      unitPriceRupiah: input.unitPriceRupiah,
      lineAmountRupiah,
      sortOrder: input.sortOrder,
      source: input.source,
      meterPeriod: {
        previousReadingAt: previous.readingAt,
        latestReadingAt: latest.readingAt,
      },
    };
  }

  private startOfDay(value: Date) {
    const result = new Date(value);
    result.setHours(0, 0, 0, 0);
    return result;
  }

  private addDays(value: Date, days: number) {
    const result = new Date(value);
    result.setDate(result.getDate() + days);
    return result;
  }

  private maxDate(a: Date, b: Date) {
    return a.getTime() >= b.getTime() ? a : b;
  }

  private resolveRent(room: any, pricingTerm: string) {
    if (pricingTerm === 'DAILY') return room.dailyRateRupiah ?? 0;
    if (pricingTerm === 'WEEKLY') return room.weeklyRateRupiah ?? 0;
    if (pricingTerm === 'BIWEEKLY') return room.biWeeklyRateRupiah ?? 0;
    return room.monthlyRateRupiah;
  }

  private mapPricingTermToUnit(pricingTerm: string): string {
    switch (pricingTerm) {
      case 'DAILY':
        return 'hari';
      case 'WEEKLY':
        return 'minggu';
      case 'BIWEEKLY':
        return '2 minggu';
      case 'MONTHLY':
        return 'bulan';
      case 'SMESTERLY':
        return 'semester';
      case 'YEARLY':
        return 'tahun';
      default:
        return 'bulan';
    }
  }

  private calculatePeriodEnd(checkInDate: Date, pricingTerm: string, plannedCheckOutDate?: Date): Date {
    if (plannedCheckOutDate) {
      return plannedCheckOutDate;
    }

    const result = new Date(checkInDate);

    switch (pricingTerm) {
      case 'DAILY':
        result.setDate(result.getDate() + 1);
        break;
      case 'WEEKLY':
        result.setDate(result.getDate() + 7);
        break;
      case 'BIWEEKLY':
        result.setDate(result.getDate() + 14);
        break;
      case 'MONTHLY':
        result.setMonth(result.getMonth() + 1);
        break;
      case 'SMESTERLY':
        result.setMonth(result.getMonth() + 6);
        break;
      case 'YEARLY':
        result.setFullYear(result.getFullYear() + 1);
        break;
      default:
        result.setMonth(result.getMonth() + 1);
    }

    return result;
  }

  private calculateDueDate(periodEnd: Date): Date {
    const dueDate = new Date(periodEnd);
    dueDate.setDate(dueDate.getDate() + 3);
    return dueDate;
  }
}
