// FILE: deposit-ledger.service.ts — kelola deposit jaminan penghuni + refund (JALUR UANG)
import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma';
import {
  BookingDepositPaymentStatus,
  DepositStatus,
  TenantDepositLedgerDirection,
  TenantDepositLedgerEntryType,
  UserRole,
} from '../../common/enums/app.enums';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import { PrismaService } from '../../prisma/prisma.service';
import { DepositLedgerDryRunDto, DepositLedgerQueryDto, DepositLedgerSummaryQueryDto } from './dto/deposit-ledger-query.dto';

type DepositLedgerTx = Prisma.TransactionClient;

type RecordDepositReceivedParams = {
  stayId: number;
  amountRupiah: number;
  actorUserId?: number | null;
  paymentSubmissionId?: number | null;
  invoicePaymentId?: number | null;
  occurredAt?: Date | string | null;
  note?: string | null;
  metadata?: Record<string, any> | null;
};

type RecordDepositSettlementParams = {
  stayId: number;
  actorUserId?: number | null;
  occurredAt?: Date | string | null;
  note?: string | null;
  metadata?: Record<string, any> | null;
};

@Injectable()
export class DepositLedgerService {
  constructor(private readonly prisma: PrismaService) {}

  private normalizeLimit(limit?: number, fallback = 50, max = 200) {
    const raw = Number(limit ?? fallback);
    if (!Number.isFinite(raw)) return fallback;
    return Math.min(Math.max(Math.trunc(raw), 1), max);
  }

  private heldBalanceFromSnapshot(stay: {
    depositPaidAmountRupiah: number | null;
    depositDeductionRupiah: number | null;
    depositRefundedRupiah: number | null;
  }) {
    return Math.max(
      Number(stay.depositPaidAmountRupiah ?? 0) -
        Number(stay.depositDeductionRupiah ?? 0) -
        Number(stay.depositRefundedRupiah ?? 0),
      0,
    );
  }

  private async assertTenantCanReadStay(stayId: number, user: CurrentUserPayload) {
    if (user.role !== UserRole.TENANT) return;
    if (!user.tenantId) throw new ForbiddenException('Akun tenant belum terhubung ke data tenant');
    const stay = await this.prisma.stay.findUnique({ where: { id: stayId }, select: { tenantId: true } });
    if (!stay) throw new NotFoundException('Stay tidak ditemukan');
    if (stay.tenantId !== user.tenantId) throw new ForbiddenException('Tenant hanya dapat melihat riwayat deposit miliknya sendiri');
  }

  private assertTenantCanReadTenant(tenantId: number, user: CurrentUserPayload) {
    if (user.role !== UserRole.TENANT) return;
    if (!user.tenantId || user.tenantId !== tenantId) {
      throw new ForbiddenException('Tenant hanya dapat melihat riwayat deposit miliknya sendiri');
    }
  }

  private mapEntry(entry: any) {
    return {
      id: entry.id,
      stayId: entry.stayId,
      tenantId: entry.tenantId,
      tenantName: entry.tenant?.fullName ?? null,
      roomId: entry.roomId,
      roomCode: entry.room?.code ?? null,
      roomName: entry.room?.name ?? null,
      type: entry.type,
      direction: entry.direction,
      amountRupiah: Number(entry.amountRupiah ?? 0),
      balanceAfterRupiah: Number(entry.balanceAfterRupiah ?? 0),
      depositStatusAfter: entry.depositStatusAfter ?? null,
      depositPaymentStatusAfter: entry.depositPaymentStatusAfter ?? null,
      sourceType: entry.sourceType ?? null,
      sourceId: entry.sourceId ?? null,
      paymentSubmissionId: entry.paymentSubmissionId ?? null,
      invoicePaymentId: entry.invoicePaymentId ?? null,
      journalEntryId: entry.journalEntryId ?? null,
      actorUserId: entry.actorUserId ?? null,
      actorName: entry.actorUser?.fullName ?? null,
      occurredAt: entry.occurredAt,
      note: entry.note ?? null,
      metadataJson: entry.metadataJson ?? null,
      createdAt: entry.createdAt,
    };
  }

