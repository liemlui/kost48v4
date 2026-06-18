import { Module } from '@nestjs/common';
import { MarketingPublicRoomsController } from './marketing-public-rooms.controller';
import { MarketingPublicRoomsService } from './marketing-public-rooms.service';
import { FacilityImagesController } from './facility-images.controller';
import { FacilityImagesService } from './facility-images.service';
import { MarketingAssetsController } from './marketing-assets.controller';
import { MarketingAssetsService } from './marketing-assets.service';

@Module({
  controllers: [MarketingPublicRoomsController, FacilityImagesController, MarketingAssetsController],
  providers: [MarketingPublicRoomsService, FacilityImagesService, MarketingAssetsService],
})
export class MarketingModule {}
