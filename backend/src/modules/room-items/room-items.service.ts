import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogService } from '../../audit-log/audit-log.service';
import { RoomItemStatus, UserRole } from '../../common/enums/app.enums';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import { generateTicketNumberTx } from '../../common/utils/ticket-number.util';
import { CreateRoomItemDto, StaffUpdateRoomItemStatusDto, UpdateRoomItemDto } from './dto/room-item.dto';

const STAFF_ALLOWED_ROOM_ITEM_STATUSES = new Set<RoomItemStatus>([
  RoomItemStatus.DAMAGED,
  RoomItemStatus.MAINTENANCE,
  RoomItemStatus.MISSING,
]);

const ACTIVE_FIELD_TICKET_STATUSES = ['OPEN', 'IN_PROGRESS', 'DONE'] as const;

function roomItemStatusLabel(status: RoomItemStatus | string) {
  switch (status) {
    case RoomItemStatus.DAMAGED: return 'Rusak';
    case RoomItemStatus.MAINTENANCE: return 'Perlu diperbaiki';
    case RoomItemStatus.MISSING: return 'Hilang';
    case RoomItemStatus.GOOD: return 'Baik';
    default: return String(status);
  }
}

function mapRoomStatusToReportedCondition(status: RoomItemStatus | string, requestsReplacement?: boolean) {
  if (requestsReplacement) return 'NEEDS_REPLACEMENT';
  if (status === RoomItemStatus.DAMAGED) return 'DAMAGED';
  if (status === RoomItemStatus.MISSING) return 'MISSING';
  if (status === RoomItemStatus.MAINTENANCE) return 'NEEDS_REPAIR';
  return 'PENDING_CHECK';
}

