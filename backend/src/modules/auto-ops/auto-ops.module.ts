import { Module } from '@nestjs/common';
import { AutoOpsController } from './auto-ops.controller';
import { AutoOpsService } from './auto-ops.service';
import { BookingSweepService } from './sweeps/booking-sweep.service';
import { StaySweepService } from './sweeps/stay-sweep.service';
import { RenewalSweepService } from './sweeps/renewal-sweep.service';
import { AccountingSweepService } from './sweeps/accounting-sweep.service';
import { MaintenanceSweepService } from './sweeps/maintenance-sweep.service';
import { AccountingModule } from '../accounting/accounting.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { DepositLedgerModule } from '../deposit-ledger/deposit-ledger.module';
import { AssetsModule } from '../assets/assets.module';
import { PushModule } from '../push/push.module';
import { LoyaltyModule } from '../loyalty/loyalty.module';

@Module({
  imports: [AccountingModule, NotificationsModule, DepositLedgerModule, AssetsModule, PushModule, LoyaltyModule],
  controllers: [AutoOpsController],
  providers: [
    AutoOpsService,
    BookingSweepService,
    StaySweepService,
    RenewalSweepService,
    AccountingSweepService,
    MaintenanceSweepService,
  ],
  exports: [
    AutoOpsService,
    BookingSweepService,
    StaySweepService,
    RenewalSweepService,
    AccountingSweepService,
    MaintenanceSweepService,
  ],
})
export class AutoOpsModule {}
