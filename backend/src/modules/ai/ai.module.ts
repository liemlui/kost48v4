import { Module } from '@nestjs/common';
import { AiCacheService } from './ai-cache.service';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';

@Module({
  controllers: [AiController],
  providers: [AiService, AiCacheService],
})
export class AiModule {}
