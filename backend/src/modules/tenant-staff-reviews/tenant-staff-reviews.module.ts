import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { TenantStaffReviewsController } from './tenant-staff-reviews.controller';
import { TenantStaffReviewsService } from './tenant-staff-reviews.service';

@Module({
  imports: [PrismaModule],
  controllers: [TenantStaffReviewsController],
  providers: [TenantStaffReviewsService],
})
export class TenantStaffReviewsModule {}
