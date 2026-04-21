import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/app.enums';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import { CreateTenantBookingDto } from './dto/create-tenant-booking.dto';
import { TenantBookingsQueryDto } from './dto/tenant-bookings-query.dto';
import { TenantBookingsService } from './tenant-bookings.service';

@ApiTags('tenant-bookings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.TENANT)
@Controller('tenant/bookings')
export class TenantBookingsController {
  constructor(private readonly tenantBookingsService: TenantBookingsService) {}

  @Post()
  async create(@Body() dto: CreateTenantBookingDto, @CurrentUser() user: CurrentUserPayload) {
    return {
      message: 'Booking kamar berhasil dibuat',
      data: await this.tenantBookingsService.createBooking(dto, user),
    };
  }

  @Get('my')
  async findMine(@CurrentUser() user: CurrentUserPayload, @Query() query: TenantBookingsQueryDto) {
    return {
      message: 'Daftar booking tenant berhasil diambil',
      data: await this.tenantBookingsService.findMine(user, query),
    };
  }
}
