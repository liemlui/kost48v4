import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/app.enums';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import { Public } from '../../common/decorators/public.decorator';
import { UpdateOperationalSettingDto } from './dto/operational-setting.dto';
import { SettingsService } from './settings.service';

@ApiTags('settings')
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  /** Endpoint publik: hanya field yang relevan untuk halaman marketing (tanpa auth). */
  @Get('public-config')
  @Public()
  async getPublicConfig() {
    const s = await this.settingsService.getOperational();
    return {
      data: {
        freeElectricityKwhPerMonth: s.freeElectricityKwhPerMonth,
        electricityTariffPerKwhRupiah: s.electricityTariffPerKwhRupiah,
        waterMeteringEnabled: s.waterMeteringEnabled,
        wifiRupiah: s.wifiRupiah,
        galonRupiah: s.galonRupiah,
        petDepositRupiah: s.petDepositRupiah,
        extraOccupantFeePercent: s.extraOccupantFeePercent,
        tenantLoyaltyEnabled: s.tenantLoyaltyEnabled,
      },
    };
  }

  /** Semua peran terautentikasi boleh BACA konstanta (tarif/jatah/toggle = info publik
   *  internal, dipakai mis. modal catat meter mandiri tenant). PUT tetap owner-only. */
  @Get('operational')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.STAFF, UserRole.TENANT)
  async getOperational() {
    return { message: 'Konstanta operasional', data: await this.settingsService.getOperational() };
  }

  /** Hanya OWNER yang boleh UBAH (tarif/kuota/toggle air = dasar keuangan). */
  @Put('operational')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER)
  async updateOperational(@Body() dto: UpdateOperationalSettingDto, @CurrentUser() user: CurrentUserPayload) {
    return { message: 'Konstanta operasional diperbarui', data: await this.settingsService.updateOperational(dto, user?.id) };
  }
}
