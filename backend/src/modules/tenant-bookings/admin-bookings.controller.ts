import { Body, Controller, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/app.enums';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import { ApproveBookingDto } from './dto/approve-booking.dto';
import { LinkBookingAccountDto } from './dto/link-booking-account.dto';
import { RejectBookingDto } from './dto/reject-booking.dto';
import { TenantBookingsService } from './tenant-bookings.service';

@ApiTags('admin-bookings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.OWNER, UserRole.ADMIN)
@Controller('admin/bookings')
export class AdminBookingsController {
  constructor(private readonly tenantBookingsService: TenantBookingsService) {}

  @Patch(':stayId/approve')
  @ApiOperation({ summary: 'Setujui booking — OWNER/ADMIN' })
  async approve(
    @Param('stayId', ParseIntPipe) stayId: number,
    @Body() dto: ApproveBookingDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return {
      message: 'Booking berhasil disetujui',
      data: await this.tenantBookingsService.approveBooking(stayId, dto, user),
    };
  }

  @Patch(':stayId/reject')
  @ApiOperation({ summary: 'Tolak booking — OWNER/ADMIN' })
  async reject(
    @Param('stayId', ParseIntPipe) stayId: number,
    @Body() dto: RejectBookingDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return {
      message: 'Booking berhasil ditolak',
      data: await this.tenantBookingsService.rejectBooking(stayId, dto, user),
    };
  }

  @Post(':stayId/link-account')
  @ApiOperation({
    summary:
      'S7: kaitkan pengajuan tanpa akun ke akun TENANT yang sudah ada (jalur cadangan bila klaim mandiri gagal) — OWNER/ADMIN',
  })
  async linkAccount(
    @Param('stayId', ParseIntPipe) stayId: number,
    @Body() dto: LinkBookingAccountDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return {
      message: 'Pengajuan berhasil dikaitkan ke akun tenant',
      data: await this.tenantBookingsService.linkBookingAccount(stayId, dto, user),
    };
  }
}
