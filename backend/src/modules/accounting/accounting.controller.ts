import { Body, Controller, ForbiddenException, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/app.enums';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import { AccountingService } from './accounting.service';
import { AccountingPostingService } from './accounting-posting.service';
import { AccountingReadinessService } from './accounting-readiness.service';
import { AccountingReportsService } from './accounting-reports.service';
import { AccountingAccountsQueryDto, CreateChartOfAccountDto, UpdateChartOfAccountDto } from './dto/accounting-account.dto';
import { CashAccountsQueryDto, CreateCashAccountDto, UpdateCashAccountDto } from './dto/cash-account.dto';
import { AccountingPeriodsQueryDto, CreateAccountingPeriodDto, ReopenAccountingPeriodDto, UpdateAccountingPeriodDto } from './dto/accounting-period.dto';
import { CreateOpeningBalanceDraftDto, OpeningBalancesQueryDto } from './dto/opening-balance.dto';
import { CreateJournalDraftDto, JournalBySourceQueryDto, JournalEntriesQueryDto, RecentJournalsQueryDto, TrialBalanceQueryDto } from './dto/journal-entry.dto';
import { AutoJournalBackfillDto, DepositBackfillDryRunDto } from './dto/auto-journal.dto';
import { AccountingPeriodCloseService } from './accounting-period-close.service';
import { PeriodAutoCloseRunDto, PeriodClosePayloadDto, PeriodCloseQueryDto, PeriodReopenPayloadDto } from './dto/period-close.dto';

@ApiTags('accounting')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.OWNER, UserRole.ADMIN)
@Controller('accounting')
export class AccountingController {
  constructor(
    private readonly accountingService: AccountingService,
    private readonly readinessService: AccountingReadinessService,
    private readonly reportsService: AccountingReportsService,
    private readonly postingService: AccountingPostingService,
    private readonly periodCloseService: AccountingPeriodCloseService,
  ) {}



  @Get('period-close/auto-policy')
  @ApiOperation({ summary: 'Kebijakan auto-close periode — OWNER/ADMIN' })
  async periodAutoClosePolicy() {
    return {
      message: 'Kebijakan auto-close periode berhasil diambil',
      data: await this.periodCloseService.autoClosePolicy(),
    };
  }

  @Roles(UserRole.OWNER)
  @Post('period-close/auto-run')
  @ApiOperation({ summary: 'Jalankan auto-close periode — OWNER-only' })
  async periodAutoCloseRun(@Body() dto: PeriodAutoCloseRunDto = {}, @CurrentUser() user: CurrentUserPayload) {
    return {
      message: 'Auto-close periode bulanan selesai diproses',
      data: await this.periodCloseService.autoCloseMonthly({ actorUserId: user.id, source: 'OWNER_MANUAL_AUTO_CLOSE_RUN', monthsBack: dto.monthsBack }),
    };
  }

  @Get('period-close/readiness')
  @ApiOperation({ summary: 'Kesiapan tutup periode — OWNER/ADMIN' })
  async periodCloseReadiness(@Query() query: PeriodCloseQueryDto) {
    return {
      message: 'Kesiapan tutup periode berhasil diambil',
      data: await this.periodCloseService.readiness(query),
    };
  }

  @Post('period-close/preview')
  @ApiOperation({ summary: 'Preview tutup periode — OWNER/ADMIN' })
  async periodClosePreview(@Body() dto: PeriodClosePayloadDto) {
    return {
      message: 'Preview tutup periode berhasil dibuat',
      data: await this.periodCloseService.preview(dto),
    };
  }

  @Roles(UserRole.OWNER)
  @Post('period-close/post')
  @ApiOperation({ summary: 'Posting tutup periode — OWNER-only' })
  async periodClosePost(@Body() dto: PeriodClosePayloadDto, @CurrentUser() user: CurrentUserPayload) {
    return {
      message: 'Tutup periode berhasil diposting',
      data: await this.periodCloseService.post(dto, user),
    };
  }

  @Post('period-close/reopen-preview')
  @ApiOperation({ summary: 'Preview buka ulang periode — OWNER/ADMIN' })
  async periodReopenPreview(@Body() dto: PeriodReopenPayloadDto) {
    return {
      message: 'Preview buka ulang periode berhasil dibuat',
      data: await this.periodCloseService.reopenPreview(dto),
    };
  }

