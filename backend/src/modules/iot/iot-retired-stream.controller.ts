import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';

/**
 * One-release compatibility endpoint for PWA tabs that still contain the old
 * EventSource client. HTTP 204 tells EventSource to stop reconnecting without
 * opening a long-lived response or exposing any telemetry.
 */
@Controller('iot/stream')
export class IotRetiredStreamController {
  @Public()
  @Get('tenant/raw')
  @HttpCode(HttpStatus.NO_CONTENT)
  retiredTenantStream(): void {}
}
