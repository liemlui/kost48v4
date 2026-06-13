import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "../../generated/prisma";
import { AuditLogService } from "../../audit-log/audit-log.service";
import { AdminDecision, UserRole } from "../../common/enums/app.enums";
import { CurrentUserPayload } from "../../common/interfaces/current-user.interface";
import { syncRoomItemTx } from "../../common/utils/room-booking.util";
import { PrismaService } from "../../prisma/prisma.service";
import {
  AdminReviewStaffFieldReportDto,
  CreateStaffFieldReportDto,
  StaffFieldReportsQueryDto,
} from "./dto/staff-field-report.dto";

const ACTIVE_TICKET_STATUSES = ["OPEN", "IN_PROGRESS", "DONE"] as const;

const includeReportRelations = {
  ticket: {
    include: {
      room: true,
      assignedTo: { select: { id: true, fullName: true, role: true } },
    },
  },
  room: true,
  roomItem: { include: { item: true, room: true } },
  inventoryItem: true,
  requestedInventoryItem: true,
  reportedByStaff: {
    select: { id: true, fullName: true, email: true, role: true },
  },
  adminReviewedBy: { select: { id: true, fullName: true, role: true } },
  relatedMovement: true,
} satisfies Prisma.StaffFieldReportInclude;

function mapConditionToTicketCategory(condition: string, isInventory: boolean) {
  if (["LOW_STOCK", "OUT_OF_STOCK"].includes(condition)) return "STOK_HABIS";
  if (condition === "NEEDS_CLEANING") return "KEBERSIHAN";
  if (isInventory) return "BARANG_RUSAK";
  return condition === "MISSING" ? "BARANG_HILANG" : "BARANG_RUSAK";
}

function buildReportText(input: {
  actorName?: string | null;
  condition: string;
  notes?: string | null;
  target: string;
  replacement?: string | null;
}) {
  return [
    "Laporan Kondisi Staff",
    `Waktu: ${new Date().toISOString()}`,
    input.actorName ? `Pelapor: ${input.actorName}` : null,
    `Objek: ${input.target}`,
    `Kondisi dilaporkan: ${input.condition}`,
    input.replacement,
    input.notes?.trim() ? `Catatan: ${input.notes.trim()}` : null,
    "Keputusan final menunggu admin/owner.",
  ]
    .filter(Boolean)
    .join("\n");
}