  @Roles(UserRole.OWNER)
  @Post('period-close/reopen')
  @ApiOperation({ summary: 'Buka ulang periode — OWNER-only' })
  async periodReopen(@Body() dto: PeriodReopenPayloadDto, @CurrentUser() user: CurrentUserPayload) {
    return {
      message: 'Periode berhasil dibuka ulang',
      data: await this.periodCloseService.reopen(dto, user),
    };
  }

  @Get('readiness')
  @ApiOperation({ summary: 'Kesiapan accounting — OWNER/ADMIN' })
  async readiness(@Query('postingDate') postingDate?: string) {
    return { message: 'Kesiapan accounting berhasil diambil', data: await this.readinessService.getReadiness(postingDate) };
  }

  @Post('default-coa/seed')
  @ApiOperation({ summary: 'Seed default COA — OWNER/ADMIN' })
  async seedDefaultCoa() {
    return { message: 'Default COA berhasil disiapkan', data: await this.accountingService.seedDefaultCoa() };
  }

  @Get('accounts')
  @ApiOperation({ summary: 'Daftar COA — OWNER/ADMIN' })
  async accounts(@Query() query: AccountingAccountsQueryDto) {
    return { message: 'Daftar COA berhasil diambil', data: await this.accountingService.listAccounts(query) };
  }

  @Post('accounts')
  @ApiOperation({ summary: 'Buat COA — OWNER/ADMIN' })
  async createAccount(@Body() dto: CreateChartOfAccountDto) {
    return { message: 'COA berhasil dibuat', data: await this.accountingService.createAccount(dto) };
  }

  @Patch('accounts/:id')
  @ApiOperation({ summary: 'Perbarui COA — OWNER/ADMIN' })
  async updateAccount(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateChartOfAccountDto) {
    return { message: 'COA berhasil diperbarui', data: await this.accountingService.updateAccount(id, dto) };
  }

  @Get('cash-accounts')
  @ApiOperation({ summary: 'Daftar cash account — OWNER/ADMIN' })
  async cashAccounts(@Query() query: CashAccountsQueryDto) {
    return { message: 'Daftar cash account berhasil diambil', data: await this.accountingService.listCashAccounts(query) };
  }

  @Post('cash-accounts')
  @ApiOperation({ summary: 'Buat cash account — OWNER/ADMIN' })
  async createCashAccount(@Body() dto: CreateCashAccountDto) {
    return { message: 'Cash account berhasil dibuat', data: await this.accountingService.createCashAccount(dto) };
  }

  @Patch('cash-accounts/:id')
  @ApiOperation({ summary: 'Perbarui cash account — OWNER/ADMIN' })
  async updateCashAccount(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateCashAccountDto) {
    return { message: 'Cash account berhasil diperbarui', data: await this.accountingService.updateCashAccount(id, dto) };
  }

  @Get('periods')
  @ApiOperation({ summary: 'Daftar accounting period — OWNER/ADMIN' })
  async periods(@Query() query: AccountingPeriodsQueryDto) {
    return { message: 'Daftar accounting period berhasil diambil', data: await this.accountingService.listPeriods(query) };
  }

  @Roles(UserRole.OWNER)
  @Post('periods')
  @ApiOperation({ summary: 'Buat accounting period — OWNER-only' })
  async createPeriod(@Body() dto: CreateAccountingPeriodDto) {
    return { message: 'Accounting period berhasil dibuat', data: await this.accountingService.createPeriod(dto) };
  }

  @Roles(UserRole.OWNER)
  @Patch('periods/:id/reopen')
  @ApiOperation({ summary: 'Buka ulang period by ID — OWNER-only' })
  async reopenPeriodById(@Param('id', ParseIntPipe) id: number, @Body() dto: ReopenAccountingPeriodDto, @CurrentUser() user: CurrentUserPayload) {
    const period = await this.accountingService.getPeriodById(id);
    return {
      message: 'Periode berhasil dibuka ulang',
      data: await this.periodCloseService.reopen({ year: period.year, month: period.month, reason: dto.reason }, user),
    };
  }

