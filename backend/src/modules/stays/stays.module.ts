import { Module } from '@nestjs/common';
import { StaysController } from './stays.controller';
import { StaysService } from './stays.service';
import { StaysQueryService } from './stays-query.service';
import { RoomTransferService } from './room-transfer.service';
import { AuditLogModule } from '../../audit-log/audit-log.module';
import { AccountingModule } from '../accounting/accounting.module';
import { DepositLedgerModule } from '../deposit-ledger/deposit-ledger.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [AuditLogModule, AccountingModule, DepositLedgerModule, NotificationsModule],
  controllers: [StaysController],
  providers: [StaysService, StaysQueryService, RoomTransferService],
  exports: [StaysService],
})
export class StaysModule {}
