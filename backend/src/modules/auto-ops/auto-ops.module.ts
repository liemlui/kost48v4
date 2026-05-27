import { Module } from '@nestjs/common';
import { AutoOpsController } from './auto-ops.controller';
import { AutoOpsService } from './auto-ops.service';
import { AccountingModule } from '../accounting/accounting.module';

@Module({
  imports: [AccountingModule],
  controllers: [AutoOpsController],
  providers: [AutoOpsService],
  exports: [AutoOpsService],
})
export class AutoOpsModule {}
