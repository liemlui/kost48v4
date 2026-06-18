import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { AvailabilityCalendarQueryDto } from './dto/availability-calendar-query.dto';
import { PublicRoomsQueryDto } from './dto/public-rooms-query.dto';
import { MarketingPublicRoomsService } from './marketing-public-rooms.service';

@ApiTags('marketing-public-rooms')
@Public()
@Controller('public/rooms')
export class MarketingPublicRoomsController {
  constructor(private readonly publicRoomsService: MarketingPublicRoomsService) {}

  @Get()
  async findAll(@Query() query: PublicRoomsQueryDto) {
    return {
      message: 'Daftar kamar publik berhasil diambil',
      data: await this.publicRoomsService.getPublicRooms(query),
    };
  }

  @Get('social-proof')
  async socialProof() {
    return {
      message: 'Social proof publik berhasil diambil',
      data: await this.publicRoomsService.getPublicSocialProof(),
    };
  }

  @Get('availability-calendar')
  async availabilityCalendar(@Query() query: AvailabilityCalendarQueryDto) {
    return {
      message: 'Kalender ketersediaan berhasil diambil',
      data: await this.publicRoomsService.getAvailabilityCalendar(query),
    };
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return {
      message: 'Detail kamar publik berhasil diambil',
      data: await this.publicRoomsService.getPublicRoomDetail(id),
    };
  }
}
