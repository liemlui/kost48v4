import { Module } from '@nestjs/common';
import { PaymentSubmissionsController } from './payment-submissions.controller';
import { PaymentSubmissionsService } from './payment-submissions.service';

@Module({
  controllers: [PaymentSubmissionsController],
  providers: [PaymentSubmissionsService],
})
export class PaymentSubmissionsModule {}
