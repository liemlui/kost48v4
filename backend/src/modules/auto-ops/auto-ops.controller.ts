import { Controller, ForbiddenException, Get, Headers, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/app.enums';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import { AutoOpsService } from './auto-ops.service';

@ApiTags('auto-ops')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('auto-ops')
export class AutoOpsController {
  constructor(private readonly autoOpsService: AutoOpsService) {}

  @Get('status')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async status() {
    return { message: 'Status AutoOps berhasil diambil', data: await this.autoOpsService.status() };
  }

  /**
   * Trigger cron eksternal (cPanel Cron Jobs). Di shared hosting/Passenger proses Node
   * di-idle saat sepi → setInterval in-process tak andal; cPanel cron memanggil URL ini
   * tiap N menit (sekaligus membangunkan app). Tanpa JWT — diproteksi token rahasia
   * (env AUTO_OPS_CRON_TOKEN) via header `X-Cron-Token` ATAU query `?token=`.
   * Contoh cPanel: curl -fsS -H "X-Cron-Token: RAHASIA" https://domain/api/auto-ops/cron
   */
  @Public()
  @Get('cron')
  async cron(@Headers('x-cron-token') headerToken?: string, @Query('token') queryToken?: string) {
    const expected = (process.env.AUTO_OPS_CRON_TOKEN ?? '').trim();
    const provided = (headerToken ?? queryToken ?? '').trim();
    if (!expected || provided !== expected) {
      throw new ForbiddenException('Token cron auto-ops tidak valid');
    }
    return { message: 'AutoOps cron berhasil dijalankan', data: await this.autoOpsService.runAll({ actorUserId: null, source: 'CRON_AUTO_OPS' }) };
  }

  @Post('run')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async run(@CurrentUser() user: CurrentUserPayload) {
    return { message: 'AutoOps berhasil dijalankan', data: await this.autoOpsService.runAll({ actorUserId: user.id, source: 'MANUAL_AUTO_OPS_RUN' }) };
  }

  @Post('run/booking-expiry')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async runBookingExpiry(@CurrentUser() user: CurrentUserPayload) {
    return { message: 'AutoOps booking expiry berhasil dijalankan', data: await this.autoOpsService.runBookingExpiry({ actorUserId: user.id, source: 'MANUAL_BOOKING_EXPIRY_RUN' }) };
  }

  @Post('run/room-healer')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async runRoomHealer(@CurrentUser() user: CurrentUserPayload) {
    return { message: 'AutoOps room healer berhasil dijalankan', data: await this.autoOpsService.runRoomHealer({ actorUserId: user.id, source: 'MANUAL_ROOM_HEALER_RUN' }) };
  }

  @Post('run/recurring-expenses')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async runRecurringExpenses(@CurrentUser() user: CurrentUserPayload) {
    return {
      message: 'AutoOps draft expense rutin berhasil dijalankan',
      data: await this.autoOpsService.runRecurringExpenseDrafts({
        actorUserId: user.id,
        source: 'MANUAL_RECURRING_EXPENSE_DRAFTS_RUN',
      }),
    };
  }

  @Post('run/depreciation')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
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
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async runRenewalExpiry(@CurrentUser() user: CurrentUserPayload) {
    return { message: 'AutoOps renewal expiry berhasil dijalankan', data: await this.autoOpsService.runRenewalPriorityExpiry({ actorUserId: user.id, source: 'MANUAL_RENEWAL_EXPIRY_RUN' }) };
  }

  @Post('run/renewal-forfeit')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async runRenewalForfeit(@CurrentUser() user: CurrentUserPayload) {
    return { message: 'AutoOps renewal forfeit berhasil dijalankan', data: await this.autoOpsService.runRenewalSettlementForfeit({ actorUserId: user.id, source: 'MANUAL_RENEWAL_FORFEIT_RUN' }) };
  }

  // F2-1 #3: trigger manual pengingat akhir kontrak / prompt renewal H-10..H-day (UAT/ops).
  @Post('run/contract-reminders')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async runContractReminders(@CurrentUser() user: CurrentUserPayload) {
    return { message: 'AutoOps contract-end reminders berhasil dijalankan', data: await this.autoOpsService.runContractEndReminders({ actorUserId: user.id, source: 'MANUAL_CONTRACT_REMINDERS_RUN' }) };
  }

  // F3-19: trigger manual eskalasi SLA tiket (UAT/ops).
  @Post('run/ticket-sla')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async runTicketSla(@CurrentUser() user: CurrentUserPayload) {
    return { message: 'AutoOps eskalasi SLA tiket berhasil dijalankan', data: await this.autoOpsService.runTicketSlaEscalation({ actorUserId: user.id, source: 'MANUAL_TICKET_SLA_RUN' }) };
  }

  // F3-15: trigger manual penandaan barang abandoned 30 hari (UAT/ops).
  @Post('run/belongings-abandonment')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async runBelongingsAbandonment(@CurrentUser() user: CurrentUserPayload) {
    return { message: 'AutoOps penandaan barang abandoned berhasil dijalankan', data: await this.autoOpsService.runBelongingsAbandonment({ actorUserId: user.id, source: 'MANUAL_BELONGINGS_ABANDONMENT_RUN' }) };
  }

  // F5-6 (L-1): trigger manual rekonsiliasi jurnal warisan (backfill + alert owner).
  @Post('run/journal-reconciliation')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async runJournalReconciliation(@CurrentUser() user: CurrentUserPayload) {
    return { message: 'AutoOps rekonsiliasi jurnal berhasil dijalankan', data: await this.autoOpsService.runAutoJournalReconciliation({ actorUserId: user.id, source: 'MANUAL_JOURNAL_RECONCILIATION_RUN' }) };
  }

  // F4-7: trigger manual pruning notifikasi >90 hari (UAT/ops).
  @Post('run/notification-pruning')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async runNotificationPruning(@CurrentUser() user: CurrentUserPayload) {
    return { message: 'AutoOps pruning notifikasi berhasil dijalankan', data: await this.autoOpsService.runNotificationPruning({ actorUserId: user.id, source: 'MANUAL_NOTIFICATION_PRUNING_RUN' }) };
  }

  // F4-2: trigger manual dispatch Web Push notifikasi PENDING (UAT/ops).
  @Post('run/push-dispatch')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async runPushDispatch(@CurrentUser() user: CurrentUserPayload) {
    return { message: 'AutoOps dispatch push berhasil dijalankan', data: await this.autoOpsService.runPushDispatch({ actorUserId: user.id, source: 'MANUAL_PUSH_DISPATCH_RUN' }) };
  }

  // F4-1: trigger manual pengakuan pendapatan sewa (unearned) (UAT/ops).
  @Post('run/rent-recognition')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async runRentRecognition(@CurrentUser() user: CurrentUserPayload) {
    return { message: 'AutoOps pengakuan pendapatan sewa berhasil dijalankan', data: await this.autoOpsService.runRentRecognition({ actorUserId: user.id, source: 'MANUAL_RENT_RECOGNITION_RUN' }) };
  }

  // F4-15: trigger manual jadwal cuci AC (UAT/ops).
  @Post('run/ac-cleaning')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async runAcCleaning(@CurrentUser() user: CurrentUserPayload) {
    return { message: 'AutoOps jadwal cuci AC berhasil dijalankan', data: await this.autoOpsService.runAcCleaningSchedule({ actorUserId: user.id, source: 'MANUAL_AC_CLEANING_RUN' }) };
  }

  // F4-13: trigger manual pemberian poin referral (UAT/ops).
  @Post('run/referral-rewards')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async runReferralRewards(@CurrentUser() user: CurrentUserPayload) {
    return { message: 'AutoOps reward referral berhasil dijalankan', data: await this.autoOpsService.runReferralRewards({ actorUserId: user.id, source: 'MANUAL_REFERRAL_REWARDS_RUN' }) };
  }
}
