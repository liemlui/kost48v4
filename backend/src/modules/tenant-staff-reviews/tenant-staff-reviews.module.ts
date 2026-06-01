import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { TenantStaffReviewsController } from './tenant-staff-reviews.controller';
import { TenantStaffReviewsService } from './tenant-staff-reviews.service';

@Module({
  imports: [PrismaModule, NotificationsModule],
  controllers: [TenantStaffReviewsController],
  providers: [TenantStaffReviewsService],
})
export class TenantStaffReviewsModule {}
