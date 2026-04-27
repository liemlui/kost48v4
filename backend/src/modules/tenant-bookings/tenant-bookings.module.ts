import { Module } from '@nestjs/common';
import { AdminBookingsController } from './admin-bookings.controller';
import { PublicRoomsController } from './public-rooms.controller';
import { TenantBookingsController } from './tenant-bookings.controller';
import { TenantBookingsService } from './tenant-bookings.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [PublicRoomsController, TenantBookingsController, AdminBookingsController],
  providers: [TenantBookingsService],
})
export class TenantBookingsModule {}
