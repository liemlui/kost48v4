import { Injectable } from '@nestjs/common';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import { PrismaService } from '../../prisma/prisma.service';
import { SubmitSurveyDto } from './dto/survey.dto';

@Injectable()
export class SurveysService {
  constructor(private readonly prisma: PrismaService) {}

  async submit(dto: SubmitSurveyDto, actor: CurrentUserPayload) {
    return this.prisma.satisfactionSurvey.create({
      data: {
        tenantId: actor.tenantId ?? null,
        overallRating: dto.overallRating,
        cleanliness: dto.cleanliness ?? null,
        staffService: dto.staffService ?? null,
        facility: dto.facility ?? null,
        valueForMoney: dto.valueForMoney ?? null,
        wouldRecommend: dto.wouldRecommend ?? null,
        comment: dto.comment?.trim() || null,
        createdById: actor.id,
      },
    });
  }

  async summary() {
    const rows = await this.prisma.satisfactionSurvey.findMany({ orderBy: { id: 'desc' } });
    const avg = (pick: (r: (typeof rows)[number]) => number | null | undefined) => {
      const vals = rows.map(pick).filter((v): v is number => typeof v === 'number');
      return vals.length ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10 : null;
    };
    const rec = rows.map((r) => r.wouldRecommend).filter((v): v is boolean => v !== null);
    const recommendRate = rec.length ? Math.round((rec.filter(Boolean).length / rec.length) * 100) : null;
    return {
      count: rows.length,
      avgOverall: avg((r) => r.overallRating),
      avgCleanliness: avg((r) => r.cleanliness),
      avgStaffService: avg((r) => r.staffService),
      avgFacility: avg((r) => r.facility),
      avgValueForMoney: avg((r) => r.valueForMoney),
      recommendRate,
      recentComments: rows
        .filter((r) => (r.comment ?? '').trim().length > 0)
        .slice(0, 8)
        .map((r) => ({ id: r.id, comment: r.comment, overallRating: r.overallRating, createdAt: r.createdAt })),
    };
  }

  /** Apakah penghuni ini sudah pernah mengisi survei (agar form bisa sembunyi/ubah). */
  async mineExists(actor: CurrentUserPayload) {
    if (!actor.tenantId) return { submitted: false };
    const last = await this.prisma.satisfactionSurvey.findFirst({
      where: { tenantId: actor.tenantId },
      orderBy: { id: 'desc' },
      select: { id: true, overallRating: true, createdAt: true },
    });
    return { submitted: Boolean(last), last };
  }

  async findAll() {
    return this.prisma.satisfactionSurvey.findMany({ orderBy: { id: 'desc' }, take: 200 });
  }
}
