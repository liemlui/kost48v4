import { BadRequestException, Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
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
  @ApiOperation({ summary: 'Daftar kamar publik — tanpa auth' })
  async findAll(@Query() query: PublicRoomsQueryDto) {
    return {
      message: 'Daftar kamar publik berhasil diambil',
      data: await this.publicRoomsService.getPublicRooms(query),
    };
  }

  @Get('social-proof')
  @ApiOperation({ summary: 'Social proof publik — tanpa auth' })
  async socialProof() {
    return {
      message: 'Social proof publik berhasil diambil',
      data: await this.publicRoomsService.getPublicSocialProof(),
    };
  }

  @Get('summary')
  @ApiOperation({ summary: 'Ringkasan kamar publik — tanpa auth' })
  async summary() {
    return {
      message: 'Ringkasan kamar publik berhasil diambil',
      data: await this.publicRoomsService.getPublicRoomSummary(),
    };
  }

  @Get('availability-calendar')
  @ApiOperation({ summary: 'Kalender ketersediaan — tanpa auth' })
  async availabilityCalendar(@Query() query: AvailabilityCalendarQueryDto) {
    return {
      message: 'Kalender ketersediaan berhasil diambil',
      data: await this.publicRoomsService.getAvailabilityCalendar(query),
    };
  }

  @Get('cleanliness-ranking')
  @ApiOperation({ summary: 'Ranking kebersihan kamar — tanpa auth' })
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
  @ApiOperation({ summary: 'Detail kamar publik — tanpa auth' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return {
      message: 'Detail kamar publik berhasil diambil',
      data: await this.publicRoomsService.getPublicRoomDetail(id),
    };
  }
}
