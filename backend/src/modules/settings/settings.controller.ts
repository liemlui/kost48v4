import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
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
  @ApiOperation({ summary: 'Konfigurasi publik untuk halaman marketing — tanpa auth' })
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
        adminWhatsappNumber: s.adminWhatsappNumber,  // D-25
      },
    };
  }

  /** OWNER/ADMIN/STAFF boleh BACA konstanta operasional (tarif/jatah/toggle).
   *  TENANT tidak perlu config penuh — pakai /settings/public-config (@Public).
   *  PUT tetap owner-only. */
  @Get('operational')
  @ApiOperation({ summary: 'Konstanta operasional — OWNER/ADMIN/STAFF' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.STAFF)
  async getOperational(@CurrentUser() user: CurrentUserPayload) {
    // API key DeepSeek TIDAK pernah ikut respons — hanya status + preview (preview khusus OWNER).
    return { message: 'Konstanta operasional', data: await this.settingsService.getOperationalView(user?.role) };
  }

  /** Hanya OWNER yang boleh UBAH (tarif/kuota/toggle air = dasar keuangan). */
  @Put('operational')
  @ApiOperation({ summary: 'Update konstanta operasional — OWNER-only' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER)
  async updateOperational(@Body() dto: UpdateOperationalSettingDto, @CurrentUser() user: CurrentUserPayload) {
    return { message: 'Konstanta operasional diperbarui', data: await this.settingsService.updateOperational(dto, user?.id) };
  }
}
