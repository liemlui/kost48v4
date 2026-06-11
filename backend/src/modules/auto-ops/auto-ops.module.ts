import { Module } from '@nestjs/common';
import { AutoOpsController } from './auto-ops.controller';
import { AutoOpsService } from './auto-ops.service';
import { AccountingModule } from '../accounting/accounting.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [AccountingModule, NotificationsModule],
  controllers: [AutoOpsController],
  providers: [AutoOpsService],
  exports: [AutoOpsService],
})
export class AutoOpsModule {}
