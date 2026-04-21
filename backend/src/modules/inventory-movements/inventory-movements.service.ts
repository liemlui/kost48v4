import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { buildMeta, buildPagination } from '../../common/utils/pagination';
import { AuditLogService } from '../../audit-log/audit-log.service';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import { CreateInventoryMovementDto, UpdateInventoryMovementDto } from './dto/inventory-movement.dto';
import { InventoryMovementsQueryDto } from './dto/inventory-movements-query.dto';

@Injectable()
export class InventoryMovementsService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditLogService) {}

  async findAll(query: InventoryMovementsQueryDto) {
    const { page, limit, skip, take } = buildPagination(query.page, query.limit);
    const where: any = {
      AND: [
        query.itemId ? { itemId: Number(query.itemId) } : {},
        query.roomId ? { roomId: Number(query.roomId) } : {},
        query.movementType ? { movementType: query.movementType } : {},
        query.dateFrom || query.dateTo ? { movementDate: { gte: query.dateFrom ? new Date(query.dateFrom) : undefined, lte: query.dateTo ? new Date(query.dateTo) : undefined } } : {},
      ],
    };
    const [items, totalItems] = await this.prisma.$transaction([
      this.prisma.inventoryMovement.findMany({
        where,
        skip,
        take,
        orderBy: { id: 'desc' },
        include: { item: true, room: true },
      }),
      this.prisma.inventoryMovement.count({ where }),
    ]);
    return { items, meta: buildMeta(page, limit, totalItems) };
  }

  async findOne(id: number) {
    const item = await this.prisma.inventoryMovement.findUnique({ where: { id }, include: { item: true, room: true } });
    if (!item) throw new NotFoundException('Movement tidak ditemukan');
    return item;
  }

  async create(dto: CreateInventoryMovementDto, actor: CurrentUserPayload) {
    await this.validateMovement(dto.itemId, dto.movementType, dto.roomId, dto.qty);
    const created = await this.prisma.$transaction(async (tx) => {
      const movement = await tx.inventoryMovement.create({ data: { itemId: dto.itemId, movementType: dto.movementType as any, qty: dto.qty as any, roomId: dto.roomId, movementDate: new Date(dto.movementDate), note: dto.note, createdById: actor.id } });
      await this.syncRoomItem(tx, movement.itemId, movement.roomId ?? undefined, movement.movementType, movement.qty);
      return movement;
    });
    const item = await this.prisma.inventoryItem.findUnique({ where: { id: dto.itemId } });
    await this.audit.log({ actorUserId: actor.id, action: 'CREATE', entityType: 'InventoryMovement', entityId: String(created.id), newData: created });
    return { ...created, qtyOnHandAfterSync: item?.qtyOnHand };
  }

  async update(id: number, dto: UpdateInventoryMovementDto, actor: CurrentUserPayload) {
    const existing = await this.prisma.inventoryMovement.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Movement tidak ditemukan');
    await this.validateMovement(existing.itemId, dto.movementType ?? existing.movementType, dto.roomId ?? existing.roomId ?? undefined, dto.qty ?? String(existing.qty));
    const updated = await this.prisma.$transaction(async (tx) => {
      const movement = await tx.inventoryMovement.update({ where: { id }, data: { movementType: dto.movementType as any, qty: dto.qty as any, roomId: dto.roomId, movementDate: dto.movementDate ? new Date(dto.movementDate) : undefined, note: dto.note } });
      await this.syncRoomItem(tx, existing.itemId, existing.roomId ?? undefined, existing.movementType, ('-' + existing.qty) as any, true);
      await this.syncRoomItem(tx, movement.itemId, movement.roomId ?? undefined, movement.movementType, movement.qty);
      return movement;
    });
    const item = await this.prisma.inventoryItem.findUnique({ where: { id: existing.itemId } });
    await this.audit.log({ actorUserId: actor.id, action: 'UPDATE', entityType: 'InventoryMovement', entityId: String(updated.id), oldData: existing, newData: updated });
    return { ...updated, qtyOnHandAfterSync: item?.qtyOnHand };
  }

  private async validateMovement(itemId: number, movementType: string, roomId: number | undefined, qty: string) {
    const item = await this.prisma.inventoryItem.findUnique({ where: { id: itemId } });
    if (!item) throw new NotFoundException('Item tidak ditemukan');
    if (Number(qty) <= 0) throw new ConflictException('qty tidak lebih dari 0');
    if (movementType === 'ADJUSTMENT') throw new ConflictException('movementType tidak didukung');
    if (['IN', 'OUT'].includes(movementType) && roomId) throw new ConflictException('Data room tidak konsisten');
    if (['ASSIGN_TO_ROOM', 'RETURN_FROM_ROOM'].includes(movementType) && !roomId) throw new ConflictException('Data room tidak konsisten');
    if (roomId) {
      const room = await this.prisma.room.findUnique({ where: { id: roomId } });
      if (!room) throw new NotFoundException('Room tidak ditemukan');
    }
  }

  private async syncRoomItem(tx: any, itemId: number, roomId: number | undefined, movementType: string, qty: any, reverse = false) {
    if (!roomId || !['ASSIGN_TO_ROOM', 'RETURN_FROM_ROOM'].includes(movementType)) return;
    const numericQty = Number(qty);
    const sign = movementType === 'ASSIGN_TO_ROOM' ? 1 : -1;
    const delta = sign * numericQty;
    const existing = await tx.roomItem.findFirst({ where: { itemId, roomId } });
    if (!existing) {
      if (delta > 0) {
        await tx.roomItem.create({ data: { itemId, roomId, qty: String(delta) } });
      }
      return;
    }
    const nextQty = Number(existing.qty) + delta;
    if (nextQty <= 0) {
      await tx.roomItem.delete({ where: { id: existing.id } });
    } else {
      await tx.roomItem.update({ where: { id: existing.id }, data: { qty: String(nextQty) } });
    }
  }
}
