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

  /**
   * Status survei tenant — dengan timing gate (min 30 hari menginap) dan
   * re-submit periodik (setiap 6 bulan bisa isi ulang).
   *
   * Response shape:
   * - `submitted`: apakah tenant sudah pernah submit survei
   * - `eligible`: apakah form boleh ditampilkan (false = belum waktunya)
   * - `reason?`: alasan tidak eligible ('min_stay_30_days' | 'cooldown_6_months')
   * - `eligibleAt?` / `nextEligibleAt?`: kapan form tersedia kembali (ISO string)
   * - `last?`: survei terakhir (jika sudah pernah)
   */
  async mineExists(actor: CurrentUserPayload) {
    if (!actor.tenantId) return { submitted: false, eligible: false };

    // Cari stay aktif penghuni untuk timing gate 30 hari
    const activeStay = await this.prisma.stay.findFirst({
      where: { tenantId: actor.tenantId, status: 'ACTIVE' },
      orderBy: { checkInDate: 'desc' },
      select: { checkInDate: true },
    });

    // Cari survei terakhir tenant
    const last = await this.prisma.satisfactionSurvey.findFirst({
      where: { tenantId: actor.tenantId },
      orderBy: { id: 'desc' },
      select: { id: true, overallRating: true, createdAt: true },
    });

    const submitted = Boolean(last);

    // Gate 1: minimal 30 hari sejak check-in stay aktif
    if (activeStay) {
      const msInDay = 1000 * 60 * 60 * 24;
      const daysSinceCheckIn = Math.floor((Date.now() - activeStay.checkInDate.getTime()) / msInDay);
      if (daysSinceCheckIn < 30) {
        const eligibleDate = new Date(activeStay.checkInDate);
        eligibleDate.setDate(eligibleDate.getDate() + 30);
        return { submitted: false, eligible: false, reason: 'min_stay_30_days' as const, eligibleAt: eligibleDate.toISOString() };
      }
    }

    // Gate 2: re-submit hanya tiap 6 bulan
    if (last) {
      const msInMonth = 1000 * 60 * 60 * 24 * 30.44; // rata-rata hari per bulan
      const monthsSinceLast = (Date.now() - last.createdAt.getTime()) / msInMonth;
      if (monthsSinceLast < 6) {
        const nextEligible = new Date(last.createdAt);
        nextEligible.setMonth(nextEligible.getMonth() + 6);
        return {
          submitted: true,
          eligible: false,
          reason: 'cooldown_6_months' as const,
          last,
          nextEligibleAt: nextEligible.toISOString(),
        };
      }
      // Sudah lewat 6 bulan → boleh isi ulang
      return { submitted: true, eligible: true, last };
    }

    // Belum pernah submit, tidak ada stay aktif, atau stay aktif >30 hari
    return { submitted: false, eligible: true };
  }

  async findAll() {
    return this.prisma.satisfactionSurvey.findMany({ orderBy: { id: 'desc' }, take: 200 });
  }
}