function buildStaffReportBlock(input: {
  actorName?: string | null;
  reportedStatus: RoomItemStatus;
  appliedStatus: RoomItemStatus;
  roomCode?: string | null;
  roomId: number;
  itemName: string;
  roomItemId: number;
  note?: string;
}) {
  return [
    'Laporan Kondisi Barang Kamar',
    `Waktu: ${new Date().toISOString()}`,
    input.actorName ? `Pelapor: ${input.actorName}` : null,
    `Kamar: ${input.roomCode ?? input.roomId}`,
    `Barang: ${input.itemName}`,
    `RoomItem ID: ${input.roomItemId}`,
    `Kondisi dilaporkan: ${roomItemStatusLabel(input.reportedStatus)}`,
    `Status sementara sistem: ${roomItemStatusLabel(input.appliedStatus)}`,
    'Status final barang tetap menunggu konfirmasi admin/owner.',
    input.note?.trim() ? `Catatan: ${input.note.trim()}` : null,
  ].filter(Boolean).join('\n');
}

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

  async findMyRoomItems(actor: CurrentUserPayload) {
    if (!actor.tenantId) {
      throw new ConflictException('Akun tenant belum terhubung ke data tenant');
    }

    const activeStay = await this.prisma.stay.findFirst({
      where: { tenantId: actor.tenantId, status: 'ACTIVE' },
      orderBy: [{ checkInDate: 'desc' }, { id: 'desc' }],
      select: { id: true, roomId: true },
    });

    if (!activeStay) {
      return { items: [], meta: { page: 1, limit: 50, totalItems: 0, totalPages: 1 } };
    }

    const items = await this.prisma.roomItem.findMany({
      where: { roomId: activeStay.roomId },
      include: { room: true, item: true },
      orderBy: [{ status: 'asc' }, { id: 'desc' }],
      take: 50,
    });

    return { items, meta: { page: 1, limit: 50, totalItems: items.length, totalPages: 1 } };
  }

  async create(_dto: CreateRoomItemDto, actor: CurrentUserPayload) {
    this.assertOwnerOrAdmin(actor);
    throw new ConflictException('Gunakan Mutasi Stok tipe Pasang ke Kamar untuk menambah barang kamar. Ini menjaga stok gudang dan inventaris kamar tetap sinkron.');
  }

  async update(id: number, dto: UpdateRoomItemDto, actor: CurrentUserPayload) {
    this.assertOwnerOrAdmin(actor);
    const existing = await this.prisma.roomItem.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Room item tidak ditemukan');
    if (dto.qty !== undefined && String(dto.qty) !== String(existing.qty)) {
      throw new ConflictException('Jumlah barang kamar harus diubah lewat Mutasi Stok agar stok gudang ikut sinkron.');
    }
    const updated = await this.prisma.roomItem.update({ where: { id }, data: { status: dto.status as any, note: dto.note } });
    await this.audit.log({ actorUserId: actor.id, action: 'UPDATE', entityType: 'RoomItem', entityId: String(updated.id), oldData: existing, newData: updated });
    return updated;
  }

  async updateStatusFromField(id: number, dto: StaffUpdateRoomItemStatusDto, actor: CurrentUserPayload) {
    if (actor.role === UserRole.STAFF && !STAFF_ALLOWED_ROOM_ITEM_STATUSES.has(dto.status)) {
      throw new ForbiddenException('Staff hanya boleh melaporkan barang kamar sebagai rusak, hilang, atau perlu diperbaiki. Status baik kembali dikonfirmasi admin/owner.');
    }

    const existing = await this.prisma.roomItem.findUnique({
      where: { id },
      include: { room: true, item: true },
    });
    if (!existing) throw new NotFoundException('Barang kamar tidak ditemukan');

    const itemName = existing.item?.name ?? `Barang #${existing.itemId}`;
    if (actor.role === UserRole.STAFF && !dto.note?.trim() && !dto.photoUrl) {
      throw new ConflictException('Isi catatan atau upload foto agar admin bisa mengecek laporan kondisi.');
    }

    if (dto.requestsReplacement) {
      if (!dto.requestedInventoryItemId || !dto.requestedQty) throw new ConflictException('Pilih barang pengganti dan jumlah yang dibutuhkan.');
      const requestedItem = await this.prisma.inventoryItem.findUnique({ where: { id: dto.requestedInventoryItemId } });
      if (!requestedItem) throw new NotFoundException('Barang pengganti tidak ditemukan');
    }
    const appliedStatus = actor.role === UserRole.STAFF ? RoomItemStatus.MAINTENANCE : dto.status;
    const reportBlock = buildStaffReportBlock({
      actorName: actor.fullName,
      reportedStatus: dto.status,
      appliedStatus,
      roomCode: existing.room?.code,
      roomId: existing.roomId,
      itemName,
      roomItemId: existing.id,
      note: dto.note,
    });
    const notePrefix = actor.role === UserRole.STAFF
      ? 'Laporan lapangan - menunggu konfirmasi admin'
      : 'Update admin/owner';
    const nextNote = [notePrefix, `Kondisi dilaporkan: ${roomItemStatusLabel(dto.status)}`, dto.note?.trim() ? `Catatan: ${dto.note.trim()}` : null]
      .filter(Boolean)
      .join('\n');

    const activeStay = await this.prisma.stay.findFirst({
      where: { roomId: existing.roomId, status: 'ACTIVE' },
      orderBy: [{ checkInDate: 'desc' }, { id: 'desc' }],
      select: { id: true, tenantId: true },
    });

    const result = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.roomItem.update({
        where: { id },
        data: {
          status: appliedStatus as any,
          note: [existing.note, nextNote].filter(Boolean).join('\n'),
        },
        include: { room: true, item: true },
      });

      const existingTicket = await tx.ticket.findFirst({
        where: {
          roomId: existing.roomId,
          status: { in: ACTIVE_FIELD_TICKET_STATUSES as any },
          OR: [
            { linkedRoomItemId: existing.id },
            { title: { contains: itemName, mode: Prisma.QueryMode.insensitive } },
            { description: { contains: itemName, mode: Prisma.QueryMode.insensitive } },
            { description: { contains: `RoomItem ID: ${existing.id}`, mode: Prisma.QueryMode.insensitive } },
            { description: { contains: `Barang #${existing.itemId}`, mode: Prisma.QueryMode.insensitive } },
          ],
        },
        orderBy: { id: 'desc' },
      });

      const ticket = existingTicket
        ? await tx.ticket.update({
            where: { id: existingTicket.id },
            data: {
              description: [existingTicket.description, reportBlock].filter(Boolean).join('\n\n---\n'),
              roomId: existingTicket.roomId ?? existing.roomId,
              linkedRoomItemId: existingTicket.linkedRoomItemId ?? existing.id,
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
              tenantId: activeStay?.tenantId ?? null,
              roomId: existing.roomId,
              stayId: activeStay?.id ?? null,
              assignedToId: actor.role === UserRole.STAFF ? actor.id : undefined,
              linkedRoomItemId: existing.id,
              title: `Perlu cek admin - ${itemName}`,
              description: reportBlock,
              category: dto.status === RoomItemStatus.MISSING ? 'BARANG_HILANG' : 'BARANG_RUSAK',
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
          roomId: existing.roomId,
          roomItemId: existing.id,
          reportedByStaffId: actor.id,
          reportedCondition: mapRoomStatusToReportedCondition(dto.status, dto.requestsReplacement) as any,
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
            sourceType: 'INVENTORY_REPORT',
            sourceId: fieldReport.id,
            eventType: 'STOCK_REPORTED',
            scoreDelta: dto.photoUrl ? 2 : 1,
            reason: `Laporan kondisi barang kamar: ${itemName} sebagai ${roomItemStatusLabel(dto.status)}. Status final menunggu admin.`,
          },
        });
      }

      return { updated, ticket, fieldReport, ticketAction: existingTicket ? 'LINKED_TO_EXISTING_TICKET' : 'TICKET_CREATED', reportedStatus: dto.status, appliedStatus };
    });

    await this.audit.log({
      actorUserId: actor.id,
      action: actor.role === UserRole.STAFF ? 'STAFF_FIELD_REPORT' : 'FIELD_STATUS_UPDATE',
      entityType: 'RoomItem',
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
