import { Module } from '@nestjs/common';
import { AuditLogModule } from '../../audit-log/audit-log.module';
import { StaysModule } from '../stays/stays.module';
import { RenewRequestsService } from './renew-requests.service';
import { RenewRequestsTenantController } from './renew-requests.tenant.controller';
import { RenewRequestsAdminController } from './renew-requests.admin.controller';

@Module({
  imports: [StaysModule, AuditLogModule],
  controllers: [RenewRequestsTenantController, RenewRequestsAdminController],
  providers: [RenewRequestsService],
})
export class RenewRequestsModule {}