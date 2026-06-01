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

    const existing = await this.prisma.staffReview.findFirst({ where: { tenantId: user.tenantId, ticketId: ticket.id } });
    if (existing) throw new ConflictException('Review untuk pekerjaan ini sudah pernah dikirim');

    const review = await this.prisma.staffReview.create({
      data: {
        staffId: ticket.assignedToId,
        tenantId: user.tenantId,
        ticketId: ticket.id,
        rating: dto.rating,
        comment: dto.comment?.trim() || null,
        status: StaffReviewStatus.VISIBLE as any,
      },
      include: { staff: { select: { id: true, fullName: true, role: true } } },
    });

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
          title: `⚠️ Komplain dari ${tenantName}`,
          body: `Rating ${dto.rating}/5 untuk staff ${staffName} — ${complaintLabel}. ${dto.comment ? dto.comment : ''}`,
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
}