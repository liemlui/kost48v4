import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import { LoyaltyService } from './loyalty.service';
import { RedemptionService } from './redemption.service';
import { ReferralService } from './referral.service';
import { RequestRedemptionDto } from './dto/loyalty.dto';

@ApiTags('Me - Loyalty')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('me/loyalty')
export class LoyaltyController {
  constructor(
    private readonly loyalty: LoyaltyService,
    private readonly redemption: RedemptionService,
    private readonly referral: ReferralService,
  ) {}

  @Get('referral-code')
  async referralCode(@CurrentUser() user: CurrentUserPayload) {
    if (!user.tenantId) return { message: 'Kode referral', data: { code: null } };
    return { message: 'Kode referral', data: await this.referral.getOrCreateCode(user.tenantId) };
  }

  @Get()
  async mine(@CurrentUser() user: CurrentUserPayload) {
    if (!user.tenantId) {
      return { message: 'Loyalitas', data: { balance: 0, items: [] } };
    }
    return { message: 'Loyalitas', data: await this.loyalty.history(user.tenantId) };
  }

  @Get('leaderboard')
  async leaderboard() {
    return { message: 'Papan poin anonim per kamar', data: await this.loyalty.leaderboardByRoom(3) };
  }

  @Get('redemptions')
  async myRedemptions(@CurrentUser() user: CurrentUserPayload) {
    if (!user.tenantId) return { message: 'Penukaran', data: [] };
    return { message: 'Penukaran', data: await this.redemption.myRedemptions(user.tenantId) };
  }

  @Post('redemptions')
  async request(@CurrentUser() user: CurrentUserPayload, @Body() dto: RequestRedemptionDto) {
    const tenantId = this.redemption.assertTenant(user.tenantId);
    return { message: 'Penukaran diajukan', data: await this.redemption.requestRedemption(tenantId, dto.rewardId) };
  }
}
