import { Module } from '@nestjs/common';
import { MarketingPublicRoomsController } from './marketing-public-rooms.controller';
import { MarketingPublicRoomsService } from './marketing-public-rooms.service';
import { FacilityImagesController } from './facility-images.controller';
import { FacilityImagesService } from './facility-images.service';

@Module({
  controllers: [MarketingPublicRoomsController, FacilityImagesController],
  providers: [MarketingPublicRoomsService, FacilityImagesService],
})
export class MarketingModule {}
