import { Module } from '@nestjs/common';
import { AncillaryRevenueController } from './ancillary-revenue.controller';
import { AncillaryRevenueService } from './ancillary-revenue.service';

@Module({
  controllers: [AncillaryRevenueController],
  providers: [AncillaryRevenueService],
  exports: [AncillaryRevenueService],
})
export class AncillaryRevenueModule {}
