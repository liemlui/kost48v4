import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { OwnerAiService } from '../../owner-ai/owner-ai.service';

/**
 * W-OWN-012 — agenda AI terjadwal 1×/hari lewat antrean `AiDraft` (tanpa schema baru).
 *
 * Keputusan yang ditegakkan:
 * - Agenda dibuat **paling banyak sekali per hari kalender WIB**; sweep kedua di hari
 *   yang sama hanya mengembalikan `skipped` (dedupe berbasis `AiDraft.feature` +
 *   `createdAt` ≥ awal hari WIB), jadi penjadwal 5 menit tidak menumpuk draft.
 * - **Membuka halaman tidak memicu AI** — agenda lahir dari penjadwal/manual run,
 *   bukan dari render dashboard (`AiAssistButton` di beranda owner tetap manual).
 * - AI dimatikan/kunci kosong **bukan** kegagalan: `OwnerAiService.generateBrief`
 *   mengembalikan fallback rule-based, dan draft tetap tersimpan dengan `mode`
 *   `RULE_FALLBACK` supaya owner tetap punya agenda harian.
 * - Tanpa biaya tak terduga: satu permintaan AI per hari, dan angka rupiah hanya
 *   dihitung klien dari `usage` + konstanta harga (W-OWN-018).
 */
export const DAILY_AGENDA_FEATURE = 'daily-agenda';
export const DAILY_AGENDA_RETENTION_DAYS_DEFAULT = 30;

/** Awal hari kalender WIB (UTC+7) untuk `now`. */
export function startOfWibDay(now: Date): Date {
  const jakarta = new Date(now.getTime() + 7 * 3600 * 1000);
  return new Date(
    Date.UTC(jakarta.getUTCFullYear(), jakarta.getUTCMonth(), jakarta.getUTCDate()) - 7 * 3600 * 1000,
  );
}

/** Kunci tanggal agenda (YYYY-MM-DD WIB) — dipakai sebagai `AiDraft.targetId`. */
export function wibDateKey(now: Date): string {
  const jakarta = new Date(now.getTime() + 7 * 3600 * 1000);
  return jakarta.toISOString().slice(0, 10);
}

@Injectable()
export class AiAgendaSweepService {
  private readonly logger = new Logger(AiAgendaSweepService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ownerAi: OwnerAiService,
  ) {}

  async runDailyAiAgenda(
    options: { actorUserId?: number | null; source?: string; now?: Date } = {},
  ) {
    const source = options.source ?? 'AUTO_OPS_DAILY_AI_AGENDA';
    const now = options.now ?? new Date();
    const dayKey = wibDateKey(now);

    try {
      const existing = await this.prisma.aiDraft.findFirst({
        where: { feature: DAILY_AGENDA_FEATURE, createdAt: { gte: startOfWibDay(now) } },
        select: { id: true },
      });
      if (existing) {
        return { skipped: true, skippedReason: 'AGENDA_ALREADY_CREATED_TODAY', draftId: existing.id, dayKey, source };
      }

      const owner = await this.prisma.user.findFirst({
        where: { role: 'OWNER' as any, isActive: true },
        select: { id: true },
        orderBy: { id: 'asc' },
      });
      const actorId = options.actorUserId ?? owner?.id ?? 0;

      const brief = await this.ownerAi.generateBrief(actorId);
      const retention =
        (await this.prisma.operationalSetting.findUnique({
          where: { id: 1 },
          select: { aiDraftRetentionDays: true },
        }))?.aiDraftRetentionDays ?? DAILY_AGENDA_RETENTION_DAYS_DEFAULT;

      const draft = await this.prisma.aiDraft.create({
        data: {
          feature: DAILY_AGENDA_FEATURE,
          targetType: 'DAILY_AGENDA',
          targetId: dayKey,
          mode: brief.mode,
          model: brief.model ?? null,
          snapshotHash: brief.snapshotHash ?? null,
          promptHash: brief.promptHash ?? null,
          resultJson: {
            ...(brief.result as Record<string, unknown>),
            warnings: brief.warnings ?? [],
            fallback: Boolean(brief.fallback),
            missingData: brief.missingData ?? [],
          } as any,
          usageJson: (brief.usage ?? undefined) as any,
          createdById: owner?.id ?? null,
          expiresAt: new Date(now.getTime() + Math.max(1, retention) * 86_400_000),
        },
        select: { id: true, mode: true },
      });

      return {
        skipped: false,
        draftId: draft.id,
        dayKey,
        mode: draft.mode,
        fallback: Boolean(brief.fallback),
        aiRequests: brief.fallback ? 0 : 1,
        source,
      };
    } catch (error: any) {
      this.logger.warn(`AutoOps agenda AI harian gagal: ${error?.message ?? error}`);
      return { skipped: true, skippedReason: error?.message ?? 'DAILY_AI_AGENDA_FAILED', dayKey, source };
    }
  }
}
