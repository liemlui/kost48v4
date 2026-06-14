import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import { PushService } from './push.service';
import { SubscribePushDto, UnsubscribePushDto } from './dto/push-subscription.dto';

@ApiTags('Me - Push')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('push')
export class PushController {
  constructor(private readonly pushService: PushService) {}

  @Get('vapid-public-key')
  vapidPublicKey() {
    return {
      message: 'VAPID public key',
      data: { publicKey: this.pushService.getVapidPublicKey(), enabled: this.pushService.isConfigured() },
    };
  }

  @Post('subscribe')
  async subscribe(@CurrentUser() user: CurrentUserPayload, @Body() dto: SubscribePushDto) {
    return { message: 'Langganan push tersimpan', data: await this.pushService.subscribe(user.id, dto) };
  }

  @Post('unsubscribe')
  async unsubscribe(@CurrentUser() user: CurrentUserPayload, @Body() dto: UnsubscribePushDto) {
    return { message: 'Langganan push dinonaktifkan', data: await this.pushService.unsubscribe(user.id, dto.endpoint) };
  }
}
