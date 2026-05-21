import { Module } from '@nestjs/common';
import { StaffRoutinesController } from './staff-routines.controller';
import { StaffRoutinesAdminController } from './staff-routines.admin.controller';
import { StaffRoutinesService } from './staff-routines.service';

@Module({
  controllers: [StaffRoutinesController, StaffRoutinesAdminController],
  providers: [StaffRoutinesService],
})
export class StaffRoutinesModule {}
