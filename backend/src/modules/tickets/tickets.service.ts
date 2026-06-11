import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "../../generated/prisma";
import { AuditLogService } from "../../audit-log/audit-log.service";
import { CurrentUserPayload } from "../../common/interfaces/current-user.interface";
import { buildMeta, buildPagination } from "../../common/utils/pagination";
import { PrismaService } from "../../prisma/prisma.service";
import { STAFF_FIELD_CATEGORY_SET } from "../../common/enums/app.enums";
import { AppNotificationService } from "../notifications/app-notification.service";
import {
  AssignTicketDto,
  CloseTicketDto,
  CreateBackofficeTicketDto,
  CreatePortalTicketDto,
  ResolutionDto,
} from "./dto/ticket.dto";
import { TicketsQueryDto } from "./dto/tickets-query.dto";

const STAFF_ACTIVE_TICKET_STATUSES = ["OPEN", "IN_PROGRESS", "DONE"] as const;

@Injectable()
export class TicketsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditLogService,
    private readonly notification: AppNotificationService,
  ) {}

  async findAll(query: TicketsQueryDto, actor?: CurrentUserPayload) {
    const { page, limit, skip, take } = buildPagination(
      query.page,
      query.limit,
    );

    // Staff list is a work queue, not a tenant/public ticket listing.
    // Keep this branch explicit so active staff work is never filtered out by tenant/stay defaults.
    if (actor?.role === "STAFF") {
      const staffUserId = Number(actor.id);
      const staffWhere: Prisma.TicketWhereInput = {
        AND: [
          query.search
            ? {
                OR: [
                  {
                    ticketNumber: {
                      contains: query.search,
                      mode: Prisma.QueryMode.insensitive,
                    },
                  },
                  {
                    title: {
                      contains: query.search,
                      mode: Prisma.QueryMode.insensitive,
                    },
                  },
                ],
              }
            : undefined,
          query.status
            ? { status: query.status }
            : { status: { in: STAFF_ACTIVE_TICKET_STATUSES as any } },
          query.roomId ? { roomId: Number(query.roomId) } : undefined,
          query.stayId ? { stayId: Number(query.stayId) } : undefined,
          query.linkedRoomItemId
            ? { linkedRoomItemId: Number(query.linkedRoomItemId) }
            : undefined,
          query.linkedInventoryItemId
            ? { linkedInventoryItemId: Number(query.linkedInventoryItemId) }
            : undefined,
          query.assignedToId
            ? { assignedToId: Number(query.assignedToId) }
            : undefined,
          {
            OR: [
              { assignedToId: staffUserId },
              {
                staffFieldReports: { some: { reportedByStaffId: staffUserId } },
              },
            ],
          },
        ].filter(Boolean) as Prisma.TicketWhereInput[],
      };

      const [items, totalItems] = await this.prisma.$transaction([
        this.prisma.ticket.findMany({
          where: staffWhere,
          skip,
          take,
          orderBy: { id: "desc" },
          include: {
            tenant: true,
            room: true,
            stay: true,
            assignedTo: {
              select: { id: true, fullName: true, email: true, role: true },
            },
            linkedRoomItem: { include: { item: true, room: true } },
            linkedInventoryItem: true,
            staffFieldReports: {
              include: {
                requestedInventoryItem: true,
                reportedByStaff: {
                  select: { id: true, fullName: true, role: true },
                },
              },
              orderBy: { id: "desc" },
            },
          },
        }),
        this.prisma.ticket.count({ where: staffWhere }),
      ]);

      return { items, meta: buildMeta(page, limit, totalItems) };
    }

    const where: Prisma.TicketWhereInput = {
      AND: [
        query.search
          ? {
              OR: [
                {
                  ticketNumber: {
                    contains: query.search,
                    mode: Prisma.QueryMode.insensitive,
                  },
                },
                {
                  title: {
                    contains: query.search,
                    mode: Prisma.QueryMode.insensitive,
                  },
                },
              ],
            }
          : undefined,
        query.status ? { status: query.status } : undefined,
        query.tenantId ? { tenantId: Number(query.tenantId) } : undefined,
        query.roomId ? { roomId: Number(query.roomId) } : undefined,
        query.stayId ? { stayId: Number(query.stayId) } : undefined,
        query.assignedToId
          ? { assignedToId: Number(query.assignedToId) }
          : undefined,
        query.linkedRoomItemId
          ? { linkedRoomItemId: Number(query.linkedRoomItemId) }
          : undefined,
        query.linkedInventoryItemId
          ? { linkedInventoryItemId: Number(query.linkedInventoryItemId) }
          : undefined,
      ].filter(Boolean) as Prisma.TicketWhereInput[],
    };

    const [items, totalItems] = await this.prisma.$transaction([
      this.prisma.ticket.findMany({
        where,
        skip,
        take,
        orderBy: { id: "desc" },
        include: {
          tenant: true,
          room: true,
          stay: true,
          assignedTo: {
            select: { id: true, fullName: true, email: true, role: true },
          },
          linkedRoomItem: { include: { item: true, room: true } },
          linkedInventoryItem: true,
          staffFieldReports: {
            include: {
              requestedInventoryItem: true,
              reportedByStaff: {
                select: { id: true, fullName: true, role: true },
              },
            },
            orderBy: { id: "desc" },
          },
        },
      }),
      this.prisma.ticket.count({ where }),
    ]);

    return { items, meta: buildMeta(page, limit, totalItems) };
  }

  async findMine(user: CurrentUserPayload, query: TicketsQueryDto) {
    const { page, limit, skip, take } = buildPagination(
      query.page,
      query.limit,
    );
    const where: Prisma.TicketWhereInput = {
      tenantId: user.tenantId ?? -1,
      ...(query.status ? { status: query.status } : {}),
    };

    const [items, totalItems] = await this.prisma.$transaction([
      this.prisma.ticket.findMany({
        where,
        skip,
        take,
        orderBy: { id: "desc" },
        include: {
          room: true,
          stay: true,
          assignedTo: {
            select: { id: true, fullName: true, role: true },
          },
          linkedRoomItem: { include: { item: true, room: true } },
          linkedInventoryItem: true,
        },
      }),
      this.prisma.ticket.count({ where }),
    ]);

    return { items, meta: buildMeta(page, limit, totalItems) };
  }

  async findOne(id: number, user: CurrentUserPayload) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id },
      include: {
        tenant: true,
        room: true,
        stay: true,
        assignedTo: {
          select: { id: true, fullName: true, email: true, role: true },
        },
        linkedRoomItem: { include: { item: true, room: true } },
        linkedInventoryItem: true,
        staffFieldReports: {
          include: {
            requestedInventoryItem: true,
            reportedByStaff: {
              select: { id: true, fullName: true, role: true },
            },
          },
          orderBy: { id: "desc" },
        },
      },
    });

    if (!ticket) {
      throw new NotFoundException("Tiket tidak ditemukan");
    }

    if (user.role === "TENANT" && ticket.tenantId !== user.tenantId) {
      throw new ForbiddenException("Tidak berhak melihat tiket ini");
    }

    if (user.role === "STAFF") {
      const isAssignedToStaff = ticket.assignedToId === user.id;
      const hasOwnFieldReport = ticket.staffFieldReports.some(
        (report) => report.reportedByStaff?.id === user.id,
      );
      if (!isAssignedToStaff && !hasOwnFieldReport) {
        throw new ForbiddenException("Tidak berhak melihat tiket ini");
      }
    }

    return ticket;
  }

  async createBackoffice(
    dto: CreateBackofficeTicketDto,
    actor: CurrentUserPayload,
  ) {
    if (
      actor.role === "STAFF" &&
      (!dto.category || !STAFF_FIELD_CATEGORY_SET.has(dto.category as any))
    ) {
      throw new ConflictException("Jenis laporan staf tidak sesuai");
    }

    if (!dto.tenantId && actor.role !== "STAFF") {
      throw new ConflictException("Tenant wajib diisi untuk tiket admin");
    }

    if (dto.tenantId) {
      const tenant = await this.prisma.tenant.findUnique({
        where: { id: dto.tenantId },
      });
      if (!tenant) {
        throw new NotFoundException("Tenant tidak ditemukan");
      }
    }

    const context = await this.resolveTicketContext(
      dto.tenantId ?? null,
      dto.stayId,
      dto.roomId,
    );
    const created = await this.createTicketRecord({
      tenantId: dto.tenantId ?? null,
      roomId: context.roomId,
      stayId: context.stayId,
      title: dto.title,
      description: dto.description,
      category: dto.category,
      assignedToId: actor.role === "STAFF" ? actor.id : undefined,
      issueImageUrl: dto.issueImageUrl,
      issueImageFileKey: dto.issueImageFileKey,
      issueImageOriginalFilename: dto.issueImageOriginalFilename,
      issueImageMimeType: dto.issueImageMimeType,
      issueImageFileSizeBytes: dto.issueImageFileSizeBytes,
    });

    await this.audit.log({
      actorUserId: actor.id,
      action: "CREATE",
      entityType: "Ticket",
      entityId: String(created.id),
      newData: created,
      meta: { source: "BACKOFFICE" },
    });

    return created;
  }

  async createPortal(dto: CreatePortalTicketDto, user: CurrentUserPayload) {
    const tenantId = user.tenantId;
    if (!tenantId) {
      throw new ConflictException("Akun tenant belum terhubung ke data tenant");
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });
    if (!tenant) {
      throw new NotFoundException("Tenant tidak ditemukan");
    }

    const activeStay = await this.prisma.stay.findFirst({
      where: { tenantId, status: "ACTIVE" },
      orderBy: [{ checkInDate: "desc" }, { id: "desc" }],
      select: { id: true, roomId: true },
    });

    const created = await this.createTicketRecord({
      tenantId,
      roomId: activeStay?.roomId ?? null,
      stayId: activeStay?.id ?? null,
      title: dto.title,
      description: dto.description,
      category: dto.category,
      issueImageUrl: dto.issueImageUrl,
      issueImageFileKey: dto.issueImageFileKey,
      issueImageOriginalFilename: dto.issueImageOriginalFilename,
      issueImageMimeType: dto.issueImageMimeType,
      issueImageFileSizeBytes: dto.issueImageFileSizeBytes,
    });

    await this.audit.log({
      actorUserId: user.id,
      action: "CREATE",
      entityType: "Ticket",
      entityId: String(created.id),
      newData: created,
      meta: {
        source: "PORTAL",
        ignoredClientContext: {
          tenantId: dto.tenantId ?? null,
          stayId: dto.stayId ?? null,
          roomId: dto.roomId ?? null,
        },
      },
    });

    return created;
  }

  async assign(id: number, dto: AssignTicketDto, actor: CurrentUserPayload) {
    const ticket = await this.prisma.ticket.findUnique({ where: { id } });
    if (!ticket) throw new NotFoundException("Tiket tidak ditemukan");
    // Audit M-27: tiket final tidak boleh dipindah-tangankan lagi.
    if (["CLOSED", "CANCELLED"].includes(String(ticket.status))) {
      throw new ConflictException("Tiket yang sudah ditutup/dibatalkan tidak dapat di-assign ulang");
    }

    const assignee = await this.prisma.user.findUnique({
      where: { id: dto.assignedToId },
    });
    if (!assignee) throw new NotFoundException("User assignee tidak ditemukan");
    if (!["OWNER", "ADMIN", "STAFF"].includes(assignee.role)) {
      throw new ConflictException("Assignee tidak valid untuk role ticketing");
    }

    const updated = await this.prisma.ticket.update({
      where: { id },
      data: { assignedToId: dto.assignedToId },
    });
    await this.audit.log({
      actorUserId: actor.id,
      action: "ASSIGN",
      entityType: "Ticket",
      entityId: String(updated.id),
      oldData: ticket,
      newData: updated,
      meta: { assigneeId: dto.assignedToId },
    });
    return updated;
  }

  async start(id: number, actor: CurrentUserPayload) {
    const ticket = await this.prisma.ticket.findUnique({ where: { id } });
    if (!ticket) throw new NotFoundException("Tiket tidak ditemukan");
    if (ticket.status !== "OPEN")
      throw new ConflictException("Transisi status tidak valid");

    if (actor.role === "STAFF") {
      if (ticket.assignedToId && ticket.assignedToId !== actor.id) {
        throw new ConflictException("Tiket ini bukan tugas akun ini");
      }

      const [activeTicket, activeRoutine] = await Promise.all([
        this.prisma.ticket.findFirst({
          where: {
            id: { not: id },
            assignedToId: actor.id,
            status: "IN_PROGRESS",
          },
          select: { id: true, title: true, ticketNumber: true },
        }),
        this.prisma.staffRoutineCompletion.findFirst({
          where: { staffUserId: actor.id, status: "IN_PROGRESS" as any },
          include: { template: { select: { title: true } } },
        }),
      ]);

      if (activeTicket) {
        throw new ConflictException(
          `Selesaikan pekerjaan aktif dulu: ${activeTicket.title || activeTicket.ticketNumber || `Tiket #${activeTicket.id}`}`,
        );
      }
      if (activeRoutine) {
        throw new ConflictException(
          `Selesaikan pekerjaan aktif dulu: ${activeRoutine.template?.title || `Pekerjaan rutin #${activeRoutine.id}`}`,
        );
      }
    }

    const updated = await this.prisma.ticket.update({
      where: { id },
      data: {
        status: "IN_PROGRESS",
        ...(actor.role === "STAFF" ? { assignedToId: actor.id } : {}),
      },
    });
    await this.audit.log({
      actorUserId: actor.id,
      action: "START",
      entityType: "Ticket",
      entityId: String(updated.id),
      oldData: ticket,
      newData: updated,
    });
    return updated;
  }

  async markDone(id: number, dto: ResolutionDto, actor: CurrentUserPayload) {
    const ticket = await this.prisma.ticket.findUnique({ where: { id } });
    if (!ticket) throw new NotFoundException("Tiket tidak ditemukan");
    if (ticket.status !== "IN_PROGRESS")
      throw new ConflictException("Transisi status tidak valid");
    // Audit M-26: guard yang sama dengan start() — staf bukan assignee tidak
    // boleh menyelesaikan tiket staf lain.
    if (actor.role === "STAFF" && ticket.assignedToId !== actor.id) {
      throw new ConflictException("Tiket ini bukan tugas akun ini");
    }

    const updated = await this.prisma.ticket.update({
      where: { id },
      data: {
        status: "DONE",
        resolutionNote: dto.resolutionNote,
        resolvedAt: new Date(),
        resolutionImageUrl: dto.resolutionImageUrl,
        resolutionImageFileKey: dto.resolutionImageFileKey,
        resolutionImageOriginalFilename: dto.resolutionImageOriginalFilename,
        resolutionImageMimeType: dto.resolutionImageMimeType,
        resolutionImageFileSizeBytes: dto.resolutionImageFileSizeBytes,
      },
    });

    await this.audit.log({
      actorUserId: actor.id,
      action: "MARK_DONE",
      entityType: "Ticket",
      entityId: String(updated.id),
      oldData: ticket,
      newData: updated,
    });

    return updated;
  }

  async close(id: number, dto: CloseTicketDto, actor: CurrentUserPayload) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id },
      include: {
        staffFieldReports: {
          select: { roomItemId: true, inventoryItemId: true },
          orderBy: { id: "desc" },
        },
      },
    });
    if (!ticket) throw new NotFoundException("Tiket tidak ditemukan");

    if (dto.action === "CLOSE") {
      if (ticket.status !== "DONE")
        throw new ConflictException("Transisi status tidak valid");
      if (!dto.finalAdminNote?.trim() || dto.finalAdminNote.trim().length < 8) {
        throw new ConflictException(
          "Catatan final admin wajib diisi minimal 8 karakter sebelum tiket ditutup.",
        );
      }
      const reportedRoomItemId =
        ticket.staffFieldReports.find((report) => report.roomItemId)
          ?.roomItemId ?? null;
      const reportedInventoryItemId =
        ticket.staffFieldReports.find((report) => report.inventoryItemId)
          ?.inventoryItemId ?? null;
      const roomItemId =
        dto.finalRoomItemId ?? ticket.linkedRoomItemId ?? reportedRoomItemId;
      const inventoryItemId =
        dto.finalInventoryItemId ??
        ticket.linkedInventoryItemId ??
        reportedInventoryItemId;
      if (roomItemId && !dto.finalRoomItemStatus)
        throw new ConflictException(
          "Status akhir barang kamar wajib dipilih sebelum tiket ditutup.",
        );
      if (inventoryItemId && !dto.finalInventoryItemStatus)
        throw new ConflictException(
          "Status akhir barang gudang wajib dipilih sebelum tiket ditutup.",
        );

      let roomMarkedReady = false;
      let roomReadyBlockedReason: string | null = null;

      const updated = await this.prisma.$transaction(async (tx) => {
        const closed = await tx.ticket.update({
          where: { id },
          data: {
            status: "CLOSED",
            resolutionNote: dto.resolutionNote ?? ticket.resolutionNote,
            linkedRoomItemId:
              ticket.linkedRoomItemId ?? roomItemId ?? undefined,
            linkedInventoryItemId:
              ticket.linkedInventoryItemId ?? inventoryItemId ?? undefined,
            finalRoomItemStatus: dto.finalRoomItemStatus as any,
            finalInventoryItemStatus: dto.finalInventoryItemStatus as any,
            finalAdminNote: dto.finalAdminNote,
            closedAt: new Date(),
          },
        });

        if (roomItemId && dto.finalRoomItemStatus) {
          const roomItem = await tx.roomItem.findUnique({
            where: { id: roomItemId },
            select: { note: true },
          });
          await tx.roomItem.update({
            where: { id: roomItemId },
            data: {
              status: dto.finalRoomItemStatus as any,
              note:
                [
                  roomItem?.note,
                  dto.finalAdminNote
                    ? `Admin final: ${dto.finalAdminNote}`
                    : null,
                ]
                  .filter(Boolean)
                  .join("\n") || undefined,
            },
          });
        }

        if (inventoryItemId && dto.finalInventoryItemStatus) {
          const inventoryItem = await tx.inventoryItem.findUnique({
            where: { id: inventoryItemId },
            select: { notes: true },
          });
          await tx.inventoryItem.update({
            where: { id: inventoryItemId },
            data: {
              status: dto.finalInventoryItemStatus as any,
              notes:
                [
                  inventoryItem?.notes,
                  dto.finalAdminNote
                    ? `Admin final: ${dto.finalAdminNote}`
                    : null,
                ]
                  .filter(Boolean)
                  .join("\n") || undefined,
            },
          });
        }

        await tx.staffFieldReport.updateMany({
          where: {
            ticketId: id,
            status: { notIn: ["CLOSED", "REJECTED"] as any },
          },
          data: { status: "CLOSED" as any },
        });

        // BARANG_PINDAH: log movement completion in audit metadata
        if (ticket.category === "BARANG_PINDAH") {
          const moveDesc = ticket.description || '';
          const fromMatch = moveDesc.match(/Dari:\s*(.+)/i);
          const toMatch = moveDesc.match(/Ke:\s*(.+)/i);
          const itemMatch = moveDesc.match(/Barang:\s*(.+?)\s*\(/i);
          const qtyMatch = moveDesc.match(/\((\d+)\s*unit\)/i);
          if (fromMatch || toMatch || itemMatch) {
            await this.notification.create({
              recipientUserId: actor.id,
              title: '📦 Tiket Pindah Barang Selesai',
              body: `Tiket "${ticket.title}" ditutup. ${itemMatch?.[1] ? `Barang: ${itemMatch[1]}` : ''} ${fromMatch?.[1] ? `dari ${fromMatch[1]}` : ''} ${toMatch?.[1] ? `ke ${toMatch[1]}` : ''}. Catatan: ${dto.finalAdminNote}`,
              linkTo: `/tickets`,
              entityType: 'Ticket',
              entityId: String(closed.id),
            });
          }
        }

        if (ticket.category === "CHECKOUT_INSPECTION" && ticket.roomId) {
          // Bedakan penghuni aktif (promoted) dari booking baru yang belum huni:
          // kamar bekas overstay boleh dipesan saat masih dibersihkan, jadi
          // adanya booking TIDAK memblokir penutupan tiket pembersihan.
          const otherPromotedStays = await tx.stay.count({
            where: {
              roomId: ticket.roomId,
              status: "ACTIVE" as any,
              initialMetersPromotedAt: { not: null },
              id: ticket.stayId ? { not: ticket.stayId } : undefined,
            },
          });
          const otherBookingStays = await tx.stay.count({
            where: {
              roomId: ticket.roomId,
              status: "ACTIVE" as any,
              initialMetersPromotedAt: null,
              id: ticket.stayId ? { not: ticket.stayId } : undefined,
            },
          });
          const hasProblemFinalStatus =
            (dto.finalRoomItemStatus && dto.finalRoomItemStatus !== "GOOD") ||
            (dto.finalInventoryItemStatus && dto.finalInventoryItemStatus !== "GOOD");

          if (otherPromotedStays > 0) {
            roomReadyBlockedReason = "ACTIVE_STAY_EXISTS";
          } else if (hasProblemFinalStatus) {
            roomReadyBlockedReason = "FINAL_ITEM_STATUS_NOT_READY";
          } else if (otherBookingStays > 0) {
            // Kamar sudah dipesan selama pembersihan: status biarkan RESERVED
            // (mengikuti booking), cukup matikan flag kotor — pelunasan booking
            // kini bisa disetujui (gate aktivasi terbuka).
            await tx.room.update({
              where: { id: ticket.roomId },
              data: { allowBookingWhileCleaning: false },
            });
            roomMarkedReady = true;
            roomReadyBlockedReason = "ROOM_BOOKED_DURING_CLEANING_NOW_READY";
          } else {
            const readyResult = await tx.room.updateMany({
              where: { id: ticket.roomId, status: "MAINTENANCE" as any },
              data: { status: "AVAILABLE" as any, allowBookingWhileCleaning: false },
            });
            roomMarkedReady = readyResult.count === 1;
            if (!roomMarkedReady) {
              roomReadyBlockedReason = "ROOM_NOT_IN_MAINTENANCE";
            }
          }
        }

        return closed;
      });

      await this.audit.log({
        actorUserId: actor.id,
        action: "CLOSE",
        entityType: "Ticket",
        entityId: String(updated.id),
        oldData: ticket,
        newData: updated,
        meta: {
          resolutionNoteProvided: !!dto.resolutionNote,
          finalAdminNoteProvided: !!dto.finalAdminNote,
          finalRoomItemStatus: dto.finalRoomItemStatus,
          finalInventoryItemStatus: dto.finalInventoryItemStatus,
          roomMarkedReady,
          roomReadyBlockedReason,
          roomReadinessTransition: roomMarkedReady
            ? "MAINTENANCE_TO_AVAILABLE"
            : undefined,
        },
      });

      return updated;
    }

    if (ticket.status !== "OPEN")
      throw new ConflictException("Transisi status tidak valid");

    const updated = await this.prisma.ticket.update({
      where: { id },
      data: {
        status: "CANCELLED",
        resolutionNote: dto.resolutionNote ?? ticket.resolutionNote,
      },
    });

    await this.audit.log({
      actorUserId: actor.id,
      action: "CANCEL",
      entityType: "Ticket",
      entityId: String(updated.id),
      oldData: ticket,
      newData: updated,
      meta: { resolutionNoteProvided: !!dto.resolutionNote },
    });

    return updated;
  }

  private async resolveTicketContext(
    tenantId: number | null,
    stayId?: number,
    roomId?: number,
  ) {
    const activeStay = tenantId
      ? await this.prisma.stay.findFirst({
          where: { tenantId, status: "ACTIVE" },
          orderBy: [{ checkInDate: "desc" }, { id: "desc" }],
          select: { id: true, roomId: true },
        })
      : null;

    let resolvedStayId = stayId ?? activeStay?.id ?? null;
    let resolvedRoomId = roomId ?? activeStay?.roomId ?? null;

    if (stayId) {
      const stay = await this.prisma.stay.findUnique({ where: { id: stayId } });
      if (!stay) throw new NotFoundException("Stay tidak ditemukan");
      if (tenantId && stay.tenantId !== tenantId) {
        throw new ConflictException("Data stay tidak konsisten dengan tenant");
      }

      resolvedStayId = stay.id;
      resolvedRoomId = stay.roomId;

      if (roomId && stay.roomId !== roomId) {
        throw new ConflictException("Data room/stay tidak konsisten");
      }
    }

    if (roomId && !stayId) {
      const room = await this.prisma.room.findUnique({ where: { id: roomId } });
      if (!room) throw new NotFoundException("Kamar tidak ditemukan");
      resolvedRoomId = room.id;
    }

    return { stayId: resolvedStayId, roomId: resolvedRoomId };
  }

  private async generateTicketNumber() {
    const year = new Date().getFullYear();
    const count = await this.prisma.ticket.count({
      where: { ticketNumber: { startsWith: `TIC-${year}-` } },
    });
    return `TIC-${year}-${String(count + 1).padStart(4, "0")}`;
  }

  private async createTicketRecord(input: {
    tenantId: number | null;
    roomId: number | null;
    stayId: number | null;
    title: string;
    description: string;
    category?: string;
    assignedToId?: number;
    issueImageUrl?: string;
    issueImageFileKey?: string;
    issueImageOriginalFilename?: string;
    issueImageMimeType?: string;
    issueImageFileSizeBytes?: number;
  }) {
    const baseData = {
      tenantId: input.tenantId,
      roomId: input.roomId,
      stayId: input.stayId,
      title: input.title,
      description: input.description,
      category: input.category,
      assignedToId: input.assignedToId,
      issueImageUrl: input.issueImageUrl,
      issueImageFileKey: input.issueImageFileKey,
      issueImageOriginalFilename: input.issueImageOriginalFilename,
      issueImageMimeType: input.issueImageMimeType,
      issueImageFileSizeBytes: input.issueImageFileSizeBytes,
    };
    const primaryTicketNumber = await this.generateTicketNumber();

    try {
      return await this.prisma.ticket.create({
        data: {
          ticketNumber: primaryTicketNumber,
          ...baseData,
        },
      });
    } catch (error) {
      if (
        !(error instanceof Prisma.PrismaClientKnownRequestError) ||
        error.code !== "P2002"
      ) {
        throw error;
      }

      const fallbackTicketNumber = `TIC-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
      return this.prisma.ticket.create({
        data: {
          ticketNumber: fallbackTicketNumber,
          ...baseData,
        },
      });
    }
  }
}
