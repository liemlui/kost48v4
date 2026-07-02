import { BadRequestException, Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { AvailabilityCalendarQueryDto } from './dto/availability-calendar-query.dto';
import { PublicRoomsQueryDto } from './dto/public-rooms-query.dto';
import { MarketingPublicRoomsService } from './marketing-public-rooms.service';

function parseOptionalInt(value: string | undefined, label: string): number | undefined {
  if (value === undefined || value === '') return undefined;
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) throw new BadRequestException(`${label} harus angka bulat`);
  return parsed;
}

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

  @Get('summary')
  async summary() {
    return {
      message: 'Ringkasan kamar publik berhasil diambil',
      data: await this.publicRoomsService.getPublicRoomSummary(),
    };
  }

  @Get('availability-calendar')
  async availabilityCalendar(@Query() query: AvailabilityCalendarQueryDto) {
    return {
      message: 'Kalender ketersediaan berhasil diambil',
      data: await this.publicRoomsService.getAvailabilityCalendar(query),
    };
  }

  @Get('cleanliness-ranking')
  async cleanlinessRanking(@Query('month') month?: string, @Query('year') year?: string) {
    const parsedMonth = parseOptionalInt(month, 'month');
    const parsedYear = parseOptionalInt(year, 'year');
    if (parsedMonth !== undefined && (parsedMonth < 1 || parsedMonth > 12)) {
      throw new BadRequestException('month harus antara 1 sampai 12');
    }
    if (parsedYear !== undefined && (parsedYear < 2000 || parsedYear > 2100)) {
      throw new BadRequestException('year harus antara 2000 sampai 2100');
    }
    return {
      message: 'Ranking kebersihan berhasil diambil',
      data: await this.publicRoomsService.getCleanlinessRanking(parsedMonth, parsedYear),
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
