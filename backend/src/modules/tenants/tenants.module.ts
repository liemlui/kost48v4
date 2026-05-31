import { Module } from '@nestjs/common';
import { TenantsController } from './tenants.controller';
import { TenantProfileController } from './tenant-profile.controller';
import { TenantsService } from './tenants.service';
import { AuditLogModule } from '../../audit-log/audit-log.module';

@Module({
  imports: [AuditLogModule],
  controllers: [TenantsController, TenantProfileController],
  providers: [TenantsService],
  exports: [TenantsService],
})
export class TenantsModule {}
