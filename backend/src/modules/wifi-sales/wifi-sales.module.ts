import { Module } from '@nestjs/common';
import { WifiSalesController } from './wifi-sales.controller';
import { WifiSalesService } from './wifi-sales.service';
import { AccountingModule } from '../accounting/accounting.module';

@Module({ imports: [AccountingModule], controllers: [WifiSalesController], providers: [WifiSalesService], exports: [WifiSalesService] })
export class WifiSalesModule {}
