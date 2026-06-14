import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { buildMeta, buildPagination } from '../../common/utils/pagination';
import { AuditLogService } from '../../audit-log/audit-log.service';
import { InventoryMovementType, UserRole } from '../../common/enums/app.enums';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import { assertRoomItemQtyAvailableTx, syncRoomItemTx } from '../../common/utils/room-booking.util';
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
    this.assertOwnerOrAdmin(actor);
    this.assertMeaningfulNote(dto.note);
    await this.validateMovement(dto.itemId, dto.movementType, dto.roomId, dto.qty);
    const created = await this.prisma.$transaction(async (tx) => {
      const beforeQty = await this.lockInventoryQtyTx(tx, dto.itemId);
      if (dto.movementType === InventoryMovementType.RETURN_FROM_ROOM && dto.roomId) {
        await assertRoomItemQtyAvailableTx(tx, dto.itemId, dto.roomId, dto.qty);
      }
      const movement = await tx.inventoryMovement.create({
        data: {
          itemId: dto.itemId,
          movementType: dto.movementType as any,
          qty: dto.qty as any,
          roomId: dto.roomId,
          movementDate: dto.movementDate ? new Date(dto.movementDate) : new Date(),
          note: dto.note,
          createdById: actor.id,
        },
      });
      await syncRoomItemTx(tx, movement.itemId, movement.roomId ?? undefined, movement.movementType, movement.qty);
      await this.ensureInventoryQtySyncedTx(tx, movement.itemId, beforeQty + this.movementDelta(movement.movementType, movement.qty));
      return movement;
    });
    const item = await this.prisma.inventoryItem.findUnique({ where: { id: dto.itemId } });
    await this.audit.log({ actorUserId: actor.id, action: 'CREATE', entityType: 'InventoryMovement', entityId: String(created.id), newData: created });
    return { ...created, qtyOnHandAfterSync: item?.qtyOnHand };
  }

  async update(id: number, dto: UpdateInventoryMovementDto, actor: CurrentUserPayload) {
    this.assertOwnerOrAdmin(actor);
    const existing = await this.prisma.inventoryMovement.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Movement tidak ditemukan');
    throw new ConflictException('Mutasi stok resmi tidak diedit langsung. Buat mutasi koreksi agar stok gudang/kamar dan audit tetap aman.');
  }


  private movementDelta(movementType: string, qty: any) {
    const numericQty = Number(qty);
    if (!Number.isFinite(numericQty)) return 0;
    if (['IN', 'RETURN_FROM_ROOM'].includes(movementType)) return numericQty;
    if (['OUT', 'ASSIGN_TO_ROOM'].includes(movementType)) return -numericQty;
    return 0;
  }

  private async lockInventoryQtyTx(tx: any, itemId: number) {
    const rows = await tx.$queryRaw<Array<{ qtyOnHand: any }>>`SELECT "qtyOnHand" FROM "InventoryItem" WHERE id = ${itemId} FOR UPDATE`;
    if (!rows.length) throw new NotFoundException('Item tidak ditemukan');
    return Number(rows[0].qtyOnHand ?? 0);
  }


  private async ensureInventoryQtySyncedTx(tx: any, itemId: number, expectedQty: number) {
    if (!Number.isFinite(expectedQty)) return;
    const item = await tx.inventoryItem.findUnique({ where: { id: itemId }, select: { qtyOnHand: true } });
    if (!item) throw new NotFoundException('Item tidak ditemukan');
    const currentQty = Number(item.qtyOnHand ?? 0);
    if (Math.abs(currentQty - expectedQty) > 0.0001) {
      if (expectedQty < 0) throw new ConflictException('Stok inventory tidak boleh negatif.');
      await tx.inventoryItem.update({ where: { id: itemId }, data: { qtyOnHand: String(expectedQty) as any } });
    }
  }

  private assertOwnerOrAdmin(actor: CurrentUserPayload) {
    if (![UserRole.OWNER, UserRole.ADMIN].includes(actor.role)) {
      throw new ForbiddenException('Staff hanya boleh melihat riwayat stok. Mutasi stok hanya boleh dilakukan Owner/Admin.');
    }
  }

  private assertMeaningfulNote(note?: string | null) {
    if (!note?.trim() || note.trim().length < 8) {
      throw new ConflictException('Catatan mutasi stok minimal 8 karakter agar audit stok jelas.');
    }
  }

  private isStockDecreasingMovement(movementType: string) {
    return [InventoryMovementType.OUT, InventoryMovementType.ASSIGN_TO_ROOM].includes(movementType as InventoryMovementType);
  }

  private async validateMovement(itemId: number, movementType: string, roomId: number | undefined, qty: string) {
    const item = await this.prisma.inventoryItem.findUnique({ where: { id: itemId } });
    if (!item) throw new NotFoundException('Item tidak ditemukan');
    const numericQty = Number(qty);
    if (numericQty <= 0) throw new ConflictException('qty tidak lebih dari 0');
    if (movementType === 'ADJUSTMENT') throw new ConflictException('movementType tidak didukung');
    if (this.isStockDecreasingMovement(movementType) && Number(item.qtyOnHand) < numericQty) {
      throw new ConflictException(`Stok ${item.name} tidak cukup. Tersedia ${item.qtyOnHand}, diminta ${qty}.`);
    }
    if (['IN', 'OUT'].includes(movementType) && roomId) throw new ConflictException('Data room tidak konsisten');
    if (['ASSIGN_TO_ROOM', 'RETURN_FROM_ROOM'].includes(movementType) && !roomId) throw new ConflictException('Data room tidak konsisten');
    if (roomId) {
      const room = await this.prisma.room.findUnique({ where: { id: roomId } });
      if (!room) throw new NotFoundException('Room tidak ditemukan');
    }
    if (movementType === InventoryMovementType.RETURN_FROM_ROOM && roomId) {
      const roomItem = await this.prisma.roomItem.findFirst({ where: { itemId, roomId } });
      const roomQty = Number(roomItem?.qty ?? 0);
      if (!roomItem || roomQty < numericQty) {
        throw new ConflictException(`Barang di kamar tidak cukup untuk dikembalikan. Tersedia ${roomQty}, diminta ${qty}.`);
      }
    }
  }

}
