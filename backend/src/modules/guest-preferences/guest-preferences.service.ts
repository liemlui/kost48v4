import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface GuestPreferencesQuery {
  page?: number;
  pageSize?: number;
  skipped?: boolean;
  dateFrom?: string;
  dateTo?: string;
}

export interface GuestPreferencesStats {
  total: number;
  totalThisMonth: number;
  totalSkipped: number;
  totalCompleted: number;
  avgEstimatedPrice: number | null;
  preferenceCounts: {
    bathroom: Record<string, number>;
    cooling: Record<string, number>;
    roomSize: Record<string, number>;
    roomType: Record<string, number>;
  };
}

@Injectable()
export class GuestPreferencesService {
  private readonly logger = new Logger(GuestPreferencesService.name);
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: GuestPreferencesQuery) {
    const page = Math.max(1, query.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, query.pageSize ?? 50));
    const skip = (page - 1) * pageSize;

    const where: Record<string, unknown> = {};
    if (query.skipped !== undefined) {
      where.skipped = query.skipped;
    }
    if (query.dateFrom || query.dateTo) {
      const createdAt: Record<string, Date> = {};
      if (query.dateFrom) createdAt.gte = new Date(query.dateFrom);
      if (query.dateTo) createdAt.lte = new Date(query.dateTo);
      where.createdAt = createdAt;
    }

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.guestPreferenceSurvey.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      this.prisma.guestPreferenceSurvey.count({ where }),
    ]);

    return { rows, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async getStats(): Promise<GuestPreferencesStats> {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth(); // 0-indexed

    const monthStart = new Date(Date.UTC(year, month, 1));
    const monthEnd = new Date(Date.UTC(year, month + 1, 1));

    const [total, totalThisMonth, allRows] = await this.prisma.$transaction([
      this.prisma.guestPreferenceSurvey.count(),
      this.prisma.guestPreferenceSurvey.count({
        where: { createdAt: { gte: monthStart, lt: monthEnd } },
      }),
      this.prisma.guestPreferenceSurvey.findMany({
        select: {
          bathroom: true,
          cooling: true,
          roomSize: true,
          roomType: true,
          skipped: true,
          estimatedPriceRupiah: true,
        },
      }),
    ]);

    const totalSkipped = allRows.filter((r) => r.skipped).length;
    const totalCompleted = total - totalSkipped;

    // Hitung rata-rata estimasi harga (exclude null)
    const prices = allRows
      .map((r) => r.estimatedPriceRupiah)
      .filter((p): p is number => p !== null && p !== undefined);
    const avgEstimatedPrice = prices.length > 0
      ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length)
      : null;

    // Hitung distribusi preferensi
    const countBy = (items: (string | null)[]): Record<string, number> => {
      const map: Record<string, number> = {};
      for (const item of items) {
        const key = item ?? '(kosong)';
        map[key] = (map[key] ?? 0) + 1;
      }
      return map;
    };

    const preferenceCounts = {
      bathroom: countBy(allRows.map((r) => r.bathroom)),
      cooling: countBy(allRows.map((r) => r.cooling)),
      roomSize: countBy(allRows.map((r) => r.roomSize)),
      roomType: countBy(allRows.map((r) => r.roomType)),
    };

    return {
      total,
      totalThisMonth,
      totalSkipped,
      totalCompleted,
      avgEstimatedPrice,
      preferenceCounts,
    };
  }
}
