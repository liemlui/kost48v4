import { Module } from '@nestjs/common';
import { AccountingController } from './accounting.controller';
import { AccountingService } from './accounting.service';
import { AccountingPostingService } from './accounting-posting.service';
import { AccountingReadinessService } from './accounting-readiness.service';
import { AccountingReportsService } from './accounting-reports.service';
import { AccountingSchemaGuard } from './accounting-schema.guard';
import { AccountingPeriodCloseService } from './accounting-period-close.service';
import { RentRecognitionService } from './rent-recognition.service';

@Module({
  controllers: [AccountingController],
  providers: [AccountingService, AccountingPostingService, AccountingReadinessService, AccountingReportsService, AccountingSchemaGuard, AccountingPeriodCloseService, RentRecognitionService],
  exports: [AccountingPostingService, AccountingReadinessService, AccountingReportsService, AccountingSchemaGuard, AccountingPeriodCloseService, RentRecognitionService],
})
export class AccountingModule {}
