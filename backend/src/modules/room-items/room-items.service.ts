import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogService } from '../../audit-log/audit-log.service';
import { UserRole } from '../../common/enums/app.enums';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import { CreateRoomItemDto, UpdateRoomItemDto } from './dto/room-item.dto';

@Injectable()
export class RoomItemsService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditLogService) {}

  private assertOwnerOrAdmin(actor: CurrentUserPayload) {
    if (![UserRole.OWNER, UserRole.ADMIN].includes(actor.role)) {
      throw new ForbiddenException('Staff hanya boleh melihat inventaris kamar. Perubahan inventaris kamar hanya boleh dilakukan Owner/Admin.');
    }
  }

  async findAll(roomId?: number) {
    return { items: await this.prisma.roomItem.findMany({ where: roomId ? { roomId } : undefined, include: { room: true, item: true }, orderBy: { id: 'desc' } }) };
  }

  async create(dto: CreateRoomItemDto, actor: CurrentUserPayload) {
    this.assertOwnerOrAdmin(actor);
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
    this.assertOwnerOrAdmin(actor);
    const existing = await this.prisma.roomItem.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Room item tidak ditemukan');
    const updated = await this.prisma.roomItem.update({ where: { id }, data: { qty: dto.qty as any, status: dto.status as any, note: dto.note } });
    await this.audit.log({ actorUserId: actor.id, action: 'UPDATE', entityType: 'RoomItem', entityId: String(updated.id), oldData: existing, newData: updated });
    return updated;
  }
}
