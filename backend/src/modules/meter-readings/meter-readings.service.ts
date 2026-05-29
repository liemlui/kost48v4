import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma';
import { PrismaService } from '../../prisma/prisma.service';
import { buildMeta, buildPagination } from '../../common/utils/pagination';
import { CreateMeterReadingDto, UpdateMeterReadingDto } from './dto/meter-reading.dto';
import { MeterReadingsQueryDto } from './dto/meter-readings-query.dto';
import { AuditLogService } from '../../audit-log/audit-log.service';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import { UtilityType } from '../../common/enums/app.enums';
import { endOfDay, parseJakartaDateOnly } from '../../common/utils/date.util';

@Injectable()
export class MeterReadingsService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditLogService) {}

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

  async findAll(query: MeterReadingsQueryDto) {
    const { page, limit, skip, take } = buildPagination(query.page, query.limit);
    const where: Prisma.MeterReadingWhereInput = {
      AND: [
        query.roomId ? { roomId: Number(query.roomId) } : undefined,
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