  @Roles(UserRole.OWNER)
  @Patch('periods/:id')
  @ApiOperation({ summary: 'Perbarui accounting period — OWNER-only' })
  async updatePeriod(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateAccountingPeriodDto) {
    return { message: 'Accounting period berhasil diperbarui', data: await this.accountingService.updatePeriod(id, dto) };
  }

  @Get('opening-balances')
  @ApiOperation({ summary: 'Daftar opening balance — OWNER/ADMIN' })
  async openingBalances(@Query() query: OpeningBalancesQueryDto) {
    return { message: 'Daftar opening balance berhasil diambil', data: await this.accountingService.listOpeningBalances(query) };
  }

  @Get('opening-balances/:id')
  @ApiOperation({ summary: 'Detail opening balance — OWNER/ADMIN' })
  async openingBalanceDetail(@Param('id', ParseIntPipe) id: number) {
    return { message: 'Detail opening balance berhasil diambil', data: await this.accountingService.getOpeningBalance(id) };
  }

  @Roles(UserRole.OWNER)
  @Post('opening-balances/:id/post')
  @ApiOperation({ summary: 'Posting opening balance — OWNER-only' })
  async postOpeningBalance(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: CurrentUserPayload) {
    return { message: 'Opening balance berhasil diposting', data: await this.accountingService.postOpeningBalance(id, user) };
  }

  @Roles(UserRole.OWNER)
  @Patch('opening-balances/:id/void')
  @ApiOperation({ summary: 'Batalkan draft opening balance — OWNER-only' })
  async voidOpeningBalance(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: CurrentUserPayload) {
    return { message: 'Draft opening balance berhasil dibatalkan', data: await this.accountingService.voidOpeningBalance(id, user) };
  }

  @Roles(UserRole.OWNER)
  @Post('opening-balances/draft')
  @ApiOperation({ summary: 'Buat draft opening balance — OWNER-only' })
  async createOpeningBalanceDraft(@Body() dto: CreateOpeningBalanceDraftDto, @CurrentUser() user: CurrentUserPayload) {
    return { message: 'Draft opening balance berhasil dibuat', data: await this.accountingService.createOpeningBalanceDraft(dto, user) };
  }

  @Get('recent-journals')
  @ApiOperation({ summary: 'Aktivitas jurnal otomatis — OWNER/ADMIN' })
  async recentJournals(@Query() query: RecentJournalsQueryDto) {
    return { message: 'Aktivitas jurnal otomatis berhasil diambil', data: await this.reportsService.recentJournals(query) };
  }

  @Get('journal-by-source')
  @ApiOperation({ summary: 'Jurnal berdasarkan source — OWNER/ADMIN' })
  async journalBySource(@Query() query: JournalBySourceQueryDto) {
    return { message: 'Jurnal berdasarkan source berhasil diambil', data: await this.reportsService.journalBySource(query) };
  }

  @Get('journal-entries')
  @ApiOperation({ summary: 'Daftar journal entry — OWNER/ADMIN' })
  async journalEntries(@Query() query: JournalEntriesQueryDto) {
    return { message: 'Daftar journal entry berhasil diambil', data: await this.accountingService.listJournalEntries(query) };
  }

  @Post('journal-entries/draft')
  async createJournalDraft(@Body() _dto: CreateJournalDraftDto, @CurrentUser() _user: CurrentUserPayload) {
    // F2-8 (F-22/F-23, D-05): pembuatan jurnal draft manual DINONAKTIFKAN.
    // Auto Journal Lite menangani semua jurnal operasional; saldo awal punya jalur Opening Balance terpisah & terkontrol.
    throw new ForbiddenException(
      'Pembuatan jurnal draft manual dinonaktifkan. Jurnal dibuat otomatis (Auto Journal Lite); untuk saldo awal gunakan Opening Balance.',
    );
  }

  @Get('trial-balance')
  @ApiOperation({ summary: 'Trial balance — OWNER/ADMIN' })
  async trialBalance(@Query() query: TrialBalanceQueryDto) {
    return { message: 'Trial balance berhasil diambil', data: await this.reportsService.trialBalance(query) };
  }

  @Get('unmapped-transactions')
  @ApiOperation({ summary: 'Transaksi belum terpetakan — OWNER/ADMIN' })
  async unmappedTransactions() {
    return { message: 'Scanner transaksi belum terpetakan berhasil diambil', data: await this.reportsService.unmappedTransactions() };
  }

