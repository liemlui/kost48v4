import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { AdditionalServicesController } from './additional-services.controller';
import { AdditionalServicesService } from './additional-services.service';

@Module({
  imports: [NotificationsModule],
  controllers: [AdditionalServicesController],
  providers: [AdditionalServicesService],
  exports: [AdditionalServicesService],
})
export class AdditionalServicesModule {}
