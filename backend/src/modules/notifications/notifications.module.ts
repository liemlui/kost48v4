import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AppNotificationController } from './app-notification.controller';
import { AppNotificationService } from './app-notification.service';
import { ReminderMockController } from './reminder-mock.controller';
import { ReminderMockService } from './reminder-mock.service';
import { ReminderPreviewController } from './reminder-preview.controller';
import { ReminderPreviewService } from './reminder-preview.service';

@Module({
  imports: [PrismaModule],
  controllers: [
    AppNotificationController,
    ReminderPreviewController,
    ReminderMockController,
  ],
  providers: [
    AppNotificationService,
    ReminderPreviewService,
    ReminderMockService,
  ],
  exports: [
    AppNotificationService,
    ReminderPreviewService,
    ReminderMockService,
  ],
})
export class NotificationsModule {}
