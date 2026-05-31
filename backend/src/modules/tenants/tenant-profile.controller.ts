import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/app.enums';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import { TenantProfileOnboardingDto } from './dto/tenant-profile-onboarding.dto';
import { TenantsService } from './tenants.service';

@ApiTags('tenant-profile')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('tenant')
export class TenantProfileController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Get('profile')
  @Roles(UserRole.TENANT)
  async getMyProfile(@CurrentUser() actor: CurrentUserPayload) {
    return {
      message: 'Profil penghuni berhasil diambil',
      data: await this.tenantsService.getTenantProfile(actor),
    };
  }

  @Patch('profile/onboarding')
  @Roles(UserRole.TENANT)
  async onboardingFill(
    @Body() dto: TenantProfileOnboardingDto,
    @CurrentUser() actor: CurrentUserPayload,
  ) {
    return {
      message: 'Data profil berhasil disimpan',
      data: await this.tenantsService.fillTenantProfileOnboarding(dto, actor),
    };
  }
}
