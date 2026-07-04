import { Module } from '@nestjs/common';
import { GuestPreferencesController } from './guest-preferences.controller';
import { GuestPreferencesService } from './guest-preferences.service';

@Module({
  controllers: [GuestPreferencesController],
  providers: [GuestPreferencesService],
  exports: [GuestPreferencesService],
})
export class GuestPreferencesModule {}
