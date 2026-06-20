import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { buildMeta, buildPagination } from '../../common/utils/pagination';
import { CreateWifiSaleDto, UpdateWifiSaleDto } from './dto/wifi-sale.dto';
import { WifiSalesQueryDto } from './dto/wifi-sales-query.dto';
import { AuditLogService } from '../../audit-log/audit-log.service';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import { AccountingPostingService } from '../accounting/accounting-posting.service';

@Injectable()
export class WifiSalesService {
  private readonly logger = new Logger(WifiSalesService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditLogService,
    private readonly accountingPosting: AccountingPostingService,
  ) {}

  async findAll(query: WifiSalesQueryDto) {
    const { page, limit, skip, take } = buildPagination(query.page, query.limit);
    const where: any = {
      AND: [
        query.customerName ? { customerName: { contains: query.customerName, mode: 'insensitive' } } : {},
        query.packageName ? { packageName: { contains: query.packageName, mode: 'insensitive' } } : {},
        query.saleDateFrom || query.saleDateTo ? { saleDate: { gte: query.saleDateFrom ? new Date(query.saleDateFrom) : undefined, lte: query.saleDateTo ? new Date(query.saleDateTo) : undefined } } : {},
      ],
    };
    const [items, totalItems] = await this.prisma.$transaction([
      this.prisma.wifiSale.findMany({ where, skip, take, orderBy: { saleDate: 'desc' } }),
      this.prisma.wifiSale.count({ where }),
    ]);
    return { items, meta: buildMeta(page, limit, totalItems) };
  }

  async findOne(id: number) {
    const item = await this.prisma.wifiSale.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Penjualan WiFi tidak ditemukan');
    return item;
  }

  async create(dto: CreateWifiSaleDto, actor: CurrentUserPayload) {
    const created = await this.prisma.wifiSale.create({ data: { ...dto, saleDate: new Date(dto.saleDate), createdById: actor.id } });
    await this.audit.log({ actorUserId: actor.id, action: 'CREATE', entityType: 'WifiSale', entityId: String(created.id), newData: created });
    await this.accountingPosting.postWifiSale(created.id, actor.id).catch((err) =>
      this.logger.warn(`Jurnal WiFi sale #${created.id} gagal (Auto Journal Lite): ${err instanceof Error ? err.message : String(err)}`)
    );
    return created;
  }

  async update(id: number, dto: UpdateWifiSaleDto, actor: CurrentUserPayload) {
    const existing = await this.prisma.wifiSale.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Penjualan WiFi tidak ditemukan');
    // Audit M-33: data finansial yang sudah terjurnal tidak boleh berubah senyap.
    const changingFinancials =
      (dto.soldPriceRupiah !== undefined && dto.soldPriceRupiah !== existing.soldPriceRupiah) ||
      (dto.saleDate !== undefined && new Date(dto.saleDate).getTime() !== new Date(existing.saleDate).getTime());
    await this.assertWifiSaleJournalAllowsChange(id, changingFinancials);
    const updated = await this.prisma.wifiSale.update({ where: { id }, data: { ...dto, saleDate: dto.saleDate ? new Date(dto.saleDate) : undefined } });
    await this.audit.log({ actorUserId: actor.id, action: 'UPDATE', entityType: 'WifiSale', entityId: String(updated.id), oldData: existing, newData: updated });
    return updated;
  }

  async remove(id: number, actor: CurrentUserPayload) {
    const existing = await this.prisma.wifiSale.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Penjualan WiFi tidak ditemukan');
    await this.assertWifiSaleJournalAllowsChange(id, true);
    await this.prisma.wifiSale.delete({ where: { id } });
    await this.audit.log({ actorUserId: actor.id, action: 'DELETE', entityType: 'WifiSale', entityId: String(existing.id), oldData: existing });
    return { deletedId: existing.id };
  }

  private async assertWifiSaleJournalAllowsChange(wifiSaleId: number, changingFinancials: boolean) {
    if (!changingFinancials) return;
    const journal = await this.prisma.journalEntry.findFirst({
      where: { sourceType: 'WIFI_SALE' as any, sourceId: String(wifiSaleId), status: { not: 'VOID' as any } },
      select: { id: true, entryNumber: true },
    });
    if (journal) {
      throw new ConflictException(
        `Penjualan WiFi sudah terjurnal (${journal.entryNumber}). Nominal/tanggal tidak boleh diubah dan data tidak boleh dihapus; gunakan jurnal koreksi atau void resmi di accounting.`,
      );
    }
  }
}