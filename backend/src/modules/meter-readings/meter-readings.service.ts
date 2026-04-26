import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from 'src/generated/prisma';
import { PrismaService } from '../../prisma/prisma.service';
import { buildMeta, buildPagination } from '../../common/utils/pagination';
import { CreateMeterReadingDto, UpdateMeterReadingDto } from './dto/meter-reading.dto';
import { MeterReadingsQueryDto } from './dto/meter-readings-query.dto';
import { AuditLogService } from '../../audit-log/audit-log.service';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import { UtilityType } from '../../common/enums/app.enums';

@Injectable()
export class MeterReadingsService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditLogService) {}

  async findAll(query: MeterReadingsQueryDto) {
    const { page, limit, skip, take } = buildPagination(query.page, query.limit);
    const where: Prisma.MeterReadingWhereInput = {
      AND: [
        query.roomId ? { roomId: Number(query.roomId) } : undefined,
        query.utilityType ? { utilityType: query.utilityType } : undefined,
        query.from || query.to
          ? { readingAt: { gte: query.from ? new Date(query.from) : undefined, lte: query.to ? new Date(query.to) : undefined } }
          : undefined,
      ].filter(Boolean),
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
    const room = await this.prisma.room.findUnique({ where: { id: Number(dto.roomId) } });
    if (!room) throw new NotFoundException('Kamar tidak ditemukan');
    const createData: Prisma.MeterReadingCreateInput = {
      room: { connect: { id: Number(dto.roomId) } },
      utilityType: dto.utilityType as UtilityType,
      readingAt: new Date(dto.readingAt),
      readingValue: dto.readingValue,
      note: dto.note,
      recordedBy: { connect: { id: actor.id } },
    };
    const created = await this.prisma.meterReading.create({ data: createData });
    await this.audit.log({ actorUserId: actor.id, action: 'CREATE', entityType: 'MeterReading', entityId: String(created.id), newData: created });
    return created;
  }

  async update(id: number, dto: UpdateMeterReadingDto, actor: CurrentUserPayload) {
    const existing = await this.prisma.meterReading.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Meter reading tidak ditemukan');
    const updateData: Prisma.MeterReadingUpdateInput = {
      readingAt: dto.readingAt ? new Date(dto.readingAt) : undefined,
      readingValue: dto.readingValue ?? undefined,
      note: dto.note ?? undefined,
      recordedBy: { connect: { id: actor.id } },
    };
    const updated = await this.prisma.meterReading.update({ where: { id }, data: updateData });
    await this.audit.log({ actorUserId: actor.id, action: 'UPDATE', entityType: 'MeterReading', entityId: String(updated.id), oldData: existing, newData: updated });
    return updated;
  }
}
