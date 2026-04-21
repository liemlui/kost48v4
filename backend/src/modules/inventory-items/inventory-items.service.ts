import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { buildMeta, buildPagination } from '../../common/utils/pagination';
import { CreateInventoryItemDto, UpdateInventoryItemDto } from './dto/inventory-item.dto';
import { InventoryItemsQueryDto } from './dto/inventory-items-query.dto';
import { AuditLogService } from '../../audit-log/audit-log.service';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';

@Injectable()
export class InventoryItemsService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditLogService) {}

  async findAll(query: InventoryItemsQueryDto) {
    const { page, limit, skip, take } = buildPagination(query.page, query.limit);
    const where: any = {
      AND: [
        query.search ? { OR: [{ name: { contains: query.search, mode: 'insensitive' } }, { sku: { contains: query.search, mode: 'insensitive' } }] } : {},
        query.category ? { category: query.category } : {},
        typeof query.isActive === 'string' ? { isActive: query.isActive === 'true' } : {},
      ],
    };
    const [rawItems, totalItems] = await this.prisma.$transaction([
      this.prisma.inventoryItem.findMany({ where, skip, take, orderBy: { id: 'desc' } }),
      this.prisma.inventoryItem.count({ where }),
    ]);
    const items = query.lowStockOnly === 'true'
      ? rawItems.filter((item) => Number(item.qtyOnHand) <= Number(item.minQty))
      : rawItems;
    return { items, meta: buildMeta(page, limit, totalItems) };
  }

  async findOne(id: number) {
    const item = await this.prisma.inventoryItem.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Item inventory tidak ditemukan');
    return item;
  }

  async create(dto: CreateInventoryItemDto, actor: CurrentUserPayload) {
    if (dto.sku) {
      const exists = await this.prisma.inventoryItem.findUnique({ where: { sku: dto.sku } });
      if (exists) throw new ConflictException('SKU sudah digunakan');
    }
    const created = await this.prisma.inventoryItem.create({ data: { ...dto, qtyOnHand: dto.qtyOnHand as any, minQty: dto.minQty as any } });
    await this.audit.log({ actorUserId: actor.id, action: 'CREATE', entityType: 'InventoryItem', entityId: String(created.id), newData: created });
    return created;
  }

  async update(id: number, dto: UpdateInventoryItemDto, actor: CurrentUserPayload) {
    const existing = await this.prisma.inventoryItem.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Item inventory tidak ditemukan');
    if (dto.sku && dto.sku !== existing.sku) {
      const exists = await this.prisma.inventoryItem.findUnique({ where: { sku: dto.sku } });
      if (exists) throw new ConflictException('SKU sudah digunakan');
    }
    const updated = await this.prisma.inventoryItem.update({ where: { id }, data: { ...dto, qtyOnHand: dto.qtyOnHand as any, minQty: dto.minQty as any } });
    await this.audit.log({ actorUserId: actor.id, action: 'UPDATE', entityType: 'InventoryItem', entityId: String(updated.id), oldData: existing, newData: updated });
    return updated;
  }
}
