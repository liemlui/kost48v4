import { Module } from '@nestjs/common';
import { AuditLogModule } from '../../audit-log/audit-log.module';
import { AccountingModule } from '../accounting/accounting.module';
import { InvoicePaymentsController } from './invoice-payments.controller';
import { InvoicePaymentsService } from './invoice-payments.service';

@Module({
  imports: [AuditLogModule, AccountingModule],
  controllers: [InvoicePaymentsController],
  providers: [InvoicePaymentsService],
  exports: [InvoicePaymentsService],
})
export class InvoicePaymentsModule {}
