import { Module } from '@nestjs/common';
import { PublicRoomsController } from './public-rooms.controller';
import { TenantBookingsController } from './tenant-bookings.controller';
import { TenantBookingsService } from './tenant-bookings.service';

@Module({
  controllers: [PublicRoomsController, TenantBookingsController],
  providers: [TenantBookingsService],
})
export class TenantBookingsModule {}
