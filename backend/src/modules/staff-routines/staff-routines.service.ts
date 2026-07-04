// FILE: staff-routines.service.ts — jadwal rutin staf: piket, tugas harian, shift
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma';
import { AuditLogService } from '../../audit-log/audit-log.service';
import { StaffRoutineAreaType, StaffRoutineFrequency, StaffRoutineStatus, UserRole } from '../../common/enums/app.enums';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import { PrismaService } from '../../prisma/prisma.service';
import { CompleteRoutineDto, StaffRoutineProgressQueryDto, StaffRoutineTemplateDto } from './dto/staff-routine.dto';

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfLocalDate(input = new Date()) {
  // F2-14/E-6: "hari ini" = tanggal kalender WIB (UTC+7) sebagai UTC-midnight, bebas timezone
  // server (cPanel umumnya UTC). getDate()/getDay()/formatDateKey tetap membaca tanggal WIB pada
  // server UTC maupun WIB karena geseran 0–7 jam tak pernah lewat hari.
  const wib = new Date(new Date(input).getTime() + 7 * 60 * 60 * 1000);
  return new Date(Date.UTC(wib.getUTCFullYear(), wib.getUTCMonth(), wib.getUTCDate()));
}

function parseDate(value?: string) {
  if (!value) return startOfLocalDate();
  const parsed = new Date(`${value.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return startOfLocalDate();
  return startOfLocalDate(parsed);
}

function formatDateKey(date: Date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function isTemplateDue(template: { frequency: string; dayOfWeek?: number | null; dayOfMonth?: number | null }, date: Date) {
  if (template.frequency === StaffRoutineFrequency.DAILY) return true;
  if (template.frequency === StaffRoutineFrequency.WEEKLY) return template.dayOfWeek == null || template.dayOfWeek === date.getDay();
  if (template.frequency === StaffRoutineFrequency.MONTHLY) return template.dayOfMonth == null || template.dayOfMonth === date.getDate();
  return false;
}

function dueLabel(template: { frequency: string; dayOfWeek?: number | null; dayOfMonth?: number | null }) {
  if (template.frequency === StaffRoutineFrequency.DAILY) return 'Harian';
  if (template.frequency === StaffRoutineFrequency.WEEKLY) return template.dayOfWeek == null ? 'Mingguan' : `Mingguan hari ke-${template.dayOfWeek}`;
  if (template.frequency === StaffRoutineFrequency.MONTHLY) return template.dayOfMonth == null ? 'Bulanan' : `Bulanan tanggal ${template.dayOfMonth}`;
  return 'Rutin';
}

@Injectable()
export class StaffRoutinesService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditLogService) {}

  private async assertNoActiveWork(actor: CurrentUserPayload, currentRoutineId?: number) {
    if (actor.role !== UserRole.STAFF) return;

    const [activeTicket, activeRoutine] = await Promise.all([
      this.prisma.ticket.findFirst({
        where: { assignedToId: actor.id, status: 'IN_PROGRESS' as any },
        select: { id: true, title: true, ticketNumber: true },
      }),
      this.prisma.staffRoutineCompletion.findFirst({
        where: {
          staffUserId: actor.id,
          status: StaffRoutineStatus.IN_PROGRESS,
          ...(currentRoutineId ? { id: { not: currentRoutineId } } : {}),
        },
        include: { template: { select: { title: true } } },
      }),
    ]);

    if (activeTicket) {
      throw new ConflictException(`Selesaikan pekerjaan aktif dulu: ${activeTicket.title || activeTicket.ticketNumber || `Tiket #${activeTicket.id}`}`);
    }
    if (activeRoutine) {
      throw new ConflictException(`Selesaikan pekerjaan aktif dulu: ${activeRoutine.template?.title || `Pekerjaan rutin #${activeRoutine.id}`}`);
    }
  }

  async getToday(actor: CurrentUserPayload) {
    const today = startOfLocalDate();
    const templates = await this.prisma.staffRoutineTemplate.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
      include: {
        assignments: {
          where: {
            isActive: true,
            OR: [{ staffUserId: null }, { staffUserId: actor.id }],
          },
          include: { room: true },
        },
      },
    });

    const dueTemplates = templates.filter((template) => isTemplateDue(template, today));
    const templateIds = dueTemplates.map((template) => template.id);
    const completions = templateIds.length
      ? await this.prisma.staffRoutineCompletion.findMany({
          where: { staffUserId: actor.id, dueDate: today, templateId: { in: templateIds } },
        })
      : [];

    const completionKey = (templateId: number, assignmentId: number | null, roomId: number | null) => `${templateId}:${assignmentId ?? 'none'}:${roomId ?? 'none'}`;
    const completionMap = new Map(completions.map((completion) => [completionKey(completion.templateId, completion.assignmentId ?? null, completion.roomId ?? null), completion]));

    const items = dueTemplates.flatMap((template) => {
      const assignmentRows = template.assignments.length ? template.assignments : [null];
      return assignmentRows.map((assignment) => {
        const roomId = assignment?.roomId ?? null;
        const assignmentId = assignment?.id ?? null;
        const completion = completionMap.get(completionKey(template.id, assignmentId, roomId))
          ?? completionMap.get(completionKey(template.id, null, roomId));
        return {
          occurrenceKey: completionKey(template.id, assignmentId, roomId),
          templateId: template.id,
          assignmentId,
          title: template.title,
          description: template.description,
          frequency: template.frequency,
          areaType: template.areaType,
          dueLabel: dueLabel(template),
          dueDate: formatDateKey(today),
          requiresPhoto: template.requiresPhoto,
          requiresNote: template.requiresNote,
          roomId,
          room: assignment?.room ?? null,
          status: completion?.status ?? 'TODO',
          completionId: completion?.id ?? null,
          completedAt: completion?.completedAt ?? null,
          note: completion?.note ?? null,
          photoUrl: completion?.photoUrl ?? null,
        };
      });
    });

    const completedCount = items.filter((item) => item.status === StaffRoutineStatus.DONE).length;
    const needHelpCount = items.filter((item) => item.status === StaffRoutineStatus.NEED_HELP).length;

    return {
      date: formatDateKey(today),
      items,
      summary: {
        total: items.length,
        completed: completedCount,
        remaining: Math.max(0, items.length - completedCount),
        needHelp: needHelpCount,
        completionPercent: items.length ? Math.round((completedCount / items.length) * 100) : 100,
      },
    };
  }

  async start(templateId: number, dto: CompleteRoutineDto, actor: CurrentUserPayload) {
    const template = await this.prisma.staffRoutineTemplate.findUnique({ where: { id: templateId } });
    if (!template || !template.isActive) throw new NotFoundException('Pekerjaan rutin tidak ditemukan');

    const dueDate = parseDate(dto.dueDate);
    if (!isTemplateDue(template, dueDate)) {
      throw new ConflictException('Pekerjaan ini bukan jadwal hari tersebut');
    }

    let assignment = null as null | { id: number; templateId: number; staffUserId: number | null; roomId: number | null; isActive: boolean };
    if (dto.assignmentId) {
      assignment = await this.prisma.staffRoutineAssignment.findUnique({ where: { id: dto.assignmentId } });
      if (!assignment || !assignment.isActive || assignment.templateId !== template.id) throw new NotFoundException('Jadwal pekerjaan tidak ditemukan');
      if (assignment.staffUserId && assignment.staffUserId !== actor.id) throw new ConflictException('Pekerjaan ini bukan tugas akun ini');
    }

    // W-08: validasi roomId — jika assignment punya roomId spesifik, staff tidak boleh
    // mengganti ke roomId lain via DTO. RoomId bebas hanya untuk template area (global).
    let roomId: number | null = null;
    if (assignment?.roomId) {
      roomId = assignment.roomId;
    } else if (dto.roomId) {
      roomId = dto.roomId;
    } else {
      roomId = null;
    }
    const existing = await this.prisma.staffRoutineCompletion.findFirst({
      where: {
        templateId: template.id,
        assignmentId: assignment?.id ?? null,
        staffUserId: actor.id,
        roomId,
        dueDate,
      },
    });

    if (existing?.status === StaffRoutineStatus.DONE) throw new ConflictException('Pekerjaan ini sudah selesai');
    if (existing?.status === StaffRoutineStatus.NEED_HELP) throw new ConflictException('Pekerjaan ini sudah dikirim sebagai kendala');
    if (existing?.status === StaffRoutineStatus.IN_PROGRESS) return existing;

    await this.assertNoActiveWork(actor);

    const saved = existing
      ? await this.prisma.staffRoutineCompletion.update({ where: { id: existing.id }, data: { status: StaffRoutineStatus.IN_PROGRESS, completedAt: null, note: dto.note?.trim() || null } })
      : await this.prisma.staffRoutineCompletion.create({
          data: {
            template: { connect: { id: template.id } },
            assignment: assignment ? { connect: { id: assignment.id } } : undefined,
            staffUser: { connect: { id: actor.id } },
            room: roomId ? { connect: { id: roomId } } : undefined,
            dueDate,
            status: StaffRoutineStatus.IN_PROGRESS,
            completedAt: null,
            note: dto.note?.trim() || null,
          },
        });

    await this.audit.log({
      actorUserId: actor.id,
      action: 'START_STAFF_ROUTINE',
      entityType: 'StaffRoutineCompletion',
      entityId: String(saved.id),
      oldData: existing,
      newData: saved,
    });

    return saved;
  }

  async complete(templateId: number, dto: CompleteRoutineDto, actor: CurrentUserPayload) {
    const template = await this.prisma.staffRoutineTemplate.findUnique({ where: { id: templateId } });
    if (!template || !template.isActive) throw new NotFoundException('Pekerjaan rutin tidak ditemukan');

    const dueDate = parseDate(dto.dueDate);
    if (!isTemplateDue(template, dueDate)) {
      throw new ConflictException('Pekerjaan ini bukan jadwal hari tersebut');
    }

    let assignment = null as null | { id: number; templateId: number; staffUserId: number | null; roomId: number | null; isActive: boolean };
    if (dto.assignmentId) {
      assignment = await this.prisma.staffRoutineAssignment.findUnique({ where: { id: dto.assignmentId } });
      if (!assignment || !assignment.isActive || assignment.templateId !== template.id) throw new NotFoundException('Jadwal pekerjaan tidak ditemukan');
      if (assignment.staffUserId && assignment.staffUserId !== actor.id) throw new ConflictException('Pekerjaan ini bukan tugas akun ini');
    }

    // W-08: validasi roomId — jika assignment punya roomId spesifik, staff tidak boleh
    // mengganti ke roomId lain via DTO.
    let roomId: number | null = null;
    if (assignment?.roomId) {
      roomId = assignment.roomId;
    } else if (dto.roomId) {
      roomId = dto.roomId;
    } else {
      roomId = null;
    }
    const status = dto.status === StaffRoutineStatus.NEED_HELP ? StaffRoutineStatus.NEED_HELP : StaffRoutineStatus.DONE;
    if (template.requiresPhoto && status === StaffRoutineStatus.DONE && !dto.photoUrl) {
      throw new ConflictException('Foto bukti wajib diisi untuk pekerjaan ini');
    }
    if (template.requiresNote && status === StaffRoutineStatus.DONE && !dto.note?.trim()) {
      throw new ConflictException('Catatan singkat wajib diisi untuk pekerjaan ini');
    }

    const existing = await this.prisma.staffRoutineCompletion.findFirst({
      where: {
        templateId: template.id,
        assignmentId: assignment?.id ?? null,
        staffUserId: actor.id,
        roomId,
        dueDate,
      },
    });

    // Audit M-28: pekerjaan yang sudah DONE tidak boleh ditimpa (anti polish KPI).
    if (existing?.status === StaffRoutineStatus.DONE) {
      throw new ConflictException('Pekerjaan ini sudah selesai dan tidak dapat diubah lagi.');
    }

    const data = {
      status,
      completedAt: status === StaffRoutineStatus.DONE ? new Date() : null,
      note: dto.note?.trim() || null,
      photoUrl: dto.photoUrl || null,
    } as Prisma.StaffRoutineCompletionUpdateInput;

    const saved = existing
      ? await this.prisma.staffRoutineCompletion.update({ where: { id: existing.id }, data })
      : await this.prisma.staffRoutineCompletion.create({
          data: {
            template: { connect: { id: template.id } },
            assignment: assignment ? { connect: { id: assignment.id } } : undefined,
            staffUser: { connect: { id: actor.id } },
            room: roomId ? { connect: { id: roomId } } : undefined,
            dueDate,
            status,
            completedAt: status === StaffRoutineStatus.DONE ? new Date() : null,
            note: dto.note?.trim() || null,
            photoUrl: dto.photoUrl || null,
          },
        });

    await this.audit.log({
      actorUserId: actor.id,
      action: status === StaffRoutineStatus.DONE ? 'COMPLETE_STAFF_ROUTINE' : 'STAFF_ROUTINE_NEED_HELP',
      entityType: 'StaffRoutineCompletion',
      entityId: String(saved.id),
      oldData: existing,
      newData: saved,
    });

    return saved;
  }

  async getMyKpi(actor: CurrentUserPayload) {
    const today = startOfLocalDate();
    const from = new Date(today.getTime() - 6 * DAY_MS);
    const completions = await this.prisma.staffRoutineCompletion.findMany({
      where: { staffUserId: actor.id, dueDate: { gte: from, lte: today } },
      include: { template: true },
      orderBy: { dueDate: 'desc' },
    });
    const done = completions.filter((item) => item.status === StaffRoutineStatus.DONE);
    const needHelp = completions.filter((item) => item.status === StaffRoutineStatus.NEED_HELP);
    const roomAuditCount = done.filter((item) => item.template.areaType === StaffRoutineAreaType.ROOM).length;
    const meterCount = done.filter((item) => item.template.areaType === StaffRoutineAreaType.METER).length;
    const withProof = done.filter((item) => Boolean(item.photoUrl)).length;

    const weekPoints = Array.from({ length: 7 }).map((_, index) => {
      const date = new Date(from.getTime() + index * DAY_MS);
      const key = formatDateKey(date);
      return {
        key,
        label: date.toLocaleDateString('id-ID', { weekday: 'short' }),
        routinesDone: done.filter((item) => formatDateKey(item.dueDate) === key).length,
      };
    });

    return {
      period: { from: formatDateKey(from), to: formatDateKey(today) },
      completedRoutineCount: done.length,
      needHelpCount: needHelp.length,
      roomAuditCount,
      meterCount,
      proofCompletionRate: done.length ? Math.round((withProof / done.length) * 100) : 100,
      weekPoints,
      message: done.length
        ? `Minggu ini kamu sudah menyelesaikan ${done.length} checklist. Terima kasih, kerja rapi membuat kos lebih nyaman.`
        : 'Checklist minggu ini akan tercatat setelah pekerjaan pertama disimpan.',
    };
  }

  async listTemplates() {
    return this.prisma.staffRoutineTemplate.findMany({
      orderBy: [{ isActive: 'desc' }, { sortOrder: 'asc' }, { id: 'asc' }],
      include: {
        assignments: {
          include: {
            staffUser: { select: { id: true, fullName: true, email: true, role: true } },
            room: true,
          },
        },
      },
    });
  }

  async createTemplate(dto: StaffRoutineTemplateDto, actor: CurrentUserPayload) {
    const created = await this.prisma.staffRoutineTemplate.create({
      data: {
        title: dto.title.trim(),
        description: dto.description?.trim() || null,
        frequency: dto.frequency as any,
        areaType: (dto.areaType ?? StaffRoutineAreaType.GENERAL) as any,
        dayOfWeek: dto.frequency === StaffRoutineFrequency.WEEKLY ? dto.dayOfWeek ?? null : null,
        dayOfMonth: dto.frequency === StaffRoutineFrequency.MONTHLY ? dto.dayOfMonth ?? null : null,
        requiresPhoto: dto.requiresPhoto ?? false,
        requiresNote: dto.requiresNote ?? false,
        isActive: dto.isActive ?? true,
        sortOrder: dto.sortOrder ?? 0,
        createdBy: { connect: { id: actor.id } },
        assignments: dto.staffUserId || dto.roomId ? {
          create: { staffUserId: dto.staffUserId ?? null, roomId: dto.roomId ?? null },
        } : undefined,
      },
      include: { assignments: true },
    });

    await this.audit.log({ actorUserId: actor.id, action: 'CREATE', entityType: 'StaffRoutineTemplate', entityId: String(created.id), newData: created });
    return created;
  }

  async updateTemplate(id: number, dto: Partial<StaffRoutineTemplateDto>, actor: CurrentUserPayload) {
    const existing = await this.prisma.staffRoutineTemplate.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Pekerjaan rutin tidak ditemukan');

    const updated = await this.prisma.staffRoutineTemplate.update({
      where: { id },
      data: {
        title: dto.title?.trim(),
        description: dto.description !== undefined ? dto.description?.trim() || null : undefined,
        frequency: dto.frequency as any,
        areaType: dto.areaType as any,
        dayOfWeek: dto.frequency === StaffRoutineFrequency.WEEKLY ? dto.dayOfWeek ?? null : dto.frequency ? null : dto.dayOfWeek,
        dayOfMonth: dto.frequency === StaffRoutineFrequency.MONTHLY ? dto.dayOfMonth ?? null : dto.frequency ? null : dto.dayOfMonth,
        requiresPhoto: dto.requiresPhoto,
        requiresNote: dto.requiresNote,
        isActive: dto.isActive,
        sortOrder: dto.sortOrder,
      },
    });

    await this.audit.log({ actorUserId: actor.id, action: 'UPDATE', entityType: 'StaffRoutineTemplate', entityId: String(updated.id), oldData: existing, newData: updated });
    return updated;
  }

  async deactivateTemplate(id: number, actor: CurrentUserPayload) {
    const existing = await this.prisma.staffRoutineTemplate.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Pekerjaan rutin tidak ditemukan');
    const updated = await this.prisma.staffRoutineTemplate.update({ where: { id }, data: { isActive: false } });
    await this.audit.log({ actorUserId: actor.id, action: 'DEACTIVATE', entityType: 'StaffRoutineTemplate', entityId: String(updated.id), oldData: existing, newData: updated });
    return updated;
  }

  async getAdminProgress(query: StaffRoutineProgressQueryDto) {
    const to = parseDate(query.to);
    const from = query.from ? parseDate(query.from) : new Date(to.getTime() - 6 * DAY_MS);
    const completions = await this.prisma.staffRoutineCompletion.findMany({
      where: {
        dueDate: { gte: from, lte: to },
        staffUserId: query.staffUserId ?? undefined,
      },
      include: {
        staffUser: { select: { id: true, fullName: true, email: true, role: true } },
        template: true,
        room: true,
      },
      orderBy: [{ dueDate: 'desc' }, { id: 'desc' }],
    });

    return {
      period: { from: formatDateKey(from), to: formatDateKey(to) },
      items: completions,
      summary: {
        completed: completions.filter((item) => item.status === StaffRoutineStatus.DONE).length,
        needHelp: completions.filter((item) => item.status === StaffRoutineStatus.NEED_HELP).length,
        proofCount: completions.filter((item) => Boolean(item.photoUrl)).length,
      },
    };
  }
}
