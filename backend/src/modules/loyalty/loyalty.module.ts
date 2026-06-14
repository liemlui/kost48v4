import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AccountingModule } from '../accounting/accounting.module';
import { LoyaltyService } from './loyalty.service';
import { RedemptionService } from './redemption.service';
import { LoyaltyController } from './loyalty.controller';
import { LoyaltyAdminController } from './loyalty.admin.controller';

@Module({
  imports: [PrismaModule, AccountingModule],
  controllers: [LoyaltyController, LoyaltyAdminController],
  providers: [LoyaltyService, RedemptionService],
  exports: [LoyaltyService, RedemptionService],
})
export class LoyaltyModule {}
