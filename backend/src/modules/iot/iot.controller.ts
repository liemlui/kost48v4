import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/app.enums';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import { CreateIotDeviceDto, IotDeviceQueryDto, IotTelemetryQueryDto, TuyaProbeDto, UpdateIotDeviceDto } from './dto/iot-device.dto';
import { IotService } from './iot.service';

@ApiTags('iot')
@ApiBearerAuth()
@Controller('iot')
@Roles(UserRole.OWNER, UserRole.ADMIN)
export class IotController {
  constructor(private readonly iot: IotService) {}

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
