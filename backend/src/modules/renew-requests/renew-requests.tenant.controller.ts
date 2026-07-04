import { Body, Controller, Get, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/app.enums';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import { CreateRenewRequestDto } from './dto/create-renew-request.dto';
import { DecideRenewRequestDto } from './dto/decide-renew-request.dto';
import { RenewRequestsService } from './renew-requests.service';

@ApiTags('tenant/renew-requests')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.TENANT)
@Controller('tenant/renew-requests')
export class RenewRequestsTenantController {
  constructor(private readonly renewRequestsService: RenewRequestsService) {}

  @Post()
  @ApiOperation({ summary: 'Ajukan permintaan perpanjangan — TENANT' })
  async create(@Body() dto: CreateRenewRequestDto, @CurrentUser() user: CurrentUserPayload) {
    return {
      message: 'Permintaan perpanjangan berhasil diajukan',
      data: await this.renewRequestsService.createRequest(dto, user),
    };
  }

  @Post(':id/decide')
  @ApiOperation({ summary: 'Putuskan perpanjang/tidak — TENANT' })
  async decide(@Param('id', ParseIntPipe) id: number, @Body() dto: DecideRenewRequestDto, @CurrentUser() user: CurrentUserPayload) {
    return {
      message: dto.decision === 'YA' ? 'Perpanjangan dipilih: silakan transfer DP 30% (prioritas s/d hari-H)' : 'Anda memilih tidak memperpanjang; kamar akan dibuka',
      data: await this.renewRequestsService.decideByTenant(id, dto, user),
    };
  }

  @Get('my')
  @ApiOperation({ summary: 'Daftar permintaan perpanjangan saya — TENANT' })
  async findMine(@CurrentUser() user: CurrentUserPayload) {
    return {
      message: 'Daftar permintaan perpanjangan berhasil diambil',
      data: await this.renewRequestsService.findMine(user),
    };
  }
}