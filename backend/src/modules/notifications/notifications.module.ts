import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AppNotificationController } from './app-notification.controller';
import { AppNotificationService } from './app-notification.service';
import { ReminderController } from './reminder.controller';
import { ReminderMockController } from './reminder-mock.controller';
import { ReminderMockService } from './reminder-mock.service';
import { ReminderPreviewController } from './reminder-preview.controller';
import { ReminderPreviewService } from './reminder-preview.service';
import { ReminderService } from './reminder.service';
import { WhatsAppAdapter } from './whatsapp.adapter';

@Module({
  imports: [PrismaModule],
  controllers: [
    AppNotificationController,
    ReminderController,
    ReminderPreviewController,
    ReminderMockController,
  ],
  providers: [
    AppNotificationService,
    ReminderService,
    ReminderPreviewService,
    ReminderMockService,
    WhatsAppAdapter,
  ],
  exports: [
    AppNotificationService,
    ReminderService,
    ReminderPreviewService,
    ReminderMockService,
    WhatsAppAdapter,
  ],
})
export class NotificationsModule {}
