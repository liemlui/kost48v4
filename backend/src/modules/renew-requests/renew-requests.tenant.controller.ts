import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/app.enums';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import { CreateRenewRequestDto } from './dto/create-renew-request.dto';
import { RenewRequestsService } from './renew-requests.service';

@ApiTags('tenant/renew-requests')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.TENANT)
@Controller('tenant/renew-requests')
export class RenewRequestsTenantController {
  constructor(private readonly renewRequestsService: RenewRequestsService) {}

  @Post()
  async create(@Body() dto: CreateRenewRequestDto, @CurrentUser() user: CurrentUserPayload) {
    return {
      message: 'Permintaan perpanjangan berhasil diajukan',
      data: await this.renewRequestsService.createRequest(dto, user),
    };
  }

  @Get('my')
  async findMine(@CurrentUser() user: CurrentUserPayload) {
    return {
      message: 'Daftar permintaan perpanjangan berhasil diambil',
      data: await this.renewRequestsService.findMine(user),
    };
  }
}