  private async createEntryIfMissingTx(
    tx: DepositLedgerTx,
    params: {
      stay: any;
      type: TenantDepositLedgerEntryType;
      direction: TenantDepositLedgerDirection;
      amountRupiah: number;
      balanceAfterRupiah: number;
      sourceType: string;
      sourceId: string;
      paymentSubmissionId?: number | null;
      invoicePaymentId?: number | null;
      journalEntryId?: number | null;
      actorUserId?: number | null;
      occurredAt?: Date | string | null;
      note?: string | null;
      metadata?: Record<string, any> | null;
    },
  ) {
    if (!params.amountRupiah && params.direction !== TenantDepositLedgerDirection.INFO) return null;

    const existing = await tx.tenantDepositLedgerEntry.findFirst({
      where: {
        stayId: params.stay.id,
        type: params.type,
        sourceType: params.sourceType,
        sourceId: params.sourceId,
      },
      select: { id: true },
    });
    if (existing) return null;

    return tx.tenantDepositLedgerEntry.create({
      data: {
        stayId: params.stay.id,
        tenantId: params.stay.tenantId,
        roomId: params.stay.roomId,
        type: params.type,
        direction: params.direction,
        amountRupiah: Math.max(Number(params.amountRupiah ?? 0), 0),
        balanceAfterRupiah: Math.max(Number(params.balanceAfterRupiah ?? 0), 0),
        depositStatusAfter: params.stay.depositStatus as DepositStatus,
        depositPaymentStatusAfter: params.stay.depositPaymentStatus as BookingDepositPaymentStatus,
        sourceType: params.sourceType,
        sourceId: params.sourceId,
        paymentSubmissionId: params.paymentSubmissionId ?? null,
        invoicePaymentId: params.invoicePaymentId ?? null,
        journalEntryId: params.journalEntryId ?? null,
        actorUserId: params.actorUserId ?? null,
        occurredAt: params.occurredAt ? new Date(params.occurredAt) : new Date(),
        note: params.note ?? null,
        metadataJson: (params.metadata ?? {}) as Prisma.InputJsonValue,
      },
    });
  }

  async recordDepositReceivedTx(tx: DepositLedgerTx, params: RecordDepositReceivedParams) {
    const amount = Number(params.amountRupiah ?? 0);
    if (amount <= 0) return null;

    const stay = await tx.stay.findUnique({
      where: { id: params.stayId },
      select: {
        id: true,
        tenantId: true,
        roomId: true,
        depositPaidAmountRupiah: true,
        depositDeductionRupiah: true,
        depositRefundedRupiah: true,
        depositStatus: true,
        depositPaymentStatus: true,
      },
    });
    if (!stay) return null;

    return this.createEntryIfMissingTx(tx, {
      stay,
      type: TenantDepositLedgerEntryType.PAYMENT_RECEIVED,
      direction: TenantDepositLedgerDirection.INCREASE_LIABILITY,
      amountRupiah: amount,
      balanceAfterRupiah: this.heldBalanceFromSnapshot(stay),
      sourceType: 'PAYMENT_SUBMISSION',
      sourceId: String(params.paymentSubmissionId ?? params.stayId),
      paymentSubmissionId: params.paymentSubmissionId ?? null,
      invoicePaymentId: params.invoicePaymentId ?? null,
      actorUserId: params.actorUserId ?? null,
      occurredAt: params.occurredAt ?? new Date(),
      note: params.note ?? 'Deposit diterima dari pembayaran booking.',
      metadata: {
        basis: 'M4_DEPOSIT_LEDGER_PAYMENT_RECEIVED',
        ...(params.metadata ?? {}),
      },
    });
  }

