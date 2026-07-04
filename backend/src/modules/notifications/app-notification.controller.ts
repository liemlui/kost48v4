import { Controller, Get, Param, ParseIntPipe, Patch, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import { AppNotificationService } from './app-notification.service';
import { NotificationQueryDto } from './dto/notification.dto';

@ApiTags('Me - Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('me/notifications')
export class AppNotificationController {
  constructor(private readonly appNotificationService: AppNotificationService) {}

  @Get()
  @ApiOperation({ summary: 'Daftar notifikasi saya' })
  async listMine(@CurrentUser() user: CurrentUserPayload, @Query() query: NotificationQueryDto) {
    const result = await this.appNotificationService.listMine(user.id, query);
    return {
      message: 'Notifikasi berhasil diambil',
      data: result,
    };
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Tandai semua notifikasi sudah dibaca' })
  async markAllRead(@CurrentUser() user: CurrentUserPayload) {
    const result = await this.appNotificationService.markAllMineAsRead(user.id);
    return {
      message: 'Semua notifikasi ditandai sudah dibaca',
      data: result,
    };
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Tandai satu notifikasi sudah dibaca' })
  async markRead(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const result = await this.appNotificationService.markMineAsRead(user.id, id);
    return {
      message: 'Notifikasi ditandai sudah dibaca',
      data: result,
    };
  }
}