  @Get('profit-loss')
  @ApiOperation({ summary: 'Profit & Loss Lite — OWNER/ADMIN' })
  async profitLoss(@Query() query: TrialBalanceQueryDto) {
    return { message: 'Profit & Loss Lite berhasil diambil', data: await this.reportsService.profitLoss(query) };
  }

  @Get('balance-sheet')
  @ApiOperation({ summary: 'Balance sheet — OWNER/ADMIN' })
  async balanceSheet(@Query() query: TrialBalanceQueryDto) {
    return { message: 'Guard balance sheet berhasil diambil', data: await this.reportsService.balanceSheet(query) };
  }

  @Get('asset-readiness')
  @ApiOperation({ summary: 'Kesiapan asset register — OWNER/ADMIN' })
  async assetReadiness() {
    return { message: 'Kesiapan asset register berhasil diambil', data: await this.reportsService.assetReadiness() };
  }

  @Get('cashflow')
  @ApiOperation({ summary: 'Laporan arus kas — OWNER/ADMIN' })
  async cashflow(@Query() query: TrialBalanceQueryDto) {
    return { message: 'Laporan arus kas berhasil diambil', data: await this.reportsService.cashflow(query) };
  }

  @Get('financial-ratios')
  @ApiOperation({ summary: 'Rasio keuangan — OWNER/ADMIN' })
  async financialRatios(@Query() query: TrialBalanceQueryDto) {
    return { message: 'Rasio keuangan berhasil diambil', data: await this.reportsService.financialRatios(query) };
  }

  @Get('profit-loss/detail')
  @ApiOperation({ summary: 'P&L detail — OWNER/ADMIN' })
  async profitLossDetail(@Query() query: TrialBalanceQueryDto) {
    return { message: 'P&L detail berhasil diambil', data: await this.reportsService.profitLossDetail(query) };
  }

  @Get('balance-sheet/detail')
  @ApiOperation({ summary: 'Balance sheet detail — OWNER/ADMIN' })
  async balanceSheetDetail(@Query() query: TrialBalanceQueryDto) {
    return { message: 'Balance sheet detail berhasil diambil', data: await this.reportsService.balanceSheetDetail(query) };
  }

  @Get('deposit-position')
  @ApiOperation({ summary: 'Posisi liability deposit — OWNER/ADMIN' })
  async depositPosition() {
    return { message: 'Posisi liability deposit berhasil diambil', data: await this.reportsService.depositPosition() };
  }

  @Get('deposit-reconciliation')
  @ApiOperation({ summary: 'Rekonsiliasi deposit — OWNER/ADMIN' })
  async depositReconciliation() {
    return { message: 'Rekonsiliasi deposit berhasil diambil', data: await this.reportsService.depositReconciliation() };
  }

  @Get('reversal-watch')
  @ApiOperation({ summary: 'Watch reversal invoice — OWNER/ADMIN' })
  async reversalWatch() {
    return { message: 'Watch reversal invoice berhasil diambil', data: await this.reportsService.reversalWatch() };
  }

  @Get('posting-boundary')
  @ApiOperation({ summary: 'Batas auto-posting accounting — OWNER/ADMIN' })
  async postingBoundary() {
    return { message: 'Batas auto-posting accounting berhasil diambil', data: this.postingService.explainPostingBoundary() };
  }

  @Roles(UserRole.OWNER)
  @Post('auto-journal/backfill')
  @ApiOperation({ summary: 'Backfill auto journal — OWNER-only' })
  async backfillAutoJournal(@Body() dto: AutoJournalBackfillDto, @CurrentUser() user: CurrentUserPayload) {
    return {
      message: 'Backfill auto journal berhasil diproses',
      data: await this.postingService.backfillAutoJournal(dto, user.id),
    };
  }

  @Roles(UserRole.OWNER)
  @Post('auto-journal/deposit-backfill/dry-run')
  @ApiOperation({ summary: 'Dry-run backfill deposit — OWNER-only' })
  async dryRunDepositBackfill(@Body() dto: DepositBackfillDryRunDto) {
    return {
      message: 'Dry-run backfill deposit berhasil diproses',
      data: await this.postingService.dryRunDepositBackfill(dto),
    };
  }
}
