import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/app.enums';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { FinancePeriodQueryDto } from './dto/finance-query.dto';
import { FinanceService } from './finance.service';

@ApiTags('finance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.OWNER, UserRole.ADMIN)
@Controller('finance')
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  @Get('business-health')
  async businessHealth(@Query() query: FinancePeriodQueryDto) {
    return {
      message: 'Ringkasan kesehatan bisnis berhasil diambil',
      data: await this.financeService.businessHealth(query),
    };
  }

  @Get('occupancy/summary')
  async occupancySummary(@Query() query: FinancePeriodQueryDto) {
    return {
      message: 'Ringkasan okupansi berhasil diambil',
      data: await this.financeService.occupancySummary(query),
    };
  }

  @Get('formal-ratios/readiness')
  async formalRatiosReadiness() {
    return {
      message: 'Kesiapan rasio formal berhasil diambil',
      data: await this.financeService.formalRatiosReadiness(),
    };
  }

  @Get('balance-sheet/draft')
  async balanceSheetDraft(@Query() query: FinancePeriodQueryDto) {
    return {
      message: 'Draft balance sheet berhasil diambil',
      data: await this.financeService.balanceSheetDraft(query),
    };
  }

  @Get('owner-dashboard')
  async ownerDashboard(@Query() query: FinancePeriodQueryDto) {
    return {
      message: 'Dashboard owner berhasil diambil',
      data: await this.financeService.ownerDashboard(query),
    };
  }
}
