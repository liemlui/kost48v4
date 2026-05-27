import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
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
  async periodAutoClosePolicy() {
    return {
      message: 'Kebijakan auto-close periode berhasil diambil',
      data: await this.periodCloseService.autoClosePolicy(),
    };
  }

  @Roles(UserRole.OWNER)
  @Post('period-close/auto-run')
  async periodAutoCloseRun(@Body() dto: PeriodAutoCloseRunDto = {}, @CurrentUser() user: CurrentUserPayload) {
    return {
      message: 'Auto-close periode bulanan selesai diproses',
      data: await this.periodCloseService.autoCloseMonthly({ actorUserId: user.id, source: 'OWNER_MANUAL_AUTO_CLOSE_RUN', monthsBack: dto.monthsBack }),
    };
  }

  @Get('period-close/readiness')
  async periodCloseReadiness(@Query() query: PeriodCloseQueryDto) {
    return {
      message: 'Kesiapan tutup periode berhasil diambil',
      data: await this.periodCloseService.readiness(query),
    };
  }

  @Post('period-close/preview')
  async periodClosePreview(@Body() dto: PeriodClosePayloadDto) {
    return {
      message: 'Preview tutup periode berhasil dibuat',
      data: await this.periodCloseService.preview(dto),
    };
  }

  @Roles(UserRole.OWNER)
  @Post('period-close/post')
  async periodClosePost(@Body() dto: PeriodClosePayloadDto, @CurrentUser() user: CurrentUserPayload) {
    return {
      message: 'Tutup periode berhasil diposting',
      data: await this.periodCloseService.post(dto, user),
    };
  }

  @Post('period-close/reopen-preview')
  async periodReopenPreview(@Body() dto: PeriodReopenPayloadDto) {
    return {
      message: 'Preview buka ulang periode berhasil dibuat',
      data: await this.periodCloseService.reopenPreview(dto),
    };
  }

  @Roles(UserRole.OWNER)
  @Post('period-close/reopen')
  async periodReopen(@Body() dto: PeriodReopenPayloadDto, @CurrentUser() user: CurrentUserPayload) {
    return {
      message: 'Periode berhasil dibuka ulang',
      data: await this.periodCloseService.reopen(dto, user),
    };
  }

  @Get('readiness')
  async readiness(@Query('postingDate') postingDate?: string) {
    return { message: 'Kesiapan accounting berhasil diambil', data: await this.readinessService.getReadiness(postingDate) };
  }

  @Post('default-coa/seed')
  async seedDefaultCoa() {
    return { message: 'Default COA berhasil disiapkan', data: await this.accountingService.seedDefaultCoa() };
  }

  @Get('accounts')
  async accounts(@Query() query: AccountingAccountsQueryDto) {
    return { message: 'Daftar COA berhasil diambil', data: await this.accountingService.listAccounts(query) };
  }

  @Post('accounts')
  async createAccount(@Body() dto: CreateChartOfAccountDto) {
    return { message: 'COA berhasil dibuat', data: await this.accountingService.createAccount(dto) };
  }

  @Patch('accounts/:id')
  async updateAccount(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateChartOfAccountDto) {
    return { message: 'COA berhasil diperbarui', data: await this.accountingService.updateAccount(id, dto) };
  }

  @Get('cash-accounts')
  async cashAccounts(@Query() query: CashAccountsQueryDto) {
    return { message: 'Daftar cash account berhasil diambil', data: await this.accountingService.listCashAccounts(query) };
  }

  @Post('cash-accounts')
  async createCashAccount(@Body() dto: CreateCashAccountDto) {
    return { message: 'Cash account berhasil dibuat', data: await this.accountingService.createCashAccount(dto) };
  }

  @Patch('cash-accounts/:id')
  async updateCashAccount(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateCashAccountDto) {
    return { message: 'Cash account berhasil diperbarui', data: await this.accountingService.updateCashAccount(id, dto) };
  }

  @Get('periods')
  async periods(@Query() query: AccountingPeriodsQueryDto) {
    return { message: 'Daftar accounting period berhasil diambil', data: await this.accountingService.listPeriods(query) };
  }

  @Roles(UserRole.OWNER)
  @Post('periods')
  async createPeriod(@Body() dto: CreateAccountingPeriodDto) {
    return { message: 'Accounting period berhasil dibuat', data: await this.accountingService.createPeriod(dto) };
  }

  @Roles(UserRole.OWNER)
  @Patch('periods/:id/reopen')
  async reopenPeriodById(@Param('id', ParseIntPipe) id: number, @Body() dto: ReopenAccountingPeriodDto, @CurrentUser() user: CurrentUserPayload) {
    const period = await this.accountingService.getPeriodById(id);
    return {
      message: 'Periode berhasil dibuka ulang',
      data: await this.periodCloseService.reopen({ year: period.year, month: period.month, reason: dto.reason }, user),
    };
  }

  @Roles(UserRole.OWNER)
  @Patch('periods/:id')
  async updatePeriod(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateAccountingPeriodDto) {
    return { message: 'Accounting period berhasil diperbarui', data: await this.accountingService.updatePeriod(id, dto) };
  }

  @Get('opening-balances')
  async openingBalances(@Query() query: OpeningBalancesQueryDto) {
    return { message: 'Daftar opening balance berhasil diambil', data: await this.accountingService.listOpeningBalances(query) };
  }

  @Get('opening-balances/:id')
  async openingBalanceDetail(@Param('id', ParseIntPipe) id: number) {
    return { message: 'Detail opening balance berhasil diambil', data: await this.accountingService.getOpeningBalance(id) };
  }

  @Roles(UserRole.OWNER)
  @Post('opening-balances/:id/post')
  async postOpeningBalance(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: CurrentUserPayload) {
    return { message: 'Opening balance berhasil diposting', data: await this.accountingService.postOpeningBalance(id, user) };
  }

  @Roles(UserRole.OWNER)
  @Patch('opening-balances/:id/void')
  async voidOpeningBalance(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: CurrentUserPayload) {
    return { message: 'Draft opening balance berhasil dibatalkan', data: await this.accountingService.voidOpeningBalance(id, user) };
  }

  @Roles(UserRole.OWNER)
  @Post('opening-balances/draft')
  async createOpeningBalanceDraft(@Body() dto: CreateOpeningBalanceDraftDto, @CurrentUser() user: CurrentUserPayload) {
    return { message: 'Draft opening balance berhasil dibuat', data: await this.accountingService.createOpeningBalanceDraft(dto, user) };
  }

  @Get('recent-journals')
  async recentJournals(@Query() query: RecentJournalsQueryDto) {
    return { message: 'Aktivitas jurnal otomatis berhasil diambil', data: await this.reportsService.recentJournals(query) };
  }

  @Get('journal-by-source')
  async journalBySource(@Query() query: JournalBySourceQueryDto) {
    return { message: 'Jurnal berdasarkan source berhasil diambil', data: await this.reportsService.journalBySource(query) };
  }

  @Get('journal-entries')
  async journalEntries(@Query() query: JournalEntriesQueryDto) {
    return { message: 'Daftar journal entry berhasil diambil', data: await this.accountingService.listJournalEntries(query) };
  }

  @Post('journal-entries/draft')
  async createJournalDraft(@Body() dto: CreateJournalDraftDto, @CurrentUser() user: CurrentUserPayload) {
    return { message: 'Draft journal entry berhasil dibuat', data: await this.accountingService.createJournalDraft(dto, user) };
  }

  @Get('trial-balance')
  async trialBalance(@Query() query: TrialBalanceQueryDto) {
    return { message: 'Trial balance berhasil diambil', data: await this.reportsService.trialBalance(query) };
  }

  @Get('unmapped-transactions')
  async unmappedTransactions() {
    return { message: 'Scanner transaksi belum terpetakan berhasil diambil', data: await this.reportsService.unmappedTransactions() };
  }

  @Get('profit-loss')
  async profitLoss(@Query() query: TrialBalanceQueryDto) {
    return { message: 'Profit & Loss Lite berhasil diambil', data: await this.reportsService.profitLoss(query) };
  }

  @Get('balance-sheet')
  async balanceSheet(@Query() query: TrialBalanceQueryDto) {
    return { message: 'Guard balance sheet berhasil diambil', data: await this.reportsService.balanceSheet(query) };
  }

  @Get('asset-readiness')
  async assetReadiness() {
    return { message: 'Kesiapan asset register berhasil diambil', data: await this.reportsService.assetReadiness() };
  }

  @Get('deposit-position')
  async depositPosition() {
    return { message: 'Posisi liability deposit berhasil diambil', data: await this.reportsService.depositPosition() };
  }

  @Get('deposit-reconciliation')
  async depositReconciliation() {
    return { message: 'Rekonsiliasi deposit berhasil diambil', data: await this.reportsService.depositReconciliation() };
  }

  @Get('reversal-watch')
  async reversalWatch() {
    return { message: 'Watch reversal invoice berhasil diambil', data: await this.reportsService.reversalWatch() };
  }

  @Get('posting-boundary')
  async postingBoundary() {
    return { message: 'Batas auto-posting accounting berhasil diambil', data: this.postingService.explainPostingBoundary() };
  }

  @Roles(UserRole.OWNER)
  @Post('auto-journal/backfill')
  async backfillAutoJournal(@Body() dto: AutoJournalBackfillDto, @CurrentUser() user: CurrentUserPayload) {
    return {
      message: 'Backfill auto journal berhasil diproses',
      data: await this.postingService.backfillAutoJournal(dto, user.id),
    };
  }

  @Roles(UserRole.OWNER)
  @Post('auto-journal/deposit-backfill/dry-run')
  async dryRunDepositBackfill(@Body() dto: DepositBackfillDryRunDto) {
    return {
      message: 'Dry-run backfill deposit berhasil diproses',
      data: await this.postingService.dryRunDepositBackfill(dto),
    };
  }
}
