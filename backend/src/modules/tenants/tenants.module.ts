import { Module } from '@nestjs/common';
import { TenantsController } from './tenants.controller';
import { TenantsService } from './tenants.service';
import { AuditLogModule } from 'src/audit-log/audit-log.module';

@Module({ imports: [AuditLogModule], controllers: [TenantsController], providers: [TenantsService], exports: [TenantsService] })
export class TenantsModule {}
