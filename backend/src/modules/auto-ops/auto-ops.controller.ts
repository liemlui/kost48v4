import { timingSafeEqual } from 'node:crypto';
import { Controller, ForbiddenException, Get, Headers, HttpCode, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { RateLimit } from '../../common/decorators/rate-limit.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/app.enums';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { RateLimitGuard } from '../../common/guards/rate-limit.guard';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import { AutoOpsService } from './auto-ops.service';

function tokensMatch(expected: string, provided: string): boolean {
  if (!expected || !provided) return false;
  const expectedBytes = Buffer.from(expected);
  const providedBytes = Buffer.from(provided);
  return expectedBytes.length === providedBytes.length && timingSafeEqual(expectedBytes, providedBytes);
}

@ApiTags('auto-ops')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('auto-ops')
export class AutoOpsController {
  constructor(private readonly autoOpsService: AutoOpsService) {}

  @Get('status')
  @ApiOperation({ summary: 'Status AutoOps — OWNER/ADMIN' })
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async status() {
    return { message: 'Status AutoOps berhasil diambil', data: await this.autoOpsService.status() };
  }

  /**
   * Trigger cron eksternal (cPanel Cron Jobs). Di shared hosting/Passenger proses Node
   * di-idle saat sepi → setInterval in-process tak andal; cPanel cron memanggil URL ini
   * tiap N menit (sekaligus membangunkan app). Tanpa JWT — diproteksi token rahasia
   * (env AUTO_OPS_CRON_TOKEN) via header `X-Cron-Token` SAJA. Query `?token=` SUDAH DIHAPUS (V-07b).
   * Contoh cPanel: curl -fsS -X POST -H "X-Cron-Token: RAHASIA" https://domain/api/auto-ops/cron
   */
  @Public()
  @UseGuards(RateLimitGuard)
  @RateLimit('cron')
  @Post('cron')
  @ApiOperation({ summary: 'Trigger cron eksternal AutoOps — via X-Cron-Token' })
  @HttpCode(200)
  async cron(@Headers('x-cron-token') headerToken?: string) {
    const expected = (process.env.AUTO_OPS_CRON_TOKEN ?? '').trim();
    const provided = (headerToken ?? '').trim();
    if (!tokensMatch(expected, provided)) {
      throw new ForbiddenException('Token cron auto-ops tidak valid');
    }
    return { message: 'AutoOps cron berhasil dijalankan', data: await this.autoOpsService.runAll({ actorUserId: null, source: 'CRON_AUTO_OPS' }) };
  }

  @Post('run')
  @ApiOperation({ summary: 'Jalankan semua AutoOps — OWNER/ADMIN' })
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async run(@CurrentUser() user: CurrentUserPayload) {
    return { message: 'AutoOps berhasil dijalankan', data: await this.autoOpsService.runAll({ actorUserId: user.id, source: 'MANUAL_AUTO_OPS_RUN' }) };
  }

  @Post('run/booking-expiry')
  @ApiOperation({ summary: 'Trigger booking expiry — OWNER/ADMIN' })
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async runBookingExpiry(@CurrentUser() user: CurrentUserPayload) {
    return { message: 'AutoOps booking expiry berhasil dijalankan', data: await this.autoOpsService.runBookingExpiry({ actorUserId: user.id, source: 'MANUAL_BOOKING_EXPIRY_RUN' }) };
  }

  @Post('run/room-healer')
  @ApiOperation({ summary: 'Trigger room healer — OWNER/ADMIN' })
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async runRoomHealer(@CurrentUser() user: CurrentUserPayload) {
    return { message: 'AutoOps room healer berhasil dijalankan', data: await this.autoOpsService.runRoomHealer({ actorUserId: user.id, source: 'MANUAL_ROOM_HEALER_RUN' }) };
  }

  // W-00-D1 (2026-07-01): OWNER-only — ADMIN = operasional, OWNER = investor.
  @Post('run/recurring-expenses')
  @ApiOperation({ summary: 'Trigger draft expense rutin — OWNER-only' })
  @Roles(UserRole.OWNER)
  async runRecurringExpenses(@CurrentUser() user: CurrentUserPayload) {
    return {
      message: 'AutoOps draft expense rutin berhasil dijalankan',
      data: await this.autoOpsService.runRecurringExpenseDrafts({
        actorUserId: user.id,
        source: 'MANUAL_RECURRING_EXPENSE_DRAFTS_RUN',
      }),
    };
  }

  // W-00-D1 (2026-07-01): OWNER-only.
  @Post('run/depreciation')
  @ApiOperation({ summary: 'Trigger depresiasi aset — OWNER-only' })
  @Roles(UserRole.OWNER)
  async runDepreciation(@CurrentUser() user: CurrentUserPayload) {
    return {
      message: 'AutoOps depresiasi berhasil dijalankan',
      data: await this.autoOpsService.runAutomaticDepreciation({
        actorUserId: user.id,
        source: 'MANUAL_ASSET_DEPRECIATION_RUN',
      }),
    };
  }

  // F2-1 inc.3: trigger manual sweeper renewal (UAT/ops).
  @Post('run/renewal-expiry')
  @ApiOperation({ summary: 'Trigger renewal expiry — OWNER/ADMIN' })
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async runRenewalExpiry(@CurrentUser() user: CurrentUserPayload) {
    return { message: 'AutoOps renewal expiry berhasil dijalankan', data: await this.autoOpsService.runRenewalPriorityExpiry({ actorUserId: user.id, source: 'MANUAL_RENEWAL_EXPIRY_RUN' }) };
  }

  @Post('run/renewal-forfeit')
  @ApiOperation({ summary: 'Trigger renewal forfeit — OWNER/ADMIN' })
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async runRenewalForfeit(@CurrentUser() user: CurrentUserPayload) {
    return { message: 'AutoOps renewal forfeit berhasil dijalankan', data: await this.autoOpsService.runRenewalSettlementForfeit({ actorUserId: user.id, source: 'MANUAL_RENEWAL_FORFEIT_RUN' }) };
  }

  // F2-1 #3: trigger manual pengingat akhir kontrak / prompt renewal H-10..H-day (UAT/ops).
  @Post('run/contract-reminders')
  @ApiOperation({ summary: 'Trigger contract-end reminders — OWNER/ADMIN' })
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async runContractReminders(@CurrentUser() user: CurrentUserPayload) {
    return { message: 'AutoOps contract-end reminders berhasil dijalankan', data: await this.autoOpsService.runContractEndReminders({ actorUserId: user.id, source: 'MANUAL_CONTRACT_REMINDERS_RUN' }) };
  }

  // F3-19: trigger manual eskalasi SLA tiket (UAT/ops).
  @Post('run/ticket-sla')
  @ApiOperation({ summary: 'Trigger eskalasi SLA tiket — OWNER/ADMIN' })
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async runTicketSla(@CurrentUser() user: CurrentUserPayload) {
    return { message: 'AutoOps eskalasi SLA tiket berhasil dijalankan', data: await this.autoOpsService.runTicketSlaEscalation({ actorUserId: user.id, source: 'MANUAL_TICKET_SLA_RUN' }) };
  }

  // F3-15: trigger manual penandaan barang abandoned 30 hari (UAT/ops).
  @Post('run/belongings-abandonment')
  @ApiOperation({ summary: 'Trigger penandaan barang abandoned — OWNER/ADMIN' })
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async runBelongingsAbandonment(@CurrentUser() user: CurrentUserPayload) {
    return { message: 'AutoOps penandaan barang abandoned berhasil dijalankan', data: await this.autoOpsService.runBelongingsAbandonment({ actorUserId: user.id, source: 'MANUAL_BELONGINGS_ABANDONMENT_RUN' }) };
  }

  // F5-6 (L-1): trigger manual rekonsiliasi jurnal warisan (backfill + alert owner).
  // W-00-D1 (2026-07-01): OWNER-only — operasi keuangan.
  @Post('run/journal-reconciliation')
  @ApiOperation({ summary: 'Trigger rekonsiliasi jurnal — OWNER-only' })
  @Roles(UserRole.OWNER)
  async runJournalReconciliation(@CurrentUser() user: CurrentUserPayload) {
    return { message: 'AutoOps rekonsiliasi jurnal berhasil dijalankan', data: await this.autoOpsService.runAutoJournalReconciliation({ actorUserId: user.id, source: 'MANUAL_JOURNAL_RECONCILIATION_RUN' }) };
  }

  // F4-7: trigger manual pruning notifikasi >90 hari (UAT/ops).
  @Post('run/notification-pruning')
  @ApiOperation({ summary: 'Trigger pruning notifikasi — OWNER/ADMIN' })
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async runNotificationPruning(@CurrentUser() user: CurrentUserPayload) {
    return { message: 'AutoOps pruning notifikasi berhasil dijalankan', data: await this.autoOpsService.runNotificationPruning({ actorUserId: user.id, source: 'MANUAL_NOTIFICATION_PRUNING_RUN' }) };
  }

  // F4-2: trigger manual dispatch Web Push notifikasi PENDING (UAT/ops).
  @Post('run/push-dispatch')
  @ApiOperation({ summary: 'Trigger dispatch push — OWNER/ADMIN' })
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async runPushDispatch(@CurrentUser() user: CurrentUserPayload) {
    return { message: 'AutoOps dispatch push berhasil dijalankan', data: await this.autoOpsService.runPushDispatch({ actorUserId: user.id, source: 'MANUAL_PUSH_DISPATCH_RUN' }) };
  }

  // F4-1: trigger manual pengakuan pendapatan sewa (unearned) (UAT/ops).
  // W-00-D1 (2026-07-01): OWNER-only — operasi keuangan (revenue recognition).
  @Post('run/rent-recognition')
  @ApiOperation({ summary: 'Trigger pengakuan pendapatan sewa — OWNER-only' })
  @Roles(UserRole.OWNER)
  async runRentRecognition(@CurrentUser() user: CurrentUserPayload) {
    return { message: 'AutoOps pengakuan pendapatan sewa berhasil dijalankan', data: await this.autoOpsService.runRentRecognition({ actorUserId: user.id, source: 'MANUAL_RENT_RECOGNITION_RUN' }) };
  }

  // F4-15: trigger manual jadwal cuci AC (UAT/ops).
  @Post('run/ac-cleaning')
  @ApiOperation({ summary: 'Trigger jadwal cuci AC — OWNER/ADMIN' })
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async runAcCleaning(@CurrentUser() user: CurrentUserPayload) {
    return { message: 'AutoOps jadwal cuci AC berhasil dijalankan', data: await this.autoOpsService.runAcCleaningSchedule({ actorUserId: user.id, source: 'MANUAL_AC_CLEANING_RUN' }) };
  }

  // F4-13: trigger manual pemberian poin referral (UAT/ops).
  @Post('run/referral-rewards')
  @ApiOperation({ summary: 'Trigger reward referral — OWNER/ADMIN' })
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async runReferralRewards(@CurrentUser() user: CurrentUserPayload) {
    return { message: 'AutoOps reward referral berhasil dijalankan', data: await this.autoOpsService.runReferralRewards({ actorUserId: user.id, source: 'MANUAL_REFERRAL_REWARDS_RUN' }) };
  }
}
