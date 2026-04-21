import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { AuditLogService } from '../../audit-log/audit-log.service';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import { buildMeta, buildPagination } from '../../common/utils/pagination';
import { PrismaService } from '../../prisma/prisma.service';
import {
  AssignTicketDto,
  CloseTicketDto,
  CreateBackofficeTicketDto,
  CreatePortalTicketDto,
  ResolutionDto,
} from './dto/ticket.dto';
import { TicketsQueryDto } from './dto/tickets-query.dto';

@Injectable()
export class TicketsService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditLogService) {}

  async findAll(query: TicketsQueryDto) {
    const { page, limit, skip, take } = buildPagination(query.page, query.limit);
    const where: any = {
      AND: [
        query.search
          ? {
              OR: [
                { ticketNumber: { contains: query.search, mode: 'insensitive' } },
                { title: { contains: query.search, mode: 'insensitive' } },
              ],
            }
          : {},
        query.status ? { status: query.status } : {},
        query.tenantId ? { tenantId: Number(query.tenantId) } : {},
        query.roomId ? { roomId: Number(query.roomId) } : {},
        query.stayId ? { stayId: Number(query.stayId) } : {},
        query.assignedToId ? { assignedToId: Number(query.assignedToId) } : {},
      ],
    };

    const [items, totalItems] = await this.prisma.$transaction([
      this.prisma.ticket.findMany({
        where,
        skip,
        take,
        orderBy: { id: 'desc' },
        include: {
          tenant: true,
          room: true,
          stay: true,
          assignedTo: {
            select: { id: true, fullName: true, email: true, role: true },
          },
        },
      }),
      this.prisma.ticket.count({ where }),
    ]);

    return { items, meta: buildMeta(page, limit, totalItems) };
  }

  async findMine(user: CurrentUserPayload, query: TicketsQueryDto) {
    const { page, limit, skip, take } = buildPagination(query.page, query.limit);
    const where: any = {
      tenantId: user.tenantId ?? -1,
      ...(query.status ? { status: query.status } : {}),
    };

    const [items, totalItems] = await this.prisma.$transaction([
      this.prisma.ticket.findMany({
        where,
        skip,
        take,
        orderBy: { id: 'desc' },
        include: {
          room: true,
          stay: true,
          assignedTo: {
            select: { id: true, fullName: true, role: true },
          },
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
      },
    });

    if (!ticket) {
      throw new NotFoundException('Tiket tidak ditemukan');
    }

    if (user.role === 'TENANT' && ticket.tenantId !== user.tenantId) {
      throw new ForbiddenException('Tidak berhak melihat tiket ini');
    }

    return ticket;
  }

  async createBackoffice(dto: CreateBackofficeTicketDto, actor: CurrentUserPayload) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: dto.tenantId } });
    if (!tenant) {
      throw new NotFoundException('Tenant tidak ditemukan');
    }

    const context = await this.resolveTicketContext(dto.tenantId, dto.stayId, dto.roomId);
    const created = await this.createTicketRecord({
      tenantId: dto.tenantId,
      roomId: context.roomId,
      stayId: context.stayId,
      title: dto.title,
      description: dto.description,
      category: dto.category,
    });

    await this.audit.log({
      actorUserId: actor.id,
      action: 'CREATE',
      entityType: 'Ticket',
      entityId: String(created.id),
      newData: created,
      meta: { source: 'BACKOFFICE' },
    });

    return created;
  }

  async createPortal(dto: CreatePortalTicketDto, user: CurrentUserPayload) {
    const tenantId = user.tenantId;
    if (!tenantId) {
      throw new ConflictException('Akun tenant belum terhubung ke data tenant');
    }

    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) {
      throw new NotFoundException('Tenant tidak ditemukan');
    }

    const activeStay = await this.prisma.stay.findFirst({
      where: { tenantId, status: 'ACTIVE' },
      orderBy: [{ checkInDate: 'desc' }, { id: 'desc' }],
      select: { id: true, roomId: true },
    });

    const created = await this.createTicketRecord({
      tenantId,
      roomId: activeStay?.roomId ?? null,
      stayId: activeStay?.id ?? null,
      title: dto.title,
      description: dto.description,
      category: dto.category,
    });

    await this.audit.log({
      actorUserId: user.id,
      action: 'CREATE',
      entityType: 'Ticket',
      entityId: String(created.id),
      newData: created,
      meta: {
        source: 'PORTAL',
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
    if (!ticket) throw new NotFoundException('Tiket tidak ditemukan');

    const assignee = await this.prisma.user.findUnique({ where: { id: dto.assignedToId } });
    if (!assignee) throw new NotFoundException('User assignee tidak ditemukan');
    if (!['OWNER', 'ADMIN', 'STAFF'].includes(assignee.role)) {
      throw new ConflictException('Assignee tidak valid untuk role ticketing');
    }

    const updated = await this.prisma.ticket.update({ where: { id }, data: { assignedToId: dto.assignedToId } });
    await this.audit.log({
      actorUserId: actor.id,
      action: 'ASSIGN',
      entityType: 'Ticket',
      entityId: String(updated.id),
      oldData: ticket,
      newData: updated,
      meta: { assigneeId: dto.assignedToId },
    });
    return updated;
  }

  async start(id: number, actor: CurrentUserPayload) {
    const ticket = await this.prisma.ticket.findUnique({ where: { id } });
    if (!ticket) throw new NotFoundException('Tiket tidak ditemukan');
    if (ticket.status !== 'OPEN') throw new ConflictException('Transisi status tidak valid');

    const updated = await this.prisma.ticket.update({ where: { id }, data: { status: 'IN_PROGRESS' as any } });
    await this.audit.log({ actorUserId: actor.id, action: 'START', entityType: 'Ticket', entityId: String(updated.id), oldData: ticket, newData: updated });
    return updated;
  }

  async markDone(id: number, dto: ResolutionDto, actor: CurrentUserPayload) {
    const ticket = await this.prisma.ticket.findUnique({ where: { id } });
    if (!ticket) throw new NotFoundException('Tiket tidak ditemukan');
    if (ticket.status !== 'IN_PROGRESS') throw new ConflictException('Transisi status tidak valid');

    const updated = await this.prisma.ticket.update({
      where: { id },
      data: { status: 'DONE' as any, resolutionNote: dto.resolutionNote, resolvedAt: new Date() },
    });

    await this.audit.log({
      actorUserId: actor.id,
      action: 'MARK_DONE',
      entityType: 'Ticket',
      entityId: String(updated.id),
      oldData: ticket,
      newData: updated,
    });

    return updated;
  }

  async close(id: number, dto: CloseTicketDto, actor: CurrentUserPayload) {
    const ticket = await this.prisma.ticket.findUnique({ where: { id } });
    if (!ticket) throw new NotFoundException('Tiket tidak ditemukan');

    if (dto.action === 'CLOSE') {
      if (ticket.status !== 'DONE') throw new ConflictException('Transisi status tidak valid');

      const updated = await this.prisma.ticket.update({
        where: { id },
        data: {
          status: 'CLOSED' as any,
          resolutionNote: dto.resolutionNote ?? ticket.resolutionNote,
          closedAt: new Date(),
        },
      });

      await this.audit.log({
        actorUserId: actor.id,
        action: 'CLOSE',
        entityType: 'Ticket',
        entityId: String(updated.id),
        oldData: ticket,
        newData: updated,
        meta: { resolutionNoteProvided: !!dto.resolutionNote },
      });

      return updated;
    }

    if (ticket.status !== 'OPEN') throw new ConflictException('Transisi status tidak valid');

    const updated = await this.prisma.ticket.update({
      where: { id },
      data: {
        status: 'CANCELLED' as any,
        resolutionNote: dto.resolutionNote ?? ticket.resolutionNote,
      },
    });

    await this.audit.log({
      actorUserId: actor.id,
      action: 'CANCEL',
      entityType: 'Ticket',
      entityId: String(updated.id),
      oldData: ticket,
      newData: updated,
      meta: { resolutionNoteProvided: !!dto.resolutionNote },
    });

    return updated;
  }

  private async resolveTicketContext(tenantId: number, stayId?: number, roomId?: number) {
    const activeStay = await this.prisma.stay.findFirst({
      where: { tenantId, status: 'ACTIVE' },
      orderBy: [{ checkInDate: 'desc' }, { id: 'desc' }],
      select: { id: true, roomId: true },
    });

    let resolvedStayId = stayId ?? activeStay?.id ?? null;
    let resolvedRoomId = roomId ?? activeStay?.roomId ?? null;

    if (stayId) {
      const stay = await this.prisma.stay.findUnique({ where: { id: stayId } });
      if (!stay) throw new NotFoundException('Stay tidak ditemukan');
      if (stay.tenantId !== tenantId) {
        throw new ConflictException('Data stay tidak konsisten dengan tenant');
      }

      resolvedStayId = stay.id;
      resolvedRoomId = stay.roomId;

      if (roomId && stay.roomId !== roomId) {
        throw new ConflictException('Data room/stay tidak konsisten');
      }
    }

    if (roomId && !stayId) {
      const room = await this.prisma.room.findUnique({ where: { id: roomId } });
      if (!room) throw new NotFoundException('Kamar tidak ditemukan');
      resolvedRoomId = room.id;
    }

    return { stayId: resolvedStayId, roomId: resolvedRoomId };
  }

  private async generateTicketNumber() {
    const year = new Date().getFullYear();
    const count = await this.prisma.ticket.count({
      where: { ticketNumber: { startsWith: `TIC-${year}-` } },
    });
    return `TIC-${year}-${String(count + 1).padStart(4, '0')}`;
  }

  private async createTicketRecord(input: {
    tenantId: number;
    roomId: number | null;
    stayId: number | null;
    title: string;
    description: string;
    category?: string;
  }) {
    const primaryTicketNumber = await this.generateTicketNumber();

    try {
      return await this.prisma.ticket.create({
        data: {
          ticketNumber: primaryTicketNumber,
          tenantId: input.tenantId,
          roomId: input.roomId,
          stayId: input.stayId,
          title: input.title,
          description: input.description,
          category: input.category,
        },
      });
    } catch (error) {
      if (!(error instanceof PrismaClientKnownRequestError) || error.code !== 'P2002') {
        throw error;
      }

      const fallbackTicketNumber = `TIC-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
      return this.prisma.ticket.create({
        data: {
          ticketNumber: fallbackTicketNumber,
          tenantId: input.tenantId,
          roomId: input.roomId,
          stayId: input.stayId,
          title: input.title,
          description: input.description,
          category: input.category,
        },
      });
    }
  }
}
