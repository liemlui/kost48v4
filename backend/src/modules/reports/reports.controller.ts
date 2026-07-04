import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/app.enums';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ReportsService } from './reports.service';
import {
  MonthlyIncomeQueryDto,
  OverdueAgingQueryDto,
  ExpenseSummaryQueryDto,
  CashFlowQueryDto,
  OccupancyQueryDto,
  OccupancyDailyQueryDto,
} from './dto/reports-query.dto';

@ApiTags('reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.OWNER)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('monthly-income')
  @ApiOperation({ summary: 'Ringkasan pendapatan bulanan — OWNER-only' })
  async monthlyIncome(@Query() query: MonthlyIncomeQueryDto) {
    return {
      message: 'Ringkasan pendapatan bulanan berhasil diambil',
      data: await this.reportsService.monthlyIncome(query.year, query.month),
    };
  }

  @Get('overdue-aging')
  @ApiOperation({ summary: 'Laporan aging overdue — OWNER-only' })
  async overdueAging(@Query() query: OverdueAgingQueryDto) {
    return {
      message: 'Laporan aging overdue berhasil diambil',
      data: await this.reportsService.overdueAging(query.asOf),
    };
  }

  @Get('deposit-liability')
  @ApiOperation({ summary: 'Ringkasan liabilitas deposit — OWNER-only' })
  async depositLiability() {
    return {
      message: 'Ringkasan liabilitas deposit berhasil diambil',
      data: await this.reportsService.depositLiability(),
    };
  }

  @Get('expense-summary')
  @ApiOperation({ summary: 'Ringkasan pengeluaran bulanan — OWNER-only' })
  async expenseSummary(@Query() query: ExpenseSummaryQueryDto) {
    return {
      message: 'Ringkasan pengeluaran bulanan berhasil diambil',
      data: await this.reportsService.expenseSummary(query.year, query.month),
    };
  }

  // R2: GET /cash-flow dihapus — digantikan oleh GET /accounting/cashflow (direct method).

  @Get('profit-loss')
  @ApiOperation({ summary: 'Laporan laba rugi — OWNER-only' })
  async profitLoss(@Query() query: OccupancyQueryDto) {
    return {
      message: 'Laporan laba rugi berhasil diambil',
      data: await this.reportsService.profitLoss(query.year, query.month),
    };
  }

  @Get('financial-ratios')
  @ApiOperation({ summary: 'Rasio keuangan — OWNER-only' })
  async financialRatios(@Query() query: OccupancyQueryDto) {
    return {
      message: 'Rasio keuangan berhasil diambil',
      data: await this.reportsService.financialRatios(query.year, query.month),
    };
  }

  @Get('occupancy-daily')
  @ApiOperation({ summary: 'Heatmap okupansi harian — OWNER-only' })
  async occupancyDaily(@Query() query: OccupancyDailyQueryDto) {
    return {
      message: 'Heatmap okupansi harian berhasil diambil',
      data: await this.reportsService.occupancyDaily(query.from, query.to),
    };
  }

  @Get('occupancy')
  @ApiOperation({ summary: 'Laporan okupansi — OWNER-only' })
  async occupancy(@Query() query: OccupancyQueryDto) {
    return {
      message: 'Laporan okupansi berhasil diambil',
      data: await this.reportsService.occupancy(query.year, query.month),
    };
  }
}
