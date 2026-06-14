import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import { LoyaltyService } from './loyalty.service';

@ApiTags('Me - Loyalty')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('me/loyalty')
export class LoyaltyController {
  constructor(private readonly loyalty: LoyaltyService) {}

  @Get()
  async mine(@CurrentUser() user: CurrentUserPayload) {
    if (!user.tenantId) {
      return { message: 'Loyalitas', data: { balance: 0, items: [] } };
    }
    return { message: 'Loyalitas', data: await this.loyalty.history(user.tenantId) };
  }
}
