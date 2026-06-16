import { Module } from '@nestjs/common';
import { MarketAnalysisController } from './market-analysis.controller';
import { MarketAnalysisService } from './market-analysis.service';

@Module({
  controllers: [MarketAnalysisController],
  providers: [MarketAnalysisService],
  exports: [MarketAnalysisService],
})
export class MarketAnalysisModule {}
