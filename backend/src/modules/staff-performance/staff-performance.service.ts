import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma';
import { AuditLogService } from '../../audit-log/audit-log.service';
import { StaffAuditResult, StaffReviewStatus, StaffRoutineStatus, StaffWorkSourceType, UserRole } from '../../common/enums/app.enums';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateStaffWorkAuditDto } from './dto/staff-performance.dto';

function monthRange(month?: string) {
  const source = month && /^\d{4}-\d{2}$/.test(month) ? `${month}-01T00:00:00` : undefined;
  const start = source ? new Date(source) : new Date();
  if (!source) start.setDate(1);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setMonth(end.getMonth() + 1);
  return {
    start,
    end,
    key: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`,
  };
}

function formatDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function auditDelta(result: string) {
  if (result === StaffAuditResult.PASS) return 3;
  if (result === StaffAuditResult.NEEDS_FIX) return -3;
  if (result === StaffAuditResult.FAILED) return -10;
  if (result === StaffAuditResult.NOT_DONE) return -15;
  return 0;
}

function categoryFromScore(score: number) {
  if (score >= 90) return { label: 'Sangat Baik', tone: 'success', copy: 'Kinerja stabil dan bukti kerja kuat.' };
  if (score >= 75) return { label: 'Baik', tone: 'primary', copy: 'Kinerja baik. Tetap lengkapi bukti agar laporan makin kuat.' };
  if (score >= 60) return { label: 'Cukup', tone: 'warning', copy: 'Masih cukup, tetapi ada beberapa pekerjaan yang perlu lebih rapi.' };
  if (score >= 40) return { label: 'Perlu Dibantu', tone: 'warning', copy: 'Perlu arahan admin agar pekerjaan lebih konsisten.' };
  return { label: 'Perlu Diawasi', tone: 'danger', copy: 'Perlu pengecekan lebih dekat dari admin atau owner.' };
}

function avg(values: number[]) {
  if (!values.length) return null;
  return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10;
}

@Injectable()
export class StaffPerformanceService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditLogService) {}

  async getMyMonthly(actor: CurrentUserPayload, month?: string) {
    return this.getStaffMonthly(actor.id, month);
  }

  async getAdminMonthly(month?: string) {
    const range = monthRange(month);
    const staff = await this.prisma.user.findMany({
      where: { role: UserRole.STAFF as any, isActive: true },
      orderBy: { fullName: 'asc' },
      select: { id: true, fullName: true, email: true, role: true },
    });

    const items = await Promise.all(staff.map((item) => this.buildSummaryForStaff(item.id, range, false)));
    return {
      period: { month: range.key, from: formatDateKey(range.start), to: formatDateKey(new Date(range.end.getTime() - 1)) },
      items,
      summary: {
        totalStaff: items.length,
        veryGood: items.filter((item) => item.category.label === 'Sangat Baik').length,
        good: items.filter((item) => item.category.label === 'Baik').length,
        needWatch: items.filter((item) => ['Perlu Dibantu', 'Perlu Diawasi'].includes(item.category.label)).length,
        negativeValue: items.reduce((sum, item) => sum + item.score.negativeValue, 0),
        tenantReviewCount: items.reduce((sum, item) => sum + item.tenantReviews.count, 0),
      },
    };
  }


  async getAuditSuggestions(month?: string) {
    const range = monthRange(month);
    const staff = await this.prisma.user.findMany({
      where: { role: UserRole.STAFF as any, isActive: true },
      orderBy: { fullName: 'asc' },
      select: { id: true },
    });
    const summaries = await Promise.all(staff.map((item) => this.buildSummaryForStaff(item.id, range, true)));
    const items = summaries.flatMap((summary) => this.buildAuditSuggestionsForSummary(summary));
    const sorted = items.sort((a, b) => b.riskScore - a.riskScore || a.staff.fullName.localeCompare(b.staff.fullName));
    const high = sorted.filter((item) => item.priority === 'HIGH').length;
    const medium = sorted.filter((item) => item.priority === 'MEDIUM').length;
    const low = sorted.filter((item) => item.priority === 'LOW').length;
    return {
      period: { month: range.key, from: formatDateKey(range.start), to: formatDateKey(new Date(range.end.getTime() - 1)) },
      brief: this.buildAuditSuggestionBrief(sorted, summaries),
      summary: {
        totalSuggestions: sorted.length,
        high,
        medium,
        low,
        staffWithRisk: new Set(sorted.filter((item) => item.priority !== 'LOW').map((item) => item.staff.id)).size,
      },
      items: sorted.slice(0, 30),
    };
  }

  async getStaffMonthly(staffId: number, month?: string) {
    const range = monthRange(month);
    return this.buildSummaryForStaff(staffId, range, true);
  }

  async getStaffEvidence(staffId: number, month?: string) {
    const range = monthRange(month);
    return this.buildSummaryForStaff(staffId, range, true);
  }

  async createAudit(dto: CreateStaffWorkAuditDto, actor: CurrentUserPayload) {
    const staff = await this.prisma.user.findUnique({ where: { id: dto.staffId } });
    if (!staff || staff.role !== UserRole.STAFF) throw new NotFoundException('Staff tidak ditemukan');

    const scoreDelta = auditDelta(dto.result);
    const created = await this.prisma.staffWorkAudit.create({
      data: {
        staffId: dto.staffId,
        sourceType: dto.sourceType as any,
        sourceId: dto.sourceId ?? null,
        auditedById: actor.id,
        result: dto.result as any,
        scoreDelta,
        notes: dto.notes?.trim() || null,
        photoUrl: dto.photoUrl || null,
      },
      include: {
        staff: { select: { id: true, fullName: true, email: true, role: true } },
        auditedBy: { select: { id: true, fullName: true, email: true, role: true } },
      },
    });

    await this.prisma.staffPerformanceEvent.create({
      data: {
        staffId: dto.staffId,
        sourceType: dto.sourceType as any,
        sourceId: dto.sourceId ?? null,
        eventType: dto.result === StaffAuditResult.PASS ? 'AUDIT_PASS' : dto.result === StaffAuditResult.NEEDS_FIX ? 'AUDIT_NEEDS_FIX' : 'AUDIT_FAILED',
        scoreDelta,
        reason: dto.notes?.trim() || `Audit ${dto.result}`,
      },
    });

    await this.audit.log({
      actorUserId: actor.id,
      action: 'CREATE_STAFF_WORK_AUDIT',
      entityType: 'StaffWorkAudit',
      entityId: String(created.id),
      newData: created,
    });

    return created;
  }

  private async buildSummaryForStaff(staffId: number, range: ReturnType<typeof monthRange>, includeEvidence: boolean) {
    const staff = await this.prisma.user.findUnique({
      where: { id: staffId },
      select: { id: true, fullName: true, email: true, role: true, isActive: true, createdAt: true },
    });
    if (!staff || staff.role !== UserRole.STAFF) throw new NotFoundException('Staff tidak ditemukan');

    const [routines, tickets, meters, audits, reviews, events] = await this.prisma.$transaction([
      this.prisma.staffRoutineCompletion.findMany({
        where: { staffUserId: staffId, dueDate: { gte: range.start, lt: range.end } },
        include: { template: true, room: true },
        orderBy: [{ dueDate: 'desc' }, { id: 'desc' }],
      }),
      this.prisma.ticket.findMany({
        where: {
          assignedToId: staffId,
          OR: [
            { resolvedAt: { gte: range.start, lt: range.end } },
            { updatedAt: { gte: range.start, lt: range.end } },
            { createdAt: { gte: range.start, lt: range.end } },
          ],
        },
        include: { room: true, tenant: true },
        orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
      }),
      this.prisma.meterReading.findMany({
        where: { recordedById: staffId, createdAt: { gte: range.start, lt: range.end } },
        include: { room: true },
        orderBy: [{ readingAt: 'desc' }, { id: 'desc' }],
      }),
      this.prisma.staffWorkAudit.findMany({
        where: { staffId, createdAt: { gte: range.start, lt: range.end } },
        include: { auditedBy: { select: { id: true, fullName: true, role: true } } },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      }),
      this.prisma.staffReview.findMany({
        where: { staffId, status: StaffReviewStatus.VISIBLE as any, createdAt: { gte: range.start, lt: range.end } },
        include: { tenant: { select: { id: true, fullName: true } } },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      }),
      this.prisma.staffPerformanceEvent.findMany({
        where: { staffId, createdAt: { gte: range.start, lt: range.end } },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      }),
    ]);

    const routineDone = routines.filter((item) => item.status === StaffRoutineStatus.DONE);
    const routineNeedHelp = routines.filter((item) => item.status === StaffRoutineStatus.NEED_HELP);
    const ticketsDone = tickets.filter((item) => ['DONE', 'CLOSED'].includes(item.status));
    const stockReports = tickets.filter((item) => String(item.category ?? '').toUpperCase().includes('STOK'));
    const roomChecks = tickets.filter((item) => String(item.category ?? '').toUpperCase().includes('CEK_KAMAR'));
    const missingRoutineProof = routineDone.filter((item) => item.template.requiresPhoto && !item.photoUrl).length;
    const missingTicketProof = ticketsDone.filter((item) => !item.resolutionImageUrl).length;
    const auditPass = audits.filter((item) => item.result === StaffAuditResult.PASS).length;
    const auditNeedsFix = audits.filter((item) => item.result === StaffAuditResult.NEEDS_FIX).length;
    const auditFailed = audits.filter((item) => item.result === StaffAuditResult.FAILED).length;
    const auditNotDone = audits.filter((item) => item.result === StaffAuditResult.NOT_DONE).length;
    const reviewRatings = reviews.map((review) => review.rating);
    const averageRating = avg(reviewRatings);
    const lowReviewCount = reviews.filter((review) => review.rating <= 2).length;
    const highReviewCount = reviews.filter((review) => review.rating >= 5).length;

    const positiveValue = routineDone.length + ticketsDone.length * 3 + meters.length * 2 + stockReports.length * 2 + auditPass * 3 + (reviews.length >= 3 && (averageRating ?? 0) >= 4.5 ? 5 : 0);
    const negativeValue = missingRoutineProof * 2 + missingTicketProof * 2 + auditNeedsFix * 3 + auditFailed * 10 + auditNotDone * 15 + (reviews.length >= 3 && (averageRating ?? 5) < 3 ? 6 : 0) + (reviews.length >= 3 ? lowReviewCount * 2 : 0);
    const netKpi = positiveValue - negativeValue;
    const rawScore = 100 + netKpi;
    const score = Math.max(0, Math.min(100, rawScore));
    const category = categoryFromScore(score);
    const proofRequired = routineDone.filter((item) => item.template.requiresPhoto).length + ticketsDone.length;
    const proofFilled = routineDone.filter((item) => item.template.requiresPhoto && item.photoUrl).length + ticketsDone.filter((item) => item.resolutionImageUrl).length;
    const proofCompletionRate = proofRequired ? Math.round((proofFilled / proofRequired) * 100) : 100;

    const insight = this.buildRuleInsight({
      category: category.label,
      score,
      missingProof: missingRoutineProof + missingTicketProof,
      auditFailed: auditFailed + auditNotDone,
      auditNeedsFix,
      averageRating,
      reviewCount: reviews.length,
      routineNeedHelp: routineNeedHelp.length,
    });

    return {
      period: { month: range.key, from: formatDateKey(range.start), to: formatDateKey(new Date(range.end.getTime() - 1)) },
      staff,
      category,
      score: { base: 100, positiveValue, negativeValue, raw: rawScore, final: score, netKpi },
      monthlyKpi: {
        routineDone: routineDone.length,
        routineNeedHelp: routineNeedHelp.length,
        ticketsDone: ticketsDone.length,
        meterCount: meters.length,
        stockReports: stockReports.length,
        roomChecks: roomChecks.length,
        auditPass,
        auditNeedsFix,
        auditFailed: auditFailed + auditNotDone,
        proofCompletionRate,
      },
      tenantReviews: {
        count: reviews.length,
        averageRating,
        highReviewCount,
        lowReviewCount,
        items: includeEvidence ? reviews : reviews.slice(0, 3),
      },
      audits: includeEvidence ? audits : audits.slice(0, 5),
      assistant: insight,
      evidence: includeEvidence ? {
        routines: routines.slice(0, 120),
        tickets: tickets.slice(0, 120),
        meters: meters.slice(0, 120),
        events: events.slice(0, 80),
      } : undefined,
    };
  }


  private buildAuditSuggestionsForSummary(summary: any) {
    const suggestions: any[] = [];
    const staff = summary.staff;
    const now = new Date();
    const pushSuggestion = (input: any) => {
      const priority = input.riskScore >= 80 ? 'HIGH' : input.riskScore >= 55 ? 'MEDIUM' : 'LOW';
      suggestions.push({
        id: `${staff.id}-${input.sourceType}-${input.sourceId ?? input.reasonCode}`,
        staff: { id: staff.id, fullName: staff.fullName, email: staff.email },
        sourceType: input.sourceType,
        sourceId: input.sourceId ?? null,
        priority,
        riskScore: input.riskScore,
        title: input.title,
        reason: input.reason,
        recommendedAction: input.recommendedAction,
        location: input.location ?? 'Area umum',
        status: input.status ?? null,
        evidenceState: input.evidenceState ?? 'Perlu dicek',
        createdAt: input.createdAt ?? null,
      });
    };

    const routines = summary.evidence?.routines ?? [];
    const tickets = summary.evidence?.tickets ?? [];
    const meters = summary.evidence?.meters ?? [];
    const audits = summary.audits ?? [];
    const reviews = summary.tenantReviews?.items ?? [];

    for (const routine of routines) {
      if (routine.status === StaffRoutineStatus.DONE && routine.template?.requiresPhoto && !routine.photoUrl) {
        pushSuggestion({
          sourceType: StaffWorkSourceType.ROUTINE,
          sourceId: routine.id,
          riskScore: 86,
          title: routine.template?.title || 'Checklist rutin tanpa bukti foto',
          reason: 'Checklist sudah ditandai selesai, tetapi pekerjaan ini wajib foto bukti.',
          recommendedAction: 'Audit bukti foto atau minta staff lengkapi bukti.',
          location: routine.room?.code || routine.template?.areaType || 'Area umum',
          status: routine.status,
          evidenceState: 'Foto belum ada',
          createdAt: routine.completedAt || routine.updatedAt,
          reasonCode: `routine-proof-${routine.id}`,
        });
      }
    }

    for (const ticket of tickets) {
      const status = String(ticket.status ?? '').toUpperCase();
      const updatedAt = ticket.updatedAt ? new Date(ticket.updatedAt) : null;
      const ageDays = updatedAt ? Math.floor((now.getTime() - updatedAt.getTime()) / 86_400_000) : 0;
      const title = ticket.title || ticket.ticketNumber || 'Tugas lapangan';
      if (['DONE', 'CLOSED'].includes(status) && !ticket.resolutionImageUrl) {
        pushSuggestion({
          sourceType: StaffWorkSourceType.TICKET,
          sourceId: ticket.id,
          riskScore: status === 'DONE' ? 84 : 72,
          title,
          reason: 'Tugas sudah selesai/ditutup, tetapi belum ada foto penyelesaian.',
          recommendedAction: 'Lakukan audit random atau minta foto hasil pekerjaan untuk bukti bulanan.',
          location: ticket.room?.code || ticket.room?.name || 'Area umum',
          status,
          evidenceState: 'Foto penyelesaian belum ada',
          createdAt: ticket.updatedAt,
          reasonCode: `ticket-proof-${ticket.id}`,
        });
      }
      if (['OPEN', 'IN_PROGRESS'].includes(status) && ageDays >= 3) {
        pushSuggestion({
          sourceType: StaffWorkSourceType.TICKET,
          sourceId: ticket.id,
          riskScore: ageDays >= 7 ? 88 : 62,
          title,
          reason: `Tugas masih ${status === 'OPEN' ? 'belum dikerjakan' : 'sedang dikerjakan'} selama sekitar ${ageDays} hari.`,
          recommendedAction: 'Tanyakan kendala dan bantu putuskan lanjut, bantuan teknisi, atau jadwalkan ulang.',
          location: ticket.room?.code || ticket.room?.name || 'Area umum',
          status,
          evidenceState: 'Perlu follow-up',
          createdAt: ticket.updatedAt,
          reasonCode: `ticket-aging-${ticket.id}`,
        });
      }
    }

    for (const audit of audits) {
      if ([StaffAuditResult.NEEDS_FIX, StaffAuditResult.FAILED, StaffAuditResult.NOT_DONE].includes(audit.result)) {
        pushSuggestion({
          sourceType: audit.sourceType || StaffWorkSourceType.MANUAL_AUDIT,
          sourceId: audit.sourceId ?? audit.id,
          riskScore: audit.result === StaffAuditResult.NOT_DONE ? 95 : audit.result === StaffAuditResult.FAILED ? 90 : 70,
          title: 'Audit sebelumnya perlu tindak lanjut',
          reason: audit.notes || `Hasil audit: ${audit.result}`,
          recommendedAction: 'Cek ulang pekerjaan yang sama dan pastikan ada catatan/foto pembanding.',
          location: 'Hasil audit admin/owner',
          status: audit.result,
          evidenceState: 'Audit perlu follow-up',
          createdAt: audit.createdAt,
          reasonCode: `audit-${audit.id}`,
        });
      }
    }

    for (const review of reviews) {
      if (Number(review.rating) <= 2) {
        pushSuggestion({
          sourceType: StaffWorkSourceType.TENANT_REVIEW,
          sourceId: review.id,
          riskScore: 78,
          title: 'Review tenant rendah',
          reason: review.comment || `Tenant memberi rating ${review.rating}/5.`,
          recommendedAction: 'Hubungi tenant atau cek ulang hasil pekerjaan terkait.',
          location: review.tenant?.fullName || 'Tenant',
          status: `Rating ${review.rating}`,
          evidenceState: 'Perlu validasi tenant',
          createdAt: review.createdAt,
          reasonCode: `review-${review.id}`,
        });
      }
    }

    const totalWork = (summary.monthlyKpi?.routineDone ?? 0) + (summary.monthlyKpi?.ticketsDone ?? 0) + (summary.monthlyKpi?.meterCount ?? 0) + (summary.monthlyKpi?.stockReports ?? 0) + (summary.monthlyKpi?.roomChecks ?? 0);
    if (totalWork > 0 && !audits.length) {
      pushSuggestion({
        sourceType: StaffWorkSourceType.MANUAL_AUDIT,
        riskScore: summary.score?.negativeValue > 0 ? 58 : 42,
        title: 'Belum ada audit random bulan ini',
        reason: `Staff sudah punya ${totalWork} bukti kerja bulan ini, tetapi belum ada pengecekan admin/owner.`,
        recommendedAction: 'Ambil 1 pekerjaan secara acak untuk audit ringan agar laporan lebih kuat.',
        location: 'Laporan bulanan staff',
        evidenceState: 'Audit belum ada',
        reasonCode: 'no-audit',
      });
    }
    if ((summary.monthlyKpi?.meterCount ?? 0) === 0 && totalWork > 0) {
      pushSuggestion({
        sourceType: StaffWorkSourceType.METER,
        riskScore: 45,
        title: 'Belum ada catatan meter bulan ini',
        reason: 'Meter listrik/air belum tercatat oleh staff pada periode ini.',
        recommendedAction: 'Jadwalkan catat meter listrik/air untuk kamar aktif atau kamar yang perlu dicek.',
        location: 'Meter listrik/air',
        evidenceState: 'Belum tercatat',
        reasonCode: 'meter-empty',
      });
    }

    return suggestions;
  }

  private buildAuditSuggestionBrief(items: any[], summaries: any[]) {
    const high = items.filter((item) => item.priority === 'HIGH');
    const proofRisks = items.filter((item) => String(item.evidenceState).toLowerCase().includes('foto'));
    const aging = items.filter((item) => String(item.reason).includes('hari'));
    if (!items.length) {
      return {
        title: 'Operasional staff stabil',
        summary: 'Belum ada rekomendasi audit prioritas dari data bulan ini.',
        recommendations: ['Pertahankan audit random ringan agar bukti kerja tetap kuat.'],
      };
    }
    const recommendations: string[] = [];
    if (high.length) recommendations.push(`Dahulukan ${high.length} audit prioritas tinggi.`);
    if (proofRisks.length) recommendations.push(`Cek bukti foto pada ${proofRisks.length} pekerjaan yang selesai tanpa foto.`);
    if (aging.length) recommendations.push('Follow-up tugas yang terlalu lama open/in progress.');
    if (!recommendations.length) recommendations.push('Ambil audit random ringan untuk menjaga kualitas laporan bulanan.');
    const watchedStaff = new Set(items.filter((item) => item.priority !== 'LOW').map((item) => item.staff.id)).size;
    return {
      title: high.length ? 'Ada audit prioritas tinggi' : 'Audit ringan disarankan',
      summary: `${items.length} rekomendasi audit dari ${summaries.length} staff aktif. ${watchedStaff} staff punya sinyal yang perlu dicek.`,
      recommendations,
    };
  }

  private buildRuleInsight(input: { category: string; score: number; missingProof: number; auditFailed: number; auditNeedsFix: number; averageRating: number | null; reviewCount: number; routineNeedHelp: number }) {
    const blockers: string[] = [];
    const strengths: string[] = [];
    const recommendations: string[] = [];

    if (input.score >= 90) strengths.push('Pekerjaan bulan ini kuat dan konsisten.');
    if (input.missingProof > 0) {
      blockers.push(`${input.missingProof} pekerjaan belum punya bukti foto.`);
      recommendations.push('Lengkapi foto bukti untuk pekerjaan yang perlu dicek ulang.');
    }
    if (input.auditFailed > 0) {
      blockers.push(`${input.auditFailed} audit gagal atau pekerjaan belum sesuai.`);
      recommendations.push('Admin perlu cek ulang pekerjaan yang gagal audit sebelum akhir bulan.');
    } else if (input.auditNeedsFix > 0) {
      blockers.push(`${input.auditNeedsFix} audit perlu perbaikan.`);
      recommendations.push('Minta staff ulangi pekerjaan yang kurang rapi dengan catatan jelas.');
    }
    if (input.reviewCount >= 3 && input.averageRating !== null && input.averageRating < 3) {
      blockers.push(`Rating tenant rata-rata ${input.averageRating}/5.`);
      recommendations.push('Lihat komentar tenant untuk area yang perlu diperbaiki.');
    }
    if (input.routineNeedHelp > 0) strengths.push(`${input.routineNeedHelp} kendala dilaporkan jujur, ini lebih baik daripada ditandai selesai paksa.`);
    if (!recommendations.length) recommendations.push('Pertahankan ritme kerja dan audit random ringan agar bukti tetap kuat.');

    return {
      title: `Kinerja bulan ini: ${input.category}`,
      summary: blockers.length ? blockers.join(' ') : 'Tidak ada masalah besar dari data bulan ini.',
      strengths,
      recommendations,
    };
  }
}
