import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { IotController } from './iot.controller';
import { IotSseController } from './iot-sse.controller';
import { IotService } from './iot.service';
import { WaterIngestController } from './water-ingest.controller';
import { WaterIngestService } from './water-ingest.service';
import { DeviceCredentialService } from './device-credential.service';
import { TuyaClientService } from './tuya/tuya-client.service';
import { IotPollingService } from './iot-polling.service';
import { IotSseService } from './iot-sse.service';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [JwtModule.register({ secret: process.env.JWT_SECRET || 'kost48-jwt-fallback' }), SettingsModule],
  controllers: [IotController, IotSseController, WaterIngestController],
  providers: [IotService, IotPollingService, IotSseService, WaterIngestService, DeviceCredentialService, TuyaClientService],
  exports: [IotService, IotSseService],
})
export class IotModule {}
