import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuditLogModule } from '../../audit-log/audit-log.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { TicketsController } from './tickets.controller';
import { TicketsService } from './tickets.service';

@Module({ imports: [PrismaModule, AuditLogModule, NotificationsModule], controllers: [TicketsController], providers: [TicketsService], exports: [TicketsService] })
export class TicketsModule {}
