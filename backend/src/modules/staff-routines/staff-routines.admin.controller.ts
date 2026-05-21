import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/app.enums';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import { StaffRoutineProgressQueryDto, StaffRoutineTemplateDto } from './dto/staff-routine.dto';
import { StaffRoutinesService } from './staff-routines.service';

@ApiTags('admin-staff-routines')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin/staff-routines')
export class StaffRoutinesAdminController {
  constructor(private readonly service: StaffRoutinesService) {}

  @Get('templates')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async templates() {
    return { message: 'Daftar pekerjaan rutin berhasil diambil', data: await this.service.listTemplates() };
  }

  @Post('templates')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async createTemplate(@Body() dto: StaffRoutineTemplateDto, @CurrentUser() user: CurrentUserPayload) {
    return { message: 'Pekerjaan rutin berhasil dibuat', data: await this.service.createTemplate(dto, user) };
  }

  @Patch('templates/:id')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async updateTemplate(@Param('id', ParseIntPipe) id: number, @Body() dto: Partial<StaffRoutineTemplateDto>, @CurrentUser() user: CurrentUserPayload) {
    return { message: 'Pekerjaan rutin berhasil diperbarui', data: await this.service.updateTemplate(id, dto, user) };
  }

  @Delete('templates/:id')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async deleteTemplate(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: CurrentUserPayload) {
    return { message: 'Pekerjaan rutin dinonaktifkan', data: await this.service.deactivateTemplate(id, user) };
  }

  @Get('progress')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async progress(@Query() query: StaffRoutineProgressQueryDto) {
    return { message: 'Progress checklist staf berhasil diambil', data: await this.service.getAdminProgress(query) };
  }

  @Get('kpi')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async kpi(@Query() query: StaffRoutineProgressQueryDto) {
    return { message: 'KPI checklist staf berhasil diambil', data: await this.service.getAdminProgress(query) };
  }
}
