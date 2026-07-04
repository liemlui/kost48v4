import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/app.enums';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import { LoyaltyService } from './loyalty.service';
import { RedemptionService } from './redemption.service';
import { ReferralService } from './referral.service';
import { RequestRedemptionDto } from './dto/loyalty.dto';

@ApiTags('Me - Loyalty')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('me/loyalty')
export class LoyaltyController {
  constructor(
    private readonly loyalty: LoyaltyService,
    private readonly redemption: RedemptionService,
    private readonly referral: ReferralService,
  ) {}

  @Get('referral-code')
  @ApiOperation({ summary: 'Kode referral saya — TENANT' })
  async referralCode(@CurrentUser() user: CurrentUserPayload) {
    if (!user.tenantId) return { message: 'Kode referral', data: { code: null } };
    return { message: 'Kode referral', data: await this.referral.getOrCreateCode(user.tenantId) };
  }

  @Get()
  @ApiOperation({ summary: 'Riwayat loyalitas saya — TENANT' })
  async mine(@CurrentUser() user: CurrentUserPayload) {
    if (!user.tenantId) {
      return { message: 'Loyalitas', data: { balance: 0, items: [] } };
    }
    return { message: 'Loyalitas', data: await this.loyalty.history(user.tenantId) };
  }

  @Get('leaderboard')
  @ApiOperation({ summary: 'Papan poin anonim per kamar' })
  async leaderboard() {
    return { message: 'Papan poin anonim per kamar', data: await this.loyalty.leaderboardByRoom(3) };
  }

  @Get('redemptions')
  @ApiOperation({ summary: 'Penukaran reward saya — TENANT' })
  async myRedemptions(@CurrentUser() user: CurrentUserPayload) {
    if (!user.tenantId) return { message: 'Penukaran', data: [] };
    return { message: 'Penukaran', data: await this.redemption.myRedemptions(user.tenantId) };
  }

  @Post('redemptions')
  @ApiOperation({ summary: 'Ajukan penukaran reward — TENANT' })
  async request(@CurrentUser() user: CurrentUserPayload, @Body() dto: RequestRedemptionDto) {
    const tenantId = this.redemption.assertTenant(user.tenantId);
    return { message: 'Penukaran diajukan', data: await this.redemption.requestRedemption(tenantId, dto.rewardId) };
  }
}
