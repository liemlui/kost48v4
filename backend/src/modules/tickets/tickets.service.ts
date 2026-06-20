import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "../../generated/prisma";
import { AuditLogService } from "../../audit-log/audit-log.service";
import { CurrentUserPayload } from "../../common/interfaces/current-user.interface";
import { buildMeta, buildPagination } from "../../common/utils/pagination";
import { PrismaService } from "../../prisma/prisma.service";
import { STAFF_FIELD_CATEGORY_SET, UserRole } from "../../common/enums/app.enums";
import { generateTicketNumberTx } from "../../common/utils/ticket-number.util";
import { pickRoundRobinStaffTx } from "../../common/utils/staff-assignment.util";
import { computeTicketDueAt } from "./ticket-sla";
import { AppNotificationService } from "../notifications/app-notification.service";
import { LoyaltyService } from "../loyalty/loyalty.service";
import {
  AssignTicketDto,
  CloseTicketDto,
  CreateBackofficeTicketDto,
  CreatePortalTicketDto,
  MarkTicketVendorDto,
  ResolutionDto,
} from "./dto/ticket.dto";
import { TicketsQueryDto } from "./dto/tickets-query.dto";

const STAFF_ACTIVE_TICKET_STATUSES = ["OPEN", "IN_PROGRESS", "DONE"] as const;

