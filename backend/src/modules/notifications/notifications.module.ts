import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { ReminderController } from './reminder.controller';
import { ReminderMockController } from './reminder-mock.controller';
import { ReminderMockService } from './reminder-mock.service';
import { ReminderPreviewController } from './reminder-preview.controller';
import { ReminderPreviewService } from './reminder-preview.service';
import { ReminderService } from './reminder.service';
import { WhatsAppAdapter } from './whatsapp.adapter';

@Module({
  imports: [PrismaModule],
  controllers: [ReminderController, ReminderPreviewController, ReminderMockController],
  providers: [ReminderService, ReminderPreviewService, ReminderMockService, WhatsAppAdapter],
  exports: [ReminderService, ReminderPreviewService, ReminderMockService, WhatsAppAdapter],
})
export class NotificationsModule {}
