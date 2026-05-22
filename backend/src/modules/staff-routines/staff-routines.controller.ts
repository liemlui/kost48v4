import { Body, Controller, Get, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/app.enums';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import { CompleteRoutineDto } from './dto/staff-routine.dto';
import { StaffRoutinesService } from './staff-routines.service';

@ApiTags('staff-routines')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('staff-routines')
export class StaffRoutinesController {
  constructor(private readonly service: StaffRoutinesService) {}

  @Get('today')
  @Roles(UserRole.STAFF)
  async today(@CurrentUser() user: CurrentUserPayload) {
    return { message: 'Checklist hari ini berhasil diambil', data: await this.service.getToday(user) };
  }

  @Get('kpi/me')
  @Roles(UserRole.STAFF)
  async myKpi(@CurrentUser() user: CurrentUserPayload) {
    return { message: 'Ringkasan kerja staf berhasil diambil', data: await this.service.getMyKpi(user) };
  }

  @Post(':templateId/start')
  @Roles(UserRole.STAFF)
  async start(@Param('templateId', ParseIntPipe) templateId: number, @Body() dto: CompleteRoutineDto, @CurrentUser() user: CurrentUserPayload) {
    return { message: 'Pekerjaan rutin berhasil dimulai', data: await this.service.start(templateId, dto, user) };
  }

  @Post(':templateId/complete')
  @Roles(UserRole.STAFF)
  async complete(@Param('templateId', ParseIntPipe) templateId: number, @Body() dto: CompleteRoutineDto, @CurrentUser() user: CurrentUserPayload) {
    return { message: 'Checklist berhasil disimpan', data: await this.service.complete(templateId, dto, user) };
  }

  @Post(':templateId/need-help')
  @Roles(UserRole.STAFF)
  async needHelp(@Param('templateId', ParseIntPipe) templateId: number, @Body() dto: CompleteRoutineDto, @CurrentUser() user: CurrentUserPayload) {
    return { message: 'Kendala berhasil dikirim ke catatan checklist', data: await this.service.complete(templateId, { ...dto, status: 'NEED_HELP' as any }, user) };
  }
}
