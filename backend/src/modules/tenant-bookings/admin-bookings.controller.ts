import { Body, Controller, Param, ParseIntPipe, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/app.enums';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import { ApproveBookingDto } from './dto/approve-booking.dto';
import { TenantBookingsService } from './tenant-bookings.service';

@ApiTags('admin-bookings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.OWNER, UserRole.ADMIN)
@Controller('admin/bookings')
export class AdminBookingsController {
  constructor(private readonly tenantBookingsService: TenantBookingsService) {}

  @Patch(':stayId/approve')
  async approve(
    @Param('stayId', ParseIntPipe) stayId: number,
    @Body() dto: ApproveBookingDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return {
      message: 'Booking tenant berhasil disetujui',
      data: await this.tenantBookingsService.approveBooking(stayId, dto, user),
    };
  }
}
