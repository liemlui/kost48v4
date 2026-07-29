import { Body, Controller, Get, Headers, Put } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { UpdatePublicAvailabilityDto } from './dto/update-public-availability.dto';
import { MarketingPublicRoomsService } from './marketing-public-rooms.service';

@ApiTags('marketing-public-availability')
@Public()
@Controller('public/availability')
export class PublicAvailabilityController {
  constructor(private readonly publicRoomsService: MarketingPublicRoomsService) {}

  @Get('setup')
  @ApiOperation({ summary: 'Data wizard ketersediaan publik — perlu X-Availability-Pin' })
  async getSetup(@Headers('x-availability-pin') ownerPin?: string) {
    return {
      message: 'Pengaturan ketersediaan berhasil dimuat',
      data: await this.publicRoomsService.getPublicAvailabilitySetup(ownerPin),
    };
  }

  @Put('setup')
  @ApiOperation({ summary: 'Simpan ketersediaan publik — perlu X-Availability-Pin' })
  async updateSetup(
    @Headers('x-availability-pin') ownerPin: string | undefined,
    @Body() dto: UpdatePublicAvailabilityDto,
  ) {
    return {
      message: 'Ketersediaan publik berhasil disimpan',
      data: await this.publicRoomsService.updatePublicAvailabilitySetup(ownerPin, dto.rooms),
    };
  }
}
