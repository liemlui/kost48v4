import { Module } from '@nestjs/common';
import { WifiSalesController } from './wifi-sales.controller';
import { WifiSalesService } from './wifi-sales.service';

@Module({ controllers: [WifiSalesController], providers: [WifiSalesService], exports: [WifiSalesService] })
export class WifiSalesModule {}
