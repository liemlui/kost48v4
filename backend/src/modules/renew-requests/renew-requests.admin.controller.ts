import { Body, Controller, Get, Param, ParseIntPipe, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole, RenewRequestStatus } from '../../common/enums/app.enums';
import { buildMeta } from '../../common/utils/pagination';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import { ApproveRenewRequestDto } from './dto/approve-renew-request.dto';
import { RejectRenewRequestDto } from './dto/reject-renew-request.dto';
import { RenewRequestsService } from './renew-requests.service';

@ApiTags('admin/renew-requests')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.OWNER, UserRole.ADMIN)
@Controller('admin/renew-requests')
export class RenewRequestsAdminController {
  constructor(private readonly renewRequestsService: RenewRequestsService) {}

  @Get()
  @ApiQuery({ name: 'status', enum: RenewRequestStatus, required: false })
  async findAll(@Query('status') status?: RenewRequestStatus) {
    const items = await this.renewRequestsService.findAll(status);
    return {
      message: 'Daftar permintaan perpanjangan berhasil diambil',
      data: {
        items,
        meta: buildMeta(1, Math.max(items.length, 1), items.length),
      },
    };
  }

  @Post(':id/approve')
  async approve(@Param('id', ParseIntPipe) id: number, @Body() dto: ApproveRenewRequestDto, @CurrentUser() user: CurrentUserPayload) {
    return {
      message: 'Permintaan perpanjangan disetujui, meter dicatat, dan tagihan perpanjangan diterbitkan',
      data: await this.renewRequestsService.approveRequest(id, dto, user),
    };
  }

  @Post(':id/reject')
  async reject(@Param('id', ParseIntPipe) id: number, @Body() dto: RejectRenewRequestDto, @CurrentUser() user: CurrentUserPayload) {
    return {
      message: 'Permintaan perpanjangan ditolak',
      data: await this.renewRequestsService.rejectRequest(id, dto, user),
    };
  }
}