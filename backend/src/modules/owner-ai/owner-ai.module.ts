import { Module } from '@nestjs/common';
import { OwnerAiController } from './owner-ai.controller';
import { OwnerAiService } from './owner-ai.service';

@Module({
  controllers: [OwnerAiController],
  providers: [OwnerAiService],
  exports: [OwnerAiService],
})
export class OwnerAiModule {}
