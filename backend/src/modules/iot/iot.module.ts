import { Module } from '@nestjs/common';
import { IotController } from './iot.controller';
import { IotRetiredStreamController } from './iot-retired-stream.controller';
import { IotService } from './iot.service';
import { WaterIngestController } from './water-ingest.controller';
import { WaterIngestService } from './water-ingest.service';
import { DeviceCredentialService } from './device-credential.service';
import { TuyaClientService } from './tuya/tuya-client.service';
import { IotPollingService } from './iot-polling.service';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [SettingsModule],
  // Shared hosting uses short-lived HTTP requests. Long-lived SSE connections
  // used to pin Passenger workers and are intentionally retired here.
  controllers: [IotController, IotRetiredStreamController, WaterIngestController],
  providers: [IotService, IotPollingService, WaterIngestService, DeviceCredentialService, TuyaClientService],
  exports: [IotService],
})
export class IotModule {}
