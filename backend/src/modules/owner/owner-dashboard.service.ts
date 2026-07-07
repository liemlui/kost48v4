import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { FinanceService } from '../finance/finance.service';
import { AccountingReadinessService } from '../accounting/accounting-readiness.service';

@Injectable()
export class OwnerDashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly financeService: FinanceService,
    private readonly readinessService: AccountingReadinessService,
  ) {}

  async aggregate(year?: number, month?: number, trendMonths?: number) {
    const [dashboard, readiness, meterDue] = await Promise.all([
      this.financeService.ownerDashboard({ year, month, trendMonths }),
      this.readinessService.getReadiness(),
      this.computeMeterDue(year, month),
    ]);
    return { dashboard, readiness, meterDue };
  }

  private async computeMeterDue(year?: number, month?: number) {
    const now = new Date();
    const y = year ?? now.getFullYear();
    const m = month ?? now.getMonth() + 1;
    const lastDay = new Date(y, m, 0).getDate();
    const from = new Date(Date.UTC(y, m - 1, 1));
    const to = new Date(Date.UTC(y, m - 1, lastDay, 23, 59, 59, 999));

    const [stays, readings] = await Promise.all([
      this.prisma.stay.groupBy({
        by: ['roomId'],
        where: { status: 'ACTIVE' as any, initialMetersPromotedAt: { not: null } },
      }),
      this.prisma.meterReading.groupBy({
        by: ['roomId'],
        where: { readingAt: { gte: from, lte: to } },
      }),
    ]);

    const occupiedRoomIds = new Set(stays.map((s) => s.roomId));
    const recordedRoomIds = new Set(readings.map((r) => r.roomId));
    const recorded = [...recordedRoomIds].filter((id) => occupiedRoomIds.has(id)).length;
    return {
      occupied: occupiedRoomIds.size,
      recorded,
      due: Math.max(0, occupiedRoomIds.size - recorded),
    };
  }
}
