import { Module } from '@nestjs/common';
import { MarketingPublicRoomsController } from './marketing-public-rooms.controller';
import { MarketingPublicRoomsService } from './marketing-public-rooms.service';

@Module({
  controllers: [MarketingPublicRoomsController],
  providers: [MarketingPublicRoomsService],
})
export class MarketingModule {}