  async recordDepositSettlementTx(tx: DepositLedgerTx, params: RecordDepositSettlementParams) {
    const stay = await tx.stay.findUnique({
      where: { id: params.stayId },
      select: {
        id: true,
        tenantId: true,
        roomId: true,
        depositPaidAmountRupiah: true,
        depositDeductionRupiah: true,
        depositRefundedRupiah: true,
        depositStatus: true,
        depositPaymentStatus: true,
        depositRefundedAt: true,
        depositNote: true,
      },
    });
    if (!stay) return { created: 0, entries: [] as any[] };

    const deduction = Number(stay.depositDeductionRupiah ?? 0);
    const refunded = Number(stay.depositRefundedRupiah ?? 0);
    const paid = Number(stay.depositPaidAmountRupiah ?? 0);
    const occurredAt = params.occurredAt ?? stay.depositRefundedAt ?? new Date();
    const entries: any[] = [];
    const baseMetadata = { basis: 'M4_DEPOSIT_LEDGER_SETTLEMENT', ...(params.metadata ?? {}) };

    if (deduction > 0) {
      const type = stay.depositStatus === DepositStatus.FORFEITED && refunded === 0
        ? TenantDepositLedgerEntryType.FORFEIT
        : TenantDepositLedgerEntryType.DEDUCTION;
      const entry = await this.createEntryIfMissingTx(tx, {
        stay,
        type,
        direction: TenantDepositLedgerDirection.DECREASE_LIABILITY,
        amountRupiah: deduction,
        balanceAfterRupiah: Math.max(paid - deduction, 0),
        sourceType: 'STAY_DEPOSIT_SETTLEMENT',
        sourceId: `${stay.id}:DEDUCTION`,
        actorUserId: params.actorUserId ?? null,
        occurredAt,
        note: params.note ?? stay.depositNote ?? 'Potongan deposit diproses.',
        metadata: { ...baseMetadata, settlementPart: type },
      });
      if (entry) entries.push(entry);
    }

    if (refunded > 0) {
      const entry = await this.createEntryIfMissingTx(tx, {
        stay,
        type: TenantDepositLedgerEntryType.REFUND,
        direction: TenantDepositLedgerDirection.DECREASE_LIABILITY,
        amountRupiah: refunded,
        balanceAfterRupiah: Math.max(paid - deduction - refunded, 0),
        sourceType: 'STAY_DEPOSIT_SETTLEMENT',
        sourceId: `${stay.id}:REFUND`,
        actorUserId: params.actorUserId ?? null,
        occurredAt,
        note: params.note ?? stay.depositNote ?? 'Refund deposit diproses.',
        metadata: { ...baseMetadata, settlementPart: 'REFUND' },
      });
      if (entry) entries.push(entry);
    }

    return { created: entries.length, entries };
  }

  async listByStay(stayId: number, query: DepositLedgerQueryDto, user: CurrentUserPayload) {
    await this.assertTenantCanReadStay(stayId, user);
    const stay = await this.prisma.stay.findUnique({
      where: { id: stayId },
      include: { tenant: true, room: true },
    });
    if (!stay) throw new NotFoundException('Stay tidak ditemukan');

    const entries = await this.prisma.tenantDepositLedgerEntry.findMany({
      where: { stayId, ...(query.type ? { type: query.type } : {}) },
      include: { tenant: true, room: true, actorUser: true },
      orderBy: [{ occurredAt: 'asc' }, { id: 'asc' }],
      take: this.normalizeLimit(query.limit, 100, 200),
    });

    return {
      basis: 'M4_DEPOSIT_LEDGER_BY_STAY',
      stay: {
        id: stay.id,
        status: stay.status,
        tenantId: stay.tenantId,
        tenantName: stay.tenant?.fullName ?? null,
        roomId: stay.roomId,
        roomCode: stay.room?.code ?? null,
        depositAmountRupiah: stay.depositAmountRupiah,
        depositPaidAmountRupiah: stay.depositPaidAmountRupiah,
        depositDeductionRupiah: stay.depositDeductionRupiah,
        depositRefundedRupiah: stay.depositRefundedRupiah,
        depositHeldBalanceRupiah: this.heldBalanceFromSnapshot(stay),
        depositStatus: stay.depositStatus,
        depositPaymentStatus: stay.depositPaymentStatus,
      },
      entries: entries.map((entry) => this.mapEntry(entry)),
      meta: { total: entries.length },
    };
  }

