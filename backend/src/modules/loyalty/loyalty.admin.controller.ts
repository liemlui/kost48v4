import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/app.enums';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import { RedemptionService } from './redemption.service';
import { CreateRewardDto, DecideRedemptionDto, UpdateRewardDto } from './dto/loyalty.dto';
import { LOYALTY_POINTS, LOYALTY_POINT_RUPIAH_VALUE } from './loyalty.constants';

@ApiTags('Loyalty')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('loyalty')
export class LoyaltyAdminController {
  constructor(private readonly redemption: RedemptionService) {}

  // Setelan loyalitas (estimasi nilai poin + nilai poin per aktivitas) — semua user auth.
  @Get('config')
  @ApiOperation({ summary: 'Setelan loyalitas (nilai poin) — semua auth' })
  config() {
    return { message: 'Setelan loyalitas', data: { pointRupiahValue: LOYALTY_POINT_RUPIAH_VALUE, pointValues: LOYALTY_POINTS } };
  }

  // Katalog reward dapat dibaca semua user terautentikasi (tenant lihat yang aktif).
  @Get('rewards')
  @ApiOperation({ summary: 'Katalog reward — semua auth' })
  async listRewards(@CurrentUser() user: CurrentUserPayload, @Query('includeInactive') includeInactive?: string) {
    const showAll = user.role === UserRole.OWNER && includeInactive === 'true';
    return { message: 'Katalog reward', data: await this.redemption.listRewards(showAll) };
  }

  @Post('rewards')
  @ApiOperation({ summary: 'Buat reward — OWNER-only' })
  @Roles(UserRole.OWNER)
  async createReward(@Body() dto: CreateRewardDto) {
    return { message: 'Reward dibuat', data: await this.redemption.createReward(dto) };
  }

  @Patch('rewards/:id')
  @ApiOperation({ summary: 'Perbarui reward — OWNER-only' })
  @Roles(UserRole.OWNER)
  async updateReward(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateRewardDto) {
    return { message: 'Reward diperbarui', data: await this.redemption.updateReward(id, dto) };
  }

  @Get('redemptions')
  @ApiOperation({ summary: 'Daftar penukaran reward — OWNER/ADMIN' })
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async listRedemptions(@Query('status') status?: string) {
    return { message: 'Daftar penukaran', data: await this.redemption.listRedemptions(status) };
  }

  @Post('redemptions/:id/decide')
  @ApiOperation({ summary: 'Putuskan penukaran reward — OWNER/ADMIN' })
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async decide(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: DecideRedemptionDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return { message: 'Penukaran diputuskan', data: await this.redemption.decideRedemption(id, dto.decision, user.id, dto.note) };
  }
}
