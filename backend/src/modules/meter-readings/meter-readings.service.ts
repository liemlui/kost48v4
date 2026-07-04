import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma';
import { PrismaService } from '../../prisma/prisma.service';
import { buildMeta, buildPagination } from '../../common/utils/pagination';
import { CreateMeterReadingDto, UpdateMeterReadingDto } from './dto/meter-reading.dto';
import { MeterReadingsQueryDto } from './dto/meter-readings-query.dto';
import { RecordMeterCycleDto } from './dto/record-meter-cycle.dto';
import { AuditLogService } from '../../audit-log/audit-log.service';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import { StayStatus, UserRole, UtilityType } from '../../common/enums/app.enums';
import { endOfDay, parseJakartaDateOnly } from '../../common/utils/date.util';
import { InvoicesService } from '../invoices/invoices.service';
import { SettingsService } from '../settings/settings.service';

@Injectable()
export class MeterReadingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditLogService,
    private readonly invoices: InvoicesService,
    private readonly settings: SettingsService,
  ) {}

  private parseReadingValue(value: string | Prisma.Decimal, label = 'meter') {
    try {
      const decimalValue = value instanceof Prisma.Decimal ? value : new Prisma.Decimal(value);
      if (decimalValue.lt(0)) {
        throw new BadRequestException(`Angka ${label} tidak boleh negatif`);
      }
      return decimalValue;
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException(`Angka ${label} tidak valid`);
    }
  }

  private async assertReadingIsChronological(params: {
    roomId: number;
    utilityType: UtilityType;
    readingAt: Date;
    readingValue: Prisma.Decimal;
    excludeId?: number;
  }) {
    if (Number.isNaN(params.readingAt.getTime())) {
      throw new BadRequestException('Tanggal catat meter tidak valid');
    }

    // V-07c: Tolak readingAt masa depan
    if (params.readingAt > endOfDay(new Date())) {
      throw new BadRequestException('Tanggal pembacaan meter tidak boleh di masa depan');
    }

    const duplicate = await this.prisma.meterReading.findFirst({
      where: {
        roomId: params.roomId,
        utilityType: params.utilityType,
        readingAt: { gte: params.readingAt, lte: endOfDay(params.readingAt) },
        ...(params.excludeId ? { id: { not: params.excludeId } } : {}),
      },
      select: { id: true },
    });
    if (duplicate) {
      throw new ConflictException('Catatan meter untuk tanggal ini sudah ada');
    }

    const previous = await this.prisma.meterReading.findFirst({
      where: {
        roomId: params.roomId,
        utilityType: params.utilityType,
        readingAt: { lt: params.readingAt },
        ...(params.excludeId ? { id: { not: params.excludeId } } : {}),
      },
      orderBy: { readingAt: 'desc' },
    });

    if (previous && params.readingValue.lt(previous.readingValue)) {
      throw new ConflictException(
        `Angka meter tidak boleh lebih kecil dari catatan sebelumnya (${previous.readingValue.toString()})`,
      );
    }

    const next = await this.prisma.meterReading.findFirst({
      where: {
        roomId: params.roomId,
        utilityType: params.utilityType,
        readingAt: { gt: params.readingAt },
        ...(params.excludeId ? { id: { not: params.excludeId } } : {}),
      },
      orderBy: { readingAt: 'asc' },
    });

    if (next && params.readingValue.gt(next.readingValue)) {
      throw new ConflictException(
        `Angka meter tidak boleh lebih besar dari catatan setelahnya (${next.readingValue.toString()})`,
      );
    }
  }

  async findAll(query: MeterReadingsQueryDto, actor?: CurrentUserPayload) {
    const { page, limit, skip, take } = buildPagination(query.page, query.limit);
    let tenantRoomId: number | undefined;

    if (actor?.role === UserRole.TENANT) {
      if (!actor.tenantId) {
        throw new ForbiddenException('Akun tenant belum terhubung ke data tenant');
      }
      const activeStay = await this.prisma.stay.findFirst({
        where: { tenantId: actor.tenantId, status: StayStatus.ACTIVE },
        select: { roomId: true },
      });
      if (!activeStay) {
        throw new NotFoundException('Stay aktif tidak ditemukan');
      }
      tenantRoomId = activeStay.roomId;
      if (query.roomId && Number(query.roomId) !== tenantRoomId) {
        throw new ForbiddenException('Tenant hanya dapat melihat meter kamar aktifnya');
      }
    }

    const where: Prisma.MeterReadingWhereInput = {
      AND: [
        tenantRoomId ? { roomId: tenantRoomId } : query.roomId ? { roomId: Number(query.roomId) } : undefined,
        query.utilityType ? { utilityType: query.utilityType } : undefined,
        query.from || query.to
          ? {
              readingAt: {
                gte: query.from ? parseJakartaDateOnly(query.from, 'Tanggal mulai tidak valid') : undefined,
                lte: query.to ? endOfDay(parseJakartaDateOnly(query.to, 'Tanggal akhir tidak valid')) : undefined,
              },
            }
          : undefined,
      ].filter(Boolean) as Prisma.MeterReadingWhereInput[],
    };
    const [items, totalItems] = await this.prisma.$transaction([
      this.prisma.meterReading.findMany({
        where,
        skip,
        take,
        orderBy: { readingAt: 'desc' },
        include: { room: true },
      }),
      this.prisma.meterReading.count({ where }),
    ]);
    return { items, meta: buildMeta(page, limit, totalItems) };
  }

  async findOne(id: number) {
    const item = await this.prisma.meterReading.findUnique({ where: { id }, include: { room: true } });
    if (!item) throw new NotFoundException('Meter reading tidak ditemukan');
    return item;
  }

  async create(dto: CreateMeterReadingDto, actor: CurrentUserPayload) {
    const roomId = Number(dto.roomId);
    const room = await this.prisma.room.findUnique({ where: { id: roomId } });
    if (!room) throw new NotFoundException('Kamar tidak ditemukan');

    const readingAt = parseJakartaDateOnly(dto.readingAt, 'Tanggal catat meter tidak valid');
    const readingValue = this.parseReadingValue(dto.readingValue, 'meter');
    const utilityType = dto.utilityType as UtilityType;

    await this.assertReadingIsChronological({ roomId, utilityType, readingAt, readingValue });

    try {
      const created = await this.prisma.meterReading.create({
        data: {
          room: { connect: { id: roomId } },
          utilityType,
          readingAt,
          readingValue,
          note: dto.note,
          recordedBy: { connect: { id: actor.id } },
        },
      });
      await this.audit.log({ actorUserId: actor.id, action: 'CREATE', entityType: 'MeterReading', entityId: String(created.id), newData: created });
      return created;
    } catch (error: any) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Catatan meter untuk tanggal ini sudah ada');
      }
      throw error;
    }
  }

  /**
   * M-2: catat satu siklus meter (listrik + air) untuk kamar berpenghuni, lalu
   * auto-generate invoice meter memakai jatah gratis + tarif dari OperationalSetting.
   * Hanya OWNER/ADMIN (penerbitan invoice = aksi finance). Air hanya bila toggle aktif.
   */
  async recordCycleAndInvoice(dto: RecordMeterCycleDto, actor: CurrentUserPayload) {
    const isTenant = actor.role === UserRole.TENANT;
    if (!isTenant && ![UserRole.OWNER, UserRole.ADMIN].includes(actor.role as UserRole)) {
      throw new ForbiddenException('Hanya owner/admin/penghuni yang boleh mencatat meter.');
    }

    // Tenant hanya boleh mencatat kamarnya sendiri → ambil stay aktif dari tenantId-nya
    // (abaikan roomId di body demi keamanan). Owner/admin pakai roomId yang dikirim.
    let stay: { id: number; roomId: number; tenantId: number };
    if (isTenant) {
      if (!actor.tenantId) throw new ForbiddenException('Akun penghuni tidak tertaut ke data tenant.');
      const own = await this.prisma.stay.findFirst({ where: { tenantId: actor.tenantId, status: 'ACTIVE' as any }, orderBy: { id: 'desc' } });
      if (!own) throw new BadRequestException('Tidak ada masa sewa aktif untuk dicatat.');
      stay = own;
    } else {
      if (dto.roomId == null) throw new BadRequestException('roomId wajib diisi.');
      const found = await this.prisma.stay.findFirst({ where: { roomId: Number(dto.roomId), status: 'ACTIVE' as any }, orderBy: { id: 'desc' } });
      if (!found) throw new BadRequestException('Kamar belum berpenghuni aktif — tagihan meter butuh penghuni.');
      stay = found;
    }
    const roomId = stay.roomId;
    const room = await this.prisma.room.findUnique({ where: { id: roomId } });
    if (!room) throw new NotFoundException('Kamar tidak ditemukan');

    // V-07c: Tolak readingAt sebelum check-in (initialMetersPromotedAt)
    const fullStay = await this.prisma.stay.findUnique({
      where: { id: stay.id },
      select: { initialMetersPromotedAt: true },
    });
    if (fullStay?.initialMetersPromotedAt) {
      const readingAtDate = parseJakartaDateOnly(dto.readingAt, 'Tanggal catat meter tidak valid');
      // Input meter bersifat date-only. Reading pada tanggal yang sama dengan
      // check-in valid walau initialMetersPromotedAt punya jam aktual.
      if (endOfDay(readingAtDate) < fullStay.initialMetersPromotedAt) {
        throw new BadRequestException('Tanggal pembacaan meter tidak boleh sebelum check-in');
      }
    }

    const setting = await this.settings.getOperational();
    const readingAt = parseJakartaDateOnly(dto.readingAt, 'Tanggal catat meter tidak valid');

    const elecValue = this.parseReadingValue(dto.electricityReadingValue, 'meter listrik');
    const prevElec = await this.prisma.meterReading.findFirst({ where: { roomId, utilityType: UtilityType.ELECTRICITY, readingAt: { lt: readingAt } }, orderBy: { readingAt: 'desc' } });
    await this.assertReadingIsChronological({ roomId, utilityType: UtilityType.ELECTRICITY, readingAt, readingValue: elecValue });

    const waterEnabled = Boolean(setting.waterMeteringEnabled) && dto.waterReadingValue != null && dto.waterReadingValue !== '';
    let waterValue: Prisma.Decimal | null = null;
    let prevWater: { readingAt: Date; readingValue: Prisma.Decimal } | null = null;
    if (waterEnabled) {
      waterValue = this.parseReadingValue(dto.waterReadingValue as string, 'meter air');
      prevWater = await this.prisma.meterReading.findFirst({ where: { roomId, utilityType: UtilityType.WATER, readingAt: { lt: readingAt } }, orderBy: { readingAt: 'desc' } });
      await this.assertReadingIsChronological({ roomId, utilityType: UtilityType.WATER, readingAt, readingValue: waterValue });
    }

    const lines: Array<{ lineType: string; utilityType: string; description: string; qty: string; unit: string; unitPriceRupiah: number; sortOrder: number }> = [];
    let elecUsage = 0; let elecChargeable = 0;
    if (prevElec) {
      elecUsage = elecValue.minus(prevElec.readingValue).toNumber();
      const free = Number(setting.freeElectricityKwhPerMonth ?? 0);
      elecChargeable = Math.max(0, elecUsage - free);
      const tariff = Number(room.electricityTariffPerKwhRupiah || setting.electricityTariffPerKwhRupiah || 0);
      if (elecChargeable > 0 && tariff > 0) {
        lines.push({ lineType: 'ELECTRICITY', utilityType: 'ELECTRICITY', description: `Listrik: ${elecUsage.toFixed(2)} kWh − ${free} kWh gratis = ${elecChargeable.toFixed(2)} kWh`, qty: elecChargeable.toFixed(3), unit: 'kWh', unitPriceRupiah: tariff, sortOrder: 0 });
      }
    }
    let waterUsage = 0; let waterChargeable = 0;
    if (waterEnabled && prevWater && waterValue) {
      waterUsage = waterValue.minus(prevWater.readingValue).toNumber();
      const freeW = Number(setting.freeWaterM3PerMonth ?? 0);
      waterChargeable = Math.max(0, waterUsage - freeW);
      const wtariff = Number(room.waterTariffPerM3Rupiah || setting.waterTariffPerM3Rupiah || 0);
      if (waterChargeable > 0 && wtariff > 0) {
        lines.push({ lineType: 'WATER', utilityType: 'WATER', description: `Air: ${waterUsage.toFixed(2)} m³ − ${freeW} m³ gratis = ${waterChargeable.toFixed(2)} m³`, qty: waterChargeable.toFixed(3), unit: 'm³', unitPriceRupiah: wtariff, sortOrder: 1 });
      }
    }

    const summary = { elecUsage, elecChargeable, waterUsage, waterChargeable };

    // Bungkus pembuatan meter + invoice dalam satu $transaction agar atomis:
    // jika invoice gagal (periode CLOSED, nomor duplikat, dll.) angka meter
    // tidak tersimpan — mencegah selisih meter yang salah di bulan berikutnya.
    const ym = `${readingAt.getUTCFullYear()}${String(readingAt.getUTCMonth() + 1).padStart(2, '0')}`;
    const periodStart = (prevElec?.readingAt ?? prevWater?.readingAt ?? readingAt);
    const due = new Date(readingAt); due.setUTCDate(due.getUTCDate() + 7);

    const txResult = await (this.prisma as any).$transaction(async (tx: any) => {
      const createdElecTx = await tx.meterReading.create({ data: { room: { connect: { id: roomId } }, utilityType: UtilityType.ELECTRICITY, readingAt, readingValue: elecValue, note: dto.note, recordedBy: { connect: { id: actor.id } } } });
      let createdWaterTx: typeof createdElecTx | null = null;
      if (waterEnabled && waterValue) {
        createdWaterTx = await tx.meterReading.create({ data: { room: { connect: { id: roomId } }, utilityType: UtilityType.WATER, readingAt, readingValue: waterValue, note: dto.note, recordedBy: { connect: { id: actor.id } } } });
      }

      let invoiceTx: any = null;
      if (lines.length) {
        const invoiceResult = await this.invoices.createWithLinesAndIssueTx(tx, {
          stayId: stay.id,
          invoiceNumber: `MTR-${ym}-${roomId}-${createdElecTx.id}`,
          periodStart: periodStart.toISOString().slice(0, 10),
          periodEnd: readingAt.toISOString().slice(0, 10),
          dueDate: due.toISOString().slice(0, 10),
          notes: `Tagihan meter (listrik${waterEnabled ? ' & air' : ''}) Kamar ${room.code}. Dibuat otomatis dari catatan meter${isTenant ? ' (mandiri penghuni)' : ''}.`,
          lines: lines as any,
        }, actor, { systemIssued: true });
        invoiceTx = invoiceResult.invoice;
      }

      return { electricity: createdElecTx, water: createdWaterTx, invoice: invoiceTx };
    });

    await this.audit.log({ actorUserId: actor.id, action: 'CREATE', entityType: 'MeterReading', entityId: String(txResult.electricity.id), newData: { electricity: txResult.electricity, water: txResult.water } });

    if (!lines.length) {
      return { readings: { electricity: txResult.electricity, water: txResult.water }, invoice: null, summary, message: prevElec ? 'Pemakaian dalam jatah gratis — tidak ada tagihan meter.' : 'Catatan meter pertama tersimpan (belum ada selisih untuk ditagih).' };
    }

    return { readings: { electricity: txResult.electricity, water: txResult.water }, invoice: txResult.invoice, summary };
  }

  async update(id: number, dto: UpdateMeterReadingDto, actor: CurrentUserPayload) {
    const existing = await this.prisma.meterReading.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Meter reading tidak ditemukan');

    const readingAt = dto.readingAt ? parseJakartaDateOnly(dto.readingAt, 'Tanggal catat meter tidak valid') : existing.readingAt;
    const readingValue = dto.readingValue ? this.parseReadingValue(dto.readingValue, 'meter') : existing.readingValue;

    await this.assertReadingIsChronological({
      roomId: existing.roomId,
      utilityType: existing.utilityType as UtilityType,
      readingAt,
      readingValue,
      excludeId: id,
    });

    try {
      const updated = await this.prisma.meterReading.update({
        where: { id },
        data: {
          readingAt: dto.readingAt ? readingAt : undefined,
          readingValue: dto.readingValue ? readingValue : undefined,
          note: dto.note ?? undefined,
          recordedBy: { connect: { id: actor.id } },
        },
      });
      await this.audit.log({ actorUserId: actor.id, action: 'UPDATE', entityType: 'MeterReading', entityId: String(updated.id), oldData: existing, newData: updated });
      return updated;
    } catch (error: any) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Catatan meter untuk tanggal ini sudah ada');
      }
      throw error;
    }
  }
}