  async listByTenant(tenantId: number, query: DepositLedgerQueryDto, user: CurrentUserPayload) {
    this.assertTenantCanReadTenant(tenantId, user);
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId }, select: { id: true, fullName: true } });
    if (!tenant) throw new NotFoundException('Tenant tidak ditemukan');

    const entries = await this.prisma.tenantDepositLedgerEntry.findMany({
      where: { tenantId, ...(query.type ? { type: query.type } : {}) },
      include: { tenant: true, room: true, actorUser: true },
      orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
      take: this.normalizeLimit(query.limit, 100, 200),
    });

    return {
      basis: 'M4_DEPOSIT_LEDGER_BY_TENANT',
      tenant,
      entries: entries.map((entry) => this.mapEntry(entry)),
      meta: { total: entries.length },
    };
  }

  async summary(query: DepositLedgerSummaryQueryDto = {}) {
    const entries = await this.prisma.tenantDepositLedgerEntry.findMany({
      include: { tenant: true, room: true, actorUser: true },
      orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
      take: this.normalizeLimit(query.limit, 50, 200),
    });

    const all = await this.prisma.tenantDepositLedgerEntry.findMany({
      select: { type: true, direction: true, amountRupiah: true },
    });

    const totals = all.reduce(
      (acc, entry) => {
        const amount = Number(entry.amountRupiah ?? 0);
        if (entry.direction === TenantDepositLedgerDirection.INCREASE_LIABILITY) acc.increaseRupiah += amount;
        if (entry.direction === TenantDepositLedgerDirection.DECREASE_LIABILITY) acc.decreaseRupiah += amount;
        acc.byType[entry.type] = (acc.byType[entry.type] ?? 0) + amount;
        return acc;
      },
      { increaseRupiah: 0, decreaseRupiah: 0, byType: {} as Record<string, number> },
    );

    return {
      basis: 'M4_DEPOSIT_LEDGER_SUMMARY',
      totals: {
        ...totals,
        ledgerHeldBalanceRupiah: Math.max(totals.increaseRupiah - totals.decreaseRupiah, 0),
      },
      recentEntries: entries.map((entry) => this.mapEntry(entry)),
    };
  }

  async reconciliationLite(query: DepositLedgerSummaryQueryDto = {}) {
    const limit = this.normalizeLimit(query.limit, 100, 200);
    const stays = await this.prisma.stay.findMany({
      where: {
        OR: [
          { depositAmountRupiah: { gt: 0 } },
          { depositPaidAmountRupiah: { gt: 0 } },
          { depositDeductionRupiah: { gt: 0 } },
          { depositRefundedRupiah: { gt: 0 } },
        ],
      },
      include: {
        tenant: true,
        room: true,
      },
      orderBy: { id: 'desc' },
      take: limit,
    });

    const stayIds = stays.map((stay) => stay.id);
    const ledgerEntries = stayIds.length
      ? await this.prisma.tenantDepositLedgerEntry.findMany({
          where: { stayId: { in: stayIds } },
          orderBy: [{ occurredAt: 'asc' }, { id: 'asc' }],
        })
      : [];

    const ledgerEntriesByStayId = ledgerEntries.reduce((map, entry) => {
      const existing = map.get(entry.stayId) ?? [];
      existing.push(entry);
      map.set(entry.stayId, existing);
      return map;
    }, new Map<number, typeof ledgerEntries>());

    const items = stays.map((stay: any) => {
      const stayLedgerEntries = ledgerEntriesByStayId.get(stay.id) ?? [];
      const ledgerHeldBalanceRupiah = stayLedgerEntries.reduce((sum: number, entry: any) => {
        const amount = Number(entry.amountRupiah ?? 0);
        if (entry.direction === TenantDepositLedgerDirection.INCREASE_LIABILITY) return sum + amount;
        if (entry.direction === TenantDepositLedgerDirection.DECREASE_LIABILITY) return sum - amount;
        return sum;
      }, 0);
      const snapshotHeldBalanceRupiah = this.heldBalanceFromSnapshot(stay);
      const gapRupiah = snapshotHeldBalanceRupiah - ledgerHeldBalanceRupiah;
      return {
        stayId: stay.id,
        tenantId: stay.tenantId,
        tenantName: stay.tenant?.fullName ?? null,
        roomId: stay.roomId,
        roomCode: stay.room?.code ?? null,
        depositAmountRupiah: stay.depositAmountRupiah,
        snapshotHeldBalanceRupiah,
        ledgerHeldBalanceRupiah: Math.max(ledgerHeldBalanceRupiah, 0),
        gapRupiah,
        status: gapRupiah === 0 ? 'MATCH' : 'NEEDS_BACKFILL_OR_REVIEW',
        ledgerEntryCount: stayLedgerEntries.length,
      };
    });

    return {
      basis: 'M4_DEPOSIT_LEDGER_RECONCILIATION_LITE',
      ready: items.every((item) => item.gapRupiah === 0),
      totalItems: items.length,
      mismatchCount: items.filter((item) => item.gapRupiah !== 0).length,
      items,
      note: 'M4A read-only reconciliation. Historical deposits may need reviewed backfill before ledger becomes complete.',
    };
  }

  async backfillDryRun(dto: DepositLedgerDryRunDto = {}) {
    const limit = this.normalizeLimit(dto.limit, 25, 500);
    const rawCandidates = await this.prisma.stay.findMany({
      where: {
        OR: [
          { depositPaidAmountRupiah: { gt: 0 } },
          { depositDeductionRupiah: { gt: 0 } },
          { depositRefundedRupiah: { gt: 0 } },
        ],
      },
      include: { tenant: true, room: true },
      orderBy: { id: 'asc' },
      take: limit,
    });

    const stayIds = rawCandidates.map((stay) => stay.id);
    const existingEntries = stayIds.length
      ? await this.prisma.tenantDepositLedgerEntry.findMany({
          where: { stayId: { in: stayIds } },
          select: { stayId: true },
        })
      : [];
    const stayIdsWithLedger = new Set(existingEntries.map((entry) => entry.stayId));
    const candidates = rawCandidates.filter((stay) => !stayIdsWithLedger.has(stay.id));

    return {
      basis: 'M4_DEPOSIT_LEDGER_BACKFILL_DRY_RUN',
      dryRun: true,
      limit,
      wouldCreateEntriesForStays: candidates.length,
      candidates: candidates.map((stay) => ({
        stayId: stay.id,
        tenantId: stay.tenantId,
        tenantName: stay.tenant?.fullName ?? null,
        roomId: stay.roomId,
        roomCode: stay.room?.code ?? null,
        depositAmountRupiah: stay.depositAmountRupiah,
        depositPaidAmountRupiah: stay.depositPaidAmountRupiah,
        depositDeductionRupiah: stay.depositDeductionRupiah,
        depositRefundedRupiah: stay.depositRefundedRupiah,
        suggestedEntries: [
          ...(stay.depositPaidAmountRupiah > 0 ? ['PAYMENT_RECEIVED/MIGRATION_SNAPSHOT'] : []),
          ...(stay.depositDeductionRupiah > 0 ? ['DEDUCTION_OR_FORFEIT/MIGRATION_SNAPSHOT'] : []),
          ...(stay.depositRefundedRupiah > 0 ? ['REFUND/MIGRATION_SNAPSHOT'] : []),
        ],
      })),
      note: 'Dry-run saja. Endpoint ini tidak membuat TenantDepositLedgerEntry agar histori lama tidak dipalsukan tanpa review owner.',
    };
  }
}
