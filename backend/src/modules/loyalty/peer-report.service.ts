import { ConflictException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AppNotificationService } from '../notifications/app-notification.service';
import { LoyaltyService } from './loyalty.service';
import { LOYALTY_POINTS_PEER_IMPROVEMENT } from './loyalty.constants';
import { CreatePeerReportDto } from './dto/loyalty.dto';

const ACTIVE_STATUSES = ['PENDING_REVIEW', 'ACKNOWLEDGED', 'IMPROVED'];

/**
 * F4-13c — quest perbaikan sikap antar-tenant (ANONIM). Tenant A lapor B; admin moderasi;
 * B diberi tahu TANPA identitas A; B perbaiki; A atau admin konfirmasi → B dapat poin.
 * PRIVASI: identitas pelapor (reporterTenantId) TAK PERNAH diekspos ke reportee.
 */
@Injectable()
export class PeerReportService {
  private readonly logger = new Logger(PeerReportService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly loyalty: LoyaltyService,
    private readonly appNotification: AppNotificationService,
  ) {}

  async create(reporterTenantId: number, dto: CreatePeerReportDto) {
    if (reporterTenantId === dto.reporteeTenantId) {
      throw new ConflictException('Tidak bisa melapor diri sendiri.');
    }
    const reportee = await this.prisma.tenant.findUnique({ where: { id: dto.reporteeTenantId }, select: { id: true } });
    if (!reportee) throw new NotFoundException('Tenant yang dilaporkan tidak ditemukan.');

    const existing = await this.prisma.peerBehaviorReport.findFirst({
      where: { reporterTenantId, reporteeTenantId: dto.reporteeTenantId, category: dto.category, status: { in: ACTIVE_STATUSES as any } },
      select: { id: true },
    });
    if (existing) throw new ConflictException('Sudah ada laporan aktif untuk tenant & kategori ini.');

    const report = await this.prisma.peerBehaviorReport.create({
      data: { reporterTenantId, reporteeTenantId: dto.reporteeTenantId, category: dto.category, description: dto.description },
      select: { id: true, category: true, status: true, createdAt: true },
    });

    // Notif admin/owner untuk moderasi (tanpa membuka identitas ke tenant).
    const admins = await this.prisma.user.findMany({ where: { role: { in: ['ADMIN', 'OWNER'] as any }, isActive: true }, select: { id: true } });
    for (const admin of admins) {
      await this.appNotification
        .createOnce({ recipientUserId: admin.id, title: '🧑‍⚖️ Laporan sikap tenant perlu moderasi', body: `Ada laporan antar-tenant kategori ${dto.category}. Tinjau & validasi.`, linkTo: '/loyalty', entityType: 'PeerReport', entityId: String(report.id) })
        .catch(() => undefined);
    }
    return report;
  }

  async moderate(id: number, decision: 'ACKNOWLEDGE' | 'DISMISS', moderatorUserId: number) {
    const report = await this.prisma.peerBehaviorReport.findUnique({ where: { id } });
    if (!report) throw new NotFoundException('Laporan tidak ditemukan.');
    if (report.status !== 'PENDING_REVIEW') throw new ConflictException(`Laporan sudah ${report.status}.`);

    if (decision === 'DISMISS') {
      return this.prisma.peerBehaviorReport.update({ where: { id }, data: { status: 'DISMISSED' as any, moderatedById: moderatorUserId }, select: { id: true, status: true } });
    }

    const updated = await this.prisma.peerBehaviorReport.update({
      where: { id },
      data: { status: 'ACKNOWLEDGED' as any, acknowledgedAt: new Date(), moderatedById: moderatorUserId },
      select: { id: true, status: true, category: true, description: true, reporteeTenantId: true },
    });

    // Notif ke reportee — ANONIM (tanpa identitas pelapor).
    const bUser = await this.prisma.user.findFirst({ where: { tenantId: updated.reporteeTenantId, isActive: true }, select: { id: true } });
    if (bUser) {
      await this.appNotification
        .create({ recipientUserId: bUser.id, title: '💬 Masukan untuk Anda', body: `Ada masukan terkait "${updated.category}": ${updated.description}. Mohon diperbaiki — setelah membaik & dikonfirmasi, Anda mendapat poin.`, linkTo: '/portal/loyalty', entityType: 'PeerReport', entityId: String(updated.id) })
        .catch(() => undefined);
    }
    return { id: updated.id, status: updated.status };
  }

