import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
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
}
