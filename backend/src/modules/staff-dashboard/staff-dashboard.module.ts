import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { StaffDashboardController } from './staff-dashboard.controller';
import { StaffDashboardService } from './staff-dashboard.service';

@Module({
  imports: [PrismaModule],
  controllers: [StaffDashboardController],
  providers: [StaffDashboardService],
})
export class StaffDashboardModule {}
