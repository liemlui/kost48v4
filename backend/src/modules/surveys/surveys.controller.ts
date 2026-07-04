import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/app.enums';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import { SubmitSurveyDto } from './dto/survey.dto';
import { SurveysService } from './surveys.service';

@ApiTags('surveys')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('surveys')
export class SurveysController {
  constructor(private readonly service: SurveysService) {}

  // Penghuni isi survei kepuasan.
  @Post()
  @ApiOperation({ summary: 'Isi survei kepuasan — TENANT' })
  @Roles(UserRole.TENANT)
  async submit(@Body() dto: SubmitSurveyDto, @CurrentUser() user: CurrentUserPayload) {
    return { message: 'Terima kasih atas penilaiannya', data: await this.service.submit(dto, user) };
  }

  @Get('mine')
  @ApiOperation({ summary: 'Status survei saya — TENANT' })
  @Roles(UserRole.TENANT)
  async mine(@CurrentUser() user: CurrentUserPayload) {
    return { message: 'Status survei saya', data: await this.service.mineExists(user) };
  }

  @Get('summary')
  @ApiOperation({ summary: 'Ringkasan survei kepuasan — OWNER/ADMIN' })
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async summary() {
    return { message: 'Ringkasan survei kepuasan', data: await this.service.summary() };
  }

  @Get()
  @ApiOperation({ summary: 'Daftar survei kepuasan — OWNER/ADMIN' })
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async findAll() {
    return { message: 'Daftar survei kepuasan', data: await this.service.findAll() };
  }
}
