import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PublicRoomsQueryDto } from './dto/public-rooms-query.dto';
import { TenantBookingsService } from './tenant-bookings.service';

@ApiTags('public-rooms')
@Controller('public/rooms')
export class PublicRoomsController {
  constructor(private readonly tenantBookingsService: TenantBookingsService) {}

  @Get()
  async findAll(@Query() query: PublicRoomsQueryDto) {
    return {
      message: 'Daftar kamar publik berhasil diambil',
      data: await this.tenantBookingsService.getPublicRooms(query),
    };
  }
}
