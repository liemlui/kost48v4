import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/app.enums';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AnalyticsService } from './analytics.service';

@ApiTags('analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('marketing/summary')
  @ApiOperation({ summary: 'Ringkasan analytics marketing' })
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.STAFF)
  async marketingSummary() {
    return { message: 'Ringkasan analytics marketing berhasil diambil', data: await this.analyticsService.marketingSummary() };
  }

  @Get('finance/summary')
  @ApiOperation({ summary: 'Ringkasan analytics finance' })
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async financeSummary() {
    return { message: 'Ringkasan analytics finance berhasil diambil', data: await this.analyticsService.financeSummary() };
  }

  @Get('operations/summary')
  @ApiOperation({ summary: 'Ringkasan analytics operasional' })
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.STAFF)
  async operationsSummary() {
    return { message: 'Ringkasan analytics operations berhasil diambil', data: await this.analyticsService.operationsSummary() };
  }

  @Get('strategy/summary')
  @ApiOperation({ summary: 'Ringkasan analytics strategy' })
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async strategySummary() {
    return { message: 'Ringkasan analytics strategy berhasil diambil', data: await this.analyticsService.strategySummary() };
  }
}
