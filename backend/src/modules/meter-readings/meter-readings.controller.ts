import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/app.enums';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import { CreateMeterReadingDto, UpdateMeterReadingDto } from './dto/meter-reading.dto';
import { MeterReadingsQueryDto } from './dto/meter-readings-query.dto';
import { MeterReadingsService } from './meter-readings.service';

@ApiTags('meter-readings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('meter-readings')
export class MeterReadingsController {
  constructor(private readonly meterreadingsService: MeterReadingsService) {}

  @Get()
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.STAFF)
  async findAll(@Query() query: MeterReadingsQueryDto) {
    return { message: 'Daftar meter reading berhasil diambil', data: await this.meterreadingsService.findAll(query) };
  }

  @Get(':id')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.STAFF)
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return { message: 'Detail meter reading berhasil diambil', data: await this.meterreadingsService.findOne(id) };
  }

  @Post()
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.STAFF)
  async create(@Body() dto: CreateMeterReadingDto, @CurrentUser() user: CurrentUserPayload) {
    return { message: 'Meter reading berhasil dibuat', data: await this.meterreadingsService.create(dto, user) };
  }

  @Patch(':id')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.STAFF)
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateMeterReadingDto, @CurrentUser() user: CurrentUserPayload) {
    return { message: 'Meter reading berhasil diperbarui', data: await this.meterreadingsService.update(id, dto, user) };
  }

}
