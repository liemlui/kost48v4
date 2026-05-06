import { IsDateString, IsEnum, IsInt, IsNotEmpty, IsNumberString, IsOptional, IsString, Min } from 'class-validator';
import { LeadSource, PricingTerm, StayPurpose } from '../../../common/enums/app.enums';

export class CreateStayDto {
  @IsInt()
  tenantId!: number;

  @IsInt()
  roomId!: number;

  @IsEnum(PricingTerm)
  pricingTerm!: PricingTerm;

  @IsInt()
  @Min(0)
  agreedRentAmountRupiah!: number;

  @IsDateString()
  checkInDate!: string;

  @IsOptional()
  @IsDateString()
  plannedCheckOutDate?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  depositAmountRupiah?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  electricityTariffPerKwhRupiah?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  waterTariffPerM3Rupiah?: number;

  @IsOptional()
  @IsEnum(LeadSource)
  bookingSource?: LeadSource;

  @IsOptional()
  @IsString()
  bookingSourceDetail?: string;

  @IsOptional()
  @IsEnum(StayPurpose)
  stayPurpose?: StayPurpose;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsNotEmpty({ message: 'Meter awal listrik harus diisi' })
  @IsNumberString({}, { message: 'Meter awal listrik harus berupa angka' })
  initialElectricityKwh!: string;

  @IsNotEmpty({ message: 'Meter awal air harus diisi' })
  @IsNumberString({}, { message: 'Meter awal air harus berupa angka' })
  initialWaterM3!: string;
}

export class UpdateStayDto {
  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  bookingSourceDetail?: string;

  @IsOptional()
  @IsDateString()
  plannedCheckOutDate?: string;
}

export class CompleteStayDto {
  @IsDateString()
  actualCheckOutDate!: string;

  @IsString()
  @IsNotEmpty({ message: 'checkoutReason wajib diisi' })
  checkoutReason!: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CancelStayDto {
  @IsString()
  @IsNotEmpty({ message: 'cancelReason wajib diisi' })
  cancelReason!: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export enum ProcessDepositAction {
  PARTIAL_REFUND = 'PARTIAL_REFUND',
  FULL_REFUND = 'FULL_REFUND',
  FORFEIT = 'FORFEIT',
}

export class ProcessDepositDto {
  @IsEnum(ProcessDepositAction, {
    message: 'action harus salah satu dari: PARTIAL_REFUND, FULL_REFUND, FORFEIT',
  })
  action!: ProcessDepositAction;

  @IsOptional()
  @IsInt()
  @Min(0)
  depositDeductionRupiah?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  depositRefundedRupiah?: number;

  @IsOptional()
  @IsString()
  depositNote?: string;
}

export class RenewStayDto {
  @IsOptional()
  @IsDateString()
  plannedCheckOutDate?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  agreedRentAmountRupiah?: number;
}
