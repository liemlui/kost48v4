import { BadRequestException, Body, Controller, Headers, Post, RawBodyRequest, Req, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { Public } from '../../common/decorators/public.decorator';
import { RateLimit } from '../../common/decorators/rate-limit.decorator';
import { RateLimitGuard } from '../../common/guards/rate-limit.guard';
import { WaterIngestDto } from './dto/water-ingest.dto';
import { WaterIngestService } from './water-ingest.service';

@ApiTags('iot-device-ingest')
@Controller('iot')
export class WaterIngestController {
  constructor(private readonly ingestService: WaterIngestService) {}

  @Public()
  @UseGuards(RateLimitGuard)
  @RateLimit('iotIngest')
  @Post('v1/readings')
  @ApiOperation({ summary: 'Signed ESP32 water telemetry ingest — tanpa JWT pengguna' })
  async ingest(
    @Req() request: RawBodyRequest<Request>,
    @Headers('x-device-id') deviceCode: string | undefined,
    @Headers('x-timestamp') timestamp: string | undefined,
    @Headers('x-nonce') nonce: string | undefined,
    @Headers('x-signature') signature: string | undefined,
    @Body() payload: WaterIngestDto,
  ) {
    if (!request.rawBody) throw new BadRequestException('Raw request body tidak tersedia untuk verifikasi signature');
    return {
      message: 'Telemetry air diterima',
      data: await this.ingestService.ingest({
        deviceCode: deviceCode ?? '',
        timestamp: timestamp ?? '',
        nonce: nonce ?? '',
        signature: signature ?? '',
      }, request.rawBody, payload),
    };
  }
}
