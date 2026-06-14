import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '../../generated/prisma';
import { PrismaService } from '../../prisma/prisma.service';
import { EarnReason, pointsForReason } from './loyalty.constants';

type LoyaltyPointReason = 'RENEWAL' | 'ON_TIME_PAYMENT' | 'VALIDATED_REPORT' | 'ONBOARDING_QUEST' | 'REDEMPTION' | 'ADJUSTMENT';

/**
 * F4-9 — ledger poin loyalitas tenant (append-only, saldo = Σ delta).
 * Poin TAK dapat dipindahtangankan; expired saat tenant keluar (poin tak carry-over —
 * dikelola di level kebijakan, bukan dihapus di sini).
 */
@Injectable()
export class LoyaltyService {
  private readonly logger = new Logger(LoyaltyService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Catat perolehan/penyesuaian poin. Idempotent per (sourceType, sourceId) —
   * pemanggilan ganda untuk sumber sama tidak menambah poin dobel.
   */
  async award(input: {
    tenantId: number;
    delta: number;
    reason: LoyaltyPointReason;
    sourceType: string;
    sourceId: string;
    note?: string | null;
    createdById?: number | null;
    tx?: Prisma.TransactionClient;
  }) {
    const delta = Math.trunc(Number(input.delta) || 0);
    if (delta === 0) return { created: false, skipped: true, reason: 'ZERO_DELTA' as const };
    const db = input.tx ?? this.prisma;
    try {
      const row = await db.loyaltyPoint.create({
        data: {
          tenantId: input.tenantId,
          delta,
          reason: input.reason as any,
          sourceType: input.sourceType,
          sourceId: input.sourceId,
          note: input.note ?? null,
          createdById: input.createdById ?? null,
        },
        select: { id: true },
      });
      return { created: true, id: row.id };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        return { created: false, skipped: true, reason: 'ALREADY_AWARDED' as const };
      }
      throw error;
    }
  }

  /** Perolehan poin untuk aktivitas standar (nilai dari konstanta). */
  async earn(
    tenantId: number,
    reason: EarnReason,
    sourceId: string,
    opts: { note?: string | null; createdById?: number | null; tx?: Prisma.TransactionClient } = {},
  ) {
    const delta = pointsForReason(reason);
    if (delta <= 0) return { created: false, skipped: true, reason: 'ZERO_POINTS' as const };
    return this.award({
      tenantId,
      delta,
      reason,
      sourceType: reason,
      sourceId,
      note: opts.note ?? null,
      createdById: opts.createdById ?? null,
      tx: opts.tx,
    });
  }

  /**
   * Versi best-effort untuk dipanggil dari hook event (DI LUAR transaksi pemanggil).
   * Tidak pernah melempar — kegagalan poin tak boleh menggagalkan flow uang/operasi.
   */
  async earnSafe(tenantId: number, reason: EarnReason, sourceId: string, opts: { note?: string | null; createdById?: number | null } = {}) {
    try {
      return await this.earn(tenantId, reason, sourceId, opts);
    } catch (error) {
      this.logger.warn(`Gagal memberi poin ${reason} tenant #${tenantId}: ${error instanceof Error ? error.message : String(error)}`);
      return { created: false, error: true as const };
    }
  }

  async balance(tenantId: number): Promise<number> {
    const agg = await this.prisma.loyaltyPoint.aggregate({ where: { tenantId }, _sum: { delta: true } });
    return agg._sum.delta ?? 0;
  }

  async history(tenantId: number, limit = 50) {
    const items = await this.prisma.loyaltyPoint.findMany({
      where: { tenantId },
      orderBy: { id: 'desc' },
      take: Math.min(Math.max(1, limit), 200),
      select: { id: true, delta: true, reason: true, note: true, createdAt: true },
    });
    return {
      balance: await this.balance(tenantId),
      items: items.map((p) => ({
        id: p.id,
        delta: p.delta,
        reason: p.reason,
        note: p.note,
        createdAt: p.createdAt.toISOString(),
      })),
    };
  }
}
