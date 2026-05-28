import { Module } from '@nestjs/common';
import { StaysController } from './stays.controller';
import { StaysService } from './stays.service';
import { StaysQueryService } from './stays-query.service';
import { AuditLogModule } from '../../audit-log/audit-log.module';
import { AccountingModule } from '../accounting/accounting.module';
import { DepositLedgerModule } from '../deposit-ledger/deposit-ledger.module';

@Module({
  imports: [AuditLogModule, AccountingModule, DepositLedgerModule],
  controllers: [StaysController],
  providers: [StaysService, StaysQueryService],
  exports: [StaysService],
})
export class StaysModule {}
