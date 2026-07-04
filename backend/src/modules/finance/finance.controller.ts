import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
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
  @ApiOperation({ summary: 'Ringkasan kesehatan bisnis — OWNER/ADMIN' })
  async businessHealth(@Query() query: FinancePeriodQueryDto) {
    return {
      message: 'Ringkasan kesehatan bisnis berhasil diambil',
      data: await this.financeService.businessHealth(query),
    };
  }

  @Get('occupancy/summary')
  @ApiOperation({ summary: 'Ringkasan okupansi — OWNER/ADMIN' })
  async occupancySummary(@Query() query: FinancePeriodQueryDto) {
    return {
      message: 'Ringkasan okupansi berhasil diambil',
      data: await this.financeService.occupancySummary(query),
    };
  }

  @Get('formal-ratios/readiness')
  @ApiOperation({ summary: 'Kesiapan rasio formal — OWNER/ADMIN' })
  async formalRatiosReadiness() {
    return {
      message: 'Kesiapan rasio formal berhasil diambil',
      data: await this.financeService.formalRatiosReadiness(),
    };
  }

  @Get('balance-sheet/draft')
  @ApiOperation({ summary: 'Draft balance sheet — OWNER/ADMIN' })
  async balanceSheetDraft(@Query() query: FinancePeriodQueryDto) {
    return {
      message: 'Draft balance sheet berhasil diambil',
      data: await this.financeService.balanceSheetDraft(query),
    };
  }

  @Get('owner-dashboard')
  @ApiOperation({ summary: 'Dashboard owner — OWNER/ADMIN' })
  async ownerDashboard(@Query() query: FinancePeriodQueryDto) {
    return {
      message: 'Dashboard owner berhasil diambil',
      data: await this.financeService.ownerDashboard(query),
    };
  }
}
