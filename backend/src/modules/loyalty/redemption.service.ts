import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AccountingPostingService } from '../accounting/accounting-posting.service';
import { LoyaltyService } from './loyalty.service';
import { pickRoundRobinStaffTx } from '../../common/utils/staff-assignment.util';
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
        fulfillmentTaskCategory: dto.fulfillmentTaskCategory ?? null,
        fulfillmentTaskTitle: dto.fulfillmentTaskTitle ?? null,
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
        fulfillmentTaskCategory: dto.fulfillmentTaskCategory ?? undefined,
        fulfillmentTaskTitle: dto.fulfillmentTaskTitle ?? undefined,
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
      const [reward] = await tx.$queryRaw<Array<{ id: number; name: string; pointCost: number; stockQty: number | null; type: string; isActive: boolean; description: string | null; fulfillmentTaskCategory: string | null; fulfillmentTaskTitle: string | null; valueRupiah: number | null }>>`
        SELECT id, name, "pointCost", "stockQty", type, "isActive", description, "fulfillmentTaskCategory", "fulfillmentTaskTitle", "valueRupiah"
        FROM "LoyaltyReward" WHERE id = ${rewardId} FOR UPDATE
      `;
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

      // Lock reward row untuk cek stok real-time (AUD-7/B-1).
      const [lockedReward] = await tx.$queryRaw<Array<{ id: number; stockQty: number | null }>>`
        SELECT id, "stockQty" FROM "LoyaltyReward" WHERE id = ${redemption.rewardId} FOR UPDATE
      `;
      if (lockedReward.stockQty != null && lockedReward.stockQty <= 0) {
        throw new ConflictException('Stok reward sudah habis, tidak bisa approve.');
      }

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
          rewardType: redemption.reward.type, // L-3: diskon sewa/listrik → kontra-revenue
          memo: `Reward ${redemption.reward.name} tenant #${redemption.tenantId}`,
        });
        journalEntryId = (res as any)?.journalEntry?.id ?? null;
      }

      // F4-13b: reward "special request" → auto-create tiket tugas staf.
      if (redemption.reward.fulfillmentTaskCategory) {
        const tenantStay = await tx.stay.findFirst({
          where: { tenantId: redemption.tenantId, status: 'ACTIVE' as any },
          orderBy: { id: 'desc' },
          select: { id: true, roomId: true },
        });
        const staffAssigneeId = await pickRoundRobinStaffTx(tx); // F5-3: round-robin tiket sistem
        const base = `TIC-${new Date().getFullYear()}-RWD-${redemption.id}`;
        let ticketNumber = base;
        let suffix = 1;
        // eslint-disable-next-line no-await-in-loop
        while (await tx.ticket.findUnique({ where: { ticketNumber }, select: { id: true } })) {
          suffix += 1;
          ticketNumber = `${base}-${suffix}`;
        }
        await tx.ticket.create({
          data: {
            ticketNumber,
            tenantId: redemption.tenantId,
            roomId: tenantStay?.roomId ?? null,
            stayId: tenantStay?.id ?? null,
            title: redemption.reward.fulfillmentTaskTitle || `Reward: ${redemption.reward.name}`,
            description: `Tugas dari penukaran poin tenant (reward "${redemption.reward.name}"). ${redemption.reward.description ?? ''}`.trim(),
            category: redemption.reward.fulfillmentTaskCategory as any,
            assignedToId: staffAssigneeId ?? null,
          },
        });
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
