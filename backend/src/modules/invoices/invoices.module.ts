import { Module } from '@nestjs/common';
import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';
import { AuditLogModule } from '../../audit-log/audit-log.module';
import { AccountingModule } from '../accounting/accounting.module';

@Module({ imports: [AuditLogModule, AccountingModule], controllers: [InvoicesController], providers: [InvoicesService], exports: [InvoicesService] })
export class InvoicesModule {}
