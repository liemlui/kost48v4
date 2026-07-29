import { timingSafeEqual } from 'node:crypto';
import { Body, Controller, DefaultValuePipe, ForbiddenException, Get, Headers, HttpCode, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/app.enums';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import { Public } from '../../common/decorators/public.decorator';
import { RateLimit } from '../../common/decorators/rate-limit.decorator';
import { RateLimitGuard } from '../../common/guards/rate-limit.guard';
import { CreateIotDeviceDto, IotDeviceQueryDto, IotTelemetryQueryDto, TuyaProbeDto, UpdateIotDeviceDto } from './dto/iot-device.dto';
import { IotService } from './iot.service';
import { IotPollingService } from './iot-polling.service';

function tokensMatch(expected: string, provided: string): boolean {
  if (!expected || !provided) return false;
  const expectedBytes = Buffer.from(expected);
  const providedBytes = Buffer.from(provided);
  return expectedBytes.length === providedBytes.length && timingSafeEqual(expectedBytes, providedBytes);
}

@ApiTags('iot')
@ApiBearerAuth()
@Controller('iot')
@Roles(UserRole.OWNER, UserRole.ADMIN)
export class IotController {
  constructor(
    private readonly iot: IotService,
    private readonly polling: IotPollingService,
  ) {}

  @Get('overview')
  @ApiOperation({ summary: 'Ringkasan perangkat dan telemetry IoT — OWNER/ADMIN' })
  async overview(@Query() query: IotDeviceQueryDto) {
    return { message: 'Ringkasan IoT berhasil diambil', data: await this.iot.overview(query) };
  }

  @Get('devices')
  @ApiOperation({ summary: 'Daftar perangkat IoT — OWNER/ADMIN' })
  async devices(@Query() query: IotDeviceQueryDto) {
    return { message: 'Daftar perangkat IoT berhasil diambil', data: await this.iot.listDevices(query) };
  }

  @Get('tenant/my-room')
  @Roles(UserRole.TENANT)
  @ApiOperation({ summary: 'Telemetry meter kamar aktif saya - TENANT, monitoring-only' })
  async tenantCurrentRoomUtilities(@CurrentUser() actor: CurrentUserPayload) {
    return { message: 'Telemetry meter kamar berhasil diambil', data: await this.iot.tenantCurrentRoomUtilities(actor) };
  }

  @Get('tenant/electricity-timeline')
  @Roles(UserRole.TENANT)
  @ApiOperation({ summary: 'Timeline pemakaian listrik kamar aktif saya - TENANT, monitoring-only' })
  async tenantElectricityTimeline(@CurrentUser() actor: CurrentUserPayload) {
    return { message: 'Timeline listrik berhasil diambil', data: await this.iot.tenantElectricityTimeline(actor) };
  }

  @Post('tenant/refresh')
  @Roles(UserRole.TENANT)
  @UseGuards(RateLimitGuard)
  @RateLimit('tenantIotRefresh')
  @ApiOperation({ summary: 'Paksa sinkronisasi Tuya untuk kamar tenant — rate-limited 1× per 2 menit' })
  async tenantRefreshMeter(@CurrentUser() actor: CurrentUserPayload) {
    return { message: 'Sinkronisasi meter berhasil', data: await this.iot.tenantRefreshMeter(actor) };
  }

  @Post('devices')
  @ApiOperation({ summary: 'Daftarkan perangkat IoT — OWNER/ADMIN' })
  async create(@Body() dto: CreateIotDeviceDto, @CurrentUser() actor: CurrentUserPayload) {
    return { message: 'Perangkat IoT berhasil didaftarkan', data: await this.iot.createDevice(dto, actor) };
  }

  @Post('tuya/probe')
  @ApiOperation({ summary: 'Uji koneksi Tuya read-only tanpa menyimpan telemetry — OWNER/ADMIN' })
  async probeTuya(@Body() dto: TuyaProbeDto) {
    return { message: 'Koneksi Tuya berhasil diuji', data: await this.iot.probeTuya(dto.externalDeviceId) };
  }

  @Post('tuya/sync-all')
  @ApiOperation({ summary: 'Tarik telemetry semua perangkat Tuya aktif — OWNER/ADMIN' })
  async syncAllTuya(@CurrentUser() actor: CurrentUserPayload) {
    return { message: 'Sinkronisasi semua perangkat Tuya selesai', data: await this.iot.syncAllTuya(actor) };
  }

  @Public()
  @Roles()
  @UseGuards(RateLimitGuard)
  @RateLimit('cron')
  @Post('tuya/cron')
  @HttpCode(200)
  @ApiOperation({ summary: 'Trigger polling Tuya dari cron server - token X-Iot-Cron-Token wajib' })
  async pollTuyaFromCron(@Headers('x-iot-cron-token') headerToken?: string) {
    const expected = (process.env.IOT_TUYA_CRON_TOKEN ?? '').trim();
    const provided = (headerToken ?? '').trim();
    if (!tokensMatch(expected, provided)) {
      throw new ForbiddenException('Token cron IoT tidak valid');
    }
    return { message: 'Polling Tuya dari cron selesai', data: await this.polling.runExternalCron() };
  }

  @Patch('devices/:id')
  @ApiOperation({ summary: 'Ubah mapping/keaktifan perangkat — OWNER/ADMIN' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateIotDeviceDto,
    @CurrentUser() actor: CurrentUserPayload,
  ) {
    return { message: 'Perangkat IoT berhasil diperbarui', data: await this.iot.updateDevice(id, dto, actor) };
  }

  @Post('devices/:id/sync')
  @ApiOperation({ summary: 'Tarik telemetry satu perangkat Tuya — OWNER/ADMIN' })
  async syncTuya(@Param('id', ParseIntPipe) id: number, @CurrentUser() actor: CurrentUserPayload) {
    return { message: 'Telemetry Tuya berhasil disinkronkan', data: await this.iot.syncTuyaDevice(id, actor) };
  }

  @Post('devices/:id/backfill')
  @ApiOperation({ summary: 'Backfill history Tuya — isi gap data dari log Tuya (default 7 hari)' })
  async backfillTuya(
    @Param('id', ParseIntPipe) id: number,
    @Query('days', new DefaultValuePipe(7), ParseIntPipe) days: number,
    @CurrentUser() actor: CurrentUserPayload,
  ) {
    return { message: 'Backfill Tuya selesai', data: await this.iot.backfillTuyaReportHistory(id, days, actor) };
  }

  @Post('devices/:id/rotate-secret')
  @Roles(UserRole.OWNER)
  @ApiOperation({ summary: 'Provision/rotasi secret ESP32 — OWNER-only; secret ditampilkan satu kali' })
  async rotateSecret(@Param('id', ParseIntPipe) id: number, @CurrentUser() actor: CurrentUserPayload) {
    return { message: 'Secret perangkat berhasil dibuat', data: await this.iot.rotateDeviceSecret(id, actor) };
  }

  @Get('devices/:id/telemetry')
  @ApiOperation({ summary: 'Riwayat telemetry perangkat — OWNER/ADMIN' })
  async telemetry(@Param('id', ParseIntPipe) id: number, @Query() query: IotTelemetryQueryDto) {
    return { message: 'Riwayat telemetry berhasil diambil', data: await this.iot.telemetry(id, query) };
  }
}
