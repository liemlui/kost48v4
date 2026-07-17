import { Module } from '@nestjs/common';
import { IotController } from './iot.controller';
import { IotService } from './iot.service';
import { WaterIngestController } from './water-ingest.controller';
import { WaterIngestService } from './water-ingest.service';
import { DeviceCredentialService } from './device-credential.service';
import { TuyaClientService } from './tuya/tuya-client.service';
import { IotPollingService } from './iot-polling.service';

@Module({
  controllers: [IotController, WaterIngestController],
  providers: [IotService, IotPollingService, WaterIngestService, DeviceCredentialService, TuyaClientService],
  exports: [IotService],
})
export class IotModule {}
