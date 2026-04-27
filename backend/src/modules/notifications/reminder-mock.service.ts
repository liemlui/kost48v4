import { Injectable } from '@nestjs/common';
import { AuditLogService } from '../../audit-log/audit-log.service';
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
  constructor(private readonly audit: AuditLogService) {}

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