@Injectable()
export class StaffFieldReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditLogService,
  ) {}

  async create(dto: CreateStaffFieldReportDto, actor: CurrentUserPayload) {
    if (
      actor.role === UserRole.STAFF &&
      !dto.roomItemId &&
      !dto.inventoryItemId &&
      !dto.ticketId
    ) {
      throw new ConflictException(
        "Pilih barang kamar, barang gudang, atau tiket aktif untuk membuat laporan kondisi.",
      );
    }
    if (!dto.conditionNotes?.trim()) {
      throw new ConflictException(
        "Catatan kondisi wajib diisi agar admin bisa mengambil keputusan.",
      );
    }
    if (
      dto.requestsReplacement &&
      (!dto.requestedInventoryItemId || !dto.requestedQty)
    ) {
      throw new ConflictException(
        "Barang pengganti dan jumlah wajib diisi jika staff meminta penggantian.",
      );
    }
    if (dto.requestedQty && Number(dto.requestedQty) <= 0) {
      throw new ConflictException(
        "Jumlah barang pengganti harus lebih dari 0.",
      );
    }

    const [roomItem, inventoryItem, requestedItem, explicitTicket] =
      await Promise.all([
        dto.roomItemId
          ? this.prisma.roomItem.findUnique({
              where: { id: dto.roomItemId },
              include: { item: true, room: true },
            })
          : null,
        dto.inventoryItemId
          ? this.prisma.inventoryItem.findUnique({
              where: { id: dto.inventoryItemId },
            })
          : null,
        dto.requestedInventoryItemId
          ? this.prisma.inventoryItem.findUnique({
              where: { id: dto.requestedInventoryItemId },
            })
          : null,
        dto.ticketId
          ? this.prisma.ticket.findUnique({ where: { id: dto.ticketId } })
          : null,
      ]);

    if (dto.roomItemId && !roomItem)
      throw new NotFoundException("Barang kamar tidak ditemukan");
    if (dto.inventoryItemId && !inventoryItem)
      throw new NotFoundException("Barang gudang tidak ditemukan");
    if (dto.requestedInventoryItemId && !requestedItem)
      throw new NotFoundException("Barang pengganti tidak ditemukan");
    if (dto.ticketId && !explicitTicket)
      throw new NotFoundException("Tiket tidak ditemukan");
    if (explicitTicket && actor.role === UserRole.STAFF) {
      if (!["OPEN", "IN_PROGRESS"].includes(String(explicitTicket.status))) {
        throw new ConflictException(
          "Laporan staff hanya bisa ditambahkan ke tiket yang masih aktif.",
        );
      }
      if (
        explicitTicket.assignedToId &&
        explicitTicket.assignedToId !== actor.id
      ) {
        throw new ForbiddenException(
          "Tiket ini bukan pekerjaan akun staff ini.",
        );
      }
    }

    const resolvedRoomId =
      dto.roomId ?? roomItem?.roomId ?? explicitTicket?.roomId ?? null;
    const targetName =
      roomItem?.item?.name ??
      inventoryItem?.name ??
      (explicitTicket?.title
        ? `Tiket: ${explicitTicket.title}`
        : "Laporan kondisi");
    const replacementText =
      dto.requestsReplacement && requestedItem
        ? `Permintaan barang pengganti: ${requestedItem.name} x ${dto.requestedQty}`
        : null;
    const reportText = buildReportText({
      actorName: actor.fullName,
      condition: dto.reportedCondition,
      notes: dto.conditionNotes,
      target: targetName,
      replacement: replacementText,
    });

    const result = await this.prisma.$transaction(async (tx) => {
      let ticket = explicitTicket;
      if (!ticket) {
        ticket = await tx.ticket.findFirst({
          where: {
            status: { in: ACTIVE_TICKET_STATUSES as any },
            ...(roomItem
              ? { roomId: roomItem.roomId, linkedRoomItemId: roomItem.id }
              : {}),
            ...(inventoryItem
              ? { linkedInventoryItemId: inventoryItem.id }
              : {}),
          },
          orderBy: { id: "desc" },
        });
      }

      if (ticket) {
        ticket = await tx.ticket.update({
          where: { id: ticket.id },
          data: {
            description: [ticket.description, reportText]
              .filter(Boolean)
              .join("\n\n---\n"),
            linkedRoomItemId: ticket.linkedRoomItemId ?? roomItem?.id,
            linkedInventoryItemId:
              ticket.linkedInventoryItemId ?? inventoryItem?.id,
            assignedToId:
              ticket.assignedToId ??
              (actor.role === UserRole.STAFF ? actor.id : undefined),
            issueImageUrl: ticket.issueImageUrl ?? dto.photoUrl,
            issueImageFileKey: ticket.issueImageFileKey ?? dto.photoFileKey,
            issueImageOriginalFilename:
              ticket.issueImageOriginalFilename ?? dto.photoOriginalFilename,
            issueImageMimeType: ticket.issueImageMimeType ?? dto.photoMimeType,
            issueImageFileSizeBytes:
              ticket.issueImageFileSizeBytes ?? dto.photoFileSizeBytes,
          },
        });
      } else {
        const activeStay = resolvedRoomId
          ? await tx.stay.findFirst({
              where: { roomId: resolvedRoomId, status: "ACTIVE" as any },
              orderBy: [{ checkInDate: "desc" }, { id: "desc" }],
              select: { id: true, tenantId: true },
            })
          : null;
        ticket = await tx.ticket.create({
          data: {
            ticketNumber: await this.generateTicketNumber(tx),
            tenantId: activeStay?.tenantId ?? null,
            roomId: resolvedRoomId,
            stayId: activeStay?.id ?? null,
            assignedToId: actor.role === UserRole.STAFF ? actor.id : undefined,
            linkedRoomItemId: roomItem?.id,
            linkedInventoryItemId: inventoryItem?.id,
            title: `Perlu keputusan admin - ${targetName}`,
            description: reportText,
            category: mapConditionToTicketCategory(
              dto.reportedCondition,
              Boolean(inventoryItem),
            ),
            issueImageUrl: dto.photoUrl,
            issueImageFileKey: dto.photoFileKey,
            issueImageOriginalFilename: dto.photoOriginalFilename,
            issueImageMimeType: dto.photoMimeType,
            issueImageFileSizeBytes: dto.photoFileSizeBytes,
          },
        });
      }

      if (roomItem && actor.role === UserRole.STAFF) {
        await tx.roomItem.update({
          where: { id: roomItem.id },
          data: {
            status: "MAINTENANCE" as any,
            note: [
              roomItem.note,
              "Laporan kondisi masuk - menunggu keputusan admin",
            ]
              .filter(Boolean)
              .join("\n"),
          },
        });
      }
      if (inventoryItem && actor.role === UserRole.STAFF) {
        await tx.inventoryItem.update({
          where: { id: inventoryItem.id },
          data: {
            status: "PENDING_CHECK" as any,
            notes: [
              inventoryItem.notes,
              "Laporan kondisi masuk - menunggu keputusan admin",
            ]
              .filter(Boolean)
              .join("\n"),
          },
        });
      }

      const report = await tx.staffFieldReport.create({
        data: {
          ticketId: ticket.id,
          roomId: resolvedRoomId,
          roomItemId: roomItem?.id,
          inventoryItemId: inventoryItem?.id,
          reportedByStaffId: actor.id,
          reportedCondition: dto.reportedCondition as any,
          conditionNotes: dto.conditionNotes,
          photoUrl: dto.photoUrl,
          photoFileKey: dto.photoFileKey,
          photoOriginalFilename: dto.photoOriginalFilename,
          photoMimeType: dto.photoMimeType,
          photoFileSizeBytes: dto.photoFileSizeBytes,
          requestsReplacement: Boolean(dto.requestsReplacement),
          requestedInventoryItemId: dto.requestedInventoryItemId,
          requestedQty: dto.requestedQty as any,
          status: "REPORTED" as any,
        },
        include: includeReportRelations,
      });

      if (actor.role === UserRole.STAFF) {
        await tx.staffPerformanceEvent.create({
          data: {
            staffId: actor.id,
            sourceType: inventoryItem ? "STOCK_REPORT" : "INVENTORY_REPORT",
            sourceId: report.id,
            eventType: "STOCK_REPORTED",
            scoreDelta: dto.photoUrl ? 2 : 1,
            reason: `Laporan kondisi dikirim: ${targetName}. Menunggu keputusan admin.`,
          },
        });
      }

      return { report, ticket };
    });

    await this.audit.log({
      actorUserId: actor.id,
      action: "CREATE",
      entityType: "StaffFieldReport",
      entityId: String(result.report.id),
      newData: result.report,
      meta: { ticketId: result.ticket.id, source: "STAFF_FIELD_REPORT" },
    });

    return result;
  }

  async findAll(query: StaffFieldReportsQueryDto, actor: CurrentUserPayload) {
    const where: Prisma.StaffFieldReportWhereInput = {
      ...(query.status ? { status: query.status as any } : {}),
      ...(query.ticketId ? { ticketId: Number(query.ticketId) } : {}),
      ...(query.roomId ? { roomId: Number(query.roomId) } : {}),
      ...(query.roomItemId ? { roomItemId: Number(query.roomItemId) } : {}),
      ...(query.inventoryItemId
        ? { inventoryItemId: Number(query.inventoryItemId) }
        : {}),
    };

    if (actor.role === UserRole.STAFF) {
      where.OR = [
        { reportedByStaffId: actor.id },
        query.assignedToMe === "true"
          ? { ticket: { assignedToId: actor.id } }
          : undefined,
      ].filter(Boolean) as any;
    }

    const items = await this.prisma.staffFieldReport.findMany({
      where,
      include: includeReportRelations,
      orderBy: { id: "desc" },
      take: 200,
    });
    return { items };
  }

  async reviewQueue() {
    const [
      pendingAssignment,
      pendingStockApproval,
      pendingVerification,
      pendingItemDecision,
      recentlyClosed,
    ] = await this.prisma.$transaction([
      this.prisma.ticket.findMany({
        where: { status: "OPEN", assignedToId: null },
        include: {
          room: true,
          tenant: true,
          linkedRoomItem: { include: { item: true } },
          linkedInventoryItem: true,
        },
        orderBy: { id: "desc" },
        take: 30,
      }),
      this.prisma.staffFieldReport.findMany({
        where: {
          status: { in: ["REPORTED", "UNDER_REVIEW"] as any },
          requestsReplacement: true,
        },
        include: includeReportRelations,
        orderBy: { id: "desc" },
        take: 30,
      }),
      this.prisma.ticket.findMany({
        where: { status: "DONE" },
        include: {
          room: true,
          tenant: true,
          assignedTo: { select: { id: true, fullName: true, role: true } },
          staffFieldReports: { include: includeReportRelations },
        },
        orderBy: { id: "desc" },
        take: 30,
      }),
      this.prisma.staffFieldReport.findMany({
        where: {
          OR: [
            {
              requestsReplacement: false,
              status: {
                in: [
                  "REPORTED",
                  "UNDER_REVIEW",
                  "APPROVED",
                  "IN_REPAIR",
                ] as any,
              },
            },
            {
              requestsReplacement: true,
              status: { in: ["APPROVED", "IN_REPAIR"] as any },
            },
          ],
          AND: [
            {
              OR: [
                { roomItemId: { not: null } },
                { inventoryItemId: { not: null } },
              ],
            },
          ],
        },
        include: includeReportRelations,
        orderBy: { id: "desc" },
        take: 30,
      }),
      this.prisma.ticket.findMany({
        where: { status: "CLOSED" },
        include: { room: true, tenant: true },
        orderBy: { closedAt: "desc" },
        take: 10,
      }),
    ]);
    return {
      pendingAssignment,
      pendingStockApproval,
      pendingVerification,
      pendingItemDecision,
      recentlyClosed,
    };
  }

  async adminReview(
    id: number,
    dto: AdminReviewStaffFieldReportDto,
    actor: CurrentUserPayload,
  ) {
    const existing = await this.prisma.staffFieldReport.findUnique({
      where: { id },
      include: {
        roomItem: true,
        inventoryItem: true,
        ticket: true,
        requestedInventoryItem: true,
      },
    });
    if (!existing)
      throw new NotFoundException("Laporan kondisi tidak ditemukan");
    if (![UserRole.OWNER, UserRole.ADMIN].includes(actor.role))
      throw new ForbiddenException(
        "Hanya admin/owner yang boleh review laporan kondisi",
      );

    if (!dto.adminNotes?.trim() || dto.adminNotes.trim().length < 8) {
      throw new ConflictException(
        "Catatan admin wajib diisi minimal 8 karakter sebelum laporan staff dikonfirmasi.",
      );
    }

    if (dto.createMovement && dto.adminDecision !== AdminDecision.APPROVE) {
      throw new ConflictException(
        "Mutasi stok hanya boleh dibuat saat laporan disetujui admin.",
      );
    }

    if (dto.createMovement) {
      await this.validateMovement(
        dto.createMovement.inventoryItemId,
        dto.createMovement.movementType,
        dto.createMovement.roomId ?? existing.roomId ?? undefined,
        dto.createMovement.qty,
      );
    }

    const result = await this.prisma.$transaction(async (tx) => {
      let movement: any = null;
      if (dto.createMovement) {
        const movementRoomId =
          dto.createMovement.roomId ?? existing.roomId ?? undefined;
        movement = await tx.inventoryMovement.create({
          data: {
            itemId: dto.createMovement.inventoryItemId,
            movementType: dto.createMovement.movementType as any,
            qty: dto.createMovement.qty as any,
            roomId: movementRoomId,
            movementDate: dto.createMovement.movementDate
              ? new Date(dto.createMovement.movementDate)
              : new Date(),
            note:
              dto.createMovement.note ??
              `Movement dari review laporan kondisi #${existing.id}`,
            createdById: actor.id,
          },
        });
        await syncRoomItemTx(
          tx,
          movement.itemId,
          movement.roomId ?? undefined,
          movement.movementType,
          movement.qty,
        );
      }

      const status =
        dto.adminDecision === AdminDecision.APPROVE
          ? movement
            ? "IN_REPAIR"
            : "APPROVED"
          : dto.adminDecision === AdminDecision.REJECT
            ? "REJECTED"
            : "UNDER_REVIEW";

      const updated = await tx.staffFieldReport.update({
        where: { id },
        data: {
          adminDecision: dto.adminDecision as any,
          adminNotes: dto.adminNotes,
          adminReviewedById: actor.id,
          relatedMovementId: movement?.id,
          status: status as any,
        },
        include: includeReportRelations,
      });

      if (existing.ticketId) {
        await tx.ticket.update({
          where: { id: existing.ticketId },
          data: {
            description: [
              existing.ticket?.description,
              `Review admin laporan #${id}: ${dto.adminDecision}${dto.adminNotes ? ` - ${dto.adminNotes}` : ""}${
                movement
                  ? `
Movement stok #${movement.id} sudah dicatat.`
                  : ""
              }`,
            ]
              .filter(Boolean)
              .join("\n\n---\n"),
          },
        });
      }

      return { report: updated, movement };
    });

    await this.audit.log({
      actorUserId: actor.id,
      action: "ADMIN_REVIEW",
      entityType: "StaffFieldReport",
      entityId: String(id),
      oldData: existing,
      newData: result.report,
      meta: { movementId: result.movement?.id ?? null },
    });

    return result;
  }

  private async validateMovement(
    itemId: number,
    movementType: string,
    roomId: number | undefined,
    qty: string,
  ) {
    const item = await this.prisma.inventoryItem.findUnique({
      where: { id: itemId },
    });
    if (!item) throw new NotFoundException("Item gudang tidak ditemukan");
    const numericQty = Number(qty);
    if (numericQty <= 0)
      throw new ConflictException("Jumlah barang harus lebih dari 0");
    if (
      ["OUT", "ASSIGN_TO_ROOM"].includes(movementType) &&
      Number(item.qtyOnHand) < numericQty
    ) {
      throw new ConflictException(
        `Stok ${item.name} tidak cukup untuk mutasi ini.`,
      );
    }
    if (movementType === "ADJUSTMENT")
      throw new ConflictException("MovementType ADJUSTMENT belum didukung");
    if (["IN", "OUT"].includes(movementType) && roomId)
      throw new ConflictException("Movement IN/OUT tidak boleh memakai kamar");
    if (
      ["ASSIGN_TO_ROOM", "RETURN_FROM_ROOM"].includes(movementType) &&
      !roomId
    )
      throw new ConflictException("Movement ke/dari kamar wajib memilih kamar");
    if (roomId) {
      const room = await this.prisma.room.findUnique({ where: { id: roomId } });
      if (!room) throw new NotFoundException("Kamar tidak ditemukan");
    }
  }

  private async generateTicketNumber(tx: Prisma.TransactionClient) {
    const year = new Date().getFullYear();
    const count = await tx.ticket.count({
      where: { ticketNumber: { startsWith: `TIC-${year}-` } },
    });
    const primary = `TIC-${year}-${String(count + 1).padStart(4, "0")}`;
    const exists = await tx.ticket.findUnique({
      where: { ticketNumber: primary },
      select: { id: true },
    });
    return exists ? `TIC-${year}-${Date.now().toString().slice(-6)}` : primary;
  }
}
