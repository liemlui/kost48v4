import { Module } from '@nestjs/common';
import { AuditLogModule } from '../../audit-log/audit-log.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { StaysModule } from '../stays/stays.module';
import { LoyaltyModule } from '../loyalty/loyalty.module';
import { RenewRequestsService } from './renew-requests.service';
import { RenewRequestsTenantController } from './renew-requests.tenant.controller';
import { RenewRequestsAdminController } from './renew-requests.admin.controller';

@Module({
  imports: [StaysModule, AuditLogModule, NotificationsModule, LoyaltyModule],
  controllers: [RenewRequestsTenantController, RenewRequestsAdminController],
  providers: [RenewRequestsService],
})
export class RenewRequestsModule {}