import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma';
import { PrismaService } from '../../prisma/prisma.service';
import { SaveAiDraftDto, ListAiDraftQuery } from './dto/ai-draft.dto';

const DRAFT_STATUSES = ['DRAFT', 'APPLIED', 'REJECTED', 'EXPIRED'] as const;
type DraftStatus = (typeof DRAFT_STATUSES)[number];

/**
 * G9 (S-6): antrean draft AI lintas sesi. Owner/Admin simpan hasil AI → review →
 * APPLIED/REJECTED. resultJson diasumsikan sudah bersih dari sumbernya (PDP:
 * tanpa NIK penuh/foto KTP/bukti bayar mentah). Retention via expireOldDrafts.
 */
@Injectable()
export class AiDraftService {
  constructor(private readonly prisma: PrismaService) {}

  private retentionDays(): number {
    return Number(process.env.AI_DRAFT_RETENTION_DAYS || 60);
  }

  async saveDraft(dto: SaveAiDraftDto, actorId: number) {
    const expiresAt = new Date(Date.now() + this.retentionDays() * 86_400_000);
    return this.prisma.aiDraft.create({
      data: {
        feature: dto.feature,
        targetType: dto.targetType ?? null,
        targetId: dto.targetId ?? null,
        mode: dto.mode,
        model: dto.model ?? null,
        snapshotHash: dto.snapshotHash ?? null,
        promptHash: dto.promptHash ?? null,
        confidence: dto.confidence ?? null,
        resultJson: dto.resultJson as Prisma.InputJsonValue,
        usageJson: (dto.usageJson ?? undefined) as Prisma.InputJsonValue | undefined,
        createdById: actorId,
        expiresAt,
      },
    });
  }

  async listDrafts(query: ListAiDraftQuery) {
    const status = query.status && (DRAFT_STATUSES as readonly string[]).includes(query.status)
      ? (query.status as DraftStatus)
      : undefined;
    return this.prisma.aiDraft.findMany({
      where: {
        feature: query.feature || undefined,
        status,
        targetType: query.targetType || undefined,
        targetId: query.targetId || undefined,
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async getDraft(id: number) {
    const draft = await this.prisma.aiDraft.findUnique({ where: { id } });
    if (!draft) throw new NotFoundException('Draft AI tidak ditemukan.');
    return draft;
  }

  /** APPLIED = manusia memakai draft (aksi domain tetap lewat endpoint existing); REJECTED = diabaikan. */
  async reviewDraft(id: number, decision: 'APPLIED' | 'REJECTED', actorId: number, reviewNote?: string) {
    const draft = await this.getDraft(id);
    if (draft.status !== 'DRAFT') {
      throw new BadRequestException(`Draft sudah berstatus ${draft.status}, tidak bisa diputuskan lagi.`);
    }
    return this.prisma.aiDraft.update({
      where: { id },
      data: { status: decision, reviewedById: actorId, reviewedAt: new Date(), reviewNote: reviewNote ?? null },
    });
  }

  /** Retention: draft DRAFT yang melewati expiresAt → EXPIRED. Idempotent. */
  async expireOldDrafts() {
    const res = await this.prisma.aiDraft.updateMany({
      where: { status: 'DRAFT', expiresAt: { lt: new Date() } },
      data: { status: 'EXPIRED' },
    });
    return { expired: res.count };
  }
}
