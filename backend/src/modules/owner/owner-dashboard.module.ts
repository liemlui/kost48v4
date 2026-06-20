import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { FinanceModule } from '../finance/finance.module';
import { AccountingModule } from '../accounting/accounting.module';
import { OwnerDashboardController } from './owner-dashboard.controller';
import { OwnerDashboardService } from './owner-dashboard.service';

@Module({
  imports: [PrismaModule, FinanceModule, AccountingModule],
  controllers: [OwnerDashboardController],
  providers: [OwnerDashboardService],
})
export class OwnerDashboardModule {}
