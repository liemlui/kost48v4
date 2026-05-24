import { Module } from '@nestjs/common';
import { AccountingController } from './accounting.controller';
import { AccountingService } from './accounting.service';
import { AccountingPostingService } from './accounting-posting.service';
import { AccountingReadinessService } from './accounting-readiness.service';
import { AccountingReportsService } from './accounting-reports.service';
import { AccountingSchemaGuard } from './accounting-schema.guard';

@Module({
  controllers: [AccountingController],
  providers: [AccountingService, AccountingPostingService, AccountingReadinessService, AccountingReportsService, AccountingSchemaGuard],
  exports: [AccountingReadinessService, AccountingReportsService, AccountingSchemaGuard],
})
export class AccountingModule {}
