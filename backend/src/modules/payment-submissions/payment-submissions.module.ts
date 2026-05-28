import { Module } from '@nestjs/common';
import { PaymentSubmissionsController } from './payment-submissions.controller';
import { PaymentSubmissionsService } from './payment-submissions.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { AccountingModule } from '../accounting/accounting.module';
import { DepositLedgerModule } from '../deposit-ledger/deposit-ledger.module';

@Module({
  imports: [NotificationsModule, AccountingModule, DepositLedgerModule],
  controllers: [PaymentSubmissionsController],
  providers: [PaymentSubmissionsService],
})
export class PaymentSubmissionsModule {}
