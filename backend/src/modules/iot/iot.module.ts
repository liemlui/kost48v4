import { Module } from '@nestjs/common';
import { IotController } from './iot.controller';
import { IotSseController } from './iot-sse.controller';
import { IotService } from './iot.service';
import { WaterIngestController } from './water-ingest.controller';
import { WaterIngestService } from './water-ingest.service';
import { DeviceCredentialService } from './device-credential.service';
import { TuyaClientService } from './tuya/tuya-client.service';
import { IotPollingService } from './iot-polling.service';
import { IotSseService } from './iot-sse.service';

@Module({
  controllers: [IotController, IotSseController, WaterIngestController],
  providers: [IotService, IotPollingService, IotSseService, WaterIngestService, DeviceCredentialService, TuyaClientService],
  exports: [IotService, IotSseService],
})
export class IotModule {}
