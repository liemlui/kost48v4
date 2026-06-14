import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '../../generated/prisma';
import { PrismaService } from '../../prisma/prisma.service';
import { LoyaltyService } from './loyalty.service';
import { LOYALTY_POINTS_REFERRAL } from './loyalty.constants';

/**
 * F4-13 — referral teman (S-4). Tenant punya KODE referral; teman memasukkannya saat
 * booking publik → tertaut. Saat teman jadi tenant AKTIF (promoted), referrer dapat poin.
 * Pemberian poin via sweeper (decoupled, idempotent per referralId).
 */
@Injectable()
export class ReferralService {
  private readonly logger = new Logger(ReferralService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly loyalty: LoyaltyService,
  ) {}

  /** Ambil/buat kode referral milik tenant. */
  async getOrCreateCode(tenantId: number) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId }, select: { referralCode: true } });
    if (tenant?.referralCode) return { code: tenant.referralCode };
    let code = '';
    for (let attempt = 0; attempt < 6; attempt += 1) {
      code = `REF${tenantId}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
      const clash = await this.prisma.tenant.findUnique({ where: { referralCode: code }, select: { id: true } });
      if (!clash) break;
    }
    await this.prisma.tenant.update({ where: { id: tenantId }, data: { referralCode: code } });
    return { code };
  }

  /**
   * Tautkan referral saat booking publik (di dalam tx pembuatan tenant baru).
   * Best-effort: kode tak valid / self-referral → diabaikan.
   */
  async linkReferralTx(tx: Prisma.TransactionClient, params: { referralCode?: string | null; referredTenantId: number }) {
    const code = (params.referralCode ?? '').trim();
    if (!code) return;
    const referrer = await tx.tenant.findUnique({ where: { referralCode: code }, select: { id: true } });
    if (!referrer || referrer.id === params.referredTenantId) return;
    await tx.tenantReferral.upsert({
      where: { referredTenantId: params.referredTenantId },
      create: { referrerTenantId: referrer.id, referredTenantId: params.referredTenantId, status: 'PENDING' as any },
      update: {},
    });
  }

  /** Sweeper: referral PENDING yang teman-nya sudah tenant aktif (promoted) → award referrer. */
  async rewardEligible(options: { actorUserId?: number | null } = {}) {
    const pending = await this.prisma.tenantReferral.findMany({
      where: { status: 'PENDING' as any, referredTenantId: { not: null } },
      take: 100,
      select: { id: true, referrerTenantId: true, referredTenantId: true },
    });
    let rewarded = 0;
    for (const ref of pending) {
      const activeStay = await this.prisma.stay.findFirst({
        where: { tenantId: ref.referredTenantId!, status: 'ACTIVE' as any, initialMetersPromotedAt: { not: null } },
        select: { id: true },
      });
      if (!activeStay) continue;
      try {
        await this.loyalty.award({
          tenantId: ref.referrerTenantId,
          delta: Math.max(0, Math.floor(LOYALTY_POINTS_REFERRAL)),
          reason: 'ADJUSTMENT',
          sourceType: 'REFERRAL',
          sourceId: String(ref.id),
          note: 'Referral teman menjadi tenant aktif',
          createdById: options.actorUserId ?? null,
        });
        await this.prisma.tenantReferral.update({ where: { id: ref.id }, data: { status: 'REWARDED' as any, rewardedAt: new Date() } });
        rewarded += 1;
      } catch (error) {
        this.logger.warn(`Gagal reward referral #${ref.id}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    return { rewarded };
  }
}
