import { Module } from '@nestjs/common';
import { TenantsController } from './tenants.controller';
import { TenantProfileController } from './tenant-profile.controller';
import { TenantsService } from './tenants.service';
import { KtpAiApprovalService } from './ktp-ai-approval.service';
import { AuditLogModule } from '../../audit-log/audit-log.module';
import { LoyaltyModule } from '../loyalty/loyalty.module';

@Module({
  imports: [AuditLogModule, LoyaltyModule],
  controllers: [TenantsController, TenantProfileController],
  providers: [TenantsService, KtpAiApprovalService],
  exports: [TenantsService, KtpAiApprovalService],
})
export class TenantsModule {}
