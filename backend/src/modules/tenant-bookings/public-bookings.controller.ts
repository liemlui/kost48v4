import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CreatePublicBookingDto } from './dto/create-public-booking.dto';
import { TenantBookingsService } from './tenant-bookings.service';

@ApiTags('public-bookings')
@Controller('public/bookings')
export class PublicBookingsController {
  constructor(private readonly tenantBookingsService: TenantBookingsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreatePublicBookingDto) {
    return {
      message: 'Booking berhasil dibuat',
      data: await this.tenantBookingsService.createPublicBooking(dto),
    };
  }
}