import { Module } from '@nestjs/common';
import { StaysModule } from '../stays/stays.module';
import { CheckoutRequestsService } from './checkout-requests.service';
import { CheckoutRequestsTenantController } from './checkout-requests.tenant.controller';
import { CheckoutRequestsAdminController } from './checkout-requests.admin.controller';

@Module({
  imports: [StaysModule],
  controllers: [
    CheckoutRequestsTenantController,
    CheckoutRequestsAdminController,
  ],
  providers: [CheckoutRequestsService],
})
export class CheckoutRequestsModule {}