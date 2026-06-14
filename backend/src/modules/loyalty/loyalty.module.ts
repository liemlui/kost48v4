import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AccountingModule } from '../accounting/accounting.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { LoyaltyService } from './loyalty.service';
import { RedemptionService } from './redemption.service';
import { PeerReportService } from './peer-report.service';
import { ReferralService } from './referral.service';
import { LoyaltyController } from './loyalty.controller';
import { LoyaltyAdminController } from './loyalty.admin.controller';
import { PeerReportController } from './peer-report.controller';

@Module({
  imports: [PrismaModule, AccountingModule, NotificationsModule],
  controllers: [LoyaltyController, LoyaltyAdminController, PeerReportController],
  providers: [LoyaltyService, RedemptionService, PeerReportService, ReferralService],
  exports: [LoyaltyService, RedemptionService, ReferralService],
})
export class LoyaltyModule {}
