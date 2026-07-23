import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma';
import { PrismaService } from '../../prisma/prisma.service';
import { buildMeta, buildPagination } from '../../common/utils/pagination';
import { CreateInventoryItemDto, StaffUpdateInventoryItemStatusDto, UpdateInventoryItemDto } from './dto/inventory-item.dto';
import { InventoryItemsQueryDto } from './dto/inventory-items-query.dto';
import { AuditLogService } from '../../audit-log/audit-log.service';
import { InventoryItemStatus, InventoryMovementType, UserRole } from '../../common/enums/app.enums';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import { generateTicketNumberTx } from '../../common/utils/ticket-number.util';

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


  private formatQty(value: unknown) {
    const numeric = Number(value ?? 0);
    if (!Number.isFinite(numeric)) return '0';
    return Number.isInteger(numeric) ? String(numeric) : String(numeric).replace(/\.?0+$/, '');
  }

  private decorateInventoryItem(item: any, facilityCounts?: Map<number, number>) {
    const roomItems = Array.isArray(item.roomItems) ? item.roomItems : [];
    const warehouseQty = Number(item.qtyOnHand ?? 0);
    const roomSummaries = roomItems
      .filter((roomItem: any) => Number(roomItem.qty ?? 0) > 0)
      .map((roomItem: any) => {
        const roomCode = roomItem.room?.code ?? roomItem.room?.name ?? `Kamar #${roomItem.roomId}`;
        return `${roomCode} (${this.formatQty(roomItem.qty)})`;
      });
    const positionParts = [
      warehouseQty > 0 ? `Gudang (${this.formatQty(item.qtyOnHand)})` : null,
      ...roomSummaries,
    ].filter(Boolean);

    // STF-GUDANG-2: hitung suggestedMinQty dari FK inventoryItemId di RoomFacility.
    let suggestedMinQtyRupiah: number | undefined;
    let facilityCount: number | undefined;
    if (facilityCounts) {
      const count = facilityCounts.get(Number(item.id));
      if (count != null && count > 0) {
        facilityCount = count;
        suggestedMinQtyRupiah = count;
      }
    }

    return {
      ...item,
      positionSummary: positionParts.length ? positionParts.join(' · ') : 'Tidak ada stok aktif',
      locationSummary: positionParts.length ? positionParts.join(' · ') : 'Tidak ada stok aktif',
      ...(suggestedMinQtyRupiah != null ? { suggestedMinQtyRupiah, facilityCount } : {}),
    };
  }

  // STF-GUDANG-2: hitung jumlah kamar AKTIF per inventoryItemId via FK langsung.
  private async loadFacilityCounts(): Promise<Map<number, number>> {
    const rows = await this.prisma.roomFacility.groupBy({
      by: ['inventoryItemId'],
      _count: { roomId: true },
      where: { inventoryItemId: { not: null }, room: { isActive: true } },
    });
    const map = new Map<number, number>();
    for (const row of rows) {
      if (row.inventoryItemId != null) {
        map.set(row.inventoryItemId, Number(row._count?.roomId ?? 0));
      }
    }
    return map;
  }

  private async ensureOpeningStockSyncedTx(tx: any, itemId: number, expectedQty: number) {
    const item = await tx.inventoryItem.findUnique({ where: { id: itemId }, select: { qtyOnHand: true } });
    if (!item) throw new NotFoundException('Item inventory tidak ditemukan');
    const currentQty = Number(item.qtyOnHand ?? 0);
    if (Math.abs(currentQty - expectedQty) > 0.0001) {
      await tx.inventoryItem.update({ where: { id: itemId }, data: { qtyOnHand: String(expectedQty) as any } });
    }
  }

  private assertOwnerOrAdmin(actor: CurrentUserPayload) {
    if (![UserRole.OWNER, UserRole.ADMIN].includes(actor.role)) {
      throw new ForbiddenException('Staff hanya boleh melihat data stok. Perubahan stok hanya boleh dilakukan Owner/Admin.');
    }
  }

  /** Ringkasan inventaris untuk dashboard: total, low stock, out of stock, dll. */
  async getSummary() {
    const [allItems, facilityCounts] = await Promise.all([
      this.prisma.inventoryItem.findMany({
        where: { isActive: true },
        select: { id: true, qtyOnHand: true, minQty: true, status: true, name: true },
      }),
      this.loadFacilityCounts(),
    ]);

    const totalItems = allItems.length;
    const lowStockItems = allItems.filter((i) => Number(i.qtyOnHand ?? 0) <= Number(i.minQty ?? 0) && Number(i.qtyOnHand ?? 0) > 0);
    const outOfStockItems = allItems.filter((i) => Number(i.qtyOnHand ?? 0) <= 0);
    const damagedItems = allItems.filter((i) => ['DAMAGED', 'MISSING', 'NEEDS_REPAIR', 'PENDING_CHECK'].includes(i.status));
    const totalQtyInWarehouse = allItems.reduce((sum, i) => sum + Number(i.qtyOnHand ?? 0), 0);
    const totalQtyInRooms = await this.prisma.roomItem.aggregate({
      _sum: { qty: true },
    });

    return {
      totalItems,
      lowStockCount: lowStockItems.length,
      outOfStockCount: outOfStockItems.length,
      damagedCount: damagedItems.length,
      totalQtyInWarehouse,
      totalQtyInRooms: Number(totalQtyInRooms._sum.qty ?? 0),
      lowStockItems: lowStockItems.slice(0, 10).map((i) => ({
        id: i.id,
        name: i.name,
        qtyOnHand: Number(i.qtyOnHand ?? 0),
        minQty: Number(i.minQty ?? 0),
        status: i.status,
      })),
    };
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
    const [rawItems, totalItems, facilityCounts] = await Promise.all([
      this.prisma.inventoryItem.findMany({
        where,
        skip,
        take,
        orderBy: { id: 'desc' },
        include: { roomItems: { include: { room: true }, orderBy: { roomId: 'asc' } } },
      }),
      this.prisma.inventoryItem.count({ where }),
      this.loadFacilityCounts(),
    ]);
    const filteredItems = query.lowStockOnly === 'true'
      ? rawItems.filter((item) => Number(item.qtyOnHand) <= Number(item.minQty))
      : rawItems;
    const items = filteredItems.map((item) => this.decorateInventoryItem(item, facilityCounts));
    return { items, meta: buildMeta(page, limit, totalItems) };
  }

  async findOne(id: number) {
    const item = await this.prisma.inventoryItem.findUnique({ where: { id }, include: { roomItems: { include: { room: true }, orderBy: { roomId: 'asc' } } } });
    if (!item) throw new NotFoundException('Item inventory tidak ditemukan');
    return this.decorateInventoryItem(item);
  }

  async create(dto: CreateInventoryItemDto, actor: CurrentUserPayload) {
    this.assertOwnerOrAdmin(actor);
    if (dto.sku) {
      const exists = await this.prisma.inventoryItem.findUnique({ where: { sku: dto.sku } });
      if (exists) throw new ConflictException('SKU sudah digunakan');
    }

    const initialQty = dto.qtyOnHand ?? '0';
    const numericInitialQty = Number(initialQty);
    if (!Number.isFinite(numericInitialQty) || numericInitialQty < 0) {
      throw new ConflictException('Stok awal tidak boleh negatif.');
    }

    const created = await this.prisma.$transaction(async (tx) => {
      const item = await tx.inventoryItem.create({
        data: {
          ...dto,
          qtyOnHand: '0' as any,
          minQty: dto.minQty as any,
          status: dto.status as any,
        },
      });

      if (numericInitialQty > 0) {
        await tx.inventoryMovement.create({
          data: {
            itemId: item.id,
            movementType: InventoryMovementType.IN as any,
            qty: initialQty as any,
            roomId: null,
            movementDate: new Date(),
            note: dto.notes?.trim()
              ? `Stok awal saat tambah barang. ${dto.notes.trim()}`
              : 'Stok awal saat tambah barang.',
            createdById: actor.id,
          },
        });

        await this.ensureOpeningStockSyncedTx(tx, item.id, numericInitialQty);
      }

      return tx.inventoryItem.findUniqueOrThrow({
        where: { id: item.id },
        include: { roomItems: { include: { room: true }, orderBy: { roomId: 'asc' } } },
      });
    });

    const decorated = this.decorateInventoryItem(created);
    await this.audit.log({ actorUserId: actor.id, action: 'CREATE', entityType: 'InventoryItem', entityId: String(created.id), newData: decorated });
    return decorated;
  }

  async update(id: number, dto: UpdateInventoryItemDto, actor: CurrentUserPayload) {
    this.assertOwnerOrAdmin(actor);
    const existing = await this.prisma.inventoryItem.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Item inventory tidak ditemukan');
    if (dto.sku && dto.sku !== existing.sku) {
      const exists = await this.prisma.inventoryItem.findUnique({ where: { sku: dto.sku } });
      if (exists) throw new ConflictException('SKU sudah digunakan');
    }
    if (dto.qtyOnHand !== undefined && String(dto.qtyOnHand) !== String(existing.qtyOnHand)) {
      throw new ConflictException('Gunakan Mutasi Stok untuk mengubah stok resmi. Edit master barang tidak boleh langsung mengubah jumlah stok.');
    }
    await this.prisma.inventoryItem.update({ where: { id }, data: { ...dto, qtyOnHand: undefined, minQty: dto.minQty as any, status: dto.status as any } });
    const updated = await this.prisma.inventoryItem.findUniqueOrThrow({ where: { id }, include: { roomItems: { include: { room: true }, orderBy: { roomId: 'asc' } } } });
    const decorated = this.decorateInventoryItem(updated);
    await this.audit.log({ actorUserId: actor.id, action: 'UPDATE', entityType: 'InventoryItem', entityId: String(updated.id), oldData: existing, newData: decorated });
    return decorated;
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
              ticketNumber: await generateTicketNumberTx(tx),
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
}
