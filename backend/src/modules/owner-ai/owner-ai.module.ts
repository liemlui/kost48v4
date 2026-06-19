import { Module } from '@nestjs/common';
import { OwnerAiController } from './owner-ai.controller';
import { OwnerAiService } from './owner-ai.service';
import { AiDraftController } from './ai-draft.controller';
import { AiDraftService } from './ai-draft.service';

@Module({
  controllers: [OwnerAiController, AiDraftController],
  providers: [OwnerAiService, AiDraftService],
  exports: [OwnerAiService, AiDraftService],
})
export class OwnerAiModule {}
