import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AdminDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async aggregate() {
    const [
      rooms,
      stays,
      invoices,
      tickets,
      renewRequests,
      checkoutPending,
      checkoutApproved,
      paymentReviewItems,
      paymentReviewTotal,
      inventoryItems,
    ] = await Promise.all([
      this.prisma.room.findMany({
        where: { isActive: true },
        orderBy: { code: 'asc' },
      }),
      this.prisma.stay.findMany({
        where: { status: 'ACTIVE' as any },
        include: {
          room: true,
          tenant: { select: { id: true, fullName: true } },
        },
        take: 300,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.invoice.findMany({
        include: {
          stay: {
            include: {
              tenant: { select: { id: true, fullName: true } },
              room: { select: { id: true, code: true } },
            },
          },
        },
        take: 500,
        orderBy: { issuedAt: 'desc' },
      }),
      this.prisma.ticket.findMany({
        take: 150,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.renewRequest.findMany({
        where: { status: { in: ['PENDING', 'PENDING_DECISION', 'AWAITING_DP', 'DP_SECURED'] as any[] } },
        include: {
          tenant: { select: { id: true, fullName: true } },
          stay: { include: { room: { select: { id: true, code: true } } } },
        },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.checkoutRequest.findMany({
        where: { status: 'PENDING' as any },
        include: {
          stay: {
            include: {
              tenant: { select: { id: true, fullName: true } },
              room: { select: { id: true, code: true } },
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.checkoutRequest.findMany({
        where: { status: 'APPROVED' as any },
        include: {
          stay: {
            include: {
              tenant: { select: { id: true, fullName: true } },
              room: { select: { id: true, code: true } },
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.paymentSubmission.findMany({
        where: { status: 'PENDING_REVIEW' as any },
        include: {
          invoice: { select: { id: true, invoiceNumber: true } },
          tenant: { select: { id: true, fullName: true } },
        },
        orderBy: { createdAt: 'asc' },
        take: 25,
      }),
      this.prisma.paymentSubmission.count({ where: { status: 'PENDING_REVIEW' as any } }),
      this.prisma.inventoryItem.findMany({
        take: 150,
        orderBy: { name: 'asc' },
      }),
    ]);

    return {
      rooms: { items: rooms },
      stays: { items: stays },
      invoices: { items: invoices },
      tickets: { items: tickets },
      renewRequests: { items: renewRequests },
      checkoutPending: { items: checkoutPending },
      checkoutApproved: { items: checkoutApproved },
      paymentReview: { items: paymentReviewItems, meta: { totalItems: paymentReviewTotal } },
      inventoryItems: { items: inventoryItems },
    };
  }
}
