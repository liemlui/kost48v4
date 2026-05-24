import { Module } from '@nestjs/common';
import { AutoOpsController } from './auto-ops.controller';
import { AutoOpsService } from './auto-ops.service';

@Module({
  controllers: [AutoOpsController],
  providers: [AutoOpsService],
  exports: [AutoOpsService],
})
export class AutoOpsModule {}
