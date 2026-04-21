import { Module } from '@nestjs/common';
import { StaysController } from './stays.controller';
import { StaysService } from './stays.service';
import { AuditLogModule } from 'src/audit-log/audit-log.module';

@Module({imports: [AuditLogModule], controllers: [StaysController], providers: [StaysService], exports: [StaysService] })
export class StaysModule {}