@Injectable()
export class TicketsService {
  private readonly logger = new Logger(TicketsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditLogService,
    private readonly notification: AppNotificationService,
    private readonly loyalty: LoyaltyService,
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
            select: { id: true, fullName: true, role: true, tipGopay: true, tipOvo: true, tipDana: true, tipShopeepay: true, tipBank: true },
          },
          linkedRoomItem: { include: { item: true, room: true } },
          linkedInventoryItem: true,
        },
      }),
      this.prisma.ticket.count({ where }),
    ]);

    // T-1: tandai tiket yang tip-nya sudah di-acknowledge penghuni (agar tombol tak dobel).
    const ackIds = new Set<number>();
    if (items.length) {
      const acks = await this.prisma.staffPerformanceEvent.findMany({
        where: { eventType: 'TIP_RECEIVED' as any, sourceType: 'TICKET' as any, sourceId: { in: items.map((t) => t.id) } },
        select: { sourceId: true },
      });
      for (const a of acks) if (a.sourceId != null) ackIds.add(a.sourceId);
    }
    const enriched = items.map((t) => ({ ...t, tipAcknowledged: ackIds.has(t.id) }));

    return { items: enriched, meta: buildMeta(page, limit, totalItems) };
  }

  // STF-TIP-FLOW: staff konfirmasi tip (Sudah/Belum masuk). Idempoten, hanya sekali konfirmasi per tiket.
  async confirmTip(ticketId: number, staffId: number, received: boolean) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
      select: { id: true, tenantId: true, assignedToId: true, status: true },
    });
    if (!ticket) throw new NotFoundException('Tiket tidak ditemukan');
    if (ticket.assignedToId !== staffId) {
      throw new ForbiddenException('Anda bukan penanggung jawab tiket ini');
    }
    if (!ticket.tenantId) throw new BadRequestException('Tiket ini tidak memiliki tenant');

    // Cegah konfirmasi dobel: cek apakah sudah ada event TIP_CONFIRMED
    const existing = await this.prisma.staffPerformanceEvent.findFirst({
      where: { eventType: 'TIP_CONFIRMED' as any, sourceType: 'TICKET' as any, sourceId: ticketId },
      select: { id: true },
    });
    if (existing) throw new ConflictException('Konfirmasi tip untuk tiket ini sudah ada');

    // Catat konfirmasi
    await this.prisma.staffPerformanceEvent.create({
      data: {
        staffId,
        sourceType: 'TICKET' as any,
        sourceId: ticketId,
        eventType: 'TIP_CONFIRMED' as any,
        scoreDelta: 0,
        reason: received ? 'Tip dikonfirmasi staf: sudah masuk' : 'Tip dikonfirmasi staf: belum masuk',
      },
    });

    // Notif balik ke tenant
    await this.notification.createOnce({
      recipientUserId: ticket.tenantId,
      title: received ? '✅ Tip dikonfirmasi staf' : '⚠️ Tip belum dikonfirmasi staf',
      body: received
        ? 'Staf mengkonfirmasi tip sudah diterima. Terima kasih!'
        : 'Staf menyatakan tip belum masuk. Silakan cek kembali transfer Anda.',
      linkTo: `/tickets/${ticketId}`,
      entityType: 'Ticket',
      entityId: String(ticketId),
    });

    return { confirmed: true, received };
  }

  /**
   * T-1: penghuni menandai "sudah beri tip" untuk staf yang menangani tiket (P2P, di luar buku kos).
   * Tercatat sebagai StaffPerformanceEvent TIP_RECEIVED (scoreDelta 0 — hanya HITUNGAN, bukan nominal,
   * tidak memengaruhi skor KPI). Idempotent per tiket (sekali hitung).
   */
  async acknowledgeTip(ticketId: number, user: CurrentUserPayload) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
      select: { id: true, tenantId: true, assignedToId: true, status: true },
    });
    if (!ticket) throw new NotFoundException('Tiket tidak ditemukan');
    if (user.role === 'TENANT' && ticket.tenantId !== user.tenantId) {
      throw new ForbiddenException('Tidak berhak menandai tip untuk tiket ini');
    }
    if (!ticket.assignedToId) throw new BadRequestException('Tiket ini belum punya staf penanggung jawab.');
    if (!['DONE', 'CLOSED'].includes(String(ticket.status).toUpperCase())) {
      throw new BadRequestException('Tip hanya bisa ditandai setelah tiket selesai.');
    }
    const existing = await this.prisma.staffPerformanceEvent.findFirst({
      where: { eventType: 'TIP_RECEIVED' as any, sourceType: 'TICKET' as any, sourceId: ticketId },
      select: { id: true },
    });
    if (existing) return { acknowledged: true, alreadyRecorded: true };
    await this.prisma.staffPerformanceEvent.create({
      data: {
        staffId: ticket.assignedToId,
        sourceType: 'TICKET' as any,
        sourceId: ticketId,
        eventType: 'TIP_RECEIVED' as any,
        scoreDelta: 0,
        reason: 'Tip diberikan penghuni (P2P, tanpa nominal)',
      },
    });

    // STF-TIP-FLOW: notif staff bahwa tenant mengakui tip (P2P, di luar buku kos).
    await this.notification.createOnce({
      recipientUserId: ticket.assignedToId,
      title: '🙏 Tip dari penghuni',
      body: 'Penghuni mengakui sudah memberi tip untuk tiket ini. Silakan cek e-wallet dan konfirmasi.',
      linkTo: `/tickets/${ticketId}`,
      entityType: 'Ticket',
      entityId: String(ticketId),
    });

    return { acknowledged: true, alreadyRecorded: false };
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

  async canAccessImage(fileKey: string, user: CurrentUserPayload) {
    const ticket = await this.prisma.ticket.findFirst({
      where: {
        OR: [
          { issueImageFileKey: fileKey },
          { resolutionImageFileKey: fileKey },
          { issueImageUrl: { endsWith: `/${fileKey}` } },
          { resolutionImageUrl: { endsWith: `/${fileKey}` } },
        ],
      },
      select: {
        tenantId: true,
        assignedToId: true,
        staffFieldReports: {
          where: { reportedByStaffId: user.id },
          select: { id: true },
          take: 1,
        },
      },
    });

    // Routine evidence is stored outside Ticket. It remains protected by
    // authentication plus an unguessable random filename.
    if (!ticket) return true;
    if (user.role === "OWNER" || user.role === "ADMIN") return true;
    if (user.role === "TENANT") return ticket.tenantId === user.tenantId;
    if (user.role === "STAFF") {
      return ticket.assignedToId === user.id || ticket.staffFieldReports.length > 0;
    }
    return false;
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

    // F3-19: set assignedAt + dueAt (SLA) saat penugasan PERTAMA (clock SLA mulai
    // dari penugasan, bukan pembuatan). Re-assign tak me-reset jam SLA.
    const slaPatch =
      ticket.assignedAt == null
        ? { assignedAt: new Date(), dueAt: computeTicketDueAt(ticket.category, new Date()) }
        : {};
    const updated = await this.prisma.ticket.update({
      where: { id },
      data: { assignedToId: dto.assignedToId, ...slaPatch },
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
    // F3-1: beri tahu penerima tugas (di luar audit, best-effort) hanya saat
    // assignee benar-benar berubah — hindari notif duplikat untuk reassign no-op.
    if (ticket.assignedToId !== dto.assignedToId) {
      await this.notifyTicketAssigned(updated.id, dto.assignedToId, actor.id);
    }
    return updated;
  }

  /**
   * F5-3 (AUD-5 / D-22.2): tandai tiket dikerjakan vendor luar (mis. cuci AC).
   * handledByVendor=true → kosongkan assignee staf (keluar round-robin/KPI staf);
   * false → lepas penanda vendor (assignee bisa di-set lagi via assign).
   */
  async markVendor(id: number, dto: MarkTicketVendorDto, actor: CurrentUserPayload) {
    const ticket = await this.prisma.ticket.findUnique({ where: { id } });
    if (!ticket) throw new NotFoundException("Tiket tidak ditemukan");
    if (["CLOSED", "CANCELLED"].includes(String(ticket.status))) {
      throw new ConflictException("Tiket yang sudah ditutup/dibatalkan tidak dapat diubah");
    }
    const updated = await this.prisma.ticket.update({
      where: { id },
      data: {
        handledByVendor: dto.handledByVendor,
        vendorNote: dto.handledByVendor ? (dto.vendorNote ?? null) : null,
        // saat ditandai vendor, lepas assignee staf agar tak terhitung beban/KPI staf
        ...(dto.handledByVendor ? { assignedToId: null } : {}),
      },
    });
    await this.audit.log({
      actorUserId: actor.id,
      action: "UPDATE",
      entityType: "Ticket",
      entityId: String(updated.id),
      oldData: ticket,
      newData: updated,
      meta: { handledByVendor: dto.handledByVendor },
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

    // F3-19: bila tiket dikerjakan tanpa pernah di-assign formal (mis. STAFF
    // mulai langsung), mulai jam SLA sekarang.
    const slaPatch =
      ticket.assignedAt == null
        ? { assignedAt: new Date(), dueAt: computeTicketDueAt(ticket.category, new Date()) }
        : {};
    const updated = await this.prisma.ticket.update({
      where: { id },
      data: {
        status: "IN_PROGRESS",
        ...(actor.role === "STAFF" ? { assignedToId: actor.id } : {}),
        ...slaPatch,
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
    const isVendor = (ticket as any).handledByVendor === true;
    if (isVendor) {
      // Vendor tickets: admin dapat langsung menandai selesai dari OPEN tanpa melewati IN_PROGRESS.
      if (!["OPEN", "IN_PROGRESS"].includes(String(ticket.status))) {
        throw new ConflictException("Transisi status tidak valid");
      }
    } else {
      if (ticket.status !== "IN_PROGRESS")
        throw new ConflictException("Transisi status tidak valid");
      // Audit M-26: guard yang sama dengan start() — staf bukan assignee tidak
      // boleh menyelesaikan tiket staf lain.
      if (actor.role === "STAFF" && ticket.assignedToId !== actor.id) {
        throw new ConflictException("Tiket ini bukan tugas akun ini");
      }
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

    await this.notifyTenantReviewPrompt(updated.id);
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

    // Tenant dapat menutup tiket miliknya sendiri yang sudah DONE (konfirmasi penyelesaian).
    if (actor.role === UserRole.TENANT) {
      if (ticket.tenantId !== actor.tenantId) {
        throw new ForbiddenException("Tidak berhak menutup tiket ini");
      }
      if (dto.action !== "CLOSE") {
        throw new ForbiddenException("Tenant hanya dapat menutup tiket, tidak membatalkan");
      }
      if (ticket.status !== "DONE") {
        throw new ConflictException("Tiket harus berstatus DONE sebelum dapat ditutup oleh penghuni");
      }
      const closed = await this.prisma.ticket.update({
        where: { id },
        data: { status: "CLOSED", closedAt: new Date() },
      });
      await this.audit.log({
        actorUserId: actor.id,
        action: "CLOSE",
        entityType: "Ticket",
        entityId: String(closed.id),
        oldData: ticket,
        newData: closed,
        meta: { closedByTenant: true },
      });
      await this.notifyTenantReviewPrompt(closed.id);
      return closed;
    }

    // F2-18 (invarian dossier 15): STAFF HANYA boleh menutup tiket CHECKOUT_INSPECTION.
    // Kategori lain (admin/keuangan/dll) tetap ditutup OWNER/ADMIN.
    if (actor.role === UserRole.STAFF && ticket.category !== "CHECKOUT_INSPECTION") {
      throw new ForbiddenException(
        "Staf hanya dapat menutup tiket inspeksi checkout (CHECKOUT_INSPECTION). Tiket kategori lain ditutup admin/owner.",
      );
    }

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

        // F4-15: tiket cuci AC selesai → reset jadwal AC kamar (acLastCleanedAt = sekarang).
        if (ticket.category === 'AC_CLEANING' && ticket.roomId) {
          await tx.room.update({ where: { id: ticket.roomId }, data: { acLastCleanedAt: new Date() } });
        }

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

      await this.notifyTenantReviewPrompt(updated.id);

      // F4-9: poin lapor-masalah-tervalidasi — HANYA tiket yang dibuat tenant via portal
      // (sumber PORTAL di audit) dan kini ditutup (divalidasi admin). Idempotent per
      // ticketId, best-effort di luar tx.
      if (ticket.tenantId) {
        const tenantId = ticket.tenantId;
        this.prisma.auditLog
          .findFirst({
            where: {
              entityType: 'Ticket',
              entityId: String(ticket.id),
              action: 'CREATE',
              meta: { path: ['source'], equals: 'PORTAL' },
            },
            select: { id: true },
          })
          .then((portalCreate) => {
            if (portalCreate) {
              return this.loyalty.earnSafe(tenantId, 'VALIDATED_REPORT', String(ticket.id), {
                note: `Laporan tervalidasi tiket ${ticket.ticketNumber}`,
                createdById: actor.id,
              });
            }
            return undefined;
          })
          .catch(() => undefined);
      }

      // F3-1: notif pasca-commit (best-effort, di luar tx) —
      // K-6/K-8: pindah barang selesai → penerima = staf assignee (bukan actor);
      // room-ready: inspeksi checkout membuat kamar AVAILABLE → OWNER/ADMIN.
      if (ticket.category === "BARANG_PINDAH") {
        await this.notifyBarangPindahClosed(
          {
            id: ticket.id,
            title: ticket.title,
            description: ticket.description,
            assignedToId: ticket.assignedToId,
          },
          dto.finalAdminNote,
        );
      }
      if (roomMarkedReady && ticket.roomId) {
        await this.notifyRoomReady(ticket.roomId, updated.id);
      }
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

  private async notifyTenantReviewPrompt(ticketId: number) {
    try {
      const ticket = await this.prisma.ticket.findUnique({
        where: { id: ticketId },
        select: {
          id: true,
          ticketNumber: true,
          title: true,
          status: true,
          tenant: {
            select: {
              user: {
                select: { id: true, isActive: true },
              },
            },
          },
          assignedTo: {
            select: { fullName: true, role: true },
          },
        },
      });

      const tenantUser = ticket?.tenant?.user;
      if (
        !ticket ||
        !["DONE", "CLOSED"].includes(String(ticket.status)) ||
        !tenantUser?.isActive ||
        ticket.assignedTo?.role !== UserRole.STAFF
      ) {
        return;
      }

      const ticketLabel = ticket.title || ticket.ticketNumber || `Tiket #${ticket.id}`;
      const staffLabel = ticket.assignedTo.fullName || "staff";
      await this.notification.createOnce({
        recipientUserId: tenantUser.id,
        title: "Nilai Hasil Pekerjaan",
        body: `Pekerjaan "${ticketLabel}" oleh ${staffLabel} sudah selesai. Beri rating untuk membantu menjaga kualitas layanan.`,
        linkTo: "/portal/tickets",
        entityType: "TicketReviewPrompt",
        entityId: String(ticket.id),
      });
    } catch (error) {
      this.logger.warn(
        `Gagal mengirim ajakan review tenant untuk ticket #${ticketId}`,
        (error as Error)?.message ?? error,
      );
    }
  }


  // F3-1: penerima tugas tiket diberi tahu (best-effort, di luar tx).
  private async notifyTicketAssigned(
    ticketId: number,
    assigneeId: number,
    actorId: number,
  ) {
    // Jangan beri notif bila seseorang menugaskan tiket ke dirinya sendiri.
    if (assigneeId === actorId) return;
    try {
      const [assignee, ticket] = await Promise.all([
        this.prisma.user.findUnique({
          where: { id: assigneeId },
          select: { id: true, isActive: true },
        }),
        this.prisma.ticket.findUnique({
          where: { id: ticketId },
          select: {
            id: true,
            ticketNumber: true,
            title: true,
            room: { select: { code: true, name: true } },
          },
        }),
      ]);
      if (!assignee?.isActive || !ticket) return;

      const ticketLabel =
        ticket.title || ticket.ticketNumber || `Tiket #${ticket.id}`;
      const roomLabel = ticket.room?.code
        ? ` Kamar ${ticket.room.code}${ticket.room.name ? ` - ${ticket.room.name}` : ""}.`
        : "";
      await this.notification.create({
        recipientUserId: assignee.id,
        title: "Tiket Ditugaskan ke Anda",
        body: `Anda ditugaskan menangani "${ticketLabel}".${roomLabel}`,
        linkTo: "/tickets",
        entityType: "Ticket",
        entityId: String(ticket.id),
      });
    } catch (error) {
      this.logger.warn(
        `Gagal mengirim notifikasi penugasan tiket #${ticketId}`,
        (error as Error)?.message ?? error,
      );
    }
  }

  // F3-1 (K-6/K-8): tiket pindah barang yang ditutup memberi tahu staf
  // assignee yang melakukan pemindahan — bukan admin yang menutup.
  private async notifyBarangPindahClosed(
    ticket: {
      id: number;
      title: string | null;
      description: string | null;
      assignedToId: number | null;
    },
    finalAdminNote?: string,
  ) {
    if (!ticket.assignedToId) return;
    try {
      const moveDesc = ticket.description || "";
      const fromMatch = moveDesc.match(/Dari:\s*(.+)/i);
      const toMatch = moveDesc.match(/Ke:\s*(.+)/i);
      const itemMatch = moveDesc.match(/Barang:\s*(.+?)\s*\(/i);
      if (!fromMatch && !toMatch && !itemMatch) return;

      const assignee = await this.prisma.user.findUnique({
        where: { id: ticket.assignedToId },
        select: { id: true, isActive: true },
      });
      if (!assignee?.isActive) return;

      const detail = [
        itemMatch?.[1] ? `Barang: ${itemMatch[1]}` : null,
        fromMatch?.[1] ? `dari ${fromMatch[1]}` : null,
        toMatch?.[1] ? `ke ${toMatch[1]}` : null,
      ]
        .filter(Boolean)
        .join(" ");
      await this.notification.create({
        recipientUserId: assignee.id,
        title: "📦 Tiket Pindah Barang Selesai",
        body: `Tiket "${ticket.title}" ditutup. ${detail}. Catatan: ${finalAdminNote ?? "-"}`,
        linkTo: "/tickets",
        entityType: "Ticket",
        entityId: String(ticket.id),
      });
    } catch (error) {
      this.logger.warn(
        `Gagal mengirim notifikasi pindah barang untuk tiket #${ticket.id}`,
        (error as Error)?.message ?? error,
      );
    }
  }

  // F3-1: kamar kembali AVAILABLE setelah inspeksi checkout → OWNER/ADMIN.
  private async notifyRoomReady(roomId: number, ticketId: number) {
    try {
      const [ownerAdminUsers, room] = await Promise.all([
        this.prisma.user.findMany({
          where: {
            role: { in: [UserRole.OWNER, UserRole.ADMIN] },
            isActive: true,
          },
          select: { id: true },
        }),
        this.prisma.room.findUnique({
          where: { id: roomId },
          select: { code: true, name: true },
        }),
      ]);
      if (ownerAdminUsers.length === 0 || !room) return;

      const roomLabel = `${room.code}${room.name ? ` - ${room.name}` : ""}`;
      await Promise.allSettled(
        ownerAdminUsers.map((user) =>
          this.notification.createOnce({
            recipientUserId: user.id,
            title: "Kamar Siap Dihuni",
            body: `Inspeksi checkout selesai. Kamar ${roomLabel} kini AVAILABLE dan siap dipasarkan/dihuni.`,
            linkTo: "/rooms",
            entityType: "RoomReady",
            entityId: String(ticketId),
          }),
        ),
      );
    } catch (error) {
      this.logger.warn(
        `Gagal mengirim notifikasi kamar siap untuk room #${roomId} (tiket #${ticketId})`,
        (error as Error)?.message ?? error,
      );
    }
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
    return this.prisma.$transaction(async (tx) => {
      const ticketNumber = await generateTicketNumberTx(tx);
      // F2-10 (K-4): round-robin penugasan bila belum ada assignee.
      const assignedToId = input.assignedToId ?? (await this.pickStaffAssigneeTx(tx));
      return tx.ticket.create({
        data: {
          ticketNumber,
          ...baseData,
          assignedToId,
        },
      });
    });
  }

  /**
   * F2-10 (K-4): pilih staf penerima tiket. DISIAPKAN tapi DORMAN saat staf < 2
   * (semua tiket ke satu-satunya staf). Saat staf ≥ 2 → round-robin berbasis beban:
   * staf dengan tiket aktif paling sedikit. (Ide owner 2026-06-15.)
   */
  private async pickStaffAssigneeTx(tx: any): Promise<number | undefined> {
    // F5-3: konsolidasi ke util bersama (dipakai juga auto-ops/stays/room-transfer/loyalty).
    return pickRoundRobinStaffTx(tx);
  }
}
