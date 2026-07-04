import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AncillaryRevenueService {
  private readonly logger = new Logger(AncillaryRevenueService.name);
  constructor(private readonly prisma: PrismaService) {}

  /** Cari icon based on service name (frontend mapping) */
  private iconForService(name: string): string {
    const lower = name.toLowerCase();
    if (lower.includes('laundry')) return '🧺';
    if (lower.includes('galon') || lower.includes('air')) return '💧';
    if (lower.includes('bersih') || lower.includes('cleaning')) return '🧹';
    if (lower.includes('parkir')) return '🅿️';
    if (lower.includes('extra') || lower.includes('tamu')) return '🛌';
    if (lower.includes('kunci') || lower.includes('kartu') || lower.includes('key')) return '🔑';
    if (lower.includes('linen') || lower.includes('handuk')) return '🧺';
    if (lower.includes('snack') || lower.includes('minuman') || lower.includes('makan')) return '🥤';
    if (lower.includes('wifi') || lower.includes('voucher')) return '📶';
    return '🛒';
  }

  async getStreams() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1; // 1-indexed

    // Batas tanggal untuk bulan ini
    const monthStart = new Date(Date.UTC(year, month - 1, 1));
    const monthEnd = new Date(Date.UTC(year, month, 1)); // exclusive

    // — Active stream: WiFi sales aggregation —
    const wifiThisMonth = await this.prisma.wifiSale.aggregate({
      _count: { id: true },
      _sum: { soldPriceRupiah: true },
      where: { saleDate: { gte: monthStart, lt: monthEnd } },
    });
    const wifiTotal = await this.prisma.wifiSale.aggregate({
      _count: { id: true },
      _sum: { soldPriceRupiah: true },
    });

    const activeStreams = [
      {
        id: 'wifi',
        icon: '📶',
        name: 'Voucher WiFi',
        buyer: 'Tenant / tamu',
        status: 'Aktif sekarang',
        route: '/wifi-sales',
        note: 'Gunakan menu Voucher WiFi untuk mencatat penjualan.',
        stats: {
          thisMonth: {
            count: wifiThisMonth._count.id || 0,
            revenue: wifiThisMonth._sum.soldPriceRupiah || 0,
          },
          total: {
            count: wifiTotal._count.id || 0,
            revenue: wifiTotal._sum.soldPriceRupiah || 0,
          },
        },
      },
    ];

    // — Future streams: from AdditionalService catalog —
    const services = await this.prisma.additionalService.findMany({
      orderBy: { sortOrder: 'asc' },
      select: { id: true, name: true, description: true, isActive: true },
    });

    const futureStreams = services
      .filter((s) => !s.isActive)
      .map((s) => ({
        id: `svc-${s.id}`,
        icon: this.iconForService(s.name),
        name: s.name,
        status: 'Belum aktif',
        note: s.description || 'Direncanakan untuk dikembangkan ke depannya.',
      }));

    return {
      activeStreams,
      futureStreams,
      period: { year, month },
    };
  }
}
