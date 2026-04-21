import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogService } from '../../audit-log/audit-log.service';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import { CreateRoomItemDto, UpdateRoomItemDto } from './dto/room-item.dto';

@Injectable()
export class RoomItemsService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditLogService) {}

  async findAll(roomId?: number) {
    return { items: await this.prisma.roomItem.findMany({ where: roomId ? { roomId } : undefined, include: { room: true, item: true }, orderBy: { id: 'desc' } }) };
  }

  async create(dto: CreateRoomItemDto, actor: CurrentUserPayload) {
    const room = await this.prisma.room.findUnique({ where: { id: dto.roomId } });
    if (!room) throw new NotFoundException('Room tidak ditemukan');
    const item = await this.prisma.inventoryItem.findUnique({ where: { id: dto.itemId } });
    if (!item) throw new NotFoundException('Item inventory tidak ditemukan');
    const existing = await this.prisma.roomItem.findFirst({ where: { roomId: dto.roomId, itemId: dto.itemId } });
    if (existing) throw new ConflictException('Room item sudah ada');
    const created = await this.prisma.roomItem.create({ data: { roomId: dto.roomId, itemId: dto.itemId, qty: dto.qty as any, status: dto.status as any, note: dto.note } });
    await this.audit.log({ actorUserId: actor.id, action: 'CREATE', entityType: 'RoomItem', entityId: String(created.id), newData: created });
    return created;
  }

  async update(id: number, dto: UpdateRoomItemDto, actor: CurrentUserPayload) {
    const existing = await this.prisma.roomItem.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Room item tidak ditemukan');
    const updated = await this.prisma.roomItem.update({ where: { id }, data: { qty: dto.qty as any, status: dto.status as any, note: dto.note } });
    await this.audit.log({ actorUserId: actor.id, action: 'UPDATE', entityType: 'RoomItem', entityId: String(updated.id), oldData: existing, newData: updated });
    return updated;
  }
}
