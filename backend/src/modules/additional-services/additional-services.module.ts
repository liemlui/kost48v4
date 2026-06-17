import { Module } from '@nestjs/common';
import { AdditionalServicesController } from './additional-services.controller';
import { AdditionalServicesService } from './additional-services.service';

@Module({
  controllers: [AdditionalServicesController],
  providers: [AdditionalServicesService],
  exports: [AdditionalServicesService],
})
export class AdditionalServicesModule {}
