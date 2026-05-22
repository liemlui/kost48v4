import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma';
import { PrismaService } from '../../prisma/prisma.service';
import { buildMeta, buildPagination } from '../../common/utils/pagination';
import { CreateInventoryItemDto, StaffUpdateInventoryItemStatusDto, UpdateInventoryItemDto } from './dto/inventory-item.dto';
import { InventoryItemsQueryDto } from './dto/inventory-items-query.dto';
import { AuditLogService } from '../../audit-log/audit-log.service';
import { InventoryItemStatus, UserRole } from '../../common/enums/app.enums';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';

const STAFF_ALLOWED_INVENTORY_STATUSES = new Set<InventoryItemStatus>([
  InventoryItemStatus.LOW_STOCK,
  InventoryItemStatus.OUT_OF_STOCK,
  InventoryItemStatus.DAMAGED,
  InventoryItemStatus.MISSING,
  InventoryItemStatus.NEEDS_REPAIR,
  InventoryItemStatus.PENDING_CHECK,
]);

const ACTIVE_FIELD_TICKET_STATUSES = ['OPEN', 'IN_PROGRESS', 'DONE'] as const;

function inventoryStatusLabel(status: InventoryItemStatus | string) {
  switch (status) {
    case InventoryItemStatus.GOOD: return 'Baik';
    case InventoryItemStatus.LOW_STOCK: return 'Stok menipis';
    case InventoryItemStatus.OUT_OF_STOCK: return 'Stok habis';
    case InventoryItemStatus.DAMAGED: return 'Rusak';
    case InventoryItemStatus.MISSING: return 'Hilang';
    case InventoryItemStatus.NEEDS_REPAIR: return 'Perlu diperbaiki';
    case InventoryItemStatus.PENDING_CHECK: return 'Menunggu cek admin';
    default: return String(status);
  }
}

function mapInventoryStatusToReportedCondition(status: InventoryItemStatus | string) {
  if (status === InventoryItemStatus.LOW_STOCK) return 'LOW_STOCK';
  if (status === InventoryItemStatus.OUT_OF_STOCK) return 'OUT_OF_STOCK';
  if (status === InventoryItemStatus.DAMAGED) return 'DAMAGED';
  if (status === InventoryItemStatus.MISSING) return 'MISSING';
  if (status === InventoryItemStatus.NEEDS_REPAIR) return 'NEEDS_REPAIR';
  return 'PENDING_CHECK';
}

function buildStaffInventoryReportBlock(input: {
  actorName?: string | null;
  reportedStatus: InventoryItemStatus;
  appliedStatus: InventoryItemStatus;
  itemName: string;
  itemId: number;
  category?: string | null;
  note?: string;
}) {
  return [
    'Laporan Kondisi Barang Umum & Gudang',
    `Waktu: ${new Date().toISOString()}`,
    input.actorName ? `Pelapor: ${input.actorName}` : null,
    `Barang: ${input.itemName}`,
    `InventoryItem ID: ${input.itemId}`,
    input.category ? `Area/kategori: ${input.category}` : null,
    `Kondisi dilaporkan: ${inventoryStatusLabel(input.reportedStatus)}`,
    `Status sementara sistem: ${inventoryStatusLabel(input.appliedStatus)}`,
    'Jumlah stok resmi dan status final tetap menunggu konfirmasi admin/owner.',
    input.note?.trim() ? `Catatan: ${input.note.trim()}` : null,
  ].filter(Boolean).join('\n');
}

