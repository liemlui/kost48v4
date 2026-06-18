import { Module } from '@nestjs/common';
import { StaysController } from './stays.controller';
import { StaysService } from './stays.service';
import { StaysRenewalService } from './stays-renewal.service';
import { StaysQueryService } from './stays-query.service';
import { RoomTransferService } from './room-transfer.service';
import { PrepayExtensionService } from './prepay-extension.service';
import { AuditLogModule } from '../../audit-log/audit-log.module';
import { AccountingModule } from '../accounting/accounting.module';
import { DepositLedgerModule } from '../deposit-ledger/deposit-ledger.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { LoyaltyModule } from '../loyalty/loyalty.module';

@Module({
  imports: [AuditLogModule, AccountingModule, DepositLedgerModule, NotificationsModule, LoyaltyModule],
  controllers: [StaysController],
  providers: [StaysService, StaysRenewalService, StaysQueryService, RoomTransferService, PrepayExtensionService],
  exports: [StaysService, StaysRenewalService],
})
export class StaysModule {}
