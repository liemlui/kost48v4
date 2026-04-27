import { Injectable } from '@nestjs/common';
import { AuditLogService } from '../../audit-log/audit-log.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AppNotificationService } from './app-notification.service';
import { MockReminderType } from './dto/mock-send.dto';

export interface MockSendResult {
  mock: true;
  status: 'MOCK_SENT';
  type: MockReminderType;
  candidateId: string;
  phone: string;
  messagePreview: string;
  sentAt: string;
}

@Injectable()
export class ReminderMockService {
  constructor(
    private readonly audit: AuditLogService,
    private readonly prisma: PrismaService,
    private readonly appNotification: AppNotificationService,
  ) {}

  async mockSend(input: {
    type: MockReminderType;
    candidateId: string;
    phone: string;
    message: string;
    actorUserId: number;
  }): Promise<MockSendResult> {
    const normalizedPhone = this.normalizePhone(input.phone);
    const sentAt = new Date().toISOString();

    // Write audit log
    await this.audit.log({
      actorUserId: input.actorUserId,
      action: 'REMINDER_MOCK_SEND',
      entityType: `REMINDER_${input.type}`,
      entityId: input.candidateId,
      meta: {
        type: input.type,
        candidateId: input.candidateId,
        phone: normalizedPhone,
        messagePreview: input.message.slice(0, 200),
        sentAt,
      },
    });

    // Create in-app notification for tenant target (best-effort, must not fail mock send)
    await this.createNotificationForTenant(input);

    return {
      mock: true,
      status: 'MOCK_SENT',
      type: input.type,
      candidateId: input.candidateId,
      phone: normalizedPhone,
      messagePreview: input.message,
      sentAt,
    };
  }

  private async createNotificationForTenant(input: {
    type: MockReminderType;
    candidateId: string;
    message: string;
    actorUserId: number;
  }) {
    try {
      const tenantId = parseInt(input.candidateId, 10);
      if (isNaN(tenantId)) return;

      const user = await this.prisma.user.findUnique({
        where: { tenantId },
        select: { id: true },
      });

      if (!user) return; // tenant has no portal user, skip notification

      const title = this.getTitleForType(input.type);

      await this.appNotification.create({
        recipientUserId: user.id,
        title,
        body: input.message,
        entityType: `REMINDER_${input.type}`,
        entityId: input.candidateId,
      });
    } catch (error) {
      // Log failure but never throw — mock send must still succeed
      await this.audit.log({
        actorUserId: input.actorUserId,
        action: 'APP_NOTIFICATION_CREATE_FAILED',
        entityType: `REMINDER_${input.type}`,
        entityId: input.candidateId,
        meta: { error: String(error) },
      });
    }
  }

  private getTitleForType(type: MockReminderType): string {
    switch (type) {
      case MockReminderType.BOOKING_EXPIRY:
        return 'Booking hampir kadaluarsa';
      case MockReminderType.INVOICE_DUE:
        return 'Tagihan akan jatuh tempo';
      case MockReminderType.INVOICE_OVERDUE:
        return 'Tagihan terlambat';
      case MockReminderType.CHECKOUT:
        return 'Checkout mendekat';
      default:
        return 'Pengingat KOST48';
    }
  }

  /**
   * Normalize Indonesian phone number:
   * - 08xx -> 628xx
   * - +628xx -> 628xx
   * - 628xx stays 628xx
   */
  private normalizePhone(value: string): string {
    const digits = value.replace(/\D/g, '');
    if (digits.startsWith('62')) return digits;
    if (digits.startsWith('0')) return `62${digits.slice(1)}`;
    return digits;
  }
}
