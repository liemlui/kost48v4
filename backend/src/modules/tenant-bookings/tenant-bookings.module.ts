import { Module } from '@nestjs/common';
import { AdminBookingsController } from './admin-bookings.controller';
import { PublicBookingsController } from './public-bookings.controller';
import { PublicRoomsController } from './public-rooms.controller';
import { TenantBookingsController } from './tenant-bookings.controller';
import { TenantBookingsService } from './tenant-bookings.service';
import { PublicBookingsService } from './public-bookings.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [PublicRoomsController, TenantBookingsController, AdminBookingsController, PublicBookingsController],
  providers: [TenantBookingsService, PublicBookingsService],
})
export class TenantBookingsModule {}
