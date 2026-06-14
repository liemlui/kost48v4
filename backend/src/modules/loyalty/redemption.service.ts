import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AccountingPostingService } from '../accounting/accounting-posting.service';
import { LoyaltyService } from './loyalty.service';
import { CreateRewardDto, UpdateRewardDto } from './dto/loyalty.dto';

/**
 * F4-9 — katalog reward + penukaran (redemption). Penukaran WAJIB approve admin/owner (M3);
 * reward terjurnal saat FULFILLED (M4). Poin dipotong saat ajukan (hold) dan dikembalikan
 * bila ditolak — sehingga saldo tak bisa dipakai ganda selama menunggu keputusan.
 */
@Injectable()
export class RedemptionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly loyalty: LoyaltyService,
    private readonly posting: AccountingPostingService,
  ) {}

  // ── Katalog (owner) ────────────────────────────────
  async createReward(dto: CreateRewardDto) {
    return this.prisma.loyaltyReward.create({
      data: {
        name: dto.name,
        description: dto.description ?? null,
        pointCost: dto.pointCost,
        type: dto.type as any,
        valueRupiah: dto.valueRupiah ?? null,
        stockQty: dto.stockQty ?? null,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async updateReward(id: number, dto: UpdateRewardDto) {
    const existing = await this.prisma.loyaltyReward.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Reward tidak ditemukan');
    return this.prisma.loyaltyReward.update({
      where: { id },
      data: {
        name: dto.name ?? undefined,
        description: dto.description ?? undefined,
        pointCost: dto.pointCost ?? undefined,
        type: (dto.type as any) ?? undefined,
        valueRupiah: dto.valueRupiah ?? undefined,
        stockQty: dto.stockQty ?? undefined,
        isActive: dto.isActive ?? undefined,
      },
    });
  }

  async listRewards(includeInactive = false) {
    return this.prisma.loyaltyReward.findMany({
      where: includeInactive ? {} : { isActive: true },
      orderBy: [{ isActive: 'desc' }, { pointCost: 'asc' }],
    });
  }

  // ── Redemption ─────────────────────────────────────
  async requestRedemption(tenantId: number, rewardId: number) {
    return this.prisma.$transaction(async (tx) => {
      const reward = await tx.loyaltyReward.findUnique({ where: { id: rewardId } });
      if (!reward || !reward.isActive) throw new NotFoundException('Reward tidak tersedia');
      if (reward.stockQty != null && reward.stockQty <= 0) throw new ConflictException('Stok reward habis');

      const before = (await tx.loyaltyPoint.aggregate({ where: { tenantId }, _sum: { delta: true } }))._sum.delta ?? 0;
      if (before < reward.pointCost) throw new ConflictException('Poin tidak cukup untuk menukar reward ini');

      const redemption = await tx.redemption.create({
        data: { tenantId, rewardId, pointCost: reward.pointCost, status: 'PENDING' as any },
      });

      await this.loyalty.award({
        tenantId,
        delta: -reward.pointCost,
        reason: 'REDEMPTION',
        sourceType: 'REDEMPTION',
        sourceId: String(redemption.id),
        note: `Tukar reward: ${reward.name}`,
        tx,
      });

      if (reward.stockQty != null) {
        await tx.loyaltyReward.update({ where: { id: rewardId }, data: { stockQty: reward.stockQty - 1 } });
      }

      // Pengaman anti-overspend (race): saldo tak boleh negatif setelah potong.
      const after = (await tx.loyaltyPoint.aggregate({ where: { tenantId }, _sum: { delta: true } }))._sum.delta ?? 0;
      if (after < 0) throw new ConflictException('Poin tidak cukup untuk menukar reward ini');

      return redemption;
    });
  }

  async decideRedemption(id: number, decision: 'APPROVE' | 'REJECT', actorId: number, note?: string) {
    return this.prisma.$transaction(async (tx) => {
      const redemption = await tx.redemption.findUnique({ where: { id }, include: { reward: true } });
      if (!redemption) throw new NotFoundException('Penukaran tidak ditemukan');
      if (redemption.status !== 'PENDING') throw new ConflictException(`Penukaran sudah ${redemption.status}`);

      if (decision === 'REJECT') {
        await this.loyalty.award({
          tenantId: redemption.tenantId,
          delta: redemption.pointCost,
          reason: 'REDEMPTION',
          sourceType: 'REDEMPTION_REFUND',
          sourceId: String(redemption.id),
          note: 'Pengembalian poin: penukaran ditolak',
          tx,
        });
        if (redemption.reward.stockQty != null) {
          await tx.loyaltyReward.update({ where: { id: redemption.rewardId }, data: { stockQty: redemption.reward.stockQty + 1 } });
        }
        return tx.redemption.update({
          where: { id },
          data: { status: 'REJECTED' as any, decidedAt: new Date(), decidedById: actorId, note: note ?? null },
        });
      }

      // APPROVE → FULFILLED (+ jurnal reward bila bernilai)
      let journalEntryId: number | null = null;
      const value = redemption.reward.valueRupiah ?? 0;
      if (value > 0) {
        const res = await this.posting.postRewardFulfillmentTx(tx, {
          redemptionId: redemption.id,
          valueRupiah: value,
          entryDate: new Date(),
          createdById: actorId,
          memo: `Reward ${redemption.reward.name} tenant #${redemption.tenantId}`,
        });
        journalEntryId = (res as any)?.journalEntry?.id ?? null;
      }
      return tx.redemption.update({
        where: { id },
        data: { status: 'FULFILLED' as any, decidedAt: new Date(), decidedById: actorId, journalEntryId, note: note ?? null },
      });
    });
  }

  async listRedemptions(status?: string) {
    return this.prisma.redemption.findMany({
      where: status ? { status: status as any } : {},
      orderBy: { id: 'desc' },
      take: 200,
      include: { reward: { select: { name: true, type: true } }, tenant: { select: { fullName: true } } },
    });
  }

  async myRedemptions(tenantId: number) {
    return this.prisma.redemption.findMany({
      where: { tenantId },
      orderBy: { id: 'desc' },
      take: 100,
      include: { reward: { select: { name: true, type: true, pointCost: true } } },
    });
  }

  assertTenant(tenantId: number | null): number {
    if (!tenantId) throw new ForbiddenException('Hanya tenant yang dapat menukar reward');
    return tenantId;
  }
}