@Injectable()
export class InventoryItemsService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditLogService) {}

  private assertOwnerOrAdmin(actor: CurrentUserPayload) {
    if (![UserRole.OWNER, UserRole.ADMIN].includes(actor.role)) {
      throw new ForbiddenException('Staff hanya boleh melihat data stok. Perubahan stok hanya boleh dilakukan Owner/Admin.');
    }
  }

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
    this.assertOwnerOrAdmin(actor);
    if (dto.sku) {
      const exists = await this.prisma.inventoryItem.findUnique({ where: { sku: dto.sku } });
      if (exists) throw new ConflictException('SKU sudah digunakan');
    }
    const created = await this.prisma.inventoryItem.create({ data: { ...dto, qtyOnHand: dto.qtyOnHand as any, minQty: dto.minQty as any, status: dto.status as any } });
    await this.audit.log({ actorUserId: actor.id, action: 'CREATE', entityType: 'InventoryItem', entityId: String(created.id), newData: created });
    return created;
  }

  async update(id: number, dto: UpdateInventoryItemDto, actor: CurrentUserPayload) {
    this.assertOwnerOrAdmin(actor);
    const existing = await this.prisma.inventoryItem.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Item inventory tidak ditemukan');
    if (dto.sku && dto.sku !== existing.sku) {
      const exists = await this.prisma.inventoryItem.findUnique({ where: { sku: dto.sku } });
      if (exists) throw new ConflictException('SKU sudah digunakan');
    }
    const updated = await this.prisma.inventoryItem.update({ where: { id }, data: { ...dto, qtyOnHand: dto.qtyOnHand as any, minQty: dto.minQty as any, status: dto.status as any } });
    await this.audit.log({ actorUserId: actor.id, action: 'UPDATE', entityType: 'InventoryItem', entityId: String(updated.id), oldData: existing, newData: updated });
    return updated;
  }

  async updateStatusFromField(id: number, dto: StaffUpdateInventoryItemStatusDto, actor: CurrentUserPayload) {
    if (actor.role === UserRole.STAFF && !STAFF_ALLOWED_INVENTORY_STATUSES.has(dto.status)) {
      throw new ForbiddenException('Staff hanya boleh melaporkan stok/barang gudang sebagai bermasalah. Status baik kembali dikonfirmasi admin/owner.');
    }

    const existing = await this.prisma.inventoryItem.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Item inventory tidak ditemukan');
    if (actor.role === UserRole.STAFF && !dto.note?.trim() && !dto.photoUrl) {
      throw new ConflictException('Isi catatan atau upload foto agar admin bisa mengecek laporan kondisi.');
    }

    if (dto.requestsReplacement) {
      if (!dto.requestedInventoryItemId || !dto.requestedQty) throw new ConflictException('Pilih barang pengganti dan jumlah yang dibutuhkan.');
      const requestedItem = await this.prisma.inventoryItem.findUnique({ where: { id: dto.requestedInventoryItemId } });
      if (!requestedItem) throw new NotFoundException('Barang pengganti tidak ditemukan');
    }

    const appliedStatus = actor.role === UserRole.STAFF ? InventoryItemStatus.PENDING_CHECK : dto.status;
    const reportBlock = buildStaffInventoryReportBlock({
      actorName: actor.fullName,
      reportedStatus: dto.status,
      appliedStatus,
      itemName: existing.name,
      itemId: existing.id,
      category: existing.category,
      note: dto.note,
    });
    const nextNote = [
      actor.role === UserRole.STAFF ? 'Laporan lapangan - menunggu konfirmasi admin' : 'Update admin/owner',
      `Kondisi dilaporkan: ${inventoryStatusLabel(dto.status)}`,
      dto.note?.trim() ? `Catatan: ${dto.note.trim()}` : null,
    ].filter(Boolean).join('\n');

    const result = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.inventoryItem.update({
        where: { id },
        data: {
          status: appliedStatus as any,
          notes: [existing.notes, nextNote].filter(Boolean).join('\n'),
        },
      });

      const existingTicket = await tx.ticket.findFirst({
        where: {
          roomId: null,
          status: { in: ACTIVE_FIELD_TICKET_STATUSES as any },
          OR: [
            { linkedInventoryItemId: existing.id },
            { title: { contains: existing.name, mode: Prisma.QueryMode.insensitive } },
            { description: { contains: existing.name, mode: Prisma.QueryMode.insensitive } },
            { description: { contains: `InventoryItem ID: ${existing.id}`, mode: Prisma.QueryMode.insensitive } },
          ],
        },
        orderBy: { id: 'desc' },
      });

      const ticket = existingTicket
        ? await tx.ticket.update({
            where: { id: existingTicket.id },
            data: {
              description: [existingTicket.description, reportBlock].filter(Boolean).join('\n\n---\n'),
              linkedInventoryItemId: existingTicket.linkedInventoryItemId ?? existing.id,
              assignedToId: existingTicket.assignedToId ?? (actor.role === UserRole.STAFF ? actor.id : undefined),
              issueImageUrl: existingTicket.issueImageUrl ?? dto.photoUrl,
              issueImageFileKey: existingTicket.issueImageFileKey ?? dto.photoFileKey,
              issueImageOriginalFilename: existingTicket.issueImageOriginalFilename ?? dto.photoOriginalFilename,
              issueImageMimeType: existingTicket.issueImageMimeType ?? dto.photoMimeType,
              issueImageFileSizeBytes: existingTicket.issueImageFileSizeBytes ?? dto.photoFileSizeBytes,
            },
          })
        : await tx.ticket.create({
            data: {
              ticketNumber: await this.generateTicketNumber(tx),
              tenantId: null,
              roomId: null,
              stayId: null,
              assignedToId: actor.role === UserRole.STAFF ? actor.id : undefined,
              linkedInventoryItemId: existing.id,
              title: `Perlu cek admin - ${existing.name}`,
              description: reportBlock,
              category: [InventoryItemStatus.LOW_STOCK, InventoryItemStatus.OUT_OF_STOCK].includes(dto.status) ? 'STOK_HABIS' : 'BARANG_RUSAK',
              issueImageUrl: dto.photoUrl,
              issueImageFileKey: dto.photoFileKey,
              issueImageOriginalFilename: dto.photoOriginalFilename,
              issueImageMimeType: dto.photoMimeType,
              issueImageFileSizeBytes: dto.photoFileSizeBytes,
            },
          });

      const fieldReport = await tx.staffFieldReport.create({
        data: {
          ticketId: ticket.id,
          inventoryItemId: existing.id,
          reportedByStaffId: actor.id,
          reportedCondition: mapInventoryStatusToReportedCondition(dto.status) as any,
          conditionNotes: dto.note,
          photoUrl: dto.photoUrl,
          photoFileKey: dto.photoFileKey,
          photoOriginalFilename: dto.photoOriginalFilename,
          photoMimeType: dto.photoMimeType,
          photoFileSizeBytes: dto.photoFileSizeBytes,
          requestsReplacement: Boolean(dto.requestsReplacement),
          requestedInventoryItemId: dto.requestedInventoryItemId,
          requestedQty: dto.requestedQty as any,
          status: 'REPORTED' as any,
        },
      });

      if (actor.role === UserRole.STAFF) {
        await tx.staffPerformanceEvent.create({
          data: {
            staffId: actor.id,
            sourceType: [InventoryItemStatus.LOW_STOCK, InventoryItemStatus.OUT_OF_STOCK].includes(dto.status) ? 'STOCK_REPORT' : 'INVENTORY_REPORT',
            sourceId: fieldReport.id,
            eventType: 'STOCK_REPORTED',
            scoreDelta: dto.photoUrl ? 2 : 1,
            reason: `Laporan kondisi barang umum/gudang: ${existing.name} sebagai ${inventoryStatusLabel(dto.status)}. Status/stok final menunggu admin.`,
          },
        });
      }

      return { updated, ticket, fieldReport, ticketAction: existingTicket ? 'LINKED_TO_EXISTING_TICKET' : 'TICKET_CREATED', reportedStatus: dto.status, appliedStatus };
    });

    await this.audit.log({
      actorUserId: actor.id,
      action: actor.role === UserRole.STAFF ? 'STAFF_FIELD_REPORT' : 'FIELD_STATUS_UPDATE',
      entityType: 'InventoryItem',
      entityId: String(result.updated.id),
      oldData: existing,
      newData: result.updated,
      meta: {
        ticketId: result.ticket.id,
        fieldReportId: result.fieldReport.id,
        ticketAction: result.ticketAction,
        reportedStatus: result.reportedStatus,
        appliedStatus: result.appliedStatus,
        fieldStatusUpdate: true,
        finalStatusRequiresAdmin: actor.role === UserRole.STAFF,
      },
    });

    return result;
  }

  private async generateTicketNumber(tx: Prisma.TransactionClient) {
    const year = new Date().getFullYear();
    const count = await tx.ticket.count({ where: { ticketNumber: { startsWith: `TIC-${year}-` } } });
    const primary = `TIC-${year}-${String(count + 1).padStart(4, '0')}`;
    const exists = await tx.ticket.findUnique({ where: { ticketNumber: primary }, select: { id: true } });
    return exists ? `TIC-${year}-${Date.now().toString().slice(-6)}` : primary;
  }
}