  async markImproved(reporteeTenantId: number, id: number) {
    const report = await this.prisma.peerBehaviorReport.findFirst({ where: { id, reporteeTenantId }, select: { id: true, status: true } });
    if (!report) throw new NotFoundException('Laporan tidak ditemukan.');
    if (report.status !== 'ACKNOWLEDGED') throw new ConflictException('Laporan belum bisa ditandai membaik.');
    return this.prisma.peerBehaviorReport.update({ where: { id }, data: { status: 'IMPROVED' as any, improvedAt: new Date() }, select: { id: true, status: true } });
  }

  /** Konfirmasi B membaik — oleh A (pelapor) ATAU admin/owner → B dapat poin. */
  async confirm(id: number, actor: { id: number; role: string; tenantId: number | null }) {
    const report = await this.prisma.peerBehaviorReport.findUnique({ where: { id } });
    if (!report) throw new NotFoundException('Laporan tidak ditemukan.');
    if (report.status !== 'IMPROVED') throw new ConflictException('Belum ada klaim perbaikan dari tenant.');

    const isReporter = actor.tenantId != null && actor.tenantId === report.reporterTenantId;
    const isAdmin = actor.role === 'ADMIN' || actor.role === 'OWNER';
    if (!isReporter && !isAdmin) throw new ForbiddenException('Hanya pelapor atau admin yang dapat mengonfirmasi.');

    await this.loyalty.award({
      tenantId: report.reporteeTenantId,
      delta: Math.max(0, Math.floor(LOYALTY_POINTS_PEER_IMPROVEMENT)),
      reason: 'ADJUSTMENT',
      sourceType: 'PEER_IMPROVEMENT',
      sourceId: String(report.id),
      note: 'Perbaikan sikap dikonfirmasi',
      createdById: actor.id,
    });

    return this.prisma.peerBehaviorReport.update({ where: { id }, data: { status: 'CONFIRMED' as any, confirmedAt: new Date() }, select: { id: true, status: true } });
  }

  async listForAdmin(status?: string) {
    return this.prisma.peerBehaviorReport.findMany({
      where: status ? { status: status as any } : {},
      orderBy: { id: 'desc' },
      take: 200,
      include: { reporter: { select: { fullName: true } }, reportee: { select: { fullName: true } } },
    });
  }

  /** Laporan yang DIBUAT tenant ini (sebagai pelapor) — termasuk reportee. */
  async listMadeBy(reporterTenantId: number) {
    return this.prisma.peerBehaviorReport.findMany({
      where: { reporterTenantId },
      orderBy: { id: 'desc' },
      take: 100,
      include: { reportee: { select: { fullName: true } } },
    });
  }

  /** Daftar penghuni lain (aktif) untuk dipilih saat melapor — minimal (id, nama, kamar). */
  async listCoTenants(selfTenantId: number) {
    const stays = await this.prisma.stay.findMany({
      where: { status: 'ACTIVE' as any, initialMetersPromotedAt: { not: null }, tenantId: { not: selfTenantId } },
      orderBy: { id: 'desc' },
      select: { tenant: { select: { id: true, fullName: true } }, room: { select: { code: true, name: true } } },
    });
    const seen = new Set<number>();
    const out: Array<{ id: number; fullName: string; room: string | null }> = [];
    for (const s of stays) {
      if (!s.tenant || seen.has(s.tenant.id)) continue;
      seen.add(s.tenant.id);
      out.push({ id: s.tenant.id, fullName: s.tenant.fullName, room: s.room?.code || s.room?.name || null });
    }
    return out;
  }

  /** Laporan TENTANG tenant ini (reportee) — ANONIM, tak ada info pelapor. */
  async listAboutMe(reporteeTenantId: number) {
    const rows = await this.prisma.peerBehaviorReport.findMany({
      where: { reporteeTenantId, status: { in: ['ACKNOWLEDGED', 'IMPROVED', 'CONFIRMED'] as any } },
      orderBy: { id: 'desc' },
      take: 100,
      select: { id: true, category: true, description: true, status: true, acknowledgedAt: true, improvedAt: true, confirmedAt: true },
    });
    return rows; // sengaja TIDAK menyertakan reporterTenantId
  }
}
