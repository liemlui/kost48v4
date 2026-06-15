import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/app.enums';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import { UpdateOperationalSettingDto } from './dto/operational-setting.dto';
import { SettingsService } from './settings.service';

@ApiTags('settings')
@Controller('settings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  /** Owner & Admin boleh BACA konstanta operasional. */
  @Get('operational')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async getOperational() {
    return { message: 'Konstanta operasional', data: await this.settingsService.getOperational() };
  }

  /** Hanya OWNER yang boleh UBAH (tarif/kuota/toggle air = dasar keuangan). */
  @Put('operational')
  @Roles(UserRole.OWNER)
  async updateOperational(@Body() dto: UpdateOperationalSettingDto, @CurrentUser() user: CurrentUserPayload) {
    return { message: 'Konstanta operasional diperbarui', data: await this.settingsService.updateOperational(dto, user?.id) };
  }
}
