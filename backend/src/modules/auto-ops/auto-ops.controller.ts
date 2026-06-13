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
}
