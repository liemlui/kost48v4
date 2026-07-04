import { Body, Controller, Get, Param, ParseIntPipe, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole, RenewRequestStatus } from '../../common/enums/app.enums';
import { buildMeta } from '../../common/utils/pagination';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import { ApproveRenewRequestDto } from './dto/approve-renew-request.dto';
import { RejectRenewRequestDto } from './dto/reject-renew-request.dto';
import { ConfirmDownPaymentDto } from './dto/confirm-down-payment.dto';
import { RenewRequestsService } from './renew-requests.service';

@ApiTags('admin/renew-requests')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.OWNER, UserRole.ADMIN)
@Controller('admin/renew-requests')
export class RenewRequestsAdminController {
  constructor(private readonly renewRequestsService: RenewRequestsService) {}

  @Get()
  @ApiOperation({ summary: 'Daftar permintaan perpanjangan — OWNER/ADMIN' })
  @ApiQuery({ name: 'status', enum: RenewRequestStatus, required: false })
  async findAll(@Query('status') status?: RenewRequestStatus, @Query('page') page?: string, @Query('limit') limit?: string) {
    const parsedPage = Number(page ?? 1);
    const parsedLimit = Number(limit ?? 20);
    const result = await this.renewRequestsService.findAll(status, parsedPage, parsedLimit);
    return {
      message: 'Daftar permintaan perpanjangan berhasil diambil',
      data: {
        items: result.items,
        meta: buildMeta(result.meta.page, result.meta.limit, result.meta.totalItems),
      },
    };
  }

  @Post(':id/confirm-dp')
  @ApiOperation({ summary: 'Konfirmasi DP perpanjangan — OWNER/ADMIN' })
  async confirmDp(@Param('id', ParseIntPipe) id: number, @Body() dto: ConfirmDownPaymentDto, @CurrentUser() user: CurrentUserPayload) {
    return {
      message: 'DP perpanjangan dikonfirmasi; kamar aman untuk tenant lama, pelunasan maksimal H+7',
      data: await this.renewRequestsService.confirmDownPayment(id, dto, user),
    };
  }

  @Post(':id/approve')
  @ApiOperation({ summary: 'Setujui permintaan perpanjangan — OWNER/ADMIN' })
  async approve(@Param('id', ParseIntPipe) id: number, @Body() dto: ApproveRenewRequestDto, @CurrentUser() user: CurrentUserPayload) {
    return {
      message: 'Tahap perpanjangan berhasil diproses',
      data: await this.renewRequestsService.approveRequest(id, dto, user),
    };
  }

  @Post(':id/reject')
  @ApiOperation({ summary: 'Tolak permintaan perpanjangan — OWNER/ADMIN' })
  async reject(@Param('id', ParseIntPipe) id: number, @Body() dto: RejectRenewRequestDto, @CurrentUser() user: CurrentUserPayload) {
    return {
      message: 'Permintaan perpanjangan ditolak',
      data: await this.renewRequestsService.rejectRequest(id, dto, user),
    };
  }
}
