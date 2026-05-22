import { Module } from '@nestjs/common';
import { AuditLogModule } from '../../audit-log/audit-log.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { AdminStaffPerformanceController } from './admin-staff-performance.controller';
import { StaffPerformanceController } from './staff-performance.controller';
import { StaffPerformanceService } from './staff-performance.service';

@Module({
  imports: [PrismaModule, AuditLogModule],
  controllers: [StaffPerformanceController, AdminStaffPerformanceController],
  providers: [StaffPerformanceService],
  exports: [StaffPerformanceService],
})
export class StaffPerformanceModule {}
