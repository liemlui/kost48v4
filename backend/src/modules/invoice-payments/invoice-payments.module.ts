import { Module } from '@nestjs/common';
import { AuditLogModule } from 'src/audit-log/audit-log.module';
import { InvoicePaymentsController } from './invoice-payments.controller';
import { InvoicePaymentsService } from './invoice-payments.service';

@Module({
  imports: [AuditLogModule],
  controllers: [InvoicePaymentsController],
  providers: [InvoicePaymentsService],
  exports: [InvoicePaymentsService],
})
export class InvoicePaymentsModule {}
