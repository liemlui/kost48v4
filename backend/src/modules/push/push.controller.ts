import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import { PushService } from './push.service';
import { SubscribePushDto, UnsubscribePushDto } from './dto/push-subscription.dto';

@ApiTags('Me - Push')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('push')
export class PushController {
  constructor(private readonly pushService: PushService) {}

  @Get('vapid-public-key')
  @ApiOperation({ summary: 'Ambil VAPID public key untuk push notification' })
  vapidPublicKey() {
    return {
      message: 'VAPID public key',
      data: { publicKey: this.pushService.getVapidPublicKey(), enabled: this.pushService.isConfigured() },
    };
  }

  @Post('subscribe')
  @ApiOperation({ summary: 'Langganan push notification' })
  async subscribe(@CurrentUser() user: CurrentUserPayload, @Body() dto: SubscribePushDto) {
    return { message: 'Langganan push tersimpan', data: await this.pushService.subscribe(user.id, dto) };
  }

  @Post('unsubscribe')
  @ApiOperation({ summary: 'Berhenti langganan push notification' })
  async unsubscribe(@CurrentUser() user: CurrentUserPayload, @Body() dto: UnsubscribePushDto) {
    return { message: 'Langganan push dinonaktifkan', data: await this.pushService.unsubscribe(user.id, dto.endpoint) };
  }
}
