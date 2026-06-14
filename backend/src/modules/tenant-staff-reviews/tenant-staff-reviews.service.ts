import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { StaffReviewStatus, UserRole } from '../../common/enums/app.enums';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import { PrismaService } from '../../prisma/prisma.service';
import { AppNotificationService } from '../notifications/app-notification.service';
import { CreateTenantStaffReviewDto } from './dto/tenant-staff-review.dto';

@Injectable()
export class TenantStaffReviewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notification: AppNotificationService,
  ) {}

  async eligible(user: CurrentUserPayload) {
    if (!user.tenantId) throw new ConflictException('Akun tenant belum terhubung ke data tenant');

    const tickets = await this.prisma.ticket.findMany({
      where: {
        tenantId: user.tenantId,
        status: { in: ['DONE', 'CLOSED'] as any },
        assignedToId: { not: null },
      },
      include: {
        assignedTo: { select: { id: true, fullName: true, role: true } },
        room: { select: { id: true, code: true, name: true } },
      },
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
      take: 20,
    });

    const ticketIds = tickets.map((ticket) => ticket.id);
    const existing = ticketIds.length ? await this.prisma.staffReview.findMany({
      where: { tenantId: user.tenantId, ticketId: { in: ticketIds } },
      select: { ticketId: true },
    }) : [];
    const reviewed = new Set(existing.map((item) => item.ticketId).filter(Boolean));

    return {
      items: tickets
        .filter((ticket) => ticket.assignedTo && !reviewed.has(ticket.id))
        .map((ticket) => ({
          ticketId: ticket.id,
          ticketNumber: ticket.ticketNumber,
          title: ticket.title,
          status: ticket.status,
          updatedAt: ticket.updatedAt,
          room: ticket.room,
          staff: ticket.assignedTo,
        })),
    };
  }

  async create(user: CurrentUserPayload, dto: CreateTenantStaffReviewDto) {
    if (!user.tenantId) throw new ConflictException('Akun tenant belum terhubung ke data tenant');
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: dto.ticketId },
      include: { assignedTo: true, tenant: true },
    });
    if (!ticket || ticket.tenantId !== user.tenantId) throw new NotFoundException('Tiket tidak ditemukan');
    if (!['DONE', 'CLOSED'].includes(ticket.status)) throw new ConflictException('Review hanya bisa diberikan setelah pekerjaan selesai');
    if (!ticket.assignedToId || ticket.assignedTo?.role !== 'STAFF') throw new ConflictException('Tiket belum memiliki staff yang bisa direview');

    // F2-18 (gate ≤2): review rating rendah (≤2) MENUNGGU verifikasi owner sebelum tampil
    // & sebelum dihitung KPI (buildSummaryForStaff hanya hitung status VISIBLE). Melindungi
    // staf dari review buruk yang belum diverifikasi. Rating >2 langsung VISIBLE.
    const needsVerification = dto.rating <= 2;
    let review: any;
    try {
      review = await this.prisma.staffReview.create({
        data: {
          staffId: ticket.assignedToId,
          tenantId: user.tenantId,
          ticketId: ticket.id,
          rating: dto.rating,
          comment: dto.comment?.trim() || null,
          status: (needsVerification ? StaffReviewStatus.PENDING_VERIFICATION : StaffReviewStatus.VISIBLE) as any,
        },
        include: { staff: { select: { id: true, fullName: true, role: true } } },
      });
    } catch (error: any) {
      if (error?.code === 'P2002') {
        throw new ConflictException('Review untuk pekerjaan ini sudah pernah dikirim.');
      }
      throw error;
    }

    // Notify admin/owner if rating is low (≤2) — there's a complaint
    if (dto.rating <= 2) {
      const admins = await this.prisma.user.findMany({
        where: { role: { in: [UserRole.OWNER as any, UserRole.ADMIN as any] }, isActive: true },
        select: { id: true },
      });
      const tenantName = ticket.tenant?.fullName || user.fullName || 'Tenant';
      const staffName = ticket.assignedTo?.fullName || `Staff #${ticket.assignedToId}`;
      const complaintLabel = dto.comment?.startsWith('[') ? dto.comment.split(']')[0].replace('[', '') : 'Kualitas kerja';
      for (const admin of admins) {
        await this.notification.create({
          recipientUserId: admin.id,
          title: `⚠️ Komplain ${tenantName} — perlu verifikasi`,
          body: `Rating ${dto.rating}/5 untuk staff ${staffName} — ${complaintLabel}. ${dto.comment ? dto.comment : ''} Review MENUNGGU verifikasi Anda; belum tampil & belum dihitung KPI sampai diverifikasi.`,
          linkTo: `/staff-performance`,
          entityType: 'StaffReview',
          entityId: String(review.id),
        });
      }
    }

    // Notify staff about their review
    if (dto.rating >= 4) {
      await this.notification.create({
        recipientUserId: ticket.assignedToId,
        title: '⭐ Review positif dari tenant',
        body: `Tenant memberi rating ${dto.rating}/5 untuk pekerjaan: ${ticket.title || `Tiket #${ticket.id}`}`,
        linkTo: `/staff/monthly-report`,
        entityType: 'StaffReview',
        entityId: String(review.id),
      });
    }

    return review;
  }

  /** F2-18: daftar review tenant yang menunggu verifikasi owner (rating ≤2). */
  async listPendingVerification() {
    return this.prisma.staffReview.findMany({
      where: { status: StaffReviewStatus.PENDING_VERIFICATION as any },
      select: {
        id: true,
        rating: true,
        comment: true,
        ticketId: true,
        createdAt: true,
        staff: { select: { id: true, fullName: true } },
        tenant: { select: { id: true, fullName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * F2-18: owner verifikasi review ≤2 — APPROVE → VISIBLE (mulai dihitung KPI),
   * DISMISS → HIDDEN (tidak adil/abuse → tak dihitung). Hanya dari PENDING_VERIFICATION.
   */
  async verify(id: number, decision: 'APPROVE' | 'DISMISS', actor: CurrentUserPayload) {
    const review = await this.prisma.staffReview.findUnique({ where: { id } });
    if (!review) throw new NotFoundException('Review tidak ditemukan');
    if (review.status !== StaffReviewStatus.PENDING_VERIFICATION) {
      throw new ConflictException('Hanya review berstatus menunggu verifikasi yang dapat diverifikasi.');
    }
    const next = decision === 'APPROVE' ? StaffReviewStatus.VISIBLE : StaffReviewStatus.HIDDEN;
    const updated = await this.prisma.staffReview.update({
      where: { id },
      data: { status: next as any, moderatedById: actor.id },
    });
    // Beri tahu staf hanya bila review jadi VISIBLE (mempengaruhi KPI).
    if (next === StaffReviewStatus.VISIBLE) {
      await this.notification.create({
        recipientUserId: review.staffId,
        title: 'ℹ️ Review tenant diverifikasi',
        body: `Sebuah review (rating ${review.rating}/5) telah diverifikasi owner dan kini tercatat pada kinerja Anda.`,
        linkTo: '/staff/monthly-report',
        entityType: 'StaffReview',
        entityId: String(review.id),
      }).catch(() => undefined);
    }
    return updated;
  }
}