import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma';
import { InvoiceStatus, RenewRequestStatus } from '../../../common/enums/app.enums';
import { PrismaService } from '../../../prisma/prisma.service';
import { AccountingPostingService } from '../../accounting/accounting-posting.service';
import { AppNotificationService } from '../../notifications/app-notification.service';

@Injectable()
export class RenewalSweepService {
  private readonly logger = new Logger(RenewalSweepService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly accountingPosting: AccountingPostingService,
    private readonly appNotification: AppNotificationService,
  ) {}

  wibToday(): Date {
    const now = new Date();
    const jakartaNow = new Date(now.getTime() + 7 * 3600 * 1000);
    return new Date(Date.UTC(jakartaNow.getUTCFullYear(), jakartaNow.getUTCMonth(), jakartaNow.getUTCDate()));
  }

  /**
   * F2-1 inc.3 sweeper renewal (HIBRIDA — keputusan owner 2026-06-13):
   * AWAITING_DP yang lewat hari-H (downPaymentDueDate) tanpa DP lunas → EXPIRED_PRIORITY.
   * OTOMATIS karena tenant lama belum terikat uang lunas: prioritas hangus + invoice DP
   * belum-bayar dibatalkan (reversal jurnal bila sudah ISSUED+POSTED) + notif tenant.
   * Kamar TIDAK perlu disentuh — ketersediaan booking tak pernah dikunci RenewRequest;
   * kamar terbuka untuk periode pasca-checkout lewat flow normal (noon-release/checkout).
   * Bila invoice DP ternyata sudah PAID/PARTIAL (admin belum confirm) → DILEWATI (manusia putuskan).
   */
  async runRenewalPriorityExpiry(options: { actorUserId?: number | null; source?: string } = {}) {
    const todayWib = this.wibToday();
    const source = options.source ?? 'AUTO_OPS_RENEWAL_EXPIRY';
    const candidates = await this.prisma.renewRequest.findMany({
      where: {
        status: RenewRequestStatus.AWAITING_DP as any,
        downPaymentDueDate: { not: null, lt: todayWib },
      },
      select: { id: true, stayId: true, tenantId: true, downPaymentInvoiceId: true },
      take: 100,
    });

    const expiredRenewRequestIds: number[] = [];
    for (const req of candidates) {
      try {
        const expired = await this.expireRenewalPriorityTx(req, options.actorUserId ?? null, source);
        if (expired) {
          expiredRenewRequestIds.push(req.id);
          await this.notifyTenantRenewalExpired(req.stayId, req.tenantId).catch((err) =>
            this.logger.warn(`Notif tenant renewal-expired gagal (req #${req.id}): ${err instanceof Error ? err.message : String(err)}`),
          );
        }
      } catch (err) {
        this.logger.warn(`AutoOps renewal-expiry gagal untuk request #${req.id}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
    return { expiredRenewRequestIds };
  }

  async expireRenewalPriorityTx(
    req: { id: number; stayId: number; tenantId: number; downPaymentInvoiceId: number | null },
    actorUserId: number | null,
    source: string,
  ): Promise<boolean> {
    return this.prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<Array<{ status: string }>>(
        Prisma.sql`SELECT status FROM "RenewRequest" WHERE id = ${req.id} FOR UPDATE`,
      );
      if (!rows[0] || rows[0].status !== 'AWAITING_DP') return false;

      // Batalkan invoice DP belum-bayar; uang yang sudah masuk (PAID/PARTIAL) wajib keputusan manusia.
      if (req.downPaymentInvoiceId) {
        const dpInvoice = await tx.invoice.findUnique({
          where: { id: req.downPaymentInvoiceId },
          select: { id: true, status: true, invoiceNumber: true },
        });
        if (dpInvoice && (dpInvoice.status === InvoiceStatus.PAID || dpInvoice.status === InvoiceStatus.PARTIAL)) {
          return false;
        }
        if (dpInvoice && (dpInvoice.status === InvoiceStatus.ISSUED || dpInvoice.status === InvoiceStatus.DRAFT)) {
          await tx.invoice.update({
            where: { id: dpInvoice.id },
            data: {
              status: InvoiceStatus.CANCELLED as any,
              cancelReason: 'Prioritas perpanjangan hangus: DP 30% tidak masuk hingga hari-H.',
            },
          });
          const postedJournal = await tx.journalEntry.findFirst({
            where: { sourceType: 'INVOICE' as any, sourceId: String(dpInvoice.id), status: 'POSTED' as any },
            select: { id: true },
          });
          if (postedJournal) {
            const reversal = await this.accountingPosting.postInvoiceCancellationReversalTx(tx, dpInvoice.id, actorUserId);
            if (reversal?.skipped) {
              throw new ConflictException(
                `Reversal jurnal invoice DP ${dpInvoice.invoiceNumber ?? dpInvoice.id} gagal: ${reversal.reason ?? 'alasan tidak diketahui'}`,
              );
            }
          }
        }
      }

      await tx.renewRequest.update({
        where: { id: req.id },
        data: {
          status: RenewRequestStatus.EXPIRED_PRIORITY as any,
          reviewNotes: `[AUTO ${source}] Prioritas perpanjangan hangus: DP 30% tidak masuk s/d hari-H.`,
        },
      });
      return true;
    });
  }

  async notifyTenantRenewalExpired(stayId: number, tenantId: number) {
    const tenantUser = await this.prisma.user.findFirst({
      where: { tenantId, role: 'TENANT' as any, isActive: true },
      select: { id: true },
    });
    if (!tenantUser) return;
    const title = '⌛ Prioritas perpanjangan kamar hangus';
    const existing = await (this.prisma as any).appNotification.findFirst({
      where: { recipientUserId: tenantUser.id, entityType: 'Stay', entityId: String(stayId), title },
      select: { id: true },
    });
    if (existing) return;
    await this.appNotification.create({
      recipientUserId: tenantUser.id,
      title,
      body: 'DP 30% perpanjangan tidak kami terima hingga hari-H, sehingga prioritas perpanjangan Anda hangus dan kamar dibuka untuk pemesan lain. Bila kamar masih tersedia Anda dapat mengajukan perpanjangan ulang, atau silakan lakukan checkout sesuai jadwal.',
      linkTo: '/portal/stay',
      entityType: 'Stay',
      entityId: String(stayId),
    });
  }

  /**
   * F2-1 inc.3 sweeper renewal (HIBRIDA — keputusan owner 2026-06-13):
   * DP_SECURED yang gagal lunas s/d H+7 (settlementDueDate lewat) → FORFEITED.
   * Hanya DITANDAI + notif admin: tenant masih huni, jadi forced checkout & potong deposit
   * dilakukan admin MANUAL lewat flow checkout normal (keputusan owner: potong deposit manual).
   * DP yang sudah dibayar = hangus (tetap sebagai revenue invoice DP yang sudah PAID).
   */
  async runRenewalSettlementForfeit(options: { actorUserId?: number | null; source?: string } = {}) {
    const todayWib = this.wibToday();
    const source = options.source ?? 'AUTO_OPS_RENEWAL_FORFEIT';
    const candidates = await this.prisma.renewRequest.findMany({
      where: {
        status: RenewRequestStatus.DP_SECURED as any,
        settlementDueDate: { not: null, lt: todayWib },
      },
      select: { id: true, stayId: true, settlementInvoiceId: true, settlementDueDate: true },
      take: 100,
    });

    const forfeitedRenewRequestIds: number[] = [];
    for (const req of candidates) {
      try {
        const updated = await this.prisma.$transaction(async (tx) => {
          const rows = await tx.$queryRaw<Array<{ status: string }>>(
            Prisma.sql`SELECT status FROM "RenewRequest" WHERE id = ${req.id} FOR UPDATE`,
          );
          if (!rows[0] || rows[0].status !== 'DP_SECURED') return false;
          if (req.settlementInvoiceId) {
            const settlementInvoice = await tx.invoice.findUnique({
              where: { id: req.settlementInvoiceId },
              select: { id: true, invoiceNumber: true, status: true, paidAt: true },
            });
            if (settlementInvoice?.status === InvoiceStatus.PAID || settlementInvoice?.status === InvoiceStatus.PARTIAL) {
              return false;
            }
            if (
              settlementInvoice
              && [InvoiceStatus.DRAFT, InvoiceStatus.ISSUED].includes(settlementInvoice.status as InvoiceStatus)
            ) {
              await tx.invoice.update({
                where: { id: settlementInvoice.id },
                data: {
                  status: InvoiceStatus.CANCELLED,
                  cancelReason: 'Pelunasan renewal tidak masuk hingga batas H+7.',
                },
              });
              const postedJournal = await tx.journalEntry.findFirst({
                where: {
                  sourceType: 'INVOICE' as any,
                  sourceId: String(settlementInvoice.id),
                  status: 'POSTED' as any,
                },
                select: { id: true },
              });
              if (postedJournal) {
                const reversal = await this.accountingPosting.postInvoiceCancellationReversalTx(
                  tx,
                  settlementInvoice.id,
                  options.actorUserId ?? null,
                );
                if (reversal?.skipped) {
                  throw new ConflictException(
                    `Reversal jurnal invoice pelunasan ${settlementInvoice.invoiceNumber} gagal: ${reversal.reason ?? 'alasan tidak diketahui'}`,
                  );
                }
              }
            }
          }
          await tx.renewRequest.update({
            where: { id: req.id },
            data: {
              status: RenewRequestStatus.FORFEITED as any,
              reviewNotes: `[AUTO ${source}] Gagal lunas s/d H+7 → FORFEITED. DP hangus; admin lakukan forced checkout + settle deposit manual.`,
            },
          });
          return true;
        });
        if (updated) {
          forfeitedRenewRequestIds.push(req.id);
          await this.notifyAdminsRenewalForfeited(req.id, req.stayId).catch((err) =>
            this.logger.warn(`Notif admin renewal-forfeit gagal (req #${req.id}): ${err instanceof Error ? err.message : String(err)}`),
          );
        }
      } catch (err) {
        this.logger.warn(`AutoOps renewal-forfeit gagal untuk request #${req.id}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
    return { forfeitedRenewRequestIds };
  }

  async notifyAdminsRenewalForfeited(requestId: number, stayId: number) {
    const title = `🚨 Perpanjangan stay #${stayId} hangus (gagal lunas H+7)`;
    const admins = await this.prisma.user.findMany({
      where: { role: { in: ['ADMIN', 'OWNER'] as any }, isActive: true },
      select: { id: true },
    });
    for (const admin of admins) {
      const existing = await (this.prisma as any).appNotification.findFirst({
        where: { recipientUserId: admin.id, entityType: 'RenewRequest', entityId: String(requestId), title },
        select: { id: true },
      });
      if (existing) continue;
      try {
        await this.appNotification.create({
          recipientUserId: admin.id,
          title,
          body: 'Tenant sudah mengamankan DP perpanjangan tetapi gagal melunasi sisa hingga H+7. Status renewal → FORFEITED (DP hangus). Lakukan forced checkout + setel deposit jaminan secara manual (flow checkout normal).',
          linkTo: '/stays',
          entityType: 'RenewRequest',
          entityId: String(requestId),
        });
      } catch (err) {
        this.logger.warn(`Notifikasi admin renewal-forfeit gagal (req #${requestId}): ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }
}
