import { Type } from 'class-transformer';
import { IsBoolean, IsDateString, IsEnum, IsIn, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Matches, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LeadSource, PricingTerm, StayPurpose } from '../../../common/enums/app.enums';

// F3-14/F3-16: admin paksa-checkout tenant (overstay nunggak / kabur). Deposit
// menutup tunggakan, sisa jadi piutang (AR). Kelebihan deposit di-refund.
export class ForcedCheckoutDto {
  @ApiProperty({ description: 'Alasan paksa-checkout: OVERSTAY_NUNGGAK atau TENANT_KABUR' })
  @IsIn(['OVERSTAY_NUNGGAK', 'TENANT_KABUR'])
  reason!: 'OVERSTAY_NUNGGAK' | 'TENANT_KABUR';

  @ApiPropertyOptional({ description: 'Catatan tambahan' })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiPropertyOptional({ description: 'Tanggal checkout aktual (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  actualCheckOutDate?: string;
}

// F3-15: admin menandai barang tenant pasca-checkout (diambil / dinyatakan ditinggal).
export class MarkBelongingsDto {
  @ApiProperty({ description: 'Status barang: CLAIMED (diambil) atau ABANDONED (ditinggal)' })
  @IsIn(['CLAIMED', 'ABANDONED'])
  status!: 'CLAIMED' | 'ABANDONED';

  @ApiPropertyOptional({ description: 'Catatan' })
  @IsOptional()
  @IsString()
  note?: string;
}

export class CreateStayDto {
  @ApiProperty({ description: 'ID tenant' })
  @IsInt()
  tenantId!: number;

  @ApiProperty({ description: 'ID kamar' })
  @IsInt()
  roomId!: number;

  @ApiProperty({ enum: PricingTerm, description: 'Term sewa: DAILY, WEEKLY, BIWEEKLY, MONTHLY, SMESTERLY, YEARLY' })
  @IsEnum(PricingTerm)
  pricingTerm!: PricingTerm;

  @ApiProperty({ description: 'Sewa per bulan yang disepakati (Rupiah)' })
  @IsInt()
  @Min(1)
  agreedRentAmountRupiah!: number;

  @ApiProperty({ description: 'Tanggal check-in (YYYY-MM-DD)' })
  @IsDateString()
  checkInDate!: string;

  @ApiPropertyOptional({ description: 'Rencana checkout (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  plannedCheckOutDate?: string;

  @ApiPropertyOptional({ description: 'Deposit jaminan (Rupiah), default dari Room.defaultDepositRupiah' })
  @IsOptional()
  @IsInt()
  @Min(0)
  depositAmountRupiah?: number;

  // Audit E-3: jaminan diterima tunai saat check-in manual — bila true,
  // depositPaid langsung tercatat + masuk ledger & jurnal liability.
  @ApiPropertyOptional({ description: 'Apakah deposit sudah diterima tunai saat check-in?' })
  @IsOptional()
  @IsBoolean()
  depositCollected?: boolean;

  @ApiPropertyOptional({ description: 'Tarif listrik per kWh (Rupiah), override Room' })
  @IsOptional()
  @IsInt()
  @Min(0)
  electricityTariffPerKwhRupiah?: number;

  @ApiPropertyOptional({ description: 'Tarif air per m³ (Rupiah), override Room' })
  @IsOptional()
  @IsInt()
  @Min(0)
  waterTariffPerM3Rupiah?: number;

  @ApiPropertyOptional({ enum: LeadSource, description: 'Sumber booking' })
  @IsOptional()
  @IsEnum(LeadSource)
  bookingSource?: LeadSource;

  @ApiPropertyOptional({ description: 'Detail sumber booking' })
  @IsOptional()
  @IsString()
  bookingSourceDetail?: string;

  @ApiPropertyOptional({ enum: StayPurpose, description: 'Tujuan sewa' })
  @IsOptional()
  @IsEnum(StayPurpose)
  stayPurpose?: StayPurpose;

  @ApiPropertyOptional({ description: 'Catatan' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ description: 'Meter awal listrik (kWh)' })
  @IsNotEmpty({ message: 'Meter awal listrik harus diisi' })
  @Type(() => Number)
  @IsNumber({}, { message: 'Meter awal listrik harus berupa angka' })
  initialElectricityKwh!: number;

  @ApiProperty({ description: 'Meter awal air (m³)' })
  @IsNotEmpty({ message: 'Meter awal air harus diisi' })
  @Type(() => Number)
  @IsNumber({}, { message: 'Meter awal air harus berupa angka' })
  initialWaterM3!: number;
}

export class UpdateStayDto {
  @ApiPropertyOptional({ description: 'Catatan' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Detail sumber booking' })
  @IsOptional()
  @IsString()
  bookingSourceDetail?: string;

  @ApiPropertyOptional({ description: 'Rencana checkout (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  plannedCheckOutDate?: string;
}

export class CompleteStayDto {
  @ApiProperty({ description: 'Tanggal checkout aktual (YYYY-MM-DD)' })
  @IsDateString()
  actualCheckOutDate!: string;

  @ApiProperty({ description: 'Alasan checkout' })
  @IsString()
  @IsNotEmpty({ message: 'checkoutReason wajib diisi' })
  checkoutReason!: string;

  @ApiPropertyOptional({ description: 'Catatan' })
  @IsOptional()
  @IsString()
  notes?: string;

  /** Biaya kerusakan/penalti yang akan dipotong dari deposit jaminan. */
  @ApiPropertyOptional({ description: 'Biaya kerusakan/penalti (Rupiah), dipotong dari deposit' })
  @IsOptional()
  @IsInt()
  @Min(0)
  damageChargeRupiah?: number;

  /** Deskripsi kerusakan (wajib diisi bila ada biaya). */
  @ApiPropertyOptional({ description: 'Deskripsi kerusakan (wajib bila ada biaya)' })
  @IsOptional()
  @IsString()
  damageNote?: string;
}

export class CancelStayDto {
  @ApiProperty({ description: 'Alasan pembatalan stay' })
  @IsString()
  @IsNotEmpty({ message: 'cancelReason wajib diisi' })
  cancelReason!: string;

  @ApiPropertyOptional({ description: 'Catatan' })
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
  @ApiProperty({ enum: ProcessDepositAction, description: 'Aksi: PARTIAL_REFUND, FULL_REFUND, FORFEIT' })
  @IsEnum(ProcessDepositAction, {
    message: 'action harus salah satu dari: PARTIAL_REFUND, FULL_REFUND, FORFEIT',
  })
  action!: ProcessDepositAction;

  @ApiPropertyOptional({ description: 'Potongan deposit (Rupiah)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  depositDeductionRupiah?: number;

  @ApiPropertyOptional({ description: 'Deposit yang diretur (Rupiah)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  depositRefundedRupiah?: number;

  @ApiPropertyOptional({ description: 'Catatan proses deposit' })
  @IsOptional()
  @IsString()
  depositNote?: string;
}

// F2-3b: proses refund kalah-cepat (OWNER tandai sudah dikembalikan + bukti).
export class ProcessLossRefundDto {
  @ApiPropertyOptional({ description: 'URL bukti refund (dari upload server)' })
  @IsOptional()
  @IsString()
  @Matches(/^\/api\/payment-submissions\/proofs\//, { message: 'proofUrl harus berasal dari upload server' })
  proofUrl?: string;

  @ApiPropertyOptional({ description: 'File key bukti refund' })
  @IsOptional()
  @IsString()
  proofFileKey?: string;

  @ApiPropertyOptional({ description: 'Catatan' })
  @IsOptional()
  @IsString()
  note?: string;
}

export class RenewStayDto {
  @ApiPropertyOptional({ enum: PricingTerm, description: 'Term baru setelah perpanjangan' })
  @IsOptional()
  @IsEnum(PricingTerm)
  pricingTerm?: PricingTerm;

  @ApiPropertyOptional({ description: 'Rencana checkout baru (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  plannedCheckOutDate?: string;

  @ApiPropertyOptional({ description: 'Sewa per bulan yang disepakati (Rupiah), rent-loyalty D-16' })
  @IsOptional()
  @IsInt()
  @Min(0)
  agreedRentAmountRupiah?: number;

  // F2-1 inc.2b: DP 30% sudah ditagih via invoice terpisah → kurangi rent-line invoice renewal
  // sebesar ini (hindari dobel-charge). Stay.agreedRentAmountRupiah tetap penuh (rent-loyalty).
  @ApiPropertyOptional({ description: 'DP 30% yang sudah dibayar sebelumnya (Rupiah)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  priorDownPaymentRupiah?: number;

  @ApiProperty({ description: 'Nilai meter listrik terbaru (kWh)' })
  @IsNotEmpty({ message: 'Meter listrik terbaru wajib diisi sebelum perpanjangan disetujui' })
  @Type(() => Number)
  @IsNumber({}, { message: 'Meter listrik terbaru harus berupa angka' })
  electricityReadingValue!: number;

  @ApiProperty({ description: 'Nilai meter air terbaru (m³)' })
  @IsNotEmpty({ message: 'Meter air terbaru wajib diisi sebelum perpanjangan disetujui' })
  @Type(() => Number)
  @IsNumber({}, { message: 'Meter air terbaru harus berupa angka' })
  waterReadingValue!: number;

  @ApiProperty({ description: 'Tanggal catat meter (YYYY-MM-DD)' })
  @IsNotEmpty({ message: 'Tanggal catat meter wajib diisi sebelum perpanjangan disetujui' })
  @IsDateString({}, { message: 'Tanggal catat meter tidak valid' })
  meterReadingAt!: string;
}
