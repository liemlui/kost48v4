import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuditLogModule } from '../../audit-log/audit-log.module';
import { StaffFieldReportsController } from './staff-field-reports.controller';
import { StaffFieldReportsService } from './staff-field-reports.service';

@Module({
  imports: [PrismaModule, AuditLogModule],
  controllers: [StaffFieldReportsController],
  providers: [StaffFieldReportsService],
  exports: [StaffFieldReportsService],
})
export class StaffFieldReportsModule {}
