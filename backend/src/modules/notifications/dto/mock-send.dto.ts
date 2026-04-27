import { IsEnum, IsNotEmpty, IsString } from 'class-validator';

export enum MockReminderType {
  BOOKING_EXPIRY = 'BOOKING_EXPIRY',
  INVOICE_DUE = 'INVOICE_DUE',
  INVOICE_OVERDUE = 'INVOICE_OVERDUE',
  CHECKOUT = 'CHECKOUT',
}

export class MockSendDto {
  @IsEnum(MockReminderType, { message: 'type harus salah satu dari: BOOKING_EXPIRY, INVOICE_DUE, INVOICE_OVERDUE, CHECKOUT' })
  type!: MockReminderType;

  @IsNotEmpty({ message: 'candidateId wajib diisi' })
  @IsString({ message: 'candidateId harus berupa string' })
  candidateId!: string;

  @IsNotEmpty({ message: 'phone wajib diisi' })
  @IsString({ message: 'phone harus berupa string' })
  phone!: string;

  @IsNotEmpty({ message: 'message wajib diisi' })
  @IsString({ message: 'message harus berupa string' })
  message!: string;
}
