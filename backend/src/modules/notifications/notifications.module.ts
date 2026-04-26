import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { ReminderController } from './reminder.controller';
import { ReminderPreviewController } from './reminder-preview.controller';
import { ReminderPreviewService } from './reminder-preview.service';
import { ReminderService } from './reminder.service';
import { WhatsAppAdapter } from './whatsapp.adapter';

@Module({
  imports: [PrismaModule],
  controllers: [ReminderController, ReminderPreviewController],
  providers: [ReminderService, ReminderPreviewService, WhatsAppAdapter],
  exports: [ReminderService, ReminderPreviewService, WhatsAppAdapter],
})
export class NotificationsModule {}
