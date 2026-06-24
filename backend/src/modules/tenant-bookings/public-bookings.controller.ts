import { Body, Controller, HttpCode, HttpStatus, Post, Req, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { RateLimitGuard } from '../../common/guards/rate-limit.guard';
import { RateLimit } from '../../common/decorators/rate-limit.decorator';
import { CreatePublicBookingDto } from './dto/create-public-booking.dto';
import { CreatePublicSurveyDto } from './dto/create-public-survey.dto';
import { PublicBookingsService } from './public-bookings.service';
import type { Request } from 'express';

@ApiTags('public-bookings')
@Controller('public/bookings')
export class PublicBookingsController {
  constructor(private readonly publicBookingsService: PublicBookingsService) {}

  @Post()
  @Public()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(RateLimitGuard)
  @RateLimit('publicBooking')
  async create(@Body() dto: CreatePublicBookingDto) {
    return {
      message: 'Booking berhasil dibuat',
      data: await this.publicBookingsService.createPublicBooking(dto),
    };
  }

  @Post('survey')
  @Public()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(RateLimitGuard)
  @RateLimit('publicBooking')
  async saveSurvey(@Body() dto: CreatePublicSurveyDto, @Req() req: Request) {
    const userAgent = String(req.headers['user-agent'] ?? '').slice(0, 500);
    const referrer  = String(req.headers['referer'] ?? '').slice(0, 500);
    return {
      message: 'Preferensi tersimpan',
      data: await this.publicBookingsService.saveGuestSurvey(dto, userAgent, referrer),
    };
  }
}
