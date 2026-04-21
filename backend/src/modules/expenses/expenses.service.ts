import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { buildMeta, buildPagination } from '../../common/utils/pagination';
import { CreateExpenseDto, UpdateExpenseDto } from './dto/expense.dto';
import { ExpensesQueryDto } from './dto/expenses-query.dto';
import { AuditLogService } from '../../audit-log/audit-log.service';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';

@Injectable()
export class ExpensesService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditLogService) {}

  async findAll(query: ExpensesQueryDto) {
    const { page, limit, skip, take } = buildPagination(query.page, query.limit);
    const where: any = {
      AND: [
        query.search ? { OR: [{ description: { contains: query.search, mode: 'insensitive' } }, { vendorName: { contains: query.search, mode: 'insensitive' } }] } : {},
        query.type ? { type: query.type } : {},
        query.category ? { category: query.category } : {},
        query.roomId ? { roomId: Number(query.roomId) } : {},
        query.stayId ? { stayId: Number(query.stayId) } : {},
        query.expenseDateFrom || query.expenseDateTo ? { expenseDate: { gte: query.expenseDateFrom ? new Date(query.expenseDateFrom) : undefined, lte: query.expenseDateTo ? new Date(query.expenseDateTo) : undefined } } : {},
      ],
    };
    const [items, totalItems] = await this.prisma.$transaction([
      this.prisma.expense.findMany({
        where,
        skip,
        take,
        orderBy: { expenseDate: 'desc' },
        include: { room: true, stay: { include: { tenant: true, room: true } } },
      }),
      this.prisma.expense.count({ where }),
    ]);
    return { items, meta: buildMeta(page, limit, totalItems) };
  }

  async findOne(id: number) {
    const item = await this.prisma.expense.findUnique({ where: { id }, include: { room: true, stay: { include: { tenant: true, room: true } } } });
    if (!item) throw new NotFoundException('Expense tidak ditemukan');
    return item;
  }

  async create(dto: CreateExpenseDto, actor: CurrentUserPayload) {
    await this.validateRelations(dto.roomId, dto.stayId);
    const created = await this.prisma.expense.create({ data: { ...dto, expenseDate: new Date(dto.expenseDate), createdById: actor.id } });
    await this.audit.log({ actorUserId: actor.id, action: 'CREATE', entityType: 'Expense', entityId: String(created.id), newData: created });
    return created;
  }

  async update(id: number, dto: UpdateExpenseDto, actor: CurrentUserPayload) {
    const existing = await this.prisma.expense.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Expense tidak ditemukan');
    await this.validateRelations(dto.roomId ?? existing.roomId ?? undefined, dto.stayId ?? existing.stayId ?? undefined);
    const updated = await this.prisma.expense.update({ where: { id }, data: { ...dto, expenseDate: dto.expenseDate ? new Date(dto.expenseDate) : undefined } });
    await this.audit.log({ actorUserId: actor.id, action: 'UPDATE', entityType: 'Expense', entityId: String(updated.id), oldData: existing, newData: updated });
    return updated;
  }

  async remove(id: number, actor: CurrentUserPayload) {
    const existing = await this.prisma.expense.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Expense tidak ditemukan');
    await this.prisma.expense.delete({ where: { id } });
    await this.audit.log({ actorUserId: actor.id, action: 'DELETE', entityType: 'Expense', entityId: String(existing.id), oldData: existing });
    return { deletedId: existing.id };
  }

  private async validateRelations(roomId?: number, stayId?: number) {
    if (roomId) {
      const room = await this.prisma.room.findUnique({ where: { id: Number(roomId) } });
      if (!room) throw new NotFoundException('Room tidak ditemukan');
    }
    if (stayId) {
      const stay = await this.prisma.stay.findUnique({ where: { id: Number(stayId) } });
      if (!stay) throw new NotFoundException('Stay tidak ditemukan');
      if (roomId && stay.roomId !== Number(roomId)) throw new ConflictException('Relasi room/stay tidak konsisten');
    }
  }
}
