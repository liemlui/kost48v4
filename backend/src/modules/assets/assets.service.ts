import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { buildMeta, buildPagination } from '../../common/utils/pagination';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import { AccountingPostingService } from '../accounting/accounting-posting.service';
import { CreateFixedAssetDto, RunDepreciationDto, UpdateFixedAssetDto } from './dto/asset.dto';
import { DepreciationPreviewQueryDto, FixedAssetsQueryDto } from './dto/asset-query.dto';

function rupiah(value?: number | null) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : 0;
}

function dateOnly(value: Date | string) {
  if (typeof value === 'string') {
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      const [, year, month, day] = match;
      return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), 0, 0, 0, 0));
    }
  }

  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0));
}

function endOfMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0, 0, 0, 0, 0));
}

function currentYearMonth() {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

function nextAssetCode(id: number) {
  return `FA-${String(id).padStart(5, '0')}`;
}

@Injectable()
export class AssetsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accountingPosting: AccountingPostingService,
  ) {}

  async readiness() {
    const [assetCount, depreciableCount, activeCount, lastRun, totalCostAgg, accumulatedAgg] = await Promise.all([
      (this.prisma as any).fixedAsset.count(),
      (this.prisma as any).fixedAsset.count({ where: { depreciationEnabled: true, status: 'ACTIVE' as any } }),
      (this.prisma as any).fixedAsset.count({ where: { status: 'ACTIVE' as any } }),
      (this.prisma as any).assetDepreciationRun.findFirst({
        where: { status: 'POSTED' as any },
        include: { journalEntry: { select: { id: true, entryNumber: true, totalDebitRupiah: true, totalCreditRupiah: true, isBalanced: true } } },
        orderBy: [{ periodYear: 'desc' }, { periodMonth: 'desc' }, { id: 'desc' }],
      }),
      (this.prisma as any).fixedAsset.aggregate({ _sum: { acquisitionCostRupiah: true } }),
      (this.prisma as any).fixedAsset.aggregate({ _sum: { accumulatedDepreciationRupiah: true } }),
    ]);

    return {
      basis: 'B4_ASSET_REGISTER_SCHEMA_FOUNDATION',
      ledgerBacked: true,
      schemaChangeApplied: true,
      formalStatementReady: false,
      counts: {
        assetCount,
        activeCount,
        depreciableCount,
        depreciationRunCount: await (this.prisma as any).assetDepreciationRun.count({ where: { status: 'POSTED' as any } }),
      },
      totals: {
        acquisitionCostRupiah: rupiah(totalCostAgg?._sum?.acquisitionCostRupiah),
        accumulatedDepreciationRupiah: rupiah(accumulatedAgg?._sum?.accumulatedDepreciationRupiah),
        netBookValueRupiah: Math.max(rupiah(totalCostAgg?._sum?.acquisitionCostRupiah) - rupiah(accumulatedAgg?._sum?.accumulatedDepreciationRupiah), 0),
      },
      gates: [
        { key: 'ASSET_REGISTER_TABLES', label: 'Tabel asset register tersedia', ready: true, note: 'FixedAsset, AssetDepreciationRun, dan AssetDepreciationLine sudah additive di schema.' },
        { key: 'ASSET_DATA_AVAILABLE', label: 'Data aset terdaftar', ready: assetCount > 0, note: assetCount > 0 ? `${assetCount} aset terdaftar.` : 'Belum ada aset. Tambahkan aset disclosure/opening dulu sebelum depresiasi.' },
        { key: 'DEPRECIATION_ENABLED', label: 'Aset siap disusutkan', ready: depreciableCount > 0, note: depreciableCount > 0 ? `${depreciableCount} aset aktif depreciationEnabled=true.` : 'Depresiasi tidak akan berjalan sebelum aset ditandai depreciationEnabled=true.' },
        { key: 'DEPRECIATION_RUN_POSTED', label: 'Depresiasi pernah diposting', ready: Boolean(lastRun), note: lastRun ? `Run terakhir ${lastRun.runNumber}.` : 'Belum ada monthly depreciation run.' },
      ],
      lastRun: lastRun ? this.formatRun(lastRun) : null,
      warnings: [
        'Asset register tidak otomatis membuat acquisition journal agar tidak double-count opening balance.',
        'Aktifkan depreciationEnabled hanya untuk aset yang memang sudah dikapitalisasi atau masuk opening balance.',
        'Depreciation run idempotent per bulan dan hanya mem-post JournalEntry DEPRECIATION untuk aset eligible.',
      ],
    };
  }

  async findAll(query: FixedAssetsQueryDto) {
    const { page, limit, skip, take } = buildPagination(query.page, query.limit);
    const where: any = {
      AND: [
        query.search ? { OR: [{ assetCode: { contains: query.search, mode: 'insensitive' } }, { name: { contains: query.search, mode: 'insensitive' } }, { notes: { contains: query.search, mode: 'insensitive' } }] } : {},
        query.status ? { status: query.status as any } : {},
        query.category ? { category: query.category as any } : {},
        query.capitalizationSource ? { capitalizationSource: query.capitalizationSource as any } : {},
        query.depreciationEnabled !== undefined ? { depreciationEnabled: query.depreciationEnabled === 'true' } : {},
        query.roomId ? { roomId: Number(query.roomId) } : {},
      ],
    };

    const [items, totalItems] = await (this.prisma as any).$transaction([
      (this.prisma as any).fixedAsset.findMany({
        where,
        include: this.assetInclude(),
        skip,
        take,
        orderBy: [{ status: 'asc' }, { id: 'desc' }],
      }),
      (this.prisma as any).fixedAsset.count({ where }),
    ]);

    return { items: items.map((asset: any) => this.formatAsset(asset)), meta: buildMeta(page, limit, totalItems) };
  }

  async findOne(id: number) {
    const asset = await (this.prisma as any).fixedAsset.findUnique({
      where: { id },
      include: {
        ...this.assetInclude(),
        depreciationLines: {
          include: { run: { select: { id: true, runNumber: true, periodYear: true, periodMonth: true, status: true, journalEntryId: true } } },
          orderBy: { id: 'desc' },
          take: 24,
        },
      },
    });
    if (!asset) throw new NotFoundException('Aset tidak ditemukan');
    return this.formatAsset(asset, true);
  }

  async create(dto: CreateFixedAssetDto, actor: CurrentUserPayload) {
    await this.validateRelations(dto);
    this.validateAssetNumbers(dto.acquisitionCostRupiah, dto.salvageValueRupiah ?? 0, dto.usefulLifeMonths);

    const asset = await (this.prisma as any).fixedAsset.create({
      data: {
        assetCode: dto.assetCode?.trim() || `FA-TEMP-${Date.now()}`,
        name: dto.name.trim(),
        category: (dto.category ?? 'OTHER') as any,
        status: (dto.status ?? 'ACTIVE') as any,
        locationType: (dto.locationType ?? (dto.roomId ? 'ROOM' : 'GENERAL')) as any,
        capitalizationSource: (dto.capitalizationSource ?? 'DISCLOSURE_ONLY') as any,
        depreciationMethod: (dto.depreciationMethod ?? 'STRAIGHT_LINE') as any,
        acquisitionDate: dateOnly(dto.acquisitionDate),
        depreciationStartDate: dto.depreciationStartDate ? dateOnly(dto.depreciationStartDate) : dateOnly(dto.acquisitionDate),
        acquisitionCostRupiah: rupiah(dto.acquisitionCostRupiah),
        salvageValueRupiah: rupiah(dto.salvageValueRupiah),
        usefulLifeMonths: Number(dto.usefulLifeMonths),
        accumulatedDepreciationRupiah: rupiah(dto.accumulatedDepreciationRupiah),
        depreciationEnabled: Boolean(dto.depreciationEnabled),
        roomId: dto.roomId ?? undefined,
        inventoryItemId: dto.inventoryItemId ?? undefined,
        roomItemId: dto.roomItemId ?? undefined,
        expenseId: dto.expenseId ?? undefined,
        notes: dto.notes,
        createdById: actor.id,
      },
      include: this.assetInclude(),
    });

    if (!dto.assetCode) {
      const updated = await (this.prisma as any).fixedAsset.update({
        where: { id: asset.id },
        data: { assetCode: nextAssetCode(asset.id) },
        include: this.assetInclude(),
      });
      return this.formatAsset(updated);
    }
    return this.formatAsset(asset);
  }

  async update(id: number, dto: UpdateFixedAssetDto) {
    const existing = await (this.prisma as any).fixedAsset.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Aset tidak ditemukan');
    await this.validateRelations(dto);
    this.validateAssetNumbers(
      dto.acquisitionCostRupiah ?? existing.acquisitionCostRupiah,
      dto.salvageValueRupiah ?? existing.salvageValueRupiah,
      dto.usefulLifeMonths ?? existing.usefulLifeMonths,
    );

    const updated = await (this.prisma as any).fixedAsset.update({
      where: { id },
      data: {
        assetCode: dto.assetCode?.trim(),
        name: dto.name?.trim(),
        category: dto.category as any,
        status: dto.status as any,
        locationType: dto.locationType as any,
        capitalizationSource: dto.capitalizationSource as any,
        depreciationMethod: dto.depreciationMethod as any,
        acquisitionDate: dto.acquisitionDate ? dateOnly(dto.acquisitionDate) : undefined,
        depreciationStartDate: dto.depreciationStartDate ? dateOnly(dto.depreciationStartDate) : undefined,
        acquisitionCostRupiah: dto.acquisitionCostRupiah !== undefined ? rupiah(dto.acquisitionCostRupiah) : undefined,
        salvageValueRupiah: dto.salvageValueRupiah !== undefined ? rupiah(dto.salvageValueRupiah) : undefined,
        usefulLifeMonths: dto.usefulLifeMonths,
        accumulatedDepreciationRupiah: dto.accumulatedDepreciationRupiah !== undefined ? rupiah(dto.accumulatedDepreciationRupiah) : undefined,
        depreciationEnabled: dto.depreciationEnabled,
        roomId: dto.roomId === null ? null : dto.roomId,
        inventoryItemId: dto.inventoryItemId === null ? null : dto.inventoryItemId,
        roomItemId: dto.roomItemId === null ? null : dto.roomItemId,
        expenseId: dto.expenseId === null ? null : dto.expenseId,
        notes: dto.notes,
        disposedAt: dto.disposedAt ? dateOnly(dto.disposedAt) : dto.disposedAt === null ? null : undefined,
        disposalNote: dto.disposalNote,
      },
      include: this.assetInclude(),
    });
    return this.formatAsset(updated);
  }

  async depreciationPreview(query: DepreciationPreviewQueryDto = {}) {
    const fallback = currentYearMonth();
    const year = Number(query.year || fallback.year);
    const month = Number(query.month || fallback.month);
    return this.buildDepreciationPreview(year, month);
  }

  async runDepreciation(dto: RunDepreciationDto, actor: CurrentUserPayload) {
    const year = Number(dto.year);
    const month = Number(dto.month);
    if (month < 1 || month > 12) throw new ConflictException('Bulan depresiasi harus 1-12.');
    const preview = await this.buildDepreciationPreview(year, month);
    if (!preview.eligibleLines.length) throw new ConflictException('Tidak ada aset eligible untuk depresiasi bulan ini.');

    return (this.prisma as any).$transaction(async (tx: any) => {
      const existing = await tx.assetDepreciationRun.findUnique({ where: { periodYear_periodMonth: { periodYear: year, periodMonth: month } } });
      if (existing) throw new ConflictException(`Depresiasi ${year}-${String(month).padStart(2, '0')} sudah pernah dibuat.`);

      const run = await tx.assetDepreciationRun.create({
        data: {
          runNumber: `DEP-${year}${String(month).padStart(2, '0')}`,
          periodYear: year,
          periodMonth: month,
          runDate: preview.runDate,
          status: 'POSTED' as any,
          totalDepreciationRupiah: preview.totalDepreciationRupiah,
          createdById: actor.id,
          postedAt: new Date(),
          notes: dto.notes,
          lines: {
            create: preview.eligibleLines.map((line: any) => ({
              fixedAssetId: line.fixedAssetId,
              depreciationAmountRupiah: line.depreciationAmountRupiah,
              accumulatedBeforeRupiah: line.accumulatedBeforeRupiah,
              accumulatedAfterRupiah: line.accumulatedAfterRupiah,
              bookValueBeforeRupiah: line.bookValueBeforeRupiah,
              bookValueAfterRupiah: line.bookValueAfterRupiah,
            })),
          },
        },
        include: { lines: true },
      });

      const journalResult: any = await this.accountingPosting.postDepreciationRunTx(
        tx,
        run.id,
        preview.runDate,
        preview.totalDepreciationRupiah,
        actor.id,
      );
      if (!journalResult?.posted) throw new ConflictException(journalResult?.reason ?? 'Journal depresiasi tidak berhasil dibuat.');

      for (const line of preview.eligibleLines) {
        await tx.fixedAsset.update({
          where: { id: line.fixedAssetId },
          data: {
            accumulatedDepreciationRupiah: line.accumulatedAfterRupiah,
            status: line.bookValueAfterRupiah <= line.salvageValueRupiah ? 'FULLY_DEPRECIATED' as any : undefined,
          },
        });
      }

      const updatedRun = await tx.assetDepreciationRun.update({
        where: { id: run.id },
        data: { journalEntryId: journalResult.journalEntry.id },
        include: {
          journalEntry: { include: { lines: { include: { chartOfAccount: true, cashAccount: true }, orderBy: { sortOrder: 'asc' } } } },
          lines: { include: { fixedAsset: true }, orderBy: { id: 'asc' } },
        },
      });

      return {
        basis: 'B4_MONTHLY_DEPRECIATION_RUN',
        posted: true,
        run: this.formatRun(updatedRun),
        journalEntry: journalResult.journalEntry,
        warnings: ['Depresiasi ini hanya untuk aset depreciationEnabled=true. Tidak membuat acquisition journal.'],
      };
    });
  }

  private async buildDepreciationPreview(year: number, month: number) {
    if (month < 1 || month > 12) throw new ConflictException('Bulan depresiasi harus 1-12.');
    const runDate = endOfMonth(year, month);
    const existingRun = await (this.prisma as any).assetDepreciationRun.findUnique({ where: { periodYear_periodMonth: { periodYear: year, periodMonth: month } } });
    const assets = await (this.prisma as any).fixedAsset.findMany({
      where: {
        status: 'ACTIVE' as any,
        depreciationEnabled: true,
        depreciationStartDate: { lte: runDate },
      },
      include: this.assetInclude(),
      orderBy: [{ assetCode: 'asc' }, { id: 'asc' }],
    });

    const eligibleLines = assets.map((asset: any) => {
      const cost = rupiah(asset.acquisitionCostRupiah);
      const salvage = Math.min(rupiah(asset.salvageValueRupiah), cost);
      const accumulatedBefore = rupiah(asset.accumulatedDepreciationRupiah);
      const depreciableBase = Math.max(cost - salvage, 0);
      const remaining = Math.max(depreciableBase - accumulatedBefore, 0);
      const monthly = Math.max(1, Math.round(depreciableBase / Math.max(Number(asset.usefulLifeMonths || 1), 1)));
      const depreciationAmount = Math.min(monthly, remaining);
      const accumulatedAfter = accumulatedBefore + depreciationAmount;
      const bookValueBefore = Math.max(cost - accumulatedBefore, 0);
      const bookValueAfter = Math.max(cost - accumulatedAfter, salvage);
      return {
        fixedAssetId: asset.id,
        asset: this.formatAsset(asset),
        depreciationAmountRupiah: depreciationAmount,
        accumulatedBeforeRupiah: accumulatedBefore,
        accumulatedAfterRupiah: accumulatedAfter,
        bookValueBeforeRupiah: bookValueBefore,
        bookValueAfterRupiah: bookValueAfter,
        salvageValueRupiah: salvage,
      };
    }).filter((line: any) => line.depreciationAmountRupiah > 0);

    const totalDepreciationRupiah = eligibleLines.reduce((sum: number, line: any) => sum + line.depreciationAmountRupiah, 0);
    return {
      basis: 'B4_DEPRECIATION_PREVIEW_STRAIGHT_LINE',
      ledgerBacked: true,
      year,
      month,
      runDate,
      alreadyPosted: Boolean(existingRun),
      existingRun: existingRun ? this.formatRun(existingRun) : null,
      eligibleAssetCount: eligibleLines.length,
      totalDepreciationRupiah,
      eligibleLines,
      warnings: [
        'Preview hanya menghitung aset ACTIVE dengan depreciationEnabled=true dan start date sudah masuk periode.',
        'Run akan membuat JournalEntry DEPRECIATION: Debit 6700 Depreciation, Credit 1590 Accumulated Depreciation.',
      ],
    };
  }

  private validateAssetNumbers(cost: number, salvage: number, usefulLife: number) {
    if (rupiah(cost) <= 0) throw new ConflictException('Nilai perolehan aset harus lebih dari 0.');
    if (rupiah(salvage) >= rupiah(cost)) throw new ConflictException('Nilai residu harus lebih kecil dari nilai perolehan.');
    if (Number(usefulLife) <= 0) throw new ConflictException('Umur manfaat aset harus lebih dari 0 bulan.');
  }

  private async validateRelations(dto: { roomId?: number | null; inventoryItemId?: number | null; roomItemId?: number | null; expenseId?: number | null }) {
    if (dto.roomId) {
      const exists = await (this.prisma as any).room.findUnique({ where: { id: Number(dto.roomId) }, select: { id: true } });
      if (!exists) throw new NotFoundException('Kamar tidak ditemukan');
    }
    if (dto.inventoryItemId) {
      const exists = await (this.prisma as any).inventoryItem.findUnique({ where: { id: Number(dto.inventoryItemId) }, select: { id: true } });
      if (!exists) throw new NotFoundException('Inventory item tidak ditemukan');
    }
    if (dto.roomItemId) {
      const exists = await (this.prisma as any).roomItem.findUnique({ where: { id: Number(dto.roomItemId) }, select: { id: true, roomId: true } });
      if (!exists) throw new NotFoundException('Room item tidak ditemukan');
      if (dto.roomId && exists.roomId !== Number(dto.roomId)) throw new ConflictException('Room item tidak sesuai dengan kamar aset.');
    }
    if (dto.expenseId) {
      const exists = await (this.prisma as any).expense.findUnique({ where: { id: Number(dto.expenseId) }, select: { id: true } });
      if (!exists) throw new NotFoundException('Expense sumber aset tidak ditemukan');
    }
  }

  private assetInclude() {
    return {
      room: { select: { id: true, code: true, name: true, floor: true } },
      inventoryItem: { select: { id: true, sku: true, name: true, category: true, unit: true } },
      roomItem: { select: { id: true, roomId: true, itemId: true, status: true } },
      expense: { select: { id: true, expenseDate: true, category: true, description: true, amountRupiah: true } },
      createdBy: { select: { id: true, fullName: true, email: true, role: true } },
    };
  }

  private formatAsset(asset: any, includeHistory = false) {
    const cost = rupiah(asset.acquisitionCostRupiah);
    const accumulated = rupiah(asset.accumulatedDepreciationRupiah);
    const salvage = rupiah(asset.salvageValueRupiah);
    return {
      ...asset,
      acquisitionCostRupiah: cost,
      salvageValueRupiah: salvage,
      accumulatedDepreciationRupiah: accumulated,
      bookValueRupiah: Math.max(cost - accumulated, salvage),
      depreciableBaseRupiah: Math.max(cost - salvage, 0),
      monthlyDepreciationRupiah: Math.max(0, Math.round(Math.max(cost - salvage, 0) / Math.max(Number(asset.usefulLifeMonths || 1), 1))),
      depreciationHistory: includeHistory ? (asset.depreciationLines ?? []) : undefined,
    };
  }

  private formatRun(run: any) {
    return {
      id: run.id,
      runNumber: run.runNumber,
      periodYear: run.periodYear,
      periodMonth: run.periodMonth,
      runDate: run.runDate,
      status: run.status,
      totalDepreciationRupiah: rupiah(run.totalDepreciationRupiah),
      journalEntryId: run.journalEntryId ?? null,
      postedAt: run.postedAt ?? null,
      notes: run.notes ?? null,
      journalEntry: run.journalEntry ?? null,
      lines: run.lines ?? undefined,
    };
  }
}
