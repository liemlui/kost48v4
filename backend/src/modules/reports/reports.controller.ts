import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
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
} from './dto/reports-query.dto';

@ApiTags('reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.OWNER)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('monthly-income')
  async monthlyIncome(@Query() query: MonthlyIncomeQueryDto) {
    return {
      message: 'Ringkasan pendapatan bulanan berhasil diambil',
      data: await this.reportsService.monthlyIncome(query.year, query.month),
    };
  }

  @Get('overdue-aging')
  async overdueAging(@Query() query: OverdueAgingQueryDto) {
    return {
      message: 'Laporan aging overdue berhasil diambil',
      data: await this.reportsService.overdueAging(query.asOf),
    };
  }

  @Get('deposit-liability')
  async depositLiability() {
    return {
      message: 'Ringkasan liabilitas deposit berhasil diambil',
      data: await this.reportsService.depositLiability(),
    };
  }

  @Get('expense-summary')
  async expenseSummary(@Query() query: ExpenseSummaryQueryDto) {
    return {
      message: 'Ringkasan pengeluaran bulanan berhasil diambil',
      data: await this.reportsService.expenseSummary(query.year, query.month),
    };
  }

  @Get('cash-flow')
  async cashFlow(@Query() query: CashFlowQueryDto) {
    return {
      message: 'Ringkasan arus kas berhasil diambil',
      data: await this.reportsService.cashFlow(query.year, query.month),
    };
  }
}