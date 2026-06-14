import { Module } from '@nestjs/common';
import { AdminBookingsController } from './admin-bookings.controller';
import { PublicBookingsController } from './public-bookings.controller';
import { TenantBookingsController } from './tenant-bookings.controller';
import { TenantBookingsService } from './tenant-bookings.service';
import { PublicBookingsService } from './public-bookings.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { AccountingModule } from '../accounting/accounting.module';
import { LoyaltyModule } from '../loyalty/loyalty.module';

@Module({
  imports: [NotificationsModule, AccountingModule, LoyaltyModule],
  controllers: [TenantBookingsController, AdminBookingsController, PublicBookingsController],
  providers: [TenantBookingsService, PublicBookingsService],
})
export class TenantBookingsModule {}
