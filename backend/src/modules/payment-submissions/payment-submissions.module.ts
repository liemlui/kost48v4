import { Module } from '@nestjs/common';
import { PaymentSubmissionsController } from './payment-submissions.controller';
import { PaymentSubmissionsService } from './payment-submissions.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { AccountingModule } from '../accounting/accounting.module';

@Module({
  imports: [NotificationsModule, AccountingModule],
  controllers: [PaymentSubmissionsController],
  providers: [PaymentSubmissionsService],
})
export class PaymentSubmissionsModule {}
