import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RateLimitGuard } from '../../common/guards/rate-limit.guard';
import { RateLimit } from '../../common/decorators/rate-limit.decorator';
import { CreatePublicBookingDto } from './dto/create-public-booking.dto';
import { PublicBookingsService } from './public-bookings.service';

@ApiTags('public-bookings')
@Controller('public/bookings')
export class PublicBookingsController {
  constructor(private readonly publicBookingsService: PublicBookingsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(RateLimitGuard)
  @RateLimit('publicBooking')
  async create(@Body() dto: CreatePublicBookingDto) {
    return {
      message: 'Booking berhasil dibuat',
      data: await this.publicBookingsService.createPublicBooking(dto),
    };
  }
}
