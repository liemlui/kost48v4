import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PublicRoomsQueryDto } from './dto/public-rooms-query.dto';
import { PublicRoomsService } from './public-rooms.service';

@ApiTags('public-rooms')
@Controller('public/rooms')
export class PublicRoomsController {
  constructor(private readonly publicRoomsService: PublicRoomsService) {}

  @Get()
  async findAll(@Query() query: PublicRoomsQueryDto) {
    return {
      message: 'Daftar kamar publik berhasil diambil',
      data: await this.publicRoomsService.getPublicRooms(query),
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